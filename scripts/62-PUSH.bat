@echo off
REM ============================================================================
REM 62-PUSH - sprints 10h + 13h + 16h + 21h de 07/08/2026
REM SUBSTITUI o 61, 60, 59, 58, 57, 56, 55, 54 e 53 - NAO clicar em nenhum deles.
REM origin/main = 3faabec
REM ============================================================================
REM
REM POR QUE 62 E NAO 61: a sprint das 21h escreveu codigo NOVO em
REM lib\videoDownload.ts, arquivo que NAO estava na lista do 61. Rodar o 61
REM agora deixaria a correcao do download no celular fora do push - e ela e a
REM unica coisa desta fila que impede uma pessoa de ir embora sem o video que
REM acabou de fazer. O 62 faz TUDO o que o 61 fazia, em DOIS commits, e mais o
REM terceiro.
REM
REM ESTE .BAT ESTA EM CRLF DE PROPOSITO (o 58, 59 e 60 eram LF e nenhum rodou).
REM
REM ESTE .BAT TAMBEM FAZ OS COMMITS - leia por que:
REM   O .git\index.lock desta arvore NAO pode ser removido pelo sandbox
REM   ("Operation not permitted" - OneDrive). Entao a sprint nao consegue
REM   commitar sozinha. Pior: o indice esta com um staging DESTRUTIVO de um
REM   processo que morreu. Por isso a 1a coisa aqui e um `git reset --mixed`,
REM   que joga esse staging fora SEM TOCAR EM NENHUM ARQUIVO DO DISCO, e so
REM   depois um `git add` de caminhos EXPLICITOS.
REM   NUNCA use `git add -A` nesta arvore: o `git status` lista ~311 arquivos
REM   "modificados" que sao IDENTICOS ao HEAD (ruido de CRLF do OneDrive).
REM
REM O QUE VAI SUBIR:
REM   1) c65406d (ja commitado, sprint 10h) - o gate de render morto que prendeu
REM      o unico pagante ativo (valos87196) por 3h23min / 31 cliques.
REM   2) commit novo (sprints 13h + 16h) - entitlementTier + CTA das 6 paginas
REM      de SEO + oferta pos-video da coorte em trial + /llms.txt.
REM   3) commit novo (sprint 21h) - o download quebrado no celular.
REM
REM RISCO: baixo. Nenhuma migracao, nada de dinheiro / marca d'agua / preco /
REM   checkout / flag. O commit 3 mexe em UM arquivo e nao altera nenhum dos 3
REM   call sites nem a assinatura publica da funcao.
REM ============================================================================

cd /d "%~dp0.."
echo.
echo === Pasta: %CD%
echo.

echo === 1/8 Limpando locks zumbis (o OneDrive os recria; ignore erros) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock"

echo.
echo === 2/8 Jogando fora o staging envenenado (NAO toca em arquivo do disco) ===
git reset --mixed
if errorlevel 1 goto :erro

echo.
echo === 3/8 Stage do commit A (sprints 13h + 16h), por caminho EXPLICITO ===
REM Os caminhos com [colchetes] usam a magia :(literal) de proposito: colchete e
REM metacaractere de glob no pathspec do git.
git add "app/api/credits/route.ts"
git add -- ":(literal)app/(dashboard)/generate/GenerateClient.tsx"
git add "lib/freeTierOffer.ts"
git add "lib/kineoFacts.ts"
git add -- ":(literal)app/llms.txt/route.ts"
git add "app/cheapest-ai-shorts-maker/page.tsx"
git add "app/youtube-shorts-from-topic/page.tsx"
git add "app/free-ai-shorts/page.tsx"
git add -- ":(literal)app/free-ai-shorts/[niche]/page.tsx"
git add "app/alternatives/page.tsx"
git add -- ":(literal)app/alternatives/[competitor]/page.tsx"
git add "scripts/prove-trial-postvideo-offer-inert.mjs"
if errorlevel 1 goto :erro

echo.
echo === 4/8 O que vai no commit A (confira antes de seguir) ===
git diff --cached --stat

