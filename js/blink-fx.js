/* Sprite afterimages retain each fighter's identity; portal ribbons use the shared Three.js renderer. */
window.blinkFX={previous:new WeakMap(),draw(game,ctx,f){
 const e=f.blinkEvent;if(!e){this.previous.delete(f);return;}
 const now=performance.now();let p=this.previous.get(f);
 if(!p||p.id!==e.id){p={id:e.id,age:0,last:now,emitted:false};this.previous.set(f,p);}
 const dt=(game.phase==='paused'||game.superFreeze?.left>0)?0:Math.min(.05,(now-p.last)/1000);p.last=now;p.age+=dt;
 if(p.age>.28)return;
 const engine=window.jiankeFX;
 if(engine&&!p.emitted){p.emitted=true;const color=f.charId==='shouwang'?0x9ee9ff:f.charId==='jianke'?0xe5ddff:0xf6e5ad;
 for(const x of [e.fromX,e.toX]){for(let j=0;j<3;j++)engine.ribbon(x,e.y-48,1,12+j*5,55+j*5,-Math.PI,Math.PI,j===0?4:1,.18+j*.035,0,color);for(let i=0;i<7;i++)engine.streak(x+Math.sin(i*2.4)*16,e.y-10-i*12,e.dir,18+i%3*9,Math.PI/2);}
 for(let j=0;j<4;j++)engine.streak(e.fromX+(e.toX-e.fromX)*j/4,e.y-30-j*13,e.dir,40,0);
 }
 // Fading silhouettes at the departure and along the path, with a thin paper-gold flash at arrival.
 for(let j=0;j<3;j++){ctx.save();ctx.globalAlpha=(1-p.age/.28)*(.28-j*.06);ctx.translate(e.fromX+(e.toX-e.fromX)*j/3-f.x,e.y-f.y);f.draw(ctx);ctx.restore();}
 ctx.save();ctx.globalAlpha=Math.max(0,1-p.age/.14)*.8;ctx.strokeStyle='#eee3c4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.toX,e.y-45,10+p.age*60,55,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}};
