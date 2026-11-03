/* One character body per aerial frame. Spectral animals use their own silhouettes, never body ghosts. */
(()=>{
 const paint=(...args)=>window.pixelFX.paint(...args),wolf=Array.from({length:10},(_,i)=>window.gameAssets.loadImage('assets/chars/cyber-v1/liequan/wolf/'+String(i).padStart(2,'0')+'.png?v='+ASSET_VER)),heads=window.airHunterAssets.head.map(src=>window.gameAssets.loadImage(src)),tints=new WeakMap();
 function tint(im){let out=tints.get(im);if(!out&&im.naturalWidth){out=document.createElement('canvas');out.width=im.naturalWidth;out.height=im.naturalHeight;const c=out.getContext('2d');c.drawImage(im,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#92dbff';c.fillRect(0,0,out.width,out.height);tints.set(im,out);}return out;}
 function flames(c,x,y,r,t,n=12){c.save();for(let i=0;i<n;i++){const q=(t*1.5+i*.618)%1,xx=x+(i/(n-1)-.5)*r,yy=y-Math.sin(i*2.4)*7;c.globalAlpha=(1-q)*.7;c.fillStyle=i%3?'#439eff':'#a7efff';c.beginPath();c.moveTo(xx-4,yy);c.quadraticCurveTo(xx-9,yy-10-q*22,xx+Math.sin(t*5+i)*8,yy-22-q*35);c.quadraticCurveTo(xx+11,yy-8,xx+4,yy);c.fill();}c.restore();}
 function dog(c,p,time){const n=p.chargeLevel||1,size=[0,1,1.5,1.8][n],im=wolf[4+Math.floor(time*25)%6],dir=Math.sign(p.vx)||p.fxDir||1;if(!im?.naturalWidth)return;const x=p.x,y=p.y+(p.hitHeight||54)/2,w=120*size,h=80*size;c.save();c.translate(x,y);c.scale(dir,1);if(n>=2)flames(c,0,-h*.65,w,time,15);c.globalAlpha=n===3?.6:1;c.drawImage(im,-w*.5,-h,w,h);if(n>=2){const blue=tint(im);if(blue){c.globalAlpha=n===3?.55:.3;c.drawImage(blue,-w*.5,-h,w,h);}}c.restore();}
 function shield(c,f,time){c.save();c.translate(f.x,f.y+8);c.scale(1,.43);c.fillStyle='#83e4e633';c.strokeStyle='#c5f8ef';c.lineWidth=2;c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*47,y=Math.sin(a)*47;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();c.strokeStyle='#57c9a8';c.beginPath();c.arc(0,0,34,0,Math.PI*2);c.stroke();c.restore();paint(c,'jade-sigil',f.x,f.y+4,time,{scale:.9,alpha:.7});}
 const draw=Game.prototype.drawCombatV2;
 Game.prototype.drawCombatV2=function(c){draw.call(this,c);if(!this.p1||!this.p2||this.phase==='intro')return;const time=(this._pixelFXTick||0)/60;
  for(const f of [this.p1,this.p2]){
   const a=f.airRush,v=f===this.p1?this.p2:this.p1;
   if(a){
    if(a.sword&&!a.sword.hit){window.signatureFX.sword(c,a.sword.x,a.sword.y,Math.PI,65,5,'#dcf6ff');paint(c,'frost-shot',a.sword.x,a.sword.y,time,{angle:Math.PI/2,scale:.5});}
    if(a.kind==='noble')paint(c,'gold-sigil',f.x,f.y+10,time,{scale:1.1,alpha:.85});
    if(a.kind==='armored'||a.kind==='unarmored')shield(c,f,time);
    if(a.kind==='motong'&&a.snared&&v.airSnare){for(let i=0;i<2;i++)window.evelynFX.arm(c,f.x+(i?8:-8),f.y-f.height*.5,v.x-f.x+(i?14:-14),v.y-v.height*.45-f.y+f.height*.5,time*10+i*15,8,16);}
    if(a.landed)paint(c,f.charId==='noble'?'gold-execution':f.charId==='shouwang'?'jade-shock':'hit',f.x,f.y,(a.landed-1)/60,{scale:1.1,pivot:[0,-22],alpha:1-a.landed/9});
   }
   if(f.hunterSuper){const u=f.hunterSuper;if(u.age>=18){const im=heads[Math.floor((u.age-18)*40/60)%heads.length];if(im?.naturalWidth){const fade=Math.min(1,(u.age-18)/6,(96-u.age)/15);c.save();c.globalAlpha=fade*.8;c.translate(u.x,u.y);c.scale(u.dir,1);c.drawImage(im,-120,-100,240,200);c.restore();}flames(c,u.x-u.dir*65,u.y+10,115,time,18);}}
   if(f.hunterTrap){const s=f.hunterTrap;window.evelynFX.trap(c,{x:f.x,y:f.y,radius:f.width*.7,closed:24});if(s.kind==='slow')paint(c,'hunter-sigil',f.x,f.y,time,{scale:.55,alpha:.5});}
   if(f.hunterBurn)flames(c,f.x,f.y-4,f.width*1.1,time,8);
  }
  for(const p of this.projectiles||[])if(p.kind==='hunter-wolf')dog(c,p,time);
 };
 const hud=Game.prototype.updateHUD;
 Game.prototype.updateHUD=function(...args){hud.apply(this,args);const f=this.mode==='lan-guest'?this.p2:this.p1,b=document.querySelector('.touch-actions [data-action=attack]');if(b){const follow=f?.hunterFollowup?.left>0;b.classList.toggle('hunter-followup',!!follow);b.querySelector('.control-label').textContent=follow?'追加夹子':'普攻';}};
 const rows=Game.prototype.nobleMoveRows;
 if(rows)Game.prototype.nobleMoveRows=function(){const all=rows.call(this);if(this.p1?.charId!=='liequan')return all;const d=this.p1.def;return[
  ...d.combo.map((a,i)=>['j'+(i+1),a.name,a]),['airAttack','空中J：下冲破防；命中后再按J追加束缚夹（3秒）',d.airAttack],['u','U：普通猎犬扑咬',d.skill],['uStage2','U蓄力1秒：苍焰巨犬',{...d.skill,damage:105}],['uCharged','U蓄力2.5秒：幽灵狼；命中后J追加减速夹（3秒）',{...d.skill,damage:156}],['super_','I：苍焰幽狼头影（7身位 / 380伤害 / 未格挡灼烧10秒）',{...d.super_,cost:100}],['special','O：原捕兽夹特殊技，消耗3层',{cost:3,damage:450}]
 ];};
 window.airHunterFX={dog,flames,heads};
})();
