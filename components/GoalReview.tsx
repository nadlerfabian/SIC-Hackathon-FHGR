'use client';
import { useState } from 'react';
import type { GoalHighlight } from '@/lib/game';
import GoalReplay from './GoalReplay';
import TrackingReplay from './TrackingReplay';

export default function GoalReview({goal}: {goal:GoalHighlight}) {
  const [mode,setMode] = useState<'tracking'|'recorded'>('tracking');
  return <>
    <div className="replay-scope" role="group" aria-label="Goal review source">
      <button className={mode==='tracking'?'active':''} aria-pressed={mode==='tracking'} onClick={()=>setMode('tracking')}>Smooth demo<small>Synthetic tracking</small></button>
      <button className={mode==='recorded'?'active':''} aria-pressed={mode==='recorded'} onClick={()=>setMode('recorded')}>Recorded actions<small>Real event snapshots</small></button>
    </div>
    {mode==='tracking'?<TrackingReplay goal={goal}/>:<GoalReplay goal={goal}/>}
  </>;
}
