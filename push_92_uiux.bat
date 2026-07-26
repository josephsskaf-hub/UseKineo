@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 92 (UI/UX sprint: top 10 melhorias mobile + SEO canonical) ===== > push_92_log.txt
git config user.email "josephsskaf@gmail.com" >> push_92_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_92_log.txt 2>&1

echo [remove PT/ES + pricing layout duplicado] >> push_92_log.txt
git rm -r -q --ignore-unmatch app/pt >> push_92_log.txt 2>&1
git rm -r -q --ignore-unmatch app/es >> push_92_log.txt 2>&1
git rm -q --ignore-unmatch app/pricing/layout.tsx >> push_92_log.txt 2>&1
if exist "app\pt" rmdir /s /q "app\pt"
if exist "app\es" rmdir /s /q "app\es"
if exist "app\pricing\layout.tsx" del /q "app\pricing\layout.tsx"

git add -A >> push_92_log.txt 2>&1
echo [staged] >> push_92_log.txt
git diff --cached --name-status >> push_92_log.txt 2>&1
echo [commit] >> push_92_log.txt
git commit -m "PUSH #92 UI/UX sprint: mobile nav + hamburger em KineoLanding, CTA acima da dobra (661px->468px), StickyFreeShortCTA reativado, /pricing server component com canonical proprio (fim do canonical leak da raiz), canonicals+noindex em todas as paginas, fontes self-hosted via next/font (fim do @import Google Fonts), HeroGallery lazy autoplay com IntersectionObserver, form do hero com Enter/pending/erro inline, recovery de render por userId, /history mostra todos os status, TopBar credits nunca some, contraste WCAG AA, tap targets 44px, pricing cards com preco intro coerente, PT/ES removidos (site 100%% ingles)" >> push_92_log.txt 2>&1
echo [push] >> push_92_log.txt
git push origin main >> push_92_log.txt 2>&1
git status --short --branch >> push_92_log.txt 2>&1
echo ===== FIM ===== >> push_92_log.txt
type push_92_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
