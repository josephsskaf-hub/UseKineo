@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 22-PUSH — 03/08/2026 — BLOCO A DA SEMANA (o ultimo metro do checkout)
REM
REM   e8c38cc  Autopsia derrubou o mito do decline (0 declines externos reais).
REM            Fix da hesitacao onde ela acontece:
REM            - Garantia DENTRO do checkout do Stripe (custom_text sob o botao)
REM            - /checkout/cancelled: garantia + survey "what stopped you?"
REM              (price / just looking / had questions) -> radar novo do funil
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
REM ═══════════════════════════════════════════════════════════════════════════
call "%~dp0\1-PUSH.bat"
