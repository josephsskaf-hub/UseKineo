# Studio Ads — desenho A: "vende amanhã" (20/25)

> Saída bruta de um agente do workflow `studio-ads-pesquisa-e-plano` (24/09/2026 ~05h-06h BRT), guardada porque "o que só existe no chat some". Fatos com URL foram lidos naquele momento; file:line conferidos em `C:\kineo-wt\analise-0923` na main ed065b91. Origem: desenhista A.

# A — "vende amanhã": a loja mínima que cobra em 25/09 com Mágico de Oz honesto (máquina faz roteiro, narração, legendas, música e mistura a mídia do cliente no Kineo 1; operador confere o 1º anúncio de cada empresa, aplica ajustes e cobre logo/cartão final se o injetor não passar na validação — e a tela diz isso).
# Studio Ads — Plano do dia 25/09/2026 (Ângulo A: vende amanhã)

Base: worktree `C:\kineo-wt\analise-0923` (só leitura). Todas as referências file:line foram conferidas hoje, salvo as marcadas "(leitor de código)".

---

## 1. O que é (voz de press release, 5 linhas)

> **Kineo lança o Studio Ads: a empresa sobe fotos, vídeo e logo, e sai com um anúncio vertical narrado, legendado e com música — no mesmo dia.**
> Sem câmera, sem editor, sem agência: o dono do negócio preenche um brief de 6 campos, escolhe um dos 8 modelos de anúncio (oferta relâmpago, vitrine em fotos, problema→solução, depoimento, antes→depois, história do fundador, 3 erros, contagem regressiva), ouve a voz antes de gastar e aprova o roteiro.
> A mídia da empresa é o prato principal — o Kineo só narra, legenda, monta e assina com o cartão final da marca. Nenhum rosto gerado, nenhum stock com marca d'água.
> O primeiro anúncio de cada empresa passa por um editor humano antes de ser entregue (em até 24 h), e a tela diz isso.
> Acesso pago único, sem assinatura escondida; o preço do plano da casa não muda.

(Fórmula honesta de "centenas de formatos" para copy futura: 8 modelos × 3 durações × idiomas — mas no dia 1 a página promete só o que roda: 8 modelos, 9:16, 15-40 s, 1 idioma por anúncio.)

---

## 2. Porta de entrada

**Página pública nova `/ads`** (isolada; NÃO liga o protótipo `/empresas`, congelado por `docs/DECISIONS.md:279`; não toca home, nav nem `/pricing` — grade congelada até 09/10, `DECISIONS.md:35`).

- Conteúdo: herói ("Your photos + your logo → a narrated vertical ad, today"), 8 cards de modelo com batidas em segundos, "o que você recebe" (lista literal), preço vindo do módulo puro (nunca cravado no JSX), FAQ honesto (o que um humano faz, o que não fazemos), CTA único → checkout.
- Segunda porta (já existe): o cartão `components/DfyOfferCard.tsx` no cockpit e no passo 2 ganha um **3º botão** "Do it yourself in Studio Ads" ao lado de Express US$35 / Pro US$75 — a regex `isDfyCandidate` (`lib/growth/dfyOffer.ts:133`) já sabe quem escreve pedido de anúncio.
- Terceira porta (grátis, 1 linha): `onboarding_goal=business` (`StudioClient.tsx:313`, `GenerateClient.tsx:1289`) passa a emitir link para `/ads` no cockpit em vez de só sessionStorage.
- Pós-pagamento: `/ads/new` (6 passos, ver §4). Sem acesso → `/ads` com o botão de compra; com acesso → `/ads/new`.

---

## 3. Modelo de acesso

**Recomendado para o dia 1: "Studio Ads Pass" — SKU one-time da casa, via checkout próprio (não Payment Link).**

Por quê não Payment Link: o webhook do DFY (`app/api/stripe/webhook/route.ts:840-956`) só grava `dfy_order_paid` e **não concede nada** — quem paga por plink continua `has_paid=false` e leva 402 no upload de footage (`app/api/footage/route.ts:183`, gate `treatAsPaid` de `lib/reverseTrial.ts:722-735`). Armadilha (a) do leitor de código.

