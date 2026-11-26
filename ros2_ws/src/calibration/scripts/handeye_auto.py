#!/usr/bin/env python3
"""B3 - AUTOMATIC hand-eye collection: the robot moves itself around the fixed chessboard.

Before running:
  - Camera node running (T1), chessboard fixed on the table.
  - Move the robot by hand so the camera looks DOWN at the board, board centred, ~30-40 cm away.
  - Tablet in REMOTE CONTROL mode (needed by ur_rtde to send motions).
  - Somebody stands next to the EMERGENCY STOP for the whole run.

  python3 handeye_auto.py --dry-run     # computes and checks the poses, robot does NOT move
  python3 handeye_auto.py               # moves (asks for ENTER first)

How the poses are made: the camera "orbits" around the board centre: tilt 15-30 deg in 12 directions,
plus rotation about the optical axis (-45..+45 deg) and a few distance changes. A rough camera
offset X (from try 1) is enough for this; the exact X is what we compute afterwards.
Safety: slow joint moves, every target checked with IK + controller safety limits, TCP never
lower than --min-height above the board, return to start pose at the end.
"""
import argparse
import os
import time
import threading

import cv2
import numpy as np
import rclpy
import rtde_control
import rtde_receive
import yaml
from rclpy.executors import SingleThreadedExecutor
from scipy.spatial.transform import Rotation

from handeye_collect import Camera, pose_to_mat


def mat_to_pose(T):
    return list(T[:3, 3]) + list(Rotation.from_matrix(T[:3, :3]).as_rotvec())


def rot_about_point(P, R):
    """Rotation R (3x3) about point P, as a 4x4 transform."""
    T = np.eye(4)
    T[:3, :3] = R
    T[:3, 3] = P - R @ P
    return T


def detect(img, pattern, objp, K, D):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    found, corners = cv2.findChessboardCorners(gray, pattern, None)
    if not found:
        return None
    corners = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1),
                               (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3))
    ok, rvec, tvec = cv2.solvePnP(objp, corners, K, D)
    proj, _ = cv2.projectPoints(objp, rvec, tvec, K, D)
    err = float(np.sqrt(np.mean(np.sum((proj - corners) ** 2, axis=2))))
    T = np.eye(4)
    T[:3, :3] = cv2.Rodrigues(rvec)[0]
    T[:3, 3] = tvec.ravel()
    return T, err


