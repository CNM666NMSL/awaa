/* Authoritative sustained supers and third-charge summons, shared by every game mode. */
(() => {
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const supported=f=>!!f?.def.super_?.signatureArt;
    const enemyOf=(g,f)=>f===g.p1?g.p2:g.p1;
    const active=f=>f?.activeUltimate&&f.health>0&&f.activeUltimate.age<f.activeUltimate.life;
    function segmentNear(x1,y1,x2,y2,x,y,r){const dx=x2-x1,dy=y2-y1,k=clamp(((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x1+dx*k-x,y1+dy*k-y)<=r;}
    function damage(g,owner,target,value,{fixed=false,periodic=false,knockback=4,dir=owner.facing,damageType='magic'}={}){
        if(!target||target.health<=0||target.isInvulnerable())return false;
        const blocked=!periodic&&target.state==='block';
        const result=target.takeHit({damage:value,fixedDamage:fixed,periodic,deferKnockdown:fixed,damageType,hitstun:periodic?0:18,knockback},dir,blocked,fixed?1:owner.damageScale());
        if(result.dmg>0){owner.gainMeter(CONFIG.resources.meterOnHit);g.spawnHitSpark(target.x,target.y-target.height*.55,blocked);g.updateHUD();}
        if(result.ko)g.onKO(owner);
        return result.dmg>0;
    }
    function spawn(g,owner,kind,extra={}){
        const object={signature:true,side:owner===g.p1?1:2,owner,kind,x:owner.x,y:owner.y,dir:owner.facing,age:0,life:70,hit:false,...extra};
        (g.signatureObjects||= []).push(object);return object;
    }
    function shield(g,owner,x1,y1,x2,y2,r=0){
        for(const f of [g.p1,g.p2])if(f!==owner&&active(f)&&f.activeUltimate.kind==='sword-domain'){
            if(segmentNear(x1,y1,x2,y2,f.x,f.y-f.height*.55,f.activeUltimate.radius+r)){
                spawn(g,f,'shield-flash',{x:x2,y:y2,life:18});g.spawnHitSpark(x2,y2,true);return true;
            }
        }return false;
    }
    const castSuper=Fighter.prototype.castSuper;
    Fighter.prototype.castSuper=function(){
        if(active(this))return false;
        const result=castSuper.call(this);if(!result||!supported(this))return result;
        const def={...this.def.super_,...this.def.super_.forms?.[this.form]};this.currentAttack=def;
        this.activeUltimate={kind:def.signatureArt,name:def.name,age:0,life:def.duration,damage:def.pulseDamage,pulses:def.pulses,radius:def.radius||this.width*3,dir:this.facing,form:this.form,serial:this.superSerial,originX:this.x,originY:this.y,targetSide:this===window.game?.p1?2:1};
        this._updateAnim();return true;
    };
    const invulnerable=Fighter.prototype.isInvulnerable;
    Fighter.prototype.isInvulnerable=function(){return invulnerable.call(this)||!!(active(this)&&this.activeUltimate.kind==='seven-star-execution');};
    const attackBox=Fighter.prototype.getAttackBox,attackActive=Fighter.prototype.isAttackActive;
    Fighter.prototype.getAttackBox=function(){if(this.state==='super'&&this.currentAttack?.signatureArt)return null;return attackBox.call(this);};
    Fighter.prototype.isAttackActive=function(){if(this.state==='super'&&this.currentAttack?.signatureArt)return false;return attackActive.call(this);};
    const updateAnim=Fighter.prototype._updateAnim;
    Fighter.prototype._updateAnim=function(){
        if(this.state==='super'&&this.def.anims?.super_){
            const a=this.def.anims.super_,count=this._animFrameCount(a);this.animKey='super_';
            const tick=Math.floor(this.stateTimer*(a.fps||40)/60),period=Math.max(1,(count-1)*2);
            this.animFrame=this.currentAttack?.signatureArt?Math.min(count-1,tick):Math.min(tick%period,period-tick%period);return;
        }return updateAnim.call(this);
    };
    const fighterReset=Fighter.prototype.resetForRound;
    Fighter.prototype.resetForRound=function(...args){this.activeUltimate=null;return fighterReset.apply(this,args);};
    const snapshot=Fighter.prototype.toSnapshot,applySnapshot=Fighter.prototype.applySnapshot;
    Fighter.prototype.toSnapshot=function(){return{...snapshot.call(this),signatureUltimate:this.activeUltimate?{...this.activeUltimate}:null};};
    Fighter.prototype.applySnapshot=function(data){applySnapshot.call(this,data);this.activeUltimate=data.signatureUltimate?{...data.signatureUltimate}:null;};

    const casts=Game.prototype.updateSkillCasts;
    Game.prototype.updateSkillCasts=function(f){
        const s=f.pendingProj;
        if(f.state!=='skill'||!s?.rangedArt||s.chargeLevel!==3||f.stateTimer!==s.startup)return casts.call(this,f);
        const enemy=enemyOf(this,f);if(!enemy)return;
        f.pendingProj=null;f.rangedCooldown=Math.max(f.rangedCooldown||0,Math.ceil(CONFIG.resources.rangedCooldownSeconds*60));
        const dmg=Math.round(s.damage*(f.isPureWhite()&&s.fullDamageMult?s.fullDamageMult:1));
        if(f.charId==='jianke')spawn(this,f,'heavy-cleave',{damage:dmg,life:80,impactAt:12,reach:CONFIG.canvas.width*.65,startX:f.x});
        else if(f.charId==='noble')spawn(this,f,'overhead-stars',{x:enemy.x,y:enemy.y,damage:dmg,life:68,impactAt:34,radius:82});
        else if(f.charId==='shouwang')spawn(this,f,'meteor',{x:enemy.x-f.facing*100,y:enemy.y-440,startY:enemy.y-440,damage:dmg,life:76,impactAt:48,tracking:true,color:s.projectileColor});
        else return casts.call(this,f);
    };
    const projectiles=Game.prototype.updateProjectiles;
    Game.prototype.updateProjectiles=function(){
        for(const p of this.projectiles||[])if(!p.dead&&shield(this,p.owner,p.x,p.y,p.x+(p.vx||0),p.y+(p.vy||0),(p.hitHeight||p.size||0)/2))p.dead=true;
        return projectiles.call(this);
    };
    Game.prototype.updateSignatureArts=function(){
        this.signatureObjects||=[];
        for(const f of [this.p1,this.p2]){
            const u=f?.activeUltimate;if(!u)continue;
            if(f.health<=0){f.activeUltimate=null;continue;}
            u.age++;const target=enemyOf(this,f);
            // Pillar origin and facing are captured at cast time.
            // Global ability duration stays exact even when blink slows one fighter's animation clock.
            if(f.state==='super'&&f.currentAttack?.signatureArt){
                const castDuration=f.currentAttack.startup+f.currentAttack.active+f.currentAttack.recovery;
                if(u.age>=castDuration){f.currentAttack=null;f.vx=0;f.setState(f.onGround?'idle':'jump');}
                else{f.stateTimer=u.age;f._updateAnim();}
            }
            if(u.kind==='sword-domain'){
                if(u.age%60===0&&Math.hypot(target.x-f.x,(target.y-target.height*.5)-(f.y-f.height*.5))<=u.radius+target.width/2)
                    damage(this,f,target,u.damage,{fixed:true,periodic:true,knockback:0});
            }else if(u.kind==='seven-star-execution'){
                if(u.age>=30&&(u.age-30)%60===0&&u.age<=330){
                    const dir=Math.sign(target.x-f.x)||f.facing;
                    spawn(this,f,'execution-slash',{x:target.x,y:target.y-target.height*.55,dir,life:28,index:Math.floor((u.age-30)/60)});
                    damage(this,f,target,u.damage,{fixed:true,dir,knockback:5});
                }
            }else if(u.age>=20&&(u.age-20)%120===0&&u.age<=260){
                if(u.kind==='tracking-meteors')spawn(this,f,'meteor',{x:target.x-u.dir*130,y:target.y-450,startY:target.y-450,damage:300,fixed:true,ultimate:true,life:88,impactAt:60,tracking:true,color:'#8ded82'});
                else spawn(this,f,'pillar-wave',{x:u.originX,y:CONFIG.canvas.groundY,dir:u.dir,damage:300,fixed:true,ultimate:true,life:100,reach:CONFIG.canvas.width*.5,spacing:CONFIG.canvas.width*.05});
            }
            if(u.age>=u.life)f.activeUltimate=null;
        }
        for(const o of this.signatureObjects){
            if(o.dead)continue;o.age++;const target=enemyOf(this,o.owner);if(!target){o.dead=true;continue;}
            if(o.kind==='meteor'){
                if(o.age<=o.impactAt){
                    const px=o.x,py=o.y;o.x+=clamp(target.x-o.x,-16,16);
                    const goalY=target.y-target.height*.4,t=clamp(o.age/o.impactAt,0,1);o.y=o.startY+(goalY-o.startY)*t*t;
                    if(shield(this,o.owner,px,py,o.x,o.y,22)){o.dead=true;continue;}
                    if(o.age===o.impactAt){o.x=target.x;o.y=goalY;o.hit=damage(this,o.owner,target,o.damage,{fixed:!!o.fixed,dir:o.dir,knockback:7});}
                }
            }else if(o.kind==='overhead-stars'){
                if(o.age<=22){o.x=target.x;o.y=target.y;}
                if(o.age===o.impactAt&&Math.abs(target.x-o.x)<o.radius+target.width/2&&Math.abs(target.y-o.y)<170)o.hit=damage(this,o.owner,target,o.damage,{dir:o.dir,knockback:6});
            }else if(o.kind==='heavy-cleave'){
                const previous=o.x;if(o.age>=o.impactAt)o.x+=o.dir*16;const distance=(target.x-previous)*o.dir;
                if(Math.abs(o.x-o.startX)>o.reach||shield(this,o.owner,previous,o.y-75,o.x,o.y-75,18)){o.dead=true;continue;}
                if(!o.hit&&o.age>=o.impactAt&&distance>=-35&&distance<=55+target.width/2&&Math.abs(target.y-o.y)<170)o.hit=damage(this,o.owner,target,o.damage,{dir:o.dir,knockback:8,damageType:'physical'});
            }else if(o.kind==='pillar-wave'&&!o.hit){
                for(let i=0;i<10;i++){const age=o.age-i*5,x=o.x+o.dir*(o.owner.width/2+o.spacing*(i+.5));
                    if(age>=10&&age<=48&&Math.abs(target.x-x)<o.spacing/2+target.width/2&&target.y>o.y-180&&target.y-target.height<o.y){o.hit=damage(this,o.owner,target,o.damage,{fixed:true,dir:o.dir,knockback:5});if(o.hit)break;}
                }
            }
        }
        this.signatureObjects=this.signatureObjects.filter(o=>!o.dead&&o.age<o.life);
    };
    const combat=Game.prototype.updateCombatV2;
    Game.prototype.updateCombatV2=function(){combat.call(this);this.updateSignatureArts();};
    const objects=Game.prototype.combatV2ObjectsSnapshot;
    Game.prototype.combatV2ObjectsSnapshot=function(){return[...objects.call(this),...(this.signatureObjects||[]).map(({owner,...o})=>o)];};
    const gameSnapshot=Game.prototype.applyStateSnapshot;
    Game.prototype.applyStateSnapshot=function(data){gameSnapshot.call(this,{...data,wo:(data.wo||[]).filter(o=>!o.signature)});this.signatureObjects=(data.wo||[]).filter(o=>o.signature).map(o=>({...o,owner:o.side===1?this.p1:this.p2}));};
    const start=Game.prototype.startRound,practice=Game.prototype.resetNoblePractice;
    Game.prototype.startRound=function(...args){this.signatureObjects=[];return start.apply(this,args);};
    if(practice)Game.prototype.resetNoblePractice=function(...args){this.signatureObjects=[];return practice.apply(this,args);};
    window.signatureArts={active,damage,spawn,shield};
})();
