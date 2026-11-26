#!/usr/bin/env python3
"""B3 - Collect hand-eye samples (eye-in-hand): robot TCP pose + board pose in the camera.

Robot pose is read DIRECTLY from the controller with RTDE (pip install ur_rtde), not from ROS TF:
in Python, /tf at 500 Hz lags by seconds (tested 26/11), which gave wrong poses. RTDE also uses
the robot's own factory kinematics calibration.
  T_base_tcp = getActualTCPPose()  (UR 'base' frame = ROS frame 'base'; TCP = ROS 'tool0_controller')
  q          = getActualQ()        (saved too, to recompute the flange pose if the TCP changes)

Needs:
  T1: RealSense   ros2 launch realsense2_camera rs_launch.py rgb_camera.color_profile:=1280x720x30
  T2: this        python3 handeye_collect.py --robot-ip 192.168.1.102 --out data/handeye
(the ROS UR driver is NOT needed.)

The chessboard stays FIXED. Move the robot, stop, press SPACE in the window. The script checks
that the robot did not move for 0.5 s and uses an image taken after it stopped. 15-25 poses with
LARGE rotations. q = quit.
"""
import argparse
import os
import threading
import time

import cv2
import numpy as np
import rclpy
import rtde_receive
import yaml
from cv_bridge import CvBridge
from rclpy.executors import SingleThreadedExecutor
from rclpy.node import Node
from scipy.spatial.transform import Rotation
from sensor_msgs.msg import Image


def pose_to_mat(p):
    T = np.eye(4)
    T[:3, :3] = Rotation.from_rotvec(p[3:6]).as_matrix()
    T[:3, 3] = p[:3]
    return T


class Camera(Node):
    def __init__(self, topic):
        super().__init__("handeye_camera")
        self.bridge = CvBridge()
        self.lock = threading.Lock()
        self.frame, self.t = None, 0.0
        self.create_subscription(Image, topic, self.cb, 2)

    def cb(self, msg):
        img = self.bridge.imgmsg_to_cv2(msg, "bgr8")
        with self.lock:
            self.frame, self.t = img, time.time()

    def get(self):
        with self.lock:
            return (None, 0.0) if self.frame is None else (self.frame.copy(), self.t)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--robot-ip", default="192.168.1.102")
    p.add_argument("--calib", default="data/calib_images/calibration_result.yaml")
    p.add_argument("--out", default="data/handeye")
    p.add_argument("--square", type=float, default=21.0, help="square side in mm")
    p.add_argument("--cols", type=int, default=9)
    p.add_argument("--rows", type=int, default=6)
    p.add_argument("--image-topic", default="/camera/camera/color/image_raw")
    args = p.parse_args()
    os.makedirs(args.out, exist_ok=True)

    cal = yaml.safe_load(open(args.calib))
    K, D = np.array(cal["K"]), np.array(cal["D"])
    pattern = (args.cols, args.rows)
    objp = np.zeros((args.cols * args.rows, 3), np.float32)
    objp[:, :2] = np.mgrid[0:args.cols, 0:args.rows].T.reshape(-1, 2) * args.square / 1000.0  # metres
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3)

    samples_path = os.path.join(args.out, "samples.yaml")
    samples = (yaml.safe_load(open(samples_path)) if os.path.exists(samples_path) else None) or []

    robot = rtde_receive.RTDEReceiveInterface(args.robot_ip)
    print(f"Connected to robot {args.robot_ip}, TCP = {np.round(robot.getActualTCPPose()[:3], 4)} m")

    rclpy.init()
    cam = Camera(args.image_topic)
    ex = SingleThreadedExecutor()
    ex.add_node(cam)
    threading.Thread(target=ex.spin, daemon=True).start()

    try:
        while True:
            img, _ = cam.get()
            if img is None:
                time.sleep(0.05)
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            found, corners = cv2.findChessboardCorners(gray, pattern, cv2.CALIB_CB_FAST_CHECK)
            view = img.copy()
            if found:
                cv2.drawChessboardCorners(view, pattern, corners, found)
            txt = f"samples: {len(samples)}  board: {'YES' if found else 'no'}  [SPACE]=save [q]=quit"
            cv2.putText(view, txt, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                        (0, 255, 0) if found else (0, 0, 255), 2)
            cv2.imshow("handeye", view)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key != ord(" "):
                continue

            # 1) robot must be still for 0.5 s
            p1 = np.array(robot.getActualTCPPose())
            t_stop = time.time()
            time.sleep(0.5)
            p2 = np.array(robot.getActualTCPPose())
            q = robot.getActualQ()
            T1, T2 = pose_to_mat(p1), pose_to_mat(p2)
            dt = np.linalg.norm(T2[:3, 3] - T1[:3, 3]) * 1000
            dr = np.degrees(Rotation.from_matrix(T1[:3, :3].T @ T2[:3, :3]).magnitude())
            if dt > 0.2 or dr > 0.05:
                print(f"  Robot still moving ({dt:.2f} mm, {dr:.2f} deg in 0.5 s): NOT saved")
                continue
            # 2) image taken after the robot stopped
            img, t_img = cam.get()
            if t_img < t_stop:
                print("  No fresh camera image (camera stream stopped?): NOT saved")
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            found, corners = cv2.findChessboardCorners(gray, pattern, None)
            if not found:
                print("  Board not detected: NOT saved")
                continue
            corners = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            ok, rvec, tvec = cv2.solvePnP(objp, corners, K, D)
            proj, _ = cv2.projectPoints(objp, rvec, tvec, K, D)
            err = float(np.sqrt(np.mean(np.sum((proj - corners) ** 2, axis=2))))
            T_cb = np.eye(4)
            T_cb[:3, :3] = cv2.Rodrigues(rvec)[0]
            T_cb[:3, 3] = tvec.ravel()

            name = f"he_{len(samples):03d}.png"
            cv2.imwrite(os.path.join(args.out, name), img)
            samples.append({"image": name, "pnp_rms_px": err, "q": list(q),
                            "tcp_pose_rtde": p2.tolist(),
                            "T_base_tool0": T2.tolist(),  # = base -> TCP (tool0_controller)
                            "T_cam_board": T_cb.tolist()})
            with open(samples_path, "w") as f:
                yaml.safe_dump(samples, f)
            print(f"Saved sample {len(samples)-1}: TCP at {np.round(T2[:3, 3]*1000, 1)} mm, "
                  f"board {np.round(T_cb[:3, 3]*1000, 1)} mm from camera, PnP {err:.2f} px")
    finally:
        cv2.destroyAllWindows()
        ex.shutdown()
        cam.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
    os._exit(0)  # avoid "terminate called without an active exception" from the ROS spin thread
