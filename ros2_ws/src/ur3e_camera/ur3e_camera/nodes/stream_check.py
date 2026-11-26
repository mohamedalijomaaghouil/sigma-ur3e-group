"""Check the camera stream against the D2 contract and report the result.

    ros2 run ur3e_camera stream_check --ros-args -p duration_s:=300.0 -p output_dir:=experiments/camera/<date>_stream_check

Subscribes to the image and camera_info topics for `duration_s`, then prints a report.
If `output_dir` is set, writes `metrics.json` (experiments schema) and `report.yaml` there.
Also saves the received (factory) camera_info as `camera_info_factory.yaml` for later comparison.
"""
from __future__ import annotations

import datetime as dt
import json
import subprocess
from pathlib import Path

import rclpy
import yaml
from rclpy.node import Node
from sensor_msgs.msg import CameraInfo, Image

from ur3e_camera.core.camera_info_io import save_camera_info_yaml
from ur3e_camera.core.stream_stats import FrameSample, StreamStats, StreamTargets
from ur3e_camera.nodes.qos import image_qos
from ur3e_camera.nodes.ros_conversions import intrinsics_from_msg, stamp_to_sec


def _git_commit() -> str:
    try:
        return subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:  # not in a git checkout
        return ''


class StreamCheck(Node):
    def __init__(self) -> None:
        super().__init__('stream_check')
        self.declare_parameter('image_topic', '/camera/color/image_raw')
        self.declare_parameter('info_topic', '/camera/color/camera_info')
        self.declare_parameter('duration_s', 10.0)
        self.declare_parameter('min_rate_hz', 29.0)           # preliminary target (WP2)
        self.declare_parameter('expected_frame_id', 'camera_color_optical_frame')
        self.declare_parameter('expected_encoding', '')       # '' = not checked
        self.declare_parameter('output_dir', '')
        self.declare_parameter('reliability', 'reliable')     # reliable | best_effort

        p = lambda name: self.get_parameter(name).value  # noqa: E731
        self.duration = float(p('duration_s'))
        self.targets = StreamTargets(
            min_rate_hz=float(p('min_rate_hz')),
            expected_frame_id=str(p('expected_frame_id')),
            expected_encoding=str(p('expected_encoding')) or None,
        )
        self.output_dir = str(p('output_dir'))
        self.stats = StreamStats()
        self.factory_info = None
        self.start = None
        self.done = False

        self.create_subscription(Image, p('image_topic'), self.on_image, image_qos(str(p('reliability'))))
        self.create_subscription(CameraInfo, p('info_topic'), self.on_info, image_qos(str(p('reliability'))))
        self.create_timer(0.5, self.on_timer)
        self.get_logger().info(f"Listening to {p('image_topic')} for {self.duration:.0f} s (timer starts at the first image)")

    def now(self) -> float:
        return self.get_clock().now().nanoseconds * 1e-9

    def on_image(self, msg: Image) -> None:
        if self.done:
            return
        if self.start is None:
            self.start = self.now()
        self.stats.add(FrameSample(stamp=stamp_to_sec(msg.header.stamp), received=self.now(), width=msg.width,
                                   height=msg.height, encoding=msg.encoding, frame_id=msg.header.frame_id))

    def on_info(self, msg: CameraInfo) -> None:
        if self.done:
            return
        self.stats.add_camera_info(msg.width, msg.height)
        if self.factory_info is None:
            self.factory_info = msg

    def on_timer(self) -> None:
        if self.done:
            return
        if self.start is None:
            self.get_logger().info('Waiting for images...', throttle_duration_sec=5.0)
            return
        if self.now() - self.start >= self.duration:
            self.done = True
            self.report()

    def report(self) -> None:
        summary = self.stats.summary(self.targets.max_gap_factor)
        checks = self.stats.check(self.targets)
        log = self.get_logger()
        log.info('--- stream summary ---')
        for k, v in summary.items():
            log.info(f'{k:28s} {v}')
        log.info('--- checks (preliminary targets) ---')
        for c in checks:
            log.info(f"[{'PASS' if c['passed'] else 'FAIL'}] {c['name']}: {c['value']} (target {c['target']})")

        if self.output_dir:
            out = Path(self.output_dir)
            out.mkdir(parents=True, exist_ok=True)
            with (out / 'report.yaml').open('w') as f:
                yaml.safe_dump({'summary': _plain(summary), 'checks': _plain(checks),
                                'targets': self.targets.__dict__}, f, sort_keys=False)
            if self.factory_info is not None:
                try:
                    save_camera_info_yaml(intrinsics_from_msg(self.factory_info), out / 'camera_info_factory.yaml')
                except ValueError as e:
                    log.warning(f'factory camera_info not saved: {e}')
            metrics = {
                'schema_version': 1,
                'subsystem': 'camera',
                'experiment_id': out.name,
                'title': 'Camera stream check',
                'date': dt.date.today().isoformat(),
                'git_commit': _git_commit(),
                'validation_level': 'hardware',
                'dataset': '',
                'methods': [{
                    'name': 'realsense2_camera RGB stream', 'role': 'primary',
                    'metrics': {k: v for k, v in summary.items() if isinstance(v, (int, float))},
                }],
                'selected_method': None,
                'conclusion': ('All checks passed.' if all(c['passed'] for c in checks)
                               else 'Failed: ' + ', '.join(c['name'] for c in checks if not c['passed'])),
                'limitations': ['Image age assumes camera driver and this node share the same clock.'],
            }
            with (out / 'metrics.json').open('w') as f:
                json.dump(metrics, f, indent=2)
            log.info(f'Results written to {out}')


def _plain(obj):
    """Convert tuples to lists for YAML output."""
    if isinstance(obj, dict):
        return {k: _plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_plain(v) for v in obj]
    return obj


def main() -> None:
    rclpy.init()
    node = StreamCheck()
    try:
        while rclpy.ok() and not node.done:
            rclpy.spin_once(node, timeout_sec=0.1)
    except KeyboardInterrupt:
        if not node.done and node.stats.samples:
            node.report()
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()
