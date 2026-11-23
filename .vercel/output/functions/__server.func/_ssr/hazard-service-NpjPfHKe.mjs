import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { t as createRequestCache } from "./request-cache-DFna8z3y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hazard-service-NpjPfHKe.js
var validPoint = (lon, lat) => typeof lon === "number" && typeof lat === "number" && Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
function safeSource(value, fallback) {
	try {
		const u = new URL(String(value));
		return u.protocol === "https:" ? u.href : fallback;
	} catch {
		return fallback;
	}
}
function normalizeEonet(data) {
	if (!Array.isArray(data.events)) throw new Error("Invalid EONET response");
	return data.events.flatMap((event) => {
		const g = (event.geometry ?? []).filter((g) => g.type === "Point" && validPoint(g.coordinates?.[0], g.coordinates?.[1]) && Number.isFinite(Date.parse(g.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0], category = event.categories?.[0]?.id;
		if (!g || !event.id || ["wildfires", "earthquakes"].includes(category)) return [];
		return [{
			id: `eonet-${event.id}`,
			title: String(event.title),
			category: event.categories?.[0]?.title ?? "Natural event",
			lon: g.coordinates[0],
			lat: g.coordinates[1],
			at: new Date(g.date).toISOString(),
			url: safeSource(event.sources?.[0]?.url, "https://eonet.gsfc.nasa.gov"),
			provider: "NASA EONET",
			severity: "Not supplied"
		}];
	});
}
function normalizeEarthquakes(data) {
	if (!Array.isArray(data.features)) throw new Error("Invalid USGS response");
	return data.features.flatMap((f) => {
		const [lon, lat] = f.geometry?.coordinates ?? [], p = f.properties ?? {};
		if (!f.id || !validPoint(lon, lat) || !Number.isFinite(p.time) || !Number.isFinite(p.mag)) return [];
		return [{
			id: `usgs-${f.id}`,
			title: `M${p.mag.toFixed(1)} · ${p.place ?? "Earthquake"}`,
			category: "Earthquake",
			lon,
			lat,
			at: new Date(p.time).toISOString(),
			url: safeSource(p.url, "https://earthquake.usgs.gov"),
			provider: "USGS",
			severity: p.alert ?? "Not supplied"
		}];
	});
}
function normalizeGdacs(xml) {
	if (!/<rss[\s>]/i.test(xml)) throw new Error("Invalid GDACS response");
	const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
	return [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)].flatMap((m) => {
		const tag = (name) => decode(m[1].match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
		const category = {
			FL: "Flood",
			TC: "Tropical cyclone",
			DR: "Drought"
		}[tag("gdacs:eventtype")];
		const lon = Number(tag("geo:long")), lat = Number(tag("geo:lat")), at = Date.parse(tag("pubDate"));
		if (!category || !tag("geo:long") || !tag("geo:lat") || !validPoint(lon, lat) || !Number.isFinite(at)) return [];
		return [{
			id: `gdacs-${tag("gdacs:eventtype")}-${tag("gdacs:eventid")}-${tag("gdacs:episodeid")}`,
			title: tag("title"),
			category,
			lon,
			lat,
			at: new Date(at).toISOString(),
			url: safeSource(tag("link"), "https://www.gdacs.org"),
			provider: "GDACS",
			severity: tag("gdacs:alertlevel") || "Not supplied"
		}];
	});
}
function mergeHazards(rows) {
	return [...new Map(rows.map((r) => [r.id, r])).values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
var cached = createRequestCache(4);
async function fetchHazards() {
	const providers = [
		{
			name: "NASA EONET",
			url: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100",
			parse: async (r) => normalizeEonet(await r.json())
		},
		{
			name: "USGS",
			url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
			parse: async (r) => normalizeEarthquakes(await r.json())
		},
		{
			name: "GDACS",
			url: "https://www.gdacs.org/xml/rss.xml",
			parse: async (r) => normalizeGdacs(await r.text())
		}
	];
	const results = await Promise.allSettled(providers.map((p) => cached(p.name, 3e5, async () => {
		const r = await fetch(p.url, { signal: AbortSignal.timeout(15e3) });
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		return p.parse(r);
	})));
	return {
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
		events: mergeHazards(results.flatMap((r) => r.status === "fulfilled" ? r.value : [])),
		sources: results.map((r, i) => ({
			name: providers[i].name,
			count: r.status === "fulfilled" ? r.value.length : 0,
			status: r.status === "fulfilled" ? "ok" : "error",
			note: r.status === "fulfilled" ? "Published observations; event dates retained." : String(r.reason?.message ?? "Provider unavailable")
		}))
	};
}
var getHazards_createServerFn_handler = createServerRpc({
	id: "eaccd0a304cf99205c3b88484fca90d76808d46605197be7e01296aa47138b8d",
	name: "getHazards",
	filename: "src/lib/hazard-service.ts"
}, (opts) => getHazards.__executeServer(opts));
var getHazards = createServerFn({ method: "GET" }).handler(getHazards_createServerFn_handler, fetchHazards);
//#endregion
export { getHazards_createServerFn_handler };
