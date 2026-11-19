import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {alignTracking,parseTracking,trackingAt} from '../lib/tracking.ts';
import {getMatchView} from '../lib/match-data.ts';
const clip=parseTracking(JSON.parse(readFileSync('public/demo/tier3-synthetic.json','utf8')));
test('shared synthetic fixture contains 261 frames at 20 Hz and 13 entities',()=>{
  assert.equal(clip.source,'synthetic');assert.equal(clip.frames.length,261);assert.equal(clip.entities.length,13);
  for(let i=0;i<clip.frames.length;i++){assert.equal(clip.frames[i].positions.length,13);if(i)assert.equal(clip.frames[i].timestamp-clip.frames[i-1].timestamp,50);}
});
test('each goal reuses the same choreography with its timestamp alignment',()=>{
  for(const goal of getMatchView(6).goals){
    const aligned=alignTracking(clip,goal.timestamp);
    assert.equal(aligned.frames[0].timestamp,goal.timestamp-10000);
    assert.equal(aligned.frames.at(-1)!.timestamp,goal.timestamp+3000);
    assert.deepEqual(aligned.frames.map(f=>f.positions),clip.frames.map(f=>f.positions));
    assert.equal(aligned.moments.at(-1)!.timestamp,goal.timestamp);
  }
});
test('tracking interpolates midpoints and refuses out-of-range samples and gaps',()=>{
  const a=clip.frames[0],b=clip.frames[1];
  assert.deepEqual(trackingAt(clip,a.timestamp),a.positions);
  assert.equal(trackingAt(clip,a.timestamp+25)![0].x,(a.positions[0].x+b.positions[0].x)/2);
  assert.equal(trackingAt(clip,a.timestamp-1),null);
  assert.equal(trackingAt({...clip,frames:[a,{...b,timestamp:a.timestamp+1000}]},a.timestamp+500),null);
});
test('adapter rejects invalid sources and unordered samples',()=>{
  assert.throws(()=>parseTracking({...clip,source:'real'}));
  assert.throws(()=>parseTracking({...clip,frames:[clip.frames[1],clip.frames[0]]}));
});
