#!/usr/bin/env python3
"""B3 - Collect hand-eye samples (eye-in-hand): robot pose base->tool0 + board pose camera->board.

Needs 3 things running:
  T1: RealSense   ros2 launch realsense2_camera rs_launch.py rgb_camera.color_profile:=1280x720x30
  T2: UR driver   ros2 launch ur_robot_driver ur_control.launch.py ur_type:=ur3e robot_ip:=<IP> launch_rviz:=false
  T3: this        python3 handeye_collect.py --calib data/calib_images/calibration_result.yaml --out data/handeye

The chessboard stays FIXED on the table for the whole collection. Move the robot (freedrive or
Move tab), stop, then press SPACE in the window. Aim for 15-25 poses with LARGE rotations
(tilt the camera +-30..45 deg around all 3 axes). Press q to quit.

Each sample = one image + one entry in samples.yaml:
  T_base_tool0 (4x4, metres) and T_cam_board (4x4, metres).
"""
import argparse
import os

import cv2
import numpy as np
import rclpy
import yaml
from cv_bridge import CvBridge
from rclpy.duration import Duration
from rclpy.node import Node
from rclpy.time import Time
from scipy.spatial.transform import Rotation
from sensor_msgs.msg import Image
from tf2_ros import Buffer, TransformListener


def tf_to_mat(tf):
    t, q = tf.transform.translation, tf.transform.rotation
    T = np.eye(4)
    T[:3, :3] = Rotation.from_quat([q.x, q.y, q.z, q.w]).as_matrix()
    T[:3, 3] = [t.x, t.y, t.z]
    return T


class Collector(Node):
    def __init__(self, args):
        super().__init__("handeye_collect")
        self.args = args
        self.bridge = CvBridge()
        self.frame = None
        self.stamp = None
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
        self.create_subscription(Image, args.image_topic, self.on_image, 10)

    def on_image(self, msg):
        self.frame = self.bridge.imgmsg_to_cv2(msg, "bgr8")
        self.stamp = msg.header.stamp

    def robot_pose(self):
        try:
            tf = self.tf_buffer.lookup_transform(self.args.base, self.args.tool, Time(),
                                                 timeout=Duration(seconds=0.2))
            return tf_to_mat(tf)
        except Exception as e:  # noqa: BLE001
            self.get_logger().warn(f"TF {self.args.base}->{self.args.tool} not available: {e}")
            return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--calib", default="data/calib_images/calibration_result.yaml")
    p.add_argument("--out", default="data/handeye")
    p.add_argument("--square", type=float, default=21.0, help="square side in mm")
    p.add_argument("--cols", type=int, default=9)
    p.add_argument("--rows", type=int, default=6)
    p.add_argument("--base", default="base_link")
    p.add_argument("--tool", default="tool0")
    p.add_argument("--image-topic", default="/camera/camera/color/image_raw")
    args = p.parse_args()
    os.makedirs(args.out, exist_ok=True)

    cal = yaml.safe_load(open(args.calib))
    K, D = np.array(cal["K"]), np.array(cal["D"])
    pattern = (args.cols, args.rows)
    objp = np.zeros((args.cols * args.rows, 3), np.float32)
    objp[:, :2] = np.mgrid[0:args.cols, 0:args.rows].T.reshape(-1, 2) * args.square / 1000.0  # metres

    samples_path = os.path.join(args.out, "samples.yaml")
    samples = yaml.safe_load(open(samples_path)) if os.path.exists(samples_path) else []
    samples = samples or []

    rclpy.init()
    node = Collector(args)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3)
    try:
        while rclpy.ok():
            rclpy.spin_once(node, timeout_sec=0.03)
            if node.frame is None:
                continue
            img = node.frame
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
            if not found:
                node.get_logger().warn("Board not detected, sample NOT saved")
                continue
            T_bt = node.robot_pose()
            if T_bt is None:
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
            samples.append({"image": name, "pnp_rms_px": err,
                            "T_base_tool0": T_bt.tolist(), "T_cam_board": T_cb.tolist()})
            with open(samples_path, "w") as f:
                yaml.safe_dump(samples, f)
            node.get_logger().info(
                f"Saved sample {len(samples)-1}: tool0 at {np.round(T_bt[:3, 3]*1000, 1)} mm, "
                f"board at {np.round(T_cb[:3, 3]*1000, 1)} mm from camera, PnP {err:.2f}px")
    finally:
        cv2.destroyAllWindows()
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
