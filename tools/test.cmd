@echo off
setlocal
set "NODE_HOME=%LOCALAPPDATA%\CodexTools\node-v24.16.0-win-x64"
if not exist "%NODE_HOME%\node.exe" (
  echo Portable Node was not found at "%NODE_HOME%".
  echo Ask Codex to restore the portable Node runtime, or place Node there manually.
  exit /b 1
)
set "PATH=%NODE_HOME%;%APPDATA%\npm;%PATH%"
npm test

