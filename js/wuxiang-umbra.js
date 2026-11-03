/* Wuxiang's umbrella/revolver kit. All damage and timers run on the authoritative combat clock. */
(()=>{
 'use strict';
 const K=window.umbraKit,D=CONFIG.characters.wuxiang,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 window.comboRework.sets.wuxiang=window.comboRework.sets.ranged=D.umbraCombo;D.combo=D.umbraCombo;
 const is=f=>f?.charId==='wuxiang',enemy=(g,f)=>f===g.p1?g.p2:g.p1,side=(g,f)=>f===g.p1?1:2;
 const fresh=()=>({ammo:5,reload:0,cooldown:0,wallCooldown:0,dir:0,jumpHeld:false,jumpHold:0,gliding:false,shot:null,super:null,slide:0,gunDone:false,flash:null});
 const ws=f=>f.umbra||(f.umbra=fresh());
 function fx(g,kind,x,y,extra={}){(g.nightFX||=[]).push({nightFX:true,kind,x,y,age:0,life:30,...extra});}
 function hit(g,f,v,damage,extra={}){
  const r=v.takeHit({damage,fixedDamage:true,deferKnockdown:true,hitstun:18,knockback:3,...extra},f.facing,v.state==='block',1);
  if(r.dmg>0){f.gainMeter(5);f.gainLayers(1);g.spawnHitSpark(v.x,v.y-v.height*.55,!!r.blocked);g.updateHUD();}if(r.ko)g.onKO(f);return r;
 }
 function reload(f){const s=ws(f);if(!s.reload)s.reload=K.reload;}
 function fire(g,f,mode='ground',damage=K.bulletDamage){
  const s=ws(f);if(s.reload||s.ammo<=0)return false;
  const v=enemy(g,f),air=mode==='air',up=mode==='up',fifth=s.ammo===1;
  let x=f.x+f.facing*(air?82:up?75:65),y=f.y-f.height*(air?.24:up?1:.86),vx=f.facing*19,vy=0;
  if(air){vx=f.facing*9;vy=19;f.vy=Math.max(-18,f.vy-6);}
  if(up){const dx=f.facing*Math.max(1,Math.abs(v.x-x)),dy=Math.min(-20,v.y-v.height*.5-y),len=Math.hypot(dx,dy)||1;vx=dx/len*20;vy=dy/len*20;}
  s.ammo--;s.cooldown=K.shotCooldown;s.flash={x,y,angle:Math.atan2(vy,vx),age:0};
  (g.projectiles||=[]).push({nightBullet:true,owner:f,x,y,startX:f.x+f.facing*f.width/2,vx,vy,shotAngle:Math.atan2(vy,vx),life:90,kind:'revolver',explosive:fifth,size:fifth?12:8,hitWidth:12,hitHeight:12,damage:fifth?K.blastDamage:damage,scale:f.damageScale(),knockback:fifth?14:3,color:fifth?'#ff984e':'#ffcd83'});
  if(fifth)reload(f);return true;
 }
 Fighter.prototype.nightShot=function(){
  const s=ws(this);if(!is(this)||s.reload||s.cooldown||s.shot||!['idle','walk','jump','block'].includes(this.state))return null;
  if(s.ammo<=0){reload(this);return null;}
  const air=!this.onGround;this.setState('skill');this.pendingProj=null;this.currentCast={ws:true,anim:air?'wsAirShot':'wsGroundShot',startup:6,recovery:18};this.currentSkillFrames=24;s.shot={age:0,air,fired:false};return this.currentCast;
 };
 const castSkill=Fighter.prototype.castSkill;
 Fighter.prototype.castSkill=function(...args){return is(this)?this.nightShot():castSkill.apply(this,args);};
 Fighter.prototype.nightWall=function(){
  const s=ws(this),g=window.game;if(!is(this)||!this.onGround||s.wallCooldown||!['idle','walk','block'].includes(this.state))return false;
  s.wallCooldown=K.wallCooldown;this.setState('skill');this.currentCast={ws:true,anim:'wsRain',startup:8,recovery:16};this.currentSkillFrames=24;this.pendingProj=null;
  g.nightWalls=(g.nightWalls||[]).filter(w=>w.side!==side(g,this));g.nightWalls.push({nightWall:true,side:side(g,this),x:clamp(this.x+this.facing*90,50,CONFIG.canvas.width-50),y:CONFIG.canvas.groundY,age:0,left:K.wallLife,charges:3});return true;
 };
 function release(g,f){const v=enemy(g,f);if(v?.nightPin?.side===side(g,f))v.nightPin=null;}
 Fighter.prototype.nightSuper=function(kind='execution'){
  if(!is(this)||!this.onGround||!['idle','walk','block','charge'].includes(this.state))return false;
  const cost={execution:100,rain:67,burst:33}[kind];if(this.meter<cost)return false;
  const s=ws(this);this.meter-=cost;this.currentAttack=this.def.nightSupers[kind];this.pendingProj=null;this.setState('super');this.vx=0;this._superMoveDir=0;this.hasHit=false;this.superSerial=(this.superSerial||0)+1;
  s.shot=null;s.gliding=false;s.super={kind,age:0,dir:this.facing,life:this.currentAttack.active,latched:false,checked:false};
  if(kind==='execution')this.blinkInvulnLeft=Math.max(this.blinkInvulnLeft,30);
  if(kind==='rain')window.game.nightWeather={nightWeather:true,side:side(window.game,this),left:K.rainLife,age:0};
  return true;
 };
 const castSuper=Fighter.prototype.castSuper,tier=Fighter.prototype.castSuperTier;
 Fighter.prototype.castSuper=function(...args){return is(this)?this.nightSuper():castSuper.apply(this,args);};
 Fighter.prototype.castSuperTier=function(...args){return is(this)?this.nightSuper():tier.apply(this,args);};
 const start=Fighter.prototype._startAttack;
 Fighter.prototype._startAttack=function(a){start.call(this,a);if(is(this)){const s=ws(this);s.slide=0;s.gunDone=false;s.shot=null;s.gliding=false;if(a.wsDive)this.vy=22;}};
 const jump=Fighter.prototype.jump;
 Fighter.prototype.jump=function(...args){const before=this.jumpsLeft,result=jump.apply(this,args);if(is(this)&&this.jumpsLeft<before){ws(this).jumpHold=0;ws(this).gliding=false;}return result;};
 const speed=Fighter.prototype.curWalkSpeed;
 Fighter.prototype.curWalkSpeed=function(){const base=speed.call(this),w=window.game?.nightWeather;return base*(w?.left>0?(side(window.game,this)===w.side?K.haste:K.slow):1);};
 const move=Fighter.prototype.move,stop=Fighter.prototype.stopMove,aim=Fighter.prototype.aim;
 Fighter.prototype.move=function(dir,running){
  if(is(this)){const s=ws(this);s.dir=dir;if(s.super?.kind==='execution'){this._superMoveDir=0;return;}
   if(this.state==='skill'&&this.currentCast?.ws){this.facing=this.pendingFacing=dir;this.vx=0;return;}}
  return move.call(this,dir,running);
 };
 Fighter.prototype.stopMove=function(){if(is(this))ws(this).dir=0;return stop.call(this);};
 Fighter.prototype.aim=function(dir){if(is(this)&&this.state==='skill'&&this.currentCast?.ws&&dir){this.facing=this.pendingFacing=dir;return;}return aim.call(this,dir);};
 // The base reader includes jmpHeld so touch input and LAN input transmit the same glide button state.
 const input=Game.prototype.applyInput;
 Game.prototype.applyInput=function(f,inp){
  if(f.nightPin&&this.phase==='fight')return;
  if(!is(f))return input.call(this,f,inp);
  if(this.phase!=='fight'||f.health<=0||f.curseBindLeft>0)return;
  if(f.rootLeft>0){if(inp.dsh&&!(f.dashCooldownLeft>0)){f.rootLeft=0;f.setState(f.onGround?'idle':'jump');f.dash();}else if(inp.d){f.rootLeft=0;f.setState('idle');f.block(true);}return;}
  const s=ws(f);s.jumpHeld=!!inp.jmpHeld;const dir=inp.l&&!inp.r?-1:inp.r&&!inp.l?1:0;
  if(inp.ukemi)f.tryUkemi();if(f.state==='block'&&(!inp.d||inp.skl||inp.atk||inp.sup))f.block(false);f.aim(dir);
  if(inp.sup)f.nightSuper(inp.d?'rain':inp.u?'burst':'execution');
  else{
   if(inp.jmp)f.jump(dir);if(inp.dsh)f.dash();
   if(inp.atk){if(!f.onGround)f.attack();else if(inp.d)f.comboAttack('low');else if(inp.u)f.comboAttack('launcher');else f.attack();}
   if(inp.skl){if(inp.d)f.nightWall();else f.nightShot();}
   if(inp.spc)f.castSpecial();
  }
  if(!inp.chgHeld)f.chargeInterrupted=false;
  if(inp.chgHeld&&['hit','guardbreak','knockdown'].includes(f.state))f.chargeInterrupted=true;
  if(inp.chgHeld&&!f.chargeInterrupted&&f.state!=='charge')f.startCharge();else if(!inp.chgHeld&&f.state==='charge')f.endCharge();
  f.block(inp.d&&!inp.atk&&!inp.skl&&!inp.sup&&!inp.chgHeld);
  if(dir)f.move(dir,inp.run===dir);else f.stopMove();
 };
 const eff=Fighter.prototype.effAttack;
 Fighter.prototype.effAttack=function(a){const e=eff.call(this,a);if(e&&a?.wsDown)e.wsDown=true;return e;};
 const take=Fighter.prototype.takeHit;
 Fighter.prototype.takeHit=function(a,...args){const r=take.call(this,a,...args);if(a.wsDown&&r.dmg>0&&!r.blocked&&!r.immune&&!r.ko)this.startKnockdown(args[0],{knockback:5});return r;};
 const active=Fighter.prototype.isAttackActive,box=Fighter.prototype.getAttackBox;
 Fighter.prototype.isAttackActive=function(){if(is(this)&&(this.currentAttack?.wsGun||this.currentAttack?.wsSuper))return false;return active.call(this);};
 Fighter.prototype.getAttackBox=function(){if(is(this)&&this.currentAttack?.wsDive&&this.state==='attack')return{x:this.x-30,y:this.y-12,w:60,h:75};return box.call(this);};
 const check=Game.prototype.checkHit;
 Game.prototype.checkHit=function(f,v){
  if(is(f)&&f.currentAttack?.wsSuper)return;
  if(!is(f)||!f.currentAttack?.wsSlide||f.state!=='attack')return check.call(this,f,v);
  const a=f.curEff(),t=f.stateTimer-a.startup,s=ws(f);if(t<0||t>=a.active)return;
  if(s.slide===0&&Math.abs(v.x-f.x)<110&&Math.abs(v.y-f.y)<100){
   s.slide=1;const r=hit(this,f,v,30,{knockback:0});
   if(!r.immune&&!r.blocked&&!r.ko){const d=f.facing;f.x=clamp(v.x+d*((f.width+v.width)/2+10),CONFIG.canvas.wallMargin+f.width/2,CONFIG.canvas.width-CONFIG.canvas.wallMargin-f.width/2);f.facing=f.pendingFacing=-d;}
  }
  if(t>=9&&s.slide===1){s.slide=2;if(Math.abs(v.x-f.x)<120)hit(this,f,v,36,{launch:-14,knockback:3});}
 };
 const skillCasts=Game.prototype.updateSkillCasts;
 Game.prototype.updateSkillCasts=function(f){if(is(f)&&f.pendingProj?.ws)f.pendingProj=null;if(is(f)&&f.state==='attack'&&f.currentAttack?.wsGun&&!ws(f).gunDone&&f.stateTimer>=f.atkDur(f.currentAttack,'startup')){ws(f).gunDone=true;fire(this,f,'up',90);reload(f);}return skillCasts.call(this,f);};
 const anim=Fighter.prototype._animForState;
 Fighter.prototype._animForState=function(){
  if(is(this)){const s=ws(this);if(s.gliding&&this.state==='jump')return 'wsGlide';if(s.reload>0&&['idle','walk','jump'].includes(this.state))return 'wsReload';}
  return anim.call(this);
 };
 const updateAnim=Fighter.prototype._updateAnim;
 Fighter.prototype._updateAnim=function(){
  if(is(this)){const s=ws(this),u=s.super;
   if(u&&this.state==='super'){
    this.animKey=this.def.nightSupers[u.kind].anim;
    this.animFrame=u.kind==='execution'?(u.age<26?Math.min(11,Math.floor(u.age*12/26)):u.age<102?12+Math.floor((u.age-26)%12/2):Math.min(24,18+Math.floor((u.age-102)*7/24))):Math.min(u.kind==='rain'?11:24,Math.floor(u.age*(u.kind==='rain'?12:25)/u.life));return;
   }
   if(s.reload>0&&['idle','walk','jump'].includes(this.state)){this.animKey='wsReload';this.animFrame=Math.min(11,Math.floor((K.reload-s.reload)*12/K.reload));return;}
  }
  return updateAnim.call(this);
 };
 const update=Fighter.prototype.update;
 Fighter.prototype.update=function(){
  const f=this,s=is(f)?ws(f):null,wasAir=!f.onGround,dive=is(f)&&f.state==='attack'&&f.currentAttack?.wsDive;
  if(s){
   const canGlide=!f.onGround&&f.jumpsLeft===0&&s.jumpHeld&&['jump','skill'].includes(f.state)&&!dive;
   s.jumpHold=canGlide?s.jumpHold+1:0;s.gliding=canGlide&&s.jumpHold>=10;
   if(s.gliding&&f.vy>0)f.vy=Math.min(1.1,f.vy);
   if(dive)f.vy=Math.max(22,f.vy);if(s.super?.kind==='execution')f._superMoveDir=0;
  }
  update.call(f);
  if(s){
   if(f.state==='skill'&&f.currentCast?.ws&&s.dir){const margin=CONFIG.canvas.wallMargin+f.width/2;f.x=clamp(f.x+s.dir*f.curWalkSpeed()*(f.onGround?1:CONFIG.physics.airControl),margin,CONFIG.canvas.width-margin);f.vx=0;}
   if(dive&&wasAir&&f.onGround){const g=window.game,v=enemy(g,f);if(!f.hasHit&&Math.abs(v.x-f.x)<90&&Math.abs(v.y-f.y)<70)hit(g,f,v,70,{wsDown:true});fx(g,'landing',f.x,f.y);f.currentAttack=null;f.setState('idle');}
   if(f.onGround){s.gliding=false;s.jumpHold=0;}
  }
  if(f.nightPin){const g=window.game,owner=f.nightPin.side===1?g?.p1:g?.p2,u=owner?.umbra?.super;
   if(!u?.latched||u.kind!=='execution'||f.health<=0||owner.health<=0)f.nightPin=null;
   else{f.x=clamp(owner.x+u.dir*((owner.width+f.width)/2+9),CONFIG.canvas.wallMargin+f.width/2,CONFIG.canvas.width-CONFIG.canvas.wallMargin-f.width/2);f.y=owner.y;f.vx=f.vy=0;f.onGround=owner.onGround;f.hitstunLeft=Math.max(3,f.hitstunLeft);}
  }
 };
 function segment(x1,y1,x2,y2,left,top,w,h){let lo=0,hi=1;for(const [p,q]of [[x2-x1,left-x1],[x1-x2,x1-left-w],[y2-y1,top-y1],[y1-y2,y1-top-h]]){if(!p){if(q>0)return false;}else if(p>0)lo=Math.max(lo,q/p);else hi=Math.min(hi,q/p);}return lo<=hi;}
 function mistBlock(g,p){for(const w of g.nightWalls||[])if(w.charges>0&&w.side!==(p.owner?side(g,p.owner):p.side)&&segment(p.x,p.y,p.x+(p.vx||0),p.y+(p.vy||0),w.x-28,w.y-155,56,165)){w.charges--;fx(g,'mist-hit',w.x,clamp(p.y,w.y-155,w.y));return true;}return false;}
 const projectiles=Game.prototype.updateProjectiles;
 Game.prototype.updateProjectiles=function(){
  const bullets=[];for(const p of this.projectiles||[]){if(!p.dead&&mistBlock(this,p))p.dead=true;if(p.nightBullet&&!p.dead)bullets.push(p);}
  this.projectiles=this.projectiles.filter(p=>!p.nightBullet);projectiles.call(this);
  for(const p of bullets){const v=enemy(this,p.owner),x2=p.x+p.vx,y2=p.y+p.vy;
   if(--p.life<=0||x2<0||x2>CONFIG.canvas.width||y2>CONFIG.canvas.groundY+15||y2< -160)continue;
   if(window.signatureArts.shield(this,p.owner,p.x,p.y,x2,y2,6))continue;
   const fromX=p.startX??p.x;delete p.startX;const b=v.getBodyBox();if(!v.isInvulnerable()&&segment(fromX,p.y,x2,y2,b.x-6,b.y-6,b.w+12,b.h+12)){
    if(v.isParryActive()){v.onParrySuccess();this.spawnHitSpark(x2,y2,true);continue;}
    const r=v.takeHit({damage:p.damage,knockback:p.knockback,hitstun:18,deferKnockdown:true,launch:p.explosive?-10:0},Math.sign(p.vx)||p.owner.facing,v.state==='block',p.scale);
    if(!r.immune){p.owner.gainMeter(5);p.owner.gainLayers(1);this.spawnHitSpark(v.x,y2,!!r.blocked);if(p.explosive)fx(this,'explosion',v.x,v.y-v.height*.5,{life:42});if(r.ko)this.onKO(p.owner);this.updateHUD();continue;}
   }
   p.x=x2;p.y=y2;this.projectiles.push(p);
  }
 };
 function superTick(g,f,v,s){
  const u=s.super;if(!u)return;
  if(f.health<=0||f.state!=='super'){release(g,f);s.super=null;return;}
  u.age++;
  if(u.kind==='execution'){
   if(u.age===6){
    const from=f.x,to=clamp(f.x+u.dir*300,CONFIG.canvas.wallMargin+f.width/2,CONFIG.canvas.width-CONFIG.canvas.wallMargin-f.width/2);
    const contact=(v.x-from)*u.dir>=-v.width/2&&(v.x-to)*u.dir<=v.width/2&&Math.abs(v.y-f.y)<130;
    f.x=to;f.blinkEvent={id:++f.blinkSerial,fromX:from,toX:to,y:f.y,dir:u.dir};
    if(contact&&!v.isInvulnerable()){f.x=clamp(v.x-u.dir*((f.width+v.width)/2+10),CONFIG.canvas.wallMargin+f.width/2,CONFIG.canvas.width-CONFIG.canvas.wallMargin-f.width/2);const r=hit(g,f,v,40,{knockback:0});if(!r.blocked&&!r.immune&&!r.ko){u.latched=true;v.nightPin={side:side(g,f)};}}
    f.blinkEvent.toX=f.x;
    if(!u.latched)u.life=32;
   }
   if(u.latched&&[30,42,54,66,78,90].includes(u.age)){
    hit(g,f,v,60,{knockback:0});s.flash={x:f.x+u.dir*75,y:f.y-f.height*.84,angle:u.dir>0?0:Math.PI,age:0};fx(g,'shot-hit',v.x,v.y-v.height*.5,{life:12});
   }
   if(u.latched&&u.age===108){release(g,f);hit(g,f,v,200,{launch:-14,knockback:14});fx(g,'explosion',v.x,v.y-v.height*.5,{life:42});u.latched=false;s.ammo=0;reload(f);}
  }else if(u.kind==='burst'){
   if([12,28].includes(u.age)&&Math.abs(v.x-f.x)<125&&Math.abs(v.y-f.y)<190&&(v.x-f.x)*u.dir>=-v.width/2){hit(g,f,v,u.age===12?70:130,{launch:u.age===12?-9:-12,knockback:u.age===12?2:15});fx(g,'umbrella-hit',v.x,v.y-v.height*.5,{life:24});}
  }
  if(u.age>=u.life){release(g,f);s.super=null;f.currentAttack=null;f.setState(f.onGround?'idle':'jump');}
 }
 const combat=Game.prototype.updateCombatV2;
 Game.prototype.updateCombatV2=function(){
  combat.call(this);this.nightFX||=[];this.nightWalls||=[];
  for(const f of [this.p1,this.p2])if(is(f)){const s=ws(f),v=enemy(this,f);
   if(s.reload>0&&--s.reload===0)s.ammo=K.magazine;if(s.cooldown>0)s.cooldown--;if(s.wallCooldown>0)s.wallCooldown--;if(s.flash&&++s.flash.age>22)s.flash=null;
   if(s.shot){if(f.state!=='skill'||!f.currentCast?.ws)s.shot=null;else{const o=s.shot;o.age++;if(o.age>=6&&!o.fired){o.fired=true;fire(this,f,o.air?'air':'ground');}}}
   superTick(this,f,v,s);
  }
  for(const w of this.nightWalls){w.age++;w.left--;for(const t of this.hunterTraps||[])if(t.side!==w.side&&!t.closed&&Math.abs(t.x-w.x)<t.radius+28&&Math.abs(t.y-w.y)<100){t.closed=24;t.left=0;fx(this,'mist-hit',t.x,t.y);}}
  this.nightWalls=this.nightWalls.filter(w=>w.left>0&&w.charges>0);
  if(this.nightWeather){const w=this.nightWeather;w.age++;if(--w.left<=0||(w.side===1?this.p1:this.p2).health<=0)this.nightWeather=null;}
  for(const o of this.nightFX)o.age++;this.nightFX=this.nightFX.filter(o=>o.age<o.life);
 };
 const snap=Fighter.prototype.toSnapshot,apply=Fighter.prototype.applySnapshot,reset=Fighter.prototype.resetForRound;
 Fighter.prototype.toSnapshot=function(){return{...snap.call(this),umbra:is(this)?JSON.parse(JSON.stringify(ws(this))):null,nightPin:this.nightPin?{...this.nightPin}:null};};
 Fighter.prototype.applySnapshot=function(data){apply.call(this,data);this.nightPin=data.nightPin?{...data.nightPin}:null;if(is(this)){this.umbra={...fresh(),...data.umbra};this.rangedNormals=false;window.comboRework.select(this);if(this.umbra.super)this.currentAttack=this.def.nightSupers[this.umbra.super.kind];}};
 Fighter.prototype.resetForRound=function(...args){reset.apply(this,args);this.nightPin=null;if(is(this)){this.umbra=fresh();this.rangedNormals=false;window.comboRework.select(this);}};
 const objects=Game.prototype.combatV2ObjectsSnapshot,restore=Game.prototype.applyStateSnapshot;
 Game.prototype.combatV2ObjectsSnapshot=function(){return[...objects.call(this),...(this.nightWalls||[]),...(this.nightFX||[]),...(this.nightWeather?[this.nightWeather]:[])];};
 Game.prototype.applyStateSnapshot=function(data){const wo=data.wo||[];restore.call(this,{...data,wo:wo.filter(o=>!o.nightWall&&!o.nightWeather&&!o.nightFX)});this.nightWalls=wo.filter(o=>o.nightWall);this.nightFX=wo.filter(o=>o.nightFX);this.nightWeather=wo.find(o=>o.nightWeather)||null;};
 for(const name of ['startRound','resetNoblePractice']){const old=Game.prototype[name];if(old)Game.prototype[name]=function(...args){this.nightWalls=[];this.nightFX=[];this.nightWeather=null;return old.apply(this,args);};}
 const menu=window.game?.returnToMainMenu;if(menu)window.game.returnToMainMenu=function(...args){this.nightWalls=[];this.nightFX=[];this.nightWeather=null;return menu.apply(this,args);};
 const cpu=Game.prototype.readCpuInput;if(cpu)Game.prototype.readCpuInput=function(){const inp=cpu.call(this);if(is(this.p2)&&inp.sup){inp.u=this.p2.meter<67;inp.d=this.p2.meter>=67&&this.p2.meter<100;}return inp;};
 // Export for the draw-only adapter and meaningful collision/timing checks.
 window.umbraCombat={ws,fresh,segment,fire,hit,mistBlock,shieldSegment:(g,owner,x1,y1,x2,y2)=>mistBlock(g,{owner,x:x1,y:y1,vx:x2-x1,vy:y2-y1})};
})();
