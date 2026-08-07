@echo off
REM 57-PUSH - sprint 21h de 06/08. SUBSTITUI o 56-PUSH (e o 55, 54, 53 - NAO clicar).
REM Sao 5 commits represados (origin/main esta em ec9f112):
REM   a4d73dd  QA do reverse trial - veredito NAO PODE LIGAR
REM   6dfad6a  correcao dos 3 bloqueadores do QA + anti-abuso nunca silencioso
REM   0deed3b  checklist de GO-LIVE (ordem, env vars, roteiro de reteste, rollback)
REM   db455f6  gates de FEATURE do trial (footage + characters) + funil real 180-28-18-4
REM   (o commit de topo)  docs da sprint 21h + este proprio gate + a correcao do
REM                        gate vencido do /api/render/[id]. Sem hash de proposito:
REM                        um commit nao pode citar o proprio hash sem mentir.
REM
REM O QUE MUDA PARA O USUARIO HOJE: NADA. Tudo do trial esta atras da flag
REM KINEO_REVERSE_TRIAL_ENABLED, que continua OFF, e as duas rotas tocadas tem
REM diff de runtime ZERO com a flag OFF (verificado por construcao).
REM CORRECAO ao cabecalho do 56: a falha de seguranca do /api/render/[id] JA ESTA
REM EM PRODUCAO (conferida por CONTEUDO em ec9f112, deploy READY). Nao ha mais
REM vazamento de URL em aberto - este push nao e urgente por seguranca.
REM Depois deste push, o passo 1 do docs/GO-LIVE-REVERSE-TRIAL.md fica cumprido.
cd /d "%~dp0.."
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
set LOG=scripts\push_result.log
echo === ANTES === > "%LOG%" 2>&1
git --no-pager log --oneline -6 >> "%LOG%" 2>&1
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
