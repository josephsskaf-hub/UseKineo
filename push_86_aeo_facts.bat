@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 86 (AEO pack) ===== > push_86_log.txt
git config user.email "josephsskaf@gmail.com" >> push_86_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_86_log.txt 2>&1
git add -- "app/facts/page.tsx" "components/StructuredData.tsx" "public/llms.txt" "push_86_aeo_facts.bat" >> push_86_log.txt 2>&1
echo [staged] >> push_86_log.txt
git diff --cached --name-only >> push_86_log.txt 2>&1
echo [commit] >> push_86_log.txt
git commit -m "PUSH #86 AEO pack: FAQPage JSON-LD sitewide + named plan Offers + 3 high-intent Q&As on /facts + llms.txt question block" >> push_86_log.txt 2>&1
echo [push] >> push_86_log.txt
git push origin main >> push_86_log.txt 2>&1
git status --short --branch >> push_86_log.txt 2>&1
echo ===== FIM ===== >> push_86_log.txt
type push_86_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
