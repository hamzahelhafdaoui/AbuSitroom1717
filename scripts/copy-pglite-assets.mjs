#!/usr/bin/env node
/**
 * Nitro/Vercel bundles `@electric-sql/pglite` but does not emit the sibling
 * `pglite.data` / `pglite.wasm` assets that the WASM runtime loads via
 * `new URL("./pglite.data", import.meta.url)`. Without them, `vite preview`
 * crashes on first request. Copy them next to the bundled module after build.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");

if (!existsSync(destDir)) {
  console.warn("[copy-pglite-assets] build output missing — skip");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  const from = join(srcDir, name);
  const to = join(destDir, name);
  if (!existsSync(from)) {
    console.warn(`[copy-pglite-assets] missing ${name} in package — skip`);
    continue;
  }
  copyFileSync(from, to);
  console.log(`[copy-pglite-assets] ${name} → ${to}`);
}
