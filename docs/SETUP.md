# Setup

> Verified on the development laptop: Ubuntu 22.04 + ROS 2 Humble (26/11/2026). Still to confirm: the ROS 2 distribution on the lab PCs.

## 1. Dependencies

```bash
sudo apt install ros-$ROS_DISTRO-ur ros-$ROS_DISTRO-ur-moveit-config \
                 ros-$ROS_DISTRO-realsense2-camera ros-$ROS_DISTRO-moveit
pip install "numpy<2" "opencv-contrib-python==4.8.1.78" scipy
```

- `numpy<2` is required: Humble's `cv_bridge` is built against NumPy 1.x. An unpinned `opencv-contrib-python` pulls a recent OpenCV that requires NumPy 2.
- Install only one OpenCV wheel (`opencv-contrib-python`, which includes ArUco/ChArUco), not `opencv-python` alongside it.
- 4.8.1.78 is the version tested with `cv_bridge` on the development laptop.

## 2. Build

```bash
cd ros2_ws
rosdep install --from-paths src --ignore-src -y
colcon build --symlink-install
source install/setup.bash
```

## 3. Run (to be filled in as launch files are added)

| What | Command |
| --- | --- |
| UR3e in simulation | |
| Real UR3e driver | |
| RealSense (RGB only) | |
| MoveIt + RViz | |
