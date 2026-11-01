from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime, timedelta
from ..database import Base

class ScheduledScan(Base):
    __tablename__ = "scheduled_scans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, default="Automated Recurring Scan")
    target = Column(String(255), nullable=False)
    target_type = Column(String(50), default="web")
    scan_type = Column(String(50), default="full_auto")
    intensity = Column(String(50), default="medium")
    interval_hours = Column(Integer, default=24)  # 6, 12, 24 (daily), 168 (weekly)
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=24))
    created_at = Column(DateTime, default=datetime.utcnow)

