#!/usr/bin/env python3
"""Move the robot back to a saved joint position (slow joint move). Tablet must be in REMOTE mode.

  python3 go_to_pose.py                       # config/start_pose.yaml
  python3 go_to_pose.py --file config/other.yaml
Save the current position:  python3 go_to_pose.py --save config/other.yaml
"""
import argparse
import datetime
import os

import numpy as np
import rtde_receive
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--robot-ip", default="192.168.1.102")
    p.add_argument("--file", default=os.path.join(HERE, "..", "config", "start_pose.yaml"))
    p.add_argument("--save", help="save the CURRENT position to this file instead of moving")
    p.add_argument("--speed", type=float, default=0.25)
    args = p.parse_args()
    rr = rtde_receive.RTDEReceiveInterface(args.robot_ip)
    if args.save:
        q = [float(v) for v in rr.getActualQ()]
        yaml.safe_dump({"saved": datetime.datetime.now().isoformat(timespec="seconds"), "q_rad": q,
                        "q_deg": [round(float(np.degrees(v)), 2) for v in q],
                        "tcp_pose": [float(v) for v in rr.getActualTCPPose()]}, open(args.save, "w"), sort_keys=False)
        print(f"Saved current position to {args.save}")
        return
    target = yaml.safe_load(open(args.file))["q_rad"]
    now = rr.getActualQ()
    print("joint   now(deg)  target(deg)")
    for i, (a, b) in enumerate(zip(now, target)):
        print(f"  {i}   {np.degrees(a):8.1f}  {np.degrees(b):8.1f}")
    input("Hand on the EMERGENCY STOP. ENTER to move (Ctrl+C to cancel)... ")
    import rtde_control
    rc = rtde_control.RTDEControlInterface(args.robot_ip)
    try:
        rc.moveJ(target, args.speed, 0.3)
        print("Arrived.")
    finally:
        rc.stopScript()


if __name__ == "__main__":
    main()
