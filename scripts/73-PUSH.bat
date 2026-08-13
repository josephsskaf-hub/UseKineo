@echo off
REM ============================================================================
REM 73-PUSH.bat  -  sprint 10h de 13/08/2026
REM
REM Este arquivo esta em CRLF de proposito: o cmd.exe tropeca em .bat gravado em
REM LF, e o historico bate sem excecao (65, 66, 69, 72 = CRLF, rodaram;
REM 67, 68, 70, 71 = LF, nao andaram).
REM
REM ESTADO (conferido por git ls-remote na hora, nao herdado de doc):
REM   origin/main = 9f3c4f5  (as 3 levas da manha JA SUBIRAM - o push
REM   deixou de ser gate diario, primeira vez em duas semanas)
REM   main local  = 1 commit a frente.
REM
REM O QUE ESTE PUSH DESTRAVA:
REM   METADE DA COTA DE STORAGE E LIXO DE UM BUG JA MORTO.
REM   O Supabase Storage esta em 91,92 de 100 GB (91,9%), com ~3 a 5 dias de
REM   folga. Se bater 100 GB com o Spend Cap LIGADO, upload FALHA - e isso e o
REM   apagao do Creatomate de 09/08 outra vez, so que na porta de entrada.
REM
REM   A causa nao e vídeo de cliente. O bucket `broll` sozinho e 62,05 GB
REM   (67,5% de tudo); `renders`, que e o produto entregue, e 24,99 GB.
REM   Dentro do broll, 46,33 GB em 2.734 objetos sao ORFAOS: nenhum codigo
REM   consegue le-los. Metade da cota da empresa e sobra de um bug.
REM
REM   E o bug JA MORREU. safeVaultScore entrou em 08/08 e a serie de orfaos
REM   novos por dia prova sozinha: 07/08 = 185, 08/08 = 79, 09/08 = 2,
REM   13/08 = 0. Bloco estatico, fossil, nao vazamento.
REM
REM   A limpeza estava escrita desde 08/08 e parada por UMA coisa: o script
REM   pede SUPABASE_SERVICE_ROLE_KEY e o .env.local desta maquina tem
REM   placeholder. A PRODUCAO tem a chave. Este commit vira a limpeza numa URL.
REM
REM DEPOIS QUE ESTE PUSH RODAR E A VERCEL FICAR VERDE, 3 URLs (nesta ordem):
REM   1) so mede, nao escreve nada:
REM      https://www.usekineo.com/api/admin/broll-gc
REM   2) primeiro lote de verdade (libera ~3,4 GB):
REM      https://www.usekineo.com/api/admin/broll-gc?confirm=DELETE-ORPHANS^&limit=200
REM   3) repetir com limit=1000 ate `orfaos_restantes` chegar a 0.
REM
REM   ANTES DA 2, 30 SEGUNDOS QUE VALEM MAIS QUE TUDO:
REM   supabase.com -> projeto -> Billing -> Spend Cap.
REM   Se estiver ON, bater 100 GB DERRUBA upload (apagao). Se estiver OFF, o
REM   excedente e cobrado a US$ 0,0213/GB - centavos, e nao ha emergencia.
REM   Esse unico botao decide se isto e incendio ou troco.
REM
REM Este script NAO cria commit, NAO faz add, NAO faz reset.
REM Ele apaga os 3 locks orfaos do OneDrive e da git push. Seguro rodar 2x.
REM ============================================================================

cd /d "%~dp0.."

echo.
echo [1/3] Removendo locks orfaos do OneDrive...
if exist ".git\index.lock"           del /f /q ".git\index.lock"
if exist ".git\HEAD.lock"            del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"

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
echo Se apareceu "Everything up-to-date" ou o SHA novo, deu certo.
echo.
pause
