"""Conversions between ROS 2 messages and the pure `core` types."""
from __future__ import annotations

from builtin_interfaces.msg import Time
from sensor_msgs.msg import CameraInfo

from ur3e_camera.core.camera_info_io import CameraIntrinsics


def stamp_to_sec(stamp: Time) -> float:
    return stamp.sec + stamp.nanosec * 1e-9


def intrinsics_from_msg(msg: CameraInfo) -> CameraIntrinsics:
    return CameraIntrinsics(
        width=msg.width,
        height=msg.height,
        K=list(msg.k),
        D=list(msg.d),
        distortion_model=msg.distortion_model or 'plumb_bob',
        R=list(msg.r),
        P=list(msg.p),
        camera_name='camera',
    )
