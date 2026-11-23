import { c as FLIGHTS, m as VESSEL_SEED } from "./warroom-data-BOQ284NZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/traffic-B-VBTKMO.js
/** Documented maritime corridors (lon, lat). Not live AIS tracks. */
var SEA_LANES = [
	{
		id: "lane-red-sea",
		name: "Red Sea trunk",
		coords: [
			[32.56, 29.93],
			[33.92, 27.23],
			[35.7, 24.1],
			[37.22, 21.4],
			[37.28, 19.62],
			[38.9, 16.4],
			[42.55, 13.4],
			[43.3, 12.55]
		]
	},
	{
		id: "lane-aden",
		name: "Gulf of Aden",
		coords: [
			[43.3, 12.55],
			[45, 12.2],
			[48.9, 11.8],
			[51.2, 11.6]
		]
	},
	{
		id: "lane-uae-africa",
		name: "UAE–Horn / Red Sea",
		coords: [
			[55.03, 24.98],
			[56.5, 25.2],
			[57.4, 23.4],
			[58.2, 20],
			[54, 14.4],
			[51.2, 11.6],
			[48.9, 11.8],
			[43.3, 12.55],
			[42.55, 13.4],
			[38.9, 16.4],
			[37.22, 21.4],
			[37.28, 19.62]
		]
	},
	{
		id: "lane-suez-med",
		name: "Suez approaches",
		coords: [
			[32.34, 30.45],
			[32.31, 31.25],
			[32.3, 31.75]
		]
	}
];
function along(coords, t) {
	const u = (t % 1 + 1) % 1;
	let total = 0;
	const seg = [];
	for (let i = 1; i < coords.length; i++) {
		const a = coords[i - 1];
		const b = coords[i];
		const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
		seg.push(d);
		total += d;
	}
	let remain = u * total;
	for (let i = 1; i < coords.length; i++) {
		const d = seg[i - 1];
		if (remain <= d || i === coords.length - 1) {
			const a = coords[i - 1];
			const b = coords[i];
			const f = d === 0 ? 0 : remain / d;
			return {
				lon: a[0] + (b[0] - a[0]) * f,
				lat: a[1] + (b[1] - a[1]) * f,
				cog: (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360
			};
		}
		remain -= d;
	}
	const last = coords[coords.length - 1];
	return {
		lon: last[0],
		lat: last[1],
		cog: 0
	};
}
/**
* Lane markers that crawl along documented corridors so the maritime picture is
* not frozen. Schematic speed is faster than real hulls so motion is visible at
* theater zoom. NOT live AIS.
*/
function laneVessels(now = Date.now()) {
	const t0 = now / 1e3;
	const out = [];
	for (const lane of SEA_LANES) {
		const n = lane.id === "lane-red-sea" ? 8 : lane.id === "lane-uae-africa" ? 6 : 4;
		for (let i = 0; i < n; i++) {
			const t = t0 * .0034 + i / n;
			const p = along(lane.coords, t);
			out.push({
				id: `lane-${lane.id}-${i}`,
				name: `${lane.name} · ${i + 1}`,
				lat: p.lat,
				lon: p.lon,
				flag: lane.id === "lane-uae-africa" ? "are" : "unknown",
				kind: "lane",
				sog: 14,
				cog: p.cog,
				destination: lane.name,
				notes: "Schematic shipping-lane animation — not a live AIS contact. Public corridor picture only. Absence of a marker is not absence of a vessel.",
				live: false
			});
		}
	}
	return out;
}
function allVessels(now = Date.now()) {
	return [...VESSEL_SEED, ...laneVessels(now)];
}
/** Dead-reckon an ADS-B (or archive) state vector so contacts crawl between polls. */
function deadReckon(f, dtSec) {
	const airborne = (f.altFt ?? 0) > 400 || (f.gs ?? 0) > 40;
	const gs = f.gs && f.gs > 20 ? f.gs : airborne ? 380 : 0;
	const track = f.track ?? 90;
	if (gs < 20 || dtSec <= 0) return f;
	const km = gs * 1.852 * (dtSec / 3600);
	const rad = track * Math.PI / 180;
	const dLat = km * Math.cos(rad) / 111;
	const cos = Math.cos(f.lat * Math.PI / 180);
	const dLon = km * Math.sin(rad) / (111 * Math.max(Math.abs(cos), .2));
	return {
		...f,
		lat: f.lat + dLat,
		lon: f.lon + dLon,
		gs,
		track
	};
}
/** Dead-reckon a live AIS contact between polls. Lane markers are not passed here. */
function deadReckonVessel(v, dtSec) {
	if (!v.live || v.sog < .4 || dtSec <= 0) return v;
	const km = v.sog * 1.852 * (dtSec / 3600);
	const rad = (v.cog ?? 0) * Math.PI / 180;
	const dLat = km * Math.cos(rad) / 111;
	const cos = Math.cos(v.lat * Math.PI / 180);
	const dLon = km * Math.sin(rad) / (111 * Math.max(Math.abs(cos), .2));
	return {
		...v,
		lat: v.lat + dLat,
		lon: v.lon + dLon
	};
}
function mergeFlights(live, archive = FLIGHTS) {
	const seen = new Set(live.map((f) => f.hex));
	const extra = archive.filter((a) => !seen.has(a.hex));
	return [...live, ...extra];
}
//#endregion
export { laneVessels as a, deadReckonVessel as i, allVessels as n, mergeFlights as o, deadReckon as r, SEA_LANES as t };
