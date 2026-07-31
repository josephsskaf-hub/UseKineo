@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 8-PUSH — 31/07/2026 (sprint 10h)
REM
REM O QUE ESTE NUMERO SOBE (3 commits):
REM   cf13d17  PONTE POS-DOWNLOAD: "postou? cola o link" na tela de sucesso +
REM            upload direto gravando em posted_shorts (tabela nova, migration
REM            ja aplicada em producao). Primeira metrica de Shorts POSTADOS.
REM   99fa4e2  TAAFT REVIVE: o pedido de review tinha 11 shows e 0 cliques na
REM            vida. Flag por acao (nao por show), gate no 1o render, copy com
REM            motivo, botao primario. A onda atual e 94% TAAFT.
REM   + docs:  SPRINT-2026-07-31.md (placar + diagnostico do pagante + GSC),
REM            IDEIAS-EXECUTADAS, GATES (rascunho do valos pronto no Gmail),
REM            PROMPT-DIARIO e este proprio .bat.
REM
REM Extra: apaga tambem refs\heads\main.lock (a sessao das 10:01 travou e
REM deixou HEAD.lock + main.lock que a sandbox nao consegue remover).
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
REM ═══════════════════════════════════════════════════════════════════════════
del /f /q "%~dp0..\.git\refs\heads\main.lock" 2>nul
del /f /q "%~dp0..\.git\HEAD.lock" 2>nul
del /f /q "%~dp0..\.git\index.lock" 2>nul
call "%~dp0\1-PUSH.bat"
