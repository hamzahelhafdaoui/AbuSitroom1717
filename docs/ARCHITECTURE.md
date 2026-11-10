# Architecture — Abu Hureirah Situation Room (Sudan Wing)

Civilian OSINT / indicators-and-patterns desk for journalism, research, and human-rights documentation. **Not** a targeting, fire-control, or strike-planning system.

## Data flow

```
Public sources                    Browser sitroom (TanStack Start)
─────────────────                 ────────────────────────────────
NASA FIRMS CSV  ──────────────►  live.ts → thermal points + meta
Public ADS-B    ──────────────►  live.ts → FlightEvent[] + coverage gaps
ReliefWeb / news ─────────────►  news.ts / live.ts → NewsFeed pins
NASA GIBS WMS   ──────────────►  MapLibre HLS / VIIRS / night tiles
Earth Search COG ─────────────►  imagery-review.ts change screening
Seed archive JSON ────────────►  catalog.ts / archive.json → sites, alerts
PGLite / Neon   ◄─────────────  control desk + evidence schema (migrations)
IndexedDB       ◄─────────────  imagery reviews + EvidenceBundle packs
```

## Layers

| Layer | Role |
|-------|------|
| `src/components/map-canvas.tsx` | MapLibre map, pins, FIRMS, flights, boxes |
| `src/components/workspace.tsx` | Desk chrome, ingest loops, rails |
| `src/lib/live.ts` | FIRMS / ADS-B / vessels / GDELT / OSM |
| `src/lib/imagery-review.ts` | Sentinel-2 COG change screening |
| `src/lib/evidence.ts` | Immutable EvidenceBundle export |
| `src/lib/export.ts` | GeoJSON / CSV / HTML briefing |
| `migrations/0002_*.sql` | Control desk cities / zones |
| `migrations/0003_evidence.sql` | Site / Observation / Alert / Flight / Evidence / audit |

## Analytical doctrine (enforced in UI copy)

1. Detection ≠ attribution.
2. Multi-party (SAF / RSF / other / civilian / unknown); default party filter = All.
3. Confidence 1–5 rubric on every card; auto boxes stay ≤2.
4. Human review required before “confirmed”.
5. Every export carries the limitations caveat.

## What is intentionally absent

Sentinel Hub OAuth Processing API, Google Earth Engine workers, FIRMS MAP_KEY area API, OpenSky Trino historical pulls, object storage for scenes, and continuous server-side cron. Client-side public feeds + seed archive cover the MVP; Python stubs under `scripts/ingest/` mirror the planned server jobs.
