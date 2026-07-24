@echo off
setlocal
cd /d "%~dp0"

git add -- "app/globals.css" "push_79_hover_preselect_blue.bat"

git diff --cached --quiet
if not errorlevel 1 (
  echo PUSH_79_NOTHING_TO_COMMIT
  exit /b 1
)

git commit -m "PUSH #79 blue pre-select hover on cards site-wide"
if errorlevel 1 exit /b 1

git push origin main
if errorlevel 1 exit /b 1

echo PUSH_79_COMPLETE
endlocal
