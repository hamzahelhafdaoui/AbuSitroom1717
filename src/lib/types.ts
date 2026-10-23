export type ImagerySource = "s2" | "s1" | "viirs" | "s2cloudless" | "hires" | "gmaps" | "dark" | "osm" | "night";

export const IMAGERY: Record<
  ImagerySource,
  { label: string; grain: string; dated: boolean; note: string; pickerNote: string }
> = {
  hires: {
    label: "High-res · Esri",
    grain: "yards / roofs",
    dated: false,
    note: "Esri World Imagery. Best for yards and roofs. Not a dated scene.",
    pickerNote: "Sub-meter aerial/satellite — zoom to street & building level",
  },
  gmaps: {
    label: "Google satellite",
    grain: "yards / roofs · not a date",
    dated: false,
    note: "Google satellite tiles for visual compare with Esri. Not a dated scene. Switch Esri ↔ Google on the same pin.",
    pickerNote: "Google satellite — compare yards/roofs with Esri on the same location",
  },
  s2: {
    label: "Sentinel-2 · dated HLS",
    grain: "HLS 30 m · dated",
    dated: true,
    note: "NASA HLS from Sentinel-2 MSI. ~30 m. Not every day; cloudy granules are empty. Latency about 2–4 days.",
    pickerNote: "Dated 30 m optical — cloudy granules are empty",
  },
  s1: {
    label: "Sentinel-1 · SAR",
    grain: "S1 RTC · one scene",
    dated: true,
    note: "Public Sentinel-1 RTC browse (Planetary Computer). Cloud-gap morphology only. Speckle is not wreckage. Not a vehicle census. DET does not run on this layer.",
    pickerNote: "Dated SAR when optical is cloudy — one scene, not a mosaic",
  },
  s2cloudless: {
    label: "Sentinel-2 · 10 m",
    grain: "10–20 m mosaic · not a date",
    dated: false,
    note: "EOX Sentinel-2 cloudless 2024 mosaic. Morphology, not a single overpass. Do not date a change to 2024.",
    pickerNote: "Cloud-free true-color mosaic — annual baseline; good for change",
  },
  viirs: {
    label: "VIIRS · daily LIVE",
    grain: "375 m · dated LIVE",
    dated: true,
    note: "NASA GIBS NOAA-20 true color. Coarse. Today is often incomplete.",
    pickerNote: "Near-real-time true color — coarse (~250 m); smoke & burn scars",
  },
  dark: {
    label: "Dark context",
    grain: "Esri canvas · phosphor",
    dated: false,
    note: "Esri Dark Gray Canvas, phosphor-graded. Reference basemap for annotations — not imagery. No API key. Use satellite options to inspect yards.",
    pickerNote: "Esri dark canvas — phosphor / black. No API key.",
  },
  osm: {
    label: "OSM streets",
    grain: "map · live cartography",
    dated: false,
    note: "OpenStreetMap raster via CARTO Dark Matter. Context streets, not imagery.",
    pickerNote: "CARTO Dark Matter + OSM — globe / street context",
  },
  night: {
    label: "Black marble · night",
    grain: "city lights · GIBS",
    dated: false,
    note: "NASA Black Marble / VIIRS night lights. Settlement glow, not a dated overpass you can clock.",
    pickerNote: "Night lights — GEV-style globe from orbit",
  },
};

export type Party =
  | "saf"
  | "rsf"
  | "mixed"
  | "other_armed"
  | "civilian"
  | "unknown";

export type SiteStatus = "active" | "damaged" | "abandoned" | "unclear";

export type Confidence = 1 | 2 | 3 | 4 | 5;

export type ReviewState =
  | "unreviewed"
  | "confirmed"
  | "rejected"
  | "needs_imagery";

export type AlertType =
  | "change"
  | "thermal"
  | "flight"
  | "convoy"
  | "damage"
  | "multi_source";

export type AirCategory = "pax" | "cargo" | "bizjet" | "tanker" | "unknown";

export type ThermalClass =
  | "agricultural"
  | "industrial"
  | "urban_structure"
  | "possible_explosive"
  | "unknown";