def make_targets(T_tcp0, X, T_cb0, objp, min_height):
    """Camera orbits around the board centre."""
    T_c0 = T_tcp0 @ X
    centre_board = np.append(objp.mean(axis=0), 1.0)
    P = (T_c0 @ T_cb0 @ centre_board)[:3]          # board centre in base frame
    n_board = (T_c0 @ T_cb0)[:3, 2]                  # board normal in base frame
    dist0 = np.linalg.norm(T_c0[:3, 3] - P)
    targets = []
    rng = np.random.default_rng(0)
    for k, az in enumerate(np.arange(0, 360, 30)):              # 12 tilt directions
        for tilt in (15, 30):
            axis = np.array([np.cos(np.radians(az)), np.sin(np.radians(az)), 0.0])
            axis = axis - n_board * (axis @ n_board)             # axis in the board plane
            axis /= np.linalg.norm(axis)
            R = Rotation.from_rotvec(np.radians(tilt) * axis).as_matrix()
            T_c = rot_about_point(P, R) @ T_c0
            roll = np.radians(rng.uniform(-45, 45))               # turn around the optical axis
            T_c = T_c @ pose_to_mat([0, 0, 0, 0, 0, roll])
            dz = rng.choice([-0.05, 0.0, 0.05])                   # closer / farther
            T_c = T_c @ pose_to_mat([0, 0, -dz, 0, 0, 0])
            targets.append(T_c @ np.linalg.inv(X))
    for roll in (-80, 80):                                        # pure rolls above the board
        targets.append(T_c0 @ pose_to_mat([0, 0, 0, 0, 0, np.radians(roll)]) @ np.linalg.inv(X))
    # safety: height above the board plane
    safe = []
    for T in targets:
        h = (T[:3, 3] - P) @ n_board
        safe.append((T, abs(h)))
    return [T for T, h in safe if h >= min_height], dist0, P


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--robot-ip", default="192.168.1.102")
    p.add_argument("--calib", default="data/calib_images/calibration_result.yaml")
    p.add_argument("--out", default="data/handeye")
    p.add_argument("--square", type=float, default=21.0)
    p.add_argument("--cols", type=int, default=9)
    p.add_argument("--rows", type=int, default=6)
    p.add_argument("--image-topic", default="/camera/camera/color/image_raw")
    p.add_argument("--speed", type=float, default=0.25, help="joint speed rad/s (slow)")
    p.add_argument("--acc", type=float, default=0.3)
    p.add_argument("--min-height", type=float, default=0.20, help="min TCP height above board (m)")
    p.add_argument("--dry-run", action="store_true")
    # rough X = T_tcp_cam from try 1 (8 consistent samples, PARK): enough to aim the camera
    p.add_argument("--x-guess", type=float, nargs=6, default=[-0.029, 0.066, 0.026, 0.0, 0.0, 0.0])
    args = p.parse_args()
    os.makedirs(args.out, exist_ok=True)

    cal = yaml.safe_load(open(args.calib))
    K, D = np.array(cal["K"]), np.array(cal["D"])
    pattern = (args.cols, args.rows)
    objp = np.zeros((args.cols * args.rows, 3), np.float32)
    objp[:, :2] = np.mgrid[0:args.cols, 0:args.rows].T.reshape(-1, 2) * args.square / 1000.0
    X = pose_to_mat(args.x_guess)

    rclpy.init()
    cam = Camera(args.image_topic)
    ex = SingleThreadedExecutor()
    ex.add_node(cam)
    threading.Thread(target=ex.spin, daemon=True).start()
    rr = rtde_receive.RTDEReceiveInterface(args.robot_ip)
    rc = None
    try:
        time.sleep(1.0)
        img, _ = cam.get()
        if img is None:
            raise SystemExit("No camera image: is the RealSense node running?")
        det = detect(img, pattern, objp, K, D)
        if det is None:
            raise SystemExit("Board not visible from the start pose: put the camera above the board.")
        T_cb0, _ = det
        start_q = rr.getActualQ()
        T_tcp0 = pose_to_mat(rr.getActualTCPPose())
        targets, dist0, P = make_targets(T_tcp0, X, T_cb0, objp, args.min_height)
        print(f"Board centre in base: {np.round(P*1000)} mm, camera distance {dist0*1000:.0f} mm")
        print(f"{len(targets)} candidate poses")

        rc = rtde_control.RTDEControlInterface(args.robot_ip)   # needs REMOTE mode
        ok_targets = []
        for i, T in enumerate(targets):
            pose = mat_to_pose(T)
            if not rc.isPoseWithinSafetyLimits(pose):
                print(f"  pose {i}: outside safety limits, skipped")
                continue
            q = rc.getInverseKinematics(pose, start_q)
            if not q or not rc.getInverseKinematicsHasSolution(pose, start_q):
                print(f"  pose {i}: no IK solution, skipped")
                continue
            if np.max(np.abs(np.degrees(q))) > 350:
                print(f"  pose {i}: a joint would be beyond +-350 deg (limit 360), skipped")
                continue
            jump = np.degrees(np.max(np.abs(np.array(q) - np.array(start_q))))
            if jump > 170:
                print(f"  pose {i}: joint would turn {jump:.0f} deg, skipped")
                continue
            ok_targets.append((i, pose, q))
        print(f"{len(ok_targets)} reachable poses")
        if args.dry_run:
            print("Dry run: robot did NOT move.")
            return

        input("\nHand on the EMERGENCY STOP. Press ENTER to start (Ctrl+C to cancel)... ")
        samples_path = os.path.join(args.out, "samples.yaml")
        samples = (yaml.safe_load(open(samples_path)) if os.path.exists(samples_path) else None) or []
        for i, pose, q in ok_targets:
            print(f"-> pose {i}")
            rc.moveJ(q, args.speed, args.acc)
            time.sleep(1.0)                                  # let vibrations die out
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
        rc.moveJ(start_q, args.speed, args.acc)
        print(f"Done: {len(samples)} samples in {samples_path}")
    except KeyboardInterrupt:
        print("\nCancelled.")
        if rc is not None:
            rc.stopJ(1.0)
    finally:
        if rc is not None:
            rc.stopScript()
        ex.shutdown()
        cam.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
    os._exit(0)  # avoid "terminate called without an active exception" from the ROS spin thread
