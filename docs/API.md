# ⚡ TORNET Command Center — API Reference

> **Specifica Completa delle API RESTful e WebSocket del Sistema TORNET**  
> *Versione 1.0.0 — Base URL: `http://localhost:8000/api/v1`*

---

## 📋 Indice
1. [Autenticazione](#autenticazione)
2. [Statistiche di Sistema](#statistiche-di-sistema)
3. [Gestione Scansioni (Scans)](#gestione-scansioni-scans)
4. [Vulnerabilità & Risultati](#vulnerabilità--risultati)
5. [Report & Comparazione](#report--comparazione)
6. [Scan Scheduling](#scan-scheduling)
7. [AI Security Assistant](#ai-security-assistant)
8. [Progetti Multi-Target](#progetti-multi-target)
9. [Notifiche & Alerting](#notifiche--alerting)
10. [Tool Plugins](#tool-plugins)
11. [WebSocket Real-Time API](#websocket-real-time-api)

---

## 1. Autenticazione

Tutte le richieste autenticate richiedono l'header:
```
Authorization: Bearer <access_token>
```

### POST `/auth/login`
Autentica un utente e restituisce il token JWT.

**Request Body:**
```json
{
  "username": "admin",
  "password": "tornet2026"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@tornet.local",
    "is_admin": true
  }
}
```

---

## 2. Statistiche di Sistema

### GET `/stats`
Restituisce il riepilogo complessivo del Command Center.

**Response (200 OK):**
```json
{
  "critical_vulns": 3,
  "active_scans": 1,
  "assets_tested": 12,
  "success_rate": 95.8,
  "total_scans": 24,
  "severity_distribution": {
    "critical": 3,
    "high": 7,
    "medium": 14,
    "low": 5,
    "info": 18
  },
  "recent_activity": []
}
```

---

## 3. Gestione Scansioni (Scans)

### POST `/scans`
Crea ed avvia una nuova scansione di penetration testing.

**Request Body:**
```json
{
  "target": "http://testphp.vulnweb.com",
  "target_type": "web",
  "scan_type": "full_auto",
  "intensity": "medium",
  "selected_tools": ["nmap", "nuclei", "sqlmap"]
}
```

### GET `/scans`
Restituisce la lista di scansioni ordinate per data decrescente.
- Parametro opzionale query: `?status=running` (oppure `completed`, `failed`, `stopped`).

### GET `/scans/{scan_id}`
Restituisce il dettaglio della scansione con l'elenco dei risultati dei tool, vulnerabilità e log.

### POST `/scans/{scan_id}/stop`
Invia la sequenza di terminazione forzata per i processi della pipeline in esecuzione.

### DELETE `/scans/{scan_id}`
Elimina il record della scansione e i risultati associati.

---

## 4. Vulnerabilità & Risultati

### GET `/vulnerabilities`
Restituisce tutte le vulnerabilità scoperte nel database con filtri opzionali.
- Parametro query: `?severity=critical`

### GET `/scans/{scan_id}/results`
Restituisce i risultati raw e parsed di ogni tool per la scansione specificata.

---

## 5. Report & Comparazione

### GET `/reports/{scan_id}/export/{format}`
Scarica il report della scansione nel formato specificato:
- `format`: `html`, `csv`, `json`.

### GET `/reports/compare/diff?scan_a={id}&scan_b={id}`
Calcola la matrice di differenza tra due scansioni:
- Vulnerabilità risolte / estinte.
- Nuove vulnerabilità emerse.
- Delta punteggio CVSS globale.

---

## 6. Scan Scheduling

### GET `/schedules`
Restituisce tutte le pianificazioni di scansione registrate.

### POST `/schedules`
Crea una nuova pianificazione ricorrente.

**Request Body:**
```json
{
  "name": "Weekly Perimeter Security Audit",
  "target": "http://testphp.vulnweb.com",
  "target_type": "web",
  "scan_type": "full_auto",
  "intensity": "medium",
  "interval_hours": 168
}
```

### POST `/schedules/{id}/toggle`
Attiva o disattiva la pianificazione.

### POST `/schedules/{id}/run-now`
Forza l'avvio immediato di una scansione pianificata.

### DELETE `/schedules/{id}`
Elimina la pianificazione.

---

## 7. AI Security Assistant

### GET `/ai/analyze/{scan_id}`
Elabora l'analisi euristica avanzata della scansione.

**Response (200 OK):**
```json
{
  "target": "http://testphp.vulnweb.com",
  "scan_id": 1,
  "posture_score": 68,
  "posture_grade": "C",
  "threat_vectors": [
    {
      "category": "Data Layer Compromise (SQL Injection)",
      "risk": "Critical",
      "impact": "Possibile estrazione non autorizzata di database."
    }
  ],
  "immediate_actions": [
    "Implementare Prepared Statements / query parametrizzate su tutti gli endpoint database."
  ],
  "strategic_recommendations": [
    "Configurare Web Application Firewall (WAF) per la mitigazione automatica."
  ],
  "summary_it": "Analisi di sicurezza completata per http://testphp.vulnweb.com...",
  "summary_en": "Security assessment completed for http://testphp.vulnweb.com..."
}
```

### POST `/ai/query`
Consulenza interattiva e risposte alle domande tecniche dell'operatore.

**Request Body:**
```json
{
  "scan_id": 1,
  "prompt": "Come posso correggere l'SQL injection rilevata?"
}
```

---

## 8. Progetti Multi-Target

### GET `/projects`
Elenco di tutti i progetti registrati con i relativi target configurati.

### POST `/projects`
Crea un nuovo progetto multi-target.

**Request Body:**
```json
{
  "name": "Audit Infrastruttura Cloud",
  "description": "Perimetro esterno corporate",
  "client_name": "Acme Corp",
  "initial_targets": [
    { "target": "https://api.acme.com", "target_type": "web" },
    { "target": "192.168.1.10", "target_type": "network" }
  ]
}
```

### POST `/projects/{id}/targets`
Aggiunge un asset bersaglio al progetto.

### POST `/projects/{id}/scan-all`
Avvia in batch le scansioni su tutti i target associati al progetto.

---

## 9. Notifiche & Alerting

### GET `/notifications/config`
Restituisce le configurazioni attuali di Telegram, Email e Webhook.

### POST `/notifications/config`
Salva le configurazioni di notifica.

### POST `/notifications/test`
Invia un alert di prova per validare i canali configurati.

---

## 10. Tool Plugins

### GET `/plugins`
Restituisce tutti i manifest dei plugin personalizzati installati in `backend/plugins/`.

### POST `/plugins`
Registra un nuovo plugin tool personalizzato.

**Request Body:**
```json
{
  "name": "dnsrecon",
  "display_name": "DNSRecon Enumerator",
  "category": "Reconnaissance",
  "description": "DNS enumeration and zone transfer script",
  "version": "1.1.0",
  "command_template": "dnsrecon -d {target} {intensity_flags}",
  "intensity_flags": {
    "light": "-s",
    "medium": "-a",
    "aggressive": "-a -z"
  },
  "vulnerability_keywords": ["Zone Transfer Successful", "Vulnerable"],
  "enabled": true
}
```

---

## 11. WebSocket Real-Time API

Endpoint di connessione:
```
ws://localhost:8000/ws/{channel}
```
Canali standard:
- `global`: Notifiche di sistema, cambi di stato scansioni e statistiche.
- `scan_{scan_id}`: Streaming dedicato di avanzamento e log del terminale per un audit specifico.

**Messaggio di Avanzamento (`scan_progress`):**
```json
{
  "type": "scan_progress",
  "scan_id": 1,
  "progress": 65,
  "status": "running",
  "current_tool": "Nuclei Scanner"
}
```

**Messaggio di Output Terminale (`terminal_output`):**
```json
{
  "type": "terminal_output",
  "scan_id": 1,
  "stream": "stdout",
  "chunk": "[NUCLEI] [CVE-2023-XXXX] [critical] http://target/login"
}
```

