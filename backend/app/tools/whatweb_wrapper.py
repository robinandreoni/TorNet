import json
from typing import List, Dict, Any
from .base import ToolWrapper

class WhatWebWrapper(ToolWrapper):
    name = "whatweb"
    display_name = "WhatWeb Technology Identifier"
    category = "Reconnaissance"
    version = "0.5.5"
    description = "Recognises web technologies including CMS, blogging platforms, JavaScript libraries, and web servers"

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        # WhatWeb with JSON output
        level = "1" if intensity == "light" else ("3" if intensity == "aggressive" else "1")
        return ["whatweb", f"-a{level}", "--log-json=-", target]

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        tech_list = []
        try:
            # Extract JSON array slice safely even if Ruby logs an IOError or warning after/before
            start = raw_output.find("[")
            end = raw_output.rfind("]")
            if start != -1 and end != -1:
                json_str = raw_output[start:end+1]
                parsed = json.loads(json_str)
                if isinstance(parsed, list) and len(parsed) > 0:
                    plugins = parsed[0].get("plugins", {})
                    for p_name, p_data in plugins.items():
                        tech_list.append({
                            "name": p_name,
                            "string": p_data.get("string", []),
                            "version": p_data.get("version", [])
                        })
        except Exception:
            # Fallback text parsing
            pass

        return {
            "target": target,
            "technologies": tech_list,
            "total_technologies": len(tech_list),
            "summary": f"Detected {len(tech_list)} technologies on {target}"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        for t in parsed_data.get("technologies", []):
            name = t["name"].lower()
            if "php" in name:
                versions = t.get("version", [])
                if versions and any(v.startswith(("5.", "7.0", "7.1", "7.2")) for v in versions):
                    vulns.append({
                        "title": f"End-Of-Life PHP Runtime Detected ({versions[0]})",
                        "description": f"The target is running an obsolete and unsupported PHP version: {versions[0]}.",
                        "severity": "high",
                        "cvss_score": 7.5,
                        "tool_found_by": "WhatWeb",
                        "endpoint": target,
                        "remediation": "Upgrade immediately to PHP 8.2 or 8.3 with active security patches."
                    })
        return vulns
