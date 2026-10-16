import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { s as geocodePlace } from "./osint-wXO3XaAY.mjs";
import { d as isUsefulOsm, l as inAoi, p as nearest, t as AOI } from "./control-BsiNbWqm.mjs";
import { c as FLIGHTS, d as OSM_SEED, g as createSsrRpc, l as GDELT_ARCHIVE, o as FEED_CHANNELS, p as SITES, s as FEED_SEED, t as AIRFIELDS } from "./warroom-data-iyrVJsgQ.mjs";
import { c as pullNews, n as allVessels } from "./traffic-CSkQ9aHv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/live-C81J6t51.js
var UA$2 = "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";
var mem$1 = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
function cached$1(key, ttl, fn) {
	const hit = mem$1.get(key);
	if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
	const inflight = pending.get(key);
	if (inflight) return inflight;
	const p = fn().then((value) => {
		mem$1.set(key, {
			at: Date.now(),
			value
		});
		return value;
	}).finally(() => pending.delete(key));
	pending.set(key, p);
	return p;
}
async function fetchText$1(url, ms = 12e3, extra = {}) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "*/*",
				"User-Agent": UA$2,
				...extra
			},
			signal: ctrl.signal
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} finally {
		clearTimeout(t);
	}
}
function meta$1(source, count, note, status = "ok") {
	return {
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
		recordCount: count,
		status: count === 0 && status === "ok" ? "empty" : status,
		source,
		note
	};
}
function subtypeFamily(subtype) {
	const s = subtype.toLowerCase();
	if (s.includes("air") || s.includes("drone") || s.includes("airlift")) return "Air activity";
	if (s.includes("vehicle") || s.includes("convoy")) return "Vehicle movement";
	if (s.includes("cargo") || s.includes("port")) return "Cargo movement";
	if (s.includes("displac")) return "Displacement";
	if (s.includes("control")) return "Control change";
	if (s.includes("harm") || s.includes("civilian")) return "Civilian harm";
	if (s.includes("report")) return "Reporting";
	if (s.includes("force")) return "Use of Force";
	return "Armed clash";
}
function mergeOsm(live) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const row of [...live, ...OSM_SEED]) {
		if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) continue;
		if (!inAoi(row.lat, row.lon)) continue;
		if (!isUsefulOsm(row)) continue;
		const k = `${row.id}|${row.lat.toFixed(3)}|${row.lon.toFixed(3)}`;
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(row);
	}
	return out;
}
function mergeGdelt(live) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const row of [...live, ...GDELT_ARCHIVE]) {
		if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) continue;
		if (!inAoi(row.lat, row.lon)) continue;
		const k = row.id || `${row.date}|${row.lat.toFixed(3)}|${row.lon.toFixed(3)}`;
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(row);
	}
	return out;
}
async function pullOsmLive() {
	const boxes = [
		[
			8.4,
			20.2,
			24.8,
			39.2
		],
		[
			20,
			9.5,
			32.8,
			34
		],
		[
			-1,
			41,
			14,
			51.6
		],
		[
			22.4,
			51.5,
			26.6,
			56.8
		]
	];
	const rows = [];
	const seen = /* @__PURE__ */ new Set();
	for (const [s, w, n, e] of boxes) {
		const query = `
[out:json][timeout:22];
(
  node["aeroway"~"aerodrome|airstrip|helipad"](${s},${w},${n},${e});
  way["aeroway"~"aerodrome|airstrip"](${s},${w},${n},${e});
  node["military"](${s},${w},${n},${e});
  way["landuse"="military"](${s},${w},${n},${e});
  node["harbour"](${s},${w},${n},${e});
  node["highway"="border_crossing"](${s},${w},${n},${e});
);
out center 180;
`.trim();
		try {
			const res = await fetch("https://overpass-api.de/api/interpreter", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent": UA$2
				},
				body: new URLSearchParams({ data: query }),
				signal: AbortSignal.timeout(24e3)
			});
			if (!res.ok) continue;
			const json = await res.json();
			for (const el of json.elements ?? []) {
				const lat = el.lat ?? el.center?.lat;
				const lon = el.lon ?? el.center?.lon;
				if (lat == null || lon == null || !inAoi(lat, lon)) continue;
				const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
				if (seen.has(key)) continue;
				seen.add(key);
				const tags = el.tags ?? {};
				const name = tags["name:en"] || tags.name || tags.operator || tags.military || tags.aeroway || "OSM site";
				const mil = tags.military || tags.landuse;
				const aero = tags.aeroway;
				let kind = "compound";
				if (aero === "aerodrome") kind = "airfield";
				else if (aero === "airstrip" || aero === "helipad") kind = "strip";
				else if (mil === "airfield") kind = "airfield";
				else if (mil === "barracks" || mil === "base") kind = "base";
				else if (mil === "checkpoint") kind = "checkpoint";
				else if (tags.highway === "border_crossing") kind = "crossing";
				else if (tags.harbour) kind = "port";
				else if (mil) kind = "base";
				rows.push({
					id: `osm-${el.type}-${el.id}`,
					name,
					kind,
					lat,
					lon,
					country: "TH",
					source: "osm"
				});
			}
		} catch (err) {
			console.warn("[overpass]", s, w, err);
		}
	}
	return rows;
}
async function pullOsm() {
	return cached$1("osm-bases", 216e5, async () => {
		try {
			const live = await pullOsmLive();
			const rows = mergeOsm(live);
			return {
				rows,
				meta: meta$1("OpenStreetMap Overpass + OurAirports", rows.length, `Live OSM ${live.length} · seed ${OSM_SEED.length}. Public mapped infrastructure, not occupancy. Cached 6h.`, live.length ? "ok" : "stale")
			};
		} catch (err) {
			const rows = mergeOsm([]);
			return {
				rows,
				meta: meta$1("OurAirports / compiled OSM (live Overpass unreachable)", rows.length, err instanceof Error ? err.message : "Overpass failed", "stale")
			};
		}
	});
}
async function pullGdeltLive() {
	const text = await fetchText$1("https://api.gdeltproject.org/api/v2/geo/geo?query=" + encodeURIComponent("(Sudan OR Darfur OR Khartoum OR RSF OR SAF OR Kufra OR Adre OR Asosa OR Berbera OR Assab) (attack OR clash OR airstrike OR shelling OR displaced OR airlift)") + "&mode=PointData&format=GeoJSON&maxpoints=200&timespan=14d", 14e3);
	let feats = [];
	try {
		const json = JSON.parse(text);
		feats = Array.isArray(json) ? json : json.features ?? [];
	} catch {
		return [];
	}
	const rows = [];
	const seen = /* @__PURE__ */ new Set();
	for (const f of feats) {
		const coords = f.geometry?.coordinates;
		const lat = Number(f.lat ?? coords?.[1]);
		const lon = Number(f.lon ?? coords?.[0]);
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inAoi(lat, lon)) continue;
		const name = f.properties?.name || f.name || "Sudan";
		const key = `${lat.toFixed(2)}|${lon.toFixed(2)}|${name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		rows.push({
			id: `gdelt-live-${key.replace(/[^a-z0-9]+/gi, "-").slice(0, 48)}`,
			name,
			actor: "unattributed in GDELT",
			date: today,
			subtype: subtypeFamily(name + " " + (f.properties?.html ?? "")),
			country: "Sudan",
			notes: "GDELT GEO 2.0 named-place centroid for the last 14 days. Media geolocation, not an incident coordinate. Not a targeting feed.",
			lat,
			lon,
			source: "gdelt",
			live: true,
			url: f.properties?.url
		});
	}
	return rows;
}
async function pullGdelt() {
	return cached$1("gdelt-conflicts", 9e5, async () => {
		try {
			const live = await pullGdeltLive();
			const rows = mergeGdelt(live);
			return {
				rows,
				meta: meta$1("GDELT GEO 2.0 + 2022–2026 compiled archive", rows.length, `Live GDELT ${live.length} · archive ${GDELT_ARCHIVE.length}. Named-place centroids. Cached 15 min.`, live.length ? "ok" : "stale")
			};
		} catch (err) {
			const rows = mergeGdelt([]);
			return {
				rows,
				meta: meta$1("2022–2026 compiled GDELT-style archive (live unreachable)", rows.length, err instanceof Error ? err.message : "GDELT failed", "stale")
			};
		}
	});
}
function decode(s) {
	return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"").replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
async function scrapeChannel(channel) {
	const blocks = (await fetchText$1(`https://t.me/s/${channel}`, 1e4)).split("class=\"tgme_widget_message_wrap");
	const rows = [];
	for (const b of blocks.slice(1, 18)) {
		const textMatch = b.match(/class="tgme_widget_message_text"[^>]*>([\s\S]*?)<\/div>/i);
		const timeMatch = b.match(/datetime="([^"]+)"/);
		const hrefMatch = b.match(/class="tgme_widget_message_date"[^>]*href="([^"]+)"/);
		const text = textMatch ? decode(textMatch[1]) : "";
		if (text.length < 12) continue;
		const timestamp = timeMatch?.[1] ?? (/* @__PURE__ */ new Date()).toISOString();
		const url = hrefMatch?.[1] ?? `https://t.me/${channel}`;
		const geo = geocodePlace(text);
		rows.push({
			id: `tg-${channel}-${url.split("/").pop() ?? rows.length}`,
			url,
			source: "telegram",
			channel,
			text: text.slice(0, 900),
			timestamp,
			hasMedia: /tgme_widget_message_photo|tgme_widget_message_video/.test(b),
			lat: geo?.lat,
			lon: geo?.lon,
			place: geo?.name
		});
	}
	return rows;
}
async function pullFeeds() {
	return cached$1("tg-feeds", 12e4, async () => {
		const batches = await Promise.all(FEED_CHANNELS.map(async (ch) => {
			try {
				return await scrapeChannel(ch.id);
			} catch {
				return [];
			}
		}));
		const rows = batches.flat().concat(FEED_SEED).sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
		const seen = /* @__PURE__ */ new Set();
		const dedup = rows.filter((r) => {
			if (seen.has(r.id)) return false;
			seen.add(r.id);
			return true;
		}).slice(0, 120);
		return {
			rows: dedup,
			meta: meta$1("Public Telegram web previews (t.me/s)", dedup.length, "Sudan-relevant public channels. Preview scrape, not a login. Rate-limited. Seed notes fill the gap when t.me blocks.", batches.some((b) => b.length) ? "ok" : "stale")
		};
	});
}
async function pullTicker(news) {
	const extraUrls = ["https://feeds.bbci.co.uk/news/world/africa/rss.xml", "https://www.aljazeera.com/xml/rss/all.xml"];
	const extra = [...news];
	for (const url of extraUrls) try {
		const blocks = (await fetchText$1(url, 8e3)).match(/<item>[\s\S]*?<\/item>/gi) ?? [];
		for (const b of blocks.slice(0, 12)) {
			const title = decode(b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
			const link = decode(b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "");
			if (!title) continue;
			if (!/sudan|darfur|khartoum|rsf|saf |kordofan|port sudan/i.test(title)) continue;
			extra.push({
				source: url.includes("bbc") ? "BBC Africa" : "Al Jazeera",
				title,
				url: link || url
			});
		}
	} catch {}
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const t of extra) {
		if (seen.has(t.title)) continue;
		seen.add(t.title);
		out.push(t);
	}
	return out.slice(0, 40);
}
createServerFn({ method: "GET" }).handler(createSsrRpc("d14f076a42cd03407493a6f4d167b2b4cc93d839e9fd5035ed6e61134cc644a5"));
var UA$1 = "AbuHureirahSitroom/1.0 (public-data documentation; GEV-style globe layers)";
async function getJson(url, ms = 12e3) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": UA$1
			},
			signal: ctrl.signal
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} finally {
		clearTimeout(t);
	}
}
function num(v) {
	return typeof v === "number" && Number.isFinite(v) ? v : null;
}
async function pullQuakes() {
	try {
		return ((await getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson")).features ?? []).slice(0, 80).flatMap((f) => {
			const c = f.geometry?.coordinates;
			if (!c || c.length < 2) return [];
			const lon = c[0];
			const lat = c[1];
			const mag = f.properties?.mag ?? 0;
			return [{
				id: `qk-${f.id ?? `${lat}-${lon}`}`,
				kind: "quake",
				name: `M${mag.toFixed(1)} · ${f.properties?.place ?? "quake"}`,
				lat,
				lon,
				mag,
				note: "USGS M2.5+ last 24h. Public seismograph feed — not a damage call.",
				when: f.properties?.time ? new Date(f.properties.time).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
				url: f.properties?.url
			}];
		});
	} catch {
		return [];
	}
}
async function pullSats() {
	try {
		const iss = await getJson("https://api.wheretheiss.at/v1/satellites/25544", 8e3);
		const lat = num(iss.latitude);
		const lon = num(iss.longitude);
		if (lat == null || lon == null) return [];
		return [{
			id: "sat-iss",
			kind: "sat",
			name: "ISS",
			lat,
			lon,
			note: `Public ISS position (Where The ISS At / CelesTrak heritage). Alt ${Math.round(iss.altitude ?? 0)} km.`,
			when: (/* @__PURE__ */ new Date()).toISOString(),
			url: "https://wheretheiss.at/"
		}];
	} catch {
		return [];
	}
}
async function pullEonet() {
	try {
		return ((await getJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=40")).events ?? []).flatMap((ev) => {
			const g = ev.geometry?.[ev.geometry.length - 1];
			const raw = g?.coordinates;
			let lon = null;
			let lat = null;
			if (Array.isArray(raw) && typeof raw[0] === "number") {
				lon = raw[0];
				lat = raw[1];
			} else if (Array.isArray(raw) && Array.isArray(raw[0]) && typeof raw[0][0] === "number") {
				lon = raw[0][0];
				lat = raw[0][1];
			}
			if (lat == null || lon == null) return [];
			const cat = ev.categories?.[0]?.title ?? "event";
			return [{
				id: `eo-${ev.id ?? ev.title}`,
				kind: "eonet",
				name: ev.title ?? "EONET",
				lat,
				lon,
				note: `NASA EONET open natural event · ${cat}. Not a strike feed.`,
				when: g?.date ?? (/* @__PURE__ */ new Date()).toISOString(),
				url: ev.link
			}];
		});
	} catch {
		return [];
	}
}
async function pullLaunches() {
	try {
		return ((await getJson("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&mode=list")).results ?? []).flatMap((r) => {
			const lat = Number(r.pad?.latitude);
			const lon = Number(r.pad?.longitude);
			if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
			return [{
				id: `ln-${r.id ?? r.name}`,
				kind: "launch",
				name: r.name ?? "Launch",
				lat,
				lon,
				note: `Launch Library 2 · ${r.pad?.name ?? r.pad?.location?.name ?? "pad"}. Public schedule, not telemetry.`,
				when: r.net ?? (/* @__PURE__ */ new Date()).toISOString(),
				url: r.url
			}];
		});
	} catch {
		return [];
	}
}
async function pullGevWorld() {
	const [quakes, sats, eonet, launches] = await Promise.all([
		pullQuakes(),
		pullSats(),
		pullEonet(),
		pullLaunches()
	]);
	return {
		quakes,
		sats,
		eonet,
		launches
	};
}
var UA = "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";
var mem = /* @__PURE__ */ new Map();
var TTL_MS = 9e4;
function cached(key, ttl, fn) {
	const hit = mem.get(key);
	if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
	return fn().then((value) => {
		mem.set(key, {
			at: Date.now(),
			value
		});
		return value;
	});
}
async function fetchText(url, ms = 12e3) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "text/plain, application/json, */*",
				"User-Agent": UA
			},
			signal: ctrl.signal
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} finally {
		clearTimeout(t);
	}
}
function meta(source, count, note, status = "ok") {
	return {
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
		recordCount: count,
		status: count === 0 && status === "ok" ? "empty" : status,
		source,
		note
	};
}
function classifyThermal(lat, lon, frp, daynight) {
	const near = nearest(lat, lon, SITES, 8);
	if (!near) return "unknown";
	const kind = near.item.kind;
	if (kind === "farm") return "agricultural";
	if (near.item.id === "heglig") return "industrial";
	if (kind === "hospital" || kind === "camp" || kind === "market") return frp >= 10 ? "possible_explosive" : "urban_structure";
	if (kind === "port" || kind === "logistics") return frp >= 40 ? "industrial" : "unknown";
	if (daynight === "N" && kind === "airfield" && frp >= 8) return "unknown";
	return "unknown";
}
function inFirmsBox(lat, lon) {
	if (lat >= 8 && lat <= 24 && lon >= 21 && lon <= 40) return true;
	if (lat >= 22 && lat <= 28 && lon >= 30 && lon <= 36) return true;
	if (lat >= 8 && lat <= 15 && lon >= 33 && lon <= 40) return true;
	if (lat >= 8 && lat <= 16 && lon >= 15 && lon <= 24) return true;
	if (lat >= 20 && lat <= 24 && lon >= 20 && lon <= 26) return true;
	if (lat >= 12 && lat <= 23 && lon >= 36 && lon <= 44) return true;
	return false;
}
function parseFirmsCsv(csv, satellite) {
	const lines = csv.trim().split(/\r?\n/);
	if (lines.length < 2) return [];
	const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
	const idx = (name) => header.indexOf(name);
	const iLat = idx("latitude");
	const iLon = idx("longitude");
	const iDate = idx("acq_date");
	const iTime = idx("acq_time");
	const iConf = idx("confidence");
	const iFrp = idx("frp");
	const iDn = idx("daynight");
	const iSat = idx("satellite");
	if (iLat < 0 || iLon < 0) return [];
	const out = [];
	for (let i = 1; i < lines.length; i++) {
		const cols = (lines[i] ?? "").split(",");
		const lat = Number(cols[iLat]);
		const lon = Number(cols[iLon]);
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inFirmsBox(lat, lon)) continue;
		const frp = Number(cols[iFrp] ?? 0) || 0;
		const daynight = (cols[iDn] ?? "D") === "N" ? "N" : "D";
		const site = nearest(lat, lon, SITES, 6);
		out.push({
			id: `live-th-${satellite}-${cols[iDate]}-${cols[iTime]}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
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
			live: true
		});
	}
	return out;
}
function firmsUrls(window) {
	const span = window;
	return [
		{
			sat: "NOAA-20",
			url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_${span}.csv`
		},
		{
			sat: "NOAA-21",
			url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_${span}.csv`
		},
		{
			sat: "MODIS",
			url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_${span}.csv`
		}
	];
}
async function pullOneFirm(u, window) {
	try {
		const csv = await fetchText(u.url, window === "7d" ? 45e3 : 25e3);
		if (!csv.includes("latitude")) throw new Error("CSV missing header");
		const rows = parseFirmsCsv(csv, u.sat);
		return {
			rows,
			note: `${u.sat} ${rows.length}`,
			ok: true
		};
	} catch (err) {
		const why = err instanceof Error ? err.message : "fail";
		console.warn("[firms]", u.sat, err);
		return {
			rows: [],
			note: `${u.sat} fail (${why})`,
			ok: false
		};
	}
}
async function pullFirms(window = "24h") {
	const urls = firmsUrls(window);
	const viirs = urls.filter((u) => u.sat !== "MODIS");
	const modis = urls.find((u) => u.sat === "MODIS");
	const first = await Promise.all(viirs.map((u) => pullOneFirm(u, window)));
	const viirsRows = first.reduce((n, p) => n + p.rows.length, 0);
	let parts = first;
	if (viirsRows === 0 && modis) parts = [...first, await pullOneFirm(modis, window)];
	const collected = parts.flatMap((p) => p.rows);
	const notes = parts.map((p) => p.note);
	const anyOk = parts.some((p) => p.ok);
	const dedup = /* @__PURE__ */ new Map();
	for (const r of collected) {
		const k = `${r.satellite}-${r.acqDate}-${(Math.round(r.lat / .003) * .003).toFixed(3)}-${(Math.round(r.lon / .003) * .003).toFixed(3)}`;
		const prev = dedup.get(k);
		if (!prev || r.frp > prev.frp) dedup.set(k, r);
	}
	const rows = [...dedup.values()].sort((a, b) => b.frp - a.frp).slice(0, 800);
	const latest = rows.map((r) => `${r.acqDate}T${r.acqTime}`).sort().at(-1) ?? "none";
	if (!anyOk) return {
		rows: [],
		meta: meta("NASA FIRMS", 0, `FIRMS gap · public CSV unreachable (${notes.join("; ")}). No FIRMS_MAP_KEY is set; area API was not used. Not a silent zero — the feed failed. Thermal anomaly ≠ strike.`, "error")
	};
	if (rows.length === 0) return {
		rows: [],
		meta: meta("NASA FIRMS VIIRS/MODIS public CSV", 0, `FIRMS gap · CSVs parsed but no points in the Sudan-plus-corridors box this ${window} (${notes.join(", ")}). Empty is a coverage result, not a negative. Not a strike feed.`, "empty")
	};
	return {
		rows,
		meta: meta(`NASA FIRMS public CSV ${window}`, rows.length, `FIRMS ok · ${rows.length} points · last acq ${latest} UTC · ${notes.join(", ")}. Deduped ~375 m. Class is agricultural / industrial / urban / possible-explosive / unknown. Possible is the ceiling without optical follow-up. Not a strike pin.`)
	};
}
var getFirmsWindow_createServerFn_handler = createServerRpc({
	id: "04fa879f1446127c8795b4400dd1711eeb2c60c38332fdebd952c071084b2587",
	name: "getFirmsWindow",
	filename: "src/lib/live.ts"
}, (opts) => getFirmsWindow.__executeServer(opts));
var getFirmsWindow = createServerFn({ method: "GET" }).inputValidator((data) => {
	return { window: data?.window === "48h" || data?.window === "7d" ? data.window : "24h" };
}).handler(getFirmsWindow_createServerFn_handler, async ({ data }) => pullFirms(data.window === "48h" || data.window === "7d" ? data.window : "24h"));
function classifyAirframe(type, category) {
	const t = (type || "").toUpperCase();
	if (/IL76|IL-76|A50|C17|C-17|C130|C-130|A400|AN12|AN-12|AN124|AN-124|Y20|Y-20|B763F|B77L|A33F|MD11/.test(t)) return "cargo";
	if (/KC135|K35R|IL78|A330MRTT|K35/.test(t)) return "tanker";
	if (/GLF|GLEX|CL60|C56X|FA7X|FA50|E55P|GL5T|GA6C|C700/.test(t)) return "bizjet";
	if (/A31|A32|A33|B73|B77|B78|E19|E29|AT7|DH8|C208|B350/.test(t)) return "pax";
	if (category?.startsWith("A7") || category === "C3") return "cargo";
	return "unknown";
}
function nearestAirfieldName(lat, lon) {
	const n = nearest(lat, lon, AIRFIELDS, 80);
	if (!n) return "none in 80 km (ADS-B gap possible)";
	return `${n.item.name} (~${n.km.toFixed(0)} km)`;
}
var MIL_CALL = /^(RCH|SPAR|SAM|AF1|ASCOT|BAF|GAF|DUKE|NAVY|REACH|EVAC|CNV|CFC|IAM|SUD|KAF|UAE)/i;
var MIL_TYPE = /C17|C130|C5|KC135|KC10|IL76|IL-76|AN12|AN124|A400|E3|P8|C30J|K35/;
function inferRoute(ac, lat, lon, track) {
	const near = nearestAirfieldName(lat, lon);
	const call = (ac.flight || "").trim();
	const inUaeBox = lat >= 22.45 && lat <= 26.55 && lon >= 51.35 && lon <= 56.65;
	const inAfricaBox = !inUaeBox && lat >= -1.2 && lat <= 32.8 && lon >= 9.5 && lon <= 51.5;
	const origin = inUaeBox ? near.startsWith("none") ? "UAE FIR" : near : /^A6-/i.test(ac.r || "") ? "UAE registry (position not in UAE FIR)" : "unreconstructed";
	let dest = "unreconstructed";
	if (inAfricaBox && (inUaeBox || origin !== "unreconstructed")) dest = near.startsWith("none") ? "African airspace" : near;
	if (inUaeBox && track != null && track >= 170 && track <= 310) dest = "west/southwest of UAE (Africa heading)";
	if (/\b(ETD|UAE|FDB)\b/i.test(call) && inAfricaBox) dest = near;
	return {
		origin,
		dest
	};
}
function toFlight(ac, source) {
	const lat = Number(ac.lat);
	const lon = Number(ac.lon);
	if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inAoi(lat, lon)) return null;
	const typeCode = (ac.t || "UNK").toUpperCase();
	const category = classifyAirframe(typeCode, ac.category);
	const callsign = (ac.flight || "").trim();
	const alt = typeof ac.alt_baro === "number" ? ac.alt_baro : Number(ac.alt_baro);
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const route = inferRoute(ac, lat, lon, ac.track);
	const squawk = String(ac.squawk || "");
	const emergency = squawk === "7700" || squawk === "7600" || squawk === "7500" || ac.emergency != null && ac.emergency !== "none";
	const military = emergency || category === "cargo" || category === "tanker" || MIL_TYPE.test(typeCode) || MIL_CALL.test(callsign);
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
		altFt: Number.isFinite(alt) ? alt : void 0,
		track: ac.track,
		gs: ac.gs,
		squawk: squawk || void 0,
		emergency,
		nearestAirfield: nearestAirfieldName(lat, lon),
		notes: `Live ${source}. ${emergency ? `Squawk ${squawk}. ` : ""}Category is airframe-typical, not a payload claim. ADS-B in this region is sparse — absence of a track is not absence of a flight.`,
		confidence: 1,
		relevant: true,
		live: true,
		military
	};
}
async function pullAdsbPoint(lat, lon, dist) {
	const urls = [`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`, `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`];
	for (const url of urls) try {
		const text = await fetchText(url, 1e4);
		const json = JSON.parse(text);
		if (Array.isArray(json.ac)) return json.ac;
	} catch (err) {
		console.warn("[adsb]", url, err);
	}
	return [];
}
async function pullOpenSky() {
	const url = `https://opensky-network.org/api/states/all?lamin=${AOI.south}&lomin=${AOI.west}&lamax=${AOI.north}&lomax=${AOI.east}`;
	try {
		const text = await fetchText(url, 1e4);
		return (JSON.parse(text).states ?? []).map((s) => ({
			hex: String(s[0] ?? ""),
			flight: String(s[1] ?? ""),
			r: "",
			t: "",
			lon: Number(s[5]),
			lat: Number(s[6]),
			alt_baro: typeof s[7] === "number" ? Math.round(Number(s[7]) * 3.28084) : void 0,
			track: typeof s[10] === "number" ? Number(s[10]) : void 0,
			gs: typeof s[9] === "number" ? Math.round(Number(s[9]) * 1.94384) : void 0
		}));
	} catch (err) {
		console.warn("[opensky]", err);
		return [];
	}
}
async function pullFlights() {
	const points = [
		[
			25.25,
			55.36,
			220
		],
		[
			30.05,
			31.35,
			180
		],
		[
			21.54,
			39.17,
			180
		],
		[
			8.98,
			38.8,
			160
		]
	];
	const raw = [];
	let source = "adsb.lol / adsb.fi";
	for (const [la, lo, d] of points) {
		const batch = await pullAdsbPoint(la, lo, d);
		raw.push(...batch);
	}
	if (raw.length === 0) {
		const sky = await pullOpenSky();
		raw.push(...sky);
		source = "OpenSky Network (anonymous)";
	}
	const seen = /* @__PURE__ */ new Set();
	const rows = [];
	for (const ac of raw) {
		const fl = toFlight(ac, source);
		if (!fl || seen.has(fl.hex)) continue;
		seen.add(fl.hex);
		rows.push(fl);
	}
	if (rows.length === 0) return {
		rows: FLIGHTS.map((f) => ({
			...f,
			live: false
		})),
		meta: meta("Archive sample (live ADS-B empty)", FLIGHTS.length, "No live state vectors in the AOI. ADS-B coverage in Sudan, Darfur, and the desert corridors is sparse. Showing the curated archive so the review workflow still runs. Absence of a track is not absence of a flight.", "gap")
	};
	return {
		rows,
		meta: meta(source, rows.length, "Live positions are ADS-B only (UAE, Egypt, Jeddah, Addis). Khartoum and Darfur are usually a coverage gap. Category is typical for the airframe, never a cargo claim.", rows.length < 3 ? "gap" : "ok")
	};
}
async function pullReports() {
	const url = "https://api.reliefweb.int/v1/reports?appname=ahsr-sudan&profile=lite&limit=8&sort[]=date:desc&filter[field]=primary_country&filter[value]=sdn";
	try {
		const text = await fetchText(url, 1e4);
		const rows = (JSON.parse(text).data ?? []).map((d) => ({
			id: `rw-${d.id}`,
			title: d.fields?.title || "ReliefWeb report",
			publisher: d.fields?.source?.[0]?.name || "ReliefWeb",
			date: (d.fields?.date?.created || "").slice(0, 10),
			url: d.fields?.url || "https://reliefweb.int/",
			reliability: "high",
			note: "Humanitarian reporting. Corroboration, not ground truth."
		}));
		return {
			rows,
			meta: meta("ReliefWeb public API", rows.length, "Sudan-tagged humanitarian reports. Corroboration layer only.")
		};
	} catch (err) {
		console.warn("[reliefweb]", err);
		return {
			rows: [],
			meta: meta("ReliefWeb public API", 0, "Unreachable this cycle.", "error")
		};
	}
}
async function pullHormuzAis() {
	const text = await fetchText("https://hormuz.data-tracking.net/api/ships", 15e3);
	const json = JSON.parse(text);
	if (!Array.isArray(json)) return [];
	const rows = [];
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
			updatedAt: s.timestamp
		});
	}
	return rows;
}
async function pullVessels() {
	try {
		const ais = await pullHormuzAis();
		if (ais.length) return {
			rows: ais,
			meta: meta("Strait of Hormuz Ship Monitor", ais.length, "Live AIS in the Persian Gulf, Strait of Hormuz, and Gulf of Oman. Red Sea corridor markers on the map are still schematic — there is no keyless live AIS feed for that lane. Not a cargo claim.", "ok")
		};
	} catch (err) {
		console.warn("[ais]", err);
	}
	const rows = allVessels();
	return {
		rows,
		meta: meta("Port nodes + documented Red Sea / Aden lane animation", rows.length, "Live Gulf AIS was unreachable this cycle. Port nodes are real harbours. Moving markers follow published shipping lanes — they are NOT live AIS contacts.", "gap")
	};
}
var getLiveBundle_createServerFn_handler = createServerRpc({
	id: "01ac50a6b210d7c55e9b45dea72e796cba145e186591bdd88c0094df5a076b33",
	name: "getLiveBundle",
	filename: "src/lib/live.ts"
}, (opts) => getLiveBundle.__executeServer(opts));
var getLiveBundle = createServerFn({ method: "GET" }).handler(getLiveBundle_createServerFn_handler, async () => {
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
			pullGevWorld()
		]);
		const ticker = await pullTicker(news.items.map((n) => ({
			source: n.source,
			title: n.title,
			url: n.url
		})));
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
			launches: gev.launches
		};
	});
});
var getGevWorld_createServerFn_handler = createServerRpc({
	id: "70bea842e6aa616cde8256913cb436a07a13477bd14e99474ef0dc34e08c4456",
	name: "getGevWorld",
	filename: "src/lib/live.ts"
}, (opts) => getGevWorld.__executeServer(opts));
var getGevWorld = createServerFn({ method: "GET" }).handler(getGevWorld_createServerFn_handler, async () => {
	return cached("gev-world", 12e4, () => pullGevWorld());
});
var getTraffic_createServerFn_handler = createServerRpc({
	id: "534092db8484cb1d618e39dace1c97f0e51038567adcb1ce65879546b6fe22bd",
	name: "getTraffic",
	filename: "src/lib/live.ts"
}, (opts) => getTraffic.__executeServer(opts));
var getTraffic = createServerFn({ method: "GET" }).handler(getTraffic_createServerFn_handler, async () => {
	return cached("traffic", 45e3, async () => {
		const [flights, vessels] = await Promise.all([pullFlights(), pullVessels()]);
		return {
			flights: flights.rows,
			flightsMeta: flights.meta,
			vessels: vessels.rows,
			vesselsMeta: vessels.meta
		};
	});
});
//#endregion
export { getFirmsWindow_createServerFn_handler, getGevWorld_createServerFn_handler, getLiveBundle_createServerFn_handler, getTraffic_createServerFn_handler };
