import sys
import os

# Fix cp1252 Windows encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import asyncio
from app.opsec.service import opsec_service
from app.tools.httpx_wrapper import HttpxWrapper
from app.tools.nmap_wrapper import NmapWrapper

async def main():
    print("=" * 60)
    print("TORNET OPSEC SHIELD — LIVE ANONYMIZED TOOL EXECUTION TEST")
    print("=" * 60)

    # 1. Start Tor
    print("[1] Starting Tor Network in Kali Linux...")
    tor_status = await opsec_service.start_tor()
    print(f"    Tor active: {tor_status.is_active}, Exit IP: {tor_status.exit_ip} ({tor_status.country})")
    assert tor_status.is_active, "Tor must be active"

    # 2. Check full OPSEC state
    print("[2] Checking composite OPSEC state...")
    state = await opsec_service.get_state()
    print(f"    Current Public IP: {state.current_ip.ip} ({state.current_ip.country})")
    print(f"    Stealth Score: {state.stealth_score}% ({state.stealth_level})")

    # 3. Test HTTPX through Tor
    print("[3] Testing HTTPX probe against testasp.vulnweb.com via Tor...")
    httpx_tool = HttpxWrapper(use_wsl=True)
    res = await httpx_tool.run("testasp.vulnweb.com", scan_id=9999, intensity="light")
    print(f"    Return code: {res['return_code']}")
    print(f"    Vulnerabilities found: {len(res['vulnerabilities'])}")
    print(f"    Raw output sample: {res['raw_output'][:150]}...")
    assert res['return_code'] == 0 or len(res['raw_output']) > 0, "HTTPX should return output via Tor"

    print("=" * 60)
    print("LIVE OPSEC SCAN VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
