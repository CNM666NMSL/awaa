/* Weapon properties, restrained particles and steady blocking silhouettes. */
(()=>{
 function polygon(c,x,y,rx,ry,n){c.beginPath();for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const xx=x+Math.cos(a)*rx,yy=y+Math.sin(a)*ry;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();}
 function draw(c,f,g){
  if(!f.def.weaponGuard)return false;
  const t=(g._pixelFXTick||0)/60,h=f.height;
  c.save();c.translate(f.x,f.y);c.scale(f.facing,1);c.lineWidth=1.2;
  if(f.charId==='noble'){
   c.strokeStyle='#ffe2a2';c.globalAlpha=.65;c.beginPath();c.ellipse(30,-h*.58,17,38,-.2,-1.45,1.45);c.stroke();
   for(let i=0;i<4;i++){const p=(t*.25+i*.25)%1;c.fillStyle='#fff0c7';c.globalAlpha=Math.sin(p*Math.PI)*.65;c.fillRect(30+Math.sin(i*2.4)*13,-h*.35-p*55,1.5,1.5);}
  }else if(f.charId==='jianke'){
   c.strokeStyle='#c7edf3';c.globalAlpha=.62;c.beginPath();c.moveTo(-13,-h*.58);c.lineTo(53,-h*.58);c.stroke();
   for(let i=0;i<5;i++){const p=(t*.2+i*.2)%1;c.fillStyle='#e1f8ff';c.globalAlpha=(1-p)*.55;c.fillRect(-10+i*13,-h*.6-p*9,1,2);}
  }else if(f.charId==='shouwang'&&f.form!=='unarmored'){
   c.strokeStyle='#b3edda';c.globalAlpha=.5;c.lineWidth=2;c.beginPath();c.moveTo(22,-h*.2);c.lineTo(22,-h*.91);c.stroke();
   for(let i=0;i<3;i++){c.strokeStyle='#d9e7cf';polygon(c,22,-h*(.35+i*.18),4,7,4);c.stroke();}
  }else if(f.charId==='shouwang'){
   c.fillStyle='#396c6240';c.strokeStyle='#a0e4c1';polygon(c,42,-h*.52,21,43,6);c.fill();c.stroke();c.globalAlpha=.55;polygon(c,42,-h*.52,15,33,6);c.stroke();c.beginPath();c.moveTo(42,-h*.8);c.lineTo(42,-h*.25);c.moveTo(30,-h*.52);c.lineTo(54,-h*.52);c.stroke();
   for(let i=0;i<5;i++){const p=(t*.18+i*.2)%1;c.fillStyle='#c6ffe3';c.globalAlpha=(1-p)*.5;c.fillRect(42+Math.sin(i*2.4)*15,-h*.2-p*h*.6,1.5,1.5);}
  }else if(f.charId==='motong'){
   for(let i=0;i<8;i++){const p=(t*.14+i*.125)%1;c.fillStyle=i%3?'#0a1011':'#883b4b';c.globalAlpha=Math.sin(p*Math.PI)*.7;const x=22+Math.sin(i*2.4)*16,y=-h*.15-p*h*.7;polygon(c,x,y,1.3,2.8,4);c.fill();}
  }else if(f.charId==='liequan'){
   c.strokeStyle='#e0b286';c.globalAlpha=.5;for(let i=0;i<3;i++){const x=5+i*13,y=-h*.57;polygon(c,x,y,2.5,4,4);c.stroke();}
  }
  c.restore();return true;
 }
 window.weaponGuards={draw};
})();