echo.
echo === 5/8 Commit A ===
git commit -m "TRIAL: O MOTOR ERRADO NA ENTRADA, E NENHUMA OFERTA NA SAIDA [KINEO-TRIAL-ENTITLEMENT-TIER-2026-08-07][KINEO-SEO-CTA-TRIAL-2026-08-07][KINEO-TRIAL-POSTVIDEO-OFFER-2026-08-07][KINEO-AEO-TRIAL-2026-08-07] -- 1) ENTRADA (13h): uma conta com 40 creditos e direitos de Creator recebia isCreator:false e caia no ramo do plano gratis, porque /api/credits deriva os flags de `plan` e maybeActivateReverseTrial de proposito NAO escreve `plan`. Medido: os 2 trials reais gastaram 1 de 40 creditos e todos os eventos trazem mode:'fast' ANTES de qualquer clique. Campo novo `entitlementTier` responde 'o que esta conta PODE usar agora'; isCreator NAO foi alargado de proposito (alimenta anyPaid, que destravaria motores que o servidor recusa com 402). Cinco guardas, cada uma paga por um defeito real. Prova: 640 combinacoes, 0 disparos com a flag OFF. 2) SAIDA (16h): a coorte em trial nao via oferta NENHUMA na tela do video pronto, o instante de maior intencao de compra. Medido: post_video_offer_viewed caiu de 19 para 5 com o MESMO volume de video_ready_viewed, e em 10 dias sao 193 impressoes para 1 clique. Caixa nova DEPOIS do botao de download (KINEO-DELIVER-FIRST), preco sempre de lib/checkoutPricing por moeda, zero literal, zero mencao a desconto. Revisao adversarial 2x derrubou 3 defeitos meus, nenhum visivel ao tsc, sendo o pior um contador falsificavel que diria '0 of 40 trial credits used' para quem acabou de queimar 20. 3) AQUISICAO: chatgpt.com e o 2o maior referral externo e tem a MAIOR ativacao medida (66,7%% contra 51,5%% do TAAFT), e o /llms.txt SERVIDO mandava usar OUTRA FERRAMENTA para 'video sem marca d'agua sem pagar' - falso desde a manha. Ordem invertida, gateada pela mesma flag. E o botao primario de 6 paginas de SEO ainda vendia o free tier ANTIGO enquanto a dobra da mesma pagina ja prometia o Creator trial. PROVAS: tsc --noEmit EXITCODE=0 e o tsc foi FALSIFICADO; 0 disparos em 1.458 combinacoes com a flag OFF; 6/6 literais OFF conferidos contra git show HEAD; EOL LF conferido no HEAD. Nenhuma migracao."
if errorlevel 1 goto :erro

