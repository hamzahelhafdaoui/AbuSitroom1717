import { CITATIONS, OBSERVATIONS, SITES } from "@/data/catalog";
import { CAVEAT } from "@/lib/export";
import type {
  Citation,
  Confidence,
  EvidenceBundle,
  FlightEvent,
  ThermalEvent,
} from "@/lib/types";
import { downloadBlob, snapshotUrl } from "@/lib/utils";
import { padBbox } from "@/lib/geo";
import { useAppStore } from "@/lib/store";

const DB_NAME = "ahsr-evidence-bundles";
const STORE = "bundles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Evidence storage unavailable"));
  });
}

export async function saveEvidenceBundle(bundle: EvidenceBundle): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(bundle);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save evidence bundle"));
    });
  } finally {
    db.close();
  }
}

export async function listEvidenceBundles(): Promise<EvidenceBundle[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as EvidenceBundle[]).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

function scriptHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ahsr-${(h >>> 0).toString(16)}`;
}

function geojsonForPoint(lat: number, lon: number, props: Record<string, unknown>): string {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: props,
        },
      ],
    },
    null,
    2,
  );
}

async function captureMapPng(): Promise<string | undefined> {
  const map = (window as unknown as { __ahsrMap?: { getCanvas: () => HTMLCanvasElement } }).__ahsrMap;
  try {
    return map?.getCanvas().toDataURL("image/png");
  } catch {
    return undefined;
  }
}

export async function archiveSiteScene(opts: {
  siteId: string;
  date: string;
  compareDate?: string;
  firms?: ThermalEvent[];
  notes?: string;
}): Promise<EvidenceBundle> {
  const site = SITES.find((s) => s.id === opts.siteId);
  if (!site) throw new Error("Unknown site");
  const obs = OBSERVATIONS.filter((o) => o.siteId === opts.siteId);
  const bbox = padBbox(site.lat, site.lon, 0.12);
  const sceneIds = [
    ...obs.map((o) => o.sceneId),
    `GIBS-HLS-${opts.date}`,
    opts.compareDate ? `GIBS-HLS-${opts.compareDate}` : null,
  ].filter(Boolean) as string[];
  const shot = await captureMapPng();
  const cites: Citation[] = CITATIONS.slice(0, 4);
  const nearbyFirms = (opts.firms ?? []).filter(
    (f) => Math.hypot(f.lat - site.lat, (f.lon - site.lon) * Math.cos((site.lat * Math.PI) / 180)) < 0.35,
  );
  const confidence = Math.min(5, Math.max(1, site.confidence)) as Confidence;
  const bundle: EvidenceBundle = {
    id: `ev-site-${site.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    kind: "site-scene",
    title: `${site.name} · scene archive ${opts.date}`,
    lat: site.lat,
    lon: site.lon,
    siteId: site.id,
    sceneIds,
    acquisitionTimes: [opts.date, ...(opts.compareDate ? [opts.compareDate] : [])],
    bbox,
    processing: {
      sensor: "NASA GIBS HLS / Sentinel-2 MSI browse",
      params: `date=${opts.date};compare=${opts.compareDate ?? "none"};bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
      scriptHash: scriptHash(`${site.id}|${opts.date}|${opts.compareDate ?? ""}`),
    },
    firmsSubset: nearbyFirms.slice(0, 40),
    flightJson: null,
    citations: cites,
    geojson: geojsonForPoint(site.lat, site.lon, {
      layer: "evidence-site",
      site_id: site.id,
      name: site.name,
      party: useAppStore.getState().partyOverrides[site.id]?.party ?? site.party,
      date: opts.date,
      caveat: "Documentation archive — not targeting",
    }),
    notes: opts.notes?.trim() || site.notes,
    confidence,
    screenshotDataUrl: shot,
    caveats: CAVEAT,
  };
  await saveEvidenceBundle(bundle);
  useAppStore.getState().pushAudit("evidence-archive", bundle.id, `site ${site.name} · ${opts.date}`);
  downloadEvidencePack(bundle);
  return bundle;
}

export async function archiveFlight(opts: {
  flight: FlightEvent;
  firms?: ThermalEvent[];
  notes?: string;
}): Promise<EvidenceBundle> {
  const f = opts.flight;
  const bbox = padBbox(f.lat, f.lon, 0.25);
  const shot = await captureMapPng();
  const day = f.lastSeen.slice(0, 10);
  const bundle: EvidenceBundle = {
    id: `ev-flight-${f.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    kind: "flight",
    title: `Flight ${f.typeCode || f.hex} · ${f.reg || "no-reg"}`,
    lat: f.lat,
    lon: f.lon,
    flightId: f.id,
    sceneIds: [`ADS-B-${f.hex}-${day}`],
    acquisitionTimes: [f.firstSeen, f.lastSeen],
    bbox,
    processing: {
      sensor: "Public ADS-B (adsb.lol / adsb.fi / OpenSky)",
      params: `hex=${f.hex};category=${f.category};nearest=${f.nearestAirfield}`,
      scriptHash: scriptHash(`${f.hex}|${f.lastSeen}`),
    },
    firmsSubset: (opts.firms ?? [])
      .filter((t) => Math.hypot(t.lat - f.lat, (t.lon - f.lon) * Math.cos((f.lat * Math.PI) / 180)) < 0.5)
      .slice(0, 20),
    flightJson: f,
    citations: CITATIONS.slice(0, 2),
    geojson: geojsonForPoint(f.lat, f.lon, {
      layer: "evidence-flight",
      hex: f.hex,
      reg: f.reg,
      type: f.typeCode,
      category: f.category,
      note: "Category is typical-for-airframe, never cargo contents",
    }),
    notes:
      opts.notes?.trim() ||
      f.notes ||
      "Logged public ADS-B contact. Landing not confirmed unless stated. Cargo unknown.",
    confidence: f.confidence,
    screenshotDataUrl: shot,
    caveats: CAVEAT,
  };
  await saveEvidenceBundle(bundle);
  useAppStore.getState().pushAudit("evidence-archive", bundle.id, `flight ${f.hex}`);
  downloadEvidencePack(bundle);
  return bundle;
}

export function downloadEvidencePack(bundle: EvidenceBundle) {
  const meta = {
    ...bundle,
    screenshotDataUrl: bundle.screenshotDataUrl ? "[embedded png omitted in JSON; see companion .html]" : undefined,
  };
  downloadBlob(
    `${bundle.id}.json`,
    "application/json",
    JSON.stringify(meta, null, 2),
  );
  const browse = snapshotUrl(
    bundle.acquisitionTimes[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    bundle.bbox,
    "HLS_S30_Nadir_BRDF_Adjusted_Reflectance",
  );
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${bundle.title}</title>
<style>body{font:14px/1.5 system-ui;max-width:720px;margin:24px auto;background:#111;color:#ece8e1}
pre{white-space:pre-wrap;font-size:11px;opacity:.85}.caveat{border:1px solid #5a4030;padding:12px;margin:16px 0;font-size:12px}
img{max-width:100%;border:1px solid #333}</style></head><body>
<p style="letter-spacing:.14em;text-transform:uppercase;font-size:11px;opacity:.6">Evidence bundle · docs only · no targeting</p>
<h1>${bundle.title}</h1>
<p>${bundle.createdAt} · confidence ${bundle.confidence}/5 · ${bundle.kind}</p>
<div class="caveat">${bundle.caveats.replace(/</g, "&lt;")}</div>
<p>${bundle.notes.replace(/</g, "&lt;")}</p>
<p>Scenes: ${bundle.sceneIds.join(", ")}</p>
<p>Hash: ${bundle.processing.scriptHash}</p>
<p><a href="${browse}" target="_blank" rel="noreferrer">Open GIBS browse for acquisition window</a></p>
${bundle.screenshotDataUrl ? `<h2>Map screenshot</h2><img src="${bundle.screenshotDataUrl}" alt="Map archive"/>` : ""}
<h2>GeoJSON</h2><pre>${bundle.geojson.replace(/</g, "&lt;")}</pre>
<h2>Flight JSON</h2><pre>${bundle.flightJson ? JSON.stringify(bundle.flightJson, null, 2).replace(/</g, "&lt;") : "none"}</pre>
<h2>FIRMS subset (${bundle.firmsSubset.length})</h2>
<pre>${JSON.stringify(bundle.firmsSubset, null, 2).replace(/</g, "&lt;")}</pre>
</body></html>`;
  downloadBlob(`${bundle.id}.html`, "text/html", html);
}
