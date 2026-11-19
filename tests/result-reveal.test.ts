import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROUNDS,rankPlayers,type Question} from '../lib/game.ts';
import {getMatchView} from '../lib/match-data.ts';
import {ordinal,playerReveal,revealValue,restoreSeenReveals} from '../lib/result-reveal.ts';
const q=ROUNDS[0].questions.find((q):q is Extract<Question,{kind:'player'}>=>q.kind==='player'&&q.metric==='goals')!;
const source=getMatchView(6);
const ids=source.players.slice(0,4).map(p=>p.id);
const view=(values:number[])=>({...source,results:{[q.id]:rankPlayers(values.map((value,i)=>({playerId:ids[i],value})),100)}});
test('reveal gives the pick rank and a leader comparison without changing scoring',()=>{
  const v=view([5,3,2,0]),result=playerReveal(q,ids[2],true,v);
  assert.equal(result.headline,'Finished 3rd');
  assert.equal(result.own?.points,30);
  assert.equal(result.rival?.value,5);
  assert.ok(result.comparison.includes('5 goals'));
  assert.ok(result.lesson.includes('goals scored'));
});
test('winners see a margin; tied players are explicitly described as tied',()=>{
  const winner=playerReveal(q,ids[0],true,view([5,3,2,0]));
  assert.equal(winner.comparison,'Ahead of the next player by 2 goals.');
  const tie=playerReveal(q,ids[0],true,view([5,5,2,0]));
  assert.equal(tie.headline,'Tied for 1st');assert.equal(tie.comparison,'The lead was shared by 2 players.');
  const second=playerReveal(q,ids[1],true,view([5,3,3,0]));
  assert.equal(second.headline,'Tied for 2nd');
});
test('missing measurements, zero contributions, and unsubmitted drafts stay distinct',()=>{
  const zero=playerReveal(q,ids[3],true,view([5,3,2,0]));
  assert.equal(zero.ownValue,'0 goals');assert.equal(zero.headline,'No goals recorded');
  const speed={...q,metric:'shotSpeed' as const};
  const missing=playerReveal(speed,ids[3],true,view([5,3,2,0]));
  assert.equal(missing.ownValue,'Not recorded');assert.equal(missing.headline,'No speed measurement recorded');
  const draft=playerReveal(q,ids[0],false,view([5,3,2,0]));
  assert.equal(draft.headline,'Not submitted · no points');
  assert.ok(draft.comparison.startsWith('This was a draft choice'));
  const none=playerReveal(q,undefined,false,view([5,3,2,0]));
  assert.equal(none.player,undefined);assert.ok(none.comparison.startsWith('No prediction was submitted'));
});
test('completed-round seen flags restore safely without replacing saved predictions',()=>{
  assert.deepEqual(restoreSeenReveals('bad'),{});
  assert.deepEqual(restoreSeenReveals(null),{});
  assert.deepEqual(restoreSeenReveals('{"p1":true,"match":false,"fake":true,"p2":"true"}'),{p1:true});
});
test('metric formatting uses meaningful units and correct ordinal suffixes',()=>{
  assert.equal(revealValue('passes',12),'12 passes');
  assert.equal(revealValue('passes',1),'1 pass');
  assert.equal(revealValue('iceTime',119.8),'2:00');
  assert.equal(revealValue('passSpeed',12),'12.0 source units');
  assert.deepEqual([1,2,3,4,11,12,13,21].map(ordinal),['1st','2nd','3rd','4th','11th','12th','13th','21st']);
});
