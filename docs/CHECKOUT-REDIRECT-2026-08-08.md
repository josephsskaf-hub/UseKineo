# Checkout redirect — sessão criada, cliente nunca chegou ao Stripe

`KINEO-CHECKOUT-REDIRECT-2026-08-08`

## O incidente

Usuário `e934461f-… (perfil ZA)` (`[cliente ZA - e-mail no banco]`,
África do Sul, conta criada 18:22, trial ativo, 11 dos 40 créditos já gastos —
alguém que **usou** o produto e decidiu comprar). Tier Creator (`basic`),
superfície `generate_step_1` (`components/PricingCards.tsx`).

| Hora (UTC, 07/08) | Evento | O que significa |
|---|---|---|
| 19:27:10.456 | `checkout_cta_clicked` | clique registrado, `window.location.href` disparado |
| 19:27:10.614 | `checkout_attempted` | o request chegou ao nosso servidor em **158 ms** |
| 19:27:12.017 | `checkout_started` | `cs_live_… (id no banco)…` — **a sessão Stripe FOI criada**, em 1,5 s |
| 19:27:25.983 | `checkout_redirect_timeout` | `waited_ms: 15000` — o documento **ainda estava em `/generate`** |
| 19:27:45.003 | `checkout_resume_banner_viewed` | ele foi para `/account` procurar o que fazer, e foi embora |

Nunca voltou. `profiles.plan = 'free'`, `payments = 0`. Único checkout iniciado
em 24 h.

## Causa raiz

**O último salto — navegador → `checkout.stripe.com` — nunca terminou, e a
nossa tela não tinha um único link para a sessão que já existia.**

Como sabemos que o problema é o último salto e não o nosso servidor:

1. O servidor respondeu `307` para `session.url` em 1,5 s
   (log Vercel `19:27:09 GET /api/stripe/checkout 307`).
2. **O navegador RECEBEU esse 307.** Prova: o `Set-Cookie` que viaja junto
   (`kineo_checkout_session`, gravado por `rememberRecurringCheckout`) foi
   persistido — 30 s depois o resume banner resolveu
   `destination_kind: open_session` a partir dele.
3. `pagehide` nunca disparou (se tivesse, o watchdog teria sido cancelado e o
   evento de timeout não existiria). O documento nunca saiu de `/generate`.

Ou seja: recebemos o redirect, o navegador tentou o salto para a Stripe numa
rede móvel sul-africana, e ficou 14 s sem resolver. O comprador viu um botão
escrito "Loading…" e desistiu.

### Hipóteses eliminadas, uma a uma

| # | Hipótese | Veredito |
|---|---|---|
| a | resposta traz `sessionId` e usamos `stripe.redirectToCheckout` (script de 3º bloqueado/lento) | **Eliminada.** Não existe `stripe-js` no cliente. O fluxo é navegação de página inteira para `/api/stripe/checkout`, que responde 3xx. |
| b | redirect dentro de um `await` que nunca resolve | **Eliminada.** `launch()` faz `window.location.href = url` de forma síncrona, no mesmo tick do gesto. Não há `await` antes dele. |
| c | navegação bloqueada por não ser gesto direto | **Eliminada como causa** (a navegação partiu do gesto original), mas **relevante para o conserto**: qualquer retry por JS depois de 15 s já não tem gesto válido em Safari/iOS. Por isso o fallback é uma `<a href>` de verdade. |
| d | `trackEvent` antes do redirect é awaited e trava | **Eliminada.** Todos os `trackEvent` de `launch()` são `void trackEvent(...)` dentro de `try/catch`. |
| e | erro de JS na página matando o handler | **Eliminada.** O handler rodou até o fim: `checkout_cta_clicked` e `inline_pricing_checkout_clicked` foram ambos gravados, e o watchdog agendado por ele disparou 15 s depois. |
| f | CSP (`form-action` / `navigate-to`) bloqueando a saída para a Stripe | **Eliminada.** Não existe CSP nenhuma no `next.config` nem em middleware. |

