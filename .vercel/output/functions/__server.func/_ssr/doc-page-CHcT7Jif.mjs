import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { M as ArrowLeft, c as Satellite } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/doc-page-CHcT7Jif.js
var import_jsx_runtime = require_jsx_runtime();
function DocPage({ kicker, title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-border px-4 py-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-3xl items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "flex items-center gap-2 text-sm text-muted hover:text-fg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Workspace"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "ml-auto flex items-center gap-2 font-display text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Satellite, { className: "size-4 text-accent" }), "Abu Hureirah"]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "mx-auto max-w-3xl px-4 py-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-widest text-subtle",
					children: kicker
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-4xl font-medium leading-tight tracking-tight",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 space-y-4 text-sm leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-fg [&_li]:ms-4 [&_li]:list-disc [&_strong]:text-fg",
					children
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-12 border-t border-border pt-4 text-xs text-subtle",
					children: "Documentation archive. Not a targeting system. Public data only. Human review required."
				})
			]
		})]
	});
}
//#endregion
export { DocPage as t };
