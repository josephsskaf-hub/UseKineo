# SPRINT FECHAR A VENDA — 2026-09-07 (15:38 → 23:38 BRT)

## A ORDEM (fundador, 07/09 14:35 BRT)
"Precisamos melhorar. Gerar mais assinantes é URGENTE, como AÇÃO PRINCIPAL.
Está gerando gente que faz vídeo, mas as pessoas não têm fechado."

## O DADO QUE MANDA (30 dias, contas externas, contando PESSOAS)
video_ready_viewed 435 → video_download_clicked 226 → video_downloaded 194 →
pricing_view 155 → checkout_started 108 → payment_success 6.

Por PESSOA (o funil agregado esconde o degrau seco):
· 435 terminaram um filme · 224 baixaram · **só 53 desses 224 chegaram a uma
  página de preço** · 25 abriram checkout · 5 pagaram.
· 110 viram preço e não clicaram · 102 clicaram e não pagaram.

## MARCO DA MEDIÇÃO
`created_at > '2026-09-07 18:38:00+00'::timestamptz` (15:38 BRT).
Toda eficácia deste ciclo se mede a partir daqui — nunca "últimos N dias".

---

### #1 — 15:38→15:55 — A PERGUNTA QUE CONVERTE 17% ESTAVA ATRÁS DE TRÊS SUPERFÍCIES QUE CONVERTEM 1%

**O CARDÁPIO ESTAVA VELHO — três dos itens já existiam em produção.**
Antes de construir, medi. F1 (escolha de export no download) já existe:
`showPostVideoExportChoice`, "clean primeiro, watermark grátis embaixo".
F2 (carteiras no checkout) já existe: o Push #414 removeu o
`payment_method_types: ['card']` fixo. F3 (carta de sessão expirada) já existe
e ROda: `/api/admin/send-checkout-recovery?confirm=SEND` às 11:30 e 17:30, e o
`/api/cron/send-recovery` a cada 2h. Nenhum dos três precisava ser construído.
Construir de novo teria sido a quarta rotação perdida do mês nesse padrão.

**O QUE ESTAVA ERRADO (medido, 30 dias, por PESSOA):**

| superfície do slot pós-entrega | pessoas | → checkout | → pago |
|---|---|---|---|
| `trial_post_video_offer_viewed` (a PERGUNTA) | 231 | **39 (17%)** | 1 |
| `trial_balance_bridge_viewed` (próximo passo grátis) | 87 | 1 (1%) | 0 |
| `trial_repeat_episode_viewed` (episódio 2 grátis) | 22 | 1 | 0 |
| `plan_fit_impression` (Plan Fit) | 30 | **0** | 0 |

A tela de filme pronto tem UM slot de oferta, com precedência
bridge → repeat → Plan Fit → pergunta. **A única superfície da casa com
conversão medida chega por último.** As impressões da pergunta caíram de
176/semana (semana de 17/08) para 1/semana; o clique morreu em 22/08. Plan Fit,
que tomou o slot, somou em 12 dias de vida 30 impressões, 12 renders de card,
10 CTAs vistos e **ZERO cliques**.

**A CAUSA, nas duas guardas que estavam largas demais:**
1. `shouldReservePlanFitRecurringSlot` devolve `true` em `eligible` (primeira
   entrega) — **inclusive quando o trial está ENDING**, que é exatamente quando
   não existe próximo passo grátis a oferecer: o saldo acabou.
2. A reserva por lookup PENDENTE é um anti-flash **sem prazo**. O ramo
   `AbortError` de `refreshVideoHistory` retorna SEM carimbar
   `historyCheckedForVideoId`, e cada foco/visibilitychange re-zera o carimbo.
   Sem prazo, o slot fica reservado por NINGUÉM: Plan Fit não renderiza (não é
   elegível) e a pergunta também não (o slot está tomado).

**O QUE MUDOU — SHA `bb4c6de1` · EM PRODUÇÃO**
· `lib/growth/planFit.ts`: `trialPhase === 'ending'` devolve o slot à pergunta;
  `lookupGraceExpired` encerra a reserva anti-flash (4s). Os dois campos são
  OPCIONAIS — todo chamador existente mantém o comportamento.
· `app/(dashboard)/generate/GenerateClient.tsx`: alimenta as duas entradas e
  arma o relógio.

**O QUE O CLIENTE VÊ:** quem termina um filme com o trial acabando volta a ver
a pergunta comercial — a caixa com preço e botão — em vez de um card que em 12
dias não teve um clique. Quem está em trial ativo e primeira entrega continua
vendo o Plan Fit, exatamente como antes.

