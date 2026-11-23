import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/s1-D5DY2kt4.js
var getS1Scene_createServerFn_handler = createServerRpc({
	id: "30dbc1fe50005d0e6ae9b69af5445e5a4bea7cb6e6708914d1eaba1ea5564d12",
	name: "getS1Scene",
	filename: "src/lib/s1.ts"
}, (opts) => getS1Scene.__executeServer(opts));
var getS1Scene = createServerFn({ method: "GET" }).inputValidator((data) => {
	return { date: /^\d{4}-\d{2}-\d{2}$/.test(data?.date ?? "") ? data.date : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) };
}).handler(getS1Scene_createServerFn_handler, async ({ data }) => {
	const day = Date.parse(`${data.date}T00:00:00Z`);
	const start = (/* @__PURE__ */ new Date(day - 3456e5)).toISOString();
	const end = new Date(day + 864e5).toISOString();
	const res = await fetch("https://planetarycomputer.microsoft.com/api/stac/v1/search", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		body: JSON.stringify({
			collections: ["sentinel-1-rtc"],
			bbox: [
				24,
				12,
				34,
				16
			],
			datetime: `${start}/${end}`,
			limit: 1
		})
	});
	if (!res.ok) return {
		tiles: null,
		item: null,
		sensed: null,
		note: `S1 gap · Planetary Computer HTTP ${res.status}. Not a negative.`
	};
	const feat = (await res.json()).features?.[0];
	const tilejson = feat?.assets?.tilejson?.href;
	if (!feat || !tilejson) return {
		tiles: null,
		item: null,
		sensed: null,
		note: `S1 gap · no GRD scene over the Darfur–Khartoum box within 4 days of ${data.date}. Cloud gap stays a gap.`
	};
	const tj = await fetch(tilejson);
	if (!tj.ok) return {
		tiles: null,
		item: feat.id,
		sensed: feat.properties?.datetime ?? null,
		note: `S1 gap · tilejson HTTP ${tj.status} for ${feat.id}.`
	};
	const tiles = (await tj.json()).tiles?.[0] ?? null;
	if (!tiles) return {
		tiles: null,
		item: feat.id,
		sensed: feat.properties?.datetime ?? null,
		note: `S1 gap · ${feat.id} has no tile template.`
	};
	return {
		tiles,
		item: feat.id,
		sensed: feat.properties?.datetime?.slice(0, 10) ?? null,
		note: `S1 RTC ${feat.id}. One scene, not a mosaic. Morphology and change context only. Speckle is not wreckage. DET does not run on this layer.`
	};
});
//#endregion
export { getS1Scene_createServerFn_handler };
