# Studio Ads — Plano fundido para 25/09/2026

> Síntese dos planos A (vende amanhã), B (produto real só com blocos existentes) e C (diferenciação) + pesquisa de mercado/preço/taxonomia/técnica/código. Placar: A 20/25 · B 19/25 · C 14/25. Toda referência `arquivo:linha` foi lida hoje em `C:\kineo-wt\analise-0923` (nada modificado). Escrito em 24/09 ~06h BRT para o fundador ler antes do dia de construção (25/09). Pesquisa completa em `docs/studio-ads/`.

## 0. Por que isto existe e qual é o tamanho da porta (fatos da casa, 24/09)

- **Pedido do fundador (24/09 ~05h BRT, áudio transcrito):** "quando ele faz algum pedido com algumas palavras para fazer um ad, rebate ali os nossos dois preços para baixo, e daí a gente faz manualmente. Mas para amanhã a gente consegue fazer um sistema para empresas, para ads — Studio Ads seria perfeito — para a pessoa que já entra ali e tem que pagar esse valor para ter acesso ao Studio Ads, e daí cria o ads para ela. Estuda, olha tudo que você pode pegar da internet, coisas boas, para a pessoa fazer de uma forma fácil: colocando imagens, trazendo o vídeo dela e a gente só narrando; centenas de coisas que dá para fazer para a pessoa fazer propaganda. Fica praticamente uma empresa de marketing."
- **Demanda que já bate na porta (banco, 24/09):** nos últimos 30 dias, **7 empresas** escreveram pedido de anúncio no Studio (regex estrita do balcão), entre **411 pessoas** que fizeram vídeo — 1,7%. Em 90 dias, 11 empresas e 14 pedidos; 1 pagou (BR). O balcão manual (Express US$35 / Pro US$75) cobre essas 7/mês. **O Studio Ads não se paga com o tráfego de hoje: precisa da própria porta** — página `/ads` indexável, entrada no `llms.txt` e no `kineoFacts` (o ChatGPT é a origem de metade dos cadastros e de 6 dos 7 últimos pagantes), e a promessa pública corrigida (`app/ai-shorts-for-agencies/page.tsx:208` diz hoje que a Kineo NÃO serve para "source-footage editing").
- **O que a pesquisa de mercado mudou no plano:** o gesto de entrada que converte é "sua marca já na tela antes de pagar" (Waymark/AdCreative: rascunho grátis, cobra no download); a reclamação nº 1 do setor é cobrança (trial que vira anual, crédito que expira), não qualidade; o Icon.com (US$12M de domínio) abandonou a IA por prometer o que não entregava. Por isso o dia 1 é passe único sem assinatura escondida, 8 modelos honestos e copy sem "centenas de formatos".
- **Onde mora a trava 8.2:** lib/compose*, lib/hollywood/, lib/cinematic/, lib/broll/, lib/lyriaMusic, lib/narrationFit, app/api/analyze-idea, app/api/generate-script, app/api/generate-video-*. O plano abaixo vive FORA disso (rota nova de roteiro no padrão `lib/diretor`, cartão final como PNG entrando como última cena, payload montado em `/api/ads/render`). O que pede "vai" nominal está na decisão 7.

---

## 1. Press release (o que a empresa vê e sente)

1. **Kineo lança o Studio Ads: a empresa sobe as próprias fotos, o próprio vídeo e o logo, e sai com um anúncio vertical narrado, legendado, com música original e cartão final da marca — hoje.**
2. Sem câmera, sem editor, sem agência: o dono preenche um brief de 6 campos, escolhe um dos 8 modelos (oferta relâmpago, vitrine em fotos, problema→solução, depoimento, antes→depois, história do fundador, 3 erros, contagem regressiva), ouve a voz antes de gastar e aprova o roteiro.
3. A mídia da empresa é o prato principal: a IA entra como diretor (roteiro no formato gancho→prova→oferta→chamada), narra em 40+ idiomas e monta tudo. Nenhum ator sintético, nenhum stock com marca d'água, nenhuma música licenciada (Lyria original é liberada em Reels Ads).
4. O anúncio sai da máquina em ~5 minutos. Um editor humano revisa o primeiro anúncio de cada empresa em até 24 h e manda versão corrigida se algo estiver errado — a tela diz isso.
5. Acesso por passe único, sem assinatura escondida, sem crédito que expira. Os 3 planos da casa não mudam.
6. Quem quer alguém fazendo por ele continua com o balcão Express US$35 / Pro US$75.
7. O que o press release NÃO diz porque não roda no dia 1: "centenas de formatos", apresentador, voz clonada no fluxo, 1:1/16:9, anúncio de 15 s.
8. Combinatória honesta para a copy: 8 modelos × 2 durações × 3 ganchos × 40 idiomas = "dezenas de versões de um brief".

---

## 2. O que a casa já tem (blocos com file:line)

