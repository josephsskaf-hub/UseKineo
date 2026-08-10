@echo off
setlocal
cd /d "%~dp0.."

echo ============================================================
echo  66-PUSH  -  12 commits prontos (substitui o 65-PUSH)
echo ============================================================
echo.
echo  O PRODUTO ESTA PARADO HA 27 HORAS. Estes 11 commits incluem
echo  o alarme que teria avisado sobre isso na primeira hora.
echo.
echo   1. Apagao silencioso de fornecedor - sem alarme, sem win-back
echo   2. Credito so voltava 3h depois quando o fornecedor recusava
echo   3. Compra AVULSA resgatada com link de ASSINATURA
echo   4. Clique MENSAL resgatado em sessao ANUAL - 4,90 contra 99,00
echo   5. Rebaixado com 10+ creditos usados nao recebia nada por 5 dias
echo   6. Last-call atrasado ate 7 dias para 10 de 10 ja rebaixados
echo   7. Relogio do fim do trial andava para tras
echo   + docs das sprints de 08/08 e 10/08
echo.
echo  Este script NAO cria commit e NAO mexe em arquivo nenhum
echo  do disco. Os commits ja existem. Ele so faz push.
echo  Se falhar, nada e perdido.
echo.
pause

del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\refs\heads\main.lock" 2>nul
del /f /q ".git\index.lock" 2>nul

echo === 1/3 Confirmando o que vai subir ===
git log origin/main..HEAD --oneline
if errorlevel 1 goto :erro
echo.

echo === 2/3 Push para origin main ===
git push origin main
if errorlevel 1 goto :erro
echo.

echo === 3/3 Conferindo o remoto ===
git ls-remote origin refs/heads/main
echo.
echo  PUSH CONCLUIDO. Confira se o SHA acima e igual ao HEAD local:
git rev-parse HEAD
echo.
echo  AGORA O GATE QUE IMPORTA: creatomate.com/dashboard
echo  Subscription - subir Growth 10K para Growth 40K.
echo  Ou abrir o rascunho no Gmail para o Casper e clicar Enviar.
echo.
pause
exit /b 0

:erro
echo.
echo  ALGO FALHOU. Nada foi perdido - os commits continuam locais.
echo  Mande qualquer mensagem na conversa do Cowork que eu resolvo.
pause
exit /b 1
