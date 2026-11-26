import pytest

from ur3e_camera.core.stream_stats import FrameSample, StreamStats, StreamTargets, is_stale


def make_stream(n=301, fps=30.0, drop=(), latency=0.04, size=(640, 480), frame_id='camera_color_optical_frame'):
    s = StreamStats()
    for i in range(n):
        if i in drop:
            continue
        t = i / fps
        s.add(FrameSample(stamp=t, received=t + latency, width=size[0], height=size[1],
                          encoding='rgb8', frame_id=frame_id))
    s.add_camera_info(*size)
    return s


def test_regular_stream_rate_and_age():
    s = make_stream()
    m = s.summary()
    assert m['frames'] == 301
    assert m['rate_hz'] == pytest.approx(30.0, rel=1e-6)
    assert m['gaps'] == 0 and m['estimated_missing_frames'] == 0
    assert m['age_mean_ms'] == pytest.approx(40.0)
    assert all(c['passed'] for c in s.check(StreamTargets(min_rate_hz=29.0)))


def test_dropped_frames_are_counted_as_gaps():
    s = make_stream(drop={100, 200, 201})
    m = s.summary()
    assert m['gaps'] == 2
    assert m['estimated_missing_frames'] == 3


def test_low_rate_fails():
    s = make_stream(fps=15.0, n=151)
    checks = {c['name']: c for c in s.check(StreamTargets(min_rate_hz=29.0))}
    assert not checks['frame rate (Hz)']['passed']


def test_non_increasing_stamp_detected():
    s = make_stream(n=10)
    s.add(FrameSample(stamp=0.1, received=1.0, width=640, height=480, encoding='rgb8',
                      frame_id='camera_color_optical_frame'))
    assert s.summary()['non_increasing_stamps'] == 1


def test_wrong_frame_id_and_info_size_fail():
    s = make_stream(frame_id='camera_link')
    s.info_sizes = {(1280, 720)}
    checks = {c['name']: c for c in s.check(StreamTargets())}
    assert not checks['frame_id']['passed']
    assert not checks['camera_info size = image size']['passed']


def test_too_few_frames():
    s = StreamStats()
    assert s.summary()['rate_hz'] == 0.0
    assert not all(c['passed'] for c in s.check(StreamTargets()))


def test_is_stale():
    assert not is_stale(stamp=10.0, now=10.05, period=1 / 30)
    assert is_stale(stamp=10.0, now=10.2, period=1 / 30)
