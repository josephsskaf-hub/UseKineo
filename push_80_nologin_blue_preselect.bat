@echo off
setlocal
cd /d "%~dp0"

git add -- "app/globals.css" "app/(auth)/signup/page.tsx" "push_80_nologin_blue_preselect.bat"

git diff --cached --quiet
if not errorlevel 1 (
  echo PUSH_80_NOTHING_TO_COMMIT
  exit /b 1
)

git commit -m "PUSH #80 checkout no-login google autostart on buy intent + blue pre-select hover"
if errorlevel 1 exit /b 1

git push origin main
if errorlevel 1 exit /b 1

echo PUSH_80_COMPLETE
endlocal
