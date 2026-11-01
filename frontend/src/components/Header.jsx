import React, { useState, useEffect } from "react";
import { Plus, Radio, Wifi, WifiOff, Clock, Languages, Shield } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { OpsecHeaderControls } from "./OpsecHeaderControls";
import { OpsecModal } from "./OpsecModal";

export function Header({ onNewScan, isWsConnected = true }) {
  const { lang, setLang, t } = useLanguage();
  const [timeStr, setTimeStr] = useState("");
  const [isOpsecModalOpen, setOpsecModalOpen] = useState(false);
  const [opsecModalTab, setOpsecModalTab] = useState("mac");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB", { hour12: false }) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  return (
    <header style={{
      height: "64px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(11, 15, 25, 0.8)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 36px",
      position: "sticky",
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Radio size={16} color="#38bdf8" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f8fafc" }}>
            {t("telemetryTitle")}
          </span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 8px",
          background: isWsConnected ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          border: `1px solid ${isWsConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          borderRadius: "20px",
          fontSize: "0.72rem",
          fontWeight: 600,
          color: isWsConnected ? "#10b981" : "#ef4444"
        }}>
          {isWsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{isWsConnected ? t("feedSynchronized") : t("streamOffline")}</span>
        </div>
      </div>

      {/* Central OPSEC & Anonymity Bar */}
      <OpsecHeaderControls onOpenModal={(tab) => {
        setOpsecModalTab(tab);
        setOpsecModalOpen(true);
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Language Switcher */}
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(2, 6, 23, 0.8)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          padding: "3px 4px",
          gap: "4px"
        }}>
          <button
            onClick={() => setLang("it")}
            style={{
              padding: "4px 8px",
              borderRadius: "5px",
              border: "none",
              background: lang === "it" ? "rgba(56, 189, 248, 0.25)" : "transparent",
              color: lang === "it" ? "#38bdf8" : "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            title="Passa a Italiano"
          >
            <span>🇮🇹</span>
            <span>IT</span>
          </button>
          <button
            onClick={() => setLang("en")}
            style={{
              padding: "4px 8px",
              borderRadius: "5px",
              border: "none",
              background: lang === "en" ? "rgba(56, 189, 248, 0.25)" : "transparent",
              color: lang === "en" ? "#38bdf8" : "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            title="Switch to English"
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
          <Clock size={14} />
          <span>{timeStr}</span>
        </div>

        <button 
          onClick={onNewScan}
          className="btn btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.8rem" }}
        >
          <Plus size={16} />
          <span>{t("startNewAudit")}</span>
        </button>
      </div>

      <OpsecModal
        isOpen={isOpsecModalOpen}
        onClose={() => setOpsecModalOpen(false)}
        initialTab={opsecModalTab}
      />
    </header>
  );
}
