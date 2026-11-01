import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..scans.models import Scan, Result, Vulnerability, ActivityLog
from ..tools.registry import get_tool_instance
from ..websocket.manager import manager
from ..notifications.service import notification_service

logger = logging.getLogger("tornet.pipeline.engine")

class PipelineEngine:
    def __init__(self):
        self.active_tasks: Dict[int, asyncio.Task] = {}
        self.active_tool_instances: Dict[int, Any] = {}

    def resolve_tools_for_scan(self, scan_type: str, selected_tools: List[str]) -> List[str]:
        """Determine tools sequence based on scan profile."""
        if selected_tools and len(selected_tools) > 0:
            return selected_tools

        profiles = {
            "recon": ["scapy", "nmap", "subfinder", "httpx", "whatweb"],
            "vuln_scan": ["nmap", "nuclei", "nikto"],
            "exploit": ["sqlmap", "nuclei"],
            "brute_force": ["gobuster", "scapy"],
            "full_auto": ["scapy", "nmap", "httpx", "whatweb", "nuclei", "nikto", "sqlmap", "gobuster"]
        }
        return profiles.get(scan_type.lower(), profiles["full_auto"])

    async def start_scan(self, scan_id: int):
        """Launches pipeline execution as a background asyncio task."""
        task = asyncio.create_task(self._execute_pipeline(scan_id))
        self.active_tasks[scan_id] = task

    async def stop_scan(self, scan_id: int):
        """Stops the active scan and terminates any running subprocess."""
        if scan_id in self.active_tool_instances:
            tool_inst = self.active_tool_instances[scan_id]
            await tool_inst.stop()

        if scan_id in self.active_tasks:
            task = self.active_tasks[scan_id]
            task.cancel()

        db = SessionLocal()
        try:
            scan = db.query(Scan).filter(Scan.id == scan_id).first()
            if scan and scan.status == "running":
                scan.status = "stopped"
                scan.end_time = datetime.utcnow()
                db.commit()
                await manager.broadcast_progress(scan_id, scan.progress, "stopped", "None")
                await manager.broadcast_terminal(scan_id, f"[PIPELINE] Scan #{scan_id} manually stopped by operator.\n")
        finally:
            db.close()

    async def _execute_pipeline(self, scan_id: int):
        db = SessionLocal()
        try:
            scan = db.query(Scan).filter(Scan.id == scan_id).first()
            if not scan:
                logger.error(f"Scan #{scan_id} not found in database.")
                return

            scan.status = "running"
            scan.start_time = datetime.utcnow()
            scan.progress = 5
            db.commit()

            try:
                selected_tools = json.loads(scan.selected_tools) if scan.selected_tools else []
            except Exception:
                selected_tools = []

            tool_names = self.resolve_tools_for_scan(scan.scan_type, selected_tools)
            total_tools = len(tool_names)

            start_msg = f"[PIPELINE] Initiating TORNET Automated Pipeline for target: {scan.target} (Profile: {scan.scan_type.upper()}, {total_tools} tools queued)\n"
            await manager.broadcast_terminal(scan_id, start_msg)
            await manager.broadcast_progress(scan_id, 5, "running", tool_names[0] if tool_names else "init")

            # Add activity log
            db.add(ActivityLog(
                scan_id=scan_id,
                level="INFO",
                message=f"Scan #{scan_id} started on {scan.target} with {total_tools} tools."
            ))
            db.commit()

            stats = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

            for index, tool_name in enumerate(tool_names):
                tool = get_tool_instance(tool_name)
                self.active_tool_instances[scan_id] = tool
                
                scan.current_tool = tool.display_name
                progress_step = int(10 + (index / total_tools) * 80)
                scan.progress = progress_step
                db.commit()

                await manager.broadcast_progress(scan_id, progress_step, "running", tool.display_name)
                await manager.broadcast_terminal(
                    scan_id, 
                    f"\n>>> [STAGE {index + 1}/{total_tools}] Launching {tool.display_name} <<<\n"
                )

                # Execute tool
                try:
                    result_data = await tool.run(scan.target, scan_id, intensity=scan.intensity)
                except asyncio.CancelledError:
                    logger.info(f"Scan #{scan_id} was cancelled during {tool_name}")
                    raise
                except Exception as e:
                    logger.error(f"Error executing {tool_name}: {e}")
                    result_data = {
                        "tool_name": tool_name,
                        "display_name": tool.display_name,
                        "return_code": -1,
                        "raw_output": f"Error running {tool_name}: {str(e)}",
                        "parsed_data": {},
                        "vulnerabilities": []
                    }

                # Save Result
                result_record = Result(
                    scan_id=scan_id,
                    tool_name=tool.display_name,
                    status="completed" if result_data.get("return_code") == 0 else "completed_with_warnings",
                    raw_output=result_data.get("raw_output", ""),
                    parsed_data=json.dumps(result_data.get("parsed_data", {}))
                )
                db.add(result_record)

                # Save Vulnerabilities
                for v in result_data.get("vulnerabilities", []):
                    sev = v.get("severity", "medium").lower()
                    if sev in stats:
                        stats[sev] += 1
                    else:
                        stats["info"] += 1

                    vuln_record = Vulnerability(
                        scan_id=scan_id,
                        title=v.get("title", "Security Finding"),
                        description=v.get("description", ""),
                        severity=sev,
                        cvss_score=v.get("cvss_score", 5.0),
                        cve_id=v.get("cve_id"),
                        tool_found_by=v.get("tool_found_by", tool.display_name),
                        endpoint=v.get("endpoint", scan.target),
                        remediation=v.get("remediation", ""),
                        status="open"
                    )
                    db.add(vuln_record)

                db.commit()

            # Pipeline Complete
            scan.status = "completed"
            scan.progress = 100
            scan.current_tool = "Finished"
            scan.end_time = datetime.utcnow()
            scan.stats = json.dumps(stats)
            
            db.add(ActivityLog(
                scan_id=scan_id,
                level="SUCCESS",
                message=f"Scan #{scan_id} finished successfully. Identified: {stats['critical']} Critical, {stats['high']} High, {stats['medium']} Medium."
            ))
            db.commit()

            await manager.broadcast_progress(scan_id, 100, "completed", "Finished")
            finish_msg = (
                f"\n[PIPELINE] Scan #{scan_id} COMPLETED SUCCESSFULLY.\n"
                f"[PIPELINE] Summary: {stats['critical']} Critical | {stats['high']} High | {stats['medium']} Medium | {stats['low']} Low | {stats['info']} Info\n"
            )
            await manager.broadcast_terminal(scan_id, finish_msg)

            # Automated Notification Dispatch
            try:
                await notification_service.dispatch_scan_completion(scan_id, scan.target, "completed", stats)
            except Exception as ne:
                logger.warning(f"Failed to dispatch notifications for scan #{scan_id}: {ne}")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.exception(f"Unhandled error in scan pipeline #{scan_id}: {e}")
            if scan:
                scan.status = "failed"
                scan.end_time = datetime.utcnow()
                db.commit()
                await manager.broadcast_progress(scan_id, scan.progress, "failed", "Error")
                await manager.broadcast_terminal(scan_id, f"[PIPELINE ERROR] Pipeline terminated with error: {str(e)}\n", stream_type="stderr")
        finally:
            if scan_id in self.active_tasks:
                del self.active_tasks[scan_id]
            if scan_id in self.active_tool_instances:
                del self.active_tool_instances[scan_id]
            db.close()

pipeline_engine = PipelineEngine()
