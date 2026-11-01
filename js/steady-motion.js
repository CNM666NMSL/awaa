/* Each normal starts six simulation ticks later, regardless of resource speed bonuses. */
(()=>{
 const duration=Fighter.prototype.atkDur;
 Fighter.prototype.atkDur=function(a,key){const result=duration.call(this,a,key);return result+(key==='startup'&&this.def.combo.includes(a)?6:0);};
 const anim=Fighter.prototype._updateAnim;
 Fighter.prototype._updateAnim=function(){if(this.state==='block'){this.animKey='block';this.animFrame=0;this.animTimer=0;return;}return anim.call(this);};
 const sprite=Fighter.prototype._drawSprite;
 Fighter.prototype._drawSprite=function(c,img){if(this.state!=='block')return sprite.call(this,c,img);const q=Math.min(1,this.stateTimer/36),lean=(1-q)*(1-q)*.025;c.save();c.translate(this.x,this.y);c.rotate(-this.facing*lean);c.translate(-this.x,-this.y);sprite.call(this,c,img);c.restore();};
})();