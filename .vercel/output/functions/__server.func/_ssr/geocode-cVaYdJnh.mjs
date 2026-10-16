import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/geocode-cVaYdJnh.js
function parseCoord(raw) {
	const text = raw.trim();
	let m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])\s*[, ]+\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])\s*$/);
	if (m) {
		const lat = Number(m[1]) * (m[2].toUpperCase() === "S" ? -1 : 1);
		const lon = Number(m[3]) * (m[4].toUpperCase() === "W" ? -1 : 1);
		if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return {
			lat,
			lon
		};
	}
	m = text.match(/^\s*([NSns])\s*(-?\d+(?:\.\d+)?)\s*°?\s*[, ]+\s*([EWew])\s*(-?\d+(?:\.\d+)?)\s*°?\s*$/);
	if (m) {
		const lat = Number(m[2]) * (m[1].toUpperCase() === "S" ? -1 : 1);
		const lon = Number(m[4]) * (m[3].toUpperCase() === "W" ? -1 : 1);
		if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return {
			lat,
			lon
		};
	}
	m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
	if (!m) return null;
	const a = Number(m[1]);
	const b = Number(m[2]);
	if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return {
		lat: a,
		lon: b
	};
	if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return {
		lat: b,
		lon: a
	};
	return null;
}
function zoomFor(addrType) {
	const t = addrType.toLowerCase();
	if (t.includes("country")) return 4.8;
	if (t.includes("region") || t.includes("territory")) return 6.4;
	if (t.includes("locality") || t.includes("city") || t.includes("town") || t.includes("village")) return 12.2;
	if (t.includes("point") || t.includes("street") || t.includes("address") || t.includes("poi")) return 16;
	return 12;
}
function hitsFromEsri(json, q) {
	const out = [];
	for (const [i, c] of (json.candidates ?? []).entries()) {
		const lon = c.location?.x;
		const lat = c.location?.y;
		if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
		const kind = c.attributes?.Addr_type || "place";
		const name = c.address || c.attributes?.Match_addr || q;
		out.push({
			id: `esri-${i}-${lat.toFixed(4)}-${lon.toFixed(4)}`,
			name,
			label: kind.replace(/([A-Z])/g, " $1").trim(),
			lat,
			lon,
			kind,
			zoom: zoomFor(kind)
		});
	}
	return out;
}
function esriUrl(q) {
	return `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&maxLocations=6&outFields=Match_addr,Addr_type&singleLine=${encodeURIComponent(q)}`;
}
/** Browser fallback if the server geocoder is blocked. Same Esri service, no key. */
var searchPlaces_createServerFn_handler = createServerRpc({
	id: "33d678bbd3293e97edbdec6667561944b41aad741d99f3636ecf3eadf833e3e1",
	name: "searchPlaces",
	filename: "src/lib/geocode.ts"
}, (opts) => searchPlaces.__executeServer(opts));
var searchPlaces = createServerFn({ method: "GET" }).inputValidator((data) => ({ q: String(data?.q ?? "").trim().slice(0, 160) })).handler(searchPlaces_createServerFn_handler, async ({ data }) => {
	const q = data.q;
	if (q.length < 2 || parseCoord(q)) return [];
	const res = await fetch(esriUrl(q), { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
	return hitsFromEsri(await res.json(), q);
});
//#endregion
export { searchPlaces_createServerFn_handler };
