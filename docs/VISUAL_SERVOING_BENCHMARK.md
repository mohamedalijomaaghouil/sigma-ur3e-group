# Visual servoing benchmark — IBVS vs PBVS vs hybrid

Common experimental protocol for comparing the three controllers (graded step 4) under equivalent conditions. Status: agreed in planning on 26/11/2026, pending confirmation by the group. Group plans: [IBVS.md](IBVS.md), [PBVS.md](PBVS.md). Hybrid visual servoing is **mandatory**.

## 1. Principles

1. **Same task:** every controller drives the gripper from the same start to the same physical goal, the pre-grasp pose in `grasp.yaml`.
2. **Same conditions:** same initial configurations, target motions, perception source, execution backend, limits, stop criterion and timeout.
3. **Separate perception from control:** run everything first with **ArUco** (perception error ≈ 0), then with **markerless** perception. Differences in stage A/B/C are control differences; extra degradation in stage D/E is due to perception.
4. **Fair tuning:** each controller is tuned once, in simulation, to the fastest convergence that never exceeds the shared velocity limits; gains are then frozen for all runs and recorded in `config.yaml`.
5. **Ground truth independent of the controllers:** an ArUco marker on the cap (measured offset) and the robot forward kinematics at convergence.
6. **Report distributions, not single runs:** median and interquartile range, number of runs, failures included.

## 2. Controllers and backends

| Controller | Output | Owner |
| --- | --- | --- |
| IBVS | `/ibvs/cmd_vel` (camera frame) | Group A |
| PBVS | `/pbvs/cmd_vel` (tool frame) | Group B |
| Hybrid (2.5D, Malis et al. 1999) | `/hybrid/cmd_vel` | Both groups |
| Learned (optional, later) | `/learned/cmd_vel` | — |

Backends: custom Cartesian controller (primary, all runs) and MoveIt Servo (reference, a subset of runs). Same `ur3e_control` limits and timeout for all controllers.

## 3. Hybrid controller tasks (joint work)

| ID | Task | Depends on | Deliverable | Acceptance (preliminary) |
| --- | --- | --- | --- | --- |
| HYB-01 | Formulation | IBVS-01, PBVS-01 | 2.5D features: image point (`x, y`) + log depth ratio `log(Z/Z*)` + `θu`; upper-triangular interaction matrix | Unit tests vs finite differences |
| HYB-02 | Simulation | HYB-01, IBVS-03, PBVS-03 | Convergence script reusing both cores | Same starts as IBVS/PBVS: converges in all, target stays in view |
| HYB-03 | Robot, static target | HYB-02, IBVS-07, PBVS-08 | Hardware runs | Same thresholds as IBVS/PBVS L1 |
| HYB-04 | Robot, moving target | HYB-03 | Tracking runs | Bounded tracking error, reported |

## 4. Scenarios

| ID | Scenario | Stage | IBVS | PBVS | Hybrid |
| --- | --- | --- | :---: | :---: | :---: |
| B1 | Static target, nominal start | A sim, B robot (ArUco), D robot (markerless) | ✓ | ✓ | ✓ |
| B2 | Static target, set of initial configurations (translations up to ±10 cm, rotations up to ±30°, incl. large rotation about the optical axis) | A, B, D | ✓ | ✓ | ✓ |
| B3 | Different bottle orientations (tilt 0°, 15°, 30°) | A, D | ✓ | ✓ | ✓ |
| B4 | Moving target (recorded hand motions replayed in simulation; slow manual motion on the robot) | A, C, E | ✓ | ✓ | ✓ |
| B5 | Calibration uncertainty (hand-eye ±1–3°, ±2–5 mm; intrinsics ±2 %) | A | ✓ | ✓ | ✓ |
| B6 | Measurement noise (image noise σ = 0.5–2 px; pose noise) | A | ✓ | ✓ | ✓ |
| B7 | Partial occlusion (cap partly hidden) | A, D | ✓ | ✓ | ✓ |
| B8 | Final grasp alignment (pre-grasp → grasp, gripper closes) | D | ✓ | ✓ | ✓ |

