# Image delivery vs QoS reliability

## Goal

Decision D2 proposed best-effort subscriptions for image consumers. Check that this delivers images at 30 Hz before building on it.

## Setup and protocol

Development laptop, ROS 2 Humble, default RMW. `probe.py` publishes rgb8 images of 640×480 and 1280×720 at 30 Hz in one process; a second process subscribes and counts images for 6 s. Same test inside a single process for comparison.

## Results

| Publisher | Subscriber | 640×480 | 1280×720 |
| --- | --- | --- | --- |
| reliable | reliable | 30.0 Hz | 30.0 Hz |
| reliable | best effort | 5.2 Hz | 0.8 Hz |
| best effort | best effort | 6.5 Hz | 1.5 Hz |

Within a single process: 150/150 images for every combination.

## Observations and limitations

Large images split into many network fragments; with best effort, losing one fragment loses the image. One run each, synthetic data, laptop only: repeat with the real camera and on the lab PC (WP2 hardware validation).

## Decision

Camera nodes subscribe with **reliable, keep last 5** by default; `reliability` is a node parameter. D2's QoS rule is updated accordingly (pending group confirmation).
