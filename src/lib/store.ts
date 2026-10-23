import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ALERTS, WATCH_BOXES } from "@/data/catalog";
import { seedChangeLog, sortLog } from "@/lib/changelog";
import type { ControlCity, ControlUpdate, ZoneEdit } from "@/lib/control";
import { partyToFaction } from "@/lib/control";
import type { OsintReport } from "@/lib/osint";
import type { FuaeRecord } from "@/lib/fuae";
import { DEFAULT_WEIGHTS, trainChip, type ChipFeatures, type ModelKlass } from "@/lib/chip-model";
import type { ListOrder } from "@/lib/flags";
import type { TheaterId } from "@/lib/theaters";
import type { LookId } from "@/lib/looks";
import { daysAgo } from "@/lib/utils";
import type {
  AuditEntry,
  ChangeEntry,
  Confidence,
  ImagerySource,
  Party,
  ReviewState,
  WatchBox,
} from "@/lib/types";

export type LayerKey =
  | "sites"
  | "firms"
  | "flights"
  | "boxes"
  | "gibs"
  | "thermalRaster"
  | "control"
  | "news"
  | "reports"
  | "ai"
  | "gdelt"
  | "osm"
  | "vessels"
  | "corridors"
  | "rsfWatch"
  | "vista"
  | "quakes"
  | "sats"
  | "eonet"
  | "launches"
  | "freight"
  | "grid"
  | "lanes"
  | "conflict";

export const LAYERS_OFF: Record<LayerKey, boolean> = {
  sites: false,
  firms: false,
  flights: false,
  boxes: false,
  gibs: false,
  thermalRaster: false,
  control: false,
  news: false,
  reports: false,
  ai: false,
  gdelt: false,
  osm: false,
  vessels: false,
  corridors: false,
  rsfWatch: false,
  vista: false,
  quakes: false,
  sats: false,
  eonet: false,
  launches: false,
  freight: false,
  grid: false,
  lanes: false,
  conflict: false,
};

/** Bump when the quiet-map default should replace a saved "everything on" layout once. */
const LAYER_EPOCH = 3;

export type RightTab = "queue" | "reports" | "news" | "brief" | "feeds" | "log" | "audit" | "fuae" | "rsf";

export interface FlyTarget {
  lat: number;
  lon: number;
  zoom: number;
  label?: string;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  inspect?: boolean;
  /** Snap GIBS / HLS to this acquisition day when slewing. */
  date?: string;
  /** Search: north-up, no pitch, so the point sits under the crosshair. */
  flat?: boolean;
}

interface Review {
  state: ReviewState;
  note: string;
  confidence: Confidence;
  at: string;
}

interface PartyOverride {
  party: Party;
  reason: string;
  at: string;
}

