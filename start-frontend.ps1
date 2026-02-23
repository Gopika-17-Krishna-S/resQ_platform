# RESQ - Start Frontend Server

Write-Host "Starting RESQ Frontend..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location frontend

# Start the development server
Write-Host "Frontend running on http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev
