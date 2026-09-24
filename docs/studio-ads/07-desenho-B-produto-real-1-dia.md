# Studio Ads — desenho B: "produto real em 1 dia" (19/25)

> Saída bruta de um agente do workflow `studio-ads-pesquisa-e-plano` (24/09/2026 ~05h-06h BRT), guardada porque "o que só existe no chat some". Fatos com URL foram lidos naquele momento; file:line conferidos em `C:\kineo-wt\analise-0923` na main ed065b91. Origem: desenhista B.

# B — produto de verdade em 1 dia só com blocos existentes: Kineo 1 + My footage + Creatomate + Diretor + cockpit do Studio. O anúncio sai da máquina no dia 25/09 para 8 modelos, sem motor novo de IA; o que muda é um modo "Ad" dentro do Studio, um portão de acesso pago reaproveitando o checkout one-time, uma camada de marca (logo + cartão final) aplicada no JSON do Creatomate fora da trava 8.2, e medição por evento em cada degrau.
# Studio Ads — plano de construção para 25/09/2026 (ângulo B: só blocos existentes)

Base de fatos: pesquisa dos 5 leitores + conferência no código em `C:\kineo-wt\analise-0923` (leitura, nada modificado). Toda referência `arquivo:linha` abaixo foi lida hoje.

---

## 1. O que é o Studio Ads (voz de press release, 5 linhas)

> **Kineo lança o Studio Ads: a empresa sobe as próprias fotos, o próprio vídeo e o logo, escolhe um dos 8 modelos de anúncio e recebe em minutos um comercial vertical narrado, legendado, com trilha original e cartão final com a marca dela.** Diferente dos geradores de "avatar falante", o Studio Ads usa o material REAL do negócio — o prato, a loja, a equipe, o antes/depois — e a IA entra como diretor: escreve o roteiro no formato que converte (gancho → prova → oferta → chamada), narra em 41 idiomas e monta tudo com música original livre para Reels Ads. Sem filmagem, sem editor, sem timeline: brief de 6 campos, mídia, modelo, roteiro em 3 ângulos para escolher, render. Quem quer revisão humana continua com o balcão Express/Pro. O primeiro anúncio é renderizado pela mesma máquina que já entregou 1.100+ filmes na Kineo.

O que essa frase NÃO promete (e o produto não faz no dia 1): centenas de formatos, avatar/rosto gerado, voz clonada no fluxo, 1:1/16:9, edição do vídeo do cliente por cena.

---

## 2. Porta de entrada — dentro do Studio, não uma página nova

**Decisão de ângulo B: a empresa entra pelo cockpit do Studio (`/studio`), num interruptor `Short · Ad` acima da caixa de texto.** Motivos:
- É onde os 11 pedidos reais de anúncio de empresa foram escritos nos últimos 90 dias (`components/DfyOfferCard.tsx:5-9`), e onde o cartão do balcão manual já mora desde 24/09 ~04h (`app/(dashboard)/studio/StudioClient.tsx:51,731`).
- O protótipo `/empresas` está congelado (DECISIONS:279) e uma página pública nova é trabalho de SEO/copy que não faz o anúncio sair. Fica para depois com o link `/studio?mode=ad` já funcionando.
- A regex `isDfyCandidate()` (`lib/growth/dfyOffer.ts:133-137`) já reconhece "my restaurant / minha loja / anuncio para minha empresa" em 5 línguas: quando ela casa no modo Short, o cockpit sugere "Isso é um anúncio? Abra o Studio Ads →" e liga o modo Ad com o texto preservado como brief.

Três entradas no dia 1:
1. `/studio` → interruptor `Ad` (novo, no cockpit; Claude entrega o componente isolado montado em 1 linha ao lado do `DfyOfferCard`, Codex refina o visual).
2. `/studio?mode=ad` (deep link para o e-mail aos 11 leads e para o cartão DFY, que ganha a 3ª opção "Faça você mesmo — Studio Ads").
3. Cartão "Want a human editor?" continua existindo como topo da escada (Express US$35 / Pro US$75) — dentro do modo Ad ele aparece na tela de entrega, como "quer que a gente revise?".

---

## 3. Modelo de acesso — como paga, como o servidor sabe, o que reaproveita

### 3.1 O que reaproveitar (tudo já no ar)
- **Checkout one-time**: padrão `buildBulkPackAndRedirect` (`app/api/stripe/checkout/route.ts:3180`) — `mode:'payment'`, `price_data` inline, `metadata.pack` + `metadata.pack_credits`, trava de laço login↔checkout `resumed=1` (:3248-3253), `success_url` com `pack=` e `session_id` (:3278).
- **Webhook Path A** (`app/api/stripe/webhook/route.ts:1262`): credita `pack_credits` e grava `has_paid:true` no mesmo UPDATE (trecho lido em :1400-1432 → `profileUpdate = { video_credits: next, has_paid: true }`). Consequência boa: quem compra o passe vira `treatAsPaid` (`lib/reverseTrial.ts:722-733`) e o portão do My footage abre sozinho (`app/api/footage/route.ts:183`).
- **Lição do piloto Autopilot** (:1432-1463): `plan` e `plan_expires_at` são escritos juntos e, se a coluna não existir, o webhook loga "NOT GRANTED". Não reaproveitar `plan_expires_at` (ele acompanha `plan='autopilot_pilot'`); criar coluna própria.

