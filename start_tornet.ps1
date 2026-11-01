# TORNET PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       TORNET — Cybersecurity Command Center" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ROOT_DIR = $PSScriptRoot
Set-Location $ROOT_DIR

Write-Host "[1/3] Avvio Backend FastAPI su porta 8000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$ROOT_DIR\backend`" && (if exist venv\Scripts\python.exe (venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000) else (python -m uvicorn app.main:app --host 127.0.0.1 --port 8000))" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/3] Avvio Frontend React Vite su porta 5173..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$ROOT_DIR\frontend`" && npm run dev -- --host 127.0.0.1 --port 5173" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "[3/3] Apertura Command Center nel browser predefinito..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5173/"

Write-Host ""
Write-Host "TORNET avviato con successo su:" -ForegroundColor Green
Write-Host "  - Frontend: http://127.0.0.1:5173/" -ForegroundColor White
Write-Host "  - Backend:  http://127.0.0.1:8000/" -ForegroundColor White
Write-Host "  - Documentazione Swagger: http://127.0.0.1:8000/docs" -ForegroundColor White
