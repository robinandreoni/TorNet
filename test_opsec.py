import sys
import os

# Fix cp1252 Windows encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Set pythonpath
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    print("Testing /api/health...")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["features"].get("opsec_shield") is True, "opsec_shield feature flag missing"
    print(f"  OK: Health status {data['status']}, features: {list(data['features'].keys())}")

def test_opsec_status():
    print("Testing GET /api/v1/opsec/status...")
    resp = client.get("/api/v1/opsec/status")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    print(f"  OK: MAC: {data['mac']['current_mac']} (spoofed: {data['mac']['is_spoofed']})")
    print(f"  OK: Tor active: {data['tor']['is_active']}, IP: {data['current_ip']['ip']} ({data['current_ip']['country']})")
    print(f"  OK: Stealth score: {data['stealth_score']}% ({data['stealth_level']})")

def test_opsec_ip_check():
    print("Testing POST /api/v1/opsec/ip/check...")
    resp = client.post("/api/v1/opsec/ip/check")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    print(f"  OK: Public IP: {data['ip']}, Country: {data['country']} ({data['country_code']}), Tor: {data['is_tor']}")

def test_opsec_mac():
    print("Testing POST /api/v1/opsec/mac/spoof...")
    resp = client.post("/api/v1/opsec/mac/spoof")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    print(f"  OK: Spoofed MAC: {data['current_mac']} vs Permanent: {data['permanent_mac']} (is_spoofed: {data['is_spoofed']})")

    print("Testing POST /api/v1/opsec/mac/restore...")
    resp_rest = client.post("/api/v1/opsec/mac/restore")
    assert resp_rest.status_code == 200, f"Expected 200, got {resp_rest.status_code}: {resp_rest.text}"
    data_rest = resp_rest.json()
    print(f"  OK: Restored MAC: {data_rest['current_mac']} vs Permanent: {data_rest['permanent_mac']} (is_spoofed: {data_rest['is_spoofed']})")

def test_opsec_vpn_profiles():
    print("Testing GET /api/v1/opsec/vpn/profiles...")
    resp = client.get("/api/v1/opsec/vpn/profiles")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    profiles = resp.json()
    print(f"  OK: Found {len(profiles)} VPN profiles.")

def main():
    print("=" * 60)
    print("TORNET OPSEC SHIELD — BACKEND INTEGRATION TEST")
    print("=" * 60)
    test_health()
    test_opsec_status()
    test_opsec_ip_check()
    test_opsec_mac()
    test_opsec_vpn_profiles()
    print("=" * 60)
    print("ALL OPSEC BACKEND TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()

