import React, { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Save, 
  Key, 
  HardDrive, 
  Bell, 
  Calendar, 
  Send, 
  Play, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Power
} from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function Settings() {
  const { t } = useLanguage();
  const [apiHost, setApiHost] = useState("http://localhost:8000");
  const [wsHost, setWsHost] = useState("ws://localhost:8000/ws");
  const [shodanKey, setShodanKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState(null);

  // Schedules state
  const [schedules, setSchedules] = useState([]);
  const [newSchedName, setNewSchedName] = useState("");
  const [newSchedTarget, setNewSchedTarget] = useState("");
  const [newSchedHours, setNewSchedHours] = useState(24);
  const [newSchedType, setNewSchedType] = useState("full_auto");
  const [showSchedModal, setShowSchedModal] = useState(false);

  // Notifications state
  const [notifConfig, setNotifConfig] = useState({
    telegram_enabled: false,
    telegram_bot_token: "",
    telegram_chat_id: "",
    email_enabled: false,
    email_smtp_host: "smtp.gmail.com",
    email_smtp_port: 587,
    email_smtp_user: "",
    email_smtp_pass: "",
    email_recipient: "",
    webhook_enabled: false,
    webhook_url: ""
  });
  const [testingNotifs, setTestingNotifs] = useState(false);

  const loadData = async () => {
    try {
      const [schedList, nConfig] = await Promise.all([
        api.getSchedules(),
        api.getNotificationConfig()
      ]);
      setSchedules(schedList || []);
      if (nConfig) setNotifConfig(nConfig);
    } catch (err) {
      console.error("Failed to load settings data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    try {
      await api.saveNotificationConfig(notifConfig);
      setSaved(true);
      setMessage({ type: "success", text: "Configurazione notifiche salvata con successo!" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Errore salvataggio: " + err.message });
    }
  };

  const handleTestNotifications = async () => {
    setTestingNotifs(true);
    try {
      const res = await api.testNotifications();
      setMessage({
        type: "success",
        text: `Verifica alert inviata. Esiti: Telegram (${res.results?.telegram || 'off'}), Email (${res.results?.email || 'off'}), Webhook (${res.results?.webhook || 'off'})`
      });
    } catch (err) {
      setMessage({ type: "error", text: "Test fallito: " + err.message });
    } finally {
      setTestingNotifs(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!newSchedTarget.trim()) return;

    try {
      await api.createSchedule({
        name: newSchedName.trim() || `Scan ${newSchedTarget}`,
        target: newSchedTarget.trim(),
        target_type: "web",
        scan_type: newSchedType,
        intensity: "medium",
        interval_hours: Number(newSchedHours)
      });
      setShowSchedModal(false);
      setNewSchedName("");
      setNewSchedTarget("");
      const updated = await api.getSchedules();
      setSchedules(updated);
      setMessage({ type: "success", text: "Scansione ricorrente pianificata!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleToggleSchedule = async (id) => {
    try {
      await api.toggleSchedule(id);
      const updated = await api.getSchedules();
      setSchedules(updated);
    } catch (err) {
      alert("Error toggling schedule: " + err.message);
    }
  };

  const handleRunScheduleNow = async (id) => {
    try {
      const res = await api.runScheduleNow(id);
      setMessage({ type: "success", text: `Scansione #${res.scan_id} avviata immediatamente!` });
    } catch (err) {
      alert("Error triggering schedule: " + err.message);
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await api.deleteSchedule(id);
      const updated = await api.getSchedules();
      setSchedules(updated);
    } catch (err) {
      alert("Error deleting schedule: " + err.message);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h2 className="title-display" style={{ fontSize: "1.75rem", color: "#f8fafc" }}>
          {t("settingsTitle")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
          {t("settingsSubtitle")}
        </p>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* 1. Scheduled Scans Section */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={20} color="#38bdf8" />
              <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
                {t("scanScheduling")}
              </h3>
            </div>
            <button onClick={() => setShowSchedModal(true)} className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              <Plus size={14} />
              <span>Nuova Pianificazione</span>
            </button>
          </div>

          {schedules.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", background: "rgba(15, 23, 42, 0.4)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Nessuna scansione ricorrente pianificata. Clicca 'Nuova Pianificazione' per configurarne una.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {schedules.map((sc) => (
                <div
                  key={sc.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid var(--border-subtle)",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.9rem" }}>{sc.name}</span>
                      <span style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        background: sc.is_active ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: sc.is_active ? "#10b981" : "#94a3b8"
                      }}>
                        {sc.is_active ? "ATTIVO" : "SOSPESO"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
                      Target: {sc.target} • Intervallo: ogni {sc.interval_hours} ore • Profilo: {sc.scan_type.toUpperCase()}
                    </div>
                    {sc.next_run && (
                      <div style={{ fontSize: "0.72rem", color: "#38bdf8", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} />
                        <span>Prossima esecuzione: {new Date(sc.next_run).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRunScheduleNow(sc.id)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                      title="Avvia Subito"
                    >
                      <Play size={12} />
                      <span>Esegui Ora</span>
                    </button>
                    <button
                      onClick={() => handleToggleSchedule(sc.id)}
                      style={{
                        background: "none",
                        border: "1px solid var(--border-subtle)",
                        color: sc.is_active ? "#10b981" : "#64748b",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        cursor: "pointer"
                      }}
                      title="Attiva/Disattiva"
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(sc.id)}
                      style={{
                        background: "none",
                        border: "1px solid var(--border-subtle)",
                        color: "#ef4444",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        cursor: "pointer"
                      }}
                      title="Elimina"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Notifications & Alerts Section */}
        <form onSubmit={handleSaveNotifications} className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Bell size={20} color="#38bdf8" />
              <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
                {t("notificationsConfig")}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleTestNotifications}
              disabled={testingNotifs}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              <Send size={14} />
              <span>{testingNotifs ? "Verifica..." : "Invia Alert di Prova"}</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Telegram */}
            <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.9rem" }}>Notifiche Telegram Bot</span>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={notifConfig.telegram_enabled}
                    onChange={(e) => setNotifConfig({ ...notifConfig, telegram_enabled: e.target.checked })}
                  />
                  <span>Abilita Telegram</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Bot Token API
                  </label>
                  <input
                    type="text"
                    placeholder="123456789:ABCdefGhI..."
                    value={notifConfig.telegram_bot_token || ""}
                    onChange={(e) => setNotifConfig({ ...notifConfig, telegram_bot_token: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Chat ID Destinatario
                  </label>
                  <input
                    type="text"
                    placeholder="-100123456789"
                    value={notifConfig.telegram_chat_id || ""}
                    onChange={(e) => setNotifConfig({ ...notifConfig, telegram_chat_id: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            </div>

            {/* Email SMTP */}
            <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.9rem" }}>Notifiche Email (SMTP)</span>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={notifConfig.email_enabled}
                    onChange={(e) => setNotifConfig({ ...notifConfig, email_enabled: e.target.checked })}
                  />
                  <span>Abilita Email</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>Host SMTP</label>
                  <input
                    type="text"
                    value={notifConfig.email_smtp_host || ""}
                    onChange={(e) => setNotifConfig({ ...notifConfig, email_smtp_host: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>Porta</label>
                  <input
                    type="number"
                    value={notifConfig.email_smtp_port || 587}
                    onChange={(e) => setNotifConfig({ ...notifConfig, email_smtp_port: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>Utente SMTP</label>
                  <input
                    type="text"
                    value={notifConfig.email_smtp_user || ""}
                    onChange={(e) => setNotifConfig({ ...notifConfig, email_smtp_user: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>Email Destinatario</label>
                  <input
                    type="email"
                    placeholder="security@azienda.it"
                    value={notifConfig.email_recipient || ""}
                    onChange={(e) => setNotifConfig({ ...notifConfig, email_recipient: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem" }}
                  />
                </div>
              </div>
            </div>

            {/* Webhook */}
            <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.9rem" }}>Webhook Personalizzato (Slack / Discord / Teams)</span>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={notifConfig.webhook_enabled}
                    onChange={(e) => setNotifConfig({ ...notifConfig, webhook_enabled: e.target.checked })}
                  />
                  <span>Abilita Webhook</span>
                </label>
              </div>
              <input
                type="text"
                placeholder="https://hooks.slack.com/services/..."
                value={notifConfig.webhook_url || ""}
                onChange={(e) => setNotifConfig({ ...notifConfig, webhook_url: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "rgba(2, 6, 23, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.8rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "8px 20px" }}>
              <Save size={14} />
              <span>Salva Configurazione Notifiche</span>
            </button>
          </div>
        </form>

        {/* 3. Workspace info */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <HardDrive size={20} color="#38bdf8" />
            <h3 className="title-display" style={{ fontSize: "1.1rem" }}>
              {t("storageBindingTitle")}
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("workingDirLabel")}</span>
              <code style={{ color: "#38bdf8" }}>./TorNet</code>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("dbPathLabel")}</span>
              <code style={{ color: "#38bdf8" }}>./backend/data/tornet.db</code>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("pythonEnvLabel")}</span>
              <code style={{ color: "#38bdf8" }}>./backend/venv</code>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("subsystemLabel")}</span>
              <span style={{ color: "#10b981", fontWeight: 600 }}>{t("subsystemValue")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Schedule */}
      {showSchedModal && (
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
              Nuova Scansione Ricorrente
            </h3>
            <form onSubmit={handleCreateSchedule}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Nome Pianificazione *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Audit Perimetro Settimanale"
                  value={newSchedName}
                  onChange={(e) => setNewSchedName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Target Bersaglio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://testphp.vulnweb.com"
                  value={newSchedTarget}
                  onChange={(e) => setNewSchedTarget(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Frequenza (Ore)
                  </label>
                  <select
                    value={newSchedHours}
                    onChange={(e) => setNewSchedHours(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.85rem" }}
                  >
                    <option value={6}>Ogni 6 ore</option>
                    <option value={12}>Ogni 12 ore</option>
                    <option value={24}>Ogni 24 ore (Giornaliero)</option>
                    <option value={168}>Ogni 168 ore (Settimanale)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Profilo Audit
                  </label>
                  <select
                    value={newSchedType}
                    onChange={(e) => setNewSchedType(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-subtle)", color: "#f8fafc", fontSize: "0.85rem" }}
                  >
                    <option value="full_auto">Full Auto</option>
                    <option value="recon">Reconnaissance</option>
                    <option value="vuln_scan">Vulnerability Scan</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowSchedModal(false)} className="btn btn-secondary">
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Salva Pianificazione
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
