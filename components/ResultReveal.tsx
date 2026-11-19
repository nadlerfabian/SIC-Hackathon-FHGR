'use client';
import {useEffect,useRef,useState} from 'react';
import {TEAMS,type MatchView,type Round,type SavedGame} from '@/lib/game';
import {formatTeamValue,predictionPoints,TEAM_LESSONS,teamOutcomeText,teamAnswerLabel} from '@/lib/team-picks';
import {playerReveal,revealValue} from '@/lib/result-reveal';
import {Jersey,PlayerArt} from './PlayerArt';

export default function ResultReveal({round,game,view,onOverview,onComplete,onAllRounds}:{round:Round;game:SavedGame;view:MatchView;onOverview:()=>void;onComplete:()=>void;onAllRounds:()=>void}) {
  const [index,setIndex]=useState(0);
  const root=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const pointer=useRef<{x:number;y:number}|null>(null);
  const finished=index===round.questions.length;
  const question=round.questions[index];
  const submitted=Boolean(game.submitted[round.id]);
  const points=question?predictionPoints(round,question,game,view):0;
  const total=round.questions.reduce((n,q)=>n+predictionPoints(round,q,game,view),0);
  useEffect(()=>{
    heading.current?.focus({preventScroll:true});
    root.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  },[index]);
  function go(next:number){if(next<0||next>round.questions.length)return;setIndex(next);if(next===round.questions.length)onComplete();}
  const player=question?.kind==='player'?playerReveal(question,game.picks[question.id],submitted,view):null;
  const team=question?.kind==='team'?view.teamResults[question.id]:null;
  const chosen=question?game.picks[question.id]:undefined;
  return <section ref={root} className="result-reveal" aria-label={round.short+' result cards'}
    onKeyDown={e=>{if((e.target as HTMLElement).closest('details,select,input,a'))return;if(e.key==='ArrowRight'){e.preventDefault();go(index+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(index-1);}}}
    onPointerDown={e=>{pointer.current=null;if(e.pointerType==='touch'&&!(e.target as HTMLElement).closest('button,details,a,select,input'))pointer.current={x:e.clientX,y:e.clientY};}}
    onPointerCancel={()=>{pointer.current=null;}}
    onPointerUp={e=>{const start=pointer.current;pointer.current=null;if(start&&Math.abs(e.clientY-start.y)<45&&Math.abs(e.clientX-start.x)>65)go(index+(e.clientX<start.x?1:-1));}}>
    <div className="reveal-toolbar"><span>{round.short} · {finished?'Round complete':(index+1)+' of '+round.questions.length}</span>{!finished&&<button className="text-button" onClick={onOverview}>View all results</button>}</div>
    {!finished?<article key={question.id} className="reveal-card">
      <div className="reveal-card-top"><span>{question.kind==='team'?'TEAM PICK':question.tag}</span><strong>+{points} pts</strong></div>
      <h2 ref={heading} tabIndex={-1}>{question.title}</h2>
      {player&&question.kind==='player'?<>
        <div className="reveal-identity">{player.player?<><PlayerArt player={player.player} large/><div><span>{submitted?'YOUR PICK':'YOUR DRAFT'}</span><h3>{player.player.name}</h3><small>{TEAMS[player.player.team].short} · #{player.player.jersey} · {player.player.position}</small></div></>:<div><span>NO SUBMITTED PICK</span><h3>Round results</h3></div>}</div>
        <p className="reveal-headline">{player.headline}</p>
        <div className="reveal-comparison">
          {player.player&&<div><span>{submitted?'Your player':'Draft player'}</span><strong>{player.ownValue}</strong></div>}
          <div><span>{player.own?.rank===1?(player.tied?'Joint leaders':'Next highest'):'Leader'}</span><strong>{player.own?.rank===1&&player.tied?revealValue(question.metric,player.own.value):player.rival?revealValue(question.metric,player.rival.value):'No positive value'}</strong></div>
        </div>
        <p className="reveal-comparison-text">{player.comparison}</p>
        <div className="reveal-lesson"><span>ABOUT THIS STAT</span><p>{player.lesson}</p></div>
        <details className="reveal-details"><summary>Show details</summary><p>{round.scope?'Period '+round.scope+' only.':'Full-match totals.'} {question.description}</p><ol>{(view.results[question.id]||[]).filter(s=>s.rank&&s.rank<=3).map(s=><li key={s.playerId}><span>#{s.rank} {view.players.find(p=>p.id===s.playerId)?.name}</span><strong>{revealValue(question.metric,s.value)}</strong></li>)}</ol>{!player.leaders.length&&<p>No positive recorded values are available.</p>}</details>
      </>:question.kind==='team'?<>
        <div className="reveal-identity">{chosen==='davos'||chosen==='us'?<Jersey team={chosen}/>:<span className="reveal-tie">{chosen==='tie'?'=':'?'}</span>}<div><span>{submitted?'YOUR TEAM PICK':chosen?'YOUR DRAFT':'NO SUBMITTED PICK'}</span><h3>{teamAnswerLabel(chosen)}</h3></div></div>
        <p className="reveal-headline">{!submitted?'Not submitted · no points':!team?.winner?'Result unavailable':team.winner===chosen?'Correct prediction':'Incorrect prediction'}</p>
        <div className="reveal-comparison">{(['davos','us'] as const).map((t,i)=><div key={t}><span>{TEAMS[t].short}</span><strong>{formatTeamValue(question.metric,team?.values[i]??null)}</strong></div>)}</div>
        <p className="reveal-comparison-text">{teamOutcomeText(team)}</p>
        <div className="reveal-lesson"><span>ABOUT THIS STAT</span><p>{TEAM_LESSONS[question.metric]}</p></div>
        <details className="reveal-details"><summary>Show details</summary><p>{question.metric==='passAccuracy'?'Team percentage = total completed passes ÷ total attempted passes. Player percentages are not averaged. Ties use one decimal place.':question.metric==='xg'?'Individual shooter xG values are added together. On-ice xGF is not summed. Ties use two decimal places.':'Individual shot totals are added together. Equal totals count as a tie.'} {round.scope?'Period '+round.scope+' only.':'Full match.'} All strengths are included. Only submitted picks earn points.</p></details>
      </>:null}
    </article>:<article className="reveal-card reveal-finish"><span className="eyebrow muted">{round.short} complete</span><h2 ref={heading} tabIndex={-1}>Round results</h2><strong className="reveal-total">{total}<small> / {round.points*round.questions.length} pts</small></strong><p>{submitted?'Your score includes player finishes and your team pick.':'This round was not submitted, so no points were earned.'}</p><button className="button lime" onClick={onOverview}>View all results</button><button className="text-button" onClick={onAllRounds}>Back to rounds</button></article>}
    <div className="reveal-navigation"><button className="button ghost" disabled={index===0} onClick={()=>go(index-1)}>Back</button>{!finished&&<button className="button lime" onClick={()=>go(index+1)}>{index===round.questions.length-1?'Round score':'Next result'}</button>}</div>
  </section>;
}
