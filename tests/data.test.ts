import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMatchData, getMatchView } from '../lib/match-data.ts';
import { visibleStats } from '../lib/game.ts';
test('real source contains 40 skaters, no goalkeepers, and 4458 events', () => {
  const data = getMatchData();
  assert.equal(data.players.length, 40); assert.equal(data.eventCount, 4458);
  assert.equal(data.players.filter(p => p.team === 'davos').length, 20);
  assert.ok(!data.players.some(p => /Aeschlimann|Gajan/.test(p.name)));
  assert.ok(data.players.every(p => ['Forward', 'Defense'].includes(p.position)));
});

test('goal snapshots and match totals stay hidden until their periods finish', () => {
  assert.deepEqual(getMatchView(0).goals, []);
  for (const stage of [0,1,2,3,4,5]) assert.equal(getMatchView(stage).totals, undefined);
  assert.equal(getMatchView(2).goals.length, 3);
  assert.ok(getMatchView(2).goals.every(goal => goal.period === 1));
  const final = getMatchView(6);
  assert.equal(final.goals.length, 9);
  assert.ok(final.goals.every(goal => final.players.some(player => player.id === goal.playerId)));
  assert.ok(final.goals.every(goal => goal.shot?.every(Number.isFinite)));
  assert.ok(final.goals.some(goal => goal.markers.length > 0));
  for (const player of final.players) assert.deepEqual(visibleStats(final, player.id, 'all'), getMatchData().stats[player.id][0]);
});
test('period goals come from events, not repeated full-game summary columns', () => {
  const data = getMatchData();
  for (const scope of [1, 2, 3]) assert.equal(Object.values(data.stats).reduce((n, values) => n + values[scope].goals, 0), 3);
  assert.equal(data.stats['davos-19'][1].goals, 1);
  assert.equal(data.stats['davos-19'][2].goals, 1);
  assert.equal(data.stats['davos-19'][3].goals, 0);
  assert.equal(data.stats['davos-19'][0].goals, 2);
});
test('API view exposes only completed periods and resolved round results', () => {
  const before = getMatchView(0); assert.deepEqual(before.results, {});
  assert.ok(Object.values(before.stats).every(periods => periods.length === 0));
  const intermission = getMatchView(2);
  assert.ok(Object.values(intermission.stats).every(periods => periods.length === 1));
  assert.deepEqual(Object.keys(intermission.results).sort(), ['p1-ice','p1-shots']);
  assert.deepEqual(intermission.scores, [2,1]);
  assert.deepEqual(getMatchView(6).scores, [6,3]);
  assert.equal(Object.keys(getMatchView(6).results).length+Object.keys(getMatchView(6).teamResults).length, 14);
});
