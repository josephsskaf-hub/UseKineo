# SPRINT PAGAMENTOS — 07/09/2026 (12:38 → 20:38 BRT)

**Marco do ciclo: `2026-09-07 15:38:00+00` (12:38 BRT).** Toda medição de
eficácia deste ciclo se recorta nesse instante ou no CARIMBO DO CAMPO NOVO —
nunca em "últimas N horas", que mistura o antes com o depois.

## A ordem do fundador (07/09 12:10 BRT — "urgente")

> "Eles [indianos] chegam muito no checkout, às vezes não têm cartão de crédito
> e acabam não pagando. Aceitar UPI só para quem vem de IP da Índia; aceitar
> pré-pago/débito; e o cara do cartão recusado."

Enquanto o fundador e o Cowork abrem as contas (Dodo Payments = UPI/RuPay para
a Índia; PayPal Business = segunda porta), esta pista liga o site. Tudo que
depende de chave nasce DESLIGADO por env e passa a funcionar sozinho quando a
chave existir; nada que NÃO dependa de chave espera por ela.

## O dado que abre o ciclo (30 dias, contas com país de IP identificado)

Medido 07/09 13:1x BRT, cruzando por pessoa (não por evento), país = moda do
`ip_country` dos eventos da pessoa:

| país | pessoas | com filme | chegou ao checkout | pagou |
|---|---|---|---|---|
| Índia | 47 | 36 | 21 | **0** |
| Nigéria | 22 | 19 | 12 | **0** |
| Paquistão | 10 | 9 | 3 | **0** |
| Bangladesh | 3 | 1 | 2 | **0** |
| Quênia | 4 | 3 | 2 | **0** |
| EUA | 31 | 20 | 10 | 1 |
| Brasil | 7 | 5 | 5 | 1 |
| Reino Unido | 6 | 6 | 2 | 1 |

**40 pessoas dos cinco países-alvo chegaram à página de pagamento em 30 dias e
nenhuma pagou.** Os outros três países somam 17 no checkout e 3 pagamentos.
Cartão indiano em recorrência internacional esbarra no e-mandate do RBI, e UPI
pela Stripe não existe para comerciante fora da Índia.

---

### #1 — 12:38→13:38 — a recusa de cartão passa a ter DONO

**Press release (o que o cliente consegue às 20:38 que não conseguia às 12:38):**
o comprador cujo cartão o banco recusou deixa de sumir sem nome. Até hoje a
casa registrava a recusa e não sabia de quem era; a partir deste deploy ela
sabe quem foi, que plano tentou, de que país veio e por qual caminho — que é a
condição para existir qualquer carta de "tente outro cartão" e para contar
recusa por país, que é o número que decide se a Índia precisa de outro trilho.

**Errado (medido 07/09, base inteira; o instrumento nasceu em 03/09):**
`checkout_payment_failed` tem **3 linhas na história inteira**. As **2 de
renovação** têm `user_id`. A **única de compra inicial** — 07/09 05:35 UTC,
Visa **pré-pago** dos EUA, `card_restricted`, `declined_by_network`, risco
normal, US$ 23,20 (Studio com welcome20) — veio com **`user_id` NULL**.

Não é azar, é estrutural, e a causa é mecânica:

1. Em `mode: 'subscription'` a Stripe cria o PaymentIntent a partir da
   **fatura**. `session.metadata` e `subscription_data.metadata` pousam na
   Sessão e na Assinatura — **nunca no PaymentIntent** (`payment_intent_data`
   só é aceito em `mode: 'payment'`). Logo
   `failedIntent.metadata.supabase_user_id` é null **sempre** nesse caminho.
2. O único plano B que existia era `profiles.stripe_customer_id` — coluna
   escrita **só quando um pagamento dá certo** (`checkout.session.completed`).

