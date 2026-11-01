@echo off
title TORNET Command Center Launcher
echo ========================================================
echo        TORNET — Cybersecurity Command Center
echo                 Starting All Systems...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting FastAPI Backend on port 8000...
if exist "%~dp0backend\venv\Scripts\python.exe" (
    start "TORNET Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
) else (
    start "TORNET Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
)

timeout /t 3 /nobreak >nul

echo [2/3] Starting React Vite Frontend on port 5173...
start "TORNET Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 2 /nobreak >nul

echo [3/3] Launching Command Center in Browser...
start http://127.0.0.1:5173/

echo.
echo ========================================================
echo  TORNET is running!
echo  - Frontend: http://127.0.0.1:5173/
echo  - Backend:  http://127.0.0.1:8000/
echo  - API Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
