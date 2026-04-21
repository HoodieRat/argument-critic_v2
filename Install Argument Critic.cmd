@echo off
setlocal

cd /d "%~dp0"
title Argument Critic Install

call :resolve_node
if not defined NODE_EXE goto :install_node

call :read_node_major
if not defined NODE_MAJOR goto :node_version_failed
if %NODE_MAJOR% LSS 22 goto :upgrade_node
goto :after_node

:install_node
echo Node.js 22 or newer was not found.
echo Installing Node.js LTS with winget...
call :ensure_winget
if errorlevel 1 exit /b 1
call winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements --silent
if errorlevel 1 goto :node_install_failed
call :refresh_node_path
call :resolve_node
if not defined NODE_EXE goto :node_install_failed
call :read_node_major
if not defined NODE_MAJOR goto :node_version_failed
if %NODE_MAJOR% LSS 22 goto :node_version_failed
goto :after_node

:upgrade_node
echo Node.js %NODE_MAJOR% was detected.
echo Upgrading to Node.js LTS with winget...
call :ensure_winget
if errorlevel 1 exit /b 1
call winget upgrade --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements --silent
if errorlevel 1 goto :node_version_failed
call :refresh_node_path
call :resolve_node
call :read_node_major
if not defined NODE_MAJOR goto :node_version_failed
if %NODE_MAJOR% LSS 22 goto :node_version_failed

:after_node
call :resolve_gh
if not defined GH_EXE goto :install_github_cli
goto :after_github_cli

:install_github_cli
echo GitHub CLI was not found.
echo Installing GitHub CLI with winget...
call :ensure_winget
if errorlevel 1 exit /b 1
call winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements --silent
if errorlevel 1 goto :github_cli_install_failed
call :refresh_gh_path
call :resolve_gh
if not defined GH_EXE goto :github_cli_install_failed

:after_github_cli
echo [1/6] Enabling Corepack...
call corepack enable >nul 2>nul
call corepack pnpm --version >nul 2>nul
if errorlevel 1 goto :corepack_failed

echo [2/6] Refreshing project dependencies...
if exist "node_modules" rd /s /q "node_modules"
if errorlevel 1 goto :install_failed
call corepack pnpm install --force
if errorlevel 1 goto :install_failed

echo [3/6] Repairing native runtime dependencies...
call corepack pnpm exec tsx scripts/nativeDependencyHealth.ts
if errorlevel 1 goto :native_dependency_failed

echo [4/6] Preparing local project folders...
call corepack pnpm run app:setup
if errorlevel 1 goto :setup_failed

echo [5/6] Prebuilding the app for fast starts...
if exist "apps\desktop\dist" rd /s /q "apps\desktop\dist"
if exist "apps\server\dist" rd /s /q "apps\server\dist"
call corepack pnpm build
if errorlevel 1 goto :build_failed

call :write_build_stamp
if errorlevel 1 goto :build_stamp_failed

echo [6/6] Verifying GitHub sign-in support...
call gh --version >nul 2>nul
if errorlevel 1 goto :github_cli_verify_failed

echo.
echo Argument Critic is installed and ready.
echo Open Start Argument Critic.cmd whenever you want to run the app.
echo Start Menu shortcuts from older packaged installs may point to an older release build.
echo To run the current source version in this folder, always use Start Argument Critic.cmd.
echo Open Settings in the app and choose Sign in with GitHub after startup.
echo The installer already handled GitHub CLI so normal users should not need to paste a token manually.
call :pause_if_interactive
exit /b 0

:resolve_node
set "NODE_EXE="
for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if defined NODE_EXE goto :eof
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if defined NODE_EXE goto :eof
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
goto :eof

:refresh_node_path
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
goto :eof

