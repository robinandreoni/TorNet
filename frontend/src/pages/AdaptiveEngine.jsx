import React, { useState, useEffect } from "react";
import { 
  Cpu, Play, Square, RefreshCw, Shield, Globe, Zap, CheckCircle2, 
  AlertTriangle, Flame, Radio, Terminal, Server, Sparkles, Layers,
  Brain, ChevronDown, ChevronUp
} from "lucide-react";
import { api } from "../api/client";
import { wsClient } from "../api/websocket";
import { MultiTerminalMatrix } from "../components/MultiTerminalMatrix";
import { useLanguage } from "../i18n/LanguageContext";

export function AdaptiveEngine() {
  const { t } = useLanguage();
  const [target, setTarget] = useState("http://testasp.vulnweb.com");
  const [profiling, setProfiling] = useState(false);
  const [targetProfile, setTargetProfile] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState("balanced");
  const [parallelMode, setParallelMode] = useState(true);

  const [activeScanId, setActiveScanId] = useState(null);
  const [scanStatus, setScanStatus] = useState("idle"); // idle, running, completed, failed
  const [scanProgress, setScanProgress] = useState(0);
  const [logsByTool, setLogsByTool] = useState({});
  const [currentScanTools, setCurrentScanTools] = useState([]);
  const [aiRules, setAiRules] = useState([]);
  const [showAiRules, setShowAiRules] = useState(false);

  // Load initial profile and AI rules catalog
  useEffect(() => {
    handleProfileTarget("http://testasp.vulnweb.com");
    api.getAiRules().then(res => setAiRules(res || [])).catch(() => {});
  }, []);

  // Listen to live WebSocket logs and route to tool-specific terminal panes
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.type === "terminal_output") {
        const text = msg.text || "";
        let tool = msg.tool_name || "general";

        // Fallback: parse [TOOL] prefix if tool_name is not explicit
        if (tool === "general") {
          const match = text.match(/\[([A-Z0-9_-]+)\]/i);
          if (match && match[1]) {
            const detected = match[1].toLowerCase();
            if (["nmap", "httpx", "whatweb", "nuclei", "nikto", "gobuster", "sqlmap", "feroxbuster", "metasploit", "subfinder"].includes(detected)) {
              tool = detected;
            }
          }
        }

        setLogsByTool(prev => ({
          ...prev,
          [tool]: [...(prev[tool] || []), text]
        }));
      }

      if (msg.type === "scan_progress") {
        setScanProgress(msg.progress || 0);
        if (msg.status === "completed") {
          setScanStatus("completed");
        } else if (msg.status === "running") {
          setScanStatus("running");
        }
      }
    });

    return () => unsubscribe();
  }, [activeScanId]);

  const handleProfileTarget = async (overrideTarget) => {
    const tToTest = overrideTarget || target;
    if (!tToTest) return;
    try {
      setProfiling(true);
      const res = await api.profileTarget(tToTest);
      setTargetProfile(res);
      if (res?.recommended_strategy) {
        setSelectedStrategy(res.recommended_strategy);
      }
    } catch (err) {
      console.error("Profiling error:", err);
    } finally {
      setProfiling(false);
    }
  };

  const handleLaunch = async () => {
    if (!target) return;
    try {
      setScanStatus("running");
      setScanProgress(5);
      setLogsByTool({});

      const res = await api.launchAdaptiveScan(target, selectedStrategy, parallelMode);
      setActiveScanId(res.scan_id);
      setCurrentScanTools(res.tools || []);
    } catch (err) {
      console.error("Launch error:", err);
      setScanStatus("failed");
    }
  };

  const handleStop = async () => {
    if (activeScanId) {
      try {
        await api.stopScan(activeScanId);
        setScanStatus("completed");
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
  };

  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Title & Beta Badge Banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f8fafc", margin: 0, letterSpacing: "-0.5px" }}>
              AI Smart Adaptive Orchestrator
            </h1>
            <span style={{
              background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
              color: "#ffffff",
              padding: "2px 10px",
              borderRadius: "20px",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "1px"
            }}>
              BETA ENGINE
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Motore decisionale euristico: analizza l'architettura target, seleziona la strategia ottimale ed esegue l'arsenale in streaming multi-terminale parallelo.
          </p>
        </div>

        {/* Live Status indicator */}
        <div style={{
          padding: "6px 16px",
          borderRadius: "30px",
          background: scanStatus === "running" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
          border: `1px solid ${scanStatus === "running" ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: scanStatus === "running" ? "#ef4444" : "#10b981"
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: scanStatus === "running" ? "#ef4444" : "#10b981",
            animation: scanStatus === "running" ? "pulse 1.5s infinite" : "none"
          }} />
          <span>{scanStatus === "running" ? "ASSAALTO IN CORSO" : scanStatus === "completed" ? "AUDIT COMPLETATO" : "PRONTO AL LANCIO"}</span>
        </div>
      </div>

      {/* Target Input & Profiling Bar */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Bersaglio Autorizzato (Target URL / Host)
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="es. http://testasp.vulnweb.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                background: "rgba(2, 6, 23, 0.8)",
                color: "#f8fafc",
                fontSize: "0.95rem",
                fontFamily: "var(--font-mono)",
                marginTop: "6px"
              }}
            />
          </div>

          <button
            onClick={() => handleProfileTarget()}
            disabled={profiling || scanStatus === "running"}
            className="btn btn-secondary"
            style={{ marginTop: "22px", display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px" }}
          >
            <RefreshCw size={16} className={profiling ? "animate-spin" : ""} />
            <span>{profiling ? "Analisi Architettura..." : "Analizza Target (Pre-Flight)"}</span>
          </button>

          {scanStatus !== "running" ? (
            <button
              onClick={handleLaunch}
              className="btn btn-primary"
              style={{ 
                marginTop: "22px", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                padding: "10px 24px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                borderColor: "#b91c1c",
                boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)"
              }}
            >
              <Flame size={18} />
              <span>Avvia Attacco Adattivo</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="btn"
              style={{ 
                marginTop: "22px", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                padding: "10px 24px",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.5)"
              }}
            >
              <Square size={16} />
              <span>Arresta Scansione</span>
            </button>
          )}
        </div>

        {/* Target Profile Intelligence Card */}
        {targetProfile && (
          <div style={{
            marginTop: "18px",
            padding: "16px 20px",
            borderRadius: "10px",
            background: "rgba(2, 6, 23, 0.6)",
            border: "1px solid var(--border-subtle)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px"
          }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>IP Risolto & Host</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {targetProfile.ip}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Web Server & OS</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
                {targetProfile.web_server} ({targetProfile.os_hint})
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Protezione WAF / IDS</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: targetProfile.waf_detected ? "#ef4444" : "#10b981", marginTop: "2px" }}>
                {targetProfile.waf_detected ? `🛡️ ${targetProfile.waf_name}` : "Nessun WAF Rilevato"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Strategia Consigliata dall'AI</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#a855f7", marginTop: "2px", textTransform: "uppercase" }}>
                ✨ {targetProfile.recommended_strategy}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3 Strategy Selector Cards */}
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={16} color="#38bdf8" />
          <span>Seleziona Profilo di Penetration Testing:</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          {/* Card 1: Stealth */}
          <div
            onClick={() => setSelectedStrategy("stealth")}
            style={{
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              background: selectedStrategy === "stealth" ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.5)",
              border: `2px solid ${selectedStrategy === "stealth" ? "#38bdf8" : "var(--border-subtle)"}`,
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#38bdf8" }}>🥷 FURTIVITÀ / RAPIDITÀ</span>
              <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontWeight: 700 }}>
                STEALTH (95%)
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px", lineHeight: "1.4" }}>
              Minimizza il traffico di rete ed elude blocchi perimetrali WAF/IDS. Ricognizione passiva e scansione porte mirata senza brute-force invasivo.
            </p>
            <div style={{ marginTop: "12px", fontSize: "0.72rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
              Tool: Nmap (stealth), HTTPX, WhatWeb, Subfinder
            </div>
          </div>

          {/* Card 2: Balanced */}
          <div
            onClick={() => setSelectedStrategy("balanced")}
            style={{
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              background: selectedStrategy === "balanced" ? "rgba(168, 85, 247, 0.12)" : "rgba(15, 23, 42, 0.5)",
              border: `2px solid ${selectedStrategy === "balanced" ? "#a855f7" : "var(--border-subtle)"}`,
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#a855f7" }}>⚖️ BILANCIATA / MEDIA</span>
              <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.2)", color: "#a855f7", fontWeight: 700 }}>
                STANDARD
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px", lineHeight: "1.4" }}>
              Scansione completa delle porte e dei servizi, verifica vulnerabilità web con template Nuclei standard e directory discovery Gobuster a velocità controllata.
            </p>
            <div style={{ marginTop: "12px", fontSize: "0.72rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
              Tool: Nmap, HTTPX, WhatWeb, Nuclei, Nikto, Gobuster
            </div>
          </div>

          {/* Card 3: Aggressive */}
          <div
            onClick={() => setSelectedStrategy("aggressive")}
            style={{
              padding: "20px",
              borderRadius: "12px",
              cursor: "pointer",
              background: selectedStrategy === "aggressive" ? "rgba(239, 68, 68, 0.12)" : "rgba(15, 23, 42, 0.5)",
              border: `2px solid ${selectedStrategy === "aggressive" ? "#ef4444" : "var(--border-subtle)"}`,
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ef4444" }}>⚡ APPROFONDITA / AGGRESSIVA</span>
              <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", fontWeight: 700 }}>
                FULL ARSENAL
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px", lineHeight: "1.4" }}>
              Esecuzione parallela massiva di tutti i 15+ tool a disposizione in onde concorrenti: Nmap all-ports, Nuclei critici, Gobuster, SQLMap crawler e Metasploit RPC.
            </p>
            <div style={{ marginTop: "12px", fontSize: "0.72rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
              Tool: Nmap, HTTPX, WhatWeb, Nuclei, Nikto, Gobuster, SQLMap, Feroxbuster, Metasploit
            </div>
          </div>
        </div>
      </div>

      {/* AI Decision Engine & Reasoning Matrix ("Se non funziona allora fai questo perché so questo") */}
      <div style={{
        background: "rgba(15, 23, 42, 0.4)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        <div 
          onClick={() => setShowAiRules(!showAiRules)}
          style={{
            padding: "12px 18px",
            background: "rgba(56, 189, 248, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Brain size={18} color="#38bdf8" />
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.5px" }}>
              🧠 MOTORE DI INFERENZA & DECISIONE AI // "Se non funziona, allora fai questo perché so questo"
            </span>
            <span style={{
              fontSize: "0.68rem",
              padding: "2px 8px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              fontFamily: "var(--font-mono)",
              fontWeight: 700
            }}>
              {aiRules.length} Regole Euristiche Attive
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "0.78rem" }}>
            <span>{showAiRules ? "Comprimi Catalogo" : "Visualizza Regole e Fallback"}</span>
            {showAiRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {showAiRules && (
          <div style={{
            padding: "16px 18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "12px",
            background: "#080c14"
          }}>
            {aiRules.map(rule => (
              <div 
                key={rule.id}
                style={{
                  background: "#0d131f",
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>{rule.name}</span>
                  <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", fontFamily: "var(--font-mono)" }}>
                    {rule.category}
                  </span>
                </div>

                <div style={{ fontSize: "0.74rem", lineHeight: "1.4" }}>
                  <div style={{ color: "#fbbf24", marginBottom: "4px" }}>
                    <strong>🔍 SE:</strong> {rule.condition}
                  </div>
                  <div style={{ color: "#c084fc", marginBottom: "4px" }}>
                    <strong>💡 PERCHÉ SO:</strong> {rule.knowledge}
                  </div>
                  <div style={{ color: "#34d399" }}>
                    <strong>⚡ ALLORA FACCIO:</strong> {rule.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Terminal Matrix Live Grid (Requested styling: pure black bg, neon red titles, matrix green text) */}
      <div>
        <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
            <Terminal size={16} color="#ef4444" />
            <span>Matrice Live di Esecuzione Concorrente (Multi-Terminal Stream):</span>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Avanzamento Globale: <span style={{ color: "#00ff66", fontWeight: 700 }}>{scanProgress}%</span>
          </div>
        </div>

        <MultiTerminalMatrix
          logsByTool={logsByTool}
          activeTools={currentScanTools.length > 0 ? currentScanTools : ["nmap", "httpx", "nuclei", "gobuster"]}
          scanStatus={scanStatus}
        />
      </div>
    </div>
  );
}
