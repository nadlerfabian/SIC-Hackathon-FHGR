// Entirely invented choreography. Does not read or reconstruct match data.
import { mkdirSync, writeFileSync } from 'node:fs';
const epoch = 1735689600000, hz = 20;
const entities = [
  ...Array.from({length:5},(_,i)=>({id:'attack-'+i,team:'attack',kind:'skater',number:11+i,label:'Demo attacker '+(i+1)})),
  ...Array.from({length:5},(_,i)=>({id:'defence-'+i,team:'defence',kind:'skater',number:21+i,label:'Demo defender '+(i+1)})),
  {id:'attack-goalie',team:'attack',kind:'goalie',number:0,label:'Demo attacking goalie'},
  {id:'defence-goalie',team:'defence',kind:'goalie',number:0,label:'Demo defending goalie'},
  {id:'puck',team:null,kind:'puck',number:0,label:'Demo puck'},
];
const round = v => Math.round(v*1000)/1000;
function player(id,t) {
  const capped = Math.min(t,10);
  if(id.endsWith('goalie')) return {x:id.startsWith('attack')?-23.5:23.5,y:id.startsWith('attack')?0:1.1*Math.sin(t*.45),z:0};
  const i=Number(id.split('-')[1]),attack=id.startsWith('attack');
  return {
    x: attack ? -12+i*2+capped*2.15+Math.sin(t*.5+i)*1.2 : 1+i*3+capped*.65+Math.sin(t*.6+i),
    y: attack ? [-8,7,-3,10,-10][i]+Math.sin(t*.65+i)*1.8 : [-7,6,-1,10,-10][i]+Math.sin(t*.55+i)*1.4,
    z:0,
  };
}
function puck(t) {
  const held = id => {const p=player(id,t);return {...p,x:p.x+.6,y:p.y+.2,z:.03};};
  const flight=(a,b,start,end,shot=false)=>{
    const p=player(a,start),q=shot?{x:24.8,y:0,z:.35}:player(b,end),f=(t-start)/(end-start);
    return {x:p.x+.6+(q.x-p.x-.6)*f,y:p.y+.2+(q.y-p.y-.2)*f,z:shot?.03+.32*f:.03};
  };
  if(t<2.8)return held('attack-0');
  if(t<3.2)return flight('attack-0','attack-1',2.8,3.2);
  if(t<6.2)return held('attack-1');
  if(t<6.7)return flight('attack-1','attack-2',6.2,6.7);
  if(t<9.65)return held('attack-2');
  if(t<10)return flight('attack-2',null,9.65,10,true);
  return {x:24.8,y:0,z:.35};
}
const frames=Array.from({length:13*hz+1},(_,i)=>({
  timestamp:epoch+i*1000/hz,
  positions:entities.map(e=>{
    const p=e.kind==='puck'?puck(i/hz):player(e.id,i/hz);
    return {entityId:e.id,x:round(p.x),y:round(p.y),z:round(p.z)};
  }),
}));
const clip={version:1,source:'synthetic',sampleHz:hz,goalTimestamp:epoch+10000,entities,frames,moments:[{timestamp:epoch+2800,label:'Pass'},{timestamp:epoch+6200,label:'Pass'},{timestamp:epoch+9650,label:'Shot'},{timestamp:epoch+10000,label:'Goal'}]};
mkdirSync('public/demo',{recursive:true});
writeFileSync('public/demo/tier3-synthetic.json',JSON.stringify(clip)+'\n');
console.log('Generated shared fictional tracking clip.');
