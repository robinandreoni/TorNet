import json
from typing import List, Dict, Any
from .base import ToolWrapper

class HttpxWrapper(ToolWrapper):
    name = "httpx"
    display_name = "HTTPX Web Probe"
    category = "Reconnaissance"
    version = "1.6.0"
    description = "Fast and multi-purpose HTTP probe for probing status codes, titles, tech stacks, and CDN headers"

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        cmd = ["httpx", "-u", target, "-silent", "-tech-detect", "-status-code", "-title", "-json", "-no-stdin"]
        if intensity == "aggressive":
            cmd.extend(["-web-server", "-content-length", "-follow-redirects"])
        return cmd

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        results = []
        for line in raw_output.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                results.append(data)
            except json.JSONDecodeError:
                continue

        return {
            "target": target,
            "probed_endpoints": results,
            "total": len(results),
            "summary": f"Probed {len(results)} active HTTP endpoint(s)"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        for item in parsed_data.get("probed_endpoints", []):
            status_code = item.get("status_code", 0)
            technologies = item.get("tech", [])
            title = item.get("title", "")
            url = item.get("url", target)

            if status_code in (401, 403) and "admin" in url.lower():
                vulns.append({
                    "title": f"Restricted Admin Surface Discovered: {url}",
                    "description": f"HTTP {status_code} returned on administrative path. Title: {title}",
                    "severity": "low",
                    "cvss_score": 3.8,
                    "tool_found_by": "HTTPX",
                    "endpoint": url,
                    "remediation": "Restrict administrative panels by IP allowlist or VPN gateway."
                })
        return vulns
