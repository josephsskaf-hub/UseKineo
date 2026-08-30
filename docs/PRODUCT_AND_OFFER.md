# PRODUCT_AND_OFFER.md — Preço real, promessa permitida, promessa quebrada

**Data:** 2026-08-30 · **Base conferida:** commit `e7ce42ed`

---

## 1. FONTE ÚNICA DE PREÇO

**`lib/checkoutPricing.ts`.** Nenhuma outra. `checkPricingInvariants()` protege os SKUs e a escada econômica; `lib/marketingPrice.ts` é a camada derivada para copy pública. O código vence este documento sempre que houver divergência.

| SKU | USD | Créditos | Linha |
|---|---:|---:|---|
| Trial de nova conta | $0 | **25 créditos**, todos os motores desbloqueados; filmes com watermark | `lib/freeTierOffer.ts:150,230-240` |
| Acesso gratuito recorrente | $0 | **1 Kineo 1 por janela de 720h**, sem grant de créditos | `lib/kineoFacts.ts:408-485` |
| Starter mensal | **$7,00** | **40** | `lib/checkoutPricing.ts:94-98,324-375` |
| Creator mensal | **$15,00** | **90** | `lib/checkoutPricing.ts:94-98,324-375` |
| Studio mensal | **$29,00** | **180** | `lib/checkoutPricing.ts:94-98,324-375` |
| **Autopilot mensal** | **$299,00** | **400** | `lib/checkoutPricing.ts:100-103,324-376` |
| **Piloto Autopilot** (one-time, 7 dias) | **$99,00** | **60** | `lib/checkoutPricing.ts:120-140` |
| Intro 1º mês Starter / Creator | **não existe desconto ativo**; preço e grant iguais ao mensal | 40 / 90 | `lib/checkoutPricing.ts:166-178,387-397` |
| Anual Starter / Creator / Studio | **$70 / $150 / $290** | grant mensal do plano | `lib/checkoutPricing.ts:159-164` |
| Pack starter | **$4,90** | **30** | `lib/checkoutPricing.ts:411-430` |
| Pack starter290 (**desligado**) | **$2,90** | **25** | `lib/checkoutPricing.ts:413-414`; `lib/flags.ts:7` |
| Top-up `40` / `120` / `100` / `300` | **$5,90 / $12,90 / $14,90 / $49,90** | **30 / 65 / 75 / 300** | `lib/checkoutPricing.ts:446-476,903-915` |

**Moeda suportada no checkout:** somente USD (`CheckoutCurrency = 'usd'`, `lib/checkoutPricing.ts:17-90`). A escolha é global e deliberada; não existe preço regional ativo.

### 1.1 Preço da tela == preço cobrado?
**FATO CONFIRMADO (30/08/2026):** `/pricing` usa a fonte canônica. A home importa `TIER_PRICES`/`TIER_CREDITS`, e as páginas de aquisição auditadas usam `lib/marketingPrice.ts`. Comentários históricos ainda citam tabelas antigas, mas não governam a UI nem a Stripe. Não transformar esta verificação pontual em afirmação de que todo o repositório está livre de literal.

### 1.2 ⚠️ CONTRADIÇÃO — quatro fontes de preço
| Fonte | Afirma | Veredito |
|---|---|---|
| `lib/checkoutPricing.ts` | tabela acima | ✅ **correta e server-authoritative** |
| `HANDOFF-13-06-2026.md:54` | "packs $11.90/29.90/79.90" | histórico, ignorar |
| `GOOGLE-ADS-PLAN.md` (17/05) | "Basic R$25/mo, Pro R$50/mo" | obsoleto, marca velha |
| versão anterior deste documento | "$9.90 / $24.90 / $37.90" e "25 / 150 / 200" | ❌ corrigida em 30/08; não correspondia mais ao código nem à cobrança live |

---

## 1.3 PACOTES DE ATACADO — APROVADOS 27/07/2026

Decisão do fundador registrada em `DECISIONS.md`. **Escopo: engine Fast apenas.**

| Pacote | Preço | Por vídeo | Custo real | Margem |
|---|---:|---:|---:|---:|
| 10 vídeos | **$99** | $9,90 | $0,50 | ~96% |
| 20 vídeos | **$179** | $8,95 | $1,00 | ~96% |
| 30 vídeos | **$249** | $8,30 | $1,50 | ~96% |
| 50 vídeos | **$379** | $7,58 | $2,50 | ~96% |

Base do custo: `lib/credits/engineCost.ts:32-35` — Fast custa **~$0,02–0,05 para servir**.

