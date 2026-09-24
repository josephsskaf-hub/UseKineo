# Cowork — criar o Payment Link de US$100 do Kineo Empresas na Stripe (23/09/2026)

Decisão do fundador (23/09, noite): "faz as 3" → jogada 2 = vender o Kineo Empresas ANTES de construir. A única peça que depende da conta do fundador é o Payment Link da Stripe. Este é o roteiro para o Cowork executar no painel da Stripe (conta usekineo, modo LIVE). Nada de código. Nada de cartão. Nada de pagamento de teste.

O código que consome o link já está pronto: `lib/growth/dfyOffer.ts` (interruptor `DFY_PAYMENT_LINK_URL`, vazio até o link existir), `components/DfyOfferCard.tsx` (cartão no Studio quando o texto parece pedido de anúncio de empresa) e o webhook (`app/api/stripe/webhook/route.ts`, evento `dfy_order_paid`, sem conceder plano nem crédito). Quando o Cowork devolver a URL, o Claude Code liga o interruptor em 1 linha e enfileira.

---

## Bloco para colar no Cowork

```
KINEO — PAYMENT LINK "KINEO EMPRESAS" NA STRIPE (23/09/2026)

Abra o painel da Stripe da Kineo (dashboard.stripe.com), modo LIVE (não "Test mode"). Se estiver em modo teste, troque para live antes de qualquer passo. Não digite cartão, senha nem CPF; se pedir login, pare e me avise.

PASSO 1 — Produto
1. Menu "Product catalog" → "+ Add product".
2. Name: Kineo Empresas — 1 film made for you (35-60 s, 1 revision)
3. Description: A human editor at Kineo produces one vertical film (35-60 s) for your business: script, engine choice (Seedance or Kling 3), narration in your language, captions, music, 1 revision. Delivered within 72 hours. Your logo and photos are used when the format allows.
4. Pricing: "One-off" (NÃO recorrente). Amount: 100.00 USD. (Exatamente 100,00. Nunca 99,00: 99 colide com outros SKUs do sistema.)
5. Save product.

PASSO 2 — Payment Link
1. Menu "Payment Links" → "+ New".
2. Selecione o produto "Kineo Empresas — 1 film made for you". Quantity 1, sem "adjustable quantity".
3. Options:
   - Collect customers' email: ON (padrão).
   - Collect phone numbers: OFF. Collect addresses: OFF ("Don't collect").
   - Allow promotion codes: OFF. Require customers to accept terms: OFF. Save payment details for future use: OFF.
   - Adjustable quantity: OFF. "Let customers choose what to pay" / "customer chooses price": OFF. Moeda: USD fixo (não ative "adaptive pricing"/moeda local).
   POR QUÊ: o sistema reconhece o pedido por metadata kind=dfy OU por valor exato de US$100,00 em USD. Cupom, quantidade 2 ou moeda diferente mudam o valor e o pedido pago não seria registrado como pedido (só um aviso no log).
4. Advanced options → "Add custom fields" (3 campos, todos "Text", todos Required):
   - Campo 1 → Label: Business name + what you sell
   - Campo 2 → Label: Last-frame CTA: phone, WhatsApp, URL or address
   - Campo 3 → Label: Language + the film you want (1-2 lines)
5. After payment → "Don't show confirmation page" NÃO. Escolha "Show confirmation page" com "Replace default text" e cole:
   Thanks! Joseph will confirm your brief by email within 24 hours. Upload your logo, photos or a short clip in Kineo Studio → "My footage" (same account you used on usekineo.com), or reply to the receipt email. Delivery within 72 hours, 1 revision included.
6. Advanced options → Metadata → adicione DUAS chaves:
   - kind = dfy
   - product = kineo_empresas_v1
7. Create link.

PASSO 3 — Conferir e devolver
1. Copie a URL do link (começa com https://buy.stripe.com/).
2. Abra a URL numa janela anônima e confira: preço US$100.00, os 3 campos de texto aparecem, e-mail é pedido. NÃO preencha, NÃO pague. Feche.
3. Confira em Developers → Webhooks que o endpoint de produção (…usekineo.com/api/stripe/webhook) está "Enabled" e escuta "checkout.session.completed". Não altere nada; só confirme e tire print.
4. Me devolva nesta ordem, em texto: (a) a URL do Payment Link; (b) o ID do produto (prod_…); (c) "webhook ok" ou o que viu; (d) prints do link aberto e da tela de metadata.

Se qualquer tela for diferente do descrito (nome de menu, opção ausente), NÃO improvise: descreva o que vê e pare.
```

---

