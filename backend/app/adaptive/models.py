from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TargetProfile(BaseModel):
    target: str
    ip: str = "Unknown"
    is_alive: bool = True
    web_server: str = "Unknown"
    os_hint: str = "Unknown"
    technologies: List[str] = Field(default_factory=list)
    waf_detected: bool = False
    waf_name: Optional[str] = None
    open_ports: List[int] = Field(default_factory=list)
    recommended_strategy: str = "balanced"  # stealth, balanced, aggressive
    strategy_reason: str = ""

class StrategyInfo(BaseModel):
    id: str
    name: str
    display_title: str
    tagline: str
    description: str
    tools: List[str]
    intensity: str
    parallel_workers: int
    stealth_rating: str  # "Alta (90%)", "Media (50%)", "Bassa (15%)"
    speed_rating: str    # "Moderata", "Rapida", "Massima"

class LaunchAdaptiveScanRequest(BaseModel):
    target: str
    strategy: str = "balanced"  # stealth, balanced, aggressive
    parallel: bool = True
