import {resolveTeam,type TeamValues} from './team-picks.ts';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from './csv.ts';
import { buildReplay } from './replay.ts';
import { ROUNDS, completedPeriods, rankPlayers, type Player, type Team, type Values, type MatchView, type GoalHighlight } from './game.ts';
import roster from './roster.json' with { type: 'json' };

const zero = (): Values => ({ goals: 0, assists: 0, iceTime: 0, skatingSpeed: 0, passSpeed: 0, distance: 0, shots: 0, passes: 0, shotSpeed: 0, blocks: 0 });
type Roster = { team: string; name: string; jersey: number; position: string; photo: string | null; source: string };
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/gi, '').toLowerCase();
let cached: ReturnType<typeof load> | undefined;
function load() {
  // Deployment supplies these files at runtime; do not trace private data into the build.
  const directory = path.resolve(/* turbopackIgnore: true */ process.env.MATCH_DATA_DIR || path.join(process.cwd(), 'data'));
  const files = readdirSync(/* turbopackIgnore: true */ directory);
  const csv = (part: string) => {
    const file = files.find(file => file.includes(part) && file.endsWith('.csv'));
    if (!file) throw new Error('Missing match source: ' + part);
    return parseCsv(readFileSync(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ directory, file), 'utf8'));
  };
  const totals = csv('Statistics_31_12_2025 All'); const events = csv('Wisehockey_Match_Events');
  const idOf = (team: Team, jersey: string) => team + '-' + jersey;
  const players: Player[] = totals.map(row => {
    const team: Team = row.Team === 'HC Davos' ? 'davos' : 'us';
    const name = row.FirstName + ' ' + row.LastName;
    const candidates = (roster as Roster[]).filter(p => p.team === team);
    const metadata = candidates.find(p => normalize(p.name) === normalize(name))
      || candidates.find(p => p.jersey === Number(row.Jersey))
      || candidates.find(p => normalize(p.name).endsWith(normalize(row.LastName)));
    return { id: idOf(team, row.Jersey), name, firstName: row.FirstName, lastName: row.LastName, jersey: Number(row.Jersey), team, position: metadata?.position === 'Defence' ? 'Defense' : metadata?.position || 'Skater', photo: metadata?.photo || null };
  }).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const stats: Record<string, Values[]> = Object.fromEntries(players.map(p => [p.id, [zero(), zero(), zero(), zero()]]));
  const measurement=(raw:string|undefined)=>raw?.trim()?Number(raw):NaN;
  const emptyTeam=():TeamValues=>({shots:0,xg:0,completedPasses:0,attemptedPasses:0});
  const teamStats:Record<Team,TeamValues[]>={davos:[emptyTeam(),emptyTeam(),emptyTeam(),emptyTeam()],us:[emptyTeam(),emptyTeam(),emptyTeam(),emptyTeam()]};
  for (const period of [0, 1, 2, 3]) {
    for (const row of period === 0 ? totals : csv('Statistics_31_12_2025 P' + period)) {
      const id = idOf(row.Team === 'HC Davos' ? 'davos' : 'us', row.Jersey);
      const t=teamStats[row.Team==='HC Davos'?'davos':'us'][period];
      t.shots+=measurement(row.S);t.xg+=measurement(row.xGsum);t.completedPasses+=measurement(row.Passes);t.attemptedPasses+=measurement(row['All passes']);
      stats[id][period] = { ...zero(), iceTime: Number(row['TOI (s)']), skatingSpeed: Number(row['SPD TOP (km/h)']), distance: Number(row['Dist (m)']), shots: Number(row.S), passes: Number(row.Passes), shotSpeed: Number(row['S TOP (km/h)']), blocks: Number(row.BKS) };
    }
  }
  const ids = new Map<string, string>();
  function mapId(tag: string, name: string, side: string) {
    const jersey = name.match(/^#(\d+)\s/)?.[1];
    if (!tag || !jersey) return;
    const id = idOf(side === 'Away' ? 'davos' : 'us', jersey);
    if (stats[id]) ids.set(tag, id); // Goalkeepers have no skater entry and are excluded.
  }
  for (const row of events) {
    mapId(row.EventPrimaryPlayerId, row.EventPrimaryPlayerName, row.EventPrimaryTeam);
    mapId(row.EventSecondaryPlayerId, row.EventSecondaryPlayerName, row.EventSecondaryTeam);
    for (let i = 1; i <= 12; i++) mapId(row['StartPlayerId' + i], row['StartPlayerName' + i], row['StartPlayerTeam' + i]);
  }
  const scores: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0]];
  for (const row of events) {
    const period = Number(row.Period); const id = ids.get(row.EventPrimaryPlayerId);
    if (![1, 2, 3].includes(period)) continue;
    if (row.EventType === 'Goal') {
      const side = row.EventPrimaryTeam === 'Away' ? 0 : 1;
      scores[period][side]++; scores[0][side]++;
      if (id) for (const scope of [0, period]) stats[id][scope].goals++;
      for (const tag of new Set([row.GoalAssist1Id, row.GoalAssist2Id].filter(Boolean))) {
        const assist = ids.get(tag); if (assist) for (const scope of [0, period]) stats[assist][scope].assists++;
      }
    }
    if (id && row.EventType === 'Pass' && row.PassResult === 'Successful' && row.PassSpeed !== '') {
      for (const scope of [0, period]) stats[id][scope].passSpeed = Math.max(stats[id][scope].passSpeed, Number(row.PassSpeed));
    }
  }
  for (const row of totals) {
    const id = idOf(row.Team === 'HC Davos' ? 'davos' : 'us', row.Jersey);
    if (stats[id][0].goals !== Number(row.G) || stats[id][0].assists !== Number(row.A)) throw new Error('Event and full-game scoring disagree for ' + id);
  }
  const goals: GoalHighlight[] = events.filter(row => row.EventType === 'Goal').map((row, index) => {
    const clock = Number(row.MatchClock);
    const shot = events.filter(event => event.EventType === 'Shot' && event.ShotResult === 'Goal' && event.Period === row.Period && event.EventPrimaryPlayerId === row.EventPrimaryPlayerId && Math.abs(Number(event.MatchClock) - clock) <= 3).sort((a, b) => Math.abs(Number(a.MatchClock) - clock) - Math.abs(Number(b.MatchClock) - clock))[0];
    const coordinate = (raw: string | undefined): [number, number] | null => {
      if (!raw) return null;
      const pair = raw.split(',').map(Number);
      return pair.length === 2 && pair.every(Number.isFinite) ? [pair[0], pair[1]] : null;
    };
    const markers: GoalHighlight['markers'] = [];
    if (shot) for (let i = 1; i <= 12; i++) {
      const xy = coordinate(shot['StartPlayerCoordinates' + i]);
      const number = shot['StartPlayerName' + i].match(/^#(\d+)/)?.[1];
      if (xy && number) markers.push({ id: shot['StartPlayerId' + i], x: xy[0], y: xy[1], number: Number(number), team: shot['StartPlayerTeam' + i] === 'Away' ? 'davos' : 'us' });
    }
    return { id: 'goal-' + index, timestamp: Number(row.Timestamp), period: Number(row.Period), clock, playerId: ids.get(row.EventPrimaryPlayerId)!, assists: [row.GoalAssist1Id, row.GoalAssist2Id].map(tag => ids.get(tag)).filter((id): id is string => Boolean(id)), strength: row.TeamStrength, shotSpeed: Number(shot?.ShotSpeed) > 0 ? Number(shot.ShotSpeed) : null, xg: shot?.ShotXG ? Number(shot.ShotXG) : null, shot: coordinate(shot?.EventStartCoordinate), markers, replay: buildReplay(events, events.indexOf(row)) };
  });
  return { players, stats, teamStats, scores, goals, eventCount: events.length };
}
export function getMatchData() { return cached ??= load(); }
export function getMatchView(stage: number): MatchView {
  const data = getMatchData(); const availablePeriods = completedPeriods(stage);
  const results: MatchView['results'] = {};
  const teamResults:MatchView['teamResults']={};
  for (const round of ROUNDS) if (stage >= round.reveals) {
    for (const q of round.questions) {
      if(q.kind==='team')teamResults[q.id]=resolveTeam(q.metric,data.teamStats.davos[round.scope],data.teamStats.us[round.scope]);
      else results[q.id] = rankPlayers(data.players.map(p => ({ playerId: p.id, value: data.stats[p.id][round.scope][q.metric] })), round.points);
    }
  }
  return {
    players: data.players, availablePeriods, results, teamResults,
    teamStats:{davos:data.teamStats.davos.slice(1,availablePeriods+1),us:data.teamStats.us.slice(1,availablePeriods+1)},
    goals: data.goals.filter(goal => goal.period <= availablePeriods),
    ...(availablePeriods === 3 ? { totals: Object.fromEntries(data.players.map(p => [p.id, data.stats[p.id][0]])) } : {}),
    stats: Object.fromEntries(data.players.map(p => [p.id, data.stats[p.id].slice(1, availablePeriods + 1)])),
    scores: data.scores.slice(1, availablePeriods + 1).reduce<[number, number]>((sum, value) => [sum[0] + value[0], sum[1] + value[1]], [0, 0]),
  };
}
