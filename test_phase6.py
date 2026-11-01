import sys
import os
import json

# Ensure backend app in pythonpath
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

# Ensure utf-8 output encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app
from app.tools.registry import get_tool_instance, list_all_tools
from app.tools.metasploit_wrapper import MetasploitWrapper
from app.ai.assistant import ai_assistant
from app.notifications.service import notification_service
from app.tools.plugins import plugin_manager

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("🛡️  TORNET COMMAND CENTER — SUITE TEST FASE 6")
    print("=" * 60)

    # 1. Metasploit RPC Bridge
    print("\n[TEST 6.1] Metasploit RPC Bridge Integration...")
    msf = get_tool_instance("metasploit")
    assert isinstance(msf, MetasploitWrapper), "Metasploit instance should be MetasploitWrapper"
    cmd = msf.build_command("192.168.1.50", intensity="medium")
    assert "msfconsole" in cmd[0], "Command should call msfconsole"
    sample_out = "[+] 192.168.1.50:445 - Target is vulnerable to MS17-010 EternalBlue"
    parsed = msf.parse_output(sample_out, "192.168.1.50")
    vulns = msf.extract_vulnerabilities(parsed, sample_out, "192.168.1.50")
    assert len(vulns) >= 1, "Should identify critical exploit vulnerability"
    print(f"  ✅ Metasploit wrapper active: {msf.display_name} (CVE detection verified, {len(vulns)} vuln found)")

    # 2. Scan Scheduling
    print("\n[TEST 6.2] Automated Scan Scheduling API...")
    res_create_sched = client.post("/api/v1/schedules", json={
        "name": "Audit Notturno Server",
        "target": "10.0.0.1",
        "target_type": "network",
        "scan_type": "vuln_scan",
        "intensity": "light",
        "interval_hours": 12
    })
    assert res_create_sched.status_code == 200, f"Create schedule failed: {res_create_sched.text}"
    sched_data = res_create_sched.json()
    sched_id = sched_data["id"]
    print(f"  ✅ Schedule #{sched_id} created ('{sched_data['name']}', interval: {sched_data['interval_hours']}h)")

    res_list_sched = client.get("/api/v1/schedules")
    assert res_list_sched.status_code == 200
    assert any(s["id"] == sched_id for s in res_list_sched.json()), "Schedule should be in list"

    res_toggle = client.post(f"/api/v1/schedules/{sched_id}/toggle")
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_active"] is False, "Schedule should be toggled to inactive"

    res_run_now = client.post(f"/api/v1/schedules/{sched_id}/run-now")
    assert res_run_now.status_code == 200
    assert res_run_now.json()["status"] == "triggered"
    print(f"  ✅ Schedule triggered successfully: Scan #{res_run_now.json()['scan_id']}")

    # 3. AI Security Assistant
    print("\n[TEST 6.3] AI Security Assistant & Advisory...")
    mock_scan = {"id": 999, "target": "http://testphp.vulnweb.com"}
    mock_vulns = [
        {"title": "SQL Injection in search.php", "severity": "critical", "endpoint": "http://testphp.vulnweb.com/search.php"},
        {"title": "Cross-Site Scripting (Reflected)", "severity": "high", "endpoint": "http://testphp.vulnweb.com/list.php"},
        {"title": "Outdated PHP 5.3", "severity": "medium", "endpoint": "http://testphp.vulnweb.com"}
    ]
    analysis = ai_assistant.analyze_scan(mock_scan, mock_vulns)
    assert analysis["posture_score"] < 100, "Posture score should be penalized for critical findings"
    assert len(analysis["threat_vectors"]) >= 2, "Should identify SQLi and XSS threat vectors"
    print(f"  ✅ AI Posture Score: {analysis['posture_score']}/100 (Grado {analysis['posture_grade']})")
    print(f"  ✅ AI Vectors: {len(analysis['threat_vectors'])}, Mitigazioni: {len(analysis['immediate_actions'])}")

    query_res = client.post("/api/v1/ai/query", json={
        "prompt": "Come proteggere il database da SQL Injection?"
    })
    assert query_res.status_code == 200
    assert "Prepared Statements" in query_res.json()["response"], "AI should advise Prepared Statements"
    print("  ✅ AI Advisory query response verified with remediation guidance.")

    # 4. Multi-Target Projects
    print("\n[TEST 6.4] Multi-Target Projects Management...")
    proj_res = client.post("/api/v1/projects", json={
        "name": "Audit Perimetro Corporate 2026",
        "description": "Valutazione asset esterni",
        "client_name": "ACME Security Labs",
        "initial_targets": [
            {"target": "http://testphp.vulnweb.com", "target_type": "web", "notes": "Frontend"},
            {"target": "192.168.1.100", "target_type": "network", "notes": "Gateway"}
        ]
    })
    assert proj_res.status_code == 200
    proj_data = proj_res.json()
    proj_id = proj_data["id"]
    assert len(proj_data["targets"]) == 2, "Should have 2 initial targets"
    print(f"  ✅ Project #{proj_id} created with {len(proj_data['targets'])} targets")

    batch_res = client.post(f"/api/v1/projects/{proj_id}/scan-all")
    assert batch_res.status_code == 200
    assert batch_res.json()["status"] == "launched"
    assert len(batch_res.json()["scan_ids"]) == 2
    print(f"  ✅ Batch scan launched on all {len(batch_res.json()['scan_ids'])} project targets: {batch_res.json()['scan_ids']}")

    # 5. Notifications & Alerts
    print("\n[TEST 6.5] Notifications & Alerting Engine...")
    cfg_get = client.get("/api/v1/notifications/config")
    assert cfg_get.status_code == 200
    cfg_post = client.post("/api/v1/notifications/config", json={
        "telegram_enabled": False,
        "email_enabled": False,
        "webhook_enabled": False,
        "webhook_url": "https://example.com/webhook"
    })
    assert cfg_post.status_code == 200
    test_alert_res = client.post("/api/v1/notifications/test")
    assert test_alert_res.status_code == 200
    print("  ✅ Notification config and alerting dispatcher verified.")

    # 6. Plugin System
    print("\n[TEST 6.6] Custom Tool Plugin System...")
    plugin_res = client.post("/api/v1/plugins", json={
        "name": "testfuzzer",
        "display_name": "Test Fuzzer Suite",
        "category": "Directory & Content Discovery",
        "description": "High performance endpoint fuzzer",
        "version": "1.0.0",
        "command_template": "echo 'Target: {target} Status: 200 OK'",
        "vulnerability_keywords": ["200 OK"],
        "enabled": True
    })
    assert plugin_res.status_code == 200
    all_tools = list_all_tools()
    assert any(t.get("name") == "testfuzzer" for t in all_tools), "testfuzzer should appear in tools catalog"
    print(f"  ✅ Custom tool plugin successfully registered & discovered in catalog (Total: {len(all_tools)} tools)")
    # Cleanup plugin
    client.delete("/api/v1/plugins/testfuzzer")

    # 7. Overall System Health & Regression Check
    print("\n[TEST 6.7 / 6.8] System Health & MVP Regression Check...")
    health = client.get("/api/health").json()
    assert health["status"] == "healthy"
    for feat, status in health["features"].items():
        assert status is True, f"Feature {feat} should be active"
    print(f"  ✅ All features active: {list(health['features'].keys())}")

    stats = client.get("/api/v1/stats").json()
    assert "critical_vulns" in stats
    assert "total_scans" in stats
    print(f"  ✅ System telemetry verified: Total Scans = {stats['total_scans']}")

    print("\n" + "=" * 60)
    print("🎉 TUTTI I TEST DELLA FASE 6 SONO STATI SUPERATI CON SUCCESSO!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
