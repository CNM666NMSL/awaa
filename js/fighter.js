/* ============================================================
   fighter.js — 角色类（状态机 + 资源 + 绘制）
   状态：idle / walk / jump / attack / dash / block / hit /
         guardbreak / skill / super / ko
   ------------------------------------------------------------
   有 sprite 贴图的角色走贴图渲染（_drawSprite），否则走程序化像素小人。
   ============================================================ */

// ---------- 角色贴图缓存（设定集抠图 + 动作帧序列） ----------
const SPRITES = {};
(function loadSprites() {
    if (typeof CONFIG === "undefined" || !CONFIG.characters) return;
    for (const id in CONFIG.characters) {
        const def = CONFIG.characters[id];
        // 单贴图（sprite 字段）→ SPRITES[id]
        if (def.sprite) {
            const img = new Image();
            img.onload = () => { SPRITES[id] = img; };
            img.src = def.sprite + "?v=" + ASSET_VER;   // 带版本号破缓存
        }
        // 多形态贴图（sprites 字段）→ SPRITES[id_form]
        if (def.sprites) {
            for (const form in def.sprites) {
                const img = new Image();
                img.onload = () => { SPRITES[id + "_" + form] = img; };
                img.src = def.sprites[form] + "?v=" + ASSET_VER;   // 带版本号破缓存
            }
        }
        // 动作帧序列（anims 字段）：path 为目录，帧文件 00.png 01.png ...
        // frames 支持：number（从0数N张）、[start,end]（闭区间）、{count,offset}
        if (def.anims) {
            const forms = def.sprites ? Object.keys(def.sprites) : [null];
            for (const form of forms) {
                for (const animName in def.anims) {
                    const a = def.anims[animName];
                    const keyPrefix = form ? `${id}_${form}_${animName}` : `${id}_${animName}`;
                    let offset = 0, count = 0;
                    if (Array.isArray(a.frames)) {
                        offset = a.frames[0];
                        count = a.frames[1] - a.frames[0] + 1;
                    } else if (typeof a.frames === "object" && a.frames !== null) {
                        offset = a.frames.offset || 0;
                        count = a.frames.count;
                    } else {
                        count = a.frames;
                    }
                    for (let i = 0; i < count; i++) {
                        const img = new Image();
                        const key = `${keyPrefix}_${i}`;
                        const file = `${a.path}/${String(i + offset).padStart(2, "0")}.png`;
                        img.onload = ((k) => (() => { SPRITES[k] = img; }))(key);
                        img.src = `${file}?v=${ASSET_VER}`;
                    }
                }
            }
        }
    }
})();

class Fighter {
    /**
     * @param {string} charId   config.characters 的键名
     * @param {number} x        出生 x 坐标
     * @param {number} facing   1 向右 / -1 向左
     */
    constructor(charId, x, facing) {
        this.charId = charId;
        this.def = CONFIG.characters[charId];
        this.name = this.def.name;

        // 位置与物理
        this.x = x;
        this.y = CONFIG.canvas.groundY;   // y = 脚底
        this.vx = 0;
        this.vy = 0;
        this.facing = facing;
        this.onGround = true;
        this.jumpsLeft = CONFIG.mechanics.maxJumps;

        // 核心资源（设计文档 三.1）
        this.maxHealth = this.def.maxHealth || CONFIG.resources.maxHealth;
        this.health = this.maxHealth;
        this.landingTicks = 0;
        this.meter = 0;
        this.resource = 0;                          // 专属资源（层数/数值）
        this.resourceMax = this.def.resource.max;

        // 状态机
        this.state = "idle";
        this.stateTimer = 0;
        this.currentAttack = null;
        this.hasHit = false;
        this.comboIndex = 0;      // J 三段普攻进度
        this.hitstunLeft = 0;
        this.canUkemi = false;    // 当前受击是否可受身
        this.dashLeft = 0;
        this.dashCooldownLeft = 0;   // 瞬步冷却剩余帧数（>0 期间无法瞬步）
        this.roundsWon = 0;
        this.sinceHit = 0;        // 距上次命中帧数（剑契超时清零用）
        this.pendingFacing = facing;
        this._nextHitAt = 0;      // 多段攻击下一次判定帧

        // 连段保护 / 倒地机制
        this.comboHits = 0;       // 当前被连段累计命中次数
        this.comboDamage = 0;     // 当前被连段累计伤害
        this.comboGrace = 0;      // 连段重置宽限帧（脱离连段一段时间后清零）
        this.knockdownTimer = 0;  // 倒地躺平计时
        this.knockdownInvuln = 0; // 起身无敌剩余帧
        this._wasAirborne = false; // 是否因浮空受击在空中（落地触发倒地）

        // 双形态（守望者）：默认穿甲
        this.form = this.def.sprites ? "armored" : null;

        // 动作帧动画（无 anims 配置时退回到单张贴图）
        this.animKey = null;
        this.animFrame = 0;
        this.animTimer = 0;

        // 输入边沿检测标记
        this._p = {};
    }

    /** 该角色是否配置了帧动画 */
    hasAnims() {
        return !!this.def.anims;
    }

    /** 根据当前战斗状态选取应播放的动画名 */
    _animForState() {
        const d = this.def;
        if (!d.anims) return null;
        const st = this.state;
        if (st === "idle") return this.landingTicks > 0 && d.anims.land ? "land" : (d.anims.idle ? "idle" : null);
        if (st === "walk") return d.anims.walk ? "walk" : (d.anims.idle ? "idle" : null);
        if (st === "block") return d.anims.block ? "block" : (d.anims.idle ? "idle" : null);
        if (st === "parry") return d.anims.parry ? "parry" : (d.anims.block ? "block" : (d.anims.idle ? "idle" : null));
        if (st === "charge") return d.anims.charge ? "charge" : (d.anims.idle ? "idle" : null);
        if (st === "jump") return d.anims.jump ? "jump" : (d.anims.idle ? "idle" : null);
        if (st === "dash") return d.anims.dash ? "dash" : (d.anims.idle ? "idle" : null);
        if (st === "attack" || st === "super") {
            const a = this.currentAttack;
            if (!a) return d.anims.idle ? "idle" : null;
            if (a.anim && d.anims[a.anim]) return a.anim;
            if (a === d.combo[0]) return d.anims.j1 ? "j1" : null;
            if (a === d.combo[1]) return d.anims.j2 ? "j2" : (d.anims.j1 ? "j1" : null);
            if (a === d.combo[2]) return d.anims.j3 ? "j3" : (d.anims.j1 ? "j1" : null);
            if (a === d.launcher) return d.anims.launcher ? "launcher" : (d.anims.j1 ? "j1" : null);
            if (a === d.low) return d.anims.low ? "low" : (d.anims.j1 ? "j1" : null);
            if (a === d.dashAttack) return d.anims.dashAttack ? "dashAttack" : (d.anims.j1 ? "j1" : null);
            if (a === d.airAttack) return d.anims.airAttack ? "airAttack" : (d.anims.j1 ? "j1" : null);
            if (d.special && a === d.special.counter) return d.anims.parryCounter ? "parryCounter" : (d.anims.j1 ? "j1" : null);
            if (a === d.super_) return d.anims.super_ ? "super_" : (d.anims.j1 ? "j1" : null);
            return d.anims.j1 ? "j1" : null;
        }
        if (st === "skill") {
            if (this.currentCast?.anim && d.anims[this.currentCast.anim]) return this.currentCast.anim;
            // skill 状态只对应 U 技能；parry 单独走 "parry" 状态
            return d.anims.u ? "u" : (d.anims.idle ? "idle" : null);
        }
        if (st === "hit" || st === "guardbreak") {
            if (!this.onGround && d.anims.fall) return "fall";
            return d.anims.hit ? "hit" : (d.anims.idle ? "idle" : null);
        }
        if (st === "knockdown") {
            if (!this.onGround && d.anims.fall) return "fall";
            if (this.onGround && this.knockdownTimer <= 12 && d.anims.getup) return "getup";
            return d.anims.knockdown ? "knockdown" : (d.anims.idle ? "idle" : null);
        }
        if (st === "ko") return !this.onGround && d.anims.fall ? "fall" : (d.anims.ko ? "ko" : (d.anims.idle ? "idle" : null));
        return d.anims.idle ? "idle" : null;
    }

    /** 当前动画的当前帧 Image 对象 */
    _animImg() {
        if (!this.animKey || !this.def.anims || !this.def.anims[this.animKey]) return null;
        const formSuffix = this.form ? `_${this.form}` : "";
        const key = `${this.charId}${formSuffix}_${this.animKey}_${this.animFrame}`;
        return SPRITES[key] || null;
    }

    /** 计算动画帧数（支持 number / [start,end] / {count,offset}） */
    _animFrameCount(a) {
        if (Array.isArray(a.frames)) return a.frames[1] - a.frames[0] + 1;
        if (typeof a.frames === "object" && a.frames !== null) return a.frames.count;
        return a.frames;
    }

    /** 推进帧动画（每 game 帧调用一次） */
    _updateAnim() {
        if (!this.hasAnims()) return;
        const want = this._animForState();
        if (want !== this.animKey) {
            this.animKey = want;
            this.animFrame = 0;
            this.animTimer = 0;
        }
        if (!this.animKey) return;
        const a = this.def.anims[this.animKey];
        const count = this._animFrameCount(a);
        if (a.physics && this.state === "jump") {
            this.animFrame = this.stateTimer < 3 ? 2 : this.vy < -8 ? 3 : this.vy < 3 ? 4 : this.vy < 9 ? 5 : 6;
            this.animFrame = Math.min(count - 1, this.animFrame);
            return;
        }
        if (a.fitHurt && (this.state === "hit" || this.state === "guardbreak")) {
            this.animFrame = Math.min(count - 1, Math.floor(this.stateTimer * count / Math.max(1, this.stateTimer + this.hitstunLeft)));
            return;
        }
        // Match anticipation / contact / recovery to the actual combat timings.
        // A fixed 14 fps clip previously ended after the 17-tick attack was over.
        if (a.phases && this.currentAttack && (this.state === "attack" || this.state === "super")) {
            const eff = this.curEff();
            const [contact, recover] = a.phases;
            const t = Math.max(0, this.stateTimer);
            if (t < eff.startup) this.animFrame = Math.min(contact - 1, Math.floor(t * contact / Math.max(1, eff.startup)));
            else if (t < eff.startup + eff.active) {
                const elapsed = t - eff.startup;
                const duration = a.activeLoop ? (eff.interval || 5) : eff.active;
                this.animFrame = contact + Math.min(recover - contact - 1, Math.floor((a.activeLoop ? elapsed % duration : elapsed) * (recover - contact) / Math.max(1, duration)));
            }
            else this.animFrame = recover + Math.min(count - recover - 1, Math.floor((t - eff.startup - eff.active) * (count - recover) / Math.max(1, eff.recovery)));
            return;
        }
        if (this.state === "skill" && a.fitState) {
            const startup = this.currentCast?.startup || this.def.skill.startup || 6;
            const total = this.currentSkillFrames || 20;
            const contact = a.contact ?? 3;
            this.animFrame = this.stateTimer < startup
                ? Math.floor(this.stateTimer * contact / startup)
                : Math.min(count - 1, contact + Math.floor((this.stateTimer - startup) * (count - contact) / Math.max(1, total - startup)));
            return;
        }
        if (this.animKey === "getup") {
            this.animFrame = Math.min(count - 1, Math.floor((12 - this.knockdownTimer) * count / 12));
            return;
        }
        this.animTimer++;
        const frame = Math.floor(this.animTimer * a.fps / 60);
        this.animFrame = a.loop ? frame % count : Math.min(frame, count - 1);
    }