### 3.2 O que construir (Claude, servidor)
- **Migration** `profiles.ads_access_until timestamptz null` + tabela `ad_briefs` (§4). Aplicar ANTES de vender (regra do piloto).
- **SKU `ads_pass`** em `lib/checkoutPricing.ts`: entra em `checkPricingInvariants()` (:762); valor em centavos fora da lista ocupada (290/490/590/900/1290/1490/1900/3500/4900/5990/7500/9900/10000/19900/29900/39900) — ex.: 1990, 2900, 1200 estão livres. Preço = decisão do fundador (§ decisões); o código nasce com a constante e o interruptor `ADS_PASS_LIVE=false` até ele escolher.
- **Builder `buildAdsPassAndRedirect`** (cópia do bulk): `metadata.pack='ads_pass'`, `pack_credits=N`, `success_url=/studio?mode=ad&pass=ok&session_id=…`.
- **Ramo no Path A**: se `metadata.pack==='ads_pass'` → além do crédito, `ads_access_until = now()+365d` (passe único; se o fundador escolher assinatura, vira 30d renovável — fora do dia 1). Evento servidor `ads_pass_granted`.
- **`lib/ads/access.ts`**: `hasAdsAccess(profile, now)` = `ads_access_until > now`. Contas internas (`FORCE_*` / lista interna já usada em `engineLaunch`) passam sempre para canário.
- **Portão de render**: a rota de despacho (`/api/ads/dispatch`) exige `hasAdsAccess` E crédito suficiente para o motor (Kineo 1 pago = 5cr/60s, 3cr/35s — `lib/credits/engineCost.ts:38,216` + escala 35s=60%). O render em si segue o cobrador normal (nada de segunda régua — memória "predicado do cobrador não se redigita").

### 3.3 Onde fica o paywall (recomendação; decisão dele)
Momento mágico do mercado (12 de 14 concorrentes): "algo MEU aparece num vídeo antes de eu pagar" (Waymark cobra só no download). Recomendação de dia 1:
- **Grátis, antes de pagar**: brief → 3 roteiros com o NOME, a OFERTA e o CONTATO dela → escolha do modelo → **cartão final renderizado em HTML com o logo e os dados reais** → prévia de voz (1 frase, custo nosso US$0,01).
- **Atrás do paywall**: o botão **Render**.
- Upload de fotos/logo antes de pagar exige mexer no portão do footage (`app/api/footage/route.ts:183`: `treatAsPaid` → `treatAsPaid || hasOpenAdBrief` com cota de rascunho de 30 MB, `footage_refused` ganha razão `ads_draft_quota`). São ~10 linhas fora da trava 8.2; recomendo fazer, porque sem foto dela no storyboard o momento mágico é só texto. Se o fundador preferir paywall antes do upload, o código é o mesmo sem essa linha.

### 3.4 Opções de preço (só apresentar; margens sobre custo medido de Kineo 1 = US$0,35/30s e US$0,55/60s, doc 21/09)
| Opção | Como | Faixa | Margem (pior caso realista) | Observação |
|---|---|---|---|---|
| **(a) Passe de acesso + créditos** ("paga para entrar", literal ao pedido) | `ads_pass` único | US$19 + 60cr (≈12-20 anúncios) ou US$29 + 100cr (≈20-30) | 58-68% | sem MRR, sem churn; 1 SKU, 1 dia |
| **(c) Por anúncio** (mesma escada do balcão, self-serve) | `ad_kineo1` | US$9 com 12cr (2 renders + folga) | ≈80% | PME pensa por anúncio; 990 centavos livre (900 colide) |
| (b) Plano "Business" mensal | 4º tier | US$49/300cr | 26% pior caso do guardião | roça no congelamento até 09/10 (DECISIONS:35); NÃO para 25/09 |
| Express/Pro humano (já existe) | Payment Link | US$35 / US$75 | — | topo da escada; upsell na tela de entrega |

Duas faixas por PAÍS reabrem a V6 (regional nunca vendeu, 3 telas mentiram no mesmo dia). Dois mundos se fazem por DEGRAU (Kineo 1 hoje; Seedance i2v como "Pro" na semana 2) e a moeda pelo Adaptive Pricing da Stripe.

---

## 4. Fluxo tela a tela (modo Ad dentro do Studio)

Todo o estado vive no servidor em `ad_briefs` (não em sessionStorage — memória "remédio escrito pelo lado que morre"): `id, user_id, business_name, what_sells, offer, cta, contact{phone,whatsapp,address,link}, language, model_id, duration(35|60), voice_id, logo_url, media[] (ordenada, com scene_id), script (verbatim), scene_plan jsonb, status (draft|scripted|ready|dispatched|rendered|delivered|issue), video_id, created_at, updated_at`.

