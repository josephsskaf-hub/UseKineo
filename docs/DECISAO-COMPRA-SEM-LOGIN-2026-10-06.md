# Decisão — compra sem login (06/10/2026)

**Status:** código pronto na branch `codex/compra-sem-login2-0610` (sobre a main e6a89a8e): primeiro os commits com o
interruptor DESLIGADO (o site se comporta exatamente como hoje) e, por último e sozinho, o commit que só vira o
interruptor para LIGADO. Nada foi publicado; publicar é o clique do fundador.

## A decisão

Em 06/10 o fundador aprovou: **"pode fazer compra sem login, sem problema nenhum"**.

Quem ainda não tem conta clica num plano e vai direto para a página de pagamento da Stripe. A conta nasce depois,
no webhook, a partir do e-mail que a pessoa digitou na Stripe. Só a Stripe; PayPal, Mercado Pago e Hotmart não mudaram.
Preço, moeda, plano, créditos e ofertas são exatamente os do caminho com login (mesmas variáveis, mesma conta).

## Por quê — os números de 30 dias (medidos em 06/10)

| Degrau | Pessoas |
|---|---|
| Cliques anônimos em plano | 89 |
| Sessões que caíram no "entre primeiro" (cadastro antes de pagar) | 37 |
| Voltaram logadas | 13 |
| Chegaram à Stripe | 12 |
| Pagaram | 3 |
| Sumiram no "entre primeiro" | 24 |

O "entre primeiro" perdeu 24 de 37 antes de chegarem à Stripe; dos 12 que chegaram, 3 pagaram. A compra sem login
tira esse degrau do caminho. O que acontece dentro da página da Stripe (o preço) não muda com isso.

## O fluxo

1. **Clique no plano, sem conta** — `app/api/stripe/checkout/route.ts` (bloco "quem não tem conta paga primeiro",
   ~linha 1160). A régua `guestCheckoutFallbackReason` (`lib/growth/guestCheckout.ts`) decide: compra simples vira
   convidado; cupom, desconto de 1º mês, trial com cartão, volta da marca d'água, recuperação de checkout e robô
   voltam ao caminho de hoje (cadastro antes), porque dependem de saber quem compra.
2. **Sessão da Stripe sem conta** — `buildGuestSubscriptionAndRedirect` (~linha 2570): mesmo preço/moeda do logado,
   sem `customer`, metadata `kineo_guest=1`, o afiliado (`aff_code`/`aff_click`) e o hash de um segredo guardado num
   cookie httpOnly do navegador que abriu a compra. A Stripe coleta o e-mail e avisa que a conta é esse e-mail.
3. **Nunca pior que hoje** — se a Stripe der erro (qualquer exceção ou 4xx), devolver sessão sem URL, ou qualquer
   coisa quebrar no meio, o visitante cai EXATAMENTE no caminho de hoje: o mesmo redirect ao cadastro e o mesmo
   `checkout_auth_required`, mais um evento `guest_checkout_fallback` com o motivo (`stripe_session_failed`,
   `stripe_session_without_url`, `guest_session_threw`, ou o motivo da régua). Nunca a mensagem crua da Stripe.
4. **Pagamento → webhook** — `app/api/stripe/webhook/route.ts` (~linha 1739): acha a conta pelo e-mail ou cria
   (confirmada, carimbada em `app_metadata` com a sessão Stripe), carimba o dono no Customer e na Assinatura (as
   renovações acham a pessoa) e concede EXATAMENTE o grant do caminho logado. Idempotente pela sessão Stripe; erro
   = 500 para a Stripe reenviar. E-mail que já tinha plano ativo de outra assinatura = conflito: nada concedido,
   evento `guest_checkout_conflict` e aviso ao fundador.
5. **E-mail "sua conta Kineo está pronta"** — `sendGuestAccountReadyEmailOnce` (`lib/stripe/guestCheckout.ts`), chamado
   pelo webhook só quando a conta NASCEU desta compra, depois do grant. Um por sessão Stripe (reserva em
   `stripe_events`), sem preço no texto, com um link de entrada de uso único que vale 72 h (token nosso, assinado;
   `lib/auth/guestAccess.ts`). Cobre quem fechou a aba antes de voltar da Stripe. Conta que já existia continua
   recebendo só o link que a página manda.
6. **Volta da Stripe** — `/checkout/guest` consulta `app/api/stripe/checkout/guest-access/route.ts`:
   - conta nova + o mesmo navegador da compra + dentro de 15 min + primeira vez = login de uso único, direto no
     Studio (o id dessa sessão fica em `app_metadata`);
   - conta que JÁ existia = nunca loga sozinha: o plano entra na conta e um link vai para a caixa do e-mail;
   - outro navegador, fora da janela ou já usado = "pedir link por e-mail" (até 3 por compra).
