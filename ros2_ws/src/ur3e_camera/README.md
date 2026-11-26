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

Image QoS defaults to **reliable, keep last 5** (`reliability` parameter); see `experiments/camera/2026-11-26_image_qos_probe/`.

Tests: `cd ros2_ws/src/ur3e_camera && python3 -m pytest test` (or `colcon test --packages-select ur3e_camera`).
