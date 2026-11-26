"""Record an image dataset folder (format of decision D2) from the camera topics.

    # save one frame per service call
    ros2 run ur3e_camera dataset_recorder --ros-args -p output_root:=<dir> -p purpose:="detection, bottle A"
    ros2 service call /dataset_recorder/capture std_srvs/srv/Trigger

    # or save one frame every 0.5 s, at most 200 frames
    ros2 run ur3e_camera dataset_recorder --ros-args -p mode:=interval -p interval_s:=0.5 -p max_frames:=200

Images are saved raw and lossless (PNG). The camera_info in force is saved once; a change of
camera_info during recording is flagged in manifest.yaml. Stale images are not saved.
"""
from __future__ import annotations

import datetime as dt
import subprocess

import rclpy
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import CameraInfo, Image
from std_srvs.srv import Trigger

from ur3e_camera.core.dataset import DatasetManifest, DatasetWriter
from ur3e_camera.core.stream_stats import is_stale
from ur3e_camera.nodes.qos import image_qos
from ur3e_camera.nodes.ros_conversions import intrinsics_from_msg, stamp_to_sec


def _git_commit() -> str:
    try:
        return subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return ''


class DatasetRecorder(Node):
    def __init__(self) -> None:
        super().__init__('dataset_recorder')
        d = self.declare_parameter
        d('image_topic', '/camera/color/image_raw')
        d('info_topic', '/camera/color/camera_info')
        d('output_root', 'data/datasets')
        d('dataset_name', '')            # '' = date and time
        d('purpose', '')
        d('source', 'realsense')
        d('camera_model', '')
        d('camera_serial', '')
        d('operator', '')
        d('mode', 'trigger')             # trigger | interval
        d('interval_s', 1.0)
        d('max_frames', 0)               # 0 = unlimited
        d('max_age_periods', 3.0)        # stale-image threshold, in frame periods
        d('reliability', 'reliable')     # reliable | best_effort
        p = lambda n: self.get_parameter(n).value  # noqa: E731

        name = p('dataset_name') or dt.datetime.now().strftime('%Y-%m-%d_%H%M%S')
        self.manifest = DatasetManifest(
            name=name, purpose=p('purpose'), source=p('source'), camera_model=p('camera_model'),
            camera_serial=p('camera_serial'), git_commit=_git_commit(), operator=p('operator'))
        self.writer = DatasetWriter(p('output_root'), self.manifest)
        self.max_frames = int(p('max_frames'))
        self.max_age_periods = float(p('max_age_periods'))
        self.bridge = CvBridge()
        self.last_image: Image | None = None
        self.last_info: CameraInfo | None = None
        self.prev_stamp: float | None = None
        self.period: float | None = None  # measured from the stream, no assumed frame rate

        self.create_subscription(Image, p('image_topic'), self.on_image, image_qos(str(p('reliability'))))
        self.create_subscription(CameraInfo, p('info_topic'), self.on_info, image_qos(str(p('reliability'))))
        self.create_service(Trigger, '~/capture', self.on_capture)
        if p('mode') == 'interval':
            self.create_timer(float(p('interval_s')), self.save_latest)
        elif p('mode') != 'trigger':
            raise ValueError("mode must be 'trigger' or 'interval'")
        self.get_logger().info(f'Recording into {self.writer.dir} (mode: {p("mode")})')

    def on_image(self, msg: Image) -> None:
        t = stamp_to_sec(msg.header.stamp)
        if self.prev_stamp is not None and t > self.prev_stamp:
            dt_ = t - self.prev_stamp
            self.period = dt_ if self.period is None else 0.9 * self.period + 0.1 * dt_
        self.prev_stamp = t
        self.last_image = msg

    def on_info(self, msg: CameraInfo) -> None:
        self.last_info = msg

    def on_capture(self, _req, res):
        ok, message = self.save_latest()
        res.success, res.message = ok, message
        return res

    def save_latest(self) -> tuple[bool, str]:
        if self.max_frames and self.writer.count >= self.max_frames:
            return False, 'max_frames reached'
        img, info = self.last_image, self.last_info
        if img is None or info is None or self.period is None:
            return False, 'no image stream or camera_info received yet'
        now = self.get_clock().now().nanoseconds * 1e-9
        stamp = stamp_to_sec(img.header.stamp)
        if is_stale(stamp, now, self.period, self.max_age_periods):
            return False, f'latest image is stale ({(now - stamp) * 1e3:.0f} ms old)'
        try:
            intr = intrinsics_from_msg(info)
        except ValueError as e:
            return False, f'invalid camera_info: {e}'
        if not intr.matches_image(img.width, img.height):
            return False, f'camera_info {intr.width}x{intr.height} does not match image {img.width}x{img.height}'
        if not self.writer.set_camera_info(intr):
            self.get_logger().warning('camera_info changed during recording (flagged in manifest.yaml)')
        bgr = self.bridge.imgmsg_to_cv2(img, desired_encoding='bgr8')
        path = self.writer.add_frame(bgr, stamp, img.header.frame_id, encoding=img.encoding)
        msg = f'saved {path.name} ({self.writer.count} frames)'
        self.get_logger().info(msg)
        if self.max_frames and self.writer.count >= self.max_frames:
            self.get_logger().info('max_frames reached; stop the node to finish (Ctrl+C)')
        return True, msg


def main() -> None:
    rclpy.init()
    node = DatasetRecorder()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.writer.close()
        node.get_logger().info(f'Dataset closed: {node.writer.dir} ({node.writer.count} frames)')
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()
