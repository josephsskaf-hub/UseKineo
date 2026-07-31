@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM 2-PUSH — 31/07/2026
REM
REM O QUE ESTE NUMERO SOBE:
REM   b7cca06  Case study vivo (/youtube-automation-case-study) + footer + sitemap
REM   <novo>   Hook cobre a frase inteira (era 2s fixos e encolhia no meio) +
REM            este proprio bat
REM
REM SISTEMA DE NUMERACAO (pedido do fundador em 30/07): cada vez que houver
REM commits novos esperando push, eu crio o PROXIMO numero (3-PUSH, 4-PUSH...)
REM com a lista do que ele sobe escrita aqui em cima. Regra pra voce:
REM   >>> CLIQUE SEMPRE NO MAIOR NUMERO DA PASTA. <<<
REM Clicar num numero antigo nao causa dano (todos so empurram), so nao te
REM conta o que ha de novo. O motor real e o 1-PUSH.bat; os numerados chamam ele.
REM ═══════════════════════════════════════════════════════════════════════════
call "%~dp0\1-PUSH.bat"
