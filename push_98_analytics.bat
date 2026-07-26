@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 98 (Vercel Web Analytics: o painel estava ligado, o codigo nunca existiu) ===== > push_98_log.txt
git config user.email "josephsskaf@gmail.com" >> push_98_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_98_log.txt 2>&1

echo [instala o pacote que faltava] >> push_98_log.txt
call npm install @vercel/analytics --save >> push_98_log.txt 2>&1

git add -A >> push_98_log.txt 2>&1
echo [staged] >> push_98_log.txt
git diff --cached --name-status >> push_98_log.txt 2>&1
echo [commit] >> push_98_log.txt
git commit -m "PUSH #98 ANALYTICS: o Vercel Web Analytics ja estava HABILITADO no painel do projeto, mas o painel mostrava a tela 'Get Started' e zero pageview porque o codigo nunca existiu - @vercel/analytics nao estava no package.json e o componente <Analytics/> nao estava no app/layout.tsx, ou seja, nao havia absolutamente nada enviando dado. Instalado @vercel/analytics e montado <Analytics/> no fim do body do layout raiz. Sem isso a gente nao tem UM numero de trafego do site inteiro e nao tem como medir se as 422 paginas de video indexaveis, o video-sitemap de 426 URLs e as 12 paginas /vs/ do PUSH #97 trouxeram alguem. Os dados comecam a contar a partir do primeiro visitante depois deste deploy - o historico anterior esta perdido pra sempre e nao ha como recuperar. tsc 27 identico a baseline, build exit 0." >> push_98_log.txt 2>&1
echo [push] >> push_98_log.txt
git push origin main >> push_98_log.txt 2>&1
git status --short --branch >> push_98_log.txt 2>&1
echo ===== FIM ===== >> push_98_log.txt
type push_98_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
