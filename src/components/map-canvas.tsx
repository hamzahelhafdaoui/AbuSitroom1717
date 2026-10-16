import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, RasterTileSource, StyleSpecification } from "maplibre-gl";
import { SITES } from "@/data/catalog";
import { FACTION_META, type OsintReport } from "@/lib/osint";
import { applyZoneEdits, isUsefulOsm, mergedControlCities } from "@/lib/control";
import { circlePoly, type BriefAnno } from "@/lib/briefing";
import { DETECT_KLASS, type DetectHit } from "@/lib/imagery-detect";
import { rsfWatchResolved } from "@/data/rsf-watch";
import { vistaDivFc, vistaZonesFc } from "@/lib/vista-map";
import type { FuaeRecord } from "@/lib/fuae";
import { CORRIDORS, THEATER_BY_ID } from "@/lib/theaters";
import { SEA_LANES, deadReckon, deadReckonVessel, laneVessels } from "@/lib/traffic";
import {
  AOI,
  siteInKindGroup,
  type BriefItem,
  type FlightEvent,
  type GdeltEvent,
  type ImagerySource,
  type NewsPoint,
  type OsmSite,
  type ThermalEvent,
  type VesselEvent,
  type WatchBox,
} from "@/lib/types";
import { useAppStore, type LayerKey } from "@/lib/store";
import { cn, snapshotUrl } from "@/lib/utils";
import { cinematicFit, cinematicFly, pitchForZoom, spyEase } from "@/lib/spy-cam";
import { inspectCam, inspectZoomForKlass } from "@/lib/inspect-zoom";
import type { DetectKlass } from "@/lib/imagery-detect";
import { CONFLICT_CITES } from "@/data/conflict-events";
import { LOOK_RASTER, type LookId } from "@/lib/looks";
import type { GevPin } from "@/lib/gev-world";
import { useAnalysisArea } from "@/lib/analysis-area";
import { useFreightState } from "@/lib/freight-state";
import { useHazardState } from "@/lib/hazard-state";
import { LookFx } from "@/components/sensor-fx";

const PARTY_COLOR: Record<string, string> = {
  saf: "#7b93a6",
  rsf: "#b38862",
  mixed: "#9aa08a",
  other_armed: "#8b7d9a",
  civilian: "#7d9a7a",
  unknown: "#8a857c",
};

const CLOSE_KINDS = new Set(["logistics", "airfield", "port", "compound", "hospital", "market"]);
/** Esri Dark Gray Canvas — public ArcGIS tiles, no API key. Not CARTO. */
const DARK_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DARK_REF_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const S2_CLOUDLESS =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg";

type FC = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry:
      | { type: "Polygon"; coordinates: number[][][] }
      | { type: "Point"; coordinates: [number, number] }
      | { type: "LineString"; coordinates: number[][] };
  }>;
};