Como fica:
- **Checkout:** `GET /api/stripe/checkout?pack=ads_pass` → novo `buildAdsPassAndRedirect(req)` no molde de `buildBulkPackAndRedirect` (`checkout/route.ts:3180`) e do dispatcher `packParam` (`:3393-3428`): `mode:'payment'`, `price_data` inline, `metadata.pack='ads_pass'`, `metadata.pack_credits=N`, idempotency one-time, `success_url=/ads/new?resume=<session>`. Login→checkout→resume já é o padrão dos packs.
- **Valor em centavos:** NÃO usar 290/490/590/900/1290/1490/1900/3500/4900/5990/7500/9900/10000/19900/29900/39900 (o webhook resolve DFY/legado por valor). Livres: 1200, 1990, 2900, 3900, 4990.
- **Webhook Path A** (`webhook/route.ts:1262`, UPDATE único em `:1429-1470`): ramo `pack==='ads_pass'` acrescenta `ads_access_at = now()` ao MESMO `profileUpdate` que já grava `video_credits` e `has_paid:true`. Fail-closed igual ao piloto Autopilot: se a coluna não existir (42703), o UPDATE falha, `RetryableEntitlementError`, Stripe reenvia — nunca cobra sem conceder. Emite `ads_access_granted` (server).
- **Migration antes de vender:** `migrations_pending/2026-09-25_studio_ads.sql` = `profiles.ads_access_at timestamptz` + tabela `ads_orders` (§4). Molde: `migrations_pending/2026-07-26_autopilot_pilot_plan_expiry.sql`.
- **Gate no servidor:** `hasAdsAccess(profile) = ads_access_at != null` (e, se o fundador quiser, `OR plan in ('basic','pro')` — decisão dele). Nunca `!isSubscriber` (memória: predicado largo negado falha aberta).
- **Invariantes:** o SKU entra em `checkPricingInvariants()` de `lib/checkoutPricing.ts`; margem calculada com US$0,55/60 s medido (não com `FAST_USD_PER_CREDIT=0.066`, que está velho).
- **O que reaproveita 100%:** login→checkout→resume, dedupe por `stripe_events`, `PROTECTED_EMAILS`, crédito universal (o render do anúncio é cobrado como Kineo 1 normal, 5 cr pago), portão de footage (has_paid abre 500 MB).

Opções de número (só para o fundador escolher; margens com custo direto A ≈ US$0,55/anúncio de 60 s ×2 renders):
| Opção | Preço | Inclui | Margem pior caso |
|---|---|---|---|
| Passe leve | US$19 (1990) | 60 cr ≈ 10 anúncios Kineo 1 | ~70% |
| Passe padrão | US$29 (2900) | 100 cr ≈ 20 anúncios | ~60-68% |
| Passe + humano | US$39 (3900) | 100 cr + QA humano em TODOS os anúncios de 7 dias | ~55% |
| Por anúncio | US$9 (990 — conferir colisão com 990 do Starter mensal: é subscription, não one-time; ainda assim preferir 1200) | 12 cr (2 renders + folga) | ~80% |

Duas faixas por PAÍS: não (V6 morreu, `lib/checkoutPricing.ts` bloco KINEO-PRICING-V6). Se quiser desconto regional: cupom PPP da Stripe.

---

## 4. Fluxo tela a tela (`/ads/new`) — automático × operador no dia 1

Estado do pedido vive em `ads_orders(id, user_id, status, brief jsonb, media jsonb, template, script, voice, video_id, qa_by, delivered_at, created_at)`. Status: `brief → media → script → queued → rendering → qa → delivered | revision | blocked`.

