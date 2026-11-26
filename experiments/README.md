# Experiments

Version-controlled experiment configurations, metrics, small result files and plots. Large raw data (images, ROS bags, videos, model weights) stays outside Git, on the shared Drive; each `config.yaml` records where.

Layout, file formats and the `metrics.json` schema: [docs/workflow.md](../docs/workflow.md#6-experiments).

```text
experiments/
  _template/                          copy this folder to start a run (ignored by the dashboard)
  <subsystem>/<YYYY-MM-DD>_<name>/    one folder per run
```

Subsystem folder names: `camera`, `intrinsic_calibration`, `hand_eye`, `tcp`, `kinematics`, `cartesian_control`, `feasibility`, `detection`, `pose_estimation`, `ibvs`, `pbvs`, `hybrid`, `manipulation`, `integration`, `learning`.

Only results that were actually measured are recorded here. No experiment has been run yet.
