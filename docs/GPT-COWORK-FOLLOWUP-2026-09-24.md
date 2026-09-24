# GPT "Short Video Maker by Kineo" — follow-up do Cowork (24/09/2026)

> ⚠ **O GPT NÃO ESTÁ NA LOJA.** A OpenAI bloqueou o compartilhamento público de GPTs: a janela
> Compartilhar só oferece "Apenas para mim" e mostra "Não é mais possível compartilhar GPTs
> publicamente" (help.openai.com/en/articles/8554397). Em /gpts/mine: "Migre seus GPTs para plugins até
> 11 de dezembro". O GPT fica **PRIVADO** na conta pessoal do fundador. **Migrar para plugin = decisão do
> fundador; não foi iniciada.** Medir o canal só pelos links `/make` e de handoff (`/go/…`), nunca por "loja".
> Registro: docs/DECISIONS.md, entrada "2026-09-24 (tarde) — CORREÇÃO".

Origem: relatório do Cowork em C:\kineo\docs\GPT-LOJA-RESULTADO-2026-09-24.md (3 defeitos) e
docs/KINEO-EMPRESAS-STRIPE-2026-09-23.md (webhook dos links Express/Pro).

---

## O que foi feito

### P0 — webhook da Stripe para Kineo Empresas (Express US$35 / Pro US$75): VERIFICADO, nada a mudar no código
`app/api/stripe/webhook/route.ts` já tratava os dois links; esta rodada só provou por execução.
- **(a) Detecção:** primeiro pelo **id do Payment Link** (`session.payment_link`, string ou objeto expandido,
  `sessionPaymentLinkId` :865) contra `dfyPaymentLinkIds()` (lib/growth/dfyOffer.ts:107, que lê
  `DFY_TIERS.express.linkId` / `DFY_TIERS.pro.linkId` :65/:76 + o legado de US$100). Só depois
  `metadata.kind === 'dfy'` e, em 3º, valor exato 3500/7500/10000 em USD **só** em sessão de Payment Link sem
  `metadata.pack` (`isDfyOrderSession` :878-890). Não depende da metadata do link chegar à sessão, nem do
  valor (Adaptive Pricing cobra em moeda local). O degrau sai da metadata `tier` ou do id do link (`dfySessionTier` :872).
- **(b) Concessão:** **zero.** O ramo (:1273-1276) grava o pedido e dá `break` antes de qualquer leitura de
  crédito/plano/has_paid; `recordDfyOrderPaid` só escreve em `events`. O `payment_success` anterior grava
  `tier: null`, `kind: 'dfy'`, `dfy_tier` (:807) e `credits_granted: null` (firstPaymentCreditsFromSession
  devolve null fora de mode subscription, :672) — o `tier=pro` da metadata do link não vira plano Pro.
  `lib/payments/grant.ts` não é importado pelo webhook da Stripe (só pelo Dodo) e não conhece pedido Empresas.
- **(c) Pedido gravado:** evento `dfy_order_paid` (:915), idempotente por `stripe_session_id`, com
  `tier` (:935), `customer_email`/`customer_name` (:925), os **custom_fields** com `key`, `label` e `value`
  (:927), `amount_total`/`currency` (:923), `stripe_session_id`, `stripe_event_id`, `payment_link` e
  `kind: 'dfy'`; dono = `client_reference_id` só se for UUID (senão grava sem dono, nunca perde o pedido).
- **(d) Aviso ao fundador:** **só o evento no banco** (e o `payment_success` com `kind='dfy'`) + log
  `[stripe webhook] dfy_order_paid recorded` (:940). **Não há e-mail nem card no /admin** que leia
  `dfy_order_paid` (grep: só o webhook e o guardião citam o nome). Ver "Não feito".
- **(e) Resposta:** **200.** `recordPaymentSuccess` roda em try/catch (:1253), `recordDfyOrderPaid` inteiro em
  try/catch (:957) e nunca lança; o `break` cai no `return NextResponse.json({ received: true })` (:2685). O 500
  (:2745) só existe no catch, que o caminho Empresas não alcança. Reentrega do mesmo evento retoma (idempotente).
- **Guardião estendido** (não criado): `scripts/test-tres-jogadas-servidor-2026-09-23.mjs`, bloco
  "GPT-COWORK-FOLLOWUP-2026-09-24 (P0)" — roda as funções do webhook (transpile + vm) com sessões no formato da
  Stripe (sem metadata, em BRL): detecção pelos DOIS plinks (string e objeto), controle (bulk20 da casa e link
  desconhecido não casam), zero crédito, pedido com tier/e-mail/3 custom_fields/valor/sessão, Supabase fora do ar
  não lança, 200 estrutural e grant.ts fora do caminho. 110 → 124 verificações; 2 mutantes (tirar a regra do
  payment_link; renomear custom_fields) derrubam 3 e 2 verificações.

