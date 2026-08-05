@echo off
REM 41-PUSH - 05/08 00:35Z - CORRECAO DO QUE SUBIU AS 00:18Z. 1 commit, para frente.
REM
REM   Voce rodou o 40-PUSH durante a sprint (obrigado) - mas ele levou uma versao
REM   anterior da mudanca de download, que a revisao derrubou minutos depois.
REM
REM   DOIS DEFEITOS NO QUE ESTA NO AR AGORA (so no caminho de fallback, o raro):
REM
REM   1) A ABA DO APP PODE SER SEQUESTRADA. Quando o download por blob falha, o
REM      codigo atual navega a MESMA aba para o MP4. Sem
REM      Content-Disposition: attachment, a pessoa cai num player e PERDE a
REM      pagina - e na tela de video pronto isso mata o upsell de marca d'agua e
REM      o pedido de nota, que rodam depois.
REM
REM   2) O NUMERO MAIS IMPORTANTE DA EMPRESA PASSARIA A MENTIR PARA CIMA. O
REM      codigo atual conta video_downloaded tambem quando so ABRIU uma aba, sem
REM      prova de entrega. Esse evento e o que send-comeback50 e o cron
REM      send-video-ready usam para decidir quem NAO precisa de e-mail de
REM      resgate: inflar faria a empresa parar de resgatar quem falhou.
REM
REM   O QUE ESTE PUSH FAZ: a entrega volta a ser IDENTICA a de producao de ontem
REM   (blob, e window.open se falhar) e fica so a parte boa - clique contado,
REM   falha com motivo, popup barrado visivel. Sem degrau novo, sem risco.
REM
REM   NAO MEXE em lib/compose.ts (Ordem L segue congelada).
REM   tsc --noEmit EXITCODE=0.
REM
REM   Continua na sua mao (nao mudou): os 11 do COMEBACK50 e os 2 rascunhos do
REM   Gmail (Waqas / pritikathar).
cd /d "%~dp0.."
if errorlevel 1 (
  echo ERRO: nao achei a pasta do repo.
  pause
  exit /b 1
)
set LOG=scripts\push_result.log
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
echo === ANTES === > "%LOG%" 2>&1
git log --oneline -3 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
echo === REMOTO AGORA === >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Se PUSH_EXIT=0 e o hash bate com o topo do log, SUBIU.
pause
