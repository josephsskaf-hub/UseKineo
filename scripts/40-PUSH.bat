@echo off
REM 40-PUSH - 05/08 00:20Z (sprint 21h de 04/08) - LEVA CODIGO NOVO
REM
REM   4 commits. Os tres primeiros ja estavam prontos e parados:
REM
REM   1) 249e172  DOCS - adendo do replay (so documentacao)
REM   2) 23bc1ac  NUDGE DIARIO - cron send-credits-back ("seus 3 videos free
REM                voltaram"). Migracao credits_back_sent_at JA CONFERIDA em
REM                producao nesta sprint. Novo cron no vercel.json (25 15 * * *).
REM   3) b1f05a7  POST TO EARN - 3 creditos por Short publicado. Tabela
REM                post_to_earn_claims + indice UNIQUE global JA CONFERIDOS em
REM                producao nesta sprint (a trava anti-fraude existe: sem ela,
REM                dez contas colariam o mesmo video e ele pagaria dez vezes).
REM   4) NOVO     A VERDADE SOBRE O DOWNLOAD - lib/videoDownload.ts vira a unica
REM                implementacao de download do produto (3 telas usavam copias
REM                do mesmo codigo com o mesmo bug).
REM
REM   POR QUE O 4 IMPORTA: 327 pessoas geraram um video, 67 baixaram (20%). Era
REM   o maior buraco do funil E era CEGO - o evento video_downloaded so existia
REM   no caminho feliz, e o fallback (window.open) nao contava nada. Pior: o
REM   window.open roda depois de um await, entao no celular o navegador BLOQUEIA
REM   o popup e a pessoa fica sem arquivo e sem mensagem de erro. Agora existe um
REM   3o degrau (location.href) que nenhum navegador barra, e o clique passa a
REM   ser contado antes de tudo.
REM
REM   NAO MEXE em lib/compose.ts (Ordem L segue congelada).
REM   tsc --noEmit EXITCODE=0.
REM
REM   DEPOIS DE RODAR: 24h depois, colar docs/SQL-DOWNLOAD-TRUTH.sql no Supabase
REM   (5 queries) - ele diz qual das tres causas do buraco e a verdadeira.
REM
REM   O QUE CONTINUA NA SUA MAO (nao mudou):
REM     - os 11 restantes do COMEBACK50, a um &confirm=SEND
REM     - 2 rascunhos de venda no Gmail (Waqas / pritikathar) - so falta Send
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
git log --oneline -6 >> "%LOG%" 2>&1
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
