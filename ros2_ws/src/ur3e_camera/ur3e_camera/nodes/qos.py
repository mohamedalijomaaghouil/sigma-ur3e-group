"""Image QoS used by the camera nodes.

Measured on 26/11/2026 (experiments/camera/2026-11-26_image_qos_probe): across processes with the
default RMW, best-effort subscriptions lost most 640x480 / 1280x720 RGB frames at 30 Hz, reliable
ones received all of them. Default: reliable, keep last 5. Configurable per node.
"""
from rclpy.qos import HistoryPolicy, QoSProfile, ReliabilityPolicy


def image_qos(reliability: str = 'reliable', depth: int = 5) -> QoSProfile:
    if reliability not in ('reliable', 'best_effort'):
        raise ValueError("reliability must be 'reliable' or 'best_effort'")
    return QoSProfile(
        depth=depth,
        history=HistoryPolicy.KEEP_LAST,
        reliability=ReliabilityPolicy.RELIABLE if reliability == 'reliable' else ReliabilityPolicy.BEST_EFFORT,
    )
