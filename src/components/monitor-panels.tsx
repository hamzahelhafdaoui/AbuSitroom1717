import { useRef, useState } from "react";
import { ExternalLink, Loader2, Plus, Sparkles } from "lucide-react";
import { CATEGORY_META, CONTROL_AS_OF, CONTROL_SOURCE, FACTION_META, imageryLinks, type Faction, type OsintReport, type ReportCategory } from "@/lib/osint";
import { ACTORS, ANALYTICAL_CHAIN, CLAIM_CLASS } from "@/lib/doctrine";
import type { Sitrep } from "@/lib/sitrep";
import type { BriefingDoc } from "@/lib/briefing";
import { CHANNEL_TONE, FEED_CHANNELS } from "@/lib/warroom-data";
import { CONFIDENCE_RUBRIC, PARTY_LABEL, type AiBrief, type Confidence, type FeedItem, type LiveMeta, type NewsFeed, type Party } from "@/lib/types";
import { DETECT_KLASS, type DetectHit, type DetectReport } from "@/lib/imagery-detect";
import { HUNTS, type HuntId } from "@/lib/hunt";
import type { FuaeRecord } from "@/lib/fuae";
import { RSF_WATCH, WHY_LABEL, type RsfWatchSite } from "@/data/rsf-watch";
import { VISTA_LEGEND } from "@/lib/vista-map";
import type { Coincidence } from "@/lib/fusion";
import { parseWeights, serializeWeights } from "@/lib/chip-model";
import { downloadBlob } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { inspectCam } from "@/lib/inspect-zoom";
import { Button } from "@/components/ui/button";
import { HazardFeedRows } from "@/components/hazard-feed";
import { TONE_LABEL, scoreHeadline } from "@/lib/sentiment";
import { translateToEn } from "@/lib/translate";
import { cn } from "@/lib/utils";

function relative(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return "—";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function TranslateBit({ text }: { text: string }) {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <span className="mt-1 block">
      <button
        type="button"
        className="font-mono text-[10px] tracking-wider text-accent"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (out || busy) return;
          setBusy(true);
          void translateToEn({ data: { text } })
            .then((r) => setOut(r.translated))
            .catch(() => setOut(text))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "…" : out ? "EN" : "TRANSLATE"}
      </button>
      {out ? <span className="mt-1 block text-xs text-muted">{out}</span> : null}
    </span>
  );
}

