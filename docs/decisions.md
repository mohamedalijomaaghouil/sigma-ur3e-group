# Architecture decisions

Agreed in planning on 26/11/2026 (Taher branch). They remain **proposals for the group** until confirmed by all members. Details are in [architecture.md](architecture.md), [conventions.md](conventions.md), [roadmap.md](roadmap.md) and [workflow.md](workflow.md).

| ID | Decision | Summary |
| --- | --- | --- |
| D1 | Repository and packages | One folder per package under `ros2_ws/src/`; `core/` (pure) + `nodes/` (ROS); added `ur3e_geometry` and `ur3e_pose_estimation`; `ur3e_learning` and `ur3e_interfaces` deferred; top-level `experiments/`, `media/`, `web/` |
| D2 | Camera interface | RGB only, configurable profile; `/camera/color/image_raw` + paired `camera_info` matching the real resolution and calibration; raw images, undistort points; explicit encodings; image QoS **reliable, keep last 5** (changed from best effort after measurement, see below); `rosbag2` for recording and replay |
| D3 | Frames and units | `T_A_B` maps B → A; SI units; quaternions x, y, z, w; twist = velocity of the frame origin expressed in that frame; one consistent calibrated robot model |
| D4 | Calibration files | ROS `camera_info` YAML per camera serial and resolution; extrinsics YAML with metadata; results written to `experiments/`, promoted to `ur3e_bringup/config/calibration/` by review |
| D5 | Detection interface | `vision_msgs/Detection2DArray`; same output for classical, DL and ArUco methods; YOLO label format; split by session |
| D6 | Visual servoing interfaces | `PoseStamped` cap pose (z = bottle axis); shared `grasp.yaml`; `TwistStamped` outputs per controller; teach-by-showing for IBVS desired features |
| D7 | Velocity control | Own selector and DLS Cartesian controller → `forward_velocity_controller`; limits and timeout; FK/Jacobian checked against TF and finite differences |
| D8 | MoveIt and Servo | MoveIt for open-loop moves; controller switching through `controller_manager`; Servo as reference backend after its interface is verified |
| D9 | Gripper and manipulation | `GripperCommand` action; UR wrench topic; early mechanical feasibility |
| D10 | Simulation and experiments | Unit tests → kinematic simulator → mock hardware/URSim → robot; `experiments/<subsystem>/<date>_<name>/` with `metrics.json` |
| D11 | Team | One maintainer per package, several contributors; names assigned later |
| D12 | GitHub | Work on `Taher` only; small commits; push after review; PR to `main` per validated module with approval; `progress.yaml` as source of truth |
| D13 | Dashboard | React + TypeScript + Vite in `web/`, reads `progress.yaml`, experiments and docs; published with GitHub Pages from `Taher` (approved 26/11/2026; the site is public once enabled) |
| D14 | Roadmap | Phases, work packages, milestones and acceptance targets in [roadmap.md](roadmap.md) |

## Corrections recorded on 26/11/2026

- **D2 QoS (evidence-based change, to confirm):** best-effort subscriptions lost most RGB frames across processes on the development laptop (5.2 Hz received at 640×480, 0.8 Hz at 1280×720, instead of 30 Hz); reliable ones received all frames. Image consumers now default to reliable, keep last 5. Evidence: `experiments/camera/2026-11-26_image_qos_probe/`.
- Hybrid visual servoing is a mandatory requirement; it is never cut. Optional AI and robot-learning work is deferred first.
- Mechanical feasibility and fixed-bottle opening experiments start early, in parallel with the common foundation.
- Numerical acceptance thresholds are **preliminary engineering targets** until experimental evidence supports them.
- Kinematics, Jacobian, TF frames and the calibrated UR3e model must stay consistent.
- Twist conventions and MoveIt Servo command compatibility are verified before robot control is implemented.
- Implementation progress is tracked separately from offline, simulation and hardware validation.
- Hardware-dependent decisions (camera mount, camera model and profile, gripper model) stay open until we have access to the equipment.
