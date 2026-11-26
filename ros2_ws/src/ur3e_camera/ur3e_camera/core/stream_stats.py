"""Image stream statistics (pure Python, no ROS).

Used by the `stream_check` node to verify the camera contract of decision D2:
frame rate, gaps, timestamp order, image age, image size vs camera_info size, frame id, encoding.

Times are in seconds. `stamp` is the image header stamp; `received` is the time the
message was received on the same clock (ROS time on the same machine), so
`received - stamp` is the image age (acquisition + driver + transport delay).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from statistics import median

import numpy as np


@dataclass(frozen=True)
class FrameSample:
    stamp: float
    received: float
    width: int
    height: int
    encoding: str
    frame_id: str


@dataclass
class StreamTargets:
    """Acceptance targets. Preliminary engineering values until evidence supports them."""

    min_rate_hz: float = 29.0
    expected_frame_id: str = 'camera_color_optical_frame'
    expected_encoding: str | None = None   # None = do not check
    max_gap_factor: float = 1.5            # a gap is an interval longer than this × median period


@dataclass
class StreamStats:
    samples: list[FrameSample] = field(default_factory=list)
    info_sizes: set[tuple[int, int]] = field(default_factory=set)
    info_count: int = 0

    def add(self, sample: FrameSample) -> None:
        self.samples.append(sample)

    def add_camera_info(self, width: int, height: int) -> None:
        self.info_sizes.add((int(width), int(height)))
        self.info_count += 1

    # ------------------------------------------------------------------ metrics
    def summary(self, max_gap_factor: float = 1.5) -> dict:
        n = len(self.samples)
        out: dict = {
            'frames': n,
            'camera_info_messages': self.info_count,
            'image_sizes': sorted({(s.width, s.height) for s in self.samples}),
            'camera_info_sizes': sorted(self.info_sizes),
            'encodings': sorted({s.encoding for s in self.samples}),
            'frame_ids': sorted({s.frame_id for s in self.samples}),
        }
        if n < 2:
            out.update(duration_s=0.0, rate_hz=0.0)
            return out

        stamps = np.array([s.stamp for s in self.samples])
        received = np.array([s.received for s in self.samples])
        dt = np.diff(stamps)
        duration = float(stamps[-1] - stamps[0])
        med = float(median(dt[dt > 0])) if np.any(dt > 0) else 0.0
        gaps = dt > max_gap_factor * med if med > 0 else np.zeros_like(dt, dtype=bool)
        # Frames probably missing inside gaps: round(dt / median) - 1 per gap.
        missing = int(np.sum(np.round(dt[gaps] / med) - 1)) if med > 0 else 0
        age = (received - stamps) * 1e3

        out.update(
            duration_s=duration,
            rate_hz=(n - 1) / duration if duration > 0 else 0.0,
            period_median_ms=med * 1e3,
            period_std_ms=float(np.std(dt) * 1e3),
            period_max_ms=float(np.max(dt) * 1e3),
            gaps=int(np.sum(gaps)),
            estimated_missing_frames=missing,
            non_increasing_stamps=int(np.sum(dt <= 0)),
            age_mean_ms=float(np.mean(age)),
            age_p95_ms=float(np.percentile(age, 95)),
            age_max_ms=float(np.max(age)),
        )
        return out

    def check(self, targets: StreamTargets) -> list[dict]:
        """Return one entry per acceptance check: name, passed, value, target."""
        s = self.summary(targets.max_gap_factor)
        checks = [
            _check('frames received', s['frames'] >= 2, s['frames'], '>= 2'),
            _check('frame rate (Hz)', s.get('rate_hz', 0.0) >= targets.min_rate_hz,
                   round(s.get('rate_hz', 0.0), 2), f'>= {targets.min_rate_hz}'),
            _check('timestamps strictly increasing', s.get('non_increasing_stamps', 0) == 0,
                   s.get('non_increasing_stamps', 0), '0'),
            _check('frame_id', s['frame_ids'] == [targets.expected_frame_id],
                   s['frame_ids'], targets.expected_frame_id),
            _check('single image size', len(s['image_sizes']) == 1, s['image_sizes'], 'one size'),
            _check('camera_info received', s['camera_info_messages'] > 0, s['camera_info_messages'], '> 0'),
            _check('camera_info size = image size',
                   len(s['image_sizes']) == 1 and s['camera_info_sizes'] == s['image_sizes'],
                   s['camera_info_sizes'], s['image_sizes']),
        ]
        if targets.expected_encoding:
            checks.append(_check('encoding', s['encodings'] == [targets.expected_encoding],
                                 s['encodings'], targets.expected_encoding))
        return checks


def _check(name: str, passed: bool, value, target) -> dict:
    return {'name': name, 'passed': bool(passed), 'value': value, 'target': target}


def image_age(stamp: float, now: float) -> float:
    """Age of an image in seconds."""
    return now - stamp


def is_stale(stamp: float, now: float, period: float, max_periods: float = 3.0) -> bool:
    """True if the image is older than `max_periods` frame periods (D2: stale images are 'no measurement')."""
    return image_age(stamp, now) > max_periods * period
