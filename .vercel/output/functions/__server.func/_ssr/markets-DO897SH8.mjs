import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/markets-DO897SH8.js
var SYMBOLS = [
	{
		symbol: "BZ=F",
		label: "BRENT"
	},
	{
		symbol: "GC=F",
		label: "GOLD"
	},
	{
		symbol: "ZW=F",
		label: "WHEAT"
	}
];
async function quote(symbol, label) {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
	const res = await fetch(url, { headers: {
		"User-Agent": "AbuHureirahSitroom/1.0",
		Accept: "application/json"
	} });
	if (!res.ok) return null;
	const meta = (await res.json()).chart?.result?.[0]?.meta;
	const price = Number(meta?.regularMarketPrice);
	const prev = Number(meta?.previousClose ?? meta?.chartPreviousClose);
	if (!Number.isFinite(price)) return null;
	const changePct = Number.isFinite(prev) && prev !== 0 ? (price - prev) / prev * 100 : 0;
	return {
		symbol,
		label,
		price,
		prev: Number.isFinite(prev) ? prev : price,
		changePct
	};
}
/** Theater-relevant tape: Brent, gold, wheat. Not a trading terminal. */
var getTheaterMarkets_createServerFn_handler = createServerRpc({
	id: "bb37320632c3cb99c698aa4f4d3b7aa939977018c76352b55673232200c04ea8",
	name: "getTheaterMarkets",
	filename: "src/lib/markets.ts"
}, (opts) => getTheaterMarkets.__executeServer(opts));
var getTheaterMarkets = createServerFn({ method: "GET" }).handler(getTheaterMarkets_createServerFn_handler, async () => {
	return (await Promise.all(SYMBOLS.map((s) => quote(s.symbol, s.label).catch(() => null)))).filter((r) => !!r);
});
//#endregion
export { getTheaterMarkets_createServerFn_handler };
