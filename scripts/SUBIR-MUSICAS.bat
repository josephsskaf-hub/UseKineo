@echo off
setlocal
cd /d "%~dp0.."
echo.
echo ==========================================================
echo   SUBIR AS 59 FAIXAS PARA O BUCKET "music"
echo ==========================================================
echo.
echo   Cole a chave service_role do Supabase e tecle ENTER.
echo   Ela NAO aparece na tela e NAO fica gravada em lugar nenhum
echo   - some quando esta janela fechar.
echo.
echo   Onde pegar:
echo     Supabase ^> Project Settings ^> API ^> service_role
echo.

REM Read-Host -AsSecureString esconde o que e digitado e a chave viaja so pela
REM memoria deste processo. Nada e escrito em arquivo, historico ou log.
for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "$s=Read-Host -Prompt '  service_role' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"`) do set "SUPABASE_SERVICE_ROLE_KEY=%%K"

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
  echo.
  echo   Nenhuma chave informada. Cancelado.
  echo.
  pause
  exit /b 1
)

echo.
echo   Chave recebida. Subindo...
echo.
node scripts\subir-musicas.mjs

REM Limpa da memoria do processo antes de sair.
set "SUPABASE_SERVICE_ROLE_KEY="
echo.
pause
