# Working rules

1. **Never push directly to `main`.** `main` must always build and run.
2. One branch per task, named after its block: `b3-handeye-collect`, `b4-yolo-train`, `b5-ibvs`.
3. Open a pull request; one other member reviews it before merging.
4. Each task = one GitHub issue. Link the PR to it (`Closes #12`).
5. No datasets, rosbags, weights or videos in git: put them on the shared Drive and link them.
6. Every working experiment gets a short video + its parameters noted in the PR, for the reports.
7. Reports are written by us. They are checked for plagiarism and AI-generated content.
8. Real robot: test in Gazebo first, reduced speed, e-stop within reach.

## Commit messages

`<block>: <what changed>`, e.g. `B3: add hand-eye data collection node`.

## New ROS2 package

```bash
cd ros2_ws/src/<package_dir>
ros2 pkg create --build-type ament_python <package_name> --dependencies rclpy
```
Then remove the `.gitkeep`.