### O erro de desenho que custou o dinheiro

O watchdog de 15 s existia desde `KINEO-CHECKOUT-TRIAGE-2026-07-25`, mas só
fazia duas coisas: gravar um evento e escrever *"tente de novo"*.

**A sessão Stripe já estava criada, viva e paga-pronta, e a tela não oferecia um
único caminho até ela.** Um timeout que só vira telemetria é uma venda perdida
em silêncio — a instrumentação registrou o fracasso com precisão de milissegundo
e não fez nada para evitá-lo.

## Taxa histórica

Desde que o watchdog existe (28/07):

- `checkout_started`: **39**
- `checkout_redirect_timeout`: **2** → **5,1 %** dos checkouts iniciados
- `payment_success` no mesmo período: **3**

Ou seja: **para cada 1,5 pagamento que entrou, 1 comprador com a sessão já criada
não conseguiu chegar à tela de pagamento.** Ambos os timeouts na mesma
superfície (`generate_step_1`). É recorrente, não é um azar isolado.

## O que foi corrigido

### 1. O timeout agora vira um botão, não um evento

`lib/checkoutTelemetry.ts`:

- **aos 6 s** (`RESUME_PROBE_MS`, antes do watchdog de propósito) sondamos
  `GET /api/stripe/checkout/resume`. Esse endpoint é *read-only*, valida a posse
  (`session.metadata.supabase_user_id === user.id`) e **não cunha sessão** —
  sondar não pode duplicar cobrança. Ele devolve a URL **viva** da sessão que
  acabou de ser criada;
- **aos 15 s** publicamos essa URL num store de módulo, e o
  `<CheckoutStalledCta/>` a renderiza.

`app/api/stripe/checkout/resume/route.ts` passou a devolver `directUrl` — a URL
hospedada pela Stripe, crua — para destinos `open_session` / `stripe_recovery`.
`internal_retry` fica de fora de propósito: aquele destino é rota nossa, **cunha
sessão** e precisa da validação de servidor (preço privado KINEO5, elegibilidade
do intro).

### 2. O fallback é uma âncora, não JavaScript

`components/CheckoutStalledCta.tsx` — `<a href="https://checkout.stripe.com/…">`.
Sem `preventDefault`, sem `window.location`, sem `stripe-js`, sem promessa que
possa não resolver, sem `target="_blank"` (nada de popup blocker). Um salto só.
E o clique é um **gesto direto do usuário**, que é o que Safari/iOS exige — o
gesto do clique original já tinha expirado depois de 15 s de espera.

Montado **uma vez em `app/layout.tsx`**, e não passado como prop: existem 15
superfícies de checkout no repo. A que ficasse de fora seria exatamente a que
perderia a próxima venda.

### 3. `[BÔNUS, ACHADO NO MESMO REQUEST]` cupom de intro quebrado desde 04/08

O log do request que perdeu a venda também trazia:

```
[stripe/checkout] intro coupon unavailable — full price: KINEO_INTRO_BASIC_USD_VALUE
  Invalid string: Kine...lue); must be at most 40 characters   (param: 'name')
```

`Coupon.name` na Stripe tem **limite de 40 caracteres** e o nome gerado passava:

- `Kineo — first month intro (basic/USD/value)` = **43**
- `Kineo — first month intro (basic/USD/standard)` = **46**

Como `region` só entrou no id/nome em `KINEO-REGIONAL-PRICING-2026-08-04`, os
cupons da região **padrão já existiam** na conta Stripe e o `retrieve` os
encontrava. O estouro só atingia cupons **ainda não criados** — ou seja, **todos
os `_VALUE`**.

Consequência: **desde 04/08 todo comprador da região `value` (África, Índia,
Brasil, LatAm) via "First month $9.90" no botão e recebia um checkout de
$19.90**, sem um único erro visível na tela. Confirmado no banco:

| região | intro pedido | intro aplicado | n |
|---|---|---|---|
| `value` | true | **false** | **3 / 3** |
| `standard` | true | true | 4 / 4 |

**100 % de falha na região `value`, 0 % na padrão.** O nosso comprador é
exatamente esse caso (`displayed_intro_price_minor: 990`,
`checkout_started.intro_applied: false`). Mesmo que o redirect tivesse
funcionado, ele teria aterrissado numa página cobrando o dobro do prometido.

Conserto: nome curto (`Kineo intro basic/USD/value` = 27; pior caso 32) com
`.slice(0, 40)` defensivo, **mais** um fail-safe que recria o cupom **sem nome**
se a criação falhar — `name` é puramente cosmético (aparece no dashboard, nunca
na fatura) e jamais pode ser o motivo de um desconto prometido não ser aplicado.

## Revisão adversarial

| Risco | Veredito |
|---|---|
| **duplo-submit criando 2 sessões** | A trava de clique dentro dos 15 s é a de antes, intacta. A sonda é `GET` read-only. O `directUrl` aponta para a Stripe (zero criação). No pior caso (sonda sem resposta) o fallback é a própria URL do clique, que o servidor colapsa na **mesma** sessão por 5 min (`checkoutIdempotencyKeyFor` / `oneTimeIdempotencyKey`). |
| **fallback em cima de um checkout que funcionou** | O watchdog só dispara se `pagehide` não tiver disparado — se a navegação acontecesse, ele já teria sido cancelado. `pageshow` (volta do Stripe / bfcache) chama `clearStalledCheckout()`. Um novo `launch()` limpa o store. Em carga nova de página o store nasce `null`. |
| **link expirado sendo oferecido** | `directUrl` só sai quando `session.status === 'open'`, **relido da Stripe no instante da sonda** — não é uma URL cacheada no clique. Sessão morta → o fallback vira a URL do clique, que gera uma sessão válida. |
| **oferecer "pague aqui" a quem já pagou** | `reason: 'already_subscribed'` bloqueia o fallback inteiro. E se a sonda não responder a tempo, a URL do clique cai no bloqueio de assinatura duplicada que já existe no route. |
| **dois cards no mesmo canto** | `CheckoutResumeBanner` se esconde enquanto há um stall ativo (`|| stalled`). |
| **hydration mismatch** | `useStalledCheckout` nasce `null` e só lê o store dentro de `useEffect`; no servidor o componente devolve `null`. |

## Verificação

`npx tsc --noEmit` → **EXIT=0**.

## Arquivos

- `lib/checkoutTelemetry.ts` — sonda de resgate, store de stall, fallback no watchdog
- `components/CheckoutStalledCta.tsx` *(novo)* — a âncora
- `app/layout.tsx` — monta o CTA uma vez
- `components/CheckoutResumeBanner.tsx` — cede o canto ao CTA de resgate
- `app/api/stripe/checkout/resume/route.ts` — expõe `directUrl`
- `app/api/stripe/checkout/route.ts` — conserta o nome do cupom de intro

## Pendências para o fundador

1. **A sessão `cs_live_… (id no banco)…` já expirou.** Desde
   `KINEO-FAST-RECOVERY-2026-08-02` as sessões vivem **~2 h**
   (`sessionParams.expires_at = checkoutWindow * 300 + 2h`), não 24 h. Criada
   19:27 de 07/08 → morta por volta das 21:27 do mesmo dia. O rascunho de e-mail
   aponta para um checkout **novo**.
2. Rascunho de recuperação em `docs/EMAIL-RECOVERY-misheck-2026-08-08.md` —
   **não enviado**, aguardando aprovação.
3. Vale conferir na Stripe se algum dos outros 2 compradores `value` de 04–07/08
   chegou a ser cobrado a mais do que o anunciado.
