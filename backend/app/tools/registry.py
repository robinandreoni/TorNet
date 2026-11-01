from typing import Dict, Type, List, Any
from .base import ToolWrapper
from .nmap_wrapper import NmapWrapper
from .nuclei_wrapper import NucleiWrapper
from .nikto_wrapper import NiktoWrapper
from .sqlmap_wrapper import SqlmapWrapper
from .subfinder_wrapper import SubfinderWrapper
from .httpx_wrapper import HttpxWrapper
from .whatweb_wrapper import WhatWebWrapper
from .gobuster_wrapper import GobusterWrapper
from .scapy_wrapper import ScapyWrapper
from .metasploit_wrapper import MetasploitWrapper
from .plugins import plugin_manager, PluginToolWrapper

# Generic fallback wrapper for additional tools
class GenericToolWrapper(ToolWrapper):
    def __init__(self, name: str, display_name: str, category: str, description: str, version: str = "1.0.0"):
        super().__init__()
        self.name = name
        self.display_name = display_name
        self.category = category
        self.description = description
        self.version = version

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        return [self.name, target]

# Pre-defined registry of all 16 tools from Master Plan
TOOL_CLASSES: Dict[str, Type[ToolWrapper]] = {
    "nmap": NmapWrapper,
    "nuclei": NucleiWrapper,
    "nikto": NiktoWrapper,
    "sqlmap": SqlmapWrapper,
    "subfinder": SubfinderWrapper,
    "httpx": HttpxWrapper,
    "whatweb": WhatWebWrapper,
    "gobuster": GobusterWrapper,
    "scapy": ScapyWrapper,
    "metasploit": MetasploitWrapper,
}

ADDITIONAL_TOOLS = [
    {
        "name": "xsstrike",
        "display_name": "XSStrike XSS Suite",
        "category": "Exploitation & Injection",
        "description": "Advanced XSS detection suite with intelligent payload generation and WAF evasion",
        "version": "3.1.5"
    },
    {
        "name": "theharvester",
        "display_name": "theHarvester OSINT",
        "category": "Reconnaissance",
        "description": "Gather emails, subdomains, hosts, employee names, open ports, and banners from public OSINT sources",
        "version": "4.6.0"
    },
    {
        "name": "amass",
        "display_name": "OWASP Amass",
        "category": "Reconnaissance",
        "description": "In-depth attack surface mapping and external asset discovery",
        "version": "4.2.0"
    },
    {
        "name": "hydra",
        "display_name": "THC Hydra Auth Tester",
        "category": "Brute Force & Auth Testing",
        "description": "Very fast network logon cracker supporting numerous different services",
        "version": "9.5"
    },
    {
        "name": "zap",
        "display_name": "OWASP ZAP Core",
        "category": "Vulnerability Scanning",
        "description": "Integrated penetration testing tool for finding vulnerabilities in web applications",
        "version": "2.14.0"
    },
    {
        "name": "feroxbuster",
        "display_name": "Feroxbuster Recursive",
        "category": "Directory & Content Discovery",
        "description": "Fast, simple, recursive content discovery tool written in Rust",
        "version": "2.10.2"
    }
]

def get_tool_instance(tool_name: str) -> ToolWrapper:
    key = tool_name.lower().strip()
    if key in TOOL_CLASSES:
        return TOOL_CLASSES[key]()
    
    # Check custom plugins
    plugin = plugin_manager.get_plugin(key)
    if plugin and plugin.get("enabled", True):
        return PluginToolWrapper(plugin)

    for item in ADDITIONAL_TOOLS:
        if item["name"] == key:
            return GenericToolWrapper(**item)
    return GenericToolWrapper(
        name=key,
        display_name=key.capitalize(),
        category="Custom Tools",
        description="Custom security tool execution module"
    )

def list_all_tools() -> List[Dict[str, Any]]:
    tools = []
    # Registered classes
    for key, cls in TOOL_CLASSES.items():
        inst = cls()
        info = inst.check_availability()
        info.update({
            "version": inst.version,
            "category": inst.category,
            "description": inst.description
        })
        tools.append(info)
    
    # Additional tools
    for item in ADDITIONAL_TOOLS:
        inst = GenericToolWrapper(**item)
        info = inst.check_availability()
        info.update({
            "version": inst.version,
            "category": inst.category,
            "description": inst.description
        })
        tools.append(info)

    # Installed custom plugins
    for plugin in plugin_manager.list_plugins():
        inst = PluginToolWrapper(plugin)
        info = inst.check_availability()
        info.update({
            "version": inst.version,
            "category": inst.category,
            "description": inst.description,
            "is_plugin": True,
            "enabled": plugin.get("enabled", True),
            "id": plugin.get("id", plugin.get("name"))
        })
        tools.append(info)
    
    return tools
