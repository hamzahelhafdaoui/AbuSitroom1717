# MVP build plan

## Shipped in this app

1. MapLibre desk with dated HLS/VIIRS, site pins, FIRMS, flights, watch boxes, party filter (default All).
2. Alert / flag queue with human confirm / reject / needs-imagery.
3. Site timeline, before/after compare (site + map viewport swipe).
4. Live public feeds + StatusStrip (FIRMS / ADS-B / AIS / OSM + **DOCS ONLY**).
5. News / Log / Audit / Flags / Brief / Reports / Feeds rails.
6. Imagery auto change scan (Earth Search COGs) with IndexedDB review.
7. Export GeoJSON / CSV / HTML briefing (print → PDF) with methods appendix.
8. EvidenceBundle screenshot + archive (JSON + HTML) for sites and flights.
9. Methods / Ethics / SOP / Flyer routes.
10. Postgres migrations for control desk + core documentation entities.

## Next increments (not blocking demo)

- Persist Site/Alert/Flight rows to Neon (seed JSON remains bootstrap).
- Server cron mirroring `scripts/ingest/*.py`.
- Sentinel Hub / CDSE Processing API when research credentials exist.
- Draw-drag watch boxes (viewport capture is the interim editor).
