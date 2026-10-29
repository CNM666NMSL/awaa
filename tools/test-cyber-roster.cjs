'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),els=new Map(),el=id=>{if(!els.has(id))els.set(id,{value:'0',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}});return els.get(id);};
const c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};vm.createContext(c);
for(const file of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','cyber-anims','cyber-roster','fighter','game'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8').replace('window.game = new Game();',''),c);
vm.runInContext('globalThis.F=Fighter;globalThis.G=Game;globalThis.C=CONFIG',c);c.window.game={};
for(const file of ['combat-v2','cyber-combat'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),c);
const g=Object.create(c.G.prototype);Object.assign(g,{phase:'fight',mode:'local',keysDown:{},keysPressed:{},projectiles:[],specialObjects:[],cyberObjects:[],spawnHitSpark(){},updateHUD(){},onKO(){},announce(){}});
assert.equal(c.C.roster.length,6);
for(const id of ['motong','liequan','wuxiang']){
 const f=new c.F(id,400,1);g.p1=f;g.p2=new c.F('noble',475,-1);
 for(const [name,a]of Object.entries(f.def.anims)){
  const n=f._animFrameCount(a),offset=Array.isArray(a.frames)?a.frames[0]:typeof a.frames==='object'?a.frames.offset||0:0,hashes=new Set();
  for(let i=0;i<n;i++){const b=fs.readFileSync(path.join(root,a.path,String(i+offset).padStart(2,'0')+'.png'));assert.equal(b.readUInt32BE(0),0x89504e47);hashes.add(crypto.createHash('sha256').update(b).digest('hex'));}
  assert.equal(hashes.size,n,id+'/'+name+' has distinct drawings');
 }
 for(let i=0;i<120;i++){f.update();assert.equal(f.animFrame,0,'stable idle');}
 f.attack();for(let stage=0;stage<4;stage++){f.stateTimer=f.curEff().startup;g.checkHit(f,g.p2);if(stage<3){f.stateTimer=f.curEff().startup+f.curEff().active;f.attack();assert.equal(f.comboIndex,stage+1);}}assert(g.p2.health<g.p2.maxHealth);
 f.resetForRound(400,1);g.p2.resetForRound(900,-1);g.handleRangedInput(f,{skl:true,sklHeld:true});for(let i=0;i<419;i++)f.update();assert.equal(f.state,'rangedCharge');assert.equal(f.animFrame,11);f.update();assert(f.pendingProj?.charged);assert(f.rangedInterrupted);
 f.resetForRound(400,1);for(let i=0;i<420;i++){g.applyInput(f,{chgHeld:true});f.update();}assert.equal(f.state,'idle');assert(f.chargeInterrupted);assert.equal(f.meter,100);
 f.chargeInterrupted=false;f.setState('idle');f.meter=100;assert(f.castSuper());const seen=new Set(),a=f.curEff();for(let t=0;t<a.startup+a.active+a.recovery;t++){f.stateTimer=t;f._updateAnim();seen.add(f.animFrame);}assert.equal(seen.size,25);
 const peer=new c.F(id,0,-1);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer.currentAttack,peer.def.super_);assert.equal(peer.animFrame,24);
 f.resetForRound(400,1);g.p2.resetForRound(id==='motong'?620:id==='liequan'?680:470,-1);g.cyberObjects=[];
 assert.equal(f.castSpecial(),false);f.resource=f.resourceMax;assert(f.castSpecial());assert.equal(f.resource,0);assert.equal(f.currentCast.anim,'special');
 const hp=g.p2.health;for(let i=0;i<55;i++)g.updateCombatV2();assert(g.p2.health<hp);if(id==='motong')assert.equal(g.p2.rootLeft,36);
 const encoded=JSON.stringify(g.combatV2ObjectsSnapshot());assert(encoded.includes('"cyber":true'));assert(!encoded.includes('"owner":'));
 const guest=Object.create(c.G.prototype);Object.assign(guest,{phase:'fight',mode:'lan-guest',p1:new c.F(id,0,1),p2:new c.F('noble',0,-1),updateRoundMarks(){},updateNameplates(){},updateHUD(){}});
 guest.applyStateSnapshot({p1:JSON.parse(JSON.stringify(f.toSnapshot())),p2:JSON.parse(JSON.stringify(g.p2.toSnapshot())),wo:JSON.parse(encoded),ph:'fight',tm:100});
 assert.equal(guest.cyberObjects[0].type,id);assert.equal(guest.cyberObjects[0].owner,guest.p1);assert.equal(guest.cyberObjects[0].age,g.cyberObjects[0].age);
 if(id==='wuxiang'){const shield=g.cyberObjects[0];g.projectiles=[{x:shield.x+50,y:shield.y-60,vx:-16,vy:0,size:8,damage:35,scale:1,life:90,color:'#fff',owner:g.p2}];g.updateProjectiles();assert.equal(g.projectiles[0].owner,f);assert(g.projectiles[0].vx>0);assert(g.projectiles[0].cyberReflected);}
 console.log('PASS '+id+': all assets, stable idle, combo, 7s caps, 25-pose ultimate, resource gate, special hit and snapshot');
}