| # | Tela | Automático (máquina) | Operador (48 h) | Evento |
|---|---|---|---|---|
| 0 | `/ads` → checkout | página, checkout, webhook, e-mail 1 | — | `ads_page_viewed`, `ads_cta_clicked`, `ads_checkout_started`, `ads_access_granted` |
| 1 | **Brief** (6 campos): nome + o que vende · oferta/preço/prazo · endereço/telefone/link (CTA do último quadro) · idioma · tom (3 pílulas) · público em 1 linha | salva em `ads_orders.brief`; valida obrigatórios; sem URL→brief (fora) | lê briefs confusos na fila e corrige | `ads_brief_saved` {template?, lang} |
| 2 | **Mídia**: fotos (3-10), vídeo (0-3, ≤50 MB cada), logo (PNG/JPG, marcado como logo) | reaproveita `/api/footage` (`app/api/footage/route.ts:201-274`: signed URL → PUT direto → confirm); portão já abre porque `has_paid=true`; contador de cota (500 MB, `lib/userFootage.ts:12`); recusa medida (`footage_refused`, `:86`) | vídeo >50 MB: operador orienta pré-corte na ferramenta local do navegador (`lib/videoEditing`) ou pede outro arquivo; logo em SVG/WEBP/HEIC: operador converte | `ads_media_uploaded` {kind, bytes, is_logo}, `ads_media_refused` {reason} |
| 3 | **Modelo** (8 cards, §5) | grava `template`; mostra duração e quais entradas o modelo exige; bloqueia modelo sem mídia mínima | — | `ads_template_selected` {template} |
| 4 | **Roteiro**: gerado por `POST /api/ads/script` (rota NOVA no padrão de `app/api/diretor/suggest`, GPT-4o-mini, molde de batidas do modelo → texto verbatim com [cena n] e fala); editor livre; contador de segundos (régua clássica 3,1 pal/s); botão **"Ouvir a voz"** (TTS MiniMax 2.8 HD via rota `/api/audio` existente, ~US$0,05, 0 cr) | 3 ângulos de gancho? NÃO (fora). Um roteiro, editável | reescreve roteiro quando o cliente pede na revisão | `ads_script_generated` {words, seconds_est}, `ads_script_edited`, `ads_voice_previewed` {voice} |
| 5 | **Prévia** = storyboard ESTÁTICO: cena × mídia escolhida × fala × cartela; mapeamento cena→mídia por **id de arquivo** (não posicional — a UI atual manda `selectedFootage[sceneIdx]`, `GenerateClient.tsx:9846-9861`); cartão final mockado com o logo real | mostra custo em créditos e tempo ("~5 min de render + revisão humana do 1º anúncio em até 24 h") | — | `ads_preview_confirmed` {credits, scenes} |
| 6 | **Render**: `POST /api/ads/render` monta o payload de `generate-video-fast` (script verbatim, `brollScenes[i].userFootageUrl` só com prefixo `/user-footage/<user.id>/` — `generate-video-fast/route.ts:597,620-623`; clipe do cliente vence stock sem fallback `:1250-1256`; foto vira `image` com Ken Burns `lib/compose.ts:2329-2346`) + `lib/ads/endCard.ts` injeta logo (image element, canto) e cartão final (text+shape, 2-3 s) no JSON do Creatomate ANTES do submit em `app/api/compose/route.ts` (~:3055, leitor de código) — só quando `order_id` presente; sem tocar `lib/compose*` (trava 8.2) | status `qa` ao concluir; e-mail 2 só depois de `ads_qa_approved` | **QA humano do 1º anúncio de cada empresa** em `/admin/ads`: assiste, aprova ou re-roda com ajuste; se o injetor de cartão final REPROVAR no render de validação de 25/09, o dia 1 sai sem cartão automático e o operador aplica (Creatomate dashboard) — a tela diz "logo e cartão final conferidos por um editor" | `ads_render_requested` {video_id, credits}, `ads_render_served` / `ads_render_failed` {reason}, `ads_qa_approved` {by}, `ads_qa_rework` {reason} |
| 7 | **Entrega**: página do pedido com player (`/v/<id>` já existe; `videos.published_at` decide 404/200) + download + "pedir ajuste" (texto livre) | e-mail 2 "Your ad is ready"; pedido → `delivered` | ajuste = operador executa (re-render manual, 2 inclusos) | `ads_delivered`, `ads_revision_requested` {text_len}, `ads_download_clicked` |

O que o cliente vê como Oz honesto (texto fixo na tela 6/7): *"A human editor checks your first ad before delivery (within 24 h). Revisions: 2 included, done by the same editor."* Nunca "instant", nunca "AI does everything".

**Vídeo com áudio do cliente:** no dia 1 o clipe entra MUDO (`compose.ts:2346`, volume 0%). A tela avisa: "your video's original audio is replaced by narration". Modo "áudio original baixo + narração" fica para a semana (1 linha em compose = trava).

