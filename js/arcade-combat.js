/* Arcade finishers, shared bounded Three.js particles, and input-driven CPU opponents. */
(() => {
const g=window.game;
document.getElementById('btn-cpu').onclick=()=>g.openLocalSelect(true);
Game.prototype.readCpuInput=function(){
 const f=this.p2,enemy=this.p1,level=document.getElementById('cpu-level').value;
 const brain=this.cpuBrain||(this.cpuBrain={tick:0,hold:{},cool:0});brain.tick++;brain.cool=Math.max(0,brain.cool-1);
 const delay=level==='easy'?14:level==='hard'?5:9;
 if(brain.tick%delay!==1)return {...brain.hold};
 const distance=Math.abs(enemy.x-f.x),dir=enemy.x<f.x?-1:1,r=Math.random(),input={};
 const ultimate={...f.def.super_,...f.def.super_.forms?.[f.form]},superReach=ultimate.signatureArt==='tracking-meteors'||ultimate.lockOn?CONFIG.canvas.width:ultimate.range;
 const threat=enemy.currentAttack&&['attack','super'].includes(enemy.state)&&distance<enemy.currentAttack.range+(enemy.width+f.width)/2;
 const wave=this.projectiles.some(p=>p.owner===enemy&&Math.abs(p.x-f.x)<160&&Math.abs(p.y-(f.y-f.height/2))<100);
 const defense=level==='easy'?.28:level==='hard'?.8:.55;
 if(f.state==='charge'&&distance>280&&f.meter<100)input.chgHeld=true;
 else if((wave||threat)&&r<defense){if(wave&&f.dashCooldownLeft===0){input.l=dir<0;input.r=dir>0;input.dsh=true;}else{input.d=true;if(r<defense*.3)input.spc=true;}}
 else if(distance<superReach+(f.width+enemy.width)/2&&f.meter>=100&&f.canAct())input.sup=true;
 else if(distance<105){input.l=dir<0;input.r=dir>0;if(!brain.cool){input.atk=true;input.u=r<.22;input.d=r>.8;brain.cool=level==='easy'?30:level==='hard'?15:21;}}
 else if(distance<360&&!brain.cool&&r<.45){input.l=dir<0;input.r=dir>0;input.skl=true;brain.cool=level==='easy'?100:65;}
 else if(distance>330&&f.meter<100&&r<.25)input.chgHeld=true;
 else{input.l=dir<0;input.r=dir>0;input.run=level!=='easy'&&distance>260?dir:0;if(!f.onGround&&distance<170&&!brain.cool){input.atk=true;brain.cool=20;}if(r>.92&&f.onGround)input.jmp=true;}
 brain.hold={l:input.l,r:input.r,d:input.d,run:input.run,chgHeld:input.chgHeld};return input;
};
Game.prototype.beginSuperCinematic=function(){
 this._superSeen ||= new WeakMap();
 for(const [side,f] of [[1,this.p1],[2,this.p2]])if(f?.state==='super'&&(f.superSerial||0)>(this._superSeen.get(f)||0)){
  this._superSeen.set(f,f.superSerial);this.superFreeze={side,id:f.superSerial,left:24,total:24,char:f.charId};
  if(this.roundStartMs!==null)this.roundStartMs+=1000/60;
  if(this.mode==='lan-host')this.broadcastState();return true;
 }return false;
};
Game.prototype.tickSuperFreeze=function(){
 if(!this.superFreeze||this.superFreeze.left<=0)return false;
 this.superFreeze.left--;if(this.roundStartMs!==null)this.roundStartMs+=1000/60;
 if(this.mode==='lan-host')this.broadcastState();return true;
};
const palettes={noble:['#f5d999','#a79bde','七星芒阵 · 终焉七重刺'],jianke:['#c7efff','#4385a3','大剑 · 沧澜断水'],shouwang:['#d0ecff','#658ec0','圣印魔法 · 银铠裁决']};
Game.prototype.drawSuperCinematic=function(ctx){
 const s=this.superFreeze;if(!s||s.left<=0||!['fight','paused'].includes(this.phase))return;
 const f=s.side===1?this.p1:this.p2;if(!f)return;const [gold,tint,oldTitle]=f.def.cyberChinese?[f.def.color,f.def.colorDark,f.def.super_.name]:palettes[f.charId]||palettes.noble;const title=f.currentAttack?.name||f.def.super_.name||oldTitle;
 const progress=1-s.left/s.total;ctx.save();ctx.fillStyle='rgba(5,10,16,.86)';ctx.fillRect(0,0,1200,540);
 const grad=ctx.createLinearGradient(0,110,1200,430);grad.addColorStop(0,tint+'55');grad.addColorStop(.55,'#142322');grad.addColorStop(1,gold+'66');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(0,185);ctx.lineTo(1200,95);ctx.lineTo(1200,400);ctx.lineTo(0,490);ctx.fill();
 ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,185);ctx.lineTo(1200,95);ctx.moveTo(0,490);ctx.lineTo(1200,400);ctx.stroke();
 for(let j=0;j<25;j++){const x=(j*139+progress*250)%1200,y=160+j*12;ctx.strokeStyle=j%3?gold+'55':gold;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+90+j%4*25,y-8);ctx.stroke();}
 window.characterMagic?.cutscene(ctx,f);
 // Draw an enlarged actual super pose, preserving facing and sprite proportions.
 const old={key:f.animKey,frame:f.animFrame,timer:f.animTimer};f.animKey=f.def.anims.super_?'super_':f._animForState();const anim=f.def.anims[f.animKey];f.animFrame=Array.isArray(anim?.phases)?anim.phases[0]:Math.min(2,(anim?.frames||1)-1);if(!Number.isFinite(f.animFrame))f.animFrame=0;
 const img=f._animImg();ctx.save();ctx.translate(350,480);ctx.scale(2.6,2.6);ctx.translate(-f.x,-f.y);if(img)f._drawSprite(ctx,img);else f.draw(ctx);ctx.restore();f.animKey=old.key;f.animFrame=old.frame;f.animTimer=old.timer;
 ctx.fillStyle=gold;ctx.font='bold 24px Georgia';ctx.fillText('AWA  /  SUPER ART',650,210);ctx.font='bold 43px KaiTi, Microsoft YaHei';ctx.fillText(f.name,650,273);ctx.font='27px KaiTi, Microsoft YaHei';ctx.fillText(title,650,326);ctx.fillStyle='#e7e0c9';ctx.font='16px Microsoft YaHei';ctx.fillText('超 必 杀  ·  时 间 凝 结',650,370);
 if(progress<.12){ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(0,0,1200,540);}ctx.restore();
};
window.arcadeParticles={previous:new WeakMap(),render(fx,game,dt){
 if(window.characterMagic)return window.characterMagic.render(fx,game,dt);
 if(dt<=0)return;fx.maxEvents=matchMedia('(pointer:coarse)').matches?160:240;
 for(const f of [game.p1,game.p2])if(f){const t=f.stateTimer,state=f.state,old=this.previous.get(f)||{},reset=old.state!==state||t<old.t||old.attack!==f.currentAttack;
 if(state==='super'&&f.currentAttack?.signatureArt)continue;const superMove=state==='super',charge=state==='charge',active=['attack','skill','parry'].includes(state);
 const bucket=Math.floor(t/(superMove?5:charge?9:12));
 if((superMove||charge||active)&&(reset||bucket!==old.bucket)){
 const power=superMove?2.5:charge?.7:1,count=superMove?18:charge?7:7;
 const colors=f.charId==='noble'?[0xffe3a3,0xd8b9ff]:f.charId==='jianke'?[0xf5efff,0xaba6d5]:[0xa1ffdf,0x36b4d2];
 for(let i=0;i<count;i++){
  const a=(i/count*Math.PI*2)+t*.13,n=(i*37%101)/100;
  let x=f.x+Math.cos(a)*(charge?45:22),y=f.y-52+Math.sin(a)*(charge?64:30);
  if(f.charId==='noble'){
   if(superMove){x+=f.facing*(25+n*200);y-=n*90;}
   fx.streak(x,y,f.facing,(superMove?40:12)+n*20,a);
   const e=fx.events.at(-1);e.mesh.material.color.setHex(colors[i%2]);e.vx=Math.cos(a)*90*power;e.vy=charge?35:-40-n*80;e.life=charge?.35:.3+n*.2;
   if(i%3===0){fx.streak(x,y,1,8,a+Math.PI/2);fx.events.at(-1).mesh.material.color.setHex(colors[0]);}
  }else if(f.charId==='jianke'){
   fx.ribbon(x+f.facing*(superMove?n*110:0),y,f.facing,(30+n*30)*power,(12+n*18)*power,-2.4+n,.8+n,superMove?5:2,.22+n*.2,t*.09,colors[i%2]);
   const e=fx.events.at(-1);e.vx=charge?-Math.cos(a)*80:f.facing*(80+n*90);e.vy=charge?-Math.sin(a)*100:-20-n*20;
  }else{
   const angle=Math.floor(a/(Math.PI/3))*Math.PI/3;
   fx.streak(x+f.facing*(superMove?n*150:0),y,1,superMove?32:13,angle);
   const e=fx.events.at(-1);e.mesh.material.color.setHex(colors[i%2]);e.vx=Math.cos(angle)*50*power;e.vy=charge?-30:-65+n*25;e.life=.38;
   if(i%4===0)fx.ribbon(x,f.y-5,f.facing,40*power,9,-Math.PI,Math.PI,3,.3,0,colors[1]);
  }
 }
 if(superMove&&bucket%2===0){fx.dust(f.x+f.facing*45,f.y,f.facing,12,1.6);for(let j=0;j<3;j++)fx.ribbon(f.x+f.facing*60,f.y-45,f.facing,90+j*14,65+j*12,-1.8,1.7,7-j*2,.25+j*.04,t*.06,colors[j%2]);}
 }
 this.previous.set(f,{state,t,bucket,attack:f.currentAttack});
 }
 // Gold starlight replaces the duelist's otherwise plain projectile trail.
 for(const p of game.projectiles||[])if((p.owner?.charId||p.fxChar)==='noble'){const d=Math.sign(p.vx)||p.fxDir||1;for(let j=0;j<3;j++){fx.streak(p.x-d*j*12,p.y+(j-1)*5,d,22-j*4,0);const e=fx.events.at(-1);e.mesh.material.color.setHex(j?0xd8b9ff:0xffe8af);e.life=.08;}}
}};
})();
