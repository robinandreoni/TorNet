import React, { useState } from "react";
import { 
  Crosshair, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  Check, 
  ArrowRight,
  Flame,
  Globe
} from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function NewScan({ onScanLaunched }) {
  const { t } = useLanguage();
  const [target, setTarget] = useState("http://testphp.vulnweb.com");
  const [scanType, setScanType] = useState("full_auto");
  const [intensity, setIntensity] = useState("medium");
  const [targetType, setTargetType] = useState("web");
  const [selectedTools, setSelectedTools] = useState([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const authorizedPresets = [
    { label: "Acunetix TestPHP (Online Vuln Web)", url: "http://testphp.vulnweb.com", type: "web" },
    { label: "Local Host Loopback (127.0.0.1)", url: "127.0.0.1", type: "network" },
    { label: "Acunetix TestASP (ASP.NET Vuln)", url: "http://testasp.vulnweb.com", type: "web" },
    { label: "Google Gruyere Web App", url: "https://google-gruyere.appspot.com", type: "web" },
  ];

  const scanProfiles = [
    {
      id: "full_auto",
      name: t("profileFullAutoName"),
      desc: t("profileFullAutoDesc"),
      badge: "Full Auto",
      tools: ["scapy", "nmap", "httpx", "whatweb", "nuclei", "nikto", "sqlmap", "gobuster"]
    },
    {
      id: "recon",
      name: t("profileReconName"),
      desc: t("profileReconDesc"),
      badge: "Recon",
      tools: ["scapy", "subfinder", "nmap", "httpx", "whatweb"]
    },
    {
      id: "vuln_scan",
      name: t("profileVulnName"),
      desc: t("profileVulnDesc"),
      badge: "Vuln Scan",
      tools: ["nmap", "nuclei", "nikto"]
    },
    {
      id: "exploit",
      name: t("profileExploitName"),
      desc: t("profileExploitDesc"),
      badge: "Injection",
      tools: ["sqlmap", "nuclei"]
    },
    {
      id: "brute_force",
      name: t("profileBruteName"),
      desc: t("profileBruteDesc"),
      badge: "Directory",
      tools: ["gobuster", "scapy"]
    }
  ];

  const availableToolsList = [
    { id: "nmap", name: "Nmap Scanner" },
    { id: "nuclei", name: "Nuclei Templates" },
    { id: "nikto", name: "Nikto Web Server" },
    { id: "sqlmap", name: "SQLMap Injection" },
    { id: "subfinder", name: "Subfinder OSINT" },
    { id: "httpx", name: "HTTPX Prober" },
    { id: "whatweb", name: "WhatWeb Fingerprint" },
    { id: "gobuster", name: "Gobuster Directory" },
    { id: "scapy", name: "Scapy Socket Prober" },
  ];

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!target.trim()) {
      setErrorMsg("Target address is required.");
      return;
    }

    try {
      setIsLaunching(true);
      setErrorMsg("");

      const payload = {
        target: target.trim(),
        target_type: targetType,
        scan_type: scanType,
        intensity: intensity,
        selected_tools: selectedTools.length > 0 ? selectedTools : []
      };

      const res = await api.createScan(payload);
      if (onScanLaunched) {
        onScanLaunched(res.id);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to initiate scan pipeline.");
    } finally {
      setIsLaunching(false);
    }
  };

  const toggleTool = (toolId) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h2 className="title-display" style={{ fontSize: "1.75rem", color: "#f8fafc" }}>
          {t("launchNewAuditTitle")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
          {t("launchNewAuditSubtitle")}
        </p>
      </div>

      {errorMsg && (
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid var(--color-critical)",
          color: "#fca5a5",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "24px",
          fontSize: "0.85rem"
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLaunch} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Step 1: Target Definition */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#38bdf8",
              color: "#030712",
              fontSize: "0.8rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>1</span>
            <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
              {t("step1Title")}
            </h3>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
              {t("targetLabel")}
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <input 
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={t("targetPlaceholder")}
                style={{
                  flex: 1,
                  background: "rgba(2, 6, 23, 0.9)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#f8fafc",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                  outline: "none"
                }}
                required
              />
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                style={{
                  background: "rgba(2, 6, 23, 0.9)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#f8fafc",
                  fontSize: "0.85rem",
                  outline: "none"
                }}
              >
                <option value="web">{t("targetTypeWeb")}</option>
                <option value="network">{t("targetTypeNetwork")}</option>
                <option value="domain">{t("targetTypeDomain")}</option>
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              {t("authorizedPresetsLabel")}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {authorizedPresets.map((p) => (
                <button
                  type="button"
                  key={p.url}
                  onClick={() => {
                    setTarget(p.url);
                    setTargetType(p.type);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                >
                  <Globe size={13} color="#38bdf8" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Audit Profile */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#38bdf8",
              color: "#030712",
              fontSize: "0.8rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>2</span>
            <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
              {t("step2Title")}
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {scanProfiles.map((prof) => {
              const isSelected = scanType === prof.id;
              return (
                <div
                  key={prof.id}
                  onClick={() => setScanType(prof.id)}
                  style={{
                    background: isSelected ? "rgba(56, 189, 248, 0.08)" : "rgba(2, 6, 23, 0.6)",
                    border: `1px solid ${isSelected ? "#38bdf8" : "var(--border-subtle)"}`,
                    borderRadius: "8px",
                    padding: "16px",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem", color: isSelected ? "#38bdf8" : "#f8fafc" }}>
                      {prof.name}
                    </span>
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.06)",
                      color: isSelected ? "#38bdf8" : "var(--text-muted)"
                    }}>
                      {prof.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {prof.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Intensity & Custom Tools */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#38bdf8",
              color: "#030712",
              fontSize: "0.8rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>3</span>
            <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
              {t("step3Title")}
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {[
              { id: "light", label: t("intensityLightLabel"), sub: t("intensityLightSub") },
              { id: "medium", label: t("intensityMediumLabel"), sub: t("intensityMediumSub") },
              { id: "aggressive", label: t("intensityAggressiveLabel"), sub: t("intensityAggressiveSub") },
            ].map((lvl) => {
              const isSel = intensity === lvl.id;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setIntensity(lvl.id)}
                  style={{
                    background: isSel ? "rgba(14, 165, 233, 0.1)" : "rgba(2, 6, 23, 0.6)",
                    border: `1px solid ${isSel ? "#0284c7" : "var(--border-subtle)"}`,
                    borderRadius: "8px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: isSel ? "#38bdf8" : "#f8fafc" }}>
                    {lvl.label}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    {lvl.sub}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Individual Tools selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
              {t("customToolsLabel")}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {availableToolsList.map((tItem) => {
                const checked = selectedTools.includes(tItem.id);
                return (
                  <button
                    type="button"
                    key={tItem.id}
                    onClick={() => toggleTool(tItem.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: `1px solid ${checked ? "#38bdf8" : "var(--border-subtle)"}`,
                      background: checked ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 6, 23, 0.6)",
                      color: checked ? "#38bdf8" : "var(--text-secondary)",
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}
                  >
                    {checked && <Check size={12} />}
                    <span>{tItem.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 4: Launch Trigger */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={isLaunching}
            className="btn btn-primary"
            style={{
              padding: "14px 32px",
              fontSize: "1rem",
              borderRadius: "10px",
              boxShadow: "0 0 25px rgba(14, 165, 233, 0.4)"
            }}
          >
            <Crosshair size={20} className={isLaunching ? "spin" : ""} />
            <span>{isLaunching ? t("btnLaunching") : t("btnLaunchAudit")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