---

## 5. Modelos do dia 1 (8) → motores/blocos

Todos em **Kineo 1 + My footage + MiniMax 2.8 HD + Lyria + Creatomate** (5 cr pago, custo direto US$0,30-0,55, sem rótulo "Made with AI" na Meta porque a mídia é real). Molde de batidas alimenta `/api/ads/script`; Lyria ganha humor `commercial_upbeat`/`local_warm` (só prompt).

| Modelo | s | Entradas mínimas | Blocos |
|---|---|---|---|
| Oferta relâmpago | 15 | 3 fotos, logo, oferta+prazo | fotos Ken Burns · preço em cartela · cartão final |
| Vitrine em fotos | 20 | 6 fotos, logo, endereço/horário | slideshow narrado · cartão |
| Problema → Solução | 30 | 3 fotos (solução), logo, cidade | Pixabay só na cena da dor (`clipSources` já mistura) · mídia real na solução |
| Depoimento em cartão | 25 | 2-3 citações em texto, 3 fotos | cartela de citação · voz distinta por depoimento (MiniMax voice_id) |
| Antes → Depois | 18 | 2 pares de fotos, logo | ordem depois→antes→depois; wipe é enter_transition existente |
| História do fundador | 40 | 6 fotos, 3 linhas de origem | voz TTS; **voz clonada = operador roda `/api/avatar/voice` (10 cr) mediante atestado** |
| 3 erros | 40 | tema + 2 fotos | Pixabay ilustra · cartela "1./2./3." |
| Contagem regressiva | 15 | 3 fotos, data/vagas | número gigante · Lyria ritmo alto |

Fora do dia 1 (dizer na página, seção "coming"): fotos viram vídeo (Seedance i2v), apresentador (avatar), 1:1/16:9, variações de gancho, URL→brief.

---

## 6. Mídia do cliente

- **Upload:** rota `/api/footage` como está (mimes jpeg/png/mp4/mov/webm/áudio; 50 MB/arquivo `lib/userFootage.ts:16`; 500 MB/conta `:12`; bucket público `user-footage`, path `<user.id>/clip-<ts>.<ext>`). Nada de rota nova de upload.
- **Logo:** não existe `kind:'logo'` na tabela `user_footage`. Dia 1: o logo é um `kind:'image'` cujo id vai em `ads_orders.media.logo_footage_id`. Aceito PNG/JPG; a tela pede "PNG with transparent background, ≥512 px". SVG/WEBP/HEIC → mensagem clara + `ads_media_refused{unsupported_type}`; operador converte se o cliente mandar por e-mail.
- **Vídeo:** sem probe no servidor (sem ffmpeg): duração/codec são lidos NO NAVEGADOR (`<video>.duration`, dimensões) antes do PUT e gravados em `media[]`; MOV HEVC de iPhone precisa de 1 render de teste em 25/09 (risco §9). Clipe entra por cena com trim decidido no servidor (`compose.ts:2341`); >50 MB não sobe — tela sugere o pré-corte local.
- **Como entra no filme:** cena i recebe `userFootageUrl` do id escolhido no storyboard; fotos = image element com Ken Burns; stock só nas cenas marcadas "ilustração" pelo modelo.
- **Cartão final e logo:** `lib/ads/endCard.ts` (módulo puro, testável): dado o JSON do Creatomate + {logoUrl, business, cta, phone/address}, devolve JSON com image element (logo, ~14% do topo respeitando zona segura) e última cena de 2,5 s (shape + 3 textos). Validado com 1 render real na conta do fundador (5 cr) antes de ligar; interruptor `ADS_END_CARD=on|off`.
- **Zona segura 14/35/6:** só no cartão final e na cartela de preço (novos). Legendas do Kineo 1 continuam onde estão (mexer = trava). Fica para a semana.
- **Consentimento:** checkbox obrigatório no passo 2 ("I own or have rights to these files; people shown agreed") gravado em `brief.consent_at` + evento `ads_consent_given`. Rosto/voz clonada: atestado separado, só via operador no dia 1.
- **Retenção:** mídia fica no bucket do cliente (cota 500 MB); vídeo final copiado ao bucket `renders` como hoje (URL da fal/Creatomate expira).

