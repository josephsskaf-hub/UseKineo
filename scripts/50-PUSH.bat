@echo off
chcp 65001 >nul
cd /d "%~dp0.."

rem ============================================================
rem  50-PUSH — sprint das 23h de 05/08/2026.
rem
rem  O QUE VAI SUBIR: a TRAVA DE REENVIO do send-cap-hit.
rem  Hoje a mesma pessoa recebeu o MESMO e-mail 3x em 90 minutos
rem  porque a unica memoria de "ja enviei" era uma coluna que,
rem  por causa ainda desconhecida, o cron rele como nula.
rem  A trava grava a prova de envio em OUTRA tabela (evento
rem  cap_hit_sent) e falha FECHADA. Ela para o sangramento sem
rem  depender de saber a causa raiz - e o risco aqui e reputacao
rem  do dominio usekineo.com, que e o canal de venda inteiro.
rem
rem  Junto vai a instrumentacao que responde a causa raiz em UMA
rem  rodada (o cron passa a dizer o valor cru que leu e o desfecho
rem  da escrita, hoje ignorado nos 5 crons).
rem
rem  PERMANENTE: adicionar "Explorador de Arquivos" nas
rem  configuracoes da tarefa agendada kineo-sprint-diario faz o
rem  AUTO-PUSH.bat rodar sozinho e este clique deixa de existir.
rem ============================================================

echo.
echo === PUSH 50 - trava de reenvio do cap-hit ===
echo.

git push origin main

echo.
echo === FIM. Deploy da Vercel comeca sozinho. ===
echo.
pause
