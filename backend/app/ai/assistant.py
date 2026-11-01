import json
from typing import Dict, Any, List, Optional

class SecurityAIAssistant:
    """Intelligent Security Analysis & Advisory Engine for TORNET."""

    def analyze_scan(self, scan_data: Dict[str, Any], vulnerabilities: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_vulns = len(vulnerabilities)
        crit_count = sum(1 for v in vulnerabilities if v.get("severity") == "critical")
        high_count = sum(1 for v in vulnerabilities if v.get("severity") == "high")
        med_count = sum(1 for v in vulnerabilities if v.get("severity") == "medium")
        low_count = sum(1 for v in vulnerabilities if v.get("severity") == "low")
        info_count = sum(1 for v in vulnerabilities if v.get("severity") == "info")

        # Posture Score calculation (100 = spotless, 0 = critical risk)
        penalty = (crit_count * 25) + (high_count * 12) + (med_count * 5) + (low_count * 2)
        posture_score = max(5, min(100, 100 - penalty))

        # Threat classification
        threat_vectors = []
        immediate_actions = []
        strategic_recommendations = []

        # Analyze vulnerability patterns
        has_sqli = any("sql" in v.get("title", "").lower() for v in vulnerabilities)
        has_xss = any("xss" in v.get("title", "").lower() or "cross-site" in v.get("title", "").lower() for v in vulnerabilities)
        has_rdp_smb = any(any(p in v.get("endpoint", "") for p in (":445", ":3389", ":23", ":21")) for v in vulnerabilities)
        has_outdated = any("outdated" in v.get("title", "").lower() or "php" in v.get("title", "").lower() for v in vulnerabilities)
        has_sensitive = any("disclosure" in v.get("title", "").lower() or ".env" in v.get("title", "").lower() or "git" in v.get("title", "").lower() for v in vulnerabilities)
        has_metasploit = any("metasploit" in v.get("tool_found_by", "").lower() for v in vulnerabilities)

        if has_sqli:
            threat_vectors.append({
                "category": "Data Layer Compromise (SQL Injection)",
                "risk": "Critical",
                "impact": "Possibile estrazione non autorizzata di database, bypass credenziali o esecuzione query arbitrarie."
            })
            immediate_actions.append("Implementare Prepared Statements / query parametrizzate su tutti gli endpoint database.")

        if has_xss:
            threat_vectors.append({
                "category": "Client-Side Execution (Cross-Site Scripting)",
                "risk": "High",
                "impact": "Furto di cookie di sessione, dirottamento account utente e defacement del portale web."
            })
            immediate_actions.append("Applicare context-aware output encoding ed implementare una rigorosa Content-Security-Policy (CSP).")

        if has_rdp_smb:
            threat_vectors.append({
                "category": "Insecure Network Boundary Exposure",
                "risk": "High",
                "impact": "Servizi amministrativi o di file sharing esposti verso reti esterne o non fidate."
            })
            immediate_actions.append("Applicare regole di firewall per bloccare porte 445, 3389, 21 e 23 alle sole reti VPN autorizzate.")

        if has_outdated:
            threat_vectors.append({
                "category": "Obsolete Software Stack & Known CVEs",
                "risk": "High",
                "impact": "Versioni software obsolete soggette a vulnerabilità pubbliche note ed exploit pronti."
            })
            strategic_recommendations.append("Aggiornare lo stack software (runtime, web server, librerie) all'ultima versione LTS supportata.")

        if has_sensitive:
            threat_vectors.append({
                "category": "Sensitive Information Disclosure",
                "risk": "Critical",
                "impact": "Esposizione di metadati di configurazione, credenziali in file .env o repository interni."
            })
            immediate_actions.append("Rimuovere o bloccare l'accesso web a file di ambiente (.env), backup e cartelle di versione (.git).")

        if has_metasploit:
            threat_vectors.append({
                "category": "Direct Exploit Susceptibility",
                "risk": "Critical",
                "impact": "Metasploit RPC Bridge ha riscontrato moduli di attacco verificabili sul target."
            })
            immediate_actions.append("Isolare tempestivamente l'host bersaglio e applicare patch di sicurezza vendor di livello critico.")

        if not immediate_actions:
            immediate_actions.append("Nessuna vulnerabilità critica immediata. Mantenere monitoraggio periodico.")
        
        strategic_recommendations.extend([
            "Configurare Web Application Firewall (WAF) per la mitigazione automatica dei tentativi di attacco.",
            "Abilitare Content-Security-Policy (CSP) e header di sicurezza HTTP (HSTS, X-Content-Type-Options).",
            "Pianificare scansioni ricorrenti settimanali per verificare tempestivamente nuove esposizioni."
        ])

        summary_it = (
            f"Analisi di sicurezza completata per {scan_data.get('target')}. "
            f"Indice di postura di sicurezza stimato al {posture_score}/100 (Grado {'A' if posture_score >= 90 else ('B' if posture_score >= 75 else ('C' if posture_score >= 50 else ('D' if posture_score >= 30 else 'F')))}). "
            f"Identificate {crit_count} vulnerabilità critiche, {high_count} ad alto rischio e {med_count} medie. "
            f"Si raccomanda l'applicazione prioritaria delle misure correttive elencate."
        )

        summary_en = (
            f"Security assessment completed for {scan_data.get('target')}. "
            f"Estimated posture score: {posture_score}/100 (Grade {'A' if posture_score >= 90 else ('B' if posture_score >= 75 else ('C' if posture_score >= 50 else ('D' if posture_score >= 30 else 'F')))}). "
            f"Detected {crit_count} critical, {high_count} high, and {med_count} medium vulnerabilities. "
            f"Immediate execution of remediation roadmap is advised."
        )

        return {
            "target": scan_data.get("target"),
            "scan_id": scan_data.get("id"),
            "posture_score": posture_score,
            "posture_grade": "A" if posture_score >= 90 else ("B" if posture_score >= 75 else ("C" if posture_score >= 50 else ("D" if posture_score >= 30 else "F"))),
            "threat_vectors": threat_vectors,
            "immediate_actions": immediate_actions,
            "strategic_recommendations": strategic_recommendations,
            "summary_it": summary_it,
            "summary_en": summary_en,
            "metrics": {
                "critical": crit_count,
                "high": high_count,
                "medium": med_count,
                "low": low_count,
                "info": info_count,
                "total": total_vulns
            }
        }

    def ask_advisor(self, query: str, scan_data: Optional[Dict[str, Any]] = None, vulnerabilities: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Provides expert penetration testing and remediation intelligence."""
        q_lower = query.lower()
        context_target = scan_data.get("target") if scan_data else "il target selezionato"
        
        reply_lines = []

        if "sql" in q_lower or "injection" in q_lower or "database" in q_lower:
            reply_lines = [
                f"🛡️ **Analisi AI: Mitigazione SQL Injection per {context_target}**",
                "",
                "1. **Causa Primaria:** La vulnerabilità deriva dalla concatenazione diretta di input non sanitizzato nelle query SQL.",
                "2. **Soluzione Definitiva:** Passare a **Prepared Statements** (Query Parametrizzate) su tutti gli handler backend.",
                "   - *Python / SQLAlchemy:* Usare binding nativi `session.execute(text('SELECT * FROM users WHERE id = :id'), {'id': user_id})`",
                "   - *PHP / PDO:* `$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email'); $stmt->execute(['email' => $email]);`",
                "3. **Protezione Aggiuntiva:** Attivare il principio del minimo privilegio sull'utente database (es. negare `FILE`, `GRANT`, `DROP`).",
                "4. **WAF Rule:** Applicare filtri regex WAF su pattern comuni come `' OR 1=1--`, `UNION SELECT`, `SLEEP()`."
            ]
        elif "xss" in q_lower or "cross-site" in q_lower:
            reply_lines = [
                f"🛡️ **Analisi AI: Mitigazione Cross-Site Scripting (XSS) per {context_target}**",
                "",
                "1. **Classificazione:** XSS (Stored / Reflected / DOM-based). Permette l'iniezione di script JavaScript arbitrari.",
                "2. **Remediation Core:**",
                "   - Sanitizzare e codificare i caratteri HTML (`&`, `<`, `>`, `\"`, `'`) prima del rendering a video.",
                "   - Implementare l'header HTTP: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';`",
                "3. **Protezione Cookie:** Impostare i flag `HttpOnly`, `Secure` e `SameSite=Strict` su tutti i token di sessione per impedire l'esfiltrazione via document.cookie."
            ]
        elif "nmap" in q_lower or "porta" in q_lower or "port" in q_lower or "firewall" in q_lower:
            reply_lines = [
                f"🛡️ **Analisi AI: Hardening di Rete & Porte Aperte per {context_target}**",
                "",
                "1. **Regola Zero-Trust:** Solo le porte strettamente necessarie al servizio pubblico (80/TCP, 443/TCP) devono risultare esposte all'esterno.",
                "2. **Servizi Critici:** Porte come 21 (FTP), 22 (SSH), 445 (SMB), 3389 (RDP) devono essere isolate tramite VPN con autenticazione a due fattori (2FA/MFA).",
                "3. **Comando iptables consigliato:**",
                "   `iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/24 -j ACCEPT`",
                "   `iptables -A INPUT -p tcp --dport 22 -j DROP`"
            ]
        elif "metasploit" in q_lower or "exploit" in q_lower:
            reply_lines = [
                f"🛡️ **Analisi AI: Simulazione Exploit & Metasploit RPC Bridge**",
                "",
                "1. **Verifica:** Il modulo Metasploit esegue test non distruttivi (`check`) per accertare l'effettiva sfruttabilità di CVE note.",
                "2. **Roadmap di Difesa:**",
                "   - Isolare la macchina dal segmento di produzione.",
                "   - Raccogliere i banner del servizio compromesso per individuare la CVE esatta.",
                "   - Applicare la security patch del vendor prima di ripristinare il traffico pubblico."
            ]
        else:
            vuln_count = len(vulnerabilities) if vulnerabilities else 0
            reply_lines = [
                f"🤖 **Security AI Advisor — Risposta Operativa per {context_target}**",
                "",
                f"In base all'analisi dello stato attuale (rilevate {vuln_count} vulnerabilità):",
                "- **Priorità 1:** Verificare ed estinguere le vulnerabilità con severità 'Critical' e 'High' (score CVSS > 7.0).",
                "- **Priorità 2:** Configurare e validare gli header di sicurezza HTTP e verificare l'assenza di file sensibili esposti (.env, .git).",
                "- **Priorità 3:** Pianificare una scansione ricorrente di verifica con la funzione Scan Scheduling.",
                "",
                f"Domanda operatore: *\"{query}\"*",
                "Suggerimento: Puoi richiedere indicazioni specifiche su argomenti come 'SQL Injection', 'XSS', 'Firewall / Porte', o 'Metasploit'."
            ]

        return {
            "query": query,
            "target": context_target,
            "response": "\n".join(reply_lines),
            "timestamp": "now"
        }

ai_assistant = SecurityAIAssistant()