**NÃO MUDA:** preço, crédito, marca d'água, o download grátis, o pipeline.

**TESTES:** `scripts/test-plan-fit.mjs` 394/394 (8 casos novos amarrados às duas
variáveis + 4 provando que o /generate ALIMENTA as entradas). `tsc --noEmit`
verde com compilador real (junction de node_modules — `npx tsc` mente com
exit 0 nesta worktree). **Mutação:** trocar `input.trialPhase === 'ending'` por
`false` derruba 2 checks; trocar `input.lookupGraceExpired === true` por `false`
derruba 1. Os dois mutantes provaram que aplicaram antes de rodar.

**RISCO:** duas ofertas na mesma tela num trial ENDING de primeira entrega —
o `KINEO-POSTVIDEO-SINGLE-PRIMARY-2026-08-27` existe para impedir isso. Aqui não
acontece: Plan Fit deixa de renderizar quando não é dono do slot, então continua
UMA primária. Se aparecer duas, é regressão desta mudança.

**COMO MEDIR (sem instrumento novo — o contador já existe):**
```sql
select date_trunc('day', created_at)::date dia,
       count(*) impressoes, count(distinct user_id) pessoas
from events where name='trial_post_video_offer_viewed'
  and created_at > '2026-09-07 18:38:00+00'::timestamptz
group by 1 order by 1;
```
Alvo: as impressões saírem de ~1/semana. Sinal de sucesso real:
`trial_post_video_offer_clicked` voltar a existir (morto desde 22/08).

**LIMITE HONESTO DA PROVA:** a mudança é de cliente, em rota autenticada
(`/generate`, 307 para quem não tem sessão). Não existe sonda sintética que
exercite a tela de filme pronto de fora. O que ficou provado hoje: SHA na ponta
(`git ls-remote` = bb4c6de1, fila 0), site 200 com controle 404, guardião verde
e mutantes vermelhos. O comportamento se prova no contador acima, nas próximas
rotações — não antes.

**PLACAR (checagem zero, 24h):** 38 vídeos entregues, 0 falhados, 0 presos >90min,
0 recusas de cartão sem dono. 6 cadastros com 0 crédito — os 6 são
`trial_status='blocked'` por `trial_blocked_fingerprint` (quatro @live.com em 7
minutos): antifraude funcionando, não defeito.

**PRÓXIMA JOGADA:** o mesmo raciocínio de precedência vale para o *bridge*. Ele
alcança 87 pessoas e leva 1 ao checkout; ele vem ANTES da pergunta para trial
ATIVO. A pergunta não precisa substituí-lo — precisa vir junto quando o saldo do
bridge não cobre um segundo filme de verdade. Medir antes de mexer: quantas das
87 realmente gastaram o saldo no passo grátis que o bridge ofereceu. Se a maioria
não gastou, o bridge está ocupando o slot com uma promessa que ninguém aceita.

### ✅ O QUE VOCÊ PRECISA FAZER
1. Nada. A entrega subiu sozinha (SHA `bb4c6de1`, fila 0).

### 📋 O QUE ACONTECEU
A casa parou de pedir dinheiro no único instante em que a pessoa quer pagar.
A tela de filme pronto tem um lugar só para oferta, e três superfícies novas
entraram na frente da pergunta que converte: a pergunta levava 17% das pessoas
ao checkout, as três que a substituíram levam 1%, e uma delas — o Plan Fit —
não teve UM clique em 12 dias. As impressões da pergunta caíram de 176 por
semana para 1. Devolvi o lugar a ela quando o trial está acabando (que é quando
não há mais nada grátis a oferecer) e pus prazo numa trava que podia deixar a
tela sem oferta nenhuma. Preço, crédito e o download grátis não mudaram.

### #1b — 15:55→16:00 — O SILÊNCIO DA TELA DE FILME PRONTO GANHA DENOMINADOR

**O QUE ME INCOMODOU NA PRÓPRIA ENTREGA ANTERIOR:** no #1 eu *inferi* a causa.
Disse que a trava do slot deixava a tela sem oferta — mas nenhum evento na casa
prova isso, porque toda superfície emite `*_viewed` quando **aparece** e
**nenhuma** emite nada quando o slot fica reservado e nada renderiza. Ausência
de evento é indistinguível de ausência de gente. Foi por isso que o buraco
viveu 12 dias.

**O QUE MEDI (12 dias, contando PESSOAS):**
· 220 pessoas concluíram a **primeira** entrega.
· Plan Fit — que reserva o slot único dessa tela para essa coorte exata —
  somou **30 impressões**.
· **89 dessas 220 não viram oferta NENHUMA**: nem a pergunta do trial, nem o
  bridge, nem o episódio 2, nem Plan Fit, nem a caixa genérica.
