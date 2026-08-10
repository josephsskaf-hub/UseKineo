@echo off
setlocal
cd /d "%~dp0.."

echo ============================================================
echo  67-PUSH  -  16 commits  (SUBSTITUI o 66-PUSH)
echo ============================================================
echo.
echo  Por que este e diferente do 66: apareceram TRES arquivos
echo  .lock orfaos de 08/08 dentro do .git. O ambiente do Cowork
echo  nao tem permissao para apaga-los (Operation not permitted),
echo  entao os 2 commits da sprint das 19h foram criados numa ref
echo  paralela chamada  sprint-19h .  Este script apaga os locks
echo  (no Windows funciona), faz o  main  avancar ate ela e so
echo  entao empurra.
echo.
echo  E SEGURO RODAR DUAS VEZES. Se ja estiver tudo no lugar, ele
echo  simplesmente nao acha o que fazer e sai.
echo.
echo  O QUE VAI SUBIR (16 commits):
echo    1. Apagao silencioso de fornecedor - sem alarme, sem win-back
echo    2. Credito so voltava 3h depois quando o fornecedor recusava
echo    3. Compra AVULSA resgatada com link de ASSINATURA
echo    4. Clique MENSAL resgatado em sessao ANUAL - 4,90 contra 99,00
echo    5. Rebaixado com 10+ creditos usados nao recebia nada por 5 dias
echo    6. Last-call atrasado ate 7 dias para 10 de 10 ja rebaixados
echo    7. Relogio do fim do trial andava para tras
echo    8. NOVO: medidor de cota do Creatomate + alarme em 80%%
echo    9. NOVO: perfil de render por env (resolucao vira 1 variavel)
echo   10. NOVO: win-back alcancava 3 das 32 vitimas do apagao
echo   11. NOVO: 3 defeitos graves do proprio codigo de hoje, pegos
echo       na revisao adversarial ANTES do deploy
echo    +  docs das sprints de 08/08 e 10/08
echo.
pause

echo === 1/6 Apagando os .lock orfaos ===
del /f /q ".git\HEAD.lock"            2>nul
del /f /q ".git\index.lock"           2>nul
del /f /q ".git\refs\heads\main.lock" 2>nul
if exist ".git\index.lock" echo   ATENCAO: index.lock resistiu - feche VS Code / GitHub Desktop e rode de novo
echo   locks tratados
echo.

echo === 2/6 Conferindo que a ref da sprint existe ===
git rev-parse --verify refs/heads/sprint-19h >nul 2>&1
if errorlevel 1 (
  echo   Nao existe a ref sprint-19h. Ou ela ja foi absorvida pelo main
  echo   numa execucao anterior, ou algo saiu do lugar. Seguindo para o
  echo   push do main como esta.
  goto :push
)
git log --oneline main..sprint-19h
echo.

echo === 3/6 Checando que e avanco puro, sem perder nada ===
git merge-base --is-ancestor main sprint-19h
if errorlevel 1 (
  echo.
  echo   PAREI. O main tem commit que a sprint-19h nao tem, entao mover
  echo   o main perderia trabalho. Nada foi alterado. Me mande uma
  echo   mensagem no Cowork que eu resolvo.
  pause
  exit /b 1
)
echo   ok - avanco puro
echo.

echo === 4/6 Movendo o main ===
git update-ref refs/heads/main refs/heads/sprint-19h
if errorlevel 1 goto :erro
git reset >nul 2>&1
echo   main agora aponta para:
git rev-parse --short HEAD
echo.

:push
echo === 5/6 Push para origin main ===
git push origin main
if errorlevel 1 goto :erro
echo.

echo === 6/6 Conferindo o remoto e limpando ===
git ls-remote origin refs/heads/main
git rev-parse HEAD
git branch -D sprint-19h 2>nul
echo.
echo  Se os dois SHAs acima forem iguais, o push foi.
echo  A Vercel comeca o build sozinha em seguida.
echo.
echo  ================================================================
echo   AGORA O GATE QUE IMPORTA - o push nao faz um video sair:
echo.
echo   creatomate.com  ^>  Credit Usage  ^>  Subscription
echo   Esta em "10.0K of 10.0K credits used - 100%%" (eu conferi).
echo   Subir Growth 10K  para  Growth 40K.
echo   O produto volta no minuto seguinte. Ele esta parado ha 30h.
echo  ================================================================
echo.
pause
exit /b 0

:erro
echo.
echo  ALGO FALHOU. Nada foi perdido - os commits continuam no repo
echo  local (procure a ref sprint-19h). Me mande qualquer mensagem
echo  na conversa do Cowork que eu resolvo.
pause
exit /b 1
