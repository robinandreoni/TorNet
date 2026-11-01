import React, { useState, useEffect } from "react";
import { 
  Layers, 
  ExternalLink, 
  Square, 
  Trash2, 
  Download, 
  RefreshCw,
  Search
} from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function ScanResults({ onSelectScan }) {
  const { t } = useLanguage();
  const [scans, setScans] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadScans = async () => {
    try {
      setLoading(true);
      const data = await api.getScans(filterStatus);
      setScans(data || []);
    } catch (err) {
      console.error("Failed to load scans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
    const interval = setInterval(loadScans, 4000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleStop = async (e, scanId) => {
    e.stopPropagation();
    try {
      await api.stopScan(scanId);
      loadScans();
    } catch (err) {
      alert("Failed to stop scan: " + err.message);
    }
  };

  const handleDelete = async (e, scanId) => {
    e.stopPropagation();
    if (window.confirm(`Delete audit record #${scanId}?`)) {
      try {
        await api.deleteScan(scanId);
        loadScans();
      } catch (err) {
        alert("Failed to delete scan: " + err.message);
      }
    }
  };

  const filteredScans = scans.filter((s) => {
    if (!searchQuery) return true;
    return s.target.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filterButtons = [
    { key: "all", label: t("filterAll") },
    { key: "running", label: t("filterRunning") },
    { key: "completed", label: t("filterCompleted") },
    { key: "stopped", label: t("filterStopped") },
    { key: "failed", label: t("filterFailed") },
  ];

  return (
    <div className="page-wrapper">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 className="title-display" style={{ fontSize: "1.75rem", color: "#f8fafc" }}>
            {t("scanRegistryTitle")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            {t("scanRegistrySubtitle")}
          </p>
        </div>

        <button onClick={loadScans} className="btn btn-secondary">
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>{t("syncBtn")}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {filterButtons.map((b) => (
            <button
              key={b.key}
              onClick={() => setFilterStatus(b.key)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: filterStatus === b.key ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
                color: filterStatus === b.key ? "#38bdf8" : "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "uppercase"
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} color="#64748b" style={{ position: "absolute", left: "10px" }} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "rgba(2, 6, 23, 0.8)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "6px 12px 6px 32px",
              color: "#f8fafc",
              fontSize: "0.8rem",
              outline: "none",
              width: "240px"
            }}
          />
        </div>
      </div>

      {/* Scans Table */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        {filteredScans.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
            {t("noMatchingScans")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 14px" }}>{t("colId")}</th>
                  <th style={{ padding: "12px 14px" }}>{t("colTarget")}</th>
                  <th style={{ padding: "12px 14px" }}>{t("colProfile")}</th>
                  <th style={{ padding: "12px 14px" }}>{t("colProgressTool")}</th>
                  <th style={{ padding: "12px 14px" }}>{t("colStatus")}</th>
                  <th style={{ padding: "12px 14px" }}>{t("colStartTime")}</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((s) => {
                  const isRunning = s.status === "running";
                  return (
                    <tr 
                      key={s.id} 
                      onClick={() => onSelectScan(s.id)}
                      style={{ 
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        cursor: "pointer",
                        transition: "background 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "14px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        #{s.id}
                      </td>
                      <td style={{ padding: "14px", fontWeight: 600, color: "#f8fafc" }}>
                        {s.target}
                      </td>
                      <td style={{ padding: "14px", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.78rem" }}>
                        {s.scan_type} ({s.intensity})
                      </td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ width: "140px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                            <span>{s.current_tool || s.status}</span>
                            <span>{s.progress}%</span>
                          </div>
                          <div style={{ width: "100%", height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${s.progress}%`, height: "100%", background: isRunning ? "#38bdf8" : "#10b981" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: isRunning ? "rgba(56, 189, 248, 0.15)" : (s.status === "completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"),
                          color: isRunning ? "#38bdf8" : (s.status === "completed" ? "#10b981" : "#ef4444")
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px", color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                        {new Date(s.start_time).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          {isRunning && (
                            <button
                              onClick={(e) => handleStop(e, s.id)}
                              className="btn btn-secondary"
                              title="Stop Scan"
                              style={{ padding: "4px 8px" }}
                            >
                              <Square size={13} color="#f87171" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(api.getExportUrl(s.id, "html"), "_blank");
                            }}
                            className="btn btn-secondary"
                            title="Open Audit Report HTML"
                            style={{ padding: "4px 8px" }}
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, s.id)}
                            className="btn btn-secondary"
                            title="Delete Record"
                            style={{ padding: "4px 8px", color: "#ef4444" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
