"""RGB-only RealSense acquisition with the project's topic contract (decision D2).

Topics (namespace '' and node name 'camera'):
  /camera/color/image_raw     sensor_msgs/Image, encoding rgb8
  /camera/color/camera_info   sensor_msgs/CameraInfo (factory intrinsics; calibrated relay comes with WP3)
Frame: camera_color_optical_frame (z forward, x right, y down)

Usage:
  ros2 launch ur3e_bringup camera.launch.py color_profile:=<width>,<height>,<fps>
  # list the profiles your camera supports first:  rs-enumerate-devices -s

Optional: serial_no:=<serial>  auto_exposure:=false exposure:=<value>  params_file:=<yaml>
"""
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, OpaqueFunction
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def _camera_node(context):
    profile = LaunchConfiguration('color_profile').perform(context).strip()
    parts = profile.split(',')
    if len(parts) != 3 or not all(p.strip().isdigit() for p in parts):
        raise RuntimeError(
            f"color_profile must be '<width>,<height>,<fps>' (got '{profile}'). "
            'Run `rs-enumerate-devices -s` to list the supported colour profiles.')

    overrides = {
        'rgb_camera.color_profile': profile,
        'rgb_camera.enable_auto_exposure': LaunchConfiguration('auto_exposure').perform(context).lower() == 'true',
    }
    serial = LaunchConfiguration('serial_no').perform(context).strip()
    if serial:
        overrides['serial_no'] = serial
    exposure = LaunchConfiguration('exposure').perform(context).strip()
    if exposure:
        overrides['rgb_camera.exposure'] = int(exposure)

    return [Node(
        package='realsense2_camera',
        executable='realsense2_camera_node',
        namespace='',
        name='camera',
        output='screen',
        emulate_tty=True,
        parameters=[LaunchConfiguration('params_file').perform(context), overrides],
    )]


def generate_launch_description():
    default_params = PathJoinSubstitution([FindPackageShare('ur3e_bringup'), 'config', 'realsense_rgb.yaml'])
    return LaunchDescription([
        DeclareLaunchArgument(
            'color_profile',
            description="Required. Colour profile '<width>,<height>,<fps>' supported by the connected camera."),
        DeclareLaunchArgument('serial_no', default_value='', description='Camera serial number (empty = first found).'),
        DeclareLaunchArgument('auto_exposure', default_value='true',
                              description='Set false (with exposure:=...) for calibration and experiments.'),
        DeclareLaunchArgument('exposure', default_value='', description='Manual colour exposure (driver units).'),
        DeclareLaunchArgument('params_file', default_value=default_params, description='RealSense parameter file.'),
        OpaqueFunction(function=_camera_node),
    ])
