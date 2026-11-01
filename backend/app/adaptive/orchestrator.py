import asyncio
import logging
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..scans.models import Scan, Result, Vulnerability
from ..tools.registry import TOOL_CLASSES
from ..websocket.manager import manager
from .models import StrategyInfo
from .ai_engine import ai_expert_engine
from .profiler import target_profiler
from .file_inspector import file_inspector

logger = logging.getLogger("tornet.adaptive.orchestrator")

STRATEGIES: Dict[str, StrategyInfo] = {
    "stealth": StrategyInfo(
        id="stealth",
        name="Furtività / Basso Rumore",
        display_title="🥷 FURTIVA & SILENZIOSA (STEALTH)",
        tagline="Evasione WAF/IDS & Ricognizione Passiva",
        description="Minimizza i pacchetti e le frequenze di richiesta. Ideale per ambienti protetti da Cloudflare, Akamai o IDS perimetrali senza generare allarmi nei log.",
        tools=["httpx", "whatweb", "subfinder", "nmap"],
        intensity="light",
        parallel_workers=2,
        stealth_rating="Alta (95%)",
        speed_rating="Calibrata / Stealth"
    ),
    "balanced": StrategyInfo(
        id="balanced",
        name="Bilanciata / Standard",
        display_title="⚖️ BILANCIATA & COMPLETA (BALANCED)",
        tagline="Valutazione Standard di Sicurezza e Vulnerabilità",
        description="Analisi bilanciata che unisce ricognizione porte, verifica template di vulnerabilità Nuclei e scansione directory Gobuster a velocità controllata.",
        tools=["nmap", "httpx", "whatweb", "nuclei", "nikto", "gobuster"],
        intensity="medium",
        parallel_workers=3,
        stealth_rating="Media (60%)",
        speed_rating="Rapida"
    ),
    "aggressive": StrategyInfo(
        id="aggressive",
        name="Approfondita / Aggressiva",
        display_title="⚡ ARSENALE COMPLETO (AGGRESSIVE)",
        tagline="Full Multi-Tool Assault Parallelo",
        description="Sprigiona tutti gli strumenti disponibili in esecuzione concorrente parallela: Nmap full scan, Nuclei, Nikto, Gobuster, SQLMap crawler e Metasploit RPC.",
        tools=["nmap", "httpx", "whatweb", "nuclei", "nikto", "gobuster", "sqlmap", "feroxbuster", "metasploit"],
        intensity="aggressive",
        parallel_workers=5,
        stealth_rating="Bassa (15%)",
        speed_rating="Massima Esecuzione"
    )
}

