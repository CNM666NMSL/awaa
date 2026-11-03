/* Original isolated key poses: expanded crossfades produced extra bodies during air steering. */
(()=>{
 for(const id of ['noble','jianke','shouwang']){
  const path='assets/chars/mobility-v1/'+(id==='shouwang'?'{form}':id);
  const base={frames:4,fps:24,loop:false,referenceHeight:240,canvasHeight:320,originX:210/512,originY:298/320,assetVersion:'clean-air1'};
  const a=CONFIG.characters[id].anims;
  a.airMove={...base,path:path+'/airMove',airTravel:true};
  a.jump={...a.airMove};
  a.doubleJump={...base,path:path+'/doubleJump'};
 }
})();
