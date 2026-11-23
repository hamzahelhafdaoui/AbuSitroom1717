import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/translate-DyFXbuTs.js
/** Arabic (or other non-Latin) headline → English via MyMemory. No key. */
var translateToEn_createServerFn_handler = createServerRpc({
	id: "cbbaad0c34dfc5f7ee76548e2469cfb7805f26cb6cab6e83615728c85aebfc28",
	name: "translateToEn",
	filename: "src/lib/translate.ts"
}, (opts) => translateToEn.__executeServer(opts));
var translateToEn = createServerFn({ method: "POST" }).inputValidator((data) => {
	const text = String(data?.text ?? "").slice(0, 420);
	if (!text.trim()) throw new Error("empty");
	return { text };
}).handler(translateToEn_createServerFn_handler, async ({ data }) => {
	const text = data.text;
	if (!/[^\u0000-\u007F]/.test(text)) return {
		original: text,
		translated: text,
		note: "already latin"
	};
	const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`;
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) return {
		original: text,
		translated: text,
		note: "translate failed"
	};
	const translated = (await res.json()).responseData?.translatedText || text;
	return {
		original: text,
		translated,
		note: translated === text ? "unchanged" : "ar→en"
	};
});
//#endregion
export { translateToEn_createServerFn_handler };
