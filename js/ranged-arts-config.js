/* Four ranged identities; apply after animation configs and the complete roster. */
(() => {
    const shared={rangedArt:true,chargeThresholds:[0,60,150],stageMultipliers:[1,1.4,1.8],fullDouble:false};
    Object.assign(CONFIG.characters.jianke.skill,shared,{name:'居合寒霜剑气',projectileKind:'frost-wave',projectileColor:'#ecfaff',damageType:'physical',projSpeed:16,projSize:12,projHitWidth:76,projHitHeight:18,projX:55,projY:.58});
    Object.assign(CONFIG.characters.noble.skill,shared,{name:'金色贯穿光剑',projectileKind:'golden-lance',projectileColor:'#ffd676',damageType:'magic',projSpeed:18,projSize:12,projHitWidth:88,projHitHeight:18,projX:56,projY:.64,piercing:true});
    Object.assign(CONFIG.characters.shouwang.skill,shared,{name:'聚能魔法冲击波',projectileKind:'arcane-shock',projectileColor:'#63e998',damageType:'magic',projSpeed:12,projSize:28,projHitWidth:58,projHitHeight:64,projX:52,projY:.28,
        forms:{unarmored:{name:'绿色奥术魔法射线',projectileKind:'arcane-ray',projectileColor:'#8cffa6',damageType:'magic',projSpeed:17,projSize:12,projHitWidth:110,projHitHeight:16,projX:52,projY:.62}}});
    for(const id of ['jianke','noble','shouwang']){
        const def=CONFIG.characters[id],identity=id==='shouwang'?'{form}':id;
        def.rangedArt=true;
        const clip={frames:12,fps:24,loop:false,referenceHeight:250,canvasHeight:384,originX:210/512,originY:356/384};
        def.anims.uCharge={...clip,path:`assets/chars/ranged-arts-v1/${identity}/charge`,chargeStages:[0,60,150],stageFrames:4,stageTransition:18};
        def.anims.u={...clip,path:`assets/chars/ranged-arts-v1/${identity}/release`,fitState:true,contact:5};
        def.anims.uCharged={...def.anims.u};
    }
})();
