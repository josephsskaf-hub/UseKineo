@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 103 (YOUTUBE CONNECT + PILOTO $99 + REVIVE) ===== > push_103_log.txt
git config user.email "josephsskaf@gmail.com" >> push_103_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_103_log.txt 2>&1

echo. >> push_103_log.txt
echo [1/4] extraindo os 37 arquivos do push_103_files.zip por cima do repo >> push_103_log.txt
if not exist "push_103_files.zip" (
  echo ERRO: push_103_files.zip NAO esta nesta pasta. Coloque o zip do lado deste .bat e rode de novo. >> push_103_log.txt
  type push_103_log.txt
  echo.
  echo ###### FALTOU O ZIP - leia acima ######
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0push_103_files.zip' -DestinationPath '%~dp0' -Force" >> push_103_log.txt 2>&1
if errorlevel 1 (echo FALHOU A EXTRACAO >> push_103_log.txt) else (echo extraido ok >> push_103_log.txt)

echo. >> push_103_log.txt
echo [2/4] nenhuma dependencia nova neste push - package.json intacto >> push_103_log.txt

echo. >> push_103_log.txt
echo [3/4] staging >> push_103_log.txt
git add -A >> push_103_log.txt 2>&1
git diff --cached --name-status >> push_103_log.txt 2>&1

echo. >> push_103_log.txt
echo [4/4] commit + push >> push_103_log.txt
git commit -F push_103_msg.txt >> push_103_log.txt 2>&1

git push origin main >> push_103_log.txt 2>&1
git status --short --branch >> push_103_log.txt 2>&1
echo ===== FIM ===== >> push_103_log.txt
type push_103_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
