import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { t as analysisBounds } from "./mapbox-geometry-BoWK2e9L.mjs";
import { t as createRequestCache } from "./request-cache-DFna8z3y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/freight-service-D3629T0r.js
/**
* Fisser et al. 2022 Sentinel-2 motion-smear screening (DrishX / S2TruckDetect).
* Large-vehicle *candidates* from B02/B03/B04 1.01s offset. Not a vehicle ID, not cargo, not military.
*/
var OFFSET_S = 1.01;
function compass(deg) {
	return [
		"N",
		"NE",
		"E",
		"SE",
		"S",
		"SW",
		"W",
		"NW"
	][Math.round(deg / 45) % 8];
}
function ratio(a, b) {
	const s = a + b;
	return s < 1e-6 ? 0 : (a - b) / s;
}
/** Classify pixels 0=bg, 2=blue, 3=green, 4=red using RGB variance + peak band. */
function classifySmear(r, g, b, valid, n) {
	const cls = new Int8Array(n);
	let varSum = 0;
	let varN = 0;
	for (let i = 0; i < n; i++) {
		if (!valid[i]) continue;
		const mean = (r[i] + g[i] + b[i]) / 3;
		const v = ((r[i] - mean) ** 2 + (g[i] - mean) ** 2 + (b[i] - mean) ** 2) / 3;
		varSum += v;
		varN++;
	}
	const varCut = varN ? varSum / varN * 1.8 : 1;
	for (let i = 0; i < n; i++) {
		if (!valid[i]) continue;
		const rv = r[i], gv = g[i], bv = b[i];
		const mean = (rv + gv + bv) / 3;
		if (((rv - mean) ** 2 + (gv - mean) ** 2 + (bv - mean) ** 2) / 3 < varCut) continue;
		const rb = ratio(rv, bv);
		const gb = ratio(gv, bv);
		if (bv >= gv && bv >= rv && rb < -.04) cls[i] = 2;
		else if (gv >= rv && gv >= bv && gb > .02) cls[i] = 3;
		else if (rv >= gv && rv >= bv && rb > .04) cls[i] = 4;
	}
	return cls;
}
function extractSmears(cls, width, height, toLonLat, road) {
	const n = width * height;
	const seen = new Uint8Array(n);
	const hits = [];
	const dirs = [
		[-1, 0],
		[1, 0],
		[0, -1],
		[0, 1],
		[-1, -1],
		[1, 1],
		[-1, 1],
		[1, -1]
	];
	for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
		const i = y * width + x;
		if (cls[i] !== 2 || seen[i]) continue;
		if (road && !road[i]) continue;
		const stack = [i];
		seen[i] = 1;
		const pix = [];
		while (stack.length) {
			const p = stack.pop();
			pix.push(p);
			const px = p % width, py = p / width | 0;
			for (const [dx, dy] of dirs) {
				const nx = px + dx, ny = py + dy;
				if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
				const ni = ny * width + nx;
				if (seen[ni] || cls[ni] === 0) continue;
				seen[ni] = 1;
				stack.push(ni);
			}
		}
		if (pix.length < 3 || pix.length > 28) continue;
		let hasG = false, hasR = false;
		let minX = width, minY = height, maxX = 0, maxY = 0;
		let bx = 0, by = 0, bn = 0, rx = 0, ry = 0, rn = 0;
		for (const p of pix) {
			const c = cls[p];
			if (c === 3) hasG = true;
			if (c === 4) hasR = true;
			const px = p % width, py = p / width | 0;
			if (px < minX) minX = px;
			if (py < minY) minY = py;
			if (px > maxX) maxX = px;
			if (py > maxY) maxY = py;
			if (c === 2) {
				bx += px;
				by += py;
				bn++;
			}
			if (c === 4) {
				rx += px;
				ry += py;
				rn++;
			}
		}
		const bw = maxX - minX + 1, bh = maxY - minY + 1;
		if (!hasG || !hasR || bw > 6 || bh > 6 || bw < 3 && bh < 3) continue;
		const score = pix.length / 8 + (hasG && hasR ? .8 : 0);
		if (score <= 1.2) continue;
		const diameter = Math.max(bw, bh) * 10 - 10;
		const speed = Math.sqrt(Math.max(diameter, 10) * 20) / OFFSET_S * 3.6;
		const vx = (bn ? bx / bn : minX) - (rn ? rx / rn : maxX);
		const vy = (rn ? ry / rn : maxY) - (bn ? by / bn : minY);
		const heading = (Math.atan2(vx, vy) * 180 / Math.PI + 360) % 360;
		const [lon, lat] = toLonLat((minX + maxX) / 2, (minY + maxY) / 2);
		hits.push({
			lat,
			lon,
			speedKmh: Math.round(speed * 10) / 10,
			heading: Math.round(heading * 10) / 10,
			headingDesc: compass(heading),
			score: Math.round(Math.min(score / 2.4, 1) * 100) / 100,
			pixels: pix.length
		});
	}
	return hits.slice(0, 80);
}
function rasterizeLines(lines, width, height, toPx, radius = 3) {
	const mask = new Uint8Array(width * height);
	const stamp = (x, y) => {
		for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
			const nx = x + dx, ny = y + dy;
			if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
			mask[ny * width + nx] = 1;
		}
	};
	for (const line of lines) for (let i = 1; i < line.length; i++) {
		const a = line[i - 1], b = line[i];
		const [x0, y0] = toPx(a[0], a[1]);
		const [x1, y1] = toPx(b[0], b[1]);
		const steps = Math.max(1, Math.hypot(x1 - x0, y1 - y0) | 0);
		for (let s = 0; s <= steps; s++) stamp(Math.round(x0 + (x1 - x0) * s / steps), Math.round(y0 + (y1 - y0) * s / steps));
	}
	return mask;
}
var cache = createRequestCache(8);
var ROOT = "https://earth-search.aws.element84.com/v1";
var OVERPASS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
function allowed(url) {
	try {
		const u = new URL(url);
		return u.protocol === "https:" && u.hostname === "sentinel-cogs.s3.us-west-2.amazonaws.com";
	} catch {
		return false;
	}
}
async function osmRoads(west, south, east, north) {
	const q = `[out:json][timeout:25];way["highway"~"^(motorway|trunk|primary|secondary)$"](${south},${west},${north},${east});out geom;`;
	for (const host of OVERPASS) try {
		const r = await fetch(host, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": "AbuHureirahSitroom/1.0 freight-smear"
			},
			body: `data=${encodeURIComponent(q)}`,
			signal: AbortSignal.timeout(2e4)
		});
		if (!r.ok) continue;
		return ((await r.json()).elements ?? []).map((el) => (el.geometry ?? []).map((g) => [g.lon, g.lat])).filter((line) => line.length >= 2).slice(0, 400);
	} catch {}
	return [];
}
async function runFreight(input) {
	const { fromUrl } = await import("../_libs/geotiff+[...].mjs").then((n) => n.t);
	const { default: proj4 } = await import("../_libs/proj4+wkt-parser.mjs").then((n) => n.t);
	const signal = AbortSignal.timeout(12e4);
	const bbox = await analysisBounds(input.lon, input.lat, input.sizeKm);
	const day = Date.parse(input.date);
	const delta = input.windowDays * 864e5;
	const params = new URLSearchParams({
		collections: "sentinel-2-l2a",
		bbox: bbox.join(","),
		datetime: `${new Date(day - delta).toISOString()}/${new Date(day + delta + 86399999).toISOString()}`,
		limit: "40",
		query: JSON.stringify({ "eo:cloud_cover": { lte: 40 } })
	});
	const cat = await fetch(`${ROOT}/search?${params}`, { signal });
	if (!cat.ok) throw new Error(`Scene catalogue HTTP ${cat.status}`);
	const scenes = ((await cat.json()).features ?? []).filter((f) => f.assets?.red?.href && f.assets?.green?.href && f.assets?.blue?.href && f.assets?.scl?.href && allowed(f.assets.red.href) && allowed(f.assets.scl.href));
	if (!scenes.length) throw new Error("No clear Sentinel-2 L2A scene with B02/B03/B04 COGs in this window.");
	scenes.sort((a, b) => (a.properties["eo:cloud_cover"] ?? 100) - (b.properties["eo:cloud_cover"] ?? 100));
	const scene = scenes[0];
	const epsg = scene.properties["proj:epsg"];
	const utm = `+proj=utm +zone=${epsg % 100} ${epsg >= 32700 ? "+south " : ""}+datum=WGS84 +units=m +no_defs`;
	const center = proj4("EPSG:4326", utm, [input.lon, input.lat]);
	const half = input.sizeKm * 500;
	const west = Math.floor((center[0] - half) / 10) * 10;
	const south = Math.floor((center[1] - half) / 10) * 10;
	const east = Math.ceil((center[0] + half) / 10) * 10;
	const north = Math.ceil((center[1] + half) / 10) * 10;
	const width = Math.min(512, Math.round((east - west) / 10));
	const height = Math.round((north - south) / 10 * width / Math.round((east - west) / 10));
	const readBand = async (href, samples) => {
		const tif = await fromUrl(href, { allowFullFile: false }, signal);
		try {
			const im = await tif.getImage();
			const [ox, oy] = im.getOrigin();
			const [rx, ry] = im.getResolution();
			const win = [
				Math.round((west - ox) / rx),
				Math.round((north - oy) / ry),
				Math.round((east - ox) / rx),
				Math.round((south - oy) / ry)
			];
			if (win[0] < 0 || win[1] < 0 || win[2] > im.getWidth() || win[3] > im.getHeight()) throw new Error("AOI crosses the scene edge. Move the map or shrink the area.");
			const arr = (await im.readRasters({
				window: win,
				width,
				height,
				resampleMethod: "nearest",
				samples: samples ?? [0],
				signal
			}))[0];
			return Float32Array.from(arr, (v) => Number(v));
		} finally {
			await tif.close();
		}
	};
	const [R, G, B, scl] = await Promise.all([
		readBand(scene.assets.red.href),
		readBand(scene.assets.green.href),
		readBand(scene.assets.blue.href),
		readBand(scene.assets.scl.href, [0])
	]);
	const n = width * height;
	const valid = new Uint8Array(n);
	for (let i = 0; i < n; i++) {
		const s = scl[i] ?? 0;
		if (s === 4 || s === 5 || s === 6) valid[i] = 1;
	}
	const roadsLonLat = await osmRoads(bbox[0], bbox[1], bbox[2], bbox[3]);
	const toPx = (lon, lat) => {
		const p = proj4("EPSG:4326", utm, [lon, lat]);
		return [(p[0] - west) / (east - west) * width, (north - p[1]) / (north - south) * height];
	};
	const roadMask = roadsLonLat.length ? rasterizeLines(roadsLonLat, width, height, toPx, 4) : void 0;
	const cls = classifySmear(R, G, B, valid, n);
	const toLonLat = (x, y) => {
		const e = west + x / width * (east - west);
		const nrt = north - y / height * (north - south);
		return proj4(utm, "EPSG:4326", [e, nrt]);
	};
	const detections = extractSmears(cls, width, height, toLonLat, roadMask);
	return {
		date: String(scene.properties.datetime).slice(0, 10),
		sceneId: scene.id,
		cloud: scene.properties["eo:cloud_cover"],
		metadata: `${ROOT}/collections/sentinel-2-l2a/items/${encodeURIComponent(scene.id)}`,
		roads: roadsLonLat.length,
		detections,
		note: "Sentinel-2 B02/B03/B04 motion-smear screening (Fisser 2022 / DrishX). Large-vehicle candidates on mapped roads. Not a vehicle type, cargo, or occupancy call. RF pickle is not in-browser — this is the spectral-smear object extractor.",
		bbox: {
			west: bbox[0],
			south: bbox[1],
			east: bbox[2],
			north: bbox[3]
		}
	};
}
var runFreightScan_createServerFn_handler = createServerRpc({
	id: "ecdf271cc374a3fe26a88c5a80fafdb0b4803b941898c1d79f4b775a05109ec3",
	name: "runFreightScan",
	filename: "src/lib/freight-service.ts"
}, (opts) => runFreightScan.__executeServer(opts));
var runFreightScan = createServerFn({ method: "POST" }).inputValidator((data) => {
	if (!data || ![
		data.lon,
		data.lat,
		data.sizeKm,
		data.windowDays
	].every(Number.isFinite)) throw new Error("Pick a map center and 1–10 km corridor.");
	if (data.sizeKm < 1 || data.sizeKm > 10) throw new Error("Freight AOI must be 1–10 km.");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error("Date must be YYYY-MM-DD.");
	return data;
}).handler(runFreightScan_createServerFn_handler, async ({ data }) => cache(`freight:${JSON.stringify(data)}`, 48e4, () => runFreight(data)));
//#endregion
export { runFreightScan_createServerFn_handler };