    get width()  { return this.def.width; }
    get height() { return this.def.height; }

    getBodyBox() {
        return { x: this.x - this.width / 2, y: this.y - this.height, w: this.width, h: this.height };
    }

    /** 当前招式换算后的有效数据（攻速/满层强化已折算） */
    curEff() {
        return this.effAttack(this.currentAttack);
    }

    getAttackBox() {
        if (!this.currentAttack) return null;
        if (!(this.state === "attack" || this.state === "super")) return null;
        const a = this.curEff();
        const reach = a.range + this.width / 2;
        if (a.below) {
            if (this.charId === "noble") return {x:this.facing===1?this.x-8:this.x-reach+8,y:this.y-48,w:reach,h:64};
            // 下劈刺：判定在近地处
            return { x: this.x - reach / 2, y: this.y - 46, w: reach, h: 60 };
        }
        if (a.hitY !== undefined) return {
            x: this.facing === 1 ? this.x : this.x - reach,
            y: this.y - a.hitY, w: reach, h: a.hitHeight,
        };
        return {
            x: this.facing === 1 ? this.x : this.x - reach,
            y: this.y - this.height * 0.75,
            w: reach,
            h: a.hitHeight + this.height * 0.25,
        };
    }

    isAttackActive() {
        if (!(this.state === "attack" || this.state === "super") || !this.currentAttack) return false;
        const a = this.curEff();
        return this.stateTimer >= a.startup && this.stateTimer < a.startup + a.active;
    }

    // ---------- 剑契机制（贵族决斗者） ----------

    /** 每层 +3% 攻速；脱甲形态额外 +10% 攻速 */
    attackSpeedFactor() {
        let f = 1 + this.resource * 0.03;
        if (this.form === "unarmored" && this.def.unarmoredSpeedBonus) f += this.def.unarmoredSpeedBonus;
        return f;
    }

    /** 攻速加成后的招式帧数（不低于 2 帧） */
    atkDur(a, field) {
        return Math.max(2, Math.round(a[field] / this.attackSpeedFactor()));
    }

    /** 5 层触发「纯白剑契」 */
    isPureWhite() {
        return this.resource >= this.resourceMax;
    }

    // ---------- 双形态（守望者） ----------

    /** 当前应使用的单张贴图：按形态/单贴图兜底（帧动画走 _animImg） */
    _spriteImg() {
        const def = this.def;
        if (def.sprites && this.form) return SPRITES[this.charId + "_" + this.form] || SPRITES[this.charId];
        return SPRITES[this.charId];
    }

    /** 是否可切换形态（有 sprites 定义的角色） */
    canSwitchForm() {
        return !!this.def.sprites;
    }

    /** S+I 形态切换：耗 2 段气，穿甲 → 脱甲（单向，不可逆） */
    switchForm() {
        if (!this.canSwitchForm() || !this.onGround) return false;
        // S 键会触发 block（防御），所以切换需在 idle/walk/block 状态下都可进行
        if (!(this.state === "idle" || this.state === "walk" || this.state === "block")) return false;
        if (this.form !== "armored") return false;   // 单向：脱甲后不可切回
        const cost = this.def.formSwitchCost || CONFIG.resources.tier2Cost;
        if (this.meter < cost) return false;
        this.meter -= cost;
        this.form = "unarmored";
        this.justSwitchedForm = true;   // 通知 game 层做切换特效
        return true;
    }

    /** 当前移速（穿甲形态移动更慢） */
    curWalkSpeed() {
        let s = this.def.walkSpeed;
        if (this.form === "armored" && this.def.armoredSpeedMult) s *= this.def.armoredSpeedMult;
        return s;
    }

    /** 命中叠层（普攻/技能/反击均调用） */
    gainLayers(n) {
        if (!n) return;
        this.resource = Math.min(this.resourceMax, this.resource + n);
        this.sinceHit = 0;
    }

    /** 专属资源带来的伤害倍率（每层 +8% 通用；剑契角色由 resource 层数驱动） */
    damageScale() {
        return 1 + this.resource * (this.def.resource.damagePerLayer ?? 0.08);
    }

    /** 决斗招架是否处于有效窗口 */
    isParryActive() {
        return this.state === "parry" && this.def.special &&
               this.def.special.type === "parry" &&
               this.stateTimer < this.def.special.window;
    }

    /** 招架成功：反击突刺起手 + 叠满剑契 + 回气（文档：反击命中叠满5层、回20气） */
    onParrySuccess() {
        this.resource = this.resourceMax;
        this.sinceHit = 0;          // 招架成功视为一次有效命中，重置超时计时
        this.gainMeter(this.def.special.meterGain ?? 20);
        this.currentAttack = this.def.special.counter;
        this.hasHit = false;
        this._nextHitAt = 0;
        this.setState("attack");
    }

    /** 玄武钢甲类资源的减伤倍率（每层 -6%）——通用：层数即减伤；守望者穿甲形态额外减伤 */
    defenseScale() {
        let s = 1;
        if (this.def.resource.name === "钢甲") s *= 1 - this.resource * 0.06;
        if (this.form === "armored" && this.def.armoredDefense) s *= this.def.armoredDefense;
        return s;
    }

    gainMeter(n) {
        this.meter = Math.min(CONFIG.resources.maxMeter, this.meter + n);
    }

    // ---------- 行为入口 ----------

    canAct() {
        return this.state === "idle" || this.state === "walk";
    }

    /**
     * 朝向统一入口（唯一改 facing 的地方）：
     * 铁律 = 可自由行动的状态下，方向键按哪边 facing 就立即朝哪边；
     *        攻击的前摇阶段允许「反向取消转向」（死神VS火影手感），
     *        后摇/受击/倒地等硬直态锁死朝向，直到恢复。
     */
    aim(dir) {
        if (dir === 0) return;
        // 攻击态：前摇阶段可取消转向，后摇阶段锁定
        if (this.state === "attack" || this.state === "super") {
            const a = this.curEff();
            const startup = a ? a.startup : 0;
            if (this.stateTimer < startup) {
                this.facing = dir;
                this.pendingFacing = dir;
            }
            return;
        }
        // 可转向的状态白名单（受击/倒地/破防等硬直态一律锁定）
        const free = this.state === "idle" || this.state === "walk" || this.state === "turn"
                  || this.state === "block" || this.state === "charge" || this.state === "jump"
                  || this.state === "parry";
        if (!free) return;
        this.facing = dir;
        this.pendingFacing = dir;
    }

    setState(s) {
        this.state = s;
        this.stateTimer = 0;
        if (s !== "skill") {
            this.pendingProj = null;
            this.currentCast = null;
            this.currentSkillFrames = 0;
        }
        this.animKey = null;
        this.animFrame = 0;
        this.animTimer = 0;
        // 状态切换时下一帧 _updateAnim 会自动切到对应动画
    }

    move(dir) {
        // 空中移动：跳跃状态下允许前后位移（空中可控），速度用 airControl 系数
        if (this.state === "jump") {
            this.vx = dir * this.curWalkSpeed() * CONFIG.physics.airControl;
            return;
        }
        // 转身期间锁脚步（先完成转身再移动）
        if (this.state !== "idle" && this.state !== "walk" && this.state !== "turn") return;
        this.state = "walk";
        this.vx = dir * this.curWalkSpeed();
    }

    stopMove() {
        if (this.state === "walk") { this.state = "idle"; this.vx = 0; }
        // 空中松方向键：水平速度快速衰减归零，避免起跳后一路滑行到底
        if (this.state === "jump") this.vx *= 0.5;
    }

    /** K/W 跳跃：支持二段跳（设计文档 四）；dir 为起跳水平方向（前跳/后跳，空中二段跳也生效） */
    jump(dir) {
        if (this.state === "hit" || this.state === "guardbreak" || this.state === "ko" || this.state === "charge") return;
        if (this.state === "attack" || this.state === "skill" || this.state === "super" || this.state === "knockdown") return;
        if (this.jumpsLeft <= 0) return;
        this.vy = CONFIG.physics.jumpForce;
        // 起跳水平初速：按输入方向给，实现「向前跳 / 向后跳」（朝向已由 aim 统一处理）
        if (dir !== undefined && dir !== 0) {
            this.vx = (dir > 0 ? 1 : -1) * CONFIG.physics.jumpHop;
        }
        this.onGround = false;
        this.jumpsLeft--;
        this.setState("jump");
    }

    /** L 瞬步：消耗少量气做短距离瞬移（死神VS火影式），前几帧无敌，有冷却；支持空中瞬步 */
    dash() {
        if (!(this.canAct() || this.state === "jump")) return;
        if (this.state === "knockdown") return;
        if (this.dashCooldownLeft > 0) return;              // 冷却中，瞬步失败
        if (this.meter < CONFIG.resources.dashCost) return; // 气不够，瞬步失败
        this.meter -= CONFIG.resources.dashCost;
        this.dashCooldownLeft = CONFIG.resources.dashCooldown;
        this._dashWasAir = !this.onGround;                  // 记录是否空中瞬步（结束后回 jump 而非 idle）
        this.setState("dash");
        this.dashLeft = CONFIG.physics.dashFrames;
        this.vx = this.facing * CONFIG.physics.dashSpeed;
        // 空中瞬步：清零垂直速度，保留悬空感（不再往下坠一段）
        if (this._dashWasAir) this.vy = 0;
        this.justDashed = true;   // 通知 game 层触发瞬步时缓（慢动作）
    }

    block(holding) {
        if (holding && this.state !== "block" && this.canAct() && this.onGround) {
            this.setState("block");
        } else if (!holding && this.state === "block") {
            this.setState("idle");
        }
    }

