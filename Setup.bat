@echo off
REM One-time setup. Creates an isolated Python environment and installs
REM what the analyser needs, then proves it actually works.
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  ==========================================================
echo   Shop Ads Analyser - one-time setup
echo  ==========================================================
echo.

REM --- find Python -----------------------------------------------------
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY (
    where python >nul 2>&1 && set "PY=python"
)
if not defined PY (
    echo  [X] Python is not installed, or Windows cannot find it.
    echo.
    echo      1. Go to https://www.python.org/downloads/
    echo      2. Download Python for Windows and run the installer
    echo      3. IMPORTANT: tick "Add python.exe to PATH" on the first screen
    echo      4. Restart this computer, then run Setup.bat again
    goto :stop
)

REM --- check the version is new enough ---------------------------------
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if errorlevel 1 (
    echo  [X] Your Python is too old. This tool needs Python 3.10 or newer.
    %PY% --version
    echo.
    echo      Install a current version from https://www.python.org/downloads/
    goto :stop
)

for /f "delims=" %%v in ('%PY% -c "import sys;print(sys.version.split()[0])"') do set "PYVER=%%v"
echo  [1/4] Found Python !PYVER!

REM --- create the environment ------------------------------------------
if exist ".venv\Scripts\python.exe" (
    echo  [2/4] Environment already exists - reusing it
) else (
    echo  [2/4] Creating an isolated environment in .venv ...
    %PY% -m venv .venv
    if errorlevel 1 (
        echo.
        echo  [X] Could not create the environment.
        echo      This usually means the project sits in a protected folder.
        echo      Move the whole folder to somewhere simple like C:\ShopAds
        echo      and run Setup.bat again.
        goto :stop
    )
)

set "VPY=.venv\Scripts\python.exe"

REM --- install dependencies --------------------------------------------
echo  [3/4] Installing components (this can take a minute) ...
"%VPY%" -m pip install --upgrade pip --quiet
"%VPY%" -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo.
    echo  [X] Installation failed.
    echo      The most common cause is no internet connection, or a company
    echo      firewall blocking downloads. Check your connection and retry.
    echo      If you are on a work laptop, try again on a home network.
    goto :stop
)

REM --- prove it works ---------------------------------------------------
echo  [4/4] Checking everything works ...
echo.
"%VPY%" -m shopads doctor
if errorlevel 1 (
    echo.
    echo  Setup finished, but the check above found a problem.
    echo  Fix what it lists, then run Setup.bat again.
    goto :stop
)

echo.
echo  ==========================================================
echo   Setup complete.
echo  ==========================================================
echo.
echo   Next:  1. Double-click Start-Watcher.bat and leave it open
echo          2. Drag your Shopee export into the "drop" folder
echo          3. Your report appears in the "reports" folder
echo.
pause
exit /b 0

:stop
echo.
pause
exit /b 1
