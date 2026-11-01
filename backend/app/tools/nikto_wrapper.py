import re
from typing import List, Dict, Any
from .base import ToolWrapper

class NiktoWrapper(ToolWrapper):
    name = "nikto"
    display_name = "Nikto Web Server Scanner"
    category = "Vulnerability Scanning"
    version = "2.5.0"
    description = "Web server scanner that tests for dangerous files, outdated server software, and security misconfigurations"

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        # Nikto command line with maxtime safeguard to prevent hangs
        cmd = ["nikto", "-h", target, "-maxtime", "90s", "-Tuning"]
        if intensity == "light":
            cmd.append("1,2,3")
        elif intensity == "aggressive":
            cmd.append("1,2,3,4,8")
        else:
            cmd.append("1,2,3")
        return cmd

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        findings = []
        for line in raw_output.splitlines():
            line = line.strip()
            if line.startswith("+"):
                # Clean up bullet
                finding_text = line.lstrip("+ ").strip()
                if not finding_text.startswith("Target") and not finding_text.startswith("Start Time"):
                    findings.append(finding_text)

        return {
            "target": target,
            "total_items": len(findings),
            "findings": findings,
            "summary": f"Nikto identified {len(findings)} potential security item(s) on {target}"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        findings = parsed_data.get("findings", [])

        for item in findings:
            item_lower = item.lower()
            severity = "info"
            cvss = 2.0
            remediation = "Consult web server security hardening guide."

            if "vulnerable" in item_lower or "exploit" in item_lower or "remote code" in item_lower:
                severity = "high"
                cvss = 8.2
                remediation = "Update web server software and patch known vulnerabilities immediately."
            elif "x-frame-options" in item_lower or "clickjacking" in item_lower:
                severity = "low"
                cvss = 3.5
                remediation = "Add 'X-Frame-Options: DENY' or 'Content-Security-Policy: frame-ancestors none' response headers."
            elif "directory indexing" in item_lower or "retrieved" in item_lower:
                severity = "medium"
                cvss = 5.0
                remediation = "Disable directory browsing (Options -Indexes in Apache or DirectoryBrowse in IIS)."
            elif "outdated" in item_lower or "eol" in item_lower:
                severity = "medium"
                cvss = 6.0
                remediation = "Upgrade to the latest supported release."

            # Exclude purely informational banners
            if "server:" in item_lower and len(findings) > 5:
                continue

            vulns.append({
                "title": f"Web Server Finding: {item[:60]}...",
                "description": item,
                "severity": severity,
                "cvss_score": cvss,
                "tool_found_by": "Nikto",
                "endpoint": target,
                "remediation": remediation
            })

        return vulns
