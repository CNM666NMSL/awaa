/* New Evelyn pose sets are preloaded with the other sprite assets. */
for(const name of ['ev1','ev2','ev3','ev4','ev5','evSuper','evRange'])CONFIG.characters.motong.anims[name]={frames:name==='evSuper'?25:10,path:'assets/chars/evelyn-v2/'+name,fps:name==='evSuper'?40:30,loop:false,referenceHeight:250,canvasHeight:384,originX:.5,originY:356/384,fitState:name!=='evSuper',contact:name==='evSuper'?12:6};
for(const name of ['ev1','ev2','ev3','ev4','ev5'])CONFIG.characters.motong.anims[name].phases=[6,8];
