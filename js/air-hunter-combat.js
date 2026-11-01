/* Authoritative aerial dive, guard break, wolf missiles, trap follow-ups and spectral wolf head. */
(()=>{
 'use strict';
 const K=window.airHunterKit,enemy=(g,f)=>f===g.p1?g.p2:g.p1,side=(g,f)=>f===g.p1?1:2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hunter=f=>f?.charId==='liequan',pick=f=>f.charId==='shouwang'?f.form:f.charId;
 const d=CONFIG.characters.liequan,old=window.comboRework.sets.liequan;
 const combo=[['1A·枪托平推','huntStock1'],['2A·枪托平推','huntStock2'],['3A·枪托平推','huntStock3'],['4A·霰弹开火挑飞','huntFire'],['5A·枪托横向击飞','huntSweep']].map(([name,anim],i)=>({...old[Math.min(i,old.length-1)],name,anim,weapon:null,damage:[38,42,56,70,92][i],range:i===3?160:100,hitY:85,hitHeight:105,launch:i===3?-12:i===4?-5:0,knockback:i===4?15:3,control:false,bullet:false,deferKnockdown:true}));window.comboRework.sets.liequan=d.combo=combo;
 function hurt(g,f,v,damage,extra={}){const r=v.takeHit({damage,hitstun:24,knockback:4,deferKnockdown:true,...extra},f.facing,v.state==='block',f.damageScale());if(r.dmg>0){f.gainMeter(5);f.gainLayers(1);g.spawnHitSpark(v.x,v.y-v.height*.5,!!r.blocked);g.updateHUD();}if(r.ko)g.onKO(f);return r;}
 function offer(f,v,kind){f.hunterFollowup={left:K.followupWindow,kind,targetSide:side(window.game,v)};}
 const take=Fighter.prototype.takeHit;
 Fighter.prototype.takeHit=function(a,...args){const r=take.call(this,a,...args);if(a.hunterWolf===3&&r.dmg>0&&!r.blocked&&!r.immune&&!r.ko){const g=window.game,f=a.hunterSide===1?g.p1:g.p2;if(hunter(f))offer(f,this,'slow');}return r;};
 const eff=Fighter.prototype.effAttack;
 Fighter.prototype.effAttack=function(a){const e=eff.call(this,a);if(e&&a?.airGuardBreak){e.airGuardBreak=true;e.guardBreak=true;}return e;};
 const start=Fighter.prototype._startAttack;
 Fighter.prototype._startAttack=function(a){start.call(this,a);if(a?.airRush){this.airRush={kind:pick(this),age:0,bodyHit:false,landed:0,phase:'windup',targetSide:null,sword:null};this.vx=0;this.vy=-CONFIG.physics.gravity;this.onGround=false;this.currentAttack=this.def.airAttack;
  this.y=Math.min(this.y,CONFIG.canvas.groundY-8);
  if(this.charId==='motong'){const v=enemy(window.game,this);if(v&&v.health>0&&Math.abs(v.x-this.x)<95&&v.y>=this.y-8&&v.y-this.y<380)this.airRush.targetSide=side(window.game,v);}
 }};
 const active=Fighter.prototype.isAttackActive;
 Fighter.prototype.isAttackActive=function(){if(this.airRush||hunter(this)&&this.state==='super')return false;return active.call(this);};
 const anim=Fighter.prototype._animForState;
 Fighter.prototype._animForState=function(){if(this.airRush&&this.state==='attack')return 'airRush';return anim.call(this);};
 const animUpdate=Fighter.prototype._updateAnim;
 Fighter.prototype._updateAnim=function(){if(this.airRush&&this.state==='attack'){this.animKey='airRush';const a=this.airRush;this.animFrame=a.landed?Math.min(11,9+Math.floor(a.landed/3)):a.age<6?Math.min(2,Math.floor(a.age/2)):a.age<13?3+Math.min(2,Math.floor((a.age-6)/3)):6+Math.min(2,Math.floor((a.age-13)/7));return;}return animUpdate.call(this);};
 function clearSnare(g,f){const v=enemy(g,f);if(v?.airSnare?.side===side(g,f))v.airSnare=null;}
 const update=Fighter.prototype.update;
 Fighter.prototype.update=function(){
  const a=this.airRush,g=window.game,prevY=this.y;
  if(a){if(this.state!=='attack'||this.health<=0){clearSnare(g,this);this.airRush=null;}else{a.age++;const wait=a.kind==='jianke'?12:a.kind==='motong'&&a.targetSide?14:6;
   if(a.age<=wait){this.vy=-CONFIG.physics.gravity;this.vx=0;}else{this.vy=Math.max(this.vy,22);this.vx=0;a.phase='dive';}
   if(a.kind==='jianke'&&a.age===3)a.sword={x:this.x+this.facing*8,y:this.y-35,hit:false};
   if(a.kind==='motong'&&a.targetSide&&a.age===6){const v=a.targetSide===1?g.p1:g.p2,r=hurt(g,this,v,this.def.airAttack.damage*.3,{airGuardBreak:true,guardBreak:true,knockback:0,hitstun:32});if(r.dmg>0&&!r.immune&&!r.ko){v.airSnare={side:side(g,this),left:40,x:v.x,y:v.y};a.snared=true;}else a.targetSide=null;}
   if(a.kind==='motong'&&a.snared){const v=a.targetSide===1?g.p1:g.p2;this.x=v.x;}
  }}
  update.call(this);
  if(this.airRush){const a=this.airRush,v=enemy(g,this);
   if(a.sword&&!a.sword.hit){const s=a.sword,previous=s.y;s.y+=26;if(window.signatureArts.shield(g,this,s.x,previous,s.x,s.y,10))s.hit=true;else if(Math.abs(v.x-s.x)<v.width/2+20&&s.y>=v.y-v.height&&previous<=v.y){const r=hurt(g,this,v,this.def.airAttack.damage*.35,{airGuardBreak:true,guardBreak:true,knockback:2});s.hit=!r.immune;}else if(s.y>CONFIG.canvas.groundY)s.hit=true;}
   if(a.phase==='dive'&&!a.landed&&!a.bodyHit&&Math.abs(v.x-this.x)<v.width/2+34&&this.y+24>=v.y-v.height&&prevY-10<=v.y){const damage=this.def.airAttack.damage*(a.kind==='jianke'?.65:a.kind==='motong'&&a.snared?.7:1),r=hurt(g,this,v,damage,{airGuardBreak:true,guardBreak:true});if(r.dmg>0&&!r.immune){a.bodyHit=true;this.hasHit=true;if(hunter(this)&&!r.ko)offer(this,v,'bind');clearSnare(g,this);}}
   if(this.onGround){if(!a.landed)a.landed=1;else a.landed++;this.vx=this.vy=0;if(a.landed>=8){clearSnare(g,this);this.airRush=null;this.currentAttack=null;this.setState('idle');}}
   if(a.age>150){clearSnare(g,this);this.airRush=null;this.currentAttack=null;this.setState(this.onGround?'idle':'jump');}
  }
  if(this.airSnare){const f=this.airSnare.side===1?g.p1:g.p2;if(this.airSnare.left>0&&f?.airRush&&this.health>0){this.x=this.airSnare.x;this.y=this.airSnare.y;this.vx=this.vy=0;}else this.airSnare=null;}
  if(this.hunterTrap?.kind==='bind'&&this.hunterTrap.left>0&&this.health>0){this.x=this.hunterTrap.x;this.y=CONFIG.canvas.groundY;this.vx=this.vy=0;this.onGround=true;this.hitstunLeft=Math.max(3,this.hitstunLeft);}
 };
 const attack=Fighter.prototype.attack;
 Fighter.prototype.attack=function(){if(this.airRush)return;return attack.call(this);};
 const skill=Fighter.prototype.castSkill;
 Fighter.prototype.castSkill=function(...args){const result=skill.apply(this,args);if(hunter(this)&&result){result.anim='huntCall';this.currentCast=result;}return result;};
 const cast=Fighter.prototype.castSuper;
 Fighter.prototype.castSuper=function(...args){if(!hunter(this))return cast.apply(this,args);if(!this.canAct()||!this.onGround||this.meter<100)return false;this.meter-=100;this.currentAttack=this.def.super_;this.setState('super');this.superSerial=(this.superSerial||0)+1;this.hunterSuper={age:0,originX:this.x,dir:this.facing,x:this.x+this.facing*45,y:this.y-85,hit:false};this.vx=0;return true;};
 function follow(g,f){const pending=f.hunterFollowup;if(!pending||pending.left<=0)return false;const v=pending.targetSide===1?g.p1:g.p2;if(v.health<=0||v.isInvulnerable())return false;
  f.hunterFollowup=null;clearSnare(g,f);f.airRush=null;f.currentAttack=null;f.setState('skill');f.currentCast={anim:'huntCall',special:true,startup:8,recovery:16};f.currentSkillFrames=24;f.pendingProj=null;
  v.hunterTrap={kind:pending.kind,left:180,age:0,x:v.x};if(pending.kind==='bind'){v.setState('hit');v.hitstunLeft=180;v.vx=v.vy=0;v.y=CONFIG.canvas.groundY;v.onGround=true;}g.spawnHitSpark(v.x,v.y-12,false);return true;
 }
 const input=Game.prototype.applyInput;
 Game.prototype.applyInput=function(f,inp){if(this.phase==='fight'&&(f.airSnare?.left>0||f.hunterTrap?.kind==='bind'&&f.hunterTrap.left>0))return;if(hunter(f)&&inp.atk&&this.phase==='fight'&&f.health>0&&!['hit','guardbreak','ko','knockdown'].includes(f.state)&&!(f.curseBindLeft>0)&&follow(this,f))return input.call(this,f,{...inp,atk:false});return input.call(this,f,inp);};
 const speed=Fighter.prototype.curWalkSpeed;
 Fighter.prototype.curWalkSpeed=function(){return speed.call(this)*(this.hunterTrap?.kind==='slow'&&this.hunterTrap.left>0?K.slowScale:1);};
 const combat=Game.prototype.updateCombatV2;
 Game.prototype.updateCombatV2=function(){combat.call(this);for(const f of [this.p1,this.p2]){
   if(f.airSnare&&--f.airSnare.left<=0)f.airSnare=null;
   if(f.hunterTrap){f.hunterTrap.age++;if(--f.hunterTrap.left<=0||f.health<=0)f.hunterTrap=null;}
   if(f.hunterBurn){const burn=f.hunterBurn;burn.age++;burn.left--;if(burn.age%60===0&&f.health>0){const r=f.takeHit({damage:10,fixedDamage:true,periodic:true,burnTick:true,knockback:0,hitstun:0},1,false,1);if(r.ko)this.onKO(burn.side===1?this.p1:this.p2);this.updateHUD();}if(burn.left<=0||f.health<=0)f.hunterBurn=null;}
   if(f.hunterFollowup&&(--f.hunterFollowup.left<=0||f.health<=0))f.hunterFollowup=null;
   if(f.hunterSuper){const u=f.hunterSuper,v=enemy(this,f);u.age++;if(f.health<=0){f.hunterSuper=null;continue;}if(u.age>=18){const progress=Math.min(1,(u.age-18)/60);u.x=u.originX+u.dir*(45+progress*(f.width*7-105));u.y=CONFIG.canvas.groundY-85;const nose=u.x+u.dir*58;
     if(!u.hit&&Math.abs(v.x-nose)<v.width/2+57&&Math.abs(v.y-(u.y+60))<180){const r=hurt(this,f,v,380,{fixedDamage:true,knockback:10,hitstun:32});if(!r.immune){u.hit=true;if(r.dmg>0&&!r.blocked&&!r.ko)v.hunterBurn={side:side(this,f),age:0,left:600};}}
    }if(u.age>=96)f.hunterSuper=null;
   }
  }};
 const snap=Fighter.prototype.toSnapshot,apply=Fighter.prototype.applySnapshot,reset=Fighter.prototype.resetForRound;
 Fighter.prototype.toSnapshot=function(){return{...snap.call(this),airHunter:JSON.parse(JSON.stringify({rush:this.airRush||null,snare:this.airSnare||null,trap:this.hunterTrap||null,burn:this.hunterBurn||null,follow:this.hunterFollowup||null,super:this.hunterSuper||null}))};};
 Fighter.prototype.applySnapshot=function(s){apply.call(this,s);const n=s.airHunter||{};this.airRush=n.rush||null;this.airSnare=n.snare||null;this.hunterTrap=n.trap||null;this.hunterBurn=n.burn||null;this.hunterFollowup=n.follow||null;this.hunterSuper=n.super||null;if(hunter(this))window.comboRework.select(this);};
 Fighter.prototype.resetForRound=function(...args){reset.apply(this,args);this.airRush=this.airSnare=this.hunterTrap=this.hunterBurn=this.hunterFollowup=this.hunterSuper=null;if(hunter(this))window.comboRework.select(this);};
 if(window.blinkFX){const blink=window.blinkFX.draw;window.blinkFX.draw=function(g,c,f){if(f.airRush||!f.onGround&&f.state==='attack')return;return blink.call(this,g,c,f);};}
 window.airHunterCombat={hurt,follow,offer};
})();