| # | Tela | O que a pessoa faz | Automático (dia 1) | Operador (dia 1) | Evento |
|---|---|---|---|---|---|
| 0 | Cockpit `/studio` | clica `Ad` (ou a regex sugere) | mostra o painel; lê `hasAdsAccess` | — | `ads_mode_opened {has_access, source}` |
| 1 | **Brief** (6 campos) | nome do negócio · o que vende · oferta/preço/prazo · chamada (ligar/WhatsApp/visitar/comprar) · contato (telefone/endereço/link) · idioma | valida obrigatórios; sem "colar URL" no dia 1 (fora) | — | `ads_brief_saved {brief_id, model_id?, language}` |
| 2 | **Mídia** | logo PNG/JPG (slot próprio) + 3-10 fotos e/ou 1-3 vídeos ≤50 MB, ordena arrastando | reutiliza `/api/footage` (`upload-url`→PUT→`confirm`, :201-274); logo = `kind:'image'` com tag no brief (o bucket não tem `kind:'logo'`, o brief guarda `logo_url`) | — | `ads_media_added {brief_id, kind, count}`; `footage_refused` (existente) |
| 3 | **Modelo** | escolhe 1 dos 8 cards (§5), vê duração e "precisa de: N fotos, logo, oferta" | bloqueia modelo cuja entrada mínima não foi subida (ex.: Antes→Depois sem 2 pares) | — | `ads_model_chosen {brief_id, model_id, duration}` |
| 4 | **Roteiro** | recebe 3 ângulos (pergunta / número / resultado-primeiro) sobre o MESMO molde de batidas; escolhe 1; edita linha a linha | `POST /api/ads/script` (GPT-4o-mini, padrão de `app/api/diretor/suggest/route.ts` com evento `_served`) — molde por modelo, régua clássica 3,1 pal/s (35s=100-115 palavras · 60s=175-195), nunca inventa número: placeholder sem dado vira linha cortada | — | `ads_script_served {brief_id, angles:3, words}` · `ads_script_chosen {brief_id, angle, edited}` |
| 5 | **Prévia + portão** | vê storyboard (cena → foto dela → frase), cartão final em HTML com logo/dados reais, ouve 1 frase na voz escolhida; vê o custo em créditos | `POST /api/ads/voice-preview` (MiniMax 2.8 HD, ≤160 chars, 3 por brief, sem débito) · sem acesso → botão vira "Liberar Studio Ads" (checkout `?pack=ads_pass`) · sem crédito → top-up existente | — | `ads_voice_previewed` · `ads_paywall_shown {brief_id, sku}` · `checkout_started {pack:'ads_pass'}` (existente) · `ads_pass_granted` (servidor) |
| 6 | **Render** | aperta Render (3cr/35s · 5cr/60s) | `POST /api/ads/dispatch` valida acesso+crédito, grava `scene_plan` com `userFootageUrl` POR CENA (não posicional), status `dispatched`, e devolve o hand-off → `/studio/create?studio=1&ad=<brief_id>&engine=fast&script_mode=verbatim&duration=35\|60`. No GenerateClient, hook novo `useAdBrief(briefId)` (arquivo próprio, 1 import + 3 pontos: prompt=script, `brollScenes[i].userFootageUrl` do plano, `ad_brief_id` no payload de compose/render). Rota fast já aceita `brollScenes[].userFootageUrl` da pasta do usuário (`app/api/generate-video-fast/route.ts:597,620-623`) e o clipe do cliente vence stock sem fallback (:1250-1252). Camada de marca no `/api/render` antes do POST à Creatomate (`app/api/render/route.ts:328`): `applyBrandLayer(source, brand)` de `lib/ads/brandLayer.ts` acrescenta logo (imagem, faixa superior — receita já anotada em `lib/compose.ts:2750-2751`) e cartão final 2,5s (shape + 3 textos) SEM tocar `lib/compose*` | — | `ads_dispatched {brief_id, engine, duration, footage_scenes, stock_scenes}` · `ads_brand_layer_applied {video_id, logo, end_card}` (servidor) |
| 7 | **Entrega** | assiste, baixa, "pedir ajuste", "outra versão (novo ângulo)", "quer revisão humana? Express US$35" | página existente de vídeo pronto + bloco Ads; "pedir ajuste" grava motivo e abre e-mail | **Claude/fundador leem `ads_issue_reported` no dia e respondem em ≤24h; estorno de crédito pelo botão do /admin/people (nunca à mão no banco)** | `ads_rendered {brief_id, video_id, seconds, credits}` (servidor, no settle) · `ads_delivered_viewed` · `ads_downloaded` · `ads_issue_reported {reason}` · `dfy_card_clicked` (existente) |

