//#region node_modules/.nitro/vite/services/ssr/assets/mapbox-geometry-BoWK2e9L.js
function geodesicBbox(lon, lat, sizeKm) {
	const dy = sizeKm / 111.32;
	const dx = sizeKm / (111.32 * Math.max(.2, Math.cos(lat * Math.PI / 180)));
	return [
		lon - dx / 2,
		lat - dy / 2,
		lon + dx / 2,
		lat + dy / 2
	];
}
/** Actual upstream Mapbox MCP tool execution, kept on the server. Falls back to geodesic envelope. */
async function analysisBounds(lon, lat, sizeKm) {
	if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 179 || Math.abs(lat) > 80 || !Number.isFinite(sizeKm) || sizeKm <= 0 || sizeKm > 10) throw new Error("Invalid analysis area");
	try {
		const [{ buffer }, { boundingBox, validateGeojson }] = await Promise.all([import("../_libs/@mapbox/mcp-server+[...].mjs").then((n) => n.t), import("../_libs/@mapbox/mcp-devkit-server+[...].mjs").then((n) => n.t)]);
		const result = await buffer.run({
			geometry: [lon, lat],
			distance: sizeKm / Math.SQRT2,
			units: "kilometers"
		});
		if (result.isError || !result.structuredContent?.bufferedPolygon) throw new Error("Mapbox buffer calculation failed");
		const geojson = {
			type: "Polygon",
			coordinates: result.structuredContent.bufferedPolygon
		};
		const validation = await validateGeojson.run({ geojson });
		if (validation.isError || validation.structuredContent?.valid !== true) throw new Error("Analysis geometry did not pass Mapbox validation");
		const bounds = await boundingBox.run({ geojson });
		const bbox = bounds.structuredContent?.bbox;
		if (bounds.isError || !Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) throw new Error("Mapbox bounding box calculation failed");
		return bbox;
	} catch {
		return geodesicBbox(lon, lat, sizeKm);
	}
}
async function validateAnalysisGeometry(geojson) {
	try {
		const { validateGeojson } = await import("../_libs/@mapbox/mcp-devkit-server+[...].mjs").then((n) => n.t);
		const result = await validateGeojson.run({ geojson });
		if (result.isError || result.structuredContent?.valid !== true) throw new Error("Change geometries failed GeoJSON validation");
	} catch {
		if (geojson?.type !== "FeatureCollection") throw new Error("Change geometries failed GeoJSON validation");
	}
}
//#endregion
export { validateAnalysisGeometry as n, analysisBounds as t };
