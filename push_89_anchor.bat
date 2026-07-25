@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 89 (anchor + i2v Kling classico) ===== > push_89_log.txt
git config user.email "josephsskaf@gmail.com" >> push_89_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_89_log.txt 2>&1
git add -A >> push_89_log.txt 2>&1
echo [staged] >> push_89_log.txt
git diff --cached --name-only >> push_89_log.txt 2>&1
echo [commit] >> push_89_log.txt
git commit -m "PUSH #89 cinematic anchor: optional FLUX per-scene still + Kling v2.5 image-to-video for cross-scene consistency, flag-gated (KINEO_CINEMATIC_ANCHOR_ENABLED, off by default), fail-open per scene; whitelist i2v model in clip-status poller" >> push_89_log.txt 2>&1
echo [push] >> push_89_log.txt
git push origin main >> push_89_log.txt 2>&1
git status --short --branch >> push_89_log.txt 2>&1
echo ===== FIM ===== >> push_89_log.txt
type push_89_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
