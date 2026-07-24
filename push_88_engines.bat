@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 88 (motores + AEO + aquisicoes + cards) ===== > push_88_log.txt
git config user.email "josephsskaf@gmail.com" >> push_88_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_88_log.txt 2>&1
git add -A >> push_88_log.txt 2>&1
echo [staged] >> push_88_log.txt
git diff --cached --name-only >> push_88_log.txt 2>&1
echo [commit] >> push_88_log.txt
git commit -m "PUSH #88 engines: plug avatar/gesture money leaks + charge voice-clone/scene + 60s caps; seed+retries+parallel submit on Seedance/Kling/Veo; wire first-video AI wow hook; compose audio cache + beat-aligned cuts + music duck + ElevenLabs (flag); incl #86 AEO, #87 5-channel acquisition, pricing cards fix" >> push_88_log.txt 2>&1
echo [push] >> push_88_log.txt
git push origin main >> push_88_log.txt 2>&1
git status --short --branch >> push_88_log.txt 2>&1
echo ===== FIM ===== >> push_88_log.txt
type push_88_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
