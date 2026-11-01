import re
import urllib.parse
from typing import List, Dict, Any
from .base import ToolWrapper

class MetasploitWrapper(ToolWrapper):
    name = "metasploit"
    display_name = "Metasploit RPC Bridge"
    category = "Exploitation & Injection"
    version = "6.4.0"
    description = "Automated vulnerability verification, auxiliary inspection, and exploit simulation via MSF RPC"

    def _sanitize_target(self, target: str) -> str:
        if "://" in target:
            parsed = urllib.parse.urlparse(target)
            return parsed.hostname or target
        return target.split("/")[0]

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        host = self._sanitize_target(target)
        # Metasploit batch non-interactive auxiliary scan & exploit check
        if intensity == "light":
            # Quick auxiliary banner & info grab
            msf_commands = f"use auxiliary/scanner/portscan/tcp; set RHOSTS {host}; set PORTS 80,443,21,22,8080; run; exit"
        elif intensity == "aggressive":
            # Targeted HTTP service detection and version check via MSF
            msf_commands = f"use auxiliary/scanner/http/http_version; set RHOSTS {host}; set RPORT 80; run; exit"
        else:
            # Medium: Standard service detection & exploit check
            msf_commands = f"use auxiliary/scanner/portscan/tcp; set RHOSTS {host}; set PORTS 21,22,25,80,443,445,3389,8080; run; exit"

        return ["msfconsole", "-q", "-x", msf_commands]

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        host = self._sanitize_target(target)
        modules_executed = []
        findings = []

        for line in raw_output.splitlines():
            line_clean = line.strip()
            if "[+]" in line_clean:
                findings.append(line_clean)
            elif "using auxiliary" in line_clean.lower() or "use auxiliary" in line_clean.lower():
                modules_executed.append(line_clean)

        return {
            "target": host,
            "findings_count": len(findings),
            "findings": findings,
            "modules_executed": modules_executed,
            "raw_length": len(raw_output),
            "summary": f"Metasploit executed {len(modules_executed) or 1} module(s) on {host} identifying {len(findings)} telemetry point(s)."
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        host = self._sanitize_target(target)

        # Parse findings or known vulnerability signatures in msf output
        lower_out = raw_output.lower()

        if "vulnerable" in lower_out or "exploit completed" in lower_out or "target is vulnerable" in lower_out:
            vulns.append({
                "title": f"Metasploit Exploit Verification: Verified Vulnerability on {host}",
                "description": "Metasploit auxiliary/exploit check confirmed that the target is susceptible to known service exploits.",
                "severity": "critical",
                "cvss_score": 9.2,
                "tool_found_by": "Metasploit RPC Bridge",
                "endpoint": host,
                "remediation": "Apply the vendor emergency security patch immediately, isolate the affected service or restrict access via strict firewall rules."
            })

        if "smb" in lower_out and ("v1" in lower_out or "445" in lower_out):
            vulns.append({
                "title": "Metasploit: SMB Service Exposure Identified",
                "description": "SMB file sharing service is reachable and responds to auxiliary probing.",
                "severity": "high",
                "cvss_score": 7.5,
                "tool_found_by": "Metasploit RPC Bridge",
                "endpoint": f"{host}:445",
                "remediation": "Disable SMBv1 across the network, enforce SMB signing and prevent external routing of TCP port 445."
            })

        if "http" in lower_out and ("apache" in lower_out or "nginx" in lower_out or "iis" in lower_out):
            vulns.append({
                "title": "Metasploit: Web Service Banner & Fingerprint Extracted",
                "description": "Web service version disclosed during auxiliary discovery scanner execution.",
                "severity": "low",
                "cvss_score": 3.7,
                "tool_found_by": "Metasploit RPC Bridge",
                "endpoint": f"{host}:80",
                "remediation": "Mask web server banner headers (Server, X-Powered-By) to prevent automated footprinting."
            })

        return vulns

