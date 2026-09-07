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

---

### #4 — 15:38→16:38 — a segunda superfície, e uma correção ao meu próprio #3

**Press release:** a mesma oferta de compra única passa a aparecer também na
tela em que a pessoa acabou de receber o filme — que é onde metade dessa coorte
está, e onde ela nunca passaria por `/pricing`.

**Errado, e o erro é meu:** publiquei o #3 montando a oferta **só no
`/pricing`** sem antes medir quem daquela coorte chega lá. Medindo depois
(30 dias, 86 pessoas de IN/NG/PK/BD/KE, cruzando **por pessoa**):

| superfície | alcança | de 86 |
|---|---:|---:|
| `/pricing` | 46 | 53% |
| oferta pós-filme (`trial_post_video_offer_viewed`) | **47** | 55% |
| chegaram ao checkout | 40 | 47% |
| modal do "não" (`upgrade_modal_opened`) | 11 | 13% |
| ponte de saldo | 3 | 3% |

**Nenhuma tela sozinha passa de 55%, e as duas não alcançam a mesma gente.**
Montar só no `/pricing` deixaria metade da coorte sem ver nada. É exatamente o
erro de medir o alcance da superfície **depois** de ligar — e a consulta que o
evita agora está guardada como `(4)` em
`docs/queries/PAGAMENTOS-POR-PAIS-2026-09-07.sql`.

⚠️ Uma leitura intermediária minha estava errada e não vai ficar de pé: uma
primeira consulta devolveu "5 de 20 passaram por /pricing" e isso era artefato
do filtro — usar `ip_country` **sozinho** reduz a base a quem já chegou ao
checkout (o campo só é carimbado pela rota de checkout), e o denominador
colapsa de 86 para 20. O número certo é o da tabela acima, com
`coalesce(ip_country, country)`.

**Mudou — SHA `f60f87c0`.** A peça ganha a superfície `post_video` e uma segunda
montagem de **uma linha** em `GenerateClient`, **depois** do `NextActionCard` —
DELIVER-FIRST intacto (a regra mediu 107 pessoas que foram embora **sem o
arquivo** por causa de um card acima do download). O guardião trava a posição.

**A copy muda com a tela, e não é estética:** no `/pricing` a pessoa está
escolhendo como pagar; na tela pós-filme ela acabou de receber um filme e **não
foi recusada por ninguém**. Perguntar "seu cartão foi recusado?" a quem não
tentou pagar inventa um problema que ela não tem. O que é verdadeiro nas duas é
o núcleo da oferta: **paga uma vez, sem assinatura**.

**O evento passa a carregar `surface`** (impressão, clique e `utm_source`). Sem
ele as duas telas viram um número só e ninguém sabe qual vendeu — que é a única
pergunta que a segunda montagem levanta. E os **denominadores são diferentes**:
`pricing_currency_resolved` para o `/pricing`,
`trial_post_video_offer_viewed` para a tela pós-filme. Misturar os dois seria
laranja com maçã.

**Testes:** `scripts/test-primeira-compra-regiao.mjs` — **45/45** (eram 35).
Falsificado por **11 mutantes, 11 mortos** no total desta peça.

**Sonda (conferida com o deploy no ar — o chunk do /pricing trocou de `page-8ee659441c4ef2e0` para `page-688e07be102c4ecf`):** o `/pricing` é público e o marcador `pack_first_for_region_shown`
está no bundle servido (com controle: uma string inexistente não aparece), e a
peça **não** aparece no HTML de um visitante fora da coorte — conferido do
Brasil, que é `/api/geo` = `BR` e está fora da lista de propósito. A Vercel
**ignora** um `x-vercel-ip-country` forjado, então **não consigo provar daqui
que ela renderiza para um IP indiano**. ⚠️ E a segunda montagem fica numa rota
**autenticada**: não tem sonda de fora nenhuma. Para as duas, o primeiro
veredito real é o evento `pack_first_for_region_shown` com `surface` e
`country` de um visitante de verdade. Não vou chamar isto de provado antes
disso.

**Aviso de arquivo ao Codex** registrado no PEDIDOS: duas telas dele, uma linha
cada, componente novo, e as três coisas que ele não pode mexer sem quebrar um
guardião (país nulo tem de fechar; preço/créditos vêm da constante; o botão é
`?pack=` e nunca `?tier=`).

---

### #5 — 16:38→17:38 — a carta passa a sair sozinha

**Press release:** a carta do cartão recusado deixa de depender de alguém
lembrar de clicar.

**Errado (medido, e é história desta casa):** em 01/09 **dois crons dormiram 30
dias** porque o `vercel.json` os chamava sem `?confirm=SEND`. A rota rodava,
decidia "dry run" e devolvia 200. Nada no log dizia que ninguém tinha recebido
nada. Uma carta que só sai quando alguém aperta um botão é uma carta que não
existe.

**Mudou — SHA `48bfb7de` · EM PRODUÇÃO.** Entrada de cron para
`send-card-declined`, com `confirm=SEND` e `limit=30`. O guardião passa a ler o
`vercel.json` e provar as quatro coisas: existe a entrada, ela leva
`confirm=SEND`, tem teto de lote, e a agenda é diária (não de minuto em
minuto).

**Agenda escolhida de propósito: `10 13 * * *` — 13:10 UTC, 10:10 BRT, uma vez
por dia.** O primeiro disparo é **amanhã de manhã**, depois de você ler este
diário. Você tem a noite inteira para vetar, e o link de 1 clique se quiser
disparar antes.

**Testes:** 46/46 (eram 42), cron falsificado por 2 mutantes, 2 mortos.

---

### #6 — 17:38→18:38 — PayPal: o cliente pagava e nunca recebia, sem erro em lugar nenhum

**Press release:** a segunda porta de pagamento deixa de ser uma armadilha. Ela
continua desligada (falta a conta), mas no dia em que ligar, um erro passageiro
deixa de significar "o cliente pagou e perdeu o dinheiro".

**Errado.** A auditoria de 28/08 anotou "idempotência invertida (claim antes do
grant, erro engolido)". Lendo o código inteiro hoje são **cinco** defeitos que
se compõem — e por isso consertar um só não resolveria:

1. **A marca vinha antes da entrega e nunca era desfeita.** Se a concessão
   falhasse, a marca ficava; a re-tentativa do PayPal batia em `23505`, lia "já
   processado" e **pulava a concessão. Para sempre.**
