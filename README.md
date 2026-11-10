# Vision-based pick-and-place on UR3e

SIGMA S9 semester project: a UR3e (ROS2) with an Intel RealSense (RGB only) detects an object,
estimates its pose and grasps it using visual servoing.

| Step | Content | Where |
| --- | --- | --- |
| 1 | Camera calibration, joint/Cartesian velocity control | `calibration/`, `ur3e_velocity/` |
| 2 | Hand-eye calibration | `calibration/` |
| 3 | ArUco + object detection and pose (OpenCV vs DL vs SfM) | `perception/`, `dl/` |
| 4 | MoveIt open loop, IBVS / PBVS / hybrid visual servoing | `servoing/` |
| 5 | Application scenario + demo | `ur3e_bringup/` (launch files) |

Group plan (roles, timeline, methods): [docs/PLAN.md](docs/PLAN.md).

## Layout

```
ros2_ws/src/
  ur3e_bringup/    B0  launch files: UR driver, MoveIt, RealSense, RViz
  ur3e_velocity/   B2  joint and Cartesian velocity control
  calibration/     B1 + B3  camera intrinsics, hand-eye calibration
  perception/      B4  ArUco, OpenCV detection, DL inference, SfM, pose
  servoing/        B5  MoveIt pick-and-place, IBVS / PBVS / hybrid
dl/                dataset scripts, training notebooks (no data, no weights)
reports/           one LaTeX report per step, shared template
docs/              setup and how-to guides
data/              ignored by git: datasets, bags, videos live on the shared Drive
```

## Quick start

See [docs/SETUP.md](docs/SETUP.md). Working rules: [CONTRIBUTING.md](CONTRIBUTING.md).

## Members

| Name | GitHub | Role |
| --- | --- | --- |
| | | R1 Robot and ROS2 |
| | | R2 Calibration |
| | | R3 Classic vision |
| | | R4 Deep learning |
| | | R5 SfM and integration |
