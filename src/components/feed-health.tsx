import { useState } from "react";
import type { LiveMeta, VesselEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

function ageMin(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.round((Date.now() - t) / 60000);
}

/** Named sea corridors. Kufra is land — not in this list. */
const CORRIDORS = [
  { name: "Port Sudan", lat: 19.62, lon: 37.23 },
  { name: "Suakin", lat: 19.1, lon: 37.33 },
  { name: "Tokar", lat: 18.43, lon: 37.73 },
  { name: "Trinkitat", lat: 18.69, lon: 37.73 },
  { name: "Jeddah", lat: 21.48, lon: 39.17 },
  { name: "Yanbu", lat: 24.09, lon: 38.06 },
  { name: "Bab el-Mandeb", lat: 12.58, lon: 43.33 },
];

function inCorridor(lat: number, lon: number): boolean {
  return CORRIDORS.some((c) => Math.hypot(lat - c.lat, (lon - c.lon) * Math.cos((c.lat * Math.PI) / 180)) < 0.85);
}

export function FeedHealth({
  firmsMeta,
  firmsN,
  firmsWindow,
  vessels,
  vesselsNote,
  flightsLive,
  date,
  s1Note,
  cites,
  gdelt,
  news,
  osmN,
  onFirms,
}: {
  firmsMeta: LiveMeta | null;
  firmsN: number;
  firmsWindow: "24h" | "48h" | "7d";
  vessels: VesselEvent[];
  vesselsNote: string;
  flightsLive: number;
  date: string;
  s1Note: string;
  cites: number;
  gdelt: number;
  news: number;
  osmN: number;
  onFirms: (w: "24h" | "48h" | "7d") => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const ais = vessels.filter((v) => v.kind === "ais" && v.live);
  const fresh = ais.filter((v) => {
    const m = ageMin(v.updatedAt);
    return m != null && m >= 0 && m < 30;
  });
  const corridor = fresh.filter((v) => inCorridor(v.lat, v.lon));
  const oldest = fresh
    .map((v) => ageMin(v.updatedAt))
    .filter((n): n is number => n != null)
    .sort((a, b) => b - a)[0];
  const firmsBad = !firmsMeta || firmsMeta.status === "error" || firmsMeta.status === "empty" || firmsN === 0;
  const loading = /FIRMS loading/i.test(firmsMeta?.note ?? "");
  const firmsLine = !firmsMeta
    ? "FIRMS gap · no ingest"
    : loading
      ? "FIRMS loading public CSV…"
      : firmsBad
        ? `FIRMS gap · ${firmsN}`
        : `FIRMS ok · ${firmsN} · ${firmsWindow}`;
  const firmsDetail = firmsMeta?.note ?? "FIRMS has not returned a count yet. A blank is a gap, not a quiet zero.";
  const aisBad = corridor.length === 0;
  const aisLine = corridor.length
    ? `AIS ok · ${corridor.length} <30m in corridors`
    : fresh.length
      ? `AIS gap · corridors empty · Gulf ${fresh.length}`
      : "AIS not configured · corridors";
  const aisDetail = corridor.length
    ? `Named corridors only (Port Sudan, Suakin, Tokar, Trinkitat, Jeddah, Yanbu, Bab el-Mandeb). ${corridor.length} fixes under 30 min. Oldest ${oldest ?? "—"}m. Type is typical, not cargo contents. ${vesselsNote}`
    : `Red Sea corridors are not on a live AIS feed. No AISStream key is configured. ${fresh.length} Gulf fixes under 30 min come from the Hormuz public monitor (east of 47E) — not Port Sudan, Suakin, Jeddah, Yanbu, or Bab el-Mandeb. Lane markers are NOT LIVE AIS. ${vesselsNote}`;
  const s1Bad = /gap|idle|searching/i.test(s1Note);
  const rows: { id: string; bad: boolean; text: string; detail: string }[] = [
    { id: "firms", bad: firmsBad, text: firmsLine, detail: firmsDetail },
    { id: "ais", bad: aisBad, text: aisLine, detail: aisDetail },
    {
      id: "adsb",
      bad: flightsLive === 0,
      text: `ADS-B ${flightsLive} live`,
      detail: flightsLive
        ? "Public ADS-B (UAE, Cairo, Jeddah, Addis boxes). Khartoum and Darfur are usually a coverage gap. Silence is not absence of a flight."
        : "ADS-B gap · no live returns in the four boxes this cycle. Not a negative over Sudan.",
    },
    { id: "s2", bad: false, text: `S2 ${date}`, detail: "HLS Sentinel-2 date on the rail. Empty or cloudy granules stay empty. Latency is typically 2–4 days." },
    { id: "s1", bad: s1Bad, text: `S1 ${s1Note.slice(0, 72)}`, detail: s1Note },
    {
      id: "cites",
      bad: false,
      text: `CITES ${cites} shipped`,
      detail: "Shipped citation file. Not a live ACLED or UCDP pull. Not verified by AHSR. Cannot open a confirmed alert by itself.",
    },
    {
      id: "rest",
      bad: false,
      text: `GDELT ${gdelt} · NEWS ${news} · OSM ${osmN}`,
      detail: "News pins are named-place centroids, not incident coordinates. GDELT is a wire pulse. OSM is a map layer, not occupancy.",
    },
  ];
  return (
    <div className="hud-panel pointer-events-auto mb-2 w-[min(16rem,calc(100vw-1.5rem))] p-2 text-[10px] leading-snug">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono tracking-wider text-accent">REC · PUBLIC FEEDS</p>
        <span className="rounded-full border border-rsf/70 bg-rsf/20 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-fg">
          DOCS ONLY
        </span>
      </div>
      <div className="mt-1 flex gap-1">
        {(["24h", "48h", "7d"] as const).map((w) => (
          <button
            key={w}
            type="button"
            className={cn(
              "border px-1.5 py-0.5 font-mono",
              firmsWindow === w ? "border-accent text-accent" : "border-border text-muted hover:text-fg",
            )}
            onClick={() => onFirms(w)}
          >
            FIRMS {w}
          </button>
        ))}
      </div>
      {rows.map((r) => (
        <button
          key={r.id}
          type="button"
          className={cn("mt-1 block w-full text-left", r.bad ? "text-rsf" : "text-muted")}
          onClick={() => setOpen((cur) => (cur === r.id ? null : r.id))}
        >
          {r.text}
          {open === r.id ? <span className="mt-0.5 block font-normal text-fg">{r.detail}</span> : null}
        </button>
      ))}
    </div>
  );
}
