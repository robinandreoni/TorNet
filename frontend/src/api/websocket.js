class TornetWebSocketClient {
  constructor() {
    this.ws = null;
    this.channel = "global";
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.isConnected = false;
  }

  connect(channel = "global") {
    this.channel = channel;
    const wsUrl = `ws://localhost:8000/ws/${channel}`;

    try {
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyListeners({ type: "ws_status", status: "connected" });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          this.notifyListeners({ type: "raw", text: event.data });
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyListeners({ type: "ws_status", status: "disconnected" });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket error:", err);
      };
    } catch (e) {
      console.warn("Failed to create WebSocket:", e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.channel);
    }, 3000);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error("Listener error:", err);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new TornetWebSocketClient();