7. **Links por e-mail** — `app/auth/guest-link/route.ts` troca o link (`?token_hash=` do e-mail pedido na página, ou
   `?ready=` do e-mail "conta pronta") por sessão no servidor, uma vez.

## Riscos e o que segura cada um

| Risco | Mitigação |
|---|---|
| Alguém paga digitando o e-mail de OUTRA pessoa que não tinha conta e entra pelo login automático | A 1ª entrada que prova o e-mail (link por e-mail, Google pela `/auth/callback`, recuperação de senha pela `/api/auth/guest-sessions`) derruba as OUTRAS sessões (`signOut` scope `others`) e troca a senha por uma aleatória (linha abaixo), uma vez por conta, e grava `guest_sessions_revoked`. Prova = método da sessão no claim `amr` do JWT (oauth, otp, recovery…); **senha nunca prova**. A sessão do login automático não dispara a derrubada. Depois da prova, o login automático daquela compra não abre mais. O token de acesso que a sessão derrubada já tinha vale até expirar (até 1 h) em leitura direta ao banco; renovação e `getUser` param na hora. |
| Mesmo cenário, se quem pagou pôs uma SENHA direto na API do Auth antes da dona entrar | **FECHADO (decisão do coordenador em 06/10, leva 3).** Na mesma 1ª prova, uma vez por conta e só em conta nascida de compra sem login, a senha vira uma aleatória forte que ninguém conhece (256 bits, nunca gravada nem registrada) e o evento `guest_sessions_revoked` leva `password_scrambled: true`. Link por e-mail e Google: troca pelo admin; como no Auth a troca de senha pelo admin encerra TODAS as sessões (inclusive a que acabou de provar o e-mail), a sessão da dona é religada na mesma requisição (`session_reentered`). Recuperação de senha: troca pela própria sessão de recuperação (o Auth mantém essa sessão e derruba as outras); pelo admin, a pessoa perderia a sessão no meio da troca, e a página espera essa troca terminar antes de gravar a senha escolhida. Se a troca falhar, a derrubada segue e o motivo vai em `password_scramble_error`. Quem usa as telas do site nunca tem senha antes da 1ª prova, então ninguém de boa-fé perde uma senha que escolheu. |
| E-mail de quem já tinha conta | Nunca loga sozinho; o plano entra na conta; o link vai só para a caixa dela. |
| Dois cliques / reenvio do webhook | Mesma sessão Stripe por navegador (idempotência); conta, eventos e e-mails com reserva por sessão. |
| Resend fora na hora do webhook | O pagamento segue entregue (200); a falha vira `guest_account_ready_email_failed` e a reserva volta — um novo evento da mesma sessão reenvia. Não há fila de reenvio dedicada; a pessoa ainda entra pela página, por Google ou por "Forgot password". |
| Derrubada desloga o próprio comprador | Quando a dona é a própria compradora e entra depois por outro aparelho (Google/link), a aba da compra sai uma vez. Ela entra de novo pelo link ou Google. |
| Afiliado | O cookie viaja na metadata da sessão e a comissão nasce no webhook, para a conta nova. |

O que só um pagamento real prova: o e-mail que a Stripe coleta de verdade, o claim `amr` real do Auth na volta do
Google/recuperação (medido no banco: `oauth`, `otp`, `recovery`, `password`), a troca de senha + religar a sessão no
Auth de produção (comportamento lido no código do supabase/auth: admin → encerra todas as sessões; a própria sessão →
encerra as outras), a entrega do Resend e o pixel de compra.

## O interruptor

`export const GUEST_CHECKOUT_LIVE` em `lib/growth/guestCheckout.ts` — um lugar só (o guardião
`scripts/test-compra-sem-login-2026-10-06.mjs` falha se aparecer outro). Ele controla a rota de checkout, o rótulo dos
botões de plano (/pricing, home, /ads) e as notas de "você cria a conta antes".

## Como desligar

1. Trocar a linha para `export const GUEST_CHECKOUT_LIVE = false`.
2. Publicar pelo caminho de sempre (enfileirar + clique do fundador).

Desligado, o anônimo volta a ver o cadastro antes da Stripe, byte a byte como antes. Quem JÁ pagou como convidado
continua atendido: webhook, página `/checkout/guest`, links por e-mail e a derrubada de sessões não dependem do
interruptor.

## Como medir depois de ligar

