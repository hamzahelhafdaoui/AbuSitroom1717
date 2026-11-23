import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { r as DOCTRINE_SYSTEM } from "./doctrine-BoQ_KKoM.mjs";
import { s as geocodePlace } from "./osint-wXO3XaAY.mjs";
import { n as pullNews } from "./news-BAm3bgtv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-brief-DpInGqF6.js
var UA = "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";
async function openAiCompat(opts) {
	try {
		const res = await fetch(opts.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${opts.apiKey}`,
				"User-Agent": UA,
				...opts.provider === "openrouter" ? {
					"HTTP-Referer": "https://grok.com",
					"X-Title": "AHSR Sudan Wing"
				} : {}
			},
			body: JSON.stringify({
				model: opts.model,
				temperature: .2,
				max_tokens: opts.maxTokens,
				messages: [{
					role: "system",
					content: opts.system
				}, {
					role: "user",
					content: opts.user
				}]
			}),
			signal: AbortSignal.timeout(55e3)
		});
		const raw = await res.text();
		if (!res.ok) {
			let detail = `HTTP ${res.status}`;
			try {
				const j = JSON.parse(raw);
				const msg = typeof j.error === "string" ? j.error : j.error?.message;
				if (msg) detail = msg;
			} catch {}
			return {
				ok: false,
				text: "",
				provider: opts.provider,
				model: opts.model,
				error: detail
			};
		}
		const text = JSON.parse(raw).choices?.[0]?.message?.content?.trim() ?? "";
		if (!text) return {
			ok: false,
			text: "",
			provider: opts.provider,
			model: opts.model,
			error: "Empty model reply"
		};
		return {
			ok: true,
			text,
			provider: opts.provider,
			model: opts.model
		};
	} catch (err) {
		return {
			ok: false,
			text: "",
			provider: opts.provider,
			model: opts.model,
			error: err instanceof Error ? err.message : "Provider failed"
		};
	}
}
async function pollinationsChat(system, user) {
	const model = "openai";
	try {
		const res = await fetch("https://text.pollinations.ai/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": UA
			},
			body: JSON.stringify({
				model,
				messages: [{
					role: "system",
					content: system
				}, {
					role: "user",
					content: user
				}]
			}),
			signal: AbortSignal.timeout(55e3)
		});
		const text = (await res.text()).trim();
		if (!res.ok || !text) return {
			ok: false,
			text: "",
			provider: "pollinations",
			model,
			error: res.ok ? "Empty Pollinations reply" : `Pollinations HTTP ${res.status}`
		};
		if (/quota has been exceeded|rate limit|too many requests/i.test(text) && text.length < 240) return {
			ok: false,
			text: "",
			provider: "pollinations",
			model,
			error: text
		};
		return {
			ok: true,
			text,
			provider: "pollinations",
			model
		};
	} catch (err) {
		return {
			ok: false,
			text: "",
			provider: "pollinations",
			model,
			error: err instanceof Error ? err.message : "Pollinations failed"
		};
	}
}
/**
* Try providers in cost/quality order. Returns first usable completion.
*/
async function completeBriefLlm(system, user) {
	const attempts = [];
	const xai = process.env.XAI_API_KEY;
	if (xai) attempts.push(() => openAiCompat({
		provider: "xai",
		url: "https://api.x.ai/v1/chat/completions",
		apiKey: xai,
		model: "grok-4.5",
		system,
		user,
		maxTokens: 2200
	}));
	const groq = process.env.GROQ_API_KEY;
	if (groq) attempts.push(() => openAiCompat({
		provider: "groq",
		url: "https://api.groq.com/openai/v1/chat/completions",
		apiKey: groq,
		model: "llama-3.3-70b-versatile",
		system,
		user,
		maxTokens: 2200
	}));
	const gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
	if (gemini) attempts.push(async () => {
		try {
			const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(gemini)}`;
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"User-Agent": UA
				},
				body: JSON.stringify({
					contents: [{
						role: "user",
						parts: [{ text: `${system}\n\n${user}` }]
					}],
					generationConfig: {
						temperature: .2,
						maxOutputTokens: 2200
					}
				}),
				signal: AbortSignal.timeout(55e3)
			});
			const raw = await res.text();
			if (!res.ok) {
				let detail = `HTTP ${res.status}`;
				try {
					const j = JSON.parse(raw);
					if (j.error?.message) detail = j.error.message;
				} catch {}
				return {
					ok: false,
					text: "",
					provider: "gemini",
					model: "gemini-2.0-flash",
					error: detail
				};
			}
			const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
			if (!text) return {
				ok: false,
				text: "",
				provider: "gemini",
				model: "gemini-2.0-flash",
				error: "Empty Gemini reply"
			};
			return {
				ok: true,
				text,
				provider: "gemini",
				model: "gemini-2.0-flash"
			};
		} catch (err) {
			return {
				ok: false,
				text: "",
				provider: "gemini",
				model: "gemini-2.0-flash",
				error: err instanceof Error ? err.message : "Gemini failed"
			};
		}
	});
	const openrouter = process.env.OPENROUTER_API_KEY;
	if (openrouter) attempts.push(() => openAiCompat({
		provider: "openrouter",
		url: "https://openrouter.ai/api/v1/chat/completions",
		apiKey: openrouter,
		model: "openrouter/auto",
		system,
		user,
		maxTokens: 2200
	}));
	const openai = process.env.OPENAI_API_KEY;
	if (openai) attempts.push(() => openAiCompat({
		provider: "openai",
		url: "https://api.openai.com/v1/chat/completions",
		apiKey: openai,
		model: "gpt-4o-mini",
		system,
		user,
		maxTokens: 2200
	}));
	attempts.push(() => pollinationsChat(system, user));
	const errors = [];
	for (const run of attempts) {
		const r = await run();
		if (r.ok) return r;
		errors.push(`${r.provider}: ${r.error ?? "failed"}`);
	}
	return {
		ok: false,
		text: "",
		provider: "none",
		model: "none",
		error: errors.length ? errors.join(" · ") : "No LLM provider available"
	};
}
var MODEL_FALLBACK = "news-compiled";
var TTL_MS = 12e5;
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
summary <= 240 chars. Prefer named outlets. Separate claimed from corroborated.
If a provider quota is exhausted, do not invent events — return fewer items.`;
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
function categorizeHeadline(title) {
	const t = title.toLowerCase();
	if (/displac|refugee|flee|aid|famine|hunger|hospital|clinic/.test(t)) return "displacement";
	if (/airstrike|strike|bomb|shell|drone|artillery/.test(t)) return "strike";
	if (/airport|airlift|aircraft|flight|il-76|cargo plane/.test(t)) return "air";
	if (/convoy|supply|fuel|smuggl|border|logistics/.test(t)) return "supply";
	if (/seize|control|capture|advance|withdraw|front/.test(t)) return "control";
	if (/troop|mobilize|build.?up|reinforce|militia/.test(t)) return "buildup";
	if (/kill|massacre|atrocity|rape|ethnic/.test(t)) return "atrocity";
	if (/talks|diplomat|ceasefire|sanction|un |au /.test(t)) return "diplomacy";
	return "diplomacy";
}
/** Always-on brief from free news wires — no LLM quota required. */
function compileFromNews(news) {
	const now = Date.now();
	const items = [];
	for (let i = 0; i < news.length && items.length < 8; i++) {
		const n = news[i];
		const geo = geocodePlace(n.title);
		items.push({
			id: `newsbrief:${n.id}`,
			headline: n.title.slice(0, 200),
			date: n.date ? n.date.slice(0, 10) : null,
			category: categorizeHeadline(n.title),
			location: geo?.name ?? null,
			confidence: "reported",
			summary: `Wire item via ${n.source}. Single-source public headline — not an AHSR assessment. Open the link for the outlet’s full piece.`,
			lat: geo?.lat ?? null,
			lon: geo?.lon ?? null,
			geoName: geo?.name ?? null,
			geoPrecise: geo?.precise ?? false
		});
	}
	const top = items.slice(0, 3).map((i) => i.headline).join(" · ");
	return {
		ok: items.length > 0,
		model: MODEL_FALLBACK,
		generatedAt: now,
		items,
		citations: [],
		commander: items.length > 0 ? `Public wire digest (no LLM). ${items.length} recent Sudan-theater headlines. Top leads: ${top.slice(0, 320)}. Treat as reported, not corroborated.` : void 0,
		meaning: "Compiled from free Google News / Guardian / BBC / Al Jazeera / NYT Africa RSS. No generative model was used — quota exhaustion on xAI/Grok does not block this path. Pins are named-place centroids.",
		error: items.length === 0 ? "No free news items available this cycle." : void 0
	};
}
async function buildFresh() {
	const now = Date.now();
	const news = (await pullNews().catch(() => null))?.items ?? [];
	const llm = await completeBriefLlm(DOCTRINE_SYSTEM, PROMPT);
	if (llm.ok) {
		const parsed = parsePacket(llm.text);
		if (parsed.items.length > 0 || parsed.commander) return {
			ok: true,
			model: `${llm.provider}/${llm.model}`,
			generatedAt: now,
			items: parsed.items,
			citations: [],
			commander: parsed.commander,
			meaning: parsed.meaning
		};
	}
	const wire = compileFromNews(news);
	if (wire.ok) return {
		...wire,
		error: llm.error ? `LLM cascade skipped (${llm.error}). Showing free news-compiled leads instead.` : wire.error
	};
	return {
		ok: false,
		model: "none",
		generatedAt: now,
		items: [],
		citations: [],
		error: llm.error ? `All AI providers failed (${llm.error}). Free news also empty.` : "AI brief unavailable — no LLM key and no news this cycle. The local six-hour SITREP still compiles from the sweep."
	};
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
