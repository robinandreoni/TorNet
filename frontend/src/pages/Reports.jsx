import React, { useState, useEffect } from "react";
import { FileText, Download, ExternalLink, RefreshCw, GitCompare, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import { SeverityBadge } from "../components/SeverityBadge";

export function Reports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comparison State
  const [scanA, setScanA] = useState("");
  const [scanB, setScanB] = useState("");
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      setReports(data || []);
      if (data && data.length >= 2) {
        setScanA(data[data.length - 1].scan_id.toString());
        setScanB(data[0].scan_id.toString());
      } else if (data && data.length === 1) {
        setScanA(data[0].scan_id.toString());
        setScanB(data[0].scan_id.toString());
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!scanA || !scanB) return;
    try {
      setComparing(true);
      setCompareError("");
      const result = await api.compareReports(scanA, scanB);
      setComparisonResult(result);
    } catch (err) {
      setCompareError(err.message || "Failed to compare scans");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 className="title-display" style={{ fontSize: "1.75rem", color: "#f8fafc" }}>
            {t("reportsTitle")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            {t("reportsSubtitle")}
          </p>
        </div>
        <button onClick={loadReports} className="btn btn-secondary">
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>{t("syncBtn")}</span>
        </button>
      </div>

      {/* Audit Comparison Panel */}
      <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <GitCompare size={20} color="#38bdf8" />
          <h3 className="title-display" style={{ fontSize: "1.15rem" }}>
            {t("compareAuditsTitle")}
          </h3>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "18px" }}>
          {t("compareAuditsDesc")}
        </p>

        <form onSubmit={handleCompare} style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              {t("selectBaseline")}
            </label>
            <select
              value={scanA}
              onChange={(e) => setScanA(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(2, 6, 23, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "9px 12px",
                color: "#f8fafc",
                fontSize: "0.85rem",
                outline: "none"
              }}
            >
              {reports.map((r) => (
                <option key={r.scan_id} value={r.scan_id}>
                  Audit #{r.scan_id} — {r.target} ({r.scan_type})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              {t("selectFollowup")}
            </label>
            <select
              value={scanB}
              onChange={(e) => setScanB(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(2, 6, 23, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "9px 12px",
                color: "#f8fafc",
                fontSize: "0.85rem",
                outline: "none"
              }}
            >
              {reports.map((r) => (
                <option key={r.scan_id} value={r.scan_id}>
                  Audit #{r.scan_id} — {r.target} ({r.scan_type})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={comparing || reports.length < 2}
            className="btn btn-primary"
            style={{ padding: "10px 22px" }}
          >
            <GitCompare size={15} />
            <span>{comparing ? "..." : t("btnRunComparison")}</span>
          </button>
        </form>

        {compareError && (
          <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "16px" }}>
            {compareError}
          </div>
        )}

        {/* Comparison Output Display */}
        {comparisonResult && (
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "18px" }}>
            {/* Stat Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>
                  {comparisonResult.remediated_count}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6ee7b7", textTransform: "uppercase", marginTop: "2px" }}>
                  {t("remediatedVulnsTitle")}
                </div>
              </div>

              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444" }}>
                  {comparisonResult.new_count}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#fca5a5", textTransform: "uppercase", marginTop: "2px" }}>
                  {t("newVulnsTitle")}
                </div>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b" }}>
                  {comparisonResult.persistent_count}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#fcd34d", textTransform: "uppercase", marginTop: "2px" }}>
                  {t("persistentVulnsTitle")}
                </div>
              </div>

              <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: comparisonResult.risk_reduction_pct >= 0 ? "#38bdf8" : "#f87171" }}>
                  {comparisonResult.risk_reduction_pct > 0 ? `-${comparisonResult.risk_reduction_pct}%` : `${comparisonResult.risk_reduction_pct}%`}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#93c5fd", textTransform: "uppercase", marginTop: "2px" }}>
                  {t("riskDeltaLabel")}
                </div>
              </div>
            </div>

            {/* List Details if any */}
            {comparisonResult.remediated_vulnerabilities?.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <h4 style={{ fontSize: "0.85rem", color: "#10b981", marginBottom: "8px", fontWeight: 600 }}>
                  ✓ {t("remediatedVulnsTitle")}
                </h4>
                {comparisonResult.remediated_vulnerabilities.map((v, i) => (
                  <div key={i} style={{ background: "rgba(2, 6, 23, 0.6)", padding: "10px 14px", borderRadius: "6px", marginBottom: "6px", display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span style={{ color: "#f8fafc" }}>{v.title}</span>
                    <SeverityBadge severity={v.severity} cvss={v.cvss_score} />
                  </div>
                ))}
              </div>
            )}

            {comparisonResult.persistent_vulnerabilities?.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.85rem", color: "#f59e0b", marginBottom: "8px", fontWeight: 600 }}>
                  ⚠ {t("persistentVulnsTitle")}
                </h4>
                {comparisonResult.persistent_vulnerabilities.map((v, i) => (
                  <div key={i} style={{ background: "rgba(2, 6, 23, 0.6)", padding: "10px 14px", borderRadius: "6px", marginBottom: "6px", display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span style={{ color: "#f8fafc" }}>{v.title}</span>
                    <SeverityBadge severity={v.severity} cvss={v.cvss_score} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Individual Completed Reports List */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        {reports.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
            {t("noReportsYet")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {reports.map((r) => (
              <div
                key={r.scan_id}
                style={{
                  background: "rgba(2, 6, 23, 0.6)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "18px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={18} color="#38bdf8" />
                    <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", fontWeight: 600 }}>
                      {r.target}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      [#{r.scan_id}]
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "14px", fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                    <span>Profile: <strong>{r.scan_type.toUpperCase()}</strong></span>
                    <span>Findings: <strong style={{ color: r.vulnerabilities_found > 0 ? "#ef4444" : "#10b981" }}>{r.vulnerabilities_found}</strong></span>
                    {r.completed_at && (
                      <span>Date: {new Date(r.completed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <a
                    href={api.getExportUrl(r.scan_id, "html")}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                  >
                    <ExternalLink size={14} />
                    <span>{t("executiveHtmlBtn")}</span>
                  </a>
                  <a
                    href={api.getExportUrl(r.scan_id, "csv")}
                    download
                    className="btn btn-secondary"
                    style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                  >
                    <Download size={14} />
                    <span>{t("csvMatrixBtn")}</span>
                  </a>
                  <a
                    href={api.getExportUrl(r.scan_id, "json")}
                    download
                    className="btn btn-secondary"
                    style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                  >
                    <Download size={14} />
                    <span>{t("jsonDataBtn")}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