· Das 89: **todas** tinham trial concedido (ou seja, a pergunta era elegível),
  **61** tinham `video_ready_viewed` confirmado, **26 baixaram o filme**, e
  1 é pagante. Nenhuma bloqueada por antifraude.

Isso é ~5 pessoas por dia chegando na tela de maior intenção de compra da casa
e não sendo convidadas a nada.

**CORREÇÃO DE UMA LEITURA MINHA:** cheguei a ver "30 impressões mas só 12 cards
renderizados" e quase escrevi que o card falhava ao renderizar. Não falha:
`plan_fit_card_rendered` só existe desde 02/09. Recortando as duas séries no
mesmo início, elas batem (11 impressões · 12 cards · 10 CTAs). O Plan Fit
renderiza bem para os poucos que alcança — o problema é que alcança poucos.

**O QUE MUDOU — SHA `66f7d061` · EM PRODUÇÃO**
· `lib/growth/postDeliveryOfferAudit.ts` (novo): função **pura** que NOMEIA o
  silêncio. Os dois motivos do Plan Fit ficam separados de propósito — lookup
  pendente é **defeito**, primeira entrega é **decisão de produto**, e os
  consertos são diferentes. Colapsar os dois devolveria um número que não diz
  o que fazer.
· `GenerateClient`: emite `post_delivery_no_offer` **uma vez por filme
  entregue**, com o motivo. A chave é o id do vídeo — sem ela o evento contaria
  re-renders em vez de pessoas (o erro que já inflou um denominador desta casa
  para 437 "oportunidades" que eram 2 pessoas).

**O QUE O CLIENTE VÊ:** nada. É instrumento puro — não decide, não renderiza,
não concede, não gasta.

**TESTES:** `scripts/test-post-delivery-silence.mjs` 19/19 (um caso por
superfície + a precedência do motivo + 6 provando que o /generate AUDITA e
EMITE). `test-plan-fit.mjs` 394/394 intacto. `tsc` verde. **Mutação:** matar o
`anyShown`, colapsar os dois motivos do Plan Fit, ou ignorar o bridge derruba
checks distintos — os três mutantes provaram que aplicaram antes de rodar.
Confirmado também que `/api/events` não tem allowlist de nome e que
`post_delivery_no_offer` não é `SERVER_ONLY` — o evento vai gravar.

**COMO MEDIR (a partir de agora):**
```sql
select metadata->>'reason' motivo, count(*) n, count(distinct user_id) pessoas
from events where name='post_delivery_no_offer'
  and created_at > '2026-09-07 18:38:00+00'::timestamptz
group by 1 order by n desc;
```
`plan_fit_reserved_pending_lookup` = o defeito que o #1 conserta (deve cair a
zero). `plan_fit_reserved_eligible` = a decisão de produto que ainda está de pé
e é a próxima jogada. `no_trial_phase` = um terceiro buraco, ainda não medido.

**PRÓXIMA JOGADA (agora com prova, não com palpite):** se
`plan_fit_reserved_eligible` for o motivo dominante, a precedência de primeira
entrega é o que está calando a pergunta — e aí o caso para tirar o slot do Plan
Fit fica fechado com número, não com opinião. Plan Fit teve 30 impressões e
ZERO cliques em 12 dias; a pergunta leva 17% ao checkout. Eu **não** fiz essa
troca agora de propósito: mexer no Plan Fit de trial ATIVO afeta a coorte
maior, e a regra desta casa é que remédio novo só entra depois que o anterior
mostrar movimento. O #1 sobe primeiro, o número decide o resto.

### ✅ O QUE VOCÊ PRECISA FAZER
1. Nada. As quatro entregas subiram sozinhas (`bb4c6de1`, `46f7183e`,
   `9e1a5d75`, `66f7d061` — fila 0 em todas).

### 📋 O QUE ACONTECEU
Descobri que 89 de 220 pessoas que fizeram o primeiro filme nos últimos 12 dias
não receberam NENHUMA oferta na tela de "filme pronto" — 61 delas comprovadamente
chegaram lá, 26 baixaram o vídeo, e a casa não pediu nada a elas. O motivo é uma
trava que reserva o único espaço de oferta dessa tela para um card que, em 12
dias de vida, apareceu 30 vezes e não teve um clique. Consertei a trava (#1) e,
como eu tinha *deduzido* a causa em vez de medi-la, criei o instrumento que
prova: agora a tela avisa quando fica em silêncio, e diz por quê. Amanhã de
manhã esse número diz se o conserto pegou — e se o card deve perder o espaço de
vez.
