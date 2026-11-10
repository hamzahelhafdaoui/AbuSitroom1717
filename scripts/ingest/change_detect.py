#!/usr/bin/env python3
"""Change-detect job stub.

Production change screening runs in-browser (`src/lib/imagery-review.ts`) on
Sentinel-2 COG windows with SCL cloud masks. This script documents the
server-side contract: cloud mask → log-ratio / residual → morphological filter
→ human review queue. It does not download scenes by default.
"""
from __future__ import annotations

import argparse
import json
import sys


def main() -> int:
    p = argparse.ArgumentParser(description="Emit a change-detect job plan (no pixels)")
    p.add_argument("--before", required=True, help="ISO date YYYY-MM-DD")
    p.add_argument("--after", required=True, help="ISO date YYYY-MM-DD")
    p.add_argument("--west", type=float, required=True)
    p.add_argument("--south", type=float, required=True)
    p.add_argument("--east", type=float, required=True)
    p.add_argument("--north", type=float, required=True)
    args = p.parse_args()
    plan = {
        "job": "change-detect",
        "before": args.before,
        "after": args.after,
        "bbox": [args.west, args.south, args.east, args.north],
        "steps": [
            "STAC search same MGRS tile",
            "Read RGB + SCL COG windows",
            "Exclude cloud/shadow/snow/water",
            "Median exposure normalize",
            "Threshold residual + connected components",
            "Cap 30 candidates for human review",
        ],
        "policy": "Auto text stays observational. No perpetrator. Confidence default 1–2.",
        "implementation": "src/lib/imagery-review.ts",
    }
    json.dump(plan, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
