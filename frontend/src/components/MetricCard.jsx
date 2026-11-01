import React from "react";

export function MetricCard({ title, value, subtitle, icon: Icon, color = "#38bdf8", glow = false }) {
  return (
    <div className="glass-panel" style={{
      padding: "20px 22px",
      position: "relative",
      overflow: "hidden",
      boxShadow: glow ? `0 0 24px ${color}20` : undefined,
      borderTop: `2px solid ${color}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {title}
          </div>
          <div className="title-display" style={{ fontSize: "2rem", color: "#f8fafc", marginTop: "6px" }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {subtitle}
            </div>
          )}
        </div>
        
        {Icon && (
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${color}30`
          }}>
            <Icon size={22} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}
