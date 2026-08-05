@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
set LOG=%TEMP%\kineo-push-48.log

echo ============================================================
echo  48-PUSH  ^|  SO DOCUMENTACAO  ^|  SEM PRESSA
echo ============================================================
echo.
echo  Obrigado por clicar o 47 - ele subiu na hora certa.
echo.
echo  Este aqui NAO tem codigo nenhum. Sao so os documentos da
echo  sprint, registrando que o 47 ja foi clicado e que o gate
echo  esta fechado. Pode clicar quando quiser, ou deixar para
echo  a proxima sprint empurrar junto.
echo.
pause

echo ==== 48-PUSH %DATE% %TIME% ==== > "%LOG%" 2>&1
git log --oneline -5 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
pause
