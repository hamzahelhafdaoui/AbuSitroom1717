import { n as __esmMin, o as __toESM, r as __exportAll } from "../_runtime.mjs";
import { r as require_src } from "./@mapbox/mcp-devkit-server+[...].mjs";
import * as util from "util";
import { promises } from "fs";
import * as process from "process";
import * as child_process from "child_process";
//#region node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id/execAsync.js
var execAsync;
var init_execAsync = __esmMin((() => {
	execAsync = util.promisify(child_process.exec);
}));
//#endregion
//#region node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id/getMachineId-bsd.js
var getMachineId_bsd_exports = /* @__PURE__ */ __exportAll({ getMachineId: () => getMachineId$4 });
async function getMachineId$4() {
	try {
		return (await promises.readFile("/etc/hostid", { encoding: "utf8" })).trim();
	} catch (e) {
		import_src$4.diag.debug(`error reading machine id: ${e}`);
	}
	try {
		return (await execAsync("kenv -q smbios.system.uuid")).stdout.trim();
	} catch (e) {
		import_src$4.diag.debug(`error reading machine id: ${e}`);
	}
}
var import_src$4;
var init_getMachineId_bsd = __esmMin((() => {
	init_execAsync();
	import_src$4 = /* @__PURE__ */ __toESM(require_src());
}));
//#endregion
//#region node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id/getMachineId-darwin.js
var getMachineId_darwin_exports = /* @__PURE__ */ __exportAll({ getMachineId: () => getMachineId$3 });
async function getMachineId$3() {
	try {
		const idLine = (await execAsync("ioreg -rd1 -c \"IOPlatformExpertDevice\"")).stdout.split("\n").find((line) => line.includes("IOPlatformUUID"));
		if (!idLine) return;
		const parts = idLine.split("\" = \"");
		if (parts.length === 2) return parts[1].slice(0, -1);
	} catch (e) {
		import_src$3.diag.debug(`error reading machine id: ${e}`);
	}
}
var import_src$3;
var init_getMachineId_darwin = __esmMin((() => {
	init_execAsync();
	import_src$3 = /* @__PURE__ */ __toESM(require_src());
}));
//#endregion
//#region node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id/getMachineId-linux.js
var getMachineId_linux_exports = /* @__PURE__ */ __exportAll({ getMachineId: () => getMachineId$2 });
async function getMachineId$2() {
	for (const path of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) try {
		return (await promises.readFile(path, { encoding: "utf8" })).trim();
	} catch (e) {
		import_src$2.diag.debug(`error reading machine id: ${e}`);
	}
}
var import_src$2;
var init_getMachineId_linux = __esmMin((() => {
	import_src$2 = /* @__PURE__ */ __toESM(require_src());
}));
//#endregion
//#region node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id/getMachineId-unsupported.js
var getMachineId_unsupported_exports = /* @__PURE__ */ __exportAll({ getMachineId: () => getMachineId$1 });
async function getMachineId$1() {
	import_src$1.diag.debug("could not read machine-id: unsupported platform");
}
var import_src$1;
var init_getMachineId_unsupported = __esmMin((() => {
	import_src$1 = /* @__PURE__ */ __toESM(require_src());
}));
//#endregion
//#region node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id/getMachineId-win.js
var getMachineId_win_exports = /* @__PURE__ */ __exportAll({ getMachineId: () => getMachineId });
async function getMachineId() {
	const args = "QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid";
	let command = "%windir%\\System32\\REG.exe";
	if (process.arch === "ia32" && "PROCESSOR_ARCHITEW6432" in process.env) command = "%windir%\\sysnative\\cmd.exe /c " + command;
	try {
		const parts = (await execAsync(`${command} ${args}`)).stdout.split("REG_SZ");
		if (parts.length === 2) return parts[1].trim();
	} catch (e) {
		import_src.diag.debug(`error reading machine id: ${e}`);
	}
}
var import_src;
var init_getMachineId_win = __esmMin((() => {
	init_execAsync();
	import_src = /* @__PURE__ */ __toESM(require_src());
}));
//#endregion
export { getMachineId_linux_exports as a, init_getMachineId_darwin as c, init_getMachineId_unsupported as i, getMachineId_bsd_exports as l, init_getMachineId_win as n, init_getMachineId_linux as o, getMachineId_unsupported_exports as r, getMachineId_darwin_exports as s, getMachineId_win_exports as t, init_getMachineId_bsd as u };
