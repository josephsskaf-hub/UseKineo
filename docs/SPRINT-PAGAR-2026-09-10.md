# SPRINT PAGAR — do filme ao pagamento (10/09/2026)

Missão: quem recebe o filme e abre o checkout paga; quem é recusado recebe o
caminho certo. Regime vigente: restauração de 09/09 (trial grátis de 30 créditos
sem cartão, $9,90/$19,90/$39,90, anual 10×, preço congelado até 09/10) + moeda
local (brasileiro paga em reais pela tabela fixa desde 09/09 ~23:30 UTC).

Coorte da restauração = `trial_credits_granted` com 30 créditos.
**Marco no banco: 2026-09-09 23:08:40 UTC.** Nunca usar relógio.

---

## r1 — 14:30 BRT · O RETRATO POR PESSOA DO CAMINHO DO DINHEIRO

### O que mediu

**A coorte inteira, nominal (9 pessoas, 2 internas → 7 externas):**

| pessoa | filmes | viu /pricing | clicou CTA | abriu checkout | pagou | saldo |
|---|---|---|---|---|---|---|
| xonipi1699 | 2 | 0 | 0 | 0 | 0 | **0** |
| theazmgang00 | 1 | 0 | 0 | 0 | 0 | 22 |
| vanshumraliya | 1 | 1 | 0 | 0 | 0 | 15 |
| naumnaki15 | 1 | 0 | 0 | 0 | 0 | 15 |
| luciomaceu | 1 | 0 | 0 | 0 | 0 | 27 |
| itztrinity323 | 1 | 0 | 0 | 0 | 0 | 15 |
| agrawal05yash | 0 | 0 | 0 | 0 | 0 | 30 |

**7 externas → 6 fizeram filme → 1 viu a página de preços → 0 clicaram → 0
abriram checkout → 0 pagaram.** Internas excluídas: `dodo-review@usekineo.com`
(2 checkouts) e `josephsskaf+testeste1010` (o teste da AF-09, que pagou).

**A coorte NÃO está cega de oferta** — 6 das 7 viram alguma superfície:
`inline_pricing_currency_resolved` (5), `welcome_offer_viewed` (3),
`trial_post_video_offer_viewed` (3), `upgrade_modal_opened` (1). O degrau seco
no meu território não é "nunca ofereceram"; é **oferta vista, zero gesto**.
Ressalva de método: `inline_pricing_currency_resolved` é resolução de moeda no
servidor, não prova de que a pessoa LEU um preço. As impressões que provam
conteúdo são `welcome_offer_viewed` e `trial_post_video_offer_viewed`.

**Quem abriu checkout 2+ vezes sem pagar (14 d, externos):** 6 pessoas —
mahdifarahmand693 (DE), dinotinyyoutube (UA), asuquoalbert07 (NG),
lochinbekodylzhonov (KG), popkamladencz (DE), davidbuckhum243 (IN). Todas com
2 aberturas, 2 expirações, **0 recusas de cartão**. Nenhuma é do Brasil.

**Recusas de cartão (a série inteira, 5 eventos / 4 pessoas):** 1 BR
(`unsupported`, o teste do fundador de 09/09 23:12), 2 NG
(`insufficient_funds`, renovação), 1 AU (`insufficient_funds`, renovação),
1 US (`card_restricted`, compra inicial, 07/09). **Nenhuma recusa de cliente
externo desde a restauração.**

**A rede de segurança BRL foi exercitada UMA vez, e por conta interna.** Todas
as expirações de hoje com `ip_country=BR` (03:00 e 15:05 UTC) são da conta
`josephsskaf@gmail.com` — o próprio fundador (22 aberturas de checkout e 39
expirações em 14 d). Conferi o `id` no banco antes de escrever: `e92d81bf…`.
**Desde a restauração, zero brasileiros externos chegaram ao checkout.**
Consequência para a próxima rotação: o trabalho de moeda é correto e não é
onde está a fila — a demanda repetida de checkout é DE/UA/NG/KG/IN.

**Um falso alarme que descartei com denominador:** `checkout_started` parou às
01:05 UTC enquanto `pricing_view` seguia às 16:29. Não é defeito — as views de
preço de hoje têm `user_id` nulo (visitante deslogado); o volume logado do dia
é rasteiro, não interrompido.

