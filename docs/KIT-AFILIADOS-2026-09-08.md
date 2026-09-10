# Kineo Affiliate Kit v5 — 30% on eligible purchases, paid in USD

**SUGESTÃO / PRONTO PARA PUBLICAÇÃO — revisão 10/09/2026:** atualização do kit existente de 08/09, incorporando a copy e os CTAs da versão local 4. Material escrito; distribuição e uso por parceiro são estados separados. Este arquivo não comprova página publicada, aceite ou venda.

**FATO CONFIRMADO — fontes conferidas em 10/09/2026, SHA `7a7a2441`:** comissão e condições em `lib/affiliateCommission.ts:8`, `:16-27`; preços mensais em `lib/checkoutPricing.ts:103-106`; créditos em `:424-426`; entrada grátis em `lib/entryPolicy.ts:33-36`; cobrança brasileira em `lib/settlementCurrency.ts:63-66`. A comissão existe no caminho Stripe avulso (`app/api/stripe/webhook/route.ts:1185-1193`) e depende da atribuição e elegibilidade; isso não prova toda recompra futura. Orientação comercial do fundador transmitida pelo Board em 10/09: 30% em toda compra elegível, sem ampliar a promessa além do vínculo comprovado.

**EVIDÊNCIA DE PRODUÇÃO — Claude, 10/09/2026, PEDIDOS no commit `68fcc787`:** o teste interno registrou comissão de R$14,97 sobre R$49,90 e foi anulado (`void`). Prova do funil, sem aquisição externa ou comissão paga. **SUGESTÃO — operação:** preservar conferência nominal, supressões, histórico dos convites e aceite antes de entregar materiais; não oferecer render personalizado gratuito sem aprovação de custo.

## Partner offer — proposed English copy

Earn **30% on every eligible purchase validly attributed to you, paid in USD**. Eligible subscription payments can earn recurring commissions while your referred customer keeps paying. You get your own affiliate link and a dashboard for attributed activity and commissions. The attribution window is **90 days**, using the first eligible affiliate touch. A future purchase or top-up must qualify and retain valid attribution; commission on every future recharge is not guaranteed.

Your audience can **start free with 30 credits, every engine unlocked and no card required**. Free videos are watermarked. Paid plans start at **US$9.90/month** and remove the watermark from paid exports. Credit use depends on the engine and video settings; 30 credits do not mean unlimited videos or 30 videos.

Current monthly plans:

| Plan | Monthly USD price | Monthly credits | Brazilian monthly checkout |
|---|---:|---:|---:|
| Starter | US$9.90 | 60 | R$49.90 |
| Creator | US$19.90 | 150 | R$99.90 |
| Studio | US$39.90 | 300 | R$199.90 |

For full monthly payments actually charged in USD, 30% is US$2.97 on Starter, US$5.97 on Creator, and US$11.97 on Studio. These examples do not apply directly to BRL charges. Cards display USD prices; Brazilian checkout uses the BRL table above. Discounts, failed payments and refunds can change what qualifies. These are not earnings forecasts. Credit amounts describe the plans; output quantity depends on the selected engine and settings.

## Payout and activation bonus — approved policy, English wording

Commissions are released **30 days after the customer's payment**. Payouts are made manually **in USD via PayPal once a month, by the 15th**, when your released balance reaches **US$20**. Smaller balances roll over. Commissions on BRL payments are converted for the monthly payout at the current house rate of **R$5 per US$1**; this is a fixed house rate, not a live market rate.

**DECISÃO APROVADA — controle interno:** conciliar por afiliado, moeda e cobrança; converter BRL para USD antes de aplicar o mínimo. Considerar somente comissões elegíveis e liberadas, excluindo `void`, testes e valores já pagos. Bônus elegível é somado em USD uma única vez. Repasse e conciliação são manuais. **FATO CONFIRMADO — hotfix2963b919, `app/api/affiliate/me/route.ts:250-254`:** os KPIs do painel agora convertem BRL em USD a 5,0, com arredondamento por linha, e excluem `void`/`clawed_back`; o detalhe preserva moeda original. Código não comprova pagamento efetuado. **QUESTÃO PENDENTE:** conciliar o tratamento de centavos do fechamento com a exibição antes do primeiro repasse. Fonte financeira: D-AF-RECRUTAMENTO-20260910.

There is a **one-time US$3 activation bonus per affiliate** after the first approved monthly payment from a referred customer, capped at **20 qualifying affiliates / US$60 in total bonuses**. The bonus is added to your balance and paid **with your first commission**, never as a separate payout. The US$20 minimum and commission-release schedule still apply. This is not a bonus on every sale or renewal.

**QUESTÃO PENDENTE — controle interno:** confirmar saldo de vagas antes de divulgar disponibilidade; não escrever “20 vagas restantes”. O código publicado declara o bônus, mas o diário de Claude informa que seu lançamento é manual. O gerente deve reconciliar elegibilidade e reserva do teto por afiliado antes do repasse; não prometer registro automático do bônus.

## What you can say

