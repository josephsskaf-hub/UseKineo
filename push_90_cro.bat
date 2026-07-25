@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 90 (10 melhorias CRO/SEO + site 100%% ingles) ===== > push_90_log.txt
git config user.email "josephsskaf@gmail.com" >> push_90_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_90_log.txt 2>&1
git add -A >> push_90_log.txt 2>&1
echo [staged] >> push_90_log.txt
git diff --cached --name-only >> push_90_log.txt 2>&1
echo [commit] >> push_90_log.txt
git commit -m "PUSH #90 CRO/SEO: 3-step how-it-works + risk-reversal line + secondary CTA + 3 FAQ (schema-mirrored) + 2 compare rows + Stripe trust + homepage exit-intent + niche-picker surfacing + footer new pages + metadata; site English-only (PT/ES pulled from footer/FAQ/sitemap, audience outside Brazil)" >> push_90_log.txt 2>&1
echo [push] >> push_90_log.txt
git push origin main >> push_90_log.txt 2>&1
git status --short --branch >> push_90_log.txt 2>&1
echo ===== FIM ===== >> push_90_log.txt
type push_90_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
