#!/usr/bin/env node
/**
 * Clear the abusitroom1717 Vercel project Root Directory (set to null / repo root).
 *
 * Usage:
 *   VERCEL_TOKEN=... node scripts/vercel-clear-root-directory.mjs
 *
 * Optional:
 *   VERCEL_PROJECT_ID=prj_... VERCEL_TEAM_ID=team_...
 */
const token = process.env.VERCEL_TOKEN;
const projectId =
  process.env.VERCEL_PROJECT_ID || "prj_qgJLC1YwB2RRjAyeXPHhe7GaHAcM";
const teamId = process.env.VERCEL_TEAM_ID || "team_d4BewpL5N0r6VeQQlyUhOjxt";

if (!token) {
  console.error("VERCEL_TOKEN is required");
  process.exit(1);
}

const url = new URL(`https://api.vercel.com/v9/projects/${projectId}`);
url.searchParams.set("teamId", teamId);

const res = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ rootDirectory: null }),
});

const text = await res.text();
console.log(res.status, text.slice(0, 1000));
if (!res.ok) process.exit(1);

const body = JSON.parse(text);
console.log(
  "rootDirectory now:",
  body.rootDirectory === null || body.rootDirectory === undefined
    ? "(empty / repo root)"
    : body.rootDirectory,
);
