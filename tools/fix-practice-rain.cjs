const fs=require('fs');const p='js/rain-weather.js';let s=fs.readFileSync(p,'utf8');
s=s.replace("this.drops=Array.from({length:260},(_,i)=>({x:(i*193.17)%1240,y:(i*47.61)%560,speed:310+(i%7)*35,length:9+i%12}));",'this.drops=this.makeDrops();');
const at=s.indexOf(' enabled(g)');s=s.slice(0,at)+` // Stratified independent jitter covers the viewport without diagonal start-up bands.
 makeDrops(){let seed=0x56ac19;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};return Array.from({length:360},(_,i)=>({x:-20+(i%24+random())*1240/24,y:-40+(Math.floor(i/24)+random())*620/15,speed:290+random()*200,length:7+random()*10}));}
 view(g){const w=CONFIG.canvas.width||1200,h=CONFIG.canvas.height||540;if(g.mode!=='practice'||!g.p1||!g.p2)return {scale:1,x:0,y:0};const scale=Math.max(1,Math.min(1.65,w*.7/Math.max(1,Math.abs(g.p1.x-g.p2.x))));return {scale,x:w/2-(g.p1.x+g.p2.x)/2*scale,y:h*.84-CONFIG.canvas.groundY*scale};}
 project(view,x,y){return {x:x*view.scale+view.x,y:y*view.scale+view.y};}
`+s.slice(at);
let a=s.indexOf(' for(const f of [g.p1,g.p2])'),b=s.indexOf(' for(const s of this.splashes)',a);
s=s.slice(0,a)+` const view=this.view(g),actors=[g.p1,g.p2].filter(Boolean),ground=this.project(view,0,CONFIG.canvas.groundY).y;
 for(const f of actors){const prev=this.actors.get(f)||{x:f.x,y:f.y,onGround:f.onGround,frame:-1};const walk=f.state==='walk'&&f.onGround,feet=this.project(view,f.x-f.facing*10,f.y),head=this.project(view,f.x,f.y-f.height+8);const frames=f.def?.anims?.walk?.frames,half=typeof frames==='number'?Math.floor(frames/2):4;
 if(walk&&f.animFrame!==prev.frame&&[0,half].includes(f.animFrame))this.splash(feet.x,feet.y,8,view.scale);
 if(f.onGround&&!prev.onGround)this.splash(feet.x,feet.y,14,1.5*view.scale);
 if(Math.floor(this.time*7)!==prev.drip){this.splash(head.x+Math.sin(this.time*19)*f.width*.45*view.scale,head.y,2,.25*view.scale);prev.drip=Math.floor(this.time*7);}Object.assign(prev,{x:f.x,y:f.y,onGround:f.onGround,frame:f.animFrame});this.actors.set(f,prev);}
 for(const r of this.drops){const oldY=r.y;r.x-=dt*r.speed*.14;r.y+=dt*r.speed;
 for(const f of actors){const head=this.project(view,f.x,f.y-f.height+8);if(oldY<head.y&&r.y>=head.y&&Math.abs(r.x-head.x)<f.width*.65*view.scale){this.splash(r.x,head.y,3,.45*view.scale);r.y-=620;r.x=-20+Math.random()*1240;break;}}
 // Continue through the viewport boundary; do not shift every drop into repeating columns.
 if(r.y>580){r.y-=620;if(r.x>=0&&r.x<1200&&Math.random()<.12)this.splash(r.x,Math.min(535,ground+Math.random()*55),2,.3);}
 if(r.x< -20)r.x+=1240;else if(r.x>1220)r.x-=1240;}
`+s.slice(b);
s=s.replace('const phase=(this.time*1.4+i*.618)%1,x=(i*137.3)%1200,y=CONFIG.canvas.groundY+5+(i*17.7)%55,rx=', 'const phase=(this.time*1.4+i*.618)%1,x=(i*137.3)%1200,y=Math.min(535,this.project(this.view(g),0,CONFIG.canvas.groundY).y+5+(i*17.7)%55),rx=');
fs.writeFileSync(p,s);
