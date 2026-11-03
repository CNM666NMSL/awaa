const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{fs.mkdirSync('artifacts/wuxiang-umbra',{recursive:true});const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1400,height:950}}),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await p.goto('http://127.0.0.1:3012/index.html?practice=select&v=umbra1');await p.waitForFunction(()=>window.umbraCombat&&!gameAssets.blocked,{},{timeout:120000});
 const results=await p.evaluate(()=>{
  const out=[],check=(v,label)=>{if(!v)throw Error(label);out.push(label);};
  const fresh=(x=300,vx=700)=>{game.returnToMainMenu();game.startNoblePractice('wuxiang','noble');game.phase='paused';game.mode='local';game.superFreeze=null;const f=game.p1,v=game.p2;f.x=x;v.x=vx;f.facing=1;v.facing=-1;f.meter=300;v.meter=0;f.resource=v.resource=0;return[f,v];};
  const tick=(n=1)=>{for(let i=0;i<n;i++){game.p1.update();game.p2.update();game.updateSkillCasts(game.p1);game.updateSkillCasts(game.p2);game.updateProjectiles();game.updateCombatV2();game.checkHit(game.p1,game.p2);game.checkHit(game.p2,game.p1);}};
  const input=(f,inp)=>{game.phase='fight';game.applyInput(f,inp);game.phase='paused';};
  let [f,v]=fresh();check(f.maxMeter===300&&v.maxMeter===100,'individual meter caps');f.meter=0;f.gainMeter(500);check(f.meter===300,'meter gain cap');f.meter=0;f.startCharge();tick(420);check(f.meter===300,'charging reaches 300 under seven-second limit');
  [f,v]=fresh(250,1080);for(let i=0;i<5;i++){f.nightShot();tick(6);check(f.umbra.ammo===4-i,'magazine round '+(i+1));if(i<4)tick(120);}
  check(f.umbra.reload>0&&game.projectiles.some(p=>p.explosive),'fifth projectile is explosive and starts reload');const x=f.x;input(f,{r:true});tick();check(f.x>x,'move during firing / reload');const hp=v.health;tick(65);check(v.health<hp&&game.nightFX.some(o=>o.kind==='explosion'),'fifth shot impact explodes');tick(30);check(f.umbra.ammo===5&&f.umbra.reload===0,'reload refills exactly five');
  [f,v]=fresh(400,465);f._startAttack(f.def.combo[2]);tick(35);check(f.umbra.slide===2&&f.x>v.x&&f.facing===-1,'slide crosses behind target and opens umbrella');check(!v.onGround,'slide umbrella launches target');
  [f,v]=fresh(400,470);v.y-=100;v.onGround=false;v.vy=-8;f._startAttack(f.def.combo[3]);tick(18);check(f.umbra.reload>0&&f.umbra.ammo===4,'fourth normal shoots then reloads');
  [f,v]=fresh(400,470);f.attack();for(let i=0;i<3;i++){tick(f.atkDur(f.currentAttack,'startup')+f.atkDur(f.currentAttack,'active'));f.attack();}const hpBeforeShot=v.health;tick(f.atkDur(f.currentAttack,'startup')+8);check(f.umbra.reload>0&&v.health<hpBeforeShot,'full four-normal string connects its upward revolver followup');
  [f,v]=fresh(400,420);f.comboAttack('low');tick(24);check(v.state==='knockdown','down-J knocks down');
  [f,v]=fresh();f.jump();tick(3);f.jump();f.umbra.jumpHeld=true;tick(12);f.vy=8;const y=f.y;tick();check(f.umbra.gliding&&f.y-y<2,'hold jump after second jump slows descent');f.umbra.cooldown=0;f.nightShot();const vy=f.vy;tick(6);check(f.vy<vy&&game.projectiles.some(p=>p.nightBullet&&p.vy>0),'air shot fires downward and extends airtime');f.setState('jump');f.attack();tick(40);check(f.onGround&&!f.umbra.gliding,'air-J dives to the ground and closes glide');
  [f,v]=fresh(400,700);input(f,{d:true,skl:true,sklHeld:true});check(game.nightWalls.length===1&&!f.rangedNormals,'down-U creates wall without old normal-mode toggle');const w=game.nightWalls[0];
  game.hunterTraps=[{side:2,owner:v,x:w.x,y:w.y,startX:w.x,startY:w.y,endX:w.x,groundY:w.y,age:31,left:2400,radius:30,closed:0}];game.updateCombatV2();check(game.hunterTraps[0]?.closed>0,'mist triggers opposing trap');
  for(let i=0;i<3;i++){game.projectiles.push({owner:v,x:w.x+70,y:w.y-70,vx:-90,vy:0,size:8,kind:'revolver',damage:10,scale:1,life:30});game.updateProjectiles();game.updateCombatV2();}check(!game.nightWalls.length,'wall absorbs exactly three incoming shots');
  [f,v]=fresh(400,480);check(f.nightSuper('burst')&&f.meter===200,'up-I costs 100 and retains rest');tick(36);check(v.health<2000,'up-I two-stage umbrella damages');
  [f,v]=fresh(400,620);const baseF=f.curWalkSpeed(),baseV=v.curWalkSpeed();input(f,{d:true,sup:true});check(f.meter===100&&game.nightWeather.left===480,'down-I costs 200 and summons eight-second weather');check(Math.abs(f.curWalkSpeed()/baseF-1.25)<.001&&Math.abs(v.curWalkSpeed()/baseV-.7)<.001,'weather haste and enemy slow');tick(480);check(!game.nightWeather,'weather expires at exact duration');
  [f,v]=fresh(400,620);input(f,{sup:true});check(f.meter===0,'I costs 300');tick(7);check(f.umbra.super?.latched&&v.nightPin,'blink connects and umbrella pins victim');tick(105);check(v.health===1400&&!v.nightPin&&!v.onGround,'six revolver hits plus final explosion = 600 and launches');
  [f,v]=fresh(400,620);v.blinkInvulnLeft=30;f.nightSuper();tick(8);check(!f.umbra.super.latched&&!v.nightPin&&v.health===2000,'blink invulnerability evades capture');
  [f,v]=fresh();f.umbra.ammo=2;f.umbra.reload=50;f.umbra.gliding=true;f.nightWall();game.nightWeather={nightWeather:true,side:1,left:400,age:80};const snap=JSON.parse(JSON.stringify(f.toSnapshot()));const clone=new Fighter('wuxiang',10,-1);clone.applySnapshot(snap);check(clone.umbra.ammo===2&&clone.umbra.reload===50,'ammo/reload survive fighter snapshot');
  game.projectiles.push({owner:f,x:500,y:250,size:8,kind:'revolver',nightBullet:true,explosive:true,shotAngle:1.1});let packet;game.net={send:o=>packet=o};game.frameSnap=0;game.broadcastState();game.net=null;game.applyStateSnapshot(packet);check(game.nightWalls.length===1&&game.nightWeather.left===400,'mist / weather survive game snapshot');check(game.projectiles[0].nightBullet&&game.projectiles[0].explosive&&game.projectiles[0].shotAngle===1.1,'air / explosive bullet appearance survives snapshot');game.returnToMainMenu();check(!game.nightWalls.length&&!game.nightWeather,'exit clears weather and mist');
  return out;
 });console.log(results.join('\n'));
 const modes=['guard','glide','ground-shot','air-shot','reload','slide','execution','rain','burst','wall'];
 for(const mode of modes){await p.evaluate(mode=>{game.returnToMainMenu();game.startNoblePractice('wuxiang','noble');game.phase='paused';game.mode='local';game.superFreeze=null;const f=game.p1,v=game.p2;f.x=430;v.x=620;f.meter=300;f.resource=0;
  if(mode==='guard'){f.block(true);f.stateTimer=60;}
  if(mode==='reload'){f.umbra=umbraCombat.fresh();f.umbra.reload=65;f.umbra.ammo=0;}
  if(mode==='ground-shot'){f.nightShot();for(let i=0;i<7;i++)game.updateCombatV2();f.stateTimer=8;}
  if(mode==='glide'||mode==='air-shot'){f.y=300;f.onGround=false;f.jumpsLeft=0;f.setState('jump');f.umbra=umbraCombat.fresh();f.umbra.jumpHeld=true;f.umbra.gliding=true;if(mode==='air-shot'){f.nightShot();for(let i=0;i<7;i++)game.updateCombatV2();}}
  if(mode==='slide'){f._startAttack(f.def.combo[2]);f.stateTimer=f.atkDur(f.currentAttack,'startup')+12;}
  if(['execution','rain','burst'].includes(mode)){f.nightSuper(mode);for(let i=0;i<(mode==='execution'?52:20);i++)game.updateCombatV2();}
  if(mode==='wall'){f.nightWall();for(let i=0;i<15;i++)game.updateCombatV2();}
  f._updateAnim();game.updateHUD();game.render();},mode);
  await p.waitForFunction(()=>!gameAssets.blocked,{},{timeout:120000});await p.screenshot({path:'artifacts/wuxiang-umbra/'+mode+'.png'});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS Wuxiang kit, costs, ammo, movement, glide, control, weather, trap, snapshots, cleanup and visual assets.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
