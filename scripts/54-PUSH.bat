@echo off
REM 54-PUSH - sprint 13h: seguranca /api/render/[id] (posse via render_jobs) + grant de 40 no trial + instrumento do A/B
cd /d "%~dp0.."
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
set LOG=scripts\push_result.log
echo === ANTES === > "%LOG%" 2>&1
git --no-pager log --oneline -4 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
echo === REMOTO === >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Se PUSH_EXIT=0, SUBIU. Pode fechar.
pause
