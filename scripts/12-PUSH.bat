@echo off
REM ============================================================
REM 12-PUSH — sprint 16h de 31/07/2026 (clique SEMPRE no maior numero)
REM Sobe:
REM   1) FIX gate do Generate: fail-open sem snapshot + copy honesta
REM      nos dois ramos + telemetria resolved/resumed/retries
REM      (app/(dashboard)/generate/GenerateClient.tsx)
REM   2) IDEIA: JSON-LD de marca com alternateName "Cineo" na home
REM      (app/page.tsx) — captura do typo nº1 do GSC de graca
REM   3) DOCS: SPRINT 16h + GATES (ROUND 2 do blackout!) + IDEIAS +
REM      PROMPT-DIARIO
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
pause
