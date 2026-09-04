@echo off
REM Watches the drop folder. Leave this window open while you work.
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Virtual environment not found. Run Setup.bat first.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" -m shopads watch
pause
