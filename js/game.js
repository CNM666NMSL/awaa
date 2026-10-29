/* ============================================================
   game.js — 主循环 + 菜单流程 + 局域网同步
   模式：
     local      本地双人同键盘（测试用，P2 用小键盘）
     lan-host   局域网主机：模拟全场，向客机广播快照
     lan-guest  局域网客机：只发输入，渲染主机快照
   ============================================================ */

// ---------- 本地测试模式 P2 键位（正式对战走局域网，双端键位一致） ----------
const TEST_KEYS_P2 = {
    left: "ArrowLeft", right: "ArrowRight",
    up: "ArrowUp", down: "ArrowDown",
    attack: "Numpad1", jump: "Numpad2", dash: "Numpad3",
    skill: "Numpad4", super_: "Numpad5", special: "Numpad6",
    charge: "Numpad7",
};

class Game {
    constructor() {
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.keysDown = {};
        this.keysPressed = {};

        // 模式与阶段
        this.mode = null;              // local / lan-host / lan-guest
        this.phase = "menu";           // menu / intro / fight / ko / between / matchEnd / paused
        this.phaseTimer = 0;
        this.timeLeft = CONFIG.round.time;
        this.frameCount = 0;
        this.frameSnap = 0;
        this._lastHp = [null, null];
        this.roundStartMs = null;   // 本回合战斗开始的真实时间戳（fight 阶段首个 update 记录）
        this.pauseStartMs = null;
        this.shake = 0;
        this.sparks = [];
        this.projectiles = [];
        this.net = null;

        // 房间/大厅状态
        this.lobby = {
            myChar: null, oppChar: null,
            stage: CONFIG.stageOrder[0],
            format: "bo3",
            bossEnabled: false,
            myReady: false, oppReady: false,
        };
        this.matchOptions = null;

        this.bindInput();
        this.bindMenus();
        this._lastTime = performance.now();
        this._accum = 0;
        requestAnimationFrame(() => this.loop());
    }

    // ================= 输入 =================

    bindInput() {
        window.addEventListener("keydown", (e) => {
            const code = /^Digit[1-7]$/.test(e.code) ? e.code.replace("Digit","Numpad") : e.code;
            if (!this.keysDown[code]) this.keysPressed[code] = true;
            this.keysDown[code] = true;
            if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
            if (e.code === "Escape" && (this.phase === "fight" || this.phase === "paused")) this.togglePause();
        });
        window.addEventListener("keyup", (e) => { const code = /^Digit[1-7]$/.test(e.code) ? e.code.replace("Digit","Numpad") : e.code; this.keysDown[code] = false; });
        window.addEventListener("blur", () => { this.keysDown = {}; this.keysPressed = {}; this._edgeStore={};this._edgeStore1={};this._edgeStore2={}; });
    }

    /** 读取一帧输入（含边沿检测），返回输入对象；联机时直接发给主机 */
    readInput(keyMap, edgeStore) {
        const k = this.keysDown;
        const edge = (code) => {
            const was = edgeStore[code] || false;
            edgeStore[code] = !!k[code];
            const pressed = !!this.keysPressed?.[code];
            if (this.keysPressed) delete this.keysPressed[code];
            return pressed || (!!k[code] && !was);
        };
        const jumpPressed = edge(keyMap.jump);
        edge(keyMap.up);
        const leftPressed=edge(keyMap.left),rightPressed=edge(keyMap.right);
        const tick=edgeStore._inputTick=(edgeStore._inputTick||0)+1;
        for(const [dir,pressed]of [[-1,leftPressed],[1,rightPressed]])if(pressed){const name=dir<0?'_leftTap':'_rightTap';if(edgeStore[name]!==undefined&&tick-edgeStore[name]<=CONFIG.physics.doubleTapFrames)edgeStore._runDir=dir;edgeStore[name]=tick;edgeStore[dir<0?"_rightTap":"_leftTap"]=undefined;}
        if((!k[keyMap.left]&&!k[keyMap.right])||(k[keyMap.left]&&k[keyMap.right])||(edgeStore._runDir===-1&&!k[keyMap.left])||(edgeStore._runDir===1&&!k[keyMap.right]))edgeStore._runDir=0;
        const skillHeld=!!k[keyMap.skill],skillWas=!!edgeStore[keyMap.skill];
        return {
            sklHeld:skillHeld,sklRelease:skillWas&&!skillHeld,
            l: !!k[keyMap.left], r: !!k[keyMap.right],
            u: !!k[keyMap.up], d: !!k[keyMap.down],
            atk: edge(keyMap.attack), jmp: jumpPressed, run: edgeStore._runDir||0,
            dsh: edge(keyMap.dash), skl: edge(keyMap.skill),
            sup: edge(keyMap.super_), spc: edge(keyMap.special),
            chg: !!k[keyMap.charge], chgHeld: !!k[keyMap.charge],
            ukemi: edge(keyMap.down),
        };
    }

    /** 把输入对象应用到角色上（主机对双方、单机对双方都走这里） */
    applyInput(f, inp) {
        if (this.phase !== "fight") return;
        if (f.state === "ko") return;

        if (inp.ukemi) f.tryUkemi();

        // 朝向统一入口：方向键按哪边，facing 就朝哪边（攻击/防御/移动共用，锁状态自动锁定）
        const aimDir = (inp.l && !inp.r) ? -1 : (!inp.l && inp.r) ? 1 : 0;
        f.aim(aimDir);

        // 攻击输入：冲刺中=滑步突刺；S+J 下攻；W+J 上攻；其余=普攻（空中自动变下劈刺）
        if(inp.jmp)f.jump(inp.l&&!inp.r?-1:inp.r&&!inp.l?1:0);
        if (inp.dsh) f.dash();
        if (inp.atk) {
            if (f.state === "dash") f.dashAttack();
            else if (!f.onGround) f.attack();
            else if (inp.d) f.comboAttack("low");
            else if (inp.u) f.comboAttack("launcher");
            else f.attack();
        }
        if(this.handleRangedInput)this.handleRangedInput(f,inp);
        else if (inp.skl) {
            const s = f.castSkill();
            if (s) { f.pendingProj = s; f.currentSkillFrames = s.startup + s.recovery; }
        }
        // I 键：按住 S = 形态切换（双形态角色专属，耗 2 段气）；否则放必杀（按气量分档）
        if (inp.sup) {
            if (inp.d && f.canSwitchForm()) {
                f.switchForm();
                // 形态切换成功
            } else {
                f.castSuperTier();
            }
        }
        // 按住 P 蓄气；到时或受击后必须先松键，才能再次开始。蓄气中受伤×1.5。
        if (!inp.chgHeld) f.chargeInterrupted = false;
        if (inp.chgHeld && ["hit","guardbreak","knockdown"].includes(f.state)) f.chargeInterrupted = true;
        const charging = inp.chgHeld && !f.chargeInterrupted;
        if (charging && f.state !== "charge") {
            f.startCharge();
        } else if (!charging && f.state === "charge") {
            f.endCharge();
        }
        if (inp.spc) f.castSpecial();

        // 防御：按住 S（朝向已由 aim 统一处理，这里只管进入/退出防御）
        f.block(inp.d && f.state !== "hit");

        // 移动：按住方向键走（朝向已由 aim 处理，move 只负责位移）
        if (inp.l && !inp.r) f.move(-1,inp.run===-1);
        else if (inp.r && !inp.l) f.move(1,inp.run===1);
        else f.stopMove();
    }

    // ================= 菜单与大厅 =================

    show(id) {
        for (const el of document.querySelectorAll(".overlay")) el.classList.add("hidden");
        if (id) document.getElementById(id).classList.remove("hidden");
    }

