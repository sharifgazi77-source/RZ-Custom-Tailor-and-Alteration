$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 20 or newer first.' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Install Python 3.11 or newer first.' }
if (-not (Test-Path 'backend/.env')) { Copy-Item 'backend/.env.example' 'backend/.env'; Write-Host 'Created backend/.env. Set SECRET_KEY and admin credentials before first run.' }
npm install
python -m venv backend/.venv
& 'backend/.venv/Scripts/python.exe' -m pip install -r backend/requirements.txt
& 'backend/.venv/Scripts/python.exe' -m alembic upgrade head
Write-Host 'Dependencies installed. Edit backend/.env, then run .\start-backend.ps1 and npm run dev in separate terminals.'
