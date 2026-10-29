'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),el=()=>({value:'normal',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}}),c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};vm.createContext(c);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8').replace('window.game = new Game();',''),c);
for(const name of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','cyber-anims','cyber-roster','motion-v2','ultimate-ranges','wuxiang-revolver','ranged-arts-config'])load(name);
vm.runInContext('globalThis.C=CONFIG',c);const oldDamage=c.C.characters.jianke.combo[0].damage,oldRanged=c.C.characters.jianke.skill.damage;load('signature-arts-config');load('fighter');load('game');vm.runInContext('globalThis.F=Fighter;globalThis.G=Game',c);
const g=Object.create(c.G.prototype);c.window.game=g;for(const name of ['combat-v2','cyber-combat','signature-combat','mobile-supers'])load(name);Object.assign(g,{phase:'fight',mode:'local',keysDown:{},keysPressed:{},projectiles:[],specialObjects:[],cyberObjects:[],signatureObjects:[],sparks:[],spawnHitSpark(){},updateHUD(){},onKO(){},announce(){}});
assert.equal(c.C.characters.jianke.combo[0].damage,Math.round(oldDamage*1.15));assert.equal(c.C.characters.jianke.skill.damage,Math.round(oldRanged*1.15));assert.equal(c.C.characters.jianke.super_.pulseDamage,150);
for(const id of c.C.roster)for(const form of id==='shouwang'?['armored','unarmored']:[null]){
 const f=new c.F(id,500,1);f.form=form;g.p1=f;g.p2=new c.F('noble',1000,-1);g.signatureObjects=[];g.projectiles=[];g.specialObjects=[];g.cyberObjects=[];f.meter=100;assert(f.castSuper());const x=f.x,seen=new Set([f.animFrame]);let transitions=0,last=f.animFrame;
 for(let t=0;t<30;t++){g.applyInput(f,{r:true});f.update();g.updateCombatV2();seen.add(f.animFrame);if(last!==f.animFrame)transitions++;last=f.animFrame;}
 assert(f.x>x+80,id+' moves during the casting animation');assert.equal(f.state,'super');assert(transitions>=18,id+' real playback rate is at least 36FPS');assert(seen.size>=19);assert.equal(f.def.anims.super_.fps,40);
 g.applyInput(f,{});const stopped=f.x;f.update();assert.equal(f.x,stopped,'releasing direction stops movement');
 g.applyInput(f,{l:true});f.update();assert(f.x<stopped,'reverse direction works');
 const peer=new c.F(id,0,1);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer._superMoveDir,-1);assert.equal(peer.animFrame,f.animFrame);
}
const f=new c.F('noble',600,1);g.p1=f;g.p2=new c.F('jianke',150,-1);g.signatureObjects=[];f.meter=100;f.castSuper();
g.applyInput(f,{r:true,dsh:true});assert.equal(f.state,'dash');assert(f.x>600);assert(f.activeUltimate);assert(f.isInvulnerable());
g.applyInput(f,{u:true,atk:true});assert.equal(f.currentAttack,f.def.launcher,'uppercut can cancel the blink while the lock-on remains');assert.equal(f.facing,-1,'launcher aims at the locked enemy behind');assert(f.activeUltimate);assert(f.isInvulnerable());
const initial=g.p2.health;for(let i=0;i<360;i++){g.p2.x=i%2?100:1100;g.p2.y=i%2?250:460;f.update();g.updateSignatureArts();}assert.equal(initial-g.p2.health,1080,'all six locked hits follow the target across the stage and into the air');assert.equal(f.activeUltimate,null);assert(!f.isInvulnerable());
f.resetForRound(400,1);f.meter=100;f.dash();assert(f.castSuper(),'blink can immediately chain into the locked ultimate');assert.equal(f.meter,0);
f.resetForRound(400,1);f.meter=100;f.comboAttack('launcher');f.hasHit=true;assert(f.castSuper(),'connected launcher can chain into the locked ultimate');assert.equal(f.meter,0);
// No current or future sustained-ability renderer writes overhead timer/status strings.
load('signature-fx');const labels=[],ctx=new Proxy({},{get(target,key){if(key==='fillText')return text=>labels.push(text);if(key==='createLinearGradient'||key==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};},set(){return true;}});g.p1=new c.F('jianke',400,1);g.p1.meter=100;g.p1.castSuper();g.p2=new c.F('noble',800,-1);g.signatureObjects=[];g.specialObjects=[];g.cyberObjects=[];g.projectiles=[];g.drawCombatV2(ctx);assert.equal(labels.length,0);
console.log('PASS: seven forms move/reverse/stop while casting; true 40FPS playback; snapshots; lock-on follows behind/far/airborne; blink-to-uppercut combo; 15% basic/ranged buff and 150DPS; no overhead text.');
