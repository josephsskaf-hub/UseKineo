# Kineo Empresas — Payment Link na Stripe (23/09/2026, LIVE)

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
4. Investigar os 6 erros do webhook nesta semana (Entregas de eventos → Malsucedidos).
