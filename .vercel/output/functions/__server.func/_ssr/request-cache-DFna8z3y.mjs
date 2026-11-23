//#region node_modules/.nitro/vite/services/ssr/assets/request-cache-DFna8z3y.js
/** Coalesce simultaneous refreshes; failed requests are retryable and never cached. */
function createRequestCache(maxEntries = 128) {
	const values = /* @__PURE__ */ new Map();
	const pending = /* @__PURE__ */ new Map();
	return function cached(key, ttl, fetcher) {
		const hit = values.get(key);
		if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
		const active = pending.get(key);
		if (active) return active;
		const request = Promise.resolve().then(fetcher).then((value) => {
			values.set(key, {
				at: Date.now(),
				value
			});
			if (values.size > maxEntries) values.delete(values.keys().next().value);
			return value;
		}).finally(() => pending.delete(key));
		pending.set(key, request);
		return request;
	};
}
//#endregion
export { createRequestCache as t };
