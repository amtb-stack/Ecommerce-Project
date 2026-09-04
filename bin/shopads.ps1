<#
.SYNOPSIS
    PowerShell wrapper for the Shop Ads analyser.

.DESCRIPTION
    Prefers the project virtual environment, falls back to whatever Python is
    on PATH. Any arguments are passed straight through to `python -m shopads`.

.EXAMPLE
    .\bin\shopads.ps1 watch
    .\bin\shopads.ps1 analyze "C:\Downloads\ShopAdsData.csv" --open
    .\bin\shopads.ps1 history
#>
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$venv = Join-Path $root '.venv\Scripts\python.exe'
if (Test-Path $venv) {
    $python = $venv
} else {
    $python = (Get-Command python -ErrorAction SilentlyContinue)?.Source
    if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue)?.Source }
    if (-not $python) {
        Write-Error 'No Python found. Install Python 3.10+ or run Setup.bat first.'
    }
    Write-Warning 'Using system Python - run Setup.bat to create an isolated environment.'
}

if (-not $Args) { $Args = @('once') }
& $python -m shopads @Args
exit $LASTEXITCODE
