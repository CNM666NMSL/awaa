'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),el=()=>({value:'0',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}});
const c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};vm.createContext(c);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8').replace('window.game = new Game();',''),c);
for(const name of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','cyber-anims','cyber-roster','motion-v2','ultimate-ranges','wuxiang-revolver','fighter','game'])load(name);
vm.runInContext('globalThis.C=CONFIG;globalThis.F=Fighter;globalThis.G=Game',c);c.window.game={};load('combat-v2');load('cyber-combat');
const g=Object.create(c.G.prototype);Object.assign(g,{phase:'fight',mode:'local',keysDown:{},keysPressed:{},projectiles:[],specialObjects:[],cyberObjects:[],sparks:[],spawnHitSpark(){this.impacts=(this.impacts||0)+1;},updateHUD(){},onKO(){},announce(){}});
for(const key of ['u','uCharged','uCharge']){
 const a=c.C.characters.wuxiang.anims[key],hashes=new Set();assert.equal(a.frames,12);assert.equal(a.loop,false);
 for(let i=0;i<12;i++)hashes.add(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,a.path,String(i).padStart(2,'0')+'.png'))).digest('hex'));
 assert.equal(hashes.size,12,key+' distinct poses');
}
for(const charged of [false,true])for(const direction of [-1,1])for(const air of [false,true]){
 const f=new c.F('wuxiang',600,direction);g.p1=f;g.p2=new c.F('noble',600+direction*300,-direction);g.projectiles=[];
 if(air){f.onGround=false;f.y-=80;f.setState('jump');g.p2.y=f.y;}
 const shot=f.castSkill(charged);assert(shot);f.pendingProj=shot;
 while(f.stateTimer<shot.startup-1)f.update();g.updateSkillCasts(f);assert.equal(g.projectiles.length,0,'no bullet before firing pose');
 f.update();f._updateAnim();assert.equal(f.animFrame,5);g.updateSkillCasts(f);assert.equal(g.projectiles.length,1);g.updateSkillCasts(f);assert.equal(g.projectiles.length,1,'one bullet per shot');if(air)g.p2.y=f.y;
 const bullet=g.projectiles[0];assert.equal(bullet.kind,'revolver');assert.equal(bullet.x,f.x+direction*shot.projX);assert.equal(bullet.y,f.y-f.height*shot.projY);assert.equal(bullet.damage,Math.round(f.def.skill.damage*(charged?1.8:1)));
 const peer=new c.F('wuxiang',0,-direction);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer.currentCast.projectileKind,'revolver');assert.equal(peer.currentCast.projX,shot.projX);
 const hp=g.p2.health;for(let i=0;i<30;i++)g.updateProjectiles();assert(g.p2.health<hp,'travelling bullet hits');assert.equal(g.projectiles.length,0);
 assert.equal(f.rangedCooldown,120);f.setState('idle');assert.equal(f.castSkill(),null,'same two-second cooldown');
 for(let i=0;i<119;i++){f.update();assert.equal(f.castSkill(),null);}f.update();assert(f.castSkill());
}
// Standing opponents of all body sizes, including point blank and a crossed body in one tick.
for(const id of c.C.roster)for(const dir of [-1,1])for(const block of [false,true]){
 const f=new c.F('wuxiang',600,dir),t=new c.F(id,600+dir*(f.width+c.C.characters[id].width)/2,-dir);g.p1=f;g.p2=t;g.projectiles=[];if(block)t.block(true);
 f.pendingProj=f.castSkill();f.stateTimer=f.pendingProj.startup;g.updateSkillCasts(f);const hp=t.health;g.updateProjectiles();assert(t.health<hp,`${id} point blank ${dir}/${block}`);
}
g.p1=new c.F('wuxiang',400,1);g.p2=new c.F('motong',600,-1);g.projectiles=[{owner:g.p1,kind:'revolver',x:550,y:410,vx:100,size:8,damage:62,scale:1}];g.updateProjectiles();assert(g.p2.health<g.p2.maxHealth,'fast bullet cannot tunnel through target');
// Charge is one preparation, held at its final aiming pose, with one automatic shot at seven seconds.
const f=new c.F('wuxiang',400,1);g.p1=f;g.p2=new c.F('noble',900,-1);g.handleRangedInput(f,{skl:true,sklHeld:true});
for(let i=0;i<419;i++)f.update();assert.equal(f.state,'rangedCharge');assert.equal(f.animFrame,11);assert(!f.pendingProj);f.update();assert.equal(f.pendingProj.projectileKind,'revolver');assert(f.pendingProj.charged);assert(f.rangedInterrupted);
// Guest keeps the bullet's explicit type and direction, rather than guessing by current owner.
let sent;Object.assign(g,{mode:'lan-host',frameSnap:0,timeLeft:100,phaseTimer:0,net:{send:s=>sent=s}});g.projectiles=[{owner:f,kind:'revolver',x:700,y:350,vx:-18,size:8,charged:true,color:'#ffc477'}];g.broadcastState();assert.equal(sent.pr[0].kind,'revolver');
const guest=Object.create(c.G.prototype);Object.assign(guest,{phase:'fight',mode:'lan-guest',p1:new c.F('wuxiang',0,1),p2:new c.F('noble',0,-1),updateRoundMarks(){},updateNameplates(){},updateHUD(){},spawnHitSpark(){}});guest.applyStateSnapshot(JSON.parse(JSON.stringify(sent)));assert.equal(guest.projectiles[0].kind,'revolver');assert.equal(guest.projectiles[0].fxDir,-1);
console.log('PASS: 12-pose shot, charged release and aim; normal/charged airborne shots both ways, muzzle sync, one bullet, travelled hit, point-blank all six bodies/block, swept hit, two-second cooldown, seven-second charge and network bullet type.');
