'use client';
import { useEffect, useId, useState } from 'react';
import { TEAMS, type GoalHighlight } from '@/lib/game';
import { actionSnapshot } from '@/lib/replay';
import HockeyRink from './HockeyRink';
const clock = (time: number) => Math.floor(time/60) + ':' + String(Math.floor(time%60)).padStart(2,'0');
export default function GoalReplay({ goal }: { goal: GoalHighlight }) {
  const events = goal.replay.events;
  const [index,setIndex] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [selected,setSelected] = useState('');
  const arrowId = useId();
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {if(index===events.length-1)setPlaying(false);else setIndex(index+1);},3000);
    const visibility = () => {if(document.hidden)setPlaying(false);};
    document.addEventListener('visibilitychange',visibility);
    return () => {clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
  },[playing,index,events.length]);
  if(!events.length)return <p className="data-caption">No recorded actions available for this goal.</p>;
  const state = actionSnapshot(events,index);
  const event = state.event;
  const action = state.reusedShot ? events[index-1] : event;
  const actionable = ['Pass','Shot'].includes(action.type);
  const color = action.type==='Shot'?'#c83c52':'#145da0';
  const marker = state.markers.find(m=>m.id===selected);
  function step(value: number){setPlaying(false);setIndex(value);setSelected('');}
  return <div className="replay">
    <div className="moment-intro"><strong>The final actions</strong><span>{events.length} recorded moments · no movement inferred</span></div>
    <div className="replay-status"><span>PERIOD {goal.period} · {clock(event.clock)} ELAPSED</span><span>{state.reusedShot?'Scoring-shot positions':state.markers.length?'Recorded snapshot':'Player positions unavailable'}</span></div>
    <div className="scene-rink replay-rink"><HockeyRink markers={state.markers.map(m=>({...m,color:TEAMS[m.team].color,highlighted:m.id===state.actor}))} selectedId={selected} onSelect={id=>{setPlaying(false);setSelected(id);}}>
      <defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill={color}/></marker></defs>
      {actionable && action.start && action.end && <line x1={320+action.start[0]*10} y1={170-action.start[1]*10} x2={320+action.end[0]*10} y2={170-action.end[1]*10} stroke={color} strokeWidth="4" strokeDasharray={action.type==='Pass'?'7 4':undefined} markerEnd={'url(#'+arrowId+')'}/>}
      {actionable && action.start && <circle cx={320+action.start[0]*10} cy={170-action.start[1]*10} r="6" fill="#071d39" stroke="white" strokeWidth="2"/>}
    </HockeyRink>{actionable && action.speed && <div className="replay-action-label">{action.type} · {action.speed.toFixed(1)} {action.type==='Shot'?'km/h':'source units'}</div>}</div>
    <div className="rink-legend"><span><i style={{background:TEAMS.davos.color}}/>Davos</span><span><i style={{background:TEAMS.us.color}}/>U.S. Selects</span><span>Red ring: action taker, not possession</span></div>
    <div className={'replay-caption '+(event.type==='Goal'?'is-goal':'')}><span className="replay-event-type">{event.type}</span><strong>{event.description}</strong>{actionable && <span className="replay-speed">{action.speed?action.speed.toFixed(1)+(action.type==='Shot'?' km/h':' source units'):'Speed not recorded'}</span>}<small>{index>0?(event.time-events[index-1].time).toFixed(1)+'s after previous action':'First available action in this short sequence'}{state.reusedShot?' · Goal event has no positions; showing the scoring shot.':''}{action.type==='Shot' && !action.end?' · Shot destination not recorded; dot marks shot origin.':''}{!state.markers.length?' · No player positions recorded for this action.':''}</small></div>
    <div className="replay-transport"><button className="replay-step" aria-label="Previous action" disabled={index===0} onClick={()=>step(index-1)}>Ⅰ‹</button><button className="replay-play" aria-label={playing?'Pause actions':'Play actions'} onClick={()=>{if(!playing && index===events.length-1)setIndex(0);setPlaying(!playing);}}>{playing?'Ⅱ':'▶'} <span>{playing?'Pause':'Play'}</span></button><button className="replay-step" aria-label="Next action" disabled={index===events.length-1} onClick={()=>step(index+1)}>›Ⅰ</button><span className="moment-pacing">3 seconds<br/>per action</span></div>
    <div className="moment-steps" aria-label="Final recorded actions">{events.map((e,i)=><button key={e.id} aria-current={index===i?'step':undefined} aria-label={'Action '+(i+1)+': '+e.description} className={index===i?'active':''} onClick={()=>step(i)}><b>{i+1}</b><span>{e.type}</span><small>{clock(e.clock)}</small></button>)}</div>
    {selected && <div className="replay-player" role="status"><div><strong>{marker?.name || 'Player not in this snapshot'}</strong>{marker && <span>{TEAMS[marker.team].short} · #{marker.number} · {marker.speed===null?'Speed not recorded':marker.speed.toFixed(1)+' km/h at snapshot'}</span>}</div><button onClick={()=>setSelected('')} aria-label="Close replay player">×</button></div>}
    <p className="data-caption">A short sequence of recorded actions, not a continuous replay. Earlier actions are omitted across gaps over 4 seconds. Snapshots stay still; paths remain visible until the next action. Pass speeds use unverified source units.</p>
  </div>;
}
