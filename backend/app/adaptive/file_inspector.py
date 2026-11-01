import os
import re
import shutil
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse
import httpx

from ..websocket.manager import manager
from ..scans.models import Vulnerability
from ..database import SessionLocal

logger = logging.getLogger("tornet.adaptive.file_inspector")

LOOT_BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "loot")
USER_DOWNLOADS_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "Tornet_Loot")

# Sensitive filenames to auto-download and analyze
INTERESTING_FILES = [
    "robots.txt",
    "security.txt",
    ".well-known/security.txt",
    "sitemap.xml",
    "humans.txt",
    "crossdomain.xml",
    "clientaccesspolicy.xml",
    ".env",
    "composer.json",
    "package.json",
    "web.config",
    ".git/HEAD",
    "README.md"
]

SENSITIVE_KEYWORDS = [
    "admin", "login", "secret", "private", "backup", "config", "reset",
    "resetbutton", "internal", "test", "dev", "debug", "manage", "root",
    "api", "console", "dashboard", "portal", "db", "database", "passw"
]

class FileInspector:
    """Automated Downloader & Content Inspector for sensitive files discovered during scans."""

    def __init__(self):
        os.makedirs(LOOT_BASE_DIR, exist_ok=True)
        try:
            os.makedirs(USER_DOWNLOADS_DIR, exist_ok=True)
        except Exception:
            pass

    async def inspect_discovered_files(self, scan_id: int, base_url: str, discovered_paths: List[str]):
        """Filter paths for interesting files, download them safely, analyze content, and broadcast results."""
        if not base_url.startswith("http"):
            base_url = f"https://{base_url}"

        # Clean target url base
        parsed = urlparse(base_url)
        clean_base = f"{parsed.scheme}://{parsed.netloc}"

        candidates = set()
        for p in discovered_paths:
            p_clean = p.strip().lstrip("/")
            for interest in INTERESTING_FILES:
                if interest.lower() in p_clean.lower():
                    candidates.add(interest)

        if not candidates:
            return

        # Prepare scan loot folders
        scan_loot_dir = os.path.join(LOOT_BASE_DIR, f"scan_{scan_id}")
        user_scan_loot_dir = os.path.join(USER_DOWNLOADS_DIR, f"scan_{scan_id}")
        os.makedirs(scan_loot_dir, exist_ok=True)
        try:
            os.makedirs(user_scan_loot_dir, exist_ok=True)
        except Exception:
            pass

        # Check if Tor is active to route downloader through SOCKS5
        from ..opsec import opsec_service
        is_tor = await opsec_service.is_tor_active()
        proxy_url = "socks5://127.0.0.1:9050" if is_tor else None

        async with httpx.AsyncClient(proxy=proxy_url, timeout=8.0, verify=False, follow_redirects=True) as client:
            for file_path in candidates:
                target_file_url = urljoin(clean_base + "/", file_path)
                try:
                    resp = await client.get(target_file_url)
                    if resp.status_code == 200 and resp.text:
                        content = resp.text
                        file_name = os.path.basename(file_path) or "downloaded_file.txt"

                        # 1. Save file locally
                        local_path = os.path.join(scan_loot_dir, file_name)
                        with open(local_path, "w", encoding="utf-8", errors="replace") as f:
                            f.write(content)

                        user_copy_path = os.path.join(user_scan_loot_dir, file_name)
                        try:
                            with open(user_copy_path, "w", encoding="utf-8", errors="replace") as f:
                                f.write(content)
                        except Exception:
                            pass

                        # 2. Analyze Content
                        analysis = self._analyze_file_content(file_name, content)

                        # 3. Broadcast to terminal stream
                        await self._broadcast_analysis(scan_id, file_name, user_copy_path, len(content), analysis)

                        # 4. Save vulnerability record if high-risk paths or leaks were found
                        if analysis.get("has_sensitive_findings"):
                            self._save_finding(scan_id, file_name, target_file_url, analysis)

                except Exception as e:
                    logger.debug(f"Failed to auto-download {target_file_url}: {e}")

    def _analyze_file_content(self, file_name: str, content: str) -> Dict[str, Any]:
        """Analyze file content based on type (robots.txt, security.txt, env, etc.)."""
        analysis = {
            "file_name": file_name,
            "has_sensitive_findings": False,
            "findings_summary": "",
            "items": [],
            "sensitive_items": []
        }

        # Case 1: robots.txt
        if "robots.txt" in file_name.lower():
            disallow_rules = []
            for line in content.splitlines():
                line = line.strip()
                if line.lower().startswith("disallow:"):
                    path = line.split(":", 1)[1].strip()
                    if path:
                        disallow_rules.append(path)

            analysis["items"] = disallow_rules
            sensitive = [p for p in disallow_rules if any(k in p.lower() for k in SENSITIVE_KEYWORDS)]
            analysis["sensitive_items"] = sensitive
            analysis["has_sensitive_findings"] = len(sensitive) > 0
            analysis["findings_summary"] = (
                f"Estratte {len(disallow_rules)} direttive Disallow. "
                f"{len(sensitive)} percorsi contengono parole chiave sensibili/amministrative."
            )

        # Case 2: security.txt
        elif "security.txt" in file_name.lower():
            contacts = [l for l in content.splitlines() if "contact:" in l.lower()]
            analysis["items"] = contacts
            analysis["findings_summary"] = f"Rilevato security.txt con {len(contacts)} canali di contatto ufficiali per vulnerabilità."

        # Case 3: .env or configuration leak
        elif ".env" in file_name.lower() or "config" in file_name.lower():
            leaks = [l for l in content.splitlines() if any(k in l.lower() for k in ["pass", "secret", "key", "token", "db_"])]
            analysis["items"] = leaks
            analysis["has_sensitive_findings"] = len(leaks) > 0
            analysis["findings_summary"] = f"⚠️ Rilevati {len(leaks)} potenziali parametri segreti/password nel file di configurazione!"

        else:
            analysis["findings_summary"] = f"File scaricato con successo ({len(content)} caratteri)."

        return analysis

    async def _broadcast_analysis(self, scan_id: int, file_name: str, file_path: str, size: int, analysis: Dict[str, Any]):
        """Render beautiful matrix terminal output for downloaded and analyzed file."""
        log_lines = [
            f"\n{'='*70}",
            f"📥 [AUTO-DOWNLOADER & FILE INSPECTOR] 📄 File Rilevato e Scaricato!",
            f"   ├─ 🌐 File: /{file_name} ({size} bytes)",
            f"   ├─ 💾 Salvato in: {file_path}",
            f"   ├─ 🔍 Analisi: {analysis.get('findings_summary', '')}",
        ]

        sensitive = analysis.get("sensitive_items", [])
        if sensitive:
            log_lines.append(f"   ├─ ⚠️ Percorsi Amministrativi / Nascosti Individuati:")
            for s in sensitive[:8]:
                log_lines.append(f"   │   • {s} [Critico / Disallow]")
        elif analysis.get("items"):
            log_lines.append(f"   ├─ 📋 Prime direttive estratte:")
            for item in analysis.get("items", [])[:6]:
                log_lines.append(f"   │   • {item}")

        log_lines.append(f"   └─ ✅ File archiviato e disponibile per la consultazione offline.")
        log_lines.append(f"{'='*70}\n")

        await manager.broadcast_terminal(scan_id, "\n".join(log_lines) + "\n")

    def _save_finding(self, scan_id: int, file_name: str, file_url: str, analysis: Dict[str, Any]):
        """Record finding in Vulnerability database table."""
        db = SessionLocal()
        try:
            sensitive = analysis.get("sensitive_items", [])
            desc = (
                f"Il file pubblico /{file_name} rivela percorsi amministrativi o protetti indicati nel Disallow: "
                f"{', '.join(sensitive[:6])}. Questi endpoint possono esporre pannelli di gestione o funzioni non protette."
            )
            vuln = Vulnerability(
                scan_id=scan_id,
                title=f"Esposizione Percorsi Sensibili in /{file_name}",
                severity="medium" if sensitive else "low",
                description=desc,
                endpoint=file_url,
                remediation="Verificare che i percorsi elencati in Disallow siano protetti da autenticazione forte e non accessibili ad utenti anonimi.",
                tool_found_by="Tornet File Inspector",
                status="open"
            )
            db.add(vuln)
            db.commit()
        except Exception as e:
            logger.debug(f"Failed to save inspector vuln: {e}")
        finally:
            db.close()


file_inspector = FileInspector()

