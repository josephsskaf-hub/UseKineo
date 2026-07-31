@echo off
REM KINEO-2026-07-30 — DESATIVADO. Este script commitava com o indice envenenado
REM do OneDrive e ja causou a reversao acidental do b6fef68 (apagou a correcao
REM da entrega paga). Agora ele so redireciona para o script certo, para que um
REM duplo clique errado nunca mais cause estrago.
echo Este script foi desativado. Rodando o certo: 1-PUSH.bat
call "%~dp0\1-PUSH.bat"