## O que o Claude Code faz quando a URL chegar (FEITO em 24/09 ~04h BRT com os dois degraus; ver "Resultado v2" no fim)

1. `lib/growth/dfyOffer.ts` → `DFY_TIERS.express.url/linkId` e `DFY_TIERS.pro.url/linkId` (4 valores; o guardião `test-tres-jogadas-servidor` trava os valores exatos, não só o formato).
2. Enfileira e avisa "hora de clicar". A partir do deploy, o cartão aparece no Studio para quem escrever pedido de anúncio de empresa (regex estrita) e o webhook grava `dfy_order_paid` com e-mail, os 3 campos e o `user_id` da conta (o link carrega `client_reference_id` e `prefilled_email`).
3. Leitura: `select created_at, user_id, metadata->>'customer_email', metadata->'custom_fields' from events where name='dfy_order_paid' order by 1 desc` e `dfy_card_shown`/`dfy_card_clicked` por país e fonte.

## Regras de operação do serviço (a partir do 1º pagamento)

- Teto de 3 pedidos abertos ao mesmo tempo. Alarme de 72 h por pedido (planilha até a 3ª venda; depois vira tela no /admin).
- Produção: Diretor Kineo para o roteiro; Kineo 1 em modo "ai" quando a foto/clipe do cliente tem de entrar; Seedance ou Kling 3 quando o filme é gerado (a mídia do cliente NÃO entra nos motores cinematic hoje). Dry-run de US$0 antes de todo render pago. Enhance 10 cr. Entrega por `/v/<id>` privado + MP4. 1 revisão.
- Se o pedido não couber (mídia sem autorização, promessa clínica, prazo impossível): reembolso integral pela Stripe em até 24 h e e-mail curto explicando.
- Leitura de 14 dias: `dfy_card_shown` ≥ 8 pessoas (≥3 de países que pagam). ≥1 pagamento → constrói fila + página /empresas + "US$500 por 5". 0 pagamento com ≥2 cliques → preço/formato para a mesa de 09/10. 0 cliques em 8 → copy do cartão (+7 dias). O protótipo HTML fica congelado até o 1º pagamento.

## Resultado (Cowork, 23/09 23:12 BRT; relatório em docs/KINEO-EMPRESAS-STRIPE-2026-09-23.md)

Link criado em modo live: `https://buy.stripe.com/8x25kD9wVePZfqHdJcgjC0w` (plink_1UJ23XIah5dxzSBfyfKlmOGV · prod_VJfH6iSD4drTaC · price_1UJ1wlIah5dxzSBfexZXeL3D), 3 campos, confirmação personalizada, metadata kind=dfy no link. Diferenças da tela: metadata só existe depois de criado; e-mail é sempre coletado; "customer chooses price" não aparece porque o preço é fixo; a conta tem **Adaptive Pricing** ligado (pode converter para moeda local fora do Brasil). Por isso o webhook passou a reconhecer o pedido pelo **id do link** (`DFY_PAYMENT_LINK_ID`), antes de metadata e valor. Interruptor ligado em 24/09 (`DFY_PAYMENT_LINK_URL`). Pendente do fundador: decidir o Adaptive Pricing (vale para a conta inteira) e investigar as 6 entregas malsucedidas do webhook nesta semana (61 no total).

## 24/09 — DOIS DEGRAUS (fundador: "express 35 usd, pro 75 usd"). Bloco para colar no Cowork

