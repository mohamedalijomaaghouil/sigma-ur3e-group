#!/usr/bin/env python3
"""B1 - Intrinsic calibration from chessboard images, compared with RealSense factory data.

Usage:
  python3 calibrate_camera.py --images data/calib_images --square 25.0

  --square = side of ONE square in mm, measured with a ruler on the printed sheet.

Outputs (in the images folder):
  calibration_result.yaml   K, D, RMS error, per-image errors, comparison with factory
  per_image_error.png       bar chart of the reprojection error per image
  coverage.png              where the corners fell in the image (should cover it all)
"""
import argparse
import glob
import os

import cv2
import numpy as np
import yaml


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--images", default="data/calib_images")
    p.add_argument("--square", type=float, required=True, help="square side in mm")
    p.add_argument("--cols", type=int, default=9)
    p.add_argument("--rows", type=int, default=6)
    args = p.parse_args()
    pattern = (args.cols, args.rows)

    # 3D corners of the board in its own frame (Z = 0), in mm
    objp = np.zeros((args.cols * args.rows, 3), np.float32)
    objp[:, :2] = np.mgrid[0:args.cols, 0:args.rows].T.reshape(-1, 2) * args.square

    files = sorted(glob.glob(os.path.join(args.images, "*.png")))
    obj_pts, img_pts, used = [], [], []
    size = None
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3)
    for f in files:
        gray = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
        size = gray.shape[::-1]
        found, corners = cv2.findChessboardCorners(gray, pattern, None)
        if not found:
            print(f"  [skip] board not found: {os.path.basename(f)}")
            continue
        corners = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
        obj_pts.append(objp)
        img_pts.append(corners)
        used.append(os.path.basename(f))
    print(f"{len(used)}/{len(files)} images usable")
    if len(used) < 10:
        raise SystemExit("Need at least 10 good images (aim for 20-30).")

    rms, K, D, rvecs, tvecs = cv2.calibrateCamera(obj_pts, img_pts, size, None, None)

    per_img = []
    for o, i, r, t in zip(obj_pts, img_pts, rvecs, tvecs):
        proj, _ = cv2.projectPoints(o, r, t, K, D)
        per_img.append(float(np.sqrt(np.mean(np.sum((proj - i) ** 2, axis=2)))))

    print(f"\nRMS reprojection error: {rms:.3f} px")
    print("K =\n", np.array2string(K, precision=2))
    print("D (k1 k2 p1 p2 k3) =", np.array2string(D.ravel(), precision=4))
    worst = np.argsort(per_img)[::-1][:3]
    print("Worst images:", ", ".join(f"{used[k]} ({per_img[k]:.2f}px)" for k in worst))

    result = {
        "image_size": list(size),
        "square_mm": args.square,
        "n_images": len(used),
        "rms_px": float(rms),
        "K": K.tolist(),
        "D": D.ravel().tolist(),
        "per_image_error_px": dict(zip(used, per_img)),
    }

    fac_path = os.path.join(args.images, "factory_camera_info.yaml")
    if os.path.exists(fac_path):
        fac = yaml.safe_load(open(fac_path))
        Kf = np.array(fac["K"]).reshape(3, 3)
        if [fac["width"], fac["height"]] != list(size):
            print("WARNING: factory info is for a different resolution!")
        comp = {}
        print("\n        ours      factory    diff     diff%")
        for name, (r, c) in {"fx": (0, 0), "fy": (1, 1), "cx": (0, 2), "cy": (1, 2)}.items():
            a, b = K[r, c], Kf[r, c]
            comp[name] = {"ours": float(a), "factory": float(b), "diff": float(a - b),
                          "diff_pct": float(100 * (a - b) / b)}
            print(f"  {name}  {a:9.2f}  {b:9.2f}  {a-b:+7.2f}  {100*(a-b)/b:+6.2f}%")
        # reprojection error of the factory model on OUR data (same board poses, refit pose only)
        Df = np.array(fac["D"], dtype=float)
        errs = []
        for o, i in zip(obj_pts, img_pts):
            ok, r, t = cv2.solvePnP(o, i, Kf, Df)
            proj, _ = cv2.projectPoints(o, r, t, Kf, Df)
            errs.append(np.sum((proj - i) ** 2, axis=2).ravel())
        fac_rms = float(np.sqrt(np.mean(np.concatenate(errs))))
        print(f"\nFactory model RMS on our images: {fac_rms:.3f} px (ours: {rms:.3f} px)")
        result["factory"] = {"K": Kf.tolist(), "D": Df.tolist(), "rms_on_our_images_px": fac_rms,
                             "comparison": comp}
    else:
        print(f"\n(no {fac_path}: factory comparison skipped)")

    out = os.path.join(args.images, "calibration_result.yaml")
    with open(out, "w") as f:
        yaml.safe_dump(result, f, sort_keys=False)
    print(f"\nSaved {out}")

    # coverage image
    cov = np.full((size[1], size[0], 3), 255, np.uint8)
    for i in img_pts:
        for pt in i.reshape(-1, 2):
            cv2.circle(cov, tuple(int(v) for v in pt), 3, (200, 0, 0), -1)
    cv2.imwrite(os.path.join(args.images, "coverage.png"), cov)

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.figure(figsize=(10, 4))
        plt.bar(range(len(per_img)), per_img)
        plt.axhline(rms, color="r", ls="--", label=f"RMS {rms:.3f} px")
        plt.xlabel("image index"); plt.ylabel("reprojection error (px)"); plt.legend()
        plt.tight_layout(); plt.savefig(os.path.join(args.images, "per_image_error.png"), dpi=120)
    except ImportError:
        pass


if __name__ == "__main__":
    main()
