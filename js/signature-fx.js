/* Deterministic canvas effects for summons and sustained ultimates. */
(() => {
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function sword(c,x,y,angle,length=45,width=5,color='#c5eeff'){
        c.save();c.translate(x,y);c.rotate(angle);const steel=c.createLinearGradient(-width,0,width,0);steel.addColorStop(0,'#507a8c');steel.addColorStop(.42,color);steel.addColorStop(.52,'#f5fdff');steel.addColorStop(1,'#7caabb');c.fillStyle=steel;c.strokeStyle='#d9f6ff';c.lineWidth=.8;
        c.beginPath();c.moveTo(0,-length*.58);c.lineTo(width,-length*.38);c.lineTo(width*.65,length*.22);c.lineTo(-width*.65,length*.22);c.lineTo(-width,-length*.38);c.closePath();c.fill();c.stroke();
        c.strokeStyle='#385d7388';c.lineWidth=.8;c.beginPath();c.moveTo(0,-length*.36);c.lineTo(0,length*.18);c.stroke();if(width>8)for(let i=0;i<4;i++){const y=-length*.18+i*length*.07;c.beginPath();c.moveTo(-width*.25,y);c.lineTo(width*.25,y+4);c.lineTo(-width*.15,y+7);c.stroke();}
        c.fillStyle='#bba47a';c.fillRect(-width*2,length*.2,width*4,3);c.fillStyle='#4e626d';c.fillRect(-2,length*.24,4,length*.2);c.restore();
    }
    function array(c,x,y,r,t,color='#ffd77f',flat=1){
        c.save();c.translate(x,y);c.scale(1,flat);c.rotate(t*.005);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.5;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.arc(0,0,r*.82,0,Math.PI*2);c.stroke();
        const vertices=Array.from({length:7},(_,i)=>({x:Math.cos(i*Math.PI*2/7-Math.PI/2)*r*.85,y:Math.sin(i*Math.PI*2/7-Math.PI/2)*r*.85}));
        for(let i=0;i<7;i++){const a=vertices[i],b=vertices[(i+3)%7];c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.beginPath();c.arc(a.x,a.y,3.5,0,Math.PI*2);c.fill();}c.restore();
    }
    function aura(c,f,u){
        const t=u.age,centerY=f.y-f.height*.55,r=u.radius;
        c.save();c.strokeStyle='#a5eaff';c.shadowColor='#7acbdc';c.shadowBlur=7;c.lineWidth=1.1;c.globalAlpha=.35;c.beginPath();c.ellipse(f.x,centerY,r,r*.78,0,0,Math.PI*2);c.stroke();c.globalAlpha=.85;
        for(let i=0;i<18;i++){const a=i*Math.PI*2/18+t*Math.PI*2/150,rr=r*(i%2?.91:1);sword(c,f.x+Math.cos(a)*rr,centerY+Math.sin(a)*rr*.78,a+Math.PI/2,35+i%3*4,3,i%2?'#b7e0e8':'#e5fbff');}
        array(c,f.x,f.y-2,r*.7,t,'#a1d8e6',.22);c.restore();
    }
    function meteor(c,o){
        const impact=o.age>=o.impactAt,fade=impact?clamp(1-(o.age-o.impactAt)/25,0,1):1,r=o.ultimate?39:27;
        c.save();c.globalAlpha=fade;c.shadowColor='#81e999';c.shadowBlur=10;
        if(!impact){
            c.strokeStyle=o.color||'#8be99a';c.lineWidth=5;c.globalAlpha*=.55;c.beginPath();c.moveTo(o.x,o.y);c.quadraticCurveTo(o.x-o.dir*55,o.y-75,o.x-o.dir*95,o.y-155);c.stroke();
            c.strokeStyle='#ffac6b';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(o.x+(i-2)*8,o.y);c.lineTo(o.x-o.dir*(45+i*6)+(i-2)*8,o.y-70-i*12);c.stroke();}c.globalAlpha=fade;
            const stone=c.createLinearGradient(o.x-r,o.y-r,o.x+r,o.y+r);stone.addColorStop(0,'#a5a286');stone.addColorStop(.45,'#666e5f');stone.addColorStop(1,'#303f39');c.fillStyle=stone;c.strokeStyle='#b5af89';c.lineWidth=1.5;c.beginPath();for(let i=0;i<11;i++){const a=i*Math.PI*2/11+o.age*.035,rr=r*(i%2?.83:1),x=o.x+Math.cos(a)*rr,y=o.y+Math.sin(a)*rr;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();
            c.save();c.shadowBlur=0;for(let i=0;i<6;i++){const a=i*2.399+o.age*.035,x=o.x+Math.cos(a)*r*.52,y=o.y+Math.sin(a)*r*.52;c.fillStyle=i%2?'#333e36':'#90917a';c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a+1)*r*.45,y+Math.sin(a+1)*r*.45);c.lineTo(x+Math.cos(a+2)*r*.32,y+Math.sin(a+2)*r*.32);c.closePath();c.fill();c.fillStyle='#2f3a31';c.beginPath();c.ellipse(x,y,3+i%2,2,0,0,Math.PI*2);c.fill();}c.restore();
            c.strokeStyle='#ffb46d';for(let i=0;i<4;i++){const a=i*1.7;c.beginPath();c.moveTo(o.x+Math.cos(a)*r*.8,o.y+Math.sin(a)*r*.8);c.lineTo(o.x+Math.cos(a+.4)*r*.22,o.y+Math.sin(a+.4)*r*.22);c.lineTo(o.x+Math.cos(a+.9)*r*.65,o.y+Math.sin(a+.9)*r*.65);c.stroke();}
        }else{
            const age=o.age-o.impactAt;c.strokeStyle='#a7f7a7';c.lineWidth=4;c.beginPath();c.ellipse(o.x,o.y+20,r+age*4,12+age*.8,0,0,Math.PI*2);c.stroke();
            for(let i=0;i<12;i++){const a=i*2.399,x=o.x+Math.cos(a)*(r+age*3),y=o.y+Math.sin(a)*18-age*2;c.fillStyle=i%2?'#7e8065':'#c6c095';c.fillRect(x,y,4+i%3,4+i%3);}
        }c.restore();
    }
    function pillar(c,o){
        c.save();c.shadowColor='#85e8a3';c.shadowBlur=8;
        for(let i=0;i<10;i++){const t=o.age-i*5;if(t<0||t>55)continue;const x=o.x+o.dir*(o.owner.width/2+o.spacing*(i+.5)),h=(155+i%3*12)*clamp(t/12,0,1)*clamp((55-t)/10,0,1),w=o.spacing*.7;
            c.globalAlpha=t<10?.45:.9;const g=c.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,'#3d514a');g.addColorStop(.5,'#9baa8d');g.addColorStop(1,'#415e51');c.fillStyle=g;c.strokeStyle='#a5e6ad';c.lineWidth=1.3;
            c.beginPath();c.moveTo(x-w/2,o.y);c.lineTo(x-w/2,o.y-h+16);c.lineTo(x-w*.2,o.y-h);c.lineTo(x+w*.27,o.y-h+5);c.lineTo(x+w/2,o.y-h+20);c.lineTo(x+w/2,o.y);c.closePath();c.fill();c.stroke();
            c.strokeStyle='#82f0a2';c.beginPath();c.moveTo(x-6,o.y-h*.8);c.lineTo(x+5,o.y-h*.57);c.lineTo(x-4,o.y-h*.4);c.lineTo(x+6,o.y-h*.15);c.stroke();
            c.save();c.shadowBlur=0;c.globalAlpha*=.7;c.fillStyle='#364b40';c.beginPath();c.moveTo(x-w/2,o.y);c.lineTo(x-w/2,o.y-h+16);c.lineTo(x-w*.2,o.y-h);c.lineTo(x-w*.1,o.y-h*.5);c.lineTo(x+w*.1,o.y-h*.43);c.lineTo(x-w*.2,o.y);c.closePath();c.fill();c.strokeStyle='#354e43';c.lineWidth=1.2;for(let j=0;j<4;j++){const y=o.y-h*(.18+j*.18);c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w*.1,y-7);c.lineTo(x+w*.12,y+2);c.lineTo(x+w/2,y-3);c.stroke();}c.restore();
            c.fillStyle='#6f7966';for(let j=0;j<3;j++)c.fillRect(x-w/2+j*14,o.y-3-(t%8)*(j+1),4,5);
            // Bevelled jade monoliths: luminous inlaid sigils, rising debris and ground shock rings.
            c.save();c.globalAlpha*=.65;c.strokeStyle='#d6ffe3';c.lineWidth=1;
            for(let j=0;j<4;j++){const yy=o.y-h*(.2+j*.18);c.strokeRect(x-w*.14,yy-4,w*.28,8);c.beginPath();c.moveTo(x,yy-9);c.lineTo(x,yy+9);c.stroke();}
            c.strokeStyle='#62dba8';c.beginPath();c.ellipse(x,o.y-2,w*.9+t*.3,7,0,0,Math.PI*2);c.stroke();
            for(let j=0;j<5;j++){const xx=x+Math.cos(j*2.4+t*.08)*(w*.7+8),yy=o.y-15-(t*2+j*17)%90;c.fillStyle=j%2?'#b5e9c6':'#53665b';c.fillRect(xx,yy,4,6);}c.restore();
        }c.restore();
    }
    function object(c,o){
        if(o.kind==='meteor'){meteor(c,o);return;}
        if(o.kind==='pillar-wave'){pillar(c,o);return;}
        c.save();
        if(o.kind==='heavy-cleave'){
            const t=clamp(o.age/o.impactAt,0,1);c.globalAlpha=o.age>o.impactAt?clamp(1-(o.age-o.impactAt)/36,0,1):1;c.shadowColor='#c9f2ff';c.shadowBlur=9;
            c.globalAlpha=1;sword(c,o.x,o.y-75,o.dir*Math.PI/2,145,14,'#aed7e4');
            if(o.age>=o.impactAt){c.strokeStyle='#b9eeff';c.lineWidth=3;for(let i=0;i<4;i++){c.globalAlpha=.5-i*.1;c.beginPath();c.moveTo(o.x-o.dir*30,o.y-75+i*5);c.lineTo(o.x-o.dir*(80+i*20),o.y-75+i*5);c.stroke();}}
        }else if(o.kind==='overhead-stars'){
            const cy=o.y-205,active=o.age>=o.impactAt;c.shadowColor='#ffe29e';c.shadowBlur=10;c.globalAlpha=o.age>48?clamp((o.life-o.age)/20,0,1):.85;
            array(c,o.x,cy,68,o.age,'#ffdc8e',.58);
            if(active){c.strokeStyle='#fff0b8';for(let i=0;i<7;i++){const x=o.x+Math.cos(i*Math.PI*2/7)*55;c.lineWidth=i%2?2:4;c.beginPath();c.moveTo(x,cy);c.lineTo(x+(o.x-x)*.65,o.y-15);c.stroke();}array(c,o.x,o.y-2,78,o.age,'#f4d17d',.25);}
            else{c.strokeStyle='#f3d98966';c.lineWidth=1;c.beginPath();c.moveTo(o.x,cy+40);c.lineTo(o.x,o.y-10);c.stroke();}
        }else if(o.kind==='execution-slash'){
            c.globalAlpha=clamp(1-o.age/o.life,0,1);c.shadowColor='#ffde90';c.shadowBlur=9;c.strokeStyle='#ffe09a';c.lineWidth=5;const angle=(o.index%2?-.55:.45);
            c.save();c.translate(o.x,o.y);c.scale(o.dir,1);c.rotate(angle);c.beginPath();c.ellipse(0,0,100,32,0,-1.5,1.5);c.stroke();c.lineWidth=1.4;c.strokeStyle='#fff9d1';c.beginPath();c.moveTo(-55,0);c.lineTo(105,0);c.stroke();c.restore();array(c,o.x+o.dir*25,o.y,37,o.age,'#f7cc79');
        }else if(o.kind==='shield-flash'){
            c.globalAlpha=1-o.age/o.life;c.strokeStyle='#d8f9ff';c.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(o.x+Math.cos(a)*3,o.y+Math.sin(a)*3);c.lineTo(o.x+Math.cos(a)*(8+o.age),o.y+Math.sin(a)*(8+o.age));c.stroke();}
        }c.restore();
    }
    const draw=Game.prototype.drawCombatV2;
    Game.prototype.drawCombatV2=function(c){
        draw.call(this,c);
        for(const f of [this.p1,this.p2])if(window.signatureArts.active(f)){
            const u=f.activeUltimate;if(u.kind==='sword-domain')aura(c,f,u);
            else if(u.kind==='seven-star-execution'){c.save();c.shadowColor='#ffd986';c.shadowBlur=8;array(c,f.x,f.y-2,75,u.age,'#ffe2a0',.23);array(c,f.x,f.y-f.height*.55,62,u.age,'#fff0af',1);c.restore();}
            else{c.save();if(u.kind==='earth-pillars'){const x=u.originX+u.dir*CONFIG.canvas.width*.25;array(c,x,CONFIG.canvas.groundY-2,CONFIG.canvas.width*.25,u.age,'#8ce8a6',.16);for(let i=0;i<18;i++){const xx=u.originX+u.dir*(i+.5)*CONFIG.canvas.width/36;c.fillStyle='#b5f9c8';c.globalAlpha=.4;c.fillRect(xx,CONFIG.canvas.groundY-((u.age*1.2+i*31)%150),2,6);}}else array(c,f.x,f.y-2,65,u.age,'#8ce8a6',.22);c.restore();}
            // Sustained abilities intentionally have no overhead status or invulnerability timer text.
            if(u.kind==='seven-star-execution'){const target=u.targetSide===1?this.p1:this.p2;if(target){c.save();c.globalAlpha=.7;array(c,target.x,target.y-target.height*.55,48,u.age,'#e5c97e');c.restore();}}
        }
        for(const o of this.signatureObjects||[])object(c,o);
    };
    window.signatureFX={sword,array,object};
})();
