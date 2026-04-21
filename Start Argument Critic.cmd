@echo off
setlocal

cd /d "%~dp0"
title Argument Critic

where node >nul 2>nul
if errorlevel 1 goto :missing_node

for /f %%I in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%I
if not defined NODE_MAJOR goto :bad_node
if %NODE_MAJOR% LSS 22 goto :bad_node

call corepack pnpm --version >nul 2>nul
if errorlevel 1 goto :missing_corepack

if not exist "node_modules" goto :missing_install
if not exist "apps\desktop\dist\electron\main.js" goto :missing_install
if not exist "apps\desktop\dist\renderer\index.html" goto :missing_install

call :ensure_native_runtime
if errorlevel 1 goto :native_runtime_failed

call :ensure_current_build
if errorlevel 1 goto :rebuild_failed

echo [1/1] Starting Argument Critic...
echo Leave this window open while the app is running.
echo To stop the app, press Ctrl+C here or use Exit app in the desktop drawer.
echo.
call corepack pnpm start
if errorlevel 1 goto :start_failed
goto :eof

:ensure_current_build
set "REBUILD_REQUIRED="
set "CURRENT_COMMIT="
set "BUILT_COMMIT="

if not exist ".argument-critic-build-commit" set "REBUILD_REQUIRED=1"

if exist ".git" (
	for /f %%I in ('git rev-parse HEAD 2^>nul') do set "CURRENT_COMMIT=%%I"
)

if exist ".argument-critic-build-commit" (
	set /p BUILT_COMMIT=<".argument-critic-build-commit"
)

if defined CURRENT_COMMIT (
	if /i not "%CURRENT_COMMIT%"=="%BUILT_COMMIT%" set "REBUILD_REQUIRED=1"
)

if not defined REBUILD_REQUIRED exit /b 0

echo Detected newer source changes. Rebuilding before startup so you run the current version...
if exist "apps\desktop\dist" rd /s /q "apps\desktop\dist"
if exist "apps\server\dist" rd /s /q "apps\server\dist"
call corepack pnpm build
if errorlevel 1 exit /b 1

if defined CURRENT_COMMIT (
	>".argument-critic-build-commit" echo %CURRENT_COMMIT%
) else (
	>".argument-critic-build-commit" echo NO_GIT_COMMIT
)
if errorlevel 1 exit /b 1

exit /b 0

:ensure_native_runtime
echo Checking native runtime dependencies...
call corepack pnpm exec tsx scripts/nativeDependencyHealth.ts
if errorlevel 1 exit /b 1
exit /b 0

:missing_node
echo Node.js 22 or newer is required to run Argument Critic.
echo Install it from https://nodejs.org/ and then run this file again.
call :pause_if_interactive
exit /b 1

:bad_node
echo Node.js 22 or newer is required to run Argument Critic.
echo The current version is too old. Install the current LTS release from https://nodejs.org/ and try again.
call :pause_if_interactive
exit /b 1

:missing_corepack
echo Corepack could not start pnpm from this Node.js installation.
echo Reinstall Node.js 22+ from https://nodejs.org/, reopen this folder, and run this file again.
call :pause_if_interactive
exit /b 1

:missing_install
echo.
echo Argument Critic has not been installed yet, or the desktop build output is missing.
echo Run Install Argument Critic.cmd once from this folder, then start the app again.
call :pause_if_interactive
exit /b 1

:native_runtime_failed
echo.
echo Argument Critic could not repair its native runtime dependencies.
echo Fix the error shown above, then run Install Argument Critic.cmd or Start Argument Critic.cmd again.
call :pause_if_interactive
exit /b 1

:start_failed
echo.
echo Argument Critic stopped with an error during startup.
echo Review the messages above, fix the reported issue, and run this file again.
call :pause_if_interactive
exit /b 1

:rebuild_failed
echo.
echo Argument Critic could not rebuild the latest source before startup.
echo Fix the error shown above, then run this file again.
call :pause_if_interactive
exit /b 1

:pause_if_interactive
if defined ARGUMENT_CRITIC_NONINTERACTIVE exit /b 0
pause
exit /b 0