@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 96 (ATIVACAO: botao morto, funil, grade que nunca renderizou, 4 paginas SEO) ===== > push_96_log.txt
git config user.email "josephsskaf@gmail.com" >> push_96_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_96_log.txt 2>&1

echo [remove codigo morto: HomePageClient orfao desde 30/06] >> push_96_log.txt
git rm -q --ignore-unmatch app/HomePageClient.tsx >> push_96_log.txt 2>&1
if exist "app\HomePageClient.tsx" del /q "app\HomePageClient.tsx"

echo [garante que PT/ES continuam fora - no-op se o 92 ja passou] >> push_96_log.txt
git rm -r -q --ignore-unmatch app/pt >> push_96_log.txt 2>&1
git rm -r -q --ignore-unmatch app/es >> push_96_log.txt 2>&1
git rm -q --ignore-unmatch app/pricing/layout.tsx >> push_96_log.txt 2>&1
if exist "app\pt" rmdir /s /q "app\pt"
if exist "app\es" rmdir /s /q "app\es"
if exist "app\pricing\layout.tsx" del /q "app\pricing\layout.tsx"

git add -A >> push_96_log.txt 2>&1
echo [staged] >> push_96_log.txt
git diff --cached --name-status >> push_96_log.txt 2>&1
echo [commit] >> push_96_log.txt
git commit -m "PUSH #96 ATIVACAO: conserta o loop de auth que deixava o botao Generate PERMANENTEMENTE morto (GenerateClient retentava a cada 1500ms pra sempre e handleAnalyze/handleGenerate saiam cedo mostrando so 'Checking for an in-progress render' - eh por isso que 20 de 70 sessoes abriram /generate e nao emitiram NENHUM evento), router.replace virou history.replaceState (a rota eh force-dynamic, entao o replace remontava a arvore inteira do cliente no caminho do usuario recem-criado e inflava viral_onboarding_viewed pra 389 eventos em 40 sessoes), onboarding com skip de 44px + fechar clicando fora + fim do bug de overflow que cortava o card em tela baixa, 61 eventos novos de falha nomeada (51 no cliente + 10 no servidor) pra nunca mais adivinhar onde o funil quebra, contadores de retry no fal e no avatar que antes retentavam pra sempre, generate_arrived_server com dedupe de 30min por sessao (contava render e nao chegada: 138 eventos pra 51 sessoes, 2.7x de inflacao no topo do funil), HomePageClient deletado (2334 linhas orfas), generations_used morto trocado por contagem real da tabela videos, GRADE CINEMATOGRAFICO: descoberto que TODO elemento shape do Creatomate precisa da propriedade path e nenhum tinha - o stack inteiro de grade, scrim, letterbox e vignette NUNCA desenhou um pixel desde que foi escrito, agora com path real + alphas conservadores de primeira luz (wash 0.06-0.08 multiply, glow 0.05-0.07 screen, scrim 0.14) e as barras de letterbox e vignette deletadas porque cobriam a safe zone das legendas, re-ranker estetico de B-roll novo em lib/broll/aesthetic-score.ts ligado no Pixabay e no Pexels (relevancia SEMPRE domina: 1 match de topico vale 4pts contra o swing total de 3pts da estetica), PEOPLE_LIFESTYLE_RE parou de ser copiado a mao em 2 arquivos, e 4 paginas SEO novas: reddit-story-video-generator, brainrot-video-generator, youtube-automation e how-to-start-a-faceless-youtube-channel (sitemap 89 -> 93 URLs). Inclui tambem o PUSH #95 caso ele ainda nao tenha subido: evento homepage_view restaurado + programa de afiliados com link na Sidebar, MobileNav e Footer." >> push_96_log.txt 2>&1
echo [push] >> push_96_log.txt
git push origin main >> push_96_log.txt 2>&1
git status --short --branch >> push_96_log.txt 2>&1
echo ===== FIM ===== >> push_96_log.txt
type push_96_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