    bindMenus() {
        const $ = (id) => document.getElementById(id);

        // ---------- 主页面热点按钮 ----------
        for (const btn of document.querySelectorAll(".hotspot")) {
            btn.onclick = () => this.onMainMenu(btn.dataset.target);
        }
        $("btn-mode-back").onclick = () => this.show("menu-main");
        $("btn-lan").onclick = () => this.show("menu-lan");
        $("btn-lan-back").onclick = () => this.show("menu-mode");
        $("btn-local").onclick = () => this.openLocalSelect();
        $("btn-create").onclick = () => this.createRoom();
        $("btn-join").onclick = () => this.joinRoom();
        $("btn-ready").onclick = () => this.toggleReady();
        // 房间大厅返回主页：断开连接并回到主界面
        $("btn-lobby-back").onclick = () => { if (this.net) this.net.close(); location.reload(); };
        // 本地对战选人
        $("btn-local-start").onclick = () => this.startLocalMatch();
        $("btn-local-back").onclick = () => this.show("menu-mode");
        $("btn-next-round").onclick = () => this.nextRound();
        $("btn-back-lobby").onclick = () => this.backToLobby();
        $("btn-resume").onclick = () => this.togglePause();
        $("btn-quit").onclick = () => location.reload();

        // ---------- 对局内「⚙ 设置」按钮：暂停/退出（Esc 或点击均可，联机双方都能暂停） ----------
        $("btn-ingame-settings").onclick = () => this.togglePause();

        // ---------- 剧情模式 ----------
        $("btn-story-back").onclick = () => { this.stopVideo("story-video"); this.show("menu-main"); };
        this.buildChapterList();

        // ---------- 人物CG ----------
        $("btn-cg-back").onclick = () => { this.stopVideo("cg-video"); this.show("menu-main"); };
        this.buildCgList();

        // ---------- 设置 ----------
        $("btn-settings-back").onclick = () => this.show("menu-main");
        $("opt-debug").onchange = (e) => { CONFIG.debug = e.target.checked; };
        // 立绘翻转开关：立绘素材朝向反了就勾上，存 localStorage（刷新/重开都记住）
        // 每次 ASSET_VER 更新后自动重置为未翻转，避免旧缓存/旧 workaround 干扰新素材
        const flipBox = $("opt-flip");
        const storedVer = localStorage.getItem("assetVer");
        if (storedVer !== ASSET_VER) {
            localStorage.removeItem("flipSprites");
            localStorage.setItem("assetVer", ASSET_VER);
        }
        flipBox.checked = localStorage.getItem("flipSprites") === "1";
        window.SPRITE_FLIP = flipBox.checked ? -1 : 1;
        flipBox.onchange = (e) => {
            window.SPRITE_FLIP = e.target.checked ? -1 : 1;
            localStorage.setItem("flipSprites", e.target.checked ? "1" : "0");
        };

        // ---------- 退出游戏 ----------
        $("btn-exit-no").onclick = () => this.show("menu-main");
        $("btn-exit-yes").onclick = () => {
            this.show("menu-farewell");
            if (this.net) this.net.close();
            // 由脚本打开的窗口才能被脚本关闭；普通标签页提示用户手动关闭
            setTimeout(() => window.close(), 300);
        };

        // 主机房间选项变更 → 同步客机
        $("opt-format").onchange = (e) => { this.lobby.format = e.target.value; this.syncLobbyOptions(); };
        $("opt-boss").onchange = (e) => { this.lobby.bossEnabled = e.target.checked; this.buildCharGrid(); this.syncLobbyOptions(); };
    }

    // ---------- 主页面路由 ----------

    onMainMenu(target) {
        switch (target) {
            case "story":    this.show("menu-story"); break;
            case "duel":     this.show("menu-mode"); break;
            case "cg":       this.show("menu-cg"); break;
            case "settings": this.show("menu-settings"); break;
            case "exit":     this.show("menu-exit"); break;
        }
    }

    // ---------- 剧情模式 ----------

    buildChapterList() {
        const list = document.getElementById("chapter-list");
        list.innerHTML = "";
        const scenes = [
            "黄昏的雨水打湿了废弃街道。路灯在积水中摇晃，贵族决斗者与江湖剑客在残街相遇。各自握紧的剑，成为这场对决的开端。",
            "夜色渐深，街角传来陌生的脚步声。银铠守望者穿过雨幕；在沉重的铠甲与誓约之间，每个人都要作出自己的选择。",
            "隐藏在夜幕中的身影终于显露。残街上的对决走向终章，而关于玄鸦的谜团，仍等待被揭开。"
        ];
        CONFIG.story.chapters.forEach((ch, i) => {
            const el = document.createElement("button");
            el.className = "chapter-item";
            el.innerHTML = '<span class="chapter-number">0'+(i+1)+'</span><strong>'+ch.title+'</strong><div class="sub">'+ch.sub+'</div>';
            el.onclick = () => {
                list.querySelectorAll(".chapter-item").forEach(c => c.classList.remove("selected"));
                el.classList.add("selected");
                const ph = document.getElementById("story-placeholder");
                ph.innerHTML = '<div class="chapter-preview"><span class="eyebrow">CHAPTER 0'+(i+1)+'</span><h3>'+ch.title+'</h3><p>'+scenes[i]+'</p><div class="chapter-cast">'+CONFIG.roster.map(id => this.charCardHtml(CONFIG.characters[id])).map(html=>'<div class="cast-figure">'+html+'</div>').join('')+'</div><span class="chapter-status">故事预览 · 章节动画尚未开放</span></div>';
                this.playVideo("story-video", "story-placeholder", ch.video, null);
            };
            list.appendChild(el);
        });
        list.firstElementChild?.click();
    }

    buildCgList() {
        const list = document.getElementById("cg-list");
        list.innerHTML = "";
        for (const id of CONFIG.roster) {
            const c = CONFIG.characters[id];
            const el = document.createElement("button");
            el.className = "chapter-item fighter-index";
            el.setAttribute("aria-label", c.name);
            el.innerHTML = this.charCardHtml(c);
            el.onclick = () => {
                list.querySelectorAll(".chapter-item").forEach(x => x.classList.remove("selected"));
                el.classList.add("selected");
                this.showCg(id);
            };
            list.appendChild(el);
        }
        list.firstElementChild?.click();
    }

    showCg(charId) {
        const c = CONFIG.characters[charId];
        const profiles = {
            noble: ["以细剑掌握节奏的决斗者。直刺、横划与上挑连成精确的攻势，蓝色披风与白羽礼帽是他的标志。", "精准招架 / 剑契强化"],
            jianke: ["斗笠遮面，蓑衣迎雨。无名剑客以三段斩击衔接踏影突进，用银白剑气封锁对手的退路。", "近身连斩 / 剑意增伤"],
            shouwang: ["身披银铠的守望者，以重剑与沉稳的步伐守住战线。穿甲与脱甲形态带来不同的攻防节奏。", "双形态 / 重剑压制"]
        };
        const profile = c.profile || profiles[charId] || [c.title, '自由对决'];
        const portrait = this.charCardHtml(c);
        const moves = [
            ["J / 1", c.combo.length+"段普攻", c.combo.map(m=>m.damage).join(" / ")],
            ["W + J / ↑ + 1", "上攻", c.launcher.damage],
            ["S + J / ↓ + 1", "下攻 · 破防", c.low.damage],
            ["U / 4", (c.skill.name||"远攻")+(c.skill.forms?.unarmored?" / 脱甲："+c.skill.forms.unarmored.name:"")+" · 无耗气", c.skill.damage],
            ["I / 5", (c.super_.name||"超必杀")+" · 100气", (c.super_.signatureArt ? c.super_.signatureArt==='sword-domain'?`${c.super_.pulseDamage}/秒 × 8秒`:`${c.super_.pulseDamage} × ${c.super_.pulses}` : c.super_.multiHit ? c.super_.hits + " × " + c.super_.perHit + " + " + c.super_.finalDamage : c.super_.damage)]
        ];
        const card = document.getElementById("cg-card");
        document.getElementById("cg-placeholder").classList.add("hidden");
        document.getElementById("cg-video").style.display = "none";
        card.classList.remove("hidden");
        card.innerHTML = '<div class="dossier-art">'+portrait+'</div><div class="dossier-copy"><span class="eyebrow">FIGHTER / 0'+(CONFIG.roster.indexOf(charId)+1)+'</span><h3>'+c.name+'</h3><div class="title-tag">'+c.title+'</div><p>'+profile[0]+'</p><div class="fighter-tags"><span>生命 '+(c.maxHealth || CONFIG.resources.maxHealth)+'</span><span>'+profile[1]+'</span></div><h4>'+c.resource.name+' · 上限 '+c.resource.max+'</h4><p>'+c.resource.desc+'</p><table class="dossier-moves"><thead><tr><th>操作</th><th>招式</th><th>基础伤害</th></tr></thead><tbody>'+moves.map(m=>'<tr><td>'+m[0]+'</td><td>'+m[1]+'</td><td>'+m[2]+'</td></tr>').join('')+'</tbody></table><p class="dossier-note">伤害为基础值，实战受资源层数、形态与连段影响。P / 7 长按攒气。</p></div>';
    }

