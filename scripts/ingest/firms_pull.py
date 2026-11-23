#!/usr/bin/env python3
"""FIRMS NRT pull stub — public CSV, no MAP_KEY required for the global feed.

Usage:
  python scripts/ingest/firms_pull.py --west 21.8 --south 9.4 --east 38.6 --north 22.8 --days 2

Writes JSON lines to stdout. Classify every hotspot as agricultural / industrial /
urban_structure / possible_explosive / unknown — never as a confirmed strike.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.request
from datetime import datetime, timezone

URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_48h.csv"


def main() -> int:
    p = argparse.ArgumentParser(description="Pull NASA FIRMS VIIRS CSV and clip to bbox")
    p.add_argument("--west", type=float, required=True)
    p.add_argument("--south", type=float, required=True)
    p.add_argument("--east", type=float, required=True)
    p.add_argument("--north", type=float, required=True)
    p.add_argument("--days", type=int, default=2)
    args = p.parse_args()

    with urllib.request.urlopen(URL, timeout=90) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    rows = list(csv.DictReader(text.splitlines()))
    out = []
    for r in rows:
        try:
            lat = float(r["latitude"])
            lon = float(r["longitude"])
        except (KeyError, ValueError):
            continue
        if not (args.south <= lat <= args.north and args.west <= lon <= args.east):
            continue
        out.append(
            {
                "lat": lat,
                "lon": lon,
                "acq_date": r.get("acq_date"),
                "acq_time": r.get("acq_time"),
                "satellite": r.get("satellite") or "NOAA-20",
                "confidence": r.get("confidence"),
                "frp": float(r["frp"]) if r.get("frp") else None,
                "daynight": r.get("daynight"),
                "klass": "unknown",
                "note": "Thermal anomaly only — not a strike. Optical follow-up required.",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    json.dump({"count": len(out), "records": out}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