| Bloco | Onde | Estado |
|---|---|---|
| Upload de mídia do cliente (signed URL → PUT → confirm) | `app/api/footage/route.ts:201-274`; mimes jpeg/png/mp4/mov/webm/áudio `lib/userFootage.ts:21-24`; 50 MB/arquivo (`:16`), 500 MB/conta (`:12`) | No ar. **Portão: 402 sem `treatAsPaid`** (`footage/route.ts:183` → `lib/reverseTrial.ts:722-735`) |
| Clipe/foto do cliente entra por cena e vence stock sem fallback | `generate-video-fast/route.ts:597` (prefixo `user-footage/<user.id>/`), `:620-623` (aceita `brollScenes[].userFootageUrl`), `:1250-1256` | No ar |
| Foto = elemento `image` com Ken Burns; vídeo = `video` cover, loop, **volume 0%** | `lib/compose.ts:2329-2346` | No ar (trava 8.2) |
| Piso de duração do roteiro próprio | `generate-video-fast/route.ts:948` `floorSeconds: 35` | **15-20 s não sai no dia 1** |
| Checkout one-time (mode payment, `metadata.pack` + `pack_credits`, resume login↔checkout) | `app/api/stripe/checkout/route.ts:3180` `buildBulkPackAndRedirect`, `:3248-3253` trava `resumed=1`, dispatcher `packParam` `:3393` | Molde pronto |
| Webhook Path A: crédito + `has_paid:true` no MESMO UPDATE; molde fail-closed do piloto Autopilot (`plan_expires_at`, erro 42703 → `RetryableEntitlementError`) | `app/api/stripe/webhook/route.ts:1262`, UPDATE em `:1429-1470` | Molde pronto |
| Webhook do DFY grava só `dfy_order_paid` — **não concede nada** | `webhook/route.ts:840-956` | Por isso Payment Link não serve de acesso |
| Invariantes de preço | `lib/checkoutPricing.ts:762` `checkPricingInvariants()`; `FAST_USD_PER_CREDIT = 0.066` em `:324` (velho; medido US$0,55/60 s) | Margem calcular à mão |
| Balcão manual (Express/Pro), regex de intenção de anúncio, teto de pedidos | `lib/growth/dfyOffer.ts:88-90` (`DFY_OFFER_VERSION`, `DFY_MAX_OPEN_ORDERS = 3`), `:133-137` `isDfyCandidate`; cartão em `components/DfyOfferCard.tsx`, montado em `StudioClient.tsx:51,731` | Ligado 24/09 ~04h |
| Montagem do JSON do Creatomate e submit | `app/api/compose/route.ts:3055` `buildCreatomateSource({`; submit via `submitCreatomateRender` (lib/compose, trava) em `:348/:360`; POST real em `app/api/render/route.ts:328` | Ponto de injeção fora da trava = entre :3055 e o submit |
| Receita de logo anotada (nunca ligada) | `lib/compose.ts:2750-2751` (`y:'6%'` — cai DENTRO da banda de 14% da UI de Reels) | Só comentário |
| Voz própria / voz clonada no compose | `app/api/compose/route.ts:434-437` (`user_voiceover_url`, `use_cloned_voice`); clone `/api/avatar/voice`, 10 cr (`lib/credits/engineCost.ts:204`) | No ar — a rota fast não trata voz, o compose trata |
| Avatar de foto (Kling Avatar v2 Std) | `lib/avatar/veed.ts:46`; 70 cr (`generate-avatar/route.ts:244`); **verbatim aceita 3-90 s** (`:246-253`), o lock de 45 s (`:80`) só vale para script expandido | No ar, sem seletor no /studio |
| i2v Seedance 1.5 já wired | `generate-video-cinematic/route.ts:263`; Kontext em `lib/avatar/scene.ts:12` | Semana 2 |
| Consentimento de rosto (texto pronto, não grava evento) | `AvatarStudioClient.tsx:1360` | Reaproveitar texto, gravar evento |
| Mapeamento de footage no GenerateClient é POSICIONAL | `GenerateClient.tsx:9846,9861` `selectedFootage[sceneIdx]`; arquivo com 22.656 linhas | **Não tocar**: o payload nasce no servidor |
| Eventos, cota de e-mail | `lib/analytics.ts:465` `trackEvent`; `lib/email/quota.ts:134,194` `claimEmailSlot/recordEmailSend` | No ar |
| Congelamentos | preços dos 3 planos até 09/10 (`docs/DECISIONS.md:35`); `/empresas` protótipo congelado (`:279`); trava 8.2 exige "vai" nominal (`:19,:35`) | Respeitar |

---

## 3. O produto do dia 1

### 3.1 Porta
- **`/ads` pública** (nova, isolada; não toca home, nav, `/pricing`, `/empresas`): herói ("Your photos + your logo → a narrated vertical ad, today"), 8 cards de modelo com batidas em segundos, "o que você recebe" (lista literal), preço lido de `lib/ads/offer.ts` (nunca cravado no JSX), FAQ honesto (o que um humano faz; o que não fazemos), 1 CTA → checkout.
- **3º botão no cartão DFY** (`DfyOfferCard.tsx`, 1 linha do Claude): "Do it yourself in Studio Ads" ao lado de Express/Pro. A regex `isDfyCandidate` já sabe quem escreve pedido de anúncio.
- **`onboarding_goal=business`** (`StudioClient.tsx:313`, `GenerateClient.tsx:1289`) passa a mostrar link para `/ads` no cockpit.
- **Porta do ChatGPT (Claude, bloco 16-18):** seção "Studio Ads" no `app/llms.txt/route.ts` e fato em `lib/kineoFacts.ts` (o que é, o que exige, o que não faz, preço lido do módulo), e a frase de `app/ai-shorts-for-agencies/page.tsx:208` ("not for source-footage editing") reescrita para apontar o Studio Ads. Sem isso a loja abre sem rua.
- Sem acesso → `/ads` com botão de compra; com acesso → `/ads/new`.

