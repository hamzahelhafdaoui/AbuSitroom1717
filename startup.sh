#!/bin/sh
set -eu
cd /workspace
# Preview proxy expects the app on 0.0.0.0:8080
export PORT="${PORT:-8080}"
if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/"; then
  exit 0
fi
# Free stale listeners on the preview port before restarting
node scripts/preview.mjs stop || true
npm run dev >>/tmp/app-startup.log 2>&1 &
