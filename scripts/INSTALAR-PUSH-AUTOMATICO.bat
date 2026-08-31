@echo off
REM ================================================================
REM  INSTALAR-PUSH-AUTOMATICO.bat - roda UMA vez.
REM  Cria a tarefa "KineoPushAuto" no Agendador do Windows: executa
REM  scripts\!SUBIR-SOZINHO.bat a cada 20 minutos, escondido.
REM  Depois disso o fundador nao precisa mais clicar em nada.
REM  Para remover: DESINSTALAR-PUSH-AUTOMATICO.bat
REM ================================================================
setlocal
set ALVO=%~dp0!SUBIR-SOZINHO.bat
echo Registrando a tarefa KineoPushAuto (a cada 20 minutos)...
schtasks /Create /TN "KineoPushAuto" /TR "cmd /c \"\"%ALVO%\"\"" /SC MINUTE /MO 20 /F
if %errorlevel% == 0 (
  echo.
  echo  == PRONTO. O push passa a acontecer sozinho a cada 20 min. ==
  echo  Log: scripts\push_auto.log
) else (
  echo.
  echo  XX Nao consegui registrar a tarefa. Tente clicar com o botao
  echo     direito neste arquivo e "Executar como administrador".
)
pause
