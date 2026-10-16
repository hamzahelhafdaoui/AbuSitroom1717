import { createServerFn } from "@tanstack/react-start";

export interface PlaceHit {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  kind: string;
  zoom: number;
}

/** Decimal pair, or hemisphere letters. Lat first, unless the first number cannot be a latitude. */
export function parseCoord(raw: string): { lat: number; lon: number } | null {
  const text = raw.trim();
  let m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])\s*[, ]+\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])\s*$/);
  if (m) {
    const lat = Number(m[1]) * (m[2]!.toUpperCase() === "S" ? -1 : 1);
    const lon = Number(m[3]) * (m[4]!.toUpperCase() === "W" ? -1 : 1);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  m = text.match(/^\s*([NSns])\s*(-?\d+(?:\.\d+)?)\s*°?\s*[, ]+\s*([EWew])\s*(-?\d+(?:\.\d+)?)\s*°?\s*$/);
  if (m) {
    const lat = Number(m[2]) * (m[1]!.toUpperCase() === "S" ? -1 : 1);
    const lon = Number(m[4]) * (m[3]!.toUpperCase() === "W" ? -1 : 1);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
  if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lon: a };
  return null;
}

function zoomFor(addrType: string): number {
  const t = addrType.toLowerCase();
  if (t.includes("country")) return 4.8;
  if (t.includes("region") || t.includes("territory")) return 6.4;
  if (t.includes("locality") || t.includes("city") || t.includes("town") || t.includes("village")) return 12.2;
  if (t.includes("point") || t.includes("street") || t.includes("address") || t.includes("poi")) return 16;
  return 12;
}

type EsriJson = {
  candidates?: { address?: string; location?: { x: number; y: number }; attributes?: { Addr_type?: string; Match_addr?: string } }[];
};

function hitsFromEsri(json: EsriJson, q: string): PlaceHit[] {
  const out: PlaceHit[] = [];
  for (const [i, c] of (json.candidates ?? []).entries()) {
    const lon = c.location?.x;
    const lat = c.location?.y;
    if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const kind = c.attributes?.Addr_type || "place";
    const name = c.address || c.attributes?.Match_addr || q;
    out.push({
      id: `esri-${i}-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      name,
      label: kind.replace(/([A-Z])/g, " $1").trim(),
      lat,
      lon,
      kind,
      zoom: zoomFor(kind),
    });
  }
  return out;
}

function esriUrl(q: string) {
  return (
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates" +
    `?f=json&maxLocations=6&outFields=Match_addr,Addr_type&singleLine=${encodeURIComponent(q)}`
  );
}

/** Browser fallback if the server geocoder is blocked. Same Esri service, no key. */
export async function geocodePlacesClient(q: string): Promise<PlaceHit[]> {
  const query = q.trim();
  if (query.length < 2 || parseCoord(query)) return [];
  const res = await fetch(esriUrl(query), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
  return hitsFromEsri((await res.json()) as EsriJson, query);
}

/** Esri World Geocoding — the same ArcGIS service the satellite basemap uses. No key. */
export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { q?: string }) => ({ q: String(data?.q ?? "").trim().slice(0, 160) }))
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    const q = data.q;
    if (q.length < 2 || parseCoord(q)) return [];
    const res = await fetch(esriUrl(q), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
    return hitsFromEsri((await res.json()) as EsriJson, q);
  });
