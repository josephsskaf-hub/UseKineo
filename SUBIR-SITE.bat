@echo off
title KINEO - SUBIR SITE
cd /d "%~dp0"
set KINEO_SEM_PAUSE=1
echo ===== CLIQUE %date% %time% =====
call "scripts\!RODAR-AGORA.bat" 2>&1 | powershell -NoProfile -Command "$input | Tee-Object -FilePath 'subir-site-clique.log'"
echo.
echo (tudo acima tambem ficou salvo em subir-site-clique.log)
pause
