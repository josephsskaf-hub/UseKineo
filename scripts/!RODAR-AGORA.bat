@echo off
setlocal
REM Usage: !RODAR-AGORA.bat CANDIDATE_SHA REVIEWED_MAIN_SHA
REM Two full SHAs mandatory; no cleanup or automatic reconciliation.
"C:\Program Files\Git\bin\bash.exe" "%~dp0publish-reviewed-queue.sh" "%~dp0.." "%~1" "%~2"
set "KINEO_PUBLISH_EXIT=%ERRORLEVEL%"
exit /b %KINEO_PUBLISH_EXIT%
