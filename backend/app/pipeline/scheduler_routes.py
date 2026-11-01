from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from .models import ScheduledScan
from .scheduler import scan_scheduler

router = APIRouter(prefix="/schedules", tags=["Scan Scheduling"])

class ScheduleCreate(BaseModel):
    name: str = "Automated Recurring Scan"
    target: str
    target_type: str = "web"
    scan_type: str = "full_auto"
    intensity: str = "medium"
    interval_hours: int = 24

class ScheduleResponse(BaseModel):
    id: int
    name: str
    target: str
    target_type: str
    scan_type: str
    intensity: str
    interval_hours: int
    is_active: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[ScheduleResponse])
def list_schedules(db: Session = Depends(get_db)):
    return db.query(ScheduledScan).order_by(desc(ScheduledScan.id)).all()

@router.post("", response_model=ScheduleResponse)
def create_schedule(sched_in: ScheduleCreate, db: Session = Depends(get_db)):
    target_clean = sched_in.target.strip()
    if not target_clean:
        raise HTTPException(status_code=400, detail="Target cannot be empty")

    now = datetime.utcnow()
    new_sched = ScheduledScan(
        name=sched_in.name.strip() or "Automated Recurring Scan",
        target=target_clean,
        target_type=sched_in.target_type,
        scan_type=sched_in.scan_type,
        intensity=sched_in.intensity,
        interval_hours=sched_in.interval_hours,
        is_active=True,
        last_run=None,
        next_run=now + timedelta(hours=sched_in.interval_hours),
        created_at=now
    )
    db.add(new_sched)
    db.commit()
    db.refresh(new_sched)
    return new_sched

@router.post("/{schedule_id}/toggle", response_model=ScheduleResponse)
def toggle_schedule(schedule_id: int, db: Session = Depends(get_db)):
    sched = db.query(ScheduledScan).filter(ScheduledScan.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    sched.is_active = not sched.is_active
    db.commit()
    db.refresh(sched)
    return sched

@router.post("/{schedule_id}/run-now")
async def trigger_schedule_now(schedule_id: int):
    scan_id = await scan_scheduler.trigger_now(schedule_id)
    if not scan_id:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"status": "triggered", "scan_id": scan_id}

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    sched = db.query(ScheduledScan).filter(ScheduledScan.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(sched)
    db.commit()
    return {"status": "deleted", "schedule_id": schedule_id}

