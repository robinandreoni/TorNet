import re
import urllib.parse
from typing import List, Dict, Any
from .base import ToolWrapper

class NmapWrapper(ToolWrapper):
    name = "nmap"
    display_name = "Nmap Network Scanner"
    category = "Reconnaissance"
    version = "7.94"
    description = "Port scanning, service version detection, OS fingerprinting and NSE vulnerability scripts"

    def _sanitize_target(self, target: str) -> str:
        """Strip http/https schemes and paths for network scanning."""
        if "://" in target:
            parsed = urllib.parse.urlparse(target)
            return parsed.hostname or target
        return target.split("/")[0]

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        host = self._sanitize_target(target)
        # -Pn is mandatory when scanning through Tor/proxies and cloud load balancers that drop ICMP ping
        if intensity == "light":
            return ["nmap", "-Pn", "-sT", "-T4", "--top-ports", "50", "--host-timeout", "45s", host]
        elif intensity == "aggressive":
            return ["nmap", "-Pn", "-sT", "-T4", "--top-ports", "100", "-sV", "--version-light", "--script", "vulners,http-title,banner", "--host-timeout", "90s", host]
        else:
            return ["nmap", "-Pn", "-sT", "-T4", "--top-ports", "100", "-sV", "--version-light", "--host-timeout", "60s", host]

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        open_ports = []
        port_pattern = re.compile(r"(\d+)/(tcp|udp)\s+(\w+)\s+([\w\-\?]+)\s*(.*)")
        
        for line in raw_output.splitlines():
            match = port_pattern.search(line)
            if match:
                port, proto, state, service, version = match.groups()
                open_ports.append({
                    "port": int(port),
                    "protocol": proto,
                    "state": state,
                    "service": service,
                    "version": version.strip()
                })

        return {
            "target": self._sanitize_target(target),
            "open_ports": open_ports,
            "total_open": len(open_ports),
            "summary": f"Detected {len(open_ports)} open port(s) on {target}"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        host = self._sanitize_target(target)
        open_ports = parsed_data.get("open_ports", [])

        # Check for plain-text / insecure services
        for p in open_ports:
            port = p["port"]
            service = p["service"].lower()
            if port == 21 or "ftp" in service:
                vulns.append({
                    "title": f"Insecure Service: FTP on port {port}",
                    "description": f"FTP transmits credentials in plaintext: {p.get('version', '')}",
                    "severity": "medium",
                    "cvss_score": 5.3,
                    "tool_found_by": "Nmap",
                    "endpoint": f"{host}:{port}",
                    "remediation": "Disable plain FTP and upgrade to SFTP or FTPS with TLS encryption."
                })
            elif port == 23 or "telnet" in service:
                vulns.append({
                    "title": f"Critical Plaintext Protocol: Telnet on port {port}",
                    "description": "Telnet communicates in unencrypted cleartext across the network.",
                    "severity": "high",
                    "cvss_score": 7.5,
                    "tool_found_by": "Nmap",
                    "endpoint": f"{host}:{port}",
                    "remediation": "Decommission Telnet immediately and migrate all remote administration to SSH."
                })

        # Check for NSE vuln indicators in raw output
        if "VULNERABLE:" in raw_output:
            vuln_matches = re.findall(r"VULNERABLE:\s*(.*?)(?=\n)", raw_output)
            for vm in vuln_matches:
                vulns.append({
                    "title": f"NSE Vulnerability: {vm.strip()}",
                    "description": f"Nmap NSE script identified security vulnerability: {vm.strip()}",
                    "severity": "high",
                    "cvss_score": 8.0,
                    "tool_found_by": "Nmap NSE",
                    "endpoint": host,
                    "remediation": "Apply the vendor security patch or upgrade the vulnerable software component."
                })

        return vulns
