import io
import csv
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, JSONResponse, HTMLResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..scans.models import Scan, Result, Vulnerability

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    scans = db.query(Scan).filter(Scan.status == "completed").all()
    reports = []
    for s in scans:
        vuln_count = db.query(Vulnerability).filter(Vulnerability.scan_id == s.id).count()
        reports.append({
            "scan_id": s.id,
            "target": s.target,
            "scan_type": s.scan_type,
            "completed_at": s.end_time.isoformat() if s.end_time else None,
            "vulnerabilities_found": vuln_count,
            "stats": s.stats
        })
    return reports

@router.get("/compare/diff")
def compare_reports(scan_a: int, scan_b: int, db: Session = Depends(get_db)):
    """Compare baseline scan (A) vs follow-up scan (B) to identify remediated, new, and persistent vulnerabilities."""
    s_a = db.query(Scan).filter(Scan.id == scan_a).first()
    s_b = db.query(Scan).filter(Scan.id == scan_b).first()
    if not s_a or not s_b:
        raise HTTPException(status_code=404, detail="One or both scans not found")

    vulns_a = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_a).all()
    vulns_b = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_b).all()

    map_a = {f"{v.title.strip().lower()}|{v.endpoint.strip().lower()}": v for v in vulns_a}
    map_b = {f"{v.title.strip().lower()}|{v.endpoint.strip().lower()}": v for v in vulns_b}

    remediated = []
    persistent = []
    new_findings = []

    for sig, v_a in map_a.items():
        if sig in map_b:
            persistent.append({
                "title": v_a.title,
                "severity": v_a.severity,
                "cvss_score": v_a.cvss_score,
                "endpoint": v_a.endpoint
            })
        else:
            remediated.append({
                "title": v_a.title,
                "severity": v_a.severity,
                "cvss_score": v_a.cvss_score,
                "endpoint": v_a.endpoint
            })

    for sig, v_b in map_b.items():
        if sig not in map_a:
            new_findings.append({
                "title": v_b.title,
                "severity": v_b.severity,
                "cvss_score": v_b.cvss_score,
                "endpoint": v_b.endpoint
            })

    score_a = sum(v.cvss_score for v in vulns_a)
    score_b = sum(v.cvss_score for v in vulns_b)
    risk_reduction = 0.0
    if score_a > 0:
        risk_reduction = round(((score_a - score_b) / score_a) * 100.0, 1)

    return {
        "baseline_scan": {
            "id": s_a.id,
            "target": s_a.target,
            "date": s_a.start_time.isoformat() if s_a.start_time else None,
            "total_vulns": len(vulns_a),
            "total_cvss": round(score_a, 1)
        },
        "followup_scan": {
            "id": s_b.id,
            "target": s_b.target,
            "date": s_b.start_time.isoformat() if s_b.start_time else None,
            "total_vulns": len(vulns_b),
            "total_cvss": round(score_b, 1)
        },
        "remediated_count": len(remediated),
        "new_count": len(new_findings),
        "persistent_count": len(persistent),
        "risk_reduction_pct": risk_reduction,
        "remediated_vulnerabilities": remediated,
        "new_vulnerabilities": new_findings,
        "persistent_vulnerabilities": persistent
    }

@router.get("/{scan_id}/export/json")
def export_json(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).all()
    results = db.query(Result).filter(Result.scan_id == scan_id).all()

    report_data = {
        "report_title": f"TORNET Security Assessment Report — {scan.target}",
        "generated_at": datetime.utcnow().isoformat(),
        "scan": {
            "id": scan.id,
            "target": scan.target,
            "type": scan.scan_type,
            "intensity": scan.intensity,
            "start_time": scan.start_time.isoformat() if scan.start_time else None,
            "end_time": scan.end_time.isoformat() if scan.end_time else None,
            "stats": json.loads(scan.stats or "{}")
        },
        "vulnerabilities": [
            {
                "id": v.id,
                "title": v.title,
                "severity": v.severity,
                "cvss_score": v.cvss_score,
                "cve_id": v.cve_id,
                "endpoint": v.endpoint,
                "tool": v.tool_found_by,
                "description": v.description,
                "remediation": v.remediation
            }
            for v in vulns
        ],
        "tool_results": [
            {
                "tool": r.tool_name,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "summary": json.loads(r.parsed_data or "{}")
            }
            for r in results
        ]
    }
    return JSONResponse(
        content=report_data,
        headers={"Content-Disposition": f"attachment; filename=tornet-report-scan-{scan_id}.json"}
    )

