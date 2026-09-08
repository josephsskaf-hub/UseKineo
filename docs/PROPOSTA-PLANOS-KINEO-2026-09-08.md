# PROPOSTA — OS PLANOS DA KINEO (08/09/2026, 03:00 BRT) — DECISÃO DO FUNDADOR

**Pedido:** "estuda e traz os melhores planos pro Kineo agora". Preço público é
decisão do fundador; isto é a proposta com a conta aberta.

## O que o banco diz (30 dias, contas externas)

- **Filmes por motor:** Kineo 1 **435** · Seedance 1.5 **278** · H3 3 · Kling 2.5 2.
  Veo, Kling 3, Omni, Avatar: **zero**. Vendemos 9 motores; o cliente usa 2.
- **Duração mediana:** 45s em todos.
- **Quem faz filme:** 328 pessoas fizeram **1** filme; **4** pessoas fazem 2+ por
  semana. O turista é a regra; o morador é raríssimo (e é quem paga).
- **12 pagantes:** 3 Starter, 2 Creator, 2 Studio, 5 só pacote. O mais ativo
  (Starter!) fez 17 filmes; **6 dos 12 não fizeram nenhum filme em 30 dias.**
- **Custo em créditos (60s):** Kineo 1 = 5 · Seedance = 25 · H3 = 45 · Kling
  2.5 = 50 · Veo = 100 · Kling 3 = 150. Um filme de 45s: Kineo 1 ≈ 4cr,
  Seedance ≈ 19cr.
- **Custo de fornecedor por crédito:** Fast $0,066 · pior motor (H3) $0,116
  (`lib/checkoutPricing.ts`). Seedance estimado ≈ $0,09/cr (filme de 45s ≈
  $1,70; Kineo 1 ≈ $0,26). ⚠ estimativa — o guardião de margem confere.
- **Receita por crédito hoje:** Starter $0,175 · Creator $0,167 · Studio
  $0,161. Margem sobre o pior caso: ~30-35%.

## O que o mercado diz (estudo de hoje)

Os pequenos que vendem sem trial vendem **por calendário**: "3 posts/semana"
($19 AutoShorts), "1 por dia" ($39), "$20 por série" (Faceless.video), "60
shorts" ($39 Virvid). Ninguém fala em crédito na vitrine. Somos os mais
baratos do nicho e os únicos com $1.

## O PROBLEMA DOS PLANOS ATUAIS, em uma linha

**Creator $15 = 90 créditos = 4 filmes Seedance por mês.** É "um por semana"
vendido como se fosse um estúdio. Quem tem canal precisa de 30; quem é
turista precisa de 1. Nenhum dos dois cabe no que vendemos.

## A PROPOSTA — cinco degraus, em FILMES, por calendário

| degrau | preço | promessa na vitrine | créditos | o que cabe | custo est. | margem est. |
|---|---|---|---|---|---|---|
| **Trial** | **$1 / 7 dias** | "7 days of Creator" | 80 | 4 Seedance ou 16 Kineo 1 | $3-7 | (aquisição) |
| **Starter** | **$9/mês** | **"3 films a week"** | 60 | 12 Kineo 1, ou 3 Seedance | $3-5 | 45-65% |
| **Creator** | **$19/mês** | **"1 film a day"** | 150 | 30 Kineo 1 + 2 Seedance, ou 7 Seedance | $11-13 | 35-42% |
| **Studio** | **$39/mês** | **"1 cinematic film a day"** | 300 | 15 Seedance + 15 Kineo 1, ou todo motor | $25-29 | 28-35% |
| **Channel** | **$99/mês** | **"your channel on autopilot: 2 films a day, posted for you"** | 700 | 30 Seedance + 30 Kineo 1, série com memória, agendamento | $55-65 | 35-45% |
| Autopilot | $299 | agência (fica como está) | 400 + serviço | — | — | — |

Regras que acompanham:
- **Anual = 2 meses grátis** (padrão do mercado; hoje o anual é 10× o mensal).
- **First Pack $4,90 (30cr) continua**: é o "1 filme e paywall" já monetizado,
  para o turista que não quer assinar. Some do trial, aparece no pós-filme.
- **Motores caros (Veo, Kling 3, Omni) só do Studio para cima**: ninguém usa,
  e a promessa "every engine" no Creator é a que a auditoria chamou de mentira.
- **Créditos não acumulam** (mercado inteiro faz assim; hoje acumulam e 6
  pagantes têm saldo parado).
- **Preço por segundo continua** (45s custa 75% de 60s) — é o que faz "30
  filmes" caber em 150cr.

## Por que estes números

- **Starter $9**: é o piso do mercado (Syllaby $9). $7 parece barato demais
  para ser levado a sério e não muda a conversão (o vazamento nunca foi $2).
- **Creator $19**: "1 filme por dia" é a promessa que o dono de canal entende
  e o valor onde AutoShorts vende 3/semana. Para a Kineo é o meio da tabela
  e ainda o mais barato do nicho para essa promessa.
- **Studio $39**: paridade com Virvid/AutoShorts Daily; cinema diário.
- **Channel $99**: o degrau que não existe entre $29 e $299 — e é onde mora o
  morador (série, memória, agendamento). Autopilot fica para agência.
- Margens estimadas ficam **acima do piso de 30%** que o guardião de margem
  exige (`worstCaseCogsUsd`), exceto Studio no pior caso de uso 100% H3 —
  aceitável porque o uso real é 99% Seedance/Kineo 1; o guardião decide.

## O que muda para quem já paga

Ninguém perde: os 12 mantêm preço e créditos atuais (grandfather). Só contas
novas veem a tabela nova. Anúncio por e-mail com a opção de migrar.

## Como se implementa (uma rotação, sem tocar no pipeline)

`lib/checkoutPricing.ts` (TIER_PRICES, TIER_CREDITS, anual), vitrine em filmes
(`/pricing`, PricingCards, home #pricing, llms.txt, kineoFacts), gate de
motor por tier (Studio+ para Veo/Kling 3/Omni), Stripe prices novos (fundador
cria os 4 preços no painel ou eu preparo o script), guardião de margem
recalculado, e-mail de anúncio em dry-run. Channel $99 precisa do produto de
série (memória + agendamento) — 2 rotações a mais; vender primeiro como
"2 films a day" e entregar série na semana seguinte é aceitável se a vitrine
disser exatamente isso.

## O que eu NÃO recomendo

- Voltar a crédito grátis (o estudo mostra que só os grandes bancam).
- Baixar preço. Somos os mais baratos e o vazamento não é $2.
- Vender 9 motores no Creator. Vender 2 que funcionam e 7 no Studio.
