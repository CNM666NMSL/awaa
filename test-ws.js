// WebSocket 中继冒烟测试：主机建房 → 客机加入 → 双向中继 → 断线/错误处理
const URL_WS = process.env.TEST_WS_URL || "ws://127.0.0.1:3010/ws";
const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function open(name) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(URL_WS);
    ws.inbox = [];
    ws.onopen = () => res(ws);
    ws.onerror = () => rej(new Error(name + " 连接失败"));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      ws.inbox.push(m);
      log(`[${name}] <-`, JSON.stringify(m).slice(0, 120));
    };
  });
}

(async () => {
  const host = await open("host");
  host.send(JSON.stringify({ t: "create" }));
  await wait(300);
  const code = (host.inbox.find((m) => m.t === "created") || {}).room;
  if (!/^\d{4}$/.test(code || "")) throw new Error("没拿到房间号");

  const guest = await open("guest");
  guest.send(JSON.stringify({ t: "join", room: code }));
  await wait(300);

  guest.send(JSON.stringify({ t: "relay", d: { k: "input", i: { right: true } } }));
  await wait(200);
  host.send(JSON.stringify({ t: "relay", d: { k: "snap", f: 42 } }));
  await wait(200);

  const has = (ws, fn) => ws.inbox.some(fn);
  const gotPeer = has(host, (m) => m.t === "peer_joined");
  const c2h = has(host, (m) => m.t === "relay" && m.d && m.d.k === "input");
  const h2c = has(guest, (m) => m.t === "relay" && m.d && m.d.k === "snap");

  guest.close();
  await wait(400);
  const peerLeft = has(host, (m) => m.t === "peer_left");

  const bad = await open("bad");
  bad.send(JSON.stringify({ t: "join", room: "0000" }));
  await wait(300);
  const errMsg = (bad.inbox.find((m) => m.t === "error") || {}).msg;

  // 同一房间号不能重复占位
  const h2 = await open("host2");
  h2.send(JSON.stringify({ t: "create" }));
  await wait(250);
  const code2 = (h2.inbox.find((m) => m.t === "created") || {}).room;

  console.log("\n==== 结果 ====");
  console.log("房间号生成:", code, code2, code === code2 ? "(撞号!)" : "(不重复 OK)");
  console.log("客机加入通知:", gotPeer ? "OK" : "FAIL");
  console.log("客机→主机 中继:", c2h ? "OK" : "FAIL");
  console.log("主机→客机 中继:", h2c ? "OK" : "FAIL");
  console.log("对方断线通知:", peerLeft ? "OK" : "FAIL");
  console.log("错误房间提示:", errMsg ? "OK (" + errMsg + ")" : "FAIL");

  const pass = gotPeer && c2h && h2c && peerLeft && errMsg && code !== code2;
  console.log(pass ? "\n全部通过 ✓" : "\n有失败项 ✗");
  host.close(); bad.close(); h2.close();
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error("测试失败:", e.message); process.exit(1); });
