@echo off
REM ============================================================================
REM 74-PUSH.bat  -  sprint 11h de 13/08/2026
REM
REM CRLF de proposito: o cmd.exe tropeca em .bat gravado em LF, e o historico
REM bate sem excecao (65, 66, 69, 72, 73 = CRLF, rodaram; 67, 68, 70, 71 = LF,
REM nao andaram).
REM
REM ESTADO (git ls-remote na hora, nao herdado de doc):
REM   origin/main = f0f63c7   (o 73-PUSH rodou; a leva de UI da manha subiu)
REM   main local  = a frente (codigo + docs + este bat). NAO conto commits
REM                  aqui de proposito: um cabecalho com numero fixo envelhece
REM                  entre a escrita e o clique, e cabecalho que anuncia numero
REM                  errado foi a licao da sprint das 10h de HOJE. O passo 2
REM                  imprime a lista real na hora - essa e a fonte.
REM
REM ----------------------------------------------------------------------------
REM O QUE ESTE PUSH DESTRAVA: o e-mail que pergunta "por que voce nao pagou?"
REM voltou a sair. Ele estava sendo calado pelo "seu video esta pronto".
REM
REM   7 pessoas abriram um checkout da Stripe e ficaram de 29h a 137h sem
REM   receber NADA. Todas com e-mail valido, sem opt-out, no plano free - ou
REM   seja, destinatarios perfeitos. Nenhum erro, nenhum log: o lead morria
REM   calado.
REM
REM   A causa: qualquer e-mail de ciclo de vida cala o de recuperacao por 24h,
REM   e a janela dele era de 48h. Duas colisoes fechavam a janela para sempre.
REM   E a colisao nao e azar - quem abandona checkout e justamente quem acabou
REM   de receber um video, bateu no teto ou esta no meio do trial. A atividade
REM   que leva a pessoa ao checkout dispara o e-mail que cala a cobranca dela.
REM
REM   Depois deste push: janela de 7 dias (colisao ADIA, nao descarta) e
REM   supressao de 4h so neste job. Simulado com os dados de hoje: 6 dos 9
REM   leads presos saem na primeira execucao, os outros 3 em horas.
REM
REM   DE CARONA, e sem eu ter planejado: 3 correcoes de 11/08 que estavam
REM   escritas na arvore e nunca foram commitadas sobem junto. A maior delas:
REM   59%% dos e-mails de recuperacao nomeavam um plano que nao existe no
REM   produto ("Basic" em vez de Creator, "Pro" em vez de Studio). Estavam 2
REM   dias fora de producao.
REM
REM O cron roda a cada 2h (minuto 20). Nao precisa fazer mais nada depois.
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
