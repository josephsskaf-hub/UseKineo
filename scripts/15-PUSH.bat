@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 15-PUSH — 02/08/2026 — RESGATE DE CHECKOUT EM 2-4H (pedido: "3 horas no maximo")
REM
REM   d079b97 (amended)  Sessao Stripe expira em 2h -> e-mail de resgate chega
REM                      2-4h depois do abandono (era D+1, intencao fria).
REM                      + METAS 500/1000 pagantes + ordens de conversao + docs.
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
REM ═══════════════════════════════════════════════════════════════════════════
call "%~dp0\1-PUSH.bat"
