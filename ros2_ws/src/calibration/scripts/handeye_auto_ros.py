#!/usr/bin/env python3
"""B3 - AUTOMATIC hand-eye collection WITHOUT Remote mode (works in Manual mode).

Motions go through the ROS2 UR driver + the "External Control" program on the tablet;
the robot pose is still READ with RTDE (allowed in Local mode). Same poses as handeye_auto.py.

Before running:
  T1: camera     ros2 launch realsense2_camera rs_launch.py rgb_camera.color_profile:=1280x720x30
  T2: driver     ros2 launch ur_robot_driver ur_control.launch.py ur_type:=ur3e robot_ip:=192.168.1.102 launch_rviz:=false
  Tablet: Program tab -> load/create a program with the "External Control" node -> press PLAY
         (the driver log then says "Robot connected to reverse interface").
  Robot at the start pose (go back with the tablet, values in config/start_pose.yaml).

  python3 handeye_auto_ros.py --dry-run     # only computes/checks poses
  python3 handeye_auto_ros.py               # moves (asks ENTER first), hand on the E-STOP

IK: analytic UR solution (ur_ik.py, nominal DH), the solution closest to the start joints is kept.
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
from builtin_interfaces.msg import Duration as DurationMsg
from control_msgs.action import FollowJointTrajectory
from rclpy.action import ActionClient
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from scipy.spatial.transform import Rotation
from trajectory_msgs.msg import JointTrajectoryPoint

from handeye_auto import detect, make_targets
from handeye_collect import Camera, pose_to_mat
from ur_ik import closest, ik_all

JOINTS = ["shoulder_pan_joint", "shoulder_lift_joint", "elbow_joint",
          "wrist_1_joint", "wrist_2_joint", "wrist_3_joint"]
# nominal UR3e DH (base -> flange), UR 'base' frame = RTDE frame
D_ = [0.15185, 0, 0, 0.13105, 0.08535, 0.0921]
A_ = [0, -0.24355, -0.2132, 0, 0, 0]
AL = [np.pi / 2, 0, 0, np.pi / 2, -np.pi / 2, 0]


def fk(q):
    T = np.eye(4)
    for i in range(6):
        ct, st, ca, sa = np.cos(q[i]), np.sin(q[i]), np.cos(AL[i]), np.sin(AL[i])
        T = T @ np.array([[ct, -st * ca, st * sa, A_[i] * ct], [st, ct * ca, -ct * sa, A_[i] * st],
                          [0, sa, ca, D_[i]], [0, 0, 0, 1]])
    return T


def pose_err(T, Tt):
    dp = Tt[:3, 3] - T[:3, 3]
    dr = Rotation.from_matrix(Tt[:3, :3] @ T[:3, :3].T).as_rotvec()
    return np.concatenate([dp, dr])


def ik(Tt, q0, iters=300):
    q = np.array(q0, float)
    for _ in range(iters):
        e = pose_err(fk(q), Tt)
        if np.linalg.norm(e[:3]) < 1e-5 and np.linalg.norm(e[3:]) < 1e-4:
            return q
        J = np.zeros((6, 6))
        for k in range(6):
            dq = np.zeros(6)
            dq[k] = 1e-6
            J[:, k] = (pose_err(fk(q), fk(q + dq)) ) / 1e-6
        lam = 1e-3
        q = q + J.T @ np.linalg.solve(J @ J.T + lam * np.eye(6), e)
    return None


class Mover(Node):
    def __init__(self):
        super().__init__("handeye_mover")
        self.client = ActionClient(self, FollowJointTrajectory,
                                   "/scaled_joint_trajectory_controller/follow_joint_trajectory")

    def move(self, q_from, q_to, speed):
        dur = max(3.0, float(np.max(np.abs(np.array(q_to) - np.array(q_from)))) / speed)
        goal = FollowJointTrajectory.Goal()
        goal.trajectory.joint_names = JOINTS
        pt = JointTrajectoryPoint()
        pt.positions = [float(v) for v in q_to]
        pt.velocities = [0.0] * 6
        pt.time_from_start = DurationMsg(sec=int(dur), nanosec=int((dur % 1) * 1e9))
        goal.trajectory.points = [pt]
        fut = self.client.send_goal_async(goal)
        while not fut.done():
            time.sleep(0.05)
        handle = fut.result()
        if not handle.accepted:
            raise RuntimeError("Trajectory rejected (is External Control running on the tablet?)")
        res = handle.get_result_async()
        while not res.done():
            time.sleep(0.05)
        code = res.result().result.error_code
        if code != 0:
            raise RuntimeError(f"Trajectory failed, error_code={code} ({res.result().result.error_string})")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--robot-ip", default="192.168.1.102")
    p.add_argument("--calib", default="data/calib_images/calibration_result.yaml")
    p.add_argument("--out", default="data/handeye")
    p.add_argument("--square", type=float, default=21.0)
    p.add_argument("--image-topic", default="/camera/camera/color/image_raw")
    p.add_argument("--speed", type=float, default=0.25, help="max joint speed rad/s")
    p.add_argument("--min-height", type=float, default=0.20)
    p.add_argument("--x-guess", type=float, nargs=6, default=[-0.029, 0.066, 0.026, 0.0, 0.0, 0.0])
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    os.makedirs(args.out, exist_ok=True)

    cal = yaml.safe_load(open(args.calib))
    K, D = np.array(cal["K"]), np.array(cal["D"])
    pattern = (9, 6)
    objp = np.zeros((54, 3), np.float32)
    objp[:, :2] = np.mgrid[0:9, 0:6].T.reshape(-1, 2) * args.square / 1000.0
    X = pose_to_mat(args.x_guess)

    rclpy.init()
    cam, mover = Camera(args.image_topic), Mover()
    ex = MultiThreadedExecutor()
    ex.add_node(cam)
    ex.add_node(mover)
    threading.Thread(target=ex.spin, daemon=True).start()
    rr = rtde_receive.RTDEReceiveInterface(args.robot_ip)
    try:
        time.sleep(1.0)
        img, _ = cam.get()
        if img is None:
            raise SystemExit("No camera image: is the RealSense node running?")
        det = detect(img, pattern, objp, K, D)
        if det is None:
            raise SystemExit("Board not visible from the start pose.")
        T_cb0, _ = det
        q0 = np.array(rr.getActualQ())
        T_tcp0 = pose_to_mat(rr.getActualTCPPose())
        OFF = np.linalg.inv(fk(q0)) @ T_tcp0              # flange -> TCP (measured)
        targets, dist0, P = make_targets(T_tcp0, X, T_cb0, objp, args.min_height)
        print(f"Board centre in base: {np.round(P*1000)} mm, camera distance {dist0*1000:.0f} mm, "
              f"TCP offset {np.round(OFF[:3,3]*1000,1)} mm")

        plan, q_prev = [], q0
        for i, T in enumerate(targets):
            sols = ik_all(T @ np.linalg.inv(OFF))
            q = closest(sols, q0, limit=np.radians(350))
            if q is None:
                print(f"  pose {i}: unreachable ({len(sols)} IK solutions, none within joint limits), skipped")
                continue
            jump = np.degrees(np.max(np.abs(q - q0)))
            if jump > 120:
                print(f"  pose {i}: joint change {jump:.0f} deg from start, skipped")
                continue
            if (fk(q) @ OFF)[2, 3] < 0.05:
                print(f"  pose {i}: TCP too low, skipped")
                continue
            plan.append((i, q))
            q_prev = q
        print(f"{len(plan)} reachable poses (of {len(targets)})")
        if args.dry_run:
            print("Dry run: robot did NOT move.")
            return

        input("\nHand on the EMERGENCY STOP. Press ENTER to start (Ctrl+C to cancel)... ")
        samples_path = os.path.join(args.out, "samples.yaml")
        samples = (yaml.safe_load(open(samples_path)) if os.path.exists(samples_path) else None) or []
        q_cur = q0
        for i, q in plan:
            print(f"-> pose {i}")
            mover.move(q_cur, q, args.speed)
            q_cur = q
            time.sleep(1.0)
            t_still = time.time()
            time.sleep(0.2)
            img, t_img = cam.get()
            if t_img < t_still:
                print("   no fresh image, skipped")
                continue
            det = detect(img, pattern, objp, K, D)
            if det is None:
                print("   board not visible, skipped")
                continue
            T_cb, err = det
            tcp = rr.getActualTCPPose()
            name = f"he_{len(samples):03d}.png"
            cv2.imwrite(os.path.join(args.out, name), img)
            samples.append({"image": name, "pnp_rms_px": err, "q": list(rr.getActualQ()),
                            "tcp_pose_rtde": list(tcp), "T_base_tool0": pose_to_mat(tcp).tolist(),
                            "T_cam_board": T_cb.tolist()})
            with open(samples_path, "w") as f:
                yaml.safe_dump(samples, f)
            print(f"   saved {name} (PnP {err:.2f} px)")
        print("Back to start pose")
        mover.move(q_cur, q0, args.speed)
        print(f"Done: {len(samples)} samples in {samples_path}")
    except KeyboardInterrupt:
        print("\nCancelled (press STOP on the tablet if the robot is still moving).")
    finally:
        ex.shutdown()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
