@echo off
setlocal
echo ===================================================
echo  Starting Moto-Braking Dynamics Full-Stack Runtime
echo  FastAPI + SciPy (Port 8000) ^& Angular (Port 4200)
echo ===================================================
cd /d "%~dp0client"
call npm run dev:full
