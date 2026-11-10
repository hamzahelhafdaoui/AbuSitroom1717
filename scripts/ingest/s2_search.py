#!/usr/bin/env python3
"""Sentinel-2 L2A STAC search via Element 84 Earth Search (public).

Does not call Sentinel Hub Processing API (quota / OAuth). Use for scene
discovery; change detection in-app uses geotiff.js on COG window reads.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

STAC = "https://earth-search.aws.element84.com/v1/search"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--west", type=float, required=True)
    p.add_argument("--south", type=float, required=True)
    p.add_argument("--east", type=float, required=True)
    p.add_argument("--north", type=float, required=True)
    p.add_argument("--days", type=int, default=30)
    p.add_argument("--cloud", type=float, default=40)
    args = p.parse_args()
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=args.days)
    body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": [args.west, args.south, args.east, args.north],
        "datetime": f"{start.date().isoformat()}/{end.date().isoformat()}",
        "limit": 20,
        "query": {"eo:cloud_cover": {"lt": args.cloud}},
    }
    req = urllib.request.Request(
        STAC,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "ahsr-ingest/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    feats = []
    for f in data.get("features") or []:
        props = f.get("properties") or {}
        assets = f.get("assets") or {}
        feats.append(
            {
                "id": f.get("id"),
                "datetime": props.get("datetime"),
                "cloud": props.get("eo:cloud_cover"),
                "visual": (assets.get("visual") or {}).get("href"),
                "note": "Public COG. Morphology only at 10 m — not a vehicle census.",
            }
        )
    json.dump({"count": len(feats), "features": feats}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
