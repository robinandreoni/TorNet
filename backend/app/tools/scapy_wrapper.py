import socket
import time
import urllib.parse
from typing import List, Dict, Any
from .base import ToolWrapper

class ScapyWrapper(ToolWrapper):
    name = "scapy"
    display_name = "Network Packet & Port Prober"
    category = "Network Analysis"
    version = "2.5.0"
    description = "Native Python high-speed socket and SYN/TCP prober for low-level network verification"

    def _get_host(self, target: str) -> str:
        if "://" in target:
            parsed = urllib.parse.urlparse(target)
            return parsed.hostname or target
        return target.split("/")[0]

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        # Scapy can be called via python script or native module
        return ["python", "-c", f"print('Tornet native socket prober for {target}')"]

    async def run(self, target: str, scan_id: int, intensity: str = "medium", **kwargs) -> Dict[str, Any]:
        """Runs native high-speed TCP socket probing on critical ports."""
        from ..websocket.manager import manager
        host = self._get_host(target)
        await manager.broadcast_terminal(scan_id, f"[NETWORK PROBER] Initiating TCP audit on {host}...\n")
        
        common_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080, 8443, 27017]
        if intensity == "aggressive":
            common_ports.extend([8000, 8888, 9000, 9200, 9443, 10000, 50000])

        open_ports = []
        for port in common_ports:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.6 if intensity == "light" else 0.4)
                result = s.connect_ex((host, port))
                if result == 0:
                    open_ports.append(port)
                    await manager.broadcast_terminal(scan_id, f"[NETWORK PROBER] Port {port}/TCP is OPEN on {host}\n")
                s.close()
            except Exception:
                pass

        summary = f"Identified {len(open_ports)} responsive TCP services on {host}"
        await manager.broadcast_terminal(scan_id, f"[NETWORK PROBER] {summary}\n")

        raw_output = f"TCP Service Sweep on {host}\nOpen ports: {', '.join(map(str, open_ports))}\n"
        parsed = {
            "target": host,
            "open_ports": open_ports,
            "total_open": len(open_ports),
            "summary": summary
        }

        return {
            "tool_name": self.name,
            "display_name": self.display_name,
            "return_code": 0,
            "raw_output": raw_output,
            "parsed_data": parsed,
            "vulnerabilities": self.extract_vulnerabilities(parsed, raw_output, target)
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        open_ports = parsed_data.get("open_ports", [])
        host = self._get_host(target)

        if 3389 in open_ports:
            vulns.append({
                "title": "Remote Desktop Protocol (RDP) Service Exposed",
                "description": f"Port 3389 (RDP) is open on {host}, presenting potential brute force and BlueKeep risks.",
                "severity": "medium",
                "cvss_score": 6.5,
                "tool_found_by": "Network Prober",
                "endpoint": f"{host}:3389",
                "remediation": "Restrict RDP behind VPN or network firewall."
            })
        if 445 in open_ports:
            vulns.append({
                "title": "Direct SMB File Sharing Exposed to Network",
                "description": f"Port 445 (SMB) is active on {host}. SMB should never be exposed across public or untrusted boundaries.",
                "severity": "high",
                "cvss_score": 8.5,
                "tool_found_by": "Network Prober",
                "endpoint": f"{host}:445",
                "remediation": "Block inbound TCP port 445 on the boundary firewall."
            })
        return vulns