### O que mudou — `2aaa5c3e`

**O funil não sabia em que moeda a sessão nascia.** Das 4 sessões criadas depois
do deploy da moeda local, **0 gravaram `settlement_currency`** em `events`. O
campo só existia na metadata da SESSÃO da Stripe, que nenhuma consulta lê.

Pior que a ausência: **o nome `currency` significa coisas diferentes em três
eventos do mesmo funil.**

| evento | quem escreve | o que `currency` significa |
|---|---|---|
| `checkout_started` | rota de checkout | preço de **LISTA** (sempre `usd`) |
| `checkout_session_expired` | webhook | moeda **REAL** da Stripe |
| `payment_success` | webhook | moeda **REAL** da Stripe |

Prova: a sessão `cs_live_b1mHUNPE…` (10/09 00:31) gravou
`checkout_started.currency = 'usd'` e fechou em `payment_success.currency =
'brl'`, 4990. Quem cruzar os dois lê uma troca de moeda que nunca houve — e
conclui que a rede de segurança falhou justamente na vez em que ela funcionou.

Os caminhos de **pack** já carimbavam `settlement_currency` desde o deploy da
moeda (`skuContext`, 5 ocorrências). Só o caminho de **assinatura** — o único
que faz MRR — ficou cego. Esta entrega é a metade que faltou.

- `app/api/stripe/checkout/route.ts`: `checkout_started` (assinatura) passa a
  carregar `settlement_currency`, `settlement_reason`, `settlement_amount_minor`
  e `list_price_usd_minor`.
- `app/api/stripe/webhook/route.ts`: `checkout_session_expired` repete a
  liquidação nos **dois** ramos (com dono e órfão), sob nome que não colide.
- `checkout_attempted` **não** recebe os campos, de propósito: é emitido antes
  de `resolveSettlementCurrency`, que depende de leitura de banco
  (`priorBrazilianCardFailure`). Carimbar lá seria outra mudança.

### O que provou

- Guardião `scripts/test-settlement-no-funil-2026-09-10.mjs`: **23 verificações,
  0 falhas**. Amarra às variáveis que decidem (`chargeCurrency`,
  `settlement.reason`, `chargeAmount`) e à **posição** do carimbo entre a
  resolução e a emissão — um mutante que mova o bloco para depois da emissão
  cega o evento sem apagar uma linha, e morre.
- Falsificado por **3 mutações reais, cada uma com prova de escrita**
  (`git diff --numstat` = 1/1 + releitura do arquivo):
  1. `settlement_amount_minor: chargeAmount` → `0` — morreu (3 falhas).
  2. `list_price_usd_minor` da parede → `null` — morreu (1 falha).
  3. `orphaned_user: true` → `false` — morreu (1 falha).
  A **primeira tentativa de mutação não aplicou** (CRLF no disco) e o guardião
  ficou verde: registro isso porque um verde assim é indistinguível de um
  guardião resistindo. O mutador passou a abortar quando o alvo não casa.
- `npx tsc --noEmit --incremental false` exit 0.
- **Baseline da suíte em `origin/main` d1aa0341: 484 guardiões, 109 vermelhos
  herdados.** Depois da entrega: 485 guardiões, 109 vermelhos, **0 novos**.

### O que fica

1. **O degrau seco do meu território não é o checkout — é o gesto antes dele.**
   0 de 7 clicaram. A r2 tem de atacar o convite, não a página de pagamento.
2. **`xonipi1699` é o caso do dia**: 2 filmes entregues, **saldo 0**, e nunca
   viu a página de preços. É a única pessoa da coorte que já bateu no fim do
   trial com entrega comprovada — a oferta certa é para ela.
3. A moeda local está correta e **sem plateia**: a fila de checkout repetido é
   DE/UA/NG/KG/IN, não BR. Não gastar rotação otimizando BRL.
4. O efeito desta instrumentação só se mede quando nascer uma sessão nova.
   Corte: `metadata ? 'settlement_currency'` em `checkout_started`, **nunca o
   relógio**.
5. **Limite honesto:** 7 pessoas em 18 h. Nada aqui prova causa de conversão;
   prova onde o gesto some.
