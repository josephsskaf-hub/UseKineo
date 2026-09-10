# ESTUDO — Vender pacotes de créditos em vez de assinatura (10/09/2026)

Pedido do fundador (10/09 13h): "cobrar por pacotes — $9,90 por X vídeos, $19,90,
$39,90 — sem assinatura; a pessoa compra a quantidade dela e acabou; quando os
créditos acabam, ela recarrega." **É um estudo. Nada foi mudado.**

## 1. Resposta curta (CEO)

**É viável, e a casa já tem mais da metade do caminho construído.** Pagamento
único com crédito por metadata existe desde julho (pack de $4,90, top-ups,
atacado); o webhook já marca `has_paid` em compra avulsa; o predicado de
"pago" (`isPayingProfile`) já aceita `has_paid=true` com plano `free`, então
marca d'água, motores e cota do Kineo 1 já se comportariam certo para quem
compra pacote. Pix e UPI, que hoje são o motivo prático mais forte, **só
existem em pagamento único** na Stripe e no Dodo.

O que os dados **não** sustentam é a hipótese "cartões recusam assinatura":
nas recusas de 90 dias não há uma sequer por assinatura (3 sem saldo, 1 cartão
restrito, 1 moeda). O que sustenta a mudança é outra coisa: 142 pessoas abriram
o checkout em 90 dias e 17 pagaram, renovação de assinatura quase não existe na
história da casa, e o compromisso mensal é a objeção mais citada por quem quer
"5 ou 10 vídeos".

Recomendo fazer, com quatro condições: (1) trial grátis de 30 créditos
continua; (2) créditos de pacote valem 12 meses (sem validade é passivo
contábil sem fim); (3) os 9 assinantes atuais não são tocados; (4) "recarga
automática" fica para depois de 30 compradores de pacote (é assinatura
disfarçada, e o pedido é justamente tirar o vínculo).

## 2. Fatos lidos hoje (banco, 90 dias)

| medida | valor |
|---|---|
| assinantes ativos (has_paid, plano pago, externos) | 9 |
| pagamentos de assinatura (payment_success sem pack) | 17 |
| pagamentos de pacote/top-up | 0 (o pack de $4,90 vivia escondido; top-up exige Creator+) |
| pessoas que abriram checkout | 142 |
| pessoas que abriram checkout de top-up | 1 |
| recusas de cartão por motivo | insufficient_funds 3 · card_restricted 1 · unsupported (moeda) 1 |

Margem por crédito (fonte: lib/checkoutPricing): pior caso (Kling 3) US$ 0,116/cr,
Kineo 1 US$ 0,066/cr. Os pacotes propostos mantêm o preço por crédito de hoje
($9,90/60 = 0,165 · $19,90/150 = 0,133 · $39,90/300 = 0,133), então a margem não
muda: 25–30% no pior caso, 55–70% no uso típico (Seedance/Kineo 1).

## 3. O modelo proposto

| pacote | preço | créditos | rende | BRL |
|---|---|---|---|---|
| Starter | $9,90 | 60 | 2 Seedance 60 s, ou 12 Kineo 1 | R$ 49,90 |
| Creator | $19,90 | 150 | 6 Seedance 60 s, ou 1 Kling 3 | R$ 99,90 |
| Studio | $39,90 | 300 | 12 Seedance 60 s, ou 2 Kling 3 | R$ 199,90 |

- Compra única. Créditos se somam ao saldo; validade 12 meses a partir da compra.
- Qualquer compra tira a marca d'água e abre todo motor (`has_paid`), como hoje.
- Trial grátis de 30 créditos sem cartão continua sendo a porta.
- "Recarga" = o mesmo pacote, oferecido no momento em que o saldo acaba (o
  popup já existe: `components/OutOfCreditsPlansModal.tsx` e
  `components/PostVideoPaywall.tsx`; hoje apontam para assinatura).
- Sem anual, sem intro, sem "renews".
- Pagamento: Stripe `mode: 'payment'` (cartão, Apple/Google Pay, Link, e Pix em
  BRL quando ativado); Dodo em pagamento único (UPI/RuPay/Pix) quando aprovado;
  PayPal já tem o caminho de ordem única (`/v2/checkout/orders` + capture).

## 4. Ambiente por ambiente — o que já existe, o que muda, esforço