    /** 视频播放通用：文件存在则播放，不存在则显示占位（CG 页额外显示资料卡） */
    playVideo(videoId, placeholderId, src, placeholderHtml, fallbackCard) {
        const video = document.getElementById(videoId);
        const ph = document.getElementById(placeholderId);
        if (fallbackCard) fallbackCard.classList.add("hidden");
        ph.classList.remove("hidden");
        video.style.display = "none";
        video.pause();
        video.removeAttribute("src");
        video.load();

        if (placeholderHtml) ph.querySelector("p").innerHTML = placeholderHtml;

        // 尝试加载视频
        video.onerror = null;
        video.src = src;
        video.onerror = () => {
            video.style.display = "none";
            ph.classList.remove("hidden");
            if (fallbackCard) {
                ph.classList.add("hidden");
                fallbackCard.classList.remove("hidden");
            }
        };
        video.onloadeddata = () => {
            ph.classList.add("hidden");
            if (fallbackCard) fallbackCard.classList.add("hidden");
            video.style.display = "block";
            video.play().catch(() => {});   // 浏览器自动播放限制时由用户点播放
        };
    }

    stopVideo(videoId) {
        const v = document.getElementById(videoId);
        v.pause();
        v.removeAttribute("src");
        v.load();
    }

    // ---------- 局域网 ----------

    lanStatus(msg) { document.getElementById("lan-status").textContent = msg; }
    lobbyStatus(msg) { document.getElementById("lobby-status").textContent = msg; }

    createRoom() {
        this.lanStatus("正在创建房间…");
        this.setupNet();
        // 线上/局域网都连当前页面同一地址的 /ws，无需再填 IP
        this.net.connect();
    }

    joinRoom() {
        const code = document.getElementById("input-room").value.trim();
        if (!/^\d{4}$/.test(code)) return this.lanStatus("请输入 4 位房间号");
        this.lanStatus("正在加入房间…");
        this.setupNet();
        this._pendingJoin = code;
        this.net.connect();
    }

    setupNet() {
        this.net = new NetClient();
        this.net.onError = (msg) => this.lanStatus(msg);
        this.net.onOpen = () => {
            if (this._pendingJoin) {
                this.net.joinRoom(this._pendingJoin);
                this._pendingJoin = null;
            } else {
                this.net.createRoom();
            }
        };
        this.net.onCreated = (code) => this.enterLobby(code, true);
        this.net.onJoined = (code) => this.enterLobby(code, false);
        this.net.onPeerJoined = () => {
            this.lobbyStatus("对方已加入，选择角色后点击准备");
            document.getElementById("opp-info").textContent = "对方：已连接";
            this.syncLobbyOptions();
        };
        this.net.onPeerLeft = () => {
            alert("对方已断开连接");
            location.reload();
        };
        this.net.onRelay = (d) => this.onNetMessage(d);
    }

    enterLobby(code, isHost) {
        this.isHost = isHost;
        this.show("menu-lobby");
        document.getElementById("room-code").textContent = "房间号 " + code;
        document.getElementById("lobby-me-label").textContent = isHost ? "我方角色（主机）" : "我方角色（客机）";
        if (isHost) {
            this.lobbyStatus("等待对方加入…把房间号告诉对方");
            document.getElementById("opp-info").textContent = "对方：未连接";
        } else {
            this.lobbyStatus("已进入房间，选择角色后点击准备");
            document.getElementById("opp-info").textContent = "对方：主机";
            // 客机不能改场景和选项
            document.getElementById("opt-format").disabled = true;
            document.getElementById("opt-boss").disabled = true;
        }
        this.buildCharGrid();
        this.buildStageGrid();
    }

    // 角色卡片内容：有立绘贴图的角色直接用贴图做头像（双形态角色用穿甲形态）
    charCardHtml(c) {
        const img = (c.sprites && c.sprites.armored) || c.sprite;
        const portrait = img ? '<img class="char-portrait '+(img.includes('jianke')?'padded':'')+'" src="'+img+'?v='+ASSET_VER+'" alt="'+c.name+'立绘" draggable="false">' : '<span class="portrait-fallback">'+c.name.slice(0,1)+'</span>';
        return '<div class="portrait-stage">'+portrait+'</div><div class="char-name">'+c.name+'</div><div class="char-title">'+(c.title||'')+'</div><div class="res-name">'+c.resource.name+'</div>';

    }

    buildCharGrid() {
        const grid = document.getElementById("char-grid");
        grid.innerHTML = "";
        for (const id of CONFIG.roster) {
            const c = CONFIG.characters[id];
            const locked = c.boss && !this.lobby.bossEnabled;
            const card = document.createElement("div");
            card.className = "char-card" + (locked ? " locked" : "") + (this.lobby.myChar === id ? " selected" : "");
            card.innerHTML = this.charCardHtml(c);
            if (!locked) card.onclick = () => this.pickChar(id);
            grid.appendChild(card);
        }
    }

    buildStageGrid() {
        if (this.buildStagePicker) return this.buildStagePicker("stage-grid", this.lobby.stage, id => {
            this.lobby.stage = id;
            this.buildStageGrid();
            this.syncLobbyOptions();
        }, this.isHost);
        const grid = document.getElementById("stage-grid");
        grid.innerHTML = "";
        for (const id of CONFIG.stageOrder) {
            const s = CONFIG.stages[id];
            const card = document.createElement("div");
            card.className = "stage-card" + (this.lobby.stage === id ? " selected" : "") + (this.isHost ? "" : " disabled");
            card.style.background = s.img
                ? `#101625 url('${s.img}') center/cover no-repeat`
                : `linear-gradient(180deg, ${s.sky[0]}, ${s.sky[1]})`;
            card.textContent = s.name;
            if (this.isHost) card.onclick = () => {
                this.lobby.stage = id;
                this.buildStageGrid();
                this.syncLobbyOptions();
            };
            grid.appendChild(card);
        }
    }

    pickChar(id) {
        this.lobby.myChar = id;
        this.lobby.myReady = false;
        document.getElementById("btn-ready").textContent = "准备";
        this.buildCharGrid();
        if (this.net) this.net.send({ k: "char", char: id });
    }

    syncLobbyOptions() {
        if (!this.isHost || !this.net) return;
        this.net.send({
            k: "options",
            stage: this.lobby.stage,
            format: this.lobby.format,
            boss: this.lobby.bossEnabled,
        });
    }

    toggleReady() {
        if (!this.lobby.myChar) return this.lobbyStatus("请先选择角色");
        this.lobby.myReady = !this.lobby.myReady;
        document.getElementById("btn-ready").textContent = this.lobby.myReady ? "取消准备" : "准备";
        if (this.net) this.net.send({ k: "ready", ready: this.lobby.myReady });
        this.checkStart();
    }

    checkStart() {
        // 双方都准备好后由主机发开局消息
        if (!this.isHost) return;
        if (this.lobby.myReady && this.lobby.oppReady && this.lobby.myChar && this.lobby.oppChar) {
            const setup = {
                k: "start",
                hostChar: this.lobby.myChar, guestChar: this.lobby.oppChar,
                stage: this.lobby.stage, format: this.lobby.format,
            };
            this.net.send(setup);
            this.beginLanMatch(setup, true);
        } else {
            this.lobbyStatus(this.lobby.oppReady ? "等待你准备…" : "等待对方选择与准备…");
        }
    }

    /** 收到对方消息 */
    onNetMessage(d) {
        switch (d.k) {
            case "char":
                this.lobby.oppChar = d.char;
                document.getElementById("opp-info").textContent =
                    "对方：" + CONFIG.characters[d.char].name + (this.lobby.oppReady ? "（已准备）" : "");
                this.checkStart();
                break;
            case "ready":
                this.lobby.oppReady = d.ready;
                if (this.lobby.oppChar) {
                    document.getElementById("opp-info").textContent =
                        "对方：" + CONFIG.characters[this.lobby.oppChar].name + (d.ready ? "（已准备）" : "");
                }
                this.checkStart();
                break;
            case "options":   // 客机收到主机选项
                this.lobby.stage = d.stage;
                this.lobby.format = d.format;
                this.lobby.bossEnabled = d.boss;
                document.getElementById("opt-format").value = d.format;
                document.getElementById("opt-boss").checked = d.boss;
                this.buildCharGrid();
                this.buildStageGrid();
                break;
            case "start":     // 客机收到开局
                this.beginLanMatch(d, false);
                break;
            case "input":     // 主机收到客机输入
                this.remoteInput = d.i;
                break;
            case "state":     // 客机收到快照
                this.applyStateSnapshot(d);
                break;
            case "pause":
                this.applyNetPause(d.paused);
                break;
            case "next":
                this.nextRound(true);
                break;
            case "lobby":
                this.backToLobby(true);
                break;
        }
    }

