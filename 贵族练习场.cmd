@echo off
chcp 65001 >nul
call "%~dp0开始游戏.cmd" --practice=noble %*
exit /b %ERRORLEVEL%
