@echo off
REM ============================================================
REM 13-PUSH — sprint 21h de 31/07/2026 (clique SEMPRE no maior numero)
REM Sobe (inclui os 2 commits do 12-PUSH que ainda nao subiram):
REM   1) FIX gate do Generate: fail-open + copy honesta + telemetria
REM      (43b9016, da sprint 16h)
REM   2) IDEIA 16h: JSON-LD alternateName "Cineo" na home (35c6b56)
REM   3) IDEIA 21h: "a demo nunca morre" — fallback estatico nas rotas
REM      publicas /api/demo-script e /api/demo-hooks quando a OpenAI
REM      esta sem quota (lib/demoFallback.ts)
REM   4) DOCS: SPRINT 21h + GATES (diagnostico DEFINITIVO: recarga na
REM      conta errada!) + IDEIAS + PROMPT-DIARIO
REM
REM DEPOIS DO PUSH: trocar a OPENAI_API_KEY na Vercel (gate 00 no
REM docs/GATES-ABERTOS.md tem o passo a passo de 5 min) e o deploy
REM novo ja sobe com a demo blindada + chave certa.
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
echo PUSH OK — Vercel faz deploy sozinho em ~2 min.
echo AGORA: gate 00 (trocar OPENAI_API_KEY na Vercel + Redeploy).
pause