- “Free to start, 30 credits, no card required.”
- “Create a faceless Short with AI narration, visuals and captions.”
- “Choose your engine and review the result before publishing.”
- “Free exports are watermarked; paid exports remove the watermark.”
- “I earn a commission on eligible purchases through my affiliate link.”

## What you must not say

- Pix for subscription or monthly-plan payments. Do not promise a particular wallet will be available for every device or customer.
- Unlimited free credits, unlimited free videos or free watermark removal.
- Guaranteed views, virality, monetization, income or a fixed rendering time.
- That a Kineo example was made by you or published on your channel when it was not.
- A discount, extra demo credits, free work or a payout exception that has not been agreed.
- That the bonus is immediate cash, available for every renewal or paid separately below the minimum.

**SUGESTÃO — controle de versão:** não reutilizar as ofertas antigas de US$1 por sete dias, 80 créditos de entrada ou comissão de 40%. Não citar Product Hunt como prova da Kineo: o endereço homônimo citado no briefing pertence a outro produto. O único link de review indicado pelo fundador é [Kineo on There's An AI For That](https://theresanaiforthat.com/ai/kineo).

## Your link and attribution

Copy your real link from the affiliate dashboard. Replace `YOURCODE` below with that exact code; the placeholders are not working referral links.

| Audience | Link format |
|---|---|
| Faceless channel creators | `https://www.usekineo.com/a/YOURCODE?to=faceless` |
| People testing the video workflow | `https://www.usekineo.com/a/YOURCODE?to=video` |
| People who need a script first | `https://www.usekineo.com/a/YOURCODE?to=script` |
| Businesses planning content | `https://www.usekineo.com/a/YOURCODE?to=business` |

Keep the actual referral URL in a clickable location appropriate to the platform. For YouTube Shorts, put it in your channel profile's Links section, with a clear label such as “Kineo — affiliate link”. Tell viewers to open your channel profile and tap that label. A URL pasted into a Short's description or comments, including a pinned comment, is not clickable.

For a long-form YouTube tutorial, use the real referral URL in the description after confirming that the channel has advanced-feature access and that the external link is clickable. An optional related-video link can take viewers from a Short to an existing public or unlisted video on your own channel; it requires advanced-feature access and cannot point directly to Kineo. Use this route only when the related video and its external referral link are already in place. Other platforms need their own placement check.

**EVIDÊNCIA DE PRODUÇÃO / DOCUMENTAÇÃO PRIMÁRIA — consultada em 10/09/2026:** [Sharing links with your audiences](https://support.google.com/youtube/answer/13748639?hl=en), [Channel profile links](https://support.google.com/youtube/answer/2657964?hl=en) e [Add a related video](https://support.google.com/youtube/answer/14075157?hl=en). A regra da plataforma não comprova que um parceiro configurou ou publicou o link.

The current Kineo redirect assigns `utm_source=affiliate`, `utm_medium=partner` and the destination campaign automatically. Do not replace the referral link with the final landing-page URL. Do not assume extra UTMs survive the redirect.

For post-level reporting, keep a simple record of the post URL, publication date, platform, clickable placement, profile label and exact affiliate link used. Record the date of the viewer-path check; keep any internal QA clicks separate from audience evidence. This record is a publication log; it does not make anonymous clicks identifiable people. Use only an existing, verified coupon shown in your account if the campaign specifically calls for one; this kit creates no new discount.

## Five ready-to-adapt captions — SUGESTÃO

**Placement note:** these versions are for YouTube Shorts after the “Kineo — affiliate link” profile link is configured. For a long-form video with a working external description link, replace the profile instruction with “Use my affiliate link in this video's description” and include the real URL there. Keep the disclosure.

1. **Workflow:** One topic, AI narration, visuals and captions. Try Kineo free with 30 credits and no card required. Open my channel profile and tap “Kineo — affiliate link”. Free exports are watermarked. I earn a commission on eligible purchases.
2. **History:** Turn a history topic into a faceless Short, then check the facts and scenes before publishing. Kineo starts free with 30 credits, no card required. Open my channel profile and tap “Kineo — affiliate link”. Free exports are watermarked. I earn a commission on eligible purchases through this link.
3. **Facts:** A facts Short still needs fact-checking. Kineo helps with the script, narration, visuals and captions; you review the result. Start free with 30 credits: open my channel profile and tap “Kineo — affiliate link”. No card required; free exports are watermarked. I may earn a commission on eligible purchases.
4. **Mystery:** Build suspense with a script, narration and changing visuals. This is a Kineo workflow example, not a promise of views. Try 30 free starting credits, no card required: open my channel profile and tap “Kineo — affiliate link”. Free exports are watermarked. I earn a commission on eligible purchases.
5. **Finance:** Explain one financial concept in a short video, check the claims and add your own editorial judgment. Try the Kineo workflow free with 30 credits and no card: open my channel profile and tap “Kineo — affiliate link”. Free exports are watermarked. I may earn a commission on eligible purchases.

## Three demo scripts — SUGESTÃO, target format 30 seconds each

**Production note:** time these against the creator's actual narration before export. Keep the affiliate disclosure visible and spoken. Use genuine screen recording and the actual generated output. These are demonstrations to record, not claims that any prospect already uses Kineo.

### 1. A history Short

| Beat | Picture | Voiceover |
|---|---|---|
| Opening | Finished example, labelled “Kineo example” | “Affiliate demo: here is one way to build a history Short with Kineo.” |
| Workflow | Enter topic; review script; select engine | “Start with one topic, check the facts, then choose the engine and voice.” |
| Result | Play the actual output with captions | “Review the scenes, narration and captions before posting.” |
| Close | Show the configured Kineo link on the channel profile | “Start free with 30 credits, no card. Free exports are watermarked. Tap Kineo on my channel profile. I earn a commission on eligible purchases.” |

### 2. A mystery Short

| Beat | Picture | Voiceover |
|---|---|---|
| Opening | Hook from a real recorded demo | “Affiliate demo: a mystery Short needs a clear question, not just dramatic images.” |
| Workflow | Show the question and script edits | “In Kineo, I start with the topic, review the script and choose the narration and visuals.” |
| Result | Show generated scenes and corrections | “Check each scene against the story before publishing.” |
| Close | Show the configured Kineo link on the channel profile | “Try 30 free credits, no card. Free exports are watermarked. Tap Kineo on my channel profile. I earn a commission on eligible purchases.” |

### 3. A facts Short

| Beat | Picture | Voiceover |
|---|---|---|
| Opening | A factual question and its source | “Affiliate demo: turn one verified fact into a Short without filming yourself.” |
| Workflow | Show real script, engine and voice choices | “Kineo brings the script, AI narration, visuals and captions into one workflow.” |
| Result | Actual output, including any visible limitations | “Check the facts and the finished video yourself.” |
| Close | Show the configured Kineo link on the channel profile | “Start free with 30 credits, no card. Free exports are watermarked. Tap Kineo on my channel profile. I earn a commission on eligible purchases.” |

## Asset handoff

**FATO CONFIRMADO — arquivos presentes no snapshot cf34c85c, 09/09/2026:**

| Material | Repository location | Use |
|---|---|---|
| Vertical/horizontal Kineo examples | `public/previews/curation-sep07/` (`-v.mp4` / `-h.mp4`) | Use as labelled Kineo examples; select after viewing the entire file. |
| Additional examples | `public/previews/ex-*.mp4` | Match the creator's actual topic; do not imply these are their results. |
| Product gallery | `docs/ph/gallery-01.png` through `gallery-06.png` | Check all on-image copy against the current offer before sharing. |
| Product walkthrough | `docs/ph/kineo-ph-60s.mp4` | Inspect embedded price/trial claims before reuse. |
| Existing vertical ad | `public/ads/kineo-reddit-sep09-4x5-v2.mp4` | Internal reference until embedded claims are checked; not automatically part of the outgoing kit. |

**QUESTÃO PENDENTE:** o inventário confirma existência, não revisão visual de cada arquivo nesta rodada. Não foi criado nem distribuído ZIP. Assets com preço/oferta antiga precisam de correção por Claude antes do compartilhamento. Não pedir ao parceiro que publique material que não foi conferido.

## Before the first approved post

**SUGESTÃO — checklist operacional:** prova do funil registrada; parceiro qualificado; liberação nominal e autorização de envio; aceite do parceiro; link real em superfície clicável; caminho do espectador conferido no celular; versão atual do kit; exemplo integralmente revisado; disclosure; URL/data da publicação; saldo/bonus conciliáveis. Em Shorts, confirmar perfil → rótulo Kineo → URL de afiliado antes de interpretar ausência de cliques. Pausar a sequência imediatamente em resposta, recusa, opt-out, erro de atribuição ou falha no gate. Cadastro, clique e pagamento de teste ficam fora do placar comercial.

## Limites de compra elegível — controle interno

**FATO CONFIRMADO / IMPLEMENTADO — SHA `7a7a2441`, leitura 10/09/2026:** no caminho Stripe conferido, o webhook exige afiliado ativo (:585), lê a atribuição de `profiles.affiliate_id` (:493) e retorna sem comissão se não resolver o vínculo (:572). O reparo pelo referral canônico existe em `lib/affiliateAttribution.ts:77-99`; a chamada preventiva encontrada no checkout é do caminho de assinatura (`app/api/stripe/checkout/route.ts:2201`). O registro de comissão avulsa em `lib/affiliateLedger.ts:135-141` não transforma automaticamente o referral em assinante pago.

**QUESTÃO PENDENTE — estudo já encaminhado ao Board em 10/09/2026:** antes de anunciar cobertura de toda recarga dos futuros pacotes, validar recompra sem cookie, reparo do vínculo, deduplicação da cobrança e métricas de comprador avulso. A condição vigente do bônus continua primeiro pagamento mensal aprovado; este kit não a estende a pacotes. O pedido e a nota de impacto existentes permanecem com Board/Claude; nenhuma alteração de ledger, checkout ou termos financeiros nesta entrega.