---

## 7. Eventos e leitura de 14 dias

Todos via `trackEvent` (`lib/analytics.ts:465`) no cliente e insert server-side nos passos de servidor; `metadata.order_id` em TODOS a partir do passo 1 (o "carimbo do deploy" é `metadata ? 'order_id'`).

Lista fechada: `ads_page_viewed`, `ads_cta_clicked`, `ads_checkout_started`, `ads_access_granted` (server), `ads_brief_saved`, `ads_consent_given`, `ads_media_uploaded`, `ads_media_refused`, `ads_template_selected`, `ads_script_generated`, `ads_script_edited`, `ads_voice_previewed`, `ads_preview_confirmed`, `ads_render_requested`, `ads_render_served`, `ads_render_failed`, `ads_qa_approved`, `ads_qa_rework`, `ads_delivered`, `ads_email_sent{kind}`, `ads_revision_requested`, `ads_download_clicked`, `ads_dfy_upsell_clicked`.

Leitura (corte = `created_at > <deploy de 25/09>`, por PESSOA, não por evento):
1. Funil por pessoa: viu `/ads` → clicou → checkout → **pagou** (`payment_success` com `pack=ads_pass`, único evento que é dinheiro) → brief → mídia → render → entregue.
2. Tempo pedido→entrega (p50/p90) e **% dos pedidos que precisou de operador** (`ads_qa_rework` + `ads_revision_requested` / `ads_render_served`). Meta de saída do Oz: <30% em 14 dias.
3. Custo real: soma de créditos debitados por `order_id` × US$/cr vs preço do passe; anúncios por passe (se >8 por pessoa, o passe está barato).
4. Recusas de mídia por motivo (`file_too_large`, `unsupported_type`) — define se o pré-corte local sobe de prioridade.
5. Cliques no e-mail 2 e downloads (a entrega foi vista?).
6. Comparação com o balcão: `dfy_card_clicked` por degrau antes/depois do 3º botão (canibalizou ou somou?).
Critério de 48 h (padrão da casa): ≥3 passes pagos e ≥1 anúncio entregue sem rework → mantém e abre semana 2; 0 pagantes com ≥50 visitas em `/ads` → preço/copy, não infra.

---

## 8. Guardiões (scripts/test-ads-*.mjs, estilo `readFileSync` + regex — alias `@/` não roda; `check(nome, condição)` na ordem certa)

1. `test-ads-pass-sku.mjs`: valor do SKU não está na lista ocupada; `ads_pass` aparece em `checkPricingInvariants`; preço por crédito ≥ piso do Creator (US$0,133).
2. `test-ads-webhook-fail-closed.mjs`: no ramo `ads_pass`, `ads_access_at` e `has_paid` estão no MESMO objeto `profileUpdate`; existe `RetryableEntitlementError` no erro; `ads_access_granted` só depois do UPDATE.
3. `test-ads-gate.mjs`: `hasAdsAccess` exige `ads_access_at` provado (nunca `!` de predicado largo); `/api/ads/*` chama o gate antes de qualquer escrita.
4. `test-ads-footage-prefix.mjs`: `/api/ads/render` só aceita URLs com `/user-footage/${user.id}/`; mapeamento cena→mídia por id (grep proíbe `selectedFootage[sceneIdx]` na tela nova).
5. `test-ads-endcard.mjs`: injetor não remove nem reordena tracks 2/5/8; adiciona ≤1 image + 1 composition; recusa logo que não seja `.png|.jpg|.jpeg`; interruptor `off` devolve JSON idêntico (mutante: trocar condição por `true` tem de ficar vermelho).
6. `test-ads-copy-honesta.mjs`: `/ads` e e-mails não contêm "hundreds of formats", "avatar", "1:1", "16:9", "instant", "no human"; preço vem do módulo (grep proíbe `$29` literal no JSX).
7. `test-ads-events.mjs`: cada nome da lista do §7 existe em ≥1 arquivo de código (não só no doc); `order_id` presente em todo `trackEvent('ads_`.
8. `test-ads-email-after-qa.mjs`: o envio do e-mail 2 está condicionado a `status==='qa_approved'|'delivered'`; usa `claimEmailSlot`/`recordEmailSend` (`lib/email/quota.ts:134,194`) — nunca envia fora do teto diário.
9. `test-ads-migration-first.mjs`: o webhook referencia `ads_access_at` E existe `migrations_pending/2026-09-25_studio_ads.sql` com a coluna; nome exato igual nos dois lados.
10. Processo: `tsc` na worktree com junction de `node_modules`; suíte inteira (~4 min) antes de `bash scripts/enfileirar.sh`; sonda pós-deploy de `/ads` e `/api/ads/orders` com controle 404 e UA identificável.

