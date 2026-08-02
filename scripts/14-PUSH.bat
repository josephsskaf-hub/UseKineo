@echo off
REM ============================================================
REM 14-PUSH — sprint de 02/08/2026 (clique SEMPRE no maior numero)
REM Sobe 3 commits:
REM   1) FIX FAST-RETRY: retry bounded no dispatch do Fast (res.json
REM      sem catch matava usuario em 502/504/rede — 8 vitimas hoje,
REM      metade nunca mais gerou) + 1 retry no b-roll plan
REM   2) FIRST WIN IN ONE CLICK: checkout success com 3 topicos
REM      virais 1-click (o 5o comprador pagou e saiu sem gerar video
REM      porque caia num /generate vazio) + countdown 5s->15s
REM   3) DOCS: SPRINT-2026-08-02 + IDEIAS + GATES
REM
REM DEPOIS DO PUSH: apertar Send no rascunho do Emilio no Gmail
REM (id r-3846233472729920308) — 30 segundos.
REM ============================================================
cd /d "%~dp0.."
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
del /f /q .git\refs\heads\main.lock 2>nul
git push origin main
if errorlevel 1 (
  echo.
  echo PUSH FALHOU — rode de novo ou chame o Claude.
  pause
  exit /b 1
)
echo.
echo PUSH OK — deploy sobe sozinho na Vercel.
pause
