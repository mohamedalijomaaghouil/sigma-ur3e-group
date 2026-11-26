"""Cross-process image delivery probe: run one publisher and one subscriber process.

    python3 probe.py pub <reliable|best_effort> <width> <height>   # publishes rgb8 images at 30 Hz for 9 s
    python3 probe.py sub <reliable|best_effort> <width> <height> <label>   # counts images for 6 s
"""
import sys, time, numpy as np, rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from sensor_msgs.msg import Image
role, rel, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
qos = QoSProfile(depth=5, history=HistoryPolicy.KEEP_LAST,
                 reliability=ReliabilityPolicy.RELIABLE if rel == 'reliable' else ReliabilityPolicy.BEST_EFFORT)
rclpy.init(); n = Node(role)
if role == 'pub':
    pub = n.create_publisher(Image, '/probe2', qos)
    img = Image(); img.width, img.height, img.encoding, img.step = w, h, 'rgb8', w * 3
    img.data = np.zeros((h, w, 3), np.uint8).tobytes()
    def tick():
        img.header.stamp = n.get_clock().now().to_msg(); pub.publish(img)
    n.create_timer(1 / 30, tick); end = time.time() + 9
    while time.time() < end: rclpy.spin_once(n, timeout_sec=0.01)
else:
    got = [0]; n.create_subscription(Image, '/probe2', lambda m: got.__setitem__(0, got[0] + 1), qos)
    end = time.time() + 6
    while time.time() < end: rclpy.spin_once(n, timeout_sec=0.01)
    print(f'{sys.argv[5]} sub={rel} {w}x{h}: {got[0] / 6:.1f} Hz received (published 30 Hz)')
rclpy.shutdown()
