@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
set LOG=%TEMP%\kineo-auto-push.log

rem ============================================================
rem  AUTO-PUSH — rodado pelo proprio Claude nas sprints diarias.
rem  Autorizacao do fundador em 05/08/2026: "voce tem autorizacao
rem  pra entrar no meu computador e rodar os .bat quando precisar".
rem
rem  DIFERENCA para os N-PUSH.bat: este arquivo NAO tem `pause`.
rem  Roda do inicio ao fim sozinho e fecha. Isso e obrigatorio -
rem  a janela do cmd e um app onde o Claude consegue clicar mas
rem  NAO digitar, entao qualquer `pause` travaria o processo.
rem
rem  Este arquivo e FIXO e reutilizavel: nao criar AUTO-PUSH-2.
rem  Ele so empurra o que ja foi commitado. Nunca commita nada.
rem ============================================================

echo ==== AUTO-PUSH %DATE% %TIME% ==== > "%LOG%" 2>&1
echo ---- antes ---- >> "%LOG%" 2>&1
git log --oneline -5 >> "%LOG%" 2>&1
git rev-parse HEAD >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo ---- push ---- >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo ---- remoto depois ---- >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
echo ==== FIM %DATE% %TIME% ==== >> "%LOG%" 2>&1

copy /y "%LOG%" "%~dp0..\docs\ULTIMO-AUTO-PUSH.log" >nul 2>&1
exit