    // ================= 开局 =================

    // ---------- 本地对战选人 ----------

    openLocalSelect(cpu=false) {
        this.cpuSelection=cpu;
        const menu=document.getElementById("menu-local");menu.querySelector("h2").textContent=cpu?"人机对决 · 选择角色":"本地对战 · 选择角色";
        menu.querySelectorAll(".lobby-col h3")[1].textContent=cpu?"系统操控 · 选择对手":"玩家 2 · 方向键 / 数字 1–7";
        document.getElementById("cpu-options").classList.toggle("hidden",!cpu);
        this.localPick = this.localPick || { p1: "noble", p2: "jianke" };   // 默认设定图三人组
        this.show("menu-local");
        this.buildLocalGrids();
    }

    buildLocalGrids() {
        for (const side of ["p1", "p2"]) {
            const grid = document.getElementById("local-grid-" + side);
            grid.innerHTML = "";
            for (const id of CONFIG.roster) {
                const c = CONFIG.characters[id];
                const card = document.createElement("div");
                card.className = "char-card" + (this.localPick[side] === id ? " selected" : "");
                card.innerHTML = this.charCardHtml(c);
                card.onclick = () => {
                    this.localPick[side] = id;
                    this.buildLocalGrids();
                };
                grid.appendChild(card);
            }
        }
        document.getElementById("local-picks").textContent =
            "P1：" + CONFIG.characters[this.localPick.p1].name +
            (this.cpuSelection?"  VS  人机：":"  VS  P2：") + CONFIG.characters[this.localPick.p2].name;
        this.buildStagePicker?.("local-stage-picker", this.selectedStage || "lingxia", id => this.selectStage(id, "local-stage-picker"));
    }

    startLocalMatch() {
        this.mode = this.cpuSelection ? "cpu" : "local";
        this.cpuBrain=null;
        document.getElementById("noble-practice").classList.add("hidden");
        this.matchOptions = { stage: this.selectedStage || "lingxia", format: "bo3" };
        const pick = this.localPick || { p1: "noble", p2: "jianke" };
        this.p1 = new Fighter(pick.p1, CONFIG.canvas.width * 0.3, 1);
        this.p2 = new Fighter(pick.p2, CONFIG.canvas.width * 0.7, -1);
        this.show(null);
        this.startMatch();
        if(this.mode==="cpu")document.getElementById("p2-controls").textContent="系统操控 · "+document.getElementById("cpu-level").selectedOptions[0].textContent;
    }

    beginLanMatch(setup, isHostSide) {
        this.mode = isHostSide ? "lan-host" : "lan-guest";
        document.getElementById("noble-practice").classList.add("hidden");
        this.matchOptions = { stage: setup.stage, format: setup.format };
        const W = CONFIG.canvas.width;
        // 主机始终是画面左侧 p1
        this.p1 = new Fighter(setup.hostChar, W * 0.3, 1);
        this.p2 = new Fighter(setup.guestChar, W * 0.7, -1);
        this.remoteInput = null;
        this._edgeStore = {};
        this._edgeStore1={};this._edgeStore2={};
        this.show(null);
        if (this.mode === "lan-host") this.startMatch();
        else this.announce("等待主机同步…", false);
    }

    startMatch() {
        this.p1.roundsWon = 0;
        this.p2.roundsWon = 0;
        this.updateRoundMarks();
        this.renderControlsStrip();
        this.startRound();
    }

    startRound() {
        this._edgeStore={};this._edgeStore1={};this._edgeStore2={};
        const W = CONFIG.canvas.width;
        this.keysPressed = {};
        this.p1.resetForRound(W * 0.3, 1);
        this.p2.resetForRound(W * 0.7, -1);
        this.projectiles = [];
        this.superFreeze=null;this._superSeen=new WeakMap();this.cpuBrain=null;
        this.sparks = [];
        this.timeLeft = CONFIG.round.time;
        this.frameCount = 0;
        this.roundStartMs = null;
        document.getElementById("timer").textContent = this.timeLeft;
        this.phase = "intro";
        this.phaseTimer = 0;
        this.announce("", true);
        this._introStartedAt=performance.now();this._fightBannerStartedAt=null;
        this.updateNameplates();
        this.updateHUD(true);
    }

    // ================= 战斗核心 =================

    boxesOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    checkHit(attacker, defender) {
        if (!attacker.isAttackActive()) return;
        if (defender.state === "ko" || defender.isInvulnerable()) return;
        const atkBox = attacker.getAttackBox();
        if (!atkBox || !this.boxesOverlap(atkBox, defender.getBodyBox())) return;

        // 决斗招架：0.8s 窗口内格挡任何攻击，触发反击突刺（叠满剑契+回20气）
        if (defender.isParryActive()) {
            defender.onParrySuccess();
            // Catch this strike once. The counter damages on its own active frame.
            attacker.hasHit = true;
            attacker._nextHitAt = attacker.stateTimer + 60;
            this.spawnHitSpark(defender.x + defender.facing * 34, defender.y - defender.height * 0.5, true);
            this.shake = 10;
            this.announce("招架反击！", false);
            setTimeout(() => { if (this.phase === "fight") this.announce("", true); }, 900);
            this.updateHUD();
            return;
        }

        const eff = attacker.curEff();

        // 多段攻击（终焉七重刺）：按间隔逐段判定，终击挑飞
        if (eff.multiHit) {
            if (attacker.hasHit) return;
            if (attacker.stateTimer < attacker._nextHitAt) return;
            const segIndex = Math.min(eff.hits - 1, Math.floor((attacker.stateTimer - eff.startup) / eff.interval));
            const isFinal = segIndex >= eff.hits - 1;
            const dmg = isFinal
                ? eff.finalDamage + (eff.finalLayerBonus || 0) * attacker.resource
                : eff.perHit + (eff.perHitLayerBonus || 0) * attacker.resource;
            const seg = {
                damage: dmg,
                knockback: isFinal ? eff.knockback : 1,
                hitstun: isFinal ? eff.hitstun : 8,
                guardBreak: isFinal && eff.guardBreak,
                launch: isFinal ? eff.launch : 0,
                deferKnockdown: !isFinal,
            };
            const blocked = defender.state === "block";
            const result = defender.takeHit(seg, attacker.facing, blocked, attacker.damageScale());
            attacker._nextHitAt = attacker.stateTimer + eff.interval;
            attacker.gainMeter(CONFIG.resources.meterOnHit);
            attacker.gainLayers(1);
            this.spawnHitSpark(defender.x, defender.y - defender.height * 0.6, blocked);
            this.shake = isFinal ? 12 : 4;
            if (isFinal && attacker.hasHit === false) {
                attacker.hasHit = true;
                // 满层追加十字剑气爆发
                if (eff.fullCrossBlades && attacker.isPureWhite()) this.spawnCrossBlades(attacker);
            }
            if (result.ko) this.onKO(attacker);
            this.updateHUD();
            return;
        }

        if (attacker.hasHit) return;
        const blocked = defender.state === "block";
        const result = defender.takeHit(eff, attacker.facing, blocked, attacker.damageScale());
        attacker.hasHit = true;
        attacker.gainMeter(CONFIG.resources.meterOnHit);
        attacker.gainLayers(eff.gainLayers);

        this.spawnHitSpark(defender.x, defender.y - defender.height * 0.6, blocked);
        this.shake = result.guardBroken ? 12 : blocked ? 3 : 7;
        if (result.ko) this.onKO(attacker);
        this.updateHUD();
    }

    /** 满层「纯白剑契」超必杀追加：十字剑气爆发（两道交叉剑气） */
    spawnCrossBlades(f) {
        for (const dir of [1, -1]) {
            this.projectiles.push({
                x: f.x, y: f.y - f.height * 0.55,
                vx: f.facing * 10, vy: dir * 2.2,
                size: 14, damage: 40, scale: f.damageScale(),
                color: "#f4f6ff", guardBreak: true, owner: f,
            });
        }
    }

