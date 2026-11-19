import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DATA_FILES, encodeData, decodeData, restoreData } from '../scripts/render-data.mjs';

const files = () => DATA_FILES.map(name => ({ name, content: Buffer.from('\uFEFFName,Value\r\n"A, B",42\r\n') }));
const archive = bundle => gzipSync(Buffer.from(JSON.stringify(bundle))).toString('base64');
const manifest = () => ({ version: 1, files: files().map(({name, content}) => ({
  name, content: content.toString('utf8'), sha256: createHash('sha256').update(content).digest('hex'),
})) });

test('private data bundle preserves exact CSV bytes and restores five files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'spengler-secret-'));
  try {
    const original = files();
    const encoded = encodeData(original);
    assert.deepEqual(decodeData(encoded), original);
    await writeFile(path.join(root, 'secret.b64'), encoded);
    const directory = path.join(root, 'restored');
    assert.equal(await restoreData(path.join(root, 'secret.b64'), directory), 5);
    for (const file of original) assert.deepEqual(await readFile(path.join(directory, file.name)), file.content);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('secret validation rejects corrupt data, missing files, duplicates and traversal paths', () => {
  assert.throws(() => decodeData('invalid secret'), /Base64/);
  assert.throws(() => decodeData(Buffer.from('not gzip').toString('base64')), /compressed/);
  const missing = manifest(); missing.files.pop();
  assert.throws(() => decodeData(archive(missing)), /five/);
  const traversal = manifest(); traversal.files[0].name = '../public/leak.csv';
  assert.throws(() => decodeData(archive(traversal)), /filename/);
  const duplicate = manifest(); duplicate.files[0].name = duplicate.files[1].name;
  assert.throws(() => decodeData(archive(duplicate)), /filename/);
  const modified = manifest(); modified.files[0].content += 'tampered';
  assert.throws(() => decodeData(archive(modified)), /checksum/);
  assert.throws(() => decodeData('A'.repeat(950_004)), /large/);
});
