@echo off
REM 58-PUSH - sprint 10h de 07/08. SUBSTITUI o 57-PUSH (e 56, 55, 54, 53 - NAO clicar).
REM O 57 ja foi executado: origin/main estava em 3faabec quando esta sprint comecou.
REM
REM E 1 COMMIT SO (o de topo - sem hash de proposito: um commit nao pode citar o
REM proprio hash sem mentir):
REM   Gate de render morto que prendeu o unico pagante ativo + prova social na
REM   dobra da home + docs da sprint + correcao dos 4 blocos vencidos no topo
REM   do GATES-ABERTOS.
REM
REM POR QUE ESTE PUSH IMPORTA HOJE:
REM   valos87196, o unico pagante ativo (75 creditos comprados), voltou hoje as
REM   08:20Z, leu a pagina de preco as 11:43:01Z e queimou 31 cliques bloqueados
REM   ate 11:44Z sem NUNCA passar do primeiro clique. O snapshot que travava o
REM   botao era de 30/07 - oito dias contra um TTL de duas horas. Enquanto este
REM   commit nao subir, ele continua sem conseguir gastar o que ja pagou.
REM
REM RISCO: baixo. Sao 2 arquivos de UI (GenerateClient.tsx, KineoLanding.tsx),
REM tsc --noEmit EXITCODE=0, nenhuma rota de API, nenhuma migracao, nada de
REM dinheiro, nada de marca d'agua, nenhuma mudanca de preco. Revisao adversarial
REM rodada 2x - a segunda passada derrubou 5 defeitos da propria correcao.
cd /d "%~dp0.."
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
set LOG=scripts\push_result.log
echo === ANTES === > "%LOG%" 2>&1
git --no-pager log --oneline -4 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
echo === REMOTO === >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Se PUSH_EXIT=0, SUBIU. Pode fechar.
pause