**O que é operador no dia 1 (lista fechada):** resposta a `ads_issue_reported`; estorno/re-render cortesia; qualquer pedido de avatar, voz clonada, 1:1/16:9, vídeo do cliente com áudio original → vira pedido Express/Pro ou "semana 2". Nada de QA humano bloqueante: o anúncio sai da máquina.

---

## 5. Os 8 modelos do dia 1 e o mapeamento nos blocos existentes

Todos em **Kineo 1 + My footage + MiniMax 2.8 HD + Lyria + Creatomate**, o motor mais barato (3-5cr), sem rosto gerado (Meta não rotula "Made with AI" mídia real com narração sintética). Durações do dia 1 = **35s e 60s**: a rota fast tem piso de 35s para roteiro próprio (`generate-video-fast/route.ts:948 floorSeconds: 35`) e isso está dentro da trava 8.2 — os modelos de 15-20s da taxonomia nascem como 35s (o molde comprime o corpo, o cartão fecha).

| # | Modelo | Batidas (35s) | Entradas mínimas | Blocos |
|---|---|---|---|---|
| 1 | **Oferta relâmpago** | 0-3 número da oferta · 3-18 3-4 fotos em Ken Burns · 18-27 prova (nota/N clientes) · 27-35 CTA + cartão | 3 fotos, logo, oferta+prazo | fotos→`image` com Ken Burns (`lib/compose.ts:2331`), stock só se faltar foto |
| 2 | **Vitrine em fotos** | 0-3 melhor foto · 3-26 6-8 fotos · 26-31 equipe/fachada · 31-35 horário+endereço | 6 fotos, logo, endereço | idem; zero stock |
| 3 | **Problema → Solução** | 0-4 dor (stock Pixabay) · 4-10 agravar · 10-24 solução = mídia dela · 24-30 prova · 30-35 CTA | 3 fotos ou 1 vídeo, logo, contato | stock na dor, `userFootageUrl` nas cenas de solução |
| 4 | **Depoimento em cartão** | 0-4 citação em cartela · 4-16 leitura do depoimento sobre fotos · 16-28 2º depoimento · 28-35 nota+CTA | 2-3 depoimentos em texto, 3 fotos | narração em 1ª pessoa; 2 vozes MiniMax (voice_id por cena não existe no compose → dia 1 = 1 voz, "2 vozes" fica fora) |
| 5 | **Antes → Depois** | 0-3 DEPOIS · 3-8 ANTES · 8-26 processo · 26-35 DEPOIS + CTA | 2 pares antes/depois, logo | ordem das fotos = ordem das cenas; split/wipe é do Creatomate dentro de `lib/compose` → dia 1 = corte seco com crossfade existente |
| 6 | **História do fundador** (60s) | 0-5 "abri porque…" · 5-25 fotos antigas · 25-45 hoje · 45-52 prova · 52-60 CTA suave | 6-10 fotos, logo | voz clonada é o diferencial — **fora do dia 1** (rota existe, `lib/avatar/voice.ts`, mas não no fluxo); TTS com aviso "narração por IA" |
| 7 | **3 erros / lista educativa** (60s) | 0-4 cartela · 4-20 erro 1 · 20-36 erro 2 · 36-50 erro 3 puxa o serviço · 50-60 credencial + CTA | tema + 2 fotos | stock Pixabay + fotos; ideal para advocacia/contabilidade/clínica (educar, não vender duro) |
| 8 | **Contagem regressiva / últimas vagas** | 0-3 número gigante · 3-20 o que ganha · 20-28 "já são N" · 28-35 data+preço+CTA | 3 fotos, data, nº real de vagas | Lyria humor `upbeat` (novo prompt em `lib/lyriaMusic.ts`? não — fica o humor existente `hustle`; humor "comercial" é texto de prompt, semana 2) |

Combinatória honesta para a copy: 8 modelos × 2 durações × 3 ângulos de gancho × 41 idiomas = "dezenas de anúncios de um brief", não "centenas de formatos".

---

## 6. Mídia do cliente — upload, limites, onde guarda, como entra, logo e cartão

