import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { s as geocodePlace } from "./osint-wXO3XaAY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/news-DfaqSYOi.js
var QUERIES = ["Sudan when:7d", "(Khartoum OR Darfur OR Nyala OR Fasher OR Obeid OR Kordofan OR (Port Sudan) OR Omdurman OR Hemedti OR Burhan) when:7d"];
var UA = "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";
var TTL_MS = 3e5;
var cache = null;
var inflight = null;
function decodeEntities(s) {
	return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"").replace(/&#0?39;/g, "'").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, "\"").replace(/&#8221;/g, "\"").replace(/&nbsp;/g, " ");
}
function tag(block, name) {
	const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
	return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : null;
}
function meta(count, note, status = "ok") {
	return {
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
		recordCount: count,
		status: count === 0 && status === "ok" ? "empty" : status,
		source: "Google News RSS",
		note
	};
}
function geocode(items) {
	const map = /* @__PURE__ */ new Map();
	for (const item of items) {
		const g = geocodePlace(item.title);
		if (!g) continue;
		let p = map.get(g.name);
		if (!p) {
			p = {
				id: `news-${g.name}`,
				lat: g.lat,
				lon: g.lon,
				name: g.name,
				count: 0,
				articles: []
			};
			map.set(g.name, p);
		}
		p.count += 1;
		if (p.articles.length < 8) p.articles.push({
			title: item.title,
			url: item.url
		});
	}
	return [...map.values()].sort((a, b) => b.count - a.count);
}
async function fetchQuery(q) {
	const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-US&gl=US&ceid=US:en";
	const res = await fetch(url, {
		headers: {
			"User-Agent": UA,
			Accept: "application/rss+xml, application/xml, text/xml"
		},
		signal: AbortSignal.timeout(12e3)
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const blocks = (await res.text()).match(/<item>[\s\S]*?<\/item>/gi) ?? [];
	const items = [];
	for (const b of blocks) {
		let title = tag(b, "title");
		if (!title) continue;
		const urlItem = tag(b, "link") ?? "#";
		if (urlItem === "#") continue;
		const source = tag(b, "source") ?? "Google News";
		title = title.replace(new RegExp(`\\s*[-–]\\s*${source}\\s*$`), "").trim();
		const date = tag(b, "pubDate");
		const t = date ? Date.parse(date) : NaN;
		items.push({
			id: `gn:${urlItem}`,
			title,
			source,
			url: urlItem,
			date: Number.isNaN(t) ? null : new Date(t).toISOString()
		});
	}
	return items;
}
async function buildFresh() {
	try {
		const batches = await Promise.all(QUERIES.map((q) => fetchQuery(q).catch(() => [])));
		const seen = /* @__PURE__ */ new Set();
		const items = [];
		for (const batch of batches) for (const item of batch) {
			if (seen.has(item.url)) continue;
			seen.add(item.url);
			items.push(item);
		}
		items.sort((a, b) => a.date && b.date ? a.date < b.date ? 1 : -1 : a.date ? -1 : 1);
		const sliced = items.slice(0, 60);
		const points = geocode(sliced);
		return {
			items: sliced,
			points,
			meta: meta(sliced.length, `Sudan wire, last 7 days — not conflict-filtered. Headline geolocation placed ${points.length} clusters. Pins are named-place centroids, not incident coordinates.`)
		};
	} catch (err) {
		return {
			items: [],
			points: [],
			meta: meta(0, err instanceof Error ? err.message : "Google News unreachable", "error")
		};
	}
}
async function pullNews() {
	if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
	if (!inflight) inflight = buildFresh().then((value) => {
		cache = {
			at: Date.now(),
			value
		};
		return value;
	}).finally(() => {
		inflight = null;
	});
	return inflight;
}
var getNewsFeed_createServerFn_handler = createServerRpc({
	id: "641b362bce8b1453776fc05806c0f955d716bb25c197fa42b79b4b00962af98e",
	name: "getNewsFeed",
	filename: "src/lib/news.ts"
}, (opts) => getNewsFeed.__executeServer(opts));
var getNewsFeed = createServerFn({ method: "GET" }).handler(getNewsFeed_createServerFn_handler, async () => {
	return pullNews();
});
//#endregion
export { getNewsFeed_createServerFn_handler };
