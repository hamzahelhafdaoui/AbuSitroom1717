# Schema — documentation entities

Client TypeScript models live in `src/lib/types.ts`. Durable SQL (PGLite / Neon) is in `migrations/0003_evidence.sql`. Control-desk tables remain in `0002_control.sql`.

## Site

`site_id`, name, lat/lon, admin1/2, kind, `party_assessment`, confidence 1–5, first/last seen, status, civilian baseline, notes.

## Observation

`observation_id`, `site_id`, datetime, sensor, `scene_id`, cloud %, notes, `indicators[]`, vehicle estimate band, damage flag, confidence.

## Alert

`alert_id`, type (change / thermal / flight / convoy / damage / multi_source), score, linked sites/observations, lat/lon, families, confidence, `review_state` (unreviewed / confirmed / rejected / needs_imagery), negative evidence.

## FlightEvent

hex, reg, type, operator, category (pax / cargo / bizjet / tanker / unknown), origin/dest, first/last seen, nearest airfield, notes, confidence, optional `screenshot_path`.

## EvidenceBundle

Immutable pack: scene IDs, acquisition times, bbox, processing params + script hash, FIRMS subset, flight JSON, citations, GeoJSON, notes, confidence, screenshot, caveats. Browser packs also land in IndexedDB (`ahsr-evidence-bundles`).

## audit_log

`audit_id`, at, actor, action, target, reason — party labels, review clicks, watch-box edits, evidence archives.