export type IndicatorFamily =
  | "morphology"
  | "thermal"
  | "flight"
  | "vehicles"
  | "damage"
  | "reporting"
  | "corridor";

export interface WatchBox {
  id: string;
  name: string;
  region: string;
  west: number;
  south: number;
  east: number;
  north: number;
  priority: "primary" | "border";
  notes: string;
}

export interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  admin1: string;
  admin2: string;
  kind:
    | "airfield"
    | "compound"
    | "logistics"
    | "market"
    | "hospital"
    | "camp"
    | "farm"
    | "crossing"
    | "strip"
    | "port"
    | "well";
  party: Party;
  confidence: Confidence;
  firstSeen: string;
  lastSeen: string;
  status: SiteStatus;
  civilianBaseline: string;
  notes: string;
}

export const KIND_GROUPS: Record<string, Site["kind"][] | null> = {
  all: null,
  bases: ["airfield", "strip", "compound"],
  yards: ["logistics", "port"],
  camps: ["camp"],
  hospitals: ["hospital"],
  markets: ["market"],
  corridors: ["crossing", "well"],
};

export const KIND_GROUP_LABEL: Record<string, string> = {
  all: "All pins",
  bases: "Bases / airfields",
  yards: "Yards / cargo",
  camps: "Camps",
  hospitals: "Hospitals",
  markets: "Markets",
  corridors: "Corridors",
};

export function siteInKindGroup(kind: Site["kind"], group: string): boolean {
  const g = KIND_GROUPS[group];
  if (!g) return true;
  return g.includes(kind);
}

export interface VehicleEstimate {
  large: [number, number];
  uncertainNote: string;
}

export interface Observation {
  id: string;
  siteId: string;
  datetime: string;
  sensor: string;
  sceneId: string;
  cloudPct: number;
  notes: string;
  indicators: IndicatorFamily[];
  vehicles?: VehicleEstimate;
  damageFlag: boolean;
  confidence: Confidence;
}

export interface Alert {
  id: string;
  type: AlertType;
  score: number;
  title: string;
  body: string;
  siteIds: string[];
  observationIds: string[];
  lat: number;
  lon: number;
  datetime: string;
  families: IndicatorFamily[];
  confidence: Confidence;
  review: ReviewState;
  negativeEvidence?: string;
}

export interface FlightEvent {
  id: string;
  hex: string;
  reg: string;
  typeCode: string;
  operator: string;
  category: AirCategory;
  origin: string;
  dest: string;
  firstSeen: string;
  lastSeen: string;
  lat: number;
  lon: number;
  altFt?: number;
  track?: number;
  gs?: number;
  nearestAirfield: string;
  notes: string;
  confidence: Confidence;
  relevant: boolean;
  live?: boolean;
  military?: boolean;
  squawk?: string;
  emergency?: boolean;
}

export interface VesselEvent {
  id: string;
  name: string;
  lat: number;
  lon: number;
  flag: string;
  kind: "port-node" | "ais" | "lane";
  sog: number;
  cog: number;
  destination: string;
  notes: string;
  live: boolean;
  updatedAt?: string;
}

export interface ThermalEvent {
  id: string;
  lat: number;
  lon: number;
  acqDate: string;
  acqTime: string;
  satellite: string;
  confidence: string;
  frp: number;
  daynight: "D" | "N";
  klass: ThermalClass;
  siteId?: string;
  live?: boolean;
}

export interface Citation {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
  reliability: "high" | "medium" | "low";
  note: string;
}

export interface ChangeEntry {
  id: string;
  firstSeen: string;
  lastSeen: string;
  title: string;
  body: string;
  siteId?: string;
  siteName?: string;
  families: IndicatorFamily[];
  source: "archive" | "firms" | "flight" | "report" | "gdelt" | "osm" | "feed" | "vessel";
  confidence: Confidence;
  lat: number;
  lon: number;
  negative?: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
}

