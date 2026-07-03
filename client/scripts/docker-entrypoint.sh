#!/bin/sh
set -eu

node -e '
const fs = require("node:fs");
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const publicDir = process.env.PUBLIC_DIR || "/app/public";
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  `${publicDir}/runtime-config.js`,
  `window.__PFM_RUNTIME_CONFIG__ = ${JSON.stringify({ apiBaseUrl })};\n`,
);
'

exec "$@"
