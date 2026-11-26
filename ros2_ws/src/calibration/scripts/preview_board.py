#!/usr/bin/env python3
"""Live view to place the camera above the board: centre cross, board centre, distance and tilt.

  python3 preview_board.py          (q = quit)

Green text = good start pose for handeye_auto.py: board centred, distance 26-32 cm, tilt < 10 deg.
"""
import os
import threading
import time

import cv2
import numpy as np
import rclpy
import yaml
from rclpy.executors import SingleThreadedExecutor

from handeye_collect import Camera


def main():
    cal = yaml.safe_load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "calib_images", "calibration_result.yaml")))
    K, D = np.array(cal["K"]), np.array(cal["D"])
    pattern = (9, 6)
    objp = np.zeros((54, 3), np.float32)
    objp[:, :2] = np.mgrid[0:9, 0:6].T.reshape(-1, 2) * 0.021
    rclpy.init()
    cam = Camera("/camera/camera/color/image_raw")
    ex = SingleThreadedExecutor()
    ex.add_node(cam)
    threading.Thread(target=ex.spin, daemon=True).start()
    try:
        while True:
            img, _ = cam.get()
            if img is None:
                time.sleep(0.05)
                continue
            h, w = img.shape[:2]
            view = img.copy()
            cv2.line(view, (w // 2 - 40, h // 2), (w // 2 + 40, h // 2), (255, 255, 0), 2)
            cv2.line(view, (w // 2, h // 2 - 40), (w // 2, h // 2 + 40), (255, 255, 0), 2)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            found, c = cv2.findChessboardCorners(gray, pattern, cv2.CALIB_CB_FAST_CHECK)
            if found:
                cv2.drawChessboardCorners(view, pattern, c, found)
                ok, rvec, tvec = cv2.solvePnP(objp, c, K, D)
                R = cv2.Rodrigues(rvec)[0]
                centre = R @ objp.mean(axis=0) + tvec.ravel()
                dist = np.linalg.norm(centre) * 100
                tilt = np.degrees(np.arccos(abs(R[2, 2])))
                uv = c.reshape(-1, 2).mean(axis=0)
                off = np.hypot(uv[0] - w / 2, uv[1] - h / 2)
                cv2.circle(view, (int(uv[0]), int(uv[1])), 10, (0, 0, 255), -1)
                good = 26 <= dist <= 32 and tilt < 10 and off < 80
                msg = f"distance {dist:.0f} cm   tilt {tilt:.0f} deg   off-centre {off:.0f} px"
                cv2.putText(view, msg, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                            (0, 255, 0) if good else (0, 165, 255), 2)
                cv2.putText(view, "GOOD START POSE" if good else "target: 26-32 cm, tilt<10, red dot on cross",
                            (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0) if good else (0, 165, 255), 2)
            else:
                cv2.putText(view, "board not visible", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            cv2.imshow("preview", view)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cv2.destroyAllWindows()
        ex.shutdown()
        cam.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
    os._exit(0)  # avoid "terminate called without an active exception" from the ROS spin thread