2. **A concessão engolia o próprio erro** (`console.error` + `void`). E a
   **leitura** do perfil também: um erro ali virava `?? 0`, e o saldo do
   cliente seria **reescrito como `0 + créditos`**, apagando o que ele tinha.
3. **O handler devolvia 200 em qualquer exceção**, com o comentário "grants are
   idempotent and PayPal hammer-retries 5xx". As duas metades erradas: os
   grants eram idempotentes na direção que **perde** o pagamento, e o 200 dizia
   ao PayPal para não tentar mais.
4. **Tabela ausente (`42P01`) virava "pode conceder".** Sem o livro de
   idempotência, **toda** re-tentativa concedia de novo — crédito em dobro, o
   oposto exato do defeito 1.
5. **A rota de retorno e o webhook dividem as chaves** de `paypal_events`.
   Consertar só o webhook deixaria o defeito vivo: uma falha na rota de retorno
   deixaria a marca, e o webhook — que é o caminho de **reserva** para
   exatamente esse caso — chegaria depois e não concederia nada.

**Mudou — SHA `b11bdabd` · EM PRODUÇÃO** (`POST /api/paypal/webhook` responde
`400` a uma assinatura inválida). Padrão do webhook da Stripe: liberar o guard
e devolver 500 para o fornecedor re-tentar. As duas rotas foram curadas juntas.

**A hora de consertar era agora:** as tabelas do PayPal estão **vazias** —
nenhum cliente passou por esse trilho na história. Dá para consertar sem migrar
nada e sem tocar em dinheiro que já entrou. No dia do primeiro cliente já seria
tarde.

**Testes:** `scripts/test-paypal-idempotencia.mjs` — **27/27**, falsificado por
**5 mutantes, 5 mortos**.

---

### #7 — 18:38→19:38 — o trilho do UPI / RuPay / Pix, nascido desligado

**Press release:** o encanamento do pagamento indiano está no ar. Ele não faz
nada hoje, e passa a funcionar sozinho no minuto em que as chaves entrarem na
Vercel — sem mais nenhuma linha de código.

**Mudou — SHA `151a63df` · EM PRODUÇÃO.** Sondas do trilho novo, com controle:

| rota | resposta | esperado |
|---|---|---|
| `POST /api/dodo/webhook` | **503** | sem segredo, nada é concedido |
| `GET /api/dodo/checkout?pack=first_pack` | **503** | e o corpo **nomeia a env que falta** |
| `POST /api/dodo/webhook-que-nao-existe` (controle) | **404** | prova que o 503 acima é a rota real |
| `POST /api/paypal/webhook` | **400** | assinatura inválida, do #6 |

O corpo do 503 do checkout: `{"rail":"dodo","mode":"test","missing_env":["DODO_API_KEY_TEST","DODO_PRODUCT_FIRST_PACK_TEST"]}` — **nome da env, nunca o valor.**

**O que entrou:** cliente do Dodo por env; catálogo `sku → tier/créditos/preço`
**lido de `checkoutPricing`** (zero número digitado, zero `pdt_` cravado — os
ids de teste do Cowork vão mudar quando o KYC sair); rota de checkout que abre
sessão; e o webhook, com verificação de assinatura no padrão **Standard
Webhooks** (HMAC-SHA256 sobre `id.timestamp.corpo`, prefixo `whsec_` removido,
`timingSafeEqual`, tolerância de ±5 min).

**Três decisões que valem registro:**
- **Guard antes, liberado depois.** Idempotência por `webhook-id`, gravada
  **antes** da concessão e **apagada** se a concessão estourar, com 500 para o
  fornecedor reenviar. É literalmente o passo que faltava no PayPal.
- **200 em todo tipo desconhecido.** O painel do Dodo assina **todos** os
  eventos: `credit.*`, `dispute.*`, `refund.*` chegam aqui também. Um 4xx neles
  geraria reenvio infinito.
- **Em modo de teste, só contas internas passam.** Chave de teste aceita cartão
  de teste — sem essa trava, seria crédito de graça para o público enquanto o
  KYC não sai.

**Bônus do handoff do Cowork:** o Dodo também faz **Pix**. O Brasil tem 5 no
checkout para 1 pagamento em 30 dias — é o segundo país a ganhar botão quando o
trilho ligar.

**Testes:** `scripts/test-dodo-trilho.mjs` — **90/90**, falsificado por
**8 mutantes, 8 mortos**. A migration `dodo_events` **não foi aplicada** de
propósito: até ela existir o webhook devolve 500 e pede reenvio (falha
fechada — concessão sem livro de idempotência é como se concede duas vezes).

**⚠️ NÃO PROVADO, e sem rodeio:** nada foi exercitado contra a **API real do
Dodo**. O formato do `POST /checkouts` e os nomes dos campos do webhook vêm da
documentação, não de um payload vivo; a assinatura foi conferida contra um HMAC
de referência meu, não contra um emitido pelo Dodo. E **ainda não existe botão**
apontando para `/api/dodo/checkout` — isto é o trilho, não a porta. A porta é a
próxima jogada.

---

### #8 — FECHAMENTO do ciclo de pagamentos

**O que o cliente indiano — ou o recusado — consegue fazer hoje que não
conseguia às 12:38.**

| # | entrega | SHA | estado |
|---|---|---|---|
| 1 | a recusa de cartão ganha DONO | `8f7c1084` | no ar |
| 2 | carta do cartão recusado (rota + copy) | `e5ac66c5` | no ar (403 vs controle 404) |
| 3 | compra única de US$ 4,90 no `/pricing` para 5 países | `ede96491` | no ar (marcador no bundle) |
| 4 | 2ª superfície: a tela pós-filme | `f60f87c0` | no ar |
| 5 | a carta passa a sair sozinha (cron) | `48bfb7de` | no ar, 1º disparo 10:10 BRT de amanhã |
| 6 | PayPal: 5 defeitos de idempotência | `b11bdabd` | no ar (400 em assinatura inválida) |
| 7 | trilho Dodo (UPI/RuPay/Pix), desligado | `151a63df` | no ar (503 vs controle 404) |
| 8 | a PORTA do método local, liga sozinha | `de92c9f0` | no ar (`local_method: null`) |