- **Upload**: `/api/footage` (signed URL → PUT direto no Storage → confirm). Aceita jpeg/png/mp4/mov/webm/áudio (`lib/userFootage.ts:21-24`); **não aceita webp/heic/gif/svg** → o painel avisa antes ("logo em PNG; fotos do iPhone em JPG").
- **Limites**: 50 MB por arquivo, 500 MB por conta paga (`lib/userFootage.ts:12-16`); sem validação de duração/codec no servidor (o arquivo nunca é aberto). Vídeo do cliente entra **mudo** (`volume '0%'`, dentro de `lib/compose` = trava) e é cortado pelo servidor até ~4,5s por cena — a copy do dia 1 diz "seu vídeo entra como imagem em movimento; a narração é da IA". Vídeo com fala do cliente = pedido Express.
- **Onde guarda**: bucket público `user-footage/<user.id>/…`, linha em `user_footage`; o brief guarda a ordem e o `scene_id` de cada mídia.
- **Como entra no filme**: `brollScenes[i].userFootageUrl` só da pasta do próprio usuário (`generate-video-fast/route.ts:597`), clipe/foto do cliente vence vault/Pixabay sem fallback (:1250-1252); foto vira `image` com Ken Burns (`lib/compose.ts:2331`). Mapeamento por `scene_id` (o GenerateClient hoje é posicional, `selectedFootage[sceneIdx]` :9861 — o hook do modo Ad monta o array já ordenado pelo plano).
- **Logo**: PNG no mesmo bucket, `logo_url` no brief; entra como elemento `image` na faixa superior (x 50%, y 6%, width 30%, opacidade 60-90% — receita em `lib/compose.ts:2750-2751`), fora da UI de Reels (14% de cima) — na prática y 6% cai DENTRO dos 14%; a camada usa **y 17%**, abaixo da banda, largura 26%. Guardião confere.
- **Cartão final**: overlay dos últimos 2,5s (não estende a duração — o molde já fala o CTA nesses segundos): shape full-frame `rgba(13,13,20,0.85)` + logo centralizado + 3 linhas (nome/oferta · CTA · contato), tudo dentro da faixa central (entre 14% e 65% da altura, 6% de margem lateral). Sem promessa de "produto sempre na tela" (semana 2).
- **Legendas**: continuam onde o compose põe (topo ≈1350px de 1920 = dentro dos 35% de baixo cobertos pela UI de Reels Ads). Mudar exige trava 8.2 → copy honesta: "legendas otimizadas para YouTube Shorts; posição para Reels Ads na próxima versão".
- **Fonte única**: `lib/ads/brandLayer.ts` é função pura (source → source) e idempotente; `applyBrandLayer` só aceita `logo_url` com prefixo `…/user-footage/<user.id>/`.

---

## 7. Eventos e leitura de 14 dias

Todos os nomes nascem em `lib/ads/events.ts` (fonte única; guardião confere que cada rota emite o seu). Servidor grava com `await` (nunca `void`).

Cliente: `ads_mode_opened` · `ads_brief_saved` · `ads_media_added` · `ads_model_chosen` · `ads_script_chosen` · `ads_voice_previewed` · `ads_paywall_shown` · `ads_delivered_viewed` · `ads_downloaded` · `ads_issue_reported`.
Servidor: `ads_script_served` · `ads_pass_granted` · `ads_dispatched` · `ads_brand_layer_applied` · `ads_rendered` (no settle do claim) · `footage_refused{reason:'ads_draft_quota'}`.
Reaproveitados: `checkout_started/payment_success{pack:'ads_pass'}` · `dfy_card_shown/clicked` · `generation_stage_error`.

**Leitura de 14 dias** (corte no carimbo do deploy — campo novo `metadata.brief_id` é o carimbo, não o relógio; contar PESSOAS, não eventos; funil cruzado por pessoa no fechamento):
1. Pessoas que abriram o modo Ad / pessoas no Studio (alcance da superfície).
2. Brief salvo → mídia subida → modelo → roteiro escolhido (degrau seco = onde a pessoa para).
3. Paywall visto → checkout → `ads_pass_granted` (conversão do portão; separar quem já tinha crédito).
4. Despachado → renderizado (tentativa/sucesso/falha com `generation_stage_error.metadata.error`, denominador explícito).
5. Renderizado → baixado (o anúncio serviu?) e `ads_issue_reported` por motivo.
6. Custo real: créditos debitados por anúncio × custo medido (US$0,35/0,55) vs receita do SKU.
7. Os 11 leads históricos: quantos voltaram pelo deep link (evento de navegador, não o e-mail nosso).
Critério de 48h (mesma régua do DFY): ≥3 briefs completos e ≥1 pagante → segue; 0 brief em 48h com ≥50 aberturas → o problema é a porta, não o produto.

---

## 8. Guardiões (`scripts/test-ads-*.mjs`, estilo `readFileSync`, sem alias `@/`; rodar a suíte inteira antes de enfileirar)

