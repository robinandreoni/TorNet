import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from ..database import SessionLocal
from .models import ScheduledScan
from ..scans.models import Scan, ActivityLog
from .engine import pipeline_engine

logger = logging.getLogger("tornet.pipeline.scheduler")

class ScanScheduler:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("TORNET Scan Scheduler background daemon started.")

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            logger.info("TORNET Scan Scheduler background daemon stopped.")

    async def _loop(self):
        while self._running:
            try:
                await self.check_and_trigger_schedules()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error checking scheduled scans: {e}")
            await asyncio.sleep(30)

    async def check_and_trigger_schedules(self):
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            due_schedules = db.query(ScheduledScan).filter(
                ScheduledScan.is_active == True,
                ScheduledScan.next_run <= now
            ).all()

            for sched in due_schedules:
                logger.info(f"Triggering scheduled scan #{sched.id}: {sched.name} ({sched.target})")
                
                # Create scan
                new_scan = Scan(
                    target=sched.target,
                    target_type=sched.target_type,
                    scan_type=sched.scan_type,
                    intensity=sched.intensity,
                    selected_tools="[]",
                    status="queued",
                    progress=0,
                    current_tool="Scheduled Trigger",
                    start_time=now,
                    stats='{"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}'
                )
                db.add(new_scan)
                db.commit()
                db.refresh(new_scan)

                # Log
                db.add(ActivityLog(
                    scan_id=new_scan.id,
                    level="INFO",
                    message=f"Recurring scan '{sched.name}' automatically triggered for target {sched.target} (Schedule #{sched.id})."
                ))

                # Update schedule next run
                sched.last_run = now
                sched.next_run = now + timedelta(hours=sched.interval_hours or 24)
                db.commit()

                # Launch execution
                await pipeline_engine.start_scan(new_scan.id)
        finally:
            db.close()

    async def trigger_now(self, schedule_id: int) -> Optional[int]:
        db = SessionLocal()
        try:
            sched = db.query(ScheduledScan).filter(ScheduledScan.id == schedule_id).first()
            if not sched:
                return None

            now = datetime.utcnow()
            new_scan = Scan(
                target=sched.target,
                target_type=sched.target_type,
                scan_type=sched.scan_type,
                intensity=sched.intensity,
                selected_tools="[]",
                status="queued",
                progress=0,
                current_tool="Manual Schedule Trigger",
                start_time=now,
                stats='{"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}'
            )
            db.add(new_scan)
            db.commit()
            db.refresh(new_scan)

            db.add(ActivityLog(
                scan_id=new_scan.id,
                level="INFO",
                message=f"Recurring scan '{sched.name}' manually triggered by operator (Schedule #{sched.id})."
            ))

            sched.last_run = now
            sched.next_run = now + timedelta(hours=sched.interval_hours or 24)
            db.commit()

            await pipeline_engine.start_scan(new_scan.id)
            return new_scan.id
        finally:
            db.close()

scan_scheduler = ScanScheduler()

