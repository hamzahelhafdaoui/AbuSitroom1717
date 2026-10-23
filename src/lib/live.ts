import { createServerFn } from "@tanstack/react-start";
import { AIRFIELDS, FLIGHTS, SITES, THERMAL } from "@/data/catalog";
import { inAoi, nearest } from "@/lib/geo";
import { pullNews } from "@/lib/news";
import { allVessels } from "@/lib/traffic";
import { pullFeeds, pullGdelt, pullOsm, pullTicker } from "@/lib/warroom";
import type {
  AirCategory,
  Citation,
  FlightEvent,
  LiveBundle,
  LiveMeta,
  ThermalClass,
  ThermalEvent,
  VesselEvent,
} from "@/lib/types";
import { AOI } from "@/lib/types";
import { pullGevWorld } from "@/lib/gev-world";

const UA =
  "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";

type CacheEntry<T> = { at: number; value: T };
const mem = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 90_000;

function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = mem.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  return fn().then((value) => {
    mem.set(key, { at: Date.now(), value });
    return value;
  });
}

async function fetchText(url: string, ms = 12000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/plain, application/json, */*", "User-Agent": UA },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function meta(
  source: string,
  count: number,
  note: string,
  status: LiveMeta["status"] = "ok",
): LiveMeta {
  return {
    fetchedAt: new Date().toISOString(),
    recordCount: count,
    status: count === 0 && status === "ok" ? "empty" : status,
    source,
    note,
  };
}

function classifyThermal(
  lat: number,
  lon: number,
  frp: number,
  daynight: "D" | "N",
): ThermalClass {
  const near = nearest(lat, lon, SITES, 8);
  if (!near) return "unknown";
  const kind = near.item.kind;
  if (kind === "farm") return "agricultural";
  if (near.item.id === "heglig") return "industrial";
  if (kind === "hospital" || kind === "camp" || kind === "market") {
    return frp >= 10 ? "possible_explosive" : "urban_structure";
  }
  if (kind === "port" || kind === "logistics") {
    return frp >= 40 ? "industrial" : "unknown";
  }
  if (daynight === "N" && kind === "airfield" && frp >= 8) return "unknown";
  return "unknown";
}

function inFirmsBox(lat: number, lon: number): boolean {
  if (lat >= 8 && lat <= 24 && lon >= 21 && lon <= 40) return true;
  if (lat >= 22 && lat <= 28 && lon >= 30 && lon <= 36) return true;
  if (lat >= 8 && lat <= 15 && lon >= 33 && lon <= 40) return true;
  if (lat >= 8 && lat <= 16 && lon >= 15 && lon <= 24) return true;
  if (lat >= 20 && lat <= 24 && lon >= 20 && lon <= 26) return true;
  if (lat >= 12 && lat <= 23 && lon >= 36 && lon <= 44) return true;
  return false;
}

function parseFirmsCsv(csv: string, satellite: string): ThermalEvent[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iLat = idx("latitude");
  const iLon = idx("longitude");
  const iDate = idx("acq_date");
  const iTime = idx("acq_time");
  const iConf = idx("confidence");
  const iFrp = idx("frp");
  const iDn = idx("daynight");
  const iSat = idx("satellite");
  if (iLat < 0 || iLon < 0) return [];
  const out: ThermalEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = (lines[i] ?? "").split(",");
    const lat = Number(cols[iLat]);
    const lon = Number(cols[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inFirmsBox(lat, lon)) continue;
    const frp = Number(cols[iFrp] ?? 0) || 0;
    const daynight = ((cols[iDn] ?? "D") === "N" ? "N" : "D") as "D" | "N";
    const site = nearest(lat, lon, SITES, 6);
    out.push({
      // Include CSV line index so co-located / same-slot detections never collide as React keys.
      id: `live-th-${satellite}-${cols[iDate]}-${cols[iTime]}-${lat.toFixed(5)}-${lon.toFixed(5)}-r${i}`,
      lat,
      lon,
      acqDate: cols[iDate] ?? "",
      acqTime: String(cols[iTime] ?? "").padStart(4, "0"),
      satellite: cols[iSat] || satellite,
      confidence: String(cols[iConf] ?? ""),
      frp,
      daynight,
      klass: classifyThermal(lat, lon, frp, daynight),
      siteId: site?.item.id,
      live: true,
    });
  }
  return out;
}

function firmsUrls(window: "24h" | "48h" | "7d"): { sat: string; url: string }[] {
  const span = window;
  return [
    { sat: "NOAA-20", url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_${span}.csv` },
    { sat: "NOAA-21", url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_${span}.csv` },
    { sat: "MODIS", url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_${span}.csv` },
  ];
}

async function pullOneFirm(
  u: { sat: string; url: string },
  window: "24h" | "48h" | "7d",
): Promise<{ rows: ThermalEvent[]; note: string; ok: boolean }> {
  try {
    const csv = await fetchText(u.url, window === "7d" ? 45000 : 25000);
    if (!csv.includes("latitude")) throw new Error("CSV missing header");
    const rows = parseFirmsCsv(csv, u.sat);
    return { rows, note: `${u.sat} ${rows.length}`, ok: true };
  } catch (err) {
    const why = err instanceof Error ? err.message : "fail";
    console.warn("[firms]", u.sat, err);
    return { rows: [], note: `${u.sat} fail (${why})`, ok: false };
  }
}

async function pullFirms(window: "24h" | "48h" | "7d" = "24h"): Promise<{ rows: ThermalEvent[]; meta: LiveMeta }> {
  const urls = firmsUrls(window);
  const viirs = urls.filter((u) => u.sat !== "MODIS");
  const modis = urls.find((u) => u.sat === "MODIS");
  const first = await Promise.all(viirs.map((u) => pullOneFirm(u, window)));
  const viirsRows = first.reduce((n, p) => n + p.rows.length, 0);
  let parts = first;
  if (viirsRows === 0 && modis) {
    parts = [...first, await pullOneFirm(modis, window)];
  }
  const collected = parts.flatMap((p) => p.rows);
  const notes = parts.map((p) => p.note);
  const anyOk = parts.some((p) => p.ok);
  const dedup = new Map<string, ThermalEvent>();
  for (const r of collected) {
    const k = `${r.satellite}-${r.acqDate}-${(Math.round(r.lat / 0.003) * 0.003).toFixed(3)}-${(Math.round(r.lon / 0.003) * 0.003).toFixed(3)}`;
    const prev = dedup.get(k);
    if (!prev || r.frp > prev.frp) dedup.set(k, r);
  }
  const rows = [...dedup.values()].sort((a, b) => b.frp - a.frp).slice(0, 800);
  const latest = rows.map((r) => `${r.acqDate}T${r.acqTime}`).sort().at(-1) ?? "none";
  if (!anyOk) {
    return {
      rows: [],
      meta: meta(
        "NASA FIRMS",
        0,
        `FIRMS gap · public CSV unreachable (${notes.join("; ")}). No FIRMS_MAP_KEY is set; area API was not used. Not a silent zero — the feed failed. Thermal anomaly ≠ strike.`,
        "error",
      ),
    };
  }
  if (rows.length === 0) {
    return {
      rows: [],
      meta: meta(
        "NASA FIRMS VIIRS/MODIS public CSV",
        0,
        `FIRMS gap · CSVs parsed but no points in the Sudan-plus-corridors box this ${window} (${notes.join(", ")}). Empty is a coverage result, not a negative. Not a strike feed.`,
        "empty",
      ),
    };
  }
  return {
    rows,
    meta: meta(
      `NASA FIRMS public CSV ${window}`,
      rows.length,
      `FIRMS ok · ${rows.length} points · last acq ${latest} UTC · ${notes.join(", ")}. Deduped ~375 m. Class is agricultural / industrial / urban / possible-explosive / unknown. Possible is the ceiling without optical follow-up. Not a strike pin.`,
    ),
  };
}

export const getFirmsWindow = createServerFn({ method: "GET" })
  .inputValidator((data: { window?: "24h" | "48h" | "7d" }) => {
    const window = data?.window === "48h" || data?.window === "7d" ? data.window : "24h";
    return { window };
  })
  .handler(async ({ data }) => pullFirms(data.window === "48h" || data.window === "7d" ? data.window : "24h"));

function classifyAirframe(type: string, category?: string): AirCategory {
  const t = (type || "").toUpperCase();
  if (/IL76|IL-76|A50|C17|C-17|C130|C-130|A400|AN12|AN-12|AN124|AN-124|Y20|Y-20|B763F|B77L|A33F|MD11/.test(t))
    return "cargo";
  if (/KC135|K35R|IL78|A330MRTT|K35/.test(t)) return "tanker";
  if (/GLF|GLEX|CL60|C56X|FA7X|FA50|E55P|GL5T|GA6C|C700/.test(t)) return "bizjet";
  if (/A31|A32|A33|B73|B77|B78|E19|E29|AT7|DH8|C208|B350/.test(t)) return "pax";
  if (category?.startsWith("A7") || category === "C3") return "cargo";
  return "unknown";
}

function nearestAirfieldName(lat: number, lon: number): string {
  const n = nearest(lat, lon, AIRFIELDS, 80);
  if (!n) return "none in 80 km (ADS-B gap possible)";
  return `${n.item.name} (~${n.km.toFixed(0)} km)`;
}

interface RawAc {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  category?: string;
  squawk?: string;
  emergency?: string;
}

const MIL_CALL =
  /^(RCH|SPAR|SAM|AF1|ASCOT|BAF|GAF|DUKE|NAVY|REACH|EVAC|CNV|CFC|IAM|SUD|KAF|UAE)/i;
const MIL_TYPE = /C17|C130|C5|KC135|KC10|IL76|IL-76|AN12|AN124|A400|E3|P8|C30J|K35/;

function inferRoute(ac: RawAc, lat: number, lon: number, track?: number): { origin: string; dest: string } {
  const near = nearestAirfieldName(lat, lon);
  const call = (ac.flight || "").trim();
  const inUaeBox = lat >= 22.45 && lat <= 26.55 && lon >= 51.35 && lon <= 56.65;
  const inAfricaBox = !inUaeBox && lat >= -1.2 && lat <= 32.8 && lon >= 9.5 && lon <= 51.5;
  const origin = inUaeBox
    ? (near.startsWith("none") ? "UAE FIR" : near)
    : /^A6-/i.test(ac.r || "")
      ? "UAE registry (position not in UAE FIR)"
      : "unreconstructed";
  let dest = "unreconstructed";
  if (inAfricaBox && (inUaeBox || origin !== "unreconstructed")) dest = near.startsWith("none") ? "African airspace" : near;
  if (inUaeBox && track != null && track >= 170 && track <= 310) dest = "west/southwest of UAE (Africa heading)";
  if (/\b(ETD|UAE|FDB)\b/i.test(call) && inAfricaBox) dest = near;
  return { origin, dest };
}

function toFlight(ac: RawAc, source: string): FlightEvent | null {
  const lat = Number(ac.lat);
  const lon = Number(ac.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inAoi(lat, lon)) return null;
  const typeCode = (ac.t || "UNK").toUpperCase();
  const category = classifyAirframe(typeCode, ac.category);
  const callsign = (ac.flight || "").trim();
  const alt = typeof ac.alt_baro === "number" ? ac.alt_baro : Number(ac.alt_baro);
  const now = new Date().toISOString();
  const route = inferRoute(ac, lat, lon, ac.track);
  const squawk = String(ac.squawk || "");
  const emergency = squawk === "7700" || squawk === "7600" || squawk === "7500" || (ac.emergency != null && ac.emergency !== "none");
  const military =
    emergency ||
    category === "cargo" ||
    category === "tanker" ||
    MIL_TYPE.test(typeCode) ||
    MIL_CALL.test(callsign);
  return {
    id: `live-fl-${(ac.hex || `${lat}-${lon}`).toLowerCase()}`,
    hex: (ac.hex || "unknown").toLowerCase(),
    reg: ac.r || "unknown",
    typeCode,
    operator: callsign || "unknown",
    category,
    origin: route.origin,
    dest: route.dest,
    firstSeen: now,
    lastSeen: now,
    lat,
    lon,
    altFt: Number.isFinite(alt) ? alt : undefined,
    track: ac.track,
    gs: ac.gs,
    squawk: squawk || undefined,
    emergency,
    nearestAirfield: nearestAirfieldName(lat, lon),
    notes: `Live ${source}. ${emergency ? `Squawk ${squawk}. ` : ""}Category is airframe-typical, not a payload claim. ADS-B in this region is sparse — absence of a track is not absence of a flight.`,
    confidence: 1,
    relevant: true,
    live: true,
    military,
  };
}

function normalizeAdsbPayload(json: unknown): RawAc[] {
  if (!json || typeof json !== "object") return [];
  const o = json as { ac?: RawAc[]; aircraft?: RawAc[] };
  const list = Array.isArray(o.ac) ? o.ac : Array.isArray(o.aircraft) ? o.aircraft : [];
  return list.filter((a) => a && typeof a === "object");
}

async function pullAdsbPoint(lat: number, lon: number, dist: number): Promise<RawAc[]> {
  const urls = [
    `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`,
    `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`,
  ];
  for (const url of urls) {
    try {
      const text = await fetchText(url, 10000);
      const rows = normalizeAdsbPayload(JSON.parse(text));
      if (rows.length) return rows;
    } catch (err) {
      console.warn("[adsb]", url, err);
    }
  }
  return [];
}

async function pullOpenSky(): Promise<RawAc[]> {
  const url = `https://opensky-network.org/api/states/all?lamin=${AOI.south}&lomin=${AOI.west}&lamax=${AOI.north}&lomax=${AOI.east}`;
  try {
    const text = await fetchText(url, 10000);
    const json = JSON.parse(text) as { states?: unknown[][] };
    const states = json.states ?? [];
    return states.map((s) => ({
      hex: String(s[0] ?? ""),
      flight: String(s[1] ?? ""),
      r: "",
      t: "",
      lon: Number(s[5]),
      lat: Number(s[6]),
      alt_baro: typeof s[7] === "number" ? Math.round(Number(s[7]) * 3.28084) : undefined,
      track: typeof s[10] === "number" ? Number(s[10]) : undefined,
      gs: typeof s[9] === "number" ? Math.round(Number(s[9]) * 1.94384) : undefined,
    }));
  } catch (err) {
    console.warn("[opensky]", err);
    return [];
  }
}

async function pullFlights(): Promise<{ rows: FlightEvent[]; meta: LiveMeta }> {
  // Four boxes, not sixteen. adsb.lol 429s when this desk fans out, and a 429
  // looks identical to "tracking disappeared."
  // Coverage-rich boxes first (Gulf / Red Sea approaches / Cairo / Addis). Khartoum is usually empty ADS-B.
  const points: [number, number, number][] = [
    [25.25, 55.36, 220], // UAE / Al Dhafra
    [21.54, 39.17, 200], // Jeddah / Red Sea
    [30.05, 31.35, 180], // Cairo
    [8.98, 38.8, 160], // Addis
    [15.6, 32.5, 200], // Khartoum (often gap — still try)
    [19.6, 37.2, 160], // Port Sudan
  ];
  const raw: RawAc[] = [];
  let source = "adsb.lol / adsb.fi";
  // Parallel with a small concurrency cap to avoid 429s
  const chunk = 3;
  for (let i = 0; i < points.length; i += chunk) {
    const slice = points.slice(i, i + chunk);
    const batches = await Promise.all(slice.map(([la, lo, d]) => pullAdsbPoint(la, lo, d)));
    for (const batch of batches) raw.push(...batch);
  }
  if (raw.length === 0) {
    const sky = await pullOpenSky();
    raw.push(...sky);
    source = "OpenSky Network (anonymous)";
  }
  const seen = new Set<string>();
  const rows: FlightEvent[] = [];
  for (const ac of raw) {
    const fl = toFlight(ac, source);
    if (!fl || seen.has(fl.hex)) continue;
    seen.add(fl.hex);
    rows.push(fl);
  }
  if (rows.length === 0) {
    return {
      rows: FLIGHTS.map((f) => ({ ...f, live: false })),
      meta: meta(
        "Archive sample (live ADS-B empty)",
        FLIGHTS.length,
        "No live state vectors in the AOI. ADS-B coverage in Sudan, Darfur, and the desert corridors is sparse. Showing the curated archive so the review workflow still runs. Absence of a track is not absence of a flight.",
        "gap",
      ),
    };
  }
  return {
    rows,
    meta: meta(
      source,
      rows.length,
      "Live positions are ADS-B only (UAE, Egypt, Jeddah, Addis). Khartoum and Darfur are usually a coverage gap. Category is typical for the airframe, never a cargo claim.",
      rows.length < 3 ? "gap" : "ok",
    ),
  };
}

async function pullReports(): Promise<{ rows: Citation[]; meta: LiveMeta }> {
  // ReliefWeb v2 requires an approved appname (403 without it). Use free outlet RSS instead.
  const feeds: { publisher: string; url: string; reliability: Citation["reliability"] }[] = [
    { publisher: "The Guardian", url: "https://www.theguardian.com/world/sudan/rss", reliability: "high" },
    { publisher: "BBC Africa", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", reliability: "high" },
    { publisher: "UN News", url: "https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml", reliability: "high" },
  ];
  const rows: Citation[] = [];
  const notes: string[] = [];
  for (const f of feeds) {
    try {
      const xml = await fetchText(f.url, 12000);
      const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
      let n = 0;
      for (const b of blocks) {
        if (n >= 4) break;
        const title = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
          ?.replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();
        const link =
          b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ||
          b.match(/href="(https?:\/\/[^"]+)"/i)?.[1];
        const dateRaw = b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
        if (!title || !link) continue;
        if (f.publisher !== "The Guardian" && !/sudan|darfur|khartoum|fasher|nyala|rsf|saf /i.test(title)) {
          continue;
        }
        const t = dateRaw ? Date.parse(dateRaw) : NaN;
        rows.push({
          id: `cite-${f.publisher}-${n}-${link.slice(-24)}`,
          title,
          publisher: f.publisher,
          date: Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10),
          url: link,
          reliability: f.reliability,
          note: "Public RSS corroboration. Not ground truth.",
        });
        n += 1;
      }
      notes.push(`${f.publisher} ${n}`);
    } catch (err) {
      console.warn("[reports]", f.publisher, err);
      notes.push(`${f.publisher} gap`);
    }
  }
  if (rows.length === 0) {
    return {
      rows: [],
      meta: meta("Public outlet RSS", 0, `Corroboration feeds empty (${notes.join("; ")}).`, "error"),
    };
  }
  return {
    rows,
    meta: meta(
      "Guardian / BBC / UN News RSS",
      rows.length,
      `Free corroboration layer (${notes.join(", ")}). Not ReliefWeb (appname required).`,
    ),
  };
}

async function pullHormuzAis(): Promise<VesselEvent[]> {
  const text = await fetchText("https://hormuz.data-tracking.net/api/ships", 15000);
  const json = JSON.parse(text) as {
    mmsi?: string;
    name?: string;
    ship_category?: string;
    flag?: string;
    destination?: string;
    latitude?: number;
    longitude?: number;
    zone?: string;
    speed?: number;
    course?: number;
    timestamp?: string;
  }[];
  if (!Array.isArray(json)) return [];
  const rows: VesselEvent[] = [];
  for (const s of json) {
    const lat = Number(s.latitude);
    const lon = Number(s.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < 22 || lat > 31 || lon < 47 || lon > 62) continue;
    const mmsi = String(s.mmsi || `${lat.toFixed(3)}-${lon.toFixed(3)}`);
    rows.push({
      id: `ais-${mmsi}`,
      name: (s.name || `MMSI ${mmsi}`).trim(),
      lat,
      lon,
      flag: (s.flag || "unknown").toLowerCase(),
      kind: "ais",
      sog: Number.isFinite(Number(s.speed)) ? Number(s.speed) : 0,
      cog: Number.isFinite(Number(s.course)) ? Number(s.course) : 0,
      destination: s.destination || s.zone || "unspecified",
      notes: `Live AIS · ${s.ship_category || "vessel"} · ${s.zone || "gulf"} · ${s.timestamp || ""}. Strait of Hormuz Ship Monitor (CC BY 4.0). Type is typical, not cargo contents. Not a Red Sea contact unless the position is west of 47E.`,
      live: true,
      updatedAt: s.timestamp,
    });
  }
  return rows;
}

async function pullVessels(): Promise<{ rows: VesselEvent[]; meta: LiveMeta }> {
  try {
    const ais = await pullHormuzAis();
    if (ais.length) {
      return {
        rows: ais,
        meta: meta(
          "Strait of Hormuz Ship Monitor",
          ais.length,
          "Live AIS in the Persian Gulf, Strait of Hormuz, and Gulf of Oman. Red Sea corridor markers on the map are still schematic — there is no keyless live AIS feed for that lane. Not a cargo claim.",
          "ok",
        ),
      };
    }
  } catch (err) {
    console.warn("[ais]", err);
  }
  const rows = allVessels();
  return {
    rows,
    meta: meta(
      "Port nodes + documented Red Sea / Aden lane animation",
      rows.length,
      "Live Gulf AIS was unreachable this cycle. Port nodes are real harbours. Moving markers follow published shipping lanes — they are NOT live AIS contacts.",
      "gap",
    ),
  };
}

export const getLiveBundle = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveBundle> => {
    return cached("live-bundle-gev1", TTL_MS, async () => {
      const [firms, flights, reports, news, gdelt, osm, feeds, vessels, gev] = await Promise.all([
        pullFirms(),
        pullFlights(),
        pullReports(),
        pullNews(),
        pullGdelt(),
        pullOsm(),
        pullFeeds(),
        pullVessels(),
        pullGevWorld(),
      ]);
      const ticker = await pullTicker(
        news.items.map((n) => ({ source: n.source, title: n.title, url: n.url })),
      );
      return {
        firms: firms.rows,
        firmsMeta: firms.meta,
        flights: flights.rows,
        flightsMeta: flights.meta,
        reports: reports.rows,
        reportsMeta: reports.meta,
        news: news.items,
        newsPoints: news.points,
        newsMeta: news.meta,
        gdelt: gdelt.rows,
        gdeltMeta: gdelt.meta,
        osm: osm.rows,
        osmMeta: osm.meta,
        feeds: feeds.rows,
        feedsMeta: feeds.meta,
        ticker,
        vessels: vessels.rows,
        vesselsMeta: vessels.meta,
        quakes: gev.quakes,
        sats: gev.sats,
        eonet: gev.eonet,
        launches: gev.launches,
      };
    });
  },
);

export const getGevWorld = createServerFn({ method: "GET" }).handler(async () => {
  return cached("gev-world", 120_000, () => pullGevWorld());
});

export const getTraffic = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    flights: FlightEvent[];
    flightsMeta: LiveMeta;
    vessels: VesselEvent[];
    vesselsMeta: LiveMeta;
  }> => {
    return cached("traffic", 45_000, async () => {
      const [flights, vessels] = await Promise.all([pullFlights(), pullVessels()]);
      return {
        flights: flights.rows,
        flightsMeta: flights.meta,
        vessels: vessels.rows,
        vesselsMeta: vessels.meta,
      };
    });
  },
);
