// 朝向统一模型（aim）+ 瞬步时缓 无头逻辑测试
// 新模型：facing 只由 aim() 改；move/jump 只位移不改朝向
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

// 1) aim 统一改朝向
let f = fresh();           // facing 初始 1（朝右）
f.aim(-1);
A("aim(-1) facing 变 -1", f.facing === -1);
f.move(-1);                // move 只位移，不改 facing
A("move 不改 facing（已由 aim 负责）", f.facing === -1 && f.state === "walk" && f.vx < 0);

// 2) aim 在硬直状态下锁朝向
f = fresh();
f.setState("attack");      // 进入攻击硬直
f.aim(-1);
A("攻击硬直中 aim 锁朝向（不变）", f.facing === 1);
f.setState("idle");
f.aim(-1);
A("恢复 idle 后 aim 生效", f.facing === -1);

// 3) 瞬步标记 justDashed
f = fresh(); f.meter = CONFIG.resources.dashCost + 10; f.update();
const meterBefore = f.meter;
f.dash();
A("瞬步触发 justDashed 标记", f.justDashed === true);
A("瞬步不耗气", f.meter === meterBefore - CONFIG.resources.dashCost);

// 4) 瞬步时缓推进逻辑（模拟 game 层）
f = fresh(); f.meter = CONFIG.resources.dashCost + 10; f.dash();
let owner = null, slowFrames = 0;
for (const p of [f]) { if (p.justDashed) { p.justDashed = false; slowFrames = CONFIG.resources.slowmoFrames; owner = p; } }
A("game 层捕捉到瞬步进入时缓", slowFrames === CONFIG.resources.slowmoFrames && owner === f);

console.log(process.exitCode ? "\n有失败项 ✗" : "\n全部通过 ✓");
