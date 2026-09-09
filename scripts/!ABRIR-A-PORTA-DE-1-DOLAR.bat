@echo off
setlocal
REM ==================================================================
REM  !ABRIR-A-PORTA-DE-1-DOLAR.bat  -  09/09/2026
REM  O lancamento no Product Hunt (10/09 00:01 PT) manda todo mundo para
REM  a oferta de $1. Hoje essa porta devolve erro em 100% dos cliques:
REM  a Stripe recusa um parametro invalido (add_invoice_items).
REM  Medido em producao 09/09: 31 falhas, 5 pessoas, 0 pagamentos.
REM
REM  Este bat aplica o conserto que ja esta pronto e conferido (0f5a53e4),
REM  numa worktree isolada, so enfileira se tsc e os 2 guardioes ficarem
REM  verdes, e nunca toca a pasta principal. Rodar duas vezes nao faz mal.
REM  Depois dele: clicar em SUBIR-SITE.bat.
REM ==================================================================
cd /d "%~dp0.."
"C:\Program Files\Git\bin\bash.exe" -lc "bash /c/kineo/scripts/abrir-porta-de-1-dolar.sh"
echo.
pause
