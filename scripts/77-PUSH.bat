@echo off
REM ============================================================================
REM 77-PUSH.bat  -  sprint 19h de 14/08/2026
REM
REM CRLF de proposito: o cmd.exe tropeca em .bat gravado em LF.
REM
REM ESTADO: nao conto commits aqui de proposito - numero fixo envelhece entre
REM         escrever e clicar (licao do 74). O passo 2 imprime a lista real.
REM
REM ----------------------------------------------------------------------------
REM O QUE ESTE PUSH LEVA
REM
REM   1) O RENDER TRAVADO NAO FALHAVA - ELE GIRAVA PARA SEMPRE.
REM      Um video de 20 creditos bem sucedido leva 5 min (maximo historico
REM      14,3 min em 50 rendes). Quando travava, o produto esperava 3 HORAS
REM      para devolver o credito, e a tela girava sem prazo NENHUM - o proprio
REM      codigo dizia "this retry is unbounded" em dois lugares. Pior: quando o
REM      cron finalmente estornava, a rota passava a devolver 404 (a boa
REM      noticia, "seu dinheiro voltou") e o cliente tratava como erro
REM      transitorio e voltava a girar.
REM      Agora: estorno em 45-105 min em vez de 185-230, e a pessoa SABE em 6
REM      segundos. Guarda nova de ambiguidade no sweep (falha fechado).
REM
REM   2) A PAGINA DE MAIOR INTENCAO DE COMPRA MARCAVA 0% E O ZERO NAO EXISTE.
REM      /cheapest-ai-shorts-maker: 51 de 51 sessoes veem a calculadora, 8
REM      mexem nela, 3 clicam - mas a ferramenta gravava um nome de evento e o
REM      placar contava outro. Commit so de telemetria, zero mudanca de
REM      comportamento. (2 dos 3 cliques terminaram em VIDEO GERADO.)
REM
REM   Sem preco, sem moeda, sem checkout, sem teto de 40, sem marca dagua,
REM   sem migracao. Typecheck escopado com EXITCODE provado por falsificacao.
REM ----------------------------------------------------------------------------
REM Apaga os locks orfaos do OneDrive e da git push. Seguro rodar 2x.
REM Nao cria commit, nao faz add, nao faz reset.
REM ============================================================================

cd /d "%~dp0.."

echo.
echo [1/3] Removendo locks orfaos do OneDrive...
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock" 2>nul
if exist ".git\index.lock" del /f /q ".git\index.lock" 2>nul
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock" 2>nul

echo.
echo [2/3] Commits que vao subir (lista real, calculada agora):
git --no-pager log --oneline origin/main..main

echo.
echo [3/3] Enviando para o GitHub...
git push origin main

echo.
echo ============================================================
echo Remoto depois do push:
git ls-remote origin refs/heads/main
echo ============================================================
echo.
echo Deu certo se o SHA acima for igual ao ultimo da lista do passo 2,
echo ou se apareceu "Everything up-to-date".
echo.
pause