@router.get("/{scan_id}/export/csv")
def export_csv(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["ID", "Title", "Severity", "CVSS", "CVE", "Endpoint", "Tool Found By", "Description", "Remediation"])
    for v in vulns:
        writer.writerow([
            v.id, v.title, v.severity.upper(), v.cvss_score, v.cve_id or "N/A",
            v.endpoint, v.tool_found_by, v.description.replace("\n", " "), v.remediation.replace("\n", " ")
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tornet-vulns-scan-{scan_id}.csv"}
    )

@router.get("/{scan_id}/export/html")
def export_html(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).all()
    stats = json.loads(scan.stats or "{}")

    vuln_rows = ""
    for v in vulns:
        sev_color = {
            "critical": "#ef4444",
            "high": "#f97316",
            "medium": "#f59e0b",
            "low": "#3b82f6",
            "info": "#10b981"
        }.get(v.severity.lower(), "#64748b")

        vuln_rows += f"""
        <div style="background:#0f172a; border-left:4px solid {sev_color}; padding:16px; margin-bottom:14px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:#f8fafc; font-size:16px;">{v.title}</h3>
                <span style="background:{sev_color}; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; text-transform:uppercase;">
                    {v.severity} | CVSS {v.cvss_score}
                </span>
            </div>
            <p style="color:#94a3b8; font-size:13px; margin:8px 0;"><strong>Endpoint:</strong> <code>{v.endpoint}</code> | <strong>Detected By:</strong> {v.tool_found_by}</p>
            <p style="color:#cbd5e1; font-size:13px; margin:6px 0;">{v.description}</p>
            <div style="background:#1e293b; padding:10px 12px; border-radius:4px; margin-top:8px;">
                <strong style="color:#38bdf8; font-size:12px;">Remediation Recommendation:</strong>
                <p style="color:#e2e8f0; font-size:12px; margin:4px 0 0 0;">{v.remediation}</p>
            </div>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <title>TORNET Security Assessment Report — {scan.target}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #030712; color: #f8fafc; margin: 0; padding: 40px; }}
            .container {{ max-width: 960px; margin: 0 auto; }}
            .header {{ border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }}
            .badge-grid {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 30px; }}
            .badge-box {{ background: #0b0f19; border: 1px solid #1e293b; padding: 14px; border-radius: 8px; text-align: center; }}
            .badge-num {{ font-size: 24px; font-weight: 800; }}
            .badge-label {{ font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <h1 style="margin:0; font-size:24px; color:#38bdf8;">TORNET COMMAND CENTER</h1>
                    <div style="color:#94a3b8; font-size:13px; margin-top:4px;">Official Cybersecurity Assessment Report</div>
                </div>
                <div style="text-align:right; color:#94a3b8; font-size:12px;">
                    <div>Target: <strong style="color:#fff;">{scan.target}</strong></div>
                    <div>Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</div>
                </div>
            </div>

            <div class="badge-grid">
                <div class="badge-box"><div class="badge-num" style="color:#ef4444;">{stats.get('critical', 0)}</div><div class="badge-label">Critical</div></div>
                <div class="badge-box"><div class="badge-num" style="color:#f97316;">{stats.get('high', 0)}</div><div class="badge-label">High</div></div>
                <div class="badge-box"><div class="badge-num" style="color:#f59e0b;">{stats.get('medium', 0)}</div><div class="badge-label">Medium</div></div>
                <div class="badge-box"><div class="badge-num" style="color:#3b82f6;">{stats.get('low', 0)}</div><div class="badge-label">Low</div></div>
                <div class="badge-box"><div class="badge-num" style="color:#10b981;">{stats.get('info', 0)}</div><div class="badge-label">Info</div></div>
            </div>

            <h2 style="font-size:18px; border-bottom:1px solid #1e293b; padding-bottom:8px; margin-bottom:16px;">Vulnerability Findings ({len(vulns)})</h2>
            {vuln_rows if vuln_rows else '<p style="color:#94a3b8;">No vulnerabilities recorded for this assessment.</p>'}
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
