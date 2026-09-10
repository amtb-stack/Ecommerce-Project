@echo off
REM Runs the analyser every morning without you touching it.
REM Registers a Windows scheduled task; run this once.
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Environment not found. Run Setup.bat first.
    pause
    exit /b 1
)

set "TASK=ShopAdsDailyAnalysis"
set "RUNCMD=\"%~dp0.venv\Scripts\python.exe\" -m shopads once"

echo.
echo  Setting up a daily run at 09:00.
echo.
schtasks /Query /TN "%TASK%" >nul 2>&1
if not errorlevel 1 (
    echo  A daily task already exists. Replacing it.
    schtasks /Delete /TN "%TASK%" /F >nul
)

schtasks /Create /TN "%TASK%" /TR "%RUNCMD%" /SC DAILY /ST 09:00 /F /RL LIMITED
if errorlevel 1 (
    echo.
    echo  Could not create the task. Right-click this file and choose
    echo  "Run as administrator", then try again.
    pause
    exit /b 1
)

echo.
echo  Done. Every morning at 09:00 the analyser will process whatever is
echo  waiting in the drop folder and write a report.
echo.
echo  You still need to put the export there. To remove the schedule later:
echo     schtasks /Delete /TN "%TASK%" /F
echo.
pause
