@echo off
REM ============================================================================
REM 68-PUSH.bat  —  sprint 10h de 11/08/2026
REM
REM SUBSTITUI o 67 e todos os anteriores. Rode ESTE.
REM
REM O QUE MUDOU DESDE O 67:
REM  - origin/main NAO e mais 6fcc83b. E 4061731 (conferido 11/08 13:2xZ).
REM  - os commits estao em refs/heads/main (nao em sprint-19h).
REM  - apareceram locks orfaos NOVOS que o sandbox Linux nao consegue apagar
REM    (Operation not permitted): .git\HEAD.lock, .git\index.lock e
REM    .git\refs\heads\main.lock. So o Windows apaga. Este script apaga.
REM
REM GARANTIA: este script NAO cria commit, NAO faz git add, NAO faz git reset
REM e NAO escreve em nenhum arquivo do projeto. So apaga locks orfaos do .git
REM e roda git push. Nao ha como apagar trabalho.
REM
REM SEGURO RODAR DUAS VEZES.
REM ============================================================================

cd /d "%~dp0.."

echo.
echo === 1) Limpando locks orfaos do .git ===
if exist ".git\HEAD.lock"            del /f /q ".git\HEAD.lock"            2>nul
if exist ".git\index.lock"           del /f /q ".git\index.lock"           2>nul
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock" 2>nul
if exist ".git\config.lock"          del /f /q ".git\config.lock"          2>nul
if exist ".git\packed-refs.lock"     del /f /q ".git\packed-refs.lock"     2>nul
echo    locks limpos.

echo.
echo === 2) Estado antes do push ===
git rev-parse --abbrev-ref HEAD
echo    HEAD local:
git log --oneline -1
echo    origin/main remoto:
git ls-remote origin refs/heads/main

echo.
echo === 3) Commits que vao subir ===
git log 4061731..HEAD --oneline

echo.
echo === 4) PUSH ===
git push origin main

echo.
echo === 5) Confirmacao (origin/main depois do push) ===
git ls-remote origin refs/heads/main

echo.
echo Se a linha acima mostrar o mesmo SHA do HEAD local, o push FUNCIONOU.
echo.
pause
