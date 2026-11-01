import React, { useState, useEffect } from "react";
import { Shield, Radio, Lock, Globe, RefreshCw, Settings, Sliders } from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function OpsecHeaderControls({ onOpenModal }) {
  const { t } = useLanguage();
  const [opsec, setOpsec] = useState(null);
  const [macLoading, setMacLoading] = useState(false);
  const [torLoading, setTorLoading] = useState(false);
  const [vpnLoading, setVpnLoading] = useState(false);
  const [ipRefreshing, setIpRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getOpsecStatus();
      if (data) setOpsec(data);
    } catch (err) {
      console.warn("OPSEC status poll failed:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. ONE-CLICK MAC SPOOFER TOGGLE
  const handleToggleMac = async (e) => {
    e.stopPropagation();
    try {
      setMacLoading(true);
      if (opsec?.mac?.is_spoofed) {
        const res = await api.restoreMac();
        setOpsec(prev => prev ? { ...prev, mac: res } : null);
      } else {
        const res = await api.spoofMac();
        setOpsec(prev => prev ? { ...prev, mac: res } : null);
      }
      await fetchStatus();
    } catch (err) {
      console.error("MAC toggle error:", err);
    } finally {
      setMacLoading(false);
    }
  };

  // 2. ONE-CLICK TOR TOGGLE
  const handleToggleTor = async (e) => {
    e.stopPropagation();
    try {
      setTorLoading(true);
      if (opsec?.tor?.is_active) {
        const res = await api.stopTor();
        setOpsec(prev => prev ? { ...prev, tor: res } : null);
      } else {
        const res = await api.startTor();
        setOpsec(prev => prev ? { ...prev, tor: res } : null);
      }
      await fetchStatus();
    } catch (err) {
      console.error("Tor toggle error:", err);
    } finally {
      setTorLoading(false);
    }
  };

  // 3. ONE-CLICK VPN TOGGLE (disconnect if active, or open modal to connect)
  const handleToggleVpn = async (e) => {
    e.stopPropagation();
    if (opsec?.vpn?.is_active) {
      try {
        setVpnLoading(true);
        const res = await api.disconnectVpn();
        setOpsec(prev => prev ? { ...prev, vpn: res } : null);
        await fetchStatus();
      } catch (err) {
        console.error("VPN disconnect error:", err);
      } finally {
        setVpnLoading(false);
      }
    } else {
      onOpenModal("vpn");
    }
  };

  const handleRefreshIp = async (e) => {
    e.stopPropagation();
    try {
      setIpRefreshing(true);
      const newIp = await api.checkPublicIp();
      setOpsec(prev => prev ? { ...prev, current_ip: newIp } : null);
      await fetchStatus();
    } catch (err) {
      console.error("IP refresh error:", err);
    } finally {
      setIpRefreshing(false);
    }
  };

  const isTor = opsec?.tor?.is_active;
  const isVpn = opsec?.vpn?.is_active;
  const isMacSpoofed = opsec?.mac?.is_spoofed;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* 1. MAC CHANGER DIRECT TOGGLE */}
      <button
        onClick={handleToggleMac}
        disabled={macLoading}
        title={isMacSpoofed ? `MAC Mascherato (${opsec?.mac?.current_mac}). Clicca per ripristinare.` : "Clicca per cambiare MAC address istantaneamente."}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          border: `1px solid ${isMacSpoofed ? "rgba(56, 189, 248, 0.6)" : "rgba(255, 255, 255, 0.12)"}`,
          background: isMacSpoofed ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.7)",
          color: isMacSpoofed ? "#38bdf8" : "#94a3b8",
          fontSize: "0.75rem",
          fontWeight: 700,
          transition: "all 0.2s ease"
        }}
      >
        <Shield size={14} color={isMacSpoofed ? "#38bdf8" : "#94a3b8"} className={macLoading ? "animate-spin" : ""} />
        <span>MAC: {isMacSpoofed ? "MASKED" : "OFF"}</span>
      </button>

      {/* 2. TOR NETWORK DIRECT TOGGLE */}
      <button
        onClick={handleToggleTor}
        disabled={torLoading}
        title={isTor ? `Tor Attivo (${opsec?.tor?.exit_ip}). Clicca per disattivare.` : "Clicca per instradare le scansioni su rete Tor."}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          border: `1px solid ${isTor ? "rgba(168, 85, 247, 0.6)" : "rgba(255, 255, 255, 0.12)"}`,
          background: isTor ? "rgba(168, 85, 247, 0.22)" : "rgba(15, 23, 42, 0.7)",
          color: isTor ? "#c084fc" : "#94a3b8",
          fontSize: "0.75rem",
          fontWeight: 700,
          transition: "all 0.2s ease"
        }}
      >
        <Radio size={14} color={isTor ? "#c084fc" : "#94a3b8"} className={isTor ? "animate-pulse" : torLoading ? "animate-spin" : ""} />
        <span>TOR: {isTor ? "ON" : "OFF"}</span>
      </button>

      {/* 3. VPN GATEWAY DIRECT TOGGLE */}
      <button
        onClick={handleToggleVpn}
        disabled={vpnLoading}
        title={isVpn ? `VPN Connessa (${opsec?.vpn?.active_profile}). Clicca per disconnettere.` : "Clicca per connettere o selezionare un tunnel VPN."}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          border: `1px solid ${isVpn ? "rgba(16, 185, 129, 0.6)" : "rgba(255, 255, 255, 0.12)"}`,
          background: isVpn ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 42, 0.7)",
          color: isVpn ? "#10b981" : "#94a3b8",
          fontSize: "0.75rem",
          fontWeight: 700,
          transition: "all 0.2s ease"
        }}
      >
        <Lock size={14} color={isVpn ? "#10b981" : "#94a3b8"} className={vpnLoading ? "animate-spin" : ""} />
        <span>VPN: {isVpn ? "ON" : "OFF"}</span>
      </button>

      {/* 4. PUBLIC IP BADGE WITH INSTANT REFRESH */}
      <div 
        onClick={() => onOpenModal("tor")}
        title="Clicca per aprire la gestione avanzata OPSEC"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px 4px 10px",
          borderRadius: "8px",
          cursor: "pointer",
          border: "1px solid #1e293b",
          background: "#020617",
          fontSize: "0.74rem",
          fontFamily: "var(--font-mono)",
          color: "#f8fafc"
        }}
      >
        <Globe size={13} color={isTor ? "#c084fc" : isVpn ? "#10b981" : "#38bdf8"} />
        <span style={{ fontWeight: 600 }}>
          {opsec?.current_ip?.ip || "Rilevamento..."}
        </span>
        {opsec?.current_ip?.country_code && (
          <span style={{ 
            fontSize: "0.68rem", 
            color: "#94a3b8", 
            padding: "1px 5px", 
            borderRadius: "4px", 
            background: "rgba(255, 255, 255, 0.08)" 
          }}>
            {opsec?.current_ip?.country_code}
          </span>
        )}
        <button
          onClick={handleRefreshIp}
          disabled={ipRefreshing}
          title="Verifica IP immediata"
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <RefreshCw size={11} className={ipRefreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 5. OPSEC MODAL INSPECTOR BUTTON */}
      <button
        onClick={() => onOpenModal("mac")}
        title="Apri pannello di controllo OPSEC completo"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid #1e293b",
          borderRadius: "8px",
          padding: "5px 8px",
          color: "#94a3b8",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "0.72rem"
        }}
      >
        <Sliders size={13} />
      </button>
    </div>
  );
}
