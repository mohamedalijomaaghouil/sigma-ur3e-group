import numpy as np
import pytest

from ur3e_camera.core.camera_info_io import CameraIntrinsics
from ur3e_camera.core.dataset import DatasetManifest, DatasetReader, DatasetWriter

K = [[615.0, 0.0, 320.0], [0.0, 615.0, 240.0], [0.0, 0.0, 1.0]]


def image(seed=0, size=(480, 640)):
    rng = np.random.default_rng(seed)
    return rng.integers(0, 255, size=(*size, 3), dtype=np.uint8)


def test_write_and_read_back(tmp_path):
    with DatasetWriter(tmp_path, DatasetManifest(name='ds', purpose='test'), extra_columns=['note']) as w:
        w.set_camera_info(CameraIntrinsics(640, 480, K, np.zeros(5)))
        imgs = [image(i) for i in range(3)]
        for i, img in enumerate(imgs):
            w.add_frame(img, stamp=100.0 + i / 30, frame_id='camera_color_optical_frame', encoding='rgb8',
                        extra={'note': f'n{i}'})
    r = DatasetReader(tmp_path / 'ds')
    assert len(r) == 3
    assert r.manifest['frames'] == 3 and r.manifest['purpose'] == 'test'
    assert r.intrinsics.matches_image(640, 480)
    assert r.frames[1].stamp == pytest.approx(100.0 + 1 / 30, abs=1e-9)
    assert r.frames[2].extra['note'] == 'n2'
    np.testing.assert_array_equal(r.image(0), imgs[0])   # PNG is lossless


def test_never_overwrites(tmp_path):
    DatasetWriter(tmp_path, DatasetManifest(name='ds')).close()
    with pytest.raises(FileExistsError):
        DatasetWriter(tmp_path, DatasetManifest(name='ds'))


def test_size_mismatch_rejected(tmp_path):
    with DatasetWriter(tmp_path, DatasetManifest(name='ds')) as w:
        w.set_camera_info(CameraIntrinsics(1280, 720, K, np.zeros(5)))
        with pytest.raises(ValueError):
            w.add_frame(image(), stamp=0.0, frame_id='camera_color_optical_frame')


def test_camera_info_change_is_flagged(tmp_path):
    with DatasetWriter(tmp_path, DatasetManifest(name='ds')) as w:
        assert w.set_camera_info(CameraIntrinsics(640, 480, K, np.zeros(5)))
        K2 = np.array(K)
        K2[0, 0] = 600.0
        assert not w.set_camera_info(CameraIntrinsics(640, 480, K2, np.zeros(5)))
    assert DatasetReader(tmp_path / 'ds').manifest['camera_info_changed'] is True