/** Immutable evidence pack for a finding — reproducible, public-data only. */
export interface EvidenceBundle {
  id: string;
  createdAt: string;
  kind: "site-scene" | "flight" | "alert" | "thermal" | "multi";
  title: string;
  lat: number;
  lon: number;
  siteId?: string;
  alertId?: string;
  flightId?: string;
  sceneIds: string[];
  acquisitionTimes: string[];
  bbox: { west: number; south: number; east: number; north: number };
  processing: { sensor: string; params: string; scriptHash: string };
  firmsSubset: ThermalEvent[];
  flightJson: FlightEvent | null;
  citations: Citation[];
  geojson: string;
  notes: string;
  confidence: Confidence;
  screenshotDataUrl?: string;
  caveats: string;
}

export interface LiveMeta {
  fetchedAt: string | null;
  recordCount: number;
  status: "ok" | "stale" | "empty" | "error" | "gap";
  source: string;
  note: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string | null;
}

export interface NewsPoint {
  id: string;
  lat: number;
  lon: number;
  name: string;
  count: number;
  articles: { title: string; url: string }[];
}

export interface NewsFeed {
  items: NewsItem[];
  points: NewsPoint[];
  meta: LiveMeta;
}

export interface GdeltEvent {
  id: string;
  name: string;
  actor: string;
  date: string;
  subtype: string;
  country: string;
  notes: string;
  lat: number;
  lon: number;
  source: string;
  live?: boolean;
  url?: string;
}

export interface OsmSite {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  country: string;
  source: string;
}

export interface FeedItem {
  id: string;
  url: string;
  source: string;
  channel: string;
  text: string;
  timestamp: string;
  hasMedia: boolean;
  lat?: number;
  lon?: number;
  place?: string;
}

export interface TickerItem {
  source: string;
  title: string;
  url: string;
}

export interface BriefItem {
  id: string;
  headline: string;
  date: string | null;
  category: string;
  location: string | null;
  confidence: "reported" | "corroborated" | "single-source";
  summary: string;
  lat: number | null;
  lon: number | null;
  geoName: string | null;
  geoPrecise: boolean;
}

export interface AiBrief {
  ok: boolean;
  model: string;
  generatedAt: number;
  items: BriefItem[];
  citations: Citation[];
  commander?: string;
  meaning?: string;
  error?: string;
}

export interface LiveBundle {
  firms: ThermalEvent[];
  firmsMeta: LiveMeta;
  flights: FlightEvent[];
  flightsMeta: LiveMeta;
  reports: Citation[];
  reportsMeta: LiveMeta;
  news: NewsItem[];
  newsPoints: NewsPoint[];
  newsMeta: LiveMeta;
  gdelt: GdeltEvent[];
  gdeltMeta: LiveMeta;
  osm: OsmSite[];
  osmMeta: LiveMeta;
  feeds: FeedItem[];
  feedsMeta: LiveMeta;
  ticker: TickerItem[];
  vessels: VesselEvent[];
  vesselsMeta: LiveMeta;
  quakes: import("@/lib/gev-world").GevPin[];
  sats: import("@/lib/gev-world").GevPin[];
  eonet: import("@/lib/gev-world").GevPin[];
  launches: import("@/lib/gev-world").GevPin[];
}

export const PARTY_LABEL: Record<Party, string> = {
  saf: "SAF",
  rsf: "RSF",
  mixed: "Mixed",
  other_armed: "Other armed",
  civilian: "Civilian",
  unknown: "Unknown",
};

export const CONFIDENCE_RUBRIC: Record<Confidence, string> = {
  1: "Single weak indicator (one cloudy-adjacent change, one FIRMS point, one overflight).",
  2: "Repeated same indicator, no independent corroboration.",
  3: "Two indicator families, same site, multi-date.",
  4: "Three families plus open-source reporting that is consistent.",
  5: "High-res or ground media + multi-date satellite + reporting + movement chain.",
};

export const AOI = {
  west: 9.5,
  south: -1.2,
  east: 57.0,
  north: 32.8,
  center: [32.5, 15.6] as [number, number],
  zoom: 5.05,
};

export const SUDAN_FRAME = {
  west: 21.8,
  south: 9.4,
  east: 38.6,
  north: 22.8,
};
