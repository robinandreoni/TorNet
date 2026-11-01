from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    target = Column(String(255), nullable=False, index=True)
    target_type = Column(String(50), default="web")  # web, network, domain
    scan_type = Column(String(50), default="full_auto")  # full_auto, recon, vuln_scan, exploit, custom
    intensity = Column(String(50), default="medium")  # light, medium, aggressive
    selected_tools = Column(Text, default="[]")  # JSON encoded list of tool names
    status = Column(String(50), default="queued", index=True)  # queued, running, completed, failed, stopped
    progress = Column(Integer, default=0)
    current_tool = Column(String(100), default="None")
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    stats = Column(Text, default="{}")  # JSON: {critical: 0, high: 0, medium: 0, low: 0, info: 0}

    results = relationship("Result", back_populates="scan", cascade="all, delete-orphan")
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    logs = relationship("ActivityLog", back_populates="scan", cascade="all, delete-orphan")


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String(100), nullable=False)
    status = Column(String(50), default="completed")  # running, completed, failed
    raw_output = Column(Text, default="")
    parsed_data = Column(Text, default="{}")  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="results")


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, default="")
    severity = Column(String(50), default="medium", index=True)  # critical, high, medium, low, info
    cvss_score = Column(Float, default=5.0)
    cve_id = Column(String(100), nullable=True)
    tool_found_by = Column(String(100), default="Tornet Engine")
    endpoint = Column(String(255), default="")
    remediation = Column(Text, default="")
    status = Column(String(50), default="open")  # open, verified, remediated, false_positive
    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="vulnerabilities")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=True)
    level = Column(String(50), default="INFO")  # INFO, WARNING, ERROR, SUCCESS
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="logs")