---

## 9. Riscos e o que fica FORA

**Riscos (ver lista estruturada)** — os cinco que podem derrubar o dia: migration não aplicada antes da 1ª venda (fail-closed segura o dinheiro, mas o cliente pagou e espera); MOV HEVC do iPhone não montar no Creatomate; injetor de cartão final reprovar (Oz cobre); Codex e Claude tocarem o mesmo arquivo (`DfyOfferCard.tsx` é do Claude em 1 linha, o resto é do Codex); operador não ter ninguém de plantão nas 48 h (fila `/admin/ads` sem dono = promessa quebrada, caso Rick).

**FORA do dia 1 (escrito na página como "coming", não prometido):**
- URL→brief automático; 3 ângulos de gancho; 3 cortes (30/15/6 s) automáticos.
- Fotos→vídeo (Seedance/Kling i2v), produto real em cena gerada (Nano Banana /edit), apresentador (Kling Avatar/OmniHuman), lipsync do vídeo real.
- Voz clonada self-serve (operador faz sob atestado); áudio original do cliente sob a narração; ducking; zona segura nas legendas.
- 1:1 e 16:9; múltiplos idiomas no mesmo pedido; multi-marca.
- Página `/empresas`; mudança em home/nav/pricing; plano mensal "Business"; preço por país.
- Edição por instrução automática ("cena 2 mais curta" = operador no dia 1); publicação/agendamento em Meta/TikTok.
- Painel de QA com frames/thumbnails (sem ffmpeg); validação de codec no servidor.

**Pistas:** Claude = migration, módulo puro, checkout, webhook, `/api/ads/*`, injetor, gate, e-mails, eventos, guardiões, enfileirar. Codex = `/ads`, `/ads/new` (6 passos), `/admin/ads` visual, templates de e-mail HTML, HTML antes/depois (AGENTS.md §8). Claude cria os componentes vazios com 1 linha e os contratos de props às 08h para o Codex não esperar.

**Decisão que vira arquivo no mesmo dia:** `docs/STUDIO-ADS-DIA-1-2026-09-25.md` com nome, preço escolhido, SKU, eventos e o que ficou fora.

## day_schedule
25/09/2026 (quinta), blocos de 2 h, duas pistas em paralelo. Ponto de sincronia a cada bloco (5 min): contrato de props/rotas.

08-10 | CLAUDE: worktree limpa sobre origin/main + junction node_modules + tsc verde na base; migration `2026-09-25_studio_ads.sql` (profiles.ads_access_at + tabela ads_orders); `lib/ads/offer.ts` (SKU, 8 modelos com batidas, copy, hasAdsAccess) e `lib/ads/events.ts` (lista fechada); componentes vazios + contratos de props para o Codex. | CODEX: `/ads` pública (herói, 8 cards, "o que você recebe", FAQ honesto, CTA → `/api/stripe/checkout?pack=ads_pass`), mobile 16 px, preço lido do módulo.

10-12 | CLAUDE: `buildAdsPassAndRedirect` no checkout (molde bulk :3180 + dispatcher :3393) + ramo `ads_pass` no Path A do webhook (ads_access_at + has_paid + créditos no mesmo UPDATE, fail-closed, evento ads_access_granted) + `checkPricingInvariants`; guardiões 1, 2, 9. | CODEX: `/ads/new` passo 1 Brief (6 campos, validação, salvar rascunho) e passo 2 Mídia (drag&drop sobre `/api/footage`, marcar logo, leitura de duração/dimensão no navegador, contador de cota, mensagens de 50 MB / tipo não aceito, checkbox de consentimento).

