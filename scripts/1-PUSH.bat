@echo off
REM KINEO-PUSH-ONLY-2026-07-30-v2 — SO EMPURRA. NAO ADICIONA, NAO COMMITA.
REM
REM ======================= POR QUE A v1 ERA PERIGOSA =======================
REM A versao anterior deste script fazia:
REM     git add scripts/push_only.bat docs/GATES-ABERTOS.md
REM     git commit -m "CHORE: ..."
REM
REM "git commit" SEM -a commita o INDICE INTEIRO, nao apenas os caminhos do
REM "git add". E o .git\index deste repo estava envenenado: guardava uma copia
REM velha que marcava a REMOCAO de 876 linhas em 7 arquivos — inclusive as 85
REM linhas da correcao da entrega paga (o unico cliente pagante), o Footer.tsx e
REM as sprints B e C de 30/07.
REM
REM Rodar a v1 teria repetido, sobre o trabalho ja restaurado, exatamente o
REM acidente do commit b6fef68 — e desta vez teria EMPURRADO o estrago.
REM
REM ======================= O QUE A v2 FAZ =======================
REM 1. Apaga os dois locks que o OneDrive recria (.git\index.lock, .git\HEAD.lock).
REM 2. RESSINCRONIZA O INDICE COM O HEAD (git reset --mixed). Isso desarma a bomba
REM    acima. Nenhum arquivo do seu disco e alterado — reset --mixed mexe so no
REM    indice.
REM 3. Empurra. So isso.
REM
REM A sandbox ja commita sozinha, usando um GIT_INDEX_FILE alternativo em /tmp
REM criado com "git read-tree HEAD" — NUNCA com "cp .git/index", que foi a origem
REM do acidente. O que ela nao consegue e empurrar: a credencial do GitHub vive no
REM Windows Credential Manager e nao existe dentro do container.
REM
REM Uso: duplo clique. A saida fica em scripts\push_result.log.
cd /d "%~dp0.."
set LOG=scripts\push_result.log
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
  echo === ANTES ===
  git log --oneline -3
  git status -sb
  echo.
  echo === DESARMANDO O INDICE ^(nenhum arquivo do disco e tocado^) ===
  git reset --mixed
  echo RESET_EXIT=%ERRORLEVEL%
  echo.
  echo === PUSH ===
  git push origin main
  echo PUSH_EXIT=%ERRORLEVEL%
  echo.
  echo === CONFERINDO O REMOTO ===
  git ls-remote origin main
  echo.
  echo Se o hash do topo do log aparecer aqui, subiu.
) > "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Log em %LOG%. Feche esta janela.
pause
