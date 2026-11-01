import re
from typing import List, Dict, Any
from .base import ToolWrapper
from ..config import WORDLISTS_DIR

class GobusterWrapper(ToolWrapper):
    name = "gobuster"
    display_name = "Gobuster Directory Discovery"
    category = "Directory & Content Discovery"
    version = "3.6.0"
    description = "Fast URI directory and file brute-forcer written in Go"

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        # Path to wordlist
        default_wordlist = "/usr/share/wordlists/dirb/common.txt"
        # Calibrated thread count to protect Tor socket throughput and host RAM
        threads = "8" if intensity == "light" else ("20" if intensity == "aggressive" else "12")
        return [
            "gobuster", "dir", 
            "-u", target, 
            "-w", default_wordlist, 
            "-t", threads, 
            "--timeout", "6s",
            "-q", "--no-error"
        ]

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        endpoints = []
        for line in raw_output.splitlines():
            line = line.strip()
            # Gobuster output format: /admin (Status: 301) [Size: 178]
            match = re.search(r"(\S+)\s+\(Status:\s*(\d+)\)\s*(?:\[Size:\s*(\d+)\])?", line)
            if match:
                path, status, size = match.groups()
                endpoints.append({
                    "path": path,
                    "status_code": int(status),
                    "size": int(size) if size else 0
                })

        return {
            "target": target,
            "discovered_paths": endpoints,
            "total_found": len(endpoints),
            "summary": f"Discovered {len(endpoints)} hidden directory/file path(s)"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        for ep in parsed_data.get("discovered_paths", []):
            path = ep["path"].lower()
            code = ep["status_code"]
            if any(sensitive in path for sensitive in (".env", ".git", "wp-config", "backup", "db.sql", "id_rsa")):
                vulns.append({
                    "title": f"Critical Information Disclosure: Exposed {ep['path']}",
                    "description": f"Sensitive file or repository metadata publicly accessible (HTTP {code}).",
                    "severity": "critical",
                    "cvss_score": 9.1,
                    "tool_found_by": "Gobuster",
                    "endpoint": f"{target.rstrip('/')}{ep['path']}",
                    "remediation": "Block access to hidden files and backup archives in web server configuration."
                })
            elif any(admin_kw in path for admin_kw in ("admin", "dashboard", "portal", "login")) and code in (200, 301, 302):
                vulns.append({
                    "title": f"Administrative Portal Exposed: {ep['path']}",
                    "description": f"Login or management endpoint reachable at {ep['path']} (HTTP {code}).",
                    "severity": "low",
                    "cvss_score": 3.5,
                    "tool_found_by": "Gobuster",
                    "endpoint": f"{target.rstrip('/')}{ep['path']}",
                    "remediation": "Implement multi-factor authentication (MFA) and rate limiting on administration interfaces."
                })
        return vulns
