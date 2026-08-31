@echo off
REM  Remove a tarefa automatica de push criada pelo INSTALAR-PUSH-AUTOMATICO.bat
schtasks /Delete /TN "KineoPushAuto" /F
echo.
echo  == Tarefa removida. O push volta a ser manual. ==
pause
