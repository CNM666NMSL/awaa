'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),els=new Map(),el=id=>{if(!els.has(id))els.set(id,{value:'0',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}});return els.get(id);};
const c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};vm.createContext(c);
for(const file of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','fighter','game'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8').replace('window.game = new Game();',''),c);
vm.runInContext('globalThis.F=Fighter;globalThis.G=Game;globalThis.C=CONFIG',c);c.window.game={};vm.runInContext(fs.readFileSync(path.join(root,'js/combat-v2.js'),'utf8'),c);
const g=Object.create(c.G.prototype);Object.assign(g,{phase:'fight',mode:'local',keysDown:{},keysPressed:{},projectiles:[],specialObjects:[],spawnHitSpark(){},updateHUD(){},onKO(){},announce(){}});
for(const id of c.C.roster)for(const form of id==='shouwang'?['armored','unarmored']:[null]){
 const f=new c.F(id,400,1);f.form=form;g.p1=f;g.p2=new c.F('noble',900,-1);
 assert.equal(f.def.anims.idle.frames,1,'idle uses one stable pose');
 assert.equal(f.def.anims.idle.loop,false);
 const idlePosition=[f.x,f.y];
 for(let i=0;i<600;i++){f.update();assert.equal(f.animKey,'idle');assert.equal(f.animFrame,0);assert.deepEqual([f.x,f.y],idlePosition);}
 f.move(1);for(let i=0;i<30;i++)f._updateAnim();assert(f.animFrame>0,'moving still advances frames');
 f.stopMove();f._updateAnim();assert.equal(f.animKey,'idle');assert.equal(f.animFrame,0,'stopping returns to stable idle');
 for(const key of ['walk','run','walkBack']){
  const a=f.def.anims[key],hashes=new Set();assert(a.gaitCycle);assert.equal(a.fps,key==='run'?32:24);
  for(let i=0;i<10;i++){const b=fs.readFileSync(path.join(root,a.path.replace('{form}',form||''),String(i).padStart(2,'0')+'.png'));hashes.add(crypto.createHash('sha256').update(b).digest('hex'));}assert.equal(hashes.size,10);
 }
 f.move(1);assert.equal(f._animForState(),'walk');f.move(1,true);assert.equal(f._animForState(),'run');f.stopMove();assert.equal(f._animForState(),'idle');f.move(-1);assert.equal(f._animForState(),'walkBack');
 f.resetForRound(400,1);f.form=form;g.handleRangedInput(f,{skl:true,sklHeld:true});
 for(let i=0;i<419;i++){g.handleRangedInput(f,{sklHeld:true});f.update();}
 assert.equal(f.state,'rangedCharge');assert.equal(f.rangedChargeFrames,419);assert.equal(f.animFrame,11,'hold final charging pose');
 f.update();assert.equal(f.state,'skill');assert(f.pendingProj?.charged);assert.equal(f.rangedChargeFrames,420);assert(f.rangedInterrupted);
 const shot=f.pendingProj;g.handleRangedInput(f,{skl:true,sklHeld:true});assert.equal(f.pendingProj,shot);
 for(let i=0;i<90;i++){f.update();g.handleRangedInput(f,{skl:true,sklHeld:true});}assert.notEqual(f.state,'rangedCharge');assert.equal(f.pendingProj,null);
 const peer=new c.F(id,0,-1);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert(peer.rangedInterrupted);
 g.handleRangedInput(f,{sklHeld:false});while(f.rangedCooldown>0)f.update();g.handleRangedInput(f,{skl:true,sklHeld:true});assert.equal(f.state,'rangedCharge');
 f.resetForRound(400,1);f.form=form;f.meter=0;
 for(let i=0;i<419;i++){g.applyInput(f,{chgHeld:true});f.update();}assert.equal(f.state,'charge');assert.equal(f.animFrame,11);
 g.applyInput(f,{chgHeld:true});f.update();assert.equal(f.state,'idle');assert.equal(f.chargeHeldFrames,420);assert.equal(f.meter,100);
 for(let i=0;i<90;i++){g.applyInput(f,{chgHeld:true});f.update();}assert.equal(f.state,'idle');assert.equal(f.chargeHeldFrames,420);
 peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert(peer.chargeInterrupted);assert.equal(peer.chargeHeldFrames,420);
 g.applyInput(f,{});g.applyInput(f,{chgHeld:true});assert.equal(f.state,'charge');assert.equal(f.chargeHeldFrames,0);
 console.log('PASS '+id+'/'+(form||'default')+': gait assets, movement selection, one-shot poses, 7-second caps, held-key locks and snapshots');
}
