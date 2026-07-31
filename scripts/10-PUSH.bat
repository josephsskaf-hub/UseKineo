@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 10-PUSH — 31/07/2026 (sprint 11h) — SUBSTITUI o 8 e o 9: sobe TUDO (6+ commits)
REM
REM   O MAIS URGENTE DESTE NUMERO:
REM   c91f0c4  ALARME OPENAI — os creditos da OpenAI ZERARAM as 11:07Z e a
REM            producao ficou 3h parada EM SILENCIO (0 videos, 10 pessoas,
REM            demo da landing morta). Este commit faz o proximo blackout
REM            te mandar E-MAIL em segundos + mostra 503 honesto ao usuario.
REM            (Recarregar os creditos e VOCE: platform.openai.com/settings/
REM             organization/billing — o gate 00 tem o link.)
REM
REM   E o resto pendente:
REM   cf13d17  PONTE POS-DOWNLOAD "postou? cola o link" (sprint 10h)
REM   99fa4e2  TAAFT REVIVE: ask com 11 shows e 0 cliques (sprint 10h)
REM   fe14f19  DOCS sprint 10h
REM   caf39bb  DOCS Reddit POSTADO + Fazier COMPLETO + Stripe rebrand
REM   56fb34b  CHORE 9-PUSH.bat
REM   + docs da sprint 11h e este proprio .bat
REM
REM Apaga os 3 locks da sessao travada das 10:01 (a sandbox nao consegue).
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
REM ═══════════════════════════════════════════════════════════════════════════
del /f /q "%~dp0..\.git\refs\heads\main.lock" 2>nul
del /f /q "%~dp0..\.git\HEAD.lock" 2>nul
del /f /q "%~dp0..\.git\index.lock" 2>nul
call "%~dp0\1-PUSH.bat"
