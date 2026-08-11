@echo off
REM ============================================================================
REM 69-PUSH.bat  -  sprint 16h de 11/08/2026
REM
REM SUBSTITUI o 68 e todos os anteriores. Rode ESTE.
REM
REM POR QUE UM 69 SE O 68 JA FAZIA A MESMA COISA:
REM   O 68 (e o 67) foram gravados com quebra de linha LF. O cmd.exe do Windows
REM   tropeca em .bat com LF. O historico bate: 65 e 66 nasceram em CRLF e o
REM   push RODOU depois deles (origin/main andou de 6fcc83b para 4061731);
REM   67 e 68 nasceram em LF e origin/main nao anda desde entao. Este arquivo
REM   esta em CRLF de proposito. Se der erro estranho, e o EOL - nao o git.
REM
REM ESTADO NESTE MOMENTO:
REM   origin/main = 4061731  (conferido por git ls-remote em 11/08 ~19:1xZ)
REM   HEAD local  = bde6de8  (13 commits a frente)
REM   Locks orfaos presentes: .git\HEAD.lock, .git\index.lock,
REM   .git\refs\heads\main.lock  - o sandbox Linux nao consegue apagar
REM   (Operation not permitted). So o Windows apaga. Este script apaga.
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
echo Se a linha acima mostrar bde6de8..., o push FUNCIONOU.
echo.
pause
