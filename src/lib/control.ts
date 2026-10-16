import { haversineKm } from "@/lib/geo";
import {
  CONTROL_AS_OF as SEED_AS_OF,
  CONTROL_ZONES,
  FACTION_META,
  type Faction,
  type ControlZone,
} from "@/lib/osint";
import type { OsmSite, Party } from "@/lib/types";
import type { TheaterId } from "@/lib/theaters";

export type ControlConfidence = "high" | "moderate" | "low";

export interface ControlCity {
  id: string;
  name: string;
  lat: number;
  lon: number;
  faction: Faction;
  asOf: string;
  confidence: ControlConfidence;
  note: string;
  source: string;
}

export interface ControlUpdate {
  id: string;
  lat: number;
  lon: number;
  faction: Faction;
  date: string;
  label: string;
  source: string;
}

/**
 * Compiled from open reporting (Reuters, ISW, Sudan War Monitor, OHCHR).
 * Approximate, time-bounded, not a live frontline. Remix this list when
 * you stand the workbench up for another theater.
 */
export const CONTROL_CITIES: ControlCity[] = [
  {
    id: "cc-port-sudan",
    name: "Port Sudan",
    lat: 19.6158,
    lon: 37.2164,
    faction: "saf",
    asOf: "2023-04-15",
    confidence: "high",
    note: "SAF rear and wartime administrative capital in open reporting.",
    source: "Open reporting",
  },
  {
    id: "cc-kassala",
    name: "Kassala",
    lat: 15.451,
    lon: 36.4,
    faction: "saf",
    asOf: "2023-04-15",
    confidence: "high",
    note: "Eastern states remained SAF in consistent open maps.",
    source: "Open reporting",
  },
  {
    id: "cc-khartoum",
    name: "Khartoum",
    lat: 15.5007,
    lon: 32.5599,
    faction: "saf",
    asOf: "2025-03-26",
    confidence: "moderate",
    note: "SAF retook much of the capital in open reporting, March 2025.",
    source: "Reuters / ISW",
  },
  {
    id: "cc-wad-madani",
    name: "Wad Madani",
    lat: 14.4013,
    lon: 33.5199,
    faction: "saf",
    asOf: "2025-01-12",
    confidence: "moderate",
    note: "SAF retook Wad Madani in January 2025 according to press reporting.",
    source: "Open reporting",
  },
  {
    id: "cc-sennar",
    name: "Sennar",
    lat: 13.5667,
    lon: 33.6167,
    faction: "saf",
    asOf: "2025-02-12",
    confidence: "moderate",
    note: "SAF reported retaking Sennar city in 2025.",
    source: "Open reporting",
  },
  {
    id: "cc-kosti",
    name: "Kosti",
    lat: 13.1629,
    lon: 32.6635,
    faction: "saf",
    asOf: "2025-06-01",
    confidence: "low",
    note: "White Nile treated as SAF in later-2025 open maps. Low confidence.",
    source: "Open reporting",
  },
  {
    id: "cc-el-fasher",
    name: "El Fasher",
    lat: 13.6279,
    lon: 25.3494,
    faction: "rsf",
    asOf: "2025-10-26",
    confidence: "high",
    note: "City fell in late October 2025 according to UN and press reporting.",
    source: "OHCHR / Reuters",
  },
  {
    id: "cc-nyala",
    name: "Nyala",
    lat: 12.0489,
    lon: 24.8807,
    faction: "rsf",
    asOf: "2023-10-26",
    confidence: "moderate",
    note: "South Darfur capital under RSF in open reporting from late 2023.",
    source: "Open reporting",
  },
  {
    id: "cc-geneina",
    name: "El Geneina",
    lat: 13.4526,
    lon: 22.4471,
    faction: "rsf",
    asOf: "2023-11-04",
    confidence: "moderate",
    note: "West Darfur capital under RSF in open reporting.",
    source: "Open reporting",
  },
  {
    id: "cc-zalingei",
    name: "Zalingei",
    lat: 12.9096,
    lon: 23.4706,
    faction: "rsf",
    asOf: "2023-10-31",
    confidence: "moderate",
    note: "Central Darfur capital.",
    source: "Open reporting",
  },
  {
    id: "cc-ed-daein",
    name: "Ed Daein",
    lat: 11.4614,
    lon: 26.1256,
    faction: "rsf",
    asOf: "2023-08-21",
    confidence: "moderate",
    note: "East Darfur capital.",
    source: "Open reporting",
  },
  {
    id: "cc-el-obeid",
    name: "El Obeid",
    lat: 13.1833,
    lon: 30.2167,
    faction: "contested",
    asOf: "2026-08-01",
    confidence: "low",
    note: "North Kordofan capital — control fluctuates. Do not treat as settled.",
    source: "Open reporting",
  },
  {
    id: "cc-kadugli",
    name: "Kadugli",
    lat: 11.0111,
    lon: 29.7167,
    faction: "contested",
    asOf: "2026-08-01",
    confidence: "low",
    note: "South Kordofan. Mixed SAF / SPLM-N / RSF picture.",
    source: "Open reporting",
  },
  {
    id: "cc-babanusa",
    name: "Babanusa",
    lat: 11.3324,
    lon: 27.8079,
    faction: "contested",
    asOf: "2026-06-01",
    confidence: "low",
    note: "West Kordofan rail junction. Repeatedly contested in open reporting.",
    source: "Open reporting",
  },
  {
    id: "cc-kurmuk",
    name: "Kurmuk",
    lat: 10.55,
    lon: 34.28,
    faction: "contested",
    asOf: "2026-03-23",
    confidence: "low",
    note: "Blue Nile. RSF/SPLM-N assault reported March 2026.",
    source: "Sudan News Network",
  },
];

