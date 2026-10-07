# Pagamentos alternativos: pagou, recebeu

**TESTADO LOCALMENTE — 07/10/2026.** Branch `codex/pagamentos-alternativos-2026-10`, criada de `origin/main` em `fcf5dd10d70d657444d2e9eac0b5e870ba93d443`. As referências do **antes** abaixo apontam para essa base; as do **depois**, para os arquivos deste PR.

## O que estava errado

**FATO CONFIRMADO:** Mercado Pago e Hotmart inseriam o pedido antes do crédito e respondiam 200 após falhas de entrega. PayPal já tentava liberar marcas e responder 500 no catch, mas os helpers de concessão engoliam erros de UPDATE; portanto, essas falhas não chegavam ao catch. Fontes: antes, `app/api/mercadopago/webhook/route.ts:60`, `app/api/hotmart/webhook/route.ts:71`, `app/api/paypal/webhook/route.ts:165`, `lib/paypal.ts:274`.

**CONTRADIÇÃO:** a referência Stripe não tem um único padrão transacional reutilizável: assinatura verifica o vínculo persistido para retomar, mas pack legado ainda adquire marca antes do incremento. Não foi alterada nem usada como prova de atomicidade universal. Fontes: `app/api/stripe/webhook/route.ts:1580` e `app/api/stripe/webhook/route.ts:2003` na base.

## Mapa antes — passo a passo

### PayPal

**FATO CONFIRMADO — base `fcf5dd10`:**

1. `POST /api/paypal/webhook` criava cliente de banco antes da autenticação. `verifyPaypalWebhook` consultava a API oficial, buscando `PAYPAL_WEBHOOK_ID` ou `paypal_config`; reconstruía o JSON e convertia erro de rede/API em assinatura falsa. Assinatura rejeitada retornava 400. Fontes: `app/api/paypal/webhook/route.ts:35`, `lib/paypal.ts:215`.
2. Inseria `evt:<eventId>` e chaves de operação antecipadamente em **`paypal_events`**. Erros de banco distintos de duplicata permitiam seguir mesmo sem a marca. Fontes: `app/api/paypal/webhook/route.ts:68`, `lib/paypal.ts:252`.
3. Pack: resolvia usuário por `resource.custom_id`, comparava valor a `PAYPAL_PACK.usd`, marcava pedido/captura e chamava `grantPackCredits`. Fonte: `app/api/paypal/webhook/route.ts:81`.
4. Plano: ACTIVATED concedia por `custom_id` e plano em **`paypal_config`**, com fallback basic. A primeira SALE era ignorada, presumindo ativação já entregue; demais vendas renovavam pela regra `renewalBalance`. Fonte: `app/api/paypal/webhook/route.ts:101`.
5. Helpers liam/atualizavam **`profiles`**, apenas logando erros. Reembolsos de captura/venda não tinham tratamento. Fontes: `lib/paypal.ts:274`, `lib/paypal.ts:282`, `lib/paypal.ts:305`.
6. `GET /api/paypal/return` compartilhava claim antes do grant e aceitava tier da query; APPROVED já bastava para conceder assinatura. Fontes: `app/api/paypal/return/route.ts:52`, `app/api/paypal/return/route.ts:108`.

### Mercado Pago

**FATO CONFIRMADO — base `fcf5dd10`:**

1. `POST /api/mercadopago/webhook` extraía ID de query/corpo **sem verificar assinatura**; consultava `/v1/payments/{id}` e exigia approved. Falha da API virava ausência de pagamento e 200. Fontes: `app/api/mercadopago/webhook/route.ts:22`, `lib/mercadopago.ts:81`.
2. Resolvia usuário e pack por `external_reference = userId:pack`; créditos vinham de `MP_PACKS`. Fonte: `app/api/mercadopago/webhook/route.ts:47`.
3. Inseria primeiro em **`mp_payments`**, PK `payment_id`; depois chamava RPC `add_video_credits`. Erros de insert/RPC e exceções gerais terminavam em 200. Reversões não deixavam bloqueio persistente. Fonte: `app/api/mercadopago/webhook/route.ts:60`.

### Hotmart

**FATO CONFIRMADO — base `fcf5dd10`:**

1. `POST /api/hotmart/webhook` já verificava **`X-HOTMART-HOTTOK`** por comparação em tempo constante; rejeitava com 401. Fontes: `app/api/hotmart/webhook/route.ts:27`, `lib/hotmart.ts:27`.
2. Usava `purchase.transaction` para dedupe; procurava **`profiles.id` pelo e-mail normalizado**; créditos vinham de `creditsForBRL`. Fontes: `app/api/hotmart/webhook/route.ts:39`, `app/api/hotmart/webhook/route.ts:54`.
3. Reversões eram só logadas. Inseria **`hotmart_payments`** antes da RPC `add_video_credits`, inclusive sem conta; falhas e compra sem dono terminavam em 200. Fontes: `app/api/hotmart/webhook/route.ts:44`, `app/api/hotmart/webhook/route.ts:62`, `app/api/hotmart/webhook/route.ts:94`.

## Mapa depois — passo a passo

