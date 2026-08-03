@echo off
REM 24-PUSH - 03/08/2026 (noite) - MEDIDA 6 + docs das redes de protecao
REM
REM   dda0859  MEDIDA 6: cron send-video-ready - e-mail "your video is ready"
REM            para video completed sem download (janela 30min-24h), stamp
REM            proprio + supressao cruzada. Ataca a fatia "nunca voltou" que
REM            o video_ready_viewed (23-PUSH) agora mede.
REM   2091f62 / 7086e54  docs: redes de protecao dos 3 fornecedores fechadas
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
call "%~dp0\1-PUSH.bat"