12-14 | CLAUDE: `/api/ads/orders` (GET/POST/PATCH com gate) + `/api/ads/script` (molde de batidas → roteiro verbatim, padrão /api/diretor/suggest; sem tocar analyze-idea/generate-script) + preview de voz reaproveitando `/api/audio`; guardiões 3, 7. | CODEX: passo 3 Modelo (8 cards, bloqueio por mídia mínima) e passo 4 Roteiro (editor, contador de segundos 3,1 pal/s, botão "Ouvir a voz", seletor de voz).

14-16 | CLAUDE: `/api/ads/render` (payload do generate-video-fast com brollScenes[].userFootageUrl por id de mídia, prefixo do próprio user, débito normal de 5 cr) + `lib/ads/endCard.ts` (injetor de logo + cartão final) chamado antes do submit do Creatomate só com order_id; render de validação com 5 cr na conta do fundador (foto + logo + cartão); guardiões 4, 5. Se o cartão reprovar: interruptor off, Oz assume. | CODEX: passo 5 Prévia (storyboard estático cena × mídia × fala, cartão final com logo real, custo e tempo honesto) e passo 6 Status (na fila / renderizando / revisão humana em até 24 h / pronto) + tela de entrega (player, download, "pedir ajuste").

16-18 | CLAUDE: `/admin/ads` rota (fila por status, aprovar/rework/entregar, +créditos via botão existente) + e-mails 1 ("Studio Ads is open") e 2 ("Your ad is ready", só após ads_qa_approved) com claimEmailSlot/recordEmailSend; 3º botão no DfyOfferCard (1 linha); guardiões 6, 8. | CODEX: `/admin/ads` visual (lista, filtros, botões) + 2 templates HTML de e-mail + estados vazios/erro (402, 50 MB, tipo, sem acesso).

18-20 | CLAUDE: tsc + suíte inteira (~4 min) + todos os guardiões verdes; `bash scripts/enfileirar.sh` (fetch antes; nunca branch -f); sonda de bundle/rotas preparada; avisar o fundador "hora de clicar" com o HTML antes/depois anexo. | CODEX: HTML estático antes/depois (AGENTS.md §8) desktop + mobile de `/ads`, `/ads/new` passos 1-6, `/admin/ads`; varredura de copy (sem "hundreds", "avatar", "instant"); entrega ao Claude para o pacote.

20-22 | CLAUDE: pós-deploy: sonda `/ads` e `/api/ads/orders` com controle 404; 1 pedido ponta a ponta com a conta do fundador (brief → mídia → roteiro → render → QA → e-mail 2); leitura dos primeiros eventos por order_id; `docs/STUDIO-ADS-DIA-1-2026-09-25.md` com decisões e o que ficou fora; plantão de QA definido para as 48 h. | CODEX: correções do teste ponta a ponta (copy, estados, mobile); se sobrar tempo, cartela de preço dentro da zona segura no cartão final.

Fora do horário: nenhum render pago além dos 2-3 de validação (Kineo 1, 5 cr cada); nenhum e-mail para cliente real antes do "vai" do fundador.

## decisions
- NOME: 'Studio Ads' (recomendado, casa com /studio e o tier Studio), 'Kineo Ads' ou 'Kineo for Business' — define rota de e-mail e título da página.
- MODELO DE ACESSO E PREÇO (só opções, margens no §3): passe único US$19/60cr · US$29/100cr · US$39/100cr com QA humano em todos os anúncios por 7 dias · ou por anúncio US$9-12. Recomendação técnica: passe único, porque reaproveita o Path A e não toca a grade congelada até 09/10.
- QUEM MAIS TEM ACESSO: assinantes Creator/Studio entram de graça no Studio Ads (hasAdsAccess = ads_access_at OR plan in basic/pro) ou só quem compra o passe?
- PROMESSA DE PRAZO NA TELA: 'human check within 24 h' (exige plantão de QA nas 48 h — quem? você ou eu por /admin/ads) ou 'within 48 h' (mais folga, menos conversão).
- CONSENTIMENTO DE ROSTO E VOZ: texto do atestado no passo 2 (mídia com terceiros) e se a voz clonada do dono entra no dia 1 via operador (10 cr, atestado separado) ou fica totalmente fora.
- CARTÃO FINAL AUTOMÁTICO: se o render de validação das 14-16h reprovar o injetor (logo/cartão), aceita sair no dia 1 com o operador aplicando à mão (Oz) ou segura o lançamento até o injetor passar?
- TERCEIRO BOTÃO NO CARTÃO DFY: Express US$35 / Pro US$75 continuam visíveis ao lado do self-serve (recomendado: sim, como 'quer que a gente faça?') ou o self-serve substitui o Express?
- IDIOMA DA PÁGINA /ads: só inglês (padrão da casa) ou EN + PT-BR desde o dia 1 (11 pedidos reais: 5 Índia, 1 Nigéria, 5 EUA/EU/Jordânia — inglês cobre todos).
- COMPRA DE TESTE REAL: você faz 1 checkout real do passe às ~20h para provar webhook → acesso → e-mail (estorno depois pela Stripe) ou basta o teste com conta interna?
- CLIQUE DE PUBLICAÇÃO: SUBIR-SITE.bat às ~19h30 depois do pacote; e o 'vai' nominal caso algum ajuste mínimo caia dentro da trava 8.2 (hoje o plano evita todos os arquivos dela).