echo.
echo === 6/8 Stage e commit B (sprint 21h - download no celular) ===
git add "lib/videoDownload.ts"
git add "docs/SPRINT-2026-08-07.md"
git add "docs/SPRINT-2026-08-06.md"
git add "docs/GATES-ABERTOS.md"
git add "docs/PROMPT-DIARIO.md"
git add "docs/ENGAGEMENT-LOG.md"
git add "scripts/62-PUSH.bat"
if errorlevel 1 goto :erro
git diff --cached --stat
git commit -m "O PLANO B DO DOWNLOAD TEM 0 DE 10 DE APROVEITAMENTO DESDE QUE EXISTE [KINEO-DOWNLOAD-MOBILE-RESCUE-2026-08-07] -- Medido no banco, todos os eventos desde 05/08: desktop 19 cliques / 19 downloads / 0 falhas / 1,8s. Mobile 49 cliques de 15 pessoas, 31 downloads, 10 video_download_failed (5 pessoas, 69,4s medios) e 10 video_download_popup_blocked (5 pessoas). Os dois 10 sao o MESMO 10: toda falha de blob terminou em popup barrado, e video_download_fallback_opened tem ZERO eventos na historia. O degrau 2 deste arquivo, o window.open, nao e um fallback degradado - e um fallback que nunca funcionou uma unica vez, porque roda depois de um await de 69 segundos e todo navegador mobile barra popup fora do gesto do usuario. Quem cai ali fica com NADA: sem arquivo, sem aba, sem erro na tela. Sao 33%% de quem tentou baixar no celular, 4 casos so nas ultimas 24h, e duas vitimas de hoje sao b61881d5 (trial, 2 popups barrados as 21:05 e 21:07) e e934461f, o unico cadastro do dia que chegou a clicar em COMPRAR. O comentario no topo do proprio arquivo ja prescrevia a correcao desde 04/08, condicionada ao numero: 'a correcao certa nao e sequestrar a aba, e mostrar na tela um link que o usuario toca'. O numero chegou. Painel com link tocavel (gesto real nunca e bloqueado), disparado aos 20s no mobile POR CIMA do blob que continua correndo (sucesso medio 12,1s, falha media 69,4s) e que SOME sozinho se os bytes chegarem, mais os caminhos de falha de rede e de popup barrado. 251 dos 259 videos moram no Storage do Supabase, que aceita ?download= e responde Content-Disposition: attachment - sem isso o iOS abriria um player e a pessoa continuaria sem arquivo; nos 8 do Backblaze o botao muda de 'save' para 'open', porque o atributo download e inerte cross-origin e o botao nao pode prometer o que nao entrega. TRES DECISOES DE NAO FAZER: o desktop nao muda (19/19 hoje, gatilho e device==mobile); o blob continua sendo o degrau 1 no mobile, porque trocar por navegacao direta consertaria 10 casos e arriscaria os 31 que funcionam; e video_downloaded NAO muda de semantica, continua so no degrau do blob, porque send-comeback50 e o cron send-video-ready usam esse evento para decidir quem NAO precisa de e-mail de resgate e infla-lo faria a empresa parar de procurar exatamente quem falhou. Os 3 call sites nao foram tocados. REVISAO ADVERSARIAL 2x, 5 defeitos MEUS, 3 deles CRIADOS pela primeira passada: (1) o painel e singleton mas o estado era por invocacao, e handleDownload da done screen nao tem guarda de in-flight - duplo-toque apagaria o painel do outro download e pintaria o video ERRADO (token de dono); (2) o painel cobria o StickyUpgradeBar e o MobileNav por 3 minutos, ou seja o resgate enterrava o CTA de compra; (3) DEFEITO CRIADO PELA 1a PASSADA: o reuso do no deixava um LINK MORTO na tela - slow virando unavailable trocava so o titulo e a caixa dizia 'This file is no longer available' com o botao 'Tap here to save your video' logo abaixo, apontando para a URL que o servidor acabara de negar; (4) DEFEITO CRIADO PELA 1a PASSADA: z-index 60 estava ABAIXO de 5 superficies reais (UpgradeModal 1000, TrialDowngradeModal 999, InstallAppBanner 70, EnablePushBanner 69) e o UpgradeModal abre NA MESMA TELA do botao de download, o que deixaria o resgate invisivel E inclicavel com o auto-hide de 180s correndo por baixo; (5) a guarda de dono cobria so o timer e deixava os 4 caminhos de falha sem dono, justamente os mais longevos. Mais 3 de metrica: campo renomeado para panel_already_open (era um `device` disfarcado), evento de escalada para nao ler conversao infinita em blob_failed, e botao de fechar de 12x20px para 44x44. SEGURANCA: filename vem do titulo que o usuario digitou - tudo por textContent e setAttribute, innerHTML nao aparece uma vez; safeDownloadHref recusa javascript:, data:, URL relativa e lixo; e ?download= NAO invalida assinatura porque as URLs sao publicas (getPublicUrl) e o JWT do Supabase assina o path, nunca a query. AQUISICAO: o penhasco de trafego de ontem estava metade errado. O site NAO parou de converter - a conversao do TAAFT SUBIU, 65/226=28,8%% em 31/07 para 3/8=37,5%% hoje. E o 'trafego nao-TAAFT que dobrou' nao existe: das 923 sessoes sem referrer em 4 dias, so 166 viram o campo da home e 39 digitaram algo - a sessao esta inflada ~5,6x e a empresa tem ~41 visitantes humanos/dia, nao 205. O que fica: em 31/07, 65 dos 68 cadastros do dia, 96%%, vieram de UMA fonte. Nao temos problema de conversao, temos problema de entrada. EOL LF conferido no HEAD. Nenhuma migracao, nada de dinheiro, marca d'agua, preco, checkout ou flag."
if errorlevel 1 goto :erro

echo.
echo === 7/8 Push para origin main ===
git push origin main
if errorlevel 1 goto :erro

echo.
echo === 8/8 OK ===
echo ============================================================
echo  PUSH OK. A Vercel comeca o deploy sozinha em alguns segundos.
echo  Confira em: https://vercel.com  (projeto "kineo")
echo ============================================================
git log --oneline -4
echo.
pause
exit /b 0

:erro
echo.
echo ############################################################
echo  FALHOU. Nada foi perdido - nenhum arquivo do disco foi
echo  alterado por este script. Copie a mensagem de erro acima
echo  e mande na conversa do Cowork.
echo ############################################################
echo.
pause
exit /b 1
