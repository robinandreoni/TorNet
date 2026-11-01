const BASE_URL = "http://localhost:8000/api/v1";

class ApiClient {
  constructor() {
    this.token = localStorage.getItem("tornet_token") || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("tornet_token", token);
    } else {
      localStorage.removeItem("tornet_token");
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { detail: response.statusText };
        }
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  async login(username = "admin", password = "tornet2026") {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  async getHealth() {
    return fetch("http://localhost:8000/api/health").then(res => res.json());
  }

  async getStats() {
    return this.request("/stats");
  }

  async getTools() {
    return this.request("/tools");
  }

  async getScans(status = null) {
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/scans${query}`);
  }

  async getScan(id) {
    return this.request(`/scans/${id}`);
  }

  async createScan(scanData) {
    return this.request("/scans", {
      method: "POST",
      body: JSON.stringify(scanData)
    });
  }

  async stopScan(id) {
    return this.request(`/scans/${id}/stop`, {
      method: "POST"
    });
  }

  async deleteScan(id) {
    return this.request(`/scans/${id}`, {
      method: "DELETE"
    });
  }

  async getVulnerabilities(severity = null) {
    const query = severity ? `?severity=${encodeURIComponent(severity)}` : "";
    return this.request(`/vulnerabilities${query}`);
  }

  async getReports() {
    return this.request("/reports");
  }

  async compareReports(scanA, scanB) {
    return this.request(`/reports/compare/diff?scan_a=${scanA}&scan_b=${scanB}`);
  }

  getExportUrl(scanId, type) {
    return `${BASE_URL}/reports/${scanId}/export/${type}`;
  }

  // Scan Scheduling
  async getSchedules() {
    return this.request("/schedules");
  }

  async createSchedule(data) {
    return this.request("/schedules", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async toggleSchedule(id) {
    return this.request(`/schedules/${id}/toggle`, { method: "POST" });
  }

  async runScheduleNow(id) {
    return this.request(`/schedules/${id}/run-now`, { method: "POST" });
  }

  async deleteSchedule(id) {
    return this.request(`/schedules/${id}`, { method: "DELETE" });
  }

  // AI Security Assistant
  async getAiAnalysis(scanId) {
    return this.request(`/ai/analyze/${scanId}`);
  }

  async queryAi(scanId, prompt) {
    return this.request("/ai/query", {
      method: "POST",
      body: JSON.stringify({ scan_id: scanId, prompt })
    });
  }

  // Multi-Target Projects
  async getProjects() {
    return this.request("/projects");
  }

  async createProject(data) {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, { method: "DELETE" });
  }

  async addProjectTarget(projectId, targetData) {
    return this.request(`/projects/${projectId}/targets`, {
      method: "POST",
      body: JSON.stringify(targetData)
    });
  }

  async deleteProjectTarget(projectId, targetId) {
    return this.request(`/projects/${projectId}/targets/${targetId}`, {
      method: "DELETE"
    });
  }

  async scanAllProjectTargets(projectId) {
    return this.request(`/projects/${projectId}/scan-all`, {
      method: "POST"
    });
  }

  // Notifications & Alerts
  async getNotificationConfig() {
    return this.request("/notifications/config");
  }

  async saveNotificationConfig(data) {
    return this.request("/notifications/config", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async testNotifications() {
    return this.request("/notifications/test", { method: "POST" });
  }

  // Tool Plugins
  async getPlugins() {
    return this.request("/plugins");
  }

  async createPlugin(data) {
    return this.request("/plugins", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async togglePlugin(id) {
    return this.request(`/plugins/${id}/toggle`, { method: "POST" });
  }

  async deletePlugin(id) {
    return this.request(`/plugins/${id}`, { method: "DELETE" });
  }

  // OPSEC & Anonymity Shield
  async getOpsecStatus() {
    return this.request("/opsec/status");
  }

  async checkPublicIp() {
    return this.request("/opsec/ip/check", { method: "POST" });
  }

  async spoofMac(interfaceName = "eth0") {
    return this.request("/opsec/mac/spoof", {
      method: "POST",
      body: JSON.stringify({ interface: interfaceName })
    });
  }

  async restoreMac(interfaceName = "eth0") {
    return this.request("/opsec/mac/restore", {
      method: "POST",
      body: JSON.stringify({ interface: interfaceName })
    });
  }

  async startTor() {
    return this.request("/opsec/tor/start", { method: "POST" });
  }

  async stopTor() {
    return this.request("/opsec/tor/stop", { method: "POST" });
  }

  async newTorIdentity() {
    return this.request("/opsec/tor/new-identity", { method: "POST" });
  }

  async getVpnProfiles() {
    return this.request("/opsec/vpn/profiles");
  }

  async fetchPublicVpns() {
    return this.request("/opsec/vpn/fetch-public", { method: "POST" });
  }

  async uploadVpnProfile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const headers = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${BASE_URL}/opsec/vpn/upload`, {
      method: "POST",
      headers,
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Failed to upload VPN profile");
    }
    return await response.json();
  }

  async connectVpn(profileName) {
    return this.request("/opsec/vpn/connect", {
      method: "POST",
      body: JSON.stringify({ profile_name: profileName })
    });
  }

  async disconnectVpn() {
    return this.request("/opsec/vpn/disconnect", { method: "POST" });
  }

  // Adaptive Engine [BETA]
  async getAdaptiveStrategies() {
    return this.request("/adaptive/strategies");
  }

  async getAiRules() {
    return this.request("/adaptive/ai-rules");
  }

  async profileTarget(target) {
    return this.request("/adaptive/profile-target", {
      method: "POST",
      body: JSON.stringify({ target })
    });
  }

  async launchAdaptiveScan(target, strategy = "balanced", parallel = true) {
    return this.request("/adaptive/launch", {
      method: "POST",
      body: JSON.stringify({ target, strategy, parallel })
    });
  }
}

export const api = new ApiClient();