### 3.2 Acesso
- **SKU one-time `?pack=ads_pass`** → `buildAdsPassAndRedirect(req)` (cópia do bulk: `mode:'payment'`, `price_data` inline, `metadata.pack='ads_pass'`, `metadata.pack_credits=N`, `success_url=/ads/new?resume=<session>`). Centavos **livres**: 1200 / 1990 / 2900 / 3900 (ocupados: 290/490/590/900/1290/1490/1900/3500/4900/5990/7500/9900/10000/19900/29900/39900).
- **Migration antes de vender** (`migrations_pending/2026-09-25_studio_ads.sql`, molde `2026-07-26_autopilot_pilot_plan_expiry.sql`): `profiles.ads_access_until timestamptz null` + tabela `ads_orders(id, user_id, status, brief jsonb, media jsonb, template, script text, voice, video_id, consent_at, qa_by, qa_at, delivered_at, created_at, updated_at)`.
- **Webhook Path A**: ramo `pack==='ads_pass'` acrescenta `ads_access_until = now()+365d` ao MESMO `profileUpdate` que já grava `video_credits` e `has_paid:true`. Coluna ausente (42703) → UPDATE inteiro falha → `RetryableEntitlementError` → Stripe reenvia. Nunca cobra sem conceder. Evento servidor `ads_access_granted`.
- **Gate** `hasAdsAccess(profile, now)` em `lib/ads/access.ts` = `ads_access_until > now` OR (decisão 3) `isPayingProfile(profile)`. Nunca `!isSubscriber` (predicado largo negado falha aberta). Contas internas passam sempre (canário).
- **Cobrança do render**: crédito universal, cobrador normal (Kineo 1 = 3 cr/35 s · 5 cr/60 s). Nenhuma segunda régua.
- **Interruptor** `ADS_PASS_LIVE=false` esconde botão E rota até o fundador dar o preço. Env nova só vale em deploy novo — subir com a env já definida na Vercel.

### 3.3 Fluxo tela a tela (`/ads/new`) — estado vive em `ads_orders`, nunca em sessionStorage
| # | Tela | Máquina | Evento |
|---|---|---|---|
| 1 | **Brief** (6 campos): nome + o que vende · oferta/preço/prazo · chamada (ligar/WhatsApp/visitar/comprar) + contato · idioma · tom (3 pílulas) · público em 1 linha | valida obrigatórios; salva rascunho | `ads_brief_saved {order_id, lang}` |
| 2 | **Mídia**: logo PNG/JPG (slot próprio) · 3-10 fotos · 0-3 vídeos ≤50 MB · checkbox de consentimento obrigatório | `/api/footage` como está; logo = `kind:'image'` com id em `media.logo_footage_id`; duração/dimensão lidas NO NAVEGADOR antes do PUT; contador de cota; recusa medida (`footage_refused`) | `ads_media_uploaded {kind, bytes, is_logo}`, `ads_media_refused {reason}`, `ads_consent_given` |
| 3 | **Modelo** (8 cards): duração 35 ou 60 s, entradas mínimas, custo em cr | bloqueia modelo sem mídia mínima | `ads_template_selected {template, seconds}` |
| 4 | **Roteiro**: `POST /api/ads/script` (GPT-4o-mini, padrão `app/api/diretor/suggest`, molde de batidas → prosa verbatim com [cena n]; 3 ângulos de gancho: pergunta / número / resultado-primeiro); editor livre; contador (3,1 pal/s: 35 s = 100-115 · 60 s = 175-195); botão **"Ouvir a voz"** (`/api/audio`, MiniMax 2.8 HD, ≤160 chars, 3 por pedido, 0 cr) | nunca inventa número: placeholder sem dado vira linha cortada | `ads_script_served {angles:3, words}`, `ads_script_chosen {angle, edited}`, `ads_voice_previewed {voice}` |
| 5 | **Storyboard**: cena × mídia escolhida (por id, não posição) × fala; **cartão final desenhado em `<canvas>`** com logo + nome + oferta + CTA + contato dentro da zona segura 14/35/6 → PNG → `/api/footage` (ideia do plano C: fidelidade 100%, zero trava); custo e tempo honestos | | `ads_preview_confirmed {credits, scenes, user_media_scenes, stock_scenes}`, `ads_card_rendered` |
| 6 | **Render**: `POST /api/ads/render` monta NO SERVIDOR o payload de `generate-video-fast` (`script_mode:'verbatim'`, `duration 35|60`, `brollScenes[i].userFootageUrl` por id com prefixo do próprio user, PNG do cartão pinado à cena de maior número) e segue para `/api/compose` com `order_id`; cobrador normal; status `rendering → delivered` | O GenerateClient NÃO é tocado | `ads_render_requested {video_id, credits}`, `ads_render_served` (no settle) / `ads_render_failed {reason}` |
| 7 | **Entrega**: player (`/v/<id>`) + download + "pedir ajuste" (texto) + "outra versão (novo gancho)" + "quer revisão humana? Express US$35" | e-mail "Your ad is ready" (claimEmailSlot); pedido entra na fila de revisão pós-entrega | `ads_delivered`, `ads_download_clicked`, `ads_revision_requested {text_len}`, `ads_email_sent {kind}` |

