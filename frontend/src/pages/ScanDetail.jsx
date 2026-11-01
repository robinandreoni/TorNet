import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Terminal, 
  ShieldAlert, 
  Layers, 
  FileJson, 
  Download, 
  Square, 
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Bot,
  Send,
  Brain,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { api } from "../api/client";
import { LiveTerminal } from "../components/LiveTerminal";
import { SeverityBadge } from "../components/SeverityBadge";
import { useLanguage } from "../i18n/LanguageContext";

export function ScanDetail({ scanId, onBack }) {
  const { t } = useLanguage();
  const [scan, setScan] = useState(null);
  const [activeTab, setActiveTab] = useState("terminal");
  const [loading, setLoading] = useState(true);

  // AI Advisor State
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [aiSubmitting, setAiSubmitting] = useState(false);

  const loadScan = async () => {
    try {
      const data = await api.getScan(scanId);
      setScan(data);
    } catch (err) {
      console.error("Failed to load scan detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const data = await api.getAiAnalysis(scanId);
      setAiData(data);
    } catch (err) {
      console.error("Failed to load AI analysis:", err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadScan();
    const interval = setInterval(() => {
      loadScan();
    }, 3000);
    return () => clearInterval(interval);
  }, [scanId]);

  useEffect(() => {
    if (activeTab === "ai" && !aiData) {
      loadAiAnalysis();
    }
  }, [activeTab]);

  const handleStop = async () => {
    try {
      await api.stopScan(scanId);
      loadScan();
    } catch (err) {
      alert("Error stopping scan: " + err.message);
    }
  };

  const handleSendAiQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const userPrompt = aiQuery.trim();
    setAiQuery("");
    setAiChatHistory((prev) => [...prev, { sender: "user", text: userPrompt }]);
    setAiSubmitting(true);

    try {
      const res = await api.queryAi(scanId, userPrompt);
      setAiChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: res.response || "No response received." }
      ]);
    } catch (err) {
      setAiChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `Error processing query: ${err.message}` }
      ]);
    } finally {
      setAiSubmitting(false);
    }
  };

  if (loading && !scan) {
    return (
      <div className="page-wrapper" style={{ textAlign: "center", padding: "60px 0" }}>
        <RefreshCw size={24} className="spin" color="#38bdf8" />
        <p style={{ marginTop: "12px", color: "var(--text-muted)" }}>Loading audit details...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="page-wrapper">
        <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: "20px" }}>
          <ArrowLeft size={16} />
          <span>{t("backToRegistry")}</span>
        </button>
        <div style={{ color: "#ef4444" }}>Scan #{scanId} not found.</div>
      </div>
    );
  }

  const isRunning = scan.status === "running";
  const vulns = scan.vulnerabilities || [];
  const results = scan.results || [];

  return (
    <div className="page-wrapper">
      {/* Top Navigation */}
      <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: "20px", padding: "6px 12px", fontSize: "0.8rem" }}>
        <ArrowLeft size={14} />
        <span>{t("backToRegistry")}</span>
      </button>

      {/* Main Status Header Card */}
      <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {t("auditRecord")} #{scan.id}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                background: isRunning ? "rgba(56, 189, 248, 0.15)" : (scan.status === "completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"),
                color: isRunning ? "#38bdf8" : (scan.status === "completed" ? "#10b981" : "#ef4444")
              }}>
                {scan.status}
              </span>
            </div>
            <h2 className="title-display" style={{ fontSize: "1.6rem", color: "#f8fafc", marginTop: "4px" }}>
              {scan.target}
            </h2>
            <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "6px", flexWrap: "wrap" }}>
              <span>Profile: <strong>{scan.scan_type.toUpperCase()}</strong></span>
              <span>Intensity: <strong>{scan.intensity}</strong></span>
              <span>Target Type: <strong>{scan.target_type}</strong></span>
              <span>Current Tool: <strong style={{ color: "#38bdf8" }}>{scan.current_tool}</strong></span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            {isRunning && (
              <button onClick={handleStop} className="btn btn-danger" style={{ padding: "8px 14px", fontSize: "0.8rem" }}>
                <Square size={14} />
                <span>{t("stopAuditBtn")}</span>
              </button>
            )}
            <button 
              onClick={() => window.open(api.getExportUrl(scan.id, "html"), "_blank")} 
              className="btn btn-secondary"
              style={{ padding: "8px 14px", fontSize: "0.8rem" }}
            >
              <Download size={14} />
              <span>{t("exportReportBtn")}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            <span>{t("pipelineProgress")}: {scan.current_tool}</span>
            <span>{scan.progress}%</span>
          </div>
          <div style={{ width: "100%", height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: `${scan.progress}%`, height: "100%", background: isRunning ? "linear-gradient(90deg, #0ea5e9, #38bdf8)" : "#10b981", transition: "width 0.4s ease" }} />
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "20px", overflowX: "auto" }}>
        {[
          { id: "terminal", label: t("tabTerminal"), icon: Terminal },
          { id: "vulns", label: `${t("tabVulns")} (${vulns.length})`, icon: ShieldAlert },
          { id: "ai", label: t("tabAiAdvisor"), icon: Sparkles, highlight: true },
          { id: "tools", label: `${t("tabTools")} (${results.length})`, icon: Layers },
          { id: "raw", label: t("tabRawJson"), icon: FileJson },
        ].map((tab) => {
          const Icon = tab.icon;
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                border: "none",
                background: isAct && tab.highlight ? "rgba(168, 85, 247, 0.12)" : "transparent",
                color: isAct ? (tab.highlight ? "#c084fc" : "#38bdf8") : "var(--text-secondary)",
                borderBottom: isAct ? `2px solid ${tab.highlight ? "#c084fc" : "#38bdf8"}` : "2px solid transparent",
                cursor: "pointer",
                fontWeight: isAct ? 600 : 500,
                fontSize: "0.85rem",
                whiteSpace: "nowrap"
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Live Terminal */}
      {activeTab === "terminal" && (
        <LiveTerminal scanId={scan.id} />
      )}

      {/* Tab 2: Vulnerabilities */}
      {activeTab === "vulns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {vulns.length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              {t("noVulnsForScan")}
            </div>
          ) : (
            vulns.map((v) => (
              <div key={v.id} className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "1.05rem", color: "#f8fafc", fontWeight: 600 }}>
                      {v.title}
                    </h4>
                    <div style={{ display: "flex", gap: "12px", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      <span>Endpoint: <code style={{ color: "#38bdf8" }}>{v.endpoint}</code></span>
                      <span>Detected by: <strong style={{ color: "#cbd5e1" }}>{v.tool_found_by}</strong></span>
                      {v.cve_id && <span>CVE: <strong style={{ color: "#f59e0b" }}>{v.cve_id}</strong></span>}
                    </div>
                  </div>
                  <SeverityBadge severity={v.severity} cvss={v.cvss_score} />
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "12px 0", lineHeight: "1.5" }}>
                  {v.description}
                </p>

                {v.remediation && (
                  <div style={{ background: "rgba(2, 6, 23, 0.7)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "12px 14px", marginTop: "10px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
                      {t("remediationGuidance")}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "4px" }}>
                      {v.remediation}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: AI Security Advisor */}
      {activeTab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {aiLoading && !aiData ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
              <RefreshCw size={24} className="spin" color="#c084fc" />
              <p style={{ marginTop: "12px", color: "var(--text-muted)" }}>Generating AI Security Telemetry & Remediation Roadmap...</p>
            </div>
          ) : aiData ? (
            <>
              {/* Posture Score & Executive Summary */}
              <div className="glass-panel" style={{ padding: "24px", display: "grid", gridTemplateColumns: "180px 1fr", gap: "24px", alignItems: "center" }}>
                <div style={{ textAlign: "center", borderRight: "1px solid var(--border-subtle)", paddingRight: "20px" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    margin: "0 auto 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.2rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    background: aiData.posture_score >= 80 ? "rgba(16, 185, 129, 0.15)" : (aiData.posture_score >= 50 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)"),
                    color: aiData.posture_score >= 80 ? "#10b981" : (aiData.posture_score >= 50 ? "#f59e0b" : "#ef4444"),
                    border: `2px solid ${aiData.posture_score >= 80 ? "#10b981" : (aiData.posture_score >= 50 ? "#f59e0b" : "#ef4444")}`
                  }}>
                    {aiData.posture_grade}
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>
                    {aiData.posture_score} / 100
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "2px" }}>
                    {t("aiPostureScore")}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Brain size={18} color="#c084fc" />
                    <span style={{ fontSize: "0.85rem", color: "#c084fc", fontWeight: 700, textTransform: "uppercase" }}>
                      AI Executive Summary
                    </span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "#e2e8f0", lineHeight: "1.6" }}>
                    {aiData.summary_it}
                  </p>
                </div>
              </div>

              {/* Threat Vectors */}
              {aiData.threat_vectors && aiData.threat_vectors.length > 0 && (
                <div className="glass-panel" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "0.95rem", color: "#f8fafc", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertTriangle size={16} color="#ef4444" />
                    <span>{t("aiThreatVectors")}</span>
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                    {aiData.threat_vectors.map((tv, idx) => (
                      <div key={idx} style={{ padding: "14px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.85rem" }}>{tv.category}</span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
                            {tv.risk}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                          {tv.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate & Strategic Remediation */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="glass-panel" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "0.95rem", color: "#f8fafc", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span>{t("aiImmediateRemediation")}</span>
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {aiData.immediate_actions.map((act, idx) => (
                      <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.82rem", color: "#e2e8f0" }}>
                        <span style={{ color: "#10b981", fontWeight: 700 }}>•</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-panel" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "0.95rem", color: "#f8fafc", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Lightbulb size={16} color="#38bdf8" />
                    <span>{t("aiStrategicRecommendations")}</span>
                  </h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {aiData.strategic_recommendations.map((rec, idx) => (
                      <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.82rem", color: "#e2e8f0" }}>
                        <span style={{ color: "#38bdf8", fontWeight: 700 }}>•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Interactive AI Query Terminal */}
              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Bot size={18} color="#c084fc" />
                  <h4 style={{ fontSize: "0.95rem", color: "#f8fafc", fontWeight: 600 }}>
                    {t("aiQueryTitle")}
                  </h4>
                </div>

                {/* Chat History */}
                {aiChatHistory.length > 0 && (
                  <div style={{
                    background: "rgba(2, 6, 23, 0.7)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {aiChatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          lineHeight: "1.5",
                          alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          background: msg.sender === "user" ? "rgba(56, 189, 248, 0.15)" : "rgba(168, 85, 247, 0.12)",
                          border: msg.sender === "user" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(168, 85, 247, 0.3)",
                          color: msg.sender === "user" ? "#38bdf8" : "#f8fafc",
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        <strong>{msg.sender === "user" ? "Operatore: " : "AI Security Advisor: "}</strong>
                        {msg.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Prompt input */}
                <form onSubmit={handleSendAiQuery} style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder={t("aiQueryPlaceholder")}
                    disabled={aiSubmitting}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: "6px",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid var(--border-subtle)",
                      color: "#f8fafc",
                      fontSize: "0.85rem"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={aiSubmitting || !aiQuery.trim()}
                    className="btn btn-primary"
                    style={{ background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)" }}
                  >
                    <Send size={16} />
                    <span>{aiSubmitting ? "Analisi..." : t("aiSendBtn")}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Nessun dato AI disponibile per questo audit.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Tool Breakdown */}
      {activeTab === "tools" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {results.length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              {t("noToolOutputs")}
            </div>
          ) : (
            results.map((r) => (
              <div key={r.id} className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <h4 style={{ fontSize: "1rem", color: "#f8fafc", fontWeight: 600 }}>
                      {r.tool_name}
                    </h4>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {new Date(r.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <pre style={{
                  background: "var(--bg-terminal)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  padding: "14px",
                  color: "#cbd5e1",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  maxHeight: "260px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap"
                }}>
                  {r.raw_output || "No stdout captured for this step."}
                </pre>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Raw JSON */}
      {activeTab === "raw" && (
        <div className="glass-panel" style={{ padding: "20px" }}>
          <pre style={{
            background: "var(--bg-terminal)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
            padding: "16px",
            color: "#38bdf8",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            maxHeight: "500px",
            overflowY: "auto"
          }}>
            {JSON.stringify(scan, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
