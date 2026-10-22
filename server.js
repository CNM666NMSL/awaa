/* ============================================================
   server.js — 《百兽夜行》单端口服务
   1) 静态文件服务（index.html / js / css / assets）
   2) WebSocket 中继（同端口 /ws），4 位房间号配对
   零依赖：WebSocket 握手与帧解析自己实现，部署时不需要安装任何包。
   运行：node server.js   端口取 process.env.PORT，默认 3000
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
};

/* ---------------- 静态服务 ---------------- */
const server = http.createServer((req, res) => {
    let urlPath;
    try {
        urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch (e) {
        res.writeHead(400).end("Bad Request");
        return;
    }
    if (urlPath === "/" || urlPath === "/." || urlPath === "/./") urlPath = "/index.html";
    if (urlPath === "/healthz") {
        res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
        return;
    }

    const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end("Forbidden");
        return;
    }

    fs.stat(filePath, (err, st) => {
        if (err || !st.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404 Not Found");
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = MIME[ext] || "application/octet-stream";
        const isHtml = ext === ".html";
        res.writeHead(200, {
            "Content-Type": type,
            "Content-Length": st.size,
            "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600",
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

/* ---------------- 极简 WebSocket ---------------- */
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function acceptKey(key) {
    return crypto.createHash("sha1").update(key + GUID).digest("base64");
}

function encodeFrame(str) {
    const payload = Buffer.from(str, "utf8");
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.from([0x81, len]);
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeUInt32BE(0, 2);
        header.writeUInt32BE(len, 6);
    }
    return Buffer.concat([header, payload]);
}

/** 单连接帧解析（支持分片累积、掩码、close/ping） */
function attachWS(socket, onText, onClose) {
    let buf = Buffer.alloc(0);
    socket.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
            const fin = (buf[0] & 0x80) !== 0;
            const opcode = buf[0] & 0x0f;
            const masked = (buf[1] & 0x80) !== 0;
            let len = buf[1] & 0x7f;
            let offset = 2;

            if (len === 126) {
                if (buf.length < 4) return;
                len = buf.readUInt16BE(2);
                offset = 4;
            } else if (len === 127) {
                if (buf.length < 10) return;
                len = Number(buf.readBigUInt64BE(2));
                offset = 10;
            }

            const maskLen = masked ? 4 : 0;
            if (buf.length < offset + maskLen + len) return;

            let payload = buf.slice(offset + maskLen, offset + maskLen + len);
            if (masked) {
                const mask = buf.slice(offset, offset + 4);
                const out = Buffer.alloc(len);
                for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
                payload = out;
            }
            buf = buf.slice(offset + maskLen + len);

            if (opcode === 0x8) {           // close
                try { socket.end(Buffer.from([0x88, 0x00])); } catch (e) {}
                onClose && onClose();
                return;
            } else if (opcode === 0x9) {    // ping
                const h = Buffer.from([0x8a, payload.length]);
                try { socket.write(Buffer.concat([h, payload])); } catch (e) {}
            } else if (opcode === 0x1 || opcode === 0x0) {
                if (fin && payload.length) onText && onText(payload.toString("utf8"));
            }
        }
    });
    socket.on("close", () => onClose && onClose());
    socket.on("error", () => onClose && onClose());
}

/* ---------------- 房间逻辑 ---------------- */
const rooms = new Map();   // code -> { host: conn, guest: conn }

function makeCode() {
    for (let i = 0; i < 200; i++) {
        const c = String(Math.floor(1000 + Math.random() * 9000));
        if (!rooms.has(c)) return c;
    }
    return null;
}

server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) { socket.destroy(); return; }

    socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        "Sec-WebSocket-Accept: " + acceptKey(key) + "\r\n\r\n"
    );
    socket.setNoDelay(true);

    const conn = { socket, room: null, role: null, alive: true };

    const send = (obj) => {
        if (!conn.alive) return;
        try { socket.write(encodeFrame(JSON.stringify(obj))); } catch (e) { }
    };
    const peerOf = (c) => {
        const r = rooms.get(c.room);
        if (!r) return null;
        return c.role === "host" ? r.guest : r.host;
    };

    attachWS(socket, (text) => {
        let m;
        try { m = JSON.parse(text); } catch (e) { return; }

        switch (m.t) {
            case "create": {
                if (conn.room) return;
                const code = makeCode();
                if (!code) return send({ t: "error", msg: "服务器房间已满，请稍后再试" });
                rooms.set(code, { host: conn, guest: null });
                conn.room = code;
                conn.role = "host";
                send({ t: "created", room: code });
                break;
            }
            case "join": {
                if (conn.room) return;
                const code = String(m.room || "").trim();
                const r = rooms.get(code);
                if (!r) return send({ t: "error", msg: "房间不存在（房间号：" + code + "）" });
                if (r.guest) return send({ t: "error", msg: "该房间已满" });
                r.guest = conn;
                conn.room = code;
                conn.role = "guest";
                send({ t: "joined", room: code });
                sendTo(r.host, { t: "peer_joined" });
                break;
            }
            case "relay": {
                const peer = peerOf(conn);
                if (peer) sendTo(peer, { t: "relay", d: m.d });
                break;
            }
        }
    }, () => {
        conn.alive = false;
        const r = conn.room && rooms.get(conn.room);
        if (r) {
            const peer = conn.role === "host" ? r.guest : r.host;
            if (peer) sendTo(peer, { t: "peer_left" });
            rooms.delete(conn.room);
        }
    });

    function sendTo(target, obj) {
        if (!target || !target.alive) return;
        try { target.socket.write(encodeFrame(JSON.stringify(obj))); } catch (e) { }
    }

    // 心跳，避免代理层因空闲断开
    const timer = setInterval(() => {
        if (!conn.alive) { clearInterval(timer); return; }
        try { socket.write(Buffer.from([0x89, 0x00])); } catch (e) { }
    }, 25000);
    socket.on("close", () => clearInterval(timer));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("[百兽夜行] listening on 0.0.0.0:" + server.address().port);
});

module.exports = server;
