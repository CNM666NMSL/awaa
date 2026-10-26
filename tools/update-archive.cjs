const fs=require('fs');
let p='index.html',s=fs.readFileSync(p,'utf8');
s=s.replace('style.css?v=20261023-awa-menu1','style.css?v=20261023-codex2').replace('js/game.js?v=20261023-rain1','js/game.js?v=20261023-codex2');
s=s.replace('id="menu-story" class="overlay hidden"','id="menu-story" class="overlay archive-menu hidden"').replace('id="menu-cg" class="overlay hidden"','id="menu-cg" class="overlay archive-menu hidden"');
s=s.replace('<h2>人物CG动画介绍</h2>','<div class="archive-heading"><span>AWA / FIGHTERS</span><h2>角色图鉴</h2><p>残街相逢 · 各执一刃</p></div>');
s=s.replace('<h2>剧情模式</h2>','<div class="archive-heading"><span>AWA / CHRONICLES</span><h2>剧情模式</h2><p>黄昏落雨，故事从废弃街道开始</p></div>');
s=s.replace('选择左侧章节开始播放','选择章节，回溯夜幕中的故事').replace('视频文件放入 assets/videos/ 目录即可自动加载（如 ch1.mp4）','章节故事与人物档案').replace('选择左侧角色','选择角色，查看档案').replace('CG 视频放入 assets/cg/ 目录（如 canglang.mp4），未添加时显示角色资料卡','查看立绘、战斗风格与招式资料');
fs.writeFileSync(p,s);
p='js/game.js';s=fs.readFileSync(p,'utf8');
let start=s.indexOf('    buildChapterList() {'),end=s.indexOf('    /** 视频播放通用',start);
s=s.slice(0,start)+`    buildChapterList() {
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
        const profile = profiles[charId];
        const portrait = this.charCardHtml(c);
        const moves = [
            ["J / 1", "三段普攻", c.combo.map(m=>m.damage).join(" / ")],
            ["W + J / ↑ + 1", "上攻", c.launcher.damage],
            ["S + J / ↓ + 1", "下攻 · 破防", c.low.damage],
            ["U / 4", "远攻 · 25气", c.skill.damage],
            ["I / 5", "超必杀 · 100气", c.super_.damage]
        ];
        const card = document.getElementById("cg-card");
        document.getElementById("cg-placeholder").classList.add("hidden");
        document.getElementById("cg-video").style.display = "none";
        card.classList.remove("hidden");
        card.innerHTML = '<div class="dossier-art">'+portrait+'</div><div class="dossier-copy"><span class="eyebrow">FIGHTER / 0'+(CONFIG.roster.indexOf(charId)+1)+'</span><h3>'+c.name+'</h3><div class="title-tag">'+c.title+'</div><p>'+profile[0]+'</p><div class="fighter-tags"><span>生命 '+(c.maxHealth || CONFIG.maxHealth || 1000)+'</span><span>'+profile[1]+'</span></div><h4>'+c.resource.name+' · 上限 '+c.resource.max+'</h4><p>'+c.resource.desc+'</p><table class="dossier-moves"><thead><tr><th>操作</th><th>招式</th><th>基础伤害</th></tr></thead><tbody>'+moves.map(m=>'<tr><td>'+m[0]+'</td><td>'+m[1]+'</td><td>'+m[2]+'</td></tr>').join('')+'</tbody></table><p class="dossier-note">伤害为基础值，实战受资源层数、形态与连段影响。P / 7 长按攒气。</p></div>';
    }

`+s.slice(end);
fs.writeFileSync(p,s);
