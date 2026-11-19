import type { MatchView, Question, Round, SavedGame, Team } from './game.ts';
export type TeamMetric = 'shots' | 'xg' | 'passAccuracy';
export type TeamAnswer = Team | 'tie';
export type TeamValues = { shots:number; xg:number; completedPasses:number; attemptedPasses:number };
export type TeamResult = { metric:TeamMetric; values:[number|null,number|null]; winner:TeamAnswer|null };
export const TEAM_LESSONS:Record<TeamMetric,string> = {
  shots:'Shots measure shooting volume. More shots do not necessarily mean better chances.',
  xg:'Expected goals adds up the estimated quality of the shots. It describes chances created, not goals guaranteed.',
  passAccuracy:'Passing success is completed passes divided by attempted passes. A higher percentage does not necessarily mean more passes or more dangerous play.',
};
export function teamValue(values:TeamValues,metric:TeamMetric):number|null {
  if(metric==='shots')return Number.isFinite(values.shots)&&values.shots>=0?values.shots:null;
  if(metric==='xg')return Number.isFinite(values.xg)&&values.xg>=0?Math.round((values.xg+Number.EPSILON)*100)/100:null;
  return Number.isFinite(values.completedPasses)&&Number.isFinite(values.attemptedPasses)&&values.completedPasses>=0&&values.completedPasses<=values.attemptedPasses&&values.attemptedPasses>0?Math.round(values.completedPasses/values.attemptedPasses*1000)/10:null;
}
export function resolveTeam(metric:TeamMetric,davos:TeamValues,us:TeamValues):TeamResult {
  const a=teamValue(davos,metric),b=teamValue(us,metric);
  return {metric,values:[a,b],winner:a===null||b===null?null:a===b?'tie':a>b?'davos':'us'};
}
export function formatTeamValue(metric:TeamMetric,value:number|null) {
  return value===null?'Unavailable':metric==='xg'?value.toFixed(2)+' xG':metric==='passAccuracy'?value.toFixed(1)+'%':value+' shots';
}
export const teamAnswerLabel=(answer:string|undefined)=>answer==='davos'?'HC Davos':answer==='us'?'U.S. Selects':answer==='tie'?'A tie':'No choice yet';
export function predictionPoints(round:Round,question:Question,game:SavedGame,view:MatchView):number {
  if(!game.submitted[round.id])return 0;
  if(question.kind==='team'){
    const result=view.teamResults[question.id];
    return result?.winner && result.winner===game.picks[question.id]?round.points:0;
  }
  return view.results[question.id]?.find(s=>s.playerId===game.picks[question.id])?.points||0;
}

export function teamOutcomeText(result:TeamResult|null|undefined):string {
  if(!result?.winner)return 'Comparison unavailable.';
  if(result.winner==='tie')return 'The teams finished level.';
  const name=teamAnswerLabel(result.winner);
  return name+(result.metric==='shots'?' took more shots.':result.metric==='xg'?' had the higher total xG.':' had the higher passing success rate.');
}
