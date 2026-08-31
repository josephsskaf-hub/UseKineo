@echo off
REM ================================================================
REM  !SUBIR-SOZINHO.bat - versao SILENCIOSA do !RODAR-AGORA.
REM  Feita para a tarefa agendada do Windows: sem PAUSE, sem janela
REM  esperando gente. Empurra a branch entrega-atual para main e
REM  registra tudo em scripts\push_auto.log.
REM  Se nao houver nada novo, o git diz "Everything up-to-date" e o
REM  bat sai em silencio - rodar de 20 em 20 minutos e inofensivo.
REM ================================================================
cd /d "%~dp0.."
powershell -NoProfile -Command "Get-ChildItem -Path '.git\*' -Recurse -Include '*.lock','tmp_obj_*' -Force -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-20) } | Remove-Item -Force -ErrorAction SilentlyContinue"
echo. >> scripts\push_auto.log
echo ===== %DATE% %TIME% ===== >> scripts\push_auto.log
git fetch origin >> scripts\push_auto.log 2>&1
git push origin entrega-atual:main >> scripts\push_auto.log 2>&1
if %errorlevel% == 0 (
  echo RESULTADO: ok >> scripts\push_auto.log
) else (
  echo RESULTADO: FALHOU - provavelmente o Codex empurrou por cima; o Claude rebasa na proxima rodada. >> scripts\push_auto.log
)
exit /b %errorlevel%
