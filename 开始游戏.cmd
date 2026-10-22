@echo off
setlocal
chcp 65001 >nul
title Baishou Yexing - Noble V3
pushd "%~dp0"
if exist "runtime\node.exe" goto bundled
where node >nul 2>nul
if errorlevel 1 goto missing
node "launch-game.cjs" %*
goto finished
:bundled
"runtime\node.exe" "launch-game.cjs" %*
:finished
set "GAME_EXIT=%ERRORLEVEL%"
if not "%GAME_EXIT%"=="0" pause
popd
exit /b %GAME_EXIT%
:missing
echo Runtime missing. Extract the complete portable ZIP, including runtime\node.exe.
pause
popd
exit /b 1
