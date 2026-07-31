@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 11-PUSH — 31/07/2026 (sprint 13h) — sobe o WIN-BACK POS-BLACKOUT
REM
REM   3a54522  WIN-BACK POS-BLACKOUT — quando voce recarregar a OpenAI e o
REM            servico voltar, as ~15 vitimas do apagao de hoje recebem
REM            sozinhas UM e-mail honesto ("foi culpa nossa, voltou, seus
REM            creditos estao intactos") em ate ~1h15. Sem desconto, sem
REM            spam: 1 por pessoa por blackout, respeita opt-out.
REM            Cron novo: /api/cron/send-blackout-winback (a cada 30 min).
REM   + docs da sprint 13h e este proprio .bat
REM
REM   LEMBRETE DO GATE 00: recarregar platform.openai.com/settings/
REM   organization/billing — sem isso NADA gera video e o win-back nao dispara.
REM
REM Apaga locks zumbis (a sandbox nao consegue).
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
REM ═══════════════════════════════════════════════════════════════════════════
del /f /q "%~dp0..\.git\refs\heads\main.lock" 2>nul
del /f /q "%~dp0..\.git\HEAD.lock" 2>nul
del /f /q "%~dp0..\.git\index.lock" 2>nul
call "%~dp0\1-PUSH.bat"
