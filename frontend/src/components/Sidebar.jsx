import React from "react";
import { 
  ShieldAlert, 
  Crosshair, 
  Layers, 
  FileText, 
  Wrench, 
  Settings, 
  Activity,
  Cpu,
  FolderKanban
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export function Sidebar({ currentTab, onSelectTab, activeScansCount = 0 }) {
  const { t } = useLanguage();

  const menuItems = [
    { id: "dashboard", label: t("commandCenter"), icon: Activity },
    { id: "adaptive", label: "Smart Engine", icon: Cpu, betaBadge: "BETA" },
    { id: "new-scan", label: t("launchAudit"), icon: Crosshair, highlight: true },
    { id: "scans", label: t("scanRegistry"), icon: Layers, badge: activeScansCount > 0 ? activeScansCount : null },
    { id: "projects", label: t("multiTargetProjects"), icon: FolderKanban },
    { id: "reports", label: t("auditReports"), icon: FileText },
    { id: "toolbox", label: t("toolArsenal"), icon: Wrench },
    { id: "settings", label: t("configuration"), icon: Settings },
  ];

  return (
    <aside style={{
      width: "260px",
      background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      padding: "24px 16px",
      userSelect: "none"
    }}>
      {/* Brand Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "0 8px 24px 8px",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "20px"
      }}>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 16px rgba(14, 165, 233, 0.4)"
        }}>
          <ShieldAlert size={22} color="#ffffff" />
        </div>
        <div>
          <h1 className="title-display" style={{ fontSize: "1.15rem", letterSpacing: "0.05em", color: "#f8fafc" }}>
            TORNET
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <span className="pulse-indicator pulse-green"></span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {t("commandCore")}
            </span>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                background: isActive 
                  ? "rgba(56, 189, 248, 0.12)" 
                  : (item.highlight ? "rgba(37, 99, 235, 0.08)" : "transparent"),
                color: isActive ? "#38bdf8" : (item.highlight ? "#93c5fd" : "var(--text-secondary)"),
                borderLeft: isActive ? "3px solid #38bdf8" : "3px solid transparent",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
                transition: "all 0.15s ease",
                textAlign: "left"
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "10px"
                }}>
                  {item.badge}
                </span>
              )}
              {item.betaBadge && (
                <span style={{
                  background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  color: "#fff",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: "10px",
                  letterSpacing: "0.5px"
                }}>
                  {item.betaBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operator Info Card */}
      <div style={{
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Cpu size={14} color="#38bdf8" />
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            {t("engineRuntime")}
          </span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#e2e8f0", fontWeight: 600 }}>
          {t("runtimeValue")}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#10b981", marginTop: "2px" }}>
          {t("targetMode")}
        </div>
      </div>
    </aside>
  );
}
