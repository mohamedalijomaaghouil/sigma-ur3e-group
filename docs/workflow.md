# Development and Git workflow

Status: agreed in planning on 26/11/2026 (D10–D12), pending confirmation by the group. Where it differs from [CONTRIBUTING.md](../CONTRIBUTING.md), the group decides which rule to keep.

## 1. Branches

| Rule | Detail |
| --- | --- |
| Personal branch | Work for this track is done on `Taher` only |
| `main` | Never modified or pushed to directly; merged only through an approved pull request |
| History | Never force-push, never rebase pushed commits, never rewrite shared history |
| Other branches | Not merged or copied into `Taher`; coordination first |
| Keeping up to date | `git fetch origin` then `git merge origin/main` into `Taher` when appropriate, after committing local work |
| Pull requests | One per **validated** module, with its evidence (tests, experiment folder, dashboard page). Opened only with approval |
| Repository settings | No issues, milestones, project boards, settings or deployments without approval. The dashboard is published with GitHub Pages from `Taher` (approved 26/11/2026; public site) |

### Session checklist

```bash
cd ~/sigma-ur3e-group
git status -sb            # on Taher? clean tree?
git fetch origin          # see what others pushed (do not merge blindly)
git log --oneline -5 origin/main
```

## 2. Commits

- Small and meaningful: one logical change per commit, code and its tests together.
- Message: `<package or area>: <imperative summary>`, for example `ur3e_camera: add stream_check node`, `docs: add frame conventions`, `web: add progress page`.
- Update `progress.yaml` in the same commit as the work it describes, with evidence.
- Pushed only after review by the branch owner.
- No datasets, bags, weights or videos in Git (see `.gitignore`); they live on the shared Drive.

## 3. Code rules

- Inspect existing code before writing new code; do not duplicate functionality.
- Algorithms in `<package>/core/` (pure Python, no ROS imports); ROS 2 communication in `<package>/nodes/`.
- Parameters in YAML or ROS parameters, never hard-coded calibration or hardware values.
- Unit tests (pytest) for every mathematical function, runnable without ROS.
- Conventions in [conventions.md](conventions.md) are mandatory.
- New dependencies are proposed and justified before they are added.
- Validate in this order: unit tests → offline data → simulation (kinematic simulator, mock hardware, URSim) → hardware.

## 4. Robot safety

- No robot motion is started automatically by scripts or assistants; a person starts every motion with the e-stop in reach.
- Reduced speed on the teach pendant, saturated velocities and a command timeout for every new controller.
- A bottle in a fixture until validation, a risk assessment and professor approval allow a person-held bottle.

## 5. Methodology for algorithmic work

For every major subsystem (calibration, kinematics, control, detection, pose estimation, visual servoing, learning):

1. Formulate the mathematical problem.
2. Survey available methods.
3. Pick a **primary** implementation candidate.
4. Select **alternative** and **reference** methods, each with a clear purpose.
5. Define common inputs and outputs.
6. Define the comparison protocol (same data, same initial conditions).
7. Define quantitative metrics.
8. Implement and test progressively.
9. Compare under equivalent conditions.
10. Select the integration method from the results and justify it.
11. Document results, limitations and the decision.

Agreement between implementations is cross-validation, not validation: every subsystem also needs an independent experiment. Keep differences in targets/data separate from differences in solvers. Do not reimplement whole libraries; own implementations focus on the mathematics the course requires.

## 6. Experiments

Each run lives in its own folder:

```text
experiments/<subsystem>/<YYYY-MM-DD>_<short_name>/
  config.yaml     method, parameters, dataset id, hardware, git commit
  metrics.json    machine-readable results (schema below), read by the dashboard
  plots/          PNG or SVG figures
  notes.md        what was done, observations, limitations, decision
```

`metrics.json`:

```json
{
  "schema_version": 1,
  "subsystem": "intrinsic_calibration",
  "experiment_id": "2026-12-05_charuco_vs_chessboard",
  "title": "ChArUco vs chessboard calibration",
  "date": "2026-12-05",
  "git_commit": "<hash>",
  "validation_level": "hardware",
  "dataset": "<dataset id>",
  "methods": [
    {"name": "ChArUco + calibrateCamera", "role": "primary",
     "metrics": {"rms_fit_px": 0.0, "rms_holdout_px": 0.0}}
  ],
  "selected_method": "<name or null>",
  "conclusion": "<one or two sentences>",
  "limitations": ["<text>"]
}
```

