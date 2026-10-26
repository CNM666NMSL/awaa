const fs=require('fs');let p='index.html',s=fs.readFileSync(p,'utf8');s=s.replace('</head>','<link rel="stylesheet" href="dusk-theme.css?v=c1">\n</head>');const a=s.indexOf('        <h1 class="menu-sr-only">AWA'),b=s.indexOf('\n    </div>',a);s=s.slice(0,a)+`        <h1 class="main-brand">AWA</h1>
        <p class="main-tagline">残街对决</p>
        <nav class="main-actions" aria-label="主菜单选项">
        <button class="hotspot" data-target="story" aria-label="剧情模式">剧情模式</button>
        <button class="hotspot primary" data-target="duel" aria-label="双人对决">双人对决</button>
        <button class="hotspot" id="btn-noble-main" aria-label="练习场">练习场</button>
        <button class="hotspot" data-target="cg" aria-label="角色图鉴">角色图鉴</button>
        <button class="hotspot" data-target="settings" aria-label="设置">设置</button>
        <button class="hotspot" data-target="exit" aria-label="退出游戏">退出游戏</button>
        </nav>`+s.slice(b);s=s.replace('js/round-entrance.js?v=entrance2','js/round-entrance.js?v=theme-c1');fs.writeFileSync(p,s);
p='js/round-entrance.js';s=fs.readFileSync(p,'utf8').replace("'#080e18d9'","'#101c1cdd'").replace("'#f2e2c4'","'#e5d6ad'").replace("'#cfb17c'","'#c9b990'").replace("'#b28b51'","'#8a876b'").replace("'#d2ad70'","'#c6b78f'").replace("'#fae9c7'","'#e5d6ad'").replace("'#9a6b3f'","'#8a876b'").replace("'#f5c879'","'#e5d6ad'").replace("'#e8b561'","'#b8aa80'").replace("ctx.font='bold 60px \"Microsoft YaHei\",sans-serif'","ctx.font='bold 60px \"KaiTi\",\"STKaiti\",\"Microsoft YaHei\",serif'").replace("ctx.font='italic bold 66px \"Microsoft YaHei\",sans-serif'","ctx.font='bold 66px \"KaiTi\",\"STKaiti\",\"Microsoft YaHei\",serif'");fs.writeFileSync(p,s);
p='tools/entrance-review.html';s=fs.readFileSync(p,'utf8').replace('js/round-entrance.js?v=entrance2','js/round-entrance.js?v=theme-c1');fs.writeFileSync(p,s);
