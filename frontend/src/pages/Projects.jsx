import React, { useState, useEffect } from "react";
import { 
  FolderKanban, 
  Plus, 
  Play, 
  Trash2, 
  Globe, 
  Server, 
  Layers, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function Projects({ onNavigateScan }) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [batchLaunching, setBatchLaunching] = useState(false);
  const [message, setMessage] = useState(null);

  // New Project Form
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [clientName, setClientName] = useState("Corporate Audit");

  // New Target Form
  const [newTargetValue, setNewTargetValue] = useState("");
  const [newTargetType, setNewTargetType] = useState("web");
  const [newTargetNotes, setNewTargetNotes] = useState("");

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      } else if (selectedProject) {
        const refreshed = data.find((p) => p.id === selectedProject.id);
        setSelectedProject(refreshed || data[0] || null);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const created = await api.createProject({
        name: projectName.trim(),
        description: projectDesc.trim(),
        client_name: clientName.trim(),
        initial_targets: []
      });
      setProjectName("");
      setProjectDesc("");
      setShowNewModal(false);
      await loadProjects();
      setSelectedProject(created);
      setMessage({ type: "success", text: `Project "${created.name}" created!` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleAddTarget = async (e) => {
    e.preventDefault();
    if (!newTargetValue.trim() || !selectedProject) return;

    try {
      await api.addProjectTarget(selectedProject.id, {
        target: newTargetValue.trim(),
        target_type: newTargetType,
        notes: newTargetNotes.trim()
      });
      setNewTargetValue("");
      setNewTargetNotes("");
      setShowTargetModal(false);
      await loadProjects();
      setMessage({ type: "success", text: "Target added to project." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleDeleteTarget = async (targetId) => {
    if (!selectedProject) return;
    try {
      await api.deleteProjectTarget(selectedProject.id, targetId);
      await loadProjects();
    } catch (err) {
      alert("Error deleting target: " + err.message);
    }
  };

  const handleDeleteProject = async (projId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.deleteProject(projId);
      setSelectedProject(null);
      await loadProjects();
    } catch (err) {
      alert("Error deleting project: " + err.message);
    }
  };

  const handleScanAll = async () => {
    if (!selectedProject || !selectedProject.targets || selectedProject.targets.length === 0) return;
    setBatchLaunching(true);
    try {
      const res = await api.scanAllProjectTargets(selectedProject.id);
      setMessage({
        type: "success",
        text: `Launched ${res.total_targets} automated audit(s) in batch for "${selectedProject.name}"!`
      });
    } catch (err) {
      setMessage({ type: "error", text: "Batch scan error: " + err.message });
    } finally {
      setBatchLaunching(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="pulse-indicator pulse-blue"></span>
            <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.08em" }}>
              MULTI-TARGET COMMAND
            </span>
          </div>
          <h2 className="title-display" style={{ fontSize: "1.8rem", color: "#f8fafc", marginTop: "4px" }}>
            {t("multiTargetProjects")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Raggruppa asset perimetro, web application e subnet in progetti unificati con esecuzione audit in batch.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Nuovo Progetto</span>
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

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <RefreshCw size={24} className="spin" color="#38bdf8" />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <FolderKanban size={48} color="#64748b" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ color: "#f8fafc", fontSize: "1.2rem", marginBottom: "8px" }}>Nessun Progetto Registrato</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto 20px" }}>
            Crea il tuo primo progetto multi-target per organizzare gli asset da testare contemporaneamente.
          </p>
          <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Crea Progetto Ora</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
          {/* Projects Sidebar */}
          <div className="glass-panel" style={{ padding: "16px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", padding: "0 4px" }}>
              Progetti ({projects.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {projects.map((p) => {
                const isSelected = selectedProject && selectedProject.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.4)",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: isSelected ? "#38bdf8" : "#f8fafc", fontSize: "0.9rem" }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                        {p.targets ? p.targets.length : 0} asset
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      {p.client_name || "Internal"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Detail */}
          {selectedProject && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Cliente / Ambito: {selectedProject.client_name}
                  </div>
                  <h3 className="title-display" style={{ fontSize: "1.4rem", color: "#f8fafc", marginTop: "2px" }}>
                    {selectedProject.name}
                  </h3>
                  {selectedProject.description && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                      {selectedProject.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleScanAll}
                    disabled={batchLaunching || !selectedProject.targets || selectedProject.targets.length === 0}
                    className="btn btn-primary"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                  >
                    <Play size={16} />
                    <span>{batchLaunching ? "Avvio in corso..." : "Lancia Tutti gli Audit"}</span>
                  </button>
                  <button onClick={() => setShowTargetModal(true)} className="btn btn-secondary">
                    <Plus size={16} />
                    <span>Aggiungi Asset</span>
                  </button>
                  <button onClick={() => handleDeleteProject(selectedProject.id)} className="btn btn-danger" style={{ padding: "8px 12px" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Targets List */}
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ fontSize: "0.95rem", color: "#f8fafc", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={16} color="#38bdf8" />
                  <span>Asset Bersaglio del Progetto ({selectedProject.targets ? selectedProject.targets.length : 0})</span>
                </h4>

                {!selectedProject.targets || selectedProject.targets.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", background: "rgba(15, 23, 42, 0.4)", borderRadius: "8px", border: "1px dashed var(--border-subtle)" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "12px" }}>
                      Nessun target configurato in questo progetto.
                    </p>
                    <button onClick={() => setShowTargetModal(true)} className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
                      <Plus size={14} />
                      <span>Aggiungi Bersaglio</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedProject.targets.map((tgt) => (
                      <div
                        key={tgt.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 16px",
                          borderRadius: "8px",
                          background: "rgba(15, 23, 42, 0.5)",
                          border: "1px solid var(--border-subtle)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "rgba(56, 189, 248, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            {tgt.target_type === "web" ? <Globe size={18} color="#38bdf8" /> : <Server size={18} color="#38bdf8" />}
                          </div>
                          <div>
                            <div style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.9rem", fontFamily: "var(--font-mono)" }}>
                              {tgt.target}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              Tipo: {tgt.target_type.toUpperCase()} {tgt.notes ? `• ${tgt.notes}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleDeleteTarget(tgt.id)}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "6px" }}
                            title="Rimuovi Target"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
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
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "24px" }}>
            <h3 className="title-display" style={{ fontSize: "1.2rem", color: "#f8fafc", marginBottom: "16px" }}>
              Crea Nuovo Progetto Multi-Target
            </h3>
            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Nome Progetto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Infrastruttura Cloud Acme Corp"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
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
                  Cliente / Organizzazione
                </label>
                <input
                  type="text"
                  placeholder="es. Internal Security Team"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
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

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Descrizione (Opzionale)
                </label>
                <textarea
                  rows={3}
                  placeholder="Descrivi il perimetro dell'audit..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
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
                <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-secondary">
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Crea Progetto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Target Modal */}
      {showTargetModal && (
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
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "24px" }}>
            <h3 className="title-display" style={{ fontSize: "1.2rem", color: "#f8fafc", marginBottom: "16px" }}>
              Aggiungi Bersaglio a {selectedProject?.name}
            </h3>
            <form onSubmit={handleAddTarget}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Host / URL / Indirizzo IP *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. http://testphp.vulnweb.com oppure 192.168.1.50"
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(e.target.value)}
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
                  Tipologia Target
                </label>
                <select
                  value={newTargetType}
                  onChange={(e) => setNewTargetType(e.target.value)}
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
                  <option value="web">Web Application (HTTP/HTTPS)</option>
                  <option value="network">Network Host / IP / Subnet</option>
                  <option value="domain">Domain / OSINT Scope</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Note Asset (Opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. Gateway API di produzione"
                  value={newTargetNotes}
                  onChange={(e) => setNewTargetNotes(e.target.value)}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowTargetModal(false)} className="btn btn-secondary">
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Aggiungi Bersaglio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