    /** 飞行道具更新与命中 */
    updateProjectiles() {
        for (const p of this.projectiles) {
            if (p.dead) continue;
            const previousX=p.collisionStartX??p.x,previousY=p.y;
            delete p.collisionStartX;
            p.x += p.vx;
            if (p.vy) p.y += p.vy;
            if(p.kind==='arcane-shock'&&p.grounded)p.y=CONFIG.canvas.groundY-(p.hitHeight||64)/2;
            if (p.x < -40 || p.x > CONFIG.canvas.width + 40 || p.y > CONFIG.canvas.groundY + 20) { p.dead = true; continue; }
            const defender = p.owner === this.p1 ? this.p2 : this.p1;
            if (defender.state === "ko" || defender.isInvulnerable()) continue;
            if(p.hitTargets?.has(defender))continue;
            const hitWidth=p.hitWidth||p.size,hitHeight=p.hitHeight||p.size;
            const box = p.kind==='revolver'||p.rangedArt
                ? {x:Math.min(previousX,p.x)-hitWidth/2,y:Math.min(previousY,p.y)-hitHeight/2,w:Math.abs(p.x-previousX)+hitWidth,h:Math.abs(p.y-previousY)+hitHeight}
                : { x: p.x - p.size / 2, y: p.y - p.size / 2, w: p.size, h: p.size };
            if (this.boxesOverlap(box, defender.getBodyBox())) {
                // 剑气也可被决斗招架
                if (defender.isParryActive()) {
                    defender.onParrySuccess();
                    this.spawnHitSpark(p.x, p.y, true);
                    this.shake = 8;
                    p.dead = true;
                    this.updateHUD();
                    continue;
                }
                const blocked = defender.state === "block";
                const atk = { damage: p.damage, damageType:p.damageType, knockback: p.knockback ?? 5, hitstun: p.hitstun ?? 18, control:!!p.control, deferKnockdown:!!p.deferKnockdown, guardBreak: p.guardBreak };
                const result = defender.takeHit(atk, Math.sign(p.vx), blocked, p.scale);
                p.owner.gainMeter(CONFIG.resources.meterOnHit);
                p.owner.gainLayers(1);
                this.spawnHitSpark(p.x, p.y, blocked);
                this.shake = blocked ? 2 : 5;
                if(p.piercing&&!blocked){p.hitTargets||=new Set();p.hitTargets.add(defender);}else p.dead = true;
                if (result.ko) this.onKO(p.owner);
                this.updateHUD();
            }
        }
        this.projectiles = this.projectiles.filter(p => !p.dead);
    }

    /** 技能帧触发：到 startup 帧时生成飞行道具（满层「纯白剑契」：双道交叉剑气+破甲） */
    updateSkillCasts(f) {
        if (f.state === "skill" && f.pendingProj && f.stateTimer === f.pendingProj.startup) {
            const s = f.pendingProj;
            if (!s.tier) f.rangedCooldown = Math.max(f.rangedCooldown || 0, Math.ceil(CONFIG.resources.rangedCooldownSeconds * 60));
            const full = f.isPureWhite && f.isPureWhite();
            const dmg = full && s.fullDamageMult ? Math.round(s.damage * s.fullDamageMult) : s.damage;
            const mk = (vy) => this.projectiles.push({
                x: f.x + f.facing * (s.projX ?? (f.width / 2 + 16)),
                y: f.y - f.height * (s.projY ?? 0.55) + (vy ? 8 : 0),
                vx: f.facing * s.projSpeed,
                vy: vy || 0,
                charged: !!s.charged, life: s.charged?110:90, kind:s.projectileKind || null,
                collisionStartX:s.projectileKind==='revolver'||s.rangedArt?f.x+f.facing*f.width/2:undefined,
                rangedArt:!!s.rangedArt,chargeLevel:s.chargeLevel||1,damageType:s.damageType,
                hitWidth:s.projHitWidth,hitHeight:s.projHitHeight,piercing:!!s.piercing,
                grounded:s.projectileKind==='arcane-shock'&&f.onGround,
                size: s.projSize,
                damage: dmg,
                scale: f.damageScale(),
                color: s.projectileColor || (s.tier === 2 ? "#ffd166" : (full ? "#f4f6ff" : f.def.color)),
                guardBreak: (full && !!s.fullGuardBreak) || !!s.guardBreak,
                owner: f,
            });
            if (full && s.fullDouble) { mk(2.2); mk(-2.2); }   // 残月剑气·满层：双道交叉
            else mk(0);
            f.pendingProj = null;
        }
    }

    /** 场景互动：木箱被攻击框打破 */
    onKO(winner) {
        if (this.mode === "practice") {
            const loser = winner === this.p1 ? this.p2 : this.p1;
            loser.health = 1;
            loser.startKnockdown(-winner.facing, {knockback: 4});
            return;
        }
        winner.roundsWon++;
        this.updateRoundMarks();
        this.phase = "ko";
        this.phaseTimer = 0;
        this.announce("K.O.!", false);
    }

    onTimeUp() {
        if (this.p1.health > this.p2.health) this.p1.roundsWon++;
        else if (this.p2.health > this.p1.health) this.p2.roundsWon++;
        this.updateRoundMarks();
        this.phase = "ko";
        this.phaseTimer = 0;
        this.announce("TIME UP", false);
    }

    onRoundEnd() {
        const need = CONFIG.formats[this.matchOptions.format].winsNeeded;
        if (this.p1.roundsWon >= need || this.p2.roundsWon >= need) {
            const winner = this.p1.roundsWon >= need ? this.p1 : this.p2;
            this.phase = "matchEnd";
            this.announce(winner.name + " 获胜！", false);
            document.getElementById("between-title").textContent = winner.name + " 获胜！";
            document.getElementById("btn-next-round").textContent = "再来一局";
            this.show("menu-between");
        } else {
            this.phase = "between";
            document.getElementById("between-title").textContent = "回合结束";
            document.getElementById("btn-next-round").textContent = "下一回合";
            this.show("menu-between");
        }
    }

    nextRound(fromNet) {
        // 联机时只有主机能推进，客机点击无效
        if (this.mode === "lan-guest" && !fromNet) return;
        if (this.mode === "lan-host" && !fromNet && this.net) this.net.send({ k: "next" });
        this.show(null);
        if (this.phase === "matchEnd" || document.getElementById("btn-next-round").textContent === "再来一局") {
            this.startMatch();
        } else {
            this.startRound();
        }
    }

    backToLobby(fromNet) {
        if (this.mode === "lan-guest" && !fromNet) return;
        if (this.mode === "lan-host" && !fromNet && this.net) this.net.send({ k: "lobby" });
        this.phase = "menu";
        if(this.mode==="local"||this.mode==="cpu"){this.openLocalSelect(this.mode==="cpu");return;}
        this.lobby.myReady = false;
        this.lobby.oppReady = false;
        document.getElementById("btn-ready").textContent = "准备";
        this.show("menu-lobby");
    }

    togglePause() {
        this.keysDown={};this.keysPressed={};this._edgeStore={};this._edgeStore1={};this._edgeStore2={};
        const pausing = this.phase === "fight";
        if (!(pausing || this.phase === "paused")) return;
        if (pausing) {
            this.pauseStartMs = performance.now();
            this.phase = "paused";
            this.show("menu-pause");
        } else {
            // 恢复时把暂停时长从战斗计时里扣除，暂停不扣时间
            if (this.roundStartMs !== null && this.pauseStartMs !== null) {
                this.roundStartMs += performance.now() - this.pauseStartMs;
            }
            this.pauseStartMs = null;
            this.phase = "fight";
            this.show(null);
        }
        // 联机时双向同步暂停状态
        if (this.net && (this.mode === "lan-host" || this.mode === "lan-guest")) {
            this.net.send({ k: "pause", paused: pausing });
        }
    }

    /** 收到对方发来的暂停/恢复消息（主机客机通用） */
    applyNetPause(paused) {
        if (paused && this.phase === "fight") {
            this.pauseStartMs = performance.now();
            this.phase = "paused";
            this.show("menu-pause");
        } else if (!paused && this.phase === "paused") {
            if (this.roundStartMs !== null && this.pauseStartMs !== null) {
                this.roundStartMs += performance.now() - this.pauseStartMs;
            }
            this.pauseStartMs = null;
            this.phase = "fight";
            this.show(null);
        }
    }

