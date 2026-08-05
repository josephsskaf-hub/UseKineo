@echo off
REM 43-PUSH - 05/08 madrugada - INTEGRIDADE DE CREDITO (URGENTE) + HERO + PILULA
REM
REM   O MAIS IMPORTANTE:
REM   e3ddf7a  INTEGRIDADE DE CREDITO - o modo cinematografico (seedance/veo/kling)
REM            debitava NO SUBMIT e NAO devolvia se o render fosse abandonado.
REM            A tela prometia "credits are only charged on successful delivery" -
REM            era MENTIRA em todo motor de IA. Achamos 1 render de 22/07 com 150
REM            creditos queimados em silencio. Agora: sweep automatico devolve,
REM            a pilula enxerga render de IA em andamento, e a copy virou verdade.
REM
REM   Tambem sobem:
REM   8313f5f  HERO v2 - 6 Shorts reais abaixo da caixa, chips laterais menores
REM   8394dbb  PILULA GLOBAL DE RENDER - voltar ao video de qualquer pagina
REM   8e9f478  HERO - caixa maior + chips laterais
REM   d653fe9  ORDEM O - GO do TAAFT $347 registrado
REM   + docs do incidente
REM
REM DEPOIS DO DEPLOY: hero novo em www.usekineo.com (confira no celular tambem).
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
git log --oneline -8 >> "%LOG%" 2>&1
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
