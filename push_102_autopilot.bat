@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 102 (AUTOPILOT + PRECO) - SUBSTITUI o 98, 99, 100 e 101. Rode SO este. ===== > push_102_log.txt
git config user.email "josephsskaf@gmail.com" >> push_102_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_102_log.txt 2>&1

echo. >> push_102_log.txt
echo [1/6] extraindo os 66 arquivos do push_102_files.zip por cima do repo >> push_102_log.txt
if not exist "push_102_files.zip" (
  echo ERRO: push_102_files.zip NAO esta nesta pasta. Coloque o zip do lado deste .bat e rode de novo. >> push_102_log.txt
  type push_102_log.txt
  echo.
  echo ###### FALTOU O ZIP - leia acima ######
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0push_102_files.zip' -DestinationPath '%~dp0' -Force" >> push_102_log.txt 2>&1
if errorlevel 1 (echo FALHOU A EXTRACAO >> push_102_log.txt) else (echo extraido ok >> push_102_log.txt)

echo. >> push_102_log.txt
echo [2/6] pacote do PUSH 98 - idempotente, nao quebra se ja estiver instalado >> push_102_log.txt
call npm install @vercel/analytics --save >> push_102_log.txt 2>&1

echo. >> push_102_log.txt
echo [3/6] remove o public/llms.txt antigo - ele SOMBREIA a rota nova e a deixa morta >> push_102_log.txt
if exist "public\llms.txt" del /f /q "public\llms.txt" >> push_102_log.txt 2>&1
if exist "public\llms.txt" (echo FALHOU AO DELETAR public\llms.txt >> push_102_log.txt) else (echo public\llms.txt removido ok >> push_102_log.txt)

echo. >> push_102_log.txt
echo [4/6] remove components\ReferralMiniCard.tsx - zero imports, o zip nao consegue apagar arquivo >> push_102_log.txt
if exist "components\ReferralMiniCard.tsx" del /f /q "components\ReferralMiniCard.tsx" >> push_102_log.txt 2>&1
if exist "components\ReferralMiniCard.tsx" (echo FALHOU AO DELETAR ReferralMiniCard.tsx >> push_102_log.txt) else (echo ReferralMiniCard.tsx removido ok >> push_102_log.txt)

echo. >> push_102_log.txt
echo [5/6] staging >> push_102_log.txt
git add -A >> push_102_log.txt 2>&1
git diff --cached --name-status >> push_102_log.txt 2>&1

echo. >> push_102_log.txt
echo [6/6] commit + push >> push_102_log.txt
git commit -F push_102_msg.txt >> push_102_log.txt 2>&1

git push origin main >> push_102_log.txt 2>&1
git status --short --branch >> push_102_log.txt 2>&1
echo ===== FIM ===== >> push_102_log.txt
type push_102_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
