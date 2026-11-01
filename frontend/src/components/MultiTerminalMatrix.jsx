import React, { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Maximize2, Minimize2, Trash2, Cpu, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";

export function MultiTerminalMatrix({ logsByTool = {}, activeTools = [], scanStatus = "running" }) {
  const [selectedTool, setSelectedTool] = useState("all");
  const [expandedPane, setExpandedPane] = useState(null);
  const logEndRefs = useRef({});

  // Auto-scroll each terminal pane to bottom on new log line
  useEffect(() => {
    Object.keys(logEndRefs.current).forEach(tool => {
      if (logEndRefs.current[tool]) {
        logEndRefs.current[tool].scrollIntoView({ behavior: "smooth" });
      }
    });
  }, [logsByTool]);

  // Determine tools to display
  const displayTools = activeTools.length > 0 
    ? activeTools 
    : Object.keys(logsByTool).length > 0 
    ? Object.keys(logsByTool) 
    : ["recon", "vulnscan", "fuzzing"];

  const filteredTools = selectedTool === "all" ? displayTools : [selectedTool];

  return (
    <div style={{
      background: "#030712",
      border: "1px solid #1f2937",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 20px 40px -15px rgba(0,0,0,0.8), 0 0 30px rgba(239, 68, 68, 0.08)"
    }}>
      {/* Matrix Command Header Bar */}
      <div style={{
        background: "#050505",
        borderBottom: "1px solid #1f2937",
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: scanStatus === "running" ? "#ef4444" : "#10b981",
            boxShadow: scanStatus === "running" ? "0 0 10px #ef4444" : "0 0 10px #10b981",
            animation: scanStatus === "running" ? "pulse 1.5s infinite" : "none"
          }} />
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.82rem",
            fontWeight: 800,
            color: "#ff3333",
            letterSpacing: "1px",
            textTransform: "uppercase",
            textShadow: "0 0 8px rgba(239, 68, 68, 0.6)"
          }}>
            MULTI-TERMINAL MATRIX STREAM // {scanStatus.toUpperCase()}
          </span>
        </div>

        {/* Tool Filter Tabs */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => { setSelectedTool("all"); setExpandedPane(null); }}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              border: selectedTool === "all" ? "1px solid #ff3333" : "1px solid #1f2937",
              background: selectedTool === "all" ? "rgba(239, 68, 68, 0.15)" : "#090d16",
              color: selectedTool === "all" ? "#ff3333" : "#94a3b8",
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            GRID (TUTTI I TERMINALI)
          </button>

          {displayTools.map(t => (
            <button
              key={t}
              onClick={() => { setSelectedTool(t); setExpandedPane(t); }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: selectedTool === t ? "1px solid #00ff66" : "1px solid #1f2937",
                background: selectedTool === t ? "rgba(0, 255, 102, 0.12)" : "#090d16",
                color: selectedTool === t ? "#00ff66" : "#64748b",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                cursor: "pointer"
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Black Terminals with Red Titles and Matrix Green Text */}
      <div style={{
        display: "grid",
        gridTemplateColumns: expandedPane || selectedTool !== "all" 
          ? "1fr" 
          : filteredTools.length === 1 
          ? "1fr" 
          : "repeat(auto-fit, minmax(420px, 1fr))",
        gap: "1px",
        background: "#111827",
        minHeight: "420px",
        maxHeight: "680px",
        overflowY: "auto"
      }}>
        {filteredTools.map(tool => {
          const logs = logsByTool[tool] || [];
          const isMaximized = expandedPane === tool;

          return (
            <div 
              key={tool} 
              style={{
                background: "#000000",
                display: "flex",
                flexDirection: "column",
                borderTop: "2px solid #ef4444",
                minHeight: "260px"
              }}
            >
              {/* Terminal Title Bar: Pure Black with Vivid Red Header */}
              <div style={{
                background: "#050505",
                padding: "8px 14px",
                borderBottom: "1px solid #1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TerminalIcon size={14} color="#ff3333" />
                  <span style={{
                    color: "#ff2a2a",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    textShadow: "0 0 10px rgba(255, 42, 42, 0.7)"
                  }}>
                    TERMINAL :: [{tool.toUpperCase()}]
                  </span>
                  <span style={{
                    fontSize: "0.65rem",
                    color: "#00ff66",
                    fontFamily: "var(--font-mono)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(0, 255, 102, 0.1)",
                    border: "1px solid rgba(0, 255, 102, 0.25)"
                  }}>
                    {logs.length} lines
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => setExpandedPane(isMaximized ? null : tool)}
                    title={isMaximized ? "Riduci vista griglia" : "Espandi a schermo intero"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "2px"
                    }}
                  >
                    {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                </div>
              </div>

              {/* Terminal Output Area: Pure Black Background & Matrix Green Glowing Text */}
              <div style={{
                flex: 1,
                background: "#000000",
                padding: "14px 16px",
                overflowY: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: "0.76rem",
                lineHeight: "1.55",
                color: "#00ff66",
                textShadow: "0 0 5px rgba(0, 255, 102, 0.45)",
                userSelect: "text"
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: "rgba(0, 255, 102, 0.5)", fontStyle: "italic", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div>&gt; Modulo [{tool.toUpperCase()}] registrato nella sequenza di scansione.</div>
                    <div style={{ color: "rgba(251, 191, 36, 0.8)", fontSize: "0.72rem" }}>
                      ⏳ In coda graduale: si avvierà automaticamente appena si libera uno slot (max 2-3 contemporanei per preservare RAM e Tor).
                    </div>
                  </div>
                ) : (
                  logs.map((line, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap",
                        color: line.includes("🧠") || line.includes("AI DECISION") || line.includes("AI KNOWLEDGE")
                          ? "#38bdf8"
                          : line.includes("SE:")
                          ? "#fbbf24"
                          : line.includes("PERCHÉ SO:")
                          ? "#c084fc"
                          : line.includes("ALLORA FACCIO:")
                          ? "#34d399"
                          : line.includes("CODA SMART") || line.includes("In attesa di slot")
                          ? "#f59e0b"
                          : line.includes("SLOT ATTIVO")
                          ? "#06b6d4"
                          : line.includes("SLOT RILASCIATO")
                          ? "#10b981"
                          : line.includes("TIMEOUT")
                          ? "#f43f5e"
                          : line.includes("ERR") || line.includes("Failed") || line.includes("CRITICAL")
                          ? "#ff4d4d"
                          : line.includes("WARN") || line.includes("VULN")
                          ? "#ffaa00"
                          : line.includes("SUCCESS") || line.includes("200")
                          ? "#00ffaa"
                          : "#00ff66",
                        fontWeight: line.includes("🧠") || line.includes("SE:") || line.includes("ALLORA FACCIO:") || line.includes("SLOT") ? 700 : 400
                      }}
                    >
                      {line}
                    </div>
                  ))
                )}
                {/* Blinking Matrix Cursor */}
                <span style={{
                  display: "inline-block",
                  width: "8px",
                  height: "14px",
                  background: "#00ff66",
                  boxShadow: "0 0 8px #00ff66",
                  verticalAlign: "middle",
                  marginLeft: "4px",
                  animation: "blink 1s step-start infinite"
                }} />
                <div ref={el => logEndRefs.current[tool] = el} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
