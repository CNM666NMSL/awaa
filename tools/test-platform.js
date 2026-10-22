// 平台已清空 → 纯地面场景回归测试（落地 / 起跳 / 跳跃不滑行）
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

global.Image = class { set src(v) {} };
global.window = global;
const code = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8")
    + "\n" + fs.readFileSync(path.join(ROOT, "js/fighter.js"), "utf8")
    + "\nglobalThis.Fighter = Fighter; globalThis.CONFIG = CONFIG;";
eval(code);

const A = (name, cond) => { console.log((cond ? "OK  " : "FAIL") + " " + name); if (!cond) process.exitCode = 1; };
const fresh = () => { const f = new Fighter("noble", 200, 1); f.update(); return f; };

// 0) 平台已清空
A("platforms 已清空", Array.isArray(CONFIG.platforms) && CONFIG.platforms.length === 0);

// 1) 空中下落 → 落到地面
let f = fresh();
f.y = 200; f.vy = 0; f.onGround = false; f.setState("jump");
let landed = false;
for (let i = 0; i < 200; i++) {
    f.update();
    if (f.onGround) { landed = true; break; }
}
A("空中落到地面站住", landed && Math.abs(f.y - CONFIG.canvas.groundY) < 0.5);

// 2) 地面起跳 → 空中 → 落回地面
f = fresh();
f.jump(0);
A("原地起跳进入空中", f.onGround === false && f.vy < 0);
let reland = false;
for (let i = 0; i < 200; i++) {
    f.update();
    if (f.onGround) { reland = true; break; }
}
A("落回地面", reland);

// 3) 前跳带水平初速，空中松键应衰减（不再一路滑行到底）
f = fresh();
f.jump(1);                       // 前跳，vx = jumpHop
const vx0 = f.vx;
A("前跳有水平初速", vx0 > 0);
f.stopMove();                    // 空中松方向键
A("空中松键后水平速度衰减", Math.abs(f.vx) < Math.abs(vx0));

console.log(process.exitCode ? "\n有失败项 ✗" : "\n全部通过 ✓");
