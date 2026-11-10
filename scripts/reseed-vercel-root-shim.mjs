#!/usr/bin/env node
/**
 * Nitro wipes `.vercel/output` on every build. Re-seed the tiny Root Directory
 * shim so a misconfigured Vercel project (Root Directory =
 * `.vercel/output/functions/__server.func`) can still run install/build from
 * that path without committing Build Output API artifacts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shimDir = join(repoRoot, ".vercel/output/functions/__server.func");

mkdirSync(shimDir, { recursive: true });

writeFileSync(
  join(shimDir, "package.json"),
  `${JSON.stringify(
    {
      name: "abusitroom-vercel-root-shim",
      private: true,
      scripts: {
        build: "node ../../../../scripts/vercel-wrong-root-shim.mjs",
      },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(shimDir, "vercel.json"),
  `${JSON.stringify(
    {
      framework: null,
      ignoreCommand:
        "echo '[abusitroom] Skipping deploy: Project Root Directory is mis-set to .vercel/output/functions/__server.func (Build Output), so GitHub cannot build from source. Clear it: Vercel → abusitroom1717 → Settings → General → Root Directory → leave empty (repo root). Then redeploy.' && exit 0",
      installCommand: "cd ../../../.. && npm install",
      buildCommand: "cd ../../../.. && node scripts/vercel-wrong-root-shim.mjs",
    },
    null,
    2,
  )}\n`,
);

console.log("[reseed-vercel-root-shim] wrote", shimDir);
