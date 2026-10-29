/* Silver revolver from the user's original character sheet. Generated poses: built-in image_gen. */
(()=>{const d=CONFIG.characters.wuxiang;
Object.assign(d.skill,{name:'左轮·火花弹',projectileKind:'revolver',projectileColor:'#ffc477',projSpeed:18,projSize:8,projX:54.54,projY:0.9214});
const clip={"frames":12,"fps":24,"loop":false,"referenceHeight":250,"canvasHeight":384,"originX":0.41015625,"originY":0.9270833333333334};
d.anims.u={...clip,path:'assets/chars/wuxiang-revolver-v1/shoot',fitState:true,contact:5};
d.anims.uCharged={...d.anims.u,path:'assets/chars/wuxiang-revolver-v1/charged'};
d.anims.uCharge={...clip,path:'assets/chars/wuxiang-revolver-v1/aim'};
})();
