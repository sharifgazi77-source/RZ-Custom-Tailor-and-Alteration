$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
if (-not (Test-Path 'backend/.venv/Scripts/python.exe')) { throw 'Run .\setup-windows.ps1 first.' }
& 'backend/.venv/Scripts/python.exe' -m uvicorn app.main:app --app-dir backend --reload
