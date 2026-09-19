/* Generate public/runtime-env.js from .env using dotenv
 * - Picks only REACT_APP_* variables (safe for client)
 * - Run automatically in prestart/prebuild scripts
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const cwd = process.cwd();
const envPath = path.resolve(cwd, '.env');

let parsed = {};
try {
  const res = dotenv.config({ path: envPath });
  parsed = res.parsed || {};
  console.log('[env] Loaded .env with keys:', Object.keys(parsed));
} catch (e) {
  console.warn('[env] Failed to load .env:', e?.message || e);
}

const runtime = {};
for (const [k, v] of Object.entries(parsed)) {
  if (k.startsWith('REACT_APP_')) {
    runtime[k] = v;
  }
}

const outJs = 'window.RUNTIME_ENV = ' + JSON.stringify(runtime, null, 2) + ';\n';
const outPath = path.resolve(cwd, 'public', 'runtime-env.js');

try {
  fs.writeFileSync(outPath, outJs);
  console.log('[env] Wrote', outPath);
} catch (e) {
  console.error('[env] Failed writing runtime env file:', e?.message || e);
  process.exitCode = 1;
}
