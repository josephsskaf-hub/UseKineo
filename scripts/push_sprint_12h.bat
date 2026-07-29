@echo off
REM KINEO-ACQ-SPRINT-2026-07-29 — commita o stage e envia, gravando TUDO em log.
REM Roda na maquina do fundador por dois motivos: a credencial do GitHub vive no
REM Windows Credential Manager, e o OneDrive recria .git/index.lock mais rapido
REM do que a sandbox consegue remover, entao o commit tem que sair daqui.
REM Nao adiciona arquivo nenhum: so commita o stage existente e empurra.
REM A saida vai para scripts\push_result.log para poder ser lida sem terminal.
cd /d "%~dp0.."
set LOG=scripts\push_result.log
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
  echo === STAGE ===
  git status --short
  echo.
  echo === COMMIT ===
  git -c user.name="Kineo CEO" -c user.email="josephsskaf@gmail.com" commit -F "scripts/acq_commit_msg.txt"
  echo COMMIT_EXIT=%%ERRORLEVEL%%
  echo.
  echo === PUSH ===
  git push origin main
  echo PUSH_EXIT=%%ERRORLEVEL%%
  echo.
  echo === RESULTADO ===
  git log --oneline -3
  git status -sb
) > "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Log em %LOG%. Feche esta janela.
pause
