@echo off
chcp 65001 >nul
cd /d "%~dp0.."

rem ============================================================
rem  51-PUSH - sprint extra de 06/08/2026 (01h UTC).
rem
rem  O QUE VAI SUBIR (2 commits):
rem
rem  1. A TELA QUE DIZIA "ISSO E PARA QUEM PAGA" PARA QUEM PAGA.
rem     13 pessoas chegaram ao estado not_entitled do Autopilot.
rem     DUAS delas eram, naquele instante, 2 dos 3 assinantes
rem     ATIVOS da empresa: o Starter que tinha pago 12 minutos
rem     antes (e que nunca completou um unico video) e o
rem     assinante de Creator. Os dois leram que aquilo era
rem     "part of the paid plans" - falso para eles - e sumiram.
rem     A tela tambem nao tinha porta de volta: o unico link era
rem     o de gastar MAIS dinheiro.
rem     Agora sao 3 coortes com 3 verdades (free / ja-pagante /
rem     piloto de $99 vencido), o pagante ganha o caminho de
rem     volta para /generate, e /pricing ganhou a ancora
rem     #autopilot que o CTA prometia e nao existia.
rem
rem  2. O protocolo de comunicacao CEO<->sprints.
rem
rem  Por que este clique existe: em execucao AGENDADA o Windows
rem  nao levanta o dialogo de acesso ao Explorador de Arquivos.
rem  Basta VOCE MANDAR UMA MENSAGEM na conversa durante a sprint
rem  que o AUTO-PUSH.bat volta a rodar sozinho - foi o que
rem  aconteceu as 23:28Z de ontem, e renderam 3 pushes sem
rem  nenhum clique seu.
rem ============================================================

echo.
echo === PUSH 51 - Autopilot: a tela parou de mentir para quem paga ===
echo.

git log --oneline -3

echo.
git push origin main

echo.
echo === FIM. O deploy da Vercel comeca sozinho. ===
echo.
pause
