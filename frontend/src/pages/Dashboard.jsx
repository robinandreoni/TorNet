import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Globe, 
  CheckCircle2, 
  Flame, 
  ArrowRight,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { SeverityBadge } from "../components/SeverityBadge";
import { useLanguage } from "../i18n/LanguageContext";

export function Dashboard({ onNavigateScan, onNewScan }) {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, scansRes, vulnsRes] = await Promise.all([
        api.getStats().catch(() => null),
        api.getScans().catch(() => []),
        api.getVulnerabilities().catch(() => [])
      ]);
      setStats(statsRes);
      setRecentScans(scansRes || []);
      setVulnerabilities(vulnsRes || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = stats?.severity_distribution ? [
    { name: t("sevCritical"), value: stats.severity_distribution.critical || 0, color: "#ef4444" },
    { name: t("sevHigh"), value: stats.severity_distribution.high || 0, color: "#f97316" },
    { name: t("sevMedium"), value: stats.severity_distribution.medium || 0, color: "#f59e0b" },
    { name: t("sevLow"), value: stats.severity_distribution.low || 0, color: "#38bdf8" },
    { name: t("sevInfo"), value: stats.severity_distribution.info || 0, color: "#10b981" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="page-wrapper">
      {/* Top Welcome & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 className="title-display" style={{ fontSize: "1.75rem", color: "#f8fafc" }}>
            {t("dashboardTitle")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            {t("dashboardSubtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ padding: "8px 12px" }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>{t("syncBtn")}</span>
          </button>
          <button onClick={onNewScan} className="btn btn-primary">
            <span>{t("newTargetAuditBtn")}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard
          title={t("criticalFindings")}
          value={stats?.critical_vulns ?? 0}
          subtitle={t("criticalFindingsSub")}
          icon={Flame}
          color="#ef4444"
          glow={stats?.critical_vulns > 0}
        />
        <MetricCard
          title={t("activeScans")}
          value={stats?.active_scans ?? 0}
          subtitle={t("activeScansSub")}
          icon={Activity}
          color="#38bdf8"
          glow={stats?.active_scans > 0}
        />
        <MetricCard
          title={t("assetsAudited")}
          value={stats?.assets_tested ?? 0}
          subtitle={t("assetsAuditedSub")}
          icon={Globe}
          color="#a855f7"
        />
        <MetricCard
          title={t("pipelineHealth")}
          value={`${stats?.success_rate ?? 100}%`}
          subtitle={t("pipelineHealthSub")}
          icon={CheckCircle2}
          color="#10b981"
        />
      </div>

      {/* Main Two Column Section: Scans & Severity Distribution */}
      <div className="dashboard-grid-2">
        {/* Left: Active & Recent Scans */}
        <div className="glass-panel" style={{ padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
              {t("activeRecentAudits")}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {recentScans.length} {t("totalRegistered")}
            </span>
          </div>

          {recentScans.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
              {t("noAuditsYet")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentScans.slice(0, 5).map((scan) => {
                const isRunning = scan.status === "running";
                return (
                  <div 
                    key={scan.id}
                    onClick={() => onNavigateScan(scan.id)}
                    style={{
                      background: "rgba(2, 6, 23, 0.6)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "border-color 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className={`pulse-indicator ${isRunning ? "pulse-cyan" : "pulse-green"}`} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f8fafc" }}>
                          {scan.target}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Type: {scan.scan_type.toUpperCase()} | Intensity: {scan.intensity}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <div style={{ width: "120px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                          <span>{scan.current_tool || scan.status}</span>
                          <span>{scan.progress}%</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${scan.progress}%`, height: "100%", background: isRunning ? "#38bdf8" : "#10b981", transition: "width 0.3s ease" }} />
                        </div>
                      </div>
                      <ExternalLink size={14} color="var(--text-muted)" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Severity Breakdown Chart */}
        <div className="glass-panel" style={{ padding: "22px", display: "flex", flexDirection: "column" }}>
          <h3 className="title-display" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            {t("vulnerabilityBreakdown")}
          </h3>
          
          <div style={{ flex: 1, minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {chartData.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {t("zeroVulns")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: "#0b0f19", border: "1px solid #1e293b", borderRadius: "6px", color: "#f8fafc" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
            {chartData.map((item) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                <span style={{ color: "var(--text-secondary)" }}>{item.name}:</span>
                <strong style={{ color: "#f8fafc" }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Vulnerabilities Table */}
      <div className="glass-panel" style={{ padding: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
            {t("discoveredVulns")}
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {vulnerabilities.length} {t("totalFindings")}
          </span>
        </div>

        {vulnerabilities.length === 0 ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)" }}>
            {t("noVulnsRecorded")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "10px 14px" }}>{t("colSeverity")}</th>
                  <th style={{ padding: "10px 14px" }}>{t("colVulnerability")}</th>
                  <th style={{ padding: "10px 14px" }}>{t("colEndpoint")}</th>
                  <th style={{ padding: "10px 14px" }}>{t("colDetectedBy")}</th>
                  <th style={{ padding: "10px 14px" }}>{t("colRemediation")}</th>
                </tr>
              </thead>
              <tbody>
                {vulnerabilities.slice(0, 8).map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <SeverityBadge severity={v.severity} cvss={v.cvss_score} />
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f8fafc" }}>
                      {v.title}
                    </td>
                    <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", color: "#38bdf8", fontSize: "0.78rem" }}>
                      {v.endpoint}
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                      {v.tool_found_by}
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)", maxWidth: "340px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.remediation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
