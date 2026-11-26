"""Image dataset folders (pure Python, no ROS). Format agreed in decision D2:

    <root>/<name>/
      images/000000.png ...   raw images, lossless PNG
      camera_info.yaml        intrinsics in force at capture time (ROS camera_info format)
      frames.csv              one row per image: index, file, stamp, frame_id, width, height, encoding, + extras
      manifest.yaml           what, when, which camera/profile, git commit, purpose, source

The same layout is used for real, simulated and replayed images, so offline scripts can read
any dataset without ROS. Existing datasets are never overwritten.
"""
from __future__ import annotations

import csv
import datetime as _dt
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import yaml

from .camera_info_io import CameraIntrinsics, load_camera_info_yaml, save_camera_info_yaml

FRAME_COLUMNS = ['index', 'file', 'stamp', 'frame_id', 'width', 'height', 'encoding']


@dataclass
class DatasetManifest:
    name: str
    purpose: str = ''
    source: str = 'realsense'            # realsense | sim | bag | other
    camera_model: str = ''
    camera_serial: str = ''
    profile: str = ''                    # <width>x<height>@<fps>
    git_commit: str = ''
    operator: str = ''
    notes: str = ''
    created: str = field(default_factory=lambda: _dt.datetime.now().isoformat(timespec='seconds'))
    frames: int = 0
    camera_info_changed: bool = False


class DatasetWriter:
    """Write a dataset folder. Images are expected in BGR order (OpenCV convention for cv2.imwrite)."""

    def __init__(self, root: str | Path, manifest: DatasetManifest, extra_columns: list[str] | None = None):
        self.dir = Path(root) / manifest.name
        if self.dir.exists():
            raise FileExistsError(f'dataset already exists, refusing to overwrite: {self.dir}')
        self.manifest = manifest
        self.extra_columns = list(extra_columns or [])
        (self.dir / 'images').mkdir(parents=True)
        self._csv_file = (self.dir / 'frames.csv').open('w', newline='')
        self._csv = csv.writer(self._csv_file)
        self._csv.writerow(FRAME_COLUMNS + self.extra_columns)
        self._intrinsics: CameraIntrinsics | None = None
        self._write_manifest()

    @property
    def count(self) -> int:
        return self.manifest.frames

    def set_camera_info(self, intr: CameraIntrinsics) -> bool:
        """Store the intrinsics once. Returns False (and flags the manifest) if they change mid-dataset."""
        if self._intrinsics is None:
            self._intrinsics = intr
            save_camera_info_yaml(intr, self.dir / 'camera_info.yaml')
            return True
        same = (intr.width, intr.height) == (self._intrinsics.width, self._intrinsics.height) and \
            np.allclose(intr.K, self._intrinsics.K) and np.allclose(intr.D, self._intrinsics.D)
        if not same:
            self.manifest.camera_info_changed = True
            self._write_manifest()
        return same

    def add_frame(self, image_bgr: np.ndarray, stamp: float, frame_id: str, encoding: str = 'bgr8',
                  extra: dict | None = None) -> Path:
        if image_bgr is None or image_bgr.ndim not in (2, 3):
            raise ValueError('image must be a 2D or 3D array')
        h, w = image_bgr.shape[:2]
        if self._intrinsics is not None and not self._intrinsics.matches_image(w, h):
            raise ValueError(f'image size {w}x{h} does not match camera_info '
                             f'{self._intrinsics.width}x{self._intrinsics.height}')
        index = self.manifest.frames
        rel = Path('images') / f'{index:06d}.png'
        if not cv2.imwrite(str(self.dir / rel), image_bgr):
            raise OSError(f'could not write {self.dir / rel}')
        extra = extra or {}
        self._csv.writerow([index, rel.as_posix(), f'{stamp:.9f}', frame_id, w, h, encoding]
                           + [extra.get(c, '') for c in self.extra_columns])
        self._csv_file.flush()
        self.manifest.frames += 1
        return self.dir / rel

    def close(self) -> None:
        self._write_manifest()
        self._csv_file.close()

    def __enter__(self) -> 'DatasetWriter':
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def _write_manifest(self) -> None:
        with (self.dir / 'manifest.yaml').open('w') as f:
            yaml.safe_dump(self.manifest.__dict__, f, sort_keys=False)


@dataclass
class DatasetFrame:
    index: int
    path: Path
    stamp: float
    frame_id: str
    width: int
    height: int
    encoding: str
    extra: dict


class DatasetReader:
    """Read a dataset folder written by DatasetWriter (offline evaluation, no ROS)."""

    def __init__(self, path: str | Path):
        self.dir = Path(path)
        with (self.dir / 'manifest.yaml').open() as f:
            self.manifest = yaml.safe_load(f)
        info = self.dir / 'camera_info.yaml'
        self.intrinsics = load_camera_info_yaml(info) if info.exists() else None
        with (self.dir / 'frames.csv').open(newline='') as f:
            rows = list(csv.DictReader(f))
        self.frames = [
            DatasetFrame(
                index=int(r['index']), path=self.dir / r['file'], stamp=float(r['stamp']),
                frame_id=r['frame_id'], width=int(r['width']), height=int(r['height']),
                encoding=r['encoding'], extra={k: v for k, v in r.items() if k not in FRAME_COLUMNS},
            )
            for r in rows
        ]

    def __len__(self) -> int:
        return len(self.frames)

    def image(self, i: int) -> np.ndarray:
        """Image i in BGR order (cv2.imread)."""
        img = cv2.imread(str(self.frames[i].path), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise OSError(f'could not read {self.frames[i].path}')
        return img
