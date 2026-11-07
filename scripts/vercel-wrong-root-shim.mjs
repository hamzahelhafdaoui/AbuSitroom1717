#!/usr/bin/env node
/**
 * The abusitroom1717 Vercel project has Root Directory mis-set to
 * `.vercel/output/functions/__server.func` (build OUTPUT, not source).
 * Without dashboard auth we cannot clear it, so a tiny package is committed
 * at that path; this script builds from the real repo root and nests the
 * Build Output API where Vercel looks relative to that Root Directory.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const rootDirRel = ".vercel/output/functions/__server.func";

function run(cmd, args) {
  console.log(`[vercel-shim] ${cmd} ${args.join(" ")}`);
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
if (!existsSync(built)) {
  console.error("[vercel-shim] missing .vercel/output after build");
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

// Re-seed the Root Directory package after nitro wiped `.vercel/output`.
writeFileSync(
  join(repoRoot, rootDirRel, "package.json"),
  JSON.stringify(
    {
      name: "abusitroom-vercel-root-shim",
      private: true,
      scripts: {
        build: "node ../../../../scripts/vercel-wrong-root-shim.mjs",
      },
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  join(repoRoot, rootDirRel, "vercel.json"),
  JSON.stringify(
    {
      installCommand: "cd ../../../.. && npm install",
      buildCommand: "cd ../../../.. && node scripts/vercel-wrong-root-shim.mjs",
    },
    null,
    2,
  ) + "\n",
);

console.log("[vercel-shim] nested Build Output API at", nestOut);
