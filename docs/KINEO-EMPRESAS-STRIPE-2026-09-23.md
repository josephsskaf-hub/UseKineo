# Kineo Empresas — Payment Links na Stripe (LIVE)

## v2 (24/09/2026) — DOIS TIERS, o de US$100 foi DESATIVADO
| Tier | URL | plink | prod | price | valor |
|---|---|---|---|---|---|
| Express (30-60 s, 1 revisão, 48 h) | https://buy.stripe.com/8x2eVddNbcHRfqH34ygjC0x | plink_1UJ4BgIah5dxzSBf8RGTiutr | prod_VJhVCgZceVl4ZA | price_1UJ463Iah5dxzSBf23DeBebq | US$ 35,00 |
| Pro (Seedance/Kling 3, 2 revisões, 72 h) | https://buy.stripe.com/28E14n38x0Z9guL6gKgjC0y | plink_1UJ4FXIah5dxzSBf8hU9ggtE | prod_VJhWGOO930edEf | price_1UJ47nIah5dxzSBfIlgvnq3V | US$ 75,00 |
- Ambos: qtd 1 fixa, sem promo, sem endereço/telefone, 3 campos Text obrigatórios, confirmação personalizada.
- Metadados: kind=dfy · tier=express|pro · product=kineo_empresas_v2.
- plink_1UJ23X… (US$100) = Desativado; a URL antiga mostra "The link is no longer active."
- ⚠ Para o Code: o webhook deve reconhecer os DOIS plinks novos (payment_link) — o de US$100 não recebe mais nada.

## v1 (23/09/2026) — histórico

## Criado
- Produto: **prod_VJfH6iSD4drTaC** — "Kineo Empresas — 1 film made for you (35-60 s, 1 revision)"
- Preço: **price_1UJ1wlIah5dxzSBfexZXeL3D** — US$ 100,00, avulso (one-off)
- Payment Link: **plink_1UJ23XIah5dxzSBfyfKlmOGV**
- URL: **https://buy.stripe.com/8x25kD9wVePZfqHdJcgjC0w**
- Conta: acct_1NLBTkIah5dxzSBf (Kineo), modo live.

## Configuração do link
- Qtd 1, ajuste de quantidade OFF; nome/empresa/endereço/telefone OFF; promo codes OFF;
  tax ID OFF; salvar pagamento OFF. E-mail: a Stripe sempre coleta.
- 3 campos personalizados, tipo Texto, obrigatórios:
  1. Business name + what you sell
  2. Last-frame CTA: phone, WhatsApp, URL or address
  3. Language + the film you want (1-2 lines)
- Pós-pagamento: página de confirmação com mensagem personalizada (texto do fundador).
- Metadados do link: kind = dfy · product = kineo_empresas_v1
- Checkout conferido (sem pagar): US$ 100,00, e-mail + 3 campos. Cartões aceitos: Visa e Mastercard; Google/Apple Pay.

## Webhook (só olhado)
- we_1TTmlFIah5dxzSBfJYlFuEOe "sophisticated-breeze" → https://www.usekineo.com/api/stripe/webhook
- Ativo · API 2022-11-15 · 8 eventos, inclui checkout.session.completed.
- Esta semana: 61 entregas, 6 malsucedidas (~10%); tempo máx 20,8 s.

## ⚠ Para o Code — ANTES do 1º cliente pagar
1. O mesmo webhook recebe checkout.session.completed do Payment Link. Conferir o que
   app/api/stripe/webhook faz com uma sessão SEM os metadados de plano/crédito:
   pode dar 500 (Stripe reenvia por 3 dias), conceder crédito errado ou ignorar.
   Tratar: se session.payment_link === 'plink_1UJ23XIah5dxzSBfyfKlmOGV' (ou metadata
   kind=dfy) → gravar pedido DFY + custom_fields + e-mail e avisar o fundador; nunca grant.
2. Não confiar só nos metadados do link: confirmar no evento real se eles chegam em
   session.metadata. O campo session.payment_link sempre chega — usar como chave.
3. "Adaptive Pricing" está ATIVADO na conta. No teste o checkout mostrou US$ 100,00
   (IP BR), mas vale checar com IP de outro país se não converte a moeda.
4. ~~Investigar os 6 erros do webhook~~ → FEITO 24/09: as 6 são tentativas de SÓ 2 eventos
   checkout.session.expired de 18/09, ambos "Entrega recuperada" depois. Nenhum evento de
   dinheiro falhou. Evento evt_1UGxsm… (cs_live_b11Gz…): 09:15:20 e 09:15:55 UTC timeout
   (resposta vazia), 10:15:39 e 14:18:36 UTC HTTP 500 {"error":"Webhook idempotency unavailable"}.
   Evento evt_1UH3a0… (cs_live_b19sd…): 15:20:21 e 15:20:57 UTC timeout. O 500 é a guarda de
   idempotência sem acesso ao banco (falha intencional p/ a Stripe reenviar) — dia de banco lento.
