@echo off
REM 37-PUSH - 04/08 sprint 19h
REM
REM   2 commits parados.
REM
REM   5976d8b  KINEO-OBJECTION-HANDLER  <-- MEXE EM PRECO EXIBIDO, LEIA
REM     A tela de checkout cancelado tinha uma TABELA DE PRECOS DIGITADA A MAO.
REM     O seu push das 22:00Z (preco regional BR: Starter R$49,90 -> R$24,90)
REM     tornou o literal 'R$49,90' MENTIROSO: o brasileiro que desiste do
REM     checkout aterrissa na unica tela de recuperacao do funil e ve o DOBRO
REM     do preco real. Este push corrige - tudo passa a derivar de
REM     lib/checkoutPricing.ts (fonte unica) e a regiao viaja no cancel_url.
REM     Quanto antes subir, menos gente ve o preco errado.
REM
REM     Na mesma tela: o survey de 03/08 tinha ZERO respostas na historia
REM     inteira contra 7 cancelamentos - 2o instrumento cego do dia (o 1o foi
REM     o pedido de review, morto na sprint das 16h). Mesma causa: pedia e
REM     respondia "obrigado". Agora cada chip RESPONDE no mesmo pixel:
REM       Too expensive     -> degrau mais barato, com botao de checkout
REM       Not sure which    -> os 3 planos em 3 linhas
REM       I had questions   -> as 2 duvidas reais respondidas ali
REM       Just looking      -> caminho gratis (ativacao, nao venda)
REM
REM   f764a9f  DOCS da sessao paralela (gates da 16h fechados)
REM
REM   tsc --noEmit sobre a arvore inteira: EXITCODE=0.
REM   NAO toca em render (nada de lib/compose.ts) - seu freeze segue intacto.
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
git log --oneline -7 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado.
pause
