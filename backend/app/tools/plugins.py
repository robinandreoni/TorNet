import os
import json
import logging
from typing import List, Dict, Any, Optional
from .base import ToolWrapper

logger = logging.getLogger("tornet.tools.plugins")

PLUGINS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "plugins")

class PluginToolWrapper(ToolWrapper):
    """Dynamically configured tool wrapper created from a plugin manifest."""
    def __init__(self, manifest: Dict[str, Any]):
        super().__init__()
        self.manifest = manifest
        self.name = manifest.get("name", "custom_plugin")
        self.display_name = manifest.get("display_name", self.name.capitalize())
        self.category = manifest.get("category", "Custom Extensions")
        self.description = manifest.get("description", "Custom security plugin")
        self.version = manifest.get("version", "1.0.0")
        self.command_template = manifest.get("command_template", "{name} {target}")
        self.intensity_flags = manifest.get("intensity_flags", {
            "light": "-t 1",
            "medium": "-t 5",
            "aggressive": "-t 10"
        })
        self.vulnerability_keywords = manifest.get("vulnerability_keywords", ["vulnerable", "warning", "critical", "exposed"])

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        flags = self.intensity_flags.get(intensity, "")
        cmd_str = self.command_template.replace("{target}", target).replace("{intensity_flags}", flags).replace("{name}", self.name)
        return cmd_str.split()

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        matched_lines = []
        for line in raw_output.splitlines():
            line_str = line.strip()
            if any(k.lower() in line_str.lower() for k in self.vulnerability_keywords):
                matched_lines.append(line_str)

        return {
            "target": target,
            "matched_count": len(matched_lines),
            "matched_lines": matched_lines[:20],
            "raw_length": len(raw_output),
            "summary": f"{self.display_name} executed on {target}. Identified {len(matched_lines)} relevant indicators."
        }

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        vulns = []
        matched_lines = parsed_data.get("matched_lines", [])

        if matched_lines:
            sample_desc = " | ".join(matched_lines[:3])
            vulns.append({
                "title": f"{self.display_name}: Security Finding on {target}",
                "description": f"Plugin identified anomalous signatures: {sample_desc}",
                "severity": "medium",
                "cvss_score": 5.5,
                "tool_found_by": self.display_name,
                "endpoint": target,
                "remediation": f"Review output from {self.display_name} and apply application hardening."
            })

        return vulns


class PluginManager:
    def __init__(self):
        os.makedirs(PLUGINS_DIR, exist_ok=True)
        self._ensure_sample_plugins()

    def _ensure_sample_plugins(self):
        # Create built-in sample plugin manifests if directory is empty
        sample_path = os.path.join(PLUGINS_DIR, "ffuf_plugin.json")
        if not os.path.exists(sample_path):
            sample_manifest = {
                "id": "ffuf_fuzzer",
                "name": "ffuf",
                "display_name": "FFUF Web Fuzzer",
                "category": "Directory & Content Discovery",
                "description": "Fast web fuzzer written in Go for directory, parameter and virtual host discovery",
                "version": "2.1.0",
                "command_template": "ffuf -u {target}/FUZZ -w F:\\Tornet\\backend\\wordlists\\directories.txt -mc 200,301,302 {intensity_flags}",
                "intensity_flags": {
                    "light": "-rate 50",
                    "medium": "-rate 150",
                    "aggressive": "-rate 500"
                },
                "vulnerability_keywords": ["Status: 200", "Status: 301", "admin", "login", "config"],
                "enabled": True
            }
            try:
                with open(sample_path, "w", encoding="utf-8") as f:
                    json.dump(sample_manifest, f, indent=2)
            except Exception as e:
                logger.error(f"Error creating sample plugin: {e}")

    def list_plugins(self) -> List[Dict[str, Any]]:
        plugins = []
        if not os.path.exists(PLUGINS_DIR):
            return plugins

        for fname in os.listdir(PLUGINS_DIR):
            if fname.endswith(".json"):
                fpath = os.path.join(PLUGINS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        manifest = json.load(f)
                        manifest["filename"] = fname
                        plugins.append(manifest)
                except Exception as e:
                    logger.warning(f"Failed to load plugin manifest {fname}: {e}")
        return plugins

    def get_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        for p in self.list_plugins():
            if p.get("id") == plugin_id or p.get("name") == plugin_id:
                return p
        return None

    def register_plugin(self, manifest: Dict[str, Any]) -> Dict[str, Any]:
        p_id = manifest.get("id", manifest.get("name", "custom_tool")).lower().strip().replace(" ", "_")
        manifest["id"] = p_id
        manifest["enabled"] = manifest.get("enabled", True)
        fpath = os.path.join(PLUGINS_DIR, f"{p_id}.json")
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        return manifest

    def delete_plugin(self, plugin_id: str) -> bool:
        for p in self.list_plugins():
            if p.get("id") == plugin_id or p.get("name") == plugin_id:
                fname = p.get("filename")
                if fname:
                    fpath = os.path.join(PLUGINS_DIR, fname)
                    if os.path.exists(fpath):
                        os.remove(fpath)
                        return True
        return False

    def toggle_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        p = self.get_plugin(plugin_id)
        if not p:
            return None
        p["enabled"] = not p.get("enabled", True)
        fpath = os.path.join(PLUGINS_DIR, p["filename"])
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(p, f, indent=2)
        return p

plugin_manager = PluginManager()

