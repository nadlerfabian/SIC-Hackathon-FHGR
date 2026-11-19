import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { restoreData, SECRET_NAME } from './render-data.mjs';

const require = createRequire(import.meta.url);
let child;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (child) child.kill(signal);
    else process.exit(signal === 'SIGTERM' ? 143 : 130);
  });
}
function run(args, env) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, args, { stdio: 'inherit', env });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (signal) reject(new Error(`Process stopped by ${signal}.`));
      else if (code !== 0) reject(new Error(`Process exited with status ${code}.`));
      else resolve();
    });
  });
}
try {
  const candidates = process.env.MATCH_DATA_SECRET_FILE
    ? [path.resolve(process.env.MATCH_DATA_SECRET_FILE)]
    : [`/etc/secrets/${SECRET_NAME}`, path.resolve(SECRET_NAME)];
  let secret;
  for (const candidate of candidates) {
    try { await access(candidate); secret = candidate; break; } catch { /* Try Render's other path. */ }
  }
  if (!secret) throw new Error(`Missing Render Secret File: ${SECRET_NAME}. Add it under Environment > Secret Files.`);
  // Use a dedicated, ignored directory. Never fall back to old local CSVs on failure.
  const directory = path.resolve(process.env.MATCH_DATA_DIR || '.render-data');
  const relative = path.relative(path.resolve('public'), directory);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('MATCH_DATA_DIR must be outside public/.');
  }
  const count = await restoreData(secret, directory);
  const env = { ...process.env, MATCH_DATA_DIR: directory };
  console.log(`Restored ${count} private match-data files. Validating match data before startup.`);
  await run(['--experimental-strip-types', '--test', 'tests/data.test.ts', 'tests/replay.test.ts'], env);
  const port = process.env.PORT || '10000';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid PORT.');
  await run([require.resolve('next/dist/bin/next'), 'start', '--hostname', '0.0.0.0', '--port', port], env);
} catch (error) {
  console.error(`Render startup failed: ${error.message}`);
  process.exitCode = 1;
}
