@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 87 (5 novas aquisicoes) ===== > push_87_log.txt
git config user.email "josephsskaf@gmail.com" >> push_87_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_87_log.txt 2>&1
git add -A >> push_87_log.txt 2>&1
echo [staged] >> push_87_log.txt
git diff --cached --name-only >> push_87_log.txt 2>&1
echo [commit] >> push_87_log.txt
git commit -m "PUSH #87 ACQ5: niche-picker tool + State of AI Shorts 2026 study + /es cluster + PT-BR canal-dark/gerador-faceless + embeddable widget & badge" >> push_87_log.txt 2>&1
echo [push] >> push_87_log.txt
git push origin main >> push_87_log.txt 2>&1
git status --short --branch >> push_87_log.txt 2>&1
echo ===== FIM ===== >> push_87_log.txt
type push_87_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
