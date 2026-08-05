@echo off
REM 45-PUSH - 05/08 sprint das 11h - SHORTLIST DE MICRO-CRIADORES (PAGAVEL HOJE)
REM
REM   ESTE SUBSTITUI O 44-PUSH. Clique SO NESTE - ele sobe os 3 commits de hoje
REM   (o 44 fazia a mesma coisa; se voce ja clicou nele, este aqui so completa).
REM
REM   O QUE SOBE:
REM   1. O ESTUDO VIVO (era o conteudo do 44): a pagina publica
REM      /state-of-ai-shorts-2026 publica CINCO numeros errados desde 24/07 -
REM      inclusive mediana de 2,30 min contra 4,2 reais. Enquanto isso nao sobe,
REM      estamos ensinando o ChatGPT a prometer metade do tempo real de espera.
REM   2. A SHORTLIST DE MICRO-CRIADORES: 6 canais medidos hoje na pagina real do
REM      YouTube, 1 vetado por audiencia comprada, 2 e-mails achados em texto
REM      aberto, e 2 rascunhos ja prontos no seu Gmail.
REM
REM   >>> ORDEM QUE IMPORTA: clique ESTE .bat ANTES de enviar os dois e-mails.
REM   Os dois mandam o reviewer para /state-of-ai-shorts-2026. Se a pagina velha
REM   ainda estiver no ar, ele abre o link, ve 2,30 min onde o e-mail disse 4,2,
REM   e o e-mail que vendia honestidade vira prova de descuido.
REM
REM   SUAS 3 DECISOES DE HOJE (detalhe em docs/SHORTLIST-MICROCRIADORES-2026-08-05.md):
REM   a) Enviar o rascunho do Conor Martin ($100). Recomendacao: SIM.
REM   b) Enviar o rascunho do Malva AI (nao compromete nenhum dolar).
REM   c) Criar no Stripe um cupom 100%% off por 3 meses (2 min) - e o unico jeito
REM      de entregar os "3 meses de Creator" que os e-mails prometem.
REM
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
git log --oneline -8 >> "%LOG%" 2>&1
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