`role` is one of `primary`, `alternative`, `reference`, `validation`. `validation_level` is one of `offline`, `simulation`, `hardware`. Folders whose name starts with `_` (such as `_template`) are ignored by the dashboard.

Raw data (images, bags) stays outside Git; `config.yaml` records where it is.

## 7. Evidence and individual contributions

Every team member documents **their own** work: code is not enough. For every meaningful completed task, the contributor adds the evidence that shows it works, with the task, date, experiment and code version. Not every task needs a video, but every major experimental milestone needs visual evidence.

| Type | Examples | Where |
| --- | --- | --- |
| Source code | Commits, pull requests | Git |
| Pictures | Setup, calibration board, robot configuration | `media/figures/` (small) |
| Screenshots | RViz, simulation, detections, TF tree | `media/figures/` |
| Videos | Robot motion, visual servoing, manipulation | Shared Drive (linked), optional small poster image in `media/figures/` |
| Quantitative results | CSV, JSON, plots, metrics | `experiments/<subsystem>/<run>/` |
| Technical notes | Method, observations, limitations | `experiments/<subsystem>/<run>/notes.md` |

| Task | Expected visual evidence |
| --- | --- |
| Camera acquisition | RGB stream screenshot, stream-check report |
| Camera calibration | Board detections, undistorted images, error plots |
| Hand-eye calibration | Robot configurations, TF visualisation |
| TCP calibration | Video of the procedure |
| Cartesian control | Video of the robot following commanded twists, tracking plots |
| Object detection | Annotated images, detection video |
| IBVS | Video with current/desired features and error convergence |
| PBVS | Video with the estimated cap frame and the robot trajectory |
| Hybrid | Side-by-side comparison videos |
| Unscrewing | Complete bottle-opening video |

**How to record an item:** add one small YAML file per item in `media/evidence/` (one file each, so there are no merge conflicts), named `<YYYY-MM-DD>_<task>_<short-name>.yaml`; copy `media/evidence/_template.yaml`:

```yaml
title: IBVS with 4 ArUco corners converging in simulation
task: IBVS-03                 # work package or task id (WP2, IBVS-03, PBVS-04, HYB-02, ...)
subsystem: ibvs               # camera, intrinsic_calibration, hand_eye, ibvs, pbvs, pose_estimation, hybrid, ...
type: plot                    # picture | screenshot | video | plot | data | document
contributor: <full name>
date: 2026-12-10
description: Feature trajectories from 20 random starts; all converge in < 6 s.
validation_level: simulation  # offline | simulation | hardware
status: draft                 # draft until the progress maintainer approves it, then approved
git_commit: <hash of the code used>
experiment: experiments/ibvs/2026-12-10_aruco_sim   # optional
file: media/figures/ibvs_aruco_sim_2026-12-10.png   # small file in the repository, or
url: ""                                              # link to a large video on the shared Drive
```

Rules: only real, approved material is shown on the dashboard (`status: approved`); nothing is invented or staged; faces of people other than consenting team members are not published; videos stay on the shared Drive and are linked.

## 8. Progress tracking

[`progress.yaml`](../progress.yaml) is the single source of truth for work packages, visual servoing tasks (`vs_tasks`), milestones, open questions and validation status. The dashboard reads it.

**Maintainer:** only Mohamed Taher GUERBEJ edits `progress.yaml` (statuses, evidence, next step, milestones) and the dashboard data. Other members send their results and status updates to the maintainer (message, issue or pull request comment); they do not edit the file themselves.

- A work package is `done` only when its deliverables meet their acceptance targets and evidence is linked.
- Validation is tracked separately for implementation, offline, simulation and hardware.
- Acceptance numbers are preliminary until experimental evidence supports them; changes are explained in the experiment notes.
- GitHub issues and milestones may mirror `progress.yaml` later, with approval.

## 9. Scope: now vs later

| Now | Later, when needed |
| --- | --- |
| Camera acquisition, camera calibration | Custom replay node |
| Primary and reference methods | Exhaustive algorithm comparisons |
| Basic ROS 2 interfaces with standard messages | Custom messages |
| Coordinate-frame conventions, minimal shared maths | Large maths framework |
| Git history and documentation | Project-management automation |
| Simple, polished dashboard | Live ROS 2 monitoring, 3D robot visualisation |
| Unit tests | Extensive CI/CD |
