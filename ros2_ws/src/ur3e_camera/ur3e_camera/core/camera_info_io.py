"""Camera intrinsics in the ROS `camera_info` YAML format (pure Python, no ROS).

Same layout as `camera_calibration_parsers` / `camera_info_manager`, so files written here
can be loaded by standard ROS tools (decision D4):

    image_width: 640
    image_height: 480
    camera_name: camera
    camera_matrix: {rows: 3, cols: 3, data: [fx, 0, cx, 0, fy, cy, 0, 0, 1]}
    distortion_model: plumb_bob
    distortion_coefficients: {rows: 1, cols: 5, data: [k1, k2, p1, p2, k3]}
    rectification_matrix: {rows: 3, cols: 3, data: [...]}
    projection_matrix: {rows: 3, cols: 4, data: [...]}
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml


@dataclass
class CameraIntrinsics:
    width: int
    height: int
    K: np.ndarray                               # 3×3
    D: np.ndarray                               # (n,)
    distortion_model: str = 'plumb_bob'
    R: np.ndarray = field(default_factory=lambda: np.eye(3))
    P: np.ndarray | None = None                 # 3×4; defaults to [K | 0]
    camera_name: str = 'camera'

    def __post_init__(self) -> None:
        self.K = np.asarray(self.K, dtype=float).reshape(3, 3)
        self.D = np.asarray(self.D, dtype=float).ravel()
        self.R = np.asarray(self.R, dtype=float).reshape(3, 3)
        self.P = (np.hstack([self.K, np.zeros((3, 1))]) if self.P is None
                  else np.asarray(self.P, dtype=float).reshape(3, 4))
        self.validate()

    @property
    def fx(self) -> float:
        return float(self.K[0, 0])

    @property
    def fy(self) -> float:
        return float(self.K[1, 1])

    @property
    def cx(self) -> float:
        return float(self.K[0, 2])

    @property
    def cy(self) -> float:
        return float(self.K[1, 2])

    def validate(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise ValueError(f'invalid image size {self.width}x{self.height}')
        if self.fx <= 0 or self.fy <= 0:
            raise ValueError(f'focal lengths must be positive (fx={self.fx}, fy={self.fy})')
        if not np.allclose(self.K[2], [0, 0, 1]) or self.K[1, 0] != 0:
            raise ValueError('K must have the form [[fx, s, cx], [0, fy, cy], [0, 0, 1]]')

    def matches_image(self, width: int, height: int) -> bool:
        """D2/D4 rule: intrinsics are only valid for the exact resolution they were computed for."""
        return int(width) == self.width and int(height) == self.height

    # ------------------------------------------------------------------ dict / YAML
    def to_dict(self) -> dict:
        def mat(a: np.ndarray, rows: int, cols: int) -> dict:
            return {'rows': rows, 'cols': cols, 'data': [float(v) for v in np.asarray(a).ravel()]}

        return {
            'image_width': int(self.width),
            'image_height': int(self.height),
            'camera_name': self.camera_name,
            'camera_matrix': mat(self.K, 3, 3),
            'distortion_model': self.distortion_model,
            'distortion_coefficients': mat(self.D, 1, len(self.D)),
            'rectification_matrix': mat(self.R, 3, 3),
            'projection_matrix': mat(self.P, 3, 4),
        }

    @classmethod
    def from_dict(cls, d: dict) -> 'CameraIntrinsics':
        def arr(key: str) -> np.ndarray:
            m = d[key]
            return np.asarray(m['data'], dtype=float).reshape(m['rows'], m['cols'])

        return cls(
            width=int(d['image_width']),
            height=int(d['image_height']),
            K=arr('camera_matrix'),
            D=arr('distortion_coefficients').ravel(),
            distortion_model=d.get('distortion_model', 'plumb_bob'),
            R=arr('rectification_matrix') if 'rectification_matrix' in d else np.eye(3),
            P=arr('projection_matrix') if 'projection_matrix' in d else None,
            camera_name=d.get('camera_name', 'camera'),
        )


def save_camera_info_yaml(intr: CameraIntrinsics, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w') as f:
        yaml.safe_dump(intr.to_dict(), f, sort_keys=False, default_flow_style=None)
    return path


def load_camera_info_yaml(path: str | Path) -> CameraIntrinsics:
    with Path(path).open() as f:
        return CameraIntrinsics.from_dict(yaml.safe_load(f))
