# RESQ - Start Backend Server

Write-Host "Starting RESQ Backend Server..." -ForegroundColor Green

# Activate virtual environment
& ".\.venv\Scripts\Activate.ps1"

# Navigate to backend directory
Set-Location backend

# Start the server
Write-Host "Backend running on http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "" 
Write-Host "Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@resq.net" -ForegroundColor Yellow
Write-Host "  Password: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