### 3.4 Os 8 modelos (todos Kineo 1 + My footage + MiniMax 2.8 HD + Lyria + Creatomate; 3-5 cr; custo direto US$0,30-0,55)
| Modelo | s | Entradas mínimas | Observação de bloco |
|---|---|---|---|
| Oferta relâmpago | 35 | 3 fotos, logo, oferta+prazo | fotos Ken Burns; oferta falada no gancho; cartão fecha |
| Vitrine em fotos | 35 | 6 fotos, logo, endereço/horário | zero stock |
| Problema → Solução | 35 | 3 fotos ou 1 vídeo, logo, contato | Pixabay só na cena da dor; mídia real na solução |
| Depoimento em cartão | 35 | 2-3 citações, 3 fotos | 1 voz (voz por cena não existe no compose) |
| Antes → Depois | 35 | 2 pares de fotos, logo | ordem depois→antes→depois; corte seco + crossfade existente |
| História do fundador | 60 | 6 fotos, 3 linhas de origem | TTS; voz clonada = semana 2 |
| 3 erros | 60 | tema + 2 fotos | Pixabay ilustra; ideal clínica/advocacia/contabilidade |
| Contagem regressiva | 35 | 3 fotos, data/vagas reais | humor Lyria existente (`hustle`) |

Moldes vivem em `lib/ads/models.ts` (puro): batidas em segundos, entradas exigidas, CTA de exemplo. Os de 15-20 s da taxonomia nascem como 35 s até o "vai" na trava (decisão 7).

### 3.5 Mídia do cliente
- Aceita jpeg/png/mp4/mov/webm; **não** webp/heic/svg/gif → tela pede "logo em PNG ≥512 px; fotos do iPhone exportadas em JPG" e grava `ads_media_refused {unsupported_type}`.
- Vídeo entra **mudo** e cortado até ~4,5 s por cena (`compose.ts:2341-2346`) — a tela avisa: "your video's original audio is replaced by narration". Vídeo com fala do dono = pedido Express.
- >50 MB não sobe (4K de 90 s estoura) — tela sugere "vídeo curto, do rolo em 'mais compatível'"; pré-corte local (`lib/videoEditing/browserEditor.ts`) fica para a semana.
- Cenas sem mídia do cliente caem no Pixabay; os moldes só permitem isso na cena da "dor"/ilustração.
- Logo persistente no canto durante o filme = trava 8.2 (decisão 7). Dia 1: logo no cartão final (canvas). Se sobrar tempo, injetor `lib/ads/brandLayer.ts` (image element em y≥17%, largura 26%) entre `compose/route.ts:3055` e o submit, atrás de `ADS_LOGO_OVERLAY=off`, só liga com render de validação aprovado.
- Retenção: mídia no bucket do cliente (cota 500 MB); vídeo final copiado ao bucket `renders` como hoje.

### 3.6 Entrega e revisão humana
- Entrega imediata (o cliente vê e baixa). Fila `/admin/ads` (Claude: rota + lista simples; Codex: visual) com status e botões "ok / re-render com ajuste / +créditos (botão existente do /admin/people)".
- **Teto de pedidos em revisão aberta = 5** (padrão `DFY_MAX_OPEN_ORDERS`): acima disso a página `/ads` mostra "estamos com a agenda cheia — volte amanhã" em vez de vender promessa sem operador.

---

## 4. O que fica manual nas primeiras 48 h e como a tela diz isso
| Manual | Texto na tela |
|---|---|
| Revisão do 1º anúncio de cada empresa (assistir, re-renderizar com ajuste se logo/foto/ordem errarem) | "A human editor reviews your first ad within 24 h and sends a corrected version if anything is off." |
| Pedido de ajuste ("cena 2 mais curta") | "Revisions: 2 included per ad, done by the same editor within 24 h." |
| Logo em SVG/WEBP/HEIC ou vídeo >50 MB enviado por e-mail | "Send it to hello@… and we convert it for you (same day)." |
| Voz clonada / apresentador / 1:1 / 16:9 / áudio original do vídeo | Seção "Coming next" na página, nunca no fluxo; pedido vira Express/Pro. |
| Estorno de crédito | Botão "+ créditos" do /admin/people, motivo obrigatório (nunca à mão no banco). |
Nunca escrever "instant", "no human", "AI does everything", "hundreds of formats".

---

## 5. Cronograma de 25/09 (BRT, blocos de 2 h, duas pistas)
Sincronia de 5 min no início de cada bloco: contrato de props/rotas. Claude cria às 08h os componentes vazios (1 linha cada) e os tipos para o Codex não esperar.