export function NewsPanel({ data, loading }: { data: NewsFeed | null; loading: boolean }) {
  const items = data?.items ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-subtle">News updates</h2>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {loading && items.length === 0 ? "fetching" : `${items.length} headlines`}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-subtle">
        Free wires (Google News, Guardian, BBC Africa, Al Jazeera, NYT Africa) — last 7 days, not conflict-filtered. Headline pins are named-place centroids, not incident coordinates.
        {data?.meta.note ? ` ${data.meta.note}` : ""}
        {data?.meta.fetchedAt ? ` Fetched ${data.meta.fetchedAt.slice(11, 16)}Z.` : ""}
      </p>
      {loading && items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">Loading live news…</p>
      ) : null}
      {!loading && items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">No headlines this cycle. Sweep again in a few minutes.</p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 rounded-xl border border-border bg-surface/60 p-3 hover:bg-raised"
            >
              <span className="flex items-center justify-between gap-2 text-[11px] text-subtle">
                <span className="truncate text-saf">{item.source}</span>
                <span className="shrink-0 font-mono">{relative(item.date)}</span>
              </span>
              <span className="flex items-start gap-1.5 text-sm leading-snug">
                <span className="mt-0.5 shrink-0 font-mono text-[9px] tracking-wider text-subtle">{TONE_LABEL[scoreHeadline(item.title)]}</span>
                <span className="min-w-0 flex-1">{item.title}</span>
                <ExternalLink className="mt-0.5 size-3 shrink-0 text-subtle" />
              </span>
            </a>
            {/[^\u0000-\u007F]/.test(item.title) ? (
              <div className="px-3 pb-2">
                <TranslateBit text={item.title} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FuaePanel({
  rows,
  onOpen,
}: {
  rows: FuaeRecord[];
  onOpen: (r: FuaeRecord) => void;
}) {
  const air = rows.filter((r) => r.kind === "air");
  const sea = rows.filter((r) => r.kind === "sea");
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-subtle">FUAE</h2>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {air.length} air · {sea.length} sea
        </span>
      </div>
      <p className="text-[11px] leading-snug text-subtle">
        UAE-linked ADS-B and documented UAE–Horn / Red Sea contacts. Route observation from public tracking — not a cargo, weapons, or transfer claim.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">
          No UAE→Africa contacts this cycle. ADS-B over the desert is a coverage gap, not a negative.
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r)}
              className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface/60 p-3 text-left hover:bg-raised"
            >
              <span className="flex items-center justify-between gap-2 text-[11px] text-subtle">
                <span className={r.kind === "air" ? "text-thermal" : "text-accent"}>
                  {r.kind === "air" ? "AIR" : "SEA"}
                  {r.live ? " · LIVE" : " · archive"}
                </span>
                <span className="font-mono">{r.lastSeen.slice(11, 16)}Z</span>
              </span>
              <span className="text-sm leading-snug">{r.title}</span>
              <span className="text-[11px] text-muted">
                {r.origin} → {r.dest}
              </span>
              <span className="text-[11px] leading-snug text-subtle">{r.why}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RsfWatchPanel({
  onOpen,
}: {
  onOpen: (w: RsfWatchSite) => void;
}) {
  const primary = RSF_WATCH.filter((w) => w.watch === "primary");
  const approach = RSF_WATCH.filter((w) => w.watch === "approach");
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-subtle">RSF watchlist</h2>
        <span className="font-mono text-[11px] tabular-nums text-muted">{RSF_WATCH.length} sites</span>
      </div>
      <p className="text-[11px] leading-snug text-subtle">
        Public pins associated with RSF in open reporting or as rear/approach nodes (Libya, Chad, Ethiopia / Blue Nile, Darfur). Watch ≠ occupancy. Confirm on Esri / Google. Not a targeting list.
      </p>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-subtle">Primary</p>
      <ul className="mt-1 space-y-1.5">
        {primary.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => onOpen(w)}
              className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface/60 p-3 text-left hover:bg-raised"
            >
              <span className="flex items-center justify-between gap-2 text-[11px] text-subtle">
                <span>{WHY_LABEL[w.why]}</span>
                <span className="font-mono">{w.lastSeen}</span>
              </span>
              <span className="text-sm leading-snug">{w.name}</span>
              <span className="text-[11px] text-muted">{w.place}</span>
              <span className="line-clamp-2 text-[11px] leading-snug text-subtle">{w.note}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-subtle">Approach / rear</p>
      <ul className="mt-1 space-y-1.5">
        {approach.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => onOpen(w)}
              className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface/60 p-3 text-left hover:bg-raised"
            >
              <span className="flex items-center justify-between gap-2 text-[11px] text-subtle">
                <span>{WHY_LABEL[w.why]}</span>
                <span className="font-mono">{w.lastSeen}</span>
              </span>
              <span className="text-sm leading-snug">{w.name}</span>
              <span className="line-clamp-2 text-[11px] leading-snug text-subtle">{w.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TONE_DOT: Record<string, string> = {
  civilian: "bg-civilian",
  saf: "bg-saf",
  damage: "bg-damage",
  other: "bg-other",
  rsf: "bg-rsf",
  thermal: "bg-thermal",
};

export function FeedsPanel({ items, meta }: { items: FeedItem[]; meta: LiveMeta | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <HazardFeedRows />
      <p className="text-[11px] leading-snug text-subtle">
        Public Telegram web previews (t.me/s). Not a login, not a targeting feed.
        {meta?.fetchedAt ? ` Fetched ${meta.fetchedAt.slice(11, 16)}Z · ${meta.recordCount} notes.` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {FEED_CHANNELS.map((ch) => (
          <span key={ch.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
            <span className={cn("size-1.5 rounded-full", TONE_DOT[ch.tone] ?? "bg-muted")} />
            {ch.label}
          </span>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">
          No public previews this cycle. Channels rate-limit; sweep again or read the log.
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => {
          const tone = CHANNEL_TONE[item.channel] ?? "other";
          const label = FEED_CHANNELS.find((c) => c.id === item.channel)?.label ?? item.channel;
          return (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 rounded-xl border border-border bg-surface/60 p-3 hover:bg-raised"
              >
                <span className="flex items-center justify-between gap-2 text-[11px] text-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", TONE_DOT[tone] ?? "bg-muted")} />
                    {label}
                  </span>
                  <span className="shrink-0 font-mono">{relative(item.timestamp)}</span>
                </span>
                <span className="text-sm leading-snug">{item.text.slice(0, 280)}</span>
                {item.place ? <span className="text-[11px] text-muted">Named place · {item.place}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BriefPanel({
  data,
  loading,
  onRun,
  sitrep,
  doc,
  onOpenAnno,
}: {
  data: AiBrief | null;
  loading: boolean;
  onRun: () => void;
  sitrep: Sitrep | null;
  doc: BriefingDoc | null;
  onOpenAnno?: (id: string) => void;
}) {
  const [view, setView] = useState<"doc" | "one" | "leads" | "actors">("doc");
  const s = sitrep;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {([
          ["doc", "Assessment"],
          ["one", "One-pager"],
          ["leads", "AI leads"],
          ["actors", "Actors"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "h-7 rounded-md px-2 font-mono text-[10px] tracking-wide uppercase",
              view === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-raised",
            )}
          >
            {label}
          </button>
        ))}
        <Button size="sm" className="ml-auto" onClick={onRun} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {loading ? "Searching" : "Refresh leads"}
        </Button>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-subtle">
        Assessment + one-pager compile from the sweep with no LLM. Leads try xAI → Groq → Gemini → OpenRouter → free Pollinations → news-compiled. Observation ≠ assessment. Docs only.
        {s ? ` Window ${s.windowStart.slice(11, 16)}–${s.windowEnd.slice(11, 16)}Z.` : ""}
        {doc ? ` ${doc.sections.length} sections · ${doc.annotations.length} map annotations.` : ""}
        {data?.model ? ` Leads model: ${data.model}.` : ""}
      </p>

      {view === "doc" && doc ? <AssessmentDoc doc={doc} onOpenAnno={onOpenAnno} /> : null}
      {view === "one" && s ? <CommanderBrief s={s} ai={data} /> : null}
      {view === "leads" ? <Leads data={data} loading={loading} /> : null}
      {view === "actors" ? <ActorsPanel /> : null}
      {view === "doc" && !doc ? (
        <p className="rounded-xl border border-border bg-raised p-3 text-sm text-muted">
          Sweep once. The fourteen-section assessment compiles from public ingest — it does not wait on the AI button.
        </p>
      ) : null}
      {view === "one" && !s ? (
        <p className="rounded-xl border border-border bg-raised p-3 text-sm text-muted">
          Sweep once. The six-hour SITREP compiles from public ingest — it does not wait on the AI button.
        </p>
      ) : null}
    </div>
  );
}

function AssessmentDoc({ doc, onOpenAnno }: { doc: BriefingDoc; onOpenAnno?: (id: string) => void }) {
  return (
    <div className="space-y-4 pb-8">
      <header className="rounded-xl border border-accent/40 bg-surface/70 p-3">
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent">MILITARY INTELLIGENCE ASSESSMENT</p>
        <p className="mt-1 text-xs text-muted">
          Sudan Wing · {doc.window.replace("T", " ").slice(0, 48)} · overall {doc.overall}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-subtle">
          Auto-compiled from verified reporting, claims, local sources, FIRMS, ADS-B, and dated optical browse.
          Every map annotation is tied to a paragraph. Click a section to fly the overlay.
        </p>
      </header>
      {doc.sections.map((sec) => {
        const cards = (sec.annoIds ?? [])
          .map((id) => doc.annotations.find((a) => a.id === id))
          .filter((a): a is NonNullable<typeof a> => Boolean(a && a.imagery));
        return (
          <article key={sec.id} className="rounded-xl border border-border bg-surface/50 p-3">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                const first = sec.annoIds?.[0];
                if (first) onOpenAnno?.(first);
              }}
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-accent">{sec.kicker}</p>
              <h3 className="mt-0.5 text-sm font-medium">{sec.title}</h3>
            </button>
            <p className="mt-2 text-sm leading-relaxed text-muted">{sec.body}</p>
            {sec.bullets && sec.bullets.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {sec.bullets.map((b, i) => {
                  const aid = sec.annoIds?.[i];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          if (aid) onOpenAnno?.(aid);
                        }}
                        className="w-full rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 text-left text-xs leading-relaxed text-muted hover:border-accent/40 hover:text-fg"
                      >
                        {b}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {cards.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {cards.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpenAnno?.(a.id)}
                    className="overflow-hidden rounded-lg border border-border text-left hover:border-accent/50"
                  >
                    <div className="grid grid-cols-2">
                      <img src={a.imagery!.before} alt="" className="aspect-[4/3] w-full object-cover" />
                      <img src={a.imagery!.after} alt="" className="aspect-[4/3] w-full object-cover" />
                    </div>
                    <p className="px-2 py-1 text-[10px] leading-snug text-subtle">
                      HLS before / after · {a.title}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function CommanderBrief({ s, ai }: { s: Sitrep; ai: AiBrief | null }) {
  const bottom = ai?.commander || s.bottomLine;
  const meaning = ai?.meaning || s.meaning;
  return (
    <div className="space-y-3">
      <header className="rounded-xl border border-accent/40 bg-surface/70 p-3">
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent">SIX-HOUR MILITARY INTELLIGENCE BRIEF</p>
        <p className="mt-1 text-xs text-muted">
          {s.theater} · {s.windowStart.slice(0, 16).replace("T", " ")}–{s.windowEnd.slice(11, 16)}Z · overall {s.overallConfidence}
        </p>
        <p className="mt-2 text-[11px] text-subtle">
          {s.counts.log6h} log / {s.counts.news} wire / {s.counts.firms} FIRMS / {s.counts.cargo} cargo-typical · source {s.source}
          {ai?.commander ? " · AI overlay on bottom line" : ""}
        </p>
      </header>
      <section>
        <h3 className="font-mono text-[10px] tracking-widest text-subtle">BOTTOM LINE</h3>
        <p className="mt-1 text-sm leading-relaxed">{bottom}</p>
      </section>
      <section>
        <h3 className="font-mono text-[10px] tracking-widest text-subtle">KEY DEVELOPMENTS</h3>
        <ol className="mt-1 space-y-2">
          {s.developments.slice(0, 5).map((d, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface/50 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-subtle">
                {d.claim} · {d.confidence} · {d.significance}
                {d.location ? ` · ${d.location}` : ""}
              </p>
              <p className="text-sm leading-snug">{d.title}</p>
              <p className="mt-1 text-xs text-muted">{d.observed}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="font-mono text-[10px] tracking-widest text-subtle">BATTLEFIELD / OPERATIONAL PICTURE</h3>
        <p className="mt-1 text-xs text-muted">Initiative: {s.picture.initiative}</p>
        <ul className="mt-1 space-y-1 text-xs text-muted">
          <li>Ground — {s.picture.ground}</li>
          <li>Air — {s.picture.air}</li>
          <li>Fires — {s.picture.fires}</li>
          <li>Logistics — {s.picture.logistics}</li>
          <li>C2 / Intel — {s.picture.c2}</li>
        </ul>
      </section>
      <section>
        <h3 className="font-mono text-[10px] tracking-widest text-subtle">WHAT IT MEANS</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{meaning}</p>
      </section>
      <section>
        <h3 className="font-mono text-[10px] tracking-widest text-subtle">NEXT 24–72 HOURS</h3>
        <p className="mt-1 text-sm">{s.forecast.mostLikely}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
          {s.forecast.watch.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-mono text-[10px] tracking-widest text-subtle">KEY UNCERTAINTIES</h3>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
          {s.gaps.slice(0, 3).map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FullSitrep({ s }: { s: Sitrep }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-mono text-[10px] tracking-[0.18em] text-accent">MILITARY OSINT SITUATION REPORT</p>
      <p className="text-xs text-muted">
        {ANALYTICAL_CHAIN[0]}. Then identification, then assessment, then judgment.
      </p>
      <p className="leading-relaxed">{s.bottomLine}</p>
      {s.developments.map((d, i) => (
        <article key={i} className="rounded-xl border border-border p-3">
          <p className="text-[10px] uppercase tracking-wide text-subtle">
            {i + 1} · {d.claim} · {d.confidence} · {d.significance}
          </p>
          <h4 className="mt-0.5 font-medium">{d.title}</h4>
          <p className="mt-1 text-xs text-muted">
            <span className="text-fg">Observed.</span> {d.observed}
          </p>
          <p className="mt-1 text-xs text-muted">
            <span className="text-fg">Assessment.</span> {d.assessment}
          </p>
        </article>
      ))}
      <section className="rounded-xl border border-border p-3 text-xs text-muted">
        <p className="font-mono text-[10px] tracking-widest text-subtle">POLITICAL / STRATEGIC</p>
        <p className="mt-1 leading-relaxed">{s.political}</p>
      </section>
      <section className="rounded-xl border border-border p-3 text-xs text-muted">
        <p className="font-mono text-[10px] tracking-widest text-subtle">FORECAST</p>
        <p className="mt-1">Most likely — {s.forecast.mostLikely}</p>
        <p className="mt-1">Alternative — {s.forecast.alt}</p>
        <p className="mt-1">Low-prob / high-impact — {s.forecast.lowProb}</p>
      </section>
      <section className="text-xs text-muted">
        <p className="font-mono text-[10px] tracking-widest text-subtle">CONFIDENCE SUMMARY</p>
        <p className="mt-1">HIGH: {s.high.join("; ")}</p>
        <p>MODERATE: {s.moderate.join("; ")}</p>
        <p>LOW: {s.low.join("; ")}</p>
      </section>
    </div>
  );
}

function Leads({ data, loading }: { data: AiBrief | null; loading: boolean }) {
  return (
    <div>
      <p className="text-[11px] leading-snug text-subtle">
        Optional 48h lead pack. Tries free/public LLM cascade, then news-compiled headlines if quota is exhausted. Leads, not confirmation. Does not fire on page load.
      </p>
      {!data && !loading ? (
        <p className="mt-3 rounded-xl border border-border bg-raised p-3 text-sm text-muted">
          Press Refresh leads. Assessment and one-pager above already compile from the sweep without any LLM quota.
        </p>
      ) : null}
      {data?.error ? (
        <p className="mt-3 rounded-xl border border-border bg-raised p-3 text-[11px] leading-snug text-muted">{data.error}</p>
      ) : null}
      {data && !data.ok ? (
        <p className="mt-3 rounded-xl border border-damage/40 bg-damage/10 p-3 text-sm text-damage">No leads this cycle.</p>
      ) : null}
      {data?.commander ? (
        <p className="mt-3 rounded-xl border border-accent/30 bg-surface/60 p-3 text-sm leading-relaxed">{data.commander}</p>
      ) : null}
      <ol className="mt-3 space-y-2">
        {(data?.items ?? []).map((it) => (
          <li key={it.id} className="rounded-xl border border-border bg-surface/60 p-3">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-subtle">
              <span>{it.category}</span>
              <span>{it.confidence}</span>
              {it.location ? <span>· {it.location}</span> : null}
              {it.geoPrecise === false && it.lat != null ? <span className="text-thermal">verify geo</span> : null}
              {it.date ? <span className="ml-auto font-mono">{it.date}</span> : null}
            </div>
            <p className="text-sm leading-snug">{it.headline}</p>
            {it.summary ? <p className="mt-1 text-xs leading-relaxed text-muted">{it.summary}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ActorsPanel() {
  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-subtle">
        Persistent actor profiles. Updated when public evidence changes — not every six hours. {CLAIM_CLASS.assessed}.
      </p>
      {ACTORS.map((a) => (
        <article key={a.id} className="rounded-xl border border-border bg-surface/60 p-3">
          <p className="font-mono text-[10px] tracking-widest text-accent">{a.id.toUpperCase()} · {a.confidence}</p>
          <h4 className="text-sm font-medium">{a.name}</h4>
          <p className="text-xs text-muted">{a.short}</p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            <li><span className="text-fg">Political.</span> {a.political}</li>
            <li><span className="text-fg">Military.</span> {a.military}</li>
            <li><span className="text-fg">Logistics.</span> {a.logistics}</li>
            <li><span className="text-fg">External.</span> {a.external}</li>
          </ul>
        </article>
      ))}
    </div>
  );
}

export function ReportsList({
  reports,
  onSelect,
  onAdd,
}: {
  reports: OsintReport[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const sorted = [...reports].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-subtle">{sorted.length} published OSINT posts · aggregation, not original assessments</p>
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-3.5" /> Log
        </Button>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(r.id);
                useAppStore.getState().setFlyTarget(
                  inspectCam({ lat: r.lat, lon: r.lon, zoom: 15.2, label: r.title, date: r.date }),
                );
              }}
              className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface/60 p-3 text-left hover:bg-raised"
            >
              <span className="flex items-center justify-between gap-2 text-[11px] text-subtle">
                <span>{CATEGORY_META[r.category].label}</span>
                <span className="font-mono">{r.date}</span>
              </span>
              <span className="text-sm leading-snug">{r.title}</span>
              <span className="font-mono text-[10px] tracking-wider text-thermal">ARCHIVE POST · not an AHSR assessment</span>
              <span className="text-xs text-subtle">
                {r.place}, {r.country} · {r.sourceLabel} · {r.date}
                {r.sourceUrl ? " · source linked" : ""}
              </span>
              <span className="text-[11px] text-subtle">AHSR has not independently confirmed this.</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportDetail({ report, onBack }: { report: OsintReport; onBack: () => void }) {
  const links = imageryLinks(report.lat, report.lon);
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <button type="button" className="mb-2 self-start text-xs text-muted hover:text-fg" onClick={onBack}>
        ← Reports
      </button>
      <p className="text-[11px] uppercase tracking-wide text-subtle">
        {CATEGORY_META[report.category].label} · {PARTY_LABEL[report.party]} · c{report.confidence}
      </p>
      <h2 className="mt-1 font-display text-2xl font-medium leading-snug tracking-tight">{report.title}</h2>
      <p className="mt-1 text-xs text-subtle">
        {report.place}, {report.country} · {report.date} · {report.lat.toFixed(4)}, {report.lon.toFixed(4)}
      </p>
      {report.imageUrl ? (
        <img
          src={report.imageUrl}
          alt=""
          className="mt-3 w-full rounded-lg border border-border object-cover"
        />
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-muted">{report.summary}</p>
      <p className="mt-2 font-mono text-[10px] tracking-wider text-thermal">ARCHIVE POST · ingested published post — not an AHSR assessment</p>
      <p className="text-[11px] text-subtle">
        {report.sourceLabel}
        {report.sourceUrl ? ` · ${report.sourceUrl}` : ""} · {report.date}. AHSR has not independently confirmed this.
      </p>
      <p className="mt-3 rounded-lg border border-border bg-raised p-2 text-xs leading-relaxed text-subtle">
        {CONFIDENCE_RUBRIC[report.confidence]} Source:{" "}
        {report.sourceUrl ? (
          <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="text-fg underline-offset-2 hover:underline">
            {report.sourceLabel}
          </a>
        ) : (
          report.sourceLabel
        )}
      </p>
      <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-subtle">Inspect this location</h3>
      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-between rounded-lg border border-border px-3 text-sm hover:bg-raised"
          >
            {l.label}
            <ExternalLink className="size-3.5 text-subtle" />
          </a>
        ))}
      </div>
    </div>
  );
}

const FIELD =
  "h-10 w-full rounded-lg border border-border bg-raised px-3 text-sm text-fg placeholder:text-subtle";

export function AddReportForm({
  onAdd,
  onCancel,
}: {
  onAdd: (r: OsintReport) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [country, setCountry] = useState("Sudan");
  const [coords, setCoords] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ReportCategory>("vehicle-buildup");
  const [party, setParty] = useState<Party>("unknown");
  const [confidence, setConfidence] = useState<Confidence>(1);
  const [summary, setSummary] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parts = coords.split(",").map((s) => Number(s.trim()));
    if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) {
      setError("Coordinates must be lat, lon — e.g. 15.9625, 32.5525");
      return;
    }
    if (!title.trim() || !sourceLabel.trim()) {
      setError("Title and source are required.");
      return;
    }
    onAdd({
      id: `user-${Date.now()}`,
      title: title.trim(),
      place: place.trim() || "Unspecified",
      country: country.trim() || "Sudan",
      lat: parts[0]!,
      lon: parts[1]!,
      date,
      category,
      party,
      confidence,
      summary: summary.trim(),
      sourceLabel: sourceLabel.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <h2 className="font-display text-xl font-medium">Log a published report</h2>
      <p className="text-xs leading-relaxed text-subtle">
        Record what a source published. It is a lead until corroborated. No targeting language.
      </p>
      {error ? <p className="rounded-lg border border-damage/40 bg-damage/10 px-3 py-2 text-xs text-damage">{error}</p> : null}
      <input className={FIELD} placeholder="Title / what was observed" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className={FIELD} placeholder="Place" value={place} onChange={(e) => setPlace(e.target.value)} />
        <input className={FIELD} placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      <input className={FIELD} placeholder="Coordinates: lat, lon" value={coords} onChange={(e) => setCoords(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} />
        <select className={FIELD} value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
          {Object.entries(CATEGORY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className={FIELD} value={party} onChange={(e) => setParty(e.target.value as Party)}>
          {(Object.keys(PARTY_LABEL) as Party[]).map((k) => (
            <option key={k} value={k}>{PARTY_LABEL[k]}</option>
          ))}
        </select>
        <select className={FIELD} value={confidence} onChange={(e) => setConfidence(Number(e.target.value) as Confidence)}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <option key={n} value={n}>{n} — {CONFIDENCE_RUBRIC[n].slice(0, 28)}</option>
          ))}
        </select>
      </div>
      <textarea
        className="min-h-20 w-full rounded-lg border border-border bg-raised p-3 text-sm"
        placeholder="Summary of the claim"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input className={FIELD} placeholder="Source (e.g. @account)" value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
        <input className={FIELD} placeholder="Source URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Add to map</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function ControlLegend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="hud-panel pointer-events-auto w-60 max-w-[78vw] p-2.5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-xs font-medium">
        Areas of control
        <span className="text-subtle">{open ? "–" : "+"}</span>
      </button>
      {open ? (
        <>
          <ul className="mt-2 space-y-1">
            {(Object.keys(FACTION_META) as Faction[]).map((f) => {
              const m = FACTION_META[f];
              return (
                <li key={f} className="flex items-center gap-2 text-[11px] text-muted">
                  <span
                    className={cn("h-2.5 w-4 shrink-0 rounded-sm border")}
                    style={{
                      backgroundColor: `${m.color}40`,
                      borderColor: m.color,
                      borderStyle: m.dashed ? "dashed" : "solid",
                    }}
                  />
                  {m.label}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 border-t border-border pt-2 text-[10px] leading-tight text-subtle">
            As of {CONTROL_AS_OF}. {CONTROL_SOURCE}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-subtle">Vista copy (English)</p>
          <ul className="mt-1 space-y-1">
            {VISTA_LEGEND.map((m) => (
              <li key={m.faction} className="flex items-center gap-2 text-[11px] text-muted">
                <span className="h-2.5 w-4 shrink-0 rounded-sm border" style={{ backgroundColor: `${m.color}55`, borderColor: m.color }} />
                {m.label}
              </li>
            ))}
            <li className="flex items-center gap-2 text-[11px] text-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "#3d8b3d" }} />
              SAF-held division HQ (green pin)
            </li>
            <li className="flex items-center gap-2 text-[11px] text-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "#c9a227" }} />
              RSF-held division HQ (amber pin)
            </li>
          </ul>
          <p className="mt-1 text-[10px] leading-tight text-subtle">
            Translated from the public Google My Map “Sudan control map (copied from Vista)”. Third-party compiled control — not a live frontline.
          </p>
          <ul className="mt-2 space-y-1 border-t border-border pt-2">
            <li className="flex items-center gap-2 text-[11px] text-muted">
              <span className="size-2.5 rounded-full bg-accent" />
              Archive sites
            </li>
            <li className="flex items-center gap-2 text-[11px] text-muted">
              <span className="size-2.5 rounded-full bg-saf" />
              OSM / OurAirports
            </li>
            <li className="flex items-center gap-2 text-[11px] text-muted">
              <span className="size-2.5 rounded-full bg-damage" />
              GDELT event pulses
            </li>
            <li className="flex items-center gap-2 text-[11px] text-muted">
              <span className="size-2.5 rounded-full bg-thermal" />
              FIRMS thermal
            </li>
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function DetectPanel({
  report,
  loading,
  onOpen,
  coincidence,
}: {
  report: DetectReport | null;
  loading: boolean;
  onOpen: (hit: DetectHit) => void;
  coincidence?: Coincidence | null;
}) {
  const [filter, setFilter] = useState<HuntId | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const modelWeights = useAppStore((s) => s.modelWeights);
  const setModelWeights = useAppStore((s) => s.setModelWeights);
  const chipSamples = useAppStore((s) => s.chipSamples);
  const hits = report?.hits ?? [];
  const counts = Object.fromEntries(
    HUNTS.map((h) => [h.id, hits.filter((x) => x.hunts?.includes(h.id)).length]),
  ) as Record<HuntId, number>;
  const shown = hits.filter((h) => filter === "all" || h.hunts?.includes(filter));
  const ranked = [...shown].sort((a, b) => {
    const w = (h: DetectHit) =>
      (h.id.startsWith("det-scan-") ? 8 : 0) +
      (h.hunts?.includes("bda") ? 4 : 0) +
      (h.hunts?.includes("irreg") ? 3 : 0) +
      (h.hunts?.includes("cargo") || h.hunts?.includes("sea") ? 2 : 0) +
      h.confidence;
    return w(b) - w(a);
  });
  const scanN = hits.filter((h) => h.id.startsWith("det-scan-")).length;
  return (
    <div className="hud-panel pointer-events-auto mt-2 w-72 max-w-[86vw] overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-2">
        <p className="text-xs font-medium">Imagery sweep</p>
        <span className="font-mono text-[11px] tabular-nums text-subtle">
          {loading ? "scanning tiles…" : `${scanN} finds · ${shown.length}/${hits.length}`}
        </span>
      </div>
      <p className="border-t border-border px-2.5 py-1.5 text-[10px] leading-snug text-subtle">
        {report?.note ??
          "GEOINT desk — BDA, cargo, air, sea, vehicles, pads, berms, POL, camps, crossings. Candidates, not IDs."}
        {" "}Click a row to slew to high-res at yard scale.
      </p>
      {coincidence ? (
        <div className="border-t border-border px-2.5 py-1.5">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-wide">
            <span className="text-muted">COINCIDENCE</span>
            <span className="text-accent">{coincidence.score} · {coincidence.level}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised">
            <div className="h-full bg-accent" style={{ width: `${coincidence.score}%` }} />
          </div>
          <p className="mt-1 text-[10px] leading-tight text-subtle">
            Weak-signal co-occurrence of public feeds. Not a war forecast. Not a confirmed alert.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-0.5 px-2 pb-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-sm px-1 py-0.5 font-mono text-[9px] tracking-wide",
            filter === "all" ? "bg-raised text-fg" : "text-muted hover:text-fg",
          )}
        >
          ALL
        </button>
        {HUNTS.map((h) => (
          <button
            key={h.id}
            type="button"
            title={h.look}
            onClick={() => setFilter(filter === h.id ? "all" : h.id)}
            className={cn(
              "rounded-sm px-1 py-0.5 font-mono text-[9px] tracking-wide",
              filter === h.id ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            {h.short}
            {counts[h.id] ? ` ${counts[h.id]}` : ""}
          </button>
        ))}
      </div>
      <ul className="max-h-64 overflow-y-auto border-t border-border">
        {shown.length === 0 && !loading ? (
          <li className="px-2.5 py-2 text-[11px] text-muted">No candidates this cycle.</li>
        ) : (
          ranked.slice(0, 24).map((h) => {
            const meta = DETECT_KLASS[h.klass];
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onOpen(h)}
                  className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-raised"
                >
                  <span
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: meta.color }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] text-fg">{h.title}</span>
                    <span className="font-mono text-[10px] text-subtle">
                      {h.id.startsWith("det-scan-") ? "SCAN · " : ""}
                      {meta.short} · c{Math.min(2, h.confidence)}
                      {h.change != null ? ` · Δ${h.change}` : ""}
                      {h.cloud !== "unknown" ? ` · ${h.cloud}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      <div className="flex flex-wrap gap-1 border-t border-border px-2 py-1.5">
        <button
          type="button"
          className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-muted hover:text-fg"
          onClick={() => downloadBlob("ahsr-chip-weights.json", "application/json", serializeWeights(modelWeights))}
        >
          Export weights
        </button>
        <button
          type="button"
          className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-muted hover:text-fg"
          onClick={() =>
            downloadBlob(
              "ahsr-chip-samples.json",
              "application/json",
              JSON.stringify({ version: 1, kind: "ahsr-chip-samples", samples: chipSamples }, null, 2),
            )
          }
        >
          Export labels {chipSamples.length ? `(${chipSamples.length})` : ""}
        </button>
        <button
          type="button"
          className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-muted hover:text-fg"
          onClick={() => fileRef.current?.click()}
        >
          Import Colab JSON
        </button>
        <a href="/sudan-chip-train.ipynb" download className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-muted hover:text-fg">
          Colab notebook
        </a>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void file.text().then((t) => {
              const w = parseWeights(t);
              if (w) setModelWeights(w);
            });
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