**A prova mais bonita do dia, e ela é acidental:** eu estou no **Brasil**, que
**está** na lista do Pix. `GET /api/geo` me devolve
`{"country":"BR", ..., "local_method":null}` — nulo **só** porque não existe
`DODO_API_KEY`. Se o portão da chave estivesse quebrado, eu teria recebido
`"pix"`. No minuto em que você colar a chave, essa mesma sonda vira `"pix"`
sozinha. É o teste de que "nasce desligado e liga sozinho" é verdade, e não
promessa.

E `dodo_checkout_unavailable` já tem **2 linhas** — são as minhas duas sondas.
A rota executou de verdade, decidiu "não tenho chave" e registrou. O trilho
está vivo, só está sem combustível.

**Placar às 14:0x BRT** (praxe, com o corte no marco de 15:38 UTC):

| medida | valor |
|---|---|
| cadastros 24h | 35 |
| cadastros 24h **sem crédito** (checagem zero) | **0** ✅ |
| filmes entregues 24h | 39 |
| pessoas no checkout 24h | 2 |
| pagamentos 24h | **0** |
| último `payment_success` da casa | **02/09 20:22Z — 5 dias atrás** |
| recusas **sem dono** na história | **0** (era 1) ✅ |
| coorte da carta agora | **1 pessoa** |
| `pack_first_for_region_shown` | 0 (a peça tem ~20 min de vida) |

**O número que não mexeu, e é o que importa: 5 dias sem um pagamento.** Nada
do que subiu hoje já teve chance de mudar isso — a oferta regional nasceu há
minutos, a carta sai amanhã de manhã, e o trilho local está sem chave. O
veredito honesto vem do placar de amanhã, não deste.

**⚠️ O QUE FICOU SEM PROVA, e não vou chamar de pronto:**
- **Nada foi exercitado contra a API real do Dodo.** Formato do
  `POST /checkouts`, nomes dos campos do webhook e o esquema de assinatura vêm
  da documentação. A assinatura foi conferida contra um HMAC de referência meu.
- **A migration `dodo_events` NÃO foi aplicada.** Até ela existir o webhook
  responde 500 e pede reenvio — falha fechada de propósito.
- **A escada da identidade não rodou em produção.** Ela só será exercitada pela
  **próxima** recusa; `identity_source` é o carimbo que dirá se ela pegou o
  código novo. A recusa de hoje foi reparada à mão (`backfill_correlation`),
  que é coisa diferente e está marcada como tal.
- **A oferta regional não foi vista por ninguém dos 5 países ainda**, e a
  Vercel ignora `x-vercel-ip-country` forjado — não dá para provar daqui que
  ela renderiza para um IP indiano. A segunda montagem está em rota
  autenticada e não tem sonda de fora nenhuma.
- **O cron da carta nunca disparou.** A entrada está no `vercel.json` e o
  guardião prova as quatro condições, mas o primeiro disparo real é amanhã.

**Próxima jogada (para a rotação seguinte, em ordem):**
1. **Conferir o primeiro disparo do cron** às 10:10 BRT — `card_declined_emailed_v1`
   tem de aparecer com 1 linha. Zero linha = o cron não pegou o deploy.
2. **Aplicar a migration do Dodo** no minuto em que a chave chegar (o webhook
   está fail-closed até lá — é seguro, mas silencioso).
3. **Medir a oferta regional com o denominador certo** —
   `pricing_currency_resolved` contando `coalesce(user_id, session_id)`,
   consulta (3) do arquivo de queries. Se der 0 exposição com denominador > 20,
   a peça não está alcançando; se der exposição e 0 clique, o problema é a
   oferta, não a superfície.
4. **A pergunta que ninguém fez ainda:** 39 filmes entregues em 24h e 2 pessoas
   no checkout. O gargalo de hoje não é a página de pagamento — é que quem
   recebe filme não chega até ela. Vale medir o caminho `filme entregue →
   viu preço` antes de investir mais no checkout.

---

### #9 — 14:05→15:00 — o ciclo tinha fechado 6h30 cedo, e a oferta estava nas duas telas menores

**Antes de tudo, uma correção de relógio.** A entrada #8 acima se chama
FECHAMENTO e foi escrita às **14:03 BRT**. O ciclo termina às **20:38**. As oito
rotações couberam em 1h25 de relógio, e o rótulo "fechamento" fez o ciclo
*parecer* encerrado com 6h30 de janela pela frente. O relógio manda no
fechamento, nunca o rótulo — o ciclo continua, e esta é a rotação #9.

**Press release:** um cliente indiano que abre o Studio hoje às 15h vê a opção
de pagar **uma vez, US$ 4,90, sem assinatura** logo acima dos planos. Às 12h38
ele não via nada; às 13h47 ele passou a ver — **mas só se tivesse ido ao
/pricing ou terminado um filme**. A tela por onde ele realmente passa não tinha
a oferta.

**Errado (medido) — a oferta subiu nas duas superfícies mais estreitas.**
30 dias, por PESSOA, coorte IN/NG/PK/BD/KE (164 pessoas com carimbo de país):

| superfície | alcança | tinha a peça às 13:47 |
|---|---|---|
| `/pricing` | 46 | ✅ |
| tela pós-filme | 45 | ✅ |
| **as duas juntas** | **70** | — |
| **grid de planos do Studio** (`generate_step_1`) | **78** | ❌ |
| **união das três** | **86** | — |

O grid do Studio sozinho alcança **mais gente da coorte do que as outras duas
somadas**, e **16 pessoas** passam por ele sem nunca tocar nas outras duas
telas. A peça de ontem-de-manhã nasceu nos dois lugares menores.

**Por que o erro era invisível:** o alcance foi medido *depois* de escolher onde
montar. `/pricing` e a tela pós-filme são as telas que a gente *pensa* como
"lugar de preço"; a tela onde a pessoa realmente encosta num número é o passo 1
do Studio, que ninguém chama de página de preço.

**O número quase não apareceu, e a armadilha vale registro:**
`NOT IN (select user_id ...)` devolve **NULL para TODA linha** quando a
subconsulta tem um único `user_id` nulo. O "exclusivo do Studio" saiu **0** —
contradizendo a própria união, que subia de 70 para 86 **na mesma consulta**.
Com `NOT EXISTS` o **16** apareceu. Coorte nunca se mede com `NOT IN`.

