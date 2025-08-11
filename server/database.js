import sqlite3pkg from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// maak eerst een "sqlite3" instantie met verbose()
const sqlite3 = sqlite3pkg.verbose();

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "ddos_protection.db"));
    this.initTables();
  }

  initTables() {
    // Zorg dat statements in volgorde lopen
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ip_addresses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'normal',
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          request_count INTEGER DEFAULT 0,
          blocked_count INTEGER DEFAULT 0,
          country TEXT,
          is_whitelisted BOOLEAN DEFAULT 0,
          is_blacklisted BOOLEAN DEFAULT 0
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS attack_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip TEXT NOT NULL,
          attack_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          requests_per_second INTEGER,
          blocked BOOLEAN DEFAULT 0,
          details TEXT
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS traffic_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          normal_requests INTEGER DEFAULT 0,
          suspicious_requests INTEGER DEFAULT 0,
          blocked_requests INTEGER DEFAULT 0,
          unique_ips INTEGER DEFAULT 0
        )
      `);

      // ➜ ontbrak: security_settings
      this.db.run(`
        CREATE TABLE IF NOT EXISTS security_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.initDefaultSettings();
    });
  }

  initDefaultSettings() {
    const defaultSettings = [
      ["ddos_protection", "true"],
      ["rate_limiting", "true"],
      ["geo_blocking", "false"],
      ["emergency_mode", "false"],
      ["max_requests_per_minute", "100"],
      ["block_threshold", "500"],
      ["suspicious_threshold", "200"],
    ];

    defaultSettings.forEach(([key, value]) => {
      this.db.run(
        "INSERT OR IGNORE INTO security_settings (key, value) VALUES (?, ?)",
        [key, value]
      );
    });
  }

  addOrUpdateIP(ip, data = {}) {
    return new Promise((resolve, reject) => {
      const { status = "normal", country = null, requestCount = 1 } = data;
      this.db.run(
        `
        INSERT OR REPLACE INTO ip_addresses 
        (ip, status, last_seen, request_count, country)
        VALUES (?, ?, CURRENT_TIMESTAMP, 
          COALESCE((SELECT request_count FROM ip_addresses WHERE ip = ?) + ?, ?),
          COALESCE(?, (SELECT country FROM ip_addresses WHERE ip = ?)))
      `,
        [ip, status, ip, requestCount, requestCount, country, ip],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  logAttack(ip, attackType, severity, details = {}) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT INTO attack_logs (ip, attack_type, severity, requests_per_second, blocked, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          ip,
          attackType,
          severity,
          details.requestsPerSecond || 0,
          details.blocked || false,
          JSON.stringify(details),
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getRecentAttacks(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT * FROM attack_logs 
        ORDER BY timestamp DESC 
        LIMIT ?
      `,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getTrafficStats(hours = 24) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT * FROM traffic_stats 
        WHERE timestamp > datetime('now', '-${hours} hours')
        ORDER BY timestamp DESC
      `,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getSetting(key) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT value FROM security_settings WHERE key = ?",
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.value : null);
        }
      );
    });
  }

  setSetting(key, value) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT OR REPLACE INTO security_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
        [key, value],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

export default Database;
