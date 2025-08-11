import express from "express";
import cors from "cors";
import Database from "./database.js";
import LogParser from "./logParser.js";
import WebSocketServer from "./websocket.js";

class DDosProtectionAPI {
  constructor() {
    this.app = express();
    this.db = new Database();
    this.ws = new WebSocketServer(8080);
    this.logParser = new LogParser(this.db, this.ws);

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static("public"));
  }

  setupRoutes() {
    // 1) Ingest: agent pusht logregels naar panel
    this.app.post("/api/ingest", async (req, res) => {
      try {
        const key = req.headers["x-agent-key"];
        if (key !== process.env.AGENT_KEY)
          return res.status(401).json({ error: "unauthorized" });

        const { lines = [] } = req.body;
        for (const line of lines) {
          if (typeof line === "string" && line.trim()) {
            this.logParser.parseLogLine(line);
          }
        }
        res.json({ ok: true, received: lines.length });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Get dashboard stats
    this.app.get("/api/stats", async (req, res) => {
      try {
        const stats = await this.getDashboardStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get recent attacks
    this.app.get("/api/attacks", async (req, res) => {
      try {
        const attacks = await this.db.getRecentAttacks(50);
        res.json(attacks);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get traffic data
    this.app.get("/api/traffic", async (req, res) => {
      try {
        const hours = req.query.hours || 24;
        const traffic = await this.db.getTrafficStats(hours);
        res.json(traffic);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update security settings
    this.app.post("/api/settings", async (req, res) => {
      try {
        const { key, value } = req.body;
        await this.db.setSetting(key, value);

        // Broadcast to all clients
        this.ws.broadcast(
          JSON.stringify({
            type: "setting_updated",
            data: { key, value },
          })
        );

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add IP to whitelist/blacklist
    this.app.post("/api/ip/:action", async (req, res) => {
      try {
        const { action } = req.params;
        const { ip } = req.body;

        if (action === "whitelist") {
          await this.db.addOrUpdateIP(ip, { status: "whitelisted" });
        } else if (action === "blacklist") {
          await this.db.addOrUpdateIP(ip, { status: "blacklisted" });
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add log file to monitor
    this.app.post("/api/monitor", (req, res) => {
      try {
        const { logPath } = req.body;
        this.logParser.addLogFile(logPath);
        res.json({ success: true, message: `Monitoring ${logPath}` });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async getDashboardStats() {
    // Get current stats from database
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      this.db.db.all(
        `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_requests,
          COUNT(DISTINCT ip) as unique_ips,
          AVG(request_count) as avg_requests_per_ip
        FROM ip_addresses 
        WHERE last_seen > ?
      `,
        [oneDayAgo.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0]);
        }
      );
    });
  }

  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`DDoS Protection API running on port ${port}`);
      console.log(`WebSocket server running on port 8080`);
      console.log("\nTo start monitoring, add your log files:");
      console.log(
        `curl -X POST http://localhost:${port}/api/monitor -H "Content-Type: application/json" -d '{"logPath":"/var/log/nginx/access.log"}'`
      );
    });
  }
}

export default DDosProtectionAPI;
