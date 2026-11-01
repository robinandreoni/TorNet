import urllib.parse
from typing import List, Dict, Any
from .base import ToolWrapper

class SubfinderWrapper(ToolWrapper):
    name = "subfinder"
    display_name = "Subfinder Subdomain Discovery"
    category = "Reconnaissance"
    version = "2.6.5"
    description = "Fast passive subdomain discovery tool that searches multiple OSINT sources"

    def _get_domain(self, target: str) -> str:
        if "://" in target:
            parsed = urllib.parse.urlparse(target)
            return parsed.hostname or target
        return target.split("/")[0]

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        domain = self._get_domain(target)
        cmd = ["subfinder", "-d", domain, "-silent"]
        if intensity == "aggressive":
            cmd.extend(["-all"])
        return cmd

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        subdomains = []
        for line in raw_output.splitlines():
            s = line.strip()
            if s and not s.startswith("[") and "." in s:
                subdomains.append(s)

        return {
            "domain": self._get_domain(target),
            "subdomains": subdomains,
            "total_found": len(subdomains),
            "summary": f"Discovered {len(subdomains)} subdomain(s) for {target}"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        # Informational asset discovery
        vulns = []
        subs = parsed_data.get("subdomains", [])
        if subs:
            vulns.append({
                "title": f"Subdomain Asset Discovery ({len(subs)} endpoints)",
                "description": f"Found subdomains: {', '.join(subs[:8])}{' ...' if len(subs) > 8 else ''}",
                "severity": "info",
                "cvss_score": 1.0,
                "tool_found_by": "Subfinder",
                "endpoint": target,
                "remediation": "Audit public DNS records and ensure all exposed subdomains have active security controls."
            })
        return vulns
