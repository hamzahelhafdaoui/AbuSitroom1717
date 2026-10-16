import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { f as useCurrentUserState, t as AccountSignIn } from "./control-desk-BefuxGhT.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-1-aFkBoz.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const { user, isPending } = useCurrentUserState();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg p-6 text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm space-y-3 border border-border p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[10px] tracking-[0.18em] text-accent",
					children: "ABU HUREIRAH"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-mono text-lg",
					children: "Sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "The map stays public. Sign in only to lock or edit control."
				}),
				isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Checking account…"
				}) : null,
				!isPending && user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						"Signed in as ",
						user.displayName || user.primaryEmail || "this account",
						".",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							className: "text-accent underline-offset-2 hover:underline",
							children: "Back to the map"
						})
					]
				}) : null,
				!isPending && !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountSignIn, {}) : null
			]
		})
	});
}
//#endregion
export { Login as component };
