# Coordinate frames, conventions and units

Status: agreed in planning on 26/11/2026 (D3), pending confirmation by the whole group.
Every package, message, file and report uses these conventions. If code disagrees with this file, the code is wrong or this file must be updated through review first.

## 1. Transformations

| Rule | Convention |
| --- | --- |
| Notation | `T_A_B` is the 4×4 homogeneous matrix that maps coordinates expressed in frame **B** into frame **A**: `p_A = T_A_B · p_B` |
| Meaning | `T_A_B` is also the pose of frame B expressed in frame A (same matrix as the TF lookup `lookup_transform(target=A, source=B)`) |
| Composition | `T_A_C = T_A_B @ T_B_C` (inner indices cancel) |
| Inverse | `T_B_A = inv(T_A_B)`, with `R_B_A = R_A_Bᵀ` and `t_B_A = −R_A_Bᵀ t_A_B` |
| Code names | Variables follow the notation: `T_base_cam`, `R_cam_cap`, `t_tcp_cam` |
| Storage | `numpy.ndarray` of shape (4, 4), dtype float64 |

## 2. Rotations

| Rule | Convention |
| --- | --- |
| Internal maths | Rotation matrices (3×3, orthonormal, det = +1) |
| Quaternions | Order **x, y, z, w** (ROS messages and `scipy.spatial.transform.Rotation`), unit norm, used only at message and file boundaries |
| Orientation errors | Axis–angle `θu` (θ in rad, u unit vector), e.g. PBVS rotation error |
| Euler angles | **Not allowed in interfaces, files or control laws.** Allowed only for human-readable display |

## 3. Units

SI everywhere: metre, radian, second, m/s, rad/s, newton, newton·metre. Image coordinates are in pixels (u to the right, v downwards, origin at the centre of the top-left pixel, as in OpenCV).
Calibration targets are described in **metres** (square size 0.025, not 25).
Millimetres and degrees appear only in reports, plots and the dashboard, and are labelled.

## 4. Twists (Cartesian velocities)

| Rule | Convention |
| --- | --- |
| Order | `V = [v; ω]` — linear velocity first, then angular velocity (ROS `geometry_msgs/Twist` order) |
| Meaning of a `TwistStamped` with `header.frame_id = F` | Velocity of the **origin of F**, expressed in the axes of **F** (body twist of F) |
| Allowed command frames | Frames rigidly attached to the flange: `camera_color_optical_frame` (eye-in-hand only), `gripper_tcp`, `tool0` |
| Change of frame | `V_A = Ad(T_A_B) · V_B` for two frames A and B on the same rigid body, with `Ad(T) = [[R, [t]× R], [0, R]]` |
| Timestamp | `header.stamp` = stamp of the measurement (image) the command was computed from |
| Validity | A command older than the controller timeout (preliminary: 0.1–0.2 s) is ignored and the robot is stopped |

Before WP5 (Cartesian control) we **verify**: (1) the twist convention expected by MoveIt Servo (Humble, 2.5.x) for `delta_twist_cmds` (frame used to express it, reference point), and (2) the exact frames used by the UR driver. Any difference is handled in one adapter in `ur3e_control`, never inside a visual servoing package.

## 5. Frames

| Frame | Source | Parent | Notes |
| --- | --- | --- | --- |
| `world` | optional | — | Only if a cell description needs it |
| `base_link` | `ur_description` | — | ROS (REP 103) robot base |
| `base` | `ur_description` | `base_link` | UR controller base, **rotated by π about z** relative to `base_link` |
| `tool0` | `ur_description` | `wrist_3_link` | Robot flange |
| `tool0_controller` | UR driver | `base` | Flange pose reported by the robot controller |
| `gripper_tcp` | TCP calibration (WP6) | `tool0` | Static; the point the grasp is defined at |
| `camera_color_optical_frame` | Hand-eye calibration (WP6) | `tool0` (eye-in-hand) or `base_link` (eye-to-hand) | Static; z forward, x right, y down (REP 103 optical) |
| `calib_target` | Calibration tools | camera optical frame | During calibration only |
| `bottle`, `cap` | Pose estimation | camera optical frame | See section 6 |

The camera mount is **not decided yet** (hardware-dependent). Code must take the parent frame of the camera as a parameter.

The RealSense driver's own TF tree is disabled (`publish_tf:=false`); the hand-eye result gives the optical frame directly, so there is a single source for the camera pose.

## 6. Object frames

| Frame | Origin | z axis | x, y |
| --- | --- | --- | --- |
| `cap` | Centre of the top face of the cap | Bottle axis, pointing **out of the bottle through the cap** | Arbitrary (cap is rotationally symmetric); **consumers must not use the rotation about z** |
| `bottle` | To be defined with pose estimation (WP-PBVS) | Same axis as `cap` | Arbitrary |

The desired relative poses for grasping are stored once in a shared file (`grasp.yaml`, created with the first controller): `T_tcp_cap_grasp` and `T_tcp_cap_pregrasp`. PBVS, hybrid, the MoveIt pre-grasp and the IBVS teach-by-showing step all use it.

## 7. One consistent robot model

The kinematics, Jacobian, TF tree and the calibrated UR3e model must describe the same robot:

1. The robot's factory kinematic calibration is extracted once with `ur_calibration` and stored in `ur3e_bringup/config/` (promoted like other calibration files).
2. The UR driver, `robot_state_publisher` (URDF) and MoveIt load **that same file**.
3. Our forward kinematics and Jacobian read their parameters from the same file — no hard-coded DH tables.
4. A unit/integration test compares our forward kinematics with TF (`base_link → tool0`) over many joint configurations; the Jacobian is checked against finite differences of our forward kinematics.
5. The teach pendant TCP stays at zero (flange) or, if a TCP is needed on the pendant, it is set to exactly the calibrated `gripper_tcp` value. The ROS TF is the reference.

## 8. Cameras and images

From D2 (see [architecture.md](architecture.md#image-source-contract)):

- Images: `/camera/color/image_raw`, raw (not rectified), encoding requested explicitly by each consumer through `cv_bridge`.
- Intrinsics: only from the `camera_info` message paired with the image (same stamp, same resolution). Never from a hard-coded value.
- Distortion: OpenCV / ROS `plumb_bob` model `(k1, k2, p1, p2, k3)` unless a calibration experiment justifies another one.
- Consumers undistort **points** (`cv2.undistortPoints`), not whole images, for computation.
- Normalised image coordinates: `x = (u − cx)/fx`, `y = (v − cy)/fy` after undistortion.

## 9. Pitfalls to remember

- `base` vs `base_link` differ by a rotation of π about z.
- `tool0_controller` is relative to `base`, not `base_link`.
- OpenCV `solvePnP` returns `T_cam_obj` (object in camera frame) as `(rvec, tvec)`.
- OpenCV `calibrateHandEye` uses its own argument names (`R_gripper2base` = `R_base_gripper` in our notation). Convert explicitly and test.
- Board and marker sizes in metres.
- ROS quaternions are `x, y, z, w`; some libraries (e.g. `transforms3d`) use `w, x, y, z`.