function gibsUrl(layer: string, date: string, level: number, ext = "jpg"): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`;
}
function hlsUrl(date: string): string {
  return gibsUrl("HLS_S30_Nadir_BRDF_Adjusted_Reflectance", date, 12, "png");
}
function viirsUrl(date: string): string {
  return gibsUrl("VIIRS_NOAA20_CorrectedReflectance_TrueColor", date, 9, "jpg");
}
function thermalUrl(date: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_Thermal_Anomalies_375m_All/default/${date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
}

function vis(imagery: ImagerySource, id: "hls" | "viirs" | "s2cloudless" | "esri" | "gmaps" | "dark" | "osm" | "night"): "visible" | "none" {
  if (id === "dark") return imagery === "dark" ? "visible" : "none";
  if (id === "gmaps") return imagery === "gmaps" ? "visible" : "none";
  if (id === "osm") return imagery === "osm" ? "visible" : "none";
  if (id === "night") return imagery === "night" ? "visible" : "none";
  if (id === "esri") return imagery === "hires" || imagery === "s2" || imagery === "viirs" ? "visible" : "none";
  if (id === "hls") return imagery === "s2" ? "visible" : "none";
  if (id === "viirs") return imagery === "viirs" ? "visible" : "none";
  return imagery === "s2cloudless" ? "visible" : "none";
}

function hudPad(panelOpen: boolean) {
  return { top: 132, right: panelOpen ? 420 : 16, bottom: 88, left: 16 };
}

function canvasIcon(draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 64): ImageData {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  return ctx.getImageData(0, 0, size, size);
}

function addContactIcons(map: MlMap) {
  const plane = (fill: string) =>
    canvasIcon((ctx, s) => {
      ctx.translate(s / 2, s / 2);
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 16);
      ctx.lineTo(0, 8);
      ctx.lineTo(-12, 16);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "#07090b";
      ctx.lineWidth = 2.4;
      ctx.stroke();
    });
  if (!map.hasImage("plane-icon")) {
    map.addImage("plane-icon", plane("#f4fff8"), { pixelRatio: 2 });
  }
  if (!map.hasImage("plane-cargo")) {
    map.addImage("plane-cargo", plane("#e2a15a"), { pixelRatio: 2 });
  }
  if (!map.hasImage("ship-icon")) {
    map.addImage(
      "ship-icon",
      canvasIcon((ctx, s) => {
        ctx.translate(s / 2, s / 2);
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(11, -5);
        ctx.lineTo(13, 12);
        ctx.lineTo(-13, 12);
        ctx.lineTo(-11, -5);
        ctx.closePath();
        ctx.fillStyle = "#9adbb8";
        ctx.fill();
        ctx.strokeStyle = "#07090b";
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }),
      { pixelRatio: 2 },
    );
  }
}

function baseStyle(date: string, imagery: ImagerySource): StyleSpecification {
  const phosphor = {
    "raster-saturation": 0.85,
    "raster-hue-rotate": 102,
    "raster-contrast": 0.28,
    "raster-brightness-min": 0.04,
  };
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Esri World Imagery",
        maxzoom: 19,
      },
      gmaps: {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "Google satellite",
        maxzoom: 20,
      },
      dark: {
        type: "raster",
        tiles: [DARK_TILES],
        tileSize: 256,
        maxzoom: 16,
        attribution: "Esri Dark Gray Canvas",
      },
      "dark-ref": {
        type: "raster",
        tiles: [DARK_REF_TILES],
        tileSize: 256,
        maxzoom: 16,
        attribution: "Esri",
      },
      viirs: { type: "raster", tiles: [viirsUrl(date)], tileSize: 256, maxzoom: 9, attribution: "NASA GIBS / VIIRS NOAA-20" },
      hls: { type: "raster", tiles: [hlsUrl(date)], tileSize: 256, maxzoom: 12, attribution: "NASA HLS / Sentinel-2 MSI" },
      s2cloudless: {
        type: "raster",
        tiles: [S2_CLOUDLESS],
        tileSize: 256,
        maxzoom: 16,
        attribution: "Sentinel-2 cloudless 2024 © EOX / Copernicus",
      },
      osm: {
        type: "raster",
        tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
        tileSize: 256,
        maxzoom: 20,
        attribution: "© OpenStreetMap contributors, © CARTO",
      },
      night: {
        type: "raster",
        tiles: [
          "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
        ],
        tileSize: 256,
        maxzoom: 8,
        attribution: "NASA Black Marble / VIIRS",
      },
    },
    layers: [
      { id: "esri", type: "raster", source: "esri", layout: { visibility: vis(imagery, "esri") } },
      { id: "gmaps", type: "raster", source: "gmaps", layout: { visibility: vis(imagery, "gmaps") } },
      { id: "osm", type: "raster", source: "osm", layout: { visibility: vis(imagery, "osm") } },
      { id: "night", type: "raster", source: "night", layout: { visibility: vis(imagery, "night") } },
      {
        id: "dark",
        type: "raster",
        source: "dark",
        layout: { visibility: vis(imagery, "dark") },
        paint: phosphor,
      },
      {
        id: "dark-ref",
        type: "raster",
        source: "dark-ref",
        layout: { visibility: vis(imagery, "dark") },
        paint: { "raster-saturation": 0.7, "raster-hue-rotate": 102, "raster-contrast": 0.2 },
      },
      {
        id: "viirs",
        type: "raster",
        source: "viirs",
        maxzoom: 9.4,
        layout: { visibility: vis(imagery, "viirs") },
        paint: {
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.72, 6, 0.92, 9.4, 0],
          "raster-brightness-min": 0.18,
          "raster-contrast": 0.22,
          "raster-fade-duration": 0,
        },
      },
      {
        id: "hls",
        type: "raster",
        source: "hls",
        maxzoom: 12.8,
        layout: { visibility: vis(imagery, "hls") },
        paint: {
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 4, 1, 12, 1, 12.8, 0],
          "raster-brightness-min": 0.08,
          "raster-contrast": 0.12,
          "raster-fade-duration": 0,
        },
      },
      {
        id: "s2cloudless",
        type: "raster",
        source: "s2cloudless",
        layout: { visibility: vis(imagery, "s2cloudless") },
        paint: { "raster-opacity": 1, "raster-brightness-min": 0.06, "raster-contrast": 0.1, "raster-fade-duration": 0 },
      },
    ],
  };
}

function controlFc(zones: { id: string; faction: string; label: string; note: string; polygon: [number, number][] }[]): FC {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => {
      const ring = z.polygon.map(([lat, lon]) => [lon, lat]);
      const first = ring[0];
      if (first) ring.push(first);
      return {
        type: "Feature" as const,
        properties: { id: z.id, faction: z.faction, label: z.label, note: z.note },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      };
    }),
  };
}

function controlLabelFc(zones: { faction: string; label: string; polygon: [number, number][] }[]): FC {
  return {
    type: "FeatureCollection",
    features: zones.map((z) => {
      let lat = 0;
      let lon = 0;
      for (const [la, lo] of z.polygon) {
        lat += la;
        lon += lo;
      }
      const n = Math.max(z.polygon.length, 1);
      return {
        type: "Feature" as const,
        properties: { label: z.label, faction: z.faction },
        geometry: { type: "Point" as const, coordinates: [lon / n, lat / n] },
      };
    }),
  };
}

function boxFc(boxes: WatchBox[]): FC {
  return {
    type: "FeatureCollection",
    features: boxes.map((b) => ({
      type: "Feature",
      properties: { id: b.id, name: b.name, priority: b.priority },
      geometry: {
        type: "Polygon",
        coordinates: [[[b.west, b.south], [b.east, b.south], [b.east, b.north], [b.west, b.north], [b.west, b.south]]],
      },
    })),
  };
}

function detectFc(hits: DetectHit[]): FC {
  return {
    type: "FeatureCollection",
    features: hits.flatMap((h) => {
      const color = DETECT_KLASS[h.klass].color;
      const ring: [number, number][] = [
        [h.west, h.south],
        [h.east, h.south],
        [h.east, h.north],
        [h.west, h.north],
        [h.west, h.south],
      ];
      return [
        {
          type: "Feature" as const,
          properties: {
            id: h.id,
            title: h.title,
            klass: DETECT_KLASS[h.klass].short,
            body: h.body,
            color,
            siteId: h.siteId ?? "",
            date: h.date,
            klassId: h.klass,
          },
          geometry: { type: "Polygon" as const, coordinates: [ring] },
        },
        {
          type: "Feature" as const,
          properties: {
            id: h.id,
            title: h.title,
            klass: DETECT_KLASS[h.klass].short,
            body: h.body,
            color,
            siteId: h.siteId ?? "",
            date: h.date,
            klassId: h.klass,
          },
          geometry: { type: "Point" as const, coordinates: [h.lon, h.lat] },
        },
      ];
    }),
  };
}

function runSlew(
  map: MlMap,
  opts: { lon: number; lat: number; zoom: number; label?: string; flat?: boolean },
) {
  const go = () => {
    try {
      map.stop();
    } catch {
      /* optional */
    }
    cinematicFly(map, opts);
  };
  try {
    const proj = (map as unknown as { getProjection?: () => { type?: string } }).getProjection?.();
    if (proj?.type === "globe") {
      map.setProjection({ type: "mercator" });
      (map as unknown as { setFog?: (v: null) => void }).setFog?.(null);
      window.setTimeout(go, 80);
      return;
    }
  } catch {
    /* globe optional */
  }
  go();
}

function slewFromProps(p: Record<string, unknown> | undefined, lat: number, lon: number, fallbackZoom = 15.4) {
  const klass = typeof p?.klassId === "string" ? (p.klassId as DetectKlass) : undefined;
  const date = typeof p?.date === "string" ? p.date : undefined;
  const title = typeof p?.title === "string" ? p.title : typeof p?.name === "string" ? p.name : undefined;
  useAppStore.getState().setFlyTarget(
    inspectCam({
      lat,
      lon,
      zoom: klass ? inspectZoomForKlass(klass) : fallbackZoom,
      label: title,
      date,
    }),
  );
}

function siteFc(partyOf: (id: string) => string, kindFilter = "all"): FC {
  return {
    type: "FeatureCollection",
    features: SITES.filter((s) => siteInKindGroup(s.kind, kindFilter)).map((s) => ({
      type: "Feature",
      properties: { id: s.id, name: s.name, kind: s.kind, party: partyOf(s.id), status: s.status },
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    })),
  };
}

function pointFc<T extends { id: string; lat: number; lon: number }>(
  rows: T[],
  extra: (r: T) => Record<string, unknown>,
): FC {
  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      properties: { id: r.id, ...extra(r) },
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
    })),
  };
}

function annoFc(rows: BriefAnno[]): FC {
  return {
    type: "FeatureCollection",
    features: rows.flatMap((a) => [
      {
        type: "Feature" as const,
        properties: { id: a.id, title: a.title, paragraph: a.paragraph, confidence: a.confidence, claim: a.claim, sources: a.sources, color: a.color },
        geometry: { type: "Polygon" as const, coordinates: [circlePoly(a.lat, a.lon, a.radiusKm)] },
      },
      {
        type: "Feature" as const,
        properties: { id: a.id, title: a.title, paragraph: a.paragraph, confidence: a.confidence, claim: a.claim, sources: a.sources, color: a.color },
        geometry: { type: "Point" as const, coordinates: [a.lon, a.lat] },
      },
    ]),
  };
}

function flightData(rows: FlightEvent[]): FC {
  return pointFc(rows, (r) => ({
    category: r.category,
    hex: r.hex,
    military: !!r.military,
    emergency: !!r.emergency,
    track: r.track ?? 0,
    label: `${r.emergency ? "EMERG " : ""}${r.typeCode} ${r.reg === "unknown" ? r.hex.slice(0, 6) : r.reg}`,
  }));
}

const trailMem = new Map<string, [number, number][]>();

function trailFc(rows: FlightEvent[]): FC {
  const features: FC["features"] = [];
  const seen = new Set<string>();
  for (const f of rows) {
    if (!f.live) continue;
    seen.add(f.hex);
    const prev = trailMem.get(f.hex) ?? [];
    const last = prev[prev.length - 1];
    const moved = !last || Math.hypot(last[0] - f.lon, last[1] - f.lat) > 0.02;
    const next = moved ? [...prev, [f.lon, f.lat] as [number, number]].slice(-16) : prev;
    trailMem.set(f.hex, next);
    if (next.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { hex: f.hex, emergency: !!f.emergency, military: !!f.military },
      geometry: { type: "LineString", coordinates: next },
    });
  }
  return { type: "FeatureCollection", features };
}

function gridFc(): FC {
  const features: FC["features"] = [];
  for (let lon = 20; lon <= 60; lon += 2) {
    features.push({
      type: "Feature",
      properties: { label: `${lon}°E` },
      geometry: { type: "LineString", coordinates: [[lon, 4], [lon, 32]] },
    });
  }
  for (let lat = 6; lat <= 32; lat += 2) {
    features.push({
      type: "Feature",
      properties: { label: `${lat}°N` },
      geometry: { type: "LineString", coordinates: [[20, lat], [60, lat]] },
    });
  }
  return { type: "FeatureCollection", features };
}

function vesselData(rows: VesselEvent[]): FC {
  return pointFc(rows, (r) => ({
    name: r.name,
    kind: r.kind,
    live: !!r.live,
    cog: r.cog ?? 0,
    sog: r.sog ?? 0,
    dest: r.destination ?? "",
    updated: r.updatedAt ?? "",
    note: r.notes ?? "",
    mmsi: r.id.replace(/^ais-/, ""),
  }));
}

function paintVessels(rows: VesselEvent[], dtSec: number): FC {
  const base = rows.filter((v) => v.kind !== "lane");
  const moved = base.map((v) => (v.kind === "ais" ? deadReckonVessel(v, dtSec) : v));
  return vesselData(moved);
}

function laneFc(): FC {
  return vesselData(laneVessels(Date.now()));
}

function pct(lat: number, lon: number) {
  return {
    left: `${((lon - AOI.west) / (AOI.east - AOI.west)) * 100}%`,
    top: `${((AOI.north - lat) / (AOI.north - AOI.south)) * 100}%`,
  };
}

function StaticSatellite({
  date, boxes, firms, flights, onPick,
}: {
  date: string; boxes: WatchBox[]; firms: ThermalEvent[]; flights: FlightEvent[]; onPick: (id: string) => void;
}) {
  const [bbox, setBbox] = useState(AOI);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ lat: number; lon: number; zoom?: number }>).detail;
      if (!d || !Number.isFinite(d.lat) || !Number.isFinite(d.lon)) return;
      const span = Math.max(0.014, 48 / 2 ** (d.zoom ?? 14));
      setBbox({
        west: d.lon - span,
        south: d.lat - span * 0.72,
        east: d.lon + span,
        north: d.lat + span * 0.72,
        center: [d.lon, d.lat],
        zoom: d.zoom ?? 14,
      });
    };
    window.addEventListener("ahsr-slew-to", on);
    return () => window.removeEventListener("ahsr-slew-to", on);
  }, []);
  const [src, setSrc] = useState(snapshotUrl(date, bbox));
  useEffect(() => {
    setSrc(snapshotUrl(date, bbox, "HLS_L30_Nadir_BRDF_Adjusted_Reflectance", 768));
  }, [date, bbox]);
  const partyOf = useAppStore((s) => s.partyOverrides);
  const pin = (lat: number, lon: number) => ({
    left: `${((lon - bbox.west) / (bbox.east - bbox.west)) * 100}%`,
    top: `${((bbox.north - lat) / (bbox.north - bbox.south)) * 100}%`,
  });
  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      <img src={src} alt="Dated satellite browse" className="h-full w-full object-cover" onError={() => setSrc(snapshotUrl(date, bbox))} />
      {firms.filter((f) => f.lon >= bbox.west && f.lon <= bbox.east).map((f) => (
        <span key={f.id} className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-thermal" style={pin(f.lat, f.lon)} />
      ))}
      {flights.filter((f) => f.lon >= bbox.west && f.lon <= bbox.east).map((f) => (
        <span key={f.id} className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-bg bg-fg" style={pin(f.lat, f.lon)} />
      ))}
      {SITES.filter((s) => s.lon >= bbox.west && s.lon <= bbox.east && s.lat >= bbox.south && s.lat <= bbox.north).map((s) => {
        const party = partyOf[s.id]?.party ?? s.party;
        return (
          <button key={s.id} type="button" title={s.name} onClick={() => onPick(s.id)} className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg" style={{ ...pin(s.lat, s.lon), background: PARTY_COLOR[party] ?? PARTY_COLOR.unknown }} />
        );
      })}
    </div>
  );
}

function applyOverlayVis(
  map: MlMap,
  layers: Record<LayerKey, boolean>,
  imagery: ImagerySource,
  briefingOn: boolean,
  detectOn: boolean,
  s1On: boolean,
) {
  const setVis = (id: string, on: boolean) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  };
  setVis("gmaps", imagery === "gmaps");
  setVis("osm", imagery === "osm");
  setVis("night", imagery === "night");
  setVis("dark", imagery === "dark");
  setVis("dark-ref", imagery === "dark");
  setVis("viirs", imagery === "viirs");
  setVis("hls", imagery === "s2");
  setVis("s2cloudless", imagery === "s2cloudless");
  setVis("thermal-raster", layers.thermalRaster === true);
  setVis("boxes-fill", layers.boxes === true);
  setVis("boxes-line", layers.boxes === true);
  setVis("firms-glow", layers.firms === true);
  setVis("firms-core", layers.firms === true);
  setVis("flights", layers.flights === true);
  setVis("flights-icon", layers.flights === true);
  setVis("flight-trails", layers.flights === true);
  setVis("surv-grid", layers.grid === true);
  setVis("vessels", layers.vessels === true);
  setVis("vessels-icon", layers.vessels === true);
  setVis("lane-markers", layers.lanes === true);
  setVis("lane-labels", layers.lanes === true);
  setVis("conflict", layers.conflict === true);
  setVis("esri", imagery === "hires" || imagery === "s2" || imagery === "viirs" || (imagery === "s1" && !s1On));
  setVis("s1", imagery === "s1" && s1On);
  setVis("sea-lanes", layers.lanes === true);
  setVis("corridors", layers.corridors === true);
  setVis("rsf-watch", layers.rsfWatch === true);
  setVis("rsf-watch-glow", layers.rsfWatch === true);
  const controlOn = layers.control === true;
  setVis("control-fill", controlOn && imagery === "dark");
  setVis("control-line", controlOn);
  setVis("control-line-dash", controlOn);
  setVis("control-cities", controlOn);
  setVis("control-labels", controlOn && imagery === "dark");
  if (map.getLayer("control-fill")) map.setPaintProperty("control-fill", "fill-opacity", 0.22);
  const vistaOn = layers.vista === true;
  setVis("vista-fill", vistaOn && imagery === "dark");
  setVis("vista-line", vistaOn);
  setVis("vista-div", vistaOn);
  setVis("vista-div-label", vistaOn);
  setVis("sites", layers.sites === true);
  setVis("osint-reports", layers.reports === true);
  setVis("news-pts", layers.news === true);
  setVis("ai-pts", layers.ai === true);
  setVis("gdelt", layers.gdelt === true);
  setVis("gdelt-glow", layers.gdelt === true);
  setVis("osm-pts", layers.osm === true);
  setVis("brief-fill", briefingOn);
  setVis("brief-line", briefingOn);
  setVis("brief-pts", briefingOn);
  setVis("detect-fill", detectOn);
  setVis("detect-line", detectOn);
  setVis("detect-pts", detectOn);
  setVis("quakes", layers.quakes === true);
  setVis("sats", layers.sats === true);
  setVis("eonet", layers.eonet === true);
  setVis("launches", layers.launches === true);
  setVis("freight-pts", layers.freight === true);
  setVis("hazard-pts", true);
}

interface Props {
  boxes: WatchBox[];
  firms: ThermalEvent[];
  flights: FlightEvent[];
  panelOpen?: boolean;
  reports?: OsintReport[];
  newsPoints?: NewsPoint[];
  aiEvents?: BriefItem[];
  gdelt?: GdeltEvent[];
  osm?: OsmSite[];
  vessels?: VesselEvent[];
  briefingOn?: boolean;
  annotations?: BriefAnno[];
  detections?: DetectHit[];
  fuae?: FuaeRecord[];
  quakes?: GevPin[];
  sats?: GevPin[];
  eonet?: GevPin[];
  launches?: GevPin[];
  s1Tiles?: string | null;
}

export function MapCanvas({
  boxes, firms, flights, panelOpen = false, reports = [], newsPoints = [], aiEvents = [], gdelt = [], osm = [], vessels = [], briefingOn = false, annotations = [], detections = [], fuae = [], quakes = [], sats = [], eonet = [], launches = [], s1Tiles = null,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const hoverPopup = useRef<{ remove: () => void } | null>(null);
  const flightSnap = useRef({ rows: flights, at: Date.now() });
  const vesselSnap = useRef({ rows: vessels, at: Date.now() });
  const [engine, setEngine] = useState<"static" | "gl">("static");
  const [cursor, setCursor] = useState("—");
  const [mapReady, setMapReady] = useState(false);
  const [visTick, setVisTick] = useState(0);
  const pendingSlew = useRef<{ lon: number; lat: number; zoom: number; label?: string; flat?: boolean } | null>(null);
  const layers = useAppStore((s) => s.layers);
  const imagery = useAppStore((s) => s.imagery);
  const date = useAppStore((s) => s.date);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const setSelectedSite = useAppStore((s) => s.setSelectedSite);
  const setSelectedReport = useAppStore((s) => s.setSelectedReport);
  const partyOverrides = useAppStore((s) => s.partyOverrides);
  const partyFilter = useAppStore((s) => s.partyFilter);
  const kindFilter = useAppStore((s) => s.kindFilter);
  const focusedBoxId = useAppStore((s) => s.focusedBoxId);
  const yardsZoom = useAppStore((s) => s.yardsZoom);
  const clearYardsZoom = useAppStore((s) => s.clearYardsZoom);
  const theaterId = useAppStore((s) => s.theaterId);
  const flyTarget = useAppStore((s) => s.flyTarget);
  const setFlyTarget = useAppStore((s) => s.setFlyTarget);
  const controlUpdates = useAppStore((s) => s.controlUpdates);
  const deskCities = useAppStore((s) => s.deskCities);
  const deskZones = useAppStore((s) => s.deskZones);
  const searchPin = useAppStore((s) => s.searchPin);
  const detectOn = useAppStore((s) => s.detectOn);
  const orbitOn = useAppStore((s) => s.orbitOn);
  const setOrbitOn = useAppStore((s) => s.setOrbitOn);
  const globeOn = useAppStore((s) => s.globeOn);
  const look = useAppStore((s) => s.look);
  const analysisOverlay = useAnalysisArea((s) => s.overlay);
  const freightHits = useFreightState((s) => s.hits);
  const hazardFeed = useHazardState((s) => s.feed);

  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    let map: MlMap | null = null;
    let ro: ResizeObserver | null = null;
    let onCmd: ((ev: Event) => void) | null = null;
    let onFit: ((ev: Event) => void) | null = null;
    let onMeasure: (() => void) | null = null;
    let onNudge: ((ev: Event) => void) | null = null;
    let onSlewTo: ((ev: Event) => void) | null = null;

    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !host.current) return;
      const { Map, NavigationControl, ScaleControl, Popup } = maplibregl;
      try { maplibregl.setWorkerCount?.(1); } catch { /* optional */ }
      const state = useAppStore.getState();
      map = new Map({
        container: host.current,
        style: baseStyle(state.date, state.imagery),
        center: AOI.center,
        zoom: 5.05,
        minZoom: 2.6,
        maxZoom: 18.5,
        attributionControl: { compact: true },
        maxPitch: 55,
        pitchWithRotate: true,
        dragRotate: true,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      map.addControl(new NavigationControl({ showCompass: false }), "bottom-left");
      map.addControl(new ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
      map.setPadding(hudPad(false));
      mapRef.current = map;
      (window as unknown as { __ahsrMap?: MlMap }).__ahsrMap = map;
      setEngine("gl");
      onSlewTo = (ev: Event) => {
        const d = (ev as CustomEvent<{ lon: number; lat: number; zoom: number; label?: string; date?: string; flat?: boolean }>).detail;
        if (!map || !d || !Number.isFinite(d.lat) || !Number.isFinite(d.lon)) return;
        runSlew(map, { lon: d.lon, lat: d.lat, zoom: d.zoom ?? 15.4, label: d.label, flat: d.flat });
        if (d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
          window.setTimeout(() => {
            const s = useAppStore.getState();
            s.setDate(d.date!);
            const t = Date.parse(`${d.date}T12:00:00Z`) - 14 * 86400000;
            if (Number.isFinite(t)) s.setCompareDate(new Date(t).toISOString().slice(0, 10));
            if (s.imagery === "dark" || s.imagery === "hires" || s.imagery === "gmaps" || s.imagery === "s2cloudless") {
              s.setImagery("s2");
            }
          }, 700);
        }
      };
      window.addEventListener("ahsr-slew-to", onSlewTo);
      try {
        map.scrollZoom.setWheelZoomRate(1 / 620);
        map.scrollZoom.setZoomRate(1 / 220);
      } catch { /* optional */ }

      const boxesNow = boxes;
      const firmsNow = firms;
      const flightsNow = flightSnap.current.rows.length ? flightSnap.current.rows : flights;
      const overridesNow = state.partyOverrides;
      const kindNow = state.kindFilter;

      map.on("style.load", () => {
        if (!map || cancelled) return;
        map.resize();
        setMapReady(true);
        addContactIcons(map);

        map.addSource("thermal-raster", { type: "raster", tiles: [thermalUrl(state.date)], tileSize: 256, maxzoom: 8, attribution: "NASA GIBS thermal" });
        map.addLayer({ id: "thermal-raster", type: "raster", source: "thermal-raster", maxzoom: 8.5, layout: { visibility: state.layers.thermalRaster ? "visible" : "none" }, paint: { "raster-opacity": 0.85 } });

        map.addSource("boxes", { type: "geojson", data: boxFc(boxesNow) });
        map.addLayer({ id: "boxes-fill", type: "fill", source: "boxes", paint: { "fill-color": "#d8d2c6", "fill-opacity": ["match", ["get", "priority"], "border", 0.04, 0.07] } });
        map.addLayer({ id: "boxes-line", type: "line", source: "boxes", paint: { "line-color": "#d8d2c6", "line-opacity": 0.5, "line-width": 1.4, "line-dasharray": [2, 2] } });

        map.addSource("firms", { type: "geojson", data: pointFc(firmsNow, (r) => ({ klass: r.klass, frp: r.frp, live: !!r.live, satellite: r.satellite, confidence: r.confidence, daynight: r.daynight, acq: `${r.acqDate} ${r.acqTime}` })) });
        map.addLayer({ id: "firms-glow", type: "circle", source: "firms", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "frp"], 0, 6, 40, 14], "circle-color": "#c4894a", "circle-opacity": 0.28, "circle-blur": 0.5 } });
        map.addLayer({ id: "firms-core", type: "circle", source: "firms", paint: { "circle-radius": 3.5, "circle-color": "#c4894a", "circle-stroke-width": 1, "circle-stroke-color": "#12110f" } });

        map.addSource("flights", { type: "geojson", data: flightData(flightsNow) });
        map.addLayer({
          id: "flights",
          type: "circle",
          source: "flights",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 6, 8, 10],
            "circle-color": [
              "case",
              ["==", ["get", "emergency"], true],
              "#ff5a5a",
              ["==", ["get", "military"], true],
              "#c4894a",
              "#d5e4dc",
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 1.2,
            "circle-stroke-color": "#07090b",
          },
        });
        map.addLayer({
          id: "flights-icon",
          type: "symbol",
          source: "flights",
          layout: {
            "icon-image": [
              "case",
              ["==", ["get", "emergency"], true],
              "plane-cargo",
              ["==", ["get", "military"], true],
              "plane-cargo",
              "plane-icon",
            ],
            "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 1.05, 6, 1.4, 10, 1.7],
            "icon-rotate": ["to-number", ["get", "track"]],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-field": ["step", ["zoom"], "", 6.2, ["get", "label"]],
            "text-size": 11,
            "text-offset": [0, 1.35],
          },
          paint: { "text-color": "#e8f6ee", "text-halo-color": "#07090b", "text-halo-width": 1.2 },
        });

        map.addSource("flight-trails", { type: "geojson", data: trailFc(flightsNow) });
        map.addLayer({
          id: "flight-trails",
          type: "line",
          source: "flight-trails",
          paint: {
            "line-color": ["case", ["==", ["get", "emergency"], true], "#ff5a5a", ["==", ["get", "military"], true], "#c4894a", "#9adbb8"],
            "line-width": 1.4,
            "line-opacity": 0.75,
          },
        });

        map.addSource("surv-grid", { type: "geojson", data: gridFc() });
        map.addLayer({
          id: "surv-grid",
          type: "line",
          source: "surv-grid",
          layout: { visibility: state.layers.grid ? "visible" : "none" },
          paint: { "line-color": "#9adbb8", "line-width": 0.6, "line-opacity": 0.28 },
        });
        map.addSource("lane-markers", { type: "geojson", data: laneFc() });
        map.addLayer({
          id: "lane-markers",
          type: "circle",
          source: "lane-markers",
          layout: { visibility: state.layers.lanes === false ? "none" : "visible" },
          paint: { "circle-radius": 4, "circle-color": "#c4a574", "circle-opacity": 0.9, "circle-stroke-width": 1, "circle-stroke-color": "#07090b" },
        });
        map.addLayer({
          id: "lane-labels",
          type: "symbol",
          source: "lane-markers",
          layout: {
            visibility: state.layers.lanes === false ? "none" : "visible",
            "text-field": "NOT LIVE AIS",
            "text-size": 9,
            "text-offset": [0, 1.15],
            "text-allow-overlap": false,
          },
          paint: { "text-color": "#c4a574", "text-halo-color": "#07090b", "text-halo-width": 1 },
        });
        map.addSource("conflict", {
          type: "geojson",
          data: pointFc(CONFLICT_CITES, (r) => ({ name: r.location, kind: r.eventType, note: r.note, url: r.sourceUrl, dataset: r.dataset, id: r.id, date: r.date })),
        });
        map.addLayer({
          id: "conflict",
          type: "circle",
          source: "conflict",
          layout: { visibility: state.layers.conflict === false ? "none" : "visible" },
          paint: { "circle-radius": 5, "circle-color": "#d8d2c6", "circle-stroke-width": 1.4, "circle-stroke-color": "#07090b" },
        });
        map.addSource("s1", { type: "raster", tiles: ["https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?collection=sentinel-1-rtc&item=none"], tileSize: 256, maxzoom: 12, attribution: "Sentinel-1 RTC © Copernicus / Planetary Computer" });
        map.addLayer({ id: "s1", type: "raster", source: "s1", layout: { visibility: "none" }, paint: { "raster-opacity": 0.92, "raster-fade-duration": 0 } });
        map.addSource("vessels", { type: "geojson", data: vesselData(vesselSnap.current.rows.length ? vesselSnap.current.rows : vessels) });
        map.addLayer({
          id: "vessels",
          type: "circle",
          source: "vessels",
          paint: {
            "circle-radius": ["case", ["==", ["get", "live"], true], 5.5, 3.2],
            "circle-color": ["case", ["==", ["get", "live"], true], "#3ddea0", "#7ec8b3"],
            "circle-opacity": ["case", ["==", ["get", "live"], true], 0.95, 0.4],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#07090b",
          },
        });
        map.addLayer({
          id: "vessels-icon",
          type: "symbol",
          source: "vessels",
          layout: {
            "icon-image": "ship-icon",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 7, 1.15],
            "icon-rotate": ["to-number", ["get", "cog"]],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "text-field": ["step", ["zoom"], "", 5.6, ["get", "name"]],
            "text-size": 10,
            "text-offset": [0, 1.3],
          },
          paint: { "text-color": "#9adbb8", "text-halo-color": "#07090b", "text-halo-width": 1.1 },
        });

        map.addSource("sea-lanes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: SEA_LANES.map((l) => ({ type: "Feature" as const, properties: { name: l.name }, geometry: { type: "LineString" as const, coordinates: l.coords } })) },
        });
        map.addLayer({ id: "sea-lanes", type: "line", source: "sea-lanes", paint: { "line-color": "#7ec8b3", "line-width": 1.2, "line-opacity": 0.4, "line-dasharray": [4, 3] } });

        map.addSource("corridors", {
          type: "geojson",
          data: { type: "FeatureCollection", features: CORRIDORS.map((c) => ({ type: "Feature" as const, properties: { name: c.name }, geometry: { type: "LineString" as const, coordinates: c.coordinates } })) },
        });
        map.addLayer({ id: "corridors", type: "line", source: "corridors", paint: { "line-color": "#7ec8b3", "line-width": 1.4, "line-opacity": 0.45, "line-dasharray": [2, 2] } });

        const partyOf = (id: string) => overridesNow[id]?.party ?? SITES.find((s) => s.id === id)?.party ?? "unknown";
        map.addSource("sites", { type: "geojson", data: siteFc(partyOf, kindNow) });
        map.addLayer({
          id: "sites",
          type: "circle",
          source: "sites",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3.2, 8, 7.5, 16, 12],
            "circle-color": ["match", ["get", "party"], "saf", PARTY_COLOR.saf ?? "#8a857c", "rsf", PARTY_COLOR.rsf ?? "#8a857c", "mixed", PARTY_COLOR.mixed ?? "#8a857c", "other_armed", PARTY_COLOR.other_armed ?? "#8a857c", "civilian", PARTY_COLOR.civilian ?? "#8a857c", PARTY_COLOR.unknown ?? "#8a857c"],
            "circle-stroke-width": 1.8,
            "circle-stroke-color": "#12110f",
          },
        });

        const zonesNow = applyZoneEdits(state.theaterId, state.deskZones);
        map.addSource("control", { type: "geojson", data: controlFc(zonesNow) });
        map.addLayer({
          id: "control-fill",
          type: "fill",
          source: "control",
          paint: {
            "fill-color": ["match", ["get", "faction"], "saf", FACTION_META.saf.color, "rsf", FACTION_META.rsf.color, "splm-n", FACTION_META["splm-n"].color, FACTION_META.contested.color],
            "fill-opacity": 0.22,
          },
        }, "sites");
        map.addLayer({
          id: "control-line",
          type: "line",
          source: "control",
          filter: ["!=", ["get", "faction"], "contested"],
          paint: { "line-color": ["match", ["get", "faction"], "saf", FACTION_META.saf.color, "rsf", FACTION_META.rsf.color, "splm-n", FACTION_META["splm-n"].color, FACTION_META.contested.color], "line-width": 2.8, "line-opacity": 0.95 },
        }, "sites");
        map.addLayer({
          id: "control-line-dash",
          type: "line",
          source: "control",
          filter: ["==", ["get", "faction"], "contested"],
          paint: { "line-color": FACTION_META.contested.color, "line-width": 2.8, "line-opacity": 0.95, "line-dasharray": [2.4, 1.6] },
        }, "sites");

        const cities = state.deskCities ?? mergedControlCities(state.controlUpdates);
        map.addSource("control-cities", { type: "geojson", data: pointFc(cities, (c) => ({ name: c.name, faction: c.faction })) });
        map.addLayer({ id: "control-cities", type: "circle", source: "control-cities", paint: { "circle-radius": 4.5, "circle-color": ["match", ["get", "faction"], "saf", FACTION_META.saf.color, "rsf", FACTION_META.rsf.color, FACTION_META.contested.color], "circle-stroke-width": 1.5, "circle-stroke-color": "#07090b" } });

        map.addSource("control-labels", { type: "geojson", data: controlLabelFc(zonesNow) });
        map.addLayer({
          id: "control-labels",
          type: "symbol",
          source: "control-labels",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-allow-overlap": false,
          },
          paint: { "text-color": "#e8f6ee", "text-halo-color": "#07090b", "text-halo-width": 1.4 },
        });

        map.addSource("vista-zones", { type: "geojson", data: vistaZonesFc() });
        map.addLayer({
          id: "vista-fill",
          type: "fill",
          source: "vista-zones",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.32 },
        }, "sites");
        map.addLayer({
          id: "vista-line",
          type: "line",
          source: "vista-zones",
          paint: { "line-color": ["get", "color"], "line-width": 1.8, "line-opacity": 0.95 },
        }, "sites");
        map.addSource("vista-div", { type: "geojson", data: vistaDivFc() });
        map.addLayer({
          id: "vista-div",
          type: "circle",
          source: "vista-div",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4.2, 10, 8],
            "circle-color": ["match", ["get", "party"], "saf", "#3d8b3d", "rsf", "#c9a227", "#8a857c"],
            "circle-stroke-width": 1.6,
            "circle-stroke-color": "#07090b",
          },
        });
        map.addLayer({
          id: "vista-div-label",
          type: "symbol",
          source: "vista-div",
          minzoom: 5.6,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 10,
            "text-offset": [0, 1.15],
            "text-anchor": "top",
            "text-allow-overlap": false,
          },
          paint: { "text-color": "#e8f6ee", "text-halo-color": "#07090b", "text-halo-width": 1.3 },
        });

        map.addSource("osint-reports", { type: "geojson", data: pointFc(reports, (r) => ({ name: r.title, category: r.category, id: r.id, source: r.sourceLabel, url: r.sourceUrl ?? "", date: r.date, note: "ARCHIVE POST · ingested published post — not an AHSR assessment" })) });
        map.addLayer({ id: "osint-reports", type: "circle", source: "osint-reports", paint: { "circle-radius": 6, "circle-color": "#ece8e1", "circle-stroke-width": 2, "circle-stroke-color": "#b45a3c" } });

        map.addSource("news-pts", { type: "geojson", data: pointFc(newsPoints, (r) => ({ name: r.name, count: r.count })) });
        map.addLayer({ id: "news-pts", type: "circle", source: "news-pts", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 5, 8, 11], "circle-color": "#8ec8ff", "circle-opacity": 0.8, "circle-stroke-width": 1.2, "circle-stroke-color": "#07090b" } });

        map.addSource("ai-pts", { type: "geojson", data: pointFc(aiEvents.filter((e): e is BriefItem & { lat: number; lon: number } => e.lat != null && e.lon != null), (r) => ({ name: r.headline, confidence: r.confidence })) });
        map.addLayer({ id: "ai-pts", type: "circle", source: "ai-pts", paint: { "circle-radius": 6, "circle-color": ["match", ["get", "confidence"], "corroborated", "#7d9a7a", "reported", "#c4894a", "#b45a3c"], "circle-stroke-width": 1.5, "circle-stroke-color": "#12110f" } });

        map.addSource("gdelt", { type: "geojson", data: pointFc(gdelt, (r) => ({ name: r.name, subtype: r.subtype })) });
        map.addLayer({ id: "gdelt-glow", type: "circle", source: "gdelt", paint: { "circle-radius": 10, "circle-color": "#b45a3c", "circle-opacity": 0.2, "circle-blur": 0.6 } });
        map.addLayer({ id: "gdelt", type: "circle", source: "gdelt", paint: { "circle-radius": 4, "circle-color": "#b45a3c", "circle-stroke-width": 1.2, "circle-stroke-color": "#ece8e1" } });

        map.addSource("osm-pts", { type: "geojson", data: pointFc(osm.filter(isUsefulOsm), (r) => ({ name: r.name, kind: r.kind })) });
        map.addLayer({ id: "osm-pts", type: "circle", source: "osm-pts", paint: { "circle-radius": 3.2, "circle-color": "#7b93a6", "circle-stroke-width": 1, "circle-stroke-color": "#12110f" } });

        map.addSource("brief-anno", { type: "geojson", data: annoFc([]) });
        map.addLayer({ id: "brief-fill", type: "fill", source: "brief-anno", filter: ["==", ["geometry-type"], "Polygon"], layout: { visibility: "none" }, paint: { "fill-color": ["coalesce", ["get", "color"], "#d4a017"], "fill-opacity": 0.18 } });
        map.addLayer({ id: "brief-line", type: "line", source: "brief-anno", filter: ["==", ["geometry-type"], "Polygon"], layout: { visibility: "none" }, paint: { "line-color": ["coalesce", ["get", "color"], "#d4a017"], "line-width": 1.6, "line-dasharray": [2, 1.4] } });
        map.addLayer({ id: "brief-pts", type: "circle", source: "brief-anno", filter: ["==", ["geometry-type"], "Point"], layout: { visibility: "none" }, paint: { "circle-radius": 5.5, "circle-color": ["coalesce", ["get", "color"], "#d4a017"], "circle-stroke-width": 1.5, "circle-stroke-color": "#07090b" } });

        map.addSource("rsf-watch", {
          type: "geojson",
          data: pointFc(rsfWatchResolved(), (r) => ({
            id: r.siteId ?? r.id,
            name: r.name,
            why: r.why,
            watch: r.watch,
            note: r.note,
          })),
        });
        map.addLayer({
          id: "rsf-watch-glow",
          type: "circle",
          source: "rsf-watch",
          paint: {
            "circle-radius": ["match", ["get", "watch"], "primary", 14, 10],
            "circle-color": "#b38862",
            "circle-opacity": 0.22,
            "circle-blur": 0.4,
          },
        });
        map.addLayer({
          id: "rsf-watch",
          type: "circle",
          source: "rsf-watch",
          paint: {
            "circle-radius": ["match", ["get", "watch"], "primary", 6.5, 4.5],
            "circle-color": "#b38862",
            "circle-stroke-width": 1.6,
            "circle-stroke-color": "#12110f",
          },
        });
        map.addSource("detections", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "detect-fill",
          type: "fill",
          source: "detections",
          filter: ["==", ["geometry-type"], "Polygon"],
          layout: { visibility: "none" },
          paint: { "fill-color": ["coalesce", ["get", "color"], "#d4a017"], "fill-opacity": 0.16 },
        });
        map.addLayer({
          id: "detect-line",
          type: "line",
          source: "detections",
          filter: ["==", ["geometry-type"], "Polygon"],
          layout: { visibility: "none" },
          paint: { "line-color": ["coalesce", ["get", "color"], "#d4a017"], "line-width": 1.8, "line-dasharray": [2, 1.2] },
        });
        map.addLayer({
          id: "detect-pts",
          type: "circle",
          source: "detections",
          filter: ["==", ["geometry-type"], "Point"],
          layout: { visibility: "none" },
          paint: { "circle-radius": 5, "circle-color": ["coalesce", ["get", "color"], "#d4a017"], "circle-stroke-width": 1.4, "circle-stroke-color": "#07090b" },
        });

        map.addSource("fuae", { type: "geojson", data: pointFc([] as FuaeRecord[], (r) => ({ title: r.title, kind: r.kind, why: r.why, dest: r.dest })) });
        map.addLayer({
          id: "fuae-glow",
          type: "circle",
          source: "fuae",
          paint: {
            "circle-radius": 11,
            "circle-color": ["match", ["get", "kind"], "air", "#e2a15a", "#7ec8b3"],
            "circle-opacity": 0.28,
            "circle-blur": 0.45,
          },
        });
        map.addLayer({
          id: "fuae-pts",
          type: "circle",
          source: "fuae",
          paint: {
            "circle-radius": 5.5,
            "circle-color": ["match", ["get", "kind"], "air", "#e2a15a", "#7ec8b3"],
            "circle-stroke-width": 1.6,
            "circle-stroke-color": "#07090b",
          },
        });

        map.addSource("measure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "measure-line", type: "line", source: "measure", paint: { "line-color": "#d8d2c6", "line-width": 2, "line-dasharray": [2, 1] } });

        const gevCircle = (id: string, color: string) => {
          map!.addLayer({
            id,
            type: "circle",
            source: id,
            paint: {
              "circle-radius": 5,
              "circle-color": color,
              "circle-stroke-width": 1.3,
              "circle-stroke-color": "#07090b",
              "circle-opacity": 0.92,
            },
          });
        };
        map.addSource("quakes", { type: "geojson", data: pointFc([] as GevPin[], (r) => ({ name: r.name, note: r.note, kind: r.kind })) });
        gevCircle("quakes", "#e2a15a");
        map.addSource("sats", { type: "geojson", data: pointFc([] as GevPin[], (r) => ({ name: r.name, note: r.note, kind: r.kind })) });
        gevCircle("sats", "#9adbb8");
        map.addSource("eonet", { type: "geojson", data: pointFc([] as GevPin[], (r) => ({ name: r.name, note: r.note, kind: r.kind })) });
        gevCircle("eonet", "#7ec8b3");
        map.addSource("launches", { type: "geojson", data: pointFc([] as GevPin[], (r) => ({ name: r.name, note: r.note, kind: r.kind })) });
        gevCircle("launches", "#c9b48a");
        map.addSource("freight", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "freight-pts",
          type: "circle",
          source: "freight",
          paint: {
            "circle-radius": 4.5,
            "circle-color": "#d4c4a0",
            "circle-stroke-width": 1.2,
            "circle-stroke-color": "#07090b",
          },
        });
        map.addSource("hazards", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "hazard-pts",
          type: "circle",
          source: "hazards",
          paint: {
            "circle-radius": 4,
            "circle-color": "#8aa4b3",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#07090b",
          },
        });

        ready.current = true;
        setEngine("gl");
        applyOverlayVis(
          map,
          useAppStore.getState().layers,
          useAppStore.getState().imagery,
          briefingOn,
          useAppStore.getState().detectOn,
          Boolean(s1Tiles),
        );
        setVisTick((n) => n + 1);
      });

      const bindPopup = (layer: string, html: (p: Record<string, unknown>) => string) => {
        map!.on("click", layer, (e) => {
          const feat = e.features?.[0];
          if (!feat || feat.geometry.type !== "Point") return;
          const [lon, lat] = feat.geometry.coordinates as [number, number];
          hoverPopup.current?.remove();
          hoverPopup.current = new Popup({ closeButton: true, offset: 14, className: "sr-popup" })
            .setLngLat([lon, lat])
            .setHTML(html(feat.properties as Record<string, unknown>))
            .addTo(map!);
        });
        map!.on("mouseenter", layer, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map!.on("mouseleave", layer, () => { if (map) map.getCanvas().style.cursor = ""; });
      };

      map.on("click", "sites", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) setSelectedSite(id);
      });
      bindPopup("sites", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name ?? ""}</div>`);
      bindPopup("flights-icon", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.label ?? p.hex}<div style="opacity:.7;font-size:11px">ADS-B · not a cargo claim</div></div>`);
      bindPopup("vessels-icon", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.live ? `Live AIS · MMSI ${p.mmsi} · SOG ${p.sog} · COG ${p.cog} · ${p.updated || "age unknown"} · type typical, not cargo` : p.kind === "lane" ? "NOT LIVE AIS · schematic corridor marker" : "Port node — not live AIS"}</div></div>`);
      bindPopup("news-pts", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name} · ${p.count} headlines<div style="opacity:.7;font-size:11px">Named-place centroid. Not an incident coordinate.</div></div>`);
      bindPopup("brief-pts", (p) => `<div style="max-width:260px;font:500 12px/1.4 'IBM Plex Sans',system-ui"><div>${p.title}</div><div style="opacity:.75;font-size:11px;margin-top:4px">${p.claim} · ${p.confidence}</div><div style="font-weight:400;font-size:11px;margin-top:6px">${p.paragraph ?? ""}</div><div style="opacity:.65;font-size:10px;margin-top:6px">${p.sources ?? ""}</div></div>`);
      bindPopup("rsf-watch", (p) => `<div style="max-width:260px;font:500 12px/1.4 'IBM Plex Sans',system-ui"><div>${p.name}</div><div style="opacity:.75;font-size:11px;margin-top:4px">RSF watch · ${p.why} · observation</div><div style="font-weight:400;font-size:11px;margin-top:6px">${p.note ?? ""}</div></div>`);
      bindPopup("vista-div", (p) => `<div style="max-width:280px;font:500 12px/1.4 'IBM Plex Sans',system-ui"><div>${p.name}</div><div style="opacity:.7;font-size:11px;margin-top:4px">${p.place ?? ""} · ${p.party === "rsf" ? "Amber pin on source map (RSF-held in copy)" : "Green pin on source map (SAF-held in copy)"}</div><div style="font-weight:400;font-size:11px;margin-top:6px">${p.note ?? ""}</div><div style="opacity:.65;font-size:10px;margin-top:6px">Vista copy · ${p.nameAr ?? ""} · not occupancy</div></div>`);
      map.on("click", "vista-fill", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        if (!p || !map) return;
        hoverPopup.current?.remove();
        hoverPopup.current = new Popup({ closeButton: true, offset: 10, className: "sr-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="max-width:280px;font:500 12px/1.4 'IBM Plex Sans',system-ui"><div>${p.name}</div><div style="opacity:.75;font-size:11px;margin-top:4px">Vista copy control polygon</div><div style="font-weight:400;font-size:11px;margin-top:6px">${p.note ?? ""}</div><div style="opacity:.65;font-size:10px;margin-top:6px">Compiled control — not a live frontline.</div></div>`)
          .addTo(map);
      });
      map.on("click", "vista-div", (e) => {
        const feat = e.features?.[0];
        if (!feat || feat.geometry.type !== "Point") return;
        const [lon, lat] = feat.geometry.coordinates as [number, number];
        const name = (feat.properties as { name?: string })?.name;
        setFlyTarget({ lat, lon, zoom: 15.2, label: name, inspect: true });
      });
      map.on("click", "rsf-watch", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 15.4, label: String(f.properties?.name ?? "watch") }),
        );
      });
      bindPopup("fuae-pts", (p) => `<div style="max-width:260px;font:500 12px/1.4 'IBM Plex Sans',system-ui"><div>${p.title}</div><div style="opacity:.75;font-size:11px;margin-top:4px">FUAE · ${p.kind} · ${p.dest}</div><div style="font-weight:400;font-size:11px;margin-top:6px">${p.why ?? ""}</div><div style="opacity:.65;font-size:10px;margin-top:6px">Public track — not a cargo claim.</div></div>`);
      bindPopup("quakes", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.note ?? "USGS"}</div></div>`);
      bindPopup("sats", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.note ?? "CelesTrak / ISS"}</div></div>`);
      bindPopup("eonet", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.note ?? "NASA EONET"}</div></div>`);
      bindPopup("launches", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.note ?? "Launch Library 2"}</div></div>`);
      bindPopup("osint-reports", (p) => `<div style="max-width:260px;font:500 12px/1.4 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.75;font-size:11px;margin-top:4px">ARCHIVE POST · ingested published post — not an AHSR assessment</div><div style="font-weight:400;font-size:11px;margin-top:4px">${p.source ?? ""} · ${p.date ?? ""}${p.url ? `<br/><a href="${p.url}" target="_blank" rel="noreferrer">source</a>` : ""}</div><div style="opacity:.7;font-size:11px;margin-top:4px">AHSR has not independently confirmed this.</div></div>`);
      bindPopup("freight-pts", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.note ?? "possible moving vehicles · not a count"}</div></div>`);
      bindPopup("hazard-pts", (p) => `<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.name}<div style="opacity:.7;font-size:11px">${p.note ?? ""}</div></div>`);
      map.on("click", "detect-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        slewFromProps(f.properties as Record<string, unknown>, e.lngLat.lat, e.lngLat.lng, 16);
      });
      map.on("click", "detect-pts", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        slewFromProps(f.properties as Record<string, unknown>, e.lngLat.lat, e.lngLat.lng, 16.2);
      });
      map.on("click", "detect-line", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        slewFromProps(f.properties as Record<string, unknown>, e.lngLat.lat, e.lngLat.lng, 16);
      });
      map.on("click", "freight-pts", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 15.4, label: String(f.properties?.name ?? "smear") }),
        );
      });
      map.on("click", "hazard-pts", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 11.8, label: String(p?.name ?? "hazard") }),
        );
      });
      map.on("click", "fuae-pts", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 13.2, label: String(p?.title ?? "FUAE") }),
        );
      });
      map.on("click", "quakes", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 11.4, label: String(p?.name ?? "quake") }),
        );
      });
      map.on("click", "eonet", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 10.8, label: String(p?.name ?? "event") }),
        );
      });
      map.on("click", "osint-reports", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = f.properties?.id as string | undefined;
        if (id) setSelectedReport(id);
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 14.8, label: String(f.properties?.title ?? "report") }),
        );
      });
      map.on("click", "news-pts", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 11.2, label: String(p?.name ?? "news") }),
        );
      });
      map.on("click", "flights-icon", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 12.6, label: String(p?.label ?? p?.hex ?? "flight") }),
        );
      });
      map.on("click", "vessels-icon", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        useAppStore.getState().setFlyTarget(
          inspectCam({ lat: e.lngLat.lat, lon: e.lngLat.lng, zoom: 12.8, label: String(p?.name ?? "vessel") }),
        );
      });
      map.on("click", "firms-core", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        if (!map) return;
        hoverPopup.current?.remove();
        hoverPopup.current = new Popup({ closeButton: true, offset: 10, className: "sr-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">FIRMS · not a strike pin<div style="opacity:.75;font-size:11px;font-weight:400">FRP ${p?.frp ?? "—"} · ${p?.daynight === "N" ? "night" : "day"} · ${p?.satellite ?? ""} · conf ${p?.confidence ?? "—"}<br/>class ${p?.klass ?? "unknown"} · ${p?.acq ?? ""}<br/>Thermal anomaly only. Combat-related stays possible until optical follow-up.</div></div>`)
          .addTo(map);
      });
      map.on("click", "conflict", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        if (!map) return;
        hoverPopup.current?.remove();
        hoverPopup.current = new Popup({ closeButton: true, offset: 10, className: "sr-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p?.name ?? "event"}<div style="opacity:.75;font-size:11px;font-weight:400">${p?.dataset} · ${p?.id}<br/>${p?.date} · ${p?.kind}<br/>${p?.note}<br/><a href="${p?.url}" target="_blank" rel="noreferrer">source</a> · not verified by AHSR</div></div>`)
          .addTo(map);
      });
      map.on("click", "lane-markers", (e) => {
        if (!map) return;
        hoverPopup.current?.remove();
        hoverPopup.current = new Popup({ closeButton: true, offset: 10, className: "sr-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">NOT LIVE AIS<div style="opacity:.75;font-size:11px;font-weight:400">Schematic corridor marker. Documented lane animation so the Red Sea is not a blank. Not a ship.</div></div>`)
          .addTo(map);
      });
      map.on("click", "control-fill", (e) => {
        const p = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        if (!p || !map) return;
        hoverPopup.current?.remove();
        hoverPopup.current = new Popup({ closeButton: true, offset: 10, className: "sr-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:500 12px/1.35 'IBM Plex Sans',system-ui">${p.label}<div style="opacity:.7;font-size:11px;font-weight:400">${p.note}<br/>Compiled control — not a live frontline.</div></div>`)
          .addTo(map);
      });

      map.on("mousemove", (e) => {
        const z = map?.getZoom() ?? 0;
        setCursor(`${e.lngLat.lat.toFixed(4)}°  ${e.lngLat.lng.toFixed(4)}°  z${z.toFixed(1)}`);
      });

      onCmd = (ev: Event) => {
        const cmd = (ev as CustomEvent<"in" | "out">).detail;
        if (!map) return;
        const z = map.getZoom() + (cmd === "in" ? 1.4 : -1.4);
        map.easeTo({ zoom: z, pitch: pitchForZoom(z), duration: 780, easing: spyEase, essential: true });
      };
      onFit = (ev: Event) => {
        const b = (ev as CustomEvent<{ west: number; south: number; east: number; north: number }>).detail;
        map?.fitBounds([[b.west, b.south], [b.east, b.north]], { padding: 48, duration: 1400, maxZoom: 11.5, pitch: 8, essential: true });
      };
      const measurePts: [number, number][] = [];
      onMeasure = () => {
        measurePts.length = 0;
        const src = map?.getSource("measure") as { setData: (d: FC) => void } | undefined;
        src?.setData({ type: "FeatureCollection", features: [] });
        const click = (e: { lngLat: { lng: number; lat: number } }) => {
          measurePts.push([e.lngLat.lng, e.lngLat.lat]);
          if (measurePts.length >= 2) {
            src?.setData({
              type: "FeatureCollection",
              features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: measurePts } }],
            });
            map?.off("click", click);
          }
        };
        map?.on("click", click);
      };
      window.addEventListener("sahel-map", onCmd);
      window.addEventListener("sahel-map-fit", onFit);
      window.addEventListener("sahel-map-measure", onMeasure);
      onNudge = (ev: Event) => {
        const d = (ev as CustomEvent<{ bearing?: number; reset?: boolean }>).detail;
        if (!map) return;
        if (d.reset) {
          map.easeTo({ bearing: 0, pitch: 0, duration: 700, easing: spyEase });
          return;
        }
        if (d.bearing) map.easeTo({ bearing: map.getBearing() + d.bearing, duration: 650, easing: spyEase });
      };
      window.addEventListener("sahel-map-nudge", onNudge);
      map.doubleClickZoom.disable();
      map.on("dblclick", (e) => {
        if (!map) return;
        cinematicFly(map, {
          lon: e.lngLat.lng,
          lat: e.lngLat.lat,
          zoom: Math.min(17.4, map.getZoom() + 2.7),
          label: "DESCEND",
        });
      });

      if (wrap.current && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => map?.resize());
        ro.observe(wrap.current);
      }
      requestAnimationFrame(() => map?.resize());
    }).catch((err) => {
      console.warn("[map] MapLibre failed, keeping static satellite", err);
      setEngine("static");
    });

    const failSafe = window.setTimeout(() => {
      if (!ready.current && mapRef.current) {
        ready.current = true;
        setMapReady(true);
        setEngine("gl");
      }
    }, 4000);
    return () => {
      cancelled = true;
      ready.current = false;
      window.clearTimeout(failSafe);
      if (onCmd) window.removeEventListener("sahel-map", onCmd);
      if (onFit) window.removeEventListener("sahel-map-fit", onFit);
      if (onMeasure) window.removeEventListener("sahel-map-measure", onMeasure);
      if (onNudge) window.removeEventListener("sahel-map-nudge", onNudge);
      if (onSlewTo) window.removeEventListener("ahsr-slew-to", onSlewTo);
      hoverPopup.current?.remove();
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    map.setPadding(hudPad(panelOpen));
    map.resize();
  }, [panelOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    applyOverlayVis(map, layers, imagery, briefingOn, detectOn, Boolean(s1Tiles));
  }, [layers, imagery, briefingOn, detectOn, s1Tiles, visTick, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    (map.getSource("viirs") as RasterTileSource | undefined)?.setTiles?.([viirsUrl(date)]);
    (map.getSource("hls") as RasterTileSource | undefined)?.setTiles?.([hlsUrl(date)]);
    (map.getSource("thermal-raster") as RasterTileSource | undefined)?.setTiles?.([thermalUrl(date)]);
  }, [date]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !s1Tiles) return;
    (map.getSource("s1") as RasterTileSource | undefined)?.setTiles?.([s1Tiles]);
  }, [s1Tiles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("boxes");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(boxFc(boxes));
  }, [boxes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("firms");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(pointFc(firms, (r) => ({ klass: r.klass, frp: r.frp, live: !!r.live, satellite: r.satellite, confidence: r.confidence, daynight: r.daynight, acq: `${r.acqDate} ${r.acqTime}` })));
  }, [firms]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("osint-reports");
    if (src && "setData" in src) {
      (src as { setData: (d: FC) => void }).setData(
        pointFc(reports, (r) => ({
          name: r.title,
          category: r.category,
          id: r.id,
          source: r.sourceLabel,
          url: r.sourceUrl ?? "",
          date: r.date,
          note: "ARCHIVE POST · ingested published post — not an AHSR assessment",
        })),
      );
    }
  }, [reports]);

  useEffect(() => {
    flightSnap.current = { rows: flights, at: Date.now() };
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("flights");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(flightData(flights));
  }, [flights]);

  useEffect(() => {
    vesselSnap.current = { rows: vessels, at: Date.now() };
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("vessels");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(paintVessels(vessels, 0));
  }, [vessels]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const map = mapRef.current;
      if (!map || !ready.current) return;
      const { rows, at } = flightSnap.current;
      const dt = (Date.now() - at) / 1000;
      const fs = map.getSource("flights");
      if (fs && "setData" in fs) (fs as { setData: (d: FC) => void }).setData(flightData(rows.map((f) => deadReckon(f, dt))));
      const tr = map.getSource("flight-trails");
      if (tr && "setData" in tr) (tr as { setData: (d: FC) => void }).setData(trailFc(rows));
      const vs = map.getSource("vessels");
      if (vs && "setData" in vs) {
        (vs as { setData: (d: FC) => void }).setData(paintVessels(vesselSnap.current.rows, (Date.now() - vesselSnap.current.at) / 1000));
      }
      const lanes = map.getSource("lane-markers");
      if (lanes && "setData" in lanes) (lanes as { setData: (d: FC) => void }).setData(laneFc());
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const zones = applyZoneEdits(theaterId, deskZones);
    const src = map.getSource("control");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(controlFc(zones));
    const ls = map.getSource("control-labels");
    if (ls && "setData" in ls) (ls as { setData: (d: FC) => void }).setData(controlLabelFc(zones));
    const cities = deskCities ?? mergedControlCities(controlUpdates);
    const cs = map.getSource("control-cities");
    if (cs && "setData" in cs) (cs as { setData: (d: FC) => void }).setData(pointFc(cities, (c) => ({ name: c.name, faction: c.faction })));
  }, [theaterId, controlUpdates, deskCities, deskZones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const data: FC = searchPin
      ? pointFc([{ id: "search", lat: searchPin.lat, lon: searchPin.lon }], () => ({ name: searchPin.label }))
      : { type: "FeatureCollection", features: [] };
    if (!map.getSource("search-pin")) {
      map.addSource("search-pin", { type: "geojson", data });
      map.addLayer({
        id: "search-pin-halo",
        type: "circle",
        source: "search-pin",
        paint: { "circle-radius": 16, "circle-color": "#e7c56a", "circle-opacity": 0.35, "circle-blur": 0.4 },
      });
      map.addLayer({
        id: "search-pin",
        type: "circle",
        source: "search-pin",
        paint: { "circle-radius": 6, "circle-color": "#e7c56a", "circle-stroke-width": 2, "circle-stroke-color": "#07090b" },
      });
      map.addLayer({
        id: "search-pin-label",
        type: "symbol",
        source: "search-pin",
        layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.2], "text-anchor": "top" },
        paint: { "text-color": "#f3e6c0", "text-halo-color": "#07090b", "text-halo-width": 1.4 },
      });
    } else {
      (map.getSource("search-pin") as unknown as { setData: (d: FC) => void }).setData(data);
    }
  }, [searchPin, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("brief-anno");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(annoFc(annotations));
  }, [annotations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("detections");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(detectFc(detections));
  }, [detections]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("fuae");
    if (src && "setData" in src) {
      (src as { setData: (d: FC) => void }).setData(
        pointFc(fuae, (r) => ({ title: r.title, kind: r.kind, why: r.why, dest: r.dest })),
      );
    }
  }, [fuae]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const put = (id: string, rows: GevPin[]) => {
      const src = map.getSource(id);
      if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(pointFc(rows, (r) => ({ name: r.name, note: r.note, kind: r.kind })));
    };
    put("quakes", quakes);
    put("sats", sats);
    put("eonet", eonet);
    put("launches", launches);
  }, [quakes, sats, eonet, launches]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      try {
        if (globeOn) {
          map.setProjection({ type: "globe" });
          (map as unknown as { setFog?: (v: unknown) => void }).setFog?.({
            color: "rgb(7, 9, 11)",
            "high-color": "rgb(28, 38, 48)",
            "horizon-blend": 0.08,
            "space-color": "rgb(4, 6, 8)",
            "star-intensity": 0.42,
          });
          if (map.getZoom() > 3.2) {
            try {
              map.setZoom(2.45);
              map.setPitch(0);
            } catch {
              /* optional */
            }
          }
        } else {
          map.setProjection({ type: "mercator" });
          (map as unknown as { setFog?: (v: null) => void }).setFog?.(null);
        }
      } catch {
        /* projection optional */
      }
    };
    apply();
    map.once("style.load", apply);
  }, [globeOn, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const r = LOOK_RASTER[look as LookId] ?? LOOK_RASTER.none;
    const ids = ["hls", "viirs", "s2cloudless", "esri", "gmaps", "dark", "osm", "night", "thermal-raster", "civilian-scene-layer"];
    for (const id of ids) {
      if (!map.getLayer(id)) continue;
      try {
        map.setPaintProperty(id, "raster-saturation", r.sat);
        map.setPaintProperty(id, "raster-hue-rotate", r.hue);
        map.setPaintProperty(id, "raster-contrast", r.contrast);
        map.setPaintProperty(id, "raster-brightness-max", Math.min(1, 0.88 + r.bright));
      } catch {
        /* paint optional */
      }
    }
  }, [look, mapReady, imagery]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const emit = () => {
      const c = map.getCenter();
      useAnalysisArea.getState().setCenter([c.lng, c.lat]);
      window.dispatchEvent(
        new CustomEvent("ahsr-cam", {
          detail: { lat: c.lat, lon: c.lng, z: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() },
        }),
      );
    };
    emit();
    map.on("move", emit);
    return () => {
      map.off("move", emit);
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("news-pts");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(pointFc(newsPoints, (r) => ({ name: r.name, count: r.count })));
  }, [newsPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("osm-pts");
    if (src && "setData" in src) {
      (src as { setData: (d: FC) => void }).setData(
        pointFc(osm.filter(isUsefulOsm), (r) => ({ name: r.name, kind: r.kind })),
      );
    }
  }, [osm, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const partyOf = (id: string) => partyOverrides[id]?.party ?? SITES.find((s) => s.id === id)?.party ?? "unknown";
    const data = siteFc(partyOf, kindFilter);
    if (partyFilter !== "all") data.features = data.features.filter((f) => f.properties.party === partyFilter);
    const src = map.getSource("sites");
    if (src && "setData" in src) (src as { setData: (d: FC) => void }).setData(data);
  }, [partyOverrides, partyFilter, kindFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSiteId) return;
    const site = SITES.find((s) => s.id === selectedSiteId);
    if (!site) return;
    const close = yardsZoom || CLOSE_KINDS.has(site.kind);
    const job = {
      lon: site.lon,
      lat: site.lat,
      zoom: yardsZoom ? 17.2 : close ? 16.2 : 14.8,
      label: site.name,
    };
    if (!ready.current) {
      pendingSlew.current = job;
      return;
    }
    runSlew(map, job);
    if (yardsZoom) clearYardsZoom();
  }, [selectedSiteId, yardsZoom, clearYardsZoom, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedBoxId) return;
    const box = boxes.find((b) => b.id === focusedBoxId);
    if (!box) return;
    map.fitBounds([[box.west, box.south], [box.east, box.north]], { padding: 48, duration: 1400, maxZoom: 11.8, pitch: 12, essential: true });
  }, [focusedBoxId, boxes]);

  useEffect(() => {
    const t = flyTarget;
    if (t) {
      pendingSlew.current = { lon: t.lon, lat: t.lat, zoom: t.zoom, label: t.label, flat: t.flat };
      setFlyTarget(null);
    }
    const map = mapRef.current;
    const job = pendingSlew.current;
    if (!map || !ready.current || !job) return;
    pendingSlew.current = null;
    runSlew(map, job);
  }, [flyTarget, setFlyTarget, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const drop = (id: string) => {
      if (map.getLayer(id)) map.removeLayer(id);
    };
    drop("civilian-change-labels");
    drop("civilian-change-lines");
    drop("civilian-scene-layer");
    if (map.getSource("civilian-changes")) map.removeSource("civilian-changes");
    if (map.getSource("civilian-scene")) map.removeSource("civilian-scene");
    if (!analysisOverlay) return;
    map.addSource("civilian-scene", {
      type: "image",
      url: analysisOverlay.image,
      coordinates: analysisOverlay.corners as [[number, number], [number, number], [number, number], [number, number]],
    });
    map.addLayer({
      id: "civilian-scene-layer",
      type: "raster",
      source: "civilian-scene",
      paint: { "raster-opacity": 0.92, "raster-fade-duration": 0 },
    });
    map.addSource("civilian-changes", { type: "geojson", data: analysisOverlay.features });
    map.addLayer({
      id: "civilian-change-lines",
      type: "line",
      source: "civilian-changes",
      paint: { "line-color": "#d4c4a0", "line-width": 2 },
    });
  }, [analysisOverlay, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("freight");
    if (src && "setData" in src) {
      (src as { setData: (d: FC) => void }).setData(
        pointFc(
          freightHits.map((r, i) => ({ ...r, id: `fr-${i}` })),
          (r) => ({
            name: `${Math.round(r.speedKmh)} km/h ${r.headingDesc}`,
            note: "possible moving vehicles · not a count",
          }),
        ),
      );
    }
  }, [freightHits]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const rows = hazardFeed?.events ?? [];
    const src = map.getSource("hazards");
    if (src && "setData" in src) {
      (src as { setData: (d: FC) => void }).setData(
        pointFc(rows, (r) => ({ name: r.title, note: `${r.provider} · ${r.category}` })),
      );
    }
  }, [hazardFeed]);

  useEffect(() => {
    const t = THEATER_BY_ID[theaterId];
    const map = mapRef.current;
    if (!map || !ready.current || !t) return;
    map.fitBounds([[t.west, t.south], [t.east, t.north]], { padding: 40, duration: 1600, maxZoom: t.zoom, pitch: 6, essential: true });
  }, [theaterId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !orbitOn) return;
    if (!globeOn && map.getPitch() < 22) {
      try {
        map.setPitch(34);
      } catch {
        /* optional */
      }
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      try {
        map.setBearing(map.getBearing() + dt * 12);
      } catch {
        /* optional */
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = () => setOrbitOn(false);
    map.on("dragstart", stop);
    return () => {
      cancelAnimationFrame(raf);
      map.off("dragstart", stop);
    };
  }, [orbitOn, mapReady, globeOn, setOrbitOn]);

  const grain =
    imagery === "s2" ? `S2 HLS ${date}` :
    imagery === "s1" ? `S1 SAR ${date}` :
    imagery === "viirs" ? `VIIRS ${date}` :
    imagery === "s2cloudless" ? "S2 mosaic 2024" :
    imagery === "gmaps" ? "Google satellite" :
    imagery === "dark" ? "Dark context" : "High-res Esri";

  return (
    <div ref={wrap} className="absolute inset-0 z-0 bg-bg">
      {engine !== "gl" ? (
        <StaticSatellite date={date} boxes={boxes} firms={firms} flights={flights} onPick={setSelectedSite} />
      ) : null}
      <div ref={host} className={cn("h-full w-full", engine !== "gl" && "pointer-events-none opacity-0")} />
      {engine === "gl" ? <LookFx mapRef={mapRef} flights={flights} detections={detections} /> : null}
      <div className="pointer-events-none absolute bottom-28 left-3 hidden rounded-full border border-border bg-bg/80 px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted md:block">
        {cursor}
        <span className="mx-1.5 text-subtle">·</span>
        {grain}
      </div>
      <CloudChip />
    </div>
  );
}

