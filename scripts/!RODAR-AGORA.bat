@echo off
setlocal
REM ================================================================
REM  !RODAR-AGORA v10 - "certinho toda vez" (pedido do fundador 01/09)
REM  v10: commit ja aplicado na main (pick vazio) e PULADO, nao vira
REM  conflito falso que trava a fila inteira.
REM  v9: travas orfas em 30min (nao 2h); conflito em docs/*.md resolve
REM  sozinho por UNIAO (guarda os dois lados); conflito real diz o ARQUIVO.
REM
REM  O QUE ELE FAZ, na ordem:
REM   1. Limpa travas orfas do git (v6).
REM   2. MOSTRA A FILA: quantas entregas novas existem e quais sao.
REM   3. Empurra a branch entrega-atual para a main.
REM   4. Se outro agente empurrou por cima: REBASA SOZINHO num clone
REM      temporario e tenta de novo, ate 3 vezes (v7).
REM   5. Termina SEMPRE com um veredito de uma linha, em portugues.
REM
REM  LEITURA DO RESULTADO:
REM   "SUBIU N ENTREGAS"  = entregou agora.
REM   "NADA PENDENTE"     = tudo ja estava no ar (isso e saude, nao erro).
REM   "PAROU NO CONFLITO" = decisao humana; avisa no chat.
REM   "FALHOU 3 VEZES"    = avisa no chat.
REM  v8: o aviso assustador "cannot force update ... used by worktree"
REM  da branch de sprint foi silenciado - era cosmetico (a branch que
REM  sobe e a entrega-atual; a de sprint se realinha sozinha na
REM  proxima rodada da sprint).
REM ================================================================
cd /d "%~dp0.."
set "RAIZ=%CD%"
set "TMPREPO=%TEMP%\kineo-push"

echo Limpando travas orfas do git (mais de 30 minutos)...
powershell -NoProfile -Command "Get-ChildItem -Path '.git\*' -Recurse -Include '*.lock','tmp_obj_*' -Force -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-30) } | Remove-Item -Force -ErrorAction SilentlyContinue"

git fetch origin >nul 2>&1

echo.
echo ================= FILA DE ENTREGA =================
set "PEND=0"
for /f %%N in ('git rev-list --count origin/main..entrega-atual 2^>nul') do set "PEND=%%N"
if "%PEND%"=="0" (
  echo  Nada pendente: tudo que existia ja esta no ar.
  echo ===================================================
  echo.
  echo  == NADA PENDENTE - nenhum push necessario. ==
  goto :fim
)
echo  %PEND% entrega(s) novas para subir:
git log --oneline origin/main..entrega-atual
echo ===================================================

for /L %%T in (1,1,3) do (
  echo.
  echo === Tentativa %%T de 3 ===
  git fetch origin >nul 2>&1
  echo Empurrando a branch entrega-atual para origin/main...
  git push origin entrega-atual:main > scripts\push_result.log 2>&1
  if not errorlevel 1 (
    echo.
    echo  == SUBIU %PEND% ENTREGA^(S^) - o deploy da Vercel comeca sozinho. ==
    goto :fim
  )
  echo.
  echo  -- Outro agente empurrou por cima ^(normal, acontece 10x/dia^). Rebasando sozinho... --
  call :rebasar
  if errorlevel 1 goto :conflito
)

echo.
echo  XX FALHOU 3 VEZES - avisa no chat que o Claude resolve. XX
type scripts\push_result.log
goto :fim

:rebasar
rmdir /s /q "%TMPREPO%" 2>nul
git clone --shared -q "%RAIZ%" "%TMPREPO%" 2>nul || exit /b 1
pushd "%TMPREPO%"
git remote add up "%RAIZ%" 2>nul
git fetch -q up "refs/remotes/origin/main:refs/remotes/om" "refs/heads/entrega-atual:refs/remotes/ea" 2>nul || (popd & exit /b 1)
git config user.email "josephsskaf@gmail.com"
git config user.name "Kineo Push"
git checkout -q -B empurrar om 2>nul || (popd & exit /b 1)
for /f "delims=" %%C in ('git rev-list --reverse om..ea') do (
  git cherry-pick %%C >nul 2>&1
  if errorlevel 1 (
    call :uniao_docs
    if errorlevel 1 (
      echo.
      echo  XX CONFLITO REAL no commit %%C - arquivo^(s^) fora de docs/: XX
      git diff --name-only --diff-filter=U
      git cherry-pick --abort >nul 2>&1
      popd
      exit /b 1
    )
    echo  -- diario resolvido por uniao, ou commit repetido pulado: seguindo --
  )
)
popd
git fetch -q "%TMPREPO%" "refs/heads/empurrar:refs/remotes/empurrar-novo" 2>nul || exit /b 1
for /f "delims=" %%H in ('git rev-parse refs/remotes/empurrar-novo') do set "NOVO=%%H"
git branch -f entrega-atual %NOVO% 2>nul
REM v8: a branch da sprint pode estar presa numa worktree; atualizar e
REM cosmetico, entao qualquer erro aqui e engolido de proposito.
git branch -f claude/cycle72h-v1v4 %NOVO% >nul 2>&1
echo  -- Rebase pronto. entrega-atual realinhada. --
rmdir /s /q "%TMPREPO%" 2>nul
exit /b 0

:uniao_docs
REM v9: para cada arquivo em conflito, se for docs/*.md resolve por UNIAO
REM (git merge-file --union); qualquer outro caminho = conflito real.
REM v10 (05/09): cherry-pick VAZIO nao e conflito. Quando as duas pistas
REM cherry-pickam o mesmo docs/, o commit chega na main pela outra pista e o
REM pick fica SEM NADA para aplicar: o git sai com erro e ZERO arquivo em
REM conflito. O v9 lia isso como CONFLITO REAL, imprimia lista vazia e parava
REM o push inteiro (16 entregas presas em 05/09 04:20 UTC). Vazio = pular.
set "TEMCONF="
for /f "delims=" %%F in ('git diff --name-only --diff-filter=U') do set "TEMCONF=1"
if not defined TEMCONF (
  git cherry-pick --skip >/dev/null 2>&1
  exit /b 0
)
for /f "delims=" %%F in ('git diff --name-only --diff-filter=U') do (
  echo %%F | findstr /b /i "docs/" >nul || exit /b 1
  echo %%F | findstr /i "\.md$" >nul || exit /b 1
  git show ":1:%%F" > "%TEMP%\k_base" 2>nul
  git show ":2:%%F" > "%TEMP%\k_ours"
  git show ":3:%%F" > "%TEMP%\k_theirs"
  git merge-file -p --union "%TEMP%\k_ours" "%TEMP%\k_base" "%TEMP%\k_theirs" > "%%F"
  git add "%%F"
)
git -c core.editor=true cherry-pick --continue >nul 2>&1 || exit /b 1
exit /b 0

:conflito
echo.
echo  XX PAROU NO CONFLITO - nao empurrei nada. Avisa no chat. XX
echo  (Nada foi perdido: entrega-atual continua como estava.)

:fim
echo.
if not defined KINEO_SEM_PAUSE pause
endlocal
