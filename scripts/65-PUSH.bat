@echo off
setlocal
cd /d "%~dp0.."

echo ============================================================
echo  65-PUSH  -  1 commit pronto (KINEO-TRIAL-DEATH-OFFER)
echo ============================================================
echo.
echo  Este script NAO cria commit e NAO mexe em arquivo nenhum
echo  do disco. O commit ja existe. Ele so faz push.
echo  Se falhar, nada e perdido.
echo.

git reset --mixed

echo === 1/3 Confirmando o que vai subir ===
git log origin/main..HEAD --oneline
if errorlevel 1 goto :erro
echo.

echo === 2/3 Push para origin main ===
git push origin main
if errorlevel 1 goto :erro
echo.

echo === 3/3 OK ===
echo ============================================================
echo  PUSH OK. A Vercel comeca o deploy sozinha em segundos.
echo  Confira em: https://vercel.com  (projeto "kineo")
echo ============================================================
git log --oneline -3
echo.
pause
exit /b 0

:erro
echo.
echo !!! FALHOU. Nada foi perdido - o commit continua local.
pause
exit /b 1