1. **test-ads-brand-layer**: logo dentro da faixa segura (y entre 14% e 65%, x com 6% de margem); cartão final só nos últimos 2,5s; duração total inalterada; idempotente (aplicar 2× = 1×); source sem `brand` sai igual; rejeita `logo_url` fora da pasta do usuário.
2. **test-ads-access**: `hasAdsAccess` verdadeiro/falso/expirado; Path A grava `ads_access_until` só com `metadata.pack==='ads_pass'`; valor do SKU não está na lista ocupada; `checkPricingInvariants()` cobre o SKU; `ADS_PASS_LIVE=false` esconde botão E rota.
3. **test-ads-script-mold**: os 8 moldes somam a duração; última batida é CTA; palavras dentro da régua clássica; nenhum número inventado (placeholder sem dado some); prompt do GPT não contém HOOK/MICRO REWARD/PAYOFF.
4. **test-ads-dispatch-mapping**: `scene_plan` → `brollScenes[i].userFootageUrl` por `scene_id`; stock só onde não há mídia; prefixo da pasta do usuário.
5. **test-ads-events**: cada rota/componente emite o nome da fonte única; grava com `await`; `ads_rendered` amarrado ao settle, não à resposta HTTP.
6. **test-ads-trava-82**: o diff do commit contra o PAI (não o merge-base) não toca `app/api/generate-video-*`, `lib/cinematic/*`, `lib/hollywood/*`, `lib/compose*`.
7. **test-ads-cortina**: `useAdBrief` só arma o despacho quando o brief está `dispatched` e a tela não está idle (memória "cortina prende quem volta a idle").
8. Suíte existente completa (~4 min): vermelho alheio por texto que mudei se reancora, nunca se afrouxa. tsc na worktree com junction de `node_modules`.

---

## 9. Riscos e o que fica FORA do dia 1

**Riscos**
- Trava 8.2 cerca 3 defeitos que o cliente vai sentir: legendas na banda da UI de Reels, vídeo do cliente sempre mudo, piso de 35s. Sem "vai" nominal, copy honesta cobre; com "vai", cada um é ~1h.
- `GenerateClient.tsx` tem 22.656 linhas; o hook do modo Ad toca 3 pontos — risco de corrida com a cortina/autoanalyze (guardião 7 + canário real).
- MOV HEVC/HDR de iPhone nunca foi testado na Creatomate; 4K de 90s estoura 50 MB → o painel pede "vídeo curto, do rolo da câmera em 'mais compatível'".
- Creatomate: ~20% da cota mensal em 24h; um dia de dezenas de anúncios de 60s (37cr cada) bate no teto → alerta existente `creatomateQuota`.
- Kineo 1 híbrido pode gerar still FLUX na cena sem cobertura (`lib/fastAiScene.ts`) → imagem de IA num anúncio; os moldes exigem mídia da cliente nas cenas de solução, stock só na dor.
- Se o webhook não gravar `ads_access_until` (coluna ausente), a pessoa paga e não entra — migration ANTES do SKU ligar + sonda 401/404 com controle pós-deploy.
- Guardião de margem usa `FAST_USD_PER_CREDIT=0.066` velho (medido 0,126) — as margens acima usam o medido.
- Consentimento: material da cliente com terceiros é responsabilidade dela nos termos; rosto/voz clonados ficam fora e precisam de texto de atestado do fundador.

**Fora do dia 1 (dito na copy como "próxima versão")**: brief por URL do site; 1:1 e 16:9; ducking de música; vídeo do cliente com áudio original; voz clonada no fluxo; avatar/OmniHuman/lipsync; Seedance/Kling i2v nas fotos (degrau "Pro"); Nano Banana produto-em-cena; 3 variantes de gancho renderizadas em lote (dia 1 = escolhe 1 antes, "outra versão" re-renderiza); 15s/6s; split antes/depois; 2 vozes; página pública `/ads` e SEO; painel `/admin/ads` (leitura por SQL); e-mail aos 11 leads (rascunho no dia 25, envio no dia 26 após 1º render limpo em produção); assinatura mensal "Business".

---

## Próxima jogada (não óbvia)
1. **O e-mail dos 11 leads leva o cartão final já montado com o nome deles** (HTML estático gerado do brief que eles escreveram no Studio — o texto está em `dfy_order_paid`/prompt salvo): a "isca é o filme pronto sobre o tema que a pessoa já fez", não crédito.
2. **Todo anúncio renderizado vira post da casa**: "este anúncio de restaurante foi feito de 6 fotos e 40 palavras em usekineo.com" — o produto é a demo do produto.
3. **Semana 2 = degrau Pro por foto (Seedance 1.5 i2v, US$0,13/cena)** só para imóvel/produto sem gente — o único lugar onde cena gerada é segura para o rótulo da Meta.

✅ O QUE VOCÊ PRECISA FAZER
1. Decidir o nome (Studio Ads / Kineo Ads) e a opção de preço (a) passe ou (c) por anúncio, com o número — o código sobe com `ADS_PASS_LIVE=false` até você dizer.
2. Decidir onde fica o paywall: antes do upload de fotos ou antes do Render (recomendo antes do Render, com cota de rascunho de 30 MB).
3. Dizer se libera "vai" nominal na trava 8.2 para 3 itens (piso 20s, legenda fora da banda de Reels, vídeo do cliente com áudio) — sem "vai", copy honesta.
4. Escrever/aprovar a frase de consentimento de rosto/voz para a semana 2 (não entra no dia 1).
5. Às 18h do dia 25: clicar `SUBIR-SITE.bat` quando eu avisar "hora de clicar", e rodar um render de canário na sua conta pelo `/studio?mode=ad`.

