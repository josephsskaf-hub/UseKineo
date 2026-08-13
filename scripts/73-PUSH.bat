@echo off
REM ============================================================================
REM 73-PUSH.bat  -  sprint 10h de 13/08/2026
REM
REM Este arquivo esta em CRLF de proposito: o cmd.exe tropeca em .bat gravado em
REM LF, e o historico bate sem excecao (65, 66, 69, 72 = CRLF, rodaram;
REM 67, 68, 70, 71 = LF, nao andaram).
REM
REM ESTADO (conferido por git ls-remote na hora, nao herdado de doc):
REM   origin/main = 9f3c4f5  (as 3 levas da manha JA SUBIRAM - o push deixou
REM   de ser gate diario, primeira vez em duas semanas)
REM   main local  = a frente. O passo 2 imprime a lista real na hora.
REM
REM ----------------------------------------------------------------------------
REM LEIA ISTO: A EMERGENCIA DE STORAGE QUE EU ANUNCIEI NAO EXISTE.
REM
REM   Eu tratei o Storage como incendio a sprint inteira (91,9%, "2,6 dias da
REM   parede"). ESTAVA ERRADO. O painel oficial de Billing diz 46% - voce mesmo
REM   conferiu, e a sessao paralela corrigiu as 10:15.
REM
REM     soma de storage.objects ..... 91,92 GB   (o que eu medi)
REM     painel de Billing ........... 46,20 GB   (o que se cobra)
REM     razao ....................... 0,503
REM
REM   Sao ~35 dias de folga. NAO precisa abrir o Spend Cap, NAO precisa apagar
REM   nada hoje.
REM
REM O QUE ESTE PUSH DESTRAVA, ENTAO:
REM   1. A CORRECAO DO ALARME. O vigia de storage que escrevi nesta sprint
REM      alarmava por percentual cru e teria disparado VERMELHO DE 95% na
REM      estreia, num projeto em 46% - te mandando correr apagar arquivo por um
REM      problema inexistente. Agora ele calibra pelo painel, mostra os dois
REM      numeros, se declara estimativa, e e recalibravel por env sem deploy.
REM      Simulado: com os numeros de hoje ele fica EM SILENCIO.
REM
REM   2. O QUE A CORRECAO NAO DERRUBA: metade de tudo que a casa armazena sao
REM      arquivos que NENHUM codigo consegue ler - 2.734 orfaos no bucket
REM      `broll`, sobra de um bug corrigido em 08/08 (orfaos novos por dia:
REM      185 -> 79 -> 2 -> 0). Os videos dos clientes sao a MENOR parte. Isso e
REM      desperdicio com ou sem pressa. A limpeza estava escrita desde 08/08 e
REM      parada porque o script pedia uma chave que so a producao tem; agora e
REM      uma URL.
REM
REM   3. O quarto fornecedor entra no vigia horario (Storage), com patamar,
REM      projecao e dedupe no banco.
REM
REM DEPOIS DO PUSH E DO BUILD VERDE, QUANDO VOCE QUISER (sem pressa):
REM   so mede, nao escreve nada:
REM     https://www.usekineo.com/api/admin/broll-gc
REM   apaga em lote, com manifesto gravado ANTES do remove:
REM     https://www.usekineo.com/api/admin/broll-gc?confirm=DELETE-ORPHANS^&limit=200
REM
REM   NOTA sobre a sua ordem de 08/08 ("nao apagar, mover para trash/ primeiro"):
REM   mover NAO libera espaco. O Supabase cobra por BYTES, nao por caminhos, e
REM   trash/ fica no mesmo bucket. O modo confirm=TRASH existe e responde
REM   quota_freed_gb: 0 na cara de quem clicar, em vez de fingir que resolveu.
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
