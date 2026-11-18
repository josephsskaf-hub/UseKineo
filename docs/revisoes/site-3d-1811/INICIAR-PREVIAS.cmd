@echo off
setlocal
pushd "%~dp0..\..\.."
if not exist "node_modules\next\dist\bin\next" (
  echo Instale as dependencias do checkout com npm ci para iniciar as rotas.
  pause
  popd
  exit /b 1
)
echo A  http://127.0.0.1:3168/dev/3d-a
echo B  http://127.0.0.1:3168/dev/3d-b
echo C  http://127.0.0.1:3168/dev/3d-c
echo Mantenha esta janela aberta durante a aprovacao. Ctrl+C encerra a previa.
set NEXT_TELEMETRY_DISABLED=1
node "node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3168
popd
