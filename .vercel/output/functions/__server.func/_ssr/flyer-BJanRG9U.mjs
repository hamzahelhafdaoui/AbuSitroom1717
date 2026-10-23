import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { M as ArrowLeft, p as Printer } from "../_libs/lucide-react.mjs";
import { n as FEATURES } from "./router-jYIDiSst.mjs";
import { n as cn } from "./utils-D5izKJMm.mjs";
import { t as Button } from "./button-xwGEA6Gw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/flyer-BJanRG9U.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function FlyerPage() {
	const [layout, setLayout] = (0, import_react.useState)("poster");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "print:hidden flex items-center gap-2 border-b border-border px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "flex items-center gap-1.5 text-sm text-muted hover:text-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), " Sitroom"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-1",
				children: [[
					"poster",
					"wide",
					"badge"
				].map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setLayout(id),
					className: cn("h-8 rounded-md px-3 font-mono text-[10px] tracking-wider uppercase", layout === id ? "bg-accent text-accent-fg" : "text-muted hover:bg-raised"),
					children: id
				}, id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					className: "ml-2",
					onClick: () => window.print(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-3.5" }), " Print"]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-center p-4 print:p-0",
			children: layout === "poster" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Poster, {}) : layout === "wide" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wide, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {})
		})]
	});
}
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-[10px] tracking-[0.42em] text-accent",
			children: "ABU HUREIRAH"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "mt-1 font-display text-4xl font-medium leading-[0.95] tracking-tight sm:text-5xl",
			children: [
				"SITUATION",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
				"ROOM"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 font-mono text-xs tracking-[0.28em] text-muted",
			children: "SUDAN WING"
		})
	] });
}
function Corners({ children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative border border-accent/35 bg-bg", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "pointer-events-none absolute left-0 top-0 size-5 border-l border-t border-accent" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "pointer-events-none absolute right-0 top-0 size-5 border-r border-t border-accent" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "pointer-events-none absolute bottom-0 left-0 size-5 border-b border-l border-accent" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "pointer-events-none absolute bottom-0 right-0 size-5 border-b border-r border-accent" }),
			children
		]
	});
}
function Poster() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Corners, {
		className: "w-full max-w-[42rem] px-8 py-10 sm:px-12 sm:py-14",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] tracking-[0.35em] text-subtle",
				children: "UNCLASSIFIED // OPEN SOURCE"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-10 h-px bg-accent/40" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-8 space-y-6",
				children: FEATURES.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "grid grid-cols-[3rem_1fr] gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-sm tabular-nums text-accent",
						children: f.n
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-mono text-sm tracking-[0.14em] text-fg",
						children: f.kicker
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block text-sm leading-snug text-muted",
						children: f.line
					})] })]
				}, f.n))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-12 font-mono text-[10px] tracking-[0.22em] text-subtle",
				children: "CIVILIAN OSINT · NO TARGETING · DOCS ONLY"
			})
		]
	});
}
function Wide() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Corners, {
		className: "w-full max-w-5xl p-8 sm:p-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] tracking-[0.35em] text-subtle",
				children: "UNCLASSIFIED // OPEN SOURCE"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-8 md:grid-cols-[minmax(12rem,0.38fr)_1fr] md:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "space-y-4",
					children: FEATURES.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex gap-3 border-b border-border/80 pb-3 last:border-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-8 shrink-0 font-mono text-sm tabular-nums text-accent",
							children: f.n
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-mono text-xs tracking-[0.16em] text-fg",
							children: f.kicker
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-0.5 block text-sm text-muted",
							children: f.line
						})] })]
					}, f.n))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 font-mono text-[10px] tracking-[0.22em] text-subtle",
				children: "CIVILIAN OSINT · NO TARGETING · DOCS ONLY"
			})
		]
	});
}
function Badge() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Corners, {
		className: "aspect-square w-full max-w-[22rem] p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] tracking-[0.42em] text-accent",
				children: "ABU HUREIRAH"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 font-display text-6xl font-medium tracking-tight",
				children: "AHSR"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-xs tracking-[0.32em] text-muted",
				children: "SUDAN WING"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mt-6 h-px w-16 bg-accent/50" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-6 space-y-1.5 font-mono text-xs tracking-[0.28em] text-fg",
				children: FEATURES.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-accent",
						children: f.n
					}),
					" ",
					f.icon
				] }, f.n))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 font-mono text-[9px] tracking-[0.28em] text-subtle",
				children: "OPEN SOURCE · DOCS ONLY"
			})
		]
	});
}
//#endregion
export { FlyerPage as component };
