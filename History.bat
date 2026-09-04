@echo off
REM Lists every export analysed so far, newest first.
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Virtual environment not found. Run Setup.bat first.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" -m shopads history --limit 40
pause
