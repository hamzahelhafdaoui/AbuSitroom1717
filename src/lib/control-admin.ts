import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  CONTROL_CITIES,
  type ControlCity,
  type ControlConfidence,
  seedZoneEdits,
  type ZoneEdit,
} from "@/lib/control";
import type { Faction } from "@/lib/osint";

const FACTIONS = new Set<Faction>(["saf", "rsf", "splm-n", "contested"]);
const CONFS = new Set<ControlConfidence>(["high", "moderate", "low"]);

function asFaction(v: string): Faction {
  return FACTIONS.has(v as Faction) ? (v as Faction) : "contested";
}
function asConf(v: string): ControlConfidence {
  return CONFS.has(v as ControlConfidence) ? (v as ControlConfidence) : "low";
}

type CityRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  faction: string;
  as_of: string;
  confidence: string;
  note: string;
  source: string;
};

type ZoneRow = { id: string; faction: string; label: string; note: string; confidence: string };

function cityFrom(r: CityRow): ControlCity {
  return {
    id: r.id,
    name: r.name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    faction: asFaction(r.faction),
    asOf: String(r.as_of).slice(0, 10),
    confidence: asConf(r.confidence),
    note: r.note,
    source: r.source,
  };
}

function cleanCities(rows: ControlCity[]): ControlCity[] {
  return rows.slice(0, 80).map((c) => ({
    id: String(c.id || "").slice(0, 80) || `cc-${c.lat.toFixed(3)}-${c.lon.toFixed(3)}`,
    name: String(c.name || "Unnamed").slice(0, 80),
    lat: Number(c.lat),
    lon: Number(c.lon),
    faction: asFaction(String(c.faction)),
    asOf: String(c.asOf || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
    confidence: asConf(String(c.confidence)),
    note: String(c.note || "").slice(0, 400),
    source: String(c.source || "Desk admin").slice(0, 120),
  })).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon) && Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180);
}

function cleanZones(rows: ZoneEdit[]): ZoneEdit[] {
  const allowed = new Set(seedZoneEdits().map((z) => z.id));
  return rows
    .filter((z) => allowed.has(z.id))
    .map((z) => ({
      id: z.id,
      faction: asFaction(String(z.faction)),
      label: String(z.label || z.id).slice(0, 80),
      note: String(z.note || "").slice(0, 400),
      confidence: asConf(String(z.confidence)),
    }));
}

export const getDesk = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const cities = await sql<CityRow>`select id, name, lat, lon, faction, as_of, confidence, note, source from control_city`;
    const zones = await sql<ZoneRow>`select id, faction, label, note, confidence from control_zone_edit`;
    const base = seedZoneEdits();
    const merged = base.map((z) => {
      const hit = zones.find((r) => r.id === z.id);
      if (!hit) return z;
      return {
        id: z.id,
        faction: asFaction(hit.faction),
        label: hit.label || z.label,
        note: hit.note || z.note,
        confidence: asConf(hit.confidence),
      };
    });
    return {
      cities: cities.length ? cities.map(cityFrom) : CONTROL_CITIES,
      zones: merged,
      published: cities.length > 0,
    };
  } catch {
    return { cities: CONTROL_CITIES, zones: seedZoneEdits(), published: false };
  }
});

export const deskRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`select user_id from desk_admin where id = 1`;
    const adminId = rows[0]?.user_id ?? null;
    return { isAdmin: adminId === context.userId, claimed: Boolean(adminId) };
  });

export const claimDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`select user_id from desk_admin where id = 1`;
    if (rows[0] && rows[0].user_id !== context.userId) {
      throw new Error("Editing is already locked to another account.");
    }
    if (!rows[0]) {
      await sql`insert into desk_admin (id, user_id) values (1, ${context.userId})`;
    }
    return { ok: true as const };
  });

export const saveDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { cities?: ControlCity[]; zones?: ZoneEdit[] }) => ({
    cities: cleanCities(Array.isArray(data?.cities) ? data.cities : []),
    zones: cleanZones(Array.isArray(data?.zones) ? data.zones : []),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`select user_id from desk_admin where id = 1`;
    if (!rows[0] || rows[0].user_id !== context.userId) {
      throw new Error("Only the locked admin account can change control.");
    }
    await sql`delete from control_city`;
    for (const c of data.cities) {
      await sql`insert into control_city (id, name, lat, lon, faction, as_of, confidence, note, source)
        values (${c.id}, ${c.name}, ${c.lat}, ${c.lon}, ${c.faction}, ${c.asOf}, ${c.confidence}, ${c.note}, ${c.source})`;
    }
    await sql`delete from control_zone_edit`;
    for (const z of data.zones) {
      await sql`insert into control_zone_edit (id, faction, label, note, confidence)
        values (${z.id}, ${z.faction}, ${z.label}, ${z.note}, ${z.confidence})`;
    }
    return { ok: true as const, cities: data.cities, zones: data.zones };
  });
