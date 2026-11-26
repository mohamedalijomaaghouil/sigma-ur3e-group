# Development roadmap

Status: agreed in planning on 26/11/2026 (D14), pending confirmation by the group. The live status of every work package is in [`progress.yaml`](../progress.yaml) and on the dashboard; this file explains the plan.

Dates are targets. The demo date (09/02/2027, afternoon) comes from the updated Project-3A brief of 06/10/2026 and is to be reconfirmed with the professors. Holidays: about 19/12/2026 – 03/01/2027.

## Priorities when time is short

1. Graded requirements, **including hybrid visual servoing** (never cut).
2. Safety and validation on a fixed bottle.
3. Person-held bottle (only with approval).
4. Optional AI and robot-learning extensions — **deferred first**.

## Phases

| Phase | Period | Goal |
| --- | --- | --- |
| 0 — Baseline | 26/11 – 29/11 | Documentation, conventions, progress tracking, dashboard MVP |
| 1 — Common foundation | 30/11 – 18/12 | Camera, intrinsics, consistent robot model, joint and Cartesian velocity control, hand-eye and TCP, mechanical feasibility (in parallel) |
| Holidays | 19/12 – 03/01 | Offline work: kinematic simulator, IBVS/PBVS laws in simulation, detection dataset and training, offline pose estimation |
| 2 — Parallel servoing | 04/01 – 22/01 | IBVS (Group A), pose estimation + PBVS (Group B) on the robot with a fixed bottle; hybrid in simulation; MoveIt pre-grasp |
| 3 — Integration | 23/01 – 08/02 | Hybrid on the robot, grasp and unscrew, comparison experiments, reports, demo rehearsal |

## Work packages

| WP | Title | Block | Depends on | Blocked by (open question) |
| --- | --- | --- | --- | --- |
| WP0 | Documentation and tracking baseline | Common | — | — |
| WP1 | Web dashboard MVP | Common | WP0 | — |
| WP2 | Camera acquisition | Upstream | — | Camera model and profiles |
| WP3 | Intrinsic camera calibration | Upstream | WP2 | Camera model and profiles |
| WP4 | Robot bringup, consistent robot model, joint velocity control | Downstream | — | Lab ROS distro, External Control URCap |
| WP5 | Cartesian velocity control | Downstream | WP4 | Twist / Servo convention check |
| WP6 | Hand-eye and TCP calibration | Upstream | WP3, WP4 | Camera mount, gripper model |
| WP7 | Mechanical feasibility and fixed-bottle opening | Downstream | — | Gripper model |
| WP8 | Shared object detection | Upstream | WP2, WP3 | — |
| WP9 | Kinematic visual servoing simulator (free-flying camera first, robot later) | Common | — | — |
| WP10 | IBVS (Group A) | Parallel | WP5, WP8, WP9 | Camera mount |
| WP11 | Cap pose estimation (Group B) | Parallel | WP3, WP6, WP8 | — |
| WP12 | PBVS (Group B) | Parallel | WP5, WP9, WP11 | — |
| WP13 | Hybrid visual servoing (joint, mandatory) | Parallel | WP10, WP12 | — |
| WP14 | MoveIt open-loop positioning | Downstream | WP4, WP6 | — |
| WP15 | Grasp and unscrew skill | Downstream | WP5, WP7 | Gripper model, force/torque access |
| WP16 | Integration, comparison experiments, demo | Common | WP13, WP14, WP15 | Approval for person-held bottle |
| WP17 | Robot learning extensions | Optional | WP9, WP13 | Deferred |

Reports: one LaTeX report per graded step, written by the group (they are checked for plagiarism and AI-generated text). Report deadlines are to be confirmed.

## Parallel visual servoing plan (Groups A and B)

Detailed guides: [IBVS.md](IBVS.md) (Group A), [PBVS.md](PBVS.md) (Group B), [VISUAL_SERVOING_BENCHMARK.md](VISUAL_SERVOING_BENCHMARK.md) (common comparison and the mandatory hybrid tasks). Tasks `IBVS-01…10`, `PBVS-01…11` and `HYB-01…04` are tracked in `progress.yaml` (`vs_tasks`) and on the dashboard.

Both groups start now with mathematics and simulation, in parallel with the common foundation; hardware work starts when camera calibration, Cartesian control and hand-eye calibration are validated. Strategy for both: **theory → simulation → ArUco on the robot → real bottle**.

