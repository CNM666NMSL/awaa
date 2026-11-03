/* Cyber talisman abilities share the normal hit, block, resource and network systems. */
(() => {
    const isCyber = f => !!f?.def.cyberChinese;
    const castSpecial = Fighter.prototype.castSpecial;
    Fighter.prototype.castSpecial = function() {
        const result = castSpecial.call(this);
        if (result && isCyber(this)) this.currentCast.anim = 'special';
        return result;
    };
    const updateObjects = Game.prototype.updateCombatV2;
    Game.prototype.updateCombatV2 = function() {
        this.cyberObjects ||= [];
        for (const [side,f] of [[1,this.p1],[2,this.p2]]) {
            if (!isCyber(f) || !f.specialPending) continue;
            const pending=f.specialPending,enemy=f===this.p1?this.p2:this.p1;
            f.specialPending=null;
            this.cyberObjects=this.cyberObjects.filter(o=>o.owner!==f);
            const x=f.charId==='motong'?f.x+Math.max(-320,Math.min(320,enemy.x-f.x)):f.x+f.facing*65;
            this.cyberObjects.push({...pending,cyber:true,owner:f,side,x:Math.max(45,Math.min(1155,x)),y:CONFIG.canvas.groundY,age:0,life:f.charId==='wuxiang'?150:95,hit:false});
        }
        updateObjects.call(this);
        for(const o of this.cyberObjects){
            o.age++;
            if(o.age<18)continue;
            const enemy=o.owner===this.p1?this.p2:this.p1;
            if(o.type==='liequan')o.x+=o.dir*9;
            if(o.hit || enemy.state==='ko' || enemy.isInvulnerable())continue;
            const radius=o.type==='motong'?72:o.type==='liequan'?66:95;
            if(Math.abs(enemy.x-o.x)>radius+enemy.width/2 || Math.abs(enemy.y-o.y)>115)continue;
            o.hit=true;
            const blocked=enemy.state==='block',damage=CONFIG.characters[o.type].special.damage;
            const result=enemy.takeHit({damage,hitstun:22,knockback:o.type==='liequan'?9:3},o.dir,blocked,1);
            if(o.type==='motong'&&!blocked&&!result.immune&&!result.ko){enemy.setState('idle');enemy.rootLeft=36;enemy.rootX=enemy.x;enemy.rootY=enemy.y;enemy.vx=enemy.vy=0;}
            if(result.ko)this.onKO(o.owner);
            this.spawnHitSpark(enemy.x,enemy.y-55,blocked);this.updateHUD();
        }
        this.cyberObjects=this.cyberObjects.filter(o=>o.age<o.life&&o.x>-100&&o.x<1300);
    };
    const updateProjectiles=Game.prototype.updateProjectiles;
    Game.prototype.updateProjectiles=function(){
        for(const o of this.cyberObjects||[])if(o.type==='wuxiang'&&o.age>=18){
            for(const p of this.projectiles){
                if(p.dead||p.owner===o.owner||p.cyberReflected)continue;
                const crosses=Math.min(p.x,p.x+p.vx)<=o.x+35&&Math.max(p.x,p.x+p.vx)>=o.x-35;
                if(crosses&&p.y>o.y-150&&p.y<o.y){p.owner=o.owner;p.vx=-p.vx;p.fxChar='wuxiang';p.fxDir=Math.sign(p.vx);p.color=o.owner.def.color;p.cyberReflected=true;p.x=o.x+Math.sign(p.vx)*45;}
            }
        }
        return updateProjectiles.call(this);
    };
    const resetRound=Game.prototype.startRound;
    Game.prototype.startRound=function(...args){this.cyberObjects=[];return resetRound.apply(this,args);};
    const resetPractice=Game.prototype.resetNoblePractice;
    Game.prototype.resetNoblePractice=function(...args){this.cyberObjects=[];return resetPractice.apply(this,args);};
    const snapshot=Game.prototype.combatV2ObjectsSnapshot;
    Game.prototype.combatV2ObjectsSnapshot=function(){return [...snapshot.call(this),...(this.cyberObjects||[]).map(({owner,...o})=>o)];};
    const applySnapshot=Game.prototype.applyStateSnapshot;
    Game.prototype.applyStateSnapshot=function(data){
        applySnapshot.call(this,{...data,wo:(data.wo||[]).filter(o=>!o.cyber)});
        this.cyberObjects=(data.wo||[]).filter(o=>o.cyber).map(o=>({...o,owner:o.side===1?this.p1:this.p2}));
    };

    const wolfImages=[];
    for(let i=0;i<10;i++){const src=`assets/chars/cyber-v1/liequan/wolf/${String(i).padStart(2,'0')}.png?v=${ASSET_VER}`;const image=window.gameAssets?window.gameAssets.loadImage(src):new Image();if(!window.gameAssets)image.src=src;wolfImages.push(image);}
    function wolf(ctx,x,y,dir,frame,alpha=1){const im=wolfImages[frame%wolfImages.length];if(!im?.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.scale(dir,1);ctx.globalAlpha=alpha;ctx.drawImage(im,-65,-70,130,80);ctx.restore();}
    function seal(ctx,x,y,r,color,time=0){
        ctx.save();ctx.translate(x,y);ctx.scale(1,.42);ctx.rotate(time*.012);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.arc(0,0,r*.78,0,Math.PI*2);ctx.stroke();
        for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);for(let j=0;j<3;j++){const yy=-r*.73+j*5;ctx.beginPath();ctx.moveTo(-9,yy);ctx.lineTo(i%2&&j%2?-2:9,yy);if(i%2&&j%2){ctx.moveTo(2,yy);ctx.lineTo(9,yy);}ctx.stroke();}ctx.fillRect(-2,-r-4,4,8);ctx.restore();}ctx.restore();
    }
    function eye(ctx,x,y,r,color){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r,r*.48,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r*.22,0,Math.PI*2);ctx.fill();}
    function revolverFlash(ctx,f){
        const s=f.currentCast,age=f.stateTimer-(s?.startup||0);
        if(f.state!=='skill'||s?.projectileKind!=='revolver'||age<0||age>=6)return;
        const length=(s.charged?29:21)*(1-age/8),x=f.x+f.facing*s.projX,y=f.y-f.height*s.projY;
        ctx.save();ctx.translate(x,y);ctx.scale(f.facing,1);ctx.globalAlpha=1-age/7;ctx.shadowColor='#ffb142';ctx.shadowBlur=12;
        ctx.fillStyle='#ff9b35';ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(7,-8);ctx.lineTo(9,-3);ctx.lineTo(length,-2);ctx.lineTo(length*.65,2);ctx.lineTo(11,7);ctx.lineTo(6,3);ctx.closePath();ctx.fill();
        ctx.fillStyle='#fff6cc';ctx.beginPath();ctx.ellipse(6,0,9,2.5,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#ffc96d';ctx.lineWidth=1.2;
        for(let i=0;i<7;i++){const angle=(i-3)*.29,dist=8+age*5+(i%3)*3;ctx.beginPath();ctx.moveTo(Math.cos(angle)*dist,Math.sin(angle)*dist);ctx.lineTo(Math.cos(angle)*(dist+5),Math.sin(angle)*(dist+5));ctx.stroke();}
        ctx.restore();
    }
    function revolverBullet(ctx,p){
        const d=Math.sign(p.vx)||p.fxDir||1,length=p.charged?17:12;
        ctx.save();ctx.translate(p.x,p.y);ctx.scale(d,1);ctx.shadowColor='#ffa943';ctx.shadowBlur=8;
        const trail=ctx.createLinearGradient(-48,0,0,0);trail.addColorStop(0,'#ff9b3500');trail.addColorStop(1,'#ffcb80aa');ctx.fillStyle=trail;ctx.fillRect(-48,-1,48,2);
        ctx.fillStyle='#d89348';ctx.fillRect(-length/2,-2,length-3,4);ctx.fillStyle='#fff0bc';ctx.beginPath();ctx.ellipse(length/2-3,0,4,2,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#ffd18b';ctx.lineWidth=1;
        for(let i=0;i<3;i++){const x=-9-i*8,y=(i%2?1:-1)*(3+i);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y*1.3);ctx.stroke();}
        ctx.restore();
    }
    function actorEffects(ctx,f){
        if(!isCyber(f)||f.charId==='motong')return;
        const active=['attack','skill','super','charge','rangedCharge','block'].includes(f.state),t=f.stateTimer,d=f.facing,superMove=f.state==='super',color=f.def.color;
        if(f.charId==='liequan')wolf(ctx,f.x-d*72,f.y,d,f.state==='walk'?1+Math.floor(t*.18)%6:0,.82);
        if(!active)return;
        ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.shadowColor=color;ctx.shadowBlur=9;
        const charge=['charge','rangedCharge'].includes(f.state);
        const aimingRevolver=f.charId==='wuxiang'&&(f.state==='rangedCharge'||f.currentCast?.projectileKind==='revolver'&&f.state==='skill');
        const ultimateReach=f.def.super_.range+f.width/2;
        if(charge&&!aimingRevolver||superMove||f.currentCast?.special)seal(ctx,f.x,f.y-2,superMove?115:45,color,t);
        if(f.charId==='motong'){
            const count=superMove?5:2;
            for(let i=0;i<count;i++){const length=superMove?ultimateReach:60,phase=t*.07+i;ctx.beginPath();ctx.moveTo(f.x-d*12,f.y-45);ctx.bezierCurveTo(f.x-d*length*.8,f.y-130-i*8,f.x+d*length*.6,f.y-95+Math.sin(phase)*25,f.x+d*length,f.y-55+i*15);ctx.stroke();}
            eye(ctx,f.x+d*(superMove?ultimateReach-30:40),f.y-80,superMove?30:15,color);
        }else if(f.charId==='liequan'){
            ctx.setLineDash([9,5]);ctx.beginPath();ctx.moveTo(f.x+d*25,f.y-65);ctx.lineTo(f.x+d*(superMove?ultimateReach:110),f.y-65);ctx.stroke();ctx.setLineDash([]);
            if(superMove)for(let i=0;i<2;i++)wolf(ctx,f.x+d*(50+(t*7+i*100)%Math.max(1,ultimateReach-100)),f.y-5,d,4+Math.floor(t*.2)%4,.35);
            if(f.state==='skill'&&t>=10&&t<20){ctx.beginPath();ctx.moveTo(f.x+d*45,f.y-62);ctx.lineTo(f.x+d*92,f.y-75);ctx.lineTo(f.x+d*78,f.y-62);ctx.lineTo(f.x+d*92,f.y-48);ctx.closePath();ctx.fill();}
        }else{
            if(f.state==='block'||superMove){ctx.beginPath();ctx.ellipse(f.x+d*35,f.y-65,superMove?68:28,superMove?90:53,0,0,Math.PI*2);ctx.stroke();}
            if(superMove)for(let i=0;i<5;i++){const x=f.x+d*(45+i*(ultimateReach-45)/4);ctx.beginPath();ctx.moveTo(x,f.y-145);ctx.lineTo(x,f.y);ctx.stroke();}
        }
        if(charge&&!aimingRevolver){ctx.font='bold 19px KaiTi,serif';ctx.fillText(f.charId==='motong'?'瞳':f.charId==='liequan'?'狩':'敕',f.x-10,f.y-95);}
        ctx.restore();
        revolverFlash(ctx,f);
    }
    const draw=Game.prototype.drawCombatV2;
    Game.prototype.drawCombatV2=function(ctx){
        draw.call(this,ctx);
        for(const f of [this.p1,this.p2])actorEffects(ctx,f);
        for(const o of this.cyberObjects||[]){ctx.save();const color=CONFIG.characters[o.type].color;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=o.age<18?.35:.85;ctx.shadowColor=color;ctx.shadowBlur=12;
            if(o.type==='motong'){seal(ctx,o.x,o.y-2,78,color,o.age);eye(ctx,o.x,o.y-95,35,color);for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(o.x-60+i*40,o.y);ctx.quadraticCurveTo(o.x-90+i*50,o.y-100,o.x-30+i*20,o.y-125);ctx.stroke();}}
            else if(o.type==='liequan'){seal(ctx,o.x,o.y-3,45,color,o.age);wolf(ctx,o.x,o.y,o.dir,o.age<18?2:4+Math.floor(o.age*.25)%5);}
            else{ctx.save();ctx.translate(o.x,o.y-75);ctx.scale(.55,1);seal(ctx,0,0,135,color,o.age);ctx.restore();ctx.beginPath();ctx.ellipse(o.x,o.y-75,36,75,0,0,Math.PI*2);ctx.stroke();ctx.font='27px KaiTi,serif';ctx.fillText('敕',o.x-13,o.y-66);}
            ctx.restore();
        }
        for(const p of this.projectiles||[]){if(p.rangedArt)continue;if(p.kind==='revolver'){revolverBullet(ctx,p);continue;}const id=p.owner?.charId||p.fxChar;if(!CONFIG.characters[id]?.cyberChinese)continue;ctx.save();ctx.strokeStyle=CONFIG.characters[id].color;ctx.fillStyle=ctx.strokeStyle;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12;const d=Math.sign(p.vx)||p.fxDir||1;
            if(id==='motong')eye(ctx,p.x,p.y,p.charged?22:14,ctx.strokeStyle);
            else if(id==='liequan'){for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(p.x-d*30,p.y+i*4);ctx.lineTo(p.x+d*8,p.y+i*2);ctx.stroke();}}
            else{ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.strokeRect(-10,-10,20,20);ctx.font='16px KaiTi';ctx.fillText('雷',-8,6);}
            ctx.restore();
        }
    };
    window.cyberChineseFX={seal,eye};
})();
