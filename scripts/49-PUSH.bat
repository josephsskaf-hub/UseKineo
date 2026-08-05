@echo off
chcp 65001 >nul
cd /d "%~dp0.."

rem ============================================================
rem  49-PUSH — sprint das 21h de 05/08/2026.
rem  Sobe 6 commits. O principal (5ca669a) corrige um defeito que
rem  calava e-mails de venda: 267 dos 679 carimbos de lifecycle
rem  eram PULOS que o sistema lia como ENVIOS.
rem
rem  Plano B: o AUTO-PUSH.bat nao pode ser rodado pelo Claude em
rem  execucao AGENDADA (o Windows nao deixa aprovar o acesso ao
rem  Explorador de Arquivos fora de uma conversa ao vivo).
rem  Este arquivo TEM pause de proposito: quem clica e voce.
rem ============================================================

echo.
echo   Subindo 6 commits para o GitHub...
echo.
git log --oneline -7
echo.
git push origin main
echo.
echo   ---- remoto agora ----
git ls-remote origin main
echo.
pause
