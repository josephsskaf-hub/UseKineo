@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 93 + 94 (MOTORES: legendas, Pixabay, B-roll, grade, cache de voz) ===== > push_93_log.txt
git config user.email "josephsskaf@gmail.com" >> push_93_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_93_log.txt 2>&1

echo [remove PT/ES + pricing layout duplicado - roda de novo sem problema se o 92 ja passou] >> push_93_log.txt
git rm -r -q --ignore-unmatch app/pt >> push_93_log.txt 2>&1
git rm -r -q --ignore-unmatch app/es >> push_93_log.txt 2>&1
git rm -q --ignore-unmatch app/pricing/layout.tsx >> push_93_log.txt 2>&1
if exist "app\pt" rmdir /s /q "app\pt"
if exist "app\es" rmdir /s /q "app\es"
if exist "app\pricing\layout.tsx" del /q "app\pricing\layout.tsx"

git add -A >> push_93_log.txt 2>&1
echo [staged] >> push_93_log.txt
git diff --cached --name-status >> push_93_log.txt 2>&1
echo [commit] >> push_93_log.txt
git commit -m "PUSH #93+#94 MOTORES: legendas nunca mais cortadas antes do payoff (bug em 100%% dos videos), legenda palavra-a-palavra estilo tier-1 (fonte 86/104, stroke 3, pill justa), safe zone real do Shorts (nada atras da UI do YouTube), enfase por palavra em todos os tiers, hook maior + pop mais forte, musica sustenta ate a CTA, TTS sem clique nas emendas + salt de cache pra invalidar audio velho, Pixabay: clipes genericos nunca lideram, preferencia vertical com min_height 1200 e peso +10, GPT director com 5s de timeout e cooldown, gate de relevancia consertado (aceitava qualquer clipe em query de estilo), B-roll: queries aterradas no texto real da cena, blacklist de gente/lifestyle limpa, score de relevancia nunca mais inventa 75, terceiro ato do splitter virou payoff, Ken Burns com ease-out, grade cinematografico real via blend_mode multiply/screen, regenerate-scene consertado (400 em todo clique), VisualDirector com prop-sync real (fim da perda de rascunho), hint de cena de 80 chars pra 240 + nomes proprios" >> push_93_log.txt 2>&1
echo [push] >> push_93_log.txt
git push origin main >> push_93_log.txt 2>&1
git status --short --branch >> push_93_log.txt 2>&1
echo ===== FIM ===== >> push_93_log.txt
type push_93_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
