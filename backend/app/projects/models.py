from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, default="")
    client_name = Column(String(150), default="Internal Audit")
    created_at = Column(DateTime, default=datetime.utcnow)

    targets = relationship("ProjectTarget", back_populates="project", cascade="all, delete-orphan")


class ProjectTarget(Base):
    __tablename__ = "project_targets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    target = Column(String(255), nullable=False)
    target_type = Column(String(50), default="web")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="targets")

