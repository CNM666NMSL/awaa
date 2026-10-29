/* Ranged VFX in world coordinates: frost iaijutsu, arcane energy, golden rapier. */
(() => {
    const profile=f=>({...f.def.skill,...f.def.skill.forms?.[f.form]});
    const level=f=>{let n=1;for(const t of (f.def.skill.chargeThresholds||[]).slice(1))if((f.rangedChargeFrames||0)>=t)n++;return n;};
    function circle(ctx,x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
    function orb(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,1,x,y,r*1.6);g.addColorStop(0,'#f0ffe9');g.addColorStop(.28,color);g.addColorStop(1,'#47dc8000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.6,0,Math.PI*2);ctx.fill();circle(ctx,x,y,r,color,.8);}
    function runes(ctx,x,y,r,color,t,amount=1){ctx.save();ctx.translate(x,y);ctx.scale(1,.24);ctx.rotate(t*.004);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha*=amount;circle(ctx,0,0,r,color);circle(ctx,0,0,r*.78,color);for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.52,Math.sin(a)*r*.52);ctx.lineTo(Math.cos(a+.35)*r*.78,Math.sin(a+.35)*r*.78);ctx.lineTo(Math.cos(a+.6)*r*.52,Math.sin(a+.6)*r*.52);ctx.stroke();}ctx.restore();}
    function motes(ctx,x,y,r,color,t,count,petals=false){ctx.fillStyle=color;for(let i=0;i<count;i++){const a=t*.022+i*2.399,dist=r*(.45+(i%5)*.12),xx=x+Math.cos(a)*dist,yy=y+Math.sin(a)*dist*.65;ctx.save();ctx.translate(xx,yy);ctx.rotate(a);ctx.globalAlpha*=.45+.4*Math.sin(i+t*.035)**2;ctx.beginPath();ctx.ellipse(0,0,petals?3:1.8,petals?1.2:1.8,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
    function rubble(ctx,f,t,n,lift){ctx.fillStyle='#726e61';for(let i=0;i<n;i++){const x=f.x+Math.cos(i*2.399)*(18+i*3),y=f.y-4-lift*(.55+.45*Math.sin(t*.025+i)**2);ctx.save();ctx.translate(x,y);ctx.rotate(i+t*.01);ctx.beginPath();ctx.moveTo(-3,-2);ctx.lineTo(2,-3);ctx.lineTo(4,1);ctx.lineTo(-1,3);ctx.closePath();ctx.fill();ctx.restore();}}
    function actor(ctx,f){
        if(!f?.def.rangedArt)return;
        const charging=f.state==='rangedCharge',releasing=f.state==='skill'&&f.currentCast?.rangedArt;
        if(!charging&&!releasing)return;
        const s=releasing?f.currentCast:profile(f),n=charging?level(f):s.chargeLevel||1,t=f.stateTimer,d=f.facing,color=s.projectileColor;
        const age=releasing?t-s.startup:-1;
        if(releasing&&(age<0||age>18))return;
        ctx.save();ctx.shadowColor=color;ctx.shadowBlur=charging?5+n*2:12;ctx.strokeStyle=color;ctx.fillStyle=color;
        const x=f.x+d*(charging?20+n*7:s.projX),y=f.y-f.height*(s.projectileKind==='arcane-shock'?(charging?[0,.22,.55,1.02][n]:s.projY):s.projY);
        if(releasing){
            ctx.globalAlpha=Math.max(0,1-age/19);
            if(s.projectileKind==='frost-wave'){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x-d*14,y+13);ctx.quadraticCurveTo(x+d*20,y-20,x+d*56,y);ctx.stroke();motes(ctx,x,y,28,color,t,8);}
            else if(s.projectileKind==='golden-lance'){circle(ctx,x-d*12,y,28+age*.7,color);motes(ctx,x,y,38,color,t,10,true);}
            else{orb(ctx,x,y,Math.max(3,13+n*2-age*.6),color);motes(ctx,x,y,22+age,color,t,12);}
            ctx.restore();return;
        }
        if(s.projectileKind==='frost-wave'){
            ctx.fillStyle='#f0faff';ctx.fillRect(x-1,y-3,2,6);ctx.fillRect(x-3,y-1,6,2);
            if(n>=2){ctx.lineWidth=n===3?2:1;for(let i=0;i<n;i++){ctx.beginPath();ctx.moveTo(f.x-d*14,f.y-42-i*13);ctx.quadraticCurveTo(x+d*12,y-28-i*7,x+d*(24+i*6),y+i*5);ctx.stroke();}motes(ctx,f.x,f.y-54,28+n*9,color,t,n*4);}
            if(n===3){rubble(ctx,f,t,8,7);runes(ctx,f.x,f.y-1,34,'#d8efff',t,.3);}
        }else if(s.projectileKind==='golden-lance'){
            if(n===1)orb(ctx,x+d*12,y,3,color);
            else{ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,n===3?43:29,n===3?0:-Math.PI*.7,n===3?Math.PI*2:Math.PI*.3);ctx.stroke();orb(ctx,x,y,n===3?12:7,color);if(n===3){circle(ctx,x,y,34,color,.7);for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.004;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*34,y+Math.sin(a)*34);ctx.lineTo(x+Math.cos(a+.35)*43,y+Math.sin(a+.35)*43);ctx.stroke();}motes(ctx,x,y,56,color,t,16,true);}}
        }else{
            orb(ctx,x,y,n===1?5:n===2?12:21,color);motes(ctx,x,y,19+n*7,color,t,4+n*4);
            // Green arcane marks and energy conduits, with no blade-shaped emission.
            ctx.globalAlpha=.25+n*.18;ctx.lineWidth=1.3;
            for(let i=0;i<3;i++){const xx=f.x+d*(3+i*7),yy=f.y-f.height*(.57+i*.025);ctx.beginPath();ctx.moveTo(xx-d*2,yy+3);ctx.lineTo(xx+d*1,yy-2);ctx.lineTo(xx+d*4,yy+2);ctx.stroke();}
            if(n>=2){runes(ctx,f.x,f.y-1,39+n*6,color,t,n===2?.35:.85);rubble(ctx,f,t,n===2?4:9,n===2?8:23);}
            if(n===3){for(let i=0;i<3;i++){const a=t*.025+i*Math.PI*2/3;if(s.projectileKind==='arcane-ray')orb(ctx,x+Math.cos(a)*32,y+Math.sin(a)*28,4,color);else{ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*20,y+Math.sin(a)*20);ctx.lineTo(x+Math.cos(a+.2)*30,y+Math.sin(a+.2)*30);ctx.lineTo(x+Math.cos(a+.4)*24,y+Math.sin(a+.4)*24);ctx.stroke();}}}
        }
        ctx.restore();
    }
    function projectile(ctx,p){
        const d=Math.sign(p.vx)||p.fxDir||1,w=p.hitWidth||80,h=p.hitHeight||18,n=p.chargeLevel||1,color=p.color||'#baffce';
        ctx.save();ctx.translate(p.x,p.y);ctx.scale(d,1);ctx.shadowColor=color;ctx.shadowBlur=n===1?3:16;ctx.fillStyle=color;ctx.strokeStyle=color;
        const trail=ctx.createLinearGradient(-w*1.8,0,w*.35,0);trail.addColorStop(0,color+'00');trail.addColorStop(1,color+(n===1?'55':'cc'));ctx.fillStyle=trail;if(p.kind!=='frost-wave')ctx.fillRect(-w*(n===1?1:1.8),-h*.2,w*(n===1?1.3:2),.4*h);
        if(p.kind==='frost-wave'){
            ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#d1e9ec';for(let i=0;i<(n===1?2:6);i++){ctx.beginPath();ctx.ellipse(-w*.55-i*14,Math.sin(i*2+p.x*.02)*4,15+i*3,3+i*.5,0,0,Math.PI*2);ctx.fill();}ctx.restore();
            ctx.fillStyle='#effbff';ctx.beginPath();ctx.moveTo(-w*.5,0);ctx.quadraticCurveTo(w*.1,-h*.8,w*.5,0);ctx.quadraticCurveTo(w*.05,-h*.12,-w*.5,0);ctx.fill();
            ctx.globalAlpha=.4;for(let i=0;i<(n===1?1:5);i++){ctx.strokeStyle='#d5e8ed';ctx.lineWidth=2+i*.5;ctx.beginPath();ctx.moveTo(-w*.55-i*13,(i%2?1:-1)*(2+i));ctx.quadraticCurveTo(-w-i*14,(i%2?1:-1)*(9+i),-w*1.65-i*7,0);ctx.stroke();}
        }else if(p.kind==='golden-lance'){
            ctx.fillStyle='#ffcf65';ctx.beginPath();ctx.moveTo(-w*.5,-h*.16);ctx.lineTo(w*.27,-h*.3);ctx.lineTo(w*.5,0);ctx.lineTo(w*.27,h*.3);ctx.lineTo(-w*.5,h*.16);ctx.closePath();ctx.fill();
            ctx.fillStyle='#fff5bd';ctx.fillRect(-w*.36,-1,w*.65,2);ctx.fillStyle='#ffda85';ctx.fillRect(-w*.36,-h*.65,3,h*1.3);if(n>=2)motes(ctx,-w*.8,0,w*.5,'#ffdc86',p.x*.04,16,true);
        }else if(p.kind==='arcane-ray'){
            ctx.fillStyle='#61e98d';ctx.fillRect(-w*.5,-h*.25,w,h*.5);ctx.fillStyle='#e0ffd9';ctx.fillRect(-w*.5,-h*.09,w,h*.18);orb(ctx,w*.5,0,h*.35,'#a9ffc1');
            for(let j=0;j<(n===1?0:3);j++){ctx.strokeStyle=j===1?'#d4ffcf':'#55e38f';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<9;i++){const x=-w*.6+i*w*.14,y=Math.sin(i*2.7+j*3+p.x*.09)*h*.4+(j-1)*h*.4;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
        }else if(p.kind==='arcane-shock'){
            const g=ctx.createLinearGradient(-w*.7,0,w*.7,0);g.addColorStop(0,'#137b4a00');g.addColorStop(.45,'#35ce77');g.addColorStop(.85,'#a9ffab');g.addColorStop(1,'#49dd87');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-w*.85,h*.5);ctx.lineTo(-w*.3,-h*.12);ctx.bezierCurveTo(-w*.1,-h*.65,w*.65,-h*.55,w*.7,h*.5);ctx.closePath();ctx.fill();
            for(let j=0;j<(n===1?1:3);j++){ctx.strokeStyle=j?'#75ffa9':'#d2ffb9';ctx.lineWidth=j?1:3;ctx.beginPath();ctx.ellipse(j*-7,0,w*.38,h*.46,0,-1.5,1.5);ctx.stroke();}
            if(p.grounded){ctx.shadowBlur=0;const ground=CONFIG.canvas.groundY-p.y;for(let i=0;i<8;i++){const x=-i*13,raise=Math.sin(i*2.3+p.x*.08)*6;ctx.strokeStyle=i%2?'#72cb85':'#131e19';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-8,ground);ctx.lineTo(x-2,ground-4);ctx.lineTo(x+4,ground+3);ctx.lineTo(x+8,ground);ctx.stroke();ctx.fillStyle=i%2?'#7f8772':'#46594b';ctx.beginPath();ctx.moveTo(x-4,ground-8-i%3*6+raise);ctx.lineTo(x,ground-12-i%3*6+raise);ctx.lineTo(x+4,ground-5-i%3*6+raise);ctx.closePath();ctx.fill();}}
        }
        if(n===2){ctx.strokeStyle=color;ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-w*.65-i*16,0,8+i*2,h*(.7+i*.15),Math.sin(p.x*.025+i)*.25,0,Math.PI*2);ctx.stroke();}}
        ctx.restore();
    }
    const draw=Game.prototype.drawCombatV2;
    Game.prototype.drawCombatV2=function(ctx){draw?.call(this,ctx);for(const f of [this.p1,this.p2])actor(ctx,f);for(const p of this.projectiles||[])if(p.rangedArt)projectile(ctx,p);};
    window.rangedArts={profile,level,actor,projectile};
})();
