/* Version 2 combat: hold/release ranged attacks, resource specials, terrain objects. */
(() => {
Fighter.prototype.combatPlatforms=function(){return [...(CONFIG.platforms||[]),...(window.game?.specialObjects||[]).filter(o=>o.type==='shouwang'&&o.age>=18).map(o=>({x:o.x-26,y:o.y-110,w:52,h:110}))];};
const baseAnim=Fighter.prototype._animForState;
Fighter.prototype._animForState=function(){if(this.state==='rangedCharge')return 'uCharge';return baseAnim.call(this);};
Fighter.prototype.castSkill=function(charged=false){
 if(!['idle','walk','block','jump','rangedCharge'].includes(this.state)||(this.rangedCooldown||0)>0)return null;
 const {forms,...common}=this.def.skill,base={...common,...forms?.[this.form]};
 let level=charged?2:1;
 if(base.chargeThresholds){level=charged?3:1;if(this.state==='rangedCharge'){level=1;for(let i=1;i<base.chargeThresholds.length;i++)if((this.rangedChargeFrames||0)>=base.chargeThresholds[i])level=i+1;}charged=level>1;}
 const sizeScale=base.chargeThresholds?1+(level-1)*.25:charged?1.5:1;
 const s={...base,charged,chargeLevel:level,anim:charged?'uCharged':'u',damage:Math.round(base.damage*(base.stageMultipliers?.[level-1]??(charged?1.8:1))),projSize:base.projSize*sizeScale,projHitWidth:base.projHitWidth?base.projHitWidth*sizeScale:undefined,projHitHeight:base.projHitHeight?base.projHitHeight*sizeScale:undefined,projSpeed:base.projSpeed*(base.chargeThresholds?1+(level-1)*.12:charged?.85:1),startup:base.startup+(charged?5:0),recovery:base.recovery+(charged?7:0),fullGuardBreak:false};
 this.setState('skill');this.currentCast=s;this.currentSkillFrames=s.startup+s.recovery;this.vx=0;this.rangedCooldown=Math.ceil(CONFIG.resources.rangedCooldownSeconds*60)+s.startup;return s;
};
Game.prototype.handleRangedInput=function(f,inp){
 const held=!!inp.sklHeld;
 if(f.rangedInterrupted&&!held)f.rangedInterrupted=false;
 if(f.state==='rangedCharge'&&!held){const charged=(f.rangedChargeFrames||0)>=30;const s=f.castSkill(charged);if(s)f.pendingProj=s;return;}
 if(inp.skl&&!held){const s=f.castSkill(false);if(s)f.pendingProj=s;return;}
 if(held&&!f.rangedInterrupted&&inp.skl&&['idle','walk','jump','block'].includes(f.state)&&!(f.rangedCooldown>0)){f.setState('rangedCharge');f.rangedChargeFrames=0;f.vx=0;}
};
Fighter.prototype.castSpecial=function(){if(!this.canAct()||!this.onGround||this.resource<this.resourceMax)return false;this.resource=0;this.specialSerial=(this.specialSerial||0)+1;this.specialPending={id:this.specialSerial,type:this.charId,x:this.x,y:this.y,dir:this.facing};this.setState('skill');this.currentCast={anim:'uCharged',startup:12,recovery:18,special:true};this.currentSkillFrames=30;this.vx=0;return true;};
const update=Fighter.prototype.update;
Fighter.prototype.update=function(){if(this.rangedCooldown>0)this.rangedCooldown--;const cap=CONFIG.resources.maxChargeSeconds*60;if(this.state==='rangedCharge')this.rangedChargeFrames=Math.min(cap,(this.rangedChargeFrames||0)+1);update.call(this);if(this.state==='rangedCharge'&&this.rangedChargeFrames>=cap){this.rangedInterrupted=true;const shot=this.castSkill(true);if(shot)this.pendingProj=shot;}if(this.rootLeft>0){this.rootLeft--;this.x=this.rootX;this.y=this.rootY;this.vx=0;this.vy=0;}if(!this.onGround&&this.state==='idle')this.setState('jump');};
const takeHit=Fighter.prototype.takeHit;
Fighter.prototype.takeHit=function(...args){if(args[0]?.comboChain&&args[0]?.deferKnockdown&&this.comboHits>=3)args[0]={...args[0],deferKnockdown:false};const charging=this.state==='rangedCharge',r=takeHit.apply(this,args);if(charging&&!r.immune){this.rangedInterrupted=true;this.rangedChargeFrames=0;}return r;};
const apply=Game.prototype.applyInput;
Game.prototype.applyInput=function(f,inp){if(f.rootLeft>0&&this.phase==='fight'){if(inp.dsh&&!(f.dashCooldownLeft>0)){f.rootLeft=0;f.setState(f.onGround?'idle':'jump');f.dash();}else if(inp.d){f.rootLeft=0;f.setState('idle');f.block(true);}return;}return apply.call(this,f,inp);};
const reset=Fighter.prototype.resetForRound;
Fighter.prototype.resetForRound=function(...args){reset.apply(this,args);this.rangedCooldown=0;this.rangedChargeFrames=0;this.rangedInterrupted=false;this.rootLeft=0;this.specialPending=null;};
const snap=Fighter.prototype.toSnapshot,applySnap=Fighter.prototype.applySnapshot;
Fighter.prototype.toSnapshot=function(){return {...snap.call(this),v2:{rc:this.rangedChargeFrames||0,ri:!!this.rangedInterrupted,cd:this.rangedCooldown||0,root:this.rootLeft||0,rx:this.rootX,ry:this.rootY,sp:this.specialPending,ss:this.specialSerial||0}};};
Fighter.prototype.applySnapshot=function(s){applySnap.call(this,s);const v=s.v2||{};this.rangedChargeFrames=v.rc||0;this.rangedInterrupted=!!v.ri;this.rangedCooldown=v.cd||0;this.rootLeft=v.root||0;this.rootX=v.rx;this.rootY=v.ry;this.specialPending=v.sp;this.specialSerial=v.ss||0;if(this.currentCast&&this.currentCast.special)this.pendingProj=null;};
Game.prototype.updateCombatV2=function(){
 this.specialObjects ||= [];
 for(const f of [this.p1,this.p2])if(f.specialPending){const cast=f.specialPending;f.specialPending=null;this.specialObjects=this.specialObjects.filter(o=>o.owner!==f||o.type!=='shouwang');const enemy=f===this.p1?this.p2:this.p1;let x=f.x+f.facing*125;if(f.charId==='noble')x=f.x+Math.max(-320,Math.min(320,enemy.x-f.x));this.specialObjects.push({...cast,owner:f,side:f===this.p1?1:2,x:Math.max(60,Math.min(1140,x)),y:CONFIG.canvas.groundY,age:0,life:f.charId==='shouwang'?258:f.charId==='noble'?110:32,hit:false,range:f.width*2});}
 for(const o of this.specialObjects){o.age++;if(o.age<18)continue;
 if(o.type==='shouwang'){for(const f of [this.p1,this.p2]){const half=26+f.width/2;if(f.y>o.y-110&&f.y-f.height<o.y&&Math.abs(f.x-o.x)<half&&!f.isInvulnerable()){f.x=o.x+(f.x<o.x?-half:half);f.vx=0;}}continue;}
 if(o.hit)continue;const target=o.owner===this.p1?this.p2:this.p1;const inRange=o.type==='noble'?Math.abs(target.x-o.x)<66&&Math.abs(target.y-o.y)<150:(target.x-o.owner.x)*o.dir>0&&(target.x-o.owner.x)*o.dir<=o.range+target.width/2&&Math.abs(target.y-o.owner.y)<110;
 if(!inRange||target.isInvulnerable()||target.state==='ko')continue;o.hit=true;const blocked=target.state==='block',result=target.takeHit({damage:o.type==='noble'?65:145,hitstun:18,knockback:6},o.dir,blocked,1);if(o.type==='noble'&&!blocked&&!result.immune&&!result.ko){target.setState('idle');target.rootLeft=48;target.rootX=target.x;target.rootY=target.y;target.vx=target.vy=0;}if(result.ko)this.onKO(o.owner);this.spawnHitSpark(target.x,target.y-55,blocked);this.updateHUD();
 }
 this.specialObjects=this.specialObjects.filter(o=>o.age<o.life);
};
const projectiles=Game.prototype.updateProjectiles;
Game.prototype.updateProjectiles=function(){for(const p of this.projectiles){p.life=(p.life??100)-1;if(p.life<=0)p.dead=true;for(const o of this.specialObjects||[])if(o.type==='shouwang'&&o.age>=18&&p.y>o.y-110&&p.y<o.y&&Math.min(p.x,p.x+p.vx)<=o.x+26&&Math.max(p.x,p.x+p.vx)>=o.x-26)p.dead=true;}return projectiles.call(this);};
const checkHit=Game.prototype.checkHit;
Game.prototype.checkHit=function(a,b){if((this.specialObjects||[]).some(o=>o.type==='shouwang'&&o.age>=18&&a.y>o.y-110&&b.y>o.y-110&&Math.min(a.x,b.x)<o.x&&Math.max(a.x,b.x)>o.x))return;return checkHit.call(this,a,b);};
const cpu=Game.prototype.readCpuInput;if(cpu)Game.prototype.readCpuInput=function(){if(this.p2.rootLeft>0)return this.p2.dashCooldownLeft>0?{d:true}:{dsh:true};const inp=cpu.call(this),f=this.p2;if(f.resource>=f.resourceMax&&f.canAct()&&!inp.sup&&!inp.atk&&!inp.skl&&Math.abs(f.x-this.p1.x)<(f.charId==='jianke'?f.width*2:350))inp.spc=true;return inp;};
const start=Game.prototype.startRound;
Game.prototype.startRound=function(...args){this.specialObjects=[];return start.apply(this,args);};
const resetPractice=Game.prototype.resetNoblePractice;
if(resetPractice)Game.prototype.resetNoblePractice=function(...args){this.specialObjects=[];this.superFreeze=null;return resetPractice.apply(this,args);};
Game.prototype.combatV2ObjectsSnapshot=function(){return(this.specialObjects||[]).map(({owner,...o})=>o);};
Game.prototype.drawCombatV2=function(ctx){
 for(const o of this.specialObjects||[]){const active=o.age>=18;ctx.save();ctx.globalAlpha=active?.85:.35;const pulse=Math.sin(o.age*.12)*.12+.75;
 if(o.type==='noble'){const magic=window.characterMagic;ctx.strokeStyle='#ffe3a1';ctx.lineWidth=2;ctx.beginPath();for(const [x,y,a,b]of magic?.sealLines(65,o.age*.01,.3)||[]){ctx.moveTo(o.x+x,o.y-3+y);ctx.lineTo(o.x+a,o.y-3+b);}ctx.stroke();if(active){ctx.fillStyle='#c9bbf0';ctx.globalAlpha=.38*pulse;ctx.beginPath();ctx.arc(o.x,o.y-92,11,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(o.x,o.y-110);ctx.lineTo(o.x-24,o.y-102);ctx.lineTo(o.x+24,o.y-102);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(o.x,o.y-46);ctx.lineTo(o.x-48,o.y-2);ctx.lineTo(o.x+48,o.y-2);ctx.fill();ctx.strokeStyle='#fff0c5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x,o.y-105);ctx.lineTo(o.x,o.y-55);ctx.moveTo(o.x-30,o.y-65);ctx.lineTo(o.x+30,o.y-65);ctx.stroke();}}
 else if(o.type==='jianke'){ctx.translate(o.owner?.x||o.x,o.owner?.y||o.y);ctx.scale(o.dir,1);ctx.fillStyle='#bcecff';ctx.strokeStyle='#f1fcff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,-68);ctx.lineTo(o.range-14,-77);ctx.lineTo(o.range+12,-60);ctx.lineTo(o.range-14,-44);ctx.lineTo(12,-53);ctx.closePath();ctx.fill();ctx.stroke();}
 else{const h=active?110:Math.min(110,o.age/18*110),grad=ctx.createLinearGradient(o.x-26,0,o.x+26,0);grad.addColorStop(0,'#355276');grad.addColorStop(.5,'#bad6e8');grad.addColorStop(1,'#24405b');ctx.fillStyle=grad;ctx.strokeStyle='#cbe9ff';ctx.lineWidth=2;ctx.fillRect(o.x-26,o.y-h,52,h);ctx.strokeRect(o.x-26,o.y-h,52,h);ctx.fillStyle='#ffedba';ctx.fillRect(o.x-33,o.y-h,66,8);ctx.fillRect(o.x-33,o.y-8,66,8);ctx.beginPath();ctx.moveTo(o.x,o.y-h+24);ctx.lineTo(o.x,o.y-28);ctx.moveTo(o.x-12,o.y-h+45);ctx.lineTo(o.x+12,o.y-h+45);ctx.stroke();}
 ctx.restore();}
 for(const f of [this.p1,this.p2])if(f?.state==='rangedCharge'){ctx.save();ctx.fillStyle='#10211e';ctx.fillRect(f.x-25,f.y-f.height-16,50,5);const staged=!!f.def.skill.chargeThresholds,t=f.rangedChargeFrames||0;ctx.fillStyle=staged?(f.def.skill.projectileColor||'#91d4e9'):t>=30?'#f2d799':'#91d4e9';ctx.fillRect(f.x-25,f.y-f.height-16,50*Math.min(1,t/(staged?150:60)),5);if(staged){ctx.fillStyle='#faf5d8';ctx.fillRect(f.x-5,f.y-f.height-17,1,7);ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText((t>=150?'三':t>=60?'二':'一')+'段蓄力',f.x,f.y-f.height-20);}ctx.restore();}
};
})();
