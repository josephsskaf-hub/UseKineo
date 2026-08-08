@echo off
setlocal
cd /d "%~dp0.."

echo ============================================================
echo  63-PUSH  -  7 commits prontos, so falta empurrar
echo ============================================================
echo.
echo  Este script NAO cria commit e NAO mexe em nenhum arquivo
echo  do disco. Os 7 commits ja existem. Ele so faz push.
echo  Se falhar, nada e perdido.
echo.

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
echo ############################################################
echo  FALHOU. Nada foi perdido - nenhum arquivo do disco foi
echo  alterado por este script, e os commits continuam intactos.
echo  Copie a mensagem de erro acima e mande na conversa.
echo ############################################################
echo.
pause
exit /b 1