    /** J 普攻：三段连击，连击窗口内再按 J 接下一段；空中按 J = 下劈刺 */
    attack() {
        if (this.state === "attack" && this.currentAttack) {
            // 连击取消窗口：当前段生效后即可接下一段（帧数按攻速加成换算）
            const a = this.currentAttack;
            const su = this.atkDur(a, "startup"), ac = this.atkDur(a, "active"), rc = this.atkDur(a, "recovery");
            if (this.comboIndex < this.def.combo.length - 1 &&
                this.stateTimer >= su + ac &&
                this.stateTimer < su + ac + rc) {
                this.comboIndex++;
                this._startAttack(this.def.combo[this.comboIndex]);
            }
            return;
        }
        // 空中攻击（下劈刺，近地处判定）
        if (!this.onGround) {
            if (this.state === "jump" && this.def.airAttack) {
                this.comboIndex = 0;
                this._startAttack(this.def.airAttack);
            }
            return;
        }
        if (!this.canAct()) return;
        this.comboIndex = 0;
        this._startAttack(this.def.combo[0]);
    }

    /** L+J 滑步突刺：冲刺中按 J（文档：近身起手核心） */
    dashAttack() {
        if (this.state !== "dash" || !this.def.dashAttack || !this.onGround) return false;
        this.comboIndex = 0;
        this._startAttack(this.def.dashAttack);
        return true;
    }

    /** W+J 上攻（浮空/对空）；S+J 下攻（地面破防）。满层「纯白剑契」强化见 config */
    comboAttack(kind) {
        if (!this.canAct() || !this.onGround) return;
        this.comboIndex = 0;
        this._startAttack(kind === "launcher" ? this.def.launcher : this.def.low);
    }

    /** 当前招式的实际帧数据（攻速加成 + 满层强化换算，供判定与演出共用） */
    effAttack(a) {
        if (!a) return null;
        const full = this.isPureWhite();
        return {
            damage: a.multiHit ? 0 : Math.round(a.damage * (full && a.fullDamageMult ? a.fullDamageMult : 1)),
            startup: this.atkDur(a, "startup"),
            active: a.multiHit ? a.active : this.atkDur(a, "active"),
            recovery: this.atkDur(a, "recovery"),
            range: a.range, hitHeight: a.hitHeight, hitY: a.hitY,
            knockback: full && a.fullKnockback ? a.fullKnockback : a.knockback,
            hitstun: a.hitstun, guardBreak: a.guardBreak || (full && a.fullGuardBreak),
            launch: full && a.fullLaunch ? a.fullLaunch : a.launch,
            lunge: a.lunge ? (full && a.fullLunge ? a.fullLunge : a.lunge) : 0,
            below: a.below, gainLayers: a.gainLayers,
            multiHit: a.multiHit, hits: a.hits, interval: a.interval,
            perHit: a.perHit, perHitLayerBonus: a.perHitLayerBonus,
            finalDamage: a.finalDamage, finalLayerBonus: a.finalLayerBonus,
            fullCrossBlades: a.fullCrossBlades, fullBonusHit: a.fullBonusHit,
        };
    }

    _startAttack(a) {
        this.currentAttack = a;
        this.hasHit = false;
        this._nextHitAt = 0;
        this.setState("attack");
        this.vx = 0;
    }

    /** U 远攻技能：消耗气槽，生成飞行道具（由 game.js 真正生成） */
    castSkill() {
        if (!this.canAct() || !this.onGround) return null;
        const s = this.def.skill;
        if (this.meter < s.cost) return null;
        this.meter -= s.cost;
        this.setState("skill");
        this.vx = 0;
        this.currentCast = s;
        this.currentSkillFrames = s.startup + s.recovery;
        return s;   // game.js 收到后在 startup 帧生成飞行道具
    }

    /** I 超必杀：需满气槽 */
    castSuper() {
        if (!this.canAct() || !this.onGround) return false;
        if (this.meter < CONFIG.resources.superCost) return false;
        this.meter = 0;
        this.currentAttack = this.def.super_;
        this.hasHit = false;
        this._nextHitAt = 0;
        this.setState("super");
        this.vx = 0;
        return true;
    }

    // ---------- I 键蓄气 / 三段式必杀 ----------
    // ---------- 蓄气（P+S 双键） / 三段式必杀（I 键） ----------
    // 蓄气：按住 P + S 进入蓄气姿势，每帧攒气（可被打断，已攒的气保留；蓄气中受伤×1.5）
    // 放招：点按 I 按气量分档（≥100 终式 / ≥66 裂空波 / ≥33 疾影突）

    /** 进入蓄气姿势（需 P+S 触发，气满时不可蓄） */
    startCharge() {
        if (!this.canAct() || !this.onGround) return false;
        if (this.meter >= CONFIG.resources.superCost) return false;
        this.setState("charge");
        this.chargeHeldFrames = 0;
        this.vx = 0;
        return true;
    }

    /** 结束蓄气（松开 P 或 S） */
    endCharge() {
        if (this.state !== "charge") return;
        this.setState("idle");
    }

    /** 点按释放：按当前气量选档 */
    castSuperTier() {
        if (!this.canAct() && this.state !== "charge") return false;
        if (!this.onGround) return false;
        const R = CONFIG.resources;
        const m = this.meter;
        if (m >= R.superCost) { this.endCharge(); return this.castSuper(); }
        if (m >= R.tier2Cost) {
            this.meter -= R.tier2Cost;
            this.endCharge();
            // 二段「裂空波」：复用技能通道，由 game.js 在 startup 帧生成大型剑气
            this.pendingProj = this.def.superTiers?.wave || {
                name: "裂空波", damage: 230, projSpeed: 7.5, projSize: 36,
                startup: 10, recovery: 22, guardBreak: true, tier: 2,
            };
            this.currentSkillFrames = this.pendingProj.startup + this.pendingProj.recovery;
            this.currentCast = this.pendingProj;
            this.setState("skill");
            this.vx = 0;
            return true;
        }
        if (m >= R.tier1Cost) {
            this.meter -= R.tier1Cost;
            this.endCharge();
            // 一段「疾影突」：贴脸突进斩，快起手长突进
            this.currentAttack = this.def.superTiers?.lunge || {
                name: "疾影突", damage: 150, range: 100, hitHeight: 52,
                startup: 6, active: 8, recovery: 15, knockback: 9, hitstun: 24,
                lunge: 12, tier: 1,
            };
            this.hasHit = false;
            this._nextHitAt = 0;
            this.setState("super");
            return true;
        }
        this.endCharge();
        return false;   // 气不足 33：什么都不放
    }

    /** O 特殊机制技：贵族决斗者=决斗招架；其他角色=积攒专属资源 */
    castSpecial() {
        if (!this.canAct() || !this.onGround) return false;
        const sp = this.def.special;
        if (sp && sp.type === "parry") {
            // 决斗招架：0.8s 精准格挡窗口
            this.setState("parry");
            this.vx = 0;
            return true;
        }
        if (this.resource >= this.resourceMax) return false;
        this.resource++;
        this.setState("skill");   // 复用技能动作演出
        this.vx = 0;
        return true;
    }

    /** 受击瞬间按防御键受身（设计文档 三.3） */
    tryUkemi() {
        if (this.state === "hit" && this.canUkemi) {
            this.hitstunLeft = Math.ceil(this.hitstunLeft * CONFIG.mechanics.ukemiRecover);
            this.canUkemi = false;
        }
    }

    /** 被击中（含连段保护 + 倒地判定） */
    takeHit(attack, attackerFacing, blocked, attackerScale) {
        const scale = attackerScale || 1;

        // 倒地 / 起身无敌中：免疫一切命中，打断连段
        if (this.state === "knockdown" || this.knockdownInvuln > 0) {
            return { blocked: true, dmg: 0, ko: false, immune: true };
        }

        // 破防判定：格挡中被破防技命中 → 长硬直
        if (blocked && attack.guardBreak) {
            const dmg = Math.round(attack.damage * 0.5 * scale * this.defenseScale());
            this.health = Math.max(0, this.health - dmg);
            this.resource = 0;               // 被重击破防：剑契清零（文档）
            this.sinceHit = 0;
            this.setState("guardbreak");
            this.hitstunLeft = Math.round(attack.hitstun * 1.5);
            this.vx = attackerFacing * attack.knockback;
            this._recordComboHit(dmg);
            return { blocked: false, guardBroken: true, dmg, ko: this.health <= 0 };
        }

        const raw = blocked
            ? attack.damage * CONFIG.mechanics.blockDamageRatio
            : attack.damage;
        // 蓄气破绽惩罚：蓄气状态下受伤 ×1.5（主动攒气的代价）
        const vuln = this.state === "charge" ? CONFIG.resources.chargeHurtMult : 1;
        // 连段伤害衰减：同一连段内命中越多，单次伤害越低（保底 30%）
        const decay = Math.max(0.3, 1 - this.comboHits * CONFIG.mechanics.comboDamageDecay);
        const dmg = Math.round(raw * scale * this.defenseScale() * vuln * decay);
        this.health = Math.max(0, this.health - dmg);

        // 攒气（受击 / 成功格挡）
        this.gainMeter(blocked ? CONFIG.resources.meterOnBlock : CONFIG.resources.meterOnHurt);

        // 连段累计（仅非格挡命中才计数；格挡不计入连段）
        if (!blocked) this._recordComboHit(dmg);

        if (this.health <= 0) {
            this.setState("ko");
            this.vx = attackerFacing * (attack.knockback || 6) * 1.5;
            this.vy = -6;
            this.onGround = false;
            return { blocked, dmg, ko: true };
        }

        // 倒地判定：连段累计伤害/次数超标，或浮空重击 → 强制倒地脱身
        const shouldKnockdown = !attack.deferKnockdown && (
            (!blocked && this.comboDamage >= CONFIG.mechanics.knockdownDamage) ||
            (!blocked && this.comboHits >= CONFIG.mechanics.knockdownHitCount));

        if (shouldKnockdown) {
            this.startKnockdown(attackerFacing, attack);
            return { blocked: false, dmg, ko: false, knockdown: true };
        }

        if (attack.launch && !blocked) {
            // 浮空
            this.vy = attack.launch;
            this.onGround = false;
            this._wasAirborne = true;   // 标记：浮空受击，落地时触发倒地脱身
            this.setState("hit");
            this.hitstunLeft = attack.hitstun;
            this.canUkemi = true;
            this.vx = attackerFacing * attack.knockback * 0.5;
        } else if (!blocked) {
            this.setState("hit");
            this.hitstunLeft = attack.hitstun;
            this.canUkemi = true;
            this.vx = attackerFacing * attack.knockback;
        } else {
            this.vx = attackerFacing * attack.knockback * 0.6;  // 格挡击退
        }
        return { blocked, dmg, ko: false };
    }