**Mudou — SHA `4eee3e64` · EM PRODUÇÃO** (deploy `dpl_3pyUnFjN…` às 14:16 BRT).
UMA linha de montagem em `components/PricingCards.tsx`, acima do grid. A peça
ganha a superfície `studio_step1` com copy própria: aqui a pessoa **ainda não
recebeu filme e ninguém recusou o cartão dela**, então a copy não pergunta por
recusa (que ela não teve) nem diz "keep making films" (que ela ainda não faz).
Nenhum preço mudou, nenhum SKU novo, e a peça continua devolvendo `null` para
todo o resto do mundo.

**O que o cliente vê:** alcance de **70 → 86** pessoas da coorte (**+23%**), sem
tocar em quem já paga.

**Sonda — e o que ela prova e o que NÃO prova.** A copy nova viaja no bundle
público do `/pricing` (as três superfícies compartilham o componente):

| medida | resultado |
|---|---|
| `"without signing up for a plan"` nos chunks do `/pricing` | **1 chunk** ✅ |
| string de **controle** inexistente, mesma varredura | **0 chunks** ✅ |
| home | `200` |

⚠️ **Isto prova o componente no ar, não a montagem.** O grid do Studio é rota
**autenticada** e não tem sonda de fora — o App Router não expõe
`_buildManifest`, então não há como pegar o chunk do `/generate` sem sessão. A
montagem está provada só pelo guardião (que lê o arquivo real) e pelo
typecheck. **A prova de produção é a primeira linha de
`pack_first_for_region_shown` com `surface: 'studio_step1'`** — e ela depende de
uma pessoa dos cinco países abrir o Studio.

**Testes:** `scripts/test-primeira-compra-regiao.mjs` — **62/62**, falsificado
por **7 mutantes, 7 mortos** (mount removido · superfície trocada · mount abaixo
do grid · montagem duplicada · copy inventando recusa · rodapé revertido · tipo
sem a terceira superfície). Cada mutante confere o conteúdo antes/depois e
aborta se a escrita não pegou.

**E o guardião acusou a si mesmo.** A asserção "a copy não fala em recusa" lia
**400 caracteres** a partir da entrada e **atravessava a fronteira**, caindo na
entrada seguinte do `Record` — que legitimamente diz "declined". A asserção irmã
(`post_video`) só passava **por ser a última entrada do COPY**: bastaria uma
quarta superfície para o mesmo falso vermelho nascer lá. As duas passam a cortar
na fronteira real da entrada.

**Risco:** baixo. A peça já estava em produção há 20 min em duas telas; esta é a
mesma peça numa terceira. O gate de país é o mesmo e continua fechando em
`null`. Se o Codex redesenhar o componente, as três superfícies mudam juntas —
que é o efeito desejado.

**Placar às 14:30 BRT:**

| medida | valor |
|---|---|
| cadastros 24h | 34 |
| checagem zero (cadastro sem crédito) | **0** ✅ |
| filmes entregues 24h | 38 |
| pessoas no checkout 24h | 2 |
| pagamentos 24h | **0** |
| último `payment_success` | **02/09 20:22Z — 5 dias** |
| `pack_first_for_region_shown` | 0 |
| `card_declined_emailed_v1` | 0 (cron dispara 10:10 BRT de amanhã) |

**Dois números do placar que precisam de nota, senão viram alarme falso:**

1. **`checagem zero` deu 6 na primeira consulta, e o número é falso.** Meu
   predicado era `video_credits = 0 AND sem vídeo`. As **6** contas têm
   `trial_status = 'blocked'` — são **antifraude**, não trial órfão. Crédito
   zero significa três coisas diferentes e elas colapsam no mesmo campo; sem
   ler `trial_status` antes, a rotação escala um incidente que não existe. O
   **0** da rotação anterior estava certo.
2. **`checkout_attempted` está poluído pelas NOSSAS sondas.** 16 das 70
   tentativas em 7 dias vêm com `user_id` e `session_id` nulos, em rajadas de
   3-4 SKUs em menos de 10 segundos (`bulk10/20/30/50` às 21:50:33→21:50:40).
   Nenhuma delas vira sessão de checkout. **Não é defeito** — é sonda de
   rotação anterior. O `count(distinct user_id)` ignora nulo e por isso o
   "2 pessoas no checkout" continua limpo; a **contagem bruta**, não.

**Próxima jogada:**
1. **Medir a exposição com o par que dispara igual.** `pack_first_for_region_shown`
   contra `inline_pricing_currency_resolved` (`pricing_surface='generate_step_1'`),
   que dispara na MESMA chamada `/api/geo` e para todo visitante da tela. É o
   único par honesto; comparar com montagem de página seria laranja com maçã.
   Denominador esperado: ~78 pessoas/30d, ~7-10/dia.
2. **Se der exposição > 10 e 0 clique**, o problema passa a ser a OFERTA e não a
   superfície — e aí a pergunta é o preço do pack, que é decisão do fundador.
3. **A pergunta da #8 continua aberta e é a maior:** 38 filmes entregues em 24h
   e **2 pessoas no checkout**. Medir `filme entregue → viu preço` por pessoa
   antes de investir mais na página de pagamento.

---

### #10 — 14:25 — a carta URGENTE dividia o minuto com um blast genérico

**Press release:** a carta que fala do cartão recusado sai amanhã de manhã
**antes** da campanha genérica do dia, e não ao mesmo tempo que ela. A pessoa
que teve o cartão recusado vai receber a carta sobre o *cartão dela* — e não um
"você tem créditos, venha usar" que a calaria por 24h.

**Errado (medido no `vercel.json`, não no diário):**

```
10 13 * * *  /api/admin/send-hotlead-blast?confirm=SEND&segment=auto&limit=25
10 13 * * *  /api/admin/send-card-declined?confirm=SEND&limit=30
```

O **mesmo minuto**. As duas dividem `loadLifecycleSuppression`, uma janela de
24h *fail-closed*: quem recebeu **qualquer** e-mail de ciclo de vida nas últimas
24h sai da coorte de todos os outros jobs. No mesmo minuto, a **ordem não é
garantida**.

