import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

export function SeverityBadge({ severity, cvss }) {
  const { t } = useLanguage();
  const sev = (severity || "info").toLowerCase();
  
  const classMap = {
    critical: "badge-critical",
    high: "badge-high",
    medium: "badge-medium",
    low: "badge-low",
    info: "badge-info"
  };

  const labelKeyMap = {
    critical: "sevCritical",
    high: "sevHigh",
    medium: "sevMedium",
    low: "sevLow",
    info: "sevInfo"
  };

  const badgeClass = classMap[sev] || "badge-info";
  const label = t(labelKeyMap[sev] || "sevInfo");

  return (
    <span className={`badge ${badgeClass}`}>
      <span>{label}</span>
      {cvss !== undefined && cvss !== null && (
        <span style={{ opacity: 0.85, fontSize: "0.7rem", marginLeft: "2px" }}>
          {Number(cvss).toFixed(1)}
        </span>
      )}
    </span>
  );
}
