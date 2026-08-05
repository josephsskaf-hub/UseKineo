@echo off
REM 44-PUSH - 05/08 sprint das 10h - O ESTUDO VIVO + O TEMPO REAL DE RENDER
REM
REM   O PROBLEMA (esta em producao AGORA):
REM   A pagina publica /state-of-ai-shorts-2026 e um estudo "free to cite", com
REM   e-mail de imprensa no rodape, e os numeros chumbados no codigo em 24/07.
REM   Doze dias depois, os CINCO numeros principais estao errados:
REM
REM     publicado 24/07              real 05/08      erro
REM     568 videos / 206 criadores   472 / 331       contava contas internas
REM     99,3% de conclusao           91,9%           otimista
REM     48% usam Fast Mode           89,2%           errado por 1,9x
REM     "1 em cada 4 usa premium"    4,0%            errado por 6x
REM     mediana 2,30 min / p90 3,50  4,2 / 6,6       errado por ~1,9x
REM
REM   O QUE ISSO CUSTA EM DINHEIRO:
REM   O numero da velocidade nao mora so na pagina. Mora em lib/kineoFacts.ts,
REM   que alimenta o /llms.txt e o /facts - os arquivos que a gente serve de
REM   bandeja pro ChatGPT e pro Bing, o canal que ja traz 4x mais trafego que o
REM   Google inteiro. Estavamos ensinando o ChatGPT a prometer, EM NOSSO NOME,
REM   metade do tempo real de espera. Quem chega por essa citacao espera 2 min,
REM   o render leva 4 a 7, e vai embora antes do video ficar pronto - o que
REM   explica direto o maior buraco do funil (333 geraram, 69 baixaram).
REM   A medida antiga vinha de uma amostra de DOZE renders de julho.
REM
REM   O QUE SOBE:
REM   - lib/studyStats.ts (novo): os numeros do estudo passam a vir do BANCO,
REM     com fallback, guarda de sanidade e timeout. Nunca mais apodrece sozinho.
REM   - /state-of-ai-shorts-2026 reescrito: atualiza sozinho 1x/dia, ganha secao
REM     "How long an AI Short actually takes" (mediana, p90, n) e JSON-LD Dataset
REM     sob licenca CC-BY - e o que faz um motor de resposta CITAR a pagina.
REM   - lib/kineoFacts.ts: 2,3 -> 4,2 min, p90 3,5 -> 6,6, "2-4" -> "3-7 minutes".
REM   - 111 ocorrencias de "2-4 minutes" corrigidas em 31 arquivos (landing,
REM     layout, paginas de nicho, comparacoes) - senao o site publicaria dois
REM     tempos diferentes no mesmo dominio.
REM   - Um claim comparativo contra a Revid ("Kineo e mais rapido? sim") virou
REM     uma resposta honesta que nao afirma o que a gente nao mediu.
REM   - docs/MIGRACAO-STUDY-STATS.sql: o SQL versionado (as 2 migracoes JA estao
REM     aplicadas no banco e conferidas - a pagina nao quebra sem o push).
REM
REM   Revisao adversarial pre-commit pegou 4 bloqueadores, todos corrigidos.
REM   tsc EXITCODE=0.
REM
REM DEPOIS DO DEPLOY, confira no celular:
REM   www.usekineo.com/state-of-ai-shorts-2026
REM   -> deve dizer "updated daily . last read August 5, 2026" e mediana 4.2 min
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
