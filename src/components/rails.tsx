import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Flame,
  Focus,
  Plane,
  Plus,
  Search,
  Shield,
  Satellite,
  AlertTriangle,
  Ship,
  X,
} from "lucide-react";
import { ALERTS, CITATIONS, OBSERVATIONS, SITES } from "@/data/catalog";
import { exportBriefing, exportCsv, exportGeoJSON } from "@/lib/export";
import { archiveFlight, archiveSiteScene } from "@/lib/evidence";
import { SEED_REPORTS, imageryLinks, type OsintReport } from "@/lib/osint";
import { RSF_WATCH } from "@/data/rsf-watch";
import { mergeFlags, reportsToFlags, alertsToFlags, detectToFlags, type Flag, type ListOrder } from "@/lib/flags";
import type { DetectHit } from "@/lib/imagery-detect";
import type { Sitrep } from "@/lib/sitrep";
import type { BriefingDoc } from "@/lib/briefing";
import type { FuaeRecord } from "@/lib/fuae";
import {
  AddReportForm,
  BriefPanel,
  FeedsPanel,
  FuaePanel,
  NewsPanel,
  ReportDetail,
  ReportsList,
  RsfWatchPanel,
} from "@/components/monitor-panels";
import {
  CONFIDENCE_RUBRIC,
  PARTY_LABEL,
  KIND_GROUP_LABEL,
  IMAGERY,
  type Confidence,
  type FlightEvent,
  type ImagerySource,
  type LiveBundle,
  type NewsFeed,
  type AiBrief,
  type Party,
  type ReviewState,
  type ThermalEvent,
  type WatchBox,
  type FeedItem,
  type LiveMeta,
} from "@/lib/types";
import { useAppStore, type LayerKey } from "@/lib/store";
import { cn, copyText, formatUtc, PARTY_TONE, snapshotUrl } from "@/lib/utils";
import { padBbox } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type MobileTab = "news" | "alerts" | "sites" | "layers" | "log" | "brief" | "fuae";

function BrowseFrame({
  date,
  bbox,
  alt,
}: {
  date: string;
  bbox: { west: number; south: number; east: number; north: number };
  alt: string;
}) {
  const imagery = useAppStore((s) => s.imagery);
  const [bad, setBad] = useState(false);
  const layer =
    imagery === "s2"
      ? "HLS_S30_Nadir_BRDF_Adjusted_Reflectance"
      : "VIIRS_NOAA20_CorrectedReflectance_TrueColor";
  useEffect(() => {
    setBad(false);
  }, [date, layer]);
  if (bad) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border bg-raised px-2 text-center text-xs text-subtle">
        No {imagery === "s2" ? "Sentinel-2 HLS" : "VIIRS"} browse for {date}. Cloudy or a coverage
        gap — do not invent vehicles.
      </div>
    );
  }
  return (
    <img
      src={snapshotUrl(date, bbox, layer)}
      alt={alt}
      className="aspect-[4/3] w-full rounded-lg object-cover outline outline-1 -outline-offset-1 outline-fg/10"
      onError={() => setBad(true)}
    />
  );
}

export function ConfidencePips({ value }: { value: Confidence }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={CONFIDENCE_RUBRIC[value]}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <span
          key={n}
          className={cn("h-1.5 w-2.5 rounded-sm", n <= value ? "bg-accent" : "bg-border")}
        />
      ))}
      <span className="ml-1 font-mono text-xs tabular-nums text-muted">c{value}</span>
    </span>
  );
}

