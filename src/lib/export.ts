import { ALERTS, OBSERVATIONS, SITES, WATCH_BOXES } from "@/data/catalog";
import { CONTROL_CITIES, mergedControlCities } from "@/lib/control";
import { CONTROL_ZONES } from "@/lib/osint";
import { compileSitrep } from "@/lib/sitrep";
import type { ChangeEntry, FlightEvent, ThermalEvent } from "@/lib/types";
import { PARTY_LABEL } from "@/lib/types";
import { downloadBlob } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export const CAVEAT = `LIMITATIONS — Abu Hureirah Situation Room (Sudan Wing) is a documentation archive, not a targeting system.
- Sentinel-2 10 m cannot distinguish pickup vs technical vs civilian 4x4.
- NASA FIRMS is a thermal-anomaly feed (375 m), not a strike feed. Agricultural burning, flares, and brick kilns are common false combat cues. A FIRMS gap (empty CSV, bbox miss, unreachable host) is a failure, not a silent zero and not a negative.
- ADS-B coverage in Sudan and adjacent desert corridors is sparse. Absence of a track is not absence of a flight. Never infer cargo contents.
- AIS type is typical-for-hull, never cargo contents. Lane markers are schematic corridor animation, labeled NOT LIVE AIS. Red Sea corridor AIS is not configured unless a public stream is attached. Gulf AIS is not a Red Sea contact.
- Sentinel-1 RTC is morphology context when optical is cloudy. It does not identify vehicles or prove a damage type. Speckle is not wreckage. DET does not run on S1.
- Open conflict pins are a shipped citation file, not live ACLED or UCDP event ids, and not an AHSR assessment.
- Seeded archive cards are ingested published posts — not an AHSR assessment. News pins are named-place centroids.
- Party labels and control shading are assessments. They are not confirmed occupancy. Default new detections to confidence 1–2. Auto boxes never display 4 or 5.
- Control polygons are regional and time-bounded. They are not a live frontline.
- Nothing is “confirmed” without a human review click.
- Forbidden: targeting, fire control, strike planning, kill-chain language.`;

export interface ExportFile {
  filename: string;
  mime: string;
  body: string;
}

function day(): string {
  return new Date().toISOString().slice(0, 10);
}

export function geojsonBody(): string {
  const overrides = useAppStore.getState().partyOverrides;
  const updates = useAppStore.getState().controlUpdates;
  const cities = mergedControlCities(updates);
  const fc = {
    type: "FeatureCollection" as const,
    metadata: { generated: new Date().toISOString(), caveat: CAVEAT },
    features: [
      ...SITES.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
        properties: {
          layer: "site",
          site_id: s.id,
          name: s.name,
          kind: s.kind,
          party: overrides[s.id]?.party ?? s.party,
          party_label: PARTY_LABEL[overrides[s.id]?.party ?? s.party],
          confidence: s.confidence,
          status: s.status,
          admin1: s.admin1,
          civilian_baseline: s.civilianBaseline,
          notes: s.notes,
        },
      })),
      ...CONTROL_ZONES.map((z) => {
        const ring = z.polygon.map(([lat, lon]) => [lon, lat]);
        const first = ring[0];
        if (first) ring.push(first);
        return {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [ring] },
          properties: {
            layer: "control-zone",
            id: z.id,
            faction: z.faction,
            label: z.label,
            note: z.note,
            confidence: z.confidence,
          },
        };
      }),
      ...cities.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.lon, c.lat] },
        properties: {
          layer: "control-city",
          id: c.id,
          name: c.name,
          faction: c.faction,
          as_of: c.asOf,
          confidence: c.confidence,
          note: c.note,
          source: c.source,
        },
      })),
      ...WATCH_BOXES.map((b) => ({
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [b.west, b.south],
            [b.east, b.south],
            [b.east, b.north],
            [b.west, b.north],
            [b.west, b.south],
          ]],
        },
        properties: { layer: "watch-box", id: b.id, name: b.name, notes: b.notes },
      })),
    ],
  };
  return JSON.stringify(fc, null, 2);
}

