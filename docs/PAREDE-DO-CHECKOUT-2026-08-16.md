# A PAREDE DO CHECKOUT — 16/08/2026 (sprint 11h)

Marcador: `KINEO-PAREDE-CHECKOUT-2026-08-16`
Produção no momento da medição: `315c442` (deploy READY 16/08 08:24Z).
Fonte: Supabase `cqqukkvjjrguayiyjvhh`. Contas internas fora por
`lib/internalAccounts.ts` em TODAS as linhas abaixo.

---

## 1. O NÚMERO

**84 pessoas externas abriram uma sessão de pagamento AO VIVO da Stripe e foram
embora. 46 delas nos últimos 30 dias. A empresa tem 7 pagantes na vida inteira.**

| moeda | pessoas que abandonaram | nos últimos 30d | nos últimos 7d | sessões |
|---|---|---|---|---|
| USD | 58 | 35 | 13 | 88 |
| INR | 27 | 11 | 5 | 48 |
| **total** | **84** | **46** | **18** | **136** |

BRL não aparece: as 134 linhas BRL do livro-caixa são do fundador testando
(2 a 4 pessoas, todas internas). O filtro as removeu.

### 1.1 A fonte — e por que nenhum doc desta operação a tinha lido

`checkout_abandoned` existe desde **25/05/2026** e é escrita pelo **webhook**
(`checkout.session.expired`), ou seja, é o servidor da Stripe afirmando que a
sessão morreu. Nenhum documento de aquisição, funil ou coorte deste repositório
a consultou — todos contaram `checkout_started`, que é emitido pelo **browser**.

**As duas contagens divergem por ~2x.** Para INR: `events` conhecia **11**
pessoas em 42 dias; o livro-caixa conhece **27**. Toda leitura de abandono de
checkout feita até hoje está **subcontada**.

> Isto NÃO invalida as conclusões sobre topo de funil. Invalida qualquer frase
> do tipo "poucas pessoas chegam a pagar" — chegam mais do que se media.

---

## 2. A LEITURA QUE MUDA A PRIORIDADE

O gargalo da empresa **não é** fazer gente clicar em comprar. É o que acontece
**depois** do clique.

| semana | pessoas que abriram sessão Stripe | pagaram | fecharam |
|---|---|---|---|
| 27/07 | 15 | 2 | 13% |
| 03/08 | 12 | 1 | 8,3% |
| 10/08 | 19 | 1 | **5,3%** |

**A entrada está SUBINDO (15 → 12 → 19) e o fechamento está CAINDO.** É o
inverso exato do que a operação vem otimizando.

**Último `payment_success` da história: 10/08 21:26Z.** São **6 dias sem uma
venda nova** — com 46 pessoas abrindo a página de pagamento nesse intervalo.

E a máquina de resgate **não está faminta** (checado antes de propor qualquer
coisa, Regra Zero): `/api/cron/send-recovery` roda a cada 2h, alcançou **72 das
84** pessoas, último envio hoje 08:20Z. Ela está entregando e **não converte**.
O problema não é falta de e-mail.

---

## 3. O QUE NÃO DÁ PARA SABER HOJE — E O COMMIT QUE RESOLVE

Duas mortes muito diferentes deixam **exatamente o mesmo rastro**
(`checkout_started` e silêncio):

- **(a) o cartão foi RECUSADO** → é defeito técnico/regulatório nosso;
- **(b) a pessoa MUDOU DE IDEIA** → é preço/oferta.

Os remédios são opostos e a operação vem escolhendo no escuro. Isto é a regra
do `ENGAGEMENT-LOG`: *toda coorte definida por AUSÊNCIA passa por `events` antes
de virar decisão* — e esta não tinha por onde passar.

**Commit desta sprint (aditivo, leitura pura, zero mudança de comportamento):**

1. `checkout.session.expired` passa a escrever também um evento
   `checkout_session_expired` em `events`, com **moeda, tier, valor,
   `payment_status` e país** — fechando o par `checkout_started` →
   `checkout_session_expired` na MESMA tabela.
2. Dois casos novos no webhook: `payment_intent.payment_failed` e
   `charge.failed` → evento `checkout_payment_failed` com **`decline_code`,
   `error_code`, `network_status`, país/bandeira/funding do cartão**.
3. Ambos entram em `SERVER_ONLY_EVENTS` — o sink do browser não pode cunhá-los.

### 3.1 Armadilhas já fechadas na revisão (para quem for ler o evento)

