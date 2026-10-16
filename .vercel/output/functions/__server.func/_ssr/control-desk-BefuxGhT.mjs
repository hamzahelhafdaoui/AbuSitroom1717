import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { r as createServerFn } from "./ssr.mjs";
import { a as FACTION_META, l as reportsToLog, o as SEED_REPORTS } from "./osint-wXO3XaAY.mjs";
import { i as signOut, r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { t as authMiddleware } from "./middleware-rxgVnsQw.mjs";
import { g as seedZoneEdits, h as partyToFaction, r as CONTROL_CITIES } from "./control-BsiNbWqm.mjs";
import { a as hasGateSessionMarker, t as GROK_PROVIDERS } from "./server-CqEGP_J5.mjs";
import { i as daysAgo } from "./utils-D5izKJMm.mjs";
import { _ as gdeltFamily, f as REGIONAL_EVENTS, g as createSsrRpc, h as WATCH_BOXES, l as GDELT_ARCHIVE, n as ALERTS, p as SITES, r as ARCHIVE_EVENTS, u as OBSERVATIONS } from "./warroom-data-iyrVJsgQ.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/control-desk-BefuxGhT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function siteName(id) {
	if (!id) return void 0;
	return SITES.find((s) => s.id === id)?.name;
}
function seedChangeLog() {
	const rows = ALERTS.map((a) => ({
		id: `log-${a.id}`,
		firstSeen: a.datetime,
		lastSeen: a.datetime,
		title: a.title,
		body: a.negativeEvidence ? `${a.body} Negative evidence: ${a.negativeEvidence}` : a.body,
		siteId: a.siteIds[0],
		siteName: siteName(a.siteIds[0]),
		families: a.families,
		source: "archive",
		confidence: a.confidence,
		lat: a.lat,
		lon: a.lon,
		negative: Boolean(a.negativeEvidence)
	}));
	const covered = new Set(ALERTS.flatMap((a) => a.observationIds));
	for (const o of OBSERVATIONS) {
		if (covered.has(o.id)) continue;
		const site = SITES.find((s) => s.id === o.siteId);
		rows.push({
			id: `log-${o.id}`,
			firstSeen: o.datetime,
			lastSeen: o.datetime,
			title: `${site?.name ?? o.siteId} · ${o.sensor}`,
			body: o.notes,
			siteId: o.siteId,
			siteName: site?.name,
			families: o.indicators,
			source: "archive",
			confidence: o.confidence,
			lat: site?.lat ?? 0,
			lon: site?.lon ?? 0,
			negative: o.indicators.includes("thermal") && site?.kind === "farm"
		});
	}
	const have = new Set(rows.map((r) => r.id));
	for (const e of ARCHIVE_EVENTS) {
		if (have.has(e.id)) continue;
		const name = e.siteName || siteName(e.siteId);
		rows.push({
			...e,
			siteName: name
		});
		have.add(e.id);
	}
	for (const e of reportsToLog(SEED_REPORTS)) {
		if (have.has(e.id)) continue;
		rows.push(e);
		have.add(e.id);
	}
	for (const e of REGIONAL_EVENTS) {
		if (have.has(e.id)) continue;
		rows.push(e);
		have.add(e.id);
	}
	for (const g of GDELT_ARCHIVE) {
		const id = `log-${g.id}`;
		if (have.has(id)) continue;
		rows.push({
			id,
			firstSeen: `${g.date}T00:00:00Z`,
			lastSeen: `${g.date}T00:00:00Z`,
			title: `${g.subtype} · ${g.name}`,
			body: g.notes,
			families: gdeltFamily(g.subtype),
			source: "gdelt",
			confidence: g.source === "archive" ? 2 : 1,
			lat: g.lat,
			lon: g.lon
		});
		have.add(id);
	}
	return sortLog(rows);
}
function sortLog(rows) {
	return [...rows].sort((a, b) => {
		const c = b.firstSeen.localeCompare(a.firstSeen);
		if (c !== 0) return c;
		return b.id.localeCompare(a.id);
	});
}
function firmsIso(acqDate, acqTime) {
	return `${acqDate}T${(acqTime || "0000").padStart(4, "0").slice(0, 2)}:${(acqTime || "0000").padStart(4, "0").slice(2, 4)}:00Z`;
}
function ingestLive(bundle, existing) {
	const byId = new Map(existing.map((e) => [e.id, e]));
	let added = 0;
	const upsert = (entry) => {
		const prev = byId.get(entry.id);
		if (!prev) {
			byId.set(entry.id, entry);
			added += 1;
			return;
		}
		const firstSeen = entry.firstSeen < prev.firstSeen ? entry.firstSeen : prev.firstSeen;
		const lastSeen = entry.lastSeen > prev.lastSeen ? entry.lastSeen : prev.lastSeen;
		byId.set(entry.id, {
			...prev,
			firstSeen,
			lastSeen
		});
	};
	const agSeen = /* @__PURE__ */ new Set();
	for (const t of bundle.firms) {
		const when = firmsIso(t.acqDate, t.acqTime);
		const name = siteName(t.siteId) ?? "unanchored";
		if (t.klass === "agricultural") {
			const dayKey = `log-firms-ag-${t.siteId ?? "none"}-${t.acqDate}`;
			if (agSeen.has(dayKey)) continue;
			agSeen.add(dayKey);
			upsert({
				id: dayKey,
				firstSeen: when,
				lastSeen: when,
				title: `Seasonal / agricultural thermal · ${name}`,
				body: `FIRMS cluster classed agricultural (FRP ${t.frp.toFixed(1)}). Default is harvest or residue burning, not combat. Negative evidence unless a later optical scene shows otherwise.`,
				siteId: t.siteId,
				siteName: siteName(t.siteId),
				families: ["thermal"],
				source: "firms",
				confidence: 2,
				lat: t.lat,
				lon: t.lon,
				negative: true
			});
			continue;
		}
		if (!t.siteId && t.klass === "unknown") continue;
		upsert({
			id: `log-firms-${t.id}`,
			firstSeen: when,
			lastSeen: when,
			title: `Thermal anomaly · ${name}`,
			body: `VIIRS ${t.satellite} FRP ${t.frp.toFixed(1)} · class ${t.klass.replace("_", " ")} · ${t.daynight === "N" ? "night" : "day"}. Thermal anomaly is not a strike. Optical follow-up required.`,
			siteId: t.siteId,
			siteName: siteName(t.siteId),
			families: ["thermal"],
			source: "firms",
			confidence: t.klass === "possible_explosive" ? 2 : 1,
			lat: t.lat,
			lon: t.lon
		});
	}
	for (const v of bundle.vessels ?? []) {
		if (!v.live) continue;
		upsert({
			id: `log-ves-${v.id}`,
			firstSeen: (/* @__PURE__ */ new Date()).toISOString(),
			lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
			title: `Maritime contact · ${v.name}`,
			body: `${v.kind} · dest ${v.destination}. ${v.notes} AIS is a public broadcast, not a cargo claim.`,
			families: ["corridor"],
			source: "vessel",
			confidence: 1,
			lat: v.lat,
			lon: v.lon
		});
	}
	for (const f of bundle.flights) {
		if (!f.relevant) continue;
		upsert({
			id: `log-fl-${f.hex}-${f.firstSeen.slice(0, 13)}`,
			firstSeen: f.firstSeen,
			lastSeen: f.lastSeen,
			title: `${f.typeCode} ${f.hex} · ${f.category}`,
			body: `${f.notes} Nearest: ${f.nearestAirfield}. Category is airframe-typical, not a cargo claim.`,
			families: ["flight"],
			source: "flight",
			confidence: f.confidence,
			lat: f.lat,
			lon: f.lon
		});
	}
	for (const r of bundle.reports) {
		if (!r.date) continue;
		upsert({
			id: `log-${r.id}`,
			firstSeen: `${r.date}T00:00:00Z`,
			lastSeen: `${r.date}T00:00:00Z`,
			title: r.title,
			body: `${r.publisher}. Humanitarian corroboration, not ground truth. ${r.note}`,
			families: ["reporting"],
			source: "report",
			confidence: 2,
			lat: 15.6,
			lon: 32.5
		});
	}
	for (const n of bundle.news) {
		if (!n.date) continue;
		upsert({
			id: `log-${n.id}`,
			firstSeen: n.date,
			lastSeen: n.date,
			title: n.title,
			body: `${n.source}. Google News headline. Named-place geolocation is approximate — not an incident coordinate.`,
			families: ["reporting"],
			source: "report",
			confidence: 1,
			lat: 15.5,
			lon: 32.5
		});
	}
	for (const g of bundle.gdelt ?? []) {
		const when = `${g.date}T00:00:00Z`;
		upsert({
			id: `log-${g.id}`,
			firstSeen: when,
			lastSeen: when,
			title: `${g.subtype} · ${g.name}`,
			body: g.notes,
			families: gdeltFamily(g.subtype),
			source: "gdelt",
			confidence: g.live ? 1 : 2,
			lat: g.lat,
			lon: g.lon
		});
	}
	for (const f of bundle.feeds ?? []) upsert({
		id: `log-${f.id}`,
		firstSeen: f.timestamp,
		lastSeen: f.timestamp,
		title: `${f.channel} · ${f.text.slice(0, 88)}`,
		body: `${f.text.slice(0, 400)} Public Telegram preview. Single-source until corroborated.`,
		families: ["reporting"],
		source: "feed",
		confidence: 1,
		lat: f.lat ?? 15.5,
		lon: f.lon ?? 32.5
	});
	return {
		next: sortLog([...byId.values()]),
		added
	};
}
/** Priors from published stills — compact objects on desert, scorch, apron. */
var DEFAULT_WEIGHTS = {
	none: {
		blobs: -.15,
		hv: -.2,
		edge: -.4,
		exg: 1.2,
		red: -.2,
		delta: -.4,
		meanL: 0,
		bias: .4
	},
	camp: {
		blobs: .22,
		hv: .5,
		edge: .8,
		exg: -1.4,
		red: .1,
		delta: .6,
		meanL: .2,
		bias: -.9
	},
	veh: {
		blobs: .28,
		hv: .3,
		edge: .5,
		exg: -1.2,
		red: 0,
		delta: .3,
		meanL: .15,
		bias: -.8
	},
	berm: {
		blobs: .04,
		hv: 1.6,
		edge: 1.2,
		exg: -.8,
		red: 0,
		delta: .4,
		meanL: 0,
		bias: -.7
	},
	burn: {
		blobs: .02,
		hv: .1,
		edge: .3,
		exg: -1,
		red: 2.4,
		delta: 1.8,
		meanL: .1,
		bias: -.85
	},
	wreck_air: {
		blobs: .12,
		hv: .4,
		edge: .7,
		exg: -.6,
		red: 1.1,
		delta: 1.4,
		meanL: .4,
		bias: -.95
	},
	wreck_bldg: {
		blobs: .05,
		hv: .6,
		edge: .9,
		exg: -.4,
		red: .8,
		delta: 1.6,
		meanL: .2,
		bias: -.9
	},
	cargo: {
		blobs: .18,
		hv: .45,
		edge: .7,
		exg: -1,
		red: 0,
		delta: .7,
		meanL: .35,
		bias: -.75
	}
};
var LR = .04;
function dot(w, x) {
	return w.bias + w.blobs * x.blobs + w.hv * x.hv + w.edge * x.edge + w.exg * x.exg + w.red * x.red + w.delta * x.delta + w.meanL * x.meanL;
}
function predictChip(x, weights = DEFAULT_WEIGHTS) {
	const scores = {};
	let best = "none";
	let bestV = -Infinity;
	Object.keys(weights).forEach((k) => {
		const v = dot(weights[k], x);
		scores[k] = v;
		if (v > bestV) {
			bestV = v;
			best = k;
		}
	});
	return {
		klass: best,
		score: bestV,
		scores
	};
}
function trainChip(weights, x, klass, confirmed) {
	const next = structuredClone(weights);
	const w = next[klass];
	const s = confirmed ? LR : -.04;
	w.blobs += s * x.blobs;
	w.hv += s * x.hv;
	w.edge += s * x.edge;
	w.exg += s * x.exg;
	w.red += s * x.red;
	w.delta += s * x.delta;
	w.meanL += s * x.meanL;
	w.bias += s;
	return next;
}
function modelToKlass(k) {
	if (k === "camp") return "camp_buildup";
	if (k === "veh") return "vehicle_park";
	if (k === "berm") return "earthwork";
	if (k === "burn") return "burn_scar";
	if (k === "wreck_air") return "wreck_air";
	if (k === "wreck_bldg") return "wreck_bldg";
	if (k === "cargo") return "cargo_yard";
	return "unresolved_objects";
}
function featuresFromShape(shape, sm, delta) {
	return {
		blobs: Math.min(shape.blobs, 24),
		hv: shape.hv,
		edge: shape.edge,
		exg: sm.exg,
		red: sm.red,
		delta,
		meanL: sm.meanL
	};
}
function serializeWeights(w) {
	return JSON.stringify({
		version: 1,
		kind: "ahsr-chip-weights",
		weights: w
	}, null, 2);
}
function parseWeights(raw) {
	try {
		const j = JSON.parse(raw);
		if (!j.weights) return null;
		const next = structuredClone(DEFAULT_WEIGHTS);
		Object.keys(DEFAULT_WEIGHTS).forEach((k) => {
			if (j.weights?.[k]) next[k] = {
				...DEFAULT_WEIGHTS[k],
				...j.weights[k]
			};
		});
		return next;
	} catch {
		return null;
	}
}
function stamp() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function audit(action, target, reason) {
	return {
		id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		at: stamp(),
		actor: "local-analyst",
		action,
		target,
		reason
	};
}
var defaultReviews = {};
for (const a of ALERTS) if (a.review !== "unreviewed") defaultReviews[a.id] = {
	state: a.review,
	note: a.negativeEvidence || "Seeded review from archive.",
	confidence: a.confidence,
	at: a.datetime
};
var useAppStore = create()(persist((set) => ({
	selectedSiteId: null,
	selectedAlertId: null,
	focusedBoxId: null,
	yardsZoom: false,
	partyFilter: "all",
	kindFilter: "all",
	reviewFilter: "all",
	layers: {
		sites: true,
		firms: true,
		flights: true,
		boxes: true,
		gibs: true,
		thermalRaster: false,
		control: true,
		news: true,
		reports: true,
		ai: true,
		gdelt: true,
		osm: false,
		vessels: true,
		corridors: true,
		rsfWatch: true,
		vista: true,
		quakes: true,
		sats: true,
		eonet: true,
		launches: true,
		freight: true,
		grid: false,
		lanes: true,
		conflict: true
	},
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
	setSelectedSite: (id) => set({
		selectedSiteId: id,
		focusedBoxId: null,
		selectedReportId: null
	}),
	setSelectedAlert: (id) => set({ selectedAlertId: id }),
	setFocusedBox: (id) => set({
		focusedBoxId: id,
		selectedSiteId: null,
		selectedAlertId: null
	}),
	requestYardsZoom: () => set({
		yardsZoom: true,
		imagery: "hires"
	}),
	clearYardsZoom: () => set({ yardsZoom: false }),
	setPartyFilter: (p) => set({ partyFilter: p }),
	setKindFilter: (k) => set({ kindFilter: k }),
	setReviewFilter: (r) => set({ reviewFilter: r }),
	toggleLayer: (k) => set((s) => ({ layers: {
		...s.layers,
		[k]: !s.layers[k]
	} })),
	setImagery: (i) => set({ imagery: i }),
	setDate: (d) => set({ date: d }),
	setCompareDate: (d) => set({ compareDate: d }),
	setSwipeOn: (v) => set({ swipeOn: v }),
	setQuery: (q) => set({ query: q }),
	reviewAlert: (id, state, note, confidence) => set((s) => {
		const alert = ALERTS.find((a) => a.id === id);
		const nextUpdates = [...s.controlUpdates];
		if (state === "confirmed" && alert && alert.families.includes("corridor")) nextUpdates.unshift({
			id: `cu-${id}`,
			lat: alert.lat,
			lon: alert.lon,
			faction: "contested",
			date: stamp().slice(0, 10),
			label: alert.title,
			source: "analyst-confirmed queue"
		});
		return {
			reviews: {
				...s.reviews,
				[id]: {
					state,
					note,
					confidence,
					at: stamp()
				}
			},
			controlUpdates: nextUpdates.slice(0, 80),
			audit: [audit("review-alert", id, `${state} · c${confidence} · ${note || "no note"}`), ...s.audit].slice(0, 200)
		};
	}),
	overrideParty: (siteId, party, reason) => set((s) => ({
		partyOverrides: {
			...s.partyOverrides,
			[siteId]: {
				party,
				reason,
				at: stamp()
			}
		},
		audit: [audit("party-label", siteId, `${party} · ${reason}`), ...s.audit].slice(0, 200)
	})),
	addBox: (box) => set((s) => ({
		customBoxes: [...s.customBoxes, box],
		audit: [audit("watchbox-add", box.id, box.name), ...s.audit].slice(0, 200)
	})),
	removeBox: (id) => set((s) => ({
		customBoxes: s.customBoxes.filter((b) => b.id !== id),
		audit: [audit("watchbox-remove", id, "removed custom box"), ...s.audit].slice(0, 200)
	})),
	hideDefaultBox: (id) => set((s) => ({
		hiddenBoxIds: [...s.hiddenBoxIds, id],
		audit: [audit("watchbox-hide", id, "hid default box"), ...s.audit].slice(0, 200)
	})),
	replaceLog: (rows) => set({ changeLog: sortLog(rows) }),
	setLastSweepAt: (iso) => set({ lastSweepAt: iso }),
	setHelpOpen: (v) => set(v ? { helpOpen: true } : {
		helpOpen: false,
		helpSeen: true
	}),
	addReport: (r) => set((s) => {
		const faction = r.category === "control-change" ? partyToFaction(r.party) : null;
		const controlUpdates = faction ? [{
			id: `cu-${r.id}`,
			lat: r.lat,
			lon: r.lon,
			faction,
			date: r.date,
			label: r.title,
			source: r.sourceLabel
		}, ...s.controlUpdates].slice(0, 80) : s.controlUpdates;
		return {
			customReports: [r, ...s.customReports],
			selectedReportId: r.id,
			addingReport: false,
			rightTab: "reports",
			controlUpdates,
			audit: [audit("report-add", r.id, r.title), ...s.audit].slice(0, 200)
		};
	}),
	setSelectedReport: (id) => set({
		selectedReportId: id,
		selectedSiteId: null,
		selectedAlertId: null,
		addingReport: false,
		rightTab: "reports"
	}),
	setAddingReport: (v) => set({
		addingReport: v,
		selectedReportId: null,
		rightTab: "reports"
	}),
	setRightTab: (t) => set({
		rightTab: t,
		addingReport: false
	}),
	setHudOn: (hudOn) => set({ hudOn }),
	setDetectOn: (detectOn) => set({ detectOn }),
	setLook: (look) => set((s) => ({
		look,
		hudOn: look === "none" ? s.hudOn : true
	})),
	setOrbitOn: (orbitOn) => set({ orbitOn }),
	setGlobeOn: (globeOn) => set({ globeOn }),
	setTheater: (theaterId) => set({ theaterId }),
	addControlUpdate: (u) => set((s) => ({ controlUpdates: [u, ...s.controlUpdates].slice(0, 80) })),
	setDeskCities: (deskCities) => set({ deskCities }),
	setDeskZones: (deskZones) => set({ deskZones }),
	setSearchPin: (searchPin) => set({ searchPin }),
	setFlyTarget: (flyTarget) => set((s) => {
		if (!flyTarget) return { flyTarget: null };
		const day = flyTarget.date?.slice(0, 10);
		const dated = day && /^\d{4}-\d{2}-\d{2}$/.test(day);
		const next = {
			flyTarget,
			selectedSiteId: null,
			orbitOn: false,
			globeOn: Boolean(flyTarget.inspect) || flyTarget.zoom >= 11 ? false : s.globeOn
		};
		if (typeof window !== "undefined") queueMicrotask(() => window.dispatchEvent(new CustomEvent("ahsr-slew-to", { detail: {
			lon: flyTarget.lon,
			lat: flyTarget.lat,
			zoom: flyTarget.zoom,
			label: flyTarget.label,
			date: dated ? day : void 0,
			flat: flyTarget.flat || void 0
		} })));
		return next;
	}),
	setDateLock: (dateLock) => set({ dateLock }),
	ingestFuae: (rows) => set((s) => {
		if (!rows.length && s.fuaeLog.length) return s;
		const map = new Map(s.fuaeLog.map((r) => [r.id, r]));
		for (const row of rows) {
			const prev = map.get(row.id);
			map.set(row.id, prev ? {
				...prev,
				...row,
				firstSeen: prev.firstSeen,
				lastSeen: row.lastSeen
			} : row);
		}
		return { fuaeLog: [...map.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 200) };
	}),
	setListOrder: (listOrder) => set({ listOrder }),
	trainModel: (features, klass, confirmed) => set((s) => ({
		modelWeights: trainChip(s.modelWeights, features, klass, confirmed),
		chipSamples: [{
			features,
			klass,
			label: confirmed ? 1 : 0,
			at: (/* @__PURE__ */ new Date()).toISOString()
		}, ...s.chipSamples].slice(0, 400),
		audit: [audit("chip-train", klass, confirmed ? "confirm" : "reject"), ...s.audit].slice(0, 200)
	})),
	setModelWeights: (modelWeights) => set({ modelWeights })
}), {
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
		globeOn: s.globeOn
	}),
	merge: (persisted, current) => {
		const p = persisted ?? {};
		const seeded = seedChangeLog();
		const have = new Map((p.changeLog ?? []).map((e) => [e.id, e]));
		for (const row of seeded) if (!have.has(row.id)) have.set(row.id, row);
		return {
			...current,
			...p,
			changeLog: sortLog([...have.values()]),
			layers: {
				...current.layers,
				...p.layers ?? {},
				control: true,
				flights: true,
				vessels: true,
				osm: p.layers?.osm ?? false,
				gdelt: p.layers?.gdelt ?? true,
				corridors: p.layers?.corridors ?? true,
				rsfWatch: p.layers?.rsfWatch ?? true,
				vista: p.layers?.vista ?? true,
				quakes: p.layers?.quakes ?? true,
				sats: p.layers?.sats ?? true,
				eonet: p.layers?.eonet ?? true,
				launches: p.layers?.launches ?? true,
				freight: p.layers?.freight ?? true,
				grid: p.layers?.grid ?? false,
				lanes: p.layers?.lanes ?? true,
				conflict: p.layers?.conflict ?? true
			},
			controlUpdates: p.controlUpdates ?? [],
			fuaeLog: p.fuaeLog ?? [],
			listOrder: p.listOrder === "oldest" ? "oldest" : "newest",
			modelWeights: p.modelWeights ?? DEFAULT_WEIGHTS,
			chipSamples: Array.isArray(p.chipSamples) ? p.chipSamples.slice(0, 400) : [],
			look: p.look === "crt" || p.look === "nvg" || p.look === "flir" || p.look === "noir" || p.look === "snow" ? p.look : "none",
			globeOn: Boolean(p.globeOn),
			helpSeen: Boolean(p.helpSeen) || p.helpOpen === false
		};
	}
}));
function useVisibleBoxes() {
	const custom = useAppStore((s) => s.customBoxes);
	const hidden = useAppStore((s) => s.hiddenBoxIds);
	return [...WATCH_BOXES.filter((b) => !hidden.includes(b.id)), ...custom];
}
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
var FACTIONS = /* @__PURE__ */ new Set([
	"saf",
	"rsf",
	"splm-n",
	"contested"
]);
var CONFS = /* @__PURE__ */ new Set([
	"high",
	"moderate",
	"low"
]);
function asFaction(v) {
	return FACTIONS.has(v) ? v : "contested";
}
function asConf(v) {
	return CONFS.has(v) ? v : "low";
}
function cleanCities(rows) {
	return rows.slice(0, 80).map((c) => ({
		id: String(c.id || "").slice(0, 80) || `cc-${c.lat.toFixed(3)}-${c.lon.toFixed(3)}`,
		name: String(c.name || "Unnamed").slice(0, 80),
		lat: Number(c.lat),
		lon: Number(c.lon),
		faction: asFaction(String(c.faction)),
		asOf: String(c.asOf || "").slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		confidence: asConf(String(c.confidence)),
		note: String(c.note || "").slice(0, 400),
		source: String(c.source || "Desk admin").slice(0, 120)
	})).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon) && Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180);
}
function cleanZones(rows) {
	const allowed = new Set(seedZoneEdits().map((z) => z.id));
	return rows.filter((z) => allowed.has(z.id)).map((z) => ({
		id: z.id,
		faction: asFaction(String(z.faction)),
		label: String(z.label || z.id).slice(0, 80),
		note: String(z.note || "").slice(0, 400),
		confidence: asConf(String(z.confidence))
	}));
}
var getDesk = createServerFn({ method: "GET" }).handler(createSsrRpc("27eea1047ca4f567dbfa6ca2ef3ee69285ddee2fa8e5f68bd3f061a3c1931f7a"));
var deskRole = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("965211bce2b967de6cc0a0bc76fd95a2a6bb44d3de5585b8d0176515f97256f7"));
var claimDesk = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("ad0526d30eb6b94e90d94a73b4004d482613d3c72975d3b679dac1833152db51"));
var saveDesk = createServerFn({ method: "POST" }).middleware([authMiddleware]).inputValidator((data) => ({
	cities: cleanCities(Array.isArray(data?.cities) ? data.cities : []),
	zones: cleanZones(Array.isArray(data?.zones) ? data.zones : [])
})).handler(createSsrRpc("25694659f57d8cb1dab129277585d925fdc6da5ea215e03c8718552dfbf761b1"));
var FACTION_IDS = Object.keys(FACTION_META);
function ControlDeskLoader() {
	const setDeskCities = useAppStore((s) => s.setDeskCities);
	const setDeskZones = useAppStore((s) => s.setDeskZones);
	(0, import_react.useEffect)(() => {
		getDesk().then((d) => {
			setDeskCities(d.cities);
			setDeskZones(d.zones);
		}).catch(() => {});
	}, [setDeskCities, setDeskZones]);
	return null;
}
function AccountSignIn() {
	const [mode, setMode] = (0, import_react.useState)("in");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		setErr(null);
		try {
			const res = mode === "up" ? await authClient.signUp.email({
				email,
				password,
				name: name || email,
				callbackURL: "/"
			}) : await authClient.signIn.email({
				email,
				password,
				callbackURL: "/"
			});
			if (res.error) throw new Error(res.error.message || "Sign-in failed");
		} catch (error) {
			setErr(error instanceof Error ? error.message : "Sign-in failed");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] leading-snug text-muted",
				children: "Researchers can look without an account. Editing needs a sign-in, and only the account that locks the desk can save."
			}),
			GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => signIn(p.providerId, { callbackURL: "/" }),
				className: "h-9 w-full border border-border text-xs hover:bg-raised",
				children: ["Continue with ", p.label]
			}, p.providerId)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => void submit(e),
				className: "space-y-2 border-t border-border pt-2",
				children: [
					mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "Name",
						className: "h-9 w-full border border-border bg-transparent px-2 text-sm"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "email",
						required: true,
						value: email,
						onChange: (e) => setEmail(e.target.value),
						placeholder: "Email",
						autoComplete: "email",
						className: "h-9 w-full border border-border bg-transparent px-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "password",
						required: true,
						minLength: 8,
						value: password,
						onChange: (e) => setPassword(e.target.value),
						placeholder: "Password (8+ characters)",
						autoComplete: mode === "up" ? "new-password" : "current-password",
						className: "h-9 w-full border border-border bg-transparent px-2 text-sm"
					}),
					err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-damage",
						children: err
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: busy,
						className: "h-9 w-full bg-accent text-xs font-medium text-accent-fg disabled:opacity-60",
						children: busy ? "Working…" : mode === "up" ? "Create admin account" : "Sign in with email"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "text-[11px] text-muted underline-offset-2 hover:underline",
						onClick: () => setMode(mode === "up" ? "in" : "up"),
						children: mode === "up" ? "Already have an account? Sign in" : "No account yet? Create one"
					})
				]
			})
		]
	});
}
function ControlDesk({ onClose }) {
	const { user, isPending } = useCurrentUserState();
	const cities = useAppStore((s) => s.deskCities);
	const zones = useAppStore((s) => s.deskZones);
	const setDeskCities = useAppStore((s) => s.setDeskCities);
	const setDeskZones = useAppStore((s) => s.setDeskZones);
	const searchPin = useAppStore((s) => s.searchPin);
	const [role, setRole] = (0, import_react.useState)(null);
	const [roleErr, setRoleErr] = (0, import_react.useState)(null);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [town, setTown] = (0, import_react.useState)("");
	const list = cities ?? CONTROL_CITIES;
	const zoneList = zones ?? seedZoneEdits();
	(0, import_react.useEffect)(() => {
		if (!user) {
			setRole(null);
			return;
		}
		deskRole().then((r) => {
			setRole(r);
			setRoleErr(null);
		}).catch(() => setRoleErr("Could not check the admin lock."));
	}, [user]);
	function patchCity(id, patch) {
		setDeskCities(list.map((c) => c.id === id ? {
			...c,
			...patch
		} : c));
	}
	function patchZone(id, patch) {
		setDeskZones(zoneList.map((z) => z.id === id ? {
			...z,
			...patch
		} : z));
	}
	async function lock() {
		setBusy(true);
		setMsg(null);
		try {
			await claimDesk();
			setRole({
				isAdmin: true,
				claimed: true
			});
			setMsg("This account is now the only one that can edit. Do this again on the published site — the preview lock does not carry over.");
		} catch (error) {
			setMsg(error instanceof Error ? error.message : "Could not lock editing.");
		} finally {
			setBusy(false);
		}
	}
	async function save() {
		setBusy(true);
		setMsg(null);
		try {
			const saved = await saveDesk({ data: {
				cities: list,
				zones: zoneList
			} });
			setDeskCities(saved.cities);
			setDeskZones(saved.zones);
			setMsg("Saved. Anyone who opens the desk sees this. Only this account can change it.");
		} catch (error) {
			setMsg(error instanceof Error ? error.message : "Save failed.");
		} finally {
			setBusy(false);
		}
	}
	function addTown() {
		if (!searchPin) {
			setMsg("Search a town or paste coordinates first. Then add that place.");
			return;
		}
		const row = {
			id: `cc-${Date.now()}`,
			name: town.trim() || searchPin.label,
			lat: searchPin.lat,
			lon: searchPin.lon,
			faction: "saf",
			asOf: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
			confidence: "low",
			note: "Marked by the desk admin from open reporting. Not a survey.",
			source: "Desk admin"
		};
		setDeskCities([row, ...list]);
		setTown("");
		setMsg(`Added ${row.name}. Save to publish it.`);
	}
	const canEdit = Boolean(role?.isAdmin);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "hud-panel pointer-events-auto flex max-h-[min(34rem,calc(100dvh-10rem))] flex-col overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-2 border-b border-border px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] tracking-[0.16em] text-accent",
				children: "CONTROL DESK"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] leading-snug text-muted",
				children: "Open-source sketch, not a live front. Colored fills stay on the dark map. Town dots and outlines stay on satellite."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onClose,
				className: "text-xs text-muted hover:text-fg",
				children: "Close"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2",
			children: [
				isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "Checking account…"
				}) : null,
				!isPending && !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountSignIn, {}) : null,
				user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}),
						roleErr ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-damage",
							children: roleErr
						}) : null,
						role && !role.claimed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: () => void lock(),
							className: "h-9 w-full bg-accent text-xs font-medium text-accent-fg",
							children: "Lock editing to this account"
						}) : null,
						role?.claimed && !role.isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] leading-snug text-muted",
							children: "Read only. Another account already locked map edits."
						}) : null,
						canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 border border-border p-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-[10px] tracking-wider text-muted",
									children: "ADD A TOWN"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-muted",
									children: searchPin ? `Using search pin: ${searchPin.label}` : "Search a place first so the pin is the town you mean."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: town,
									onChange: (e) => setTown(e.target.value),
									placeholder: "Town name",
									className: "h-8 w-full border border-border bg-transparent px-2 text-sm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: addTown,
									className: "h-8 w-full border border-border text-xs hover:bg-raised",
									children: "Add the searched place"
								})
							]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[10px] tracking-wider text-muted",
							children: "TOWNS"
						}),
						list.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-[1fr_auto] gap-1 border-b border-border py-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm",
										children: c.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "font-mono text-[10px] text-subtle",
										children: [
											c.lat.toFixed(2),
											", ",
											c.lon.toFixed(2)
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									disabled: !canEdit,
									value: c.faction,
									onChange: (e) => patchCity(c.id, { faction: e.target.value }),
									className: "h-8 border border-border bg-bg text-xs",
									children: FACTION_IDS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: id,
										children: FACTION_META[id].label.split("—")[0]?.trim()
									}, id))
								}),
								canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "date",
									value: c.asOf,
									onChange: (e) => patchCity(c.id, { asOf: e.target.value }),
									className: "col-span-2 h-8 border border-border bg-transparent px-2 text-xs"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "col-span-2 text-[10px] text-subtle",
									children: [
										c.asOf,
										" · ",
										c.confidence
									]
								})
							]
						}, c.id)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[10px] tracking-wider text-muted",
							children: "REGIONS"
						}),
						zoneList.map((z) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1 border-b border-border py-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: z.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								disabled: !canEdit,
								value: z.faction,
								onChange: (e) => patchZone(z.id, {
									faction: e.target.value,
									confidence: "low"
								}),
								className: "h-8 w-full border border-border bg-bg text-xs",
								children: FACTION_IDS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: id,
									children: id
								}, id))
							})]
						}, z.id)),
						canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: () => void save(),
							className: "h-9 w-full bg-accent text-xs font-medium text-accent-fg disabled:opacity-60",
							children: busy ? "Saving…" : "Save control"
						}) : null,
						msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] leading-snug text-muted",
							children: msg
						}) : null
					]
				}) : null
			]
		})]
	});
}
//#endregion
export { featuresFromShape as a, parseWeights as c, useAppStore as d, useCurrentUserState as f, DEFAULT_WEIGHTS as i, predictChip as l, ControlDesk as n, ingestLive as o, useVisibleBoxes as p, ControlDeskLoader as r, modelToKlass as s, AccountSignIn as t, serializeWeights as u };