export function csvBody(): string {
  const overrides = useAppStore.getState().partyOverrides;
  const reviews = useAppStore.getState().reviews;
  const log = useAppStore.getState().changeLog;
  const cities = mergedControlCities(useAppStore.getState().controlUpdates);
  const siteLines = [
    "site_id,name,lat,lon,kind,party,confidence,status,admin1",
    ...SITES.map((s) => {
      const party = overrides[s.id]?.party ?? s.party;
      return `${s.id},"${s.name.replace(/"/g, "'")}",${s.lat},${s.lon},${s.kind},${party},${s.confidence},${s.status},"${s.admin1.replace(/"/g, "'")}"`;
    }),
  ];
  const alertLines = [
    "alert_id,type,confidence,review,lat,lon,title",
    ...ALERTS.map((a) => {
      const rev = reviews[a.id]?.state ?? a.review;
      return `${a.id},${a.type},${reviews[a.id]?.confidence ?? a.confidence},${rev},${a.lat},${a.lon},"${a.title.replace(/"/g, "'")}"`;
    }),
  ];
  const cityLines = [
    "city,lat,lon,faction,as_of,confidence,note",
    ...cities.map(
      (c) =>
        `"${c.name}",${c.lat},${c.lon},${c.faction},${c.asOf},${c.confidence},"${c.note.replace(/"/g, "'")}"`,
    ),
  ];
  const logLines = [
    "id,first_seen,title,lat,lon,source,confidence",
    ...log.slice(0, 400).map(
      (e) =>
        `${e.id},${e.firstSeen.slice(0, 10)},"${e.title.replace(/"/g, "'")}",${e.lat},${e.lon},${e.source},${e.confidence}`,
    ),
  ];
  return `# ${CAVEAT.replace(/\n/g, "\n# ")}\n\n# SITES\n${siteLines.join("\n")}\n\n# ALERTS\n${alertLines.join("\n")}\n\n# CONTROL CITIES\n${cityLines.join("\n")}\n\n# CHANGE LOG (first 400)\n${logLines.join("\n")}\n`;
}

export function briefingHtml(flights: FlightEvent[], firms: ThermalEvent[], log: ChangeEntry[]): string {
  const reviews = useAppStore.getState().reviews;
  const cities = mergedControlCities(useAppStore.getState().controlUpdates);
  const open = ALERTS.filter((a) => (reviews[a.id]?.state ?? a.review) === "unreviewed");
  const recent = [...log].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen)).slice(0, 24);
  const sit = compileSitrep({
    log,
    live: {
      firms,
      firmsMeta: { fetchedAt: null, recordCount: firms.length, status: "ok", source: "export", note: "" },
      flights,
      flightsMeta: { fetchedAt: null, recordCount: flights.length, status: "ok", source: "export", note: "" },
      reports: [],
      reportsMeta: { fetchedAt: null, recordCount: 0, status: "empty", source: "export", note: "" },
      news: [],
      newsPoints: [],
      newsMeta: { fetchedAt: null, recordCount: 0, status: "empty", source: "export", note: "" },
      gdelt: [],
      gdeltMeta: { fetchedAt: null, recordCount: 0, status: "empty", source: "export", note: "" },
      osm: [],
      osmMeta: { fetchedAt: null, recordCount: 0, status: "empty", source: "export", note: "" },
      feeds: [],
      feedsMeta: { fetchedAt: null, recordCount: 0, status: "empty", source: "export", note: "" },
      ticker: [],
      vessels: [],
      vesselsMeta: { fetchedAt: null, recordCount: 0, status: "empty", source: "export", note: "" },
      quakes: [],
      sats: [],
      eonet: [],
      launches: [],
    },
    lastSweepAt: useAppStore.getState().lastSweepAt,
  });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Abu Hureirah Situation Room briefing</title>