Junte os dois: **a casa só conseguia nomear quem já tinha pagado.** As duas
renovações resolveram porque o pagante já tinha a coluna preenchida. O primeiro
comprador recusado — exatamente o alvo do pedido do fundador — é anônimo por
construção. E recusa anônima não tem remédio: não dá para escrever para ela,
nem contá-la por país, nem saber que plano ela tentou.

**Quem é a pessoa de 05:35, achada por correlação:** `egotisticalfr@gmail.com`.
Conta criada **05:32:09**; `checkout_attempted` **05:32:11** — dois segundos
depois; `checkout_started` 05:32:12; recusa 05:35:06. **Zero filmes**, 25
créditos intactos, e nenhum evento desde então. Ela não veio experimentar: veio
**comprar**, em dois segundos, e o banco dela disse não. É o melhor alvo de
carta que a casa tem hoje — e era invisível.

**Mudou — SHA `8f7c1084` · EM PRODUÇÃO** (`git ls-remote origin main` =
8f7c1084, fila 0). Sem fonte nova: a fatura **já era buscada** no handler e
dessa viagem só se aproveitava `billing_reason`. Agora `invoice.subscription`
leva à Assinatura (que carrega `supabase_user_id`, `tier`, `checkout_origin`) e
`checkout.sessions.list({ subscription })` devolve a Sessão — a **única** fonte
de `ip_country`, o campo que decide se a hipótese Índia/Nigéria é verdade. O
recurso estava sendo buscado e jogado fora.

Escada de 5 degraus, para no primeiro que resolve, no máximo 4 chamadas extras
à Stripe, **cada degrau com o próprio `catch`**: identidade é enriquecimento e
nunca pode derrubar o registro da recusa. O último degrau (customer → e-mail →
perfil) é o único que alcança quem nunca pagou, e viaja marcado como
**inferência**, não como fato.

`app/api/stripe/webhook/route.ts` · `lib/stripeCheckoutFailure.ts` ·
`scripts/test-recusa-com-nome.mjs`

**O que o cliente vê:** nada, hoje. Isto é o cano por onde a carta do #2 passa —
sem ele a carta não tem para quem sair. A mudança visível deste ciclo vem no #2
(carta da recusa) e no #3 (compra avulsa para os cinco países).

**Testes:** `scripts/test-recusa-com-nome.mjs` — **32/32**. 15 verificações
rodam o **módulo real** (`node` importa `lib/stripeCheckoutFailure.ts` direto:
o arquivo não usa alias `@/`, então executa fora do Next) e 17 leem o
`route.ts` real amarradas à **variável que decide**, nunca a contagem de texto.
`npx tsc --noEmit -p tsconfig.json` verde.

**Falsificado por 6 mutantes, 6 mortos** — cada um com o md5 do arquivo
comparado antes/depois para provar que a mutação escreveu:

| mutante | matou |
|---|---|
| user_id volta a sair de `failedIntent.metadata` (o defeito original) | ✓ |
| `identity_source` vira a constante `'none'` | ✓ |
| resolvedor deixa de receber o cliente do banco | ✓ |
| degrau do e-mail some (volta a alcançar só quem já pagou) | ✓ |
| `ip_country` deixa de viajar (a pergunta da Índia morre) | ✓ |
| recovery URL passa a ser gravável em repouso | ✓ (2 falhas) |

**Risco:** 4 chamadas extras à Stripe dentro do webhook, no pior caso e só no
ramo de recusa (3 eventos em 4 dias — não é caminho quente). Todas engolidas
por `catch`: uma Stripe lenta degrada a identidade, nunca o registro. O degrau
do e-mail é **inferência** e pode casar a pessoa errada se dois cadastros
compartilharem e-mail — por isso `identity_source` viaja no evento, e a carta
do #2 vai tratar `customer_email` diferente dos degraus de fato.

**Como medir — o corte é o CAMPO NOVO, nunca o relógio:**
`events.metadata ? 'identity_source'` separa o antes do depois. Consultas
prontas em `docs/queries/RECUSA-COM-NOME-2026-09-07.sql`. Alvo:
`owner_resolved = false` em recusa `stage = 'initial'` sai de **1 de 1** para
**0 de N**.

