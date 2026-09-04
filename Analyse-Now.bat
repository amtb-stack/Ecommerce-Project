@echo off
REM Processes whatever is sitting in drop\ right now, then exits.
REM You can also drag files onto this file to analyse them directly.
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Virtual environment not found. Run Setup.bat first.
    pause
    exit /b 1
)
if "%~1"=="" (
    ".venv\Scripts\python.exe" -m shopads once
) else (
    ".venv\Scripts\python.exe" -m shopads analyze %* --open
)
pause
