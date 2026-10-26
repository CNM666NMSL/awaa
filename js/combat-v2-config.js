// Version 2 action definitions: generated ranged poses and fourth combo finishers.
for(const id of CONFIG.roster){const d=CONFIG.characters[id];const base='assets/chars/combat-v2/'+(id==='shouwang'?'{form}':id)+'/';
 for(const [name,frames,phases]of [['u',6,[3,4]],['j4',7,[3,5]],['uCharged',7,[4,5]],['uCharge',4,null]])d.anims[name]={frames,path:base+name,contact:phases?.[0]??3,fps:18,loop:name==='uCharge',phases,fitState:name==='u'||name==='uCharged',referenceHeight:210,canvasHeight:320,originX:190/512,originY:300/320};
 const fourth={noble:['七芒终刺',84,8,6,20,100],jianke:['断水重斩',98,10,7,23,105],shouwang:['圣锤裁断',110,12,8,25,100]}[id];d.combo=d.combo.slice(0,3);for(const a of d.combo){a.gainLayers=a.gainLayers||1;a.deferKnockdown=true;a.comboChain=true;}d.combo.push({name:fourth[0],anim:'j4',damage:fourth[1],startup:fourth[2],active:fourth[3],recovery:fourth[4],range:fourth[5],hitY:d.height*.6||80,hitHeight:70,hitstun:30,knockback:9,gainLayers:1,lunge:4});
 d.resource.desc='命中积攒'+d.resource.name+'，攒满后 O / 6 消耗全部资源释放专属特殊技。';
 d.special={type:'resource-cast',name:{noble:'七芒禁锢',jianke:'断水巨剑',shouwang:'圣印壁柱'}[id]};
}
