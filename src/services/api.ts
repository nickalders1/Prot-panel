const API_BASE_URL = 'http://localhost:3001/api';

export interface DashboardStats {
  total_requests: number;
  blocked_requests: number;
  unique_ips: number;
  avg_requests_per_ip: number;
}

export interface Attack {
  id: number;
  ip: string;
  attack_type: string;
  severity: string;
  timestamp: string;
  requests_per_second: number;
  blocked: boolean;
  details: string;
}

export interface TrafficData {
  id: number;
  timestamp: string;
  normal_requests: number;
  suspicious_requests: number;
  blocked_requests: number;
  unique_ips: number;
}

class DDosProtectionAPI {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  async getRecentAttacks(): Promise<Attack[]> {
    const response = await fetch(`${API_BASE_URL}/attacks`);
    if (!response.ok) throw new Error('Failed to fetch attacks');
    return response.json();
  }

  async getTrafficData(hours: number = 24): Promise<TrafficData[]> {
    const response = await fetch(`${API_BASE_URL}/traffic?hours=${hours}`);
    if (!response.ok) throw new Error('Failed to fetch traffic data');
    return response.json();
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, value }),
    });
    if (!response.ok) throw new Error('Failed to update setting');
  }

  async whitelistIP(ip: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/ip/whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip }),
    });
    if (!response.ok) throw new Error('Failed to whitelist IP');
  }

  async blacklistIP(ip: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/ip/blacklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip }),
    });
    if (!response.ok) throw new Error('Failed to blacklist IP');
  }

  async addLogFile(logPath: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logPath }),
    });
    if (!response.ok) throw new Error('Failed to add log file');
  }
}

export const api = new DDosProtectionAPI();