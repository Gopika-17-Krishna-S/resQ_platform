# resQ - Complete Startup Script
# This script checks prerequisites and starts both servers

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  resQ Emergency Response System" -ForegroundColor Cyan
Write-Host "  Complete Startup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "OK PostgreSQL found" -ForegroundColor Green
} else {
    Write-Host "WARNING PostgreSQL service not detected" -ForegroundColor Red
    Write-Host "  Make sure PostgreSQL is installed and running" -ForegroundColor Yellow
}

# Check database
Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "  Database Name: resq_db" -ForegroundColor White
Write-Host "  Make sure this database exists in PostgreSQL" -ForegroundColor Gray

# Check venv
Write-Host ""
Write-Host "Checking virtual environment..." -ForegroundColor Yellow
if (Test-Path ".\.venv\Scripts\activate.ps1") {
    Write-Host "OK Virtual environment ready" -ForegroundColor Green
} else {
    Write-Host "ERROR Virtual environment (.venv) not found!" -ForegroundColor Red
    exit
}

# Check backend dependencies
Write-Host ""
Write-Host "Checking backend..." -ForegroundColor Yellow
if (Test-Path ".\backend\app\main.py") {
    Write-Host "OK Backend files found" -ForegroundColor Green
} else {
    Write-Host "ERROR Backend files missing!" -ForegroundColor Red
    exit
}

# Check frontend
Write-Host ""
Write-Host "Checking frontend..." -ForegroundColor Yellow
if (Test-Path ".\frontend\package.json") {
    Write-Host "OK Frontend files found" -ForegroundColor Green
} else {
    Write-Host "ERROR Frontend files missing!" -ForegroundColor Red
    exit
}

if (Test-Path ".\frontend\node_modules") {
    Write-Host "OK Node modules installed" -ForegroundColor Green
} else {
    Write-Host "WARNING Node modules not found" -ForegroundColor Yellow
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Starting Servers..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Opening two terminal windows:" -ForegroundColor Yellow
Write-Host "  1. Backend (Port 8000)" -ForegroundColor White
Write-Host "  2. Frontend (Port 3000)" -ForegroundColor White
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; .\start-backend.ps1"

# Wait a bit for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; .\start-frontend.ps1"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  resQ Started Successfully!" -ForegroundColor Green  
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Admin Login:" -ForegroundColor Yellow
Write-Host "  Email:    admin@resq.net" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop this script" -ForegroundColor Gray
Start-Sleep -Seconds 2