📋 O QUE ACONTECEU
Desenhei o Studio Ads como modo dentro do Studio, feito só com peças que já estão no ar: upload My footage, Kineo 1 priorizando a mídia da cliente, MiniMax, Lyria, Creatomate e o checkout one-time. O que é novo cabe em um dia: tabela de brief, 8 moldes de roteiro de anúncio, camada de logo + cartão final aplicada fora da trava, SKU de acesso com coluna própria, 16 eventos nomeados e 7 guardiões. Fica claro na copy o que não sai no dia 1 (avatar, voz clonada, 1:1, URL, 15s). Preço e paywall são seus; o restante entrego pronto.

## day_schedule
25/09/2026 (quinta) — duas pistas, blocos de 2h, horário BRT. Claude = servidor/fluxo/cobrança/eventos/guardiões; Codex = visual das telas (HTML antes/depois em toda entrega, AGENTS.md §8). Worktrees limpas, tsc com junction de node_modules, transporte seguro via enfileirar.sh; nunca push direto.

08:00-10:00
· CLAUDE B1 — worktree limpa + tsc verde na base; migration `profiles.ads_access_until` + tabela `ad_briefs` (aplicar via Supabase, conferir a coluna existe antes de qualquer SKU); `lib/ads/{events,access,models,brandLayer}.ts` puros + guardiões 1-3; SKU `ads_pass` em checkoutPricing atrás de `ADS_PASS_LIVE=false` com valor placeholder fora da lista ocupada; esqueleto `components/ads/AdModePanel.tsx` montado em 1 linha no cockpit (ao lado do DfyOfferCard) para o Codex assumir.
· CODEX C1 — HTML estático "antes/depois" do cockpit com interruptor Short·Ad e das 6 telas (brief, mídia, modelo, roteiro, prévia+portão, entrega), celular e desktop; copy honesta (o que não faz no dia 1) já no mock.

10:00-12:00
· CLAUDE B2 — webhook Path A: ramo `metadata.pack==='ads_pass'` (crédito + `ads_access_until` + `ads_pass_granted`); `buildAdsPassAndRedirect` (padrão bulk, resume/login, success_url → /studio?mode=ad); portão do footage com cota de rascunho 30 MB (se decidido); rotas `POST /api/ads/brief`, `POST /api/ads/script` (3 ângulos, molde por modelo, evento `_served`), `GET /api/ads/brief/:id`.
· CODEX C2 — AdModePanel passos 1-2: formulário de brief (6 campos, validação, idioma) e mídia (upload via /api/footage, grade ordenável, slot de logo PNG, avisos de formato/50 MB).

12:00-14:00
· CLAUDE B3 — `POST /api/ads/dispatch` (acesso + crédito + scene_plan por scene_id); hook `useAdBrief` no GenerateClient (1 import, 3 pontos); `applyBrandLayer` no `/api/render` antes do POST à Creatomate; guardiões 4-7; dry-run US$0 do plano.
· CODEX C3 — passos 3-4: 8 cards de modelo (duração, entradas mínimas, bloqueio quando falta mídia) e tela de roteiro (3 ângulos, edição linha a linha, contador de palavras contra a régua).

14:00-16:00
· CLAUDE B4 — canário REAL na conta do fundador (Kineo 1, 35s, 3cr): 5 fotos + logo + cartão final; conferir em 1080x1920 legibilidade do cartão, logo fora da banda de 14%, duração inalterada, `ads_*` gravados; ajustar a camada; segundo canário em 60s.
· CODEX C4 — passo 5: prévia (storyboard cena→foto→frase, cartão final em HTML com logo/dados reais, botão de ouvir 1 frase) e os 3 estados do botão (Render N créditos / Liberar Studio Ads / Sem crédito → top-up).

16:00-18:00
· CLAUDE B5 — `/api/ads/voice-preview` (MiniMax, ≤160 chars, 3 por brief, sem débito); eventos ponta a ponta; suíte inteira (~4 min) e comparação com baseline; commit; `git fetch` de novo; enfileirar; reconferir guardiões na ponta da fila; avisar o fundador "hora de clicar".
· CODEX C5 — passo 6-7: tela de entrega (player, download, "pedir ajuste" com motivo, "outra versão", upsell Express/Pro), responsivo; HTML antes/depois final anexado ao pedido entre pistas.

18:00-20:00
· CLAUDE B6 — pós-deploy: sonda com UA identificável nas rotas novas (401 com controle 404 irmão); canário em produção pelo /studio?mode=ad; SQL do funil zero (pessoas, não eventos); se `ADS_PASS_LIVE` já tiver preço do fundador, testar checkout real de US$ mínimo e estorno.
· CODEX C6 — revisão visual em produção (cockpit, painel, entrega) em celular e desktop; ajustes de copy e de estado vazio.

20:00-22:00
· CLAUDE B7 — reserva para incidente; `docs/STUDIO-ADS-2026-09-25.md` (decisões do dia viram arquivo no mesmo dia); rascunho no Gmail para os 11 leads com o deep link e o cartão final montado com o nome deles (envio só no dia 26 após 1º render limpo); atualizar CLAUDE.md com o estado.
· CODEX C7 — reserva; backlog visual da semana 2 (1:1/16:9, variantes de gancho, humor musical comercial) em PEDIDOS-ENTRE-PISTAS.

