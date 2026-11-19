import path from 'node:path';
import { packData } from './render-data.mjs';

const directory = path.resolve(process.env.MATCH_DATA_DIR || 'data');
const destination = path.resolve('.render-secrets/match-data.b64');
try {
  const size = await packData(directory, destination);
  console.log(`Private Render secret file created: ${destination} (${size} bytes).`);
  console.log('Paste its contents into Render Secret Files. Do not commit, publish or share this file.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