export function partyToFaction(party: Party): Faction | null {
  if (party === "saf") return "saf";
  if (party === "rsf") return "rsf";
  if (party === "mixed") return "contested";
  if (party === "other_armed") return "splm-n";
  return null;
}

export function mergedControlCities(updates: ControlUpdate[]): ControlCity[] {
  const cities = CONTROL_CITIES.map((c) => ({ ...c }));
  const extras: ControlCity[] = [];
  for (const u of updates) {
    let nearest: ControlCity | null = null;
    let best = 80;
    for (const c of cities) {
      const km = haversineKm(u.lat, u.lon, c.lat, c.lon);
      if (km < best) {
        best = km;
        nearest = c;
      }
    }
    if (nearest) {
      nearest.faction = u.faction;
      nearest.asOf = u.date.slice(0, 10);
      nearest.note = `${u.label} Confirmed locally — shading follows this click, not a new frontline survey.`;
      nearest.source = u.source;
      nearest.confidence = "moderate";
    } else {
      extras.push({
        id: u.id,
        name: u.label.slice(0, 40),
        lat: u.lat,
        lon: u.lon,
        faction: u.faction,
        asOf: u.date.slice(0, 10),
        confidence: "low",
        note: u.label,
        source: u.source,
      });
    }
  }
  return [...cities, ...extras];
}

export function controlAsOf(cities: ControlCity[]): string {
  let latest = SEED_AS_OF;
  for (const c of cities) {
    if (c.asOf > latest) latest = c.asOf;
  }
  return latest;
}

export function controlZonesFor(theater: TheaterId) {
  if (theater === "sdn" || theater === "all") return CONTROL_ZONES;
  return [];
}

export interface ZoneEdit {
  id: string;
  faction: Faction;
  label: string;
  note: string;
  confidence: ControlConfidence;
}

export function applyZoneEdits(theater: TheaterId, edits: ZoneEdit[] | null): ControlZone[] {
  const base = controlZonesFor(theater);
  if (!edits?.length) return base;
  return base.map((z) => {
    const e = edits.find((x) => x.id === z.id);
    if (!e) return z;
    return { ...z, faction: e.faction, label: e.label, note: e.note, confidence: e.confidence };
  });
}

export function seedZoneEdits(): ZoneEdit[] {
  return CONTROL_ZONES.map((z) => ({
    id: z.id,
    faction: z.faction,
    label: z.label,
    note: z.note,
    confidence: z.confidence,
  }));
}

const JUNK_NAME = /heliport|helipad|pump station|lift station|temple of|\bunnamed\b/i;
const GENERIC_NAME = /^(osm site|military|yes|barracks|checkpoint|aerodrome)$/i;
const SYNTH_CODE = /\(([A-Z]{2})-\d{4}\)/;

export function isUsefulOsm(s: OsmSite): boolean {
  const name = (s.name || "").trim();
  if (!name || GENERIC_NAME.test(name) || JUNK_NAME.test(name)) return false;
  if (s.kind === "heliport") return false;
  if (SYNTH_CODE.test(name)) return false;
  if (s.kind === "strip") {
    if (s.country === "CF" || s.country === "SS") return false;
    return name.length > 6 && !/^\d/.test(name);
  }
  return true;
}

export { FACTION_META, CONTROL_ZONES };
