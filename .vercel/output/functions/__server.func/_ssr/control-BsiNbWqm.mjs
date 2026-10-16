import { i as CONTROL_ZONES } from "./osint-wXO3XaAY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/control-BsiNbWqm.js
var IMAGERY = {
	hires: {
		label: "High-res · Esri",
		grain: "yards / roofs",
		dated: false,
		note: "Esri World Imagery. Best for yards and roofs. Not a dated scene.",
		pickerNote: "Sub-meter aerial/satellite — zoom to street & building level"
	},
	gmaps: {
		label: "Google satellite",
		grain: "yards / roofs · not a date",
		dated: false,
		note: "Google satellite tiles for visual compare with Esri. Not a dated scene. Switch Esri ↔ Google on the same pin.",
		pickerNote: "Google satellite — compare yards/roofs with Esri on the same location"
	},
	s2: {
		label: "Sentinel-2 · dated HLS",
		grain: "HLS 30 m · dated",
		dated: true,
		note: "NASA HLS from Sentinel-2 MSI. ~30 m. Not every day; cloudy granules are empty. Latency about 2–4 days.",
		pickerNote: "Dated 30 m optical — cloudy granules are empty"
	},
	s1: {
		label: "Sentinel-1 · SAR",
		grain: "S1 RTC · one scene",
		dated: true,
		note: "Public Sentinel-1 RTC browse (Planetary Computer). Cloud-gap morphology only. Speckle is not wreckage. Not a vehicle census. DET does not run on this layer.",
		pickerNote: "Dated SAR when optical is cloudy — one scene, not a mosaic"
	},
	s2cloudless: {
		label: "Sentinel-2 · 10 m",
		grain: "10–20 m mosaic · not a date",
		dated: false,
		note: "EOX Sentinel-2 cloudless 2024 mosaic. Morphology, not a single overpass. Do not date a change to 2024.",
		pickerNote: "Cloud-free true-color mosaic — annual baseline; good for change"
	},
	viirs: {
		label: "VIIRS · daily LIVE",
		grain: "375 m · dated LIVE",
		dated: true,
		note: "NASA GIBS NOAA-20 true color. Coarse. Today is often incomplete.",
		pickerNote: "Near-real-time true color — coarse (~250 m); smoke & burn scars"
	},
	dark: {
		label: "Dark context",
		grain: "Esri canvas · phosphor",
		dated: false,
		note: "Esri Dark Gray Canvas, phosphor-graded. Reference basemap for annotations — not imagery. No API key. Use satellite options to inspect yards.",
		pickerNote: "Esri dark canvas — phosphor / black. No API key."
	},
	osm: {
		label: "OSM streets",
		grain: "map · live cartography",
		dated: false,
		note: "OpenStreetMap raster via CARTO Dark Matter. Context streets, not imagery.",
		pickerNote: "CARTO Dark Matter + OSM — globe / street context"
	},
	night: {
		label: "Black marble · night",
		grain: "city lights · GIBS",
		dated: false,
		note: "NASA Black Marble / VIIRS night lights. Settlement glow, not a dated overpass you can clock.",
		pickerNote: "Night lights — GEV-style globe from orbit"
	}
};
var KIND_GROUPS = {
	all: null,
	bases: [
		"airfield",
		"strip",
		"compound"
	],
	yards: ["logistics", "port"],
	camps: ["camp"],
	hospitals: ["hospital"],
	markets: ["market"],
	corridors: ["crossing", "well"]
};
var KIND_GROUP_LABEL = {
	all: "All pins",
	bases: "Bases / airfields",
	yards: "Yards / cargo",
	camps: "Camps",
	hospitals: "Hospitals",
	markets: "Markets",
	corridors: "Corridors"
};
function siteInKindGroup(kind, group) {
	const g = KIND_GROUPS[group];
	if (!g) return true;
	return g.includes(kind);
}
var PARTY_LABEL = {
	saf: "SAF",
	rsf: "RSF",
	mixed: "Mixed",
	other_armed: "Other armed",
	civilian: "Civilian",
	unknown: "Unknown"
};
var CONFIDENCE_RUBRIC = {
	1: "Single weak indicator (one cloudy-adjacent change, one FIRMS point, one overflight).",
	2: "Repeated same indicator, no independent corroboration.",
	3: "Two indicator families, same site, multi-date.",
	4: "Three families plus open-source reporting that is consistent.",
	5: "High-res or ground media + multi-date satellite + reporting + movement chain."
};
var AOI = {
	west: 9.5,
	south: -1.2,
	east: 57,
	north: 32.8,
	center: [32.5, 15.6],
	zoom: 5.05
};
function inAoi(lat, lon) {
	return lon >= AOI.west && lon <= AOI.east && lat >= AOI.south && lat <= AOI.north;
}
function inBbox(lat, lon, b) {
	return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
}
function haversineKm(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const toR = (d) => d * Math.PI / 180;
	const dLat = toR(lat2 - lat1);
	const dLon = toR(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}
function nearest(lat, lon, items, maxKm) {
	let best = null;
	for (const item of items) {
		const km = haversineKm(lat, lon, item.lat, item.lon);
		if (km <= maxKm && (!best || km < best.km)) best = {
			item,
			km
		};
	}
	return best;
}
function padBbox(lat, lon, padDeg = .18) {
	return {
		west: lon - padDeg,
		south: lat - padDeg,
		east: lon + padDeg,
		north: lat + padDeg
	};
}
/**
* Compiled from open reporting (Reuters, ISW, Sudan War Monitor, OHCHR).
* Approximate, time-bounded, not a live frontline. Remix this list when
* you stand the workbench up for another theater.
*/
var CONTROL_CITIES = [
	{
		id: "cc-port-sudan",
		name: "Port Sudan",
		lat: 19.6158,
		lon: 37.2164,
		faction: "saf",
		asOf: "2023-04-15",
		confidence: "high",
		note: "SAF rear and wartime administrative capital in open reporting.",
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Reuters / ISW"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "OHCHR / Reuters"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Open reporting"
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
		source: "Sudan News Network"
	}
];
function partyToFaction(party) {
	if (party === "saf") return "saf";
	if (party === "rsf") return "rsf";
	if (party === "mixed") return "contested";
	if (party === "other_armed") return "splm-n";
	return null;
}
function mergedControlCities(updates) {
	const cities = CONTROL_CITIES.map((c) => ({ ...c }));
	const extras = [];
	for (const u of updates) {
		let nearest = null;
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
		} else extras.push({
			id: u.id,
			name: u.label.slice(0, 40),
			lat: u.lat,
			lon: u.lon,
			faction: u.faction,
			asOf: u.date.slice(0, 10),
			confidence: "low",
			note: u.label,
			source: u.source
		});
	}
	return [...cities, ...extras];
}
function controlZonesFor(theater) {
	if (theater === "sdn" || theater === "all") return CONTROL_ZONES;
	return [];
}
function applyZoneEdits(theater, edits) {
	const base = controlZonesFor(theater);
	if (!edits?.length) return base;
	return base.map((z) => {
		const e = edits.find((x) => x.id === z.id);
		if (!e) return z;
		return {
			...z,
			faction: e.faction,
			label: e.label,
			note: e.note,
			confidence: e.confidence
		};
	});
}
function seedZoneEdits() {
	return CONTROL_ZONES.map((z) => ({
		id: z.id,
		faction: z.faction,
		label: z.label,
		note: z.note,
		confidence: z.confidence
	}));
}
var JUNK_NAME = /heliport|helipad|pump station|lift station|temple of|\bunnamed\b/i;
var GENERIC_NAME = /^(osm site|military|yes|barracks|checkpoint|aerodrome)$/i;
var SYNTH_CODE = /\(([A-Z]{2})-\d{4}\)/;
function isUsefulOsm(s) {
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
//#endregion
export { siteInKindGroup as _, KIND_GROUP_LABEL as a, haversineKm as c, isUsefulOsm as d, mergedControlCities as f, seedZoneEdits as g, partyToFaction as h, IMAGERY as i, inAoi as l, padBbox as m, CONFIDENCE_RUBRIC as n, PARTY_LABEL as o, nearest as p, CONTROL_CITIES as r, applyZoneEdits as s, AOI as t, inBbox as u };
