@echo off
REM 24-PUSH - 03/08/2026 (12h) - MEDIDA 6 + DOCS DE PROTECAO
REM
REM   7086e54  DOCS: estado das redes de protecao dos 3 fornecedores
REM   2091f62  DOCS: OpenAI auto-reload $10->$25, teto $100 + alarme interno
REM   dda0859  MEDIDA 6: cron send-video-ready - e-mail "your video is ready"
REM            p/ video completed sem download (30min-24h), thumbnail + link,
REM            stamp video_ready_sent_at (migration JA em producao),
REM            supressao cruzada, cron 10,40 * * * *
REM   + docs da sprint 12h
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
call "%~dp0\1-PUSH.bat"