- `checkout_guest_started` → `payment_success` com `metadata.guest_checkout = true` (por pessoa, não por evento).
- `guest_checkout_fallback` por motivo — se `stripe_session_failed` aparecer, a Stripe está recusando a sessão.
- `guest_account_created` vs `guest_account_matched` vs `guest_checkout_conflict`.
- `guest_login_link_used` por método (`auto`, `email_link`, `ready_email_link`) e `guest_login_refused` por motivo.
- `guest_sessions_revoked` — conta de convidado em que a dona do e-mail entrou com prova; `password_scrambled` (e
  `password_scramble_error` quando falha) e `session_reentered` (link/Google) dizem se a senha foi trocada e se a
  sessão da dona voltou.
- `guest_account_ready_email_sent` / `guest_account_ready_email_failed`.

## 07/10 — cupom de boas-vindas

**Status:** branch `codex/cupom-convidado-0710` sobre a main 469164bc. Commit 1 com o interruptor
`GUEST_WELCOME_PROMO_LIVE` DESLIGADO (o site se comporta exatamente como hoje: 33 pedidos e compras executados na base e
na branch deram o mesmo transcrito, byte a byte); commit 2 só vira o interruptor para LIGADO. Nada foi publicado.

### A decisão

Fundador, 07/10: **"vai para cupom"**. A oferta de boas-vindas da home (modal "Your first month is 20% off", links
`/api/stripe/checkout?tier=basic|pro&billing=monthly&promo=WELCOME20&checkout_origin=welcome20_modal`, evento com
`public_promo_kind = welcome_first_month_20`) também compra sem conta: o visitante vai direto à Stripe com os mesmos 20%
do 1º mês do caminho com login.

### Por quê

A compra sem login de 06/10 não alcançava essa oferta: a régua mandava todo `?promo=` para o cadastro (conferido em
produção em 07/10). Em 30 dias, **32 sessões anônimas — cerca de 30% das que tentaram comprar sem conta — chegaram ao
"entre primeiro" por essa oferta.**

### Como o caminho com login aplica o WELCOME20 (lido em 07/10; nada disso mudou)

- Código promocional `WELCOME20` → cupom `KINEO_WELCOME20` (20%, `once` = só o 1º mês), criado pela própria rota na
  primeira vez (desde 25/08). Constantes em `lib/growth/publicPromoTruth.ts`.
- Recorte: Creator ou Studio, mensal. Fora disso a rota recusa com a mensagem de desconto não verificado.
- Antes de abrir a sessão, `resolvePromisedPublicPromo` confere o código ativo, sem validade vencida nem limite esgotado,
  **sem** restrição de primeira compra, valor mínimo, moeda ou cliente, e o cupom exato (20%, `once`).
- "Um desconto de boas-vindas por cliente" não tem checagem no servidor (nem `has_paid`, nem uso anterior). O que existe
  é o modal sumir para assinante pagante (`/api/me/plan`, no navegador) e a rota recusar uma 2ª assinatura ativa.

### O que a Stripe diz (documentação oficial, lida em 07/10/2026)