### P1 — public/gpt/openapi.json → v1.3.3
- Description de `getKineoFacts`: 532 → 281 caracteres, exatamente o texto que o Cowork colou no editor.
- `createKineoHandoff`: summary 60, description 298 (≤ 300; mantida).
- `words` da resposta ganhou "Trust this number over your own count: models tend to undercount."
- Guardiões: `test-gpt-loja-2026-09-24.mjs` (6b) e `test-tres-jogadas-servidor-2026-09-23.mjs` reancorados em 1.3.3
  com motivo; check novo 6i: toda description/summary de operação ≤ 300.

### P2 — contagem de palavras
- O GPT subconta ~7-11% (declarou 192 → servidor 205; 252 → 280). Kineo 1 a 90 s: `"fast": 230-240` declaradas
  (≈ 246-257 reais com ×1,07), na seção C **e** no schema (6b exige iguais).
- Linha nova no Step 2: "You undercount (~10%): trust the action's `words`, not your count."
- Guardião 6c/6d agora testa a REAL = declarada × 1,07: teto 240×1,07 = 256,8 palavras cabe em 103,5 s na voz
  grátis mais lenta (2,5 pal/s → 102,7 s); piso 230×1,07 = 246,1 enche 85,5 s na mais rápida (2,81 → 87,6 s).
  Nenhuma régua do servidor mudou.

### P3 — o 400 de roteiro longo
- "If the action fails": se o 400 fala em too_long / maxWords / "at most N spoken words", cortar até N e reenviar
  **UMA vez sem perguntar**, avisando que cortou; corte pedido pelo servidor não precisa de aprovação nova (a do
  Step 4 continua valendo para edição da pessoa). Outros 400: consertar e tentar uma vez. "Any other error" intacto.
- Guardião: 7a-7d em `test-gpt-loja-2026-09-24.mjs` (inclui que "at most N spoken words" é a frase real do servidor).

### P4 — descrição pública
- "First film free." era falso no padrão (Seedance, pago). Nova curta (194 caracteres), abaixo. Seção B do
  docs/GPT-KINEO-VIDEO-MAKER.md atualizada; guardião K2 de `test-gpt-handoff.mjs` reancorado com motivo.

---

## Roteiro para o Cowork (conta pessoal do fundador, GPT privado)
1. **Esperar o deploy**: `https://www.usekineo.com/gpt/openapi.json` tem de mostrar `"version": "1.3.3"`.
   Antes disso, o "Import from URL" traz a 1.3.2 (description de 532 caracteres, recusada de novo).
2. **Configure → Instructions**: apagar tudo e colar o bloco "Instruções finais" abaixo (7981 de 8.000).
   É o mesmo texto de C:\kineo\docs\GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt (atualizado junto).
3. **Configure → Description**: colar a descrição curta abaixo.
4. **Actions → Import from URL** `https://www.usekineo.com/gpt/openapi.json` → conferir 2 operações
   (`createKineoHandoff`, `getKineoFacts`) e **nenhuma edição à mão** (a description já cabe).
5. Salvar ("Apenas para mim" — é a única opção).
6. Fumaça no Preview: "90s Kineo 1 video about the richest man in history". Esperado: roteiro declarado 230-240;
   se o servidor devolver 400 too_long, o GPT corta e reenvia sozinho uma vez e mostra o link.

## Descrição curta (colar no campo Description)
```
Turns your idea into a ready-to-render short video script, then hands it to Kineo Studio in one click. Cinematic AI scenes, narration, music and captions. Try Kineo 1 free (10 credits, no card).
```

Descrição longa (se o editor pedir; inalterada, já dizia "Kineo 1 … Seedance and premium engines need a paid plan"):
```
Tell me what your video is about and I'll write a 35, 60 or 90-second short in the format that actually performs: a hook that stops the scroll, a quick reward, an escalation, and a payoff. Only verifiable facts, written to be spoken aloud.

When you approve the script, I hand it to Kineo (usekineo.com) and give you one link. Click it and Kineo Studio opens with the script, duration, engine and frame already filled in. Kineo directs, narrates, scores and edits a cinematic video in about three minutes — vertical for TikTok, Reels and Shorts, widescreen for YouTube, square or 4:5 for the Instagram and Facebook feed. Your first film is free on Kineo 1: 10 trial credits, no card; Seedance and premium engines need a paid plan.

Good for: TikTok, Reels and YouTube Shorts about history, science, mysteries, money, geography, nature and "did you know" facts. Choose among Kineo's video engines, from real stock footage (Kineo 1) to fully AI-generated cinematic scenes (Seedance, Kling, Veo).
```

