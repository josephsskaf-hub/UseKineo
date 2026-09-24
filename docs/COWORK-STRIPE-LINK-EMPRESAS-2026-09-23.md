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

## O que o Claude Code faz quando a URL chegar

1. `lib/growth/dfyOffer.ts` → `DFY_PAYMENT_LINK_URL = 'https://buy.stripe.com/…'` (1 linha; o guardião confere o formato).
2. Enfileira e avisa "hora de clicar". A partir do deploy, o cartão aparece no Studio para quem escrever pedido de anúncio de empresa (regex estrita) e o webhook grava `dfy_order_paid` com e-mail, os 3 campos e o `user_id` da conta (o link carrega `client_reference_id` e `prefilled_email`).
3. Leitura: `select created_at, user_id, metadata->>'customer_email', metadata->'custom_fields' from events where name='dfy_order_paid' order by 1 desc` e `dfy_card_shown`/`dfy_card_clicked` por país e fonte.

## Regras de operação do serviço (a partir do 1º pagamento)

- Teto de 3 pedidos abertos ao mesmo tempo. Alarme de 72 h por pedido (planilha até a 3ª venda; depois vira tela no /admin).
- Produção: Diretor Kineo para o roteiro; Kineo 1 em modo "ai" quando a foto/clipe do cliente tem de entrar; Seedance ou Kling 3 quando o filme é gerado (a mídia do cliente NÃO entra nos motores cinematic hoje). Dry-run de US$0 antes de todo render pago. Enhance 10 cr. Entrega por `/v/<id>` privado + MP4. 1 revisão.
- Se o pedido não couber (mídia sem autorização, promessa clínica, prazo impossível): reembolso integral pela Stripe em até 24 h e e-mail curto explicando.
- Leitura de 14 dias: `dfy_card_shown` ≥ 8 pessoas (≥3 de países que pagam). ≥1 pagamento → constrói fila + página /empresas + "US$500 por 5". 0 pagamento com ≥2 cliques → preço/formato para a mesa de 09/10. 0 cliques em 8 → copy do cartão (+7 dias). O protótipo HTML fica congelado até o 1º pagamento.
