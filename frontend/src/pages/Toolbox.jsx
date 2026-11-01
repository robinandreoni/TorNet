import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  CheckCircle, 
  RefreshCw, 
  Terminal, 
  Layers, 
  Plus, 
  Puzzle, 
  Trash2, 
  Power,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function Toolbox() {
  const { t } = useLanguage();
  const [tools, setTools] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState(null);

  // New Plugin Form
  const [pluginName, setPluginName] = useState("");
  const [pluginDisplayName, setPluginDisplayName] = useState("");
  const [pluginCategory, setPluginCategory] = useState("Custom Extensions");
  const [pluginDesc, setPluginDesc] = useState("");
  const [pluginCmd, setPluginCmd] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [toolsData, pluginsData] = await Promise.all([
        api.getTools(),
        api.getPlugins()
      ]);
      setTools(toolsData || []);
      setPlugins(pluginsData || []);
    } catch (err) {
      console.error("Failed to load tools & plugins catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterPlugin = async (e) => {
    e.preventDefault();
    if (!pluginName.trim() || !pluginCmd.trim()) return;

    try {
      await api.createPlugin({
        name: pluginName.trim().toLowerCase(),
        display_name: pluginDisplayName.trim() || pluginName.trim(),
        category: pluginCategory,
        description: pluginDesc.trim() || "Custom security tool plugin",
        version: "1.0.0",
        command_template: pluginCmd.trim(),
        enabled: true
      });
      setShowModal(false);
      setPluginName("");
      setPluginDisplayName("");
      setPluginDesc("");
      setPluginCmd("");
      await loadData();
      setMessage({ type: "success", text: "Plugin personalizzato registrato con successo!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleTogglePlugin = async (pluginId) => {
    try {
      await api.togglePlugin(pluginId);
      await loadData();
    } catch (err) {
      alert("Error toggling plugin: " + err.message);
    }
  };

  const handleDeletePlugin = async (pluginId) => {
    if (!window.confirm("Eliminare questo plugin custom?")) return;
    try {
      await api.deletePlugin(pluginId);
      await loadData();
      setMessage({ type: "success", text: "Plugin rimosso con successo." });
    } catch (err) {
      alert("Error deleting plugin: " + err.message);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 className="title-display" style={{ fontSize: "1.75rem", color: "#f8fafc" }}>
            {t("toolboxTitle")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            {t("toolboxSubtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={14} />
            <span>{t("addCustomPlugin")}</span>
          </button>
          <button onClick={loadData} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>{t("syncStatusBtn")}</span>
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          border: message.type === "success" ? "1px solid #10b981" : "1px solid #ef4444",
          color: message.type === "success" ? "#10b981" : "#ef4444",
          fontSize: "0.85rem"
        }}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Tools Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {tools.map((tItem) => {
          const isPlugin = tItem.is_plugin;
          return (
            <div
              key={tItem.id || tItem.name}
              className="glass-panel"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                border: isPlugin ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid var(--border-subtle)",
                position: "relative"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "1.05rem", color: "#f8fafc", fontWeight: 600 }}>
                      {tItem.display_name}
                    </h3>
                    {isPlugin && (
                      <span style={{
                        fontSize: "0.65rem",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(168, 85, 247, 0.2)",
                        color: "#c084fc",
                        fontWeight: 700
                      }}>
                        PLUGIN
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: isPlugin ? "#c084fc" : "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                    {tItem.category}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    background: tItem.status === "ready" ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)",
                    color: tItem.status === "ready" ? "#10b981" : "#38bdf8"
                  }}>
                    {tItem.status === "ready" ? t("hostNative") : t("wslBridge")}
                  </span>

                  {isPlugin && (
                    <>
                      <button
                        onClick={() => handleTogglePlugin(tItem.id)}
                        title={tItem.enabled ? "Disabilita" : "Abilita"}
                        style={{
                          background: "none",
                          border: "none",
                          color: tItem.enabled ? "#10b981" : "#64748b",
                          cursor: "pointer",
                          padding: "2px"
                        }}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePlugin(tItem.id)}
                        title="Elimina plugin"
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", flex: 1, lineHeight: "1.4", margin: "8px 0 14px 0" }}>
                {tItem.description}
              </p>

              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>Version: <strong style={{ color: "#cbd5e1" }}>{tItem.version}</strong></span>
                <span style={{ fontFamily: "var(--font-mono)" }}>CMD: {tItem.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Register Custom Tool */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "520px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Puzzle size={20} color="#c084fc" />
              <h3 className="title-display" style={{ fontSize: "1.2rem", color: "#f8fafc" }}>
                {t("addCustomPlugin")}
              </h3>
            </div>

            <form onSubmit={handleRegisterPlugin}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Nome Identificativo Eseguibile * (es. ffuf, dnsrecon, custom_script)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ffuf"
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-mono)"
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Nome di Visualizzazione
                </label>
                <input
                  type="text"
                  placeholder="es. FFUF Fast Web Fuzzer"
                  value={pluginDisplayName}
                  onChange={(e) => setPluginDisplayName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    color: "#f8fafc",
                    fontSize: "0.85rem"
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Categoria Strumento
                </label>
                <select
                  value={pluginCategory}
                  onChange={(e) => setPluginCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    color: "#f8fafc",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="Reconnaissance">Reconnaissance</option>
                  <option value="Vulnerability Scanning">Vulnerability Scanning</option>
                  <option value="Exploitation & Injection">Exploitation & Injection</option>
                  <option value="Directory & Content Discovery">Directory & Content Discovery</option>
                  <option value="Brute Force & Auth Testing">Brute Force & Auth Testing</option>
                  <option value="Custom Extensions">Custom Extensions</option>
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Template Comando CLI * (usa &#123;target&#125; come segnaposto)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ffuf -u {target}/FUZZ -w ./backend/wordlists/directories.txt"
                  value={pluginCmd}
                  onChange={(e) => setPluginCmd(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-mono)"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Descrizione Funzionalità
                </label>
                <textarea
                  rows={2}
                  placeholder="Descrivi cosa esegue questo strumento..."
                  value={pluginDesc}
                  onChange={(e) => setPluginDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)" }}>
                  Salva & Attiva Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
