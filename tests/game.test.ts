import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../lib/csv.ts';
import { rankPlayers, ROUNDS, roundStatus, restoreGame } from '../lib/game.ts';
test('competition ties skip occupied places; zero never earns points', () => {
  const result = rankPlayers([{ playerId: 'a', value: 2 }, { playerId: 'b', value: 2 }, { playerId: 'c', value: 1 }, { playerId: 'd', value: 0 }], 100);
  assert.deepEqual(result.map(r => [r.rank, r.points]), [[1, 100], [1, 100], [3, 30], [null, 0]]);
  assert.equal(rankPlayers([{ playerId: 'a', value: 0 }], 50)[0].points, 0);
});
test('period and match locks and reveals occur at their own boundaries', () => {
  assert.equal(roundStatus(ROUNDS[0], 0), 'open');
  assert.equal(roundStatus(ROUNDS[0], 4), 'locked');
  assert.equal(roundStatus(ROUNDS[0], 6), 'complete');
  assert.equal(roundStatus(ROUNDS[2], 1), 'upcoming');
  assert.equal(roundStatus(ROUNDS[2], 2), 'open');
  assert.equal(roundStatus(ROUNDS[2], 3), 'locked');
  assert.equal(roundStatus(ROUNDS[2], 4), 'complete');
});
test('CSV preserves quoted commas, escaped quotes, multiline fields and BOM', () => {
  assert.deepEqual(parseCsv('\uFEFFname,xy\r\n"A ""B""","1,2"\r\n"C\nD",3'), [{ name: 'A "B"', xy: '1,2' }, { name: 'C\nD', xy: '3' }]);
  assert.throws(() => parseCsv('a,b\n1,2,3'));
});
test('restoration ignores malformed state, invalid players and incomplete submissions', () => {
  assert.equal(restoreGame('bad', []).stage, 0);
  assert.equal(restoreGame('{"version":1,"stage":99}', []).stage, 0);
  const saved = restoreGame(JSON.stringify({ version: 1, stage: 2, picks: { 'm-goals': 'davos-19', 'p1-ice': 'goalie' }, submitted: { match: true } }), ['davos-19']);
  assert.deepEqual(saved.picks, { 'm-goals': 'davos-19' });
  assert.equal(saved.submitted.match, undefined);
});
