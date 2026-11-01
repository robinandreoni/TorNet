from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..database import get_db
from ..scans.models import Scan, Vulnerability
from .assistant import ai_assistant

router = APIRouter(prefix="/ai", tags=["AI Security Assistant"])

class AIQueryRequest(BaseModel):
    scan_id: Optional[int] = None
    prompt: str

@router.get("/analyze/{scan_id}")
def analyze_scan_ai(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).all()
    vuln_dicts = [
        {
            "id": v.id,
            "title": v.title,
            "description": v.description,
            "severity": v.severity,
            "cvss_score": v.cvss_score,
            "endpoint": v.endpoint,
            "tool_found_by": v.tool_found_by,
            "remediation": v.remediation
        }
        for v in vulns
    ]

    scan_data = {
        "id": scan.id,
        "target": scan.target,
        "scan_type": scan.scan_type,
        "status": scan.status
    }

    analysis = ai_assistant.analyze_scan(scan_data, vuln_dicts)
    return analysis

@router.post("/query")
def query_ai_assistant(req: AIQueryRequest, db: Session = Depends(get_db)):
    prompt_clean = req.prompt.strip()
    if not prompt_clean:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    scan_data = None
    vuln_dicts = []

    if req.scan_id:
        scan = db.query(Scan).filter(Scan.id == req.scan_id).first()
        if scan:
            scan_data = {
                "id": scan.id,
                "target": scan.target,
                "scan_type": scan.scan_type,
                "status": scan.status
            }
            vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == req.scan_id).all()
            vuln_dicts = [
                {
                    "id": v.id,
                    "title": v.title,
                    "severity": v.severity,
                    "tool_found_by": v.tool_found_by,
                    "endpoint": v.endpoint
                }
                for v in vulns
            ]

    answer = ai_assistant.ask_advisor(prompt_clean, scan_data, vuln_dicts)
    return answer

