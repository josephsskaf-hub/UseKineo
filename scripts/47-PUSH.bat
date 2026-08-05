@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
set LOG=%TEMP%\kineo-push-47.log

echo ============================================================
echo  47-PUSH  ^|  SUBSTITUI O 46 (NAO CLICADO)  ^|  05/08/2026 16h
echo ============================================================
echo.
echo  ATENCAO: o 46-PUSH.bat NAO foi clicado. Este arquivo o
echo  SUBSTITUI e sobe TUDO: 3 commits de uma vez.
echo  Nao precisa clicar o 46. Os commits ja estao feitos -
echo  este arquivo so EMPURRA.
echo.
echo  1) HOTFIX DO INCIDENTE DE HOJE (ainda nao esta no ar)
echo     As 15h36-16h42 o OpenAI parou de responder e matava a
echo     funcao antes do nosso tratamento de erro: sem alarme,
echo     sem mensagem honesta, sem email de recuperacao. Um
echo     cadastro novo do TAAFT falhou 4x no primeiro dia dele.
echo     O motor ja voltou sozinho (11 videos prontos desde as
echo     16h42) - este hotfix e para a PROXIMA vez.
echo.
echo  2) O EMAIL QUE VENDE NO MOMENTO CERTO (novo hoje)
echo     Quem bate no limite do plano free e a pessoa mais
echo     pronta para comprar que existe: usou 3 vezes hoje e
echo     pediu a quarta. Na historia inteira, 11 pessoas
echo     fizeram isso - e NENHUMA comprou.
echo     Motivo: o email automatico que existe para esse
echo     momento estava olhando para o lugar errado. Ele
echo     procurava quem TERMINOU 3 videos; o limite conta
echo     TENTATIVAS. Quem bate no muro costuma ter 2 videos
echo     prontos - entao o email nunca via essas pessoas.
echo     8 das 11 nunca receberam nada.
echo     Agora ele le o proprio limite. 3 pessoas entram na
echo     fila hoje mesmo, na primeira rodada apos o push.
echo.
echo     Tambem corrigido: o texto dizia "voce acabou de fazer
echo     seu 3o video hoje - Nice run" para gente que recebeu
echo     2. Agora fala da REGRA, que e sempre verdade.
echo.
echo  3) Documentacao da sprint.
echo.
echo  tsc verde. Revisao adversarial ANTES do commit (barrou a
echo  primeira versao com 6 problemas - todos corrigidos).
echo.
pause

echo ==== 47-PUSH %DATE% %TIME% ==== > "%LOG%" 2>&1
git log --oneline -8 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo ---- push ---- >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo ---- remoto ---- >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1

type "%LOG%"
echo.
echo ============================================================
echo  PRONTO. A Vercel faz o deploy sozinha (~2 min).
echo  Log completo em: %LOG%
echo ============================================================
pause
