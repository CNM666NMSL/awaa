/* ============================================================
   net.js — 对战网络层（WebSocket 客户端）
   与 server.js 同端口部署：网页和 WebSocket 走同一个域名/端口。
   主机权威模式：客机只发输入，主机模拟全场并广播快照。
   ------------------------------------------------------------
   线上部署时自动使用 wss://<当前域名>/ws，无需填写任何 IP。
   本地 file:// 调试时才回退到手动输入地址。
   ============================================================ */

class NetClient {
    constructor() {
        this.ws = null;
        this.room = null;
        this.isHost = false;
        this.connected = false;
        // 回调（由 game.js 赋值）
        this.onCreated = null;    // (roomCode)
        this.onJoined = null;     // (roomCode)
        this.onPeerJoined = null; // ()
        this.onPeerLeft = null;   // ()
        this.onRelay = null;      // (data) 收到对方转发来的数据
        this.onError = null;      // (msg)
        this.onOpen = null;
    }

    /** 根据当前页面地址推导 WebSocket 地址 */
    static defaultUrl() {
        const proto = location.protocol === "https:" ? "wss://" : "ws://";
        return proto + location.host + "/ws";
    }

    /**
     * 连接中继服务器
     * @param {string} [host] 仅在 file:// 本地调试时才需要；线上留空即可
     */
    connect(host) {
        let url;
        if (!host) {
            if (!location.host) {
                this.onError && this.onError("请填写服务器地址（如 192.168.1.5:8766）");
                return;
            }
            url = NetClient.defaultUrl();
        } else if (/^(wss?|https?):\/\//.test(host)) {
            url = host.replace(/^http/, "ws");
        } else {
            url = (location.protocol === "https:" ? "wss://" : "ws://") + host + "/ws";
        }

        try {
            this.ws = new WebSocket(url);
        } catch (e) {
            this.onError && this.onError("无法连接：" + url);
            return;
        }
        this.ws.onopen = () => { this.connected = true; this.onOpen && this.onOpen(); };
        this.ws.onclose = () => { this.connected = false; this.onError && this.onError("与服务器断开连接"); };
        this.ws.onerror = () => { this.onError && this.onError("连接失败，请检查网络后重试"); };
        this.ws.onmessage = (ev) => {
            let m;
            try { m = JSON.parse(ev.data); } catch (e) { return; }
            this._handle(m);
        };
    }

    _handle(m) {
        switch (m.t) {
            case "created":     this.room = m.room; this.isHost = true;  this.onCreated && this.onCreated(m.room); break;
            case "joined":      this.room = m.room; this.isHost = false; this.onJoined && this.onJoined(m.room); break;
            case "peer_joined": this.onPeerJoined && this.onPeerJoined(); break;
            case "peer_left":   this.onPeerLeft && this.onPeerLeft(); break;
            case "relay":       this.onRelay && this.onRelay(m.d); break;
            case "error":       this.onError && this.onError(m.msg); break;
        }
    }

    _send(obj) {
        if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    }

    createRoom() { this._send({ t: "create" }); }
    joinRoom(code) { this._send({ t: "join", room: code }); }

    /** 向对方转发任意数据（输入、选人、快照等） */
    send(data) { this._send({ t: "relay", d: data }); }

    close() { if (this.ws) this.ws.close(); }
}
