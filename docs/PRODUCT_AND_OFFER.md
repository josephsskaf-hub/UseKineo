# PRODUCT_AND_OFFER.md — Preço real, promessa permitida, promessa quebrada

**Data:** 2026-07-27 · **Base:** commit `a517879`

---

## 1. FONTE ÚNICA DE PREÇO

**`lib/checkoutPricing.ts`.** Nenhuma outra. `checkPricingInvariants()` (`lib/checkoutPricing.ts:236`) protege esses valores — mas **não alcança string literal em JSX**.

| SKU | USD | Créditos | Linha |
|---|---:|---:|---|
| Free | $0 | 3 vídeos Fast/24h, com watermark | — |
| Starter mensal | **$9,90** | 25 | `:21-25, :131` |
| Creator mensal | **$24,90** | 150 | `:21-25, :132` |
| Studio mensal | **$37,90** | 200 | `:21-25, :133` |
| **Autopilot mensal** | **$299,00** | 400 | `:33, :134` |
| **Piloto Autopilot** (one-time, 7 dias) | **$99,00** | 60 | `:57, :72` |
| Intro 1º mês Starter / Creator | $4,90 / $9,90 | 25 / 50 | `:96-99, :146-149` |
| Anual Starter / Creator / Studio | $99 / $199 / $379 | — | `:88-92` |
| Pack starter | $4,90 | 30 | `:157-162` |
| Pack starter290 (**desligado**) | $2,90 | 20 | `lib/flags.ts:13` |
| Top-up 40 / 120 | $5,90 / $12,90 | 30 / 65 | `:178-181, :291-294` |

**Moedas suportadas no checkout:** USD, BRL, INR (`lib/checkoutPricing.ts:21-25`).

### 1.1 Preço da tela == preço cobrado?
**Sim em `/pricing`** — `app/pricing/PricingClient.tsx:19-34` importa direto da fonte.

**Risco residual (SUGESTÃO, não defeito hoje):** as páginas de aquisição repetem preço como **string literal**: `KineoLanding.tsx:386-404`, `faceless-video-generator/page.tsx:37,234`, `from-saashub/page.tsx:90,101`, `best-ai-shorts-generators/page.tsx:67,185`. Conferidas uma a uma em 27/07 — **todas coincidem hoje**. Mas é exatamente o padrão que produziu três vazamentos anteriores.

### 1.2 ⚠️ CONTRADIÇÃO — quatro fontes de preço
| Fonte | Afirma | Veredito |
|---|---|---|
| `lib/checkoutPricing.ts` / `lib/pricing.ts` | tabela acima | ✅ **correta** |
| `HANDOFF-13-06-2026.md:54` | "packs $11.90/29.90/79.90" | histórico, ignorar |
| `app/api/admin/ceo/route.ts:18-19` | `PRO_PRICE = 9.90`, `BASIC_PRICE = 4.90` | ❌ **errado e vivo** — ver `METRICS_AND_FUNNEL.md` §painel |
| `GOOGLE-ADS-PLAN.md` (17/05) | "Basic R$25/mo, Pro R$50/mo" | obsoleto, marca velha |

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
