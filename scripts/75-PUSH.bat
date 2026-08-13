@echo off
REM ============================================================================
REM 75-PUSH.bat  -  sprint 19h de 13/08/2026
REM
REM CRLF de proposito: o cmd.exe tropeca em .bat gravado em LF, e o historico
REM bate sem excecao (65, 66, 69, 72, 73, 74 = CRLF, rodaram; 67, 68, 70, 71 =
REM LF, nao andaram).
REM
REM ESTADO (git ls-remote na hora, nao herdado de doc):
REM   origin/main = f0f63c7   -  producao serve esse commit desde as 11:08,
REM                              confirmado no list_deployments da Vercel.
REM   main local  = a frente. NAO conto commits aqui de proposito: numero fixo
REM                 envelhece entre escrever e clicar (licao do 74). O passo 2
REM                 imprime a lista real na hora - essa e a fonte.
REM
REM ----------------------------------------------------------------------------
REM ESTE PUSH TEM HORA: 14/08 as 16:30Z.
REM
REM   Amanha, no cron das 16:30Z, dispara PELA PRIMEIRA VEZ NA HISTORIA o
REM   expired_offer_d5 - o unico e-mail da casa que carrega o cupom COMEBACK50.
REM   Sao 2 pessoas amanha e 29 ate 18/08.
REM
REM   Ele manda a pessoa para /pricing?promo=COMEBACK50. E o que ela lia ao
REM   chegar, em letra miuda, era o CONTRARIO do e-mail:
REM     "renews at the full monthly price in 30 days"  (o cupom vale 3 meses)
REM     "the discounted first month includes 50 credits" (ela recebe os 150)
REM   As duas falsas, porque o checkout resolve o ?promo= ANTES do intro - a
REM   trava de 04/08, que continua no lugar e e ela que faz o e-mail nao mentir.
REM   A pagina estava SUBVENDENDO a propria oferta, para a unica coorte com
REM   intencao comprovada: 31 pessoas que gastaram 18,8 dos 40 creditos do
REM   trial, 17 delas com video pronto, e 1 conversao em 32.
REM
REM   Corrigido sem por um unico "50% off" na pagina - a sua ordem de 06/08
REM   continua intacta. A letra miuda do intro simplesmente some quando ha
REM   ?promo= na URL. O ExitIntentOffer ja fazia isso desde antes; a letra
REM   miuda era o par que tinha ficado de fora.
REM
REM   TAMBEM sobem, represados: ce2689b (o resgate do voiceover, cujo sintoma
REM   ainda apareceu em producao as 08:30Z de hoje) e a campanha stalled-rescue
REM   de 25/dia, que alcanca as 231 pessoas que apertaram gerar e ficaram sem
REM   video.
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