interface AppState {
  selectedSiteId: string | null;
  selectedAlertId: string | null;
  focusedBoxId: string | null;
  yardsZoom: boolean;
  partyFilter: Party | "all";
  kindFilter: string;
  reviewFilter: ReviewState | "all";
  layers: Record<LayerKey, boolean>;
  layerEpoch: number;
  imagery: ImagerySource;
  date: string;
  compareDate: string;
  swipeOn: boolean;
  query: string;
  reviews: Record<string, Review>;
  partyOverrides: Record<string, PartyOverride>;
  customBoxes: WatchBox[];
  hiddenBoxIds: string[];
  audit: AuditEntry[];
  changeLog: ChangeEntry[];
  lastSweepAt: string | null;
  helpOpen: boolean;
  helpSeen: boolean;
  customReports: OsintReport[];
  selectedReportId: string | null;
  addingReport: boolean;
  rightTab: RightTab;
  hudOn: boolean;
  detectOn: boolean;
  theaterId: TheaterId;
  controlUpdates: ControlUpdate[];
  deskCities: ControlCity[] | null;
  deskZones: ZoneEdit[] | null;
  searchPin: { lat: number; lon: number; label: string } | null;
  flyTarget: FlyTarget | null;
  dateLock: boolean;
  fuaeLog: FuaeRecord[];
  listOrder: ListOrder;
  setSelectedSite: (id: string | null) => void;
  setSelectedAlert: (id: string | null) => void;
  setFocusedBox: (id: string | null) => void;
  requestYardsZoom: () => void;
  clearYardsZoom: () => void;
  setPartyFilter: (p: Party | "all") => void;
  setKindFilter: (k: string) => void;
  setReviewFilter: (r: ReviewState | "all") => void;
  toggleLayer: (k: LayerKey) => void;
  setImagery: (i: ImagerySource) => void;
  setDate: (d: string) => void;
  setCompareDate: (d: string) => void;
  setSwipeOn: (v: boolean) => void;
  setQuery: (q: string) => void;
  reviewAlert: (id: string, state: ReviewState, note: string, confidence: Confidence) => void;
  overrideParty: (siteId: string, party: Party, reason: string) => void;
  pushAudit: (action: string, target: string, reason: string) => void;
  addBox: (box: WatchBox) => void;
  removeBox: (id: string) => void;
  hideDefaultBox: (id: string) => void;
  replaceLog: (rows: ChangeEntry[]) => void;
  setLastSweepAt: (iso: string) => void;
  setHelpOpen: (v: boolean) => void;
  addReport: (r: OsintReport) => void;
  setSelectedReport: (id: string | null) => void;
  setAddingReport: (v: boolean) => void;
  setRightTab: (t: RightTab) => void;
  setHudOn: (v: boolean) => void;
  setDetectOn: (v: boolean) => void;
  setTheater: (id: TheaterId) => void;
  addControlUpdate: (u: ControlUpdate) => void;
  setDeskCities: (rows: ControlCity[] | null) => void;
  setDeskZones: (rows: ZoneEdit[] | null) => void;
  setSearchPin: (pin: { lat: number; lon: number; label: string } | null) => void;
  setFlyTarget: (t: FlyTarget | null) => void;
  setDateLock: (v: boolean) => void;
  ingestFuae: (rows: FuaeRecord[]) => void;
  setListOrder: (o: ListOrder) => void;
  modelWeights: typeof DEFAULT_WEIGHTS;
  trainModel: (features: ChipFeatures, klass: ModelKlass, confirmed: boolean) => void;
  setModelWeights: (w: typeof DEFAULT_WEIGHTS) => void;
  chipSamples: Array<{ features: ChipFeatures; klass: ModelKlass; label: 0 | 1; at: string }>;
  look: LookId;
  setLook: (l: LookId) => void;
  orbitOn: boolean;
  setOrbitOn: (v: boolean) => void;
  globeOn: boolean;
  setGlobeOn: (v: boolean) => void;
}

function stamp(): string {
  return new Date().toISOString();
}

function audit(action: string, target: string, reason: string): AuditEntry {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: stamp(),
    actor: "local-analyst",
    action,
    target,
    reason,
  };
}

