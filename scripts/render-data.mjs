import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

export const SECRET_NAME = 'match-data.b64';
export const MAX_SECRET_BYTES = 950_000; // Leave space below Render's combined 1 MB limit.
export const DATA_FILES = [
  'U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Events_31_12_2025.csv',
  ...['All', 'P1', 'P2', 'P3'].map(scope =>
    `U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Statistics_31_12_2025 ${scope}.csv`),
];
const digest = buffer => createHash('sha256').update(buffer).digest('hex');

export function encodeData(files) {
  const bundle = { version: 1, files: files.map(({ name, content }) => ({
    name, content: content.toString('utf8'), sha256: digest(content),
  })) };
  const encoded = gzipSync(Buffer.from(JSON.stringify(bundle))).toString('base64') + '\n';
  if (Buffer.byteLength(encoded) > MAX_SECRET_BYTES) {
    throw new Error('Data bundle exceeds the Render secret-file budget. Use private external storage.');
  }
  decodeData(encoded); // Validate the complete bundle before writing any secret file.
  return encoded;
}

export function decodeData(encoded) {
  if (Buffer.byteLength(encoded) > MAX_SECRET_BYTES) throw new Error('Secret file is too large.');
  const compact = encoded.replace(/\s/g, '');
  if (!compact || compact.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error('Secret file is not valid Base64. Paste the complete generated file.');
  }
  let bundle;
  try {
    bundle = JSON.parse(gunzipSync(Buffer.from(compact, 'base64'), {
      maxOutputLength: 16 * 1024 * 1024,
    }).toString('utf8'));
  } catch {
    throw new Error('Secret file is not a valid compressed match-data bundle.');
  }
  if (bundle?.version !== 1 || !Array.isArray(bundle.files) || bundle.files.length !== DATA_FILES.length) {
    throw new Error('Match-data bundle must contain exactly the five required CSV files.');
  }
  const names = new Set();
  return bundle.files.map(file => {
    if (!file || !DATA_FILES.includes(file.name) || names.has(file.name) || typeof file.content !== 'string') {
      throw new Error('Match-data bundle contains an unexpected or duplicate filename.');
    }
    names.add(file.name);
    const content = Buffer.from(file.content, 'utf8');
    if (!content.length || digest(content) !== file.sha256) throw new Error('Match-data checksum failed.');
    return { name: file.name, content };
  });
}

export async function packData(directory, destination) {
  const files = await Promise.all(DATA_FILES.map(async name => ({
    name, content: await readFile(path.join(directory, name)),
  })));
  const encoded = encodeData(files);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, encoded, { mode: 0o600 });
  return Buffer.byteLength(encoded);
}

export async function restoreData(secretFile, directory) {
  // The exact-name allowlist prevents archive paths from writing outside the data directory.
  const files = decodeData(await readFile(secretFile, 'utf8'));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  for (const { name, content } of files) {
    const destination = path.join(directory, name);
    const temporary = destination + '.tmp';
    await writeFile(temporary, content, { mode: 0o600 });
    await rename(temporary, destination);
  }
  return files.length;
}