    // ================= 联机同步 =================

    /** 主机：每 N 帧广播快照 */
    broadcastState() {
        if (this.frameSnap++ % CONFIG.net.snapshotRate !== 0) return;
        const ev = this.sparks.filter(s => !s.sent).map(s => { s.sent = true; return { x: s.x, y: s.y, b: s.blocked }; });
        this.net.send({
            k: "state",
            p1: this.p1.toSnapshot(),
            p2: this.p2.toSnapshot(),
            pr: this.projectiles.map(p => ({ x: p.x, y: p.y, s: p.size, charged:!!p.charged,kind:p.kind,rangedArt:p.rangedArt,chargeLevel:p.chargeLevel,hitWidth:p.hitWidth,hitHeight:p.hitHeight,grounded:p.grounded,damageType:p.damageType,c: p.color, fxChar: p.owner?.charId, fxDir: Math.sign(p.vx) })),
            wo: this.combatV2ObjectsSnapshot?.()||[], sc: this.superFreeze, tm: this.timeLeft, ph: this.phase, pt: this.phaseTimer,
            ev,
        });
    }

    /** 客机：应用快照 */
    applyStateSnapshot(d) {
        if (this.phase === "menu") { this.show(null); }
        this.specialObjects=(d.wo||[]).map(o=>({...o,owner:o.side===1?this.p1:this.p2}));
        this.superFreeze=d.sc||null;
        this.p1.applySnapshot(d.p1);
        this.p2.applySnapshot(d.p2);
        this.projectiles = (d.pr || []).map(p => ({x:p.x,y:p.y,size:p.s,charged:!!p.charged,kind:p.kind,rangedArt:p.rangedArt,chargeLevel:p.chargeLevel,hitWidth:p.hitWidth,hitHeight:p.hitHeight,grounded:p.grounded,damageType:p.damageType,color:p.c,fxChar:p.fxChar,fxDir:p.fxDir}));
        this.timeLeft = d.tm;
        document.getElementById("timer").textContent = d.tm;
        for (const e of d.ev || []) this.spawnHitSpark(e.x, e.y, e.b);
        // 阶段切换
        if (d.ph !== this.phase) {
            this.phase = d.ph;
            this.phaseTimer = 0;
            if (d.ph === "intro") this.announce("", true);
            else if (d.ph === "ko") this.announce("K.O.!", false);
            else if (d.ph === "between" || d.ph === "matchEnd") {
                this.show("menu-between");
                document.getElementById("between-title").textContent =
                    d.ph === "matchEnd"
                        ? (this.p1.roundsWon > this.p2.roundsWon ? this.p1.name : this.p2.name) + " 获胜！"
                        : "回合结束";
            } else if (d.ph === "fight") {
                this._fightBannerStartedAt=performance.now();
                this.show(null);
                this.announce("", true);
            }
        }
        if(d.ph==="intro"){this.phaseTimer=d.pt||0;this._introSnapshotAt=performance.now();}
        this.updateRoundMarks();
        this.updateNameplates();
        this.updateHUD();
    }

    // ================= 特效 / HUD =================

    spawnHitSpark(x, y, blocked) {
        this.sparks.push({ x, y, life: 12, blocked });
    }

