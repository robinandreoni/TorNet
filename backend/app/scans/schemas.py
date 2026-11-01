from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ScanCreate(BaseModel):
    target: str
    target_type: Optional[str] = "web"
    scan_type: Optional[str] = "full_auto"
    intensity: Optional[str] = "medium"
    selected_tools: Optional[List[str]] = []

class VulnerabilityBase(BaseModel):
    title: str
    description: Optional[str] = ""
    severity: str = "medium"
    cvss_score: Optional[float] = 5.0
    cve_id: Optional[str] = None
    tool_found_by: Optional[str] = "Tornet"
    endpoint: Optional[str] = ""
    remediation: Optional[str] = ""
    status: Optional[str] = "open"

class VulnerabilityResponse(VulnerabilityBase):
    id: int
    scan_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ResultResponse(BaseModel):
    id: int
    scan_id: int
    tool_name: str
    status: str
    raw_output: str
    parsed_data: str
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityLogResponse(BaseModel):
    id: int
    scan_id: Optional[int] = None
    level: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ScanResponse(BaseModel):
    id: int
    target: str
    target_type: str
    scan_type: str
    intensity: str
    selected_tools: str
    status: str
    progress: int
    current_tool: str
    start_time: datetime
    end_time: Optional[datetime] = None
    stats: str

    class Config:
        from_attributes = True

class ScanDetailResponse(ScanResponse):
    vulnerabilities: List[VulnerabilityResponse] = []
    results: List[ResultResponse] = []
    logs: List[ActivityLogResponse] = []

    class Config:
        from_attributes = True

class SystemStats(BaseModel):
    critical_vulns: int
    active_scans: int
    assets_tested: int
    success_rate: float
    total_scans: int
    severity_distribution: Dict[str, int]
    recent_activity: List[ActivityLogResponse]
