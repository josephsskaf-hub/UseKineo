@echo off
REM 36-PUSH - 04/08 sprint 16h
REM
REM   5 commits parados. DOIS NAO SAO DA SPRINT - sao da sessao paralela e
REM   mexem em PRECO:
REM     6ce3d9a  Starter/Creator mais baratos em paises de menor renda
REM     4e8af7a  Brasil entra na regiao de valor (Starter R$49,90 -> R$24,90)
REM   Enquanto este push nao sair, o brasileiro continua vendo R$49,90.
REM
REM   Da sprint 16h:
REM     - components/VideoRatingAsk.tsx: o pedido de review antigo estava MORTO
REM       (124 exibicoes desde 15/07, ZERO cliques). 67% dos pedidos iam para
REM       quem nunca baixou um video. Agora a nota so aparece DEPOIS do download,
REM       e um toque; 4-5 estrelas roteia pro TAAFT, 1-3 pergunta o que faltou.
REM     - docs das sprints
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