**A colisão é nominal, não teórica.** A única pessoa da coorte da carta é
`egotisticalfr@gmail.com`: **25 créditos, ZERO vídeos, trial ativo**, nunca
recebeu hotlead nem a carta. "Tem crédito e não fez vídeo" é exatamente a forma
do segmento `stalled`, que o `segment=auto` **drena primeiro**. Se o blast
rodasse antes, ela levaria o e-mail genérico e a carta específica ficaria
suprimida por 24h — e no dia seguinte a mesma corrida recomeçaria. O primeiro
disparo era **amanhã às 10:10 BRT, com ninguém olhando**.

**Mudou — SHA `828cf2f5` · EM PRODUÇÃO** (deploy `dpl_GzMaQHkk…`). A carta passa
a rodar às **`0 13 * * *` (10:00 BRT)**, dez minutos ANTES do blast. Precedência
por relógio, porque a supressão não tem precedência própria. **Nenhuma copy,
nenhuma coorte e nenhum filtro mudaram — só a ordem.**

**Guardião novo:** `scripts/test-precedencia-carta-recusa.mjs` — **14/14**,
falsificado por **7 mutantes, 7 mortos**. Além da ordem e da folga de 5 min ele
trava: o `confirm=SEND` (esta casa já teve **dois crons dormindo 30 dias** por
perdê-lo), os **quatro contatos proibidos** do fundador, a supressão de 24h, e o
fato de a copy ler `reason_category`.

**Duas coisas que eu ia chamar de defeito e NÃO são — as duas são erro meu:**

1. **"`decline_code` está nulo nas 3 recusas."** Está — porque **esse campo não
   existe**. O evento real traz `reason_category: "card_restricted"`. Eu
   perguntei pela chave errada e o banco respondeu `null`, que é exatamente o
   que ele responde para chave inexistente. A rota já lê a chave certa. Ancorar
   número novo num já conhecido antes de publicar; aqui o âncora foi despejar o
   `jsonb_pretty` da linha real.
2. **`akajitin` está na coorte bruta de recusas** (NG, pré-pago, 03/09) e é
   **contato proibido**. Ele não recebe nada porque a lista `BLOQUEADOS` existe
   na rota — e ele também já pagou, o que o exclui por um segundo caminho. Está
   travado por guardião agora, para não sumir num refactor.

**O mutante que sobreviveu, e o que ele ensina:** renomear o símbolo da
supressão (`loadLifecycleSuppressionXX`) **passou** na primeira versão da
asserção — `/loadLifecycleSuppression/` casa como **substring** dentro do nome
renomeado. Amarrada à **chamada** (`\bloadLifecycleSuppression\(`) e ao import,
morreu. Guardião que casa substring de identificador não prova nada.

**Risco:** mínimo. Uma linha de agenda. As duas colisões de minuto
**pré-existentes** ficam anotadas e **não tocadas**, por não serem desta ordem e
não terem risco medido: `0 14` (`send-video-rescue` + `send-trial-eve-notice`) e
`25 *` (`trial-lifecycle-emails` + `send-stalled-rescue-fresh`).

---

#### E o funil que a #8 mandou medir — a hipótese dela estava ERRADA

A #8 escreveu: *"o gargalo não é a página de pagamento — é que quem recebe filme
não chega até ela."* Medido por PESSOA, 7 dias:

| degrau | pessoas |
|---|---|
| recebeu filme | 167 |
| **viu um preço** | **144 (86%)** |
| tocou num botão de compra | 23 (14%) |
| chegou ao checkout | 17 |
| pagou | 2 |

**86% de quem recebe filme VÊ preço.** O degrau seco não é "chegar ao preço" —
é **preço → primeiro gesto**, onde 121 pessoas evaporam.

**E o degrau seco tem um formato claro.** Entre as 190 pessoas que viram preço
no grid do Studio, separando por situação:

| situação | viu preço | clicou | taxa |
|---|---|---|---|
| ainda tem saldo | 113 | 5 | 4,4% |
| saldo zero, nunca bateu na parede | 57 | 3 | 5,3% |
| **bateu na parede de crédito** | **20** | **6** | **30,0%** |

**A parede de crédito converte 6x melhor que qualquer outra superfície da casa**
— e alcança 20 pessoas em 7 dias, enquanto 57 estão sem saldo.

**⛔ E aqui eu quase construí a coisa errada.** A conclusão tentadora era "57
pessoas ficaram sem crédito e ninguém avisou — construir um aviso". Fui medir
antes, e **elas foram avisadas**: das 57, **53 viram o banner de trial**, **36 o
chip de topup na sidebar** (com 4 cliques, 11%), 10 o modal de downgrade, 11 a
ponte de saldo. A casa já tem **seis** superfícies de oferta em cima dessa
mesma gente, e elas convertem a ~5%. **Uma sétima não é a resposta.**

Os 30% da parede **não são uma superfície melhor — são um momento melhor**:
alguém que estava ativamente tentando fazer um filme e foi barrado. Isso não se
fabrica com mais banner. E 37 das 57 **voltaram ao site** depois do último filme
(34 delas mais de 1h depois), então também não é o problema de "uma sessão por
pessoa".

**Placar 14:25 BRT:** inalterado desde a #9 — **0 pagamentos em 24h**, último
`payment_success` **02/09 20:22Z (5 dias)**.

**Próxima jogada:**
1. **Conferir o disparo de amanhã às 10:00 BRT**: `card_declined_emailed_v1`
   tem de aparecer com 1 linha (`egotisticalfr`). Zero linha = o cron não pegou
   o deploy, ou a supressão pegou a pessoa por outro caminho.
2. **NÃO construir a sétima superfície de oferta.** O dado acima é o argumento
   contra, e ele é forte: 6 superfícies, ~5% cada, 0 pagamentos em 5 dias.
3. **A pergunta que sobra é do fundador, não minha:** com 144 pessoas vendo
   preço por semana e 2 pagando, e com a conclusão de preço dele já fechada
   desde 19/08, o próximo passo real é **preço/oferta**, que é decisão dele.
   Tudo que é engenharia de superfície já foi feito e está medido.

---

### #11 — 15:05 — a chave sozinha não liga o trilho, e ninguém tinha como saber

**Press release:** o fundador vai colar `DODO_API_KEY` na Vercel hoje à noite.
Às 12:38 isso **não teria ligado nada** — nem botão, nem erro, nem log — e o dia
inteiro de trabalho ficaria invisível parecendo "ainda não ligou". Às 20:38 a
chave liga o trilho de verdade, porque agora está escrito em 4 arquivos e na
própria resposta HTTP que **falta um passo**: redeploy. E existe uma rota que
responde, em uma linha, se o trilho está vivo *neste* deploy.