- **Renovação recusada é CHURN, não parede de checkout**, e cairia no mesmo
  evento. Por isso `is_renewal` (derivado da presença de `invoice`) vai no
  metadata. **Quem medir a parede filtra `is_renewal=false`. Sem esse filtro a
  métrica mente em 30 dias.**
- **Conta apagada derruba o INSERT inteiro** (FK em `auth.users`) e levaria
  junto a moeda, que é o ponto. Há fallback com `user_id=null` e
  `orphaned_user:true`. Em erro transitório isso pode gerar 2 linhas para a
  mesma sessão — **contar sempre `distinct stripe_session_id`**.
- ⚠️ **DESCONTINUIDADE:** `checkout_session_expired` nasce neste deploy. Um
  salto nessa linha é o **instrumento nascendo**, não abandono novo. O
  histórico verdadeiro segue em `checkout_abandoned` desde 25/05.

---

## 4. ÍNDIA — 32% DA PAREDE, 0% DA RECEITA

- **27 das 84** pessoas que abandonaram são INR (32%).
- **Nunca entrou uma rupia.** Os 4 `payment_success` da história são 100% USD.
- Índia é **26%** de todo mundo que vê um preço no site (61 pessoas em 30d,
  contra 163 em USD e 14 em BRL) e **15% dos trials** (27 de 181).
- Custo dos créditos de trial dessa coorte: **124 de 1.230** (10%) — pequeno.
  **Não é um caso de "cortar Índia para economizar crédito".** É um caso de
  segmento grande que o caixa não consegue receber.

**Mecanismo provável (não confirmado — é o que o commit acima vai provar ou
matar):** cobrança recorrente em cartão emitido na Índia exige e-mandate do RBI.
A criação de e-mandate pela Stripe vale para cartões indianos **e moeda INR**, e
sem mandato o pagamento off-session é recusado; contas Stripe fora da Índia são
explicitamente afetadas quando a assinatura usa `charge_automatically`.
[Stripe — India recurring payments](https://docs.stripe.com/india-recurring-payments) ·
[Stripe — regulamentação indiana e cartões](https://support.stripe.com/questions/background-on-indian-government-regulations-affecting-card-payments)

**Regra Zero aplicada:** o Push #414 **já tinha removido** o
`payment_method_types: ['card']` justamente para deixar UPI/carteiras
aparecerem. Ou seja, alguém já suspeitou disto. O que faltava — e é o que entra
hoje — é o **evento que diz se o cartão foi recusado**.

---

## 5. DECISÕES DO FUNDADOR (as duas são dele; nenhuma foi tomada aqui)

### 5.1 — 30 SEGUNDOS, SEM RISCO, DESBLOQUEIA O DIAGNÓSTICO

No painel da Stripe → Developers → Webhooks → o endpoint do Kineo → **marcar os
eventos `payment_intent.payment_failed` e `charge.failed`**.

Sem isso o código desta sprint é **inerte** — não quebra nada, apenas nunca
roda. `stripe_events` recebe 2 a 8 eventos por dia, o que é compatível com uma
lista de inscrição curta, então é provável que hoje NÃO estejam marcados.

**Sem essa marcação, a pergunta "por que 84 pessoas não pagaram" continua sem
resposta possível.**

### 5.2 — ÍNDIA: TRÊS CAMINHOS, TODOS MEXEM EM DINHEIRO (gate dele)

Não executar nada disto sem ordem explícita. Só depois de 5.1 dar dado real:

| caminho | o que é | custo |
|---|---|---|
| **A. habilitar India recurring na Stripe** | e-mandate para cartão indiano | configuração + revisão da Stripe |
| **B. rotear INR para SKU de compra única** | packs/top-ups já existem em INR e **não** dependem de mandato recorrente | mudança de oferta para um segmento — decisão dele |
| **C. tirar INR da vitrine e cobrar em USD** | some o preço em rupia | reduz conversão aparente, simplifica o caixa |

**Nada disto entra sem ele.** Guardrail da casa: dinheiro é gate do fundador, e
uma variável por vez.

---

## 6. O QUE NÃO FAZER (medido, para ninguém refazer)

- **Não reconstruir a máquina de resgate.** `/api/cron/send-recovery` existe,
  roda a cada 2h e alcançou 72 de 84 pessoas. Ela entrega.
- **Não escrever "poucos chegam ao checkout".** Chegam ~2x mais do que os docs
  antigos diziam. A fonte certa é `checkout_abandoned`.
- **Não usar `checkout_started` como denominador de fechamento.** É do browser
  e subconta.
