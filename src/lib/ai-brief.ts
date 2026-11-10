import { createServerFn } from "@tanstack/react-start";
import { DOCTRINE_SYSTEM } from "@/lib/doctrine";
import { completeBriefLlm } from "@/lib/llm";
import { pullNews } from "@/lib/news";
import { geocodePlace } from "@/lib/osint";
import type { AiBrief, BriefItem, NewsItem } from "@/lib/types";

const MODEL_FALLBACK = "news-compiled";
const TTL_MS = 20 * 60_000;

const PROMPT = `Using only public reporting from the LAST 48 HOURS on Sudan and adjacent theaters (Chad, Libya, Egypt, Ethiopia, Somalia, UAE, Eritrea, Red Sea), return ONLY JSON (no fences):

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

let cache: { at: number; value: AiBrief } | null = null;
let inflight: Promise<AiBrief> | null = null;

function parseItems(raw: unknown): BriefItem[] {
  if (!Array.isArray(raw)) return [];
  const cats = new Set(["strike", "buildup", "air", "control", "supply", "displacement", "diplomacy", "atrocity"]);
  const confs = new Set(["reported", "corroborated", "single-source"]);
  const out: BriefItem[] = [];
  for (let i = 0; i < raw.length && out.length < 8; i++) {
    const o = raw[i] as Record<string, unknown>;
    if (!o || typeof o.headline !== "string") continue;
    const headline = o.headline.slice(0, 200);
    const location = typeof o.location === "string" && o.location.trim() ? o.location.trim().slice(0, 60) : null;
    const geo = geocodePlace(location, headline);
    const confidence = (
      typeof o.confidence === "string" && confs.has(o.confidence) ? o.confidence : "reported"
    ) as BriefItem["confidence"];
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
      geoPrecise: geo?.precise ?? false,
    });
  }
  return out;
}

function parsePacket(text: string): { items: BriefItem[]; commander?: string; meaning?: string } {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const objStart = t.indexOf("{");
  const objEnd = t.lastIndexOf("}");
  const arrStart = t.indexOf("[");
  const arrEnd = t.lastIndexOf("]");
  if (objStart !== -1 && objEnd > objStart && (arrStart === -1 || objStart < arrStart)) {
    try {
      const o = JSON.parse(t.slice(objStart, objEnd + 1)) as Record<string, unknown>;
      return {
        items: parseItems(o.items),
        commander: typeof o.commander === "string" ? o.commander.slice(0, 900) : undefined,
        meaning: typeof o.meaning === "string" ? o.meaning.slice(0, 1200) : undefined,
      };
    } catch {
      /* fall through */
    }
  }
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return { items: parseItems(JSON.parse(t.slice(arrStart, arrEnd + 1))) };
    } catch {
      return { items: [] };
    }
  }
  return { items: [] };
}

function categorizeHeadline(title: string): BriefItem["category"] {
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
function compileFromNews(news: NewsItem[]): AiBrief {
  const now = Date.now();
  const items: BriefItem[] = [];
  for (let i = 0; i < news.length && items.length < 8; i++) {
    const n = news[i]!;
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
      geoPrecise: geo?.precise ?? false,
    });
  }
  const top = items.slice(0, 3).map((i) => i.headline).join(" · ");
  return {
    ok: items.length > 0,
    model: MODEL_FALLBACK,
    generatedAt: now,
    items,
    citations: [],
    commander:
      items.length > 0
        ? `Public wire digest (no LLM). ${items.length} recent Sudan-theater headlines. Top leads: ${top.slice(0, 320)}. Treat as reported, not corroborated.`
        : undefined,
    meaning:
      "Compiled from free Google News / Guardian / BBC / Al Jazeera / NYT Africa RSS. No generative model was used — quota exhaustion on xAI/Grok does not block this path. Pins are named-place centroids.",
    error: items.length === 0 ? "No free news items available this cycle." : undefined,
  };
}

async function buildFresh(): Promise<AiBrief> {
  const now = Date.now();
  const newsFeed = await pullNews().catch(() => null);
  const news = newsFeed?.items ?? [];

  const llm = await completeBriefLlm(DOCTRINE_SYSTEM, PROMPT);
  if (llm.ok) {
    const parsed = parsePacket(llm.text);
    if (parsed.items.length > 0 || parsed.commander) {
      return {
        ok: true,
        model: `${llm.provider}/${llm.model}`,
        generatedAt: now,
        items: parsed.items,
        citations: [],
        commander: parsed.commander,
        meaning: parsed.meaning,
      };
    }
  }

  const wire = compileFromNews(news);
  if (wire.ok) {
    return {
      ...wire,
      error: llm.error
        ? `LLM cascade skipped (${llm.error}). Showing free news-compiled leads instead.`
        : wire.error,
    };
  }

  return {
    ok: false,
    model: "none",
    generatedAt: now,
    items: [],
    citations: [],
    error: llm.error
      ? `All AI providers failed (${llm.error}). Free news also empty.`
      : "AI brief unavailable — no LLM key and no news this cycle. The local six-hour SITREP still compiles from the sweep.",
  };
}

export const generateAiBrief = createServerFn({ method: "POST" }).handler(async (): Promise<AiBrief> => {
  const now = Date.now();
  if (cache && cache.value.ok && now - cache.at < TTL_MS) return cache.value;
  if (!inflight) {
    inflight = buildFresh()
      .then((value) => {
        if (value.ok) cache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
});