| ambiente | hoje | mudança | esforço |
|---|---|---|---|
| Stripe checkout (`app/api/stripe/checkout/route.ts`) | 5 builders de pagamento único (pack, $2,90, top-up, piloto, atacado); top-up exige Creator+ | 3 SKUs `pack60/pack150/pack300` no builder de top-up sem o gate de plano; moeda de liquidação já resolvida (BRL para Brasil) | 1 dia |
| Webhook (`app/api/stripe/webhook/route.ts`) | compra avulsa credita por `metadata.pack_credits` e marca `has_paid=true`; plano não muda | gravar `plan='pack'` (ou manter `free`+`has_paid`) e `credits_expire_at`; comissão de afiliado já roda em compra avulsa | 0,5 dia |
| Entitlement (`lib/reverseTrial.ts` getEffectiveEntitlement) | `isPayingProfile` = `has_paid` OU plano ≠ free → pago | nada de essencial; guardião novo provando que `plan=free + has_paid` tira marca d'água e abre motores; validade de crédito no débito | 1 dia |
| Vitrine `/pricing` (Codex, visual) | 3 cards mensais + toggle anual (11 pontos), copy "/mo", "renews" | cards de pacote, sem toggle; copy de fonte única; linha "Charged in BRL" mantida | 2–3 dias |
| Copy espalhada | 151 arquivos citam "/mo", "renews", "subscription" (site, e-mails, JSON-LD, llms.txt, TAAFT) | varredura por fonte única + guardião que reprova "/mo" fora dos 9 assinantes | 1–2 dias |
| E-mails/crons | 6 crons com copy de assinatura (momentum, reminders, trial-eve, oneoff-unlock, failure-recovery, video-rescue) | trocar o CTA e a promessa; "credits back" e "trial eve" revistos | 1 dia |
| Admin/placar (`app/api/admin/_shared/mrr.ts`) | MRR por plano; pacote = 0 de MRR | "receita 30 dias" + "pacotes vendidos" + "recompra"; `PAID_PLANS` ganha `pack` | 0,5 dia |
| Afiliados | 30% "recorrente"; termos em /partners e painel | 30% em toda compra (cada recarga paga o afiliado — melhor para ele); textos | 0,5 dia |
| Dodo | 3 assinaturas + `first_pack` (único) em teste; live bloqueado pela verificação | 3 produtos únicos em vez de assinaturas; depende da aprovação | 0,5 dia |
| PayPal | ordem única existe para o pack; planos v2 são assinatura | só ordens únicas; planos ficam sem uso | 0,5 dia |
| Assinantes atuais (9) | Stripe cobra todo mês; troca de plano sem cancelar existe | não tocar; podem comprar pacote extra (top-up já faz); portal para cancelar | 0 |
| Guardiões | ~90 leem checkout/pricing; `test-restauracao` congela V5 mensal até 09/10 | 20–40 reancorados; a trava do congelamento precisa de ordem sua para mudar | 1–2 dias |

**Total: 6 a 8 dias úteis de agentes, custo externo zero.** O caminho do
dinheiro (servidor) é meu; a vitrine é do Codex; a decisão de preço e de
validade é sua.

## 5. Riscos, ditos na cara

1. **Preço e oferta estão congelados até 09/10 por decisão sua** (restauração).
   Mudar o modelo de venda é mudar a oferta. Se for para fazer antes, é uma
   nova decisão registrada, não um deslize.
2. **Receita por cliente pode cair**: quem hoje pagaria $39,90 por mês passa a
   pagar $39,90 uma vez. Na prática a casa quase não tem renovação (1 conhecida
   em setembro), então o que se perde é pequeno; o que se ganha é a compra de
   quem não assina. Mitigação: o popup de recarga no dia zero (10 dos 12
   pagantes da história compraram em 48 h).
3. **Passivo de créditos**: sem validade, cada pacote vendido é uma dívida de
   render para sempre. 12 meses resolve; o débito precisa checar a validade.
4. **Canibalização do trial**: com 30 grátis + pacote de $9,90, o pacote de
   $4,90 e os top-ups atuais perdem sentido — aposentar os dois (menos SKUs,
   menos telas mentindo).
5. **"Cartão recusa assinatura" não está nos dados.** Se a expectativa for
   "as recusas somem", ela não vai se confirmar. O ganho esperado é de
   conversão por compromisso e por Pix/UPI, não por recusa.
6. **Guardião do congelamento**: `test-restauracao-2026-09-09` trava os
   preços mensais; ele será reescrito para travar a tabela de pacotes — com a
   sua ordem.

## 6. Plano de execução (quando você disser "vai")

- **F0 — decisão (você, 10 min):** nomes dos 3 pacotes, validade (12 meses
  proposto), destino do pack $4,90/top-ups (aposentar), data de virada.
- **F1 — servidor (Claude, 2 dias):** SKUs, webhook, `credits_expire_at`,
  entitlement provado por guardião, moeda local nos 3 pacotes, Dodo/PayPal
  únicos. Tudo atrás da flag `PACKS_LIVE=false`.
- **F2 — vitrine e popup (Codex, 2–3 dias):** cards de pacote, popup de
  recarga, página de conta com "seu saldo · válido até", sem toggle anual.
- **F3 — copy, e-mails, admin, afiliados, llms/TAAFT (Claude, 1–2 dias).**
- **F4 — virada (uma quarta-feira, 09:00 BRT):** `PACKS_LIVE=true`; placar por
  pessoa a cada 12 h; critério em 14 dias: pagantes novos/semana ≥ 2× a média
  das duas semanas anteriores. Se não bater, a flag volta e nada se perde.

## 7. O que NÃO fazer agora

- Não vender pacote com desconto por volume maior que o de hoje (margem).
- Não introduzir "recarga automática" na virada.
- Não mexer nos 9 assinantes nem nas faturas da Stripe deles.
