#!/usr/bin/env python3
"""B1 - Capture chessboard images from the RealSense colour stream (ROS2).

Usage (2 terminals, ROS2 Humble sourced in both):
  T1: ros2 launch realsense2_camera rs_launch.py rgb_camera.color_profile:=1280x720x30
  T2: python3 capture_images.py --out data/calib_images

Keys in the window:
  SPACE  save the current image (only if the chessboard is detected)
  q      quit

The factory intrinsics (camera_info) are saved once to <out>/factory_camera_info.yaml.
"""
import argparse
import os

import cv2
import rclpy
import yaml
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import CameraInfo, Image


class Capture(Node):
    def __init__(self, args):
        super().__init__("calib_capture")
        self.args = args
        self.pattern = (args.cols, args.rows)  # inner corners
        self.bridge = CvBridge()
        self.frame = None
        # next index = highest existing img_NNN + 1 (never overwrite, even if numbers have gaps)
        idx = [int(f[4:-4]) for f in os.listdir(args.out)
               if f.startswith("img_") and f.endswith(".png") and f[4:-4].isdigit()]
        self.count = max(idx) + 1 if idx else 0
        self.info_saved = False
        self.create_subscription(Image, args.image_topic, self.on_image, 10)
        self.create_subscription(CameraInfo, args.info_topic, self.on_info, 10)
        self.get_logger().info(f"Listening on {args.image_topic}, {self.count} images already in {args.out}")

    def on_info(self, msg):
        if self.info_saved:
            return
        data = {
            "width": msg.width,
            "height": msg.height,
            "distortion_model": msg.distortion_model,
            "K": [float(v) for v in msg.k],
            "D": [float(v) for v in msg.d],
        }
        with open(os.path.join(self.args.out, "factory_camera_info.yaml"), "w") as f:
            yaml.safe_dump(data, f)
        self.info_saved = True
        self.get_logger().info(f"Factory camera_info saved: fx={msg.k[0]:.1f} fy={msg.k[4]:.1f}")

    def on_image(self, msg):
        self.frame = self.bridge.imgmsg_to_cv2(msg, "bgr8")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="data/calib_images")
    p.add_argument("--cols", type=int, default=9, help="inner corners along the long side (10 squares -> 9)")
    p.add_argument("--rows", type=int, default=6, help="inner corners along the short side (7 squares -> 6)")
    p.add_argument("--image-topic", default="/camera/camera/color/image_raw")
    p.add_argument("--info-topic", default="/camera/camera/color/camera_info")
    args = p.parse_args()
    os.makedirs(args.out, exist_ok=True)

    rclpy.init()
    node = Capture(args)
    flags = cv2.CALIB_CB_ADAPTIVE_THRESH | cv2.CALIB_CB_NORMALIZE_IMAGE | cv2.CALIB_CB_FAST_CHECK
    try:
        while rclpy.ok():
            rclpy.spin_once(node, timeout_sec=0.03)
            if node.frame is None:
                continue
            img = node.frame
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            found, corners = cv2.findChessboardCorners(gray, node.pattern, flags)
            view = img.copy()
            if found:
                cv2.drawChessboardCorners(view, node.pattern, corners, found)
            txt = f"saved: {node.count}  board: {'YES' if found else 'no'}  [SPACE]=save [q]=quit"
            cv2.putText(view, txt, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                        (0, 255, 0) if found else (0, 0, 255), 2)
            cv2.imshow("capture", view)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord(" "):
                if not found:
                    node.get_logger().warn("Board not detected, image NOT saved")
                    continue
                path = os.path.join(args.out, f"img_{node.count:03d}.png")
                cv2.imwrite(path, img)  # save the raw image, not the drawn one
                node.count += 1
                node.get_logger().info(f"Saved {path}")
    finally:
        cv2.destroyAllWindows()
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
