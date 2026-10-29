'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),els=new Map(),el=id=>{if(!els.has(id))els.set(id,{value:'normal',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}});return els.get(id);};
const c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};vm.createContext(c);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8').replace('window.game = new Game();',''),c);
for(const name of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','cyber-anims','cyber-roster','motion-v2','ultimate-ranges','wuxiang-revolver','ranged-arts-config','signature-arts-config','fighter','game'])load(name);
vm.runInContext('globalThis.C=CONFIG;globalThis.F=Fighter;globalThis.G=Game',c);
const g=Object.create(c.G.prototype);c.window.game=g;let tones=0;c.window.awaAudio={tone(){tones++;}};
load('arcade-combat');load('combat-v2');load('cyber-combat');load('signature-combat');load('mobile-supers');
Object.assign(g,{phase:'fight',mode:'local',keysDown:{},keysPressed:{},projectiles:[],specialObjects:[],cyberObjects:[],signatureObjects:[],sparks:[],spawnHitSpark(){},updateHUD(){},onKO(){},announce(){},updateNameplates(){},updateRoundMarks(){}});
function setup(id,form=null,{target='noble',distance=100,dir=1}={}){g.phase='fight';g.p1=new c.F(id,400,dir);g.p1.form=form;g.p2=new c.F(target,400+dir*distance,-dir);g.projectiles=[];g.specialObjects=[];g.cyberObjects=[];g.signatureObjects=[];g.superFreeze=null;g._superSeen=new WeakMap();return g.p1;}
function step(n=1,holdPosition=false){for(let i=0;i<n;i++){const x=g.p2.x;g.p1.update();g.p2.update();if(holdPosition)g.p2.x=x;g.updateSkillCasts(g.p1);g.updateSkillCasts(g.p2);g.updateProjectiles();g.updateCombatV2();}}
function ult(f){f.meter=100;assert(f.castSuper());assert.equal(f.meter,0);assert.equal(f.getAttackBox(),null,'no old super hitbox');}
for(const id of c.C.roster)assert.equal(new c.F(id,100,1).maxHealth,2000);
for(const target of ['noble','shouwang']){
 const f=setup('jianke',null,{target});ult(f);assert.equal(f.activeUltimate.name,'万剑归宗');step(59);assert.equal(g.p2.health,2000);step();assert.equal(g.p2.health,1850);assert.equal(f.state,'idle','caster is free after the initial gesture');
 step(420);assert.equal(g.p2.health,800,'eight exact 150 damage ticks');assert.equal(f.activeUltimate,null);step(120);assert.equal(g.p2.health,800,'no damage after eight seconds');
}
let f=setup('jianke',null,{distance:400});ult(f);step(480);assert.equal(g.p2.health,2000,'aura has a real proximity boundary');
f=setup('jianke');ult(f);step(61);g.applyInput(f,{r:true});f.update();assert(f.x>400,'sword domain permits movement');
for(const dir of [-1,1]){g.projectiles=[{owner:g.p2,x:f.x-dir*230,y:f.y-f.height*.55,vx:dir*160,size:8,damage:500,scale:1}];g.updateProjectiles();assert.equal(g.projectiles.length,0,'fast hostile projectile intercepted');assert.equal(f.health,2000);}
g.projectiles=[{owner:f,x:f.x+160,y:f.y-50,vx:10,size:8,damage:10,scale:1}];g.updateProjectiles();assert.equal(g.projectiles.length,1,'own projectile survives');
for(const target of ['noble','shouwang']){
 f=setup('noble',null,{target,distance:200});ult(f);const hits=[];let hp=g.p2.health;
 for(let t=0;t<360;t++){assert(f.isInvulnerable(),'full six-second immunity');assert(f.takeHit({damage:500,hitstun:10,knockback:5},-1,false,1).immune);step();if(g.p2.health!==hp){hits.push(hp-g.p2.health);hp=g.p2.health;}}
 assert.deepEqual(hits,[180,180,180,180,180,180]);assert.equal(g.p2.health,920);assert.equal(f.health,2000);assert(!f.isInvulnerable(),'immunity ends at six seconds');assert(f.activeUltimate===null);
}
f=setup('noble',null,{distance:-200});ult(f);step(360);assert.equal(g.p2.health,920,'locked slashes follow a target behind the caster');
f=setup('noble');ult(f);for(let t=0;t<360;t++){if(t%3===0)f.update();g.updateSignatureArts();}assert.equal(f.activeUltimate,null);assert.equal(f.state,'idle','slow-motion cannot extend the super lock beyond six seconds');assert(!f.isInvulnerable());
f=setup('shouwang','armored',{distance:500});ult(f);const meteorHits=[];let hp=g.p2.health;
for(let t=0;t<360;t++){g.p2.x=850+Math.sin(t*.04)*140;step();if(g.p2.health!==hp){meteorHits.push(hp-g.p2.health);hp=g.p2.health;}}
assert.deepEqual(meteorHits,[300,300,300]);assert.equal(g.p2.health,1100);assert.equal(f.activeUltimate,null);
for(const dir of [-1,1]){
 f=setup('shouwang','unarmored',{distance:460,dir});if(dir===-1){f.x=800;g.p2.x=340;}ult(f);const hits=[];let hp=g.p2.health;
 for(let t=0;t<360;t++){step(1,true);if(g.p2.health!==hp){hits.push(hp-g.p2.health);hp=g.p2.health;}}
 assert.deepEqual(hits,[300,300,300]);assert.equal(g.p2.health,1100,'ten-body forward pillars hit at long distance');
}
f=setup('shouwang','unarmored',{distance:526});ult(f);step(360,true);assert.equal(g.p2.health,2000,'outside ten bodies is not hit');
f=setup('shouwang','unarmored',{distance:-120});ult(f);step(360);assert.equal(g.p2.health,2000,'pillars stay in the cast direction');
for(const [id,form,kind]of [['jianke',null,'heavy-cleave'],['noble',null,'overhead-stars'],['shouwang','armored','meteor'],['shouwang','unarmored','meteor']]){
 f=setup(id,form,{distance:id==='jianke'?140:350});f.pendingProj=f.castSkill(true);while(f.stateTimer<f.pendingProj.startup)f.update();g.updateSkillCasts(f);
 assert.equal(g.projectiles.length,0,'third stage is not a reskinned projectile');assert.equal(g.signatureObjects[0].kind,kind);assert.equal(f.rangedCooldown,120);
 const hp=g.p2.health;step(75,true);assert(g.p2.health<hp,kind+' applies real damage');
}
// Domain also intercepts summoned falling meteors.
f=setup('jianke');ult(f);g.p2.charId='shouwang';g.p2.def=c.C.characters.shouwang;g.p2.pendingProj=g.p2.castSkill(true);while(g.p2.stateTimer<g.p2.pendingProj.startup)g.p2.update();g.updateSkillCasts(g.p2);step(80);assert.equal(f.health,2000);
// Host/guest restore both the sustained state and typed summoned objects.
f=setup('shouwang','armored',{distance:350});ult(f);step(30);let sent;Object.assign(g,{mode:'lan-host',frameSnap:0,timeLeft:100,phaseTimer:0,net:{send:s=>sent=s}});g.broadcastState();
const guest=Object.create(c.G.prototype);Object.assign(guest,{phase:'fight',mode:'lan-guest',p1:new c.F('shouwang',0,1),p2:new c.F('noble',0,-1),updateRoundMarks(){},updateNameplates(){},updateHUD(){},spawnHitSpark(){}});guest.applyStateSnapshot(JSON.parse(JSON.stringify(sent)));assert.equal(guest.p1.activeUltimate.age,30);assert.equal(guest.signatureObjects[0].kind,'meteor');assert.equal(guest.signatureObjects[0].owner,guest.p1);assert.equal(guest.signatureObjects[0].age,g.signatureObjects[0].age);
g.mode='local';f=setup('noble');ult(f);g.roundStartMs=0;assert(g.beginSuperCinematic());assert.equal(tones,0,'no activation sound');for(let i=0;i<24;i++)g.tickSuperFreeze();assert.equal(f.activeUltimate.age,0,'cut-in freezes the duration timer');f.resetForRound(400,1);assert.equal(f.activeUltimate,null);
console.log('PASS: 2000 HP; 8s aura/1200 damage/movement/projectile and meteor defense; 6s immunity/6x180 locked slashes; 3x300 tracking meteors; 3x300 ten-body directional pillars; four distinct third-charge summons; expiry, snapshot, reset, silent cut-in and timer freeze.');
