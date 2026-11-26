# ur3e_camera

RGB camera acquisition utilities (decision D2). Pure algorithms in `ur3e_camera/core/` (no ROS, unit-tested); ROS 2 nodes in `ur3e_camera/nodes/`.

| Node | Purpose |
| --- | --- |
| `stream_check` | Verify the camera contract: rate, gaps, timestamp order, image age, frame id, image size vs `camera_info`. Writes `metrics.json`, `report.yaml` and the factory `camera_info_factory.yaml` to `output_dir` |
| `dataset_recorder` | Record a dataset folder (`images/*.png`, `camera_info.yaml`, `frames.csv`, `manifest.yaml`) on a service call or at a fixed interval. Refuses stale images and size mismatches; never overwrites |

```bash
# camera (RGB only); list the supported profiles first: rs-enumerate-devices -s
ros2 launch ur3e_bringup camera.launch.py color_profile:=<width>,<height>,<fps>

# 5-minute stream check (WP2 acceptance), results into an experiment folder
ros2 run ur3e_camera stream_check --ros-args -p duration_s:=300.0 \
  -p output_dir:=experiments/camera/$(date +%F)_stream_check

# dataset: one frame per call
ros2 run ur3e_camera dataset_recorder --ros-args -p output_root:=data/datasets -p purpose:="..."
ros2 service call /dataset_recorder/capture std_srvs/srv/Trigger
```

## Camera: Intel RealSense D435

Facts to keep in mind (from the D435 datasheet; check on our unit):

- The RGB sensor is **rolling shutter** with fixed focus: keep the calibration board still when capturing, use a fixed exposure for experiments, and expect motion artefacts when the camera moves fast.
- The native RGB aspect ratio is 16:9; 4:3 profiles are a different crop, so **each profile needs its own calibration** (D2, D4).
- Factory colour intrinsics are read from `camera_info` by `stream_check` (`camera_info_factory.yaml`); compare them with our calibration in WP3 rather than assuming their distortion model.
- Profile choice (Q2): list the supported colour profiles with `rs-enumerate-devices -s`, then compare cap size in pixels and detection latency for the candidate profiles.

Image QoS defaults to **reliable, keep last 5** (`reliability` parameter); see `experiments/camera/2026-11-26_image_qos_probe/`.

Tests: `cd ros2_ws/src/ur3e_camera && python3 -m pytest test` (or `colcon test --packages-select ur3e_camera`).
