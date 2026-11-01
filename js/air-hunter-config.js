/* Clean, single-silhouette aerial rushes and the traveler's shotgun/wolf kit. */
(()=>{
 window.airHunterKit={followupWindow:90,trapBind:180,trapSlow:180,slowScale:.65,superDamage:380,burnDamage:10,burnTicks:600};
 const clip=(path,n=12,extra={})=>({path:'assets/chars/air-hunter-v1/'+path,frames:n,fps:40,loop:false,referenceHeight:250,canvasHeight:384,originX:.5,originY:356/384,assetVersion:'air-hunter1',...extra});
 for(const id of CONFIG.roster){const d=CONFIG.characters[id],previous=d.airAttack||{};d.airAttack={name:{jianke:'飞剑先行·坠空',noble:'辉环俯冲',shouwang:'圣盾坠击',motong:'幽缚·坠踢',liequan:'猎靴下击',wuxiang:'伞尖破防坠刺'}[id],damage:previous.damage||55,anim:'airRush',airRush:true,airGuardBreak:true,guardBreak:true,range:65,hitHeight:70,hitY:24,startup:0,active:160,recovery:0,hitstun:24,knockback:4,gainLayers:1,deferKnockdown:true,fixedAnimationTiming:true};
  d.anims.airRush=id==='wuxiang'?{...d.anims.wsDive}:id==='liequan'?clip('liequan/dive'):clip((id==='shouwang'?'{form}':id)+'/rush');
 }
 const d=CONFIG.characters.liequan;
 Object.assign(d.anims,{huntStock1:clip('liequan/stock1',12,{phases:[5,8]}),huntStock2:clip('liequan/stock2',12,{phases:[5,8]}),huntStock3:clip('liequan/stock3',12,{phases:[5,8]}),huntFire:clip('liequan/fire',12,{phases:[5,8]}),huntSweep:clip('liequan/sweep',12,{phases:[5,8]}),huntCall:clip('liequan/call',12,{fitState:true,contact:5}),huntSuper:clip('liequan/super',25,{phases:[6,20]})});
 Object.assign(d.skill,{name:'猎犬扑咬 / 苍焰巨犬 / 幽灵狼袭',projectileKind:'hunter-wolf',projectileColor:'#80d9ff',rangedArt:true,damage:68,projSpeed:11,projSize:48,projHitWidth:62,projHitHeight:54,projY:.32,projX:55,chargeThresholds:[0,60,150],stageMultipliers:[1,1.55,2.3],startup:12,recovery:22});
 d.super_={name:'苍焰·幽狼噬猎',anim:'huntSuper',hunterSuper:true,damage:380,startup:18,active:72,recovery:18,range:d.width*7,rangeBodies:7,hitHeight:160,hitY:100,hitstun:32,knockback:10,guardBreak:false,fixedAnimationTiming:true};
 d.profile=['枪托五连、三段蓄力狼袭。下冲命中可追加束缚夹，幽灵狼命中可追加减速夹。','苍焰幽狼 · 七身位突进 / 灼烧10秒'];
 window.airHunterAssets={head:Array.from({length:12},(_,i)=>'assets/chars/air-hunter-v1/wolf-head/'+String(i).padStart(2,'0')+'.png?'+ 'v=air-hunter1')};
})();