class AdaptiveOrchestrator:
    """Intelligent coordinator that executes customized multi-tool attack strategies."""

    def get_strategies(self) -> List[StrategyInfo]:
        return list(STRATEGIES.values())

    async def execute_strategy(self, scan_id: int, target: str, strategy_id: str):
        strat = STRATEGIES.get(strategy_id, STRATEGIES["balanced"])
        db = SessionLocal()

        try:
            scan = db.query(Scan).filter(Scan.id == scan_id).first()
            if not scan:
                return

            scan.status = "running"
            db.commit()

            await manager.broadcast_terminal(
                scan_id, 
                f"\n{'='*70}\n[SMART ADAPTIVE ORCHESTRATOR] 🧠 Strategy Selected: {strat.display_title}\n"
                f"[TARGET] 🎯 {target} | Tools: {', '.join(strat.tools).upper()}\n"
                f"{'='*70}\n\n"
            )

            # AI Inference Engine Pre-Flight Evaluation
            try:
                await manager.broadcast_terminal(
                    scan_id,
                    f"🧠 [AI DECISION ENGINE] Analisi euristica architettura target in corso...\n"
                )
                prof = await target_profiler.profile(target)
                decisions = ai_expert_engine.evaluate_preflight(prof.dict())
                if decisions:
                    await manager.broadcast_terminal(
                        scan_id,
                        f"🧠 [AI KNOWLEDGE BASE] {len(decisions)} rami decisionali euristiche attivati sul target:\n"
                    )
                    for d in decisions:
                        await manager.broadcast_terminal(scan_id, d.format_terminal_log())
                        await asyncio.sleep(0.2)
                else:
                    await manager.broadcast_terminal(
                        scan_id,
                        f"🧠 [AI KNOWLEDGE BASE] Target standard identificato. Applicazione parametri ottimali predefiniti.\n\n"
                    )
            except Exception as pe:
                logger.debug(f"AI profiling skipped: {pe}")

            tool_list = strat.tools
            total_tools = len(tool_list)

            # Priority order: launch lightweight, fast tools first so the user gets instant feedback
            priority_ranking = {
                "whatweb": 1,
                "httpx": 2,
                "subfinder": 3,
                "nuclei": 4,
                "gobuster": 5,
                "feroxbuster": 6,
                "nmap": 7,
                "sqlmap": 8,
                "nikto": 9,
                "metasploit": 10
            }
            ordered_tools = sorted(tool_list, key=lambda t: priority_ranking.get(t, 99))

            # Concurrency limit:
            # Stealth: 1 tool at a time (zero noise)
            # Balanced: 2 tools at a time
            # Aggressive: 3 tools at a time (prevents RAM/CPU freezes on older PCs and prevents choking Tor)
            max_concurrent = 1 if strat.id == "stealth" else (2 if strat.id == "balanced" else 3)
            semaphore = asyncio.Semaphore(max_concurrent)

            await manager.broadcast_terminal(
                scan_id,
                f"⚡ [CODA GRADUALE] Avvio {len(ordered_tools)} moduli in coda dinamica (Max {max_concurrent} contemporanei per proteggere RAM e Tor):\n"
                f"   Ordine di esecuzione: {' → '.join(ordered_tools).upper()}\n\n"
            )

            completed_count = 0

            async def _worker(t_name: str):
                nonlocal completed_count
                # Inform tool terminal that it is queued
                await manager.broadcast_terminal(
                    scan_id,
                    f"⏳ [CODA SMART] In attesa di slot disponibile (Max {max_concurrent} contemporanei per preservare RAM e Tor)...\n",
                    tool_name=t_name
                )
                async with semaphore:
                    await manager.broadcast_terminal(
                        scan_id,
                        f"⚡ [SLOT ATTIVO] Inizio esecuzione del modulo [{t_name.upper()}]...\n",
                        tool_name=t_name
                    )
                    await self._run_single_tool(scan_id, target, t_name, strat.intensity, db)
                    completed_count += 1
                    prog = int((completed_count / total_tools) * 100)
                    await manager.broadcast_progress(scan_id, prog, "running", t_name)
                    await manager.broadcast_terminal(
                        scan_id,
                        f"✅ [SLOT RILASCIATO] Modulo [{t_name.upper()}] terminato. Slot liberato per il modulo successivo.\n",
                        tool_name=t_name
                    )

            # Launch all worker tasks; the semaphore manages execution order and concurrency dynamically
            tasks = [_worker(t) for t in ordered_tools]
            await asyncio.gather(*tasks, return_exceptions=True)

            # Mark scan complete
            scan.status = "completed"
            scan.progress = 100
            scan.end_time = datetime.utcnow()
            db.commit()

            await manager.broadcast_progress(scan_id, 100, "completed", "done")
            await manager.broadcast_terminal(
                scan_id, 
                f"\n{'='*70}\n[SMART ADAPTIVE ORCHESTRATOR] ✅ Strategy {strat.name} finished successfully!\n"
                f"{'='*70}\n"
            )

        except Exception as e:
            logger.error(f"Error in adaptive execution: {e}")
            if scan:
                scan.status = "failed"
                db.commit()
            await manager.broadcast_terminal(scan_id, f"[SMART ORCHESTRATOR ERROR] {str(e)}\n")
        finally:
            db.close()

    async def _run_single_tool(self, scan_id: int, target: str, tool_name: str, intensity: str, db: Session):
        tool_cls = TOOL_CLASSES.get(tool_name)
        if not tool_cls:
            return

        tool = tool_cls(use_wsl=True)
        try:
            res = await tool.run(target, scan_id=scan_id, intensity=intensity)

            # AI Decision Engine: Evaluate runtime output and trigger fallbacks if needed
            ret_code = res.get("return_code", 0)
            raw_out = res.get("raw_output", "")
            runtime_decision = ai_expert_engine.evaluate_tool_runtime(tool_name, target, ret_code, raw_out)
            if runtime_decision:
                await manager.broadcast_terminal(scan_id, runtime_decision.format_terminal_log())

            # Save Result
            parsed_raw = res.get("parsed_data", {})
            parsed_json_str = json.dumps(parsed_raw) if isinstance(parsed_raw, (dict, list)) else str(parsed_raw or "{}")

            scan_res = Result(
                scan_id=scan_id,
                tool_name=tool_name,
                raw_output=res.get("raw_output", ""),
                parsed_data=parsed_json_str,
                status="completed"
            )
            db.add(scan_res)
            db.commit()

            # Save Vulnerabilities
            vulns = res.get("vulnerabilities", [])
            for v in vulns:
                v_obj = Vulnerability(
                    scan_id=scan_id,
                    title=v.get("title", f"Finding in {tool_name}"),
                    severity=v.get("severity", "medium").lower(),
                    description=v.get("description", ""),
                    endpoint=v.get("endpoint", target),
                    remediation=v.get("remediation", ""),
                    cve_id=v.get("cve") or v.get("cve_id"),
                    tool_found_by=tool_name,
                    status="open"
                )
                db.add(v_obj)
            db.commit()

            # Automated File Inspector: auto-download and inspect sensitive files (robots.txt, sitemap.xml, etc.)
            try:
                discovered_paths = []
                if isinstance(parsed_raw, dict):
                    for ep in parsed_raw.get("discovered_paths", []):
                        if isinstance(ep, dict) and "path" in ep:
                            discovered_paths.append(ep["path"])
                    for endp in parsed_raw.get("probed_endpoints", []):
                        if isinstance(endp, dict) and "url" in endp:
                            discovered_paths.append(endp["url"])
                # Also check common files mentioned in output lines
                for common_name in ["robots.txt", "security.txt", "sitemap.xml", ".env", "crossdomain.xml"]:
                    if common_name in raw_out.lower():
                        discovered_paths.append(common_name)

                if discovered_paths:
                    await file_inspector.inspect_discovered_files(scan_id, target, discovered_paths)
            except Exception as fe:
                logger.debug(f"File inspector error: {fe}")

        except Exception as e:
            logger.warning(f"Error running adaptive tool {tool_name}: {e}")

adaptive_orchestrator = AdaptiveOrchestrator()
