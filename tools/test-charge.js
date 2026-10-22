// 气槽(300点连续条) / 三段必杀 / 蓄气破绽惩罚 / 瞬步耗气+无敌+CD 无头逻辑测试
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

global.Image = class { set src(v) {} };
global.window = global;
const code = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8")
    + "\n" + fs.readFileSync(path.join(ROOT, "js/fighter.js"), "utf8")
    + "\nglobalThis.Fighter = Fighter; globalThis.CONFIG = CONFIG;";
eval(code);

const R = CONFIG.resources;
const A = (name, cond) => { console.log((cond ? "OK  " : "FAIL") + " " + name); if (!cond) process.exitCode = 1; };
const fresh = () => { const f = new Fighter("noble", 200, 1); f.update(); return f; };

// 1) 蓄气速率：chargePerSecond 点/秒，约 5.5 秒攒满
let f = fresh();
f.startCharge();
A("进入蓄气状态", f.state === "charge");
const frames = Math.ceil(R.maxMeter / (R.chargePerSecond / 60)) + 20;
for (let i = 0; i < frames; i++) f.update();
A(`约 ${(R.maxMeter/R.chargePerSecond).toFixed(1)} 秒攒满 ${R.maxMeter} 点气`, f.meter >= R.maxMeter);

// 2) 满气后不可再蓄
f = fresh(); f.meter = R.maxMeter;
A("满气蓄气被拒", f.startCharge() === false && f.state !== "charge");

// 3) 点按 I 分档：≥tier1 疾影突
f = fresh(); f.meter = R.tier1Cost + 10;
f.castSuperTier();
A("气≥tier1 → 一段疾影突", f.state === "super" && f.currentAttack && f.currentAttack.tier === 1);
A("扣 tier1 点气", f.meter === 10);

// 4) 点按 I 分档：≥tier2 裂空波
f = fresh(); f.meter = R.tier2Cost + 10;
f.castSuperTier();
A("气≥tier2 → 二段裂空波", f.state === "skill" && f.pendingProj && f.pendingProj.tier === 2);
A("扣 tier2 点气", f.meter === 10);

// 5) 满气 → 终式
f = fresh(); f.meter = R.superCost;
A("满气 → 终式", f.castSuperTier() === true && f.state === "super" && f.currentAttack === f.def.super_);
A("终式清空气槽", f.meter === 0);

// 6) 气不足 tier1 → 不放招
f = fresh(); f.meter = R.tier1Cost - 5;
A("气不足 tier1 → 不放招", f.castSuperTier() === false && f.state === "idle");

// 7) 瞬步耗气 dashCost 点
f = fresh(); f.meter = R.dashCost + 50;
f.dash();
A("瞬步扣 dashCost 点", f.state === "dash" && f.meter === 50);
f = fresh(); f.meter = R.dashCost - 1;
f.dash();
A("气不足 → 瞬步失败", f.state === "idle" && f.meter === R.dashCost - 1);

// 8) 瞬步无敌帧：dash 前 dashInvuln 帧无敌
f = fresh(); f.meter = 100; f.dash();
A("瞬步第 1 帧无敌", f.isInvulnerable() === true);
for (let i = 0; i < CONFIG.physics.dashInvuln - 1; i++) f.update();
A(`瞬步第 ${CONFIG.physics.dashInvuln} 帧无敌`, f.isInvulnerable() === true);
f.update();
A("无敌帧结束", f.isInvulnerable() === false);

// 9) 瞬步 CD
f = fresh(); f.meter = R.maxMeter; f.dash();
A("瞬步后进入冷却", f.dashCooldownLeft > 0);
for (let i = 0; i < CONFIG.physics.dashFrames + 1; i++) f.update();
A("冷却中再次瞬步失败", f.dashCooldownLeft > 0 && f.state !== "dash");

// 10) 蓄气破绽惩罚：蓄气中受伤 ×chargeHurtMult
f = fresh(); f.startCharge(); f.health = 1000;
f.takeHit({ damage: 100, hitstun: 20, knockback: 4 }, 1, false, 1);
A("蓄气中受 100 伤 → ×1.5", f.health === 850);
f = fresh(); f.health = 1000;
f.takeHit({ damage: 100, hitstun: 20, knockback: 4 }, 1, false, 1);
A("非蓄气受 100 伤 → 原样", f.health === 900);

// 11) 攒气量：命中/受击
f = fresh(); f.meter = 0; f.gainMeter(R.meterOnHit);
A(`命中 +${R.meterOnHit} 气`, f.meter === R.meterOnHit);
f = fresh(); f.meter = 0;
f.takeHit({ damage: 30, hitstun: 20, knockback: 4 }, 1, false, 1);
A(`受击 +${R.meterOnHurt} 气`, f.meter === R.meterOnHurt);

console.log(process.exitCode ? "\n有失败项 ✗" : "\n全部通过 ✓");
