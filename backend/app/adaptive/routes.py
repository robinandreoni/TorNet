import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db
from ..scans.models import Scan
from .models import TargetProfile, StrategyInfo, LaunchAdaptiveScanRequest
from .profiler import target_profiler
from .orchestrator import adaptive_orchestrator, STRATEGIES
from .ai_engine import ai_expert_engine

router = APIRouter()

@router.get("/ai-rules")
def get_ai_decision_rules():
    """Retrieve full catalog of AI heuristic and fallback rules."""
    return ai_expert_engine.get_catalog()

@router.get("/strategies", response_model=List[StrategyInfo])
def get_strategies():
    """Retrieve available smart attack strategies."""
    return adaptive_orchestrator.get_strategies()

@router.post("/profile-target", response_model=TargetProfile)
async def profile_target(req: Dict[str, str]):
    """Probe target architecture and recommend optimal pentest strategy."""
    target = req.get("target", "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="Target is required")
    try:
        return await target_profiler.profile(target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profiling failed: {str(e)}")

@router.post("/launch")
async def launch_adaptive_scan(
    req: LaunchAdaptiveScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Launch adaptive multi-tool scan based on chosen strategy."""
    strat = STRATEGIES.get(req.strategy)
    if not strat:
        raise HTTPException(status_code=400, detail=f"Invalid strategy '{req.strategy}'")

    # Create new scan entry
    new_scan = Scan(
        target=req.target,
        target_type="web",
        scan_type=f"adaptive_{req.strategy}",
        intensity=strat.intensity,
        selected_tools=json.dumps(strat.tools),
        status="queued",
        progress=0,
        current_tool="Smart Engine Setup",
        start_time=datetime.utcnow(),
        stats=json.dumps({"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0})
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    # Launch execution as background task
    background_tasks.add_task(
        adaptive_orchestrator.execute_strategy,
        new_scan.id,
        req.target,
        req.strategy
    )

    return {
        "scan_id": new_scan.id,
        "target": req.target,
        "strategy": req.strategy,
        "strategy_name": strat.name,
        "tools": strat.tools,
        "status": "launched"
    }

@router.get("/loot")
def list_downloaded_loot():
    """List all auto-downloaded and analyzed files from target assessments."""
    from .file_inspector import LOOT_BASE_DIR, USER_DOWNLOADS_DIR
    items = []
    if os.path.exists(LOOT_BASE_DIR):
        for scan_folder in os.listdir(LOOT_BASE_DIR):
            scan_path = os.path.join(LOOT_BASE_DIR, scan_folder)
            if os.path.isdir(scan_path):
                files = os.listdir(scan_path)
                items.append({
                    "scan_folder": scan_folder,
                    "files": files,
                    "downloads_path": os.path.join(USER_DOWNLOADS_DIR, scan_folder)
                })
    return {"loot": items, "user_downloads_dir": USER_DOWNLOADS_DIR}
