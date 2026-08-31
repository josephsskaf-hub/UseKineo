@echo off
REM ================================================================
REM  INSTALAR-PUSH-AUTOMATICO.bat - roda UMA vez, e nunca mais.
REM  Cria a tarefa "KineoPushAuto" no Agendador do Windows: executa
REM  scripts\!SUBIR-SOZINHO.bat a cada 20 minutos, em silencio.
REM  Depois disso o fundador nao precisa clicar em mais nada: toda
REM  rodada que o Claude fechar sobe sozinha em ate 20 min.
REM
REM  v2 - o caminho tem ESPACOS e ACENTO ("Area de Trabalho"), entao
REM  o /TR precisa das aspas escapadas com \" (forma que o schtasks
REM  entende). A v1 usava cmd /c com aspas duplas duplicadas e o
REM  Windows quebrava o comando no primeiro espaco.
REM  Para remover: DESINSTALAR-PUSH-AUTOMATICO.bat
REM ================================================================
setlocal
set "ALVO=%~dp0!SUBIR-SOZINHO.bat"
echo.
echo  Alvo: %ALVO%
echo  Registrando a tarefa KineoPushAuto (a cada 20 minutos)...
echo.
schtasks /Create /TN "KineoPushAuto" /TR "\"%ALVO%\"" /SC MINUTE /MO 20 /F
if errorlevel 1 goto falhou

echo.
echo  Conferindo se a tarefa ficou mesmo registrada...
schtasks /Query /TN "KineoPushAuto" >nul 2>&1
if errorlevel 1 goto falhou

echo.
echo  == PRONTO. O push passa a acontecer sozinho a cada 20 minutos. ==
echo  Log de cada tentativa: scripts\push_auto.log
echo.
echo  Rodando uma vez agora para subir o que ja esta pronto...
call "%~dp0!SUBIR-SOZINHO.bat"
echo  Feito. Veja o resultado em scripts\push_auto.log
goto fim

:falhou
echo.
echo  XX Nao consegui registrar a tarefa.
echo     Tente: botao direito neste arquivo -^> "Executar como administrador".
echo     Se continuar falhando, me avise no chat com o texto do erro acima.

:fim
echo.
pause