    /** 记录一次连段命中（被连方）；返回是否因连段保护触发倒地 */
    _recordComboHit(dmg) {
        this.comboHits++;
        this.comboDamage += dmg;
        this.comboGrace = 0;   // 刷新连段窗口
    }

    /** 进入倒地：躺平、无敌起身、连段清零（彻底打断连段） */
    startKnockdown(attackerFacing, attack) {
        this.setState("knockdown");
        this.knockdownTimer = CONFIG.mechanics.knockdownFrames;
        this.knockdownInvuln = 0;
        this.hitstunLeft = 0;
        this.canUkemi = false;
        this.onGround = false;
        this.vy = -4;                                   // 微微后仰弹起
        this.vx = attackerFacing * (attack.knockback || 5);  // 击飞
        this._resetCombo();
    }

    /** 重置连段计数（脱离连段 / 倒地 / 起身后调用） */
    _resetCombo() {
        this.comboHits = 0;
        this.comboDamage = 0;
        this.comboGrace = 0;
    }

    /** 每帧更新 */
    update() {
        this.stateTimer++;
        this.sinceHit++;
        if (this.landingTicks > 0) this.landingTicks--;
        this._updateAnim();

        // 瞬步冷却递减
        if (this.dashCooldownLeft > 0) this.dashCooldownLeft--;

        // 平台边缘检测：站在平台上（y < groundY）时，若脚下不再有平台支撑则变空中
        if (this.onGround && this.y < CONFIG.canvas.groundY - 1) {
            let supported = false;
            for (const p of (CONFIG.platforms || [])) {
                if (this.x >= p.x && this.x <= p.x + p.w && Math.abs(this.y - p.y) < 2) {
                    supported = true;
                    break;
                }
            }
            if (!supported) {
                this.onGround = false;
                this.vy = 0;
                this.jumpsLeft = Math.max(1, this.jumpsLeft);
            }
        }

        // 剑契超时清零：连续 1.5 秒（90帧）未命中
        if (this.resource > 0 && this.sinceHit > 90) this.resource = 0;

        // 攻击/超必杀结束
        if ((this.state === "attack" || this.state === "super") && this.currentAttack) {
            const a = this.curEff();
            if (this.stateTimer >= a.startup + a.active + a.recovery) {
                const wasLauncher = this.currentAttack === this.def.launcher;
                const wasFull = this.isPureWhite();
                const endedInAir = !this.onGround;
                this.currentAttack = null;
                this.comboIndex = 0;
                this.setState(endedInAir ? "jump" : "idle");
                // 满层晨星挑刺：挑高后追加一段空中下劈
                if (wasLauncher && wasFull && this.def.launcher.fullBonusHit && !endedInAir) {
                    this._startAttack({
                        damage: this.def.launcher.fullBonusHit, range: 52, hitHeight: 60,
                        startup: 2, active: 5, recovery: 8, knockback: 5, hitstun: 16, below: true, anim: "airAttack",
                    });
                }
            } else if (a.lunge && this.stateTimer <= a.startup) {
                // 滑步突进：前摇期间向前位移
                this.vx = this.facing * a.lunge;
            }
        }

        // 技能/机制技硬直
        if (this.state === "skill") {
            const total = this.currentSkillFrames || 20;
            if (this.stateTimer >= total) { this.setState("idle"); this.currentSkillFrames = 0; }
        }

        // 蓄气姿势：每帧直接攒气（受击会打断状态，已攒的气保留；蓄气中受伤×1.5）
        if (this.state === "charge") {
            this.chargeHeldFrames = (this.chargeHeldFrames || 0) + 1;
            this.meter = Math.min(CONFIG.resources.maxMeter, this.meter + CONFIG.resources.chargePerSecond / 60);
        }

        // 决斗招架：窗口结束未成功 → 大硬直（文档：格挡失败进入大硬直）
        if (this.state === "parry" && this.def.special && this.def.special.type === "parry") {
            if (this.stateTimer >= this.def.special.window) {
                this.setState("guardbreak");
                this.hitstunLeft = this.def.special.failRecover;
            }
        }

        // 左右转身：转身完成后切换到新朝向（4 帧，快速利落）
        if (this.state === "turn" && this.stateTimer >= 4) {
            this.facing = this.pendingFacing;
            this.setState("idle");
        }

        // 冲刺
        if (this.state === "dash") {
            this.dashLeft--;
            if (this.dashLeft <= 0) {
                this.vx = 0;
                // 空中瞬步结束后回跳跃态（保持空中），地面瞬步回 idle
                if (this._dashWasAir && !this.onGround) this.setState("jump");
                else this.setState("idle");
                this._dashWasAir = false;
            }
        }

        // 受击/破防硬直
        if (this.state === "hit" || this.state === "guardbreak") {
            this.hitstunLeft--;
            if (this.hitstunLeft <= 0 && this.onGround) this.setState("idle");
        }

        // 连段宽限：脱离连段一段时间后自动清零（对方没续上连招 → 连段保护重置）
        if (this.comboHits > 0) {
            this.comboGrace++;
            if (this.comboGrace > 90) this._resetCombo();   // 1.5 秒没再被打 → 连段结束
        }

        // 倒地状态推进：浮空被击飞落地 → 躺平计时 → 起身无敌 → 回 idle
        if (this.state === "knockdown") {
            if (this.onGround) {
                this.knockdownTimer--;
                this.vx = 0;
                if (this.knockdownTimer <= 0) {
                    this.knockdownInvuln = CONFIG.mechanics.knockdownInvuln;
                    this.setState("idle");   // 起身（无敌帧内不可被命中）
                }
            }
        }
        // 起身无敌递减
        if (this.knockdownInvuln > 0 && this.state !== "knockdown") {
            this.knockdownInvuln--;
        }

        // 重力（支持平台：从上方落到平台顶面才站立，从下方跳起可穿过）
        if (!this.onGround) {
            const prevY = this.y;
            this.vy += CONFIG.physics.gravity;
            this.y += this.vy;

            // 1) 平台顶面落地（单向平台：仅当上一帧脚底在顶面之上且本帧越过顶面）
            let landedOnPlatform = false;
            const plat = CONFIG.platforms || [];
            for (const p of plat) {
                const feetX = this.x;
                if (feetX >= p.x && feetX <= p.x + p.w) {
                    // 脚底在平台水平范围内
                    if (prevY <= p.y && this.y >= p.y) {
                        this.y = p.y;
                        this.vy = 0;
                        this.onGround = true;
                        this.jumpsLeft = CONFIG.mechanics.maxJumps;
                        landedOnPlatform = true;
                        break;
                    }
                }
            }

            // 2) 地面落地
            if (!landedOnPlatform && this.y >= CONFIG.canvas.groundY) {
                this.y = CONFIG.canvas.groundY;
                this.vy = 0;
                this.onGround = true;
                this.jumpsLeft = CONFIG.mechanics.maxJumps;
                if (this.state === "ko") this.vx = 0;
            }

            if (this.onGround) {
                if (this.state === "jump") { this.setState("idle"); this.landingTicks = 4; }
            }
        }

        // 击退摩擦（受击用更快的 hitFriction，低于阈值直接清零，杜绝「缓缓后退不停」）
        if (this.state === "hit" || this.state === "guardbreak" || this.state === "ko") {
            this.vx *= CONFIG.mechanics.hitFriction;
            if (Math.abs(this.vx) < CONFIG.mechanics.knockbackStop) this.vx = 0;
        }

        // 浮空受击落地 → 倒地脱身（被挑空后落地不能无限续浮空连）
        if (this.state === "hit" && this.onGround && !this.canUkemi && this._wasAirborne) {
            this._wasAirborne = false;
            this.startKnockdown(this.facing * -1, { knockback: 2 });
        }
        // 已落地：清除浮空标记
        if (this.onGround) this._wasAirborne = false;

        this.x += this.vx;
        if (this.state === "walk") this.vx = 0;

        const m = CONFIG.canvas.wallMargin + this.width / 2;
        this.x = Math.max(m, Math.min(CONFIG.canvas.width - m, this.x));
    }

    /** 冲刺无敌帧判定 */
    isInvulnerable() {
        return this.state === "dash" &&
               this.stateTimer < CONFIG.physics.dashInvuln;
    }

    /** 方向键手动转身（向左/向右调整面向），转身时播短暂转身动作 */
    turnTo(dir) {
        if (this.state === "turn") { this.pendingFacing = dir; return; }
        if (this.state !== "idle") return;   // 移动中 facing 已由 move() 同步，这里只管静止转身
        if (dir === this.facing) return;
        this.pendingFacing = dir;
        this.vx = 0;
        this.setState("turn");
    }

    /** 面向对手（回合开场初始化用） */
    faceTowards(opponentX) {
        if (!(this.state === "idle" || this.state === "walk" || this.state === "turn")) return;
        const want = opponentX > this.x ? 1 : -1;
        if (this.state === "turn") {
            this.pendingFacing = want;   // 转身期间对方换边则继续转
            return;
        }
        if (this.state === "walk") {
            this.facing = want;          // 移动中直接同步朝向
            return;
        }
        if (want !== this.facing) {
            this.pendingFacing = want;
            this.vx = 0;
            this.setState("turn");
        }
    }

    /** 回合重置 */
    resetForRound(x, facing) {
        this.x = x; this.y = CONFIG.canvas.groundY;
        this.vx = 0; this.vy = 0;
        this.facing = facing;
        this.onGround = true;
        this.jumpsLeft = CONFIG.mechanics.maxJumps;
        this.health = this.maxHealth;
        this.meter = 0;
        this.resource = 0;
        this.sinceHit = 0;
        this.pendingFacing = facing;
        this._nextHitAt = 0;
        this.currentAttack = null;
        this.currentCast = null;
        this.pendingProj = null;
        this.currentSkillFrames = 0;
        this.landingTicks = 0;
        this.comboIndex = 0;
        this._resetCombo();
        this.knockdownTimer = 0;
        this.knockdownInvuln = 0;
        this._wasAirborne = false;
        this.form = this.def.sprites ? "armored" : null;   // 每回合重置回穿甲
        this.justSwitchedForm = false;
        this.animKey = null;
        this.animFrame = 0;
        this.animTimer = 0;
        this.setState("idle");
    }

    // ---------- 联机同步：快照 ----------