**FATO CONFIRMADO — IMPLEMENTADO:** os três fluxos seguem origem autenticada → dedupe → bloqueio de reversão → grant verificado → confirmação do grant → pedido → `payment_success` com `user_id` → evento processado. Erro produz 500; rejeição de origem produz 401 sem cliente de banco. Assinatura inválida e falha de banco geram evento no log do servidor; quando o banco está disponível, falhas de processamento também são persistidas em `events`. Fontes: `lib/payments/alternative.ts:57`, `lib/payments/alternative.ts:109`, três rotas `webhook/route.ts:12` (PayPal `:14`).

### PayPal

**FATO CONFIRMADO — IMPLEMENTADO:**

1. Verifica headers e JSON bruto na API oficial **antes do banco**, com `PAYPAL_WEBHOOK_ID` obrigatório. Rejeição = 401; API de verificação indisponível = 500. Fonte: `lib/paypal.ts:219`.
2. Deduplica `event.id` em `events`. Consulta captura/venda atual no PayPal. Pack usa `custom_id` da captura ou da unidade do pedido que contém a captura; valida USD e valor do catálogo. Fontes: `app/api/paypal/webhook/route.ts:27`, `lib/payments/paypal.ts:23`.
3. Primeira assinatura e renovação são entregues pela **SALE liquidada**, com assinatura ACTIVE e `plan_id` conhecido em `paypal_config`. ACTIVATED sozinho não concede. O mesmo snapshot protegido pelo UPDATE decide adição inicial ou `renewalBalance`, impedindo duas ativações concorrentes. Fontes: `lib/payments/paypal.ts:52`, `lib/paypal.ts:246`.
4. Reembolso/reversão bloqueia por **captura/venda original**, não pelo ID do refund. Resolve related IDs ou caminho `rel=up` permitido sem buscar URL arbitrária. Suspensão usa estado atual e preserva vínculo para renovação após reativação; não cria bloqueio terminal. Fontes: `lib/payments/paypal.ts:97`, `lib/payments/paypal.ts:114`.
5. **`paypal_events`** só recebe operação após grant confirmado. Return e webhook do pack usam a mesma chave por captura; return de assinatura aguarda a SALE e não confia no tier da URL. Fontes: `lib/payments/paypal.ts:44`, `lib/payments/paypal.ts:82`, `app/api/paypal/return/route.ts:11`.
6. Setup passa a inscrever eventos de reversão e atualizar `/event_types` de webhook existente quando a rota de setup for executada. **O setup não foi executado neste trabalho.** Fonte: `app/api/paypal/setup/route.ts:33`, `app/api/paypal/setup/route.ts:95`.

### Mercado Pago

**FATO CONFIRMADO — IMPLEMENTADO:**

1. HMAC-SHA256 com **`MP_WEBHOOK_SECRET`**, `x-request-id`, timestamp de `x-signature` e `data.id` da URL em minúsculas; compara em tempo constante. Exige correspondência do ID do corpo antes de banco/API. Fontes: `lib/mercadopago.ts:79`, `app/api/mercadopago/webhook/route.ts:17`.
2. Consulta recurso autenticado, confere identidade, estado atual, BRL e valor do pack. O HMAC não autentica `body.id`: dedupe usa **`paymentId:status` obtido da API**, enquanto concessão é única por `paymentId`. Uma notificação pending não bloqueia approval posterior. Fontes: `lib/mercadopago.ts:97`, `app/api/mercadopago/webhook/route.ts:27`.
3. Usuário/pack continuam vindo de `external_reference`/`MP_PACKS`; grant comum altera perfil e só depois insere **`mp_payments`**. Reembolso parcial/total, chargeback e cancelamento deixam bloqueio persistente. Fontes: `lib/mercadopago.ts:111`, `app/api/mercadopago/webhook/route.ts:34`, `app/api/mercadopago/webhook/route.ts:45`.
4. Checkout exige token **e** segredo de webhook para se declarar configurado. Fonte: `lib/mercadopago.ts:26`.

### Hotmart

**FATO CONFIRMADO — IMPLEMENTADO:**

1. Preserva Hottok oficial; exige evento, `body.id` e transação. Deduplica evento e guarda reversão pela **transação**, bloqueando APPROVED/COMPLETE posteriores com IDs diferentes. Fonte: `app/api/hotmart/webhook/route.ts:17`.
2. Mantém e-mail normalizado e `creditsForBRL`; exige BRL, valor válido e conta existente. Conta ausente/consulta falha = 500, sem registrar compra como entregue. Fonte: `app/api/hotmart/webhook/route.ts:35`.
3. Grant comum → **`hotmart_payments`** → `payment_success` com dono → evento processado. Fonte: `app/api/hotmart/webhook/route.ts:45`.

## Garantias, limites e configuração

**FATO CONFIRMADO — IMPLEMENTADO:** `events` guarda IDs determinísticos, reversões e andamento `pending → applying → granted`; `applying` nunca é tratado como processado. UPDATE de crédito usa saldo e `updated_at` no filtro e exige linha retornada. Falha comprovada sem escrita libera pending; falha posterior ao grant confirmado retoma pedido/telemetria sem conceder novamente. Nomes internos estão bloqueados no sink público. Fontes: `lib/payments/alternative.ts:87`, `lib/payments/alternative.ts:109`, `app/api/events/route.ts:22`.

