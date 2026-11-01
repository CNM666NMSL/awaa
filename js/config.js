/* ============================================================
   config.js — 《百兽夜行》对决模式 · 所有可调参数集中在这里
   后期改数值、加角色、加场景、加招式，主要改这个文件
   ============================================================ */

// 素材缓存版本号：每次替换/修改 assets 下的图片后，把这个值 +1
// （JS/CSS 靠 index.html 的 ?v= 刷新，图片靠这个）
const ASSET_VER = "20261028-motion-v2";

const CONFIG = {
    // ---------- 画布与场景 ----------
    canvas: {
        width: 1200,
        height: 540,
        groundY: 460,
        wallMargin: 20,
    },

    // ---------- 平台/台阶（单向平台：从上方落下可站立，从下方跳起可穿过）----------
    // 每个平台 { x, y(顶面), w, h }，坐标系：y 越大越靠下，顶面 y 是站立高度
    // 画布 1200 宽，groundY=460，单跳约 140px、二段跳更高
    // 布局原则：所有平台均为「立柱」（底边延伸到地面），x 完全错开不重叠，
    //          左右对称 + 中央留主战场空地，高度分三层可逐级攀跳
    platforms: [],

    // ---------- 物理 ----------
    physics: {
        gravity: 0.8,
        jumpForce: -15,
        moveSpeed: 5.2,        // 地面移动速度（提升，走位更跟手）
        runMultiplier: 1.65,
        doubleTapFrames: 15,
        airAcceleration: 1.1,
        airAttackControl: 0.85,
        airControl: 0.92,      // 空中水平速度系数（提高，空中转向更跟手）
        jumpHop: 4.0,          // 起跳水平初速（加大，前跳/后跳距离更远）
        friction: 0.85,
        dashSpeed: 0,         // 冲刺速度
        dashDistance: 150,      // 瞬移距离（游戏像素）
        dashFrames: 12,        // 冲刺持续帧
        dashInvuln: 8,        // 冲刺前 N 帧无敌（闪避用，加长更实在）
    },

    // ---------- 核心资源（设计文档 三.1） ----------
    resources: {
        maxChargeSeconds: 7,
        rangedCooldownSeconds: 2,
        maxHealth: 2500,       // 基础血量
        maxMeter: 100,         // 气槽上限：300 点（连续一条，UI 切 3 色分区）
        meterOnHit: 5,        // 普攻/技能命中攒气（点）
        meterOnHurt: 3.3333333333,       // 受击攒气（点）
        meterOnBlock: 4,      // 成功格挡攒气（点）
        skillCost: 0,         // 普通技能不耗气
        superCost: 100,        // I 终式超必杀需满气
        // ---- 蓄气 / 三段式必杀 ----
        chargePerSecond: 26.6666666667,   // 按住 蓄气键 每秒攒气点（约 3.75 秒攒满）
        chargeHurtMult: 1.5,   // 蓄气破绽惩罚：蓄气期间受到的伤害 ×1.5
        tapFrames: 10,         // 蓄气键按下 ≤N 帧算「点按」（现在蓄气键已独立，此值基本无用）
        tier1Cost: 0,        // 一段必杀耗气：疾影突（贴脸突进斩）
        tier2Cost: 0,        // 二段必杀耗气：裂空波（大型飞行剑气）
        // ---- 瞬步（瞬移）----
        dashCost: 0,          // 瞬步不耗气
        dashCooldown: 40,      // 瞬步冷却帧数（约 0.66 秒），期间不能再次瞬步
        slowmoFrames: 18,      // 瞬步时缓持续帧数（对方推进减半，突出闪避）
        slowmoDivisor: 2,      // 时缓期间非瞬步方每 N 帧推进 1 帧
    },

    // ---------- 回合规则 ----------
    round: {
        time: 180,             // 每局三分钟（真实时间流速）
        introFrames: 180,
        koFreezeFrames: 70,
    },

    // ---------- 赛制（设计文档 二.4） ----------
    formats: {
        single: { name: "单局决胜", winsNeeded: 1 },
        bo3:    { name: "三局两胜", winsNeeded: 2 },
    },

    // ---------- 统一操作按键（设计文档 四，两台电脑完全一致） ----------
    keys: {
        left:    "KeyA",   // 左移
        right:   "KeyD",   // 右移
        up:      "KeyW",   // 上挑组合键 / W+J 上攻（不跳跃）
        down:    "KeyS",   // 下蹲 / 按住格挡 / 受击瞬间按=受身 / S+J 下攻
        attack:  "KeyJ",   // 普攻（可连击3段）
        jump:    "KeyK",   // 跳跃（支持二段跳）
        dash:    "KeyL",   // 冲刺
        skill:   "KeyU",   // 远攻技能
        super_:  "KeyI",   // 超必杀（按气量放三档必杀，满气=终式）
        special: "KeyO",   // 特殊机制技
        charge:  "KeyP",   // 按住蓄气，最多 7 秒，到时需松键后再次起手
    },

    // ---------- 通用战斗机制（设计文档 三.3） ----------
    mechanics: {
        blockDamageRatio: 0.3,   // 格挡减免 70%（即承受 30%）
        ukemiWindow: 20,         // 受击后 N 帧内按防御可受身
        ukemiRecover: 0.45,      // 受身后剩余硬直 × 此系数
        maxJumps: 2,             // 二段跳

        // ---- 倒地与连段保护 ----
        hitFriction: 0.7,        // 受击击退摩擦（比普通 friction 更快衰减，杜绝「缓缓后退不停」）
        knockbackStop: 0.35,     // 击退速度低于此阈值直接清零（像素/帧）
        knockdownDamage: 180,    // 同一连段累计伤害 ≥ 此值 → 强制倒地脱身
        knockdownHitCount: 8,    // 同一连段命中次数 ≥ 此值 → 强制倒地（防无限连）
        comboDamageDecay: 0.12,  // 连段内每多 1 次命中，后续伤害递减 12%（保底 30%）
        knockdownInvuln: 14,     // 倒地后起身无敌帧数
        knockdownFrames: 26,     // 倒地躺平时长（起身前不可行动、不可被连）
    },

    // ============================================================
    // 首发 5 名角色 + BOSS 玄鸦（设计文档 一：专属机制形成差异化）
    // 后期替换人物模型时：改 color / 或重写 fighter.js 的 draw()
    // attacks 帧数据说明：startup=前摇 active=判定帧 recovery=后摇
    // ============================================================
    characters: {
        canglang: {
            name: "苍狼", title: "迅影之爪",
            color: "#4a90d9", colorDark: "#2a5a9e",
            width: 44, height: 110, walkSpeed: 5.2,
            resource: { name: "狼魂", max: 3, desc: "O键积攒狼魂，每层提升8%伤害" },
            combo: [  // J 三段普攻
                { damage: 40, range: 62, hitHeight: 40, startup: 5, active: 4, recovery: 10, knockback: 3, hitstun: 14 },
                { damage: 45, range: 64, hitHeight: 40, startup: 5, active: 4, recovery: 12, knockback: 4, hitstun: 16 },
                { damage: 70, range: 70, hitHeight: 46, startup: 7, active: 5, recovery: 18, knockback: 8, hitstun: 24 },
            ],
            launcher: { damage: 60, range: 58, hitHeight: 70, startup: 8, active: 5, recovery: 20, knockback: 3, hitstun: 26, launch: -9 },   // W+J 浮空
            low:      { damage: 55, range: 66, hitHeight: 26, startup: 9, active: 5, recovery: 20, knockback: 5, hitstun: 22, guardBreak: true }, // S+J 破防
            skill:    { damage: 70, cost: 0, projSpeed: 9, projSize: 14, startup: 10, recovery: 18 },  // U 远攻
            super_:   { damage: 260, range: 110, hitHeight: 90, startup: 14, active: 8, recovery: 30, knockback: 12, hitstun: 40, guardBreak: true },
        },
        xuanwu: {
            name: "玄武", title: "不动钢壁",
            color: "#5cb85c", colorDark: "#2e6b2e",
            width: 52, height: 118, walkSpeed: 3.8,
            resource: { name: "钢甲", max: 5, desc: "O键获得钢甲层数，每层减伤6%" },
            combo: [
                { damage: 48, range: 58, hitHeight: 44, startup: 7, active: 4, recovery: 12, knockback: 4, hitstun: 15 },
                { damage: 52, range: 60, hitHeight: 44, startup: 7, active: 4, recovery: 14, knockback: 5, hitstun: 17 },
                { damage: 85, range: 66, hitHeight: 50, startup: 9, active: 5, recovery: 22, knockback: 10, hitstun: 26 },
            ],
            launcher: { damage: 68, range: 54, hitHeight: 74, startup: 10, active: 5, recovery: 24, knockback: 3, hitstun: 26, launch: -8 },
            low:      { damage: 64, range: 62, hitHeight: 26, startup: 11, active: 5, recovery: 24, knockback: 6, hitstun: 24, guardBreak: true },
            skill:    { damage: 85, cost: 0, projSpeed: 7, projSize: 20, startup: 14, recovery: 24 },
            super_:   { damage: 300, range: 100, hitHeight: 100, startup: 16, active: 8, recovery: 34, knockback: 14, hitstun: 44, guardBreak: true },
        },
        baize: {
            name: "白泽", title: "阴阳术士",
            color: "#e8e8e8", colorDark: "#999999",
            width: 44, height: 108, walkSpeed: 4.6,
            resource: { name: "阴阳值", max: 100, desc: "O键切换阴阳形态：阳增伤/阴回血" },
            combo: [
                { damage: 38, range: 64, hitHeight: 40, startup: 5, active: 4, recovery: 10, knockback: 3, hitstun: 14 },
                { damage: 42, range: 66, hitHeight: 40, startup: 5, active: 4, recovery: 12, knockback: 4, hitstun: 16 },
                { damage: 66, range: 72, hitHeight: 46, startup: 7, active: 5, recovery: 18, knockback: 8, hitstun: 24 },
            ],
            launcher: { damage: 58, range: 60, hitHeight: 70, startup: 8, active: 5, recovery: 20, knockback: 3, hitstun: 26, launch: -9 },
            low:      { damage: 52, range: 68, hitHeight: 26, startup: 9, active: 5, recovery: 20, knockback: 5, hitstun: 22, guardBreak: true },
            skill:    { damage: 65, cost: 0, projSpeed: 10, projSize: 13, startup: 9, recovery: 16 },
            super_:   { damage: 250, range: 115, hitHeight: 90, startup: 13, active: 8, recovery: 30, knockback: 12, hitstun: 40, guardBreak: true },
        },
        zhuque: {
            name: "朱雀", title: "炎羽舞空",
            color: "#e94560", colorDark: "#a02040",
            width: 42, height: 106, walkSpeed: 4.8,
            resource: { name: "炎羽", max: 4, desc: "O键点燃炎羽，消耗炎羽强化技能" },
            combo: [
                { damage: 40, range: 60, hitHeight: 40, startup: 5, active: 4, recovery: 10, knockback: 3, hitstun: 14 },
                { damage: 44, range: 62, hitHeight: 40, startup: 5, active: 4, recovery: 12, knockback: 4, hitstun: 16 },
                { damage: 68, range: 68, hitHeight: 46, startup: 7, active: 5, recovery: 18, knockback: 8, hitstun: 24 },
            ],
            launcher: { damage: 62, range: 58, hitHeight: 72, startup: 7, active: 5, recovery: 19, knockback: 3, hitstun: 26, launch: -10 },
            low:      { damage: 54, range: 64, hitHeight: 26, startup: 9, active: 5, recovery: 20, knockback: 5, hitstun: 22, guardBreak: true },
            skill:    { damage: 72, cost: 0, projSpeed: 11, projSize: 15, startup: 10, recovery: 18 },
            super_:   { damage: 270, range: 108, hitHeight: 95, startup: 14, active: 8, recovery: 30, knockback: 12, hitstun: 40, guardBreak: true },
        },
        qingluan: {
            name: "青鸾", title: "风吟游侠",
            color: "#40c4a8", colorDark: "#1e8a72",
            width: 42, height: 108, walkSpeed: 5.0,
            resource: { name: "风印", max: 3, desc: "O键获得风印，提升冲刺与跳跃机动" },
            combo: [
                { damage: 36, range: 62, hitHeight: 40, startup: 4, active: 4, recovery: 9, knockback: 3, hitstun: 13 },
                { damage: 40, range: 64, hitHeight: 40, startup: 4, active: 4, recovery: 11, knockback: 4, hitstun: 15 },
                { damage: 64, range: 70, hitHeight: 46, startup: 6, active: 5, recovery: 17, knockback: 8, hitstun: 23 },
            ],
            launcher: { damage: 56, range: 58, hitHeight: 70, startup: 7, active: 5, recovery: 19, knockback: 3, hitstun: 26, launch: -10 },
            low:      { damage: 50, range: 66, hitHeight: 26, startup: 8, active: 5, recovery: 19, knockback: 5, hitstun: 22, guardBreak: true },
            skill:    { damage: 62, cost: 0, projSpeed: 12, projSize: 12, startup: 8, recovery: 15 },
            super_:   { damage: 245, range: 112, hitHeight: 88, startup: 12, active: 8, recovery: 28, knockback: 12, hitstun: 40, guardBreak: true },
        },
        // ---------- 贵族决斗者 · 序列23【纯白剑契】（飞书文档完整设定） ----------
        noble: {
            name: "贵族决斗者", title: "序列23 · 纯白剑契",
            color: "#23263d", colorDark: "#31427e",
            sprite: "assets/chars/noble/v3/portrait.png",   // 设定集立绘，fighter.js 优先用贴图渲染
            // 按角色设定图校准的配色（覆盖默认派生）
            palette: {
                hat:    "#2a3050",   // 藏青礼帽
                cloth:  "#1c1e2e",   // 黑色贵族礼服
                cape:   "#35468c",   // 宝蓝披风（金边）
                feather:"#f2f4fc",   // 白色羽饰
                hair:   "#e8d9a0",   // 金发
                pants:  "#1c1e2e",
                boots:  "#15151f",
                accent: "#c9a227",
            },
            width: 42, height: 108, walkSpeed: 5.6, maxHealth: 2500,   // 所有模式使用相同基础血量
            // 帧动画：path 为目录，帧文件 00.png 01.png ...
            // frames 支持 number / [start,end] 闭区间 / {count,offset}
            anims: {
                idle: {"frames":8,"path":"assets/chars/noble/v3/idle","fps":8,"loop":true,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                walk: {"frames":8,"path":"assets/chars/noble/v3/walk","fps":14,"loop":true,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                j1: {"frames":9,"path":"assets/chars/noble/v3/j1","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                j2: {"frames":9,"path":"assets/chars/noble/v3/j2","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                j3: {"frames":9,"path":"assets/chars/noble/v3/j3","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                low: {"frames":9,"path":"assets/chars/noble/v3/low","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                u: {"frames":9,"path":"assets/chars/noble/v3/u","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"fitState":true,"contact":4},
                jump: {"frames":9,"path":"assets/chars/noble/v3/jump","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"physics":true},
                airAttack: {"frames":9,"path":"assets/chars/noble/v3/airAttack","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                super_: {"frames":9,"path":"assets/chars/noble/v3/super_","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6],"activeLoop":true},
                block: {"frames":6,"path":"assets/chars/noble/v3/block","fps":24,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                hit: {"frames":3,"path":"assets/chars/noble/v3/hit","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"fitHurt":true},
                fall: {"frames":3,"path":"assets/chars/noble/v3/fall","fps":16,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                knockdown: {"frames":3,"path":"assets/chars/noble/v3/knockdown","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                getup: {"frames":9,"path":"assets/chars/noble/v3/getup","fps":30,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                land: {"frames":{"offset":7,"count":2},"path":"assets/chars/noble/v3/jump","fps":30,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"physics":false},
                launcher: {"frames":9,"path":"assets/chars/noble/v3/j3","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                parry: {"frames":{"offset":1,"count":5},"path":"assets/chars/noble/v3/block","fps":24,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                parryCounter: {"frames":9,"path":"assets/chars/noble/v3/j1","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"phases":[4,6]},
                dashAttack: {"frames":9,"path":"assets/chars/noble/v3/u","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"fitState":false,"contact":4,"phases":[4,6]},
                dash: {"frames":{"offset":2,"count":4},"path":"assets/chars/noble/v3/u","fps":24,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"fitState":false,"contact":4},
                charge: {"frames":{"offset":3,"count":3},"path":"assets/chars/noble/v3/block","fps":5,"loop":true,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286},
                superLunge: {"frames":9,"path":"assets/chars/noble/v3/u","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"fitState":false,"contact":4,"phases":[4,6]},
                superWave: {"frames":9,"path":"assets/chars/noble/v3/u","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286,"fitState":true,"contact":4},
                ko: {"frames":3,"path":"assets/chars/noble/v3/knockdown","fps":18,"loop":false,"referenceHeight":288,"canvasHeight":448,"originX":0.425,"originY":0.9285714285714286}
            },
            resource: { name: "剑契", max: 5, damagePerLayer: 0.05, desc: "命中叠层：每层+3%攻速+5%伤害，5层触发「纯白剑契」" },
            combo: [   // 正手直刺→反手横划→剑身上挑，每击 +1 剑契
                { hitY: 80, damage: 36, gainLayers: 1, range: 64, hitHeight: 42, startup: 4, active: 4, recovery: 9, knockback: 3, hitstun: 14 },
                { hitY: 82, damage: 40, gainLayers: 1, range: 66, hitHeight: 42, startup: 4, active: 4, recovery: 11, knockback: 4, hitstun: 16 },
                { hitY: 105, damage: 62, gainLayers: 1, range: 70, hitHeight: 50, startup: 6, active: 5, recovery: 17, knockback: 8, hitstun: 24 },
            ],
            // L+J 滑步突刺：近身起手核心，距离长起手快，+1 剑契
            dashAttack: { hitY: 80, damage: 55, gainLayers: 1, range: 118, hitHeight: 44, startup: 4, active: 6, recovery: 16, knockback: 6, hitstun: 20, lunge: 7 },
            // 空中 J 下劈刺：垂直向下，可衔接地面连击
            airAttack:  { damage: 45, gainLayers: 1, range: 46, hitHeight: 60, startup: 5, active: 6, recovery: 10, knockback: 4, hitstun: 18, below: true },
            // W+J 晨星挑刺：挑至高空浮空，+1 剑契；满层挑高提升并追加下劈
            launcher: { hitY: 120, damage: 58, gainLayers: 1, range: 60, hitHeight: 100, startup: 6, active: 5, recovery: 18, knockback: 3, hitstun: 26, launch: -12, fullLaunch: -16, fullBonusHit: 30 },
            // S+J 低身滑刺：滑步突进破防，+2 剑契；满层突进距离翻倍+击退
            low:      { hitY: 42, damage: 50, gainLayers: 2, range: 62, hitHeight: 38, startup: 5, active: 6, recovery: 18, knockback: 5, hitstun: 22, guardBreak: true, lunge: 5, fullLunge: 10, fullKnockback: 11 },
            // U 残月剑气：纤细剑气中距快速飞行；满层双道交叉剑气+破甲
            skill:    { projY: 0.62, damage: 60, cost: 0, projSpeed: 12, projSize: 12, startup: 8, recovery: 15, fullDamageMult: 1.3, fullDouble: true, fullGuardBreak: true },
            // O 决斗招架：0.8s精准格挡，成功触发反击突刺（叠满剑契+20气），失败大硬直
            special:  { type: "parry", meterGain: 20, window: 48, failRecover: 42,
                        counter: { damage: 70, range: 84, hitHeight: 50, startup: 2, active: 6, recovery: 14, knockback: 8, hitstun: 26 } },
            superTiers: {"lunge":{"name":"疾影突","anim":"superLunge","cost":0,"damage":150,"range":100,"hitY":82,"hitHeight":36,"startup":6,"active":8,"recovery":15,"knockback":9,"hitstun":24,"lunge":12,"tier":1},"wave":{"name":"裂空波","anim":"superWave","cost":0,"damage":230,"projSpeed":7.5,"projSize":36,"projY":0.62,"startup":10,"recovery":22,"guardBreak":true,"tier":2}},
            // I 终焉七重刺：七次高速突刺+终击挑飞，伤害随剑契层数提升；满层追加十字剑气
            super_:   { multiHit: true, hits: 7, interval: 5, startup: 10, active: 40, recovery: 26,
                        perHit: 24, perHitLayerBonus: 5, finalDamage: 70, finalLayerBonus: 12,
                        range: 92, hitHeight: 64, knockback: 11, hitstun: 30, launch: -10,
                        guardBreak: true, lunge: 6, fullCrossBlades: true },
        },

        // ---------- 江湖剑客（设定图：斗笠蓑衣·无名剑客） ----------
        jianke: {
            name: "江湖剑客", title: "无名之剑",
            color: "#4a4a54", colorDark: "#8a7a52",
            sprite: "assets/chars/jianke.png",
            width: 46, height: 112, walkSpeed: 5.2, maxHealth: 2500,
            dashAttack: {name:"踏影刺",damage:65,range:88,hitHeight:44,startup:6,active:5,recovery:17,knockback:7,hitstun:22},
            airAttack: {name:"落雁斩",damage:58,range:72,hitHeight:60,startup:7,active:6,recovery:18,knockback:5,hitstun:21},
            superTiers: {
                lunge: {name:"疾影突",anim:"superLunge",damage:150,range:100,hitHeight:52,startup:6,active:8,recovery:15,knockback:9,hitstun:24,lunge:12,tier:1},
                wave: {name:"裂空波",anim:"superWave",damage:230,projSpeed:7.5,projSize:36,startup:10,recovery:22,guardBreak:true,tier:2}
            },
            resource: { name: "剑意", max: 3, desc: "O键凝聚剑意，每层提升8%伤害" },
            combo: [
                { damage: 42, range: 62, hitHeight: 42, startup: 5, active: 4, recovery: 10, knockback: 3, hitstun: 15 },
                { damage: 46, range: 64, hitHeight: 42, startup: 5, active: 4, recovery: 12, knockback: 4, hitstun: 17 },
                { damage: 72, range: 70, hitHeight: 50, startup: 7, active: 5, recovery: 18, knockback: 8, hitstun: 25 },
            ],
            launcher: { damage: 62, range: 58, hitHeight: 72, startup: 8, active: 5, recovery: 20, knockback: 3, hitstun: 26, launch: -10 },
            low:      { damage: 56, range: 66, hitHeight: 26, startup: 9, active: 5, recovery: 20, knockback: 5, hitstun: 22, guardBreak: true },
            skill:    { damage: 68, cost: 0, projSpeed: 10, projSize: 14, startup: 10, recovery: 18 },
            super_:   { damage: 265, range: 108, hitHeight: 92, startup: 14, active: 8, recovery: 30, knockback: 12, hitstun: 40, guardBreak: true },
        },

        // ---------- 银铠的守望者 · 双形态（穿甲 → 脱甲，S+I 耗 200 气，单向切换） ----------
        shouwang: {
            name: "银铠守望者", title: "双形态 · 银铠守望",
            color: "#33262e", colorDark: "#7a2233",
            // 双形态贴图：穿甲（默认）/ 脱甲；绘制时按 form 取用
            sprites: {
                armored:   "assets/chars/shouwang_armed.png",   // 穿甲：重甲剑士
                unarmored: "assets/chars/shouwang.png",         // 脱甲：银发魔法剑士
            },
            formSwitchCost: 0,   // 形态切换不耗气
            width: 48, height: 116, walkSpeed: 4.2,
            resource: { name: "誓约", max: 3, desc: "援护键（O/6）· 设计中" },
            // 穿甲形态加成：重甲减伤 20%，但移速降低
            armoredDefense: 0.8, armoredSpeedMult: 0.85,
            // 脱甲形态加成：攻速 +10%
            unarmoredSpeedBonus: 0.1,
            combo: [
                { damage: 52, range: 64, hitHeight: 46, startup: 7, active: 4, recovery: 13, knockback: 4, hitstun: 16 },
                { damage: 56, range: 66, hitHeight: 46, startup: 7, active: 4, recovery: 15, knockback: 5, hitstun: 18 },
                { damage: 92, range: 74, hitHeight: 54, startup: 9, active: 6, recovery: 24, knockback: 11, hitstun: 28 },
            ],
            launcher: { damage: 74, range: 58, hitHeight: 78, startup: 10, active: 5, recovery: 24, knockback: 3, hitstun: 28, launch: -9 },
            low:      { damage: 68, range: 66, hitHeight: 28, startup: 11, active: 5, recovery: 24, knockback: 7, hitstun: 24, guardBreak: true },
            skill:    { damage: 88, cost: 0, projSpeed: 8, projSize: 22, startup: 13, recovery: 24 },
            super_:   { damage: 320, range: 104, hitHeight: 104, startup: 16, active: 9, recovery: 36, knockback: 15, hitstun: 46, guardBreak: true },
        },

        // ---------- BOSS 角色（房间内可禁用） ----------
        xuanya: {
            name: "玄鸦", title: "夜幕之主", boss: true,
            color: "#8e44ad", colorDark: "#4a2364",
            width: 48, height: 116, walkSpeed: 5.0,
            resource: { name: "暗影", max: 5, desc: "O键积攒暗影层数，强化全部招式" },
            combo: [
                { damage: 46, range: 66, hitHeight: 42, startup: 5, active: 4, recovery: 10, knockback: 4, hitstun: 15 },
                { damage: 50, range: 68, hitHeight: 42, startup: 5, active: 4, recovery: 12, knockback: 5, hitstun: 17 },
                { damage: 80, range: 74, hitHeight: 50, startup: 7, active: 5, recovery: 18, knockback: 9, hitstun: 25 },
            ],
            launcher: { damage: 66, range: 60, hitHeight: 74, startup: 8, active: 5, recovery: 20, knockback: 3, hitstun: 27, launch: -10 },
            low:      { damage: 60, range: 68, hitHeight: 26, startup: 9, active: 5, recovery: 20, knockback: 6, hitstun: 23, guardBreak: true },
            skill:    { damage: 80, cost: 0, projSpeed: 10, projSize: 16, startup: 10, recovery: 17 },
            super_:   { damage: 290, range: 118, hitHeight: 96, startup: 13, active: 9, recovery: 30, knockback: 13, hitstun: 42, guardBreak: true },
        },
    },

    // 角色出场顺序（选人界面展示顺序）——只保留设定图三人组
    roster: ["noble", "jianke", "shouwang"],

    // ---------- 6 张剧情衍生对战场景（设计文档 一） ----------
    // 后期替换美术：改 colors，或在 game.js drawStage() 里换成贴图
    stages: {
        lingxia:   { name: "暮雨 · 废弃工业街",   sky: ["#0f3460", "#533483", "#1a1a2e"], ground: "#2b2b45", hazard: "滚石", img: "assets/stages/industrial-rain.png", weather: "rain" },
        youdu:     { name: "幽都夜市",   sky: ["#1a0533", "#3d1a5c", "#0d0221"], ground: "#3a2b45", hazard: "鬼火" },
        cangshan:  { name: "苍山雪境",   sky: ["#4a6fa5", "#87a8d0", "#c8d8e8"], ground: "#dfe8f0", hazard: "冰锥" },
        yanhuang:  { name: "炎荒熔窟",   sky: ["#3d0c02", "#8a2408", "#1a0501"], ground: "#45251a", hazard: "岩浆喷涌" },
        tianque:   { name: "天阙云台",   sky: ["#0b3d5c", "#1e6f9e", "#87ceeb"], ground: "#5c7a8a", hazard: "罡风" },
        wangsheng: { name: "往生花海",   sky: ["#2d1b4e", "#6b3a8a", "#c86b9e"], ground: "#4a2b45", hazard: "花毒" },
        astral: { name: "星辉王城", style: "western", description: "浮空尖塔与星环映照的王城露台。", sky: ["#10152f", "#354778", "#172335"], ground: "#30394b", img: "assets/stages/new-scenes/astral.webp" },
        arcane: { name: "秘法回廊", style: "western", description: "水晶与星象仪点亮的魔法学院庭院。", sky: ["#151d2d", "#3b5268", "#192a30"], ground: "#303c42", img: "assets/stages/new-scenes/arcane.webp" },
        neoncity: { name: "霓雨旧城", style: "chinese", description: "飞檐老街与都市霓虹交织，雨色映入街面。", sky: ["#102b39", "#28515c", "#15272d"], ground: "#263b3e", img: "assets/stages/new-scenes/neoncity.webp", weather: "rain" },
        lanterncity: { name: "灯河夜市", style: "chinese", description: "灯笼、青瓦与远处楼群围绕的滨河广场。", sky: ["#153c43", "#436664", "#1e3c3c"], ground: "#3b4945", img: "assets/stages/new-scenes/lanterncity.webp" },
    },
    stageOrder: ["lingxia", "astral", "arcane", "neoncity", "lanterncity", "youdu", "cangshan", "yanhuang", "tianque", "wangsheng"],

    // ---------- 剧情模式章节 ----------
    // 视频文件放进 assets/videos/ 即可自动加载；占位文件名可随意改
    story: {
        chapters: [
            { id: "ch1", title: "第一章 · 夜幕降临", sub: "百兽觉醒，都市异变之始", video: "assets/videos/ch1.mp4" },
            { id: "ch2", title: "第二章 · 幽都迷影", sub: "夜市深处传来的兽吼", video: "assets/videos/ch2.mp4" },
            { id: "ch3", title: "第三章 · 玄鸦之影", sub: "夜幕之主现身", video: "assets/videos/ch3.mp4" },
        ],
    },

    // ---------- 人物CG动画介绍 ----------
    // CG 视频放进 assets/cg/，文件名 = 角色 id（如 canglang.mp4）
    cgDir: "assets/cg/",

    // ---------- 在线对战 ----------
    net: {
        wsPath: "/ws",             // 中继路径，与网页同域名同端口（server.js 提供）
        snapshotRate: 3,           // 每 N 帧发一次状态快照（60fps → 20Hz）
    },

    debug: false,                  // true 显示碰撞框
};
