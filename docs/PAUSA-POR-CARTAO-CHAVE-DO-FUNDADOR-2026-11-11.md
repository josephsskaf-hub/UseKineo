# Pausa por cartão recusado — a chave do fundador (11/11/2026)

Código já no ar (072a96609, KINEO-PAUSA-POR-CARTAO-1111). Falta só o que é da Stripe. Por que importa: 3 das 6 saídas de
pagantes em 90 dias foram cartão recusado (akajitin, valos87196, ytmeander), e hoje a Stripe CANCELA quando todas as
tentativas falham.

## O passo a passo (5 linhas)
1. A CEO roda `node scripts/stripe-migrar-flexivel-1111.mjs` (só lista) e, com o seu sim, `--apply`: as assinaturas ativas
   passam para o "modo flexível" da Stripe, que é o único que deixa pausar. Isso não tem volta, mas não muda preço, data nem cobrança.
2. A CEO liga `PAUSA_POR_CARTAO_1111_MIGRA_NOVAS = 'on'` e publica: toda assinatura nova nasce no modo flexível.
3. No painel da Stripe: Developers → Webhooks → o endpoint de usekineo.com → acrescentar os eventos
   `customer.subscription.paused`, `customer.subscription.resumed` e `customer.subscription.created`.
4. **A SUA CHAVE**: Billing → Revenue recovery → Retries → "Subscription status" → em "If all retries for a payment fail",
   escolher **Pause the subscription** (hoje está "Cancel the subscription").
5. Na mesma tela, em "When the invoice that triggered the pause is paid or manually marked uncollectible", escolher
   **Resume the subscription**, deixar "Reset billing cycle anchor" DESLIGADO e salvar.

## O que muda para o cliente
- Antes: o cartão falha em todas as tentativas → a assinatura é cancelada → para voltar, ele faz o checkout do zero.
- Depois: o cartão falha em todas as tentativas → a assinatura fica **pausada** (não é cancelada). Ele perde o acesso do
  plano (motores, tokens do Studio), mas **o saldo de créditos fica guardado** e a biblioteca continua dele. Nenhuma
  cobrança nova enquanto estiver pausado.
- Quando ele paga a fatura em aberto (pelo link do e-mail da Stripe, que já é enviado), a assinatura **volta sozinha**, o
  plano volta e os créditos do mês entram pela renovação de sempre.

## O risco (e o que já está coberto)
- **Dar crédito a quem continua pausado**: coberto. A renovação só concede com a assinatura ativa; se a fatura for paga
  com a assinatura ainda "pausada" (os eventos da Stripe chegam fora de ordem), o webhook pede para a Stripe reenviar
  depois em vez de descartar (antes, a pessoa pagaria e ficaria sem plano e sem créditos).
- **Assinatura não migrada**: se o passo 1 não rodou para alguém, a Stripe faz como hoje, cancela. Ligar a chave antes
  de migrar não piora nada.
- **Painel de receita**: assinatura pausada aparece como plano grátis (não entra no MRR) até voltar.
- **Não testado com dinheiro de verdade.** O guardião (scripts/test-pausa-por-cartao-1111.mjs) prova o código; a prova
  real é a primeira recusa depois da chave. Medir: eventos `subscription_paused` e `subscription_resumed` no banco;
  régua de 90 dias contra as 3 perdas por cartão dos últimos 90.