    toSnapshot() {
        return {
            c: this.charId, x: Math.round(this.x * 10) / 10, y: Math.round(this.y * 10) / 10,
            vx: this.vx, vy: this.vy, f: this.facing, g: this.onGround,
            hp: this.health, mt: this.meter, rs: this.resource,
            st: this.state, tt: this.stateTimer, j: this.jumpsLeft,
            hs: this.hitstunLeft, dl: this.dashLeft, ci: this.comboIndex, sh: this.sinceHit,
            ca: this.currentAttack ? this._attackRef() : null,
            rw: this.roundsWon,
            ch: this.comboHits, cd: this.comboDamage, kt: this.knockdownTimer, ki: this.knockdownInvuln,
            fm: this.form,
            an: this.animKey, af: this.animFrame, at: this.animTimer,
            cs: this.currentCast || null, cf: this.currentSkillFrames || 0, lt: this.landingTicks,
        };
    }

    _attackRef() {
        // 快照里只传招式引用，客端按引用找回 config 里的招式对象
        const d = this.def;
        if (this.currentAttack === d.super_) return { k: "super" };
        for (const [i, a] of d.combo.entries()) if (a === this.currentAttack) return { k: "combo", i };
        if (this.currentAttack === d.launcher) return { k: "launcher" };
        if (this.currentAttack === d.low) return { k: "low" };
        if (this.currentAttack === d.dashAttack) return { k: "dashAttack" };
        if (this.currentAttack === d.airAttack) return { k: "airAttack" };
        if (this.currentAttack === d.special?.counter) return { k: "counter" };
        return { k: "transient", value: this.currentAttack };
    }

    applySnapshot(s) {
        this.x = s.x; this.y = s.y; this.vx = s.vx; this.vy = s.vy;
        this.facing = s.f; this.onGround = s.g;
        this.health = s.hp; this.meter = s.mt; this.resource = s.rs;
        if (this.state !== s.st) this.setState(s.st);
        this.stateTimer = s.tt;
        this.jumpsLeft = s.j; this.hitstunLeft = s.hs; this.dashLeft = s.dl;
        this.comboIndex = s.ci; this.roundsWon = s.rw; this.sinceHit = s.sh || 0;
        this.comboHits = s.ch || 0; this.comboDamage = s.cd || 0;
        this.knockdownTimer = s.kt || 0; this.knockdownInvuln = s.ki || 0;
        if (s.fm !== undefined && this.def.sprites) this.form = s.fm;
        if (s.ca) {
            const d = this.def;
            this.currentAttack = s.ca.k === "super" ? d.super_
                : s.ca.k === "combo" ? d.combo[s.ca.i]
                : s.ca.k === "launcher" ? d.launcher
                : s.ca.k === "low" ? d.low
                : s.ca.k === "dashAttack" ? d.dashAttack
                : s.ca.k === "airAttack" ? d.airAttack
                : s.ca.k === "counter" ? d.special?.counter
                : s.ca.k === "transient" ? s.ca.value : null;
        } else if (this.state !== "attack" && this.state !== "super") {
            this.currentAttack = null;
        }
        this.currentCast = s.cs || null;
        this.currentSkillFrames = s.cf || 0;
        this.landingTicks = s.lt || 0;
        if (s.an !== undefined) {
            this.animKey = s.an; this.animFrame = s.af || 0; this.animTimer = s.at || 0;
        } else this._updateAnim();
    }

    // ---------- 绘制：高材质 2D（渐变着色 + 描边轮廓 + 高光 + 状态姿态） ----------
    _palette() {
        const c = this.def;
        const base = c.palette || {};
        return Object.assign({
            skin:   "#f0cda9",
            skinD:  "#d8ab84",
            hair:   "#e3cf8e",
            hat:    c.colorDark,
            cloth:  c.color,
            shirt:  "#f2f0ea",
            pants:  "#23233d",
            boots:  "#14142a",
            cape:   c.colorDark,
            accent: "#c9a227",
            feather:"#eef1fb",
            sword:  "#c9d2ea",
            swordHi:"#ffffff",
            flash:  this.state === "guardbreak" ? "rgba(255,90,90,0.55)" : "rgba(255,255,255,0.5)",
        }, base);
    }

    /** 按角色分流到专属形象绘制（三人设定图：决斗者/江湖剑客/守望者，其余角色用决斗者基础模型） */
    draw(ctx) {
        // State can change after simulation during hit detection. Select its
        // first pose now rather than flashing the portrait for one render.
        if (this.hasAnims()) {
            const want = this._animForState();
            if (want !== this.animKey) { this.animKey = want; this.animFrame = 0; this.animTimer = 0; }
        }
        // 有帧动画配置时优先用帧动画；否则退回到单张贴图或程序化绘制
        const animImg = this.hasAnims() ? this._animImg() : null;
        const singleImg = this._spriteImg();
        if (animImg) this._drawSprite(ctx, animImg);
        else if (singleImg) this._drawSprite(ctx, singleImg);
        else if (this.charId === "jianke") this._drawWanderer(ctx);
        else if (this.charId === "shouwang") this._drawWatcher(ctx);
        else this._drawDuelist(ctx);
        if (this.state === "charge") this._drawChargeAura(ctx);
    }

    /** 蓄气姿势特效：脚下光环 + 上升气焰（密度随气量增长），贴图/矢量角色通用 */
    _drawChargeAura(ctx) {
        const t = this.stateTimer, m = this.meter / CONFIG.resources.maxMeter, h = this.height;
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        const pulse = 1 + Math.sin(t * 0.35) * 0.12;
        ctx.strokeStyle = "rgba(255,209,102," + (0.45 + m * 0.4).toFixed(2) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 34 * pulse, 9 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        const n = 3 + Math.floor(m * 5);
        for (let i = 0; i < n; i++) {
            const ph = (t * 0.028 + i / n) % 1;
            const px = Math.sin(i * 2.4 + t * 0.1) * 16;
            ctx.fillStyle = "rgba(255,209,102," + ((1 - ph) * 0.85).toFixed(2) + ")";
            ctx.fillRect(px - 1.5, -ph * h - 4, 3, 3);
        }
        ctx.restore();
    }

