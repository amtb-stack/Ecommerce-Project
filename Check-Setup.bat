@echo off
REM Checks your setup and explains anything that is wrong, in plain English.
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m shopads doctor
) else (
    echo Environment not found - run Setup.bat first.
    echo.
    where py >nul 2>&1 && (py -3 -m shopads doctor) || (python -m shopads doctor)
)
pause