:resolve_gh
set "GH_EXE="
for /f "delims=" %%I in ('where gh 2^>nul') do if not defined GH_EXE set "GH_EXE=%%I"
if defined GH_EXE goto :eof
if exist "%ProgramFiles%\GitHub CLI\gh.exe" set "GH_EXE=%ProgramFiles%\GitHub CLI\gh.exe"
if defined GH_EXE goto :eof
if exist "%ProgramFiles%\GitHub CLI\bin\gh.exe" set "GH_EXE=%ProgramFiles%\GitHub CLI\bin\gh.exe"
if defined GH_EXE goto :eof
if exist "%LocalAppData%\Programs\GitHub CLI\gh.exe" set "GH_EXE=%LocalAppData%\Programs\GitHub CLI\gh.exe"
if defined GH_EXE goto :eof
if exist "%LocalAppData%\Programs\GitHub CLI\bin\gh.exe" set "GH_EXE=%LocalAppData%\Programs\GitHub CLI\bin\gh.exe"
goto :eof

:refresh_gh_path
if exist "%ProgramFiles%\GitHub CLI\" set "PATH=%ProgramFiles%\GitHub CLI;%PATH%"
if exist "%ProgramFiles%\GitHub CLI\bin\" set "PATH=%ProgramFiles%\GitHub CLI\bin;%PATH%"
if exist "%LocalAppData%\Programs\GitHub CLI\" set "PATH=%LocalAppData%\Programs\GitHub CLI;%PATH%"
if exist "%LocalAppData%\Programs\GitHub CLI\bin\" set "PATH=%LocalAppData%\Programs\GitHub CLI\bin;%PATH%"
goto :eof

:read_node_major
set "NODE_MAJOR="
if not defined NODE_EXE goto :eof
for %%I in ("%NODE_EXE%") do set "PATH=%%~dpI;%PATH%"
for /f %%I in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%I
goto :eof

:write_build_stamp
set "BUILD_COMMIT="
if exist ".git" (
  for /f %%I in ('git rev-parse HEAD 2^>nul') do set "BUILD_COMMIT=%%I"
)
if not defined BUILD_COMMIT set "BUILD_COMMIT=NO_GIT_COMMIT"
>".argument-critic-build-commit" echo %BUILD_COMMIT%
if errorlevel 1 exit /b 1
exit /b 0

:ensure_winget
where winget >nul 2>nul
if errorlevel 1 (
  echo winget is not available, so Node.js could not be installed automatically.
  echo Install Node.js LTS from https://nodejs.org/ and then run this file again.
  call :pause_if_interactive
  exit /b 1
)
goto :eof

:node_install_failed
echo Automatic Node.js installation failed.
echo Install Node.js LTS from https://nodejs.org/ and then run this file again.
call :pause_if_interactive
exit /b 1

:node_version_failed
echo Node.js 22 or newer is required.
echo Update Node.js to the current LTS release and then run this file again.
call :pause_if_interactive
exit /b 1

:github_cli_install_failed
echo Automatic GitHub CLI installation failed.
echo Install GitHub CLI from https://cli.github.com/ and then run this file again.
call :pause_if_interactive
exit /b 1

:github_cli_verify_failed
echo.
echo GitHub CLI could not be verified after install.
echo Install GitHub CLI from https://cli.github.com/ and then run this file again.
call :pause_if_interactive
exit /b 1

:corepack_failed
echo Corepack could not start pnpm from this Node.js installation.
echo Reinstall or repair Node.js 22+, then run this file again.
call :pause_if_interactive
exit /b 1

:install_failed
echo.
echo Dependency installation failed.
echo Fix the error shown above, then run this file again.
call :pause_if_interactive
exit /b 1

:native_dependency_failed
echo.
echo Native dependency repair failed.
echo Fix the error shown above, then run this file again.
call :pause_if_interactive
exit /b 1

:setup_failed
echo.
echo Project setup failed.
echo Fix the error shown above, then run this file again.
call :pause_if_interactive
exit /b 1

:build_failed
echo.
echo The app build failed.
echo Fix the error shown above, then run this file again.
call :pause_if_interactive
exit /b 1

:build_stamp_failed
echo.
echo The app build succeeded, but writing the local build stamp failed.
echo Ensure this folder is writable, then run this file again.
call :pause_if_interactive
exit /b 1

:pause_if_interactive
if defined ARGUMENT_CRITIC_NONINTERACTIVE exit /b 0
pause
exit /b 0