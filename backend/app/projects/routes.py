import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from .models import Project, ProjectTarget
from ..scans.models import Scan, ActivityLog
from ..pipeline.engine import pipeline_engine

router = APIRouter(prefix="/projects", tags=["Multi-Target Projects"])

class TargetCreate(BaseModel):
    target: str
    target_type: str = "web"
    notes: Optional[str] = ""

class TargetResponse(BaseModel):
    id: int
    project_id: int
    target: str
    target_type: str
    notes: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    client_name: Optional[str] = "Internal Audit"
    initial_targets: Optional[List[TargetCreate]] = []

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    client_name: str
    created_at: datetime
    targets: List[TargetResponse] = []

    class Config:
        from_attributes = True

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(desc(Project.id)).all()

@router.post("", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    name_clean = data.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Project name is required")

    new_project = Project(
        name=name_clean,
        description=data.description or "",
        client_name=data.client_name or "Internal Audit",
        created_at=datetime.utcnow()
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    if data.initial_targets:
        for t in data.initial_targets:
            tgt_clean = t.target.strip()
            if tgt_clean:
                target_obj = ProjectTarget(
                    project_id=new_project.id,
                    target=tgt_clean,
                    target_type=t.target_type,
                    notes=t.notes or ""
                )
                db.add(target_obj)
        db.commit()
        db.refresh(new_project)

    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()
    return {"status": "deleted", "project_id": project_id}

@router.post("/{project_id}/targets", response_model=TargetResponse)
def add_target_to_project(project_id: int, target_in: TargetCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    target_clean = target_in.target.strip()
    if not target_clean:
        raise HTTPException(status_code=400, detail="Target value cannot be empty")

    new_target = ProjectTarget(
        project_id=project_id,
        target=target_clean,
        target_type=target_in.target_type,
        notes=target_in.notes or "",
        created_at=datetime.utcnow()
    )
    db.add(new_target)
    db.commit()
    db.refresh(new_target)
    return new_target

@router.delete("/{project_id}/targets/{target_id}")
def delete_project_target(project_id: int, target_id: int, db: Session = Depends(get_db)):
    tgt = db.query(ProjectTarget).filter(ProjectTarget.id == target_id, ProjectTarget.project_id == project_id).first()
    if not tgt:
        raise HTTPException(status_code=404, detail="Project target not found")
    db.delete(tgt)
    db.commit()
    return {"status": "deleted", "target_id": target_id}

@router.post("/{project_id}/scan-all")
async def scan_all_project_targets(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if not proj.targets:
        raise HTTPException(status_code=400, detail="Project has no targets configured")

    launched_scan_ids = []
    now = datetime.utcnow()

    for tgt in proj.targets:
        new_scan = Scan(
            target=tgt.target,
            target_type=tgt.target_type,
            scan_type="full_auto",
            intensity="medium",
            selected_tools="[]",
            status="queued",
            progress=0,
            current_tool="Project Batch Queue",
            start_time=now,
            stats=json.dumps({"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0})
        )
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)

        db.add(ActivityLog(
            scan_id=new_scan.id,
            level="INFO",
            message=f"Project batch scan '{proj.name}' launched for target {tgt.target} (Project #{proj.id})."
        ))
        db.commit()

        # Start execution in background
        await pipeline_engine.start_scan(new_scan.id)
        launched_scan_ids.append(new_scan.id)

    return {
        "status": "launched",
        "project_id": project_id,
        "total_targets": len(proj.targets),
        "scan_ids": launched_scan_ids
    }

