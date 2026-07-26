@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 101 (FLUXO + AQUISICAO) - SUBSTITUI o 98, 99 e 100. Rode SO este. ===== > push_101_log.txt
git config user.email "josephsskaf@gmail.com" >> push_101_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_101_log.txt 2>&1

echo. >> push_101_log.txt
echo [1/6] extraindo os 37 arquivos do push_101_files.zip por cima do repo >> push_101_log.txt
if not exist "push_101_files.zip" (
  echo ERRO: push_101_files.zip NAO esta nesta pasta. Coloque o zip do lado deste .bat e rode de novo. >> push_101_log.txt
  type push_101_log.txt
  echo.
  echo ###### FALTOU O ZIP - leia acima ######
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0push_101_files.zip' -DestinationPath '%~dp0' -Force" >> push_101_log.txt 2>&1
if errorlevel 1 (echo FALHOU A EXTRACAO >> push_101_log.txt) else (echo extraido ok >> push_101_log.txt)

echo. >> push_101_log.txt
echo [2/6] pacote do PUSH 98 - idempotente, nao quebra se ja estiver instalado >> push_101_log.txt
call npm install @vercel/analytics --save >> push_101_log.txt 2>&1

echo. >> push_101_log.txt
echo [3/6] remove o public/llms.txt antigo - ele SOMBREIA a rota nova e a deixa morta >> push_101_log.txt
if exist "public\llms.txt" del /f /q "public\llms.txt" >> push_101_log.txt 2>&1
if exist "public\llms.txt" (echo FALHOU AO DELETAR public\llms.txt >> push_101_log.txt) else (echo public\llms.txt removido ok >> push_101_log.txt)

echo. >> push_101_log.txt
echo [4/6] remove components\ReferralMiniCard.tsx - zero imports, o zip nao consegue apagar arquivo >> push_101_log.txt
if exist "components\ReferralMiniCard.tsx" del /f /q "components\ReferralMiniCard.tsx" >> push_101_log.txt 2>&1
if exist "components\ReferralMiniCard.tsx" (echo FALHOU AO DELETAR ReferralMiniCard.tsx >> push_101_log.txt) else (echo ReferralMiniCard.tsx removido ok >> push_101_log.txt)

echo. >> push_101_log.txt
echo [5/6] staging >> push_101_log.txt
git add -A >> push_101_log.txt 2>&1
git diff --cached --name-status >> push_101_log.txt 2>&1

echo. >> push_101_log.txt
echo [6/6] commit + push >> push_101_log.txt
git commit -m "PUSH #101 FLUXO + AQUISICAO (carrega junto o #98, #99 e #100, que nunca subiram - o origin ainda estava no #97). (1) O MAIOR VAZAMENTO DO FUNIL - nos ultimos 7 dias, pela tabela events: 230 sessoes anonimas na landing, 113 chegaram a ver o formulario da home, 10 agiram. 95.7%% de perda em UM componente. O motivo: o formulario prometia video e entregava uma tela de cadastro, entao o visitante pagava o preco (dar email) antes de receber qualquer valor. Agora o anonimo digita o topico e recebe o SCRIPT DE VERDADE ali mesmo, inline - gancho, tres fatos e desfecho - e so depois bate num muro honesto: 'This script is yours to keep. Rendering it into a video needs a free account. No card.' NAO criei endpoint nenhum pra isso: /api/demo-script ja existia, ja era anonimo, com limite de 12 por IP a cada 24h, teto de 200 caracteres, gpt-4o-mini com 420 tokens, zero escrita no banco e zero credito - e o comentario de cabecalho da propria rota dizia que ela tinha sido escrita pra home. A home tinha REGREDIDO pra longe da rota feita pra ela. O caminho de quem ja esta logado ficou byte a byte identico (o handler retorna sem preventDefault, o GET nativo pro /generate e todos os campos escondidos continuam iguais) e sem JS degrada pro action=/signup de antes. Eventos novos: home_free_script_requested, _succeeded, _failed, _cta_clicked. Corrigido tambem o texto que aparecia pra quem JA estava logado, que ainda dizia 'comeca automaticamente depois do cadastro'. (2) PROGRAMA DE AFILIADOS PAROU DE MENTIR - o /partners dizia 'Application is reviewed before a link becomes active' em 10 lugares. Nao existe fila de revisao nenhuma no codigo, e desde o #100 o apply ja entra como active. Entao a pagina inventava uma espera que nao existe e matava a conversao na porta. Reescrito: 'Free to join. No review queue - your link is live the second you apply, and starts tracking your first click.' FAQ, passos do como-funciona, metadata e CTA do rodape alinhados. O botao APPLY do /partners apontava pra /signup?redirect=/affiliate; agora aponta direto pro /affiliate, que ja trata logado e deslogado. Conferido em producao: a tabela affiliates esta VAZIA, zero pessoas ja se candidataram - o problema nunca foi demora na aprovacao, foi que ninguem nunca chegou. (3) components/ReferralMiniCard.tsx DELETADO - zero importadores desde que foi escrito. (4) Tudo do #100 vai junto: CTA de marca agora atras do endCard (todo export PAGO saia com usekineo.com queimado nos ultimos 2.5s enquanto o /pricing vende 'watermark-free' - era argumento de chargeback), marca d'agua legivel (fonte 40, alpha 0.92, placa, texto usekineo.com/free) com lockup extra nos 2 primeiros segundos, rota /free com cookie de 90 dias, credito com link na descricao do YouTube validado no servidor, ReferralPromoBanner ligado no layout, /api/admin/send-stalled-rescue com paginacao por range(). (5) Tudo do #99: unsubscribe HMAC + RFC 8058 nas 11 rotas de email (a base tem 713 cadastrados e nao existia UM link de descadastro - CAN-SPAM 7704(a)(3) e (a)(5)), /llms.txt e /api/facts derivados por import. (6) Tudo do #98: @vercel/analytics na home. (7) Ja aplicado em PRODUCAO, sem deploy: coluna stalled_rescue_emailed criada, e free_ai_generate_used consertada - era gravada como true no INSERT do handle_new_user(), entao significava 'se cadastrou', nao 'usou o gerador'; o send-free-upsell mirava 237 pessoas, 138 nunca fizeram um video. Agora sao 206 completadores reais, 113 alcancaveis. Com 91%% da base no gmail, mirar errado eh o que joga o dominio inteiro no spam. tsc 22 igual a baseline, build exit 0." >> push_101_log.txt 2>&1

git push origin main >> push_101_log.txt 2>&1
git status --short --branch >> push_101_log.txt 2>&1
echo ===== FIM ===== >> push_101_log.txt
type push_101_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
