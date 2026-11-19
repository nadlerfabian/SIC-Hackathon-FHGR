'use client';
import type {MatchView,Question,Round,SavedGame} from '@/lib/game';
import {TEAMS} from '@/lib/game';
import {formatTeamValue,predictionPoints,TEAM_LESSONS,teamOutcomeText,teamAnswerLabel,teamValue,type TeamAnswer} from '@/lib/team-picks';
import {Jersey} from './PlayerArt';
import ResponsiveDisclosure from './ResponsiveDisclosure';
type TeamQuestion=Extract<Question,{kind:'team'}>;

export function TeamChoices({question,round,view,answer,disabled,onChoose}:{question:TeamQuestion;round:Round;view:MatchView;answer?:string;disabled:boolean;onChoose:(value:TeamAnswer)=>void}) {
  const previous=round.scope>1 && view.availablePeriods>=round.scope-1 ? round.scope-2 : -1;
  const a=previous>=0?view.teamStats.davos[previous]:undefined,b=previous>=0?view.teamStats.us[previous]:undefined;
  return <div className="team-prediction">
    <div className="team-pick-options" role="group" aria-label="Choose a team or a tie">
      {(['davos','us'] as const).map(team=><button key={team} className={'team-pick-option '+(answer===team?'chosen':'')} aria-pressed={answer===team} disabled={disabled} onClick={()=>onChoose(team)}><Jersey team={team}/><strong>{teamAnswerLabel(team)}</strong><span>{answer===team?'✓ Selected':'Choose team'}</span></button>)}
      <button className={'team-tie-option '+(answer==='tie'?'chosen':'')} aria-pressed={answer==='tie'} disabled={disabled} onClick={()=>onChoose('tie')}>{answer==='tie'?'✓ Tie selected':'Pick a tie'}</button>
    </div>
    {a&&b&&<p className="team-previous">Period {round.scope-1}: <strong>DAV {formatTeamValue(question.metric,teamValue(a,question.metric))}</strong><span> · </span><strong>USCS {formatTeamValue(question.metric,teamValue(b,question.metric))}</strong></p>}
  </div>;
}

export function TeamReview({question,round,game,view,status,onEdit}:{question:TeamQuestion;round:Round;game:SavedGame;view:MatchView;status:string;onEdit:()=>void}) {
  const result=view.teamResults[question.id],points=predictionPoints(round,question,game,view);
  return <ResponsiveDisclosure className="review-disclosure" title={question.title} meta={status==='complete'?'+'+points+' pts':teamAnswerLabel(game.picks[question.id])}>
    <article className="review-card team-review">
      <div className="review-question"><h3>{question.title}</h3>{status==='open'&&<button className="text-button" onClick={onEdit}>Edit</button>}</div>
      <div className="team-review-pick"><div><span className="label">YOUR TEAM PICK</span><strong>{teamAnswerLabel(game.picks[question.id])}</strong></div>{status==='complete'&&<strong className="lime-text">+{points} pts</strong>}</div>
      {status==='complete'&&result&&<>
        <p className="team-result-title">{teamOutcomeText(result)}</p>
        <div className="team-result-values">{(['davos','us'] as const).map((team,i)=><div key={team}><span>{TEAMS[team].short}</span><strong>{formatTeamValue(question.metric,result.values[i])}</strong></div>)}</div>
        <p className="team-lesson">{TEAM_LESSONS[question.metric]}</p>
        <details className="team-method"><summary>How is this measured?</summary><p>{question.metric==='passAccuracy'?'Completed passes ÷ attempted passes, pooled across all skaters. Player percentages are not averaged. Ties use the displayed percentage (one decimal place).':question.metric==='xg'?'Sum of individual shot xG totals, not on-ice xGF. Ties use the displayed value (two decimal places).':'Sum of the skaters’ recorded shot totals for the selected scope. Equal totals count as a tie.'} All strengths are included. If either side has no valid measurement, no points are awarded.</p></details>
      </>}
      {status==='open'&&<button className="text-button mobile-review-edit" onClick={onEdit}>Change team pick</button>}
    </article>
  </ResponsiveDisclosure>;
}
