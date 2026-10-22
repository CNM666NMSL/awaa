const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.Image = class { set src(v) {} };
global.window = global;
eval(fs.readFileSync(path.join(ROOT,'js/config.js'),'utf8')+'\n'+fs.readFileSync(path.join(ROOT,'js/fighter.js'),'utf8')+'\nglobalThis.Fighter=Fighter;globalThis.CONFIG=CONFIG;');
const A=(name,ok)=>{console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)process.exitCode=1;};
let f=new Fighter('noble',200,1);
for(const [name,a] of Object.entries(f.def.anims)){
 const count=f._animFrameCount(a),offset=Array.isArray(a.frames)?a.frames[0]:typeof a.frames==='object'?a.frames.offset||0:0;
 A(`${name}: referenced frames exist`,Array.from({length:count},(_,i)=>fs.existsSync(path.join(ROOT,a.path,`${String(i+offset).padStart(2,'0')}.png`))).every(Boolean));
}
for(const [i,key] of ['j1','j2','j3'].entries()){
 f=new Fighter('noble',200,1);f.setState('attack');f.currentAttack=f.def.combo[i];
 const a=f.curEff(),clip=f.def.anims[key];
 for(const t of [0,a.startup-1,a.startup,a.startup+a.active,a.startup+a.active+a.recovery-1]){
  f.stateTimer=t;f._updateAnim();
  A(`${key} t=${t}: valid frame`,f.animKey===key&&f.animFrame>=0&&f.animFrame<f._animFrameCount(clip));
  if(t===a.startup)A(`${key}: contact at active tick`,f.animFrame===clip.phases[0]);
  if(t===a.startup+a.active)A(`${key}: recovery at recovery tick`,f.animFrame===clip.phases[1]);
 }
 A(`${key}: reaches final recovery pose`,f.animFrame===f._animFrameCount(clip)-1);
}
f.setState('idle');f._updateAnim();f.animTimer=0;
for(let i=0;i<60;i++)f._updateAnim();
A('idle: exact fractional fps clock',f.animFrame===f.def.anims.idle.fps%f._animFrameCount(f.def.anims.idle));
f.setState('attack');f.currentAttack=f.def.combo[0];f.stateTimer=7;f._updateAnim();f.setState('attack');f._updateAnim();
A('repeated attack restarts anticipation',f.animFrame===0);
f.setState('skill');f.currentAttack=null;f.currentSkillFrames=23;f.stateTimer=22;f._updateAnim();
A('skill reaches final pose',f.animFrame===f._animFrameCount(f.def.anims.u)-1);
f.setState('knockdown');f.onGround=true;f.knockdownTimer=12;f._updateAnim();
A('recovery selects getup',f.animKey==='getup'&&f.animFrame===0);
f.knockdownTimer=1;f._updateAnim();
A('getup reaches standing pose',f.animFrame===f._animFrameCount(f.def.anims.getup)-1);
if(process.exitCode)throw new Error('Animation regression');
