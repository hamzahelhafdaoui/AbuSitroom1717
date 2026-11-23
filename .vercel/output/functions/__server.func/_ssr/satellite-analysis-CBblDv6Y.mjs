//#region node_modules/.nitro/vite/services/ssr/assets/satellite-analysis-CBblDv6Y.js
function scanInput(value) {
	if (!value || ![
		value.lon,
		value.lat,
		value.sizeKm,
		value.windowDays,
		value.maxCloud
	].every(Number.isFinite) || Math.abs(value.lon) > 180 || value.lat < -70 || value.lat > 80 || value.sizeKm < 1 || value.sizeKm > 10 || value.windowDays < 1 || value.windowDays > 30 || value.maxCloud < 0 || value.maxCloud > 80) throw new Error("Choose a valid map center, 1–10 km area, and search window up to 30 days.");
	for (const d of [value.before, value.after]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) throw new Error("Enter valid before and after dates as YYYY-MM-DD.");
	if (value.before >= value.after) throw new Error("The after date must follow the before date.");
	return value;
}
function rankScenePairs(before, after, input) {
	const score = (s, d) => Math.abs(Date.parse(s.date) - Date.parse(d)) / 864e5 + s.cloud * .25;
	return before.flatMap((b) => after.filter((a) => a.tile === b.tile && a.epsg === b.epsg && a.date > b.date && a.id !== b.id).map((a) => ({
		before: b,
		after: a,
		score: score(b, input.before) + score(a, input.after)
	}))).sort((a, b) => a.score - b.score).slice(0, 4);
}
/** Mask SCL cloud/shadow/snow/no-data/water, then compare exposure-adjusted RGB. */
function detectLandChanges(before, after, beforeScl, afterScl, width, height) {
	const n = width * height;
	if (before.length !== n * 3 || after.length !== n * 3 || beforeScl.length !== n || afterScl.length !== n) throw new Error("Raster dimensions differ.");
	const valid = new Uint8Array(n), hist = [
		/* @__PURE__ */ new Uint32Array(511),
		/* @__PURE__ */ new Uint32Array(511),
		/* @__PURE__ */ new Uint32Array(511)
	];
	let count = 0;
	for (let i = 0; i < n; i++) {
		if (![4, 5].includes(beforeScl[i]) || ![4, 5].includes(afterScl[i])) continue;
		if (before[i * 3] + before[i * 3 + 1] + before[i * 3 + 2] === 0 || after[i * 3] + after[i * 3 + 1] + after[i * 3 + 2] === 0) continue;
		valid[i] = 1;
		count++;
		for (let c = 0; c < 3; c++) hist[c][after[i * 3 + c] - before[i * 3 + c] + 255]++;
	}
	const bias = hist.map((h) => {
		let total = 0;
		for (let j = 0; j < h.length; j++) {
			total += h[j];
			if (total >= count / 2) return j - 255;
		}
		return 0;
	});
	const changed = new Uint8Array(n), strength = new Float32Array(n), overlay = new Uint8Array(n * 4);
	let changedCount = 0;
	for (let i = 0; i < n; i++) {
		if (!valid[i]) continue;
		let d = 0;
		for (let c = 0; c < 3; c++) d += Math.abs(after[i * 3 + c] - before[i * 3 + c] - bias[c]);
		d /= 3;
		strength[i] = d;
		if (d < 35 || beforeScl[i] === 4 && afterScl[i] === 4) continue;
		changed[i] = 1;
		changedCount++;
		overlay.set([
			245,
			174,
			68,
			180
		], i * 4);
	}
	const seen = new Uint8Array(n), candidates = [];
	for (let i = 0; i < n; i++) {
		if (!changed[i] || seen[i]) continue;
		const queue = [i];
		seen[i] = 1;
		let minX = width, minY = height, maxX = 0, maxY = 0, sum = 0;
		for (let j = 0; j < queue.length; j++) {
			const p = queue[j], x = p % width, y = Math.floor(p / width);
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
			sum += strength[p];
			for (const q of [
				x > 0 ? p - 1 : -1,
				x < width - 1 ? p + 1 : -1,
				y > 0 ? p - width : -1,
				y < height - 1 ? p + width : -1
			]) if (q >= 0 && changed[q] && !seen[q]) {
				seen[q] = 1;
				queue.push(q);
			}
		}
		if (queue.length >= 6) candidates.push({
			x: minX / width,
			y: minY / height,
			width: (maxX - minX + 1) / width,
			height: (maxY - minY + 1) / height,
			pixels: queue.length,
			score: Math.round(sum / queue.length)
		});
	}
	return {
		candidates: candidates.sort((a, b) => b.pixels * b.score - a.pixels * a.score).slice(0, 30),
		overlay,
		validFraction: count / n,
		changedFraction: count ? changedCount / count : 0,
		exposureBias: bias
	};
}
//#endregion
export { rankScenePairs as n, scanInput as r, detectLandChanges as t };
