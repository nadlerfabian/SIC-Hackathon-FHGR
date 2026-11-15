import type { Team } from './game.ts';
export type Point = [number, number];
export type ReplayMarker = { id: string; x: number; y: number; number: number; team: Team; name: string; speed: number | null };
export type ReplayEvent = { id: string; time: number; clock: number; type: string; primary: string; secondary: string; involved: string[]; description: string; start: Point | null; end: Point | null; speed: number | null; result: string; markers: ReplayMarker[] };
export type ReplaySequence = { events: ReplayEvent[]; duration: number; hasFaceoff: boolean };
type Row = Record<string, string>;
function point(raw: string | undefined): Point | null {
  if (!raw?.trim()) return null;
  const values = raw.split(',').map(Number);
  return values.length === 2 && values.every(Number.isFinite) ? [values[0], values[1]] : null;
}
const name = (raw: string) => raw?.replace(/^#\d+\s+/, '') || 'Unknown player';
const positive = (raw: string) => Number.isFinite(Number(raw)) && Number(raw) > 0 ? Number(raw) : null;
// Discrete final actions; stop rather than joining play across missing time.
export function goalSequence(sequence: ReplaySequence): ReplaySequence {
  const actions = sequence.events.filter(event => ['Pass','Shot','Goal'].includes(event.type));
  const goal = actions.at(-1);
  if (!goal) return {events:[],duration:0,hasFaceoff:false};
  const chosen = [goal];
  for (let i = actions.length - 2; i >= 0 && chosen.length < 5; i--) {
    const event = actions[i];
    if (goal.time - event.time > 12 || chosen[0].time - event.time > 4) break;
    chosen.unshift(event);
  }
  const origin = chosen[0].time;
  return {events:chosen.map(event => ({...event,time:event.time-origin})),duration:goal.time-origin,hasFaceoff:false};
}
export function actionSnapshot(events: ReplayEvent[], index: number) {
  const event = events[index];
  const shot = event?.type === 'Goal' && index > 0 && events[index-1].type === 'Shot' && events[index-1].primary === event.primary ? events[index-1] : undefined;
  const reusedShot = Boolean(!event.markers.length && shot?.markers.length);
  return {event,markers:reusedShot ? shot!.markers : event.markers,reusedShot,actor:event.primary || null};
}
export function buildReplay(rows: Row[], goalIndex: number): ReplaySequence {
  const goal = rows[goalIndex];
  let start = goalIndex;
  while (start > 0 && rows[start - 1].Period === goal.Period && rows[start].EventType !== 'Faceoff') start--;
  const slice = rows.slice(start, goalIndex + 1).filter(row => row.Period === goal.Period && row.Timestamp && Number.isFinite(Number(row.Timestamp)));
  const origin = Number(slice[0]?.Timestamp || goal.Timestamp);
  const events = slice.map((row, index): ReplayEvent => {
    const markers: ReplayMarker[] = [];
    for (let slot = 1; slot <= 12; slot++) {
      const xy = point(row['StartPlayerCoordinates' + slot]);
      const id = row['StartPlayerId' + slot];
      const number = row['StartPlayerName' + slot]?.match(/^#(\d+)/)?.[1];
      const side = row['StartPlayerTeam' + slot];
      if (xy && id && number && ['Home','Away'].includes(side)) markers.push({id, x:xy[0], y:xy[1], number:Number(number), team:side === 'Away' ? 'davos' : 'us', name:name(row['StartPlayerName' + slot]), speed:row['StartPlayerVelocity' + slot]?.trim() && Number.isFinite(Number(row['StartPlayerVelocity' + slot])) ? Number(row['StartPlayerVelocity' + slot]) * 3.6 : null});
    }
    const actor = name(row.EventPrimaryPlayerName);
    const receiver = name(row.EventSecondaryPlayerName);
    const type = row.EventType;
    const result = type === 'Pass' ? row.PassResult : type === 'Shot' ? row.ShotResult : '';
    const descriptions: Record<string, string> = {
      Faceoff:'Faceoff · play begins', Pass:actor + ' passes' + (row.EventSecondaryPlayerName ? ' to ' + receiver : '') + (result ? ' · ' + result : ''), Shot:actor + ' shoots' + (result ? ' · ' + result : ''), Goal:actor + ' scores!',
      PuckControl:row.PuckControlState === 'Contested' ? 'Puck contested' : row.PuckControlState === 'Loose' ? 'Loose puck' : (row.PuckControlState === 'AwayControl' ? 'Davos' : row.PuckControlState === 'HomeControl' ? 'U.S. Selects' : actor) + ' in control',
      BluelineCrossing:actor + ' crosses the blue line', Dump:actor + ' dumps the puck', Clear:actor + ' clears the zone', Penalty:'Penalty · ' + (row.PenaltyReason || actor), StoppageOfPlay:'Play stopped · ' + (row.StoppageOfPlayReason || ''),
    };
    return {id:'event-' + (start + index), time:(Number(row.Timestamp) - origin) / 1000, clock:Number(row.MatchClock), type, primary:row.EventPrimaryPlayerId, secondary:row.EventSecondaryPlayerId, involved:(row.ParticipatingPlayerIds || '').split(',').filter(Boolean), description:descriptions[type] || type, start:point(row.EventStartCoordinate), end:point(row.EventEndCoordinate), speed:positive(type === 'Pass' ? row.PassSpeed : type === 'Shot' ? row.ShotSpeed : ''), result, markers};
  });
  return goalSequence({events, duration:events.at(-1)?.time || 0, hasFaceoff:slice[0]?.EventType === 'Faceoff'});
}