<style>
  body{font:14px/1.5 "IBM Plex Sans",system-ui;color:#1a1916;background:#f6f1e8;margin:32px auto;max-width:720px}
  h1{font:600 28px/1.2 Georgia,serif;margin:0 0 8px}
  .kicker{letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#6a645a}
  .caveat{border:1px solid #c9c1b2;padding:12px 14px;margin:18px 0;font-size:12px;white-space:pre-wrap}
  h2{font-size:16px;margin:28px 0 8px}
  li{margin:6px 0}
  .meta{font:12px/1.4 ui-monospace,monospace;color:#6a645a}
  footer{margin-top:32px;font-size:11px;color:#6a645a}
  @media print { body{margin:12px} }
</style></head><body>
<p class="kicker">Abu Hureirah Situation Room · Sudan Wing · six-hour documentation brief</p>
<h1>Commander one-pager</h1>
<p>${sit.windowStart.slice(0, 16).replace("T", " ")}–${sit.windowEnd.slice(11, 16)}Z · overall ${sit.overallConfidence} · public data only · no targeting</p>
<div class="caveat">${CAVEAT}</div>
<h2>Bottom line</h2>
<p>${sit.bottomLine}</p>
<h2>Key developments</h2>
<ol>${sit.developments.map((d) => `<li><strong>${d.title}</strong> — ${d.claim} / ${d.confidence} / ${d.significance}. ${d.observed} Assessment: ${d.assessment}</li>`).join("")}</ol>
<h2>Operational picture</h2>
<ul>
<li>Initiative — ${sit.picture.initiative}</li>
<li>Ground — ${sit.picture.ground}</li>
<li>Air — ${sit.picture.air}</li>
<li>Fires — ${sit.picture.fires}</li>
<li>Logistics — ${sit.picture.logistics}</li>
<li>C2 — ${sit.picture.c2}</li>
</ul>
<h2>What it means</h2>
<p>${sit.meaning}</p>
<h2>Political / strategic</h2>
<p>${sit.political}</p>
<h2>Next 24–72 hours</h2>
<p>${sit.forecast.mostLikely}</p>
<ul>${sit.forecast.watch.map((w) => `<li>${w}</li>`).join("")}</ul>
<h2>Control picture (compiled, not live)</h2>
<ul>${cities.map((c) => `<li><strong>${c.name}</strong> — ${c.faction.toUpperCase()} as of ${c.asOf} (${c.confidence}). ${c.note}</li>`).join("")}</ul>
<h2>Unreviewed alerts (${open.length})</h2>
<ol>${open.map((a) => `<li><strong>${a.title}</strong> — ${a.body} Confidence ${a.confidence}/5.</li>`).join("")}</ol>
<h2>Recent log (newest 24)</h2>
<ol>${recent.map((e) => `<li><span class="meta">${e.firstSeen.slice(0, 10)}</span> <strong>${e.title}</strong> — ${e.body.slice(0, 220)}</li>`).join("")}</ol>
<h2>Live ingest snapshot</h2>
<p>FIRMS points in AOI this cycle: ${firms.length}. Live flights: ${flights.filter((f) => f.live).length}. Observations in archive: ${OBSERVATIONS.length}. Sites: ${SITES.length}.</p>
<h2>Methods appendix</h2>
<ul>
<li><strong>Optical</strong> — NASA GIBS HLS (~30 m dated) and EOX Sentinel-2 cloudless mosaic (annual, not a date). Sentinel-2 native 10 m cannot census pickups vs technicals.</li>
<li><strong>SAR</strong> — Sentinel-1 RTC browse for cloudy gaps. Speckle is not wreckage. DET does not run on S1.</li>
<li><strong>Thermal</strong> — NASA FIRMS VIIRS 375 m. Agricultural burning, flares, and kilns are common false combat cues. A FIRMS gap is a failure, not a silent zero.</li>
<li><strong>Aviation</strong> — Public ADS-B (adsb.lol / adsb.fi / OpenSky). Coverage in Darfur and desert corridors is sparse. Absence of a track ≠ absence of a flight. Never infer cargo.</li>
<li><strong>Maritime</strong> — AIS type is typical-for-hull. Lane markers are schematic corridor animation (NOT LIVE AIS).</li>
<li><strong>Corroboration</strong> — Conflict cites are a shipped citation file, not live ACLED/UCDP ids. News pins are named-place centroids.</li>
<li><strong>Review</strong> — Nothing is “confirmed” without a human click. Auto detections default to confidence 1–2. Party labels write an audit row with reason.</li>
<li><strong>Language</strong> — Observation / identification / assessment / judgment stay distinct. Forbidden: targeting, fire control, strike planning, kill-chain language.</li>
</ul>
<p>Full methods live at <code>/methods</code>. Ethics / no-targeting policy at <code>/ethics</code>. Analyst SOP at <code>/sop</code>.</p>
<footer>Abu Hureirah Situation Room · civilian archive · every page carries this caveat · DOCS ONLY</footer>
</body></html>`;
}

export function filesForExport(flights: FlightEvent[], firms: ThermalEvent[], log: ChangeEntry[]): {
  geojson: ExportFile;
  csv: ExportFile;
  briefing: ExportFile;
} {
  const d = day();
  return {
    geojson: {
      filename: `ahsr-sites-${d}.geojson`,
      mime: "application/geo+json",
      body: geojsonBody(),
    },
    csv: {
      filename: `ahsr-export-${d}.csv`,
      mime: "text/csv",
      body: csvBody(),
    },
    briefing: {
      filename: `ahsr-briefing-${d}.html`,
      mime: "text/html",
      body: briefingHtml(flights, firms, log),
    },
  };
}

export async function saveExport(file: ExportFile): Promise<"downloaded" | "shared" | "copied" | "shown"> {
  const blob = new Blob([file.body], { type: file.mime });
  try {
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
      share?: (d: { files?: File[]; title?: string }) => Promise<void>;
    };
    const asFile = new File([blob], file.filename, { type: file.mime });
    if (typeof nav.canShare === "function" && nav.canShare({ files: [asFile] }) && nav.share) {
      await nav.share({ files: [asFile], title: file.filename });
      return "shared";
    }
  } catch {
    /* share cancelled or unsupported */
  }
  downloadBlob(file.filename, file.mime, file.body);
  return "downloaded";
}

export function exportGeoJSON() {
  const file = filesForExport([], [], []).geojson;
  void saveExport(file);
}

export function exportCsv() {
  const file = filesForExport([], [], []).csv;
  void saveExport(file);
}

export function exportBriefing(flights: FlightEvent[], firms: ThermalEvent[]) {
  const file = filesForExport(flights, firms, useAppStore.getState().changeLog).briefing;
  void saveExport(file);
}

export { CONTROL_CITIES };
