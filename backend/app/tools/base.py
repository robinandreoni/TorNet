import asyncio
import logging
import json
import shutil
import os
from typing import AsyncGenerator, Dict, Any, List, Optional
from ..websocket.manager import manager
from ..config import WSL_DISTRO

logger = logging.getLogger("tornet.tools.base")

class ToolWrapper:
    """Base class for all penetration testing tool integrations."""
    name: str = "base_tool"
    display_name: str = "Base Tool"
    category: str = "Reconnaissance"
    version: str = "1.0.0"
    description: str = "Base penetration testing tool wrapper"

    def __init__(self, use_wsl: bool = False, wsl_distro: str = WSL_DISTRO):
        self.use_wsl = use_wsl
        self.wsl_distro = wsl_distro
        self.is_running = False
        self.process: Optional[asyncio.subprocess.Process] = None

    def check_availability(self) -> Dict[str, Any]:
        """Check if tool is installed on host or in WSL."""
        win_installed = shutil.which(self.name) is not None
        return {
            "name": self.name,
            "display_name": self.display_name,
            "installed_windows": win_installed,
            "category": self.category,
            "description": self.description,
            "status": "ready" if win_installed else "wsl_bridge"
        }

    def build_command(self, target: str, intensity: str = "medium", **kwargs) -> List[str]:
        """Build command line arguments for the tool. Subclasses override this."""
        return [self.name, target]

    async def run(
        self, 
        target: str, 
        scan_id: int, 
        intensity: str = "medium", 
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute tool asynchronously, streaming stdout/stderr line by line
        over WebSocket and returning parsed results and raw output.
        Automatically applies OPSEC anonymity proxies when Tor is active.
        """
        cmd_args = self.build_command(target, intensity, **kwargs)
        
        # Check OPSEC Shield state
        from ..opsec import opsec_service
        is_tor = await opsec_service.is_tor_active()
        spoofed_mac = opsec_service._spoofed_mac

        # If WSL is requested or tool not in Windows path but WSL available:
        if self.use_wsl or not shutil.which(cmd_args[0]):
            cmd_str = " ".join(cmd_args)
            tool_bin = cmd_args[0].lower()

            # Inject spoofed MAC if active
            if spoofed_mac and tool_bin == "nmap" and "--spoof-mac" not in cmd_str:
                cmd_str = f"{cmd_str} --spoof-mac {spoofed_mac}"

            if is_tor:
                # Anonymize through Tor SOCKS5
                if tool_bin in ["httpx", "nuclei", "subfinder"]:
                    # Go-based tools support native socks5 proxy flag
                    cmd_str = f"{cmd_str} -proxy socks5://127.0.0.1:9050"
                elif tool_bin in ["gobuster", "feroxbuster"]:
                    # Go-based directory fuzzers support native --proxy
                    cmd_str = f"{cmd_str} --proxy socks5://127.0.0.1:9050"
                elif tool_bin == "sqlmap":
                    cmd_str = f"{cmd_str} --proxy=socks5://127.0.0.1:9050"
                else:
                    # For nmap and standard tools, wrap via proxychains4
                    if tool_bin == "nmap":
                        if "-sS" in cmd_str:
                            cmd_str = cmd_str.replace("-sS", "-sT -Pn")
                        elif "-sT" not in cmd_str:
                            cmd_str = f"nmap -sT -Pn " + " ".join(cmd_args[1:])
                    cmd_str = f"proxychains4 -q {cmd_str}"
                final_cmd = ["wsl", "-d", self.wsl_distro, "--", "bash", "-c", cmd_str]
            else:
                final_cmd = ["wsl", "-d", self.wsl_distro, "--", "bash", "-c", cmd_str]
        else:
            final_cmd = cmd_args

        log_prefix = f"[{self.display_name.upper()}]"
        if spoofed_mac:
            await manager.broadcast_terminal(scan_id, f"🛡️ [OPSEC SHIELD] 🎭 MAC Spoofing active: Source MAC forged as {spoofed_mac}\n", tool_name=self.name)
        if is_tor:
            await manager.broadcast_terminal(scan_id, f"🛡️ [OPSEC SHIELD] 🧅 Tor routing active — scan traffic proxied via exit node.\n", tool_name=self.name)
        await manager.broadcast_terminal(scan_id, f"{log_prefix} Initializing command: {' '.join(final_cmd)}\n", tool_name=self.name)

        raw_output_lines = []
        self.is_running = True

        try:
            self.process = await asyncio.create_subprocess_exec(
                *final_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            async def read_stream(stream, stream_name):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    decoded = line.decode("utf-8", errors="replace")
                    raw_output_lines.append(decoded)
                    await manager.broadcast_terminal(scan_id, f"{log_prefix} {decoded}", tool_name=self.name)

            # Timeout safeguard (default 120s) to prevent frozen processes and protect RAM
            tool_timeout = kwargs.get("timeout", 120)

            async def _run_streams_and_wait():
                await asyncio.gather(
                    read_stream(self.process.stdout, "stdout"),
                    read_stream(self.process.stderr, "stderr")
                )
                await self.process.wait()

            try:
                await asyncio.wait_for(_run_streams_and_wait(), timeout=tool_timeout)
                rc = self.process.returncode
            except asyncio.TimeoutError:
                rc = -9
                err_timeout = f"{log_prefix} ⏱️ TIMEOUT ({tool_timeout}s): Processo terminato in sicurezza per non saturare la RAM o la rete Tor.\n"
                raw_output_lines.append(err_timeout)
                await manager.broadcast_terminal(scan_id, err_timeout, stream_type="stderr", tool_name=self.name)
                try:
                    if self.process:
                        self.process.kill()
                except Exception:
                    pass

            await manager.broadcast_terminal(scan_id, f"{log_prefix} Completed with return code: {rc}\n", tool_name=self.name)

        except FileNotFoundError as fnf:
            err_msg = f"{log_prefix} Execution error: Executable not found ({fnf})\n"
            raw_output_lines.append(err_msg)
            await manager.broadcast_terminal(scan_id, err_msg, stream_type="stderr", tool_name=self.name)
            rc = -1
        except Exception as e:
            err_msg = f"{log_prefix} Unexpected error: {str(e)}\n"
            raw_output_lines.append(err_msg)
            await manager.broadcast_terminal(scan_id, err_msg, stream_type="stderr", tool_name=self.name)
            rc = -1
        finally:
            self.is_running = False

        full_raw = "".join(raw_output_lines)
        parsed = self.parse_output(full_raw, target)

        return {
            "tool_name": self.name,
            "display_name": self.display_name,
            "return_code": rc,
            "raw_output": full_raw,
            "parsed_data": parsed,
            "vulnerabilities": self.extract_vulnerabilities(parsed, full_raw, target)
        }

    def parse_output(self, raw_output: str, target: str) -> Dict[str, Any]:
        """Parse raw output. Subclasses override to produce structured data."""
        return {"raw_length": len(raw_output), "summary": f"Completed {self.display_name} scan on {target}"}

    def extract_vulnerabilities(self, parsed_data: Dict[str, Any], raw_output: str, target: str) -> List[Dict[str, Any]]:
        """Extract identified vulnerabilities from parsed results."""
        return []

    async def stop(self):
        """Terminate the running tool process."""
        if self.process and self.is_running:
            try:
                self.process.terminate()
                await asyncio.sleep(1)
                if self.process.returncode is None:
                    self.process.kill()
            except Exception as e:
                logger.warning(f"Error terminating tool process: {e}")
            finally:
                self.is_running = False
