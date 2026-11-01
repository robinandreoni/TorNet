import re
from typing import List, Dict, Any
from .base import ToolWrapper

class SqlmapWrapper(ToolWrapper):
    name = "sqlmap"
    display_name = "SQLMap SQL Injection Auditor"
    category = "Exploitation & Injection"
    version = "1.8.0"
    description = "Automatic SQL injection detection and database fingerprinting tool"

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        # Non-interactive batch mode with timeout protection
        cmd = ["sqlmap", "-u", target, "--batch", "--random-agent", "--forms", "--timeout=8", "--retries=1"]
        if intensity == "light":
            cmd.extend(["--level=1", "--risk=1", "--threads=1"])
        elif intensity == "aggressive":
            cmd.extend(["--level=2", "--risk=2", "--threads=2"])
        else:
            cmd.extend(["--level=1", "--risk=1", "--threads=2"])
        return cmd

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        is_vulnerable = False
        dbms = "Unknown"
        injection_types = []

        if "is vulnerable" in raw_output or "sqlmap identified the following injection points" in raw_output:
            is_vulnerable = True

        dbms_match = re.search(r"back-end DBMS:\s*(.*)", raw_output, re.IGNORECASE)
        if dbms_match:
            dbms = dbms_match.group(1).strip()

        type_matches = re.findall(r"Type:\s*(.*)", raw_output)
        if type_matches:
            injection_types = [t.strip() for t in type_matches]

        return {
            "target": target,
            "is_vulnerable": is_vulnerable,
            "back_end_dbms": dbms,
            "injection_types": injection_types,
            "summary": f"Target {'IS VULNERABLE' if is_vulnerable else 'is not vulnerable'} to SQL Injection ({dbms})"
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        if parsed_data.get("is_vulnerable"):
            types_str = ", ".join(parsed_data.get("injection_types", [])) or "Boolean/Error/Time-based"
            dbms = parsed_data.get("back_end_dbms", "Unknown")
            vulns.append({
                "title": f"Critical SQL Injection Discovered ({dbms})",
                "description": f"SQLMap verified executable SQL injection point. Technique(s): {types_str}. Back-end database: {dbms}.",
                "severity": "critical",
                "cvss_score": 9.8,
                "tool_found_by": "SQLMap",
                "endpoint": target,
                "remediation": "Use parameterized queries (Prepared Statements) with PDO or ORM. Never concatenate unescaped user input into SQL queries."
            })
        return vulns