**Sonda:** home `200`; `POST /api/stripe/webhook` sem assinatura `400`
(rota viva); controle `POST /api/stripe/webhook-que-nao-existe` `404`.
⚠️ **O que a sonda NÃO prova:** que a escada rodou. Um webhook exige assinatura
da Stripe e não se exercita de fora. O primeiro veredito real vem da **próxima
recusa**, e o campo `identity_source` é o carimbo que diz se ela pegou o código
novo. Não vou chamar isto de provado antes disso.

**Placar 13:20 BRT:** recusas na história 3 (2 renovação com dono · 1 inicial
sem dono) · pessoas dos 5 países no checkout em 30d: 40 · pagamentos delas: 0 ·
último `payment_success` da casa: 02/09 20:22Z.

**Próxima jogada (#2):** a carta da recusa. Ela **não** pode reusar
`send-checkout-recovery`: aquela rota exige `after_expiration.recovery.url`, que
só existe em sessão que **expirou**. Cartão recusado não expira — a sessão
morre com a recusa e não há link de retomada. A carta da recusa precisa de rota
própria, e o link dela é um checkout novo com o mesmo preço. Coorte honesta
hoje: **1 pessoa** (as outras 2 recusas são renovações, e uma delas está na
lista de bloqueados do ciclo, a outra num domínio descartável).

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada neste momento.** O #1 subiu sozinho e não pede chave nenhuma.
2. Quando o Cowork abrir as contas, mandar por aqui os nomes (não os valores):
   `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_PRODUCT_STARTER/CREATOR/STUDIO/PACK`,
   `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` — e colar os
   valores na Vercel. O código já vai estar no ar desligado, e liga sozinho.

## 📋 O QUE ACONTECEU

A recusa de cartão deixou de ser um beco sem saída. Descobri que não era um bug
solto: **a casa só sabia o nome de quem já tinha pagado alguma vez** — porque a
Stripe não leva a nossa etiqueta até o PaymentIntent numa assinatura, e o único
plano B era uma coluna que só é preenchida quando o pagamento dá certo. Ou
seja: o comprador de primeira viagem que leva "não" do banco era invisível por
construção, e é exatamente ele quem ainda pode virar assinante.

Achei a pessoa de hoje de madrugada por correlação: ela criou a conta e clicou
em comprar **dois segundos depois**, tentou pagar US$ 23,20 no Studio, o banco
recusou o cartão pré-pago dela, e ela nunca mais voltou — com 25 créditos
intactos e nenhum filme feito. Veio para comprar, não para experimentar.

O cano está no ar. A carta que passa por ele é a próxima rotação.

---

### #2 — 13:38→14:38 — a carta do cartão recusado (e por que ela não podia reusar a rota que já existia)

**Press release:** o comprador que levou "não" do banco passa a receber, no
mesmo dia, uma carta que diz de quem foi a culpa (do emissor, não dele) e
oferece **duas saídas de verdade**: outro cartão no mesmo preço, ou a compra
única de US$ 4,90 — que não pede mandato nenhum.

**Errado (medido):** a casa tinha uma rota de recuperação de checkout
(`send-checkout-recovery`) e ela **não serve para esta coorte**.
`send-checkout-recovery` depende de `after_expiration.recovery.url`, que a
Stripe só cria quando a sessão **expira**. Cartão recusado **não expira** — a
sessão morre com a recusa e não existe porta de volta para buscar. Se eu
tivesse mandado a coorte da recusa por aquela rota, todo mundo cairia no filtro
"sem porta de volta" e **ninguém receberia nada, em silêncio**. Duas mortes
diferentes pedem dois remédios diferentes.

**Mudou — SHA `e5ac66c5` · EM PRODUÇÃO.** Rota nova
`app/api/admin/send-card-declined`. Sonda: `GET /api/admin/send-card-declined`
= **403** (existe e exige admin) contra controle
`/api/admin/send-card-declined-que-nao-existe` = **404**.

**A segunda porta é honesta e já existia:** o First Pack de US$ 4,90
(`?pack=starter`, 30 créditos) é `mode: 'payment'` — **cobrança única, não
mandato**. Conferido no código e **travado por guardião**: se algum dia virar
assinatura, a carta passaria a oferecer, a um cartão que recusou mandato,
exatamente outro mandato — e nada no texto acusaria. Margem +36,3%. Nenhum
preço novo, nenhum desconto, nenhum crédito de graça.

**O link foi sondado ANTES de entrar na carta:** `GET ?pack=starter` anônimo
devolve **307 para /login** com o destino preservado. Um scanner corporativo
(Outlook Safe Links) que abrir o link **não cunha sessão na Stripe** — a
armadilha do `KINEO-RECOVERY-NO-MINT-LINK-2026-08-11` está fechada nesse
caminho.

**Reparo da recusa anônima de 07/09.** Ela foi identificada por correlação, e a
correlação fecha por **quatro** coincidências, não por uma:
(a) um **único** checkout na janela 04:40–06:30Z; (b) `checkout_started`
05:32:12 com tier `pro`, recusa 05:35:06 — 3 minutos; (c) `pro` =
`TIER_PRICES.pro` = 2900, menos os 20% do `welcome_first_month_20`, dá
**2320** — exatamente o `amount_minor` da recusa; (d) a conta nasceu 05:32:09 e
**não tem nenhum evento depois de 05:32:12**. As duas linhas do evento foram
reparadas com `identity_source: 'backfill_correlation'` — valor que a escada do
webhook **nunca** produz, para que nenhuma medição do conserto confunda reparo
com código funcionando.

**DRY-RUN NOMINAL** (o predicado da rota replicado em SQL contra as linhas
reais — não prova a rota, prova a coorte):

| e-mail | estágio | motivo | país | plano | valor | veredito |
|---|---|---|---|---|---|---|
| egotisticalfr@gmail.com | initial | card_restricted | US | pro | $23,20 | **RECEBE A CARTA** |
| valos87196@gouziben.com | renewal | insufficient_funds | AU | — | $24,90 | FORA: não é compra inicial |
| akajitin@gmail.com | renewal | insufficient_funds | NG | — | $9,90 | FORA: não é compra inicial |

**Coorte honesta de hoje: 1 pessoa.** As outras duas recusas da história são
renovações de quem já paga — a Stripe já tem régua de cobrança para elas, e uma
delas está na lista de bloqueados do ciclo. Não vou inflar isso.

**Identidade inferida NÃO envia sozinha:** `identity_source='customer_email'` é
casamento por e-mail e pode ser outra pessoa. Escrever "seu banco recusou seu
cartão" para quem não tentou comprar nada é pior do que não escrever — ela
aparece no dry-run marcada e a decisão é do fundador.

**Testes:** `scripts/test-carta-da-recusa.mjs` — **42/42**, falsificado por
**7 mutantes, 7 mortos** (renovação voltando a receber; identidade inferida
enviando sozinha; a decisão deixando de ser usada no laço; supressão de 24h
parando de filtrar; preço cravado na copy; o pacote virando assinatura; o
carimbo sumindo do registro de supressão).

**Risco:** a carta manda para `/api/stripe/checkout`, que exige login — a
pessoa passa por `/login` antes da Stripe. É a mecânica de retomada que a casa
já usa e que preserva o destino; é um degrau a mais, e ele está no link.

---

### #3 — 14:38→15:38 — 40 checkouts, zero pagamentos: a compra única passa a existir na tela deles

**Press release:** o visitante da Índia, Nigéria, Paquistão, Bangladesh ou
Quênia que chega em `/pricing` passa a ver, **acima dos planos**, a compra
única de US$ 4,90 — a única forma de pagamento que o cartão dele não precisa de
mandato recorrente para aceitar. Para o resto do mundo a página não muda em
nada.

**Errado (medido, 30 dias, por PESSOA):** ver a tabela no topo deste diário.
**40 pessoas desses cinco países abriram a página de pagamento e nenhuma
pagou**; EUA+BR+GB, com 17 no checkout, fizeram 3 pagamentos. Não é falta de
interesse — elas escolheram plano e chegaram até a Stripe. É a assinatura que
não fecha.

**Mudou — SHA `ede96491`.** `components/RegionalFirstPack.tsx` (novo) + **uma
linha** de montagem em `app/pricing/PricingClient.tsx`, acima de `#plans`. O
visual é do Codex; nada de layout/nav/home foi tocado, e nenhum arquivo que ele
encostou em 24h.

**O que o cliente vê:** um bloco com "Card keeps getting declined?" e o botão
"Get 30 credits for $4.90", com a explicação verdadeira — muitos bancos fora
dos EUA bloqueiam cobrança internacional **recorrente** e liberam uma única. As
assinaturas continuam logo abaixo.

**Por que o pack e não "uma versão mais barata":** `?pack=starter` é
`mode: 'payment'`. As duas coisas que o cartão dessas pessoas recusa
(assinatura internacional e mandato) são exatamente o que a compra única não
pede.

**Duas coisas que isto NÃO faz, e as duas foram conferidas antes:**
1. Não contradiz o `KINEO-SPRINT-OFFER-2026-07-14`, que tirou o pack do
   `/pricing`. Aquela limpeza matou **três** ofertas empilhadas para **todo
   mundo**; aqui é **uma** opção a mais, para uma coorte que converte a 0%, e
   invisível para os demais.
2. Não reabre a conclusão de preço de 19/08. Nenhum preço nasce aqui.

**Por que o pack media zero até hoje** (`docs/SPEC-PRIMEIRA-COMPRA-PEQUENA-2026-09-07.md`,
escrito por outra pista): ele está no ar sem flag desde julho com **zero
`checkout_attempted` em 54 dias** — e a causa medida **não é rejeição**. Os
dois lugares onde ele mora exigem marca d'água fora do trial (0 exposições na
história) ou **abrir um `<details>` fechado** (0 cliques em 231 exposições do
bloco de fora). Peça sem superfície mede zero e não prova nada. Esta é a
primeira superfície viva dele.

