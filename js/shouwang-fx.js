// Reuses the combat WebGL renderer, event budget and disposal in JiankeFX.
// Cyan rune light, broad steel trails, weighty stone impacts: both forms share timings.
export class ShouwangFX {
 constructor(){this.previous=new WeakMap();}
 get fx(){return window.jiankeFX;}
 clear(){this.previous=new WeakMap();}
 line(x,y,d,length=90,angle=0,color=0xcaffef){const fx=this.fx;if(!fx)return;fx.streak(x,y,d,length,angle);fx.events.at(-1).mesh.material.color.setHex(color);}
 sweep(f,kind='slash',power=1){const fx=this.fx;if(!fx)return;const x=f.x+f.facing*12,y=f.y,d=f.facing,low=kind==='low',rise=kind==='rise';for(let i=0;i<4;i++)fx.ribbon(x,y-(low?14:62),d,(62+i*6)*power,(low?15:60+i*4)*power,rise?.1:-1.65,rise?-2.8:1.6,(i?2:11)*power,.24+i*.04,rise?-.3:low?0:.2,i?0x6aa6d4:0xeafff7);fx.dust(f.x,y,d,Math.round(8*power),power);}
 runes(f,power=1){const fx=this.fx;if(!fx)return;if(window.characterMagic){window.characterMagic.ward(fx,f.x,f.y-60,42*power,power);return;}for(let i=0;i<7;i++){const a=i*Math.PI*2/7+fx.time*2,x=f.x+Math.cos(a)*30*power,y=f.y-55+Math.sin(a)*48*power;this.line(x,y,1,7,-a,0x69e6bd);}fx.ribbon(f.x,f.y-5,f.facing,42*power,9,-Math.PI,Math.PI,3,.3,0,0x67dfb7);}
 emit(f,key){const fx=this.fx;if(!fx)return;const x=f.x,y=f.y,d=f.facing;
 if(key==='super_'){this.sweep(f,'slash',1.9);for(let i=0;i<5;i++)this.line(x+d*(30+i*16),y-80,d,145-i*13,-1.42, i%2?0x8cbaed:0xf1fff7);fx.ribbon(x+d*62,y-2,d,120,21,-Math.PI,Math.PI,9,.5,0,0xb0d6ff);fx.dust(x+d*40,y,d,30,1.9);this.runes(f,1.7);}
 else if(key==='launcher')this.sweep(f,'rise',1.4);
 else if(key==='low')this.sweep(f,'low',1.4);
 else if(['dashAttack','parryCounter'].includes(key)){this.line(x,y-56,d,125,0);this.sweep(f,'slash',1.2);}
 else if(key==='airAttack'){this.sweep(f,'slash',1.35);this.line(x+d*22,y-55,d,95,.1);}
 else if(key==='u'){this.sweep(f,'slash',1.2);this.runes(f);}
 else this.sweep(f,'slash',key==='j3'?1.55:1);
 }
 actor(f){if(f?.charId!=='shouwang'||!this.fx)return;const p=this.previous.get(f)||{state:'',timer:-1,form:f.form},t=f.stateTimer,state=f.state,key=f._animForState(),reset=p.state!==state||t<p.timer||p.attack!==f.currentAttack;
 if(reset)p.contact=false;
 if((state==='attack'||state==='super')&&f.currentAttack&&!f.currentAttack.signatureArt){const a=f.curEff();if(t>=a.startup&&t<a.startup+a.active&&!p.contact){this.emit(f,key);p.contact=true;}}
 if(state==='skill'&&!f.currentCast?.rangedArt){const su=f.currentCast?.startup??f.def.skill.startup;if(t>=su&&!p.contact){this.emit(f,'u');p.contact=true;}}
 if(p.form!==f.form){this.runes(f,2);this.fx.dust(f.x,f.y,f.facing,26,1.4);for(let i=0;i<10;i++)this.line(f.x+(i%2?1:-1)*(i*4),f.y-18-i*10,f.facing,16,i*.7,0x9faeb7);}
 if(reset){if(state==='dash'){this.line(f.x-f.facing*30,f.y-48,-f.facing,100);this.fx.dust(f.x,f.y,-f.facing,12);}if(['hit','guardbreak'].includes(state)){for(let i=0;i<5;i++)this.line(f.x,f.y-65,f.facing,23,(i-2)*.6,i%2?0xffcd8c:0xbaffef);}if(['ko','knockdown'].includes(state))this.fx.dust(f.x,f.y,f.facing,22,1.3);if(['block','parry'].includes(state))this.fx.ribbon(f.x+f.facing*23,f.y-58,f.facing,24,52,-1.6,1.6,5,.32,0,0xd4e8ff);}
 if(f.landingTicks>0&&!p.land)this.fx.dust(f.x,f.y,f.facing,14,1.15);
 if(state==='walk'){const foot=Math.floor(t/26);if(foot!==p.foot)this.fx.dust(f.x,f.y,-f.facing,3,.3);p.foot=foot;}else p.foot=-1;
 if(['charge','parry'].includes(state)&&Math.floor(t/12)!==p.runeTick){this.runes(f,state==='charge'?1:.7);p.runeTick=Math.floor(t/12);}else if(!['charge','parry'].includes(state))p.runeTick=-1;
 Object.assign(p,{state,timer:t,attack:f.currentAttack,form:f.form,land:f.landingTicks>0});this.previous.set(f,p);}
 projectile(p){const fx=this.fx;if(!fx)return;const d=Math.sign(p.vx)||p.fxDir||1,r=p.size||22;for(let i=0;i<3;i++)fx.ribbon(p.x-i*d*7,p.y,d,r*1.3,r*1.7,-1.5,1.5,i?2:7,.06,0,i?0x7ca7c9:0xd2eeff);this.line(p.x-d*25,p.y,d,35,0,0xa8d9ff);}
}
window.shouwangFX=new ShouwangFX();
