#!/usr/bin/env python3
"""OpenSky / public ADS-B state vector stub for Sudan AOI boxes.

Respect rate limits. Mark coverage gaps explicitly — silence is not absence.
Never claim cargo contents.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Public lamin/lomin/lamax/lomax box (example: Khartoum metro)
DEFAULT = dict(lamin=15.2, lomin=32.2, lamax=15.9, lomax=32.9)


def main() -> int:
    p = argparse.ArgumentParser()
    for k, v in DEFAULT.items():
        p.add_argument(f"--{k}", type=float, default=v)
    args = p.parse_args()
    qs = urllib.parse.urlencode(
        {k: getattr(args, k) for k in ("lamin", "lomin", "lamax", "lomax")}
    )
    url = f"https://opensky-network.org/api/states/all?{qs}"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.load(resp)
    except Exception as exc:  # noqa: BLE001 — surface gap honestly
        json.dump(
            {
                "status": "gap",
                "note": f"OpenSky unreachable or rate-limited: {exc}",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "states": [],
            },
            sys.stdout,
            indent=2,
        )
        sys.stdout.write("\n")
        return 0

    states = data.get("states") or []
    rows = []
    for s in states:
        # OpenSky vector layout: 0 icao24, 1 callsign, 5 lon, 6 lat, 7 baro, …
        if not s or s[5] is None or s[6] is None:
            continue
        rows.append(
            {
                "hex": s[0],
                "callsign": (s[1] or "").strip(),
                "lon": s[5],
                "lat": s[6],
                "alt_m": s[7],
                "category": "unknown",
                "note": "Public ADS-B. Category/typical-airframe only — never cargo.",
            }
        )
    json.dump(
        {
            "status": "ok" if rows else "empty",
            "count": len(rows),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "states": rows,
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
