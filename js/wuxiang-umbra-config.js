/* Wuxiang: umbrella/revolver kit. Costs and timings are simulation ticks at 60 Hz. */
(()=>{
 const d=CONFIG.characters.wuxiang;
 d.maxMeter=100;d.chargePerSecond=CONFIG.resources.chargePerSecond;
 window.umbraKit={magazine:5,reload:90,shotCooldown:120,bulletDamage:68,blastDamage:150,wallLife:720,wallCooldown:240,rainLife:480,slow:.7,haste:1.25};
 const clip=(name,frames=12,extra={})=>({path:'assets/chars/wuxiang-umbra-v2/'+name,assetVersion:'umbra2',frames,fps:40,loop:false,referenceHeight:250,canvasHeight:384,originX:.5,originY:356/384,...extra});
 Object.assign(d.anims,{
  wsHandle:clip('handle',12,{phases:[5,8]}),wsUpper:clip('upper',12,{phases:[5,8]}),wsSlide:clip('slide',16,{phases:[5,12]}),wsGunReload:clip('gun-reload',20,{phases:[5,8]}),
  wsReload:clip('reload',12),block:clip('guard',1,{steadyGuard:true}),wsGlide:clip('glide',12,{loop:true}),wsAirShot:clip('air-shot',12,{fitState:true,contact:3}),wsDive:clip('dive',12),wsSweep:clip('sweep',12,{phases:[5,8]}),
  wsExecution:clip('execution',25,{phases:[5,20]}),wsBurst:clip('burst',25,{phases:[5,20]}),wsRain:clip('rain',12),
  wsGroundShot:clip('ground-shot',12,{fitState:true,contact:3}),
 });
 const attack=(name,anim,damage,extra={})=>({name,anim,damage,range:88,hitY:85,hitHeight:100,startup:12,active:8,recovery:20,hitstun:18,knockback:3,gainLayers:1,deferKnockdown:true,comboChain:true,...extra});
 d.umbraCombo=[attack('1A·伞柄平推','wsHandle',36),attack('2A·顺势挑击','wsUpper',42,{launch:-11}),attack('3A·滑铲换位 / 开伞','wsSlide',66,{wsSlide:true,startup:10,active:22,recovery:18,lunge:6}),attack('4A·左轮上射 / 换弹','wsGunReload',90,{wsGun:true,startup:10,active:6,recovery:36})];
 d.low=attack('伞骨横扫·击倒','wsSweep',55,{wsDown:true,range:105,hitY:48,hitHeight:64});
 d.launcher=attack('伞尖挑击','wsUpper',58,{launch:-11});
 d.airAttack=attack('伞尖坠刺','wsDive',70,{wsDive:true,wsDown:true,startup:3,active:100,recovery:12,hitY:22,hitHeight:80,range:40});
 Object.assign(d.skill,{name:'五响左轮·第五发爆裂',damage:68,startup:6,recovery:18});
 const superAttack=(name,anim,life)=>attack(name,anim,0,{startup:0,active:life,recovery:0,fixedAnimationTiming:true,wsSuper:true});
 d.nightSupers={execution:superAttack('夜幕刑奏·伞锁连射','wsExecution',126),rain:superAttack('雾雨夜行','wsRain',40),burst:superAttack('开伞逐月','wsBurst',48)};
 d.super_=d.nightSupers.execution;
 d.profile=['伞柄四连、五响左轮与开伞滑翔。雾雨控制距离，瞬身伞锁接爆裂终弹。','I 100气 / S+I 67气 / W+I 33气'];
})();