**Errado (medido na documentação da Vercel, não no diário):** `lib/dodo.ts:16`
dizia, sobre as chaves do Dodo:

> "No dia em que o fundador colar as chaves na Vercel, liga sozinho — **sem
> deploy novo**."

A documentação da Vercel é literal, e contradiz a frase palavra por palavra:

> "Any change you make to environment variables **are not applied to previous
> deployments, they only apply to new deployments**."
> — vercel.com/docs/environment-variables

E a linha de Production da mesma página: a variável vale para "your **next**
Production Deployment". A função serverless que está servindo agora carrega as
envs do deploy que a **construiu**; colar a chave no painel não a alcança.

**Por que isso era o defeito mais caro do dia, e não uma nota de rodapé.** Os
três estados abaixo se parecem **idênticos** para quem olha o site — nenhum
botão de UPI, nenhum erro, nenhum log:

| estado | o que acontece | como se parecia |
|---|---|---|
| 1. chave nunca colada | esperado | sem botão |
| **2. chave colada, deploy não refeito** | **⚠ o trilho fica morto para sempre** | **sem botão** |
| 3. chave colada + redeploy | vende | sem botão *(até o país certo entrar)* |

O estado 2 era o **padrão**, não a exceção. A ordem urgente de 07/09 morreria
em silêncio, e a rotação seguinte leria "0 pagamentos da Índia" como se fosse
um problema de oferta.

**Mudou — SHA `ee94da49` · EM PRODUÇÃO.**

