/* PixelFX visual replacement. Combat, collision, health, cooldowns and snapshots stay authoritative
 * in the existing combat modules. This module owns only rendering and cosmetic clocks.
 * Source recipes: MIT, Copyright 2026 Patch / Hugo Duprez; see assets/fx/pixelfx-v1/LICENSE. */
(()=>{
 'use strict';
 const manifest=window.pixelFXManifest,images={};
 for(const [key,a] of Object.entries(manifest.effects))images[key]=window.gameAssets.loadImage(a.path+'?v=pixelfx1');
 const roles={
  jianke:{key:'jianke',sigil:'frost-sigil',shot:'frost-shot',color:'#c9eeff'},
  noble:{key:'noble',sigil:'gold-sigil',shot:'gold-shot',color:'#ffe6a2'},
  shouwang:{key:'armored',sigil:'jade-sigil',shot:'jade-shock',color:'#a2efb9'},
  motong:{key:'motong',sigil:'blood-sigil',shot:'black-hole',color:'#a96274'},
  liequan:{key:'liequan',sigil:'hunter-sigil',shot:'hunter-shot',color:'#eca378'},
  wuxiang:{key:'wuxiang',sigil:'night-sigil',shot:'night-shot',color:'#c8dfeb'},
 };
 const role=f=>f.charId==='shouwang'&&f.form==='unarmored'?{...roles.shouwang,key:'unarmored',shot:'jade-ray'}:roles[f.charId]||roles.noble;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const clock=g=>(g._pixelFXTick||0)/60;
 // pivot is local effect space, relative to the original recipe origin, NOT the atlas rectangle.
 function paint(c,key,x,y,t,opt={}){
  const a=manifest.effects[key],im=images[key];if(!a||!im?.naturalWidth||t<0)return;
  const loop=opt.loop??a.loop;if(!loop&&t>=a.duration)return;
  const frame=loop?Math.floor(t*a.fps)%a.frames:Math.min(a.frames-1,Math.floor(t*a.fps));
  c.save();c.translate(x,y);c.rotate(opt.angle||0);c.scale((opt.dir||1)*(opt.sx??opt.scale??1),opt.sy??opt.scale??1);c.globalAlpha*=opt.alpha??1;c.imageSmoothingEnabled=false;
  c.drawImage(im,(frame%a.cols)*a.w,Math.floor(frame/a.cols)*a.h,a.w,a.h,-a.ox-(opt.pivot?.[0]||0),-a.oy-(opt.pivot?.[1]||0),a.w,a.h);c.restore();
 }
 function sigil(c,f,g,scale=1,alpha=.75,x=f.x,y=f.y){paint(c,role(f).sigil,x,y,clock(g),{scale,alpha});}
 function portal(c,x,y,t,scale=1){paint(c,'black-hole',x,y,t,{scale,pivot:[0,-70]});}
 function arm(c,x,y,dx,dy,t,width=10,bend=20){window.evelynFX.arm(c,x,y,dx,dy,t,width,bend);}
 function sword(c,x,y,angle,length=42,width=4){window.signatureFX.sword(c,x,y,angle,length,width,'#d7f4ff');}
 function bullet(c,p,g){
  if(p.kind==='hunter-wolf')return;
  if(p.nightBullet)return;
  const f=p.owner||{charId:p.fxChar},r=role(f),d=Math.sign(p.vx)||p.fxDir||1,t=clock(g)+(p.life||0)*.013,n=p.chargeLevel||1;
  if(p.kind==='arcane-ray')paint(c,'jade-ray',p.x,p.y,t,{dir:d,pivot:[99,-24],sx:(p.hitWidth||130)/168,sy:n===1?.8:1.15});
  else if(p.kind==='arcane-shock')paint(c,'jade-shock',p.x,p.y,t,{dir:d,sx:2+n*.6,sy:1.6+n*.5});
  else if(p.kind==='revolver')paint(c,'night-shot',p.x,p.y,t,{dir:d,scale:p.charged?.9:.68});
  else if(f.charId==='motong')portal(c,p.x,p.y,t,.5);
  else paint(c,r.shot,p.x,p.y,t,{dir:d,scale:f.charId==='noble'?1.6+n*.3:f.charId==='liequan'?.8:1.1+n*.12});
  if(n>=2&&f.charId!=='wuxiang')paint(c,r.key+'-charge',p.x,p.y,t,{scale:n===3?.7:.4,alpha:.75,pivot:[0,-45]});
 }
 function normal(c,f,g){
  if(f.airRush)return;
  if(f.charId==='wuxiang'&&f.def.umbraCombo)return;
  if(f.state!=='attack'||!f.currentAttack)return;const a=f.curEff(),age=f.stateTimer-f.atkDur(f.currentAttack,'startup'),t=(age+4)/60;
  if(t<0||t>.5)return;const r=role(f),d=f.facing,range=a.range||75,x=f.x+d*range*.52,y=f.y-f.height*.53;
  if(f.currentAttack.bullet){paint(c,'muzzle',f.x+d*55,f.y-f.height*.92,Math.max(0,age)/60,{dir:d,scale:.75,pivot:[0,-26],alpha:age<0?0:1});return;}
  if(f.charId==='liequan'&&f.currentAttack.anim==='huntFire'){paint(c,'muzzle',f.x+d*65,f.y-f.height*.7,Math.max(0,age)/60,{dir:d,scale:1.2,pivot:[0,-26],alpha:age<0?0:1});return;}
  if(f.charId==='motong'){
   const i=f.def.combo.indexOf(f.currentAttack);
   if(i>=2){const q=clamp((age+5)/10),extension=Math.sin(q*Math.PI*.72),dy=i===3?-85*extension:i===4?65*extension:0;
    arm(c,f.x-d*15,f.y-f.height*.65,d*(range+18)*extension,dy,(g._pixelFXTick||0)*.25,13,22);
    paint(c,'void-impact',x,y,t*1.4,{scale:.48,alpha:.72});
   }else paint(c,'blood-impact',x,y,t,{dir:d,scale:.8,pivot:[0,-22]});
   return;
  }
  let key=r.key+'-normal';if(f.charId==='jianke'&&f.currentAttack.anim==='j4')key='frost-heavy';if(f.charId==='noble'&&a.launch)key='gold-upper';
  paint(c,key,x,y,t,{dir:d,pivot:[6,-26],sx:clamp(range/80,.75,1.5),sy:1,alpha:clamp((.5-t)/.12)});
 }
 function charging(c,f,g){
  if(!['charge','rangedCharge'].includes(f.state))return;const r=role(f),t=clock(g),n=f.state==='rangedCharge'?window.rangedArts.level(f):1;
  sigil(c,f,g,.65+n*.2,.45+n*.12);
  if(f.charId==='motong'&&f.state==='rangedCharge'){portal(c,f.x,f.y-f.height-28,t,.45+n*.12);return;}
  if(f.charId==='wuxiang'&&f.state==='rangedCharge'){paint(c,r.key+'-charge',f.x+f.facing*50,f.y-f.height*.87,t,{scale:.25+n*.08,pivot:[0,-45],alpha:.6});return;}
  paint(c,r.key+'-charge',f.x+f.facing*30,f.y-f.height*.6,t,{scale:.3+n*.17,pivot:[0,-45],alpha:.8});
 }
 function release(c,f){
  if(f.charId==='liequan'&&f.def.skill.projectileKind==='hunter-wolf')return;
  if(f.currentCast?.ws)return;
  if(f.state!=='skill'||f.currentCast?.special||f.charId==='motong')return;const s=f.currentCast,age=f.stateTimer-(s?.startup||0);if(!s||age<0||age>24)return;
  const x=f.x+f.facing*(s.projX||45),y=f.y-f.height*(s.projY||.6),r=role(f);
  if(f.charId==='wuxiang'||f.charId==='liequan')paint(c,f.charId==='liequan'?'shotgun':'muzzle',x,y,age/60,{dir:f.facing,scale:.8,pivot:[0,-26]});
  else paint(c,r.key+'-normal',x,y,age/60,{dir:f.facing,pivot:[6,-26],scale:.75,alpha:.75});
 }
 function tendrils(c,f,v,g){
  if(f.charId!=='motong')return;const t=clock(g),x=f.x,y=f.y-f.height-32;
  for(const o of f.portalArms||[]){const q=clamp(o.age/18),fade=clamp((48-o.age)/12);portal(c,x,y,t,.66);c.save();c.globalAlpha*=fade;arm(c,x,y,(v.x-x)*q,(v.y-v.height*.5-y)*q,o.age*.2,10,22);if(o.age>=18){arm(c,v.x-16,v.y-v.height*.25,30,-v.height*.45,o.age*.2,7,8);paint(c,'void-impact',v.x,v.y-v.height*.5,(o.age-18)/60,{scale:.6});}c.restore();}
  if(f.state==='super'){
   const a=f.def.super_,age=f.stateTimer-a.startup,phase=Math.max(0,age)%a.interval,q=age>=0&&age<a.active?Math.sin(Math.PI*clamp(phase/8)):0,grow=clamp(f.stateTimer/35);
   portal(c,x,y,t,.95*grow);sigil(c,f,g,1.25,.7);
   for(let i=0;i<2;i++){const reach=Math.min(a.range,Math.abs(v.x-x)),k=.35+.65*q;arm(c,x+(i?10:-10),y,(Math.sign(v.x-x)||f.facing)*reach*grow*k,(v.y-v.height*.55-y)*k+i*12,t*9+i*18,10,20);}
   if(q>.4)paint(c,'void-impact',v.x,v.y-v.height*.5,phase/60,{scale:.65});
  }
 }
 function shield(c,f,t){
  const x=f.x+f.facing*34,y=f.y-f.height*.5;c.save();c.translate(x,y);c.scale(f.facing,1);
  c.fillStyle='#1a383ad9';c.strokeStyle='#accfc1';c.lineWidth=2;
  c.beginPath();c.moveTo(-23,-49);c.lineTo(20,-54);c.lineTo(30,-35);c.lineTo(26,20);c.quadraticCurveTo(18,43,0,54);c.quadraticCurveTo(-26,35,-27,9);c.closePath();c.fill();c.stroke();
  c.fillStyle='#508d7177';c.beginPath();c.moveTo(0,-49);c.lineTo(25,-34);c.lineTo(21,19);c.lineTo(0,46);c.closePath();c.fill();
  c.strokeStyle='#c7ffe1';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-37);c.lineTo(0,28);c.moveTo(-13,-18);c.lineTo(13,-18);c.moveTo(-10,2);c.lineTo(0,12);c.lineTo(10,2);c.stroke();c.restore();
  paint(c,'armored-guard',x,y,t,{pivot:[0,-22],sx:1.35,sy:f.height/55,alpha:.65});
 }
 function buffs(c,f,v,g){
  const r=role(f),t=clock(g);
  if((f.state==='block'||f.state==='parry')&&!(f.charId==='wuxiang'&&f.def.umbraCombo))paint(c,r.key+'-guard',f.x+f.facing*19,f.y-f.height*.49,t,{pivot:[0,-22],sx:1.05,sy:f.height/65,alpha:.68});
  if(f.specialShieldLeft>0)shield(c,f,t);
  if(f.lightMagicLeft>0){sigil(c,f,g,1.2,.8);paint(c,'blessing',f.x,f.y,(600-f.lightMagicLeft)/60%1.8,{scale:1.3,alpha:.7,loop:true});}
  if(f.drainLeft>0){paint(c,'blood-sigil',f.x,f.y,t,{scale:1.1,alpha:.75});if(f.drainBusy)paint(c,'drain',f.x,f.y,(f.drainAge%108)/60,{dir:Math.sign(v.x-f.x)||f.facing,sx:Math.min(3,Math.abs(v.x-f.x)/110),sy:1.2,alpha:.8,loop:true});}
  for(const s of f.homingSwords||[]){paint(c,'frost-shot',s.x,s.y,t,{angle:(s.angle||0)-Math.PI/2,scale:.62});sword(c,s.x,s.y,s.angle||0,54,4);}
  if(f.curseLeft>0){const age=(300-f.curseLeft)/60;paint(c,'curse',f.x,f.y,age%1.5,{scale:1.4,loop:true});for(let i=0;i<2;i++)arm(c,f.x+(i?20:-20),f.y+5,i?-22:22,-f.height*.75,t*7+i*13,8,8);}
  if(f.evelynGrab&&!f.evelynGrab.done){const q=clamp(f.evelynGrab.age/18);paint(c,'blood-sigil',v.x,v.y,t,{scale:1.2});for(let i=0;i<2;i++)arm(c,v.x+(i?22:-22),v.y+10,0,-v.height*q*.75,t*8+i*10,12,18);}
 }
 function domain(c,f,u,g){
  const t=u.age/60,r=u.radius,y=f.y-f.height*.55;paint(c,'frost-sigil',f.x,f.y,t,{scale:r/48,alpha:.6});
  paint(c,'sword-domain',f.x,y,t,{pivot:[0,-22],sx:r/46,sy:r*.78/46,alpha:.3});
  for(let i=0;i<18;i++){const a=i*Math.PI*2/18+t*Math.PI*2/2.5;sword(c,f.x+Math.cos(a)*r,y+Math.sin(a)*r*.78,a+Math.PI/2,36,3);}
 }
 function ultimate(c,f,v,g){
  if(f.charId==='liequan'&&f.def.super_.hunterSuper)return;
  if(f.charId==='wuxiang'&&f.def.umbraCombo)return;
  const u=f.activeUltimate,t=clock(g);
  if(u&&window.signatureArts.active(f)){
   if(u.kind==='sword-domain')domain(c,f,u,g);
   else if(u.kind==='seven-star-execution'){
    sigil(c,f,g,1.6,.8);paint(c,'gold-sigil',v.x,v.y,t,{scale:1.15,alpha:.55});
    // Seven fixed star points around the lock: the six damaging cuts remain governed by combat code.
    c.save();c.strokeStyle='#ffe6a2';c.lineWidth=1.1;const pts=Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7-Math.PI/2;return [v.x+Math.cos(a)*58,v.y-v.height-40+Math.sin(a)*28];});c.beginPath();for(let i=0;i<7;i++){const p=pts[i],q=pts[(i+3)%7];c.moveTo(...p);c.lineTo(...q);}c.stroke();for(const p of pts){c.fillStyle='#fff4c9';c.fillRect(p[0]-2,p[1]-2,4,4);}c.restore();
   }else if(u.kind==='earth-pillars')paint(c,'jade-sigil',u.originX+u.dir*CONFIG.canvas.width*.25,CONFIG.canvas.groundY,u.age/60,{sx:CONFIG.canvas.width/190,sy:1.1,alpha:.6});
   else sigil(c,f,g,1.65,.75);
   return;
  }
  if(f.state!=='super'||f.charId==='motong')return;const a=f.currentAttack||f.def.super_,age=f.stateTimer-a.startup;
  sigil(c,f,g,1.5,.7);if(age<0||age>=a.active)return;const phase=age%(a.interval||12),reach=Math.min(a.range,Math.abs(v.x-f.x)),x=f.x+f.facing*reach*.7,y=f.y-f.height*.55;
  if(f.charId==='liequan'){
   paint(c,'hunter-ultimate',x,y,phase/60,{dir:f.facing,pivot:[6,-26],scale:2});
   paint(c,'shotgun',f.x+f.facing*50,f.y-f.height*.7,phase/60,{dir:f.facing,scale:1.2,pivot:[0,-26]});
  }else if(f.charId==='wuxiang'){
   paint(c,'night-ultimate',f.x+f.facing*52,f.y-f.height*.76,age/60,{dir:f.facing,loop:true,pivot:[0,-26]});
   paint(c,'night-shot',f.x+f.facing*(65+((age*18)%Math.max(80,a.range-65))),f.y-f.height*.65,t,{dir:f.facing,scale:1.3});
  }
 }
 function object(c,o,g){
  const t=o.age/60;
  if(o.kind==='meteor'){
   // The authored meteor lands at .62s; synchronize that frame with the real impact tick.
   const sample=o.age<o.impactAt?.62*o.age/o.impactAt:.62+(o.age-o.impactAt)/60;
   const size=o.ultimate?2.4:1.7,k=clamp(o.age/o.impactAt),remaining=1-(k*k*.35+k*.65);
   // Cancel the recipe's built-in flight offset: its rock now follows the actual homing collider.
   const x=o.x+(o.age<o.impactAt?112*remaining*size*o.dir:0),y=o.y+(o.age<o.impactAt?142*remaining*size:0);
   paint(c,'meteor',x,y,sample,{dir:o.dir,scale:size,alpha:clamp((o.life-o.age)/12)});
  }else if(o.kind==='pillar-wave'){
   for(let i=0;i<10;i++){const age=o.age-i*5;if(age<0||age>65)continue;const x=o.x+o.dir*(o.owner.width/2+o.spacing*(i+.5));paint(c,'earth-pillar',x,o.y,.34+age/60,{sx:Math.max(.7,o.spacing/70),sy:1.9,alpha:clamp((65-age)/12)});}
  }else if(o.kind==='execution-slash')paint(c,'gold-execution',o.x,o.y,t,{dir:o.dir,pivot:[6,-26],scale:1.5,angle:o.index%2?-.4:.3});
  else if(o.kind==='overhead-stars'){paint(c,'gold-sigil',o.x,o.y-190,t,{scale:1.5});if(o.age>=o.impactAt)paint(c,'seven-stars',o.x,o.y,(o.age-o.impactAt)/60+.28,{scale:1.4});}
  else if(o.kind==='heavy-cleave'){paint(c,'frost-shot',o.x,o.y-75,t,{dir:o.dir,scale:1.8});sword(c,o.x,o.y-75,o.dir*Math.PI/2,145,14);}
  else if(o.kind==='shield-flash')paint(c,'block-hit',o.x,o.y,t,{scale:.8,pivot:[0,-22]});
 }
 // Replace the whole legacy VFX draw chain once. Its update/collision hooks are kept intact.
 Game.prototype.drawCombatV2=function(c){
  if(!this.p1||!this.p2||this.phase==='intro')return;
  for(const f of [this.p1,this.p2]){const v=f===this.p1?this.p2:this.p1;charging(c,f,this);normal(c,f,this);release(c,f);buffs(c,f,v,this);tendrils(c,f,v,this);ultimate(c,f,v,this);}
  for(const p of this.projectiles||[])if(!p.dead)bullet(c,p,this);
  for(const o of this.signatureObjects||[])object(c,o,this);
  for(const o of this.cyberObjects||[])if(o.type==='wuxiang')paint(c,'night-sigil',o.x,o.y,clock(this),{scale:1.5,alpha:.8});
  for(const t of this.hunterTraps||[]){window.evelynFX.trap(c,t);if(t.closed)paint(c,'hunter-ultimate',t.x,t.y-35,(24-t.closed)/60,{scale:1.1,pivot:[6,-26]});}
  // The wolf is a companion, so keep its animation without the old dashed targeting lines.
  for(const f of [this.p1,this.p2])if(f.charId==='liequan'){const i=f.state==='walk'?1+Math.floor(f.stateTimer*.18)%6:f.state==='super'?4+Math.floor(f.stateTimer*.2)%4:0,im=wolf[i];if(im?.naturalWidth){c.save();c.translate(f.x-f.facing*72,f.y);c.scale(f.facing,1);c.drawImage(im,-65,-70,130,80);c.restore();}}
 };
 const wolf=Array.from({length:10},(_,i)=>window.gameAssets.loadImage('assets/chars/cyber-v1/liequan/wolf/'+String(i).padStart(2,'0')+'.png?v='+ASSET_VER));
 Game.prototype.drawProjectiles=function(){}; // All projectile silhouettes are drawn above.
 Game.prototype.drawSparks=function(){for(const s of this.sparks||[])if(s.formSwitch)paint(this.ctx,'jade-sigil',s.x,s.y,(20-s.life)/60,{scale:1.5,alpha:clamp(s.life/8)});else paint(this.ctx,s.blocked?'block-hit':'hit',s.x,s.y,(12-s.life)/60,{scale:.8,pivot:[0,s.blocked?-30:-22]});};
 const update=Game.prototype.updateCombatV2;
 Game.prototype.updateCombatV2=function(){update.call(this);this._pixelFXTick=(this._pixelFXTick||0)+1;this.sparks=(this.sparks||[]).filter(s=>--s.life>0);};
 // A LAN guest receives combat snapshots instead of running updateCombatV2.
 // Advance only its cosmetic clock locally; never simulate skill damage on that peer.
 function guestClock(g,before){if(g._pixelFXTick===before&&g.mode==='lan-guest'&&g.phase==='fight'&&!window.gameAssets.blocked&&!(g.superFreeze?.left>0)){g._pixelFXTick=(g._pixelFXTick||0)+1;g.sparks=(g.sparks||[]).filter(s=>--s.life>0);}}
 function withGuestClock(update){return function(...args){const before=this._pixelFXTick,result=update.apply(this,args);guestClock(this,before);return result;};}
 Game.prototype.update=withGuestClock(Game.prototype.update);
 // The existing game/audio bootstrap can retain a bound instance update from before this module.
 // Wrap that instance too; the before check prevents double advancement through nested wrappers.
 if(window.game&&Object.prototype.hasOwnProperty.call(window.game,'update'))window.game.update=withGuestClock(window.game.update);
 for(const name of ['startRound','resetNoblePractice']){const reset=Game.prototype[name];if(reset)Game.prototype[name]=function(...args){this._pixelFXTick=0;return reset.apply(this,args);};}
 Fighter.prototype._drawNobleEffects=function(){};
 Fighter.prototype._drawChargeAura=function(){};
 window.pixelFX={manifest,roles,paint,role,normal,bullet,object,portal,images};
})();
