@echo off
REM 23-PUSH - 03/08/2026 (noite) - BUG CRITICO + INSTRUMENTACAO DO FUNIL
REM
REM   fc10ada  FIX CRITICO: reset de senha estava 100% quebrado (PKCE ?code=
REM            na query; pagina so lia hash). Quem esquecia a senha perdia a
REM            conta. Agora: 3 caminhos cobertos + estados honestos na UI.
REM   18c33cb  MEDIDA 4: evento video_ready_viewed (was_hidden +
REM            seconds_to_return) - o buraco gerar->baixar deixa de ser cego.
REM
REM Regra de sempre: CLIQUE NO MAIOR NUMERO DA PASTA.
call "%~dp0\1-PUSH.bat"