    drawSparks() {
        this.sparks = this.sparks.filter(s => s.life > 0);
        for (const s of this.sparks) {
            s.life--;
            // 形态切换：金色扩散冲击环
            if (s.formSwitch) {
                const r = (20 - s.life) * 4.5;
                this.ctx.strokeStyle = "rgba(255,209,102," + (s.life / 20 * 0.9).toFixed(2) + ")";
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.ellipse(s.x, s.y, r, r * 0.35, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                continue;
            }
            const r = s.life * 2;
            this.ctx.strokeStyle = s.blocked ? "#4fc3f7" : "#ffd166";
            this.ctx.lineWidth = 3;
            for (let i = 0; i < 6; i++) {
                const ang = (Math.PI * 2 / 6) * i + s.life * 0.2;
                this.ctx.beginPath();
                this.ctx.moveTo(s.x, s.y);
                this.ctx.lineTo(s.x + Math.cos(ang) * r, s.y + Math.sin(ang) * r);
                this.ctx.stroke();
            }
        }
    }

    /** 填充两侧按键提示条（进入对局时调用一次；本地模式 P1/P2 键位不同，联机双方一致） */
    renderControlsStrip() {
        const isLocal = this.mode === "local";
        // P1 键位：本地用 WASD+字母键，联机双方一致（都用 P1 那套）
        const p1Keys = [
            ["A/D", "走 / 双击跑"], ["W+J", "上挑"], ["S", "防御/受身"],
            ["J", "普攻"], ["K", "二段跳"], ["L", "瞬步"],
            ["U", "远攻/长按蓄力"], ["O", "满资源特殊技"], ["I", "100气大招"],
            ["P / S+P", "攒气"],
        ];
        // P2 键位：本地用小键盘，联机用与 P1 相同的字母键
        const p2Keys = isLocal ? [
            ["←/→", "走 / 双击跑"], ["↑+1", "上挑"], ["↓", "防御/受身"],
            ["1", "普攻"], ["2", "二段跳"], ["3", "瞬步"],
            ["4", "远攻/长按蓄力"], ["6", "满资源特殊技"], ["5", "100气大招"],
            ["7 / ↓+7", "攒气"],
        ] : p1Keys;

        const render = (id, keys, cls) => {
            const el = document.getElementById(id);
            if (!el) return;
            // 普通键位 + 形态切换提示（独立 span，脱甲后由 updateNameplates 隐藏）
            el.innerHTML = keys.map(([k, label]) =>
                `<span><span class="key ${cls}">${k}</span> ${label}</span>`
            ).join(" &nbsp;·&nbsp; ")
            + `<span id="${id}-form-hint" class="form-hint">&nbsp;·&nbsp; <span class="key ${cls}">${isLocal && id === "p2-controls" ? "↓+5" : "S+I"}</span> 变形(守望者)</span>`;
        };
        render("p1-controls", p1Keys, "p1");
        render("p2-controls", p2Keys, "p2");
    }

    updateNameplates() {
        document.getElementById("p1-name").textContent =
            this.p1.name + "（" + (this.mode === "lan-guest" ? "对方" : this.mode === "lan-host" ? "我方" : "P1") + "）";
        document.getElementById("p2-name").textContent =
            this.p2.name + "（" + (this.mode === "cpu" ? "人机" : this.mode === "lan-guest" ? "我方" : this.mode === "lan-host" ? "对方" : "P2") + "）";
        // 专属资源（剑契/狼魂等）合并到名字下方提示；双形态角色追加形态标注
        for (const [tag, f] of [["p1", this.p1], ["p2", this.p2]]) {
            const el = document.getElementById(tag + "-special");
            if (el) {
                let s = f.def.resource.name + " " + f.resource + "/" + f.resourceMax;
                if (f.canSwitchForm && f.canSwitchForm()) {
                    s += " · " + (f.form === "armored" ? "【穿甲】" : "【脱甲】");
                }
                if (el.textContent !== s) el.textContent = s;
            }
            // 变形键位提示：仅穿甲形态显示（脱甲后单向不可切回，不再提示）
            const hint = document.getElementById(tag + "-controls-form-hint");
            if (hint) hint.classList.toggle("hidden", !(f.canSwitchForm && f.canSwitchForm() && f.form === "armored"));
        }
    }

    updateHUD(force) {
        const setBar = (id, ratio) => {
            const el = document.getElementById(id);
            const pct = Math.max(0, Math.min(1, ratio)) * 100 + "%";
            if (force || el.style.width !== pct) el.style.width = pct;
        };
        const R = CONFIG.resources;
        setBar("p1-health", this.p1.health / this.p1.maxHealth);
        setBar("p2-health", this.p2.health / this.p2.maxHealth);
        // 残影条只在血量变化时延迟跟随，避免每帧堆积定时器
        for (const [i, f, tag] of [[0, this.p1, "p1"], [1, this.p2, "p2"]]) {
            if (this._lastHp[i] !== f.health) {
                this._lastHp[i] = f.health;
                const ghost = document.getElementById(tag + "-ghost");
                setTimeout(() => { ghost.style.width = Math.max(0, f.health / f.maxHealth) * 100 + "%"; }, 250);
            }
        }
        setBar("p1-meter", this.p1.meter / R.maxMeter);
        setBar("p2-meter", this.p2.meter / R.maxMeter);
        document.getElementById("p1-meter").classList.toggle("full", this.p1.meter >= R.maxMeter);
        document.getElementById("p2-meter").classList.toggle("full", this.p2.meter >= R.maxMeter);
        // 气量数字标注（连续条，右侧显示具体点数）
        const setNum = (id, n) => { const el = document.getElementById(id); const s = Math.floor(n); if (el.textContent !== s) el.textContent = s; };
        setNum("p1-meter-num", this.p1.meter);
        setNum("p2-meter-num", this.p2.meter);
        this.updateNameplates();
    }

    updateRoundMarks() {
        const need = CONFIG.formats[(this.matchOptions && this.matchOptions.format) || "bo3"].winsNeeded;
        const marks = (n) => "●".repeat(n) + "○".repeat(Math.max(0, need - n));
        document.getElementById("p1-rounds").textContent = marks(this.p1.roundsWon);
        document.getElementById("p2-rounds").textContent = marks(this.p2.roundsWon);
    }

    announce(text, hide) {
        const el = document.getElementById("announce");
        el.textContent = text;
        el.classList.toggle("hidden", !!hide);
    }

    // ================= 场景 =================

    /** 场景背景图（懒加载缓存，未就绪返回 null 走渐变兜底） */
    _stageImg(src) {
        if (!this._stageImgs) this._stageImgs = {};
        let img = this._stageImgs[src];
        if (img === undefined) {
            if(window.gameAssets){img=window.gameAssets.loadImage(src+"?v="+ASSET_VER);this._stageImgs[src]=img;return img.complete&&img.naturalWidth?img:null;}
            img = new Image();
            img.onload = () => { img._ok = true; };
            img.src = src + "?v=" + ASSET_VER;   // 带版本号破缓存
            this._stageImgs[src] = img;
        }
        return (img._ok || (img.complete && img.naturalWidth)) ? img : null;
    }

    drawStage() {
        const ctx = this.ctx, W = CONFIG.canvas.width, H = CONFIG.canvas.height;
        const st = CONFIG.stages[(this.matchOptions && this.matchOptions.stage) || "lingxia"];
        // Cover the visible world rectangle, including zoom-out, jumps and camera shake.
        const transform=ctx.getTransform();
        const left=Math.min(0,-transform.e/transform.a)-4;
        const top=Math.min(0,-transform.f/transform.d)-4;
        const right=Math.max(W,(W-transform.e)/transform.a)+4;
        const bottom=Math.max(H,(H-transform.f)/transform.d)+4;
        const width=right-left,height=bottom-top;

        // 场景有背景图时：图片铺满 + 底部压暗保证角色可读；否则走程序化渐变
        const img = st.img ? this._stageImg(st.img) : null;
        if (img) {
            const s = Math.max(width / img.width, height / img.height);
            const dw = img.width * s, dh = img.height * s;
            ctx.drawImage(img, left+(width-dw)/2, top+(height-dh)/2, dw, dh);
            const gg = ctx.createLinearGradient(0, CONFIG.canvas.groundY - 60, 0, H);
            gg.addColorStop(0, "rgba(10,10,20,0)");
            gg.addColorStop(1, "rgba(10,10,20,0.62)");
            ctx.fillStyle = gg;
            ctx.fillRect(left, CONFIG.canvas.groundY - 60, width, Math.max(0,bottom-CONFIG.canvas.groundY+60));
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, st.sky[0]);
            g.addColorStop(0.75, st.sky[1]);
            g.addColorStop(1, st.sky[2]);
            ctx.fillStyle = g;
            ctx.fillRect(left, top, width, height);

            // 远景剪影（占位，后期换场景美术）
            ctx.fillStyle = "rgba(0,0,0,0.28)";
            for (let i = 0; i < 6; i++) {
                const bw = 90 + i * 30, bh = 120 + (i % 3) * 50;
                ctx.fillRect(i * 180 - 20, CONFIG.canvas.groundY - bh, bw, bh);
            }

            // 地面
            ctx.fillStyle = st.ground;
            ctx.fillRect(left, CONFIG.canvas.groundY, width, Math.max(0,bottom-CONFIG.canvas.groundY));
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(left, CONFIG.canvas.groundY, width, 6);
        }

        // 场景名
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = "14px Microsoft YaHei";
        ctx.textAlign = "right";
        ctx.fillText(st.name, W - 12, 24);
        ctx.textAlign = "left";

        // 平台/台阶（石质台阶，顶面高亮便于识别可站立）
        for (const p of (CONFIG.platforms || [])) {
            const top = p.y, left = p.x, right = p.x + p.w, bottom = p.y + p.h;
            ctx.fillStyle = "#4a4a5a";
            ctx.fillRect(left, top, p.w, p.h);
            ctx.fillStyle = "#6a6a7a";
            ctx.fillRect(left, top, p.w, 6);          // 顶面高亮
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.lineWidth = 2;
            ctx.strokeRect(left, top, p.w, p.h);
            // 台阶纹理
            ctx.strokeStyle = "rgba(0,0,0,0.18)";
            ctx.beginPath();
            for (let i = 1; i < 4; i++) {
                ctx.moveTo(left + p.w * i / 4, top);
                ctx.lineTo(left + p.w * i / 4, bottom);
            }
            ctx.stroke();
        }

    }

    drawProjectiles() {
        for (const p of this.projectiles) {
            if (p.kind === 'revolver'||p.rangedArt) continue; // Dedicated projectile renderers own these silhouettes.
            if (window.jiankeFX && ((p.owner?.charId || p.fxChar) === "jianke" || ((p.owner?.charId || p.fxChar) === "shouwang" && window.shouwangFX))) continue;
            if (p.owner?.charId === "noble") {
                const c = this.ctx, dir = Math.sign(p.vx) || 1, r = Math.max(12, p.size);
                c.save(); c.translate(p.x, p.y); c.scale(dir, 1);
                c.strokeStyle = p.guardBreak ? "#f4dd9a" : "#c5ddff"; c.lineWidth = 2;
                c.shadowColor = "#a0bfff"; c.shadowBlur = 6;
                c.beginPath(); c.moveTo(-r * 1.2, -r * 0.65); c.quadraticCurveTo(r * 0.5, 0, -r * 1.2, r * 0.65); c.stroke();
                c.globalAlpha = 0.35; c.lineWidth = 1; c.beginPath(); c.moveTo(-r * 2, 0); c.lineTo(0, 0); c.stroke();
                c.restore(); continue;
            }
            this.ctx.fillStyle = p.color || "#ffd166";
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "rgba(255,255,255,0.6)";
            this.ctx.stroke();
        }
    }

    // ================= 主循环 =================

