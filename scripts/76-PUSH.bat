@echo off
REM ============================================================================
REM 76-PUSH.bat  -  sprint 16h de 14/08/2026
REM
REM CRLF de proposito: o cmd.exe tropeca em .bat gravado em LF, e o historico
REM bate sem excecao (65, 66, 69, 72, 73, 74, 75 = CRLF, rodaram).
REM
REM ESTADO (git ls-remote na hora, nao herdado de doc):
REM   origin/main = d734cd3  -  o push das sprints de hoje ja rodou ate aqui.
REM   main local  = a frente. NAO conto commits aqui de proposito: numero fixo
REM                 envelhece entre escrever e clicar (licao do 74). O passo 2
REM                 imprime a lista real na hora - essa e a fonte.
REM
REM ----------------------------------------------------------------------------
REM O QUE ESTE PUSH LEVA
REM
REM   43 contas em producao pedem mais um video e recebem a headline
REM   "You're out of credits" - entre elas as 12 que queimaram os 40 creditos
REM   do trial ate o fim sem comprar, que sao o sinal de intencao mais forte
REM   deste funil.
REM
REM   A copy certa para elas EXISTE desde 06/08 (KINEO-TRIAL-PAYWALL) e nunca
REM   chegou a uma tela: com saldo 0, outOfCredits() barra o clique NO CLIENTE,
REM   a request nem sai, e o 402 contextual do servidor fica inalcancavel pela
REM   porta principal do produto. Nao faltava copy - faltava a copy alcancar
REM   a porta.
REM
REM   Vai junto o ENCALHE (saldo 1-19, 9 contas agora: tem credito e nao compra
REM   nada), com razao e frase propria, e a telemetria que faltava:
REM   compose_refused tem 39 linhas em 45 dias e as 39 sao free_fast_limit,
REM   porque quem recusa o motor de IA e outra rota e o logger morava so no
REM   /api/compose.
REM
REM   Sem preco, sem moeda, sem checkout, sem teto de 40, sem marca dagua,
REM   sem migracao. Flag do reverse trial OFF => o diff e so telemetria.
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
