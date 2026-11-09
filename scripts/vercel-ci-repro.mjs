#!/usr/bin/env node
/**
 * Reproduce the GitHub→Vercel failure mode locally when the project
 * Root Directory is mis-set to `.vercel/output/functions/__server.func`.
 *
 * Usage (from repo root):
 *   node scripts/vercel-ci-repro.mjs
 *
 * Exits 0 only if install+build from that Root Directory produce
 * `<rootDir>/.vercel/output/config.json` (Build Output API).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const rootDirRel = ".vercel/output/functions/__server.func";
const staging = mkdtempSync(join(tmpdir(), "vercel-root-sim-"));

function run(cmd, args, cwd) {
  console.log(`[repro] ${cmd} ${args.join(" ")} (cwd=${cwd})`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    rmSync(staging, { recursive: true, force: true });
    process.exit(r.status ?? 1);
  }
}

console.log("[repro] staging clean tree at", staging);
const archive = spawnSync("git", ["archive", "HEAD"], {
  cwd: repoRoot,
  encoding: "buffer",
  maxBuffer: 256 * 1024 * 1024,
});
if (archive.status !== 0) {
  console.error(archive.stderr?.toString() || "git archive failed");
  process.exit(archive.status ?? 1);
}
const untar = spawnSync("tar", ["-x", "-C", staging], {
  input: archive.stdout,
  stdio: ["pipe", "inherit", "inherit"],
});
if (untar.status !== 0) process.exit(untar.status ?? 1);

const shimDir = join(staging, rootDirRel);
if (!existsSync(join(shimDir, "package.json"))) {
  console.error("[repro] FAIL: Root Directory package.json missing");
  rmSync(staging, { recursive: true, force: true });
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(join(shimDir, "vercel.json"), "utf8"));
console.log("[repro] shim vercel.json:", cfg);

run("bash", ["-lc", cfg.installCommand || "npm install"], shimDir);
run("bash", ["-lc", cfg.buildCommand || "npm run build"], shimDir);

const nestedOk = existsSync(join(shimDir, ".vercel/output/config.json"));
const clearedOk = existsSync(join(staging, ".vercel/output/config.json"));
console.log("[repro] nested <RootDir>/.vercel/output/config.json:", nestedOk ? "OK" : "MISSING");
console.log("[repro] repo-root .vercel/output/config.json:", clearedOk ? "OK" : "MISSING");

rmSync(staging, { recursive: true, force: true });
if (!nestedOk) {
  console.error("[repro] FAIL: misconfigured Root Directory build did not emit nested Build Output API");
  process.exit(1);
}
console.log("[repro] PASS");
