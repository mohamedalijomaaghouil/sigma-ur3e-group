# CLAUDE.md

Guidance for AI coding assistants working in this repository. Humans: see [README.md](README.md).

## Project

UR3e + Intel RealSense D435 (RGB only) + OnRobot gripper, ROS 2 Humble. Assistive bottle opening: detect cap → visual servoing (IBVS, PBVS, hybrid — all mandatory) → grasp → unscrew → lift. Academic project: the team must understand and explain every method; reports are written by the team, not by AI.

Read before working: [docs/architecture.md](docs/architecture.md), [docs/conventions.md](docs/conventions.md), [docs/workflow.md](docs/workflow.md), [progress.yaml](progress.yaml). Visual servoing work: [docs/IBVS.md](docs/IBVS.md), [docs/PBVS.md](docs/PBVS.md), [docs/VISUAL_SERVOING_BENCHMARK.md](docs/VISUAL_SERVOING_BENCHMARK.md).

## Git

- Start every session with `git status -sb` and check the branch is `Taher`. Work only there.
- Never modify, push to or merge into `main`. Never force-push or rewrite history.
- Never merge or copy work from other members' branches without explicit approval.
- Small commits: `<package or area>: <imperative summary>`. Push only after the branch owner reviews.
- No issues, milestones, repository settings or deployments without approval. Approved exception: the dashboard is deployed to GitHub Pages from `Taher` by `.github/workflows/dashboard-pages.yml` (the site is public).

## Engineering rules

- Inspect existing code first; do not duplicate functionality or reimplement whole libraries.
- Algorithms in `<package>/core/` (pure Python, no ROS); ROS 2 code in `<package>/nodes/`.
- Runtime coupling only through topics/TF/actions/config; library imports only toward pure `core/` modules. `ur3e_control` never depends on visual servoing or learning packages.
- Conventions are mandatory: `T_A_B` maps B → A; SI units; quaternions x, y, z, w; twist = velocity of the origin of `header.frame_id`, expressed in that frame; K only from the paired `camera_info`.
- No hard-coded calibration or hardware values; parameters in YAML/ROS parameters.
- Unit-test every mathematical function (pytest, runnable without ROS).
- Do not add dependencies or change the architecture silently; propose first.
- Keep kinematics, Jacobian, TF and the calibrated UR3e model consistent (one kinematics file).

## Evidence and honesty

- Each subsystem: primary implementation, purposeful alternatives, external references, independent validation. Select the final method from results.
- Never invent results, progress, hardware details or calibration values. Mark unknowns as unknown.
- Track implementation separately from offline, simulation and hardware validation in `progress.yaml`, with evidence.
- `progress.yaml` (including `next_step`) and the dashboard data are maintained only by Mohamed Taher GUERBEJ. Change them only at the maintainer's request.
- Acceptance numbers are preliminary until experiments support them.
- Experiments: `experiments/<subsystem>/<YYYY-MM-DD>_<name>/` with `config.yaml`, `metrics.json`, `plots/`, `notes.md`.
- Evidence: one YAML record per item in `media/evidence/` (contributor, task, date, commit, file or link); only approved, real material is shown.
- Do not implement IBVS/PBVS/hybrid controllers before their prerequisites (tasks in `vs_tasks`) are met.

## Safety

- Never start physical robot motion automatically. Simulation/mock hardware first; reduced speed; timeouts.
- Hardware-dependent decisions (camera mount, camera model/profile, gripper model) stay open until the equipment is available.

## Scope

Now: camera acquisition and calibration, primary + reference methods, standard ROS 2 messages, conventions, docs, simple dashboard, unit tests.
Later: replay node, latency benchmarks, exhaustive comparisons, custom messages, big maths framework, PM automation, live 3D visualisation, heavy CI/CD, robot learning.

## Environment pitfalls

- Pin `numpy<2` (Humble `cv_bridge`); install only `opencv-contrib-python`.
- RealSense defaults publish `/camera/camera/...`; our launch uses `camera_namespace:=/` to get `/camera/color/...`.
- UR `base` is `base_link` rotated by π about z.