1. **A crença falsa foi corrigida nos 4 portadores**, não só no que eu achei
   primeiro: `lib/dodo.ts`, `app/api/geo/route.ts`, `components/RegionalFirstPack.tsx`
   e — o que eu não estava procurando — `app/api/wall/refresh/route.ts`, que
   tinha exatamente a mesma crença por outro motivo (a chave do YouTube: "se um
   dia alguém adicionar a variável no Vercel, este caminho liga sozinho").
2. **O portão país→método virou fonte única** (`localMethodFor` em `lib/dodo.ts`).
   O `/api/geo` mantinha a própria cópia do mapa `IN:upi / BR:pix` e o painel
   novo teria feito a **terceira**. Duas cópias divergem no dia em que um país
   entra, e aí a tela e o painel discordam sobre quem vê o botão.
3. **Rota nova `/api/admin/payment-rails`** — a pergunta que ninguém conseguia
   fazer. Devolve, lado a lado: quais envs **este processo** enxerga (por
   **NOME**, nunca valor), o SHA do deploy, a hora em que o processo subiu, e o
   `passo_2: REDEPLOY` **na própria resposta HTTP** — não só num comentário,
   porque quem lê isso às 21h é o fundador, não o código.

**Sonda em produção, 14:50:35 BRT** (com UA de navegador, não `curl` pelado):
`/api/admin/payment-rails` = **403** · controle inexistente
`/api/admin/payment-rails-inexistente-controle` = **404** · home = **200**.
O 403 sozinho não provaria nada — poderia ser um catch-all respondendo a tudo.
É o **404 do controle na mesma medição** que prova que a rota subiu e que o 403
é o guard de admin funcionando. Antes do deploy, às 14:49, os dois davam 404.

**O que o cliente vê:** nada, hoje, e isso é honesto — esta rotação não move um
pixel. Ela é a diferença entre as chaves de hoje à noite funcionarem ou não.

**Testes:** `scripts/test-painel-trilhos.mjs` — **33/33**, falsificado por
**6 mutantes, 6 mortos**, cada mutante verificado como **efetivamente escrito em
disco** antes de rodar (mutante que não aplica devolve verde e se lê como
guardião resistindo). O guardião **importa `lib/dodo.ts` de verdade** e exercita
os dois portões contra a variável que decide — sem chave, `IN` e `BR` devolvem
`null`; com chave, `upi`/`pix`; e `NG`/`PK`/`US` continuam `null` **mesmo com
chave**, que é a linha que impede a Nigéria de virar "outro processador do mesmo
cartão". Ele também trava que o painel **nunca ecoa valor de env**: só
`VERCEL_GIT_COMMIT_SHA`, `VERCEL_DEPLOYMENT_ID` e `VERCEL_ENV` podem ser lidos
por valor. `npx tsc --noEmit`: verde.

**Risco:** baixo. Nenhuma regra de cobrança mudou, nenhum preço, nenhuma copy de
cliente. O único comportamento novo é uma rota admin-only que responde 403 a
quem não é admin.

**Como medir:** abrir `/api/admin/payment-rails` logado como admin. `live:true` e
`missing_env` vazio no trilho Dodo provam que ele vende. Se as envs estiverem
coladas e o painel ainda listar `DODO_API_KEY` como faltando, a resposta é
**estado 2** — falta o redeploy, e o campo `deploy.processo_subiu_em` mostra que
este processo é mais velho que a colagem da chave.

**Placar às 15:00 BRT:**

| medida | valor |
|---|---|
| cadastros 24h | 34 |
| **checagem zero (real)** | **0** ✅ |
| filmes entregues 24h | 37 |
| pessoas no checkout 24h | 2 |
| pagamentos 24h | **0** |
| último `payment_success` | **02/09 20:22Z — 5 dias** |
| `pack_first_for_region_shown` | 0 |
| `local_method_clicked` | 0 (trilho desligado, esperado) |

**Duas notas de placar, para a próxima rotação não errar:**

1. **`checagem zero` = 0, e as 6 contas de crédito zero são `trial_status =
   blocked`** — antifraude, não trial órfão. Mesmo achado da #10; confirmado,
   não é incidente novo.
2. **⛔ `pack_first_for_region_shown = 0` NÃO prova que a peça está morta.** O
   par honesto — `inline_pricing_currency_resolved`, que dispara na MESMA
   chamada `/api/geo` — também deu **0** desde o deploy da #9 (17:14Z). Zero
   contra zero é **ausência de tráfego naquela janela**, não superfície cega. A
   #9 subiu há menos de uma hora. Comparar `_shown` com um evento que dispara
   diferente (montagem de página) daria "2 de 30" e seria laranja com maçã.

**Próxima jogada:**
1. **Quando as chaves entrarem: colar → redeploy → abrir `/api/admin/payment-rails`.**
   Essa ordem é o produto desta rotação. Sem o passo 2 nada acontece e nada
   reclama.
2. **Medir a exposição regional só com denominador vivo.** Repetir o par honesto
   quando `inline_pricing_currency_resolved` passar de ~10 na janela; antes
   disso o número não decide nada.
3. **A pergunta grande continua a da #10 e continua sendo do fundador:** 144
   pessoas vendo preço por semana, 2 pagando, 6 superfícies de oferta a ~5%. A
   engenharia de superfície acabou; o que sobra é preço/oferta.

**✅ O QUE VOCÊ PRECISA FAZER**

1. **Cole as envs na Vercel (Production)** quando o Cowork abrir as contas:
   `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_MODE=live`,
   `DODO_PRODUCT_STARTER`, `DODO_PRODUCT_CREATOR`, `DODO_PRODUCT_STUDIO`,
   `DODO_PRODUCT_FIRST_PACK` · PayPal: `PAYPAL_CLIENT_ID`,
   `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
2. **Depois de colar, clique em REDEPLOY na Vercel.** Este é o passo que faltava
   e sem ele nada liga — a chave só entra em deploy novo.
3. **Abra `usekineo.com/api/admin/payment-rails`** logado como admin. Quer ver
   `live: true` e nenhuma env faltando. Se aparecer faltando uma env que você
   acabou de colar, faltou o redeploy.
4. **Nada mais.** Não precisa mexer em código nem rodar bat: a entrega já subiu.

**📋 O QUE ACONTECEU**

Achei um defeito que teria feito o trabalho do dia inteiro parecer que
funcionou e não funcionar. Três arquivos prometiam que colar a chave na Vercel
ligava o trilho de pagamento sozinho. A Vercel não faz isso: variável nova só
vale para deploy novo. Você colaria a chave hoje à noite, abriria o site, não
veria botão de UPI nenhum — e não haveria erro em lugar nenhum para explicar por
quê. Corrigi a frase nos quatro lugares onde ela morava, juntei num só lugar a
regra de quem vê o botão (estava duplicada e ia virar três cópias), e criei uma
rota de admin que responde de uma vez: quais chaves este deploy enxerga, qual
deploy é este, e o que falta fazer. O placar não mudou: 0 pagamentos em 24h,
último há 5 dias.

---

### #12 — 15:28 BRT — a graça de hoje não curou as duas vítimas que ela mesma nomeia

**Errado (medido).** Hoje às 02:51 BRT o commit `c94b140a` criou a janela de
graça do dunning: a casa parou de derrubar o plano na primeira fatura de
renovação recusada, enquanto a Stripe ainda repete o cartão. O cabeçalho do
próprio arquivo (`lib/billing/subscriptionAccess.ts`) **nomeia as duas vítimas
reais** — US$ 24,90 (AU) em 04/09 e US$ 9,90 (NG) em 03/09, ambas
`insufficient_funds`.

**Nenhuma das duas foi curada.** As duas seguem, agora:

| pessoa | has_paid | plan | is_pro | assinatura na Stripe |
|---|---|---|---|---|
| `akajitin@gmail.com` | true | **free** | false | `sub_1U0I7b…` **intacta** |
| `valos87196@gouziben.com` | true | **free** | false | `sub_1TyTh1…` **intacta** |

A graça só age em evento NOVO: o ramo `invoice.payment_failed` mantinha o
acesso e dava `break` **sem tocar no perfil**. Quem já tinha sido revogado
antes dela existir ficou revogado.

**A prova chegou sozinha às 17:26:28Z**, 40 minutos antes desta rotação abrir:
a Stripe recusou de novo a assinatura de NG, e **um segundo depois** o evento
`subscription_access_held_during_dunning` saiu dizendo "acesso preservado"
para uma pessoa que estava `free` desde 03/09 — **e com `user_id` NULL**, então
ninguém conseguia sequer saber de quem era. Era um evento que mentia sobre um
desfecho anônimo: as duas metades do problema que este ciclo já tinha resolvido
para o cartão recusado, repetidas no vizinho.

**Tamanho, para não superdimensionar:** a casa tem **13 pagantes na vida
inteira, 8 com plano ativo, 5 que pagaram e hoje estão `free`**. Destes 5,
**3 ainda têm `stripe_subscription_id`** — e só a de NG tem cobrança viva
(`past_due`). Não é uma sangria; são 2 clientes reais de uma base de 8, que é
justamente o tamanho em que perder um importa. E
`lib/billing/subscriptionAccess.ts` já documentava a contradição:
`admin/_shared/mrr.ts` conta `past_due` como receita **viva** — o painel dizia
"pagante" e o produto dizia "free". Os dois não podiam estar certos.

**Mudou — SHA `3af3f2d0` · EM PRODUÇÃO** (deploy vivo às 18:28:00Z).

1. **`lib/billing/dunningReconcile.ts`** (novo, puro, sem alias `@/`) — a
   decisão "restaurar o plano de quem foi revogado antes da graça?". Reusa
   `stripeSubscriptionKeepsAccess` em vez de **redigitar o predicado**. Falha
   **fechada** em 4 portas: nunca pagou · assinatura diferente da do perfil ·
   a Stripe revogou de verdade (aí `free` está certo) · tier desconhecido.
   O default `'basic'` da escada do `invoice.payment_succeeded` **não foi
   copiado**: restaurar plano é conceder direito, e conceder o tier errado por
   causa de um default é pior do que não restaurar.
2. **Webhook, só dentro do ramo da graça** (+100 / −0): resolve o **dono** pela
   assinatura; o evento passa a carregar `user_id`, `owner_resolved`,
   `plan_at_event` e **`access_was_actually_held`**; e o perfil errado é curado
   na hora. Erro na cura vira log + evento `subscription_access_repair_failed`,
   **nunca `throw`** — o trabalho do ramo (não revogar) já estava feito, e
   derrubar o webhook faria a Stripe reenviar de graça.
3. **`/api/admin/reconcile-dunning`** (novo) — **dry-run por padrão**, escreve
   só com `?confirm=APPLY`, para quem não vai receber webhook novo tão cedo.
4. **Crédito NUNCA é tocado** em nenhum dos dois caminhos: o update é de dois
   campos, `plan` e `is_pro`. Saldo volta só na fatura paga — crédito é
   dinheiro.

**Sonda em produção, 18:28:00Z** (UA de navegador, não `curl` pelado):
`/api/admin/reconcile-dunning` = **403** · controle inexistente = **404** ·
home = **200**. Às 18:27:24Z os dois davam 404 — é o **404 do controle na mesma
medição** que prova que a rota subiu e que o 403 é o guard de admin, não um
catch-all.

**O que o cliente vê:** nada muda de pixel. O que muda é que a próxima recusa
da Stripe para quem foi revogado por engano **devolve o plano dele sozinha**.
Na prática: o evento de hoje às 17:26 carregava `tier: 'starter'` — o tier do
akajitin é recuperável da cadeia de metadata, então a decisão deve dar
`restore`, não `tier_desconhecido`. **O dry-run é o que prova**, e é ele que
diz também o que fazer com `brandonmooney450` (3ª pessoa da coorte, sem tier
registrado e sem cobrança viva — deve sair como `skip`, e isso é o acerto).

**Testes:** `scripts/test-graca-nao-curou-2026-09-07.mjs` — **106/106**,
falsificado por **10 mutantes, 10 mortos**, cada um verificado como
**efetivamente escrito em disco** antes de rodar (mutante que não aplica
devolve verde e se lê como guardião resistindo). O guardião **importa a lib de
verdade** e exercita a variável que decide; lê o webhook para provar que o
**chamador existe** (contrato de servidor sem chamador serve zero) e que o
update escreve **apenas** `plan` e `is_pro` — o mutante M6, que faz a cura
tocar crédito, morre. `npx tsc --noEmit`: **verde**.

**Risco:** baixo, e o desenho é conservador de propósito. Nenhum preço, nenhuma
copy, nenhuma regra de cobrança. O único caminho que escreve exige que a
**Stripe viva** diga que a assinatura mantém acesso E que a assinatura seja a
mesma do perfil E que o tier seja explícito. Qualquer dúvida → não escreve.

**Como medir:** `subscription_access_restored_after_wrong_revoke` (nasce hoje).
E o par honesto do evento antigo: `access_was_actually_held` **false** = a cura
tinha trabalho a fazer; **true** = a graça funcionou como anunciado. Sem esse
campo os dois casos eram o mesmo evento verde.

**Placar às 15:30 BRT:**

| medida | valor |
|---|---|
| cadastros 24h | 35 |
| **checagem zero (real)** | **0** ✅ |
| filmes entregues 24h | 38 |
| pessoas no checkout 24h | 2 |
| pagamentos 24h | **0** |
| último `payment_success` | **02/09 20:22Z — 5 dias** |
| pagantes com plano ativo | **8** |
| pagaram e hoje estão `free` | **5** (3 com assinatura ainda gravada) |
| `pack_first_for_region_shown` | **1** ✅ *(primeira linha da história — a peça da #9 apareceu de verdade às 17:57:08Z)* |

⚠ **Armadilha de placar que eu mesmo caí, para a próxima rotação não repetir:**
"crédito zero em 24h" deu **13** na consulta crua e **7** excluindo só
`trial_status='blocked'`. Os 7 são todos **`downgraded`** — trial gasto, não
conta nascida sem crédito. A checagem zero honesta exclui **os dois** estados.
Crédito zero significa três coisas e só uma delas é incidente.

**Próxima jogada:**
1. **Rodar o dry-run** (`/api/admin/reconcile-dunning`) e ver as 3 linhas com o
   status vivo da Stripe ao lado. É a única coisa que responde se o tier das
   duas assinaturas está explícito — e é 1 clique.
2. **Reconciliar o painel com o produto.** `mrr.ts` conta `past_due` como
   receita viva; a partir de agora o produto concorda. Vale conferir se o MRR
   do `/admin` e a contagem de "pagantes ativos" (8) batem — se não baterem,
   sobrou uma terceira régua.
3. **A pergunta grande continua sendo do fundador e não mudou:** 8 pagantes
   ativos, 0 pagamentos há 5 dias, 6 superfícies de oferta. Esta rotação não
   ganha cliente novo — ela para de perder o que já foi ganho, que é o barato
   que sobrou depois que a engenharia de superfície acabou.

**✅ O QUE VOCÊ PRECISA FAZER**

1. **Abra `usekineo.com/api/admin/reconcile-dunning`** logado como admin. É
   **dry-run**: só mostra, não escreve. Vai listar 3 pessoas com o status que a
   Stripe tem para elas agora e a ação sugerida.
2. **Se a lista mostrar `restore`** para `akajitin@gmail.com` e/ou
   `valos87196@gouziben.com` e você concordar, abra a mesma URL com
   **`?confirm=APPLY`** no fim. Isso devolve **só o plano** (nunca crédito) a
   quem a Stripe ainda considera cliente. Se preferir não mexer à mão, não
   precisa: a próxima recusa da Stripe já cura sozinha.
3. **As envs do Dodo/PayPal continuam pendentes** (item da #11, inalterado):
   colar na Vercel **e depois REDEPLOY**, senão nada liga.
4. **Não escreva para o `akajitin`** — ele está na lista de contatos proibidos
   desta rotina. Esta entrega não manda e-mail nenhum, de propósito.

**📋 O QUE ACONTECEU**

O conserto que subiu hoje de madrugada parou de derrubar clientes na primeira
recusa de renovação — mas não devolveu o plano aos dois clientes que ele mesmo
citava como as vítimas. Eles continuaram marcados como "grátis" enquanto a
Stripe seguia cobrando o cartão deles. Às 17:26 a Stripe tentou de novo, e o
sistema registrou "acesso preservado" para alguém que não tinha acesso nenhum,
sem dizer quem era. Consertei as duas metades: o registro agora diz de quem é e
se o acesso foi mesmo preservado, e o plano de quem foi cortado por engano volta
sozinho na próxima tentativa de cobrança. Criei também uma página de admin que
mostra a situação real de cada um antes de mexer em nada. Crédito não é tocado
em lugar nenhum — isso só volta quando a fatura for de fato paga. O placar não
mudou: 0 pagamentos em 24h, o último há 5 dias, 8 pagantes ativos.
