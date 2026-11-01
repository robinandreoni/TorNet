import json
import re
from typing import List, Dict, Any
from .base import ToolWrapper

class NucleiWrapper(ToolWrapper):
    name = "nuclei"
    display_name = "Nuclei Template Scanner"
    category = "Vulnerability Scanning"
    version = "3.2.0"
    description = "Fast and customizable vulnerability scanner based on simple YAML templates"

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        # Nuclei supports JSONL output (-jsonl) with concurrency and timeout calibrated for Tor
        cmd = ["nuclei", "-u", target, "-jsonl", "-silent", "-no-stdin", "-c", "15", "-timeout", "5"]
        if intensity == "light":
            cmd.extend(["-severity", "critical,high"])
        elif intensity == "aggressive":
            cmd.extend(["-severity", "critical,high,medium", "-tags", "cve,misconfig,exposure,tech"])
        else:
            cmd.extend(["-severity", "critical,high"])
        return cmd

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        findings = []
        for line in raw_output.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                findings.append(data)
            except json.JSONDecodeError:
                # Regular text line or banner
                continue

        return {
            "target": target,
            "total_findings": len(findings),
            "findings": findings,
            "summary": f"Nuclei discovered {len(findings)} finding(s) on {target}"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        findings = parsed_data.get("findings", [])

        severity_scores = {
            "critical": 9.5,
            "high": 8.0,
            "medium": 5.5,
            "low": 3.0,
            "info": 1.0
        }

        for f in findings:
            info = f.get("info", {})
            severity = info.get("severity", "medium").lower()
            name = info.get("name", f.get("template-id", "Unknown finding"))
            desc = info.get("description", "No description provided.")
            remediation = info.get("remediation", "Review vendor documentation and update software.")
            cve_id = None
            if "classification" in info and "cve-id" in info["classification"]:
                cves = info["classification"]["cve-id"]
                if isinstance(cves, list) and cves:
                    cve_id = cves[0]
                elif isinstance(cves, str):
                    cve_id = cves

            vulns.append({
                "title": name,
                "description": desc,
                "severity": severity,
                "cvss_score": severity_scores.get(severity, 5.0),
                "cve_id": cve_id,
                "tool_found_by": "Nuclei",
                "endpoint": f.get("matched-at", target),
                "remediation": remediation
            })

        return vulns
