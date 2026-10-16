import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { r as getSql } from "./db-xNoEaBoV.mjs";
import { t as authMiddleware } from "./middleware-rxgVnsQw.mjs";
import { g as seedZoneEdits, r as CONTROL_CITIES } from "./control-BsiNbWqm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/control-admin-D5_sy-wQ.js
var FACTIONS = /* @__PURE__ */ new Set([
	"saf",
	"rsf",
	"splm-n",
	"contested"
]);
var CONFS = /* @__PURE__ */ new Set([
	"high",
	"moderate",
	"low"
]);
function asFaction(v) {
	return FACTIONS.has(v) ? v : "contested";
}
function asConf(v) {
	return CONFS.has(v) ? v : "low";
}
function cityFrom(r) {
	return {
		id: r.id,
		name: r.name,
		lat: Number(r.lat),
		lon: Number(r.lon),
		faction: asFaction(r.faction),
		asOf: String(r.as_of).slice(0, 10),
		confidence: asConf(r.confidence),
		note: r.note,
		source: r.source
	};
}
function cleanCities(rows) {
	return rows.slice(0, 80).map((c) => ({
		id: String(c.id || "").slice(0, 80) || `cc-${c.lat.toFixed(3)}-${c.lon.toFixed(3)}`,
		name: String(c.name || "Unnamed").slice(0, 80),
		lat: Number(c.lat),
		lon: Number(c.lon),
		faction: asFaction(String(c.faction)),
		asOf: String(c.asOf || "").slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		confidence: asConf(String(c.confidence)),
		note: String(c.note || "").slice(0, 400),
		source: String(c.source || "Desk admin").slice(0, 120)
	})).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon) && Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180);
}
function cleanZones(rows) {
	const allowed = new Set(seedZoneEdits().map((z) => z.id));
	return rows.filter((z) => allowed.has(z.id)).map((z) => ({
		id: z.id,
		faction: asFaction(String(z.faction)),
		label: String(z.label || z.id).slice(0, 80),
		note: String(z.note || "").slice(0, 400),
		confidence: asConf(String(z.confidence))
	}));
}
var getDesk_createServerFn_handler = createServerRpc({
	id: "27eea1047ca4f567dbfa6ca2ef3ee69285ddee2fa8e5f68bd3f061a3c1931f7a",
	name: "getDesk",
	filename: "src/lib/control-admin.ts"
}, (opts) => getDesk.__executeServer(opts));
var getDesk = createServerFn({ method: "GET" }).handler(getDesk_createServerFn_handler, async () => {
	try {
		const sql = await getSql();
		const cities = await sql`select id, name, lat, lon, faction, as_of, confidence, note, source from control_city`;
		const zones = await sql`select id, faction, label, note, confidence from control_zone_edit`;
		const merged = seedZoneEdits().map((z) => {
			const hit = zones.find((r) => r.id === z.id);
			if (!hit) return z;
			return {
				id: z.id,
				faction: asFaction(hit.faction),
				label: hit.label || z.label,
				note: hit.note || z.note,
				confidence: asConf(hit.confidence)
			};
		});
		return {
			cities: cities.length ? cities.map(cityFrom) : CONTROL_CITIES,
			zones: merged,
			published: cities.length > 0
		};
	} catch {
		return {
			cities: CONTROL_CITIES,
			zones: seedZoneEdits(),
			published: false
		};
	}
});
var deskRole_createServerFn_handler = createServerRpc({
	id: "965211bce2b967de6cc0a0bc76fd95a2a6bb44d3de5585b8d0176515f97256f7",
	name: "deskRole",
	filename: "src/lib/control-admin.ts"
}, (opts) => deskRole.__executeServer(opts));
var deskRole = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(deskRole_createServerFn_handler, async ({ context }) => {
	const adminId = (await (await getSql())`select user_id from desk_admin where id = 1`)[0]?.user_id ?? null;
	return {
		isAdmin: adminId === context.userId,
		claimed: Boolean(adminId)
	};
});
var claimDesk_createServerFn_handler = createServerRpc({
	id: "ad0526d30eb6b94e90d94a73b4004d482613d3c72975d3b679dac1833152db51",
	name: "claimDesk",
	filename: "src/lib/control-admin.ts"
}, (opts) => claimDesk.__executeServer(opts));
var claimDesk = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(claimDesk_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const rows = await sql`select user_id from desk_admin where id = 1`;
	if (rows[0] && rows[0].user_id !== context.userId) throw new Error("Editing is already locked to another account.");
	if (!rows[0]) await sql`insert into desk_admin (id, user_id) values (1, ${context.userId})`;
	return { ok: true };
});
var saveDesk_createServerFn_handler = createServerRpc({
	id: "25694659f57d8cb1dab129277585d925fdc6da5ea215e03c8718552dfbf761b1",
	name: "saveDesk",
	filename: "src/lib/control-admin.ts"
}, (opts) => saveDesk.__executeServer(opts));
var saveDesk = createServerFn({ method: "POST" }).middleware([authMiddleware]).inputValidator((data) => ({
	cities: cleanCities(Array.isArray(data?.cities) ? data.cities : []),
	zones: cleanZones(Array.isArray(data?.zones) ? data.zones : [])
})).handler(saveDesk_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const rows = await sql`select user_id from desk_admin where id = 1`;
	if (!rows[0] || rows[0].user_id !== context.userId) throw new Error("Only the locked admin account can change control.");
	await sql`delete from control_city`;
	for (const c of data.cities) await sql`insert into control_city (id, name, lat, lon, faction, as_of, confidence, note, source)
        values (${c.id}, ${c.name}, ${c.lat}, ${c.lon}, ${c.faction}, ${c.asOf}, ${c.confidence}, ${c.note}, ${c.source})`;
	await sql`delete from control_zone_edit`;
	for (const z of data.zones) await sql`insert into control_zone_edit (id, faction, label, note, confidence)
        values (${z.id}, ${z.faction}, ${z.label}, ${z.note}, ${z.confidence})`;
	return {
		ok: true,
		cities: data.cities,
		zones: data.zones
	};
});
//#endregion
export { claimDesk_createServerFn_handler, deskRole_createServerFn_handler, getDesk_createServerFn_handler, saveDesk_createServerFn_handler };
