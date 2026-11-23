import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { s as geocodePlace } from "./osint-wXO3XaAY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/news-JOTTsYVq.js
var UA = "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";
var TTL_MS = 3e5;
/** Free RSS / search wires — no API keys. */
var SOURCES = [
	{
		id: "gn-sudan",
		label: "Google News",
		url: "https://news.google.com/rss/search?q=" + encodeURIComponent("Sudan when:7d") + "&hl=en-US&gl=US&ceid=US:en"
	},
	{
		id: "gn-darfur",
		label: "Google News",
		url: "https://news.google.com/rss/search?q=" + encodeURIComponent("(Khartoum OR Darfur OR Nyala OR Fasher OR Obeid OR Kordofan OR (Port Sudan) OR Omdurman OR Hemedti OR Burhan) when:7d") + "&hl=en-US&gl=US&ceid=US:en"
	},
	{
		id: "guardian",
		label: "The Guardian",
		url: "https://www.theguardian.com/world/sudan/rss"
	},
	{
		id: "bbc-africa",
		label: "BBC Africa",
		url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
		sudanOnly: true
	},
	{
		id: "aje",
		label: "Al Jazeera",
		url: "https://www.aljazeera.com/xml/rss/all.xml",
		sudanOnly: true
	},
	{
		id: "nyt-africa",
		label: "NYT Africa",
		url: "https://rss.nytimes.com/services/xml/rss/nyt/Africa.xml",
		sudanOnly: true
	}
];
var cache = null;
var inflight = null;
function decodeEntities(s) {
	return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, "\"").replace(/&#8221;/g, "\"").replace(/&nbsp;/g, " ");
}
function tag(block, name) {
	const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
	return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : null;
}
function meta(count, note, status = "ok", source = "Public RSS") {
	return {
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
		recordCount: count,
		status: count === 0 && status === "ok" ? "empty" : status,
		source,
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
function isSudanRelated(title) {
	return /sudan|khartoum|darfur|fasher|nyala|geneina|kordofan|obeid|omdurman|hemedti|burhan|rsf|saf |port sudan|wad madani|blue nile|white nile/i.test(title);
}
async function fetchRss(src) {
	const res = await fetch(src.url, {
		headers: {
			"User-Agent": UA,
			Accept: "application/rss+xml, application/xml, text/xml, */*"
		},
		signal: AbortSignal.timeout(14e3)
	});
	if (!res.ok) throw new Error(`${src.id} HTTP ${res.status}`);
	const blocks = (await res.text()).match(/<item>[\s\S]*?<\/item>/gi) ?? [];
	const items = [];
	for (const b of blocks) {
		let title = tag(b, "title");
		if (!title) continue;
		if (src.sudanOnly && !isSudanRelated(title)) continue;
		const link = tag(b, "link") || b.match(/<link[^>]+href="([^"]+)"/i)?.[1] || b.match(/url="(https?:\/\/[^"]+)"/i)?.[1] || "#";
		if (link === "#") continue;
		const sourceName = tag(b, "source") || src.label;
		title = title.replace(new RegExp(`\\s*[-–]\\s*${sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`), "").trim();
		const date = tag(b, "pubDate") || tag(b, "dc:date");
		const t = date ? Date.parse(date) : NaN;
		items.push({
			id: `${src.id}:${link}`,
			title,
			source: sourceName,
			url: link,
			date: Number.isNaN(t) ? null : new Date(t).toISOString()
		});
	}
	return items;
}
async function buildFresh() {
	const results = await Promise.all(SOURCES.map(async (src) => {
		try {
			return {
				src: src.id,
				items: await fetchRss(src)
			};
		} catch (err) {
			console.warn("[news]", src.id, err);
			return {
				src: src.id,
				items: []
			};
		}
	}));
	const seen = /* @__PURE__ */ new Set();
	const items = [];
	for (const batch of results) for (const item of batch.items) {
		const key = item.url.replace(/\?.*$/, "");
		if (seen.has(key) || seen.has(item.title)) continue;
		seen.add(key);
		seen.add(item.title);
		items.push(item);
	}
	items.sort((a, b) => a.date && b.date ? a.date < b.date ? 1 : -1 : a.date ? -1 : 1);
	const sliced = items.slice(0, 80);
	const points = geocode(sliced);
	const alive = results.filter((r) => r.items.length > 0).map((r) => r.src);
	if (sliced.length === 0) return {
		items: [],
		points: [],
		meta: meta(0, `All free RSS sources empty or unreachable (${SOURCES.map((s) => s.id).join(", ")}).`, "error")
	};
	return {
		items: sliced,
		points,
		meta: meta(sliced.length, `Free wires: ${alive.join(", ") || "none"}. Last 7 days, not conflict-filtered. ${points.length} named-place clusters. Pins are centroids, not incident coordinates.`, "ok", alive.length ? `RSS · ${alive.join(" + ")}` : "Public RSS")
	};
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
