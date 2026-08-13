@echo off
REM ============================================================================
REM 72-PUSH.bat  -  todas as sprints de 12/08/2026 (10h, 13h, 16h, 19h, 21h)
REM
REM RODE ESTE. Ele substitui o 71-PUSH.bat, que nao chegou a rodar.
REM Este arquivo esta em CRLF de proposito: o cmd.exe tropeca em .bat com LF,
REM e o historico bate sem excecao (65, 66, 69 = CRLF, rodaram; 67, 68, 70 =
REM LF, nao andaram).
REM
REM ESTADO (conferido por git ls-remote em 12/08 ~21:0xZ):
REM   origin/main = 5335ce5
REM   main local  = a frente. Este cabecalho NAO cita SHA nem contagem local:
REM   ele seria gravado ANTES do proprio commit que o cria, e ja nasceria
REM   errado por um. O passo 3 imprime a lista real na hora em que voce roda.
REM
REM O QUE ESTE PUSH DESTRAVA:
REM   - [21h] O SITEMAP DE VIDEO PARA DE PEDIR 602 PAGINAS AO GOOGLE.
REM     Medido hoje no Search Console: 704 URLs nossas foram descobertas e
REM     NUNCA rastreadas, e as 602 paginas /v/ deram 0 impressao e 0 clique
REM     em 32 dias. Elas eram 79% de tudo que pedimos ao Google, na frente
REM     das 27 paginas /alternatives/ escritas a mao. Depois deste push,
REM     religar e UMA variavel na Vercel (KINEO_VIDEO_SITEMAP_MAX) e nao
REM     precisa nem de redeploy. Nada e desindexado - so o pedido de
REM     rastreamento sai.
REM   - [19h] O CTA que fechou a UNICA venda da historia ganha alvo de toque
REM     de 44px. Ele tinha 16px de altura, ao lado de um botao de fechar de
REM     44x44 que foi tocado por 17 pessoas.
REM   - [16h] Os e-mails de fim de trial param de pedir que a pessoa compre um
REM     produto que ela nunca viu rodar: 22 pessoas tiveram o video quebrado
REM     por NOS no apagao de 30h e nunca ouviram uma palavra nossa. Agora os
REM     dois e-mails que ainda as alcancam dizem de quem foi a culpa.
REM   - [16h] A tela para de dizer "Please try again" para quem ja tentou 8
REM     vezes contra uma parede.
REM   - [13h] A extensao automatica de trial deixa de premiar quem NAO usou o
REM     produto (25 envios, 0 videos depois, 0 conversoes) e de tirar essas
REM     pessoas da coorte que recebe o COMEBACK50.
REM   - [10h] send-stalled-rescue corrigida: 231 pessoas paradas esperando o
REM     primeiro e-mail de uma campanha que existe ha 16 dias. Mais a licenca
REM     comercial no /pricing (1a pergunta das 32 agencias da lista B2B) e o
REM     handshake do primeiro minuto pago.
REM
REM GARANTIA: NAO cria commit, NAO faz git add, NAO faz git reset, NAO escreve
REM em arquivo do projeto. So apaga locks orfaos do .git e roda git push.
REM (O indice do repositorio tem deleções preparadas por engano de sessoes
REM  antigas - e exatamente por isso que este script nao encosta em git add.)
REM
REM SEGURO RODAR DUAS VEZES.
REM ============================================================================

cd /d "%~dp0.."

echo.
echo === 1) Limpando locks orfaos do .git ===
if exist ".git\HEAD.lock"            del /f /q ".git\HEAD.lock"            2>nul
if exist ".git\index.lock"           del /f /q ".git\index.lock"           2>nul
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock" 2>nul
if exist ".git\config.lock"          del /f /q ".git\config.lock"          2>nul
echo    feito.

echo.
echo === 2) Ponta local e remota ===
git rev-parse main
git ls-remote origin refs/heads/main

echo.
echo === 3) Commits que vao subir AGORA ===
git log origin/main..main --oneline

echo.
echo === 4) Push ===
git push origin main

echo.
echo === 5) Conferencia final (as duas linhas tem que bater) ===
git rev-parse main
git ls-remote origin refs/heads/main

echo.
echo Pronto. Se as duas linhas acima forem iguais, esta em producao.
pause
