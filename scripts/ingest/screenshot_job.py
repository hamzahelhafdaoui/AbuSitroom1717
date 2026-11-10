#!/usr/bin/env python3
"""Screenshot / evidence-pack job stub.

Browser packs are produced by `src/lib/evidence.ts` (map canvas PNG + GIBS
browse + GeoJSON + FIRMS subset). This stub prints the folder layout expected
for durable object storage when wired later.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--finding-id", required=True)
    p.add_argument("--kind", choices=["site-scene", "flight", "alert", "multi"], default="site-scene")
    args = p.parse_args()
    root = f"evidence/{args.finding_id}"
    layout = {
        "bundle_id": args.finding_id,
        "kind": args.kind,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "folder": root,
        "files": [
            f"{root}/meta.json",
            f"{root}/scene_ids.txt",
            f"{root}/map.png",
            f"{root}/gibs_browse.jpg",
            f"{root}/firms_subset.csv",
            f"{root}/flight.json",
            f"{root}/finding.geojson",
            f"{root}/caveats.txt",
        ],
        "note": "Immutable pack. Public data only. DOCS ONLY — no targeting.",
    }
    json.dump(layout, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