    // ---------- 贴图渲染：设定集立绘 + 状态动效 ----------
    _drawSprite(ctx, img) {
        const t = this.stateTimer, st = this.state;
        const b = this.getBodyBox();
        const animated = !!(this.animKey && this._animImg() === img);
        const clip = animated ? this.def.anims[this.animKey] : null;
        const H = Math.round(b.h * 1.05 * (clip?.canvasHeight && clip?.referenceHeight ? clip.canvasHeight / clip.referenceHeight : 1));
        const W = Math.round(H * (img.width / img.height));
        const origin = clip?.originX ?? 0.5;
        const floorOffset = clip?.canvasHeight ? H * (1 - (clip.originY ?? 304 / clip.canvasHeight)) : 0;
        const cx = 0, feetY = 0;

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        if (!animated && st === "ko" && this.onGround) ctx.rotate(this.facing * Math.PI / 2 * 0.85);
        // 立绘统一约定：所有立绘素材必须原始朝右（贴图文件本身镜像调好），
        // 这里只按 facing 镜像，特效/判定框/立绘共用同一坐标系，保证方向永远一致。
        // SPRITE_FLIP：设置面板的「翻转立绘」调试开关（素材朝向存疑时人工校正用）
        ctx.scale(this.facing * (window.SPRITE_FLIP || 1), 1);

        // 状态偏移
        let dx = 0, dy = 0, rot = 0;
        if (!animated && (st === "idle" || st === "parry")) dy = -Math.abs(Math.sin(t * 0.12)) * 1.5;
        if (!animated && st === "walk") { dy = -Math.abs(Math.sin(t * 0.35)) * 2.5; rot = Math.sin(t * 0.35) * 0.03; }
        if (!animated && st === "jump") rot = 0.06;
        if (st === "turn") rot = -0.12;
        if (!animated && st === "charge") { dy = 3; rot = 0.05; }
        if (!animated && st === "hit") { rot = -0.07; dx = -3; }
        if (!animated && st === "guardbreak") { rot = -0.14; dx = -4; }
        // 倒地：躺平（旋转 90° + 下沉贴地）
        if (!animated && st === "knockdown") {
            rot = this.facing * Math.PI / 2 * 0.9;
            dy = -H * 0.28;
            dx = this.facing * H * 0.12;
        }
        dx += W * (0.5 - origin);
        dy += floorOffset;
        ctx.rotate(rot);

        // 冲刺残影
        if (st === "dash") {
            ctx.globalAlpha = 0.22;
            for (let i = 1; i <= 3; i++) ctx.drawImage(img, dx - i * 12 - W / 2, dy - H, W, H);
            ctx.globalAlpha = 1;
        }

        // 满层「纯白剑契」辉光
        if (this.isPureWhite && this.isPureWhite()) {
            ctx.fillStyle = "rgba(244,246,255,0.14)";
            ctx.beginPath();
            ctx.arc(cx, -H * 0.5, H * 0.55 + Math.sin(t * 0.3) * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.drawImage(img, cx + dx - W / 2, dy - H, W, H);

        // 受击 / 破防：整体提亮闪烁
        if (st === "hit" || st === "guardbreak") {
            ctx.globalAlpha = 0.55;
            ctx.filter = "brightness(2.2) saturate(0.4)";
            ctx.drawImage(img, cx + dx - W / 2, dy - H, W, H);
            ctx.filter = "none";
            ctx.globalAlpha = 1;
        }
        // 格挡：身前护盾
        if (st === "block" && this.charId !== "noble") {
            ctx.fillStyle = "rgba(140,190,255,0.30)";
            ctx.beginPath();
            ctx.ellipse(W * 0.30, -H * 0.5, W * 0.28, H * 0.48, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // 攻击 / 超必杀：白色刀光弧
        if (this.charId !== "noble" && this.currentAttack && this.isAttackActive && this.isAttackActive()) {
            ctx.strokeStyle = st === "super" ? "rgba(255,209,102,0.9)" : "rgba(255,255,255,0.85)";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(W * 0.15, -H * 0.5, H * 0.52, -1.2, 1.0);
            ctx.stroke();
        }
        // 超必杀外圈
        if (st === "super" && this.charId !== "noble") {
            ctx.strokeStyle = "rgba(255,209,102,0.85)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, -H * 0.5, H * 0.6 + Math.sin(t * 0.4) * 6, 0, Math.PI * 2);
            ctx.stroke();
        }
        // 招架成功白闪
        if (st === "parry" && this.charId !== "noble" && Math.floor(t / 4) % 2 === 0) {
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.fillRect(-W / 2, -H, W, H);
        }

        // 专属资源图标（头顶）
        if (this.resource > 0) {
            ctx.fillStyle = this.isPureWhite && this.isPureWhite() ? "#ffffff" : "#ffd166";
            for (let i = 0; i < this.resource; i++) {
                const dxx = -((this.resource - 1) * 14) / 2 + i * 14;
                ctx.beginPath();
                ctx.arc(dxx, -H - 8, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();

        if (this.charId === "noble") this._drawNobleEffects(ctx);
        if (CONFIG.debug) {
            ctx.strokeStyle = "lime";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            const atk = this.getAttackBox();
            if (atk && this.isAttackActive()) {
                ctx.strokeStyle = "red";
                ctx.strokeRect(atk.x, atk.y, atk.w, atk.h);
            }
        }
    }

    _drawNobleEffects(ctx) {
        const h = this.height * 1.05, t = this.stateTimer;
        ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.facing, 1);
        if (this.state === "parry") {
            const a = 0.35 + Math.sin(t * 0.18) * 0.15;
            ctx.strokeStyle = `rgba(191,218,255,${a})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(18, -h * 0.32); ctx.lineTo(24, -h * 0.79); ctx.stroke();
        }
        if (this.isAttackActive()) {
            const a = this.curEff(), key = this._animForState();
            const p = (t - a.startup) / Math.max(1, a.active);
            const reach = a.range + this.width / 2;
            ctx.strokeStyle = this.isPureWhite() ? "rgba(250,252,255,.95)" : "rgba(196,223,255,.85)";
            ctx.lineWidth = 1.8; ctx.shadowColor = "#b9d2ff"; ctx.shadowBlur = 5;
            ctx.beginPath();
            if (key === "j2") {
                ctx.ellipse(reach * 0.45, -h * 0.59, reach * 0.58, 9 + p * 5, -0.10, -1.4, 1.5);
            } else if (key === "j3" || key === "launcher") {
                ctx.moveTo(14, -h * 0.3); ctx.quadraticCurveTo(reach * 0.86, -h * 0.4, reach * 0.64, -h * 1.08);
            } else if (key === "airAttack") {
                ctx.moveTo(12, -h * 0.7); ctx.lineTo(reach * 0.42, 12);
            } else {
                const y = key === "low" ? -h * 0.23 : -h * 0.60;
                ctx.moveTo(18, y); ctx.lineTo(reach, y);
            }
            ctx.stroke(); ctx.shadowBlur = 0;
            if (this.state === "super" && a.multiHit) {
                const phase = (t - a.startup) % Math.max(1, a.interval);
                ctx.globalAlpha = 0.18 * (1 - phase / Math.max(1, a.interval));
                ctx.strokeStyle = "#d4b46c"; ctx.lineWidth = 1;
                for (const y of [-h * 0.48, -h * 0.69]) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(reach - 8, y); ctx.stroke(); }
            }
        }
        ctx.restore();
    }

    _drawDuelist(ctx) {
        const P = this._palette();
        const u = 4;
        const t = this.stateTimer;
        const st = this.state;
        const b = this.getBodyBox();
        // 颜色明暗快速计算（#rrggbb → 乘以系数）
        const shade = (hex, f) => {
            const n = parseInt(hex.slice(1), 16);
            const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
            return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)]
                .map(v => v.toString(16).padStart(2, "0")).join("");
        };

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        if (st === "ko" && this.onGround) ctx.rotate(this.facing * Math.PI / 2 * 0.85);
        if (st === "knockdown") ctx.rotate(this.facing * Math.PI / 2 * 0.9);
        // 立绘统一约定：所有立绘素材必须原始朝右（贴图文件本身镜像调好），
        // 这里只按 facing 镜像，特效/判定框/立绘共用同一坐标系，保证方向永远一致。
        // SPRITE_FLIP：设置面板的「翻转立绘」调试开关（素材朝向存疑时人工校正用）
        ctx.scale(this.facing * (window.SPRITE_FLIP || 1), 1);

        const px = (x, y, w, h, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(Math.round(x) * u, -Math.round(y + h) * u, w * u, h * u);
        };
        // 垂直渐变填充（提升材质感）
        const pGrad = (x, y, w, h, cTop, cBot) => {
            const g = ctx.createLinearGradient(0, -Math.round(y + h) * u, 0, -Math.round(y) * u);
            g.addColorStop(0, cTop); g.addColorStop(1, cBot);
            ctx.fillStyle = g;
            ctx.fillRect(Math.round(x) * u, -Math.round(y + h) * u, w * u, h * u);
        };
        // 描边轮廓
        const pLine = (x, y, w, h, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(Math.round(x) * u + 0.5, -Math.round(y + h) * u + 0.5, w * u - 1, h * u - 1);
        };
        // 顶部受光高光（1px 亮线）
        const pHi = (x, y, w, color) => px(x, y + 1 - 1, w, 1, color);

        // 满层「纯白剑契」：全身白辉
        if (this.isPureWhite && this.isPureWhite()) {
            ctx.fillStyle = "rgba(244,246,255,0.14)";
            ctx.beginPath();
            ctx.arc(0, -(b.h * 0.5), 46 + Math.sin(t * 0.3) * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 冲刺残影
        if (st === "dash") {
            ctx.globalAlpha = 0.25;
            for (let i = 1; i <= 3; i++) pGrad(-3 - i * 3, 1, 7, 24, P.cloth, shade(P.cloth, 0.7));
            ctx.globalAlpha = 1;
        }

        const bob = (st === "idle" || st === "parry") ? Math.floor(t / 16) % 2 : 0;
        const step = (st === "walk") ? (Math.floor(t / 5) % 2 ? 1 : -1) : 0;
        const lean = (st === "turn") ? -1 : 0;   // 转身时身体前倾

        // ---- 披风（身后，渐变 + 描边 + 金色内衬，转身时大幅扬起） ----
        const sway = st === "turn" ? -3 : Math.floor(Math.sin(t * 0.12) * 1);
        pGrad(-6 + sway + lean, 6 + bob, 4, 13, shade(P.cape, 1.25), shade(P.cape, 0.65));
        pLine(-6 + sway + lean, 6 + bob, 4, 13, shade(P.cape, 0.45));
        px(-7 + sway + lean, 6 + bob, 1, 9, P.accent);
        pHi(-6 + sway + lean, 18 + bob, 4, shade(P.cape, 1.6));

        // ---- 腿（裤子渐变 + 靴子高光） ----
        if (st === "jump") {
            pGrad(-3, 2, 2, 5, P.pants, shade(P.pants, 0.7)); pGrad(1, 1, 2, 5, P.pants, shade(P.pants, 0.7));
            px(-3, 1, 2, 1, P.boots); px(1, 0, 2, 1, P.boots);
        } else if (st === "walk") {
            pGrad(-3 + step, 0, 2, 7, P.pants, shade(P.pants, 0.7));
            pGrad(1 - step, 0, 2, 7, P.pants, shade(P.pants, 0.7));
            px(-3 + step, 0, 2, 2, P.boots); px(1 - step, 0, 2, 2, P.boots);
            px(-3 + step, 1, 2, 1, shade(P.boots, 1.8)); px(1 - step, 1, 2, 1, shade(P.boots, 1.8));
        } else if (st !== "ko") {
            pGrad(-3, 0, 2, 7, P.pants, shade(P.pants, 0.7));
            pGrad(1, 0, 2, 7, P.pants, shade(P.pants, 0.7));
            px(-3, 0, 2, 2, P.boots); px(1, 0, 2, 2, P.boots);
            px(-3, 1, 2, 1, shade(P.boots, 1.8)); px(1, 1, 2, 1, shade(P.boots, 1.8));
        }

        // ---- 躯干（渐变马甲 + 白衬衫 + 金扣 + 描边 + 顶部高光） ----
        const ty = 7 + bob;
        pGrad(-3 + lean, ty, 7, 9, shade(P.cloth, 1.3), shade(P.cloth, 0.75));
        pLine(-3 + lean, ty, 7, 9, shade(P.cloth, 0.45));
        pHi(-3 + lean, ty + 8, 7, shade(P.cloth, 1.7));
        px(2 + lean, ty + 2, 2, 6, P.shirt);
        px(3 + lean, ty + 3, 1, 1, P.accent); px(3 + lean, ty + 5, 1, 1, P.accent);
        px(-3 + lean, ty + 8, 7, 1, P.accent);

        // ---- 头（皮肤渐变 + 礼帽渐变/描边/高光 + 羽饰双色） ----
        const hy = 16 + bob;
        pGrad(-3 + lean, hy, 6, 6, P.skin, P.skinD);
        px(-3 + lean, hy + 5, 6, 1, P.hair);
        px(2 + lean, hy + 2, 1, 1, "#1a1a3a");
        px(2 + lean, hy + 1, 1, 1, shade(P.hair, 1.15));      // 眉
        // 礼帽
        pGrad(-5 + lean, hy + 6, 11, 1, shade(P.hat, 1.35), shade(P.hat, 0.8));   // 帽檐
        pGrad(-3 + lean, hy + 7, 6, 3, shade(P.hat, 1.25), shade(P.hat, 0.7));    // 帽冠
        pLine(-3 + lean, hy + 7, 6, 3, shade(P.hat, 0.4));
        pHi(-3 + lean, hy + 9, 6, shade(P.hat, 1.8));
        px(-3 + lean, hy + 7, 6, 1, P.accent);                                    // 金带
        // 羽饰：双色 + 微摆
        const fsway = Math.floor(Math.sin(t * 0.15) * 1);
        px(-4 + lean, hy + 9, 1, 4, P.feather);
        px(-5 + lean + fsway, hy + 11, 1, 2, shade(P.feather, 0.85));
        px(0 + lean, hy, 3, 1, P.shirt);                                          // 领口

        // ---- 剑与手臂（依状态摆姿，剑身渐变） ----
        const handX = 4 + lean, handY = ty + 3;
        const bladeGrad = (x, y, len) => {
            pGrad(x, y, len, 1, P.swordHi, P.sword);
            px(x + len, y, 1, 1, P.swordHi);
        };
        if ((st === "attack" || st === "super") && this.currentAttack) {
            const a = this.curEff();
            let extend = 0;
            if (t < a.startup) extend = (t / a.startup) * 0.4;
            else if (t < a.startup + a.active) extend = 1;
            else extend = Math.max(0, 1 - (t - a.startup - a.active) / a.recovery);
            const blade = Math.max(1, Math.round((a.range / u) * extend));
            px(2 + lean, handY, 2, 2, P.shirt);
            px(handX - 1, handY, 1, 3, P.accent);
            bladeGrad(handX, handY + 1, blade);
            px(handX, handY, blade, 1, P.swordHi);
            if (st === "super") {
                ctx.strokeStyle = "rgba(255,209,102,0.85)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -(hy + 3) * u, 42 + Math.sin(t * 0.4) * 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (st === "skill") {
            px(3 + lean, ty + 1, 2, 2, P.shirt);
            px(3 + lean, ty + 3, 1, 2, P.accent);
            pGrad(4 + lean, ty + 5, 1, 8, P.swordHi, P.sword);
            px(4 + lean, ty + 13, 1, 1, P.swordHi);
        } else if (st === "parry") {
            // 决斗招架：细剑斜举，白色锋芒闪烁
            px(3 + lean, ty + 1, 2, 2, P.shirt);
            px(4 + lean, ty + 2, 1, 2, P.accent);
            pGrad(5 + lean, ty + 4, 1, 9, P.swordHi, P.sword);
            if (Math.floor(t / 4) % 2 === 0) px(6 + lean, ty + 12, 1, 1, "#ffffff");
        } else if (st === "block") {
            px(4 + lean, 0, 1, 17, P.sword);
            px(3 + lean, ty + 3, 2, 2, P.shirt);
            px(3 + lean, 2, 2, 1, P.accent);
            px(5 + lean, 2, 1, 12, "rgba(140,190,255,0.45)");
        } else if (st === "dash") {
            px(3 + lean, ty - 1, 3, 2, P.shirt);
            px(5 + lean, ty - 1, 1, 2, P.accent);
            pGrad(6 + lean, 0, 1, ty, P.swordHi, P.sword);
        } else {
            // 待机/走/跳/转身：细剑拄地
            px(2 + lean, ty + 2, 3, 2, P.shirt);
            px(4 + lean, ty + 3, 1, 2, P.accent);
            pGrad(5 + lean, 0, 1, ty + 3, P.swordHi, P.sword);
            px(5 + lean, 0, 1, 1, P.swordHi);
        }

        // 受击/破防闪光
        if (st === "hit" || st === "guardbreak") {
            ctx.fillStyle = P.flash;
            ctx.fillRect(-6 * u, -(hy + 10) * u, 13 * u, (hy + 10) * u);
        }

        // 专属资源图标（礼帽上方）
        if (this.resource > 0) {
            for (let i = 0; i < this.resource; i++) {
                const dx = -((this.resource - 1) * 3) / 2 + i * 3;
                px(dx - 0.5, hy + 11, 1, 1, this.isPureWhite() ? "#ffffff" : "#ffd166");
            }
        }

        ctx.restore();

        if (CONFIG.debug) {
            ctx.strokeStyle = "lime";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            const atk = this.getAttackBox();
            if (atk && this.isAttackActive()) {
                ctx.strokeStyle = "red";
                ctx.strokeRect(atk.x, atk.y, atk.w, atk.h);
            }
        }
    }

    // ---------- 江湖剑客：斗笠 / 蓑衣 / 打刀（设定图形象） ----------
    _drawWanderer(ctx) {
        const u = 4, t = this.stateTimer, st = this.state, b = this.getBodyBox();
        const shade = (hex, f) => {
            const n = parseInt(hex.slice(1), 16);
            const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
            return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)]
                .map(v => v.toString(16).padStart(2, "0")).join("");
        };
        const STRAW = "#9a8a5a", STRAW_D = "#6e6140", ROBE = "#41414a", ROBE_D = "#2c2c33";

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        if (st === "ko" && this.onGround) ctx.rotate(this.facing * Math.PI / 2 * 0.85);
        if (st === "knockdown") ctx.rotate(this.facing * Math.PI / 2 * 0.9);
        // 立绘统一约定：所有立绘素材必须原始朝右（贴图文件本身镜像调好），
        // 这里只按 facing 镜像，特效/判定框/立绘共用同一坐标系，保证方向永远一致。
        // SPRITE_FLIP：设置面板的「翻转立绘」调试开关（素材朝向存疑时人工校正用）
        ctx.scale(this.facing * (window.SPRITE_FLIP || 1), 1);

        const px = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(Math.round(x) * u, -Math.round(y + h) * u, w * u, h * u);
        };
        const pGrad = (x, y, w, h, cTop, cBot) => {
            const g = ctx.createLinearGradient(0, -Math.round(y + h) * u, 0, -Math.round(y) * u);
            g.addColorStop(0, cTop); g.addColorStop(1, cBot);
            ctx.fillStyle = g;
            ctx.fillRect(Math.round(x) * u, -Math.round(y + h) * u, w * u, h * u);
        };
        const pLine = (x, y, w, h, c) => {
            ctx.strokeStyle = c; ctx.lineWidth = 1;
            ctx.strokeRect(Math.round(x) * u + 0.5, -Math.round(y + h) * u + 0.5, w * u - 1, h * u - 1);
        };
        const pHi = (x, y, w, c) => px(x, y, w, 1, c);

        if (this.resource > 3) { /* 占位，剑客资源点照常绘制 */ }

        if (st === "dash") {
            ctx.globalAlpha = 0.25;
            for (let i = 1; i <= 3; i++) pGrad(-3 - i * 3, 1, 7, 24, ROBE, shade(ROBE, 0.7));
            ctx.globalAlpha = 1;
        }

        const bob = (st === "idle" || st === "parry") ? Math.floor(t / 16) % 2 : 0;
        const step = (st === "walk") ? (Math.floor(t / 5) % 2 ? 1 : -1) : 0;
        const lean = (st === "turn") ? -1 : 0;

        // ---- 蓑衣（草条披挂，层叠 + 描边） ----
        const sway = st === "turn" ? -3 : Math.floor(Math.sin(t * 0.12) * 1);
        for (let i = 0; i < 7; i++) {
            const sx = -7 + i * 2 + sway + lean;
            const len = 10 + (i % 3);
            pGrad(sx, 7 + bob - (i % 2), 1, len, i % 2 ? STRAW : shade(STRAW, 1.15), STRAW_D);
        }
        pLine(-7 + sway + lean, 6 + bob, 13, 3, shade(STRAW_D, 0.7));

        // ---- 腿（绑腿 + 草鞋） ----
        if (st === "jump") {
            pGrad(-3, 2, 2, 5, "#b8a888", "#8a7a62"); pGrad(1, 1, 2, 5, "#b8a888", "#8a7a62");
            px(-3, 1, 2, 1, ROBE_D); px(1, 0, 2, 1, ROBE_D);
        } else if (st === "walk") {
            pGrad(-3 + step, 0, 2, 7, "#b8a888", "#8a7a62");
            pGrad(1 - step, 0, 2, 7, "#b8a888", "#8a7a62");
            px(-3 + step, 0, 2, 1, ROBE_D); px(1 - step, 0, 2, 1, ROBE_D);
        } else if (st !== "ko") {
            pGrad(-3, 0, 2, 7, "#b8a888", "#8a7a62");
            pGrad(1, 0, 2, 7, "#b8a888", "#8a7a62");
            px(-3, 0, 2, 1, ROBE_D); px(1, 0, 2, 1, ROBE_D);
        }

        // ---- 残破长袍（深灰渐变 + 腰带 + 下摆破条） ----
        const ty = 7 + bob;
        pGrad(-3 + lean, ty, 7, 10, shade(ROBE, 1.25), shade(ROBE, 0.7));
        pLine(-3 + lean, ty, 7, 10, shade(ROBE, 0.4));
        pHi(-3 + lean, ty + 9, 7, shade(ROBE, 1.6));
        px(-3 + lean, ty + 6, 7, 1, "#6b5a3a");                       // 腰带
        px(-2 + lean, ty - 0, 1, 2, shade(ROBE, 0.6));                // 破条
        px(3 + lean, ty + 1, 1, 3, shade(ROBE, 0.6));

        // ---- 头（风霜肤色 + 散发 + 胡茬 + 斗笠） ----
        const hy = 17 + bob;
        pGrad(-3 + lean, hy, 6, 6, "#dfb58c", "#c1936e");
        px(-3 + lean, hy + 4, 6, 2, "#2a2a30");                       // 散发
        px(2 + lean, hy + 4, 1, 2, "#2a2a30");                        // 胡茬
        px(2 + lean, hy + 2, 1, 1, "#3a2a20");                        // 眼（沧桑）
        // 斗笠：锥形三层
        px(-6 + lean, hy + 6, 13, 1, shade(STRAW, 1.1));
        px(-4 + lean, hy + 7, 9, 1, STRAW);
        px(-2 + lean, hy + 8, 5, 1, STRAW_D);
        pHi(-6 + lean, hy + 6, 13, shade(STRAW, 1.5));

        // ---- 打刀（微弯刀身，态姿同决斗者逻辑） ----
        const handX = 4 + lean, handY = ty + 3;
        const katana = (x, y, len) => {
            pGrad(x, y, len, 1, "#e8ecf4", "#aab2c4");       // 刀身
            px(x + len, y - 1, 1, 1, "#e8ecf4");             // 刀尖微翘
            px(x - 1, y - 1, 1, 3, "#3a3020");               // 刀镡
        };
        if ((st === "attack" || st === "super") && this.currentAttack) {
            const a = this.curEff();
            let extend = 0;
            if (t < a.startup) extend = (t / a.startup) * 0.4;
            else if (t < a.startup + a.active) extend = 1;
            else extend = Math.max(0, 1 - (t - a.startup - a.active) / a.recovery);
            const blade = Math.max(1, Math.round((a.range / u) * extend));
            px(2 + lean, handY, 2, 2, ROBE_D);
            katana(handX, handY + 1, blade);
            px(handX, handY, blade, 1, "#eef1f8");
            if (st === "super") {
                ctx.strokeStyle = "rgba(200,214,255,0.85)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -(hy + 3) * u, 42 + Math.sin(t * 0.4) * 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (st === "skill") {
            px(3 + lean, ty + 1, 2, 2, ROBE_D);
            pGrad(4 + lean, ty + 5, 1, 8, "#e8ecf4", "#aab2c4");
        } else if (st === "parry") {
            px(3 + lean, ty + 1, 2, 2, ROBE_D);
            pGrad(5 + lean, ty + 4, 1, 9, "#eef1f8", "#aab2c4");
            if (Math.floor(t / 4) % 2 === 0) px(6 + lean, ty + 12, 1, 1, "#ffffff");
        } else if (st === "block") {
            px(4 + lean, 0, 1, 18, "#aab2c4");
            px(3 + lean, ty + 3, 2, 2, ROBE_D);
            px(5 + lean, 2, 1, 12, "rgba(140,190,255,0.45)");
        } else if (st === "dash") {
            px(3 + lean, ty - 1, 3, 2, ROBE_D);
            pGrad(6 + lean, 0, 1, ty, "#e8ecf4", "#aab2c4");
        } else {
            px(2 + lean, ty + 2, 3, 2, ROBE_D);
            px(3 + lean, ty + 3, 1, 2, "#3a3020");
            pGrad(5 + lean, 0, 1, ty + 3, "#e8ecf4", "#aab2c4");
        }

        if (st === "hit" || st === "guardbreak") {
            ctx.fillStyle = st === "guardbreak" ? "rgba(255,90,90,0.55)" : "rgba(255,255,255,0.5)";
            ctx.fillRect(-6 * u, -(hy + 10) * u, 13 * u, (hy + 10) * u);
        }

        if (this.resource > 0) {
            for (let i = 0; i < this.resource; i++) {
                const dx = -((this.resource - 1) * 3) / 2 + i * 3;
                px(dx - 0.5, hy + 11, 1, 1, "#ffd166");
            }
        }

        ctx.restore();

        if (CONFIG.debug) {
            ctx.strokeStyle = "lime";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            const atk = this.getAttackBox();
            if (atk && this.isAttackActive()) {
                ctx.strokeStyle = "red";
                ctx.strokeRect(atk.x, atk.y, atk.w, atk.h);
            }
        }
    }

    // ---------- 银铠的守望者 · 脱甲形态：银高马尾 / 黑甲红破布 / 符文巨剑 ----------
    _drawWatcher(ctx) {
        const u = 4, t = this.stateTimer, st = this.state, b = this.getBodyBox();
        const shade = (hex, f) => {
            const n = parseInt(hex.slice(1), 16);
            const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
            return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)]
                .map(v => v.toString(16).padStart(2, "0")).join("");
        };
        const HAIR = "#e9e9f2", ARMOR = "#2a2a33", PLATE = "#8a90a0", RED = "#7a2233", RUNE = "#4ad08a";

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        if (st === "ko" && this.onGround) ctx.rotate(this.facing * Math.PI / 2 * 0.85);
        if (st === "knockdown") ctx.rotate(this.facing * Math.PI / 2 * 0.9);
        // 立绘统一约定：所有立绘素材必须原始朝右（贴图文件本身镜像调好），
        // 这里只按 facing 镜像，特效/判定框/立绘共用同一坐标系，保证方向永远一致。
        // SPRITE_FLIP：设置面板的「翻转立绘」调试开关（素材朝向存疑时人工校正用）
        ctx.scale(this.facing * (window.SPRITE_FLIP || 1), 1);

        const px = (x, y, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(Math.round(x) * u, -Math.round(y + h) * u, w * u, h * u);
        };
        const pGrad = (x, y, w, h, cTop, cBot) => {
            const g = ctx.createLinearGradient(0, -Math.round(y + h) * u, 0, -Math.round(y) * u);
            g.addColorStop(0, cTop); g.addColorStop(1, cBot);
            ctx.fillStyle = g;
            ctx.fillRect(Math.round(x) * u, -Math.round(y + h) * u, w * u, h * u);
        };
        const pLine = (x, y, w, h, c) => {
            ctx.strokeStyle = c; ctx.lineWidth = 1;
            ctx.strokeRect(Math.round(x) * u + 0.5, -Math.round(y + h) * u + 0.5, w * u - 1, h * u - 1);
        };

        // 绿色魔法微光粒子（绕身浮动）
        for (let i = 0; i < 3; i++) {
            const ang = t * 0.08 + i * 2.1;
            const mx = Math.round(Math.cos(ang) * 8);
            const my = Math.round(12 + Math.sin(ang * 1.3) * 8);
            ctx.globalAlpha = 0.55;
            px(mx, my, 1, 1, RUNE);
            ctx.globalAlpha = 1;
        }

        if (st === "dash") {
            ctx.globalAlpha = 0.25;
            for (let i = 1; i <= 3; i++) pGrad(-2 - i * 3, 1, 6, 24, ARMOR, shade(ARMOR, 0.7));
            ctx.globalAlpha = 1;
        }

        const bob = (st === "idle" || st === "parry") ? Math.floor(t / 16) % 2 : 0;
        const step = (st === "walk") ? (Math.floor(t / 5) % 2 ? 1 : -1) : 0;
        const lean = (st === "turn") ? -1 : 0;

        // ---- 银色高马尾（长发条，随动作飘动） ----
        const flow = Math.floor(Math.sin(t * 0.14) * 1.5) + (st === "walk" ? -step : 0) + (st === "turn" ? -3 : 0);
        for (let i = 0; i < 4; i++) {
            pGrad(-4 + i + flow + lean, 8 + bob, 1, 12 + (i % 2), shade(HAIR, 1.05), shade(HAIR, 0.75));
        }
        px(-4 + flow + lean, 20 + bob, 2, 3, shade(HAIR, 0.85));   // 发束末端

        // ---- 腿（黑甲长靴 + 银扣） ----
        if (st === "jump") {
            pGrad(-2, 2, 2, 5, ARMOR, shade(ARMOR, 0.6)); pGrad(1, 1, 2, 5, ARMOR, shade(ARMOR, 0.6));
            px(-2, 1, 2, 1, "#15151c"); px(1, 0, 2, 1, "#15151c");
        } else if (st === "walk") {
            pGrad(-2 + step, 0, 2, 7, ARMOR, shade(ARMOR, 0.6));
            pGrad(1 - step, 0, 2, 7, ARMOR, shade(ARMOR, 0.6));
            px(-2 + step, 0, 2, 2, "#15151c"); px(1 - step, 0, 2, 2, "#15151c");
            px(-2 + step, 2, 1, 1, PLATE); px(1 - step, 2, 1, 1, PLATE);
        } else if (st !== "ko") {
            pGrad(-2, 0, 2, 7, ARMOR, shade(ARMOR, 0.6));
            pGrad(1, 0, 2, 7, ARMOR, shade(ARMOR, 0.6));
            px(-2, 0, 2, 2, "#15151c"); px(1, 0, 2, 2, "#15151c");
            px(-2, 2, 1, 1, PLATE); px(1, 2, 1, 1, PLATE);
        }

        // ---- 躯干（黑色无袖铠甲 + 银护肩 + 暗红破布腰裙） ----
        const ty = 7 + bob;
        pGrad(-2 + lean, ty, 6, 9, shade(ARMOR, 1.4), shade(ARMOR, 0.7));
        pLine(-2 + lean, ty, 6, 9, shade(ARMOR, 0.35));
        px(-3 + lean, ty + 7, 1, 2, PLATE);                       // 左护肩
        px(3 + lean, ty + 7, 1, 2, PLATE);                        // 右护肩
        // 暗红破布条（腰裙，三条，摆动）
        for (let i = 0; i < 3; i++) {
            const rx = -2 + i * 2 + lean + (st === "walk" ? -step : 0);
            pGrad(rx, ty - 2, 1, 4 + (i % 2), RED, shade(RED, 0.6));
        }

        // ---- 头（苍白肤色 + 绿瞳 + 银刘海） ----
        const hy = 16 + bob;
        pGrad(-2 + lean, hy, 5, 6, "#f5e6dd", "#dfc0b2");
        px(-2 + lean, hy, 5, 1, HAIR);                            // 刘海
        px(2 + lean, hy + 2, 1, 1, RUNE);                         // 绿瞳（魔法感应）
        px(-2 + lean, hy + 5, 5, 1, shade(HAIR, 0.9));            // 后发
        // 高马尾束结
        px(-1 + lean, hy + 6, 2, 1, "#15151c");

        // ---- 符文巨剑（宽刃 + 绿符文 + 双手大剑姿态） ----
        const handX = 4 + lean, handY = ty + 3;
        const greatBlade = (x, y, len) => {
            pGrad(x, y - 1, len, 3, "#cfd4e2", "#8a90a2");        // 宽刃
            px(x + len, y, 1, 1, "#e8ecf4");                      // 剑尖
            px(x + Math.floor(len / 2), y, 1, 1, RUNE);           // 符文
            px(x + Math.floor(len / 3), y + 1, 1, 1, RUNE);
        };
        if ((st === "attack" || st === "super") && this.currentAttack) {
            const a = this.curEff();
            let extend = 0;
            if (t < a.startup) extend = (t / a.startup) * 0.4;
            else if (t < a.startup + a.active) extend = 1;
            else extend = Math.max(0, 1 - (t - a.startup - a.active) / a.recovery);
            const blade = Math.max(1, Math.round((a.range / u) * extend));
            px(2 + lean, handY - 1, 2, 2, ARMOR);
            px(handX - 1, handY - 1, 1, 4, PLATE);                // 大护手
            greatBlade(handX, handY, blade);
            if (st === "super") {
                ctx.strokeStyle = "rgba(74,208,138,0.85)";        // 碧绿超杀气场
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -(hy + 3) * u, 44 + Math.sin(t * 0.4) * 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (st === "skill") {
            px(3 + lean, ty, 2, 2, ARMOR);
            pGrad(4 + lean, ty + 4, 2, 9, "#cfd4e2", "#8a90a2");
            px(5 + lean, ty + 8, 1, 1, RUNE);
        } else if (st === "parry") {
            px(3 + lean, ty, 2, 2, ARMOR);
            pGrad(5 + lean, ty + 3, 2, 10, "#e8ecf4", "#8a90a2");
            if (Math.floor(t / 4) % 2 === 0) px(7 + lean, ty + 12, 1, 1, "#ffffff");
        } else if (st === "block") {
            pGrad(5 + lean, 0, 2, 18, "#aab2c4", "#767e92");      // 巨剑竖挡
            px(3 + lean, ty + 3, 2, 2, ARMOR);
            px(6 + lean, 2, 1, 12, "rgba(140,190,255,0.45)");
        } else if (st === "dash") {
            px(3 + lean, ty - 1, 3, 2, ARMOR);
            pGrad(6 + lean, 0, 2, ty, "#cfd4e2", "#8a90a2");
        } else {
            // 待机：巨剑拄地
            px(2 + lean, ty + 1, 3, 2, ARMOR);
            px(4 + lean, ty + 2, 1, 2, PLATE);
            pGrad(5 + lean, 0, 2, ty + 2, "#cfd4e2", "#8a90a2");
            px(6 + lean, 3, 1, 1, RUNE);
        }

        if (st === "hit" || st === "guardbreak") {
            ctx.fillStyle = st === "guardbreak" ? "rgba(255,90,90,0.55)" : "rgba(255,255,255,0.5)";
            ctx.fillRect(-5 * u, -(hy + 10) * u, 12 * u, (hy + 10) * u);
        }

        if (this.resource > 0) {
            for (let i = 0; i < this.resource; i++) {
                const dx = -((this.resource - 1) * 3) / 2 + i * 3;
                px(dx - 0.5, hy + 12, 1, 1, "#ffd166");
            }
        }

        ctx.restore();

        if (CONFIG.debug) {
            ctx.strokeStyle = "lime";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            const atk = this.getAttackBox();
            if (atk && this.isAttackActive()) {
                ctx.strokeStyle = "red";
                ctx.strokeRect(atk.x, atk.y, atk.w, atk.h);
            }
        }
    }
}
