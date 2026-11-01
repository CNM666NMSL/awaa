/* Readable silver umbrella edges, five-round HUD, drifting mist and warm explosive gunfire. */
(()=>{
 const is=f=>f?.charId==='wuxiang',K=window.umbraKit,paint=(...a)=>window.pixelFX.paint(...a);
 const alpha=n=>Math.max(0,Math.min(1,n));
 function fog(c,x,y,w,h,t,strength=1){
  c.save();
  for(let i=0;i<5;i++){const xx=x+Math.sin(t*.25+i*2.4)*w*.13,yy=y-h*.12-i*h*.16;
   c.save();c.translate(xx,yy);c.scale(1,h/w*.65);const g=c.createRadialGradient(0,0,2,0,0,w*.58);g.addColorStop(0,`rgba(177,204,216,${.075*strength})`);g.addColorStop(.5,`rgba(104,139,161,${.07*strength})`);g.addColorStop(1,'rgba(69,97,121,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,w*.65,0,Math.PI*2);c.fill();c.restore();
  }c.restore();
 }
 function explosion(c,o){const t=o.age/60,q=alpha(1-o.age/o.life);c.save();c.globalAlpha*=q;paint(c,'shotgun',o.x,o.y,t,{scale:1.7,pivot:[0,-26],angle:-.3});paint(c,'hit',o.x,o.y,t,{scale:1.8,pivot:[0,-22]});for(let i=0;i<24;i++){const a=i*2.399,r=(12+t*140)*(1+i%3*.2),x=o.x+Math.cos(a)*r,y=o.y+Math.sin(a)*r+t*t*100;c.fillStyle=i%3?'#ffc078':'#fff4cc';c.fillRect(x,y,2+i%2,2+i%2);}c.restore();}
 const draw=Game.prototype.drawCombatV2;
 Game.prototype.drawCombatV2=function(c){
  draw.call(this,c);if(!this.p1||!this.p2||this.phase==='intro')return;const time=(this._pixelFXTick||0)/60;
  if(this.nightWeather?.left>0){fog(c,600,CONFIG.canvas.groundY+10,1100,260,time,1.2);c.save();c.strokeStyle='#c0ddea55';c.lineWidth=1;for(let i=0;i<70;i++){const x=(i*137.1-time*32+2400)%1200,y=(i*61.4+time*340)%540;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+11);c.stroke();}c.restore();}
  for(const w of this.nightWalls||[]){
   fog(c,w.x,w.y,95,175,time,3.6);c.save();c.globalAlpha=alpha(w.age/12)*.16;c.strokeStyle='#a4c9da';c.lineWidth=1;
   for(let i=0;i<6;i++){c.beginPath();for(let j=0;j<15;j++){const yy=w.y-j*11,xx=w.x+Math.sin(j*.5+time+i)*10+(i-2.5)*7;j?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();}
   for(let i=0;i<w.charges;i++){c.fillStyle='#d2eaf4';c.fillRect(w.x-11+i*9,w.y-168,5,3);}c.restore();
  }
  for(const p of this.projectiles||[])if(p.nightBullet){const scale=p.explosive?.95:.7;paint(c,'night-shot',p.x,p.y,time,{scale,angle:p.shotAngle??(p.fxDir===-1?Math.PI:0)});if(p.explosive){c.save();c.strokeStyle='#ffbd69';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,6,0,Math.PI*2);c.stroke();c.restore();}}
  for(const f of [this.p1,this.p2])if(is(f)){
   const s=window.umbraCombat.ws(f),a=f.currentAttack;
   // The open umbrella is in front of its pinned target, regardless of P1/P2 draw order.
   if(s.super?.latched){const im=f._animImg();if(im)f._drawSprite(c,im);}
   if(s.flash)paint(c,'muzzle',s.flash.x,s.flash.y,s.flash.age/60,{scale:.9,angle:s.flash.angle,pivot:[0,-26]});
   if(f.state==='attack'&&a&&!a.wsGun){const age=f.stateTimer-f.atkDur(a,'startup');if(age>=0&&age<24)paint(c,'wuxiang-normal',f.x+f.facing*45,f.y-(a.wsDive?0:f.height*.5),age/60,{dir:f.facing,pivot:[6,-26],scale:a.wsSlide?1.2:.9,angle:a.wsDive?Math.PI/2:0});}
   if(f.state==='block'){c.save();c.globalAlpha=.2;c.strokeStyle='#c5e7f2';c.lineWidth=1;c.beginPath();c.ellipse(f.x+f.facing*32,f.y-f.height*.57,17,48,0,-1.4,1.4);c.stroke();c.restore();}
   if(s.super){paint(c,'night-sigil',f.x,f.y,time,{scale:1.2,alpha:.6});if(s.super.latched){const v=f===this.p1?this.p2:this.p1;paint(c,'block-hit',v.x,v.y-v.height*.55,(s.super.age%20)/60,{scale:.5,pivot:[0,-30]});}}
  }
  for(const o of this.nightFX||[]){if(o.kind==='explosion')explosion(c,o);else if(o.kind==='mist-hit')fog(c,o.x,o.y+20,95,100,time,4*alpha(1-o.age/o.life));else paint(c,o.kind==='landing'?'hit':'block-hit',o.x,o.y,o.age/60,{scale:o.kind==='umbrella-hit'?1.1:.7,pivot:[0,-22]});}
 };
 // The body keeps its original gait below the waist during mobile firing and reloading.
 const sprite=Fighter.prototype._drawSprite;
 Fighter.prototype._drawSprite=function(c,img){
  const s=this.umbra,mobile=is(this)&&this.onGround&&s?.dir&&((this.state==='skill'&&this.currentCast?.ws)||s.reload>0&&['idle','walk'].includes(this.state));
  if(!mobile)return sprite.call(this,c,img);
  const old={key:this.animKey,frame:this.animFrame},cut=this.y-this.height*.34;
  c.save();c.beginPath();c.rect(this.x-400,this.y-600,800,600-this.height*.34);c.clip();sprite.call(this,c,img);c.restore();
  this.animKey='walk';this.animFrame=Math.floor((window.game._pixelFXTick||0)*24/60)%10;const legs=this._animImg();
  if(legs){c.save();c.beginPath();c.rect(this.x-200,cut,400,this.height*.4+20);c.clip();sprite.call(this,c,legs);c.restore();}
  this.animKey=old.key;this.animFrame=old.frame;
 };
 const hud=Game.prototype.updateHUD;
 Game.prototype.updateHUD=function(...args){hud.apply(this,args);if(!this.p1||!this.p2)return;
  for(const [id,f]of [['p1',this.p1],['p2',this.p2]]){
   const bar=document.getElementById(id+'-meter');bar.classList.toggle('night-meter',is(f));bar.title=is(f)?'司夜：W+I 100 / S+I 200 / I 300':'气';
   let box=document.getElementById(id+'-ammo');if(!box){box=document.createElement('div');box.id=id+'-ammo';box.className='night-ammo';bar.parentElement.after(box);}box.hidden=!is(f);
   if(is(f)){const s=window.umbraCombat.ws(f),text=s.reload?'换弹 '+(s.reload/60).toFixed(1)+'s':'左轮 '+s.ammo+'/5 · 第五发爆裂';if(box.dataset.state!==text){box.dataset.state=text;box.innerHTML=Array.from({length:5},(_,i)=>'<i class="'+(i<s.ammo?'loaded ':'')+(i===4?'final':'')+'"></i>').join('')+'<span>'+text+'</span>';}}
  }
  const meter=document.getElementById('practice-meter');if(meter&&meter.dataset.night!==String(is(this.p1))){const night=is(this.p1);meter.dataset.night=String(night);meter.replaceChildren(...(night?[300,200,100,50,0]:[100,50,0]).map(n=>{const option=document.createElement('option');option.value=n;option.textContent=n+(n===(night?300:100)?' · 满气':'');return option;}));}
  const night=is(this.p1);for(const [action,text]of Object.entries({skill:night?'左轮 · 第5发爆裂':'长按蓄力 U/4',jump:night?'二段跳长按开伞':'K / 2',super_:night?'I / ↑I / ↓I':'I / 5'})){const small=document.querySelector('.touch-actions [data-action="'+action+'"] small');if(small&&small.textContent!==text)small.textContent=text;}
  const help=document.querySelector('#noble-practice > .practice-help');if(help){help.dataset.original||=help.textContent;const text=night?'J 伞术四连 · S+J 横扫击倒 · 二段跳后按住K开伞滑翔 · 空中J伞尖坠刺 · U 移动左轮 / 空中向下射击 · 第5发爆裂并自动换弹 · S+U 雾墙 · I 300气伞锁连射 / S+I 200气雾雨 / W+I 100气挑伞弹飞 · P 攒气。':help.dataset.original;if(help.textContent!==text)help.textContent=text;}
 };
 const rows=Game.prototype.nobleMoveRows;
 if(rows)Game.prototype.nobleMoveRows=function(){if(!is(this.p1))return rows.call(this);const d=this.p1.def;return[
  ...d.combo.map((a,i)=>['j'+(i+1),a.name,a]),['low','S+J：横扫击倒',d.low],['airAttack','空中J：伞尖坠刺；二段跳长按K开伞滑翔',d.airAttack],['u','U：移动射击；第五发爆裂并换弹',d.skill],['airRanged','空中U：向下射击 / 后坐力滞空',d.skill],['nightWall','S+U：雾墙挡3次远攻、触发敌方捕兽夹',{cost:0}],['night300','I 300：瞬身伞锁连射',{...d.nightSupers.execution,cost:300,damage:600}],['night200','S+I 200：8秒雾雨 / 敌减速30% / 自身加速25%',{cost:200,damage:0}],['night100','W+I 100：挑飞再开伞弹飞',{...d.nightSupers.burst,cost:100,damage:200}],['special','O：镜域特殊技，消耗3层',{cost:3}]
 ];};
 const demo=Game.prototype.demonstrateNobleMove;
 if(demo)Game.prototype.demonstrateNobleMove=function(key){if(!is(this.p1)||!['nightWall','night300','night200','night100'].includes(key))return demo.call(this,key);this.resetNoblePractice();this.p1.x=440;this.p2.x=600;this.p1.meter=300;if(key==='nightWall')this.p1.nightWall();else this.p1.nightSuper(key==='night300'?'execution':key==='night200'?'rain':'burst');};
 const strip=Game.prototype.renderControlsStrip;
 Game.prototype.renderControlsStrip=function(...args){strip?.apply(this,args);for(const [id,f]of [['p1',this.p1],['p2',this.p2]])if(is(f)){const el=document.getElementById(id+'-controls');if(el)el.textContent=id==='p1'?'J 伞术4连 · K 二段跳长按滑翔 · U 左轮 · S+U 雾墙 · I 300 / S+I 200 / W+I 100':'1 伞术4连 · 2 长按滑翔 · 4 左轮 · ↓+4 雾墙 · 5 300 / ↓+5 200 / ↑+5 100';}};
 window.gameAssets.ready.then(()=>{const rain=window.rainWeather;if(rain){const enabled=rain.enabled;rain.enabled=function(g){return !!g.nightWeather?.left||enabled.call(this,g);};}});
})();