**FATO CONFIRMADO — LIMITAÇÃO:** não existe transação única entre alteração de saldo e confirmação no journal. Queda após iniciar grant, timeout de resultado desconhecido ou falha ao gravar a confirmação deixa `applying`, devolve 500 com `reconciliation_required` e **exige reconciliação**; não regranta às cegas nem responde duplicata 200. Repetir webhook não resolve automaticamente esse caso ambíguo. Fonte: `lib/payments/alternative.ts:109`. Uma garantia de recuperação automática integral exigiria mecanismo transacional de grant/recibo, fora do veto a migrations desta tarefa.

**FATO CONFIRMADO — LIMITE DE ESCOPO:** reversão bloqueia concessão futura; este PR não implementa retirada automática de créditos já consumidos/concedidos por pagamento reembolsado. Fontes: `lib/payments/alternative.ts:50`, `lib/payments/paypal.ts:97`.

**FATO CONFIRMADO — ESCOPO PRESERVADO:** nenhum arquivo em `app/api/stripe/**`, `lib/checkoutPricing.ts` ou migrations foi alterado. Catálogos de preços/quantidades, tiers e `renewalBalance` permanecem nas fontes existentes; nenhum pagamento real, leitura de `.env*`, build, deploy ou consulta ao banco real foi feito. Verificação: diff deste PR e execução offline de 07/10/2026.

**QUESTÃO PENDENTE / DESCONHECIDO:** segredos instalados, inscrições atuais de webhooks, schema efetivo e resultado em produção não foram consultados. Tabelas vazias são contexto informado pelo fundador, não nova medição. Linhas legadas anteriores a este journal exigem avaliação antes de reprocessamento; a validação local usa pedidos inicialmente vazios, conforme o cenário solicitado.

## Validação

**TESTADO LOCALMENTE — 07/10/2026:** `node scripts/test-pagamentos-alternativos-2026-10.mjs`: **rc=0, 333 verificações, 21 mutantes mortos**. `readFileSync` + `ts.transpileModule`, rotas reais em VM, imports relativos sem resolver `@/`, dependências externas falsas e rede bloqueada. Fonte: `scripts/test-pagamentos-alternativos-2026-10.mjs:1`.

**TESTADO LOCALMENTE — 07/10/2026:** cobertura inclui as cinco regras por provedor; pedido/telemetria indisponíveis; resultado de grant incerto; concorrência; conta Hotmart ausente; retorno PayPal antes/depois do webhook; renovação, suspensão e reativação; validação real de HMAC/Hottok e verificação PayPal com HTTP falso; autorização do setup e preservação de inscrições ao incluir reembolsos. Os mutantes retiram concessão, dedupe, ordem correta, propagação de erro, bloqueio de reembolso, autenticação e dono de `payment_success`.

**TESTADO LOCALMENTE — 07/10/2026:** `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`: **rc=0**. CRLF preservado nos arquivos da entrega; verificação de whitespace usa `git -c core.whitespace=cr-at-eol diff --check` para reconhecer CRLF.

## Fontes oficiais

**FATO CONFIRMADO — DOCUMENTAÇÃO OFICIAL**, consultada em 06–07/10/2026:

- [PayPal: autenticação, JSON bruto e retries](https://developer.paypal.com/api/rest/webhooks/rest/).
- [PayPal: tipos de evento](https://developer.paypal.com/api/rest/webhooks/event-names/).
- [PayPal: refund de captura e relação up](https://developer.paypal.com/api/payments/v2/captures-refund).
- [PayPal: sale e billing_agreement_id](https://developer.paypal.com/api/deprecated/payments/v1/sale-get).
- [PayPal: refund e sale_id](https://developer.paypal.com/api/deprecated/payments/v1/definitions/refund/).
- [PayPal: atualizar inscrição de eventos](https://developer.paypal.com/api/webhooks/v1/webhooks-update).
- [Mercado Pago: assinatura HMAC, manifesto e retries](https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/additional-content/notifications/webhooks).
- [Mercado Pago: normalização de data.id](https://www.mercadopago.com.br/developers/pt/docs/wallet-connect/notifications).
- [Hotmart: Hottok, evento e transação](https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/).
- [Hotmart: histórico/reenvios](https://help.hotmart.com/en/article/360001491352/how-to-set-up-).
- [Supabase: UPDATE com retorno de linhas](https://supabase.com/docs/reference/javascript/update), [maybeSingle](https://supabase.com/docs/reference/javascript/maybesingle).

**SUGESTÃO — PRÓXIMO PASSO RECOMENDADO:** revisar e homologar em ambiente autorizado, confirmar `MP_WEBHOOK_SECRET`, `PAYPAL_WEBHOOK_ID` e eventos de reversão inscritos, e definir reconciliação de grants ambíguos antes de declarar operação validada em produção. Este PR entrega código testado localmente; publicação e validação real continuam pendentes.
