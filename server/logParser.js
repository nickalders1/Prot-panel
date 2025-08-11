import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import geoip from "geoip-lite";

class LogParser {
  constructor(database, websocketServer) {
    this.db = database;
    this.ws = websocketServer;
    this.ipStats = new Map();
    this.logFiles = [];

    // Reset stats every minute
    setInterval(() => {
      this.analyzeTrafficPatterns();
      this.ipStats.clear();
    }, 60000);
  }

  // Add log files to monitor
  addLogFile(filePath) {
    if (fs.existsSync(filePath)) {
      this.logFiles.push(filePath);
      this.watchLogFile(filePath);
      console.log(`Monitoring log file: ${filePath}`);
    } else {
      console.error(`Log file not found: ${filePath}`);
    }
  }

  // Watch log file for changes
  watchLogFile(filePath) {
    const watcher = chokidar.watch(filePath);
    let lastSize = fs.statSync(filePath).size;

    watcher.on("change", () => {
      const currentSize = fs.statSync(filePath).size;
      if (currentSize > lastSize) {
        this.readNewLogEntries(filePath, lastSize);
        lastSize = currentSize;
      }
    });
  }

  // Read new log entries
  readNewLogEntries(filePath, fromPosition) {
    const stream = fs.createReadStream(filePath, { start: fromPosition });
    let buffer = "";

    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep incomplete line in buffer

      lines.forEach((line) => {
        if (line.trim()) {
          this.parseLogLine(line);
        }
      });
    });
  }

  // Parse individual log line
  parseLogLine(line) {
    // Support multiple log formats
    const formats = [
      // Apache/Nginx access log
      /^(\S+) \S+ \S+ \[(.*?)\] "(\S+) (.*?) HTTP\/\d\.\d" (\d+) (\d+)/,
      // Custom format: IP - timestamp - method - status - size
      /^(\d+\.\d+\.\d+\.\d+).*?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?(\w+).*?(\d{3})/,
    ];

    let match = null;
    let format = null;

    for (let i = 0; i < formats.length; i++) {
      match = line.match(formats[i]);
      if (match) {
        format = i;
        break;
      }
    }

    if (!match) return;

    const ip = match[1];
    const timestamp = match[2];
    const method = match[3] || "GET";
    const status = parseInt(match[format === 0 ? 5 : 4]);

    this.processRequest(ip, { timestamp, method, status });
  }

  // Process individual request
  async processRequest(ip, details) {
    // Update IP stats
    if (!this.ipStats.has(ip)) {
      this.ipStats.set(ip, {
        requests: 0,
        lastRequest: Date.now(),
        methods: new Set(),
        statuses: [],
      });
    }

    const stats = this.ipStats.get(ip);
    stats.requests++;
    stats.lastRequest = Date.now();
    stats.methods.add(details.method);
    stats.statuses.push(details.status);

    // Get geo info
    const geo = geoip.lookup(ip);
    const country = geo ? geo.country : "Unknown";

    // Analyze for suspicious activity
    const analysis = this.analyzeIP(ip, stats);

    // Update database
    await this.db.addOrUpdateIP(ip, {
      status: analysis.status,
      country: country,
      requestCount: 1,
    });

    // Log attacks
    if (analysis.isAttack) {
      await this.db.logAttack(ip, analysis.attackType, analysis.severity, {
        requestsPerSecond: analysis.requestsPerSecond,
        blocked: analysis.shouldBlock,
        methods: Array.from(stats.methods),
        statusCodes: stats.statuses.slice(-10),
      });

      // Send real-time alert
      this.sendAlert({
        type: "attack",
        ip: ip,
        country: country,
        attackType: analysis.attackType,
        severity: analysis.severity,
        requestsPerSecond: analysis.requestsPerSecond,
      });
    }

    // Send real-time traffic update
    this.sendTrafficUpdate();
  }

  // Analyze IP for suspicious patterns
  analyzeIP(ip, stats) {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const requestsPerSecond = stats.requests / (timeWindow / 1000);

    let status = "normal";
    let isAttack = false;
    let attackType = null;
    let severity = "low";
    let shouldBlock = false;

    // High request rate detection
    if (requestsPerSecond > 10) {
      status = "suspicious";
      isAttack = true;
      attackType = "high_volume";
      severity = "medium";
    }

    if (requestsPerSecond > 50) {
      status = "blocked";
      attackType = "ddos";
      severity = "high";
      shouldBlock = true;
    }

    // Method-based detection
    const suspiciousMethods = ["POST", "PUT", "DELETE"];
    const methodCount = Array.from(stats.methods).filter((m) =>
      suspiciousMethods.includes(m)
    ).length;

    if (methodCount > 2 && requestsPerSecond > 5) {
      status = "suspicious";
      isAttack = true;
      attackType = "method_abuse";
      severity = "medium";
    }

    // Error rate detection
    const errorCount = stats.statuses.filter((s) => s >= 400).length;
    const errorRate = errorCount / stats.statuses.length;

    if (errorRate > 0.5 && stats.requests > 10) {
      status = "suspicious";
      isAttack = true;
      attackType = "error_flood";
      severity = "low";
    }

    return {
      status,
      isAttack,
      attackType,
      severity,
      shouldBlock,
      requestsPerSecond: Math.round(requestsPerSecond),
    };
  }

  // Analyze traffic patterns
  async analyzeTrafficPatterns() {
    let normal = 0;
    let suspicious = 0;
    let blocked = 0;
    const uniqueIPs = new Set();

    for (const [ip, stats] of this.ipStats) {
      uniqueIPs.add(ip);
      const analysis = this.analyzeIP(ip, stats);

      switch (analysis.status) {
        case "normal":
          normal += stats.requests;
          break;
        case "suspicious":
          suspicious += stats.requests;
          break;
        case "blocked":
          blocked += stats.requests;
          break;
      }
    }

    // Store traffic stats
    await new Promise((resolve, reject) => {
      this.db.db.run(
        `
      INSERT INTO traffic_stats (normal_requests, suspicious_requests, blocked_requests, unique_ips)
      VALUES (?, ?, ?, ?)
    `,
        [normal, suspicious, blocked, uniqueIPs.size],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Send real-time alerts
  sendAlert(alert) {
    if (this.ws) {
      this.ws.broadcast(
        JSON.stringify({
          type: "alert",
          data: alert,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  // Send traffic updates
  sendTrafficUpdate() {
    if (this.ws) {
      let normal = 0;
      let suspicious = 0;
      let blocked = 0;

      for (const [ip, stats] of this.ipStats) {
        const analysis = this.analyzeIP(ip, stats);
        switch (analysis.status) {
          case "normal":
            normal += stats.requests;
            break;
          case "suspicious":
            suspicious += stats.requests;
            break;
          case "blocked":
            blocked += stats.requests;
            break;
        }
      }

      this.ws.broadcast(
        JSON.stringify({
          type: "traffic_update",
          data: { normal, suspicious, blocked },
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

export default LogParser;
