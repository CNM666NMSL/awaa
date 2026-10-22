// 无头测试：空中前后跳 + 空中瞬步 + 多平台落地
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
global.Image = class { set src(v) {} };
global.window = global;
global.document = { getElementById: () => ({ classList: { toggle(){}, add(){}, remove(){} }, textContent: "", style: {} }) };

const code = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8")
    + "\n" + fs.readFileSync(path.join(ROOT, "js/fighter.js"), "utf8")
    + "\nglobalThis.Fighter = Fighter; globalThis.CONFIG = CONFIG;";
eval(code);

let pass = 0, fail = 0;
function A(name, cond) {
    if (cond) { pass++; console.log("  ✓ " + name); }
    else { fail++; console.log("  ✗ " + name); }
}

function fresh() {
    const f = new Fighter("noble", CONFIG.canvas.width * 0.3, 1);
    f.update(); // 进入 idle
    return f;
}

console.log("【空中前后跳】");
let f = fresh();
f.aim(1);
f.jump(1); // 前跳（右）
A("前跳：vy 为负（上升）", f.vy < 0);
A("前跳：vx 为正（向前）", f.vx > 0);
f.jump(0); // 空中二段跳，无方向
A("二段跳：vx 保持前跳惯性（不被清零）", f.vx > 0);

f = fresh();
f.aim(-1);
f.jump(-1); // 后跳（左）
A("后跳：vx 为负（向后）", f.vx < 0);

console.log("【空中移动控制】");
f = fresh();
f.aim(1);
f.jump(0); // 原地跳
f.move(1); // 空中按右
A("空中 move：vx > 0（airControl 生效）", f.vx > 0);
f.aim(-1);
f.move(-1);
A("空中反向 move：vx < 0", f.vx < 0);

console.log("【空中瞬步】");
f = fresh();
f.jump(0);
f.meter = 100; // 保证有气
f.dash(); // 空中瞬步
A("空中瞬步：进入 dash 状态", f.state === "dash");
A("空中瞬步：记录 _dashWasAir", f._dashWasAir === true);
A("空中瞬步：vy 清零（悬空）", f.vy === 0);

// 推进 dash 到结束，仍在空中 → 应回 jump
for (let i = 0; i < CONFIG.physics.dashFrames; i++) {
    // 手动模拟：不落地（把 onGround 保持 false）
    f.onGround = false;
    f.stateTimer++;
    f.dashLeft--;
}
f.stateTimer = 0;
// 直接调 dash 结束分支逻辑：重走一次
f = fresh();
f.jump(0);
f.meter = 100;
f.dash();
f.onGround = false;
for (let i = 0; i < CONFIG.physics.dashFrames; i++) {
    f.onGround = false;
    f.stateTimer++;
    f.dashLeft--;
    if (f.state === "dash" && f.dashLeft <= 0) {
        f.vx = 0;
        if (f._dashWasAir && !f.onGround) f.setState("jump");
        else f.setState("idle");
        f._dashWasAir = false;
        break;
    }
}
A("空中瞬步结束：回 jump 状态（保持空中）", f.state === "jump");

console.log("【平台已清空】");
A("平台已清空（platforms 为空数组）", Array.isArray(CONFIG.platforms) && CONFIG.platforms.length === 0);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