| Week | Dates (targets) | Group A — IBVS | Group B — PBVS |
| --- | --- | --- | --- |
| W1 | 30/11 – 06/12 | Theory and interaction matrix (IBVS-01) | Theory and pose error (PBVS-01) |
| W2 | 07/12 – 13/12 | ArUco feature extraction, point IBVS (IBVS-02) | ArUco + PnP pose estimation (PBVS-02) |
| W3 | 14/12 – 20/12 | IBVS simulation (IBVS-03) | PBVS simulation (PBVS-03) |
| W4 | 21/12 – 03/01 | Cap features, feature selection (IBVS-04/05) — holidays, offline | Classical ellipse pose (PBVS-04) — holidays, offline |
| W5 | 04/01 – 10/01 | Markerless IBVS, depth approximation (IBVS-06); hybrid formulation (HYB-01) | DL and SfM pose (PBVS-05/06); hybrid formulation (HYB-01) |
| W6 | 11/01 – 17/01 | Static robot experiments (IBVS-07); hybrid simulation (HYB-02) | Static robot experiments (PBVS-08), pose benchmark (PBVS-07); hybrid simulation |
| W7 | 18/01 – 24/01 | Moving target, robustness (IBVS-08/09) | Moving target, robustness (PBVS-09/10) |
| W8 | 25/01 – 31/01 | Benchmark, hybrid on the robot (IBVS-10, HYB-03/04) | Benchmark, hybrid on the robot (PBVS-11, HYB-03/04) |

Relative schedule: actual dates depend on lab access, calibration progress and availability. Mechanical feasibility (WP7) runs in parallel. Each group delivers a complete, independently testable pipeline on the shared perception and execution layers.

## Evidence

Every member documents their own work with code, pictures, screenshots, videos, metrics and short notes (see [workflow.md](workflow.md#7-evidence-and-individual-contributions)); the dashboard shows approved evidence per task and per group.

## Milestones

| ID | Target date | What must be true |
| --- | --- | --- |
| M0 | 27/11/2026 | Planning baseline: docs, `progress.yaml`, dashboard MVP |
| M1 | 11/12/2026 | Camera acquisition and intrinsics validated on hardware; robot model and joint velocity control validated on mock hardware/URSim |
| M2 | 18/12/2026 | Cartesian control validated in simulation; hand-eye and TCP done if the mount is known; feasibility answer: can the gripper open our bottles? |
| M3 | 08/01/2027 | Detection v1 compared; IBVS and PBVS validated in the kinematic simulator; offline pose estimation v1 |
| M4 | 22/01/2027 | IBVS and PBVS on the robot with a fixed bottle; hybrid validated in simulation; MoveIt pre-grasp |
| M5 | 31/01/2027 | Hybrid on the robot; grasp and unscrew on a fixed bottle; comparison experiments done |
| M6 | 09/02/2027 | Demo (date to reconfirm) |

## Deliverables and preliminary acceptance targets (Phase 1)

All numbers are **preliminary engineering targets**. They are revised once experimental evidence exists, and the revision is recorded in the experiment notes.

| WP | Deliverable | Preliminary acceptance target |
| --- | --- | --- |
| WP0 | Docs, `CLAUDE.md`, `progress.yaml`, `experiments/`, `media/` | Reviewed by the group |
| WP1 | Dashboard in `web/` | Builds and runs locally; all content comes from repository files; no invented results |
| WP2 | Camera launch (RGB only, profile parameter), `stream_check`, `dataset_recorder` | ≥ 29 Hz over 5 min at the chosen 30 Hz profile; `frame_id = camera_color_optical_frame`; image size equals `camera_info` size; depth disabled |
| WP3 | Intrinsic calibration in `ur3e_calibration`, promoted YAML, `camera_info` relay, comparison with factory and ROS `camera_calibration` | RMS on fit images < 0.5 px; RMS on held-out images < 0.5 px; fx, fy spread < 0.5 % over 3 sessions; synthetic tests recover K within 0.5 % |
| WP4 | Bringup, extracted kinematics, joint velocity test node | Commanded vs measured joint velocity consistent; command timeout stops the robot |
| WP5 | `ur3e_geometry`, FK, Jacobian, DLS controller, selector | FK vs TF < 0.1 mm and < 0.01°; Jacobian vs finite differences < 1e-6 (relative); TCP follows a test twist on mock hardware/URSim |
| WP6 | Hand-eye and TCP files with validation | Thresholds set from the first data (reported in mm and degrees on independent poses) |
| WP7 | Measurements and fixed-bottle opening trials | Cap diameter, opening torque, turns and wrist rotation limit measured; first opening attempts logged |

Validation is tracked separately for each work package: **implementation**, **offline** (unit tests, datasets), **simulation** (kinematic simulator, mock hardware, URSim) and **hardware**.

## Relation to the earlier plan

`docs/PLAN.md` (10/11/2026) is the group's first plan and stays as written. This roadmap reorganises the work into common upstream, parallel IBVS/PBVS and common downstream blocks.
