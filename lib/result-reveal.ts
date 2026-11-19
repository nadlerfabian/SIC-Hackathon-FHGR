import { ROUNDS, formatValue, type MatchView, type Metric, type Question, type RoundId } from './game.ts';
export const PLAYER_LESSONS:Record<Metric,string> = {
  goals:'This counts goals scored by the player. Assists and defensive contributions are recorded separately.',
  assists:'An assist is credited on a goal. A useful pass can still go uncredited if it does not lead to a goal.',
  iceTime:'Ice time shows how much a player was used. More minutes do not automatically mean better performance.',
  skatingSpeed:'This is the fastest recorded burst, not the average speed over a shift.',
  passSpeed:'This is the fastest completed pass. Its speed does not tell us what the receiver did next.',
  distance:'Distance measures how much ground a player covered. It does not tell us whether those movements were effective.',
  shots:'Each shot adds one to this total, whether it comes from close range or the blue line.',
  passes:'This counts completed passes. It does not distinguish a routine pass from one that creates a scoring chance.',
  shotSpeed:'The fastest measured shot counts, whether it scores or not. This number does not measure placement.',
  blocks:'A block means a skater stopped a shot. It does not tell us whether the shot would have gone in.',
};
export function revealValue(metric:Metric,value:number) {
  const units:Partial<Record<Metric,string>>={goals:'goal',assists:'assist',shots:'shot',passes:'pass',blocks:'block'};
  const unit=units[metric];if(unit)return value+' '+unit+(value===1?'':metric==='passes'?'es':'s');
  if(metric==='passSpeed')return value.toFixed(1)+' km/h';
  if(metric==='iceTime'){const seconds=Math.round(value);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  return formatValue(metric,value);
}
export function ordinal(rank:number) {
  const last=rank%100;
  return rank+(last>=11&&last<=13?'th':rank%10===1?'st':rank%10===2?'nd':rank%10===3?'rd':'th');
}
export function playerReveal(question:Extract<Question,{kind:'player'}>,pick:string|undefined,submitted:boolean,view:MatchView) {
  const player=view.players.find(p=>p.id===pick);
  const standings=view.results[question.id]||[];
  const own=standings.find(s=>s.playerId===pick);
  const leaders=standings.filter(s=>s.rank===1);
  const tied=Boolean(own?.rank && standings.filter(s=>s.rank===own.rank).length>1);
  const leader=leaders[0];
  const rival=own?.rank===1?standings.find(s=>s.rank!==null&&s.value<own.value):leader;
  const speed=['skatingSpeed','shotSpeed','passSpeed'].includes(question.metric);
  const zero:Record<Metric,string>={goals:'No goals recorded',assists:'No assists recorded',iceTime:'No ice time recorded',skatingSpeed:'No speed measurement recorded',passSpeed:'No speed measurement recorded',distance:'No distance recorded',shots:'No shots recorded',passes:'No completed passes recorded',shotSpeed:'No speed measurement recorded',blocks:'No blocks recorded'};
  const headline=!submitted?'Not submitted · no points':!player?'No pick recorded':!own?'Result unavailable':own.rank?(tied?'Tied for ':'Finished ')+ordinal(own.rank):speed?'No speed measurement recorded':zero[question.metric];
  let comparison='';
  if(own?.rank===1){
    comparison=tied?'The lead was shared by '+leaders.length+' players.':rival?'Ahead of the next player by '+revealValue(question.metric,own.value-rival.value)+'.':'The only player with a positive recorded value.';
  }else if(leader){
    const name=view.players.find(p=>p.id===leader.playerId)?.name||'The leader';
    comparison=name+(leaders.length>1?' shared the lead with ':' led with ')+revealValue(question.metric,leader.value)+'.';
  }else comparison='No positive values were recorded for this question.';
  if(!submitted)comparison=(player?'This was a draft choice, so it was not scored. ':'No prediction was submitted. ')+comparison;
  const ownValue=own&&Number.isFinite(own.value)&&(own.value>0||!speed)?revealValue(question.metric,own.value):'Not recorded';
  return {player,own,ownValue,leaders,rival,tied,headline,comparison,lesson:PLAYER_LESSONS[question.metric]};
}
export function restoreSeenReveals(raw:string|null):Partial<Record<RoundId,boolean>> {
  try {const value=JSON.parse(raw||'null');return Object.fromEntries(ROUNDS.filter(r=>value?.[r.id]===true).map(r=>[r.id,true]));}catch{return {};}
}
