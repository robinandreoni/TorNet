import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from .models import Scan, Result, Vulnerability, ActivityLog
from .schemas import (
    ScanCreate, ScanResponse, ScanDetailResponse, 
    VulnerabilityResponse, ResultResponse, SystemStats, ActivityLogResponse
)
from ..pipeline.engine import pipeline_engine
from ..tools.registry import list_all_tools

router = APIRouter(prefix="", tags=["Scans & Telemetry"])

@router.get("/stats", response_model=SystemStats)
def get_system_stats(db: Session = Depends(get_db)):
    total_scans = db.query(Scan).count()
    active_scans = db.query(Scan).filter(Scan.status == "running").count()
    completed_scans = db.query(Scan).filter(Scan.status == "completed").count()

    # Unique targets tested
    distinct_targets = db.query(Scan.target).distinct().count()

    # Vulnerability counts
    vulns = db.query(Vulnerability).all()
    critical_count = sum(1 for v in vulns if v.severity.lower() == "critical")
    high_count = sum(1 for v in vulns if v.severity.lower() == "high")
    medium_count = sum(1 for v in vulns if v.severity.lower() == "medium")
    low_count = sum(1 for v in vulns if v.severity.lower() == "low")
    info_count = sum(1 for v in vulns if v.severity.lower() == "info")

    success_rate = (completed_scans / total_scans * 100.0) if total_scans > 0 else 100.0

    recent_logs = db.query(ActivityLog).order_by(desc(ActivityLog.timestamp)).limit(10).all()

    return {
        "critical_vulns": critical_count,
        "active_scans": active_scans,
        "assets_tested": distinct_targets,
        "success_rate": round(success_rate, 1),
        "total_scans": total_scans,
        "severity_distribution": {
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count,
            "low": low_count,
            "info": info_count
        },
        "recent_activity": recent_logs
    }

@router.get("/tools")
def get_tools_catalog():
    return list_all_tools()

@router.post("/scans", response_model=ScanResponse)
async def create_scan(scan_in: ScanCreate, db: Session = Depends(get_db)):
    target_clean = scan_in.target.strip()
    if not target_clean:
        raise HTTPException(status_code=400, detail="Target cannot be empty")

    new_scan = Scan(
        target=target_clean,
        target_type=scan_in.target_type or "web",
        scan_type=scan_in.scan_type or "full_auto",
        intensity=scan_in.intensity or "medium",
        selected_tools=json.dumps(scan_in.selected_tools or []),
        status="queued",
        progress=0,
        current_tool="Queued",
        start_time=datetime.utcnow(),
        stats=json.dumps({"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0})
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    # Trigger background pipeline execution
    await pipeline_engine.start_scan(new_scan.id)

    return new_scan

@router.get("/scans", response_model=List[ScanResponse])
def list_scans(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(Scan).order_by(desc(Scan.id))
    if status_filter:
        query = query.filter(Scan.status == status_filter)
    return query.limit(100).all()

@router.get("/scans/{scan_id}", response_model=ScanDetailResponse)
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.post("/scans/{scan_id}/stop")
async def stop_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    await pipeline_engine.stop_scan(scan_id)
    return {"status": "stopping", "message": f"Scan #{scan_id} stop sequence requested"}

@router.delete("/scans/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    db.delete(scan)
    db.commit()
    return {"status": "deleted", "scan_id": scan_id}

@router.get("/scans/{scan_id}/results", response_model=List[ResultResponse])
def get_scan_results(scan_id: int, db: Session = Depends(get_db)):
    results = db.query(Result).filter(Result.scan_id == scan_id).order_by(Result.id).all()
    return results

@router.get("/vulnerabilities", response_model=List[VulnerabilityResponse])
def list_all_vulnerabilities(
    severity: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Vulnerability).order_by(desc(Vulnerability.id))
    if severity:
        query = query.filter(Vulnerability.severity == severity.lower())
    return query.limit(limit).all()