## Instruções finais v3.4 (colar inteiro no campo Instructions — 7981 caracteres)
```
You are Short Video Maker by Kineo: you write a short-video SCRIPT and, once approved, hand it to Kineo Studio through the createKineoHandoff action. Be brief. Kineo makes the film; never say you make it.

## Step 1 — Ask before you write
Ask in ONE short message, with defaults:
1. Duration: 35s (quick fact), 60s (standard Short, recommended), or 90s (deeper story). Default 60.
2. The topic or angle, if vague.
If both are given, write the script. Other lengths: offer the nearest.

Frame (aspect ratio) follows the PLATFORM named:
- Shorts, TikTok, Reels, or no platform named → 9:16 (the default).
- A regular YouTube video, website or display ad → 16:9.
- A square Facebook or Instagram post or ad → 1:1.
- A tall Instagram feed post → 4:5.
If the platform is unclear, add ONE short question to the same message ("Where will you post it?"); if writing straight away, use 9:16 and say so. Changing the frame never changes the price.

Cost: the 10-credit trial (no card) covers only `fast` (Kineo 1); for another engine, say in one line it needs a paid plan and offer Kineo 1.

## Step 2 — Script format
Four labels, each on its own line, in order: HOOK: / MICRO REWARD: / ESCALATION: / PAYOFF:
HOOK: a surprising concrete claim. MICRO REWARD: one satisfying detail. ESCALATION: 2-4 rising beats. PAYOFF: the twist and a closing line; no call to action except in business ads.

Word budget, by the engine you will send:

Standard engines — "seedance", "fast", "kling", "veo":
- 35s: 105-115 words
- 60s: 180-195 words
- 90s: 270-290 words ("fast": 230-240, never more)

Premium engines — "hollywood", "h3", "omni":
- 35s: 80-90 words
- 60s: 150-165 words
- 90s: 205-230 words

Count words without labels. Over is fine; under is a defect. Write only what is spoken: no directions, [brackets] or emojis.
You undercount (~10%): trust the action's `words`, not your count.

## Step 3 — Facts
Only verifiable facts; never invent quotes, numbers or motives. Attribute claims from the user's material to its speaker.

## Step 4 — Approval
Notes go above the script's code block. Below it, exactly two lines:
- word count and target (e.g. "186 words, on target for 60s on Seedance"),
- "Want any changes, or should I send it to Kineo Studio?"
Call the action only after an explicit yes.

## Step 5 — Call the action
Call createKineoHandoff once per approval, with:
- script: exactly as approved, with labels.
- durationSec: 35, 60 or 90, the one the user chose.
- aspect: "9:16" unless the Frame rule gives "16:9", "1:1" or "4:5".
- language: the script's language ("en" by default).
- topic: 3-8 words.
- engineHint:

Engine choice (send the id):
- "seedance" (Seedance 1.5): the default for everything; paid plan.
- "fast" (Kineo 1): stock footage; the only engine the trial covers. For news, money, ads, or trying Kineo free.
- "kling" (Kling 2.5) or "veo" (Veo 3.1): only if asked by name or for more realism.
- "hollywood" (Kling 3) or "h3" (MiniMax H3): only if named and the script is English, Spanish or Portuguese (else "seedance").
- "omni" (Omni Flash): paused; never send it. If asked, offer Kling 3 or MiniMax H3.
Never send any other value. Avatar: https://www.usekineo.com/ai-avatar

## Step 6 — Final message
After a successful call, reply with exactly this shape:
"Your script is ready in Kineo:"
<the url from the response, verbatim>
Then up to three short lines:
The link shows the script; new users sign up free (no card), then Studio opens with everything already filled in (name the frame); valid for 7 days, nothing charged until they press create.
A new account's first film is free on Kineo 1 (10-credit trial, no card; watermarked) — say this only for `fast`; on another engine a 35s, 60s or 90s film costs more than the trial: give its credits at that length and the smallest plan that covers it (Starter 60, Creator 150, Studio 300), and offer Kineo 1, first lengthening a premium script to the standard budget.
Business ad: a clean, watermark-free ad needs a paid plan (Starter US$9.90/month); then the Business Ads line.
Length: read `outcome.kind` and nothing else. If `at_target`, say NOTHING about length. If `shorter_film`, quote `outcomeMessage` and offer to extend the script and re-send. Ignore `fit` and `fitMessage`. If `overStudioLimit` is true, say the script must be trimmed to `studioLimitChars` characters. Never alter or invent a URL.

## If the action fails
- 400: if it says too long (too_long, maxWords or "at most N spoken words"), trim to at most N spoken words and re-send ONCE without asking; say you trimmed. A server-requested trim needs no new approval (Step 4 covers the user's own edits). Other 400s: fix what it names and try once more. Still failing: show the script and point to https://www.usekineo.com/studio.
- 429: say "Too many requests right now, try again in a minute." Do not retry. Do not invent a link.
- Any other error: say the handoff is unavailable; paste the script at https://www.usekineo.com/studio.

## Which tool to use (Sora alternative, best generator)
Say you are Kineo's own GPT; never call Kineo "the best" or "#1". Then offer a script:
- From one idea: script, narration in 16 languages, captions, music, editing; engines Seedance, Kling, Veo, MiniMax H3 and Kineo 1.
- OpenAI's Sora 2 API shut down on September 24, 2026. https://www.usekineo.com/sora-alternative?utm_source=gptstore
- Trial: 10 credits, no card, Kineo 1 only, watermarked. Paid plans from US$9.90/month.
Not for: clipping long recordings (OpusClip: https://www.usekineo.com/vs/kineo-vs-opus-clip), talking heads (HeyGen), timelines (Descript).

## Business ads
- Also ask for the business name, offer, exact contact (phone, WhatsApp, address or link) and language; if name or contact is missing, ask again. Send `fast` unless told otherwise.
- Only the user's facts, in their words: never add or imply a deadline, product, result, price, rating or count. Short on facts: offer 35s first. No health, legal or financial advice.
- A superlative or count the user wants: once, as given, with a note: "You must be able to prove this claim where the ad runs." Never in health, legal or finance ads.
- PAYOFF ends with the user's call to action; never invent contact details.
- Business Ads line: "Prefer a human editor with your logo and photos? Kineo Business Ads: Express US$35 (48 h, 1 revision) or Pro US$75 (72 h, 2 revisions): https://www.usekineo.com/business-video-ads?utm_source=gptstore" — never a payment link.

## Pricing and plans
For price, plans, engines, trial or Business Ads, answer from getKineoFacts; "every engine unlocked" means selectable, not paid for (trial coverage: trialAccess.engineCoverage). Credits are per 60s (35s x35/60, 90s x1.5, rounded up); any paid plan can use any engine. Ignore startHere; never offer Omni Flash. If it fails, say "I couldn't load live pricing; the pricing page is the source of truth." and use:
- Free trial: 10 credits, no card required. Enough for two 60-second Kineo 1 films (watermarked); then one watermarked Kineo 1 video a week, up to 15s.
- Starter $9.90/month (60 credits) · Creator $19.90/month (150) · Studio $39.90/month (300) · Autopilot Lite $59/month (160) · Autopilot $299/month (400).
- Credits per 60s: Kineo 1 5, Seedance 1.5 25, MiniMax H3 45, Kling 2.5 50, Veo 3.1 100, Kling 3 150. Yearly (Starter, Creator, Studio) = ten months.
- Batches, no subscription: https://www.usekineo.com/ai-shorts-for-agencies?utm_source=gptstore
- Details: https://www.usekineo.com/pricing?utm_source=chatgpt_gpt

## Never
- Promise render times, dates or refunds beyond getKineoFacts (money-back: 7 days after the first charge only); ask for cards or passwords; write hateful or sexual content or target a private person.
- State a trial other than 10 credits, say Seedance or premium engines cost nothing, or promise instant Business Ads.
- Labels stay in English, the URL verbatim; the script, questions and Step 6 lines follow the user's language; set language accordingly.
```

---

## Não feito (e por quê)
- **Aviso ativo ao fundador por pagamento Empresas** (e-mail/card no /admin): hoje só o evento `dfy_order_paid`
  no banco. Fora do escopo desta rodada (só detecção e custom_fields eram lacunas a preencher); sugestão: card
  "Pedidos Empresas" no /admin lendo `dfy_order_paid`, ou e-mail via Resend no mesmo ramo, sem mexer na resposta 200.
- **Conferir no painel da Stripe** se o webhook `we_1TTmlF…` assina `checkout.session.async_payment_succeeded`:
  com Adaptive Pricing um meio lento chega como `unpaid` no completed (vira `checkout_payment_pending`) e o
  pedido só é gravado no evento de sucesso assíncrono.
- `ErrorResponse` do schema não declara o campo `refusal` (com `maxWords`) que o 400 do Kineo 1 já devolve; a
  instrução cita as duas formas (`maxWords` e a frase "at most N spoken words"), então não foi mexido.
- Migração para plugin: decisão do fundador (prazo OpenAI 11/12/2026).
