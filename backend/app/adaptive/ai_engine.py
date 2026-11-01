import re
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("tornet.adaptive.ai_engine")

class AIDecisionRule:
    """Represents a specific inference and fallback reasoning rule."""
    def __init__(
        self,
        rule_id: str,
        name: str,
        category: str,
        condition_description: str,
        knowledge_reason: str,
        action_description: str
    ):
        self.rule_id = rule_id
        self.name = name
        self.category = category
        self.condition_description = condition_description
        self.knowledge_reason = knowledge_reason
        self.action_description = action_description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.rule_id,
            "name": self.name,
            "category": self.category,
            "condition": self.condition_description,
            "knowledge": self.knowledge_reason,
            "action": self.action_description
        }


class AIDecisionEvent:
    """Represents a live decision taken by the AI during a scan."""
    def __init__(
        self,
        rule_id: str,
        trigger: str,
        reasoning: str,
        action_taken: str,
        timestamp: Optional[str] = None
    ):
        self.rule_id = rule_id
        self.trigger = trigger
        self.reasoning = reasoning
        self.action_taken = action_taken
        self.timestamp = timestamp or datetime.utcnow().strftime("%H:%M:%S")

    def format_terminal_log(self) -> str:
        return (
            f"\n🧠 [AI DECISION ENGINE | {self.timestamp}]\n"
            f"   ├─ 🔍 SE: {self.trigger}\n"
            f"   ├─ 💡 PERCHÉ SO: {self.reasoning}\n"
            f"   └─ ⚡ ALLORA FACCIO: {self.action_taken}\n"
        )


