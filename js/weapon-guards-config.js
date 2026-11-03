/* Character-specific, single-silhouette defensive stances. Wuxiang keeps the umbrella guard. */
(()=>{
 const names={noble:'礼剑·辉光架势',jianke:'寒锋·横剑架挡',armored:'重铠·巨剑壁垒',unarmored:'奥术·掌盾架势',motong:'幽瞳·触腕护身',liequan:'猎装·枪架护身'};
 for(const id of CONFIG.roster){if(id==='wuxiang')continue;const d=CONFIG.characters[id];d.weaponGuard=true;d.guardName=names[id]||'守望架势';
  d.anims.block={path:'assets/chars/weapon-guards-v1/'+(id==='shouwang'?'{form}':id),frames:1,fps:60,loop:false,referenceHeight:250,canvasHeight:384,originX:.5,originY:356/384,steadyGuard:true,assetVersion:'weapon-guards1'};
  d.anims.parry={...d.anims.block};
 }
 window.weaponGuardNames=names;
})();
