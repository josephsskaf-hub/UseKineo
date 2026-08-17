@echo off
REM ============================================================
REM 158-PUSH - SPRINT 16H 17/08 (CEO operacional)
REM
REM PORTAO DE RENDER FANTASMA: a correcao de 16/08 exigia snapshot
REM SEM renderId e por isso NUNCA DISPAROU (0 eventos em 48h),
REM enquanto 128 cliques bloqueados de 6 pessoas aconteciam ao lado.
REM Tres dessas 6 pessoas sairam com ZERO videos na conta.
REM O caso real e snapshot recente COM renderId apontando para render
REM ja morto. Agora, acima de 90s de idade, a sonda do servidor pode
REM abrir o portao tambem nesse caso. Fail-closed preservado e a
REM guarda do dinheiro (lock do compose) intacta.
REM
REM + doc da sprint 16h com o pacote de conteudo do dia.
REM tsc EXITCODE=0, falsificado (erro proposital deu EXITCODE=2).
REM ============================================================
call "%~dp01-PUSH.bat"
