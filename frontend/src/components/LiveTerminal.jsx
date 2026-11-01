import React, { useState, useEffect, useRef } from "react";
import { Terminal, Trash2, Copy, ArrowDown, Search } from "lucide-react";
import { wsClient } from "../api/websocket";
import { useLanguage } from "../i18n/LanguageContext";

export function LiveTerminal({ scanId, initialLogs = "" }) {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs.split("\n"));
    }
  }, [initialLogs]);

  useEffect(() => {
    const channel = scanId ? `scan_${scanId}` : "global";
    wsClient.connect(channel);

    const unsubscribe = wsClient.subscribe((data) => {
      if (data.type === "terminal_output") {
        if (!scanId || data.scan_id === scanId) {
          setLogs((prev) => [...prev, data.text]);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [scanId]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
  };

  const filteredLogs = filterQuery
    ? logs.filter((l) => l.toLowerCase().includes(filterQuery.toLowerCase()))
    : logs;

  const formatLine = (line, idx) => {
    let color = "#e2e8f0";
    if (line.includes("[NMAP]")) color = "#38bdf8";
    else if (line.includes("[NUCLEI]")) color = "#a855f7";
    else if (line.includes("[SQLMAP]")) color = "#f97316";
    else if (line.includes("[PIPELINE]") || line.includes("STAGE")) color = "#22c55e";
    else if (line.includes("VULNERABLE") || line.includes("Critical") || line.includes("ERROR")) color = "#ef4444";

    return (
      <div key={idx} style={{ display: "flex", gap: "12px", padding: "1px 0" }}>
        <span style={{ color: "#475569", width: "36px", textAlign: "right", userSelect: "none" }}>
          {idx + 1}
        </span>
        <span style={{ color, flex: 1, wordBreak: "break-all" }}>
          {line}
        </span>
      </div>
    );
  };

  return (
    <div style={{
      background: "var(--bg-terminal)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "10px",
      display: "flex",
      flexDirection: "column",
      height: "460px",
      overflow: "hidden"
    }}>
      {/* Terminal Title Bar */}
      <div style={{
        padding: "10px 16px",
        background: "rgba(15, 23, 42, 0.9)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Terminal size={15} color="#4ade80" />
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
            {t("terminalTitle")} {scanId ? `[AUDIT #${scanId}]` : "[STREAM GLOBALE]"}
          </span>
          <span className="pulse-indicator pulse-green" style={{ width: "6px", height: "6px" }}></span>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#64748b" style={{ position: "absolute", left: "8px" }} />
            <input 
              type="text"
              placeholder={t("terminalSearch")}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                background: "rgba(2, 6, 23, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "4px 8px 4px 28px",
                color: "#f8fafc",
                fontSize: "0.75rem",
                outline: "none",
                width: "140px"
              }}
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="btn btn-secondary"
            title={autoScroll ? "Autoscroll attivo" : "Autoscroll in pausa"}
            style={{ padding: "5px 8px", fontSize: "0.75rem", color: autoScroll ? "#38bdf8" : "#64748b" }}
          >
            <ArrowDown size={14} />
          </button>

          <button
            onClick={copyLogs}
            className="btn btn-secondary"
            title="Copia log"
            style={{ padding: "5px 8px", fontSize: "0.75rem" }}
          >
            <Copy size={14} />
          </button>

          <button
            onClick={clearLogs}
            className="btn btn-secondary"
            title="Pulisci terminale"
            style={{ padding: "5px 8px", fontSize: "0.75rem" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Console output body */}
      <div style={{
        flex: 1,
        padding: "14px 16px",
        overflowY: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: "0.82rem",
        lineHeight: "1.5"
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: "#64748b", fontStyle: "italic", paddingTop: "20px", textAlign: "center" }}>
            {t("terminalAwaiting")}
          </div>
        ) : (
          filteredLogs.map((l, i) => formatLine(l, i))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