| Bloco | CLAUDE (servidor/fluxo) — marco | CODEX (visual) — marco |
|---|---|---|
| 08-10 | Worktree limpa sobre origin/main + junction node_modules + **tsc verde na base**; migration `2026-09-25_studio_ads.sql` aplicada e conferida no banco; `lib/ads/{offer,models,access,events}.ts` puros; componentes vazios + tipos. **Marco: coluna existe, guardiões 1-3 verdes.** | `/ads` pública: herói, 8 cards, "o que você recebe", FAQ honesto, CTA → `/api/stripe/checkout?pack=ads_pass`; mobile 16 px; preço lido do módulo. **Marco: HTML antes/depois da /ads.** |
| 10-12 | `buildAdsPassAndRedirect` + dispatcher; ramo `ads_pass` no Path A (mesmo UPDATE, fail-closed, `ads_access_granted`); `checkPricingInvariants`; `ADS_PASS_LIVE`. **Marco: checkout de teste em modo test da Stripe concede acesso.** | `/ads/new` passos 1-2: brief (6 campos, validação, rascunho) e mídia (drag&drop sobre `/api/footage`, slot de logo, leitura de duração/dimensão no navegador, contador de cota, mensagens 50 MB/tipo, checkbox de consentimento). |
| 12-14 | `/api/ads/orders` (GET/POST/PATCH com gate) + `/api/ads/script` (3 ganchos, molde por modelo) + prévia de voz via `/api/audio`. **Marco: roteiro de 35 s dentro da régua para os 8 moldes.** | Passos 3-4: 8 cards (bloqueio por mídia mínima) e editor de roteiro (3 ganchos, contador, "Ouvir a voz", seletor de voz). |
| 14-16 | `/api/ads/render` (payload no servidor, scene→mídia por id, cartão na última cena, compose com `order_id`); **canário real na conta do fundador: 5 fotos + logo + cartão, 35 s, 3 cr** — conferir legibilidade do cartão em 1080×1920, ordem das fotos, `ads_*` gravados; 2º canário com MOV de iPhone ≤50 MB. **Marco: MP4 com cartão e mídia na ordem certa.** | Passo 5: storyboard + **cartão final em `<canvas>` → PNG → upload**; passo 6: 3 estados do botão (Render N cr / Liberar Studio Ads / Sem crédito → top-up). |
| 16-18 | `/admin/ads` rota (fila, ok/re-render/entregar) + e-mails 1 ("Studio Ads is open") e 2 ("Your ad is ready") com `claimEmailSlot`; 3º botão no `DfyOfferCard` (1 linha); guardiões 4-8. Se sobrar: `brandLayer` atrás de `ADS_LOGO_OVERLAY=off`. **Marco: pedido ponta a ponta em dev com e-mail 2.** | Passo 7 (player, download, pedir ajuste, outra versão, upsell Express) + `/admin/ads` visual + 2 templates HTML de e-mail + estados vazios/erro (402, 50 MB, tipo, sem acesso, "motor lento 15-20 min"). |
| 18-20 | tsc + **suíte inteira (~4 min)** + baseline; `git fetch` de novo; `bash scripts/enfileirar.sh` (nunca `branch -f`); reconferir guardiões na ponta da fila; **avisar "hora de clicar"** com HTML antes/depois. | HTML antes/depois final (desktop + mobile) de `/ads`, `/ads/new` 1-7, `/admin/ads`; varredura de copy (guardião 6 como checklist); branch codex/* limpa enfileirada. |
| 20-22 | Pós-deploy: sonda de `/ads` e `/api/ads/orders` com UA identificável e controle 404; checkout real do fundador (decisão 10); 1 pedido ponta a ponta em produção; SQL do funil zero por pessoa; `docs/STUDIO-ADS-DIA-1-2026-09-25.md`; rascunho no Gmail para os 11 leads (envio dia 26). | Correções do teste em produção (copy, estados, mobile). Nada novo depois das 21h. |

Fora do horário: nenhum render pago além dos 2-3 canários (Kineo 1, 3-5 cr); nenhum e-mail a cliente real antes do "vai".

---

## 6. Eventos e leitura de 14 dias
Fonte única `lib/ads/events.ts`; cliente via `trackEvent`, servidor com `await` (nunca `void`); **`metadata.order_id` em todos a partir do brief** (é o carimbo do deploy: `metadata ? 'order_id'`, nunca relógio).

Lista fechada: `ads_page_viewed` · `ads_cta_clicked` · `ads_checkout_started` · `ads_access_granted` (srv) · `ads_access_denied {reason}` (srv) · `ads_brief_saved` · `ads_consent_given` · `ads_media_uploaded` · `ads_media_refused` · `ads_template_selected` · `ads_script_served` (srv) · `ads_script_chosen` · `ads_voice_previewed` · `ads_card_rendered` · `ads_preview_confirmed` · `ads_render_requested` (srv) · `ads_render_served` (srv, no settle) · `ads_render_failed {reason}` (srv) · `ads_delivered` (srv) · `ads_email_sent {kind}` (srv) · `ads_download_clicked` · `ads_revision_requested` · `ads_qa_decided {ok, reason, by}` (srv) · `ads_dfy_upsell_clicked`. Reaproveitados: `payment_success {pack:'ads_pass'}` (único que é dinheiro), `footage_refused`, `dfy_card_clicked`, `generation_stage_error`.

Leitura (por PESSOA, corte = presença de `order_id`; só `payment_success` é venda):
1. Funil: viu `/ads` → clicou → checkout → **pagou** → brief → mídia → render → download. Achar o degrau seco cruzando por pessoa.
2. Tentativa/sucesso/falha do render com denominador explícito; causa em `generation_stage_error.metadata.error`.
3. % de pedidos que precisou de operador (`ads_qa_decided ok=false` + `ads_revision_requested`) / `ads_render_served`. Meta para tirar o humano do 1º anúncio: <30% em 14 dias.
4. Custo real: créditos por `order_id` × US$0,55/60 s medido vs preço do passe; anúncios por passe (>8 por pessoa = passe barato).
5. Recusas de mídia por motivo (decide se o pré-corte local sobe).
6. `ads_voice_previewed` → `ads_render_requested`: a prévia converte ou assusta?
7. Balcão: `dfy_card_clicked` por degrau antes/depois do 3º botão (canibalizou ou somou?).
8. Os 11 leads: quantos voltaram pelo link (evento de navegador, não o e-mail nosso).
Critério de 48 h: ≥3 passes pagos e ≥1 anúncio sem rework → abre semana 2; 0 pagantes com ≥50 visitas em `/ads` → preço/copy, não infra.

---

## 7. Guardiões (`scripts/test-ads-*.mjs`, estilo `readFileSync` + regex; `check(nome, condição)` nesta ordem; sem alias `@/`)
1. `test-ads-sku.mjs`: centavos do SKU fora da lista ocupada; `ads_pass` em `checkPricingInvariants`; preço por crédito ≥ piso do Creator (US$0,133).
2. `test-ads-webhook-fail-closed.mjs`: `ads_access_until` e `has_paid` no MESMO objeto `profileUpdate`; `RetryableEntitlementError` no erro; `ads_access_granted` só depois do UPDATE. Mutante que remove a concessão fica vermelho.
3. `test-ads-migration-first.mjs`: nome da coluna idêntico no webhook, no gate e no `.sql`.
4. `test-ads-gate.mjs`: `hasAdsAccess` exige `ads_access_until` provado (proíbe `!isSubscriber`); toda rota `/api/ads/*` chama o gate antes de escrever; `ADS_PASS_LIVE=false` esconde botão E rota.
5. `test-ads-render-mapping.mjs`: `/api/ads/render` só aceita URLs com `/user-footage/${user.id}/`; cena→mídia por id; cartão pinado à cena de maior número; grep proíbe `selectedFootage[sceneIdx]` em `app/ads` e `lib/ads`.
6. `test-ads-copy-honesta.mjs`: `/ads`, telas e e-mails sem "hundreds of formats", "avatar", "1:1", "16:9", "instant", "no human", "15s"; preço vem do módulo (proíbe `$19`/`$29` literal no JSX).
7. `test-ads-events.mjs`: cada nome da fonte única existe em ≥1 arquivo de código; `order_id` em todo `trackEvent('ads_`; servidor grava com `await`; `ads_render_served` amarrado ao settle.
8. `test-ads-email-quota.mjs`: e-mails 1 e 2 passam por `claimEmailSlot`/`recordEmailSend`; e-mail 2 só com `status in ('delivered')`.
9. `test-ads-trava-82.mjs`: diff do commit contra o PAI (não o merge-base) não toca `lib/compose*`, `lib/hollywood/`, `lib/cinematic/`, `lib/broll/`, `app/api/generate-video-*`, `app/api/analyze-idea`, `app/api/generate-script`, `GenerateClient.tsx`.
10. Se o injetor de logo entrar: `test-ads-brand-layer.mjs` — não remove/reordena tracks, idempotente, y≥14%, `off` devolve JSON idêntico (mutante `if→true` vermelho).
Processo: tsc com junction; suíte inteira antes de enfileirar; reconferir na ponta da fila; sonda pós-deploy com controle 404.

---

## 8. Semana 2 (com custos)
| Item | Bloco existente | Custo direto | Créditos sugeridos |
|---|---|---|---|
| **Product**: foto → cena em movimento (Seedance 1.5 i2v 720p 9:16 5 s, sem áudio) via `/api/ads/motion` que copia o MP4 para `user-footage/<uid>/` e entra pela porta de clipe do cliente | `generate-video-cinematic/route.ts:263`; padrão de cópia `lib/fastAiScene.ts:130` | US$0,13/cena (3 cenas + Kineo 1 ≈ US$0,75-1,00) | 8-10 cr/cena |
| **Presenter**: o dono apresenta (selfie + roteiro) — verbatim permite 15-30 s | Kling Avatar v2 Std `lib/avatar/veed.ts:46`, `generate-avatar/route.ts:244-253` | US$0,056/s (30 s ≈ US$1,70; 60 s ≈ US$3,37) | 70 cr hoje; rever para 30 s |
| **Voz clonada** do dono (≥10 s de áudio; clone some se não usado em 7 dias) | `/api/avatar/voice` + `compose/route.ts:437` `use_cloned_voice` | US$1,50 (1×) | 10 cr |
| Produto real DENTRO de cena gerada (Nano Banana Pro /edit, não wired; Kontext derrete logo pequeno) | `lib/avatar/scene.ts:12` | US$0,04-0,15/still | 3-5 cr + QA humano |
| Logo persistente no canto · áudio original baixo sob narração · piso 20 s · legendas fora da banda de 35% | trava 8.2 (decisão 7) | 0 | — |
| 1:1 e 16:9 · URL→brief · pré-corte no navegador · `role` em `user_footage` · 3 cortes automáticos (são renders novos: sem ffmpeg) | — | — | — |
Consentimento de rosto/voz como fluxo (atestado + evento + 403 no servidor sem atestado) e aviso do rótulo "Made with AI" da Meta entram ANTES de Presenter/voz.

---

## 9. Riscos e o que fica fora
**Riscos que derrubam o dia**
1. Migration não aplicada antes da 1ª venda: fail-closed segura o dinheiro, mas o cliente pagou e vê erro. Bloco 08-10 + guardião 3.
2. MOV HEVC/HDR de iPhone nunca montado no Creatomate; sem probe no servidor. Canário das 14-16 h decide; se falhar, a tela pede MP4.
3. Plantão sem dono = caso Rick. Teto de 5 abertos fecha a loja sozinho; decisão 5 nomeia o operador.
4. Codex com página + 7 passos + admin em 1 dia: se atrasar, `/admin/ads` cai para lista crua do Claude e o passo 7 usa a página de vídeo existente.
5. Duas pistas no mesmo arquivo (`DfyOfferCard`, `StudioClient`): Claude toca 1 linha, Codex não entra em `app/api` nem `lib/`; âncora por linha inteira.
6. Copy que promete o que não roda vaza do press release. Guardião 6.
7. Cliente com mídia inútil (só logo, fotos de 200 px) → anúncio vira Short de stock. Mídia mínima bloqueia o passo 3; operador contata.
8. Creatomate ~20% da cota mensal em 24 h; e-mail com teto diário. Anúncios de 35-60 s (22-37 cr Creatomate); `claimEmailSlot`.
9. Medição: contar eventos em vez de pessoas, cortar por relógio. `order_id` em tudo; só `payment_success` é venda.
10. `FAST_USD_PER_CREDIT=0.066` velho: margem "verde" do guardião é otimista; usar US$0,55/60 s medido.

**Fora do dia 1 (dito na página como "coming next", nunca prometido)**: anúncio de 15 s; centenas de formatos; apresentador; voz clonada; produto em cena gerada; logo persistente; áudio original do vídeo; ducking; 1:1/16:9; URL→brief; 3 cortes automáticos; multi-idioma no mesmo pedido; página `/empresas`; plano mensal "Business"; preço por país; publicação em Meta/TikTok; painel com frames (sem ffmpeg); validação de codec no servidor.

---

## 10. Decisões do fundador
1. **Nome**: recomendo **Studio Ads** (casa com /studio e o tier Studio). Alternativas: Kineo Ads · Kineo for Business.
2. **Preço/acesso** (centavos livres de colisão): (a) **Passe US$19 = 1990 c + 60 cr** — 12-20 anúncios; margem 42-79% no pior caso, >85% no uso real de 2-4 anúncios · (b) Passe US$29 = 2900 c + 100 cr — margem 38-76% pior caso · (c) Por anúncio US$9 = 1200 c com 12 cr — ~88%. **Recomendação: (a)** — é "paga para entrar", cabe nos 6 pedidos de Índia/Nigéria, e a recarga já existe pelo top-up. Código sobe com `ADS_PASS_LIVE=false`.
3. **Quem entra sem passe**: recomendo assinante pago entra de graça (`isPayingProfile`), trial não. Alternativa: só quem compra.
4. **Degraus**: dia 1 só Kineo 1; semana 2 Product (Seedance i2v, 8 ou 10 cr/cena) e Presenter (Kling Avatar). Por MOTOR, nunca por país.
5. **Revisão humana**: recomendo entrega imediata + revisão pós-entrega do 1º anúncio em 24 h, teto de 5 abertos. Alternativa: QA bloqueante antes do e-mail. **Quem opera a fila — você ou eu?**
6. **Consentimento**: dia 1 = checkbox + evento. Semana 2 = aprovar atestado de rosto (texto do Avatar Studio) e de voz (novo), regra de recusa e aviso "Made with AI".
7. **Trava 8.2**: "vai" nominal para piso 20 s · legendas fora da banda de Reels · áudio original baixo · logo persistente? Sem "vai": 35/60 s, vídeo mudo, logo só no cartão — e a tela diz.
8. **3º botão no cartão DFY**: manter Express/Pro ao lado (recomendo sim) ou substituir o Express?
9. **E-mail aos 11 leads**: rascunho dia 25, envio dia 26 após 1º render limpo, com o cartão final montado com o nome deles. Aprovar.
10. **Compra de teste real** às ~20 h (recomendo: dinheiro é a única prova; estorno depois) ou conta interna?
11. **Clique**: SUBIR-SITE.bat às ~19h30 quando eu avisar "hora de clicar".

---

## 11. Estado em 24/09 ~13h20 BRT (o Claude adiantou o servidor; tudo DESLIGADO por NEXT_PUBLIC_ADS_PASS_LIVE)

**Pronto e testado (guardiões test-ads-fundacao 36 · test-ads-servidor 34, mutantes derrubados):**
- `lib/ads/{offer,models,access,events,types,orderContract,scriptPrompt,serverAccess}.ts` — preço/créditos/acesso (US$19,90 · 60 cr · 365 d), os 8 modelos em 35/60 s, portão passe > pagante > interna, 25 eventos, contrato do pedido, prompt + validador do roteiro.
- Checkout `/api/stripe/checkout?pack=ads_pass` (só conta interna enquanto desligado) e webhook Path A (acesso no mesmo UPDATE dos créditos, fail-closed; `ads_access_granted` depois).
- `/api/ads/orders` (GET/POST/PATCH) e `/api/ads/script` (POST). Contrato abaixo.
- `migrations_pending/2026-09-25_studio_ads.sql` escrita; aplicação depois da revisão adversarial.

**Contrato para as telas (Codex):**
- `GET /api/ads/orders` → `{ access: 'pass'|'subscriber'|'internal'|'none', gate: 'ok'|'no_access'|'closed', live: boolean, ready: boolean, orders: AdsOrder[] }` (`ready:false` = tabela ainda não existe; `gate:'closed'` = desligado para esta conta; nos dois casos mostrar "abre em breve"). ⚠ Mudou em 24/09 (revisão): `'paying'` virou `'subscriber'`.
- `POST /api/ads/orders` body `{ brief?: AdsBrief }` → 201 `{ order }` · 403 `{ reason:'no_access' }` (mandar para /ads com o botão do passe) · 403 `{ reason:'closed' }` (desligado: "abre em breve", sem botão) · 400 `body_must_be_object` · 429 rascunhos demais · 503 não pronto.
- `PATCH /api/ads/orders` body `{ id, brief?, media?, template?, script?, script_angle?, voice?, consent?: true }` → `{ order }`. Erros 400 com `error` em código (`business_required`, `contact_required`, `cta_invalid`, `media_not_owned`, `logo_only_one`, `logo_must_be_image`, `template_invalid`, `consent_must_be_true`, `consent_needs_media`…) — a tela traduz o código em frase. Mídia nova SEM `consent:true` no mesmo PATCH zera `consent_at` (a tela pede o consentimento de novo). A URL gravada é a do banco (`user_footage` do dono); a da tela só precisa ser da pasta da conta. `seconds` vem do modelo, não da tela. Mídia: `{ footageId, url, kind:'image'|'video', isLogo, bytes, width?, height?, seconds? }`, sempre da pasta da própria conta (subir por `/api/footage` como hoje).
- `POST /api/ads/script` body `{ order_id }` (pedido com brief e modelo) → `{ versions: [{ angle:'question'|'number'|'result', beats: string[], script, words }] }` (1 a 3 versões; a que inventar número ou esquecer o contato é descartada) · 502 `no_script` com `hint` · 429 `daily_limit` (20/24 h). A escolhida volta pelo PATCH (`script`, `script_angle`).
- Tipos: `lib/ads/types.ts`; modelos e batidas para os cards: `ADS_MODELS` em `lib/ads/models.ts` (nome, segmento, duração, entradas mínimas, CTA de exemplo, aviso honesto); copy do passe: `adsPassCopy()` em `lib/ads/offer.ts`. Nada de preço digitado no JSX.

**Render (amanhã, com canário na conta do fundador):** `/api/ads/render` monta no servidor o corpo do Kineo 1 (roteiro verbatim, duração do modelo, `brollScenes[i].userFootageUrl` por batida → mídia por id, cartão final PNG na última cena, `engineFitOverride:true`) e chama a rota do Kineo 1 EM PROCESSO com cabeçalho de serviço, igual ao `finish-orphan-jobs` (app/api/cron/finish-orphan-jobs/route.ts:107-110); o `finish-stranded-renders` monta o filme na rodada seguinte. Nenhuma linha na rota travada (8.2) — só a chamada. Legendas na zona segura e logo persistente (o "vai" ii/iv) entram atrás de `ads_brand_layer` com render de validação.

## 12. Revisão adversarial do servidor (24/09 ~13h30 BRT) — 10 achados confirmados, todos consertados antes de ligar

Workflow de 6 agentes (dinheiro, segurança, contrato, regressão) contra o commit 06e20234. Consertado em 0bd85f1b, guardiões test-ads-fundacao 41 · test-ads-servidor 42, 13/13 mutantes derrubados, suíte inteira sem vermelho novo (132 herdados dos dois lados).
- **Auto-concessão do passe:** a policy "Users own profile" deixa o dono dar UPDATE na própria linha e a guarda `enforce_profile_client_guard` não conhecia a coluna nova. Agora a migration cria `ads_access_client_guard` (authenticated/anon: insert zera, update devolve o antigo; service_role passa).
- **Passe eterno e porta larga:** `isPayingProfile` (has_paid OU plano != free) abria para quem comprou qualquer pacote, ex-assinante, trial de cartão — e o próprio passe grava has_paid, então os 365 d nunca expiravam. Agora assinante = plano mensal/anual explícito (`ADS_SUBSCRIBER_PLANS`, sem *_trial e sem piloto).
- **Conta interna:** os padrões LIKE de métrica (`test%`, `%mailinator%`) autorizavam estranhos e furavam o interruptor do checkout. Agora `isAdsInternalEmail` = lista exata + apelidos josephsskaf+…@gmail.com, sempre pelo e-mail do auth.
- **Interruptor:** as rotas /api/ads/* ignoravam `NEXT_PUBLIC_ADS_PASS_LIVE`; agora `adsGate` (desligado = só interna).
- **Cobrar sem conceder:** checkout sonda a coluna antes de criar a sessão; sem a migration responde 503 "opens soon" (`migration_missing`).
- **Mídia:** `%2e%2e` passava no startsWith; agora codificados e barra invertida são recusados, o caminho é normalizado, o id é conferido em `user_footage` do dono e a URL gravada vem do banco. Consentimento exige mídia e zera quando a mídia muda.
- **Robustez:** corpo que não é objeto = 400; exceção = 500 genérico.
- **Refutados pela própria revisão:** corrida no PATCH (o UPDATE já filtra `status='draft'`), eventos forjáveis (são só de servidor) e o recompra-zera-prazo (vira real só se houver recompra dentro do ano; anotado para a semana 2: estender a partir da data maior).
- **Migration APLICADA em produção (24/09 ~13h37 BRT):** coluna, tabela (RLS, 0 policies) e as duas guardas conferidas; teste desfeito provou que o cliente não se dá o passe e o servidor grava. O passe continua sem vender: interruptor desligado, só conta interna.
