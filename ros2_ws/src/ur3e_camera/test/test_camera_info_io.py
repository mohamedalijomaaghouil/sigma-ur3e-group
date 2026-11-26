import numpy as np
import pytest
import yaml

from ur3e_camera.core.camera_info_io import CameraIntrinsics, load_camera_info_yaml, save_camera_info_yaml

K = [[615.0, 0.0, 320.5], [0.0, 614.0, 240.25], [0.0, 0.0, 1.0]]
D = [0.1, -0.2, 0.001, -0.002, 0.05]


def test_roundtrip(tmp_path):
    intr = CameraIntrinsics(640, 480, K, D)
    path = save_camera_info_yaml(intr, tmp_path / 'cam.yaml')
    back = load_camera_info_yaml(path)
    assert (back.width, back.height) == (640, 480)
    np.testing.assert_allclose(back.K, K)
    np.testing.assert_allclose(back.D, D)
    np.testing.assert_allclose(back.P[:, :3], K)
    assert back.distortion_model == 'plumb_bob'


def test_ros_layout(tmp_path):
    path = save_camera_info_yaml(CameraIntrinsics(640, 480, K, D), tmp_path / 'cam.yaml')
    d = yaml.safe_load(path.read_text())
    assert set(d) >= {'image_width', 'image_height', 'camera_name', 'camera_matrix', 'distortion_model',
                      'distortion_coefficients', 'rectification_matrix', 'projection_matrix'}
    assert d['camera_matrix']['rows'] == 3 and len(d['camera_matrix']['data']) == 9
    assert d['projection_matrix']['cols'] == 4


def test_matches_image():
    intr = CameraIntrinsics(640, 480, K, D)
    assert intr.matches_image(640, 480)
    assert not intr.matches_image(1280, 720)


@pytest.mark.parametrize('bad_k', [
    [[0.0, 0, 320], [0, 614, 240], [0, 0, 1]],      # fx = 0 (e.g. driver without intrinsics)
    [[615, 0, 320], [1, 614, 240], [0, 0, 1]],      # not upper triangular
])
def test_invalid_intrinsics_rejected(bad_k):
    with pytest.raises(ValueError):
        CameraIntrinsics(640, 480, bad_k, D)
