import { WebSocketServer as WSS, WebSocket } from "ws";

class WebSocketService {
  constructor(port = 8080) {
    this.wss = new WSS({ port: 8080, path: '/ws' });
    this.clients = new Set();

    this.wss.on("connection", (ws) => {
      console.log("Client connected");
      this.clients.add(ws);

      ws.on("close", () => {
        console.log("Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error("Invalid message:", error);
        }
      });
    });

    console.log(`WebSocket server running on port ${port}`);
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case "get_stats":
        this.sendStats(ws);
        break;
      case "update_setting":
        this.updateSetting(data.key, data.value);
        break;
    }
  }

  broadcast(message) {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  sendStats(ws) {
    // Stuur huidige statistieken naar een specifieke client
  }

  updateSetting(key, value) {
    this.broadcast(
      JSON.stringify({
        type: "setting_updated",
        data: { key, value },
      })
    );
  }
}

export default WebSocketService;
