import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parseCsv} from '../lib/csv.ts';
import {getMatchView,getMatchData} from '../lib/match-data.ts';
import {ROUNDS,emptyGame,restoreGame} from '../lib/game.ts';
import {predictionPoints,resolveTeam,teamValue,type TeamValues} from '../lib/team-picks.ts';
const values=(shots=1,xg=1,completedPasses=1,attemptedPasses=2):TeamValues=>({shots,xg,completedPasses,attemptedPasses});
test('one team call replaces a player pick in each round without changing total points',()=>{
  assert.deepEqual(ROUNDS.map(r=>r.questions.length),[5,3,3,3]);
  assert.ok(ROUNDS.every(r=>r.questions.filter(q=>q.kind==='team').length===1));
  assert.equal(ROUNDS.reduce((n,r)=>n+r.questions.length*r.points,0),950);
});
test('team aggregation uses shooter xG and pooled pass counts from the real CSVs',()=>{
  const data=getMatchData();
  for(const scope of [0,1,2,3]){
    const file=readdirSync('data').find(f=>f.includes('Statistics_31_12_2025 '+(scope?'P'+scope:'All'))&&f.endsWith('.csv'))!;
    const rows=parseCsv(readFileSync('data/'+file,'utf8'));
    for(const team of ['davos','us'] as const){
      const own=rows.filter(r=>(r.Team==='HC Davos'?'davos':'us')===team);
      const actual=data.teamStats[team][scope];
      for(const [key,column] of [['shots','S'],['xg','xGsum'],['completedPasses','Passes'],['attemptedPasses','All passes']] as const)
        assert.ok(Math.abs(actual[key]-own.reduce((n,r)=>n+Number(r[column]),0))<1e-8);
      assert.equal(teamValue(actual,'passAccuracy'),Math.round(actual.completedPasses/actual.attemptedPasses*1000)/10);
    }
  }
  assert.equal(teamValue(values(1,1,91,110),'passAccuracy'),82.7); // Not mean of 1/10 and 90/100.
});
test('team outcomes handle ties, displayed rounding and unavailable measurements',()=>{
  assert.equal(resolveTeam('shots',values(10),values(8)).winner,'davos');
  assert.equal(resolveTeam('shots',values(0),values(0)).winner,'tie');
  assert.equal(resolveTeam('xg',values(1,1.234),values(1,1.231)).winner,'tie');
  assert.equal(resolveTeam('passAccuracy',values(1,1,8,10),values(1,1,9,10)).winner,'us');
  assert.equal(resolveTeam('passAccuracy',values(1,1,0,0),values()).winner,null);
  assert.equal(resolveTeam('xg',values(1,NaN),values()).winner,null);
});
test('future team totals and outcomes are gated at the same boundaries as player picks',()=>{
  for(const stage of [0,1]){const v=getMatchView(stage);assert.deepEqual(v.teamResults,{});assert.equal(v.teamStats.davos.length,0);}
  assert.deepEqual(Object.keys(getMatchView(2).teamResults),['p1-team-shots']);
  assert.equal(getMatchView(3).teamResults['p2-team-xg'],undefined);
  assert.ok(getMatchView(4).teamResults['p2-team-xg']);
  assert.equal(getMatchView(5).teamResults['m-team-shots'],undefined);
  assert.equal(Object.keys(getMatchView(6).teamResults).length,4);
});
test('correct team or tie earns full points only on a submitted resolved round',()=>{
  const round=ROUNDS[1],q=round.questions.find(q=>q.kind==='team')!,view=getMatchView(2),game=emptyGame();
  const winner=view.teamResults[q.id].winner!;
  game.picks[q.id]=winner;
  assert.equal(predictionPoints(round,q,game,view),0);
  game.submitted[round.id]=true;
  assert.equal(predictionPoints(round,q,game,getMatchView(1)),0);
  assert.equal(predictionPoints(round,q,game,view),50);
  game.picks[q.id]=winner==='tie'?'davos':'tie';
  assert.equal(predictionPoints(round,q,game,view),0);
});
test('saved team answers validate against team choices while player IDs stay separate',()=>{
  const round=ROUNDS[1],game=emptyGame();game.stage=2;game.submitted.p1=true;
  for(const q of round.questions)game.picks[q.id]=q.kind==='team'?'tie':'davos-19';
  assert.equal(restoreGame(JSON.stringify(game),['davos-19']).submitted.p1,true);
  game.picks['p1-team-shots']='davos-19';
  const restored=restoreGame(JSON.stringify(game),['davos-19']);
  assert.equal(restored.picks['p1-team-shots'],undefined);assert.equal(restored.submitted.p1,undefined);
});
