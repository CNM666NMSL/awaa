/* Movement during all supers; locked duelist spells coexist with blink and launcher attacks. */
(() => {
 const moving=f=>f.state==='super'&&f.health>0;
 const move=Fighter.prototype.move,stop=Fighter.prototype.stopMove,aim=Fighter.prototype.aim,update=Fighter.prototype.update;
 Fighter.prototype.move=function(dir,running=false){if(moving(this)){this._superMoveDir=dir;this._superRunning=running;this.facing=dir;this.pendingFacing=dir;return;}return move.call(this,dir,running);};
 Fighter.prototype.stopMove=function(){this._superMoveDir=0;this._superRunning=false;return stop.call(this);};
 Fighter.prototype.aim=function(dir){if(moving(this)&&dir){this.facing=dir;this.pendingFacing=dir;return;}return aim.call(this,dir);};
 Fighter.prototype.update=function(){const casting=moving(this),dir=this._superMoveDir||0;update.call(this);if(casting&&this.state==='super'&&dir){const m=CONFIG.canvas.wallMargin+this.width/2;this.x=Math.max(m,Math.min(CONFIG.canvas.width-m,this.x+dir*this.curWalkSpeed()*(this._superRunning?CONFIG.physics.runMultiplier:1)));}if(this.state!=='super')this._superMoveDir=0;};
 const unlock=f=>{if(f.state==='super'&&f.activeUltimate?.kind==='seven-star-execution'){f.currentAttack=null;f.setState(f.onGround?'idle':'jump');}};
 const dash=Fighter.prototype.dash,combo=Fighter.prototype.comboAttack,jump=Fighter.prototype.jump;
 Fighter.prototype.dash=function(){if(!(this.dashCooldownLeft>0))unlock(this);return dash.call(this);};
 Fighter.prototype.comboAttack=function(kind){unlock(this);if(kind==='launcher'&&this.activeUltimate?.kind==='seven-star-execution'){if(this.state==='dash'){this.dashLeft=0;this.setState('idle');}const enemy=this===window.game?.p1?window.game.p2:window.game?.p1;if(enemy){this.facing=Math.sign(enemy.x-this.x)||this.facing;this.pendingFacing=this.facing;}}return combo.call(this,kind);};
 Fighter.prototype.jump=function(dir){unlock(this);return jump.call(this,dir);};
 const snap=Fighter.prototype.toSnapshot,apply=Fighter.prototype.applySnapshot,reset=Fighter.prototype.resetForRound;
 Fighter.prototype.toSnapshot=function(){return{...snap.call(this),superMove:this._superMoveDir||0,superRunning:!!this._superRunning};};
 Fighter.prototype.applySnapshot=function(data){apply.call(this,data);this._superMoveDir=data.superMove||0;this._superRunning=!!data.superRunning;};
 Fighter.prototype.resetForRound=function(...args){this._superMoveDir=0;this._superRunning=false;return reset.apply(this,args);};
 const input=Game.prototype.applyInput;
 Game.prototype.applyInput=function(f,inp){if(f.activeUltimate?.kind==='seven-star-execution'&&inp.atk&&inp.u&&f.onGround&&!(f.rootLeft>0)&&['idle','walk','super','dash'].includes(f.state)){input.call(this,f,{...inp,atk:false});f.comboAttack('launcher');return;}return input.call(this,f,inp);};
 const cast=Fighter.prototype.castSuper;
 Fighter.prototype.castSuper=function(){if(this.charId==='noble'&&!this.activeUltimate&&this.onGround&&this.meter>=CONFIG.resources.superCost&&(this.state==='dash'||this.state==='attack'&&this.currentAttack===this.def.launcher&&(this.hasHit||this.stateTimer>=this.curEff().startup+this.curEff().active))){this.dashLeft=0;this.currentAttack=null;this.setState('idle');}return cast.call(this);};
})();