export function LeftRail(props: {
  overlay?: boolean;
  date: string;
  compareDate: string;
  setDate: (d: string) => void;
  setCompareDate: (d: string) => void;
  swipeOn: boolean;
  setSwipeOn: (v: boolean) => void;
  layers: Record<string, boolean>;
  toggleLayer: (k: LayerKey) => void;
  imagery: ImagerySource;
  setImagery: (i: ImagerySource) => void;
  partyFilter: Party | "all";
  setPartyFilter: (p: Party | "all") => void;
  query: string;
  setQuery: (q: string) => void;
  boxes: WatchBox[];
  boxOpen: boolean;
  setBoxOpen: (v: boolean) => void;
  boxForm: { name: string; west: string; south: string; east: string; north: string };
  setBoxForm: (v: { name: string; west: string; south: string; east: string; north: string }) => void;
  addBox: (b: WatchBox) => void;
  removeBox: (id: string) => void;
  hideDefaultBox: (id: string) => void;
  flights: FlightEvent[];
  firms: ThermalEvent[];
  onExport?: () => void;
}) {
  const {
    overlay, date, compareDate, setDate, setCompareDate, swipeOn, setSwipeOn,
    layers, toggleLayer, imagery, setImagery, partyFilter, setPartyFilter, query, setQuery,
    boxes, boxOpen, setBoxOpen, boxForm, setBoxForm, addBox, removeBox, hideDefaultBox,
    flights, firms,
  } = props;
  const setFocusedBox = useAppStore((s) => s.setFocusedBox);
  const kindFilter = useAppStore((s) => s.kindFilter);
  const setKindFilter = useAppStore((s) => s.setKindFilter);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      {overlay ? null : (
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sites, alerts"
            className="h-10 w-full rounded-lg border border-border bg-raised pl-8 pr-3 text-sm text-fg placeholder:text-subtle"
          />
        </label>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Layers</h2>
        <p className="mb-2 text-[11px] leading-snug text-subtle">Choose what to draw.</p>
        <div className="space-y-0.5">
          {(
            [
              ["sites", "Sites", Shield],
              ["boxes", "Watch boxes", Eye],
              ["control", "Control areas", Shield],
              ["vista", "Vista control map", Shield],
              ["reports", "OSINT reports", FileText],
              ["news", "News pins", Search],
              ["ai", "AI brief pins", FileText],
              ["gdelt", "GDELT events", AlertTriangle],
              ["osm", "OSM / airfields", Shield],
              ["vessels", "Vessels (AIS)", Ship],
              ["lanes", "Lane markers · NOT LIVE AIS", Ship],
              ["conflict", "Open conflict cites", FileText],
              ["corridors", "Reported corridors", Eye],
              ["rsfWatch", "RSF watchlist", Shield],
              ["firms", "FIRMS thermal", Flame],
              ["flights", "Flights", Plane],
              ["thermalRaster", "GIBS thermal raster", Flame],
              ["grid", "1° grid", Satellite],
              ["quakes", "USGS quakes", Flame],
              ["sats", "ISS / sats", Satellite],
              ["eonet", "EONET", AlertTriangle],
              ["launches", "Launches", Plane],
              ["freight", "Freight smear · not a count", Ship],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleLayer(k)}
              className="flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-raised"
            >
              <span className={cn("size-2 rounded-full", layers[k] ? "bg-accent" : "bg-border")} />
              <Icon className="size-3.5 text-muted" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Party</h2>
        <div className="flex flex-wrap gap-1">
          {(["all", "saf", "rsf", "mixed", "other_armed", "civilian", "unknown"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPartyFilter(p)}
              className={cn(
                "h-8 rounded-full border px-2.5 text-xs",
                partyFilter === p
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border text-muted hover:bg-raised",
              )}
            >
              {p === "all" ? "All" : PARTY_LABEL[p]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">What to show</h2>
        <div className="flex flex-wrap gap-1">
          {Object.entries(KIND_GROUP_LABEL).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKindFilter(id)}
              className={cn(
                "h-8 rounded-full border px-2.5 text-xs",
                kindFilter === id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border text-muted hover:bg-raised",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {overlay ? null : (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Imagery</h2>
          <div className="flex flex-wrap gap-1">
            {(["hires", "gmaps", "s2cloudless", "s2", "s1", "viirs", "dark"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setImagery(id)}
                className={cn(
                  "h-8 rounded-full border px-2.5 text-xs",
                  imagery === id
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted hover:bg-raised",
                )}
              >
                {IMAGERY[id].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-subtle">{IMAGERY[imagery].note}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Live contacts</h2>
        <ul className="space-y-1">
          {flights.slice(0, 8).map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-sm border border-border px-2 py-1.5 font-mono text-[11px]">
              <span className={cn(f.military || f.category === "cargo" ? "text-thermal" : "text-fg")}>
                {f.operator !== "unknown" ? f.operator : f.hex}
              </span>
              <span className="text-subtle">
                {f.typeCode}
                {f.altFt ? ` · ${Math.round(f.altFt / 100) * 100}ft` : ""}
              </span>
            </li>
          ))}
          {flights.length === 0 ? (
            <li className="text-[11px] leading-snug text-subtle">
              No live ADS-B this cycle. Coverage gaps are normal. Absence of a track is not absence of a flight.
            </li>
          ) : null}
        </ul>
      </section>

      {overlay ? null : (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Browse date</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-raised px-2 text-sm"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={swipeOn} onChange={(e) => setSwipeOn(e.target.checked)} />
            Before / after on map + selected site
          </label>
          {swipeOn ? (
            <input
              type="date"
              value={compareDate}
              onChange={(e) => setCompareDate(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-border bg-raised px-2 text-sm"
            />
          ) : null}
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-subtle">Watch boxes</h2>
          <button type="button" onClick={() => setBoxOpen(!boxOpen)} className="text-muted hover:text-fg" aria-label="Add watch box">
            <Plus className="size-4" />
          </button>
        </div>
        {boxOpen ? (
          <form
            className="mb-2 space-y-1.5 rounded-xl border border-border bg-raised p-2"
            onSubmit={(e) => {
              e.preventDefault();
              addBox({
                id: `custom-${Date.now()}`,
                name: boxForm.name || "Custom box",
                region: "Custom",
                west: Number(boxForm.west),
                south: Number(boxForm.south),
                east: Number(boxForm.east),
                north: Number(boxForm.north),
                priority: "primary",
                notes: "Analyst-drawn watch box.",
              });
              setBoxOpen(false);
            }}
          >
            <input
              required
              placeholder="Name"
              value={boxForm.name}
              onChange={(e) => setBoxForm({ ...boxForm, name: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-bg px-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-1">
              {(["west", "south", "east", "north"] as const).map((k) => (
                <input
                  key={k}
                  value={boxForm[k]}
                  onChange={(e) => setBoxForm({ ...boxForm, [k]: e.target.value })}
                  className="h-8 rounded-md border border-border bg-bg px-2 font-mono text-xs"
                  aria-label={k}
                />
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => {
                const map = (window as unknown as {
                  __ahsrMap?: { getBounds: () => { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number } };
                }).__ahsrMap;
                if (!map) return;
                const b = map.getBounds();
                setBoxForm({
                  ...boxForm,
                  west: b.getWest().toFixed(4),
                  south: b.getSouth().toFixed(4),
                  east: b.getEast().toFixed(4),
                  north: b.getNorth().toFixed(4),
                  name: boxForm.name || "Map viewport",
                });
              }}
            >
              Use current map frame
            </Button>
            <Button size="sm" className="w-full" type="submit">Add box</Button>
          </form>
        ) : null}
        <ul className="space-y-0.5">
          {boxes.map((b) => (
            <li key={b.id} className="flex items-center gap-1 rounded-lg pr-1 hover:bg-raised">
              <button
                type="button"
                onClick={() => setFocusedBox(b.id)}
                className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left"
              >
                <span className="block truncate text-sm text-fg">{b.name}</span>
                <span className="text-xs text-subtle">{b.priority === "border" ? "Cross-border" : "Primary"}</span>
              </button>
              <button
                type="button"
                className="relative size-8 text-subtle hover:text-damage after:absolute after:left-1/2 after:top-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2"
                onClick={() => (b.id.startsWith("custom-") ? removeBox(b.id) : hideDefaultBox(b.id))}
                aria-label={`Hide ${b.name}`}
              >
                <X className="mx-auto size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-auto space-y-1.5 pt-2">
        <Button variant="secondary" size="sm" className="w-full" onClick={() => exportGeoJSON()}>
          <Download className="size-3.5" /> GeoJSON
        </Button>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => exportCsv()}>
          <Download className="size-3.5" /> CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            if (props.onExport) props.onExport();
            else exportBriefing(flights, firms);
          }}
        >
          <FileText className="size-3.5" /> Export / briefing
        </Button>
      </section>
    </div>
  );
}

export function RightRail(props: {
  force?: MobileTab;
  alerts: typeof ALERTS;
  sites: typeof SITES;
  selectedAlert: (typeof ALERTS)[number] | null;
  selectedSite: (typeof SITES)[number] | null;
  siteParty: Party;
  siteObs: typeof OBSERVATIONS;
  reviews: Record<string, { state: ReviewState; note: string; confidence: Confidence; at: string }>;
  note: string;
  setNote: (s: string) => void;
  applyReview: (s: ReviewState) => void;
  setSelectedAlert: (id: string | null) => void;
  setSelectedSite: (id: string | null) => void;
  reviewFilter: ReviewState | "all";
  setReviewFilter: (r: ReviewState | "all") => void;
  overrideParty: (id: string, p: Party, reason: string) => void;
  flights: FlightEvent[];
  live: LiveBundle | null;
  liveError: string | null;
  audit: { id: string; at: string; action: string; target: string; reason: string }[];
  news: NewsFeed | null;
  newsLoading: boolean;
  brief: AiBrief | null;
  briefLoading: boolean;
  onRunBrief: () => void;
  sitrep: Sitrep | null;
  briefingDoc?: BriefingDoc | null;
  onOpenAnno?: (id: string) => void;
  feeds?: FeedItem[];
  feedsMeta?: LiveMeta | null;
  fuae?: FuaeRecord[];
  onOpenFuae?: (r: FuaeRecord) => void;
  detections?: DetectHit[];
  onOpenFlag?: (f: Flag) => void;
}) {
  const {
    alerts, sites, selectedAlert, selectedSite, siteParty, siteObs, reviews,
    note, setNote, applyReview, setSelectedAlert, setSelectedSite,
    reviewFilter, setReviewFilter, overrideParty, flights, live, liveError, audit, force,
    news, newsLoading, brief, briefLoading, onRunBrief, sitrep, feeds, feedsMeta, briefingDoc, onOpenAnno,
    fuae, onOpenFuae,
  } = props;
  const detections = props.detections ?? [];
  const onOpenFlag = props.onOpenFlag;
  const selectedReportId = useAppStore((s) => s.selectedReportId);
  const addingReport = useAppStore((s) => s.addingReport);
  const customReports = useAppStore((s) => s.customReports);
  const addReport = useAppStore((s) => s.addReport);
  const setSelectedReport = useAppStore((s) => s.setSelectedReport);
  const setAddingReport = useAppStore((s) => s.setAddingReport);
  const allReports: OsintReport[] = [...customReports, ...SEED_REPORTS];
  const selectedReport = allReports.find((r) => r.id === selectedReportId) ?? null;

  if (force === "news") {
    return <NewsPanel data={news} loading={newsLoading} />;
  }

  if (force === "sites") {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Sites</h2>
        <ul className="space-y-1">
          {sites.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setSelectedSite(s.id)} className="w-full rounded-lg px-2 py-2 text-left hover:bg-raised">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm">{s.name}</span>
                  <Badge className={PARTY_TONE[s.party]}>{PARTY_LABEL[s.party]}</Badge>
                </span>
                <span className="text-xs text-subtle">{s.kind} · {s.admin1}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (force === "log") {
    return <ChangeLogList />;
  }

  if (force === "brief") {
    return (
      <BriefPanel
        data={brief}
        loading={briefLoading}
        onRun={onRunBrief}
        sitrep={sitrep}
        doc={briefingDoc ?? null}
        onOpenAnno={onOpenAnno}
      />
    );
  }

  if (force === "fuae") {
    return <FuaePanel rows={fuae ?? []} onOpen={onOpenFuae ?? (() => {})} />;
  }

  if (addingReport) {
    return <AddReportForm onAdd={addReport} onCancel={() => setAddingReport(false)} />;
  }
  if (selectedReport) {
    return <ReportDetail report={selectedReport} onBack={() => setSelectedReport(null)} />;
  }

  if (selectedAlert) {
    const state = reviews[selectedAlert.id]?.state ?? selectedAlert.review;
    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => setSelectedAlert(null)}>Queue</button>
          <ConfidencePips value={reviews[selectedAlert.id]?.confidence ?? selectedAlert.confidence} />
        </div>
        <Badge className="w-fit capitalize">{selectedAlert.type.replace("_", " ")}</Badge>
        <h2 className="mt-2 font-display text-2xl font-medium leading-snug tracking-tight">{selectedAlert.title}</h2>
        <p className="mt-1 font-mono text-xs tabular-nums text-subtle">{formatUtc(selectedAlert.datetime)}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{selectedAlert.body}</p>
        {selectedAlert.negativeEvidence ? (
          <p className="mt-3 rounded-lg border border-civilian/30 bg-civilian/10 p-2 text-xs text-civilian">
            Negative evidence: {selectedAlert.negativeEvidence}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1">
          {selectedAlert.families.map((f) => <Badge key={f}>{f}</Badge>)}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-subtle">{CONFIDENCE_RUBRIC[selectedAlert.confidence]}</p>
        <div className="mt-3 space-y-1">
          {selectedAlert.siteIds.map((id) => {
            const s = SITES.find((x) => x.id === id);
            if (!s) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setSelectedAlert(null); setSelectedSite(id); }}
                className="block w-full rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:bg-raised"
              >
                Open {s.name}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-subtle">Review state: {state}. Nothing is confirmed without a human click.</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observational note. No perpetrator. No cargo claim."
          className="mt-2 min-h-20 w-full rounded-lg border border-border bg-raised p-2 text-sm"
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => applyReview("confirmed")}>
            <Check className="size-3.5" /> Confirm
          </Button>
          <Button size="sm" variant="secondary" onClick={() => applyReview("rejected")}>
            <X className="size-3.5" /> Reject
          </Button>
          <Button size="sm" variant="outline" className="col-span-2" onClick={() => applyReview("needs_imagery")}>
            Needs imagery
          </Button>
        </div>
      </div>
    );
  }

  if (selectedSite) {
    const token = (selectedSite.name.split(" ")[0] ?? "___").toLowerCase();
    return (
      <SiteDetail
        site={selectedSite}
        party={siteParty}
        obs={siteObs}
        flights={flights.filter((f) => f.nearestAirfield.toLowerCase().includes(token))}
        onClose={() => setSelectedSite(null)}
        overrideParty={overrideParty}
      />
    );
  }

  return (
    <QueueOrLog
      alerts={alerts}
      reviews={reviews}
      reviewFilter={reviewFilter}
      setReviewFilter={setReviewFilter}
      setSelectedAlert={setSelectedAlert}
      setSelectedSite={setSelectedSite}
      news={news}
      newsLoading={newsLoading}
      brief={brief}
      briefLoading={briefLoading}
      onRunBrief={onRunBrief}
      sitrep={sitrep}
      reports={allReports}
      onSelectReport={setSelectedReport}
      onAddReport={() => setAddingReport(true)}
      feeds={feeds ?? live?.feeds ?? []}
      feedsMeta={feedsMeta ?? live?.feedsMeta ?? null}
      briefingDoc={briefingDoc ?? null}
      onOpenAnno={onOpenAnno}
      fuae={fuae ?? []}
      onOpenFuae={onOpenFuae}
      detections={detections}
      onOpenFlag={onOpenFlag}
    />
  );
}

function QueueOrLog({
  alerts, reviews, reviewFilter, setReviewFilter, setSelectedAlert, setSelectedSite,
  news, newsLoading, brief, briefLoading, onRunBrief, sitrep, reports, onSelectReport, onAddReport,
  feeds, feedsMeta, briefingDoc, onOpenAnno, fuae, onOpenFuae, detections, onOpenFlag,
}: {
  alerts: typeof ALERTS;
  reviews: Record<string, { state: ReviewState; note: string; confidence: Confidence; at: string }>;
  reviewFilter: ReviewState | "all";
  setReviewFilter: (r: ReviewState | "all") => void;
  setSelectedAlert: (id: string | null) => void;
  setSelectedSite: (id: string | null) => void;
  news: NewsFeed | null;
  newsLoading: boolean;
  brief: AiBrief | null;
  briefLoading: boolean;
  onRunBrief: () => void;
  sitrep: Sitrep | null;
  reports: OsintReport[];
  onSelectReport: (id: string) => void;
  onAddReport: () => void;
  feeds: FeedItem[];
  feedsMeta: LiveMeta | null;
  briefingDoc: BriefingDoc | null;
  onOpenAnno?: (id: string) => void;
  fuae: FuaeRecord[];
  onOpenFuae?: (r: FuaeRecord) => void;
  detections: DetectHit[];
  onOpenFlag?: (f: Flag) => void;
}) {
  const rightTab = useAppStore((s) => s.rightTab);
  const setRightTab = useAppStore((s) => s.setRightTab);
  const listOrder = useAppStore((s) => s.listOrder);
  const setListOrder = useAppStore((s) => s.setListOrder);
  const reviewAlert = useAppStore((s) => s.reviewAlert);
  const trainModel = useAppStore((s) => s.trainModel);
  const setImagery = useAppStore((s) => s.setImagery);
  const [kind, setKind] = useState<"all" | "published" | "auto" | "archive">("all");
  const flags = mergeFlags(
    [reportsToFlags(reports), detectToFlags(detections), alertsToFlags(alerts)],
    listOrder,
  ).filter((f) => {
    if (kind !== "all" && f.kind !== kind) return false;
    if (reviewFilter === "all") return true;
    const state = reviews[f.id]?.state ?? f.review;
    return state === reviewFilter;
  });
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 px-3 pt-3">
        {([
          ["news", "News"],
          ["fuae", "FUAE"],
          ["rsf", "RSF"],
          ["log", "Log"],
          ["audit", "Audit"],
          ["queue", "Flags"],
          ["brief", "Brief"],
          ["reports", "Reports"],
          ["feeds", "Feeds"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setRightTab(id);
              if (id === "brief") {
                setSelectedAlert(null);
                setSelectedSite(null);
              }
            }}
            className={cn("h-8 rounded-lg px-2.5 text-xs", rightTab === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-raised")}
          >
            {label}
            {id === "news" && news?.items.length ? (
              <span className="ml-1 font-mono tabular-nums text-[10px] opacity-80">{news.items.length}</span>
            ) : null}
            {id === "rsf" ? (
              <span className="ml-1 font-mono tabular-nums text-[10px] opacity-80">{RSF_WATCH.length}</span>
            ) : null}
            {id === "queue" && flags.length ? (
              <span className="ml-1 font-mono tabular-nums text-[10px] opacity-80">{flags.length}</span>
            ) : null}
          </button>
        ))}
      </div>
      {rightTab === "log" ? (
        <ChangeLogList />
      ) : rightTab === "audit" ? (
        <AuditLogPanel />
      ) : rightTab === "news" ? (
        <NewsPanel data={news} loading={newsLoading} />
      ) : rightTab === "brief" ? (
        <BriefPanel data={brief} loading={briefLoading} onRun={onRunBrief} sitrep={sitrep} doc={briefingDoc} onOpenAnno={onOpenAnno} />
      ) : rightTab === "reports" ? (
        <ReportsList reports={reports} onSelect={onSelectReport} onAdd={onAddReport} />
      ) : rightTab === "feeds" ? (
        <FeedsPanel items={feeds} meta={feedsMeta} />
      ) : rightTab === "fuae" ? (
        <FuaePanel rows={fuae} onOpen={onOpenFuae ?? (() => {})} />
      ) : rightTab === "rsf" ? (
        <RsfWatchPanel
          onOpen={(w) => {
            onOpenFlag?.({
              id: w.id,
              title: w.name,
              body: w.note,
              lat: w.lat,
              lon: w.lon,
              date: `${w.lastSeen}T00:00:00Z`,
              type: "change",
              kind: "published",
              sourceLabel: w.sourceLabel,
              url: w.sourceUrl,
              confidence: 2,
              families: ["reporting"],
              siteId: w.siteId,
              review: "unreviewed",
            });
            if (w.siteId) setSelectedSite(w.siteId);
          }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="px-3 pt-2 text-[11px] leading-snug text-subtle">
            Searcher flags: published OSINT first (@AfriMEOSINT and archive posts), then auto chips. Newest on top. Observation, not identification.
          </p>
          <div className="flex flex-wrap items-center gap-1 px-3 pt-2">
            <OrderToggle order={listOrder} onChange={setListOrder} />
            {(["all", "published", "auto", "archive"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={cn(
                  "h-7 rounded-full border px-2 text-[11px]",
                  kind === id ? "border-accent bg-accent text-accent-fg" : "border-border text-muted",
                )}
              >
                {id === "all" ? "All" : id === "published" ? "Published" : id === "auto" ? "Auto chips" : "Archive"}
              </button>
            ))}
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value as ReviewState | "all")}
              className="ml-auto h-7 rounded-md border border-border bg-raised px-2 text-[11px]"
            >
              <option value="all">All review</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="needs_imagery">Needs imagery</option>
            </select>
          </div>
          <ul className="flex-1 overflow-y-auto px-3 py-2">
            {flags.length === 0 ? (
              <li className="p-3 text-sm text-muted">Nothing in this filter.</li>
            ) : (
              flags.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                onOpenFlag?.(f);
                if (ALERTS.some((a) => a.id === f.id)) {
                  setSelectedAlert(f.id);
                }
              }}
                    className="mb-1.5 w-full rounded-xl border border-border bg-surface/60 p-3 text-left hover:bg-raised"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug">{f.title}</span>
                      <span className={cn(
                        "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-wide",
                        f.kind === "published" ? "bg-accent text-accent-fg" : f.kind === "auto" ? "bg-raised text-fg" : "text-subtle",
                      )}>
                        {f.kind === "published" ? "PUB" : f.kind === "auto" ? "AUTO" : "ARC"}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{f.body}</span>
                    <span className="mt-1.5 flex items-center gap-2 text-xs text-subtle">
                      <span className="font-mono tabular-nums">{f.date.slice(0, 10)}</span>
                      <span>{f.sourceLabel}</span>
                      <span className="capitalize">{String(f.type).replace("_", " ")}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewAlert(f.id, "confirmed", "human verify", f.confidence);
                          if (f.features && f.modelKlass) trainModel(f.features, f.modelKlass, true);
                        }}
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg hover:bg-raised"
                      >
                        Confirm
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          reviewAlert(f.id, "rejected", "human reject", f.confidence);
                          if (f.features && f.modelKlass) trainModel(f.features, f.modelKlass, false);
                        }}
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted hover:bg-raised"
                      >
                        Reject
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFlag?.(f);
                          setImagery("hires");
                        }}
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted hover:bg-raised"
                      >
                        Esri
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFlag?.(f);
                          setImagery("gmaps");
                        }}
                        className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted hover:bg-raised"
                      >
                        Google
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function OrderToggle({ order, onChange }: { order: ListOrder; onChange: (o: ListOrder) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(order === "newest" ? "oldest" : "newest")}
      className="h-7 rounded-full border border-border px-2.5 font-mono text-[11px] text-fg"
      title="Toggle newest / oldest"
    >
      {order === "newest" ? "Newest first" : "Oldest first"}
    </button>
  );
}

function ChangeLogList() {
  const rows = useAppStore((s) => s.changeLog);
  const lastSweepAt = useAppStore((s) => s.lastSweepAt);
  const listOrder = useAppStore((s) => s.listOrder);
  const setListOrder = useAppStore((s) => s.setListOrder);
  const setFlyTarget = useAppStore((s) => s.setFlyTarget);
  const [fam, setFam] = useState<"all" | "vehicles" | "flight" | "corridor" | "damage" | "morphology" | "thermal" | "reporting">("all");
  const filtered = fam === "all" ? rows : rows.filter((e) => e.families.includes(fam));
  const shown = listOrder === "newest" ? filtered : [...filtered].reverse();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-4 pt-2 text-[11px] leading-snug text-subtle">
        {shown.length} records · {listOrder === "newest" ? "newest" : "oldest"} first. Public archive, not live occupancy.
        {lastSweepAt ? ` Sweep ${lastSweepAt.slice(0, 16).replace("T", " ")}Z.` : ""}
      </p>
      <div className="flex flex-wrap gap-1 px-3 pt-2">
        <OrderToggle order={listOrder} onChange={setListOrder} />
        {(["all", "vehicles", "flight", "corridor", "morphology", "damage", "thermal", "reporting"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFam(id)}
            className={cn(
              "h-7 rounded-full border px-2 text-[11px]",
              fam === id ? "border-accent bg-accent text-accent-fg" : "border-border text-muted",
            )}
          >
            {id === "all" ? "All" : id === "flight" ? "Air / cargo" : id === "vehicles" ? "Vehicles" : id === "corridor" ? "Movement" : id === "reporting" ? "News / OSINT" : id}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-y-auto px-3 py-2">
        {shown.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => {
                setFlyTarget({
                  lat: e.lat,
                  lon: e.lon,
                  zoom: 15.2,
                  label: e.title,
                  inspect: true,
                  date: e.firstSeen.slice(0, 10),
                });
              }}
              className="mb-1.5 w-full rounded-xl border border-border bg-surface/60 p-3 text-left hover:bg-raised"
            >
              <span className="font-mono text-[10px] tabular-nums text-subtle">{e.firstSeen.slice(0, 10)}</span>
              <span className="mt-0.5 block font-medium leading-snug">{e.title}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{e.body}</span>
              <span className="mt-1.5 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-subtle">
                <span>{e.source}</span>
                {e.negative ? <span className="text-civilian">negative</span> : null}
                {e.families.map((f) => (
                  <span key={f}>{f}</span>
                ))}
                {e.siteName ? <span>{e.siteName}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditLogPanel() {
  const audit = useAppStore((s) => s.audit);
  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-subtle">Audit log</h2>
      <p className="mt-1 text-[11px] leading-snug text-subtle">
        Party labels, review clicks, watch-box edits, and evidence archives. Who / when / why. Local analyst id until desk sign-in.
      </p>
      {audit.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No audit rows yet. Change a party label or confirm a flag to open the trail.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {audit.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-raised/40 px-3 py-2">
              <p className="font-mono text-[10px] tabular-nums text-subtle">
                {formatUtc(a.at)} · {a.actor}
              </p>
              <p className="mt-0.5 text-sm font-medium">{a.action}</p>
              <p className="text-xs text-muted">
                {a.target} — {a.reason}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SiteDetail({
  site, party, obs, flights, onClose, overrideParty,
}: {
  site: (typeof SITES)[number];
  party: Party;
  obs: typeof OBSERVATIONS;
  flights: FlightEvent[];
  onClose: () => void;
  overrideParty: (id: string, p: Party, reason: string) => void;
}) {
  const date = useAppStore((s) => s.date);
  const compareDate = useAppStore((s) => s.compareDate);
  const swipeOn = useAppStore((s) => s.swipeOn);
  const setSwipeOn = useAppStore((s) => s.setSwipeOn);
  const requestYardsZoom = useAppStore((s) => s.requestYardsZoom);
  const bbox = padBbox(site.lat, site.lon, 0.08);
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveNote, setArchiveNote] = useState<string | null>(null);
  const coords = `${site.lat.toFixed(5)}, ${site.lon.toFixed(5)}`;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="text-xs text-muted hover:text-fg" onClick={onClose}>Close</button>
        <ConfidencePips value={site.confidence} />
      </div>
      <h2 className="font-display text-2xl font-medium leading-snug tracking-tight">{site.name}</h2>
      <p className="mt-1 text-xs text-subtle">{site.kind} · {site.admin1} / {site.admin2} · {site.status}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge className={PARTY_TONE[party]}>{PARTY_LABEL[party]}</Badge>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-muted hover:text-fg"
          onClick={async () => {
            const ok = await copyText(coords);
            if (ok) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            }
          }}
        >
          <Copy className="size-3" />
          {copied ? "Copied" : coords}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {imageryLinks(site.lat, site.lon).map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 rounded-full border border-border px-2.5 text-[11px] leading-8 text-muted hover:text-fg"
          >
            {l.label}
          </a>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Button size="sm" onClick={() => requestYardsZoom()}>
          <Focus className="size-3.5" /> Zoom to yards
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setSwipeOn(!swipeOn)}>
          {swipeOn ? "Hide compare" : "Before / after"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="col-span-2"
          disabled={archiving}
          onClick={() => {
            setArchiving(true);
            setArchiveNote(null);
            void archiveSiteScene({ siteId: site.id, date, compareDate })
              .then((b) => setArchiveNote(`Archived ${b.id} · JSON + HTML downloaded`))
              .catch((e) => setArchiveNote(e instanceof Error ? e.message : "Archive failed"))
              .finally(() => setArchiving(false));
          }}
        >
          <Download className="size-3.5" /> {archiving ? "Archiving…" : "Screenshot + archive"}
        </Button>
      </div>
      {archiveNote ? <p className="mt-1 text-[11px] text-accent">{archiveNote}</p> : null}

      <div className="mt-3">
        {swipeOn ? (
          <SwipeCompare date={date} compareDate={compareDate} lat={site.lat} lon={site.lon} name={site.name} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <figure>
              <BrowseFrame date={compareDate} bbox={bbox} alt={`${site.name} on ${compareDate}`} />
              <figcaption className="mt-1 font-mono text-xs text-subtle">{compareDate}</figcaption>
            </figure>
            <figure>
              <BrowseFrame date={date} bbox={bbox} alt={`${site.name} on ${date}`} />
              <figcaption className="mt-1 font-mono text-xs text-subtle">{date}</figcaption>
            </figure>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{site.notes}</p>
      <p className="mt-2 rounded-lg border border-border bg-raised p-2 text-xs leading-relaxed text-muted">
        Civilian baseline: {site.civilianBaseline}
      </p>
      <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-subtle">Party assessment</h3>
      <p className="mt-1 text-xs text-subtle">Changing a party label writes an audit row. Reason required.</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(["saf", "rsf", "mixed", "other_armed", "civilian", "unknown"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={cn("h-8 rounded-full border px-2.5 text-xs", party === p ? "border-accent bg-accent text-accent-fg" : "border-border")}
            onClick={() => {
              const r = reason.trim();
              if (!r || r.startsWith("State why")) {
                setReason("");
                return;
              }
              overrideParty(site.id, p, r);
            }}
          >
            {PARTY_LABEL[p]}
          </button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this party label?" className="mt-2 h-10 w-full rounded-lg border border-border bg-raised px-2 text-sm" />
      <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-subtle">Forced questions (airlift)</h3>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
        <li>Where did the aircraft arrive? — unknown unless a ground event is in ADS-B or a clear scene.</li>
        <li>What ground vehicles met it? — not visible at 10 m unless a later scene shows them.</li>
        <li>Where did those vehicles go? — do not invent an answer if the next image is cloudy.</li>
      </ul>
      <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-subtle">Timeline</h3>
      <ol className="mt-2 space-y-2">
        {obs.map((o) => (
          <li key={o.id} className="rounded-xl border border-border p-2">
            <p className="font-mono text-xs text-subtle">{formatUtc(o.datetime)} · {o.sensor} · cloud {o.cloudPct}%</p>
            <p className="mt-1 text-sm leading-relaxed">{o.notes}</p>
            <p className="mt-1 text-xs text-subtle">scene {o.sceneId}</p>
          </li>
        ))}
        {obs.length === 0 ? <li className="text-sm text-muted">No archived observations yet.</li> : null}
      </ol>
      {flights.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-subtle">Nearby airframes</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {flights.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5">
                <span>{f.typeCode} · {f.hex} · {f.category} · {f.operator || "unknown"}</span>
                <button
                  type="button"
                  className="shrink-0 text-[10px] uppercase tracking-wide text-accent hover:underline"
                  onClick={() => {
                    void archiveFlight({ flight: f }).catch(() => undefined);
                  }}
                >
                  Archive
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-subtle">Corroboration</h3>
      <ul className="mt-1 space-y-1 text-xs text-muted">
        {CITATIONS.slice(0, 3).map((c) => (
          <li key={c.id}><a href={c.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{c.publisher}: {c.title}</a></li>
        ))}
      </ul>
    </div>
  );
}

export function SwipeCompare({ date, compareDate, lat, lon, name }: { date: string; compareDate: string; lat: number; lon: number; name: string }) {
  const [pct, setPct] = useState(50);
  const bbox = padBbox(lat, lon, 0.1);
  const imagery = useAppStore((s) => s.imagery);
  const layer =
    imagery === "s2"
      ? "HLS_S30_Nadir_BRDF_Adjusted_Reflectance"
      : "VIIRS_NOAA20_CorrectedReflectance_TrueColor";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg">
      <p className="px-2 py-1.5 text-xs text-muted">Before / after · {name}</p>
      <div className="relative aspect-[4/3]">
        <img src={snapshotUrl(compareDate, bbox, layer)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <img src={snapshotUrl(date, bbox, layer)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 0 ${pct}%)` }} />
        <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="absolute inset-x-2 bottom-2" aria-label="Swipe compare" />
      </div>
      <div className="flex justify-between px-2 py-1 font-mono text-[10px] text-subtle">
        <span>{compareDate}</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
