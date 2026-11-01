import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_adaptive_api():
    print("=" * 60)
    print("TORNET SMART ADAPTIVE ENGINE — TEST SUITE")
    print("=" * 60)

    # 1. Health check
    print("[1] Verifying /api/health adaptive_engine flag...")
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["features"].get("adaptive_engine") is True
    print("    OK: Feature flag adaptive_engine is True")

    # 2. Strategies
    print("[2] Fetching available strategies...")
    res = client.get("/api/v1/adaptive/strategies")
    assert res.status_code == 200
    strategies = res.json()
    assert len(strategies) == 3
    strat_ids = [s["id"] for s in strategies]
    print(f"    OK: Found {len(strategies)} strategies: {strat_ids}")

    # 3. AI Expert Engine Rules Catalog
    print("[3] Fetching AI Reasoning Rules Catalog...")
    res = client.get("/api/v1/adaptive/ai-rules")
    assert res.status_code == 200
    ai_rules = res.json()
    assert len(ai_rules) >= 8
    print(f"    OK: Loaded {len(ai_rules)} expert AI inference rules successfully.")

    # 4. Target Profiler
    print("[4] Testing target profiler on testasp.vulnweb.com...")
    res = client.post("/api/v1/adaptive/profile-target", json={"target": "http://testasp.vulnweb.com"})
    assert res.status_code == 200
    profile = res.json()
    print(f"    OK: Target IP: {profile['ip']}, Server: {profile['web_server']}")
    print(f"    OK: WAF Detected: {profile['waf_detected']}, Strategy: {profile['recommended_strategy']}")
    print(f"    OK: Reason: {profile['strategy_reason'][:90]}...")

    # 5. Launch Adaptive Scan
    print("[5] Launching adaptive scan test (stealth)...")
    from unittest.mock import patch, AsyncMock
    with patch("app.adaptive.routes.adaptive_orchestrator.execute_strategy", new_callable=AsyncMock) as mock_exec:
        res = client.post("/api/v1/adaptive/launch", json={
            "target": "http://testasp.vulnweb.com",
            "strategy": "stealth",
            "parallel": True
        })
        assert res.status_code == 200
        data = res.json()
        print(f"    OK: Scan #{data['scan_id']} launched with tools: {data['tools']}")
        assert mock_exec.called
        print("    OK: Adaptive orchestrator background task scheduled correctly.")

    # 6. Loot & File Inspector Endpoint
    print("[6] Checking Loot storage endpoint...")
    res = client.get("/api/v1/adaptive/loot")
    assert res.status_code == 200
    loot_data = res.json()
    print(f"    OK: Loot endpoint active. Downloads directory: {loot_data['user_downloads_dir']}")

    print("=" * 60)
    print("ALL ADAPTIVE ENGINE TESTS PASSED SUCCESSFULLY (100%)!")
    print("=" * 60)

if __name__ == "__main__":
    test_adaptive_api()
