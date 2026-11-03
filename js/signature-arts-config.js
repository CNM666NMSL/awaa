/* Character-specific charged finishers and sustained ultimates. */
(() => {
    for(const id of CONFIG.roster)CONFIG.characters[id].maxHealth=2500;
    const make=(def,extra)=>({...def.super_,multiHit:false,damage:0,lunge:0,startup:0,active:360,recovery:0,fixedAnimationTiming:true,...extra});
    const j=CONFIG.characters.jianke,n=CONFIG.characters.noble,w=CONFIG.characters.shouwang;
    for(const a of [...j.combo,j.launcher,j.low,j.dashAttack,j.airAttack,j.skill])if(a?.damage)a.damage=Math.round(a.damage*1.15);
    j.super_=make(j,{name:'万剑归宗',signatureArt:'sword-domain',active:38,duration:480,pulseDamage:150,pulses:8,radius:j.width*3});
    n.super_=make(n,{name:'七星斩杀魔法阵',signatureArt:'seven-star-execution',active:38,duration:360,pulseDamage:180,pulses:6,invulnerable:true,lockOn:true});
    w.super_=make(w,{name:'巨石重载',signatureArt:'tracking-meteors',active:38,duration:360,pulseDamage:300,pulses:3,
        forms:{unarmored:{name:'巨石重载·地脉石柱',signatureArt:'earth-pillars',reachBodies:10,rangeBodies:10,range:w.width*10}}});
    j.skill.thirdStageName='寒霜重剑·横劈';n.skill.thirdStageName='七星天罚';w.skill.thirdStageName='天外陨石';
    for(const id of CONFIG.roster)if(CONFIG.characters[id].anims?.super_)CONFIG.characters[id].anims.super_.fps=40;
})();
