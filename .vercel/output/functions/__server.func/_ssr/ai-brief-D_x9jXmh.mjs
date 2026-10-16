import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { r as DOCTRINE_SYSTEM } from "./doctrine-BoQ_KKoM.mjs";
import { s as geocodePlace } from "./osint-wXO3XaAY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-brief-D_x9jXmh.js
var MODEL = "grok-4.5";
var TTL_MS = 18e5;
var PROMPT = `Using only public reporting from the LAST 48 HOURS on Sudan and adjacent theaters (Chad, Libya, Egypt, Ethiopia, Somalia, UAE, Eritrea, Red Sea), return ONLY JSON (no fences):

{
  "commander": string,  // 2–4 sentences: WHAT CHANGED, WHO BENEFITED, WHY IT MATTERS. Observation vs assessment. No targeting.
  "meaning": string,    // one paragraph: campaign/operational effect, not a recap of explosions
  "items": [
    {
      "headline": string,
      "date": string | null,
      "category": string,
      "location": string | null,
      "confidence": string,
      "summary": string
    }
  ]
}

category one of: strike, buildup, air, control, supply, displacement, diplomacy, atrocity
confidence one of: reported, corroborated, single-source
Up to 8 items, ordered by significance. Fewer is better than padding.
summary <= 240 chars. Prefer named outlets. Separate claimed from corroborated.`;
var cache = null;
var inflight = null;
function parseItems(raw) {
	if (!Array.isArray(raw)) return [];
	const cats = /* @__PURE__ */ new Set([
		"strike",
		"buildup",
		"air",
		"control",
		"supply",
		"displacement",
		"diplomacy",
		"atrocity"
	]);
	const confs = /* @__PURE__ */ new Set([
		"reported",
		"corroborated",
		"single-source"
	]);
	const out = [];
	for (let i = 0; i < raw.length && out.length < 8; i++) {
		const o = raw[i];
		if (!o || typeof o.headline !== "string") continue;
		const headline = o.headline.slice(0, 200);
		const location = typeof o.location === "string" && o.location.trim() ? o.location.trim().slice(0, 60) : null;
		const geo = geocodePlace(location, headline);
		const confidence = typeof o.confidence === "string" && confs.has(o.confidence) ? o.confidence : "reported";
		out.push({
			id: `brief:${i}:${headline.slice(0, 24)}`,
			headline,
			date: typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(o.date) ? o.date.slice(0, 10) : null,
			category: typeof o.category === "string" && cats.has(o.category) ? o.category : "reported",
			location,
			confidence,
			summary: typeof o.summary === "string" ? o.summary.slice(0, 280) : "",
			lat: geo?.lat ?? null,
			lon: geo?.lon ?? null,
			geoName: geo?.name ?? null,
			geoPrecise: geo?.precise ?? false
		});
	}
	return out;
}
function parsePacket(text) {
	let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
	const objStart = t.indexOf("{");
	const objEnd = t.lastIndexOf("}");
	const arrStart = t.indexOf("[");
	const arrEnd = t.lastIndexOf("]");
	if (objStart !== -1 && objEnd > objStart && (arrStart === -1 || objStart < arrStart)) try {
		const o = JSON.parse(t.slice(objStart, objEnd + 1));
		return {
			items: parseItems(o.items),
			commander: typeof o.commander === "string" ? o.commander.slice(0, 900) : void 0,
			meaning: typeof o.meaning === "string" ? o.meaning.slice(0, 1200) : void 0
		};
	} catch {}
	if (arrStart !== -1 && arrEnd > arrStart) try {
		return { items: parseItems(JSON.parse(t.slice(arrStart, arrEnd + 1))) };
	} catch {
		return { items: [] };
	}
	return { items: [] };
}
async function buildFresh() {
	const now = Date.now();
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		model: MODEL,
		generatedAt: now,
		items: [],
		citations: [],
		error: "AI brief is unavailable in this environment. The local six-hour SITREP still compiled from the sweep."
	};
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: MODEL,
				temperature: .2,
				max_tokens: 2200,
				messages: [{
					role: "system",
					content: DOCTRINE_SYSTEM
				}, {
					role: "user",
					content: PROMPT
				}]
			})
		});
		if (!res.ok) return {
			ok: false,
			model: MODEL,
			generatedAt: now,
			items: [],
			citations: [],
			error: `xAI API error ${res.status}`
		};
		const parsed = parsePacket((await res.json()).choices?.[0]?.message?.content ?? "");
		return {
			ok: parsed.items.length > 0 || Boolean(parsed.commander),
			model: MODEL,
			generatedAt: now,
			items: parsed.items,
			citations: [],
			commander: parsed.commander,
			meaning: parsed.meaning,
			error: parsed.items.length === 0 && !parsed.commander ? "No parseable items this cycle." : void 0
		};
	} catch (err) {
		return {
			ok: false,
			model: MODEL,
			generatedAt: now,
			items: [],
			citations: [],
			error: err instanceof Error ? err.message : "Brief failed"
		};
	}
}
var generateAiBrief_createServerFn_handler = createServerRpc({
	id: "1f5d33602816122be63cf7759c11db5747202a5498921cc12b289e8c314b42dd",
	name: "generateAiBrief",
	filename: "src/lib/ai-brief.ts"
}, (opts) => generateAiBrief.__executeServer(opts));
var generateAiBrief = createServerFn({ method: "POST" }).handler(generateAiBrief_createServerFn_handler, async () => {
	const now = Date.now();
	if (cache && cache.value.ok && now - cache.at < TTL_MS) return cache.value;
	if (!inflight) inflight = buildFresh().then((value) => {
		if (value.ok) cache = {
			at: Date.now(),
			value
		};
		return value;
	}).finally(() => {
		inflight = null;
	});
	return inflight;
});
//#endregion
export { generateAiBrief_createServerFn_handler };
