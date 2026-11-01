/* Five readable strikes and a restrained portal origin for ranged/ultimate tendrils. */
(()=>{
 CONFIG.mechanics.blockDamageRatio=.1;
 const old=window.comboRework.sets.motong,base=old.slice();const specs=[['1A·直拳','ev1',0,2],['2A·推拳','ev2',0,2],['3A·触手平推','ev3',0,2],['4A·触手上挑','ev4',-11,2],['5A·触手下砸','ev5',0,5]];old.splice(0,old.length,...specs.map(([name,anim,launch,knockback],i)=>({...base[Math.min(i,base.length-1)],name,anim,launch,knockback,weapon:null,control:false,hitstun:18,hitHeight:150,hitY:85,slam:i===4})));
 const def=CONFIG.characters.motong;def.super_={...def.super_,anim:'evSuper'};def.skill.name='幽门·触手吸附';
 const hit=Fighter.prototype.takeHit;
 Fighter.prototype.takeHit=function(a,dir,blocked,scale){const guard=!a.burnTick&&(this.state==='block'||blocked);return hit.call(this,guard&&!a.airGuardBreak?{...a,guardBreak:false}:a,dir,guard,scale);};
 const eff=Fighter.prototype.effAttack;
 Fighter.prototype.effAttack=function(a){const e=eff.call(this,a);if(e&&a?.slam)e.slam=true;return e;};
 const take=Fighter.prototype.takeHit;
 Fighter.prototype.takeHit=function(a,...args){const r=take.call(this,a,...args);if(a.slam&&r.dmg>0&&!r.blocked&&!r.immune&&!r.ko){this.vy=8;this.onGround=false;this._wasAirborne=true;}return r;};
 const anim=Fighter.prototype._animForState;
 Fighter.prototype._animForState=function(){if(this.charId==='motong'&&this.state==='rangedCharge')return 'evRange';return anim.call(this);};
 const updateAnim=Fighter.prototype._updateAnim;
 Fighter.prototype._updateAnim=function(){if(this.charId==='motong'&&this.state==='super'){this.animKey='evSuper';this.animFrame=this.stateTimer<100?Math.min(16,Math.floor(this.stateTimer*40/60)):Math.min(24,16+Math.floor((this.stateTimer-100)*.4));return;}return updateAnim.call(this);};
 const casts=Game.prototype.updateSkillCasts;
 Game.prototype.updateSkillCasts=function(f){if(f.charId==='motong'&&f.state==='skill'&&f.pendingProj&&!f.pendingProj.special&&!f.pendingProj.tier){const s=f.pendingProj;f.currentCast.anim='evRange';if(f.stateTimer>=s.startup){f.pendingProj=null;f.rangedCooldown=Math.ceil(CONFIG.resources.rangedCooldownSeconds*60);(f.portalArms||=[]).push({age:0,damage:s.damage,scale:f.damageScale(),hit:false,charge:s.chargeLevel||1});}return;}return casts.call(this,f);};
 const combat=Game.prototype.updateCombatV2;
 Game.prototype.updateCombatV2=function(){combat.call(this);for(const f of [this.p1,this.p2]){const v=f===this.p1?this.p2:this.p1;for(const o of f.portalArms||[]){o.age++;if(o.age===18&&!o.hit&&v.health>0){const r=v.takeHit({damage:o.damage,hitstun:18,knockback:0,deferKnockdown:true},f.facing,v.state==='block',o.scale);o.hit=!r.immune;if(r.dmg>0){f.gainLayers(1);f.gainMeter(CONFIG.resources.meterOnHit);this.spawnHitSpark(v.x,v.y-v.height*.55,!!r.blocked);this.updateHUD();}if(r.ko)this.onKO(f);}}f.portalArms=(f.portalArms||[]).filter(o=>o.age<48&&f.health>0);}};
 const snap=Fighter.prototype.toSnapshot,apply=Fighter.prototype.applySnapshot,reset=Fighter.prototype.resetForRound;
 Fighter.prototype.toSnapshot=function(){return {...snap.call(this),portalArms:(this.portalArms||[]).map(o=>({...o}))};};
 Fighter.prototype.applySnapshot=function(s){apply.call(this,s);this.portalArms=(s.portalArms||[]).map(o=>({...o}));};
 Fighter.prototype.resetForRound=function(...args){reset.apply(this,args);this.portalArms=[];};
 function portal(c,x,y,t,r=30){c.save();c.translate(x,y);c.fillStyle='#040308';c.shadowColor='#66384d';c.shadowBlur=10;c.beginPath();c.ellipse(0,0,r,r*.4,0,0,Math.PI*2);c.fill();c.strokeStyle='#855466';c.lineWidth=1.5;for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,0,r+i*5,r*.4+i*2,t*.002*(i?1:-1),0,Math.PI*2);c.stroke();}c.restore();}
 const draw=Game.prototype.drawCombatV2;
 Game.prototype.drawCombatV2=function(c){draw.call(this,c);for(const f of [this.p1,this.p2]){if(f.charId!=='motong')continue;const v=f===this.p1?this.p2:this.p1,t=f.stateTimer,x=f.x,y=f.y-f.height-32;
 if(f.state==='rangedCharge')portal(c,x,y,t,23+Math.min(12,(f.rangedChargeFrames||0)/20));
 for(const o of f.portalArms||[]){portal(c,x,y,o.age);const q=Math.min(1,o.age/18),fade=Math.min(1,(48-o.age)/12);c.save();c.globalAlpha=fade;const dx=(v.x-x)*q,dy=(v.y-v.height*.5-y)*q;window.evelynFX.arm(c,x,y,dx,dy,o.age*.35,8,18);if(o.age>=18)window.evelynFX.arm(c,v.x-15,v.y-v.height*.3,28,-v.height*.4,o.age*.3,6,10);c.restore();}
 if(f.state==='super'){const grow=Math.min(1,t/35),r=38*grow;portal(c,x,y,t,r);const active=t>=f.def.super_.startup&&t<f.def.super_.startup+f.def.super_.active,phase=Math.max(0,t-f.def.super_.startup)%f.def.super_.interval,q=active?Math.sin(Math.PI*Math.min(1,phase/8)):0;for(let i=0;i<2;i++){const reach=Math.min(f.def.super_.range,Math.abs(v.x-x))*grow,dx=(Math.sign(v.x-x)||f.facing)*reach*(.35+.65*q);window.evelynFX.arm(c,x+(i?8:-8),y,dx,(v.y-v.height*.55-y)*(.35+.65*q)+i*14,t*.25+i*18,8,18);}}}};
 window.evelynPortal={portal};
})();