Stages: **A** kinematic simulation (shared simulator), **B** robot + ArUco static, **C** robot + ArUco moving, **D** robot markerless static, **E** robot markerless moving. Initial configurations and target motions are stored once in `experiments/visual_servoing_benchmark/protocol/` (`starts.yaml`, `motions/`) and reused by every controller. Moving targets on the robot cannot be repeated exactly by hand: they are measured with the ArUco ground truth and compared statistically, while exact repetition is done in simulation by replaying recorded motions.

## 5. Metrics

| Metric | Definition |
| --- | --- |
| Success | Converged within `T_max` (preliminary 20 s) without losing the target and without a safety stop |
| Convergence time | First time after which position error < 5 mm and axis error < 2° for 0.5 s (preliminary thresholds) |
| Final position error | ‖p_tcp − p_tcp*‖ in mm, measured with the ground truth, not with the controller's own estimate |
| Final orientation error | Angle between the tool approach axis and the bottle axis, in degrees (rotation about the axis ignored) |
| Path length / efficiency | TCP path length; straight-line distance / path length |
| Image behaviour | Feature trajectories, minimum distance of the cap to the image border, target-lost events |
| Velocity smoothness | RMS of the twist derivative; % of time at saturation |
| Latency | Image stamp → command publication (ms); image stamp → joint command (ms) |
| Robustness | Success rate and final error as functions of the perturbation (B5–B7) |
| Tracking (moving) | RMS and max position / axis error during tracking |

## 6. Data and logging

Each run: an experiment folder `experiments/visual_servoing_benchmark/<YYYY-MM-DD>_<controller>_<scenario>/` with `config.yaml` (controller, gains, backend, stage, scenario, start id, motion id, git commit), `metrics.json` (schema of [workflow.md](workflow.md#6-experiments), one method entry per controller when aggregated) and plots. The rosbag (on the shared Drive) records: `/camera/color/image_raw` (or compressed lossless), `/camera/color/camera_info`, `/tf`, `/tf_static`, `/joint_states`, `/<controller>/cmd_vel`, `/<controller>/error`, `/control/cmd_twist`, `/forward_velocity_controller/commands`, `/perception/detections`, `/perception/cap_pose`.

A shared analysis script (in `ur3e_simulation` or `experiments/visual_servoing_benchmark/analysis/`) computes every metric from bags or simulation logs, so that all controllers are evaluated by the same code.

## 7. Required plots and media

- Error norms vs time (position, axis; image error for IBVS) — one figure per scenario, three controllers overlaid.
- 3D TCP trajectories from the same starts.
- Image-plane trajectories of the cap (all three controllers).
- Box plots of convergence time and final errors per controller and stage.
- Robustness curves (success rate vs perturbation).
- Side-by-side videos (same start) with the camera view and an external view.

## 8. Acceptance of the benchmark

- [ ] Stage A complete for B1–B7 (all three controllers, ≥ 20 starts each)
- [ ] Stage B complete for B1–B2 (≥ 5 runs per controller) with ground truth
- [ ] Stage C/D/E: at least B1, B4, B8 with markerless perception
- [ ] All metrics computed by the shared analysis script; results visible on the dashboard comparison page
- [ ] Conclusions and limitations written in `notes.md` and in the step-4 report (by the group)

## 9. Resources

- F. Chaumette, S. Hutchinson, *Visual servo control I/II* (2006, 2007) — comparison of IBVS, PBVS and hybrid behaviours.
- E. Malis, F. Chaumette, S. Boudet, *2 1/2 D visual servoing*, IEEE T-RA 15(2), 1999.
- F. Chaumette, *Potential problems of stability and convergence in image-based and position-based visual servoing*, in *The Confluence of Vision and Control*, Springer 1998 — the classical failure cases to include in B2.
- Y.-W. Chao et al., *HandoverSim*, ICRA 2022 — replaying recorded human motions for fair comparisons.
