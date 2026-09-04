@echo off
REM One-time setup: creates a local virtual environment and installs dependencies.
setlocal
cd /d "%~dp0"

where py >nul 2>&1 && (set PY=py -3) || (set PY=python)

echo Creating virtual environment in .venv ...
%PY% -m venv .venv || goto :failed

echo Installing dependencies ...
".venv\Scripts\python.exe" -m pip install --upgrade pip --quiet || goto :failed
".venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet || goto :failed

echo.
echo Setup complete.
echo   Drop exports into : %~dp0drop
echo   Reports appear in : %~dp0reports
echo.
echo Next: double-click Start-Watcher.bat
pause
exit /b 0

:failed
echo.
echo Setup FAILED. Is Python 3.10+ installed and on PATH?
echo Download it from https://www.python.org/downloads/ and tick
echo "Add Python to PATH" during installation.
pause
exit /b 1
