@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
set LOG=%TEMP%\kineo-push-46.log

echo ============================================================
echo  46-PUSH  ^|  HOTFIX DE INCIDENTE ATIVO  ^|  05/08/2026 13h
echo ============================================================
echo.
echo  O push 45 JA FOI CLICADO (obrigado) - este e o proximo.
echo  O commit ja esta feito. Este arquivo so EMPURRA.
echo.
echo  POR QUE E URGENTE:
echo   As 15h36-16h um cadastro NOVO vindo do TAAFT tentou gerar
echo   video 4 vezes em 20 minutos e falhou nas 4. O incidente
echo   ainda estava ativo quando este arquivo foi criado.
echo.
echo   Causa: o cliente OpenAI nao tinha limite de tempo (o padrao
echo   do SDK e 10 MINUTOS), entao uma chamada lenta segurava a
echo   funcao ate a Vercel mata-la. Com a funcao morta o nosso
echo   tratamento de erro nunca rodava: sem alarme, sem mensagem
echo   honesta e sem email de recuperacao. Creditos estavam OK.
echo.
echo  O QUE SOBE (9 arquivos de codigo, tsc verde, revisado 2x):
echo   - limite de tempo por tipo de chamada (script/voz/legenda)
echo   - alarme que reconhece "OpenAI nao responde", com email
echo     proprio (NAO manda recarregar credito - nao e disso)
echo   - /api/generate-script ganha orcamento de tempo (era a
echo     unica rota sem, e TODA geracao passa por ela)
echo   - cron de recuperacao passa a enxergar este tipo de queda
echo.
pause

echo ==== 46-PUSH %DATE% %TIME% ==== > "%LOG%" 2>&1
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
