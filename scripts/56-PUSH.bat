@echo off
REM 56-PUSH - sprint 19h de 06/08: MODAL DE DOWNGRADE + PAYWALL CONTEXTUAL do reverse
REM trial (fase 2, itens 2b e 3), e a correcao de SEGURANCA do /api/render/[id] que
REM continua represada desde a sprint 13h - enquanto isto nao subir, a rota em
REM producao devolve a URL do MP4 de qualquer render para qualquer usuario logado.
REM Substitui o 55-PUSH (e o 54 e o 53, todos obsoletos - NAO clicar neles).
REM Sao 10 commits represados. Tudo do trial esta atras da flag KINEO_REVERSE_TRIAL_ENABLED,
REM que continua OFF: este push nao muda nada para nenhum usuario hoje.
cd /d "%~dp0.."
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
set LOG=scripts\push_result.log
echo === ANTES === > "%LOG%" 2>&1
git --no-pager log --oneline -10 >> "%LOG%" 2>&1
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
