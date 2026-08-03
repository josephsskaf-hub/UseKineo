@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 21-PUSH — 03/08/2026 (sprint 10h) — ORDEM 4: E-MAIL DO TETO SAME-DAY
REM
REM   cf9d057  PLANO DA SEMANA (docs, sessao paralela): funil medido, gargalo
REM            checkout->pago 6% e gerar->baixar 30%.
REM   067900f  Ordem 4: cron send-cap-hit (15,45 * * * *) — free user que faz
REM            o 3o video em 24h recebe e-mail em ate 1h: "Starter removes
REM            the wall", 1o mes metade do preco. Coluna cap_hit_sent_at JA
REM            APLICADA em producao; supressao cruzada 24h atualizada.
REM            Gate: so dispara com KINEO_LIFECYCLE_EMAILS_ENABLED=true.
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
REM ═══════════════════════════════════════════════════════════════════════════
call "%~dp0\1-PUSH.bat"