class AIExpertEngine:
    """
    Sistema Esperto a Regole di Inferenza & Fallback Adattivo.
    Applica euristica avanzata: "Se [condizione], allora fai [azione] perché so [conoscenza]".
    """

    def __init__(self):
        self.rules_catalog: List[AIDecisionRule] = [
            AIDecisionRule(
                rule_id="RULE_WAF_EVASION",
                name="Elusione WAF & Rate-Limiting",
                category="OPSEC & Stealth",
                condition_description="Rilevato WAF (Cloudflare/Sucuri/ModSecurity) o risposte 403 Forbidden / 429 Too Many Requests in serie.",
                knowledge_reason="Il firewall perimetrale applica ban automatico dell'IP se la frequenza supera la soglia o lo User-Agent è tipico di scanner.",
                action_description="Attiva Throttling (massimo 5 req/s), inietta User-Agent randomici di browser moderni e ordina la rotazione del circuito Tor (NEWNYM)."
            ),
            AIDecisionRule(
                rule_id="RULE_IIS_ASP_OPTIMIZE",
                name="Specializzazione Stack Microsoft IIS / ASP.NET",
                category="Recon Specialization",
                condition_description="Il Web Server è Microsoft-IIS o le tecnologie includono ASP.NET / C#.",
                knowledge_reason="Le wordlist Unix e Apache generano solo rumore e 404; l'infrastruttura Windows ha strutture specifiche (.aspx, .ashx, web.config).",
                action_description="Esclude template Apache/Unix; inietta estensioni .aspx/.ashx e attiva verifiche per IIS short filenames e web.config leaks in Nuclei."
            ),
            AIDecisionRule(
                rule_id="RULE_WORDPRESS_AUDIT",
                name="Specializzazione CMS WordPress",
                category="CMS Targeting",
                condition_description="Rilevato CMS WordPress nel body (wp-content/wp-includes) o negli header HTTP.",
                knowledge_reason="Oltre il 90% delle vulnerabilità WordPress risiede in plugin obsoleti, XML-RPC aperto o enumerazione utenti REST API.",
                action_description="Attiva controlli mirati su /wp-json/wp/v2/users, xmlrpc.php e carica i template vulnerabilità specifici WordPress in Nuclei."
            ),
            AIDecisionRule(
                rule_id="RULE_HTTP_FALLBACK_HTTPS",
                name="Fallback Protocollo HTTP -> HTTPS / TLS",
                category="Protocol Adaptation",
                condition_description="La porta 80 HTTP è chiusa o rifiuta la connessione, ma la porta 443 è attiva.",
                knowledge_reason="Il target applica HSTS rigoroso o non accetta traffico in chiaro su porta standard.",
                action_description="Riscrive dinamicamente l'URL target in https:// e abilita verifiche cifrari TLS/SSL (ssl-enum-ciphers)."
            ),
            AIDecisionRule(
                rule_id="RULE_ALT_PORT_EXPANSION",
                name="Scansione Porte Ausiliarie & Admin Dashboard",
                category="Target Expansion",
                condition_description="Nmap scopre porte web non convenzionali aperte (es. 8080, 8443, 8888, 3000, 9000).",
                knowledge_reason="Le porte secondarie ospitano frequentemente backend di sviluppo, pannelli admin o API prive delle protezioni WAF perimetrali.",
                action_description="Genera automaticamente nuovi target mirati (es. target:8080) e accoda una scansione HTTPX/Nuclei dedicata."
            ),
            AIDecisionRule(
                rule_id="RULE_EXPOSED_DB_CHECK",
                name="Audit Servizi Database Esposti",
                category="Infrastructure Security",
                condition_description="Rilevata porta database aperta su internet (3306 MySQL, 5432 Postgres, 6379 Redis, 27017 MongoDB).",
                knowledge_reason="Un database esposto pubblicamente rappresenta una potenziale errata configurazione critica ad alto rischio di accesso non autenticato.",
                action_description="Esegue probe non distruttivo di banner grabbing e script NSE Nmap per verificare autenticazione e permessi remoti."
            ),
            AIDecisionRule(
                rule_id="RULE_GO_PROXY_RECOVERY",
                name="Risoluzione Automatica Proxy Go Binaries",
                category="Network Auto-Healing",
                condition_description="Un tool scritto in Go (Gobuster, Subfinder, Feroxbuster) fallisce con dial tcp / network unreachable.",
                knowledge_reason="I binari compilati in Go effettuano chiamate di sistema socket dirette ignorando proxychains LD_PRELOAD.",
                action_description="Riformatta il comando inserendo i flag proxy nativi SOCKS5 (--proxy socks5://127.0.0.1:9050) e riavvia il tool senza interruzioni."
            ),
            AIDecisionRule(
                rule_id="RULE_DYNAMIC_PARAM_SQLMAP",
                name="Iniezione Dinamica Parametri per SQLMap",
                category="Targeted Assessment",
                condition_description="L'URL base non ha parametri GET (?id=), ma Gobuster/Feroxbuster scoprono endpoint dinamici.",
                knowledge_reason="SQLMap non può operare efficacemente su pagine statiche se non ha input o parametri da testare.",
                action_description="Seleziona automaticamente gli endpoint dinamici scoperti e li alimenta direttamente a SQLMap con crawling non invasivo."
            ),
            AIDecisionRule(
                rule_id="RULE_APACHE_PHP_DEEP",
                name="Audit Approfondito Stack Linux / Apache / PHP",
                category="Recon Specialization",
                condition_description="Rilevato ambiente Linux con Apache o Nginx e interprete PHP.",
                knowledge_reason="I server PHP sono suscettibili all'esposizione accidentale di file di configurazione (.env, config.php, composer.json) e LFI.",
                action_description="Inietta wordlist mirata per file sensibili di ambiente (.env, .git, composer.json, phpinfo.php) e test LFI su /etc/passwd."
            )
        ]

    def get_catalog(self) -> List[Dict[str, Any]]:
        """Restituisce il catalogo completo delle regole euristiche per l'interfaccia."""
        return [r.to_dict() for r in self.rules_catalog]

    def evaluate_preflight(self, profile_data: Dict[str, Any]) -> List[AIDecisionEvent]:
        """
        Valuta il profilo preliminare dell'obiettivo prima di lanciare la scansione
        e genera le prime decisioni dell'AI.
        """
        decisions: List[AIDecisionEvent] = []
        web_server = str(profile_data.get("web_server", "")).lower()
        technologies = [t.lower() for t in profile_data.get("technologies", [])]
        waf_detected = profile_data.get("waf_detected", False)
        waf_name = profile_data.get("waf_name", "WAF Rilevato")
        open_ports = profile_data.get("open_ports", [])

        # 1. Regola WAF
        if waf_detected:
            decisions.append(AIDecisionEvent(
                rule_id="RULE_WAF_EVASION",
                trigger=f"Rilevata presenza di {waf_name} attivo a protezione dell'host",
                reasoning="Richieste ad alta frequenza causerebbero il ban immediato dell'IP e falsi negativi nelle risposte HTTP.",
                action_taken="Attivata modalità Stealth, limitazione a 5 thread max, User-Agent browser moderni e instradamento su circuito Tor con rotazione identità."
            ))

        # 2. Regola Windows / IIS / ASP.NET
        if "iis" in web_server or "microsoft" in web_server or any("asp" in t for t in technologies):
            decisions.append(AIDecisionEvent(
                rule_id="RULE_IIS_ASP_OPTIMIZE",
                trigger=f"Web server identificato come {profile_data.get('web_server')} con stack ASP.NET",
                reasoning="Le architetture Windows Server usano handler .NET ed esclusioni NTFS; scansionare percorsi Apache/.php è uno spreco di banda.",
                action_taken="Configurate estensioni .aspx, .ashx, .config e caricati template Nuclei per vulnerabilità IIS short-names e web.config leaks."
            ))

        # 3. Regola WordPress
        if any("word" in t for t in technologies):
            decisions.append(AIDecisionEvent(
                rule_id="RULE_WORDPRESS_AUDIT",
                trigger="Rilevata installazione WordPress attiva",
                reasoning="Il nucleo di WordPress è raramente vulnerabile direttamente; i vettori primari sono plugin, temi e file xmlrpc.php.",
                action_taken="Caricamento set di template mirati WordPress Nuclei e accodamento verifiche su /wp-json/wp/v2/users per enumerazione sicura degli account."
            ))

        # 4. Regola Fallback HTTPS
        if 80 not in open_ports and 443 in open_ports:
            decisions.append(AIDecisionEvent(
                rule_id="RULE_HTTP_FALLBACK_HTTPS",
                trigger="Porta standard HTTP 80 chiusa, mentre porta HTTPS 443 è aperta",
                reasoning="Il target applica restrizione sul traffico in chiaro o reindirizzamento forzato su canale cifrato TLS.",
                action_taken="Riscritto URL target su https:// e abilitata analisi crittografica dei cifrari TLS/SSL."
            ))

        # 5. Regola Porte Ausiliarie
        alt_ports = [p for p in open_ports if p in [8080, 8443, 8888, 3000, 5000, 9000]]
        if alt_ports:
            decisions.append(AIDecisionEvent(
                rule_id="RULE_ALT_PORT_EXPANSION",
                trigger=f"Individuate porte web ausiliarie aperte: {alt_ports}",
                reasoning="Porte non-standard ospitano spesso console di management o ambienti API secondari privi di WAF.",
                action_taken=f"Accodamento sub-target dedicati per le porte {alt_ports} con scansione HTTPX automatica."
            ))

        # 6. Regola Database Esposti
        db_ports = [p for p in open_ports if p in [3306, 5432, 6379, 27017]]
        if db_ports:
            decisions.append(AIDecisionEvent(
                rule_id="RULE_EXPOSED_DB_CHECK",
                trigger=f"Porte database esposte direttamente all'esterno: {db_ports}",
                reasoning="I motori di database esposti su internet non dovrebbero essere accessibili pubblicamente.",
                action_taken=f"Attivati script Nmap NSE non distruttivi per audit di autenticazione e versione sui database (porte {db_ports})."
            ))

        # 7. Regola Linux / Apache / PHP
        if ("apache" in web_server or "nginx" in web_server) and any("php" in t for t in technologies):
            decisions.append(AIDecisionEvent(
                rule_id="RULE_APACHE_PHP_DEEP",
                trigger=f"Stack LAMP/LNMP rilevato ({profile_data.get('web_server')} + PHP)",
                reasoning="Applicazioni PHP presentano frequentemente file di configurazione (.env, config.php) o backup dimenticati nella root.",
                action_taken="Prioritizzate wordlist con estensioni .php, .env, .git e controlli LFI per Unix /etc/passwd."
            ))

        return decisions

    def evaluate_tool_runtime(
        self,
        tool_name: str,
        target: str,
        return_code: int,
        raw_output: str
    ) -> Optional[AIDecisionEvent]:
        """
        Valuta l'output di un tool in tempo reale e attiva azioni di fallback/recovery
        se il tool riscontra blocchi o errori.
        """
        raw_lower = raw_output.lower()

        # Fallback 1: WAF blocco in corso
        if "403 forbidden" in raw_lower or "429 too many" in raw_lower or "access denied" in raw_lower:
            return AIDecisionEvent(
                rule_id="RULE_WAF_EVASION",
                trigger=f"Il tool {tool_name} ha ricevuto risposte multiple 403 Forbidden / 429 Rate-Limit",
                reasoning="Il server di destinazione ha iniziato a bloccare le richieste per eccesso di traffico o fingerprint dello strumento.",
                action_taken="Attivato Stealth Fallback: riduzione immediata della frequenza a 2 req/s e cambio rotativo dell'IP tramite circuito Tor."
            )

        # Fallback 2: Errore connessione / Dial Go
        if return_code != 0 and ("network unreachable" in raw_lower or "dial tcp" in raw_lower):
            return AIDecisionEvent(
                rule_id="RULE_GO_PROXY_RECOVERY",
                trigger=f"Il tool {tool_name} ha fallito la connessione socket (network unreachable / dial tcp)",
                reasoning="I binari Go non intercettano i proxy a livello di libc e richiedono esplicitamente il parametro socks5 nativo.",
                action_taken="Iniezione automatica del flag '--proxy socks5://127.0.0.1:9050' e riconnessione tramite gateway Tor."
            )

        # Fallback 3: SQLMap senza parametri
        if tool_name == "sqlmap" and ("no parameter" in raw_lower or "not injectable" in raw_lower):
            return AIDecisionEvent(
                rule_id="RULE_DYNAMIC_PARAM_SQLMAP",
                trigger="SQLMap non ha individuato parametri GET direttamente iniettabili sull'URL principale",
                reasoning="L'URL target è un endpoint statico senza parametri di query (?id=...); l'analisi richiede crawling dei moduli interni.",
                action_taken="Commutazione automatica su crawler ricorsivo '--crawl=2' con analisi dei form dinamici (POST)."
            )

        return None


ai_expert_engine = AIExpertEngine()
