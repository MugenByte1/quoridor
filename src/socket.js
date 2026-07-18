// ============================================================================
// socket.js
// کلاینت اتصال Real-time به بک‌اند (Cloudflare Durable Object).
// پروتکل پیام‌ها (باید در Worker هم دقیقاً همین باشد):
//
//   کلاینت -> سرور:
//     { type: "join",  roomId, telegramInitData }
//     { type: "move",  target: [x, y] }
//     { type: "wall",  wall: { x, y, orient } }
//
//   سرور -> کلاینت:
//     { type: "state",   state: <GameState> }
//     { type: "error",   message: string }
//     { type: "players", players: [...] }   // آپدیت لیست حاضرین در لابی
// ============================================================================

export class GameSocket {
  constructor({ wsBaseUrl, roomId, initData, onState, onError, onPlayers, onOpen, onClose }) {
    this.wsBaseUrl = wsBaseUrl;
    this.roomId = roomId;
    this.initData = initData;
    this.onState = onState || (() => {});
    this.onError = onError || (() => {});
    this.onPlayers = onPlayers || (() => {});
    this.onOpen = onOpen || (() => {});
    this.onClose = onClose || (() => {});
    this.ws = null;
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
  }

  connect() {
    const url = `${this.wsBaseUrl}/${this.roomId}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.send({ type: "join", roomId: this.roomId, telegramInitData: this.initData });
      this.onOpen();
    });

    this.ws.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (msg.type === "state") this.onState(msg.state);
      else if (msg.type === "error") this.onError(msg.message);
      else if (msg.type === "players") this.onPlayers(msg.players);
    });

    this.ws.addEventListener("close", () => {
      this.onClose();
      if (this.shouldReconnect) this._scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      this.ws?.close();
    });
  }

  _scheduleReconnect() {
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * this.reconnectAttempts, 5000);
    setTimeout(() => {
      if (this.shouldReconnect) this.connect();
    }, delay);
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendMove(target) {
    this.send({ type: "move", target });
  }

  sendWall(wall) {
    this.send({ type: "wall", wall });
  }

  sendRematch() {
    this.send({ type: "rematch" });
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
  }
}
