Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting Moto-Braking Dynamics Full-Stack Runtime" -ForegroundColor Cyan
Write-Host " FastAPI + SciPy (Port 8000) & Angular (Port 4200)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\client"
npm run dev:full
