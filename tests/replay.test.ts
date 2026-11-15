import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildReplay, goalSequence, actionSnapshot, type ReplayEvent} from '../lib/replay.ts';
import {getMatchView} from '../lib/match-data.ts';
const event = (type:string,time:number): ReplayEvent => ({id:type+time,type,time,clock:time,primary:'actor',secondary:'receiver',involved:['actor','receiver','other'],description:type,start:[1,2],end:[3,4],speed:10,result:'',markers:[]});
test('reviews contain at most five final actions and never bridge large gaps',()=>{
  for(const goal of getMatchView(6).goals){
    const events=goal.replay.events;
    assert.ok(events.length>=1 && events.length<=5);
    assert.equal(events.at(-1)?.type,'Goal');
    assert.equal(events.at(-1)?.clock,goal.clock);
    assert.ok(events.every((e,i)=>['Pass','Shot','Goal'].includes(e.type) && (!i || e.time-events[i-1].time<=4)));
    assert.ok(goal.replay.duration<=12);
  }
  assert.deepEqual(getMatchView(6).goals[2].replay.events.map(e=>e.type),['Shot','Goal']);
  assert.equal(getMatchView(0).goals.length,0);
  assert.ok(getMatchView(2).goals.every(g=>g.period===1));
});
test('selection drops bookkeeping events, stops at gaps, and retains chronological actions',()=>{
  const selected=goalSequence({events:[event('Pass',0),event('Pass',8),event('PuckControl',9),event('Shot',10),event('Goal',11)],duration:11,hasFaceoff:false});
  assert.deepEqual(selected.events.map(e=>e.type),['Pass','Shot','Goal']);
  assert.deepEqual(selected.events.map(e=>e.time),[0,2,3]);
});
test('only the primary actor is highlighted, regardless of the participating-player list',()=>{
  const pass=event('Pass',0);
  const state=actionSnapshot([pass],0);
  assert.equal(state.actor,'actor');
  assert.notEqual(state.actor,pass.secondary);
  assert.ok(pass.involved.includes('other'));
});
test('a missing shot snapshot is never borrowed from a previous pass; goal may explicitly reuse its scoring shot',()=>{
  const pass=event('Pass',0);
  pass.markers=[{id:'actor',x:1,y:2,number:2,team:'davos',name:'Player',speed:7.2}];
  const shot=event('Shot',1),goal=event('Goal',2);
  assert.deepEqual(actionSnapshot([pass,shot,goal],1).markers,[]);
  shot.markers=pass.markers;
  assert.equal(actionSnapshot([pass,shot,goal],2).reusedShot,true);
  goal.primary='different';
  assert.deepEqual(actionSnapshot([pass,shot,goal],2).markers,[]);
});
test('parsing preserves subsecond action timestamps, speed values and snapshot-only velocity conversion',()=>{
  const rows:Record<string,string>[]=[
    {Period:'1',Timestamp:'100000',MatchClock:'10',EventType:'Faceoff'},
    {Period:'1',Timestamp:'100550',MatchClock:'10',EventType:'Pass',PassSpeed:'7.5',StartPlayerId1:'abc',StartPlayerName1:'#2 Player',StartPlayerTeam1:'Away',StartPlayerCoordinates1:'1,2',StartPlayerVelocity1:'2'},
    {Period:'1',Timestamp:'101000',MatchClock:'11',EventType:'Shot',ShotSpeed:'0'},
    {Period:'1',Timestamp:'101100',MatchClock:'11',EventType:'Goal'},
  ];
  const events=buildReplay(rows,3).events;
  assert.ok(Math.abs(events[1].time-.45)<1e-9);
  assert.equal(events[0].speed,7.5);
  assert.equal(events[0].markers[0].speed,7.2);
  assert.equal(events[1].speed,null);
});
