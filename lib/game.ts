import type { ReplaySequence } from './replay.ts';
export type Team = 'davos' | 'us';
export type Metric = 'goals' | 'assists' | 'iceTime' | 'skatingSpeed' | 'passSpeed' | 'distance' | 'shots' | 'passes' | 'shotSpeed' | 'blocks';
export type RoundId = 'match' | 'p1' | 'p2' | 'p3';
export type Values = Record<Metric, number>;
export type Player = { id: string; name: string; firstName: string; lastName: string; jersey: number; team: Team; position: string; photo: string | null };
export type Question = { id: string; metric: Metric; title: string; description: string; tag: string };
export type Round = { id: RoundId; title: string; short: string; scope: number; opens: number; locks: number; reveals: number; points: number; questions: Question[] };
export const TEAMS = {
  davos: { name: 'HC Davos', short: 'DAV', color: '#f5cd57' },
  us: { name: 'U.S. Collegiate Selects', short: 'USCS', color: '#89b7ff' },
};
const question = (id: string, metric: Metric, title: string, description: string, tag: string): Question => ({ id, metric, title, description, tag });
export const ROUNDS: Round[] = [
  { id: 'match', title: 'The whole game', short: 'Pre-match', scope: 0, opens: 0, locks: 1, reveals: 6, points: 100, questions: [
    question('m-goals', 'goals', 'Who will score the most goals?', 'Every goal counts. Pick the skater you think will find the net most often.', 'Finishing'),
    question('m-ice', 'iceTime', 'Who will have the most ice time?', 'The total time a skater spends on the ice, across all three periods.', 'Endurance'),
    question('m-speed', 'skatingSpeed', 'Who will skate the fastest?', 'One burst is all it takes. This is the highest recorded skating speed.', 'Speed'),
    question('m-pass', 'passSpeed', 'Who will make the fastest successful pass?', 'The fastest individual pass that actually reaches a teammate.', 'Playmaking'),
    question('m-distance', 'distance', 'Who will cover the most distance?', 'Every meter on the ice adds up, with or without the puck.', 'Work rate'),
  ] },
  { id: 'p1', title: 'Opening period', short: 'Period 1', scope: 1, opens: 0, locks: 1, reveals: 2, points: 50, questions: [
    question('p1-ice', 'iceTime', 'Who will have the most ice time?', 'Count only the time spent on the ice in period 1.', 'Endurance'),
    question('p1-shots', 'shots', 'Who will take the most shots?', 'Pick the skater who will record the most shots in period 1.', 'Attack'),
    question('p1-pass', 'passSpeed', 'Who will make the fastest successful pass?', 'The highest recorded speed of a completed pass in period 1.', 'Playmaking'),
  ] },
  { id: 'p2', title: 'The middle chapter', short: 'Period 2', scope: 2, opens: 2, locks: 3, reveals: 4, points: 50, questions: [
    question('p2-goals', 'goals', 'Who will score the most goals?', 'A fresh start. Only goals scored in period 2 count.', 'Finishing'),
    question('p2-speed', 'skatingSpeed', 'Who will skate the fastest?', 'Pick the fastest burst recorded during period 2.', 'Speed'),
    question('p2-passes', 'passes', 'Who will complete the most passes?', 'Successful passes in period 2. Volume counts, not pass percentage.', 'Playmaking'),
  ] },
  { id: 'p3', title: 'The final push', short: 'Period 3', scope: 3, opens: 4, locks: 5, reveals: 6, points: 50, questions: [
    question('p3-ice', 'iceTime', 'Who will have the most ice time?', 'Who will be trusted with the most minutes in period 3?', 'Endurance'),
    question('p3-shot', 'shotSpeed', 'Who will fire the fastest shot?', 'The fastest measured shot in period 3, whether or not it scores.', 'Power'),
    question('p3-blocks', 'blocks', 'Who will block the most shots?', 'Pick the skater who will stop the most opponent shots in period 3.', 'Defense'),
  ] },
];
export const STAGES = ['Before puck drop', 'Period 1 in play', 'First intermission', 'Period 2 in play', 'Second intermission', 'Period 3 in play', 'Final whistle'];
export const completedPeriods = (stage: number) => stage >= 6 ? 3 : stage >= 4 ? 2 : stage >= 2 ? 1 : 0;
export function roundStatus(round: Round, stage: number): 'upcoming' | 'open' | 'locked' | 'complete' {
  if (stage < round.opens) return 'upcoming';
  if (stage < round.locks) return 'open';
  return stage < round.reveals ? 'locked' : 'complete';
}
export type Standing = { playerId: string; value: number; rank: number | null; points: number };
export function rankPlayers(values: { playerId: string; value: number }[], maxPoints: number): Standing[] {
  const sorted = [...values].sort((a, b) => b.value - a.value || a.playerId.localeCompare(b.playerId));
  let rank = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry.value !== sorted[index - 1].value) rank = index + 1;
    const multiplier = rank === 1 ? 1 : rank === 2 ? .6 : rank === 3 ? .3 : 0;
    return { ...entry, rank: entry.value > 0 ? rank : null, points: entry.value > 0 ? maxPoints * multiplier : 0 };
  });
}
export function formatValue(metric: Metric, value: number): string {
  if (metric === 'iceTime') return Math.floor(value / 60) + ':' + String(Math.round(value % 60)).padStart(2, '0');
  if (metric === 'distance') return value.toLocaleString('en-GB') + ' m';
  if (metric === 'skatingSpeed' || metric === 'shotSpeed') return value.toFixed(1) + ' km/h';
  // PassSpeed units are not verified in the supplied event documentation.
  if (metric === 'passSpeed') return value.toFixed(1) + ' km/h';
  return String(value);
}
export type GoalHighlight = { id: string; period: number; clock: number; playerId: string; assists: string[]; strength: string; shotSpeed: number | null; xg: number | null; shot: [number, number] | null; markers: { id: string; x: number; y: number; number: number; team: Team }[]; replay: ReplaySequence };
export type MatchView = { players: Player[]; availablePeriods: number; stats: Record<string, Values[]>; totals?: Record<string, Values>; goals: GoalHighlight[]; scores: [number, number]; results: Record<string, Standing[]> };
export function visibleStats(view: MatchView, playerId: string, period: string): Values | null {
  const available = view.stats[playerId] || [];
  if (!available.length) return null;
  if (period !== 'all') return available[Number(period) - 1] || null;
  if (view.totals?.[playerId]) return view.totals[playerId];
  return available.reduce((a, b) => Object.fromEntries(Object.keys(a).map(key => [key, ['skatingSpeed', 'passSpeed', 'shotSpeed'].includes(key) ? Math.max(a[key as Metric], b[key as Metric]) : a[key as Metric] + b[key as Metric]])) as Values);
}
export type SavedGame = { version: 1; stage: number; picks: Record<string, string>; submitted: Partial<Record<RoundId, boolean>> };
export const emptyGame = (): SavedGame => ({ version: 1, stage: 0, picks: {}, submitted: {} });
export function restoreGame(raw: string | null, validPlayerIds: string[]): SavedGame {
  try {
    const data = JSON.parse(raw || 'null');
    if (data?.version !== 1 || !Number.isInteger(data.stage) || data.stage < 0 || data.stage > 6) return emptyGame();
    const result = emptyGame(); result.stage = data.stage;
    for (const round of ROUNDS) {
      for (const q of round.questions) if (validPlayerIds.includes(data.picks?.[q.id])) result.picks[q.id] = data.picks[q.id];
      if (data.submitted?.[round.id] === true && round.questions.every(q => result.picks[q.id])) result.submitted[round.id] = true;
    }
    return result;
  } catch { return emptyGame(); }
}