**Onde essa compra já acontece (pesquisa de 27/07/2026):** marketplace, não agência. Fiverr, Upwork e Kwork transacionam pacotes de 10–500 Shorts faceless hoje, com preço público de $5–35. A faixa praticada por editor humano é **$5–20/Short (iniciante)** e **$30–60 (premium)**, vendida em bundles de 20/35/60 por mês. **A escada da Kineo a $7,58–$9,90 cai dentro da faixa iniciante** — pela primeira vez o preço coincide com um mercado que já transaciona.

Margem no marketplace, já com a comissão de 20% do Fiverr: pacote de 30 rende **$197,70 líquido, 99,2%**. A comissão custa $42 e entrega demanda pré-qualificada, tráfego e **escrow** — que resolve o problema de confiança de uma marca desconhecida cobrando $249.

### 1.3.1 Licença dos insumos — verificado 27/07/2026

| Insumo | Situação |
|---|---|
| **B-roll** | Pexels / Pixabay — licença comercial. ✅ |
| **TTS dos pacotes Fast** | **OpenAI `tts-1` / `tts-1-hd`.** `.env.local.example` declara só `OPENAI_API_KEY`; nenhuma variável de ElevenLabs. Pelos termos da OpenAI, o cliente detém a saída e o uso comercial é permitido, com a exigência de divulgar que a voz é gerada por IA — coberta pela divulgação já escrita no anúncio. ✅ |
| **ElevenLabs** | **Não alcança os pacotes.** `lib/narration/elevenlabs.ts:5-9` só ativa com `ELEVENLABS_API_KEY` **e** `KINEO_ELEVENLABS_ENABLED` **e** tier `premium` ou `cinematic`. Os pacotes são **Fast** — logo o caminho é sempre OpenAI, com fail-open para `tts-1-hd`. |

⚠️ Não é parecer jurídico. Se um dia os pacotes passarem a usar tier premium/cinematic, a licença do ElevenLabs volta à mesa — o tier gratuito dele **não** permite uso comercial.

---

## 2. PROMESSA PERMITIDA — o que o produto comprovadamente entrega

✅ Até **3 vídeos Fast com watermark a cada 24h, sem cartão**
✅ Roteiro + voiceover + B-roll + legendas queimadas, 9:16, automático
✅ MP4 **sem watermark** em plano pago
✅ Render Fast em **2–4 minutos** — mediana medida 2,30 min, p90 3,50 (n=12, 7d encerrando 23/07/2026)
✅ **Crédito devolvido automaticamente** quando o render falha
✅ Ancoragem de agência: $299/mês por ~30 Shorts = **$9,97/Short** vs VidChops $30,94 e Tasty Edits $80,00 (`lib/comparisons.ts`)

⚠️ A latência publicada em `/facts` e `/llms.txt` vem de **n=12, janela encerrada em 23/07**. Reconferir antes de continuar publicando — ver `OPEN_QUESTIONS.md` Q10.

---

## 3. 🔴 PROMESSAS QUE O PRODUTO NÃO CUMPRE

### 3.1 A promessa central do Autopilot esteve 0% entregável até 26/07
`app/pricing/PricingClient.tsx:88` diz *"You connect your YouTube channel once…"*. Contra: `channels = 0 linhas` e 0 eventos `youtube_*` (`push_103_msg.txt`).

O #103 corrigiu o OAuth, mas **não existe nenhuma conexão bem-sucedida comprovada depois do fix**.

> **Vender o piloto de $99 antes de provar 1 conexão + 7 publicações reais é vender promessa não verificada. É a maior exposição comercial da empresa hoje.**

### 3.2 `EMAIL-HOT-LEAD.md` contém uma falsidade ativa
Afirma *"Your first AI video is free, no credits needed"*. O motor de IA mais barato custa **20 créditos** e o free tier concede **zero** créditos (`lib/checkoutPricing.ts:152-155`). O template também usa marca e remetente velhos.

**Não deve ser usado como está.**

### 3.3 Docs de marketing obsoletos
- `GOOGLE-ADS-PLAN.md` — 17–18/05/2026, R$100 total, preços e marca que não existem mais, exclui o Brasil enquanto o checkout tem BRL nativo.
- `V2_PRODUCT_PLAN.md` — descreve o protótipo `/v2`, que **não existe** no código. Custos e motores todos diferentes dos atuais.

---

## 4. O QUE FALTA CONSTRUIR NO `/revive`

O canal está **construído da metade para a frente**. `app/api/revive/route.ts:4` menciona *"o scanner semanal (200 canais/semana)"* — **esse scanner não existe no repositório**.

Não existe: coletor de prospects · renderizador dos 3 vídeos por prospect · enviador de e-mail · lista de supressão.
Existe: a página, a rota de escrita, e uma migration **não aplicada** que deixa tudo respondendo "temporarily unavailable".
