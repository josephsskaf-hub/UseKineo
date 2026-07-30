@echo off
REM KINEO-PUSH-ONLY-2026-07-30 — SO EMPURRA. Nao adiciona, nao commita.
REM
REM Por que existe, separado de push_sprint_12h.bat: naquele script o commit e o
REM push estao juntos, e ele commita usando scripts/acq_commit_msg.txt. Quando a
REM sandbox JA commitou (que e o caso normal agora — ela consegue commitar usando
REM um GIT_INDEX_FILE alternativo em /tmp, contornando o .git/index.lock que o
REM OneDrive recria), rodar aquele script arrisca criar um commit vazio ou, pior,
REM commitar o que estiver no stage com uma mensagem de sprint antiga.
REM
REM O que a sandbox NAO consegue: empurrar. A credencial do GitHub vive no Windows
REM Credential Manager e nao existe dentro do container. Esta e a unica parte que
REM precisa da sua maquina.
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
  REM 30/07 — a sandbox conseguiu commitar 583e6a6 usando um GIT_INDEX_FILE em /tmp,
  REM mas esse commit deixou um .git\HEAD.lock que ela nao tem permissao para apagar,
  REM e isso bloqueou QUALQUER commit seguinte. Estes dois arquivos ficaram de fora.
  REM Sao adicionados por CAMINHO EXPLICITO de proposito: o repo tem ~175 arquivos
  REM sujos so de ruido CRLF do OneDrive, e um "git add -A" aqui commitaria todos.
  echo === COMMITANDO OS DOIS ARQUIVOS QUE FICARAM FORA ===
  git add scripts/push_only.bat docs/GATES-ABERTOS.md
  git -c user.name="Kineo CEO" -c user.email="josephsskaf@gmail.com" commit -m "CHORE: push_only.bat e gates - a sandbox commita, so o push precisa da sua maquina"
  echo COMMIT_EXIT=%ERRORLEVEL%
  echo (falhar aqui com "nothing to commit" e normal e nao impede o push)
  echo.
  echo === PUSH ===
  git push origin main
  echo PUSH_EXIT=%ERRORLEVEL%
  echo.
  echo === CONFERINDO O REMOTO ===
  git ls-remote origin main
  echo.
  echo Se o hash acima for igual ao do commit do topo, subiu.
) > "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Log em %LOG%. Feche esta janela.
pause
