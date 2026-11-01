import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { 
  X, Shield, Globe, Lock, RefreshCw, Shuffle, RotateCcw, 
  Upload, CheckCircle, AlertTriangle, Radio, Activity
} from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function OpsecModal({ isOpen, onClose, initialTab = "mac", onStateChange }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [opsecState, setOpsecState] = useState(null);
  const [vpnProfiles, setVpnProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ipLoading, setIpLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stateRes, vpnRes] = await Promise.allSettled([
        api.getOpsecStatus(),
        api.getVpnProfiles()
      ]);

      if (stateRes.status === "fulfilled" && stateRes.value) {
        setOpsecState(stateRes.value);
        if (onStateChange) onStateChange(stateRes.value);
      }
      if (vpnRes.status === "fulfilled" && Array.isArray(vpnRes.value)) {
        setVpnProfiles(vpnRes.value);
      } else {
        setVpnProfiles([]);
      }
    } catch (err) {
      console.error("Failed to load OPSEC data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleRefreshIp = async () => {
    try {
      setIpLoading(true);
      const newIp = await api.checkPublicIp();
      setOpsecState(prev => prev ? { ...prev, current_ip: newIp } : null);
      setActionMsg("IP: " + (newIp?.ip || "Aggiornato"));
      setTimeout(() => setActionMsg(""), 3000);
    } catch (err) {
      setActionMsg("Errore verifica IP: " + err.message);
    } finally {
      setIpLoading(false);
    }
  };

  const handleSpoofMac = async () => {
    try {
      setLoading(true);
      const res = await api.spoofMac();
      setActionMsg("MAC Casuale Attivo: " + (res?.current_mac || ""));
      await loadData();
    } catch (err) {
      setActionMsg("Errore cambio MAC: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleRestoreMac = async () => {
    try {
      setLoading(true);
      const res = await api.restoreMac();
      setActionMsg("MAC Originale Ripristinato: " + (res?.permanent_mac || ""));
      await loadData();
    } catch (err) {
      setActionMsg("Errore ripristino MAC: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleToggleTor = async () => {
    try {
      setLoading(true);
      if (opsecState?.tor?.is_active) {
        await api.stopTor();
        setActionMsg("Tor Disattivato");
      } else {
        await api.startTor();
        setActionMsg("Tor Attivato con successo");
      }
      await loadData();
    } catch (err) {
      setActionMsg("Errore Tor: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleNewCircuit = async () => {
    try {
      setLoading(true);
      await api.newTorIdentity();
      setActionMsg("Nuovo circuito Tor stabilito (NEWNYM)");
      await loadData();
    } catch (err) {
      setActionMsg("Errore cambio circuito: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      await api.uploadVpnProfile(file);
      setActionMsg(`Profilo '${file.name}' caricato`);
      await loadData();
    } catch (err) {
      setActionMsg("Upload fallito: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleFetchPublicVpns = async () => {
    try {
      setLoading(true);
      setActionMsg("Scaricamento profili gratuiti da VPN Gate...");
      const profiles = await api.fetchPublicVpns();
      if (Array.isArray(profiles)) {
        setVpnProfiles(profiles);
      }
      setActionMsg(`${profiles.length} profili VPN gratuiti disponibili`);
    } catch (err) {
      setActionMsg("Errore download VPN: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleConnectVpn = async (profileName) => {
    try {
      setLoading(true);
      await api.connectVpn(profileName);
      setActionMsg(`Connesso a VPN: ${profileName}`);
      await loadData();
    } catch (err) {
      setActionMsg("Errore connessione VPN: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleDisconnectVpn = async () => {
    try {
      setLoading(true);
      await api.disconnectVpn();
      setActionMsg("VPN Disconnessa");
      await loadData();
    } catch (err) {
      setActionMsg("Errore disconnessione VPN: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  if (!isOpen) return null;

  const score = opsecState?.stealth_score ?? 0;
  const scoreColor = score >= 90 ? "#10b981" : score >= 50 ? "#a855f7" : score > 0 ? "#38bdf8" : "#94a3b8";

  // Use Portal to render into document.body, escaping any parent layout restrictions
  return ReactDOM.createPortal(
    <div 
      onClick={(e) => {
        // Clicking directly on the backdrop closes the modal
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(2, 6, 23, 0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          color: "#f8fafc"
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0b0f19"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38bdf8"
            }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                {t("opsecTitle")}
              </h2>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                Gestione Sicurezza e Anonimato Operativo
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid #334155",
              color: "#f8fafc",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              fontWeight: 600
            }}
          >
            <X size={16} />
            <span>Chiudi</span>
          </button>
        </div>

        {/* Global IP & Stealth Meter Banner */}
        <div style={{
          padding: "16px 24px",
          background: "#020617",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          {/* IP Card */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              padding: "8px 14px",
              borderRadius: "10px",
              background: opsecState?.current_ip?.is_tor 
                ? "rgba(168, 85, 247, 0.15)" 
                : opsecState?.current_ip?.is_vpn 
                ? "rgba(16, 185, 129, 0.15)" 
                : "rgba(56, 189, 248, 0.1)",
              border: `1px solid ${opsecState?.current_ip?.is_tor ? "rgba(168, 85, 247, 0.4)" : "rgba(56, 189, 248, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <Globe size={18} color={opsecState?.current_ip?.is_tor ? "#c084fc" : "#38bdf8"} />
              <div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  {t("publicIp")} • {opsecState?.current_ip?.is_tor ? t("torExit") : opsecState?.current_ip?.is_vpn ? t("vpnTunnel") : t("directConn")}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#f8fafc" }}>
                  {opsecState?.current_ip?.ip || "In rilevamento..."} 
                  {opsecState?.current_ip?.country && (
                    <span style={{ marginLeft: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
                      ({opsecState?.current_ip?.country_code} - {opsecState?.current_ip?.country})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleRefreshIp}
              disabled={ipLoading}
              title={t("refreshIp")}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#94a3b8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.78rem"
              }}
            >
              <RefreshCw size={14} className={ipLoading ? "animate-spin" : ""} />
              <span>Verifica</span>
            </button>
          </div>

          {/* Stealth Level Score */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
              {t("anonymityScore")}: <span style={{ color: scoreColor, fontWeight: 800 }}>{score}%</span>
            </div>
            <div style={{
              display: "inline-block",
              marginTop: "4px",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 800,
              background: `${scoreColor}22`,
              border: `1px solid ${scoreColor}66`,
              color: scoreColor
            }}>
              {opsecState?.stealth_level || "Standard"}
            </div>
          </div>
        </div>

        {/* Action Status Notification */}
        {actionMsg && (
          <div style={{
            background: "rgba(56, 189, 248, 0.15)",
            borderBottom: "1px solid rgba(56, 189, 248, 0.3)",
            padding: "8px 24px",
            fontSize: "0.8rem",
            color: "#38bdf8",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <Activity size={14} />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #1e293b",
          background: "#070c18",
          padding: "0 24px"
        }}>
          <button
            onClick={() => setActiveTab("mac")}
            style={{
              padding: "12px 18px",
              border: "none",
              borderBottom: activeTab === "mac" ? "2px solid #38bdf8" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "mac" ? "#38bdf8" : "#94a3b8",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Shield size={16} />
            <span>{t("macShield")}</span>
            {opsecState?.mac?.is_spoofed && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>
                {t("spoofed")}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tor")}
            style={{
              padding: "12px 18px",
              border: "none",
              borderBottom: activeTab === "tor" ? "2px solid #c084fc" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "tor" ? "#c084fc" : "#94a3b8",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Radio size={16} />
            <span>{t("torShield")}</span>
            {opsecState?.tor?.is_active && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
                {t("active")}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("vpn")}
            style={{
              padding: "12px 18px",
              border: "none",
              borderBottom: activeTab === "vpn" ? "2px solid #10b981" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "vpn" ? "#10b981" : "#94a3b8",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Lock size={16} />
            <span>{t("vpnShield")}</span>
            {opsecState?.vpn?.is_active && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                {t("connected")}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: "24px", minHeight: "240px" }}>
          {/* TAB 1: MAC CHANGER */}
          {activeTab === "mac" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: "#0b0f19",
                  border: "1px solid #1e293b"
                }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>
                    Indirizzo MAC Sorgente Scansioni ({opsecState?.mac?.interface || "eth0"})
                  </div>
                  <div style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: opsecState?.mac?.is_spoofed ? "#38bdf8" : "#f8fafc",
                    marginTop: "6px"
                  }}>
                    {opsecState?.mac?.current_mac || "00:15:5d:da:dd:e3"}
                  </div>
                  <div style={{ fontSize: "0.75rem", marginTop: "4px", color: opsecState?.mac?.is_spoofed ? "#38bdf8" : "#94a3b8" }}>
                    Stato: {opsecState?.mac?.is_spoofed ? "🎭 IDENTITÀ MASCHERATA (SPOOFED)" : "⚪ Indirizzo Originale"}
                  </div>
                </div>

                <div style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: "#0b0f19",
                  border: "1px solid #1e293b"
                }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>
                    MAC Hardware Permanente
                  </div>
                  <div style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "#94a3b8",
                    marginTop: "6px"
                  }}>
                    {opsecState?.mac?.permanent_mac || "00:15:5d:da:dd:e3"}
                  </div>
                  <div style={{ fontSize: "0.75rem", marginTop: "4px", color: "#64748b" }}>
                    Salvato in memoria per il ripristino
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handleSpoofMac}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Shuffle size={16} />
                  <span>{t("randomizeMac")}</span>
                </button>

                <button
                  onClick={handleRestoreMac}
                  disabled={loading || !opsecState?.mac?.is_spoofed}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <RotateCcw size={16} />
                  <span>{t("restoreMac")}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TOR NETWORK */}
          {activeTab === "tor" && (
            <div>
              <div style={{
                padding: "16px",
                borderRadius: "10px",
                background: "#0b0f19",
                border: "1px solid #1e293b",
                marginBottom: "20px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>
                      Stato Demone Tor
                    </div>
                    <div style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: opsecState?.tor?.is_active ? "#c084fc" : "#94a3b8",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <div style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: opsecState?.tor?.is_active ? "#c084fc" : "#64748b"
                      }} />
                      <span>{opsecState?.tor?.is_active ? "ATTIVO E INSTRADATO (SOCKS5 9050)" : "NON ATTIVO"}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleTor}
                    disabled={loading}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      background: opsecState?.tor?.is_active ? "rgba(239, 68, 68, 0.2)" : "rgba(168, 85, 247, 0.25)",
                      color: opsecState?.tor?.is_active ? "#ef4444" : "#c084fc",
                      border: `1px solid ${opsecState?.tor?.is_active ? "rgba(239, 68, 68, 0.4)" : "rgba(168, 85, 247, 0.5)"}`
                    }}
                  >
                    {opsecState?.tor?.is_active ? "Arresta Tor" : "Attiva Rete Tor"}
                  </button>
                </div>

                {opsecState?.tor?.is_active && (
                  <div style={{ marginTop: "16px", borderTop: "1px solid #1e293b", paddingTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>IP Nodo di Uscita</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#f8fafc" }}>
                        {opsecState?.tor?.exit_ip || "In risoluzione..."} ({opsecState?.tor?.country || "Tor Exit"})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Porte Proxy</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#c084fc" }}>
                        SOCKS5: 9050 | Control: 9051
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {opsecState?.tor?.is_active && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={handleNewCircuit}
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "8px", borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc" }}
                  >
                    <RefreshCw size={16} />
                    <span>{t("newCircuit")} (NEWNYM)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VPN GATEWAY */}
          {activeTab === "vpn" && (
            <div>
              <div style={{
                padding: "16px",
                borderRadius: "10px",
                background: "#0b0f19",
                border: "1px solid #1e293b",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>
                      Tunnel OpenVPN / WireGuard
                    </div>
                    <div style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: opsecState?.vpn?.is_active ? "#10b981" : "#94a3b8",
                      marginTop: "4px"
                    }}>
                      {opsecState?.vpn?.is_active ? `TUNNEL ATTIVO: ${opsecState?.vpn?.active_profile}` : "NESSUN TUNNEL ATTIVO"}
                    </div>
                  </div>

                  {opsecState?.vpn?.is_active && (
                    <button
                      onClick={handleDisconnectVpn}
                      disabled={loading}
                      className="btn"
                      style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.4)" }}
                    >
                      {t("disconnect")}
                    </button>
                  )}
                </div>
              </div>

              {/* Profiles list */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                  Profili Configurazione (.ovpn / .conf):
                </div>

                {!Array.isArray(vpnProfiles) || vpnProfiles.length === 0 ? (
                  <div style={{ padding: "16px", borderRadius: "8px", background: "#0b0f19", color: "#94a3b8", fontSize: "0.8rem", textAlign: "center" }}>
                    {t("noVpnProfiles")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {vpnProfiles.map(p => (
                      <div key={p.filename} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "#0b0f19",
                        border: "1px solid #1e293b"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Lock size={16} color="#10b981" />
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f8fafc" }}>{p.name}</span>
                          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>({(p.size_bytes / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          onClick={() => handleConnectVpn(p.name)}
                          disabled={loading || (opsecState?.vpn?.is_active && opsecState?.vpn?.active_profile === p.name)}
                          className="btn btn-primary"
                          style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                        >
                          {opsecState?.vpn?.is_active && opsecState?.vpn?.active_profile === p.name ? t("connected") : t("connect")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload New Profile & Download Free VPNs */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={handleFetchPublicVpns}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "0.8rem", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.4)" }}
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  <span>Scarica / Aggiorna VPN Gratuite (VPN Gate)</span>
                </button>

                <label style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#0b0f19",
                  border: "1px dashed #334155",
                  color: "#38bdf8",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}>
                  <Upload size={16} />
                  <span>{t("vpnUploadTitle")}</span>
                  <input
                    type="file"
                    accept=".ovpn,.conf"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid #1e293b",
          background: "#0b0f19",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: "8px 20px", fontSize: "0.85rem" }}
          >
            Chiudi Finestra
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
