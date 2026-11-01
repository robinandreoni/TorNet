# 📖 TORNET Command Center — Manuale Utente Operativo

> **Guida all'utilizzo del sistema di Penetration Testing & Telemetria di Sicurezza**  
> *Versione 1.0.0 — Dark Mode Command Center*

---

## 📋 Indice
1. [Panoramica della Dashboard](#panoramica-della-dashboard)
2. [Lancio di un Nuovo Audit (New Scan Wizard)](#lancio-di-un-nuovo-audit-new-scan-wizard)
3. [Profili di Scansione & Intensità](#profili-di-scansione--intensità)
4. [Live Terminal & WebSocket Streaming](#live-terminal--websocket-streaming)
5. [Integrazione Metasploit RPC Bridge](#integrazione-metasploit-rpc-bridge)
6. [Scan Scheduling (Scansioni Ricorrenti)](#scan-scheduling-scansioni-ricorrenti)
7. [AI Security Assistant (Consulente Intelligente)](#ai-security-assistant-consulente-intelligente)
8. [Dashboard Multi-Target (Gestione Progetti)](#dashboard-multi-target-gestione-progetti)
9. [Sistema di Notifiche (Telegram, Email, Webhook)](#sistema-di-notifiche-telegram-email-webhook)
10. [Plugin System (Aggiunta Tool Personalizzati)](#plugin-system-aggiunta-tool-personalizzati)
11. [Reportistica & Matrice di Remediation](#reportistica--matrice-di-remediation)

---

## 1. Panoramica della Dashboard

Accedendo alla Command Center Home (`http://localhost:5173`), l'operatore visualizza:
- **Badge di Connessione WebSocket Live:** Indicatore verde di telemetria in tempo reale.
- **Card Metriche:** Vulnerabilità Critiche, Scansioni Attive, Target Unici Auditati e Success Rate globale.
- **Grafico di Distribuzione Severity:** Diagramma a torta interattivo delle vulnerabilità scoperte.
- **Tabella Vulnerabilità Recenti:** Elenco con classificazione CVSS, severità, endpoint e remediation rapida.
- **Audit Recenti con Progress Bar Dinamica:** Monitoraggio dello stato delle scansioni in corso.

---

## 2. Lancio di un Nuovo Audit (New Scan Wizard)

Cliccare su **"Lancia Audit"** o **"New Scan"** nel menu laterale:
1. **Target:** Inserire l'indirizzo IP, hostname o URL autorizzato (es. `http://testphp.vulnweb.com`). Sono disponibili pulsanti rapidi preimpostati per i lab di addestramento.
2. **Profilo:** Selezionare tra:
   - **Full Auto:** Catena completa di ricognizione, vulnerability assessment, injection e brute force.
   - **Reconnaissance:** Ricognizione passiva/attiva e mappatura sottodomini.
   - **Vulnerability Scan:** Scansione focalizzata sulle CVE con Nuclei e Nikto.
   - **Exploit Verification:** Test specifici di injection e simulazione exploit.
   - **Directory Sweep:** Brute-force percorsi web e file sensibili con Gobuster/Feroxbuster.
3. **Intensità:**
   - *Light (Stealth):* Basso rate di pacchetti per non saturare la banda.
   - *Medium (Balanced):* Standard raccomandato per audit completi.
   - *Aggressive (Deep):* Scansione intensiva multithread con script NSE ed enumerazione estesa.
4. **Tool Modulari:** Possibilità di includere o escludere specifici tool a piacere.
5. Cliccare **"AVVIA AUDIT"** per avviare il motore asincrono.

---

## 3. Profili di Scansione & Intensità

I profili orchestrano automaticamente la sequenza di tool predefiniti:
```
[Inizio Audit]
       ↓
[Scapy / Probing Rapido] → [Nmap Port Scan]
       ↓
[WhatWeb Fingerprint & HTTPX Status]
       ↓
[Nuclei Template CVE] → [Nikto Web Assessment]
       ↓
[SQLMap Injection Test] → [Gobuster Discovery]
       ↓
[Metasploit RPC Check (se selezionato)]
       ↓
[Generazione Report & Alert Notifiche]
```

---

## 4. Live Terminal & WebSocket Streaming

Aprendo il dettaglio di una scansione, il tab **"Live Terminal"** mostra lo streaming riga per riga di ogni tool eseguito in tempo reale:
- Colori ad alto contrasto stile Command Center.
- Barra di ricerca per filtrare stringhe nel log (es. `200 OK`, `Vulnerable`, `CVE-`).
- Pulsante di auto-scroll e copia output negli appunti.

---

## 5. Integrazione Metasploit RPC Bridge

TORNET supporta l'integrazione diretta con **Metasploit Framework**:
- Permette di verificare se le vulnerabilità identificate su porte o servizi esposti sono sfruttabili tramite moduli `check` ausiliari e di test.
- Esegue la scansione in modalità non invasiva/non distruttiva per validare la posture di sicurezza.
- Segnala le vulnerabilità confermate nella matrice con severità Critical e punteggio CVSS 9+.

---

## 6. Scan Scheduling (Scansioni Ricorrenti)

Per garantire la continuous security validation, TORNET include il pianificatore integrato:
- Configurazione scansioni ad intervallo (ogni 6 ore, 12 ore, 24 ore o settimanali).
- Avvio automatico in background senza richiedere intervento manuale.
- Possibilità di sospendere (`Toggle Active`), forzare l'esecuzione istantanea (`Run Now`), o eliminare la pianificazione.

---

## 7. AI Security Assistant (Consulente Intelligente)

Nel tab **"AI Advisor"** di ogni scansione:
- **Security Posture Score (0-100) & Grado (A-F):** Valutazione automatica dell'indice di rischio globale.
- **Vettori di Minaccia (Threat Vectors):** Sintesi strutturata dei principali rischi (es. SQLi, porte amministrative esposte, versioni obsolete).
- **Roadmap di Mitigazione Immediata:** Azioni prioritarie consigliate da applicare subito.
- **Terminal AI Interattivo:** Permette all'operatore di digitare qualsiasi domanda tecnica (es. *"Come bloccare SQL injection su questo endpoint?"*) e ottenere istruzioni di hardening immediate.

---

## 8. Dashboard Multi-Target (Gestione Progetti)

La sezione **"Progetti Multi-Target"** consente di raggruppare molteplici asset aziendali:
- Creazione di progetti (es. "Infrastruttura E-Commerce 2026").
- Assegnazione di multipli target (Web app, API gateway, mail server, database backend).
- **Lancio Batch con 1 Clic:** Avvia l'audit simultaneo o accodato su tutti gli asset del progetto con un solo comando.

---

## 9. Sistema di Notifiche (Telegram, Email, Webhook)

Configurabile nella pagina **Impostazioni (Settings)**:
- **Telegram Bot:** Inserire il Bot Token e il Chat ID per ricevere avvisi immediati con riepilogo criticità al termine di ogni scansione.
- **Email SMTP:** Configurare il server SMTP per ricevere report sintetici via posta elettronica.
- **Webhook Custom:** Compatibile con canali Slack, Discord o Microsoft Teams.
- Pulsante **"Invia Notifica di Test"** per verificare istantaneamente la configurazione.

---

## 10. Plugin System (Aggiunta Tool Personalizzati)

La sezione **Toolbox** supporta l'espansione tramite plugin:
- Aggiunta di nuovi strumenti open-source tramite manifest JSON.
- Definizione del comando con variabili dinamiche `{target}` e `{intensity_flags}`.
- Impostazione di parole chiave per l'estrazione automatica delle vulnerabilità.
- Abilitazione/disabilitazione con un clic.

---

## 11. Reportistica & Matrice di Remediation

Nella pagina **"Report"**:
- **Download HTML Executive Report:** Documento elegante e pronto per la presentazione ad auditor o stakeholder.
- **Export Dati CSV & JSON:** Per integrazione in SIEM o strumenti di data analytics.
- **Comparazione Storico (Diff):** Matrice visiva di confronto tra due scansioni successive per misurare l'efficacia delle azioni correttive (Delta CVSS e vulnerabilità estinte).

