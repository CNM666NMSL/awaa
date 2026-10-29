/* Character identities from the three supplied design references. Load after base animation configs. */
(() => {
    const concepts = {
        motong: {name:'伊芙琳',title:'幽络观测者',color:'#5be1bc',dark:'#164a44',height:104,speed:4.8,resource:'瞳印',
            profile:['墨绿长发与眼杖连接幽络，以触手和符阵约束敌人的行动。','中距牵制 / 瞳符控场'],
            combo:['点瞳','缠枝','挑魂','幽络合击'],ranged:'瞳符脉冲',special:'玄瞳锁域',ultimate:'万象归瞳',damage:[34,40,54,88],specialDamage:65},
        liequan: {name:'猎犬旅者',title:'赤符逐猎者',color:'#f28c72',dark:'#692e32',height:110,speed:5.2,resource:'猎印',
            profile:['红帽与绷带下的猎人，持双管猎枪与短刀，与灰狼同行。赤符脉冲与狼影构成追猎攻势。','枪刃连击 / 狼影追击'],
            combo:['枪托击','猎刃扫','上撩击','破阵重击'],ranged:'赤符猎弹',special:'狼影追猎',ultimate:'百狩·赤月围猎',damage:[38,42,56,92],specialDamage:135},
        wuxiang: {name:'无相司夜',title:'霓城执伞人',color:'#b6a5ff',dark:'#413466',height:116,speed:4.9,resource:'镜印',
            profile:['礼帽下的无相面具不露声色。黑伞、左轮与八卦回路组成精确的攻防系统。','伞刃突刺 / 镜域反射'],
            combo:['伞锋点','回伞扫','挑灯式','夜幕合伞'],ranged:'纸伞雷符',special:'八卦镜域',ultimate:'无相·霓城敕令',damage:[36,42,55,90],specialDamage:50}
    };
    for (const [id,c] of Object.entries(concepts)) {
        const attack=(name,damage,extra={})=>({name,damage,range:92,hitY:c.height*.6,hitHeight:68,startup:10,active:8,recovery:15,knockback:4,hitstun:22,gainLayers:1,...extra});
        const combo=c.combo.map((name,i)=>attack(name,c.damage[i],{anim:'j'+(i+1),startup:i===3?14:10,active:8,recovery:i===3?20:14,knockback:i===3?9:3,hitstun:i===3?32:22,deferKnockdown:i<3,comboChain:true,lunge:i===3?3:0}));
        CONFIG.characters[id]={name:c.name,title:c.title,profile:c.profile,cyberChinese:true,color:c.color,colorDark:c.dark,
            sprite:`assets/chars/cyber-v1/${id}/portrait.png`,anims:CYBER_ANIMS[id],width:44,height:c.height,walkSpeed:c.speed,maxHealth:2000,
            resource:{name:c.resource,max:5,damagePerLayer:.04,desc:`命中积攒${c.resource}，满 5 层后按 O / 6 消耗全部资源施放「${c.special}」。`},combo,
            launcher:attack('上攻·'+c.combo[2],58,{anim:'launcher',hitY:108,hitHeight:100,launch:-12,range:80,recovery:19}),
            low:attack('下攻·'+c.combo[1],50,{anim:'low',hitY:34,hitHeight:40,guardBreak:true,range:92,recovery:20}),
            dashAttack:attack('踏影·'+c.combo[0],56,{anim:'dashAttack',range:125,lunge:6,startup:8,recovery:18}),
            airAttack:attack('空中·'+c.combo[3],46,{anim:'airAttack',below:true,range:70,hitHeight:74,startup:8,recovery:14}),
            skill:{name:c.ranged,damage:id==='liequan'?68:62,cost:0,projSpeed:id==='liequan'?13:10,projSize:id==='motong'?18:14,projY:.6,startup:12,recovery:20},
            special:{type:'resource-cast',name:c.special,damage:c.specialDamage},
            superTiers:{lunge:attack('疾影·'+c.combo[0],150,{anim:'superLunge',cost:0,lunge:10,range:115,startup:12,active:12,recovery:20,tier:1}),wave:{name:'破阵·'+c.ranged,anim:'superWave',cost:0,damage:215,projSpeed:8,projSize:32,projY:.6,startup:16,recovery:24,guardBreak:true,tier:2}},
            super_:{name:c.ultimate,anim:'super_',multiHit:true,hits:5,interval:12,startup:40,active:60,recovery:45,perHit:38,finalDamage:165,range:id==='motong'?260:310,hitY:70,hitHeight:150,hitstun:38,knockback:12,launch:-10,guardBreak:true,fixedAnimationTiming:true}
        };
        if(!CONFIG.roster.includes(id))CONFIG.roster.push(id);
    }
})();
