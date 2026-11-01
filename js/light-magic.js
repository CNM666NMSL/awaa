/* Ten seconds of light magic; the shared combat clock keeps duration independent of blink slow motion. */
(()=>{
 const cast=Fighter.prototype.castSpecial;
 Fighter.prototype.castSpecial=function(){if(this.charId!=='noble')return cast.call(this);if(!this.canAct()||!this.onGround||this.resource<this.resourceMax)return false;this.resource=0;this.lightMagicLeft=600;this.specialPending=null;this.pendingProj=null;this.specialSerial=(this.specialSerial||0)+1;this.setState('skill');this.currentCast={anim:'lightBlessing',startup:18,recovery:30,special:true};this.currentSkillFrames=48;this.vx=0;return true;};
 const scale=Fighter.prototype.damageScale;
 Fighter.prototype.damageScale=function(){const excluded=this.state==='super'||this.state==='attack'&&this.currentAttack?.tier||this.state==='skill'&&this.currentCast?.tier;return scale.call(this)*(this.lightMagicLeft>0&&!excluded?2:1);};
 const combat=Game.prototype.updateCombatV2;
 Game.prototype.updateCombatV2=function(){combat.call(this);for(const f of [this.p1,this.p2])if(f?.lightMagicLeft>0)f.lightMagicLeft--;};
 const snap=Fighter.prototype.toSnapshot,apply=Fighter.prototype.applySnapshot,reset=Fighter.prototype.resetForRound;
 Fighter.prototype.toSnapshot=function(){return {...snap.call(this),lightMagicLeft:this.lightMagicLeft||0};};
 Fighter.prototype.applySnapshot=function(s){apply.call(this,s);this.lightMagicLeft=s.lightMagicLeft||0;};
 Fighter.prototype.resetForRound=function(...args){reset.apply(this,args);this.lightMagicLeft=0;};
 window.drawPlayerRing=function(c,f,x=f.x,y=f.y){const g=window.game;if(!g||f!==g.p1&&f!==g.p2)return;const p=f===g.p1?1:2,color=p===1?'#ff5163':'#48a9ff';c.save();c.strokeStyle=color;c.fillStyle=p===1?'#ff516328':'#48a9ff28';c.lineWidth=2.5;c.beginPath();c.ellipse(x,y+2,f.width*.82,9,0,0,Math.PI*2);c.fill();c.stroke();c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle=color;c.strokeStyle='#101724';c.lineWidth=3;c.strokeText('P'+p,x,y+19);c.fillText('P'+p,x,y+19);c.restore();};
 const draw=Fighter.prototype.draw;
 Fighter.prototype.draw=function(c){window.drawPlayerRing(c,this);draw.call(this,c);};
 const fx=Game.prototype.drawCombatV2;
 Game.prototype.drawCombatV2=function(c){fx.call(this,c);for(const f of [this.p1,this.p2]){if(!(f?.lightMagicLeft>0))continue;const t=600-f.lightMagicLeft,fade=Math.min(1,f.lightMagicLeft/30,t/12+.15),x=f.x,y=f.y;c.save();c.globalAlpha=.7*fade;c.shadowColor='#ffe4a0';c.shadowBlur=9;c.strokeStyle='#ffe6a3';c.lineWidth=1.6;for(let i=0;i<2;i++){c.beginPath();c.ellipse(x,y-3,46+i*9,12+i*4,t*.004*(i?1:-1),0,Math.PI*2);c.stroke();}for(let i=0;i<26;i++){const a=i*2.399+t*.027,r=25+(i%5)*8,xx=x+Math.cos(a)*r,yy=y-10-((t*.8+i*17)%125);c.globalAlpha=fade*(.25+.5*Math.sin((i+t*.04))**2);c.fillStyle=i%3?'#ffe3a0':'#fffdf1';c.beginPath();c.arc(xx,yy,1+i%3*.55,0,Math.PI*2);c.fill();}c.globalAlpha=fade*.45;c.strokeStyle='#fff4c8';c.beginPath();c.ellipse(x,y-f.height*.55,37,62,0,0,Math.PI*2);c.stroke();c.restore();}};
})();