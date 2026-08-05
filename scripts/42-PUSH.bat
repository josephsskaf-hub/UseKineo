@echo off
REM 42-PUSH - 05/08 madrugada - HERO NOVO + PILULA DE RENDER
REM
REM   5 commits:
REM   8313f5f  HERO v2 - fileira de 6 Shorts REAIS abaixo da caixa (4 antigos +
REM            2 exports do fundador), chips laterais menores, caixa mais ampla.
REM            Peso da 1a dobra CAIU de 943 KB para 247 KB (poster + video sob hover).
REM   8394dbb  PILULA GLOBAL DE RENDER - "Rendering... 3m 12s" em QUALQUER pagina
REM            do app, com botao que volta pro video. O render nao se perde mais.
REM   8e9f478  HERO - caixa maior + chips nas laterais (base do v2)
REM   d653fe9  ORDEM O - GO do TAAFT $347 registrado pras sprints
REM   7ce33ce  DOCS - gate do 41-PUSH fechado
REM
REM DEPOIS DO DEPLOY: abra www.usekineo.com e confira o hero novo no desktop E no
REM celular. A pilula de render aparece quando houver render em andamento.
cd /d "%~dp0.."
if errorlevel 1 (
  echo ERRO: nao achei a pasta do repo.
  pause
  exit /b 1
)
set LOG=scripts\push_result.log
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"
echo === ANTES === > "%LOG%" 2>&1
git log --oneline -6 >> "%LOG%" 2>&1
git reset --mixed >> "%LOG%" 2>&1
echo === PUSH === >> "%LOG%" 2>&1
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%" 2>&1
echo === REMOTO AGORA === >> "%LOG%" 2>&1
git ls-remote origin main >> "%LOG%" 2>&1
type "%LOG%"
echo.
echo Terminado. Se PUSH_EXIT=0 e o hash bate com o topo do log, SUBIU.
pause
