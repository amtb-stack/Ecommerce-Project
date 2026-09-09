@echo off
REM Opens the folder where your reports are saved.
setlocal
cd /d "%~dp0"
if not exist "reports" mkdir "reports"
echo Your reports are in:
echo    %~dp0reports
echo.
start "" "%~dp0reports"