    // 固定时间步：逻辑恒以 60Hz 步进（STEP=1/60s），渲染跟 rAF。
    // 高刷新率屏幕不加速、低刷新率不拖慢，手感一致。
    loop() {
        const now = performance.now();
        let delta = now - this._lastTime;
        this._lastTime = now;
        // 防切后台回来时间暴涨（限制单帧最多追 4 步，避免螺旋死亡）
        if (delta > 250) delta = 250;
        this._accum += delta;
        const STEP = 1000 / 60;
        let steps = 0;
        while (this._accum >= STEP && steps < 4) {
            this.update();
            this._accum -= STEP;
            steps++;
        }
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        if(window.gameAssets?.blocked)return;
        // ---------- 客机：只发输入，等快照 ----------
        if (this.mode === "lan-guest") {
            if (this.phase !== "menu" && this.net) {
                const inp = this.readInput(CONFIG.keys, this._edgeStore);
                this.net.send({ k: "input", i: inp });
            }
            // 特效本地演进
            return;
        }

        if(this.phase==="fight"&&this.tickSuperFreeze?.())return;
        if (this.phase === "menu" || this.phase === "paused" || this.phase === "between" || this.phase === "matchEnd") return;
        this.phaseTimer++;

        if (this.phase === "intro") {
            this.phaseTimer=Math.floor((performance.now()-this._introStartedAt)*.06);
            if(this.phaseTimer>=CONFIG.round.introFrames){this.phase='fight';this._fightBannerStartedAt=performance.now();this.keysDown={};this.keysPressed={};this._edgeStore={};this._edgeStore1={};this._edgeStore2={};this.announce('',true);}
            if(this.mode==='lan-host')this.broadcastState();
            return;
        }

        if (this.phase === "ko") {
            this.p1.update(); this.p2.update();
            if (this.mode === "lan-host") this.broadcastState();
            if (this.phaseTimer >= CONFIG.round.koFreezeFrames) this.onRoundEnd();
            return;
        }

        if (this.phase !== "fight") return;

        // ---- 输入 ----
        if (this.mode === "lan-host") {
            this.applyInput(this.p1, this.readInput(CONFIG.keys, this._edgeStore));
            if (this.remoteInput) this.applyInput(this.p2, this.remoteInput);
        } else {
            const inp = this.readInput(CONFIG.keys, this._edgeStore1 = this._edgeStore1 || {});
            if (this.mode === "practice") {
                if (this.practiceHold > 0) { inp.d = true; this.practiceHold--; }
                this.updatePracticeTarget();
            }
            this.applyInput(this.p1, inp);
            if(this.mode==="cpu")this.applyInput(this.p2,this.readCpuInput());
            else if (this.mode !== "practice") this.applyInput(this.p2, this.readInput(TEST_KEYS_P2, this._edgeStore2 = this._edgeStore2 || {}));
        }

        if(this.beginSuperCinematic?.())return;
        // ---- 模拟 ----（面向已由方向键手动控制，不再自动转向对手）
        // 瞬步时缓：检测任意一方刚瞬步，进入慢动作窗口
        for (const f of [this.p1, this.p2]) {
            if (f.justDashed) {
                f.justDashed = false;
                this.slowmoFrames = CONFIG.resources.slowmoFrames;
                this.slowmoOwner = f;
            }
            // 形态切换特效：金色冲击环
            if (f.justSwitchedForm) {
                f.justSwitchedForm = false;
                this.sparks.push({ x: f.x, y: f.y - f.height * 0.5, life: 20, formSwitch: true });
            }
        }
        if (this.slowmoFrames > 0) {
            this.slowmoFrames--;
            // 时缓期间：非瞬步方每 slowmoDivisor 帧才推进一次（视觉慢放），瞬步方正常
            this._slowTick = (this._slowTick || 0) + 1;
            const slowTick = this._slowTick % CONFIG.resources.slowmoDivisor === 0;
            if (this.slowmoOwner === this.p1) {
                this.p1.update();
                if (slowTick) this.p2.update();
            } else if (this.slowmoOwner === this.p2) {
                this.p2.update();
                if (slowTick) this.p1.update();
            } else {
                this.p1.update(); this.p2.update();
            }
            if (this.slowmoFrames === 0) { this.slowmoOwner = null; this._slowTick = 0; }
        } else {
            this.p1.update();
            this.p2.update();
        }

        // 技能出飞行道具
        this.updateSkillCasts(this.p1);
        this.updateSkillCasts(this.p2);
        this.updateProjectiles();
        this.updateCombatV2?.();

        // 防重叠
        const b1 = this.p1.getBodyBox(), b2 = this.p2.getBodyBox();
        if (this.boxesOverlap(b1, b2)) {
            const overlap = (b1.w / 2 + b2.w / 2) - Math.abs(this.p1.x - this.p2.x);
            const dir = this.p1.x < this.p2.x ? 1 : -1;
            this.p1.x -= dir * overlap / 2;
            this.p2.x += dir * overlap / 2;
        }

        // 攻击判定
        this.checkHit(this.p1, this.p2);
        this.checkHit(this.p2, this.p1);

        // 计时：用真实时间戳驱动，高刷新率屏幕不会加速倒计时
        if (this.roundStartMs === null) this.roundStartMs = performance.now();
        const elapsed = (performance.now() - this.roundStartMs) / 1000;
        const newTime = this.mode === "practice" ? Infinity : Math.max(0, Math.ceil(CONFIG.round.time - elapsed));
        if (newTime !== this.timeLeft) {
            this.timeLeft = newTime;
            document.getElementById("timer").textContent = this.timeLeft === Infinity ? "∞" : this.timeLeft;
            if (this.timeLeft <= 0) { this.onTimeUp(); return; }
        }

        if (this.shake > 0) this.shake *= 0.85;
        this.updateHUD();
        if (this.mode === "practice") this.updatePracticeUI();

        // 主机广播
        if (this.mode === "lan-host") this.broadcastState();
    }

    practiceCamera(){
        const W=CONFIG.canvas.width,H=CONFIG.canvas.height,top=Math.min(this.p1.y-this.p1.height,this.p2.y-this.p2.height),bottom=Math.max(this.p1.y,this.p2.y);
        const horizontal=Math.max(1,Math.min(1.65,W*.7/Math.max(1,Math.abs(this.p1.x-this.p2.x))));
        const scale=Math.max(.8,Math.min(horizontal,(H-95)/Math.max(1,bottom-top)));
        let y=H*.84-bottom*scale;if(top*scale+y<28)y=28-top*scale;
        const desiredX=W/2-(this.p1.x+this.p2.x)/2*scale;
        const x=scale>=1?Math.max(W-W*scale,Math.min(0,desiredX)):(W-W*scale)/2;
        return {scale,x,y};
    }

    render() {
        if (window.jiankeFX && this.phase === "menu") window.jiankeFX.clear();
        const ctx = this.ctx;
        ctx.setTransform(1,0,0,1,0,0);
        ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        ctx.fillStyle='#101919';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        ctx.save();
        if (this.mode === "practice" && this.p1 && this.p2) {
            const view=this.practiceCamera();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
        }
        if (this.shake > 0.5) {
            ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }
        this.drawStage();
        if (this.p1 && this.p2 && this.phase !== "menu") {
            this.drawShadow(this.p1);
            this.drawShadow(this.p2);
            if(this.phase==='intro'&&window.roundEntrance){const t=window.roundEntrance.tick(this);window.roundEntrance.actor(ctx,this.p1,t);window.roundEntrance.actor(ctx,this.p2,t);}else{window.blinkFX?.draw(this,ctx,this.p1);window.blinkFX?.draw(this,ctx,this.p2);this.p1.draw(ctx);this.p2.draw(ctx);}
            if (this.phase!=="intro" && window.rainWeather?.enabled(this)) { window.rainWeather.active = true; window.rainWeather.wet(ctx,this.p1); window.rainWeather.wet(ctx,this.p2); }
            this.drawCombatV2?.(ctx);
            this.drawProjectiles();
            this.drawSparks();
            if (window.jiankeFX) window.jiankeFX.render(this, ctx);
            // 调试：角色头顶显示朝向箭头（开碰撞框时生效）
            if (CONFIG.debug) {
                for (const p of [this.p1, this.p2]) {
                    ctx.fillStyle = "#0f0";
                    ctx.font = "12px sans-serif";
                    ctx.fillText(p.facing === 1 ? "→" : "←", p.x - 4, p.y - p.height - 12);
                }
            }
        }
        if (window.rainWeather) {ctx.save();ctx.setTransform(1,0,0,1,0,0);window.rainWeather.render(this,ctx);ctx.restore();}
        if(window.roundEntrance&&(this.phase==="intro"||(this.phase==="fight"&&this._fightBannerStartedAt!=null&&performance.now()-this._fightBannerStartedAt<600)))window.roundEntrance.overlay(ctx,this);
        // 瞬步时缓：边缘淡蓝光晕提示「慢动作」
        if (this.slowmoFrames > 0 && this.phase === "fight") {
            const a = Math.min(0.5, this.slowmoFrames / CONFIG.resources.slowmoFrames * 0.6);
            const grad = ctx.createRadialGradient(
                CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, CONFIG.canvas.width * 0.35,
                CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, CONFIG.canvas.width * 0.7);
            grad.addColorStop(0, "rgba(120,180,255,0)");
            grad.addColorStop(1, "rgba(120,180,255," + a.toFixed(2) + ")");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        }
        ctx.restore();
        this.drawSuperCinematic?.(ctx);
    }

    /** 脚下投影（悬空时缩小变淡，增强材质感） */
    drawShadow(f) {
        const h = Math.max(0, CONFIG.canvas.groundY - f.y);
        const r = Math.max(10, 30 - h * 0.12);
        this.ctx.fillStyle = "rgba(0,0,0," + Math.max(0.12, 0.38 - h * 0.004) + ")";
        this.ctx.beginPath();
        this.ctx.ellipse(f.x, CONFIG.canvas.groundY + 8, r, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

window.game = new Game();
