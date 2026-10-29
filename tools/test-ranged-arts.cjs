'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),el=()=>({value:'0',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}});
const c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};vm.createContext(c);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8').replace('window.game = new Game();',''),c);
for(const name of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','cyber-anims','cyber-roster','motion-v2','ultimate-ranges','wuxiang-revolver','ranged-arts-config','fighter','game'])load(name);
vm.runInContext('globalThis.C=CONFIG;globalThis.F=Fighter;globalThis.G=Game',c);c.window.game={};load('combat-v2');load('cyber-combat');
const g=Object.create(c.G.prototype);Object.assign(g,{phase:'fight',mode:'local',keysDown:{},keysPressed:{},projectiles:[],specialObjects:[],cyberObjects:[],sparks:[],spawnHitSpark(){},updateHUD(){},onKO(){},announce(){}});
const identities=[['jianke',null,'frost-wave'],['noble',null,'golden-lance'],['shouwang','armored','arcane-shock'],['shouwang','unarmored','arcane-ray']];
for(const [id,form,kind] of identities){
 const create=(dir=1)=>{const f=new c.F(id,400,dir);f.form=form;g.p1=f;g.p2=new c.F('noble',400+dir*300,-dir);g.projectiles=[];return f;};
 let f=create();g.handleRangedInput(f,{skl:true,sklHeld:true});
 for(const [t,frame]of [[18,3],[59,3],[60,4],[78,7],[149,7],[150,8],[168,11],[419,11]]){while(f.rangedChargeFrames<t)f.update();assert.equal(f.state,'rangedCharge');assert.equal(f.animFrame,frame,`${kind} stage at ${t}`);}
 const peer=new c.F(id,0,-1);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer.rangedChargeFrames,419);assert.equal(peer.animFrame,11);assert.equal(peer.form,form);
 f.update();assert.equal(f.pendingProj.chargeLevel,3);assert.equal(f.pendingProj.projectileKind,kind);assert(f.rangedInterrupted);
 let shots=0;for(let t=0;t<230;t++){g.handleRangedInput(f,{skl:true,sklHeld:true});f.update();if(f.pendingProj&&f.stateTimer===f.pendingProj.startup)shots++;g.updateSkillCasts(f);}assert.equal(shots,1,'seven-second hold emits once and requires release');
 for(const [ticks,level,mult]of [[0,1,1],[29,1,1],[60,2,1.4],[150,3,1.8]])for(const dir of [-1,1]){
  f=create(dir);if(ticks){g.handleRangedInput(f,{skl:true,sklHeld:true});while(f.rangedChargeFrames<ticks)f.update();g.handleRangedInput(f,{sklHeld:false});}else{g.handleRangedInput(f,{skl:true});}
  const shot=f.pendingProj;assert(shot);assert.equal(shot.chargeLevel,level);assert.equal(shot.projectileKind,kind);assert.equal(shot.damage,Math.round(f.def.skill.damage*mult));if(id==='shouwang')assert.equal(shot.damageType,'magic');
  while(f.stateTimer<shot.startup-1)f.update();g.updateSkillCasts(f);assert.equal(g.projectiles.length,0);f.update();g.updateSkillCasts(f);assert.equal(g.projectiles.length,1);assert.equal(f.animFrame,5);const p=g.projectiles[0];assert(p.rangedArt);assert.equal(p.kind,kind);assert.equal(f.rangedCooldown,120);
  const hp=g.p2.health;for(let n=0;n<40&&g.p2.health===hp;n++)g.updateProjectiles();assert(g.p2.health<hp,kind+' hits');if(kind==='golden-lance'){assert(g.projectiles.length>0,'golden sword passes through');const once=g.p2.health;for(let i=0;i<15;i++)g.updateProjectiles();assert.equal(g.p2.health,once,'piercing cannot damage twice');}
  f.setState('idle');for(let n=0;n<119;n++){f.update();assert.equal(f.castSkill(),null);}f.update();assert(f.castSkill(),'ready exactly two seconds after emission');
 }
 // Frame files are actually installed, distinct within each group, for both armor forms.
 for(const key of ['uCharge','u','uCharged']){const a=f.def.anims[key],hashes=new Set();assert.equal(a.frames,12);assert.equal(a.loop,false);for(let i=0;i<12;i++){const file=path.join(root,a.path.replace('{form}',form||''),String(i).padStart(2,'0')+'.png');hashes.add(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));}assert.equal(hashes.size,12);}
 console.log('PASS '+kind+': three held poses, 12 charge/release drawings, tiered strength, both directions, actual hit, release timing, 2s cooldown, 7s cap, snapshots.');
}
// Armor toggles choose independent magic types from the same character definition.
const f=new c.F('shouwang',400,1);f.form='unarmored';assert.equal(f.castSkill().projectileKind,'arcane-ray');f.resetForRound(400,1);assert.equal(f.castSkill().projectileKind,'arcane-shock');
// Full resource noble still emits one golden projectile, not legacy crossed blue blades.
g.p1=new c.F('noble',400,1);g.p2=new c.F('noble',750,-1);g.p1.resource=g.p1.resourceMax;g.projectiles=[];g.p1.pendingProj=g.p1.castSkill(true);g.p1.stateTimer=g.p1.pendingProj.startup;g.updateSkillCasts(g.p1);assert.equal(g.projectiles.length,1);assert.equal(g.projectiles[0].kind,'golden-lance');
// New typed projectiles carry the same form, level and hit dimensions to a guest.
let sent;Object.assign(g,{mode:'lan-host',frameSnap:0,timeLeft:100,phaseTimer:0,net:{send:s=>sent=s}});g.broadcastState();const guest=Object.create(c.G.prototype);Object.assign(guest,{phase:'fight',mode:'lan-guest',p1:new c.F('noble',0,1),p2:new c.F('noble',0,-1),updateRoundMarks(){},updateNameplates(){},updateHUD(){},spawnHitSpark(){}});guest.applyStateSnapshot(JSON.parse(JSON.stringify(sent)));assert.equal(guest.projectiles[0].kind,'golden-lance');assert.equal(guest.projectiles[0].chargeLevel,3);assert.equal(guest.projectiles[0].hitWidth,g.projectiles[0].hitWidth);assert(guest.projectiles[0].rangedArt);
console.log('PASS: armor type isolation, one full-contract golden projectile and guest VFX metadata.');
