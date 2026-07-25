@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 91 (SEO sprint: 6 paginas de alta demanda) ===== > push_91_log.txt
git config user.email "josephsskaf@gmail.com" >> push_91_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_91_log.txt 2>&1
git add -A >> push_91_log.txt 2>&1
echo [staged] >> push_91_log.txt
git diff --cached --name-only >> push_91_log.txt 2>&1
echo [commit] >> push_91_log.txt
git commit -m "PUSH #91 SEO sprint: 6 high-demand pages (best-ai-shorts-generators roundup hub, how-much-do-youtube-shorts-pay, youtube-shorts-rpm-by-niche hub linking all 28 niches, shorts-money-calculator, can-you-monetize-ai-videos, tiktok-vs-youtube-shorts) + FAQ/Breadcrumb schema each; added to sitemap + footer + homepage internal links; sitemap lastmod bumped" >> push_91_log.txt 2>&1
echo [push] >> push_91_log.txt
git push origin main >> push_91_log.txt 2>&1
git status --short --branch >> push_91_log.txt 2>&1
echo ===== FIM ===== >> push_91_log.txt
type push_91_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
