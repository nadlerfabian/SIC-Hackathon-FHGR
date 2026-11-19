'use client';
import { useEffect, useMemo, useState } from 'react';
import type { GoalHighlight } from '@/lib/game';
import { TEAMS } from '@/lib/game';
import { alignTracking, parseTracking, trackingAt, type TrackingClip } from '@/lib/tracking';
import HockeyRink from './HockeyRink';

const relative = (milliseconds:number) => (milliseconds>0?'+':'')+(milliseconds/1000).toFixed(1)+'s';
export default function TrackingReplay({goal}:{goal:GoalHighlight}) {
  const [source,setSource] = useState<TrackingClip|null>(null);
  const [error,setError] = useState(false);
  const [retry,setRetry] = useState(0);
  const [time,setTime] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [rate,setRate] = useState(1);
  const [selected,setSelected] = useState('');
  useEffect(()=>{
    const controller=new AbortController();
    setError(false);
    fetch('/demo/tier3-synthetic.json',{signal:controller.signal}).then(response=>{
      if(!response.ok)throw new Error('Tracking unavailable');
      return response.json();
    }).then(value=>setSource(parseTracking(value))).catch(e=>{if(e.name!=='AbortError')setError(true);});
    return ()=>controller.abort();
  },[retry]);
  const clip=useMemo(()=>source?alignTracking(source,goal.timestamp):null,[source,goal.timestamp]);
  const duration=clip?clip.frames.at(-1)!.timestamp-clip.frames[0].timestamp:0;
  useEffect(()=>{
    if(!playing || !clip)return;
    let frame=0, last=performance.now();
    const tick=(now:number)=>{
      const elapsed=(now-last)*rate;last=now;
      setTime(value=>Math.min(duration,value+elapsed));
      frame=requestAnimationFrame(tick);
    };
    const visibility=()=>{if(document.hidden)setPlaying(false);};
    document.addEventListener('visibilitychange',visibility);
    frame=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[playing,rate,clip,duration]);
  useEffect(()=>{if(time>=duration && duration)setPlaying(false);},[time,duration]);
  if(error)return <div className="tracking-notice" role="alert">The synthetic clip could not be loaded. <button className="text-button" onClick={()=>setRetry(v=>v+1)}>Retry</button></div>;
  if(!clip)return <p role="status" className="data-caption">Loading synthetic tracking…</p>;
  const timestamp=clip.frames[0].timestamp+time;
  const positions=trackingAt(clip,timestamp);
  const attack=goal.playerId.startsWith('davos-')?'davos':'us';
  const teamFor=(team:string|null)=>team==='attack'?attack:attack==='davos'?'us':'davos';
  const markerPositions=(positions||[]).filter(p=>p.entityId!=='puck');
  const puck=positions?.find(p=>p.entityId==='puck');
  const selectedEntity=clip.entities.find(e=>e.id===selected);
  const activeMoment=[...clip.moments].reverse().find(m=>m.timestamp<=timestamp);
  const trail=Array.from({length:16},(_,i)=>trackingAt(clip,timestamp-(15-i)*30)?.find(p=>p.entityId==='puck')).filter(p=>p!==undefined);
  function seek(value:number){setPlaying(false);setTime(value);}
  return <div className="tracking-replay">
    <div className="tracking-notice"><strong>SYNTHETIC · NOT A REAL RECONSTRUCTION</strong><p>Fictional players, passes and movement. The same demo sequence is aligned to each selected goal’s real timestamp.</p></div>
    <div className="tracking-meta"><span>20 Hz samples · smooth playback</span><span>{relative(timestamp-goal.timestamp)} from goal</span></div>
    <div className="scene-rink replay-rink tracking-rink">
      <HockeyRink markers={markerPositions.map(p=>{const e=clip.entities.find(e=>e.id===p.entityId)!;return {...p,id:e.id,number:e.number,name:e.label,color:TEAMS[teamFor(e.team)].color};})} selectedId={selected} onSelect={id=>{setSelected(id);setPlaying(false);}}>
        {trail.length>1 && <polyline points={trail.map(p=>(320+p.x*10)+','+(170-p.y*10)).join(' ')} fill="none" stroke="#122b45" strokeWidth="3" opacity=".45"/>}
      </HockeyRink>
      {puck && <svg viewBox="0 0 640 340" className="tracking-puck" aria-label="Synthetic puck position"><circle cx={320+puck.x*10} cy={170-puck.y*10} r="7" fill="#061a2e" stroke="#fff" strokeWidth="2"/></svg>}
      {!positions && <div className="replay-gap">Tracking gap<small>Movement is not inferred across missing samples.</small></div>}
    </div>
    <div className="rink-legend"><span><i style={{background:TEAMS[attack].color}}/>Demo attack</span><span><i style={{background:TEAMS[attack==='davos'?'us':'davos'].color}}/>Demo defence</span><span>● Puck · G Goalies</span></div>
    <div className="tracking-controls">
      <button className="replay-step" aria-label="Restart synthetic clip" onClick={()=>seek(0)}>↺</button>
      <button className="replay-play" onClick={()=>{if(time>=duration)setTime(0);setPlaying(v=>!v);}}>{playing?'Pause':'Play'}</button>
      <label className="replay-rate"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={rate} onChange={e=>setRate(Number(e.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
    </div>
    <label className="sr-only" htmlFor={'tracking-time-'+goal.id}>Tracking time</label><input id={'tracking-time-'+goal.id} className="replay-scrubber" type="range" min="0" max={duration} step="10" value={time} onChange={e=>seek(Number(e.target.value))} aria-valuetext={relative(timestamp-goal.timestamp)+' from goal'}/>
    <div className="replay-time"><span>−10s buildup</span><span>{time>=10000?'After the demo goal':activeMoment?activeMoment.label+' · illustrative':'Demo buildup'}</span><span>+3s</span></div>
    <div className="tracking-moments" aria-label="Synthetic sequence moments">{clip.moments.map((m,i)=><button key={i} onClick={()=>seek(m.timestamp-clip.frames[0].timestamp)} className={activeMoment===m?'active':''}>{m.label}<small>{relative(m.timestamp-goal.timestamp)}</small></button>)}</div>
    {selectedEntity && <div className="replay-player"><div><strong>{selectedEntity.label}</strong><span>Fictional identity · not a match participant</span></div><button aria-label="Close demo player" onClick={()=>setSelected('')}>×</button></div>}
    <p className="tracking-footnote">Demo coordinates use a provisional format, not the confirmed Wisehockey schema. Real Tier 3 samples can replace this source through the tracking adapter. Recorded scoring stats below remain separate.</p>
  </div>;
}