[docs.stripe.com/payments/checkout/discounts](https://docs.stripe.com/payments/checkout/discounts?payment-ui=stripe-hosted),
seção "Limit by first-time order": sem `customer` na sessão, a compra **é considerada primeira transação**, e códigos
restritos a primeira compra continuam aceitos em sessões que não criam cliente. Na referência da API
([promotion_codes/create](https://docs.stripe.com/api/promotion_codes/create), `restrictions.first_time_transaction`) o
teste é sobre o objeto Customer ("Customers without any successful payments or invoices"), nunca sobre o e-mail. A compra
de convidado não manda `customer` (a Stripe cria um Customer novo a cada compra), então **a restrição nativa não impede o
mesmo e-mail de usar o desconto de novo**. E a verificação do caminho com login recusa um WELCOME20 com essa restrição
(`first_transaction_restricted`): ligá-la quebraria a oferta para quem tem conta. Nenhum cupom ou código novo foi criado.

**Nada a criar no painel da Stripe:** o código WELCOME20 já existe em produção e passa na verificação — em 30 dias (até
07/10), 10 sessões do caminho com login saíram com o desconto aplicado, a última em 01/10 23:32 UTC, e nenhuma falhou na
verificação (consulta só de leitura em `events`). Se um dia o código sumir, o convidado volta ao cadastro e o motivo
aparece em `guest_checkout_fallback` (`not_found_or_inactive`).

### O desenho

1. **Régua** (`guestCheckoutFallbackReason`, `lib/growth/guestCheckout.ts`): só a oferta de boas-vindas passa, e só com o
   interruptor ligado. Outros cupons, recuperação de checkout, 1º mês com desconto, trial, Plan Fit, volta da marca
   d'água e robô continuam no cadastro.
2. **Rota** (`buildGuestSubscriptionAndRedirect`, `app/api/stripe/checkout/route.ts`): o mesmo recorte (Creator/Studio
   mensal) e a mesma verificação do caminho com login, só lendo a Stripe. A sessão sai com o desconto (`discounts`), o
   carimbo `public_promo_state = applied` na sessão e na assinatura, o valor do 1º mês na volta e o cupom na página de
   desistência — o mesmo que o caminho com login faz.
3. **Nunca pior que hoje:** código ausente ou arquivado, cupom diferente do prometido, Stripe fora do ar ou recusando a
   sessão → o visitante cai no cadastro de hoje (mesmo redirect, mesmo `checkout_auth_required`) e o motivo vai em
   `guest_checkout_fallback` (`welcome_promo_unavailable` + `public_promo_failure_reason`, ou `stripe_session_failed`).
   Nunca uma sessão a preço cheio no lugar da prometida.
4. **Webhook:** o mesmo plano e os mesmos créditos do caminho com login com o desconto (plano cheio; o desconto é só no
   dinheiro). `payment_success` e `guest_account_created`/`guest_account_matched` da compra de convidado registram a oferta
   (`guest_welcome_promo = true`, `public_promo_kind`, `public_promo_first_charge_minor`).
5. **Monitoramento do risco:** compra de convidado com o desconto numa conta que **já tinha pago** (`has_paid` antes desta
   compra) grava `guest_welcome_promo_reused` (id determinístico; falha ao gravar = 500 e a Stripe reenvia antes de
   conceder) e avisa o fundador por e-mail (1× por sessão, padrão do `guest_conflict`). O plano é concedido normalmente.

### Risco aceito

| Risco | O que acontece |
|---|---|
| Quem já pagou antes volta como convidado e leva 20% de novo no 1º mês | Aceito pelo fundador em 07/10 (é 20% de UM mês). O plano entra; `guest_welcome_promo_reused` + aviso contam cada caso. |
| A mesma pessoa usa outro e-mail | Invisível para a casa (para a Stripe e para nós é um cliente novo). Aceito pelo mesmo motivo. |
| Reentrega do webhook depois do grant acusar "reuso" de quem comprou pela 1ª vez | Não acontece: se o perfil já aponta para ESTA assinatura, o `has_paid` é desta compra e não conta. |
| "Já usou o WELCOME20" sem nunca ter pago | Não existe na prática: toda compra concluída com o desconto passa pelo grant, que grava `has_paid = true`, e nada no código o volta a `false`. |

### O interruptor

`export const GUEST_WELCOME_PROMO_LIVE` em `lib/growth/guestCheckout.ts` — um lugar só; só a rota de checkout o lê (o
guardião falha se aparecer outro). Desligar = trocar para `false` e publicar pelo caminho de sempre: o link do modal volta a
pedir cadastro. O webhook não olha o interruptor: compra feita com ele ligado é entregue e medida mesmo depois.

### Como medir

- `checkout_guest_started` com `public_promo_applied = true` → `payment_success` com `guest_welcome_promo = true`, por
  pessoa.
- `guest_checkout_fallback` com `guest_fallback = 'welcome_promo_unavailable'`, por `public_promo_failure_reason`
  (`not_found_or_inactive` = o código WELCOME20 sumiu ou foi arquivado na Stripe).
- `guest_welcome_promo_reused` (e o aviso por e-mail): se repetir, reavaliar o risco.

### Provas

- Guardião `scripts/test-compra-sem-login-2026-10-06.mjs` (código real com Stripe, banco e Auth falsos): Stripe direto
  com o mesmo desconto do caminho com login (comparado campo a campo), recorte igual ao do logado em todos os planos ×
  períodos, outros cupons no cadastro, 8 falhas da Stripe = resposta de hoje, mesmo grant, reuso registrado e avisado 1×,
  interruptor desligado = hoje byte a byte; cada regra com mutante cuja aplicação é provada.
- Diferencial contra a base 469164bc (uso único, fora do repositório): 33 pedidos e compras com relógio e aleatoriedade
  fixos deram o mesmo transcrito byte a byte com o interruptor desligado; com ele ligado, só os 6 pedidos anônimos com
  WELCOME20 mudaram.

### O que só um pagamento real prova

A Stripe aceitando `discounts` com o código numa sessão de assinatura sem `customer`; o valor cobrado com 20% em dólar e
em real (o arredondamento é da Stripe); a 2ª mensalidade a preço cheio; o `total_details.amount_discount` real no
webhook; e o aviso chegando ao e-mail do fundador.
