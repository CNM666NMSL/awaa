import * as THREE from './vendor/three.module.js';
// Distinct visual languages: seven-point ceremonial seals, water / greatsword, cathedral wards.
export class CharacterMagic {
 constructor(){this.previous=new WeakMap();}
 mesh(fx,points,indices,x,y,dir,color,life=.4,opacity=.8){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);const mat=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});const mesh=new THREE.Mesh(geo,mat);fx.add(mesh,x,y,dir,life);return fx.events.at(-1);}
 segments(fx,lines,x,y,dir,color,life=.5,width=1.5,opacity=.8){const p=[],ix=[];for(const [ax,ay,bx,by]of lines){const l=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/l*width/2,ny=(bx-ax)/l*width/2,k=p.length/3;p.push(ax+nx,ay+ny,0,ax-nx,ay-ny,0,bx-nx,by-ny,0,bx+nx,by+ny,0);ix.push(k,k+1,k+2,k,k+2,k+3);}return this.mesh(fx,p,ix,x,y,dir,color,life,opacity);}
 sealLines(r,rotation=0,flat=1){const lines=[],polar=(a,radius)=>[Math.cos(a)*radius,Math.sin(a)*radius*flat],add=(a,b)=>lines.push([...a,...b]);for(const radius of [r,r*.89,r*.64])for(let j=0;j<70;j++)add(polar(j/70*Math.PI*2,radius),polar((j+1)/70*Math.PI*2,radius));const vertices=Array.from({length:7},(_,i)=>polar(rotation-Math.PI/2+i*Math.PI*2/7,r*.8));for(let i=0;i<7;i++){add(vertices[i],vertices[(i+3)%7]);const a=rotation-Math.PI/2+i*Math.PI*2/7;add(polar(a,r*.95),polar(a,r*1.08));}for(let i=0;i<28;i++){const a=i*Math.PI*2/28+rotation;add(polar(a,r*.9),polar(a,r*(i%4? .94:1)));}return lines;}
 seven(fx,x,y,r,flat=1,rotation=0,power=1){this.segments(fx,this.sealLines(r,rotation,flat),x,y,1,0xffdc87,.45,1.2*power,.78);const e=fx.events.at(-1);e.mesh.rotation.z=0;for(let i=0;i<7;i++){const a=rotation-Math.PI/2+i*Math.PI*2/7;fx.ribbon(x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8*flat,1,3*power,3*power,0,Math.PI*2,2,.42,0,0xfff0bc);}}
 wardLines(r){const lines=[],add=(a,b)=>lines.push([...a,...b]);for(const radius of [r,r*.85])for(let i=0;i<64;i++){const a=i*Math.PI/32,b=(i+1)*Math.PI/32;add([Math.cos(a)*radius,Math.sin(a)*radius],[Math.cos(b)*radius,Math.sin(b)*radius]);}const shield=[[-r*.52,-r*.58],[r*.52,-r*.58],[r*.5,r*.12],[0,r*.67],[-r*.5,r*.12]];for(let i=0;i<5;i++)add(shield[i],shield[(i+1)%5]);add([0,-r*.42],[0,r*.36]);add([-r*.3,-r*.13],[r*.3,-r*.13]);for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*r*.93,y=Math.sin(a)*r*.93;add([x-4,y],[x+4,y]);add([x,y-6],[x,y+6]);}return lines;}
 ward(fx,x,y,r,power=1){this.segments(fx,this.wardLines(r),x,y,1,0xa8e6ff,.5,1.5*power,.85);fx.ribbon(x,y,1,r*.75,r*.75,-Math.PI,Math.PI,2,.5,0,0xf7e5ad);}
 wave(fx,x,y,d,power=1){for(let j=0;j<3;j++){fx.ribbon(x+d*j*20,y-j*3,1,(42+j*24)*power,(8+j*3)*power,-Math.PI,Math.PI,j?2:4,.38+j*.08,j*.025,j%2?0x75b9d2:0xc4efff);const e=fx.events.at(-1);e.base=.48;e.mesh.scale.set(1,1,1);e.vx=d*20;}
 for(let i=0;i<9;i++){const n=(i*29%97)/97,s=2+n*3;const e=this.mesh(fx,[0,-s*2,0,s,s,0,-s,s,0],[0,1,2],x+d*(i*8-22),y-5,1,i%2?0x68b8d8:0xd4f5ff,.35+n*.25,.65);e.vx=d*(40+n*75);e.vy=-(30+n*100);e.gravity=240;}}
 blade(fx,f,power=1,angle=-.12){const length=100*power,w=9*power,tip=length+25;const p=[-18,-3,0,-18,3,0,0,w*.6,0,length,w*.38,0,tip,0,0,length,-w*.38,0,0,-w*.6,0];const e=this.mesh(fx,p,[0,1,2,0,2,6,2,3,4,2,4,6,4,5,6],f.x+f.facing*25,f.y-56,f.facing,0xb9e8ff,.24,.64);e.mesh.rotation.z=angle*f.facing;this.segments(fx,[[0,-w*1.7,0,w*1.7],[0,0,tip,0]],f.x+f.facing*25,f.y-56,f.facing,0xf4fbff,.24,2,.9).mesh.rotation.z=angle*f.facing;}
 emit(fx,f,kind='skill'){
 const superMove=kind==='super',charge=kind==='charge',p=superMove?1.8:charge?.8:1,x=f.x,y=f.y,d=f.facing;
 if(f.charId==='noble'){
  this.seven(fx,x+(charge?0:d*25),y-56,superMove?113:charge?48:45,1,(f.stateTimer||0)*.015,p);
  this.seven(fx,x,y-3,superMove?145:58,.23,0,.8);
  if(superMove)for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI*2/7;const xx=x+d*45+Math.cos(a)*100,yy=y-60+Math.sin(a)*85;this.segments(fx,[[0,-12,0,12],[-8,0,8,0]],xx,yy,1,0xffedb0,.35,2,.95);}
 }else if(f.charId==='jianke'){
  this.wave(fx,x,y-2,d,p);
  if(!charge){const key=f._animForState?.()||'',angle=key==='launcher'?-1.1:key==='low'?.35:-.2;this.blade(fx,f,p,angle);for(let i=0;i<(superMove?5:2);i++)fx.ribbon(x+d*25,y-50,d,(70+i*15)*p,(36+i*7)*p,-1.5,1.4,i?2:8,.25+i*.035,angle+i*.09,i%2?0x6eafd0:0xe1f7ff);}
 }else{
  this.ward(fx,x+(charge?0:d*28),y-65,superMove?108:charge?48:53,p);
  if(superMove){for(let i=0;i<3;i++){const px=x+d*(45+i*63);this.segments(fx,[[0,-145,0,12],[-23,-98,23,-98],[-12,-122,12,-122]],px,y-8,1,i%2?0xd7c18c:0xb9efff,.48,4,.8);}fx.ribbon(x,y-3,d,145,20,-Math.PI,Math.PI,6,.5,0,0x9ce3ff);}
 }
}
 render(fx,game,dt){if(dt<=0)return;fx.maxEvents=matchMedia('(pointer:coarse)').matches?160:240;
 for(const f of [game.p1,game.p2])if(f){const state=f.state,t=f.stateTimer,old=this.previous.get(f)||{},reset=old.state!==state||t<old.t||old.attack!==f.currentAttack,bucket=Math.floor(t/(state==='super'?10:state==='charge'?18:16));let eligible=['skill','parry','block','charge','rangedCharge','super','attack'].includes(state);
 if(state==='attack'&&f.currentAttack){const a=f.curEff();eligible=t>=a.startup&&t<a.startup+a.active;}
 if(eligible&&(reset||bucket!==old.bucket||!old.emitted)){this.emit(fx,f,state==='super'?'super':(state==='charge'||state==='rangedCharge')?'charge':(f.currentCast?.charged||f.currentAttack?.anim==='j4')?'super':'skill');old.emitted=true;}else if(!eligible)old.emitted=false;
 this.previous.set(f,{state,t,bucket,attack:f.currentAttack,emitted:old.emitted});}
 for(const p of game.projectiles||[]){const id=p.owner?.charId||p.fxChar,d=Math.sign(p.vx)||p.fxDir||1;if(id==='noble')this.segments(fx,this.sealLines(16,fx.time*3),p.x,p.y,d,0xffe1a1,.07,1,.8);else if(id==='shouwang')this.segments(fx,[[0,-18,0,18],[-10,-7,10,-7]],p.x,p.y,d,0xd0eeff,.07,2,.8);else if(id==='jianke')fx.ribbon(p.x-12*d,p.y,1,24,9,-Math.PI,Math.PI,2,.08,0,0x91cce6);}
}
 cutscene(ctx,f){ctx.save();ctx.strokeStyle=f.charId==='noble'?'#f5d58488':f.charId==='jianke'?'#9bd5ea88':'#b6e6ff88';ctx.lineWidth=1.6;
 const lines=f.charId==='noble'?this.sealLines(165,-Math.PI/14):f.charId==='shouwang'?this.wardLines(160):[];if(lines.length){ctx.beginPath();for(const [x,y,a,b]of lines){ctx.moveTo(350+x,315+y);ctx.lineTo(350+a,315+b);}ctx.stroke();}else{for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(350,480-i*11,150+i*25,13+i*6,0,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(170,400);ctx.quadraticCurveTo(410,95,550,280);ctx.stroke();}ctx.restore();}
}
window.characterMagic=new CharacterMagic();
