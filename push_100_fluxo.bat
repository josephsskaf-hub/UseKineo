@echo off
cd /d "%~dp0"
echo ===== KINEO PUSH 100 (FLUXO + AQUISICAO) - inclui 98 e 99 que nunca subiram ===== > push_100_log.txt
git config user.email "josephsskaf@gmail.com" >> push_100_log.txt 2>&1
git config user.name "Joseph Skaf" >> push_100_log.txt 2>&1

echo. >> push_100_log.txt
echo [1/5] extraindo os 34 arquivos do push_100_files.zip por cima do repo >> push_100_log.txt
if not exist "push_100_files.zip" (
  echo ERRO: push_100_files.zip NAO esta nesta pasta. Coloque o zip do lado deste .bat e rode de novo. >> push_100_log.txt
  type push_100_log.txt
  echo.
  echo ###### FALTOU O ZIP - leia acima ######
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0push_100_files.zip' -DestinationPath '%~dp0' -Force" >> push_100_log.txt 2>&1
if errorlevel 1 (echo FALHOU A EXTRACAO >> push_100_log.txt) else (echo extraido ok >> push_100_log.txt)

echo. >> push_100_log.txt
echo [2/5] pacote do PUSH 98 - idempotente, nao quebra se ja estiver instalado >> push_100_log.txt
call npm install @vercel/analytics --save >> push_100_log.txt 2>&1

echo. >> push_100_log.txt
echo [3/5] PUSH 99 - remove o public/llms.txt antigo, ele SOMBREIA a rota nova e a deixa morta >> push_100_log.txt
if exist "public\llms.txt" del /f /q "public\llms.txt" >> push_100_log.txt 2>&1
if exist "public\llms.txt" (echo FALHOU AO DELETAR public\llms.txt >> push_100_log.txt) else (echo public\llms.txt removido ok >> push_100_log.txt)

echo. >> push_100_log.txt
echo [4/5] staging >> push_100_log.txt
git add -A >> push_100_log.txt 2>&1
git diff --cached --name-status >> push_100_log.txt 2>&1

echo. >> push_100_log.txt
echo [5/5] commit + push >> push_100_log.txt
git commit -m "PUSH #100 FLUXO + AQUISICAO (carrega junto o #98 e o #99, que nunca subiram - conferido em producao: /llms.txt ainda servia o arquivo estatico de 7528 bytes e a home nao tinha o script de analytics). (1) LOOP DE DISTRIBUICAO - a marca so aparecia nos ultimos 2.5s, que eh o pedaco do Short que menos gente ve, e a marca d'agua era fonte 28 com alpha 0.60 e sem placa (1.46%% da altura do frame, ilegivel em celular). Agora: fonte 40, alpha 0.92, placa rgba(13,13,20,0.55), texto virou 'usekineo.com/free' (um destino de verdade, nao um dominio solto), e o lockup 'Made with Kineo' ganhou uma SEGUNDA instancia nos primeiros 2s, em track propria, byte-identica a da cauda. Matematica de colisao refeita: marca d'agua ocupa 55-137px, end card comeca em 205px, sobra 68px de folga. Nova rota /free grava cookie httpOnly de 90 dias kineo_wm_src=watermark e joga pra home com utm_source=watermark - o valor NAO eh usekineo.com de proposito, senao lib/acquisitionSource.ts anularia como auto-referral. Conferido que o redirect apex->www preserva o path (308 pra www.usekineo.com/free). (2) DESCRICAO DO YOUTUBE - o texto que o usuario copia e cola no YouTube nao tinha NENHUM link da Kineo. Novo lib/videoDescription.ts (modulo puro, sem env, cliente e servidor compartilham byte a byte) injeta a linha de credito com link e utm_source=video_desc, idempotente e cortando a base em fronteira de palavra pra o credito sempre sobreviver. A checagem de plano roda no SERVIDOR em /api/youtube/upload e em /api/compose/status - cliente nao consegue tirar. Free ve um pedido de uma frase pra manter o credito. (3) COBRANCA - a CTA 'usekineo.com' era empurrada SEM condicao nenhuma, entao todo export PAGO saia com o dominio queimado nos ultimos 2.5s enquanto o /pricing vende 'Download watermark-free MP4' e o /api/compose/unlock passa endCard:false justamente porque a pessoa PAGOU pra tirar a marca. Isso eh argumento de chargeback, nao loop de crescimento. Agora a CTA esta atras do mesmo endCard do resto da pilha de marca: free nao muda nada, pago sai limpo de verdade. (4) CAPITAL MORTO LIGADO - components/ReferralPromoBanner.tsx existia com 69 linhas e ZERO imports desde que foi escrito, agora esta no layout do dashboard com supressao em /referral e /generate pra nao duplicar com o card inline. E /api/affiliate/apply inseria status 'pending', entao /a/[code] descartava o cookie em silencio e nao logava clique nenhum - agora entra 'active' (a comissao continua travada em outro lugar, no webhook do Stripe, entao liberar o link nao libera dinheiro). (5) COORTE NOVA - 112 pessoas comecaram uma geracao e nunca tiveram video na mao, e 111 delas nao tem linha em videos, entao o send-video-rescue pulava todas; 103 ja tinham levado o nudge errado. Nova rota /api/admin/send-stalled-rescue so pra elas, com paginacao por .range() pra fugir do teto silencioso de 1000 linhas do PostgREST e com o descadastro do #99 inteiro. Coluna stalled_rescue_emailed ja aplicada em producao. (6) SEMANTICA CORRIGIDA EM PRODUCAO (sem deploy) - free_ai_generate_used era gravado como true no INSERT do handle_new_user(), entao nao queria dizer 'usou o gerador', queria dizer 'se cadastrou depois de 09/07'. O send-free-upsell mirava 237 pessoas, 138 delas nunca fizeram um video, e 107 que fizeram de verdade eram invisiveis. Trigger corrigida e coluna backfillada a partir de evento real de conclusao: agora sao 206 completadores reais, 113 alcancaveis. Com 91%% da base no gmail, mirar errado eh o que joga o dominio inteiro no spam. (7) #99 UNSUBSCRIBE - a base tem 713 cadastrados, ja levou blast, e nao existia UM link de descadastro nem header List-Unsubscribe: violacao de CAN-SPAM 7704(a)(3) e (a)(5). lib/emailSuppression.ts com token HMAC, /unsubscribe com GET humano e POST one-click RFC 8058, e as 11 rotas de email filtrando email_opted_out. O link do rodape aponta pra PAGINA e nao pro GET da API de proposito: scanner corporativo faz GET em todo link e descadastraria a base sozinho. (8) #99 CANAL LLM + #98 ANALYTICS - /llms.txt e /api/facts derivados por import de lib/pricing, checkoutPricing, engineCost e comparisons, zero numero digitado a mao; o ChatGPT ja manda 4x mais trafego que o Google inteiro. @vercel/analytics na home. tsc 22 igual a baseline, build exit 0, /free e /api/admin/send-stalled-rescue registrados no manifest." >> push_100_log.txt 2>&1

git push origin main >> push_100_log.txt 2>&1
git status --short --branch >> push_100_log.txt 2>&1
echo ===== FIM ===== >> push_100_log.txt
type push_100_log.txt
echo.
echo ====== Terminou. Pode fechar. ======
pause
