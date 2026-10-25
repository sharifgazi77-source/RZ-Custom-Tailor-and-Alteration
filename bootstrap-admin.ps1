$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
if (-not (Test-Path 'backend/.venv/Scripts/python.exe')) { throw 'Run .\setup-windows.ps1 first.' }
& 'backend/.venv/Scripts/python.exe' -c "from dotenv import load_dotenv; load_dotenv('backend/.env'); import runpy; runpy.run_module('app.bootstrap', run_name='__main__')"