function CloudChip() {
  const [wx, setWx] = useState("cloud —");
  useEffect(() => {
    let timer = 0;
    let last = "";
    const pull = (lat: number, lon: number) => {
      const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
      if (key === last) return;
      last = key;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,wind_speed_10m,precipitation`;
      void fetch(url)
        .then((r) => r.json())
        .then((j: { current?: { temperature_2m?: number; cloud_cover?: number; wind_speed_10m?: number; precipitation?: number } }) => {
          const c = j.current;
          if (!c) return;
          const cloud = c.cloud_cover ?? 0;
          const note = cloud > 60 ? "S2 cloudy — try S1 for this date" : cloud > 30 ? "partial cloud" : "optical usable";
          setWx(`${Math.round(c.temperature_2m ?? 0)}°C · cloud ${Math.round(cloud)}% · ${note}`);
        })
        .catch(() => setWx("cloud n/a"));
    };
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ lat: number; lon: number }>).detail;
      if (!d) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => pull(d.lat, d.lon), 900);
    };
    window.addEventListener("ahsr-cam", on);
    pull(15.6, 32.5);
    return () => {
      window.removeEventListener("ahsr-cam", on);
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <div className="pointer-events-none absolute bottom-36 left-3 hidden max-w-[22rem] rounded-full border border-border bg-bg/80 px-2.5 py-1 font-mono text-[11px] text-muted md:block">
      {wx}
    </div>
  );
}
