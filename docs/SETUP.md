# Setup

> To confirm with the professors: ROS2 distro on the lab PCs (Humble or Jazzy).

## 1. Dependencies

```bash
sudo apt install ros-$ROS_DISTRO-ur ros-$ROS_DISTRO-ur-moveit-config \
                 ros-$ROS_DISTRO-realsense2-camera ros-$ROS_DISTRO-moveit
pip install opencv-contrib-python numpy scipy
```

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