const defaultReviews: Record<string, Review> = {};
for (const a of ALERTS) {
  if (a.review !== "unreviewed") {
    defaultReviews[a.id] = {
      state: a.review,
      note: a.negativeEvidence || "Seeded review from archive.",
      confidence: a.confidence,
      at: a.datetime,
    };
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedSiteId: null,
      selectedAlertId: null,
      focusedBoxId: null,
      yardsZoom: false,
      partyFilter: "all",
      kindFilter: "all",
      reviewFilter: "all",
      layers: { ...LAYERS_OFF },
      layerEpoch: LAYER_EPOCH,
      imagery: "s2cloudless",
      date: daysAgo(4),
      compareDate: daysAgo(14),
      swipeOn: false,
      query: "",
      reviews: defaultReviews,
      partyOverrides: {},
      customBoxes: [],
      hiddenBoxIds: [],
      audit: [],
      changeLog: seedChangeLog(),
      lastSweepAt: null,
      helpOpen: false,
      helpSeen: false,
      customReports: [],
      selectedReportId: null,
      addingReport: false,
      rightTab: "queue",
      hudOn: true,
      detectOn: true,
      look: "none",
      orbitOn: false,
      globeOn: false,
      theaterId: "sdn",
      controlUpdates: [],
      deskCities: null,
      deskZones: null,
      searchPin: null,
      flyTarget: null,
      dateLock: false,
      fuaeLog: [],
      listOrder: "newest",
      modelWeights: DEFAULT_WEIGHTS,
      chipSamples: [],
      setSelectedSite: (id) => set({ selectedSiteId: id, focusedBoxId: null, selectedReportId: null }),
      setSelectedAlert: (id) => set({ selectedAlertId: id }),
      setFocusedBox: (id) => set({ focusedBoxId: id, selectedSiteId: null, selectedAlertId: null }),
      requestYardsZoom: () => set({ yardsZoom: true, imagery: "hires" }),
      clearYardsZoom: () => set({ yardsZoom: false }),
      setPartyFilter: (p) => set({ partyFilter: p }),
      setKindFilter: (k) => set({ kindFilter: k }),
      setReviewFilter: (r) => set({ reviewFilter: r }),
      toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
      setImagery: (i) => set({ imagery: i }),
      setDate: (d) => set({ date: d }),
      setCompareDate: (d) => set({ compareDate: d }),
      setSwipeOn: (v) => set({ swipeOn: v }),
      setQuery: (q) => set({ query: q }),
      reviewAlert: (id, state, note, confidence) =>
        set((s) => {
          const alert = ALERTS.find((a) => a.id === id);
          const nextUpdates = [...s.controlUpdates];
          if (state === "confirmed" && alert && alert.families.includes("corridor")) {
            nextUpdates.unshift({
              id: `cu-${id}`,
              lat: alert.lat,
              lon: alert.lon,
              faction: "contested",
              date: stamp().slice(0, 10),
              label: alert.title,
              source: "analyst-confirmed queue",
            });
          }
          return {
            reviews: {
              ...s.reviews,
              [id]: { state, note, confidence, at: stamp() },
            },
            controlUpdates: nextUpdates.slice(0, 80),
            audit: [
              audit("review-alert", id, `${state} · c${confidence} · ${note || "no note"}`),
              ...s.audit,
            ].slice(0, 200),
          };
        }),
      overrideParty: (siteId, party, reason) =>
        set((s) => ({
          partyOverrides: {
            ...s.partyOverrides,
            [siteId]: { party, reason, at: stamp() },
          },
          audit: [audit("party-label", siteId, `${party} · ${reason}`), ...s.audit].slice(0, 200),
        })),
      pushAudit: (action, target, reason) =>
        set((s) => ({
          audit: [audit(action, target, reason), ...s.audit].slice(0, 200),
        })),
      addBox: (box) =>
        set((s) => ({
          customBoxes: [...s.customBoxes, box],
          audit: [audit("watchbox-add", box.id, box.name), ...s.audit].slice(0, 200),
        })),
      removeBox: (id) =>
        set((s) => ({
          customBoxes: s.customBoxes.filter((b) => b.id !== id),
          audit: [audit("watchbox-remove", id, "removed custom box"), ...s.audit].slice(0, 200),
        })),
      hideDefaultBox: (id) =>
        set((s) => ({
          hiddenBoxIds: [...s.hiddenBoxIds, id],
          audit: [audit("watchbox-hide", id, "hid default box"), ...s.audit].slice(0, 200),
        })),
      replaceLog: (rows) => set({ changeLog: sortLog(rows) }),
      setLastSweepAt: (iso) => set({ lastSweepAt: iso }),
      setHelpOpen: (v) => set(v ? { helpOpen: true } : { helpOpen: false, helpSeen: true }),
      addReport: (r) =>
        set((s) => {
          const faction = r.category === "control-change" ? partyToFaction(r.party) : null;
          const controlUpdates = faction
            ? [
                {
                  id: `cu-${r.id}`,
                  lat: r.lat,
                  lon: r.lon,
                  faction,
                  date: r.date,
                  label: r.title,
                  source: r.sourceLabel,
                },
                ...s.controlUpdates,
              ].slice(0, 80)
            : s.controlUpdates;
          return {
            customReports: [r, ...s.customReports],
            selectedReportId: r.id,
            addingReport: false,
            rightTab: "reports",
            controlUpdates,
            audit: [audit("report-add", r.id, r.title), ...s.audit].slice(0, 200),
          };
        }),
      setSelectedReport: (id) =>
        set({ selectedReportId: id, selectedSiteId: null, selectedAlertId: null, addingReport: false, rightTab: "reports" }),
      setAddingReport: (v) => set({ addingReport: v, selectedReportId: null, rightTab: "reports" }),
      setRightTab: (t) => set({ rightTab: t, addingReport: false }),
      setHudOn: (hudOn) => set({ hudOn }),
      setDetectOn: (detectOn) => set({ detectOn }),
      setLook: (look) => set((s) => ({ look, hudOn: look === "none" ? s.hudOn : true })),
      setOrbitOn: (orbitOn) => set({ orbitOn }),
      setGlobeOn: (globeOn) => set({ globeOn }),
      setTheater: (theaterId) => set({ theaterId }),
      addControlUpdate: (u) =>
        set((s) => ({ controlUpdates: [u, ...s.controlUpdates].slice(0, 80) })),
      setDeskCities: (deskCities) => set({ deskCities }),
      setDeskZones: (deskZones) => set({ deskZones }),
      setSearchPin: (searchPin) => set({ searchPin }),
      setFlyTarget: (flyTarget) =>
        set((s) => {
          if (!flyTarget) return { flyTarget: null };
          const day = flyTarget.date?.slice(0, 10);
          const dated = day && /^\d{4}-\d{2}-\d{2}$/.test(day);
          const inspect = Boolean(flyTarget.inspect) || flyTarget.zoom >= 11;
          const next: Partial<AppState> = {
            flyTarget,
            selectedSiteId: null,
            orbitOn: false,
            globeOn: inspect ? false : s.globeOn,
          };
          if (typeof window !== "undefined") {
            queueMicrotask(() =>
              window.dispatchEvent(
                new CustomEvent("ahsr-slew-to", {
                  detail: {
                    lon: flyTarget.lon,
                    lat: flyTarget.lat,
                    zoom: flyTarget.zoom,
                    label: flyTarget.label,
                    date: dated ? day : undefined,
                    flat: flyTarget.flat || undefined,
                  },
                }),
              ),
            );
          }
          return next;
        }),
      setDateLock: (dateLock) => set({ dateLock }),
      ingestFuae: (rows) =>
        set((s) => {
          if (!rows.length && s.fuaeLog.length) return s;
          const map = new Map(s.fuaeLog.map((r) => [r.id, r]));
          for (const row of rows) {
            const prev = map.get(row.id);
            map.set(row.id, prev ? { ...prev, ...row, firstSeen: prev.firstSeen, lastSeen: row.lastSeen } : row);
          }
          return {
            fuaeLog: [...map.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 200),
          };
        }),
      setListOrder: (listOrder) => set({ listOrder }),
      trainModel: (features, klass, confirmed) =>
        set((s) => ({
          modelWeights: trainChip(s.modelWeights, features, klass, confirmed),
          chipSamples: [
            { features, klass, label: (confirmed ? 1 : 0) as 0 | 1, at: new Date().toISOString() },
            ...s.chipSamples,
          ].slice(0, 400),
          audit: [audit("chip-train", klass, confirmed ? "confirm" : "reject"), ...s.audit].slice(0, 200),
        })),
      setModelWeights: (modelWeights) => set({ modelWeights }),
    }),
    {
      name: "ahsr-sudan-v2",
      partialize: (s) => ({
        reviews: s.reviews,
        partyOverrides: s.partyOverrides,
        customBoxes: s.customBoxes,
        hiddenBoxIds: s.hiddenBoxIds,
        audit: s.audit,
        imagery: s.imagery,
        changeLog: s.changeLog,
        lastSweepAt: s.lastSweepAt,
        helpSeen: s.helpSeen,
        customReports: s.customReports,
        hudOn: s.hudOn,
        detectOn: s.detectOn,
        theaterId: s.theaterId,
        controlUpdates: s.controlUpdates,
        dateLock: s.dateLock,
        fuaeLog: s.fuaeLog,
        listOrder: s.listOrder,
        modelWeights: s.modelWeights,
        chipSamples: s.chipSamples,
        look: s.look,
        globeOn: s.globeOn,
        layers: s.layers,
        layerEpoch: s.layerEpoch,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const seeded = seedChangeLog();
        const have = new Map((p.changeLog ?? []).map((e) => [e.id, e]));
        for (const row of seeded) {
          if (!have.has(row.id)) have.set(row.id, row);
        }
        return {
          ...current,
          ...p,
          changeLog: sortLog([...have.values()]),
          layers: (p.layerEpoch ?? 0) >= LAYER_EPOCH ? { ...LAYERS_OFF, ...(p.layers ?? {}) } : { ...LAYERS_OFF },
          layerEpoch: LAYER_EPOCH,
          controlUpdates: p.controlUpdates ?? [],
          fuaeLog: p.fuaeLog ?? [],
          listOrder: p.listOrder === "oldest" ? "oldest" : "newest",
          modelWeights: p.modelWeights ?? DEFAULT_WEIGHTS,
          chipSamples: Array.isArray(p.chipSamples) ? p.chipSamples.slice(0, 400) : [],
          look: p.look === "crt" || p.look === "nvg" || p.look === "flir" || p.look === "noir" || p.look === "snow" ? p.look : "none",
          globeOn: Boolean(p.globeOn),
          helpSeen: Boolean(p.helpSeen) || p.helpOpen === false,
        };
      },
    },
  ),
);

export function useVisibleBoxes(): WatchBox[] {
  const custom = useAppStore((s) => s.customBoxes);
  const hidden = useAppStore((s) => s.hiddenBoxIds);
  return [...WATCH_BOXES.filter((b) => !hidden.includes(b.id)), ...custom];
}
