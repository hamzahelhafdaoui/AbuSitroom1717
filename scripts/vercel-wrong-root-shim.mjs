#!/usr/bin/env node
/**
 * The abusitroom1717 Vercel project has Root Directory mis-set to
 * `.vercel/output/functions/__server.func` (build OUTPUT, not source).
 *
 * Correct dashboard fix: Project Settings → General → Root Directory → empty
 * (repository root). Until then, this shim builds from the real repo root and
 * nests the Build Output API where Vercel looks relative to that Root Directory.
 *
 * Finds the repo root by walking parents for package.json name
 * "app-builder-workspace" so monorepo cwd quirks still resolve.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDirRel = ".vercel/output/functions/__server.func";

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.name === "app-builder-workspace") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

const repoRoot = findRepoRoot(process.cwd());

function run(cmd, args) {
  console.log(`[vercel-shim] ${cmd} ${args.join(" ")} (root=${repoRoot})`);
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(join(repoRoot, "package.json"))) {
  console.error("[vercel-shim] repo root package.json missing at", repoRoot);
  process.exit(1);
}

if (!existsSync(join(repoRoot, "node_modules"))) {
  run("npm", ["install"]);
}

run("npm", ["run", "build"]);

const built = join(repoRoot, ".vercel/output");
if (!existsSync(join(built, "config.json"))) {
  console.error("[vercel-shim] missing .vercel/output/config.json after build");
  process.exit(1);
}

const stage = join(repoRoot, ".vercel/output.__stage");
rmSync(stage, { recursive: true, force: true });
cpSync(built, stage, { recursive: true });

const nestOut = join(repoRoot, rootDirRel, ".vercel/output");
rmSync(nestOut, { recursive: true, force: true });
mkdirSync(dirname(nestOut), { recursive: true });
cpSync(stage, nestOut, { recursive: true });
rmSync(stage, { recursive: true, force: true });

// Do NOT reseed the shim into `.vercel/output/functions/__server.func` here:
// that path is also the Nitro serverless function after `npm run build`, and
// overwriting its package.json would break cleared-Root-Directory deploys.
// Git keeps the tiny shim via force-add; run `npm run vercel:reseed-shim` only
// when restoring those two files for a commit after a local build.

console.log("[vercel-shim] nested Build Output API at", nestOut);
if (!existsSync(join(nestOut, "config.json"))) {
  console.error("[vercel-shim] nested config.json missing");
  process.exit(1);
}
