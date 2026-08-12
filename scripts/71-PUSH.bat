@echo off
REM ============================================================================
REM 71-PUSH.bat  -  sprints 10h + 13h de 12/08/2026
REM
REM RODE ESTE. NAO rode o 70-PUSH.bat que esta na raiz do repositorio.
REM
REM POR QUE O 70 NAO FUNCIONOU:
REM   O 70-PUSH.bat foi gravado com quebra de linha LF. O cmd.exe do Windows
REM   tropeca em .bat com LF. O historico bate sem excecao ate hoje:
REM     65, 66, 69 -> nasceram em CRLF -> o push RODOU.
REM     67, 68, 70 -> nasceram em LF   -> o push NAO andou.
REM   O 70 ainda dizia "5 commits" no cabecalho quando so ha 1. Este arquivo
REM   esta em CRLF de proposito e nao cita numero de commit nenhum: ele
REM   IMPRIME a ponta real antes de empurrar.
REM
REM ESTADO NESTE MOMENTO (conferido por git ls-remote em 12/08 ~10:0xZ):
REM   origin/main = 5335ce5
REM   HEAD local  = a frente. Este cabecalho NAO diz quantos commits de
REM   proposito: foi exatamente a mentira do 70 ("5 commits" quando havia 1).
REM   O passo 3 imprime a lista real na hora em que voce roda.
REM   Lock orfao presente: .git\index.lock (0 bytes). O sandbox Linux nao
REM   consegue apagar (Operation not permitted). So o Windows apaga.
REM   Este script apaga.
REM
REM O QUE ESTE PUSH DESTRAVA (por isso ele importa hoje):
REM   - a rota send-stalled-rescue corrigida: 231 pessoas paradas esperando
REM     o primeiro e-mail de uma campanha que existe ha 16 dias.
REM   - a linha de licenca comercial na pagina de preco: e a primeira
REM     pergunta das 32 agencias da lista B2B.
REM   - o handshake do primeiro minuto pago (lib/firstWinHandshake.ts).
REM   - os 3 temas de 1 clique no d0_welcome e no ending_soon (sprint 10h).
REM   - [sprint 13h] a extensao automatica do trial deixa de premiar quem NAO
REM     usou o produto. O criterio era "usou menos de 10 dos 40 creditos";
REM     mediu 25 envios, 0 videos depois e 0 conversoes, e ainda tirava a
REM     pessoa da coorte que recebe o e-mail da perda e o COMEBACK50. Passa a
REM     ser "3+ videos concluidos e ainda tem credito para gastar".
REM   - [sprint 13h] o e-mail da perda para de dizer "os videos que voce ja
REM     fez sao seus" para quem tem ZERO video, e passa a levar 3 temas de 1
REM     clique em vez de so um link para /pricing. 51 trials ativos com zero
REM     video caem nesse e-mail.
REM
REM GARANTIA: este script NAO cria commit, NAO faz git add, NAO faz git reset
REM e NAO escreve em nenhum arquivo do projeto. So apaga locks orfaos do .git
REM e roda git push. Nao ha como apagar trabalho.
REM
REM   (o indice do repositorio esta com 28 delecoes preparadas por engano de
REM    sessoes antigas; e exatamente por isso que este script nao encosta em
REM    git add nem em git commit. Push apenas.)
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
if exist ".git\packed-refs.lock"     del /f /q ".git\packed-refs.lock"     2>nul
echo    locks limpos.

echo.
echo === 2) Estado antes do push ===
git rev-parse --abbrev-ref HEAD
echo    HEAD local:
git log --oneline -1
echo    origin/main remoto:
git ls-remote origin refs/heads/main

echo.
echo === 3) Commits que vao subir ===
git log 5335ce5..HEAD --oneline

echo.
echo === 4) PUSH ===
git push origin main

echo.
echo === 5) Confirmacao (origin/main depois do push) ===
git ls-remote origin refs/heads/main

echo.
echo Se o SHA do passo 5 for igual ao HEAD local impresso no passo 2, o push FUNCIONOU.
echo A Vercel comeca o deploy sozinha logo depois.
echo.
pause
