#!/usr/bin/env python3
"""B3 - Solve AX = XB (eye-in-hand) with the 5 OpenCV methods and compare them.

Usage:
  python3 handeye_solve.py --samples data/handeye/samples.yaml

X = T_tool0_cam (camera pose in the tool0 frame).
Validation: the board is fixed, so T_base_board = T_base_tool0 @ X @ T_cam_board must be the
same for every sample. Its spread (translation in mm, rotation in deg) is the error metric.
Output: handeye_result.yaml next to samples.yaml (best method by translation spread).
"""
import argparse
import os

import cv2
import numpy as np
import yaml
from scipy.spatial.transform import Rotation

METHODS = {
    "TSAI": cv2.CALIB_HAND_EYE_TSAI,
    "PARK": cv2.CALIB_HAND_EYE_PARK,
    "HORAUD": cv2.CALIB_HAND_EYE_HORAUD,
    "ANDREFF": cv2.CALIB_HAND_EYE_ANDREFF,
    "DANIILIDIS": cv2.CALIB_HAND_EYE_DANIILIDIS,
}


def spread(T_list):
    """Spread of a set of poses that should be identical: mean/max translation and rotation deviation."""
    t = np.array([T[:3, 3] for T in T_list])
    t_mean = t.mean(axis=0)
    dt = np.linalg.norm(t - t_mean, axis=1) * 1000.0
    R_mean = Rotation.from_matrix([T[:3, :3] for T in T_list]).mean()
    dr = np.array([np.degrees((R_mean.inv() * Rotation.from_matrix(T[:3, :3])).magnitude())
                   for T in T_list])
    return dt, dr


def solve(samples, method):
    R_g2b = [np.array(s["T_base_tool0"])[:3, :3] for s in samples]
    t_g2b = [np.array(s["T_base_tool0"])[:3, 3] for s in samples]
    R_t2c = [np.array(s["T_cam_board"])[:3, :3] for s in samples]
    t_t2c = [np.array(s["T_cam_board"])[:3, 3] for s in samples]
    R, t = cv2.calibrateHandEye(R_g2b, t_g2b, R_t2c, t_t2c, method=method)
    X = np.eye(4)
    X[:3, :3], X[:3, 3] = R, t.ravel()
    return X


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--samples", default="data/handeye/samples.yaml")
    args = p.parse_args()
    samples = yaml.safe_load(open(args.samples))
    print(f"{len(samples)} samples")
    if len(samples) < 5:
        raise SystemExit("Need at least 5 samples (aim for 15-25).")

    # rotation diversity: angle between tool orientations (big = good)
    Rs = [Rotation.from_matrix(np.array(s["T_base_tool0"])[:3, :3]) for s in samples]
    ang = [np.degrees((Rs[i].inv() * Rs[j]).magnitude()) for i in range(len(Rs)) for j in range(i + 1, len(Rs))]
    print(f"Tool rotation between poses: max {max(ang):.1f} deg, median {np.median(ang):.1f} deg "
          f"(want max > 40 deg)\n")

    # X-free consistency check: between 2 poses, the tool and the camera turn by the SAME angle.
    A = [np.array(s["T_base_tool0"]) for s in samples]
    B = [np.array(s["T_cam_board"]) for s in samples]
    n = len(samples)
    mis = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            a = Rotation.from_matrix((np.linalg.inv(A[j]) @ A[i])[:3, :3]).magnitude()
            b = Rotation.from_matrix((B[j] @ np.linalg.inv(B[i]))[:3, :3]).magnitude()
            mis[i, j] = np.degrees(abs(a - b))
    per = np.median(mis, axis=1)
    bad = [samples[k]["image"] for k in range(n) if per[k] > 2.0]
    print("Angle mismatch tool vs camera (median per sample, deg):", np.round(per, 1))
    print("Suspicious samples (>2 deg):", ", ".join(bad) if bad else "none", "\n")

    results = {}
    print(f"{'method':11s} {'x mm':>7s} {'y mm':>7s} {'z mm':>7s}  {'rx':>6s} {'ry':>6s} {'rz':>6s}"
          f"  | spread: t mean/max (mm)  R mean/max (deg)")
    for name, m in METHODS.items():
        X = solve(samples, m)
        T_bb = [np.array(s["T_base_tool0"]) @ X @ np.array(s["T_cam_board"]) for s in samples]
        dt, dr = spread(T_bb)
        rpy = Rotation.from_matrix(X[:3, :3]).as_euler("xyz", degrees=True)
        results[name] = {"X_tool0_cam": X.tolist(), "rpy_deg": rpy.tolist(),
                         "t_spread_mean_mm": float(dt.mean()), "t_spread_max_mm": float(dt.max()),
                         "R_spread_mean_deg": float(dr.mean()), "R_spread_max_deg": float(dr.max()),
                         "per_sample_t_mm": dt.tolist()}
        x, y, z = X[:3, 3] * 1000
        print(f"{name:11s} {x:7.1f} {y:7.1f} {z:7.1f}  {rpy[0]:6.1f} {rpy[1]:6.1f} {rpy[2]:6.1f}"
              f"  | {dt.mean():6.2f} / {dt.max():6.2f}        {dr.mean():5.2f} / {dr.max():5.2f}")

    best = min(results, key=lambda k: results[k]["t_spread_mean_mm"])
    worst = np.argsort(results[best]["per_sample_t_mm"])[::-1][:3]
    print(f"\nBest (smallest translation spread): {best}")
    print("Worst samples for it:", ", ".join(
        f"{samples[k]['image']} ({results[best]['per_sample_t_mm'][k]:.1f} mm)" for k in worst))

    out = os.path.join(os.path.dirname(args.samples), "handeye_result.yaml")
    with open(out, "w") as f:
        yaml.safe_dump({"n_samples": len(samples), "best_method": best,
                        "X_tool0_cam": results[best]["X_tool0_cam"], "methods": results}, f, sort_keys=False)
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