## decisions
- Nome do produto: 'Studio Ads', 'Kineo Ads' ou 'Kineo for Business' (o nome vai na copy, no cartão do cockpit e no SKU da Stripe).
- Modelo de acesso e preço público: (a) passe único 'paga para entrar' — ex. US$19+60cr ou US$29+100cr (margem 58-68%) — ou (c) por anúncio — ex. US$9 com 12cr (≈80%). Plano mensal 'Business' fica para depois do congelamento de 09/10. O valor em centavos não pode ser 900/1900/2900? (2900 está livre; 900 e 1900 colidem). Código sobe desligado até o número dele.
- Onde fica o paywall: antes do upload de fotos/logo ou antes do botão Render (recomendação: antes do Render, com cota de rascunho de 30 MB para foto+logo; é a mudança de ~10 linhas no portão do footage).
- Degraus do dia 1: só Kineo 1 (3-5cr, mídia real, sem rótulo de IA) — confirmar; Seedance/Kling i2v nas fotos entra como 'Pro' na semana 2 com preço dele.
- Trava 8.2: liberar 'vai' nominal para (1) piso de duração 20s no roteiro próprio, (2) legendas fora da banda de 35% da UI de Reels, (3) vídeo do cliente com áudio original baixo — ou aceitar copy honesta no dia 1.
- Consentimento de rosto e voz (semana 2): aprovar a frase do atestado ('sou eu ou tenho autorização por escrito'), a recusa de nomes públicos e o aviso 'Made with AI' quando houver apresentador gerado.
- Duas faixas de preço: por DEGRAU (recomendado, como o balcão Express/Pro) e não por PAÍS (V6 morreu em 19/08); moeda local pelo Adaptive Pricing da Stripe — confirmar.
- E-mail aos 11 leads históricos (5 Índia, 1 Nigéria, 5 EUA/EU/Jordânia): sai no dia 26 após o 1º render limpo em produção, com o cartão final montado com o nome deles — aprovar o rascunho no Gmail.
- Marca d'água em render do modo Ad: nunca (é anúncio pago do cliente) — confirmar; e se o render com crédito do passe conta como 'primeiro vídeo' no placar de ativação.

## risks
- Trava 8.2 cerca três defeitos visíveis ao anunciante: legendas dentro da banda de 35% da UI de Reels Ads (lib/compose), vídeo do cliente sempre mudo (volume 0% em lib/compose.ts:2331-2346) e piso de 35s para roteiro próprio (generate-video-fast/route.ts:948). Sem 'vai' nominal, só copy honesta cobre.
- GenerateClient.tsx tem 22.656 linhas e o hook do modo Ad toca 3 pontos num fluxo com cortina + autoanalyze; memória 'cortina prende quem volta a idle' — precisa do guardião 7 e de canário real, não só tsc.
- Coluna ads_access_until precisa existir ANTES do SKU ligar (lição do piloto Autopilot: webhook loga NOT GRANTED e a pessoa paga sem receber). Env nova só vale em deploy novo.
- Valor em centavos do SKU: 900 e 1900 já são resolvidos por valor no webhook (legado / bulk10); colisão faz o passe ser lido como outro pacote.
- MOV HEVC/HDR de iPhone nunca foi testado na Creatomate e arquivo >50 MB não sobe (4K de 90s estoura); sem ffmpeg no servidor não há validação de codec/duração antes do render.
- Creatomate: ~20% da cota mensal em 24h; dezenas de anúncios de 60s (37cr cada) num dia batem no teto — vigiar creatomateQuota.
- Kineo 1 híbrido pode gerar still FLUX (imagem de IA) numa cena sem cobertura; anúncio com imagem gerada pode ser rotulado pela Meta — moldes exigem mídia do cliente nas cenas de solução.
- Guardião de margem usa FAST_USD_PER_CREDIT=0.066 (velho; medido 0.126 em 21/09) — qualquer margem 'verde' do SKU calculada por worstCaseCogsUsd sai otimista.
- Promessa maior que o produto: 'centenas de formatos', avatar, voz clonada e 1:1/16:9 não rodam no dia 1; Icon.com morreu prometendo isso. A copy do painel lista o que não faz.
- Suporte: um comprador de US$9 exige a mesma resposta em ≤24h que um de US$49 (lição do SLA de 24/08); ads_issue_reported precisa de leitura diária.
- Consentimento de material com terceiros (funcionários/clientes nas fotos) é declarado pela cliente nos termos; não há verificação técnica possível.
- Mapeamento posicional de footage no GenerateClient (selectedFootage[sceneIdx]) vs mapeamento por scene_id do brief — se o hook não montar o array na ordem do plano, a foto do 'antes' cai na cena do 'depois'.