```
KINEO — DOIS PAYMENT LINKS "KINEO EMPRESAS" NA STRIPE (24/09/2026)

Abra dashboard.stripe.com da Kineo em modo LIVE. Não digite cartão, senha nem CPF; se pedir login, pare e me avise.

PASSO 0 — Desativar o link de US$100
Payment Links → abra plink_1UJ23XIah5dxzSBfyfKlmOGV ("Kineo Empresas — 1 film made for you (35-60 s, 1 revision)") → menu "…" → Deactivate. Confirme que aparece como Inactive.

PASSO 1 — Produto EXPRESS
Product catalog → + Add product.
Name: Kineo Empresas Express — 1 film made for you (30-60 s, 1 revision, 48 h)
Description: A human editor at Kineo produces one vertical film (30-60 s) for your business on Kineo 1 or Seedance: script from your brief, narration in your language, captions, music, your logo and photos where the format allows. 1 revision. Delivered within 48 hours.
Pricing: One-off, 35.00 USD. Save.

PASSO 2 — Produto PRO
Product catalog → + Add product.
Name: Kineo Empresas Pro — 1 film made for you (Seedance/Kling 3, consistent characters, 2 revisions, 72 h)
Description: A human editor at Kineo produces one vertical film (30-90 s) for your business on Seedance or Kling 3, with the same characters across scenes, a script written from your brief, narration in your language, captions and music, your logo and photos where the format allows. 2 revisions. Delivered within 72 hours.
Pricing: One-off, 75.00 USD. Save.

PASSO 3 — Um Payment Link para CADA produto (repita duas vezes, igual ao de 23/09)
Payment Links → + New → selecione o produto → quantity 1, adjustable quantity OFF, promo codes OFF, addresses "Don't collect", moeda USD fixa.
Custom fields (3, tipo Text, Required): 1) Business name + what you sell · 2) Last-frame CTA: phone, WhatsApp, URL or address · 3) Language + the film you want (1-2 lines)
After payment → Show confirmation page → Replace default text:
  Express: Thanks! Joseph will confirm your brief by email within 24 hours. Reply to the receipt email with your logo, photos or a short clip, or upload them in Kineo Studio → "My footage" (same account). Delivery within 48 hours, 1 revision included.
  Pro: Thanks! Joseph will confirm your brief by email within 24 hours. Reply to the receipt email with your logo, photos or a short clip, or upload them in Kineo Studio → "My footage" (same account). Delivery within 72 hours, 2 revisions included.
Create link. DEPOIS de criado, na página do link → Metadata → adicione: kind = dfy · tier = express (ou pro) · product = kineo_empresas_v2.

PASSO 4 — Devolver
Para cada link: a URL (https://buy.stripe.com/…), o plink_…, o prod_… e o price_…; confirme que o de US$100 está Inactive. Abra cada URL numa aba e confira preço, e-mail e os 3 campos. NÃO pague.
```

Quando as duas URLs chegarem, o Claude preenche `url` e `linkId` de `DFY_TIERS.express` e `DFY_TIERS.pro` em `lib/growth/dfyOffer.ts`, o cartão volta ao ar com os dois botões e os 4 rascunhos são reescritos com os valores certos.

## Resultado v2 (Cowork, 24/09 01:30 BRT; relatório em docs/KINEO-EMPRESAS-STRIPE-2026-09-23.md, seção v2)

| | Express | Pro |
|---|---|---|
| URL | https://buy.stripe.com/8x2eVddNbcHRfqH34ygjC0x | https://buy.stripe.com/28E14n38x0Z9guL6gKgjC0y |
| plink | plink_1UJ4BgIah5dxzSBf8RGTiutr | plink_1UJ4FXIah5dxzSBf8hU9ggtE |
| prod · price | prod_VJhVCgZceVl4ZA · price_1UJ463Iah5dxzSBf23DeBebq | prod_VJhWGOO930edEf · price_1UJ47nIah5dxzSBfIlgvnq3V |
| Checkout conferido | US$ 35,00 · e-mail + 3 campos | US$ 75,00 · e-mail + 3 campos |
| Metadata | kind=dfy · tier=express · product=kineo_empresas_v2 | kind=dfy · tier=pro · product=kineo_empresas_v2 |

- Os dois: quantidade 1 fixa, sem código promocional, sem endereço, 3 campos de texto obrigatórios, mensagem de confirmação por degrau. Nada foi pago.
- Link de US$100 (plink_1UJ23X…): **Desativado** na Stripe; a URL antiga mostra "The link is no longer active". Continua na lista LEGADA do webhook só por segurança.
- Avisos do Cowork tratados no mesmo commit do Code: o webhook já reconhecia qualquer id em `dfyPaymentLinkIds()` (degraus + legado) ANTES de metadata e valor; os dois plinks entraram por `DFY_TIERS`, sem redigitar nada no webhook (guardião confere que os ids NÃO aparecem lá).
- **O que o Code fez (24/09 ~04h BRT):** preencheu url/linkId dos dois degraus em `lib/growth/dfyOffer.ts`; a partir do deploy o cartão volta ao Studio com os dois botões para quem escrever pedido de anúncio de empresa; cada botão abre o link do degrau com `client_reference_id=<uid>` e `utm_source=studio_dfy_card`; o webhook grava `dfy_order_paid` com `tier`, e-mail, nome e os 3 campos.
- **Leitura:** `select created_at, user_id, metadata->>'tier' tier, metadata->>'customer_email' email, metadata->'custom_fields' campos from events where name='dfy_order_paid' order by 1 desc` · impressões/cliques: `select name, metadata->>'tier' tier, count(distinct coalesce(user_id::text, session_id)) pessoas from events where name in ('dfy_card_shown','dfy_card_clicked') and created_at > '2026-09-24 07:00+00' group by 1,2`.