## risks
- Migration não aplicada antes da 1ª venda: o Path A é fail-closed (UPDATE inteiro falha, Stripe reenvia), então ninguém ganha acesso sem coluna — mas o cliente já pagou e vê erro até a migration rodar. Mitigação: aplicar a migration no bloco 08-10 e guardião 9.
- MOV HEVC/HDR de iPhone não montar no Creatomate (nunca testado; sem probe no servidor). Mitigação: 1 render de validação com MOV real às 14-16h; se falhar, a tela pede MP4 e o operador converte no dia 1.
- Injetor de logo/cartão final (JSON do Creatomate) quebrar o render ou sair fora da zona segura. Mitigação: interruptor ADS_END_CARD, render de validação, guardião 5; Oz assume se reprovar.
- Colisão de valor no webhook: SKU novo com centavos já usados (900/1900/4900/3500/7500) seria lido como legado/bulk/DFY. Mitigação: valores livres (1200/1990/2900/3900/4990) + guardião 1.
- Plantão de QA sem dono: 'human check within 24 h' sem alguém olhando /admin/ads repete o caso Rick (promessa sem execução). Mitigação: definir o plantão antes de publicar; teto de pedidos abertos (como DFY_MAX_OPEN_ORDERS=3) fecha a loja com aviso quando a fila passa de N.
- Duas pistas tocando o mesmo arquivo (DfyOfferCard, StudioClient) e âncora por prefixo órfã: conflito real no enfileirar. Mitigação: Claude só toca 1 linha no DfyOfferCard e cria os componentes vazios cedo; Codex não entra em app/api nem lib/.
- Copy que promete o que não roda ('hundreds of formats', 'AI avatar', 'instant') vaza do press release para a página. Mitigação: guardião 6 e revisão de copy no bloco 18-20.
- Cliente entra com 0 mídia utilizável (só logo, ou fotos de 200 px): o Kineo 1 cai em stock e o anúncio parece o Short de curiosidades. Mitigação: mídia mínima por modelo bloqueia o passo 3; operador contata quando a fila mostra pedido só com stock.
- Vídeo do cliente entra mudo (volume 0%) e o dono esperava o depoimento falado. Mitigação: aviso explícito no passo 2; modo 'áudio original baixo' fica para a semana (trava 8.2).
- Teto diário do Creatomate (~20% da cota mensal em 24 h) e teto de e-mail (lib/email/quota) num dia de lote. Mitigação: renders de anúncio são 15-40 s (10-25 cr Creatomate); e-mails usam claimEmailSlot; monitorar supplier-health.
- Trial ativo é treatAsPaid e já sobe footage sem pagar: alguém pode montar o pedido pelo /studio/create sem o passe. Mitigação: /api/ads/* exige hasAdsAccess; o caminho antigo continua sendo o Short normal (não é vazamento de dinheiro, é de posicionamento).
- Medição: contar eventos em vez de pessoas e cortar por relógio em vez de por order_id inventa funil. Mitigação: order_id em todo evento; leitura por pessoa com corte no deploy; só payment_success é venda.
