@echo off
REM 55-PUSH - sprint 16h de 06/08: CRON DE DOWNGRADE DO TRIAL (divida #1 paga: sem ele,
REM ligar a flag = 40 creditos VITALICIOS por e-mail) + auditoria de paginas orfas
REM (as 3 orfas do sitemap eram as 3 paginas de RECEITA; 0 -> 26 links internos cada).
REM Substitui o 54-PUSH. Sao 8 commits represados (3 desta sprint + 5 das anteriores).
cd /d "%~dp0.."
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
set LOG=scripts\push_result.log
echo === ANTES === > "%LOG%" 2>&1
git --no-pager log --oneline -8 >> "%LOG%" 2>&1
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
