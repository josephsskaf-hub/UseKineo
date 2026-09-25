# Brief para o Cowork — Stripe e Vercel (25/09/2026)

Pedido do fundador (25/09): "pode pedir pro cowork fazer essas tarefas de stripe e vercel?". São os itens 1, 2 e 3 de
docs/O-QUE-FALTA-POR-DE-PE-2026-09-25.md. Tudo é configuração em painel — nenhuma linha de código. O Cowork faz no
Chrome do fundador, logado; o fundador só confirma o que for dinheiro ou chave.

## Bloco para colar no Cowork

```
Você está no Chrome do Joseph (Kineo, usekineo.com). Três tarefas de painel, nesta ordem. Não crie contas, não apague
nada, não mude preços. Ao final, me devolva um relatório curto com print de cada tela salva.

TAREFA 1 — Stripe: inscrever 2 eventos no webhook (3 min)
1. https://dashboard.stripe.com/webhooks → abrir o endpoint we_1TTmlFIah5dxzSBfJYlFuEOe (é o que aponta para
   usekineo.com/api/stripe/webhook).
2. "Select events" / editar eventos → ADICIONAR (sem remover nenhum dos que já estão):
   - checkout.session.async_payment_succeeded
   - checkout.session.async_payment_failed
3. Salvar. Confirmar na lista de eventos do endpoint que os dois aparecem.
Por quê: o código já trata os dois (app/api/stripe/webhook/route.ts), mas a Stripe nunca os manda porque o endpoint
não está inscrito. Sem isso, Pix/Boleto poderiam entregar sem receber.

TAREFA 2 — Stripe: redirecionar os 2 Payment Links de anúncio para o briefing (5–20 min)
Links (Products → Payment Links):
   - Express US$ 35 → https://buy.stripe.com/8x2eVddNbcHRfqH34ygjC0x
   - Pro US$ 75     → https://buy.stripe.com/28E14n38x0Z9guL6gKgjC0y
Para CADA um: editar → "After payment" → "Don't show confirmation page" / "Redirect customers to your website" →
URL exatamente:
   https://www.usekineo.com/business-video-ads/brief#session_id={CHECKOUT_SESSION_ID}
Também conferir que "Send receipt email" (recibo) está LIGADO nos dois.
TESTE obrigatório (sem pagar): abrir o link Express, não preencher cartão, só conferir na pré-visualização/URL
final que a Stripe aceitou o placeholder depois do "#". Se o painel recusar "#" ou não substituir
{CHECKOUT_SESSION_ID}, usar a forma alternativa, que o site também aceita:
   https://www.usekineo.com/business-video-ads/brief?session_id={CHECKOUT_SESSION_ID}
Por quê: a página do briefing já está no ar e lê session_id do # (ou do ?). Sem o redirect, quem paga cai na
página padrão da Stripe e nunca manda o briefing do anúncio.

TAREFA 3 — Vercel: variável do alerta de pedido pago + deploy novo (10 min)
1. https://vercel.com → time da Kineo → projeto usekineo → Settings → Environment Variables.
2. Criar KINEO_ALERT_WEBHOOK_URL (ambiente: Production). Valor = uma URL que recebe POST e avisa o Joseph no
   celular. Opção mais simples: ntfy — criar um tópico privado no app ntfy do celular e usar
   https://ntfy.sh/<nome-do-topico-secreto>. Se o Joseph preferir Telegram, ele fornece a URL do bot
   (https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>) — NÃO invente token nem chat_id; peça a ele.
3. IMPORTANTE: variável nova só vale em deploy novo. Depois de salvar, Deployments → último deploy de Production →
   "Redeploy" (sem "use existing build cache"). Esperar READY.
4. Mandar um POST de teste para a URL escolhida (curl ou o próprio app do ntfy) e confirmar que chegou no celular.
Por quê: hoje o pedido pago de anúncio avisa só por e-mail, uma tentativa, e o webhook responde 200 mesmo se o
aviso falhar. Com a URL, o aviso sai em paralelo por push.

OPCIONAL (só se o Joseph disser "vai"): fal.ai → Billing → auto top-up US$ 100 quando saldo < US$ 15, e alerta
por e-mail em US$ 75. É dinheiro saindo: não ligue sem a palavra dele.
```

## O que o Cowork NÃO pode fazer
- Criar conta nova em serviço nenhum (a conta do ntfy/Telegram é do fundador).
- Digitar chave, token ou senha que não tenha vindo do fundador nesta conversa.
- Ligar o auto top-up da fal sem "vai" explícito.

## Como conferir depois (Claude-CEO)
- Stripe: `stripe events list --type checkout.session.async_payment_succeeded` só prova depois da 1ª venda por Pix/Boleto;
  antes disso, print da lista de eventos do endpoint basta.
- Redirect: abrir o link Express e ler a URL de destino na pré-visualização; no banco, o próximo `dfy_brief_submitted`
  com `session_id` preenchido fecha o caso.
- Vercel: evento `founder_order_alerted` com outcome `sent` no próximo pedido pago; antes, o POST de teste.