**O SKU de $2.90 ficou de fora de propósito:** 25 créditos = 1 Seedance de 60s,
que custou $3.30 na fatura de agosto, contra líquido de $2.516 — **prejuízo de
$0,78 por venda**. O guardião trava a entrada dele nesta peça.

**Como medir — o denominador é a parte que engana:**
`pack_first_for_region_shown` só pode ser comparado com
`pricing_currency_resolved`, que o `PricingClient` emite no **mesmo instante**
(a mesma chamada `/api/geo`), para **todo** visitante e com o **mesmo** campo
`country`. É o único par que dispara igual; comparar com montagem de página ou
com `checkout_started` seria laranja com maçã. O corte antes/depois é
`surface_version = 'regional_first_pack_v1'`, nunca o relógio.

**Testes:** `scripts/test-primeira-compra-regiao.mjs` — **35/35**. 13
**executam** a decisão extraída do arquivo real, e a mais importante delas é
que país `null` tem de **fechar**: durante o `fetch('/api/geo')` o país é null
em **todo carregamento de página**, e um "não sei" virando "sim" mostraria a
oferta ao mundo inteiro por alguns milissegundos de cada visita. Falsificado
por **7 mutantes, 7 mortos**.

**Risco:** a peça resolve o próprio país no navegador. Uma VPN vê a oferta —
custo zero (é o mesmo preço para todos) e é o mesmo compromisso que `/api/geo`
já assume. A cobrança continua sendo re-resolvida no servidor.
