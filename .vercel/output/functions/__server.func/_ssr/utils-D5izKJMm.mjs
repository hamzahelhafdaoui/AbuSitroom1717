import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-D5izKJMm.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatUtc(iso) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toISOString().slice(0, 16).replace("T", " ") + "Z";
}
function daysAgo(n) {
	const d = /* @__PURE__ */ new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}
function downloadBlob(filename, mime, body) {
	const blob = new Blob([body], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.rel = "noopener";
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	window.setTimeout(() => {
		a.remove();
		URL.revokeObjectURL(url);
	}, 1500);
}
function mapCommand(cmd) {
	window.dispatchEvent(new CustomEvent("sahel-map", { detail: cmd }));
}
function mapFit(bbox) {
	window.dispatchEvent(new CustomEvent("sahel-map-fit", { detail: bbox }));
}
function mapMeasure() {
	window.dispatchEvent(new CustomEvent("sahel-map-measure"));
}
async function copyText(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
function snapshotUrl(date, bbox, layer = "VIIRS_NOAA20_CorrectedReflectance_TrueColor", size = 768) {
	const { west, south, east, north } = bbox;
	const png = layer.includes("HLS");
	return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${new URLSearchParams({
		SERVICE: "WMS",
		REQUEST: "GetMap",
		VERSION: "1.3.0",
		LAYERS: layer,
		CRS: "EPSG:4326",
		BBOX: `${south},${west},${north},${east}`,
		WIDTH: String(size),
		HEIGHT: String(size),
		FORMAT: png ? "image/png" : "image/jpeg",
		TIME: date,
		STYLES: "",
		TRANSPARENT: png ? "TRUE" : "FALSE"
	}).toString()}`;
}
var PARTY_TONE = {
	saf: "bg-saf/15 text-saf border-saf/30",
	rsf: "bg-rsf/15 text-rsf border-rsf/30",
	mixed: "bg-mixed/15 text-mixed border-mixed/30",
	other_armed: "bg-other/15 text-other border-other/30",
	civilian: "bg-civilian/15 text-civilian border-civilian/30",
	unknown: "bg-unknown/15 text-unknown border-unknown/30"
};
//#endregion
export { downloadBlob as a, mapFit as c, daysAgo as i, mapMeasure as l, cn as n, formatUtc as o, copyText as r, mapCommand as s, PARTY_TONE as t, snapshotUrl as u };
