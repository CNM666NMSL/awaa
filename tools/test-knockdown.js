// 倒地机制 + 连段保护 无头逻辑测试
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
// 一个标准攻击参数
const ATK = { damage: 40, knockback: 5, hitstun: 20 };

console.log("【击退快速衰减】");
let f = fresh();
f.takeHit(ATK, 1, false);
A("受击产生向后击退", f.vx > 0);
for (let i = 0; i < 30; i++) f.update();
A("击退很快衰减到 0（不再缓缓后退）", Math.abs(f.vx) < 0.01);

console.log("【连段伤害衰减】");
f = fresh();
const dmg1 = f.takeHit(ATK, 1, false).dmg;   // 第 1 击，无衰减
const dmg2 = f.takeHit(ATK, 1, false).dmg;   // 第 2 击，衰减 12%
A("连段第 2 击伤害递减", dmg2 < dmg1 && dmg2 >= Math.round(dmg1 * 0.3));

console.log("【连段累计 → 强制倒地】");
f = fresh();
let knocked = false;
for (let i = 0; i < 20; i++) {
    const r = f.takeHit(ATK, 1, false);
    if (r.knockdown) { knocked = true; break; }
    if (f.health <= 0) break;
}
A("连段累计伤害/次数达标后触发倒地", knocked);

console.log("【倒地免疫 + 起身】");
f = fresh();
f.startKnockdown(1, { knockback: 5 });
A("倒地进入 knockdown 状态", f.state === "knockdown");
const immune = f.takeHit(ATK, 1, false);
A("倒地期间免疫命中", immune.immune === true || immune.dmg === 0);
// 模拟落地并推进倒地计时
f.onGround = true;
for (let i = 0; i < CONFIG.mechanics.knockdownFrames + 2; i++) f.update();
A("倒地结束回到可行动状态", f.state === "idle" || f.state === "walk");
A("起身后有无敌帧", f.knockdownInvuln > 0);

console.log("【连段脱离后重置】");
f = fresh();
f.takeHit(ATK, 1, false);
A("受击后连段计数 > 0", f.comboHits > 0);
for (let i = 0; i < 100; i++) f.update();   // 超过宽限帧
A("脱离连段后计数清零", f.comboHits === 0 && f.comboDamage === 0);

console.log(process.exitCode ? "\n有失败项 ✗" : "\n全部通过 ✓");
