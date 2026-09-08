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

### #2 — 16:01→16:20 — O DOWNLOAD ERA O MOMENTO E A TELA NÃO FICAVA SABENDO

**O ERRADO (medido, 30 dias, contas externas, contando PESSOAS):**
`video_download_clicked` 225 pessoas — **207 delas na done screen**, 40 no
/history. `video_downloaded` 193, e o campo `export_type` diz o que levaram:
**159 'clean' contra 45 'watermarked'**.

O `handleDownload` do /generate marcava o estado pós-download numa condição só,
desde 04/08:

```js
if (delivered && exportType === 'watermarked') setWatermarkedDownloadConfirmed(true)
```

`exportType` só é `'watermarked'` para `free && !hasPaid && !trialActive`. Logo,
em **~8 de cada 10 entregas** os bytes chegavam na mão da pessoa e a PÁGINA NÃO
REAGIA. No instante de maior valor percebido que este produto tem, nada mudava
na tela.

**POR QUE A OFERTA QUE EXISTE ALI NÃO COBRE ESSA GENTE — e por que eu NÃO
construí o F1 como está escrito no cardápio.** O F1 pede "Download clean (no
watermark) → checkout" para conta trial/free. Para a coorte que domina o
download isso seria **mentira**: quem baixa em trial já leva um MP4 **limpo**
(o servidor decide por `isFreePlanFast`, que exclui o trial). Vender remoção de
marca d'água a quem não tem marca d'água é o pior desfecho possível desta tela.
A exclusão do trial na caixa de export limpo está CERTA e não se mexe — o
defeito é que **nada ficou no lugar** no instante do download.

**O TAMANHO DO SILÊNCIO, com denominador:** `video_ready_viewed` 434 pessoas em
30 dias; `post_video_offer_viewed` **27** (6%), e a última impressão é de
**04/09**. `clean_paywall_opened` — o gatilho "Remove the watermark →" que
existe no código desde 22/08 — tem **ZERO eventos em toda a história**.

**QUEM SÃO OS 225 QUE BAIXAM:** 174 estão hoje `trial_status='downgraded'`,
plano free, sem pagar — e **só 8 deles têm algum saldo**. Mais 43 em trial
ativo. 6 pagantes. Ou seja: a maior parte de quem baixa é gente cujo trial
morreu e que não pode fazer outro filme.

**O QUE MUDOU — SHA `d3999187` · EM PRODUÇÃO**
· `lib/growth/postDownloadAsk.ts` (novo): função **pura** que decide se — e por
  quê — a casa fala depois que os bytes chegaram. A ordem das guardas É a
  regra: sem download não há momento → o bloco de marca d'água, se visível, é o
  dono do momento (**nunca empilhar**) → quem já paga não recebe oferta → só
  então a fase do trial decide. Devolve também `no_surface`: baixou e não havia
  nada a dizer.
· `GenerateClient`: marca o download entregue para **qualquer** export — estado
  NOVO, separado de `watermarkedDownloadConfirmed` de propósito, porque aquele
  governa o paywall de export limpo e o `VideoRatingAsk`, e alargá-lo mudaria o
  comportamento das 45 pessoas que hoje o acionam e contaminaria a série que
  mede a pressão do watermark. Emite `post_download_ask_state` **uma vez por
  vídeo** com o motivo. E a sobrancelha do cartão de trial passa a afirmar o
  fato — "Your film is downloaded" — depois do download.

**O QUE O CLIENTE VÊ:** uma linha de texto que muda depois que ele baixa.
Manchete, preço e botão intactos. O download continua primeiro, grátis, sem
pedágio — o bloco novo roda **depois** do `await` do arquivo e não pode adiar
nem condicionar a entrega. Nenhuma caixa nova: a casa já pagou uma vez o preço
de dois cartões azuis gêmeos e adjacentes, e este commit se recusa a repetir.

**TESTES:** `scripts/test-post-download-ask.mjs` 34/34 — ordem das guardas por
POSIÇÃO (não por presença), cada guarda amarrada à variável que decide, e 4
checks provando que o cliente consulta e emite. `test-plan-fit` 394/394 e
`test-post-delivery-silence` 19/19 intactos. `tsc` verde.
**Mutação:** 4 mutantes, e cada um **provou que aplicou** comparando conteúdo
antes/depois antes de rodar (um deles não aplicou na primeira tentativa por
CRLF e foi refeito, em vez de virar verde falso).

**ERRO MEU, REGISTRADO:** o âncora da minha edição casou um PREFIXO e orfanou o
`&& !planFitOwnsRecurringSlot` que o #1 tinha acabado de pôr em
`showTrialPostVideoOffer` — eu teria desligado a guarda da entrega anterior. O
`tsc` pegou (TS2873) e a linha foi restaurada; o diff final não toca a
declaração. Fica a lição: âncora por prefixo em arquivo que a outra pista
acabou de mexer é armadilha.

**LIMITE HONESTO DA PROVA:** mudança de cliente em rota autenticada
(`/generate`). Não existe sonda sintética que exercite a done screen de fora.
Provado: SHA na ponta (`git ls-remote` = `d3999187`, fila 0), site 200 com
controle 404, guardião verde e 4 mutantes vermelhos. O comportamento se prova
no contador abaixo.

**COMO MEDIR (a partir de agora):**
```sql
select metadata->>'reason' motivo, count(*) n, count(distinct user_id) pessoas
from events where name='post_download_ask_state'
  and created_at > '2026-09-07 18:38:00+00'::timestamptz
group by 1 order by n desc;
```
`no_surface` = quem baixou e a casa não teve nada a dizer — a coorte que hoje
some, e que nunca teve número. `trial_active`/`trial_ending` = onde a fala nova
aparece. Filtrar por `metadata ? 'reason'` (carimbo do deploy), nunca pelo
relógio.

**PLACAR DE FECHAMENTO (30d, pessoas):** `video_ready_viewed` 434 →
`download_clicked` 225 → `downloaded` 193 → `checkout_started` 108 →
`payment_success` 6. Checagem zero: sem cadastro com crédito zero fora do
antifraude, sem débito sem entrega, sem render preso.

**O ACHADO QUE VALE MAIS QUE ESTA ENTREGA — e que contraria a tese de preço:**
por tier, das 108 pessoas que iniciaram checkout em 30 dias,
**Creator $15 → 67 pessoas, 2 pagaram (3%)** ·
**Starter $7 → 29 pessoas, 2 pagaram (6,9%)** ·
**Studio $29 → 14 pessoas, 3 pagaram (21%)**.
O plano MAIS BARATO **não** é o que mais fecha, e o mais caro converte 7x
melhor que o do meio — enquanto **62% do fluxo é despejado no Creator**, o pior
conversor da casa. Isso não reabre a conclusão de preço do fundador (ela foi
feita sobre 44 pessoas, repetidas vezes), mas diz que **baratear não é a
alavanca** — a alavanca é parar de empurrar todo mundo para o degrau do meio.
O trial de $1 no Creator (`c902516f`, hoje 15:43) ataca o mesmo número por
outro lado; deixo os dois medindo antes de mexer de novo.

**PRÓXIMA JOGADA:** quem escolhe Studio já sabe o que quer — não é o preço que
o qualifica, é a clareza. A jogada não é descer o Creator, é **deixar a pessoa
declarar o volume antes de ver tier**: "quantos filmes por mês?" decide o
degrau, em vez de a tela decidir por ela. É exatamente o que o Plan Fit deveria
fazer e não faz — 30 impressões e 0 cliques em 12 dias, e nas 52 sessões de
checkout que carregam o campo `plan_fit_recommended_tier` o **valor é null em
todas**. Antes de construir: medir se o campo é null porque ninguém chega ao
checkout via Plan Fit (provável, e aí é alcance) ou porque ele se perde no
caminho (aí é defeito).

### ✅ O QUE VOCÊ PRECISA FAZER
1. Nada. A entrega subiu sozinha (SHA `d3999187`, fila 0).

### 📋 O QUE ACONTECEU
O download é o instante em que a pessoa mais gosta da Kineo — 207 pessoas por
mês apertam esse botão na tela do filme pronto. Descobri que, em 8 de cada 10
vezes, a página **não ficava sabendo** que o download aconteceu: o código só
registrava o fato quando o arquivo saía com marca d'água, o que hoje é minoria.
Resultado: no melhor momento do produto, a tela ficava muda. Não construí a
oferta do jeito que estava no plano ("pague para tirar a marca d'água") porque
para quem está em trial isso seria mentira — o filme dele já sai limpo. Em vez
disso a tela passa a reconhecer o download e a falar com a pessoa certa, sem
caixa nova, sem mexer em preço e sem tocar no download grátis. E, medindo por
tier, achei algo que contraria o instinto: o plano de $29 converte 21% e o de
$15 converte 3% — e a casa manda 62% das pessoas para o de $15.

### #3 — 16:39→17:05 — A ORDEM DO FUNDADOR ERA MEIA POLÍTICA, E A OUTRA METADE NÃO SABIA ENTREGAR O QUE IA VENDER

**ERRADO (medido antes do deploy, 7 dias, contas externas, `trial_status='active'`):**

| export_type que o cliente registrou | downloads | pessoas |
|---|---|---|
| `watermarked` | 31 | 22 |
| `clean` | **29** | **16** |

E o motor por trás dos 29 limpos (cruzando as mesmas pessoas com `videos`, 7d,
`status='completed'`): **`fast` 17 · `cinematic_ai` 13 · premium ZERO.**

A política KINEO-TETO — "o trial recebe o filme, o plano recebe o export
limpo" — existia **pela metade**. Em `app/api/compose/route.ts`,
`isTrialRender` só era atribuído dentro do ramo `else // quality === 'fast'`.
O ramo `cinematic_ai` (Seedance 1.5, o motor de metade das primeiras
impressões da casa) **nunca o preenchia**, então ele chegava ao builder como
`false` por omissão — não por decisão. Ninguém escreveu "o Seedance do trial
sai limpo"; simplesmente não havia linha nenhuma dizendo o contrário.

**O SEGUNDO DEFEITO, QUE NINGUÉM TINHA VISTO, E ESSE CUSTA DINHEIRO AO
CONTRÁRIO:** o predicado era `isTrialRender = ent.isTrial` puro. O **trial de
$1** (o que subiu hoje às 15:43, `plan='basic'` + assinatura `trialing`)
satisfaz **os dois** lados: é conta paga **e** é trial ativo. Quem acabou de
pôr o cartão recebia marca d'água no filme que comprou.

**MUDOU — EM PRODUÇÃO, SHA `9f2822b0`** (fila 0, `git ls-remote origin main`
confirmado; controle de sonda 404 numa rota irmã inexistente, `/api/compose` e
`/api/compose/unlock` respondendo 401, home 200).

1. **`app/api/compose/route.ts`** — o ramo `cinematic_ai` passa a decidir, e o
   ramo `fast` ganha o mesmo termo: `ent.isTrial && !ent.isPaidAccount`.
   `isPaidAccount` sai do **mesmo** `getEffectiveEntitlement` que já decide
   crédito, clamp e cota — o predicado do cobrador não se redigita.
2. **A decisão de marca d'água virou UMA variável** (`watermarkApplied`),
   resolvida uma vez, lida pelo builder **e devolvida na resposta**.
3. **`app/api/compose/unlock/route.ts` — O PAR OBRIGATÓRIO, e a parte que quase
   virou promessa quebrada.** A rota remontava o filme limpo **sempre** com
   `quality: 'fast'`. Só que `quality` **não é rótulo** em `lib/compose.ts`: é
   `isFastStock`, e ele decide corte de 6/9s **com reciclagem de clipe**,
   grade, glow e letterbox de estoque. Um Seedance (clipes únicos de 10s)
   remontado como `'fast'` volta **com outra montagem** — mais curta e com
   clipe repetido. Enquanto só o Kineo 1 saía marcado isso nunca aparecia; a
   partir do instante em que o Seedance do trial sai marcado, o botão
   "Download clean" passaria a **vender um filme e entregar outro**. As duas
   metades subiram no MESMO commit: whitelist `REBUILD_QUALITIES =
   {fast, cinematic_ai}` (as duas que o builder clássico monta). Custo 0,
   claim assinado e rótulos da resposta: **intocados, byte a byte**.
4. **`GenerateClient.tsx`** — a tela parou de adivinhar.
   `currentResultHasWatermark` reconstruía no navegador a decisão do servidor
   (`quality === 'fast' && !falUsedRef`) e, a partir deste commit,
   **continuaria jurando que o filme está limpo**. Consequência medível:
   `video_downloaded.export_type` rotularia `'clean'` um download COM marca — a
   própria série que usei para achar este defeito ficaria cega. Agora
   `watermark` viaja na resposta e manda; o predicado antigo sobrevive só como
   fallback para o que o servidor não contou (sessão restaurada, render
   anterior ao deploy).

**O QUE O CLIENTE VÊ:** quem está em trial e gera um Seedance recebe o filme
inteiro, na hora, de graça — **com a marca d'água**, como já acontecia com o
Kineo 1. O download grátis continua **primeiro e sem pedágio**
(KINEO-DELIVER-FIRST). A caixa que já existe na tela de filme pronto
(`showTrialPostVideoOffer`, entregue pela pista de fluxo) passa sozinha a
oferecer o export limpo: ela já consultava `currentResultHasWatermark` em
`trialPrimaryUnlocksCurrentFilm` e recebia `false` de todo Seedance.
**Nenhuma caixa nova foi criada** — a casa já pagou uma vez o preço de dois
cartões azuis gêmeos e adjacentes.

**PREMIUM CONTINUA LIMPO NO TRIAL, DE PROPÓSITO.** Kling 3 / Veo / H3 / Omni /
S25 têm narração **por cena** e são montados por
`buildHollywoodCreatomateSource` — o unlock não sabe remontá-los, e marcar sem
saber desmarcar seria repetir a promessa quebrada. **Não é buraco aberto: são
ZERO renders premium de trial em 7 dias.** A resposta hollywood já devolve
`watermark: forced` sem mentir. Dívida registrada no PEDIDOS.

**TESTES:** `scripts/test-trial-watermark.mjs` **49/49**. Ele não conta texto:
**extrai as expressões que decidem do próprio arquivo e as avalia** contra uma
tabela-verdade de 4 linhas por ramo (trial não-pago → marca; trial de $1 → sem
marca; free sem trial e assinante → o termo não decide). Vizinhos intactos:
`test-post-download-ask` 34/34, `test-post-delivery-silence` 19/19,
`test-plan-fit` 394/394. `tsc --noEmit` verde (com junction de `node_modules` —
sem ela o `npx tsc` mente com exit 0).
**Mutação: 5 mutantes, 5 vermelhos**, e cada um **provou que aplicou**
comparando o conteúdo do arquivo antes/depois antes de rodar — M1 inverte o
termo do pagante, M2 devolve a decisão ao builder, M3 volta a cravar `'fast'`
no unlock, M4 tira a precedência do servidor na tela, M5 apaga um dos três
resets.

**RISCO DECLARADO:** o primeiro filme grátis de Seedance deixa de ser postável
limpo. É a ordem explícita do fundador e é o par do KINEO-TETO — se um dia for
revertido, reverter os dois juntos.

**LIMITE HONESTO DA PROVA:** `/api/compose` é autenticado e o campo novo só
nasce num render real. Provado de fora: SHA na ponta, fila 0, sonda 401 com
controle 404 na mesma medição, guardião verde e 5 mutantes vermelhos. O
comportamento se prova no contador abaixo — não antes.

**COMO MEDIR (corte pelo CARIMBO, nunca pelo relógio):**

```sql
select coalesce(e.metadata->>'export_type','(sem rotulo)') export_type,
       v.quality_mode, count(*) n, count(distinct e.user_id) pessoas
from events e
join profiles p on p.id = e.user_id
left join videos v on v.user_id = e.user_id
     and v.created_at between e.created_at - interval '2 hours' and e.created_at
where e.name = 'video_downloaded'
  and e.created_at > '2026-09-07 20:00:00+00'::timestamptz
  and p.trial_status = 'active'
group by 1,2 order by n desc;
```

Alvo: `clean` em `cinematic_ai` de trial → **0**. E o número que paga a conta:
`checkout_started` com origem `generate_watermark_unlock` vindo de trial, e
`payment_success` atrás dele.

**PLACAR DE FECHAMENTO (30d, pessoas, contas externas):** `video_ready_viewed`
431 → `video_download_clicked` 225 → `video_downloaded` 193 →
`checkout_started` 107 → `payment_success` 6.
⚠️ *Correção de nome, para a próxima rotação não repetir:* a etapa que o
cardápio chama de "download_clicked" é **`video_download_clicked`** no banco.
Rodada com o nome curto ela devolve **0 pessoas** e parece colapso do funil —
é chave inexistente, não queda.

**CHECAGEM ZERO (24h):** render preso 0 · recusa de cartão sem dono 0 ·
cadastro com crédito zero 12, **todos explicados**: 6 `trial_status='blocked'`
(antifraude) e 6 `downgraded` (trial gasto). Nenhum trial órfão.
**149 trials ativos agora** — é essa a plateia que a mudança alcança.

**PRÓXIMA JOGADA, e ela não é mais marca d'água.** O achado da rotação #2 diz
que **Studio $29 converte 21% e Creator $15 converte 3%**, com 62% do fluxo
despejado no Creator. O achado desta diz que **ZERO trials tocam em motor
premium**. As duas coisas são a mesma frase: **a casa vende o topo do catálogo
para gente que nunca viu o topo do catálogo.** A jogada é dar ao trial **um**
render premium de cortesia (Kling 3 ou S25, uma vez só, com marca d'água e sem
opção de unlock — a limitação de hoje vira *feature*, não dívida): quem vê um
filme de $29 sair da própria ideia não precisa que a tela explique o degrau.
~$11 de fal por trial é caro demais como padrão — mas como **prêmio pelo
SEGUNDO filme entregue** ele só aparece para quem já provou intenção, que é
exatamente o perfil da coorte de 21%. Medir antes de construir: quantos trials
chegam ao segundo render entregue em 30 dias, e quanto custaria o prêmio nessa
fatia.

### ✅ O QUE VOCÊ PRECISA FAZER
1. Nada. A entrega subiu sozinha (SHA `9f2822b0`, fila 0).

### 📋 O QUE ACONTECEU
Você mandou ligar a marca d'água no trial. Ao abrir o código, a política estava
escrita só pela metade: o Kineo 1 saía marcado, o Seedance saía limpo — e não
por decisão, por uma linha que nunca foi escrita. Em 7 dias isso deu 29 filmes
entregues limpos a quem não pagou. Consertei, e no caminho achei o defeito
espelhado: quem assinou o trial de **$1 hoje** estava recebendo marca d'água no
filme que **comprou** — os dois eram o mesmo predicado mal escrito. O que quase
virou problema maior: ao ligar a marca, o botão "Download clean" iria
**devolver outro filme** — a rota de desbloqueio remontava tudo com o ritmo do
Kineo 1 (cortes curtos, clipe repetido). Vender limpo e entregar diferente é
promessa que a casa não sabe cumprir, então as duas metades subiram juntas. O
download grátis com marca continua primeiro e sem pedágio. Os motores caros
(Kling 3, Veo) seguem saindo limpos no trial de propósito — e isso não custa
nada hoje: **nenhum trial usou motor premium em 7 dias**. Esse último número é
a próxima jogada: a casa vende o plano de $29, que converte 21%, para gente que
nunca viu o que ele faz.

### #4 — 17:09→17:35 — A CASA LEVAVA 27 HORAS PARA FALAR COM QUEM APERTOU COMPRAR

**O QUE ESTAVA ERRADO (medido, 30 dias, contas externas, contando PESSOAS):**

```
checkout_started ......................... 107 pessoas
   dessas, payment_success ...............   6
   não pagaram ...........................  101
   horas até a casa dizer QUALQUER COISA ..  27   ← a média
   nunca receberam carta nenhuma ..........  19
```

Vinte e sete horas. A pessoa aperta "comprar", chega na página de pagamento, não
conclui — e a casa, que sabe disso **no mesmo segundo**, leva mais de um dia para
abrir a boca. Não é desleixo: é **arquitetura**. A única carta desta coorte
(`send-checkout-recovery`, #13 de 06/09) espera o evento
`checkout.session.expired`, e a sessão da casa vive **24 horas**
(KINEO-CHECKOUT-24H). Soma-se o cron dela, que roda **duas vezes ao dia**, e o
piso é ~24h antes de qualquer palavra. **Em regime a coisa é pior do que a média
sugere:** das 3 sessões que expiraram DEPOIS daquela rota nascer, **0 receberam
carta** — ela drenou o passivo de 18 dias em 06/09 (22 cartas num dia, o que
inflou a média para 93h) e ainda não pegou um caso novo.

⚠️ **Duas correções do cardápio, para a próxima rotação não repetir o erro:**
· F5 dizia "44 pessoas tentaram checkout 2+ vezes". **São 15**, e 2 delas
  pagaram (13%, contra 4,3% de quem tentou uma vez só). A coorte que sobraria
  para uma superfície nova é de **13 pessoas** — F5 não paga o próprio custo, e
  eu o deixei de lado por medição, não por falta de tempo.
· A regra do slot pós-entrega continua valendo e ficou mais forte:
  `trial_post_video_offer_viewed` = **229 pessoas em 30d**, e
  `trial_post_video_offer_clicked` **está morto desde 22/08**. Construir a
  sétima caixa naquela tela era a jogada errada (memória
  `medir-os-remedios-existentes-antes-do-setimo`).

**O QUE MUDOU — SHA `1b4f3d9a`, EM PRODUÇÃO, fila 0.**

Rota nova: `app/api/admin/send-checkout-hot-nudge/route.ts`. Ela **não espera a
sessão morrer**. Trinta minutos depois do clique de comprar ela busca a sessão
na Stripe e só escreve se a resposta for `status: 'open'` com `url` viva.

**A parada, e ela é a regra central do arquivo:** sessão paga, expirada, sem
link ou irrespondível = **silêncio**. O link é a promessa inteira; sem ele isto
viraria mais um "volte pra gente", que é a classe de e-mail que a casa já mandou
demais.

**O QUE O CLIENTE VÊ:** meia hora depois de fechar a aba do pagamento, um e-mail
curto do fundador dizendo a verdade — *a tua página continua aberta, nada foi
cobrado* — com um botão que **reabre exatamente a mesma sessão**: mesmo plano,
mesmo valor, nada para escolher de novo. Logo abaixo, em uma linha, a saída
barata que já é pública desde hoje de manhã: **Creator por $1 nos primeiros 7
dias**, depois $15/mês. E um convite para responder em uma frase se foi outra
coisa. **Nenhum preço, cupom ou desconto novo foi criado** — a conclusão fechada
do fundador (o vazamento é PREÇO) fica intacta: esta carta não reabre o assunto,
ela devolve a porta para quem já passou pela decisão.

**PRECEDÊNCIA, nos dois sentidos e no mesmo commit** (memória
`cron-no-mesmo-minuto-nao-tem-ordem` + `a-regra-vive-em-varios-arquivos`): o
carimbo `checkout_hot_nudge_emailed_v1` entrou em `OUTRAS_CAMPANHAS` da carta de
expiração, e ela já estava na minha. Quem levar uma nunca leva a outra. O cron
roda em `6,21,36,51 * * * *` — **nenhuma outra campanha de e-mail divide um
minuto com esta**, e o guardião falha se alguém criar uma que divida.

**TESTES:** `scripts/test-checkout-hot-nudge.mjs` **65/65**. Ele **não conta
texto**: recorta do próprio `route.ts` as duas funções puras que decidem
(`escolherPaginaViva`, `dentroDaJanela`) e as **avalia** contra uma
tabela-verdade — sessão `complete` não recebe, `expired` não recebe,
`payment_status: 'paid'` não recebe, sem `url` não recebe, prazo vencido não
recebe, e `expires_at` é lido em **segundos** (comparar sem os mil diria que todo
link morreu em 1970 e a carta nunca sairia). O arquivo é lido, não importado —
com alias `@/` e `next/server` ele morreria antes da 1ª verificação (memória
`guardioes-com-alias-nao-rodam`). **Mutação: 10 mutantes, 10 vermelhos**, e cada
um **provou que foi escrito** comparando o conteúdo antes/depois antes de rodar
(memória `mutacao-precisa-provar-que-aplicou`). Vizinhos intactos:
`test-trial-watermark` OK, `test-post-download-ask` 34/34,
`test-post-delivery-silence` 19/19. `tsc --noEmit` verde.

---

**🔴 E UMA COISA QUE NÃO ERA MINHA E TERIA MATADO O DIA INTEIRO.**

Ao rodar o `tsc` eu descobri que **a ponta da `main` estava VERMELHA**. O commit
`8647a933` (#363, pista de pagamentos) reescreveu `lib/paypal.ts` **a partir de
uma base velha** (`-139/+54` linhas) e apagou quatro exports que **três arquivos
ainda importam**: `PAYPAL_ENV_NAMES`, `isPaypalEnabled`, `paypalMissingEnv`
(`app/api/admin/payment-rails`) e `paypalReleaseEvent` (`app/api/paypal/return` e
`.../webhook`). Cinco erros `TS2305` na ponta `da0dc5d1` — quer dizer que
**nenhum deploy do dia subiria**, nem o dele, nem o meu, nem o do Codex.

Restaurei **literalmente essas quatro**, sem tocar em nada que o #363 fez com
preço e grant. O que **não** restaurei, de propósito: o mesmo commit devolveu
`grantPackCredits` à versão com `profile?.video_credits ?? 0` — num erro de
**leitura** o saldo do cliente é reescrito como `0 + credits`, **apagando o que
ele tinha**. Isso é do dono do arquivo reaplicar deliberadamente; foi exatamente
uma terceira mão reescrevendo por cima que criou esta confusão. Exposição hoje é
**zero** (tabelas de PayPal vazias, trilho nasce desligado), e está no PEDIDOS em
vermelho. A bandeira que deveria ter parado o commit:
`lib/paypal.ts | 193 ++++----` num commit cujo assunto era preço.

**RISCO DECLARADO:** é uma carta nova, e a memória
`carta-nova-so-depois-da-velha-mover` diz para não empilhar campanha. Aceito o
risco por três motivos medidos: (1) ela **substitui** a velha para quem a
receber, não empilha — a exclusão é mútua; (2) a velha, em regime, pegou **0 de
3**; (3) esta é a única carta da casa cujo botão principal **não pede nova
decisão de preço**.

**COMO MEDIR (corte pelo carimbo, nunca pelo relógio — memória
`campo-novo-e-o-carimbo-do-deploy`):**

```sql
select count(*) cartas,
       round(avg((metadata->>'minutes_after_click')::numeric)) min_apos_o_clique,
       count(*) filter (where exists (
         select 1 from events p where p.user_id = e.user_id
           and p.name = 'payment_success' and p.created_at > e.created_at)) pagou_depois
from events e where e.name = 'checkout_hot_nudge_emailed_v1';
```

Alvo da rotação: `min_apos_o_clique` na casa dos **30-60**, contra as 27 HORAS de
hoje. O número que paga a conta é `pagou_depois`.

**A FRASE DA ROTAÇÃO:** hoje um visitante novo que aperta "comprar" e não conclui
é procurado pela casa em **30 minutos, com a página dele ainda aberta** — ontem
ele ficava **27 horas** no escuro, e um em cada cinco nunca ouvia nada.

**PLACAR DE FECHAMENTO — desde o marco (2026-09-07 18:38 UTC, ~1h50 de tráfego):**
filme pronto 0 · clicou baixar 0 · baixou 0 · viu preço 1 · checkout 1 · **pagou 0**
· cliques no trial de $1: 0 · cartas quentes enviadas: 0.

⚠️ **"0 filmes prontos" aqui NÃO é incidente, e eu conferi antes de escrever**
(memória `queda-de-trafego-contra-hora-inflada`). Na MESMA janela de relógio
(18:38–20:30 UTC) dos últimos 6 dias: 09/06 → 2 · 09/05 → **0** · 09/04 → 1 ·
09/03 → 2 · 09/02 → 4 · 09/01 → **0**. E 19 pessoas ativas hoje, dentro da faixa
de 13–33 dos outros dias. É a hora, não o produto. O marco tem menos de duas
horas: este placar ainda não prova nem nega nada, e o primeiro número honesto
sai na rotação da noite.

**As cartas quentes serem 0 é o desfecho esperado e o mais seguro possível.**
Repliquei o predicado da rota em SQL contra as linhas reais (memória
`provar-leitura-sem-trafego`): na janela de 30–360 min existe **1** pessoa, e é
a conta interna do fundador — excluída por dois motivos independentes
(`has_paid` e o filtro de e-mail). O predicado não está vazio por acidente. Com
~107 cliques de comprar em 30 dias, a carta sai a conta-gotas (3–4 por dia no
pico), nunca em rajada, e o teto de 30 por execução mais o carimbo vitalício
seguram o resto.

**CHECAGEM ZERO (24h):** render preso **0** · recusa de cartão sem dono **0** ·
cadastro com crédito zero **12**, todos explicados por `trial_status`
(`blocked` = antifraude, `downgraded` = trial gasto). **Nenhum trial órfão.**

**PRÓXIMA JOGADA, e ela sai da tabela que eu levantei nesta rotação.** Por tier,
em 30 dias: **Studio $29 → 13 pessoas no checkout, 3 pagaram (23%)** · Starter
$7 → 25 / 2 (8%) · **Creator $15 → 52 / 2 (3,8%)** · INR (IN) → 17 / 0. A casa
despeja **quase metade do fluxo no SKU que menos converte**, e o de maior preço
é o que mais fecha. Isso desmonta a leitura fácil ("é caro"): quem escolhe o
plano caro é quem já sabe para que veio. O que a Creator tem de diferente não é
o preço, é a **indefinição** — é o plano que a pessoa clica quando não sabe o
que quer. Antes de construir qualquer coisa, a medição de 10 minutos que decide:
**de onde vem o clique de Creator** (`checkout_entry_surface` já existe no
`checkout_started`, com 7 registros — provavelmente novo). Se a maioria vier de
uma superfície que **escolhe o tier pela pessoa** (card do meio, "recomendado",
default do paywall), o conserto não é preço nem carta: é parar de escolher
errado por ela. Se vier de escolha livre, aí sim a hipótese é oferta.

---

### #5 — 17:39-18:10 — A TELA DE FILME PRONTO PAROU DE PEDIR DINHEIRO, E FAZ DUAS SEMANAS

**ERRADO (medido, contas externas, contando PESSOAS).** A rotação anterior
deixou uma medição de 10 minutos como próxima jogada: descobrir de qual
superfície vem o clique de Creator, lendo `checkout_entry_surface`. **Ela não
é respondível** — esse campo tem **4 linhas** em 30 dias, e o campo que existe
de verdade (`checkout_origin`, 120 linhas) é a constante `'standard'` em
100% delas. Não discrimina nada. Anotado para ninguém gastar outra rotação
com ela.

Fui atrás do funil por outro lado e achei uma coisa maior. **A tela de filme
pronto — o instante de maior intenção de compra da casa — parou de pedir
dinheiro:**

| | filme pronto | pergunta comercial na tela |
|---|---|---|
| 19/08 | 35 pessoas | **34** |
| 20/08 | 22 | 19 |
| 23/08 | 8 | 7 |
| 02/09 | 31 | **1** |
| 05/09 | 20 | **2** |
| 06/09 | 25 | **1** |
| 07/09 | 13 | **1** |

De ~90% para ~4%, **com o volume de filmes subindo**. E a caixa genérica de
export limpo (`post_video_offer_viewed`) **não dispara uma única vez desde
04/09**.

**Três controles rodados antes de acreditar no número:**
1. **Não é queda de tráfego** — `video_ready_viewed` tem 133 pessoas em 7d e
   43 em 2d, dentro da faixa normal (memória `queda-de-trafego-contra-hora-inflada`).
2. **Não é rename** — nenhum evento de oferta pós-vídeo nasceu no lugar dela.
3. **Não é a coorte** — a leitura fácil seria "todo mundo virou `downgraded`",
   mas `trial_status` é estado ATUAL: em agosto ele mostra "gasto" para gente
   que estava em trial na hora. Essa consulta não prova nada e foi descartada.

**A CAUSA É SUCESSÃO, NÃO DEFEITO.** O que nasceu não foi um substituto, foi
**concorrência pelo mesmo slot único**, tudo em duas semanas: Plan Fit 27/08,
history_first_video 28/08, **trial_balance_bridge 30/08**, trial_repeat 30/08,
welcome_offer 01/09, next_action 06/09. **Todas dizem "faça outro vídeo".
Nenhuma pede dinheiro.** No JSX a pergunta comercial era a **última de três**:
o bridge de saldo renderizava no lugar dela, e ela só sobrava quando as duas
grátis desistiam.

⚠️ **Corrijo um número herdado.** O comentário de `postDeliveryOfferAudit.ts`
(escrito hoje, rotação #1b) chama a pergunta comercial de "a de maior conversão
medida: **17%**". **Não reproduzi esse número.** Medido por mim em 60 dias,
contando pessoas: a pergunta **22 cliques / 241 impressões = 9,1%**; o bridge
de saldo **5 / 88 = 5,7%**. A conclusão sobrevive (a pergunta converte 1,6x
melhor **e é a única das duas que termina em checkout**), mas o 17% não deve
ser recitado.

**MUDOU — EM PRODUÇÃO, SHA `fa09b1eb`** (deploy `dpl_FAZrqthofUgmUQXh5BGaCDyLiwMP`,
state READY, target production, `githubCommitSha` = fa09b1eb; a ponta atual
`5fe8550b` da pista de aquisição tem o meu commit como ancestral — conferido
com `git merge-base --is-ancestor`).

`lib/growth/postDeliverySlot.ts` (novo, puro) decide o dono do slot único.
**A única virada: quando o filme entregue carrega marca d'água, a pergunta
comercial vem primeiro.** Isso só passou a fazer sentido **hoje** — desde o
`9f2822b0` (fv-r3) o filme do trial sai marcado, então no instante da entrega
existe, pela primeira vez, algo concreto que só o dinheiro resolve: **este
filme, limpo**. Quando o filme já sai limpo, a ordem antiga fica byte a byte
como estava.

A fonte é `currentResultHasWatermark` — a **mesma** que `trialPrimaryUnlocksCurrentFilm`
usa para montar o checkout do export limpo. Divergir as duas faria a caixa
ganhar o slot prometendo um limpo que ela não sabe entregar.

**O QUE O CLIENTE VÊ:** quem termina um filme em trial e o filme sai com marca
d'água encontra, logo abaixo do vídeo, **a caixa que vende este filme limpo** —
no lugar de mais um convite grátis para gastar o saldo em outro vídeo. **K1
intacto:** o download com marca continua primeiro e de graça; nada aqui virou
pedágio, mudou só qual caixa ocupa o slot.

**TESTES:** `scripts/test-post-delivery-slot.mjs` **35/35**. Amarrado às
variáveis que decidem, não ao texto (memória `guardiao-contar-texto-nao-prova-condicao`):
compila o módulo real e o **avalia**, inclui a matriz completa de 8 combinações
provando que nunca há dois donos, **3 verificações de CALLER** (o módulo não
pode virar biblioteca morta — a casa já pagou esse preço com o `sceneTruth` em
27/08) e **2 que exigem a morte das guardas antigas** (memória
`duas-fechaduras-na-mesma-porta`). **Mutação: 6 mutantes, 6 vermelhos**, cada
um provando que foi **escrito** antes de rodar (memória
`mutacao-precisa-provar-que-aplicou`). Vizinhos intactos:
`test-post-delivery-silence` 19/19, `test-post-download-ask` 34/34,
`test-trial-watermark` 49/49. `npx tsc --noEmit` verde.

**RISCO DECLARADO, e é real.** O bridge de saldo (136 impressões desde 30/08)
perde o slot em toda entrega marcada — que é a maior parte da coorte `fast` em
trial, já que o bridge só existe para `fast`. Na prática ele quase desaparece.
Aceito porque a pergunta converte 1,6x melhor, é a única que termina em
dinheiro, e a casa está há dois dias sem assinante novo. **É uma linha para
reverter** (`if (input.deliveredFilmWatermarked) return 'commercial_ask'`).

⚠️ **LIMITE HONESTO DA SONDA.** Não consigo provar de fora que a caixa mudou:
`/generate` responde **307 → /studio** para anônimo, e o chunk do
`GenerateClient` só é servido a sessão autenticada — procurei `'commercial_ask'`
nos 24 chunks de `/studio/create` e nos 29 de `/generate`, com controle
(string inexistente → 0 achados, como esperado), e ele não está lá porque a
página não é servida a mim. O que **está** provado é o deploy: build READY em
produção no SHA exato. Não instrumentei evento novo — a prova de comportamento
vem dos instrumentos que já existem, na próxima entrega real (ver abaixo).

**COMO MEDIR (corte pelo SHA, não pelo relógio).** Na próxima entrega de trial
com filme marcado, `trial_post_video_offer_viewed` volta a subir e
`trial_balance_bridge_viewed` cai. O par decisivo:

```sql
select date_trunc('day', e.created_at)::date dia,
  count(distinct e.user_id) filter (where e.name='video_ready_viewed') filme_pronto,
  count(distinct e.user_id) filter (where e.name='trial_post_video_offer_viewed') pergunta,
  count(distinct e.user_id) filter (where e.name='trial_balance_bridge_viewed') bridge,
  count(distinct e.user_id) filter (where e.name='post_delivery_no_offer') silencio
from events e where e.created_at > '2026-09-07 20:50:00+00' group by 1 order by 1 desc;
```

Alvo: `pergunta` saindo de ~1/dia para a casa dos 60-90% de `filme_pronto`,
como era em 17-23/08. O número que paga a conta continua sendo `payment_success`.

**PLACAR DE FECHAMENTO — desde o marco (2026-09-07 18:38 UTC, ~2h25):**
filme pronto **0** · baixou **0** · viu preço **0** · checkout **0** ·
**pagou 0** · cliques no trial de $1 **0** · cartas quentes **0** ·
`trial_balance_bridge_viewed` **1** (19:32 UTC, 1h20 antes do meu deploy — a
última vez que o slot foi para uma superfície grátis).

⚠️ **"0 filmes prontos" NÃO é incidente, e eu conferi antes de escrever.** Na
MESMA janela de relógio (18:38–21:05 UTC) dos últimos 7 dias: 06/09 → 2 ·
05/09 → 2 · 04/09 → 2 · 03/09 → 2 · 02/09 → 6 · 01/09 → 1 · 31/08 → 1. O
normal desta faixa é **1 a 2**; hoje deu 0, abaixo mas dentro do ruído de uma
janela que nunca passou de 6. **201 pessoas ativas em 24h.** É a hora, não o
produto — e o marco tem 2h25, então este placar ainda não prova nem nega nada.

**CHECAGEM ZERO (24h):** render preso **0** · cadastro com crédito zero **12**,
todos com `trial_status` preenchido (antifraude/trial gasto) → **trial órfão 0**
· recusa de cartão sem dono **0**.

**A FRASE DA ROTAÇÃO:** hoje um visitante novo que termina um filme em trial
encontra **a pergunta de compra de volta na tela, vendendo o filme que está na
mão dele, limpo** — ontem ele encontrava mais um convite grátis para gastar
saldo, e a pergunta aparecia para 1 pessoa por dia em 13 a 31 entregas.

**PRÓXIMA JOGADA.** O slot agora pede dinheiro, mas **a caixa ainda abre com o
plano errado**. O botão azul dela é `Start Starter — $7/mês`, e o trial de $1
que o fundador ligou hoje não aparece ali: `pricing_trial_1usd_clicked` existe
no código (`PricingCards.tsx`, `CARD_TRIAL_ENABLED = true` no servidor — não há
segunda fechadura) mas tem **0 linhas no banco**, porque a porta do $1 só mora
em `/pricing` e nos cards do app, superfícies que **154 pessoas** alcançam em
30 dias contra as **428** que terminam um filme. A ordem do fundador de 16:40
é literal: "onde houver preço na tela, a primeira opção passa a ser *Try
Creator 7 days for $1*". Próxima rotação: o $1 como primeira opção **dentro da
caixa que acabou de ganhar o slot** — é a única superfície da casa que combina
o maior denominador com um motivo concreto para pagar agora.

---

### #5c — 18:08–18:35 BRT — CHECKPOINT da rotação #5: o placar não tinha 0 entregas, tinha 1 — e as 3 "checkouts" eram do fundador

**Não é rotação nova.** É o checkpoint `:08` da rotação que abriu às 17:38.
Nenhum código novo; três números da rotação #5 reconferidos e dois corrigidos.

**CORREÇÃO 1 — "filme pronto 0" era `video_ready_viewed` 0, não entrega 0.**
Na janela do marco (18:38–21:09 UTC) **houve uma entrega real**:
`mohansharma859596` (IN, veio do `chatgpt.com`, campanha `push63_niche_fitness`),
cadastro 19:30:17, autostart Seedance 35s, `stranded_composed` **19:46:19**,
render `a157d597`. O filme ficou pronto. O que **não** houve foi ele **na tela**:
a pessoa mandou o render para segundo plano aos 52s (`render_wait_backgrounded`,
19:31:45) e nunca voltou — recebeu `video_ready_email_sent` às 20:00:43 e pronto.
O placar da #5 não estava errado no que mediu; estava incompleto no que nomeou.

**CORREÇÃO 2 — os 3 `checkout_started` da janela são da conta do fundador**
(`e92d81bf` = josephsskaf@gmail.com, plan pro, has_paid). A #5 escreveu
"checkout 0" contando externas e **acertou**; quem reproduzir a consulta sem o
filtro vai ver 3 e achar que apareceu demanda. Não apareceu. Um deles tem
`checkout_origin = 'checkout_cancelled_downshift'` (basic → starter): o
mecanismo de downshift no cancelamento **existe e disparou** — é vizinho direto
do F5 e quem for fazer o F5 deve ler esse caminho antes de criar outro.

**O QUE EU FUI CHECAR E DEU MENOR DO QUE O SUSTO.** A entrega de hoje chegou só
por e-mail, e a #5 acabou de gastar uma rotação ganhando o slot único da **tela**
de filme pronto. Se a entrega por e-mail fosse a regra, o trabalho da #5 nasceria
sem plateia (memória `peca-sem-superficie-nao-existe`). **Medido, 30d, contas
externas, por pessoa-dia com sinal de entrega:** 509 pessoa-dia no total, **473
com a tela** e **36 sem** — só-e-mail **33**, `stranded` sem tela **27**. O
caminho só-e-mail é **7%**. **A premissa da #5 se sustenta: ela cobre ~93% das
entregas.** Fica registrado como vazamento pequeno e separado, não como motivo
para desviar a rotação #6.

**O QUE ISSO FECHA — recusa de cartão NÃO é o vazamento, e agora com número.**
Em **30 dias há 4 `checkout_payment_failed`** contra 107 `checkout_started`.
Os 4 têm `checkout_payment_failure_enriched` e `owner_resolved: true` — o
trabalho da pista de PAGAMENTOS de hoje está funcionando, e a **checagem zero
"recusa sem dono" dá 0**. Também disparou 1 `subscription_access_held_during_dunning`
(hoje, 17:26 UTC). **Nenhuma carta de recusa saiu na história** — e com coorte de
4 em 30 dias, **não vale uma rotação**. Isto **re-confirma com dado fresco a
conclusão fechada do fundador (19/08): o vazamento é PREÇO, não trilho.**

**DUAS PESSOAS QUE O NÚMERO ESCONDE:**
1. `akajitin@gmail.com` — **renovação de Starter recusada hoje** 17:26 UTC
   ($9,90, visa, `is_renewal: true`), já com `plan='free'` e `has_paid=true`.
   É **perda de MRR existente** enquanto a casa caça MRR novo. **Contato
   proibido pela rotina — nenhuma carta foi nem será enviada por mim.** Fica
   para decisão do fundador.
2. `egotisticalfr@gmail.com` — cadastrou-se hoje 05:32 UTC e **3 minutos depois
   tentou comprar o Studio a $23,20** (`amount_minor 2320` = $29 com o welcome
   de 20%), cartão **pré-pago dos EUA recusado**, e **nunca mais voltou** (última
   atividade = a própria recusa). Não recebeu carta: a recusa é de 02:35 BRT e a
   carta automática da pista de pagamentos só existiu a partir das ~14:25. É o
   retrato de que **quem quer pagar, paga caro primeiro** — ele foi direto no
   tier mais alto.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (2h31):** entrega real **1**
· filme pronto na tela **0** · baixou **0** · viu preço **1** (o resto anônimo)
· checkout externo **0** (3 do fundador) · **pagou 0** · cliques no trial de $1
**0** · cartas quentes **0**. **21 pessoas** com evento na janela.

**CHECAGEM ZERO (24h):** render preso **0** · cadastros **32**, com crédito zero
**12**, **todos com `trial_status` preenchido → trial órfão 0** · recusa sem dono
**0** · `payment_success` **0** — **terceiro dia sem assinante novo**, que é
exatamente a queixa do fundador das 16:40.

**A FRASE DA ROTAÇÃO (a da #5 continua valendo, sem correção):** quem termina um
filme em trial com marca d'água encontra a pergunta de compra de volta no slot.
O checkpoint não muda isso — **só prova que ela alcança 93% das entregas, não 100%.**

**PARA A ROTAÇÃO #6, sem mudança de alvo.** A próxima jogada da #5 continua de pé
e continua sendo a certa: **o trial de $1 como primeira opção dentro da caixa que
acabou de ganhar o slot** (`pricing_trial_1usd_clicked` segue com 0 linhas). Três
coisas que este checkpoint entrega prontas para ela: (a) o caminho de downshift
já existe e chama-se `checkout_cancelled_downshift` — reaproveitar, não recriar;
(b) não gastar tempo com recuperação de recusa (coorte 4/30d); (c) ao medir,
filtrar a conta do fundador, senão o checkout do dia aparece inflado em 3.


---

### #6 — 18:38–19:38 BRT — a caixa que pede dinheiro não tinha um clique desde 22/08, e a porta de $1 entra na frente dela

**ERRADO (medido, eventos, contas externas, contando PESSOAS).** A rotação #5
ganhou o slot único da tela de filme pronto para a pergunta comercial. Fui ver
o que essa pergunta oferece quando ganha, e o número é pior do que o da
disputa pelo slot:

| o que | número |
|---|---|
| `trial_post_video_offer_viewed` (60d) | **241 pessoas**, 366 impressões |
| último clique no botão dela | **2026-08-22 17:16 UTC** |
| desde esse clique | **35 pessoas · 37 impressões · 0 cliques** |
| dessas 35, com `has_paid = false` | **34** |
| `pricing_trial_1usd_clicked` (toda a história) | **0** |

Duas leituras que se encaixam. A primeira: o botão pede **assinatura mensal
cheia** ($7 Starter ou $15 Creator) a quem acabou de receber um filme **com
marca d'água** e quer uma coisa só — **este arquivo, limpo**. A segunda: a
oferta certa para essa pessoa **já existe e foi ligada hoje** (`c902516f`,
15:43 — trial pago de 7 dias no Creator por $1), mas a porta dela só mora em
`/pricing` e nos cards do app, superfícies que ninguém cruza depois de fazer um
filme. **34 das 35 seriam aceitas pelo servidor no trial de $1**; nenhuma delas
teve como pedi-lo.

**MUDOU — SHA `c5dd3a04` · EM PRODUÇÃO.** `lib/growth/cleanFilmTrialDoor.ts`
(novo, puro, sem imports) decide a porta; `components/CleanFilmTrialDoor.tsx`
(novo) a pinta; **uma linha de montagem** dentro da caixa comercial. O botão
leva ao **mesmo checkout que `/pricing` já usa** (`tier=basic&billing=monthly&trial=1`)
mais o `&return=wm` que reconstrói **este filme limpo** depois do pagamento.

**O QUE O CLIENTE VÊ.** Quem termina um filme em trial e recebe um arquivo com
marca d'água agora lê, como primeira opção:

> **Get this film clean — 7 days of Creator for $1 →**
> $1.00 today · 80 credits now · then $15.00/month from day 8 · cancel anytime

O **plano continua visível** logo abaixo, com o mesmo texto, o mesmo destino e
no mesmo lugar (ordem do fundador: "nunca esconder o plano"). Ele só perde o
preenchimento azul enquanto a porta está no ar — não é enfeite: dois botões
azuis preenchidos e adjacentes com checkouts de **tier diferente** já custaram
uma venda a esta casa, e o PEDIDOS registra isso.

**AS TRÊS TRAVAS DE HONESTIDADE.** A porta replica o predicado do **cobrador**
em vez de reescrevê-lo (memória `vitrine-oferece-o-que-o-cobrador-recusa`):
1. `hasPaid` → o servidor zera `wantsTrial` (`card_trial_denied: 'has_paid'`) e
   cobraria o Creator cheio. Quem já pagou **não vê** a porta.
2. `TRIAL_TIER` é `basic`: a porta é **sempre Creator**, mesmo quando a escada
   do pós-vídeo elege Starter. É por isso que ela **soma-se** ao botão de plano
   em vez de substituí-lo.
3. A taxa de entrada é **100 unidades menores da moeda resolvida** (`unit_amount`
   + `currency` no `add_invoice_items`), **não** "um dólar convertido". O rótulo
   sai de `formatCheckoutMoney` e a porta **some** sem moeda resolvida — 12% da
   base não está em dólar, e a rotação `va-r3` acabou de tropeçar nisso hoje.

**O RISCO QUE EU FUI CHECAR ANTES DE ESCREVER — e que não se confirmou.**
`/api/compose/unlock` exige `session.payment_status === 'paid'`. Um trial pode
devolver `no_payment_required`, e nesse caso a pessoa pagaria $1 e levaria **402
no filme limpo** — pior do que não ter oferecido nada. A doc da Stripe fecha a
questão: `paid` cobre "subscriptions with a free trial … the $0 trial invoice
has been successfully processed", e `no_payment_required` é `setup` mode ou
billing cycle anchor. Com o item avulso de $1 há fatura imediata. **Não afrouxei
o gate do unlock** — seria alargar uma trava de dinheiro sem defeito medido.

**NENHUM PREÇO, CUPOM OU CRÉDITO NOVO.** Os três números da promessa (taxa,
dias, créditos) passam a viver em `lib/checkoutPricing.ts` ao lado do
`CARD_TRIAL_GRANT_CREDITS` que já estava lá. **Não editei
`app/api/stripe/checkout/route.ts`** — é da pista de pagamentos e está em edição;
em vez disso o guardião **lê** a rota e falha se os literais que ela **cobra**
divergirem dos que a tela **anuncia**.

**TESTES.** `scripts/test-clean-film-trial-door.mjs` **83/83**: 3 mutantes com
prova de que a mutação foi escrita, montagem amarrada às **variáveis** que
decidem (não ao texto), caso em BRL, e o tripwire tela × cobrador. De quebra,
`scripts/test-post-delivery-slot.mjs` voltou de **34/1 para 35/0** — o mutante
de duas linhas dele nunca ancorava num checkout com **CRLF** e acusava um falso
vermelho desde ontem (memória `guardiao-crlf-falso-vermelho`). Falso vermelho é
perigoso: é o que treina alguém a ignorar o guardião. `npx tsc --noEmit` verde
antes de enfileirar.

**RISCO A DECLARAR.** A porta cobra **antes** do primeiro valor percebido, e a
nota de 20/08 que desligou o trial dizia exatamente isso ("num universo de 65
ferramentas do segmento apenas 5% pedem cartão"). A diferença é o **momento**:
aqui a pessoa **já viu o filme** — o valor está entregue e na mão dela. Mas o
número que decide não é meu: é `payment_success` de 100 centavos.

**COMO MEDIR.** `post_video_trial_1usd_shown` (denominador) → `pricing_trial_1usd_clicked`
com `surface='post_video_clean_film'` → `checkout_started` com `card_trial='1'`
→ `payment_success` de 100 centavos. Filtrar `josephsskaf@gmail.com` sempre.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~3h30):** entrega real
**1** · filme pronto na tela **1** · baixou **0** · caixa comercial vista **0**
· checkout externo **0** · **pagou 0** · cliques no $1 **0** · impressões da
porta nova **0** (ela subiu no fim da rotação) · **29 pessoas** com evento.

**CHECAGEM ZERO (24h):** cadastros **31** · crédito zero **12**, todos com
`trial_status` preenchido → **trial órfão 0** · render preso **0** · recusa sem
dono **0** · `payment_success` **0** — **terceiro dia sem assinante novo**.

**A FRASE DA ROTAÇÃO:** hoje um visitante novo que termina um filme em trial
encontra **uma porta de $1 que lhe entrega ESTE filme limpo hoje** — ontem ele
encontrava um pedido de assinatura mensal cheia que ninguém aperta desde 22/08.

**PRÓXIMA JOGADA.** A porta agora existe onde o desejo existe, mas ela alcança
**apenas quem volta à tela**. O checkpoint da #5c mediu que **7% das entregas
chegam só por e-mail** — e há um segundo vazamento, maior, do mesmo tipo: a
caixa comercial só aparece para quem está em **trial**. Quem já esgotou o trial
e volta a fazer um filme cai noutra superfície. A rotação #7 deve medir, por
pessoa-dia, **quantas entregas com marca d'água acontecem fora do estado de
trial** — se o número for grande, a porta de $1 precisa de um segundo endereço,
e o candidato natural é o e-mail de `video_ready` (que já sai, já tem link e
hoje não vende nada).


---

### #6b — 19:08 BRT — CHECKPOINT da #6: a porta de $1 nasceu **atrás** do ramo que ganha o slot 7 vezes em 105

**ESTADO DA ENTREGA (verificado, não herdado).** `c5dd3a04` (18:51:20 BRT) é
ancestral de `origin/main`; ponta = `92d95c41`; **fila = 0**; produção responde
**200** em `/pricing` com **controle 404** na mesma medição (UA de navegador —
`curl` pelado cai no ramo do robô). Nada a corrigir na publicação.

**O QUE O CHECKPOINT MEDIU — e o que ele desmente da própria #6.** Desde o marco
`2026-09-07 18:38 UTC` (3h31), contas externas: `video_ready_viewed` **3
impressões / 2 pessoas** · `video_ready_email_sent` 4/3 · `pricing_view` 3 (todas
anônimas) · **baixou 0 · checkout 0 · pagou 0** · `post_video_trial_1usd_shown`
**0** · `pricing_trial_1usd_clicked` **0**.

Zero impressões da porta nova **não** é o deploy: ela subiu às 21:51 UTC e a
última entrega da janela foi 21:52:43 UTC. O problema é outro, e é maior.

**AS DUAS ENTREGAS DEPOIS DO CONSERTO DA #5 SÃO O CASO EXATO DA PORTA — E
NENHUMA DAS DUAS VIU A CAIXA.** Recortando pelo deploy da #5 (`fa09b1eb`,
17:50 BRT ≈ 21:00 UTC), não pelo relógio:

| pessoa | hora (UTC) | `trial_status` | `has_paid` | plano | créditos | viu a caixa comercial |
|---|---|---|---|---|---|---|
| `18838bd4…` | 21:18:02 | **active** | false | free | 15 | **não** |
| `67fba7a9…` | 21:52:43 | **active** | false | free | 20 | **não** |

**Não é "não rolou a página".** As duas dispararam `next_door_bar_shown`,
`next_shorts_shown`, `post_invite_viewed`, `season_shown` — os observers de
rolagem correram. O que as duas dispararam no slot foi
**`trial_balance_bridge_viewed`**.

**A CAUSA, LIDA NO CÓDIGO DA `origin/main` (não na main local suja).** O slot é
um `IntersectionObserver` só, com três ramos e **`return` em cada um**
(`app/(dashboard)/generate/GenerateClient.tsx`, ~5410-5474):

1. `balanceBridgeForImpression.eligible` → `trial_balance_bridge_viewed` → **sai**
2. `repeatForImpression.action === 'episode'` → `trial_repeat_episode_viewed` → **sai**
3. só então → `trial_post_video_offer_viewed` — **a caixa comercial, onde a #6
   montou a porta de $1**

**O PLACAR DA DISPUTA (7 dias, contas externas, pessoa-dia):**

| quem ganha o slot | pessoa-dia |
|---|---|
| ponte de saldo | **78** |
| repetir episódio | **20** |
| **caixa comercial (onde mora a porta de $1)** | **7** |
| nenhuma das três | 56 |
| **total de entregas** | **143** |

Dos **105 slots disputados**, a pergunta comercial leva **7 — 6,7%**. A porta de
$1 da #6 **herda esse 6,7%**, não os 100% que a frase da #6 sugere.

**RETRATAÇÃO PARCIAL DA #6.** "A porta agora existe onde o desejo existe" é
verdade **para 6,7% das entregas**. A frase da rotação não muda de conteúdo —
muda de alcance, e o alcance é o que decide se ela vira dinheiro.

**O QUE ISSO RESPONDE DA QUEIXA DO FUNDADOR.** "Está gerando gente que faz vídeo
e as pessoas não fecham." No minuto de maior valor percebido da casa — filme
pronto, com marca d'água, na mão da pessoa — a casa gasta seu **único** tiro
propondo **gastar os créditos que a pessoa já tem em OUTRO filme**. Em 78 de 105
vezes a resposta da casa ao filme pronto é *consuma mais de graça*, não *leve
este limpo*.

**CHECAGEM ZERO (24h):** cadastros **30** · crédito zero **12**, **trial órfão
0** (todos com `trial_status` preenchido) · render preso **0** · recusa sem dono
**0** · `payment_success` **0 em 48h** (6 em 30d) — **terceiro dia sem assinante
novo**, confirmado.

**PARA A ROTAÇÃO #7 — o alvo muda, e fica mais barato.** Não mexer na precedência
primeiro: o caminho de menor risco e maior alcance é **montar a porta de $1
dentro do bloco da ponte**, que já imprime `plans_link` e já tem o slot em 78 de
105 entregas. Isso não tira o slot de ninguém, não reescreve a cadeia de
`return`, e multiplica o alcance da porta por ~11. Só depois, se a ponte com
porta não converter, discutir precedência para quem recebeu filme **com marca
d'água**. Duas ressalvas medidas para quem pegar: (a) os 56 "nenhuma das três"
ainda não têm dono — não é a maior alavanca, mas é o segundo buraco; (b) medir a
porta nova pelo par `trial_balance_bridge_viewed` (denominador que dispara
IGUAL, por rolagem) e nunca por `video_ready_viewed`, que dispara na montagem.

**✅ O QUE VOCÊ PRECISA FAZER**
1. Nada. Publicação verificada (fila 0, produção 200 com controle 404) e
   checagem zero limpa.

**📋 O QUE ACONTECEU**
A porta de $1 da rotação anterior subiu e está em produção — mas o checkpoint
descobriu que ela mora no ramo errado. A tela de filme pronto tem **um** espaço,
e em 7 dias esse espaço foi para "faça outro filme com os créditos que você já
tem" **78 vezes**, para "repita o episódio" 20, e para a pergunta comercial
apenas **7**. As duas únicas pessoas que terminaram um filme depois do conserto
das 17:50 eram trial ativo, não pagante, com saldo — o alvo exato — e as duas
receberam a proposta de gastar mais crédito, não a de comprar o filme limpo. A
correção é barata e é a próxima rotação: pôr a porta de $1 dentro do bloco que
já ganha o slot. Terceiro dia sem assinante novo continua de pé.


---

### #7 — aberta 19:25 BRT (adiantada) — o evento do slot passou a mentir às 17:50 de hoje, e fui eu que quebrei

> **NOTA DE RELÓGIO.** Esta rotação abriu **13 min antes** do :38. Motivo: o
> checkpoint das 19:08 descobriu um defeito que **eu** introduzi às 17:50 e que
> estava corrompendo a medição em tempo real — segurar o conserto por 13 minutos
> só produziria mais linhas com o nome errado. O ciclo segue no relógio: a #8
> abre às 20:38.

**PRIMEIRO, A RETRATAÇÃO — o checkpoint #6b está ERRADO no que tem de mais
importante.** Eu escrevi lá, às 19:08, que "a porta de $1 nasceu atrás do ramo
que ganha 7 dos 105 slots" e que as duas pessoas de hoje não viram a caixa
comercial. **As duas provavelmente VIRAM.** O que eu li como "a ponte ganhou o
slot" era o **nome do evento**, não a superfície na tela. A conclusão de que a
porta precisa mudar de endereço **cai inteira**; a tabela de 7 dias (ponte 78 /
episódio 20 / pergunta 7) continua **válida para o mundo de antes das 17:50 BRT**
— e só para ele.

**O DEFEITO DE VERDADE, e ele é meu.** A rotação #5 (`fa09b1eb`, 17:50 BRT) fez o
**JSX** escolher a superfície do slot por `decidePostDeliverySlot` — filme com
marca d'água na mão faz a pergunta comercial ganhar. O **efeito da impressão**
(`GenerateClient.tsx`, ~5410) continuou escolhendo o **nome do evento** pela
precedência **antiga**: ponte → episódio → pergunta. Os dois nunca se
consultaram — o `const` do dono do slot mora ~6.000 linhas abaixo do efeito, e
lê-lo de lá é ReferenceError de TDZ em runtime, invisível ao `tsc`. As duas
leituras divergem exatamente no caso que a #5 criou: **ponte elegível + filme
marcado → a tela mostra a PERGUNTA e o evento diz `trial_balance_bridge_viewed`.**

**O TAMANHO, medido.** Desde o deploy da #5 (20:56 UTC) até agora, as impressões
do slot são:

| evento | impressões | pessoas |
|---|---|---|
| `trial_balance_bridge_viewed` | **4** | 2 |
| `trial_post_video_offer_viewed` | 0 | 0 |
| `trial_repeat_episode_viewed` | 0 | 0 |

As duas pessoas renderizaram em `fast`, com `trial_status = active`, `has_paid =
false`. Por `app/api/compose/route.ts` (`watermarkApplied = isFreePlanFast ||
isTrialRender || …`) o filme delas saiu **marcado** — logo o JSX renderizou a
**pergunta comercial**. **As 4 impressões, 4 de 4, carregam o nome errado.**
⚠️ O que é prova e o que é inferência: a divergência das duas leituras é **prova
de código** (guardião abaixo, 6 mutantes); que estas 4 linhas específicas sejam
da pergunta é **inferência** a partir do predicado do compose — não existe hoje
nenhuma linha no banco que grave o watermark do asset (`videos` não tem coluna,
`events` não tem a chave; conferido).

**POR QUE ISSO PASSA NA FRENTE DE VENDER MAIS.** Não é higiene de telemetria: é
que **as três séries do slot ficaram ilegíveis exatamente quando a casa começou a
mexer nelas**. A #5 e a #6 se justificam por essas séries, e a pergunta que o
fundador vai fazer amanhã — "a porta de $1 está sendo vista?" — se responde com
`trial_post_video_offer_viewed` ao lado de `post_video_trial_1usd_shown`. Com o
nome errado, a resposta seria "a pergunta comercial não apareceu nenhuma vez",
que é falso, e a jogada seguinte nasceria de um número inventado. Duas horas de
cegueira ainda são baratas; um dia inteiro decidindo sobre elas não é.

**MUDOU — SHA `2e546f39` · EM PRODUÇÃO.** Um ref (`postDeliverySlotOwnerRef`)
carrega a decisão do JSX até o efeito da impressão, e o nome do evento passa a
sair dela. Três detalhes que não são enfeite:
1. A escrita do ref é **no render**, colada no `const`. Um `useEffect` de
   sincronia rodaria **depois** do efeito que registra o `IntersectionObserver`,
   e a callback poderia disparar com o ref vazio — o guardião proíbe a versão
   com `useEffect`.
2. A **chave de deduplicação** passou a usar a mesma decisão. Divergir ali faria
   a impressão ser contada sob a variante da superfície errada — o mesmo defeito
   um degrau abaixo.
3. Os três eventos ganharam `slot_owner`, **carimbo do deploy**: separa as linhas
   com nome conferido das antigas sem recortar por relógio (memória
   `campo-novo-e-o-carimbo-do-deploy`).

**Nenhum pixel mudou.** Nenhuma superfície ganhou ou perdeu o slot; nenhuma
oferta, preço ou copy foi tocada. Quando o ref está vazio o comportamento antigo
é preservado tal e qual — este conserto **não pode perder impressão**.

**O QUE O CLIENTE VÊ.** Nada. É a primeira entrega do ciclo que não muda a tela —
e é por isso que ela precisa de uma justificativa explícita, acima.

**TESTES.** `scripts/test-slot-impression-truth.mjs` **24/24**, 6 mutantes, cada
um **provando que a mutação foi escrita** antes de exigir vermelho (memória
`mutacao-precisa-provar-que-aplicou`); leitura com CRLF normalizado. Inclui o
mutante que crava `impressionIsBridge = true` mantendo o texto intacto — texto
não prova condição. Irmãos: `test-post-delivery-slot.mjs` **35/35** (ajustei
**uma** linha: o import da tela agora traz o `type` junto, e a checagem passou a
exigir a **função** em vez de exigi-la sozinha entre as chaves — não afrouxei
nenhuma trava de precedência) e `test-clean-film-trial-door.mjs` **83/83**.
`npx tsc --noEmit` verde.

**RISCO A DECLARAR.** A escrita de ref durante o render é desaconselhada pelo
React; aqui ela espelha um valor derivado, não cria estado, e a alternativa
idiomática é justamente a que tem a corrida. Se algum dia este componente for
para modo concorrente, esta linha é a primeira a revisitar.

**COMO MEDIR.** A partir de agora: `trial_post_video_offer_viewed` **com**
`slot_owner = 'commercial_ask'` é o denominador honesto da caixa que vende, e
`post_video_trial_1usd_shown` deve caminhar **junto** com ele (a porta monta
dentro da caixa). Se os dois divergirem, o defeito é da porta, não do nome.
Linhas sem `slot_owner` são de antes deste deploy e **não se misturam** com as
novas.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~4h):** entrega real **1** ·
filme pronto na tela **3 impressões / 2 pessoas** · baixou **0** · caixa
comercial (nome conferido) **0 — a série começa agora** · checkout externo **0**
(3 do fundador) · **pagou 0** · cliques no $1 **0** · **29 pessoas** com evento.

**CHECAGEM ZERO (24h):** cadastros **30** · crédito zero **12**, **trial órfão
0** · render preso **0** · recusa sem dono **0** · `payment_success` **0 em 48h**
(6 em 30d) — terceiro dia sem assinante novo.

**A FRASE DA ROTAÇÃO.** Hoje um visitante novo que termina um filme em trial
encontra a mesma tela de uma hora atrás — mas a casa, pela primeira vez desde as
17:50, **sabe qual caixa ele viu**. Sem isso a rotação seguinte escolheria onde
mexer com um número que ela mesma inventou.

**PRÓXIMA JOGADA.** Com a série honesta, a #8 tem uma pergunta respondível em 10
minutos e uma jogada barata atrás dela: comparar, por pessoa, `slot_owner =
'commercial_ask'` com `post_video_trial_1usd_shown`. Se os dois baterem, a porta
de $1 está sendo vista e o que falta é o **clique** — e aí o alvo é a copy do
botão, não o endereço dela. Se a porta ficar **abaixo** da caixa, existe um
terceiro portão comendo a porta dentro da própria caixa (candidato: a trava de
moeda não resolvida, `price_unresolved`, que o próprio evento já carrega em
`reason`) — e esse é um conserto de minutos com efeito em toda a base fora do
dólar.

**✅ O QUE VOCÊ PRECISA FAZER**
1. Nada.

**📋 O QUE ACONTECEU**
Corrigi um erro meu de uma hora atrás. Às 17:50 eu fiz a tela de filme pronto
mostrar a caixa que vende quando o filme sai com marca d'água — mas esqueci de
avisar o **medidor**, que continuou anotando o nome da caixa antiga. Resultado:
as 4 impressões que a casa registrou desde então têm o nome errado, e qualquer
decisão tomada em cima delas seria tomada às cegas. Esta entrega não muda nada
na tela: faz o medidor perguntar à mesma fonte que desenha a tela, marca as
linhas novas com um carimbo para não se misturarem às velhas, e trava isso com
24 verificações e 6 mutantes. Amanhã dá para responder com número, e não com
palpite, se a porta de $1 está sendo vista. Terceiro dia sem assinante novo
continua de pé.

---

### #8 — 19:52 BRT — a ordem da marca d'água alcançou 13 pessoas e deixou 72 de fora

**ANTES DE TUDO, UMA PREMISSA MINHA QUE CAIU.** O cardápio manda no F1 que "o
download não pede nada": 225 pessoas baixam o filme por mês e vão embora. Fui
construir isso e **medi primeiro**. Em 30 dias, contas externas: **223 pessoas
clicaram em baixar, e 175 delas viram alguma oferta** — **127** viram
especificamente a caixa que pede dinheiro (`trial_post_video_offer_viewed`),
**49** abriram checkout, **5** pagaram. Só **44** não-pagantes não viram
oferta nenhuma. **A superfície não está faltando.** Não construí o F1; teria
sido a sétima superfície empilhada num lugar que já tem seis (memória
`medir-os-remedios-existentes-antes-do-setimo`).

**O QUE ESTAVA ERRADO, ENTÃO.** Cruzei `video_downloaded` com
`videos.quality_mode` pelo `metadata.video_id` — 486 downloads em 30 dias,
**486 casaram** com a linha do vídeo. A tabela:

| export_type | plan | has_paid | trial_status | quality_mode | filmes | pessoas |
|---|---|---|---|---|---|---|
| clean | free | false | **downgraded** | cinematic_ai | **143** | **72** |
| clean | free | false | active | cinematic_ai | 23 | 13 |
| watermarked | free | false | active | fast | 31 | 22 |

A ordem do fundador das 17:35 ("liga marca d'água no trial") foi cumprida na
linha **do meio** — 13 pessoas. A linha **de cima** é **5,5x maior** e ficou
inteira de fora. É gente que já terminou o trial, **nunca pagou**, e leva o
Seedance **limpo**.

**A CAUSA É ARITMÉTICA, NÃO DECISÃO.** Em `app/api/compose/route.ts`,
`watermarkApplied = isFreePlanFast || isTrialRender || FORCE`. `isFreePlanFast`
só é atribuído no ramo `fast`; `isTrialRender` exige `ent.isTrial`, que vira
**falso** no minuto em que o trial vence. Para quem usou o produto inteiro e não
pagou, a expressão nascia `false || false || false`. Conta grátis
historicamente não alcançava o Seedance — o caminho do reverse trial abriu a
porta e a regra ficou para trás.

**E É ISTO QUE RESPONDE À PERGUNTA DO FUNDADOR** ("está gerando gente que faz
vídeo, mas as pessoas não têm fechado"). **127 dessas pessoas viram a caixa que
pede dinheiro.** A oferta chegou. O que ela vende — o filme sem marca — a
pessoa **já tinha no telefone**. Não é copy, não é endereço, não é (só) preço:
o benefício pago estava sendo entregue de graça a exatamente quem estava sendo
convidado a pagar.

**MUDOU — SHA `651f28f4` · EM PRODUÇÃO** (`dpl_8tgTbRZjarmKku8r7TLV6Vc5pU9X`,
sonda `/api/compose` 401 e `/api/compose/unlock` 401 contra controle
`/api/compose/rota-inexistente-fv-r8` 404). Um termo novo, lido **num lugar só**:

    isFreePlanCinematic = isFreePlan && !hasPaid && !ent.isPaidAccount

`!ent.isPaidAccount` sai do **mesmo `getEffectiveEntitlement`** que decide
crédito e acesso nesta rota — não é predicado redigitado (memória
`predicado-do-cobrador-nao-se-redigita`), e é ele que protege o comprador do
trial de $1 (`plan basic` + assinatura `trialing`) de receber marca no filme
que acabou de pagar.

**NÃO É PREÇO NOVO NEM OFERTA NOVA.** `lib/freeTierOffer.ts` já promete ao
cliente, hoje, *"Films come out watermarked; a plan removes the watermark"*. O
ramo `fast` cumpre isso desde sempre. Este nunca cumpriu. **A frase que a casa
já diz passou a ser verdade** — e nenhum preço público foi tocado.

**O PAR OBRIGATÓRIO JÁ ESTAVA EM PRODUÇÃO.** Marcar sem saber desmarcar seria
vender um export limpo que a casa não entrega — o pecado que o PEDIDOS registra
para os motores premium. Aqui **não há caso novo**: `REBUILD_QUALITIES` do
`/api/compose/unlock` aceita `cinematic_ai` desde `9f2822b0` (hoje, 17:00), com
o **mesmo builder e a mesma quality**. Pus mais gente num caminho construído e
testado há três horas.

**O QUE O CLIENTE VÊ.** Uma conta grátis que nunca pagou e renderiza Seedance
recebe o filme **com marca d'água** — e, por consequência, a caixa "Want it
clean?" (`showPostVideoExportChoice`, que exige `currentResultHasWatermark`)
**passa a ser elegível para ela**, com o trial de $1 e o Starter dentro.
Antes essa caixa era logicamente impossível para essa pessoa: o filme era
limpo, não havia o que vender. **Alcance medido: 236 pessoas em 30 dias, ~8 por
dia**, contas grátis não-pagantes que renderizam `cinematic_ai`.

**TESTES.** `scripts/test-free-clean-leak.mjs` **42/42**, com **6 mutantes** —
cada um relê o arquivo depois de escrever e só então exige vermelho (memória
`mutacao-precisa-provar-que-aplicou`); leitura com CRLF normalizado. Os mutantes
cobrem: apagar o termo, cravá-lo em `false` mantendo o comentário intacto,
trocar `&&` por `||`, esquecer o comprador do trial de $1, pendurar o end card
no termo novo, e **tirar o `cinematic_ai` do rebuild** (marcar sem saber
desmarcar). O guardião **conta os usos** do termo: 3 em código, e falha se
alguém o pendurar num gate de dinheiro. Irmãos verdes: `test-trial-watermark`
**50/50** (a assinatura do evaluator ganhou o 4º termo; os 4 casos originais
continuam lá, nenhuma trava afrouxada), `test-post-delivery-slot` **35/35**,
`test-slot-impression-truth` **24/24**, `test-clean-film-trial-door` **83/83**.
`npx tsc --noEmit` verde na base e depois da edição.

**RISCO A DECLARAR, e ele é real.** O filme grátis de Seedance **deixa de ser
postável limpo**. É a mesma decisão que o fundador tomou às 17:35 para o trial,
aplicada à coorte 5x maior — mas ele decidiu sobre 13 pessoas e agora vale para
~8 por dia. Se ele quiser reverter, é **uma linha**: apagar
`isFreePlanCinematic ||` de `watermarkApplied`, e o guardião aponta exatamente
onde. Segundo risco, menor: `unlock` remonta `cinematic_ai` pelo builder
clássico; isso foi construído e testado hoje, mas **ainda não foi exercitado
por um cliente real** — o primeiro "Download clean" de um Seedance é o que
prova. Premium (Kling 3 / Veo / H3 / Omni / S25) continua **limpo de propósito**
e fora do rebuild; o guardião prova que continua fora.

**COMO MEDIR — a série honesta.** Nada de recorte por relógio: a coorte é
`quality_mode='cinematic_ai'` + `plan='free'` + `has_paid=false`, e o número que
tem de virar é `video_downloaded.export_type`, hoje **`clean` 143 / 72 pessoas
em 30d**. Ele deve cair para perto de zero e reaparecer como `watermarked`.
Atrás dele, nesta ordem: `post_video_offer_viewed` (a caixa que agora é
elegível para essa gente — base de 19 pessoas/30d), `checkout_started` com
origem `generate_watermark_unlock`, e `payment_success`. **O que NÃO conta como
prova:** o total de downloads cair — isso seria a pessoa desistindo, não
comprando.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~4h20):** filme pronto na
tela **3 impressões / 2 pessoas** · baixou **0** · caixa comercial **0** · porta
de $1 vista **0** · cliques no $1 **0** · checkout externo **0** · **pagou 0** ·
33 pessoas com evento.

**CHECAGEM ZERO (24h):** cadastros **27** · crédito zero **12**, **trial órfão
0** · render preso **0** · recusas **2**, **sem dono 0** · `payment_success`
**0 em 72h** — terceiro dia sem assinante novo.

**A FRASE DA ROTAÇÃO.** Hoje um visitante novo que abre conta, gasta os créditos
de boas-vindas num Seedance e baixa o filme encontra **uma marca d'água que
ontem não encontrava** — e, pela primeira vez, uma caixa que tem algo de
verdade para lhe vender.

**PRÓXIMA JOGADA.** A coorte que esta entrega cria já existe e é grande: **72
pessoas em 30 dias que baixaram um Seedance limpo e nunca pagaram**. Elas têm
e-mail, têm um filme entregue e têm tema conhecido. A jogada não é uma carta de
desconto — é a carta que a memória `credito-nao-e-isca` manda: *"o teu filme
sobre X está aqui, sem marca d'água, por 7 dias por $1"*, com o link direto do
unlock daquele render. Antes de escrever uma linha dela: rodar a Q de
supressão e conferir quantas dessas 72 já receberam carta nas últimas 24h —
duas das cartas caras do dia deram zero cliques contra duas da genérica
(memória `carta-nova-so-depois-da-velha-mover`), então esta só se justifica se
**nomear o filme da pessoa**.

**✅ O QUE VOCÊ PRECISA FAZER**
1. **Decidir se você aceita o risco desta entrega**: a partir de agora o filme
   grátis de **Seedance** sai com marca d'água (antes só o Kineo 1 saía). É a
   sua ordem das 17:35 estendida de 13 para ~8 pessoas por dia. Se quiser
   reverter, me diga "tira a marca do Seedance grátis" — é uma linha.
2. Nada mais. Não precisa clicar em publicar: já publiquei (`651f28f4`).

**📋 O QUE ACONTECEU**
Eu ia construir a oferta no botão de download, medi antes e descobri que a
premissa estava errada: 127 das 223 pessoas que baixam já viam a caixa que pede
dinheiro. O problema não era a oferta faltar — era ela não ter o que oferecer.
Cruzando os downloads com o motor de cada filme, achei que **72 pessoas em 30
dias, com o trial já encerrado e sem nunca ter pago, levavam o Seedance
limpo** — exatamente o que a assinatura vende, e 5,5 vezes mais gente do que a
sua ordem das 17:35 alcançou. A causa era um termo que faltava numa expressão,
não uma decisão de produto: a página de planos já promete ao cliente que o filme
grátis sai com marca. Publiquei o termo que faltava, com 42 verificações e 6
mutantes, sem tocar em preço, crédito, régua, motor ou duração. Terceiro dia sem
assinante novo continua de pé — mas pela primeira vez a caixa que pede dinheiro
tem uma coisa concreta para vender a quem já usou o produto inteiro.

---

### #8b — 20:14 BRT — CHECKPOINT da #8: a entrega ainda não foi exercitada, o jejum é de **5 dias** (não 3), e eu quase publiquei um "1 IP" que não existe

**NADA DE CÓDIGO NESTE CHECKPOINT** — é medição da rotação #8 e correção de dois
números, um deles meu, publicado há 22 minutos.

**1. A ENTREGA `651f28f4` AINDA NÃO FOI EXERCITADA — e isso é esperado, não é
falha.** O deploy fechou às 22:52 UTC. Desde então, **nenhum render
`cinematic_ai` de conta grátis não-pagante** passou pelo compose. Os 5 renders
externos das últimas 6h: **4 `fast`** + **1 `cinematic_ai`** (20:00 UTC, trial
**ativo**, ou seja *antes* do deploy e já coberto pela ordem das 17:35). Os 2
downloads das últimas 10h: um `watermarked` (fast, trial ativo, 18:00 UTC) e um
**`clean` / `cinematic_ai` / `plan=free` / `has_paid=false` /
`trial_status=downgraded`** às **16:02 UTC** — a coorte exata que a #8 fecha,
seis horas antes do conserto existir. **O teste é este:** se um download com
essa assinatura aparecer com `export_type='clean'` **depois de 22:52 UTC**, a
entrega falhou. Até agora, zero oportunidades — e **zero oportunidades não é
zero acertos** (memória `provar-leitura-sem-trafego`).

**2. CORREÇÃO DE UM NÚMERO QUE EU PUBLIQUEI NA #8.** Escrevi "`payment_success`
**0 em 72h** — terceiro dia sem assinante novo". **Está errado, e para menos.**
O último `payment_success` da casa é de **02/09 20:22 UTC**: são **5 dias e 3
horas** de jejum, não 3 dias. **Controle rodado antes de afirmar** (memória
`zero-por-chave-inexistente`): varri **7 dias** de todos os eventos cujo nome
casa `%payment%`, `%subscri%`, `%checkout%` ou `%pack%` — são **50 nomes
distintos vivos**, e `payment_success` aparece **1 vez**, em 02/09. Não é
cegueira de nome de evento; é jejum mesmo. ⚠️ Isto **não** diz que a receita
caiu a zero (renovação de assinante antigo não emite esse evento) — diz que
**nenhuma venda nova entrou desde 02/09**.

**3. O PLACAR POR `checkout_started` É CEGO PARA TENTATIVA SEM DONO — e a
leitura ingênua disso é uma armadilha.** Na janela do marco o placar oficial
deu `checkout_started` **0 externo**. Mas houve **3 `checkout_attempted`
anônimos** (18:44, 20:24, 22:35 UTC), **todos `tier=basic`** — a porta de $1 —
e **todos mortos em `checkout_auth_required`**, sem nunca virar sessão. Parece
o achado do ciclo: gente deslogada clicando em comprar e batendo num login.
**Não é — ou pelo menos a casa não sabe dizer que é.** O de 18:44 tem um
`checkout_bot_suspected` colado no mesmo minuto com `ua: curl/8.21.0`: **sonda
nossa** (memória `sonda-com-curl-pelado-e-lida-como-robo`). São **66 em 30
dias, ~2/dia**, e **6 dos 11 de hoje são SKU avulso** (`bulk10`, `bulk30`,
`starter10`) — cheiro de sonda da pista de pagamentos, não de cliente.

**4. E O ERRO QUE EU IA COMETER, registrado porque é barato e se repete.** Para
separar sonda de gente eu contei `count(distinct coalesce(metadata->>'ip_hash',
metadata->>'ip',''))` nessas 66 linhas e recebi **`1`**. Ia publicar "todas as
tentativas anônimas vêm de um único IP, logo é sonda". **O campo não existe
nesse evento**: o `coalesce` devolveu `''` para as 66 e o `count(distinct)`
colapsou num único valor vazio (memória `medir-alcance-da-superficie-antes-de-
ligar`). Um `1` que parece prova e é aritmética de campo ausente. **A verdade
honesta é "não sei"**, e ela tem conserto barato — ver o pedido abaixo.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~4h35), contas externas:**
filme pronto **3 impressões / 2 pessoas** · clique em baixar **0** · download
**0** · caixa comercial **0** · porta de $1 vista **0** · cliques no $1 **0** ·
`checkout_started` externo **0** (+ **3 tentativas anônimas**, natureza
desconhecida) · **pagou 0** · **36 pessoas** com evento, 281 eventos. A janela
é de tráfego magro: **2 pessoas** viram um filme pronto em ~4h35.

**CHECAGEM ZERO (24h):** cadastros **26** · crédito zero **11**, **trial órfão
0** · trial ativo com 0cr **0** · render preso **0** · recusas de cartão **2**,
**sem dono 0** · último `payment_success` **02/09 20:22 UTC**.

**A FRASE DA ROTAÇÃO #8 continua de pé** (é dela, não deste checkpoint): hoje um
visitante novo que gasta os créditos de boas-vindas num Seedance e baixa o filme
encontra uma marca d'água que ontem não encontrava. O checkpoint só acrescenta
que **ninguém passou por essa porta ainda**.

**PRÓXIMA JOGADA (para a #9, e ela é de 20 minutos).** Antes de qualquer
superfície nova: **carimbar quem bate na porta do checkout sem estar logado.**
`app/api/stripe/checkout/route.ts` já lê o UA — ele o grava em
`checkout_bot_suspected`. Basta gravar `ua` + `ip_hash` também no
`checkout_attempted`/`checkout_auth_required` **quando `user_id` é nulo**. Sem
isso, toda rotação futura vai reencontrar essas ~2/dia e ficar entre "é robô" e
"é cliente perdido" sem poder decidir — e uma delas pode ser gente querendo
pagar $1. ⚠️ **É arquivo da pista de PAGAMENTOS**: vai como pedido, não como
edição minha.

**✅ O QUE VOCÊ PRECISA FAZER**
1. **Nada.** Nenhuma decisão sua está travando este checkpoint.
2. (Opcional, se discordar) A #8 pôs marca d'água no Seedance grátis. Se quiser
   reverter, me diga "tira a marca do Seedance grátis" — é uma linha.

**📋 O QUE ACONTECEU**
Checkpoint de medição, sem código. A marca d'água que publiquei às 19:52 ainda
não encontrou um único cliente — a janela teve tráfego magro (2 pessoas viram um
filme pronto em 4h40), então não há o que comemorar nem do que suspeitar ainda;
deixei escrito qual download exato prova que funcionou. Corrigi um número meu:
o jejum de assinante novo é de **5 dias**, não 3 — o último pagamento é de 02/09,
e rodei o controle de 50 nomes de evento para garantir que não era cegueira de
nome. E encontrei 3 tentativas de compra sem dono na janela, todas na porta de
$1, todas paradas num login: **não sei se são pessoas ou sondas nossas**, porque
o evento não guarda nem navegador nem IP — e registrei que quase publiquei uma
prova falsa de que eram sondas. Consertar essa cegueira é o primeiro item da
próxima rotação.


---

### #9 — 20:38–21:38 BRT — a caixa que a #8 acabou de encher só vendia mês cheio

> **DUAS SESSÕES NA MESMA PISTA.** As rotações #8 e #8b são de **outra sessão**
> da pista Fechar a Venda, que roda em paralelo comigo. Li tudo antes de tocar
> em qualquer coisa e **não refiz nada**: a próxima jogada que ela deixou para a
> #9 (carimbar `ua`/`ip_hash` em `checkout_attempted`, dentro de
> `app/api/stripe/checkout/route.ts`) **fica com ela** — não encostei nesse
> arquivo. Esta rotação pega o buraco que a #8 **abriu** e não reivindicou.

**O QUE ESTAVA ERRADO (medido, código + eventos).** A ordem do fundador das
16:40 lista, com todas as letras, onde o trial pago de $1 passa a ser a primeira
opção: *"caixa de export limpo, NextAction, faixa da temporada, carta da parede,
carta de sessão expirada"*. Fui conferir uma por uma. A **caixa de export limpo**
— o card "Want it clean?" — era a única das nomeadas que ainda oferecia
**só** duas coisas: assinatura Starter mensal cheia e o avulso. Nenhuma porta de
$1, nos dois caminhos dela (o direto, depois do download grátis, e o modal, antes
dele).

**E ELA ACABOU DE FICAR GRANDE.** Este card só é elegível para quem tem um filme
**com marca d'água** e **não está em trial** (`showPostVideoExportChoice` exige
`trialPostVideoPhase === null` — o oposto exato da caixa comercial do slot). Até
hoje isso quase não existia: conta grátis não-pagante levava o Seedance **limpo**,
então não havia o que vender. A rotação **#8** (`651f28f4`, 19:48, da outra
sessão) fechou esse vazamento — e, sem querer, **criou a plateia desta caixa**.

| medida | número |
|---|---|
| `post_video_offer_viewed` (impressão do card, 30d, contas externas) | **31 impressões / 26 pessoas** |
| últimas 7d | **2 pessoas** · última impressão **04/09** |
| plateia que a #8 torna elegível (número dela, 30d) | **~236 pessoas, ~8/dia** |

⚠️ **O 236 é projeção, não medição minha** — é o alcance que a #8 declarou e que
o checkpoint #8b registrou como **ainda não exercitado** (zero renders da coorte
desde o deploy). Estou apostando na plateia que ela criou, e digo isso com todas
as letras em vez de somar os dois números como se fossem um só.

**MUDOU — SHA `c369bc26` · EM PRODUÇÃO.** A porta é a **mesma** da #6 —
`lib/growth/cleanFilmTrialDoor.ts` e `components/CleanFilmTrialDoor.tsx`, sem
componente novo, sem oferta nova, sem preço novo. Só o hospedeiro mudou: a trava
de superfície virou **lista fechada** (`HOST_BOXES = ['commercial_ask',
'clean_export']`). As três travas de honestidade continuam intactas e agora são
verificadas nas **duas** caixas: quem já pagou não vê a porta (o cobrador
recusaria o `?trial=1`), o tier é sempre Creator, e sem moeda resolvida a porta
**some** em vez de chutar um dólar.

**UMA TRAVA NOVA, que a caixa vizinha não tem.** `unlocksCurrentFilm` passou a
ser `Boolean(lastFastRenderRef.current)`: **sem o handoff do render na mão, a
porta deixa de prometer "este filme limpo"** e cai no rótulo neutro do trial. O
botão de Starter ao lado tem a mesma exposição e não a declara — **não apertei a
regra dele** (é de outra pista e está em edição hoje), mas não repeti o buraco na
peça nova.

**O QUE O CLIENTE VÊ.** Quem tem um filme com marca d'água e não está em trial —
a coorte que a #8 acabou de criar — lê, como **primeira** opção da caixa:

> **Get this film clean — 7 days of Creator for $1 →**
> $1.00 today · 80 credits now · then $15.00/month from day 8 · cancel anytime

**Os dois botões que já estavam ali continuam ali**, no mesmo lugar e com o mesmo
texto: o plano Starter e o avulso. A linha *"Free export stays available"*
também. **Nada foi escondido** — o guardião falha se algum deles sumir ou se a
porta passar para depois do botão de plano.

**OS DOIS CAMINHOS DA CAIXA FICAM SEPARÁVEIS.** A porta entra no caminho direto
(depois do download grátis) **e** no modal (antes dele, aberto só por intenção —
ninguém que só queria o arquivo grátis tromba nela). Impressão e clique carregam
`host: direct_after_download | modal_before_download`: juntos, os dois caminhos
virariam a média de dois momentos que não se parecem, e é a mesma separação que o
`checkout_path` desta caixa já faz.

**TESTES.** `scripts/test-clean-export-trial-door.mjs` **47/47** — compila e
avalia o módulo real, 4 mutantes com prova de escrita, caso em BRL, e o tripwire
tela × cobrador. `test-clean-film-trial-door.mjs` voltou a **83/83**: ele pegou
**duas** coisas minhas e as duas eram reais — o mutante do dono do slot ficou sem
âncora (corrigi a âncora, não afrouxei a trava) e eu tinha escrito o preço
literal dentro de um comentário, o que a trava "nenhum preço digitado à mão"
acusa com razão. Irmãos verdes: `test-post-delivery-slot` **35/35**,
`test-slot-impression-truth` **24/24**, `test-free-clean-leak` **42/42**,
`test-trial-watermark` **50/50**. `npx tsc --noEmit` verde. Conferi também, uma a
uma, que **todas** as variáveis que o bloco novo lê no render são declaradas
antes dele — TDZ neste arquivo é invisível ao `tsc` e já derrubou tela aqui.

**RISCO A DECLARAR.** A porta cobra $1 de quem **já terminou o trial e não
pagou** — gente que a casa já não convenceu uma vez. É plausível que o preço não
seja o obstáculo dela, e sim o produto. Mas o que essa pessoa vê hoje é um
compromisso **mensal** para levar um arquivo **que ela quer agora**, e o número
que decide não é meu: `payment_success` de 100 centavos com
`surface = post_video_clean_export`.

**COMO MEDIR.** `post_video_trial_1usd_shown` com `host` → `pricing_trial_1usd_clicked`
com `surface='post_video_clean_export'` → `checkout_started` com `card_trial='1'`
→ `payment_success` de 100 centavos. O denominador honesto é
`post_video_offer_viewed` (a impressão do card), **não** `video_ready_viewed`.
Filtrar `josephsskaf@gmail.com` sempre.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~5h):** entrega real **1** ·
filme pronto na tela **3 impressões / 2 pessoas** · baixou **0** · caixa de
export limpo vista **0 na janela** (última impressão da casa: **04/09**) ·
checkout externo **0** · **pagou 0** · cliques no $1 **0**.

**CHECAGEM ZERO (24h):** cadastros **30** · crédito zero **12**, **trial órfão
0** · render preso **0** · recusa sem dono **0** · último `payment_success`
**02/09 20:22 UTC** — **jejum de 5 dias**, o número corrigido pelo checkpoint #8b
(eu vinha repetindo "3 dias").

**A FRASE DA ROTAÇÃO.** Hoje uma pessoa que gastou os créditos de boas-vindas,
nunca pagou e quer o filme sem a marca encontra **uma porta de $1** — ontem, e
até as 19:48 de hoje, ela encontrava o filme já limpo (nada a vender) e, depois
disso, só um compromisso mensal.

**PRÓXIMA JOGADA.** As duas portas de $1 da tela de filme pronto agora cobrem as
duas metades da plateia (em trial → caixa comercial; fora do trial → caixa de
export). Falta a metade que **nunca volta à tela**: o checkpoint #5c mediu que
**7% das entregas chegam só por e-mail**, e a pista de venda assistida acabou de
medir (`va-r5`) que **o e-mail de entrega vale 13x o slot da tela**. O e-mail de
`video_ready` já sai, já tem link, e — depois do conserto da #8 — anuncia um
filme que agora sai **com marca d'água** para uma coorte inteira que antes o
recebia limpo. É a única superfície grande da casa onde a porta de $1 ainda não
está, e o texto dela está tecnicamente **desatualizado** desde as 19:48. Quem
pegar: confirmar antes se a `va` já não a cobriu — ela mexeu em duas cartas hoje.

**✅ O QUE VOCÊ PRECISA FAZER**
1. Nada.

**📋 O QUE ACONTECEU**
Uma correção sua das 16:40 dizia que o trial de $1 tem de ser a primeira opção em
toda tela que mostra preço, e nomeava cinco lugares. Conferi os cinco: quatro já
tinham a porta, e o card "Want it clean?" não tinha — ele oferecia só o plano
mensal e o avulso. Esse card era pequeno até hoje, porque conta grátis levava o
filme limpo e não havia o que vender; a entrega das 19:48 (da outra sessão que
roda comigo nesta pista) pôs marca d'água nesses filmes e criou a plateia dele de
uma vez. Pus a mesma porta de $1 lá dentro, nos dois caminhos do card, sem tirar
nem esconder nada do que já estava — o download grátis, o plano e o pacote avulso
continuam onde estavam. Um detalhe de honestidade que vale citar: quando o
navegador não tem como reconstruir o arquivo, a porta **para de prometer "este
filme limpo"** e passa a oferecer só o trial. O jejum de assinante novo é de
**5 dias**, não 3 — eu vinha repetindo o número errado e o checkpoint da outra
sessão o corrigiu.

---

### #9 — 20:58 BRT — o botão mais clicado da casa mandava para o preço CHEIO, no mesmo instante em que a carta já mandava para a porta de $1

**O QUE ESTAVA ERRADO (medido, eventos, contas externas, 30 dias).** Fui atrás
do F5 e encontrei antes um degrau mais barato e maior. O modal que abre quando
o trial morre (`components/TrialDowngradeModal.tsx`) tem:

| evento | 30 dias | 7 dias |
|---|---|---|
| `trial_downgrade_modal_shown` | 81 impressões / **75 pessoas** | 23 pessoas |
| `trial_downgrade_modal_cta` (o botão que pede dinheiro) | 18 cliques / **15 pessoas** | 5 pessoas |

São **~22% de CTR**. Para comparar com o que esta pista vinha medindo: a caixa
comercial do pós-vídeo ganha 7 dos 105 slots em 7 dias e **o último clique dela
é de 22/08**. O modal do fim do trial é, de longe, **a superfície que pede
dinheiro mais clicada da casa** — e o botão dela levava a
`?tier=basic&intro=1`, ou seja **Creator cheio**. Enquanto isso a carta
`downgraded_loss`, que fala no **mesmo instante**, já leva à porta de $1 desde
a va-r6 (`e8b401c4`). Tela e e-mail do mesmo momento ofereciam preços
diferentes.

**A CAUSA NÃO FOI DESCUIDO — FOI UM COMENTÁRIO QUE ENVELHECEU HOJE.** Estava
escrito ao lado do link: *"`intro=1` é o mesmo link de TODAS as outras
superfícies de Creator do app; omiti-lo faria esta tela ser a única a cobrar
mais caro."* Era **verdade quando foi escrito**. Deixou de ser às 15:43 de
hoje, quando `/pricing` e `components/PricingCards.tsx` passaram a levar
`trial=1`. A partir daí manter `intro=1` fazia **exatamente o que o comentário
queria evitar**: esta tela virou a única a cobrar mais caro. A própria lógica
dele pedia a troca.

**O QUE MUDOU — SHA `72171bff`, EM PRODUÇÃO** (deploy
`dpl_2XsEdpUQMn1bTkrWvk84FLBxnH7V`, trocou às 20:55:54 BRT, ~3 min depois do
push; `origin/main` = `72171bff`, fila = 0).

O núcleo de honestidade da porta de $1 (quem o cobrador aceita + quando dá para
dizer o preço sem mentir) **saiu do corpo** de `decideCleanFilmTrialDoor` e
virou `decideTrialDoorOffer`, no **mesmo arquivo puro**. As duas superfícies da
porta passam a consumir a **mesma fonte**. O modal **importa** a regra; não a
recopia — que é a bomba-relógio que a fv-r7 desarmou há duas rotações (memória
`superficie-medida-por-copia-da-regra`).

**O QUE O CLIENTE VÊ.** Quem chega ao fim do trial sem nunca ter pago vê, no
mesmo lugar onde antes lia *"$15/month · 140 credits every month"*:

> **$1.00 today · 80 credits now · then $15.00/month from day 8 · cancel anytime**
> **[ Try Creator 7 days for $1.00 → ]**

O plano **continua visível** — a própria nota diz a mensalidade e o dia em que
ela começa (ordem do fundador: "nunca esconder o plano"). Nenhum número é
digitado: todos derivam de `CARD_TRIAL_ENTRY_FEE_MINOR`,
`CARD_TRIAL_GRANT_CREDITS`, `CARD_TRIAL_DAYS` e `formatCheckoutMoney` — as
mesmas constantes que a Stripe cobra.

**POR QUE É SEGURO PROMETER $1 AQUI** (a trava que decide tudo). O modal só
abre depois de um predicado **estrito**: o servidor tem de devolver `has_paid`
**igual a falso**, não "não-verdadeiro" (memória
`predicado-largo-negado-falha-aberta`). Quem vê essa tela já foi provado
elegível pela **mesma coluna** que o cobrador consulta. Quem já pagou nunca vê
o modal; e se por qualquer caminho chegasse lá, cai no `intro=1` antigo, byte a
byte. Sem moeda resolvida a porta não aparece — a trava de preço do núcleo
bloqueia sozinha, igual ao bloco de preço que já existia.

**O QUE NÃO MUDOU:** preço público, crédito, cupom, motor, régua, duração,
cota, marca d'água, pipeline. **Reversão** = trocar `trialDoor.visible` por
`false` numa linha.

**TESTES.** `test-clean-film-trial-door` **86/86** (era 83 — somei **um mutante
novo que prova a DELEGAÇÃO**: se alguém voltar a decidir sozinho no lugar de
chamar o núcleo, fica vermelho). Guardião novo
`scripts/test-porta-1dolar-no-fim-do-trial.mjs` **39/39 com 4 mutantes** (o
destino do trial, o gate estrito de `has_paid`, a delegação, e a queda honesta
para "Continue on Creator"). `tsc` verde **na base e depois**. Vizinhos do
modal verdes: first-value 49/49, human-view 107/107, plan-choice 39/39,
money-truth 313/313, post-delivery-slot 35/35. Tudo **reconferido na ponta da
fila depois do rebase** — o `enfileirar` rebasou sobre uma main nova
(`b41b86fd`) que também mexeu nesse arquivo (`HOST_BOXES`/`clean_export`, de
outra pista); a junção casou limpa, a trava de slot deles + a minha delegação,
e rodei tudo de novo (memória `guardiao-verde-na-worktree-vermelho-na-fila`).

**DUAS COISAS DO CARDÁPIO QUE NÃO PRECISAM SER FEITAS — medidas, não supostas.**

- **F2 (carteiras) JÁ ESTÁ FEITO.** `app/api/stripe/checkout/route.ts` removeu
  o `payment_method_types: ['card']` no **Push #414**, com o motivo escrito no
  código. A sessão já oferece todo método habilitado no dashboard da Stripe
  para a moeda/país do comprador. **Não refaçam** — e não é preciso arriscar a
  caixa registradora para isso.
- **F3 (carta de sessão expirada) EXISTE E SAI**, mas não move ninguém:
  `checkout_recovery_emailed_v1` = **27 cartas / 27 pessoas em 60 dias**, a
  última **hoje 17:30 UTC**. Dessas 27, **zero pagaram**. Há 32 pessoas com
  URL de retomada que nunca receberam carta — mas estender uma carta que
  converteu 0/27 é construir a sétima superfície antes de medir as seis
  (memórias `carta-nova-so-depois-da-velha-mover` e
  `medir-os-remedios-existentes-antes-do-setimo`). **Não fiz, de propósito.**

**RISCO.** Um: a pessoa que fez 7 dias de trial grátis agora ganha 7 dias de
Creator por $1 — é a oferta padrão da casa desde as 16:40 e converte um perdido
em cartão na casa, mas é o fundador quem manda no preço; reverter é uma linha.
Dois: o modal cobre quem chega **ao fim** do trial, e a memória
`janela-de-compra-e-o-dia-zero` diz que 10 dos 12 pagantes compraram em 48h —
esta superfície fala **fora** dessa janela. Ela se justifica pelo CTR de 22%,
não por estar na hora certa.

**COMO MEDIR (e o que ainda NÃO prova nada).** O teste é
`trial_downgrade_modal_cta` com **`trial_door = true`**, depois
`checkout_started` com **`card_trial = '1'`** e `intent_campaign =
trial_1usd_downgrade`, depois `payment_success` de **100 centavos**. Os dois
campos novos são o **carimbo do deploy**: linha sem eles é de antes e não se
mistura (memória `campo-novo-e-o-carimbo-do-deploy`). ⚠️ **A sonda de bundle é
CEGA aqui e eu rodei o controle**: o modal vive em rota autenticada; varri 14
chunks públicos de `/pricing` e não achei nem a string nova **nem** a string de
controle `trial_1usd` que já estava no ar — ou seja o método não sabe
responder, não que o código falte (memória `entrega-so-de-cliente-nao-tem-sonda`).
O que **está** provado: `origin/main` = o commit, fila 0, deploy trocou, 200 na
home e **404 no controle**.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~5h20), contas externas:**
filme pronto **2 pessoas** · clique em baixar **0** · modal de fim de trial
**0** · clique no modal **0** · `checkout_started` **0** · **pagou 0** · 39
pessoas com evento. A janela continua de tráfego magro; **ninguém passou pela
porta nova ainda**, e zero oportunidades não é zero acertos (memória
`provar-leitura-sem-trafego`).

**CHECAGEM ZERO (24h):** cadastros **26** · crédito zero **11**, **trial órfão
0** · render preso **0** · recusas de cartão **2**, **sem dono 0** · último
`payment_success` **02/09 20:22 UTC** (jejum de 5 dias, inalterado).

**DUAS CORREÇÕES DE FATO, uma delas de uma memória minha.**

1. **O relógio do shell NÃO mente.** A memória `relogio-do-shell-mente-em-brt`
   diz que `date` puro devolve UTC 3h adiantado. **Está errada.** Medido agora,
   no mesmo comando: `date` = `20:54 BRT`, `date -u` = `23:54 UTC`, e o
   `%aI` do meu commit fecha em `-03:00`. `date` puro **é BRT**. Perdi minutos
   raciocinando em cima da memória errada; ela vai ser corrigida.
2. **São SEIS guardiões vermelhos herdados na ponta, não cinco.** Somo à lista
   da va-r6 o `scripts/test-guardiao-yaml-2026-09-03.mjs` (6 ok / 6 falhas).
   **Falsifiquei antes de acusar**: ele lê `.github/workflows/guardiao.yml`, e
   eu mudei **0** arquivos sob `.github/` — o arquivo que ele julga está byte a
   byte igual a `origin/main`. Não é meu.

**A FRASE DA ROTAÇÃO.** Hoje um visitante novo que gasta o trial inteiro e bate
na parede encontra uma porta de **$1** que ontem não encontrava — no botão que
15 pessoas por mês já apertavam para achar $15.

**PRÓXIMA JOGADA (#10), e ela nasce do que eu vi medindo esta.** Existem **68
sessões de `checkout_started` em `tier=basic` sem `card_trial`** em 30 dias —
55% de todos os checkouts da casa foram para o Creator cheio. Isso é história
(a porta nasceu hoje), **mas a lista de quem ainda manda para o preço cheio é
curta e conhecida**: `components/TrialActiveBanner.tsx:731`,
`components/ExitIntentOffer.tsx:328`, `app/KineoLanding.tsx:838` e quatro
pontos de `GenerateClient.tsx` — todos com `tier=basic&intro=1`, e `intro=1`
**é um no-op** (`hasIntroOffer()` é falso desde a V5). A jogada da #10 é
**varrer os construtores de link**, não inventar superfície: cada um deles é
uma linha, o núcleo já existe e o guardião já está escrito. Comece pelo
`ExitIntentOffer` — é o único que fala com quem está **saindo**, e portanto o
único onde a porta mais barata é a última chance real.

**✅ O QUE VOCÊ PRECISA FAZER**
1. **Nada para publicar** — já publiquei (`72171bff`, deploy confirmado).
2. **Decidir se aceita a oferta**: quem termina o trial sem nunca ter pago
   agora vê **"Try Creator 7 days for $1"** em vez de "$15/month". Se não
   quiser, me diga "tira o $1 do modal de fim de trial" — é uma linha.

**📋 O QUE ACONTECEU**
Eu ia construir a oferta da segunda tentativa de checkout e, medindo antes,
achei um buraco maior e mais barato: **o botão que pede dinheiro mais clicado
da casa** (75 pessoas por mês o veem, 15 clicam — 22%) mandava para o Creator
cheio, no mesmo minuto em que o e-mail que sai daquele instante já mandava para
a porta de $1 que você abriu hoje. A causa era um comentário no código que era
verdadeiro de manhã e virou falso às 15:43. Consertei sem tocar em preço,
crédito ou pipeline, com a regra morando numa fonte única que as duas telas
compartilham, 125 verificações e 5 mutantes. Aproveitei para provar que **duas
tarefas do seu cardápio não precisam ser feitas**: as carteiras de pagamento já
estavam ligadas desde o Push #414, e a carta de sessão expirada já existe e já
sai — só que converteu 0 de 27, então empilhar mais carta ali seria desperdício.
Corrigi ainda uma memória minha que estava errada sobre o relógio e registrei um
sexto guardião vermelho herdado. O jejum de assinante novo segue em 5 dias e a
janela desta noite continua com pouquíssimo tráfego — ninguém passou pela porta
nova ainda.


---

### #9b — 21:08 BRT — CHECKPOINT da #9: duas entregas minhas sem uma única oportunidade, e um alarme meu que a linha de base derrubou

**NADA DE CÓDIGO.** Medição da #9 e a correção de uma leitura minha desta noite.

**1. O ALARME QUE EU LEVANTEI E QUE NÃO SE SUSTENTA.** Ao abrir o checkpoint vi
**zero renders em 2 horas** com gente na casa e escrevi que "não é maré baixa".
**Está errado.** Fui buscar a linha de base hora a hora (12h, UTC) antes de
escalar, e ela desmente o alarme:

| hora UTC | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sessões na landing | 13 | 18 | 11 | 18 | 15 | 17 | 20 | 20 | 14 | 20 | 10 | 15 |
| renders iniciados | 4 | 1 | 1 | 4 | 1 | 1 | **0** | 1 | **0** | 3 | **0** | **0** |
| cadastros | 1 | 1 | 0 | 3 | 0 | 1 | 0 | 1 | 0 | 2 | 0 | 0 |

**O tráfego da landing é plano o dia inteiro** (10 a 20 por hora, sem degrau), e
**hora com zero render já tinha acontecido duas vezes hoje — às 18h e às 20h
UTC**, *antes* de qualquer deploy desta noite. O último render começou **21:48
UTC**; o meu deploy foi **~22:00** e o da #8 **~22:52**. **O silêncio começou
antes dos dois.** Somando: `generation_stage_error` tem **zero linhas em 6
horas** — o pipeline não está recusando ninguém, e o `/api/compose` não tem uma
única falha registrada. **Não é incidente; é uma noite magra dentro da variação
do próprio dia.**

⚠️ **E um número que eu NÃO posso dar:** tentei contar visitantes distintos por
`ip_hash` nas sessões da landing e recebi **0** — a chave **não existe** nesse
evento, e `count(distinct)` sobre campo ausente devolve um número que parece
resposta. São **24 sessões** em 2h, **não** 24 pessoas. É exatamente a armadilha
que o checkpoint #8b registrou há uma hora, e eu caí nela na hora seguinte.

**2. AS DUAS ENTREGAS DE HOJE NÃO TIVERAM UMA ÚNICA OPORTUNIDADE — e isso é
esperado, não é falha.**

| entrega | evento que a prova | linhas | por quê |
|---|---|---|---|
| #7 — nome honesto do slot | qualquer impressão do slot com `slot_owner` | **0** | a última impressão da casa foi **21:53 UTC**, ~7 min antes do deploy |
| #9 — porta de $1 no export limpo | `post_video_offer_viewed` | **0 na janela** | a última impressão desse card na casa é de **04/09** |

**Zero oportunidades não é zero acertos** (memória `provar-leitura-sem-trafego`).
O teste da #7 é a primeira impressão do slot que aparecer **com** o campo
`slot_owner`; o da #9 é a primeira `post_video_trial_1usd_shown` com
`host`. Nenhum dos dois é respondível hoje à noite.

**3. O QUE SIM ACONTECEU NA JANELA, e liga direto na #9.** Nas últimas 2h a casa
registrou **2 `trial_downgraded`** — duas pessoas cujo trial venceu agora. Essa
é **exatamente** a coorte que a #9 passou a atender: fora do trial, sem pagar,
elegível à caixa "Want it clean?" e, desde as 19:48 (#8), com filme **marcado**
para vender. As duas ainda não voltaram à tela. Se voltarem e renderizarem, são
as primeiras candidatas naturais a exercitar as duas entregas de uma vez.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~5h30), contas externas:**
entrega real **1** · filme pronto na tela **3 impressões / 2 pessoas** · baixou
**0** · caixa de export limpo vista **0** · porta de $1 vista **0** · cliques no
$1 **0** · `checkout_started` externo **0** · **pagou 0**.

**CHECAGEM ZERO (24h, relida agora):** cadastros **26** · crédito zero **11**,
**trial órfão 0** · render preso **0** · recusa sem dono **0** · último
`payment_success` **02/09 20:22 UTC**. ⚠️ Publiquei **30/12** na #9 — é a mesma
janela móvel lida ~2h antes, não um número diferente; nenhuma conclusão muda.

**A FRASE DA #9 CONTINUA DE PÉ, sem correção:** quem gastou os créditos de
boas-vindas, nunca pagou e quer o filme sem marca encontra uma porta de $1 onde
ontem só havia compromisso mensal. O checkpoint só acrescenta que **ninguém
passou por ela ainda** — e que, esta noite, ninguém passou por porta nenhuma.

**PARA A ROTAÇÃO #10.** Com a tela coberta nas duas metades e sem tráfego para
medir, a alavanca que sobra é a que **não depende de a pessoa voltar**: o e-mail
de `video_ready`. Dois fatos frescos o recomendam — a `va-r5` mediu que ele
**vale 13x o slot da tela**, e desde as 19:48 ele anuncia um filme que agora sai
**com marca d'água** para uma coorte inteira, sem dizer isso. ⚠️ **Antes de
escrever uma linha: conferir o que a pista de venda assistida já fez nele** — ela
mexeu em duas cartas hoje (`va-r3`, `va-r6`) e uma terceira mão no mesmo arquivo
é como esta casa perdeu trabalho em 01/09.

**✅ O QUE VOCÊ PRECISA FAZER**
1. Nada.

**📋 O QUE ACONTECEU**
Checkpoint de medição, sem código. Levantei um alarme — "duas horas sem ninguém
gerar vídeo" — e a própria linha de base o derrubou: o tráfego da landing está
plano o dia todo, horas sem render já tinham acontecido duas vezes hoje antes de
qualquer entrega minha, e o pipeline não registrou uma única falha em seis horas.
Não é defeito; é uma noite magra. As duas coisas que publiquei hoje ainda não
tiveram uma única chance de aparecer para alguém, e digo isso com o número na
mão em vez de contar como vitória. O que a janela trouxe de concreto: duas
pessoas tiveram o trial vencido agora — são exatamente as primeiras candidatas à
porta de $1 que entrou na última hora, se voltarem à tela.

**ADENDO AO #9b (21:20 BRT) — a outra sessão mexeu no meu módulo e o guardião
avisou.** Enquanto eu media, a outra sessão da pista publicou a própria `fv-r9`
(a porta de $1 no modal de fim de trial) e **extraiu o miolo de
`lib/growth/cleanFilmTrialDoor.ts` para um núcleo compartilhado**
(`decideTrialDoorOffer`). O trabalho dela é bom e a decisão é a certa — é o
oposto de recopiar a regra. Rodei os seis guardiões na ponta com as duas
entregas juntas: **cinco verdes e o meu vermelho**, com a mensagem exata
*"a mutação não foi escrita"* — duas travas (quem já pagou / sem moeda
resolvida) **mudaram de endereço** e as minhas âncoras ficaram apontando para o
vazio. O comportamento nunca quebrou; **as verificações de comportamento
passaram as duas vezes**. Reancorei no núcleo novo, **sem afrouxar nada**: o que
se exige continua sendo que, mutadas, as travas deixem a porta mentir.
`HOST_BOXES` sobreviveu intacto e `test-clean-export-trial-door` voltou a
**47/47**; os outros cinco seguem verdes e o `tsc` limpo. **É a segunda vez hoje
que um guardião de mutação paga o próprio custo** — o falso verde teria sido
"tudo certo" enquanto duas travas de dinheiro estavam sem teste.

---

### #10 — 21:15 BRT (00:15 UTC) — A MAIOR SUPERFÍCIE DA CASA NÃO TINHA BOTÃO DE DINHEIRO PARA 93,5% DE QUEM A VIA

**A JOGADA QUE EU IA FAZER, E POR QUE NÃO FIZ.** A #9 deixou escrita a varredura
dos construtores de link que ainda mandam para o mês cheio, começando por
`components/TrialActiveBanner.tsx:731`. Fui medir o alcance antes de mexer
(memória `medir-alcance-da-superficie-antes-de-ligar`) e o número parou a
varredura no lugar:

```
trial_active_banner_shown ........................ 793 pessoas / 30d
   <- a MAIOR superfície da casa. Para comparação: caixa pós-entrega 75,
      exit intent 28, modal de fim de trial 15.
trial_active_banner_cta (o clique de comprar) .... 15 pessoas
   última vez que alguém apertou: 03/09 06:02 UTC — quatro dias atrás.
```

**ERRADO (medido, contas externas, 30 dias).** O botão de assinatura desse
banner só é montado dentro de `{!firstDelivery.eligible && …}`. Das 231
impressões que carimbam o campo desde 01/09:

| ramo | pessoas | tem controle de dinheiro? |
|---|---:|---|
| `first_delivery_eligible = true` | **216** | **NÃO — nenhum** |
| `first_delivery_eligible = false` | 15 | sim |

**216 pessoas (93,5%) viam a maior superfície da casa e não tinham o que
apertar para pagar.** O `trial_active_banner_cta` mudo desde 03/09 não era
desinteresse: era ausência de botão. É o padrão exato das memórias
`degrau-morto-dentro-da-superficie-viva` e `superficie-nova-empurra-a-que-vende`
— a caixa do primeiro filme (nova, e correta) ocupou o lugar inteiro e a
superfície que vende sumiu junto.

**E A DEMANDA EXISTIA.** Das 216: **49 clicaram no botão grátis** do primeiro
filme (23% — o caminho grátis funciona e não se toca), **20 chegaram a um
`checkout_started` por conta própria**, procurando a porta em outra tela, e 1
pagou. Vinte pessoas saíram para achar o que estava na frente delas.
Confirmação ao vivo: desde o marco das 18:38 UTC, **3 pessoas** viram o banner
e **as 3** caíram no ramo sem botão.

**MUDOU — EM PRODUÇÃO, SHA `301a9d59`** (`origin/main` = 376f1029 contém;
fila 0; deploy `dpl_AYfQr569Bo4zTwGXEpZDwkVMpBj8` **READY**, target production,
`githubCommitSha = 301a9d59766d61da30efc67a8a122784fc46c37b` conferido pela API
da Vercel, não pelo relógio).

**O QUE O CLIENTE VÊ.**
1. **Quem ainda não gastou um crédito** (216/mês) continua vendo a caixa verde
   do primeiro filme, intacta, como manchete — e agora, **abaixo dela e fora
   dela**, uma linha discreta: *"Try Creator 7 days for $1 →"*, com a nota
   *"$1 today · 80 credits now · then $15/month from day 8 · cancel anytime"*.
   Peso visual de link, nunca de botão: o filme grátis não perde a disputa
   porque não há disputa.
2. **Quem já gastou crédito** (15/mês) tinha *"Keep Creator after the trial —
   $15.00"*. Passa a ter a porta de $1 com a mesma nota. Queda honesta: sem
   moeda resolvida, ou em conta que já pagou, volta o rótulo e o destino
   `intro=1` de sempre, byte a byte.

**A REGRA NÃO FOI REDIGITADA.** As duas telas chamam `decideTrialDoorOffer` —
a mesma fonte única da caixa de export limpo e do modal de fim de trial. Zero
preço literal, zero cifrão escrito à mão (memória
`superficie-medida-por-copia-da-regra`).

**O GATE É O PREDICADO ESTRITO.** A Guarda 2 do banner fecha a tela quando
`hasPaid === true` — mas `undefined` passaria por ela. Dinheiro exige prova
positiva: guardei `data.hasPaid === false` em estado próprio e a porta só nasce
com ele (memória `predicado-largo-negado-falha-aberta`).

**TESTES.** Guardião novo `scripts/test-porta-1dolar-no-banner-do-trial.mjs`:
**38 verificações e 6 mutantes** — o gate estrito, a montagem condicional, o
predicado negado, a queda honesta do destino, a nota que diz o preço do dia 8,
e o peso visual que impede a porta paga de virar um segundo botão sólido. Cada
mutante **prova que foi escrito em disco** antes de ser julgado (memória
`mutacao-precisa-provar-que-aplicou`), e a restauração é reconferida no fim.
`tsc` verde, **falsificado com um erro deliberado** (`TS2322` na linha 187) para
provar que o compilador estava mesmo rodando. Vizinhos verdes: clean-film-trial-
door 86/86, porta-1dolar-fim-do-trial 39/39, trial-active-subscription-cta
88/88, money-truth 313/313, downgrade first-value 49/49, human-view 107/107,
plan-choice 39/39, post-delivery-slot 35/35, checkout-resume 111/111. **Tudo
reconferido na ponta da fila depois do rebase**, que caiu sobre uma main nova
de outra sessão (memória `guardiao-verde-na-worktree-vermelho-na-fila`).

**RISCO.** Um: oferecer pagamento a quem ainda não recebeu o primeiro filme
contraria "o primeiro vídeo é o produto". Mitigação medida — o botão grátis
continua primeiro, sólido e maior; a porta é link, abaixo, fora da caixa; e a
memória `janela-de-compra-e-o-dia-zero` mais o achado da va-r7 dizem que a
janela de compra **é** a chegada (0-1 filme). Dois: é o fundador quem manda no
preço; reverter é apagar uma linha de montagem.

**COMO MEDIR.** `trial_first_film_pay_door_shown` (leva `visible` e `reason` no
mesmo evento — sem os dois, zero clique não distingue "ninguém quis" de "nunca
apareceu", memória `duas-contas-certas-portao-escolhe-a-errada`) →
`trial_first_film_pay_door_clicked` → `checkout_started` com
`intent_campaign = trial_1usd_first_film` → `payment_success` de 100 centavos.
O CTA do outro ramo usa carimbo **diferente** (`trial_1usd_active_banner`): as
duas coortes não podem virar uma só. Campo novo = carimbo do deploy; linha sem
ele é de antes (memória `campo-novo-e-o-carimbo-do-deploy`).

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~5h40), contas externas:**
filme pronto **2 pessoas** · clique em baixar **0** · banner de trial **3**,
e **3 de 3** no ramo sem botão de dinheiro · porta nova shown **0** / click
**0** (nasceu às 21:14) · `checkout_started` **1**, com `card_trial=1` **0** ·
**pagou 0** · 40 pessoas com evento.

**CHECAGEM ZERO (24h):** cadastros **26** · crédito zero **11**, **trial órfão
0** · render preso **0** · recusas de cartão **2**, **sem dono 0** · último
`payment_success` **02/09 20:22 UTC** (jejum de 5 dias, inalterado).

**A FRASE DA ROTAÇÃO.** Hoje um visitante novo que entra no trial e ainda não
gastou um crédito encontra, pela primeira vez, **uma forma de pagar sem sair da
tela** — 216 pessoas por mês estavam numa superfície que não tinha nenhuma.

**PRÓXIMA JOGADA (#11).** A varredura de links que a #9 desenhou continua de pé,
mas com a ordem corrigida pelo alcance real, e agora eu sei medir antes de
mexer: `components/ExitIntentOffer.tsx:328` fala com **28 pessoas/30d** e
`app/KineoLanding.tsx:838` é a landing pública (denominador ainda não medido —
**meça `pricing_view` e o clique do card Creator antes de tocar**). Mas a
alavanca maior que eu vi medindo esta: **`trial_balance_bridge_viewed` = 90
pessoas / `trial_balance_bridge_clicked` = 5** — a ponte do segundo filme, no
mesmo arquivo, tem 90 pessoas por mês e **também não tem porta de dinheiro
nenhuma**. É o mesmo defeito, na mesma tela, um degrau adiante; e a peça já
está escrita, é montar.

**✅ O QUE VOCÊ PRECISA FAZER**
1. **Nada para publicar** — já publiquei (`301a9d59`, deploy READY conferido
   pela API da Vercel).
2. **Decidir se aceita a oferta**: quem está no trial grátis e ainda não gastou
   um crédito passa a ver, abaixo do botão grátis, *"Try Creator 7 days for
   $1"*. Se não quiser, me diga "tira o $1 do banner do trial" — é apagar uma
   linha.

**📋 O QUE ACONTECEU**
Eu ia varrer links de checkout e, medindo antes, achei o buraco maior da noite:
**a maior superfície da casa — 793 pessoas por mês — não mostra botão de
dinheiro nenhum para 93,5% de quem a vê.** Não era desinteresse: 20 dessas
pessoas saíram da tela para procurar um checkout em outro canto do site. A causa
é a caixa (correta) do primeiro filme, que ocupou o lugar inteiro e levou junto
o pedido de venda. Consertei sem tocar em preço, crédito, motor ou pipeline, e
sem mexer no caminho grátis: a porta de $1 nasce **fora** da caixa verde, com
peso de link, e o botão grátis continua primeiro e maior. Regra de dinheiro na
fonte única já testada, 38 verificações, 6 mutantes, e o `tsc` falsificado de
propósito para provar que estava rodando. O jejum de assinante novo segue em 5
dias; hoje, pelo menos, quem quer comprar não precisa mais procurar.

---

### #11 — 21:30 BRT (00:30 UTC) — A SUPERFÍCIE DE VENDA MAIS BATIDA DO PRODUTO SÓ VENDIA MÊS CHEIO · E DUAS RETRATAÇÕES DA #10

**ERRADO (medido, contas externas, 30 dias).** `upgrade_modal_opened` = **62
pessoas**. É o modal que abre sozinho quando a pessoa aperta Generate sem
saldo — a única superfície de dinheiro da casa que **a própria pessoa manda
abrir**. O código o descreve como "a superfície de venda MAIS BATIDA do
produto", e todas as suas saídas — as três linhas de plano — mandavam para a
mensalidade cheia.

Tabela de alcance completa, para parar de escolher superfície por intuição:

| superfície | pessoas / 30d | tem a porta de $1? |
|---|---:|---|
| banner do trial | 793 | sim (fv-r10, hoje) |
| ponte do 2º filme | 90 | sim (herda o CTA do banner) |
| caixa pós-entrega | 75 | sim (fv-r9, hoje) |
| **modal de upgrade** | **62** | **sim — esta entrega** |
| exit intent | 28 | ainda não |
| modal de fim de trial | 15 | sim (fv-r9, hoje) |

**MUDOU — EM PRODUÇÃO, SHA `658db9af`** (deploy
`dpl_FUzp4pEXpanYmWPsazTBx8DVcBYV` **READY**, target production,
`githubCommitSha = 658db9afee8d53cbbc3cd028895376f8f4b6cc80` conferido pela
API da Vercel; fila 0).

**O QUE O CLIENTE VÊ.** No modal de "sem créditos", **acima** das três linhas
de plano e **abaixo** da caixa verde "your first one is free", uma caixa azul:
sobrancelha *CHEAPEST WAY IN*, manchete *"Try Creator 7 days for $1"*, e a nota
*"$1 today · 80 credits now · then $15/month from day 8 · cancel anytime"*.
**Nenhum plano foi removido, escondido ou reordenado** — a ordem do fundador de
16:40 é "primeira opção", nunca "única opção".

**A ORDEM DA TELA É REGRA, NÃO DECORAÇÃO**, e o guardião a trava por índice:
grátis → porta de $1 → planos. Quem nunca fez um filme continua vendo primeiro
a saída que não custa nada.

**O GATE ESTRITO, e por que `!isSubscriber` não servia.** O modal recebia
`isSubscriber`, e usá-lo negado é exatamente a memória
`predicado-largo-negado-falha-aberta`: ele abre a porta justo quando a leitura
falha. `hasPaid` também não bastava — nasce `false` e não distingue "o servidor
disse que não pagou" de "a resposta ainda não voltou". Criei
`notPaidProven`, escrito no MESMO ponto em que `hasPaid` é lido, com padrão
**fechado**; o guardião mata um mutante que o faz nascer aberto.

**TESTES.** `scripts/test-porta-1dolar-no-upgrade-modal.mjs` **29 verificações,
5 mutantes**. Um deles **sobreviveu no primeiro rascunho** e a causa vale mais
que o teste: `notPaidProven={notPaidProven}` aparece **duas vezes** na tela (o
modal e a peça nova), `String.replace` troca só a primeira, e a trava casava com
a segunda intacta — o mutante "morria" por acidente. A trava passou a **contar
as duas ocorrências**. Outra falha honesta do primeiro rascunho: a regra "nenhum
preço literal" reprovou a própria **prosa** do cabeçalho, que cita `$1` ao
explicar a ordem do fundador; agora ela julga o código com os comentários fora.
`tsc` verde. Vizinhos verdes: clean-film-trial-door 86/86,
porta-1dolar-fim-do-trial 39/39, porta-1dolar-banner-do-trial 38/38, money-truth
313/313, post-delivery-slot 35/35.

**⛔ DUAS RETRATAÇÕES DA #10 — as duas minhas, as duas escritas antes de eu
conferir a exclusividade dos ramos.**

1. **A ponte do 2º filme NÃO está sem porta de dinheiro.** Eu escrevi no
   PEDIDOS que ela "também não tem porta nenhuma" e mandei a próxima rotação
   montar uma lá. **Falso.** O bloco da ponte exige `!firstDelivery.eligible`,
   que é **a mesma guarda** do CTA de assinatura — logo, quem vê a ponte vê
   também o botão de dinheiro, que desde as 21:14 é a porta de $1. Montar outra
   ali criaria **duas ofertas na mesma tela**. Corrigido no PEDIDOS.
2. **O "216 sem botão" é o estado NA CHEGADA, não em todo render.** A impressão
   do banner é deduplicada por conta **por dia** (localStorage), então o flag do
   ramo é um **retrato do primeiro render do dia**: quem gasta crédito depois
   muda de ramo sem gerar impressão nova. A direção do achado continua de pé (é
   o que a pessoa encontra ao chegar, e a chegada é a janela de compra), mas o
   número não é "216 pessoas nunca viram botão". E era isso que fazia a conta da
   ponte não fechar: 81 pessoas viram a ponte desde 01/09 contra 15 impressões
   carimbadas com `first_delivery_eligible=false`.

**✅ CONFERIDO E NÃO É DEFEITO — para ninguém gastar rotação nisso.**
`trial_post_video_offer_viewed` = 228 pessoas/30d e
`trial_post_video_offer_clicked` **parado desde 22/08** (16 dias). Parece degrau
morto, e não é: desde aquele clique foram **35 pessoas**, e os **quatro** botões
daquela caixa (`offer_clicked`, `compare_plans_clicked`, `creator_upgrade`,
`starter_escape`) estão **wired a onClick reais** — conferido linha a linha.
0 de 35 numa caixa de paywall está dentro do ruído de uma taxa de 1-3%
(esperado: 1). É denominador pequeno, não peça quebrada (memória
`zero-escritas-conte-as-oportunidades`).

**RISCO.** A casca deste modal foi aprovada pelo fundador em preview HTML
("gostei bastante… aprovado"). Eu **não** toquei nela: nem na coluna de prova
com os clipes curados, nem nas linhas de plano, nem no grid, nem no top-up. A
caixa nova segue o mesmo molde da caixa verde que já vivia ali. Reverter é
apagar uma linha de montagem.

**COMO MEDIR.** `upgrade_modal_trial_door_shown` (com `visible` e `door_reason`)
→ `upgrade_modal_trial_door_clicked` → `checkout_started` com
`intent_campaign = trial_1usd_upgrade_modal` → `payment_success` de 100
centavos. ✅ **Verifiquei a tubulação inteira, não presumi**: `intent_campaign`
é lido de `searchParams` em `app/api/stripe/checkout/route.ts:874`, passa o
sanitizador `^[A-Za-z0-9._~-]{1,100}$` (o `_` está na classe) e entra no
`checkout_started` do servidor; e o `card_trial='1'` é escrito pelo próprio
servidor na linha 1113 quando `wantsTrial`. O `(sem campo)` que aparece nas 123
sessões de 30 dias não é furo de instrumentação — é a porta ter nascido hoje às
15:43.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC, contas externas:** sem
mudança material desde a #10 (janela de tráfego magro); as três portas novas
nasceram entre 20:47 e 21:29 e ainda não encontraram cliente.

**A FRASE DA ROTAÇÃO.** Hoje um visitante novo que aperta Generate sem saldo
encontra, como PRIMEIRA opção, uma entrada de $1 — onde ontem só havia três
mensalidades cheias.

**PRÓXIMA JOGADA (#12).** Sobrou **uma** superfície de dinheiro sem a porta:
`components/ExitIntentOffer.tsx:328`, 28 pessoas/30d — e ela é a única que fala
com quem está **saindo**, onde a oferta mais barata é a última chance real.
⚠️ **Meça-a por `coalesce(user_id::text, session_id)`**: `exit_intent_shown` tem
416 linhas para 28 pessoas e `exit_intent_free_clicked` tem 75 linhas com
`count(distinct user_id) = 0` — é superfície de deslogado, e contar por
`user_id` zera metade dela (memória
`medir-alcance-da-superficie-antes-de-ligar`). Depois disso, a pergunta deixa de
ser "onde falta a porta" e passa a ser **"qual das cinco portas converte"** — o
que exige tráfego, não código.

**✅ O QUE VOCÊ PRECISA FAZER**
1. **Nada para publicar** — já publiquei (`658db9af`, deploy READY conferido).
2. **Olhar uma tela, se quiser**: abra o Studio numa conta sem créditos. O modal
   agora abre com "Try Creator 7 days for $1" no topo e os três planos logo
   abaixo. Se preferir sem, me diga "tira o $1 do modal de créditos".

**📋 O QUE ACONTECEU**
Fechei a quarta das cinco superfícies onde a casa pede dinheiro: o modal que
abre quando alguém aperta Generate sem saldo (62 pessoas/mês) só oferecia
mensalidade cheia e agora abre com a entrada de $1 no topo, com os planos
intactos logo abaixo. Também **retratei duas coisas que eu mesmo escrevi uma
hora antes**: a ponte do segundo filme não estava sem porta (ela herda o mesmo
botão que consertei), e o "216 pessoas sem botão" é o estado de chegada, não de
todo render — o evento é deduplicado por dia. E conferi, sem consertar nada, uma
caixa que parecia morta há 16 dias e não está: são 35 pessoas, os quatro botões
funcionam, e zero de 35 é ruído. Restam uma superfície sem porta (o exit intent,
28 pessoas) e a pergunta que só o tráfego responde: qual das portas vende.

---

### #11b — 21:40 BRT — CHECKPOINT: A JOGADA #12 MORREU NA MEDIÇÃO, E OS GUARDIÕES VERMELHOS HERDADOS SÃO **DOZE**, NÃO SEIS

**A #12 QUE EU IA FAZER NÃO DEVE SER FEITA — e o erro era meu, de uma hora
atrás.** Eu escrevi na #11 que a última superfície sem porta era o
`ExitIntentOffer` com "28 pessoas/30d". Fui medir com a unidade certa antes de
codar e o número se partiu em três:

```
exit_intent_shown ..... 415 linhas · 404 visitantes · 28 com conta
   └─ variante 'free' (deslogado, CTA de cadastro) .... 93 visitantes
   └─ variante 'deal' (os DOIS cards de assinatura) ...  8 visitantes  ← aqui
   └─ '(sem variant)' — código anterior a 01/09 ....... 304 visitantes
```

A porta de $1 caberia na variante **`deal`**, e ela alcança **8 visitantes em 30
dias** — a MENOR superfície de dinheiro da casa, não a segunda maior. Os 404 são
quase todos deslogados vendo um convite de cadastro, onde não há preço nenhum
para trocar. **Uma rotação salva por uma consulta de 30 segundos.** É a terceira
vez hoje que a unidade composta (`coalesce(user_id::text, session_id)`) muda a
decisão — e a segunda vez que eu mesmo publiquei um número por `user_id` numa
superfície pública antes de conferir.

**SONDA DO CAMINHO DO DINHEIRO — feita, e passou.** Antes de assumir que as
portas funcionam para quem não está logado, sondei o destino real com um
User-Agent de navegador (memórias `sondar-o-destino-do-link-antes-de-enviar` e
`sonda-com-ua-de-curl-cai-no-ramo-do-robo`):

| pedido | resposta |
|---|---|
| porta de $1, deslogado | **307** → `/signup?reason=checkout&redirect=…trial=1…intent_campaign=…` |
| mês cheio, deslogado (controle) | 307 → `/signup…intro=1…` |
| rota inexistente (controle) | **404** |

O `trial=1` e o `intent_campaign` **sobrevivem** dentro do `redirect`: quem se
cadastra depois de clicar volta para a porta de $1, não para o mês cheio. E o
`/pricing` público serve a porta para deslogado — conferido no HTML servido:
`try Creator for 7 days — $1, then $15/mo →`.

**⚠️ CORREÇÃO DE FATO: SÃO DOZE GUARDIÕES VERMELHOS HERDADOS, NÃO SEIS.** A #9
somou um sexto à lista da va-r6. Rodei a suíte inteira de dinheiro/trial na
ponta — **82 verdes, 12 vermelhos** — e depois **falsifiquei numa worktree
pristina no commit `5f3803b1`** (a ponta de quando esta rotação começou): os
**doze já estavam vermelhos antes de eu tocar em qualquer arquivo**. Nenhum é
meu. A lista, com a natureza de cada um:

`test-animate-paywall` · `test-business-content-plan` ·
`test-checkout-currency-truth` · `test-checkout-password-recovery` ·
`test-checkout-profile-read` · `test-credito-vitrine` (1/15 — "as 6 etiquetas de
motor são derivadas — achei **0**": âncora perdida) · `test-next-door-bar` (3
falhas, todas sobre a guarda do #47) · `test-porta-serie-impressao-2026-09-05` ·
`test-rewrite-candidate-offer` · `test-stripe-checkout-failure-truth` ·
`test-trial-balance-bridge` (**não falha: ESTOURA** com `AssertionError` no
`check` — morre na 1ª verificação e nunca chega às outras) ·
`test-trial-post-video-primary` (**25/57** — a acusação mais séria da lista:
"trial offer card is found", "deliver-first remains true", "clean-film benefit
is the heading" — a caixa que 228 pessoas/mês veem).

Enquanto vivem vermelhos, os doze não protegem nada, e falso vermelho treina
gente a ignorar guardião (memória `guardiao-crlf-falso-vermelho`). **Não os
consertei**: são doze arquivos de donos diferentes e consertar guardião alheio
às pressas, num ciclo que fecha em duas horas, é como se quebra trava de
dinheiro. Fica nomeado, com denominador e com a prova de que não é meu.

**O QUE NÃO MUDOU NESTE CHECKPOINT:** nenhum arquivo de produto. Só medição,
sonda e auditoria.

---

### #12 — 22:25 BRT — QUATRO GUARDIÕES VERMELHOS CONSERTADOS, E OS QUATRO ACUSAVAM O PRODUTO POR ÂNCORA MORTA OU FIM DE LINHA

**POR QUE ISTO, E NÃO MAIS UMA PORTA.** A #11b mediu a última superfície de
dinheiro sem porta de $1 (o exit intent) e ela alcança **8 visitantes em 30
dias** — a jogada morreu na medição. Com as cinco superfícies que importam já
servidas, a maior alavanca que sobrou nesta janela de tráfego magro era
**devolver os dentes aos guardiões que vigiam essas mesmas superfícies**. Doze
estavam vermelhos, e enquanto vivem vermelhos não protegem nada.

**EM PRODUÇÃO — quatro commits, quatro guardiões, zero arquivos de produto
tocados** (`bed67be9`, `6a727de0`, `74d16464`, `14cc900f`; fila 0 depois de
cada um):

| guardião | era | ficou | causa real |
|---|---:|---:|---|
| `test-trial-balance-bridge` | **estourava** na 262ª de 418 | **289/289** | âncora morta na hierarquia do slot |
| `test-trial-post-video-primary` | 25/57 | **57/57** | recorte vazio + trava de preço reprovando a **prosa** |
| `test-credito-vitrine` | 1 falha em 15, depois estourava | **28/28** | forma (`<UiLabel>`) em vez de estrutura |
| `test-next-door-bar` | 25/3 | **28/28** | `\r\n` do Windows numa âncora de duas linhas |

**NENHUM ERA MEU, e eu provei antes de dizer:** criei uma worktree pristina em
`5f3803b1` (a ponta de quando esta rotação começou) e rodei os doze lá — os doze
já estavam vermelhos antes de eu tocar em qualquer arquivo (memória
`assercao-alheia-vermelha-se-reancora`).

**O QUE CADA UM ESTAVA ESCONDENDO — e o pior é o segundo.**

1. **A ponte estourava na verificação 262 de 418.** `check` usa `assert.ok`:
   a primeira falha **derruba o arquivo**. As outras ~60 verificações **nunca
   rodavam** — a superfície ficou sem proteção e ninguém viu, porque a saída
   parecia uma acusação e não uma parada. Re-ancorei na política executada
   (`decidePostDeliverySlot`) em vez de num texto: a exclusividade agora é
   provada por construção — um slot, um dono.
2. **A caixa que 228 pessoas/mês veem estava sendo lida como uma tela VAZIA.**
   O recorte do cartão casava com a hierarquia antiga escrita à mão; a string
   sumiu, `card` virou `''`, e **32 verificações falharam em cascata sobre zero
   caractere**. As 32 se liam como acusação grave ao produto — e o guardião
   nunca chegou a olhar para o produto.
3. **A trava de preço da mesma caixa reprovava a EXPLICAÇÃO.** Depois que a
   porta de $1 entrou ali hoje, dois **comentários** passaram a citar "$1" e a
   regra `!/\$\s*\d/` os reprovava. (Eu cometi o mesmo erro no meu próprio
   guardião uma hora antes — a cura é a mesma: julgar o código com os
   comentários fora, cortando `//` só no início da linha para não amputar
   `https://`.)
4. **E uma trava que estava viva mas sem dentes.** Na vitrine, "custo real > 0"
   não pegava erro de digitação: `creditCostFor` termina em `default: return 8`,
   então um motor inexistente devolve 8 e a home anunciaria "8 créditos" com
   cara de preço real. **Provado**: trocar `cinematic_ai` por
   `motor_que_nao_existe` deixava a suíte **verde**. Agora o id tem de ser um
   `case` declarado em `lib/credits/engineCost.ts`.

**TODOS FALSIFICADOS POR MUTAÇÃO NO ARQUIVO DE PRODUÇÃO, com a mutação
conferida em disco antes do julgamento** (memória
`mutacao-precisa-provar-que-aplicou`) — e uma das falsificações **não provou
nada na primeira tentativa**: o `<span>Only $9 today</span>` caiu dentro de um
bloco `{/* … */}` e foi corretamente removido pelo próprio stripper. Repeti em
código de verdade, e aí sim ficou vermelho. Restauração conferida nos quatro
(`git status` limpo, contagem de ocorrências em zero, suíte verde de novo).

**RESTAM OITO VERMELHOS HERDADOS, e estes NÃO são âncora óbvia** — não os toquei
porque acusam comportamento, e mexer em trava de dinheiro no fim de um ciclo é
como se quebra trava de dinheiro. A primeira falha de cada um, para quem pegar
amanhã: `test-animate-paywall` ("Cost per clip" derivado, não digitado) ·
`test-business-content-plan` (first idea carries to the existing generator) ·
`test-checkout-currency-truth` (visible home FAQ uses canonical disclosure) ·
`test-checkout-password-recovery` (ordinary password reset keeps its prior
destination) · `test-checkout-profile-read` (profile permission fields stay
unchanged) · `test-porta-serie-impressao-2026-09-05` · `test-rewrite-candidate-
offer` (devolve o TOTAL de frases da autora) · `test-stripe-checkout-failure-
truth` (PaymentIntent resolves billing reason).

**RISCO.** Zero em produção: os quatro commits mexem só em `scripts/`. O risco
é o oposto — um guardião re-ancorado por mim que afrouxe a trava sem eu notar.
Contra isso: cada um foi falsificado, e em dois casos a trava ficou **mais**
apertada do que era (a ponte prova a exclusividade por construção; a vitrine
passou a exigir motor declarado).

**A FRASE DA ROTAÇÃO.** Hoje as quatro superfícies onde a casa pede dinheiro
voltaram a ter vigia de verdade — três delas estavam sendo "vigiadas" por
guardiões que nem chegavam a ler a tela.
### #10 (fv, sessão B) — 21:38–22:38 BRT — gastei uma hora consertando três guardiões que a outra sessão consertou nos mesmos minutos

> **ENTRADA DE TRABALHO DUPLICADO. Zero linhas minhas foram para produção nesta
> rotação.** Escrevi duas versões anteriores deste texto reivindicando consertos;
> as duas estavam erradas e as reescrevi **antes de publicar**. O placar honesto:
> os **três** guardiões que consertei foram consertados em paralelo pela outra
> sessão da pista (`6a727de0` e `14cc900f`), e o meu commit de código chegou
> **vazio** na fila — o rebase o descartou sozinho, porque não restava diferença.

**O QUE EU FUI FAZER.** O checkpoint #11b da outra sessão listou doze guardiões
vermelhos e disse que **não** os consertaria. Fui olhar a lista com outra
pergunta — *algum está vermelho por causa da MINHA pista?* — e três estavam, os
três na tela de filme pronto:

| guardião | antes | causa |
|---|---|---|
| `test-trial-post-video-primary` | 25/57 | âncora da fv-r5 |
| `test-trial-balance-bridge` | estoura na 1ª (286 desligadas) | âncora da fv-r5 |
| `test-next-door-bar` | 25/28 | CRLF |

A causa dos dois primeiros **é da nossa pista**: a fv-r5 (`fa09b1eb`, 17:50)
trocou as guardas do JSX e os guardiões localizavam a caixa pela guarda antiga.
Desde as 17:50 a caixa que ~228 pessoas/mês veem estava sem teste. **O
diagnóstico continua valendo — o que não vale é a autoria do conserto.**

**A COLISÃO, nos dois tempos em que ela aconteceu.** Consertei os três,
falsifiquei por mutação do produto, commitei. O `enfileirar` bateu em **conflito
real** nos dois primeiros: ela tinha acabado de reancorá-los. Cedi a versão dela
— e num ponto a dela é **melhor**: a trava *"no literal dollar price"* me pegou
um preço escrito num comentário meu e eu **reescrevi o comentário**; ela ensinou
o teste a **ignorar comentários** (`cardCode`), que é a solução certa, porque
comentário não é copy de tela. Refiz a fila com só o terceiro guardião — e
**bateu em conflito de novo**: ela tinha consertado esse também, com a linha
**idêntica** à minha (`.replace(/\r\n/g, '\n')` na leitura). Cedi outra vez.

**NÃO MUDOU NADA EM PRODUÇÃO POR MINHA MÃO NESTA HORA.** Não há SHA de código
para citar aqui, e não vou citar o dela como se fosse meu. O que está no ar é o
trabalho dela; o que esta entrada acrescenta é diagnóstico e método.

**O QUE SOBREVIVE, e é a parte que ninguém mediu ainda.** Guardião escrito com
`assert`/`ok` **morre na primeira falha e leva a suíte inteira junto** — o do
bridge exibia *uma* linha de erro e escondia **285 verificações desligadas**.
Guardião com `check` perde só a linha. **Cinco dos doze são desse tipo**, e por
isso "12 vermelhos" **subestima** o buraco. Triagem dos nove que **ninguém**
tocou (são de outras pistas, e a de pagamentos está editando esses arquivos
agora):

| guardião | desligadas | 1ª falha |
|---|---|---|
| `test-business-content-plan` | ~56 | *first idea carries to the existing generator* |
| `test-checkout-password-recovery` | ~27 | *ordinary password reset keeps its prior destination* |
| `test-checkout-profile-read` | ~24 | *profile permission fields stay unchanged* |
| `test-checkout-currency-truth` | ~18 | *visible home FAQ uses canonical disclosure* |
| `test-stripe-checkout-failure-truth` | ~16 | *PaymentIntent resolves billing reason* |
| `test-animate-paywall` | 1 de 59 | "Cost per clip" derivado |
| `test-credito-vitrine` | 1 de 15 | âncora perdida |
| `test-porta-serie-impressao` | 3 | `href` em 3 telas |
| `test-rewrite-candidate-offer` | 1 | denominador |

**~141 verificações a mais estão desligadas** nos cinco do tipo `assert`. E o
padrão de reparo, medido nos três de hoje: **em nenhum o produto estava quebrado
— era sempre a âncora que envelheceu.**

**O MÉTODO QUE EU DEIXO REGISTRADO, porque vale para quem pegar os nove.**
Guardião que volta ao verde por mudança de âncora **tem de ser falsificado**,
senão troca-se um vermelho barulhento por um **verde mudo**, que é pior. Commitar
antes (o `git checkout --` do próprio teste apaga edição não commitada — memória
`falsificar-mutacao-commitar-antes`), mutar o **produto**, exigir vermelho,
restaurar, exigir verde. Fiz isso nos três antes de ceder: apagar a guarda da
caixa comercial derruba os dois primeiros; apagar os dois desarmes da barra
derruba o terceiro.

**A LIÇÃO DE GESTÃO, que é o item mais caro desta entrada.** Li o checkpoint dela
("**não os consertei**") e tratei aquilo como reserva durável. Não era — vinte
minutos depois ela mudou de ideia, e é direito dela. **Duas sessões na mesma
pista se coordenam por um documento que cada uma escreve uma vez por hora, e a
colisão acontece dentro da hora.** O que funcionou foi o resto do protocolo: o
`enfileirar` **não deixou ninguém sobrescrever ninguém** — parou com conflito e
exigiu decisão, exatamente como foi desenhado depois de 01/09. O que faltou é
barato: **antes de consertar arquivo que não é da sua entrega, `git log
origin/main --since='20 minutes ago' --name-only` e procurar o arquivo ali.**

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~6h):** entrega real **1** ·
filme pronto na tela **3 impressões / 2 pessoas** · baixou **0** · caixa
comercial **0** · porta de $1 vista **0** · checkout externo **0** · **pagou 0**.

**CHECAGEM ZERO (24h):** trial órfão **0** · render preso **0** · recusa sem
dono **0** · último `payment_success` **02/09 20:22 UTC** (jejum de 5 dias).

**A FRASE DA ROTAÇÃO.** Não tem. Um visitante novo não encontra hoje nada que não
encontrasse há uma hora **por minha causa** — e a regra do ciclo é que sem isso a
rotação não fechou. Esta não fechou.

**PRÓXIMA JOGADA.** O ciclo fecha às 23:38 e a próxima é a de fechamento. Duas
coisas valem mais que uma superfície nova: (1) rodar a suíte inteira na ponta
final e publicar o número honesto de verdes/vermelhos, depois de um dia em que
duas pistas subiram muito código; (2) deixar escrito que **nenhuma das cinco
portas de $1 criadas hoje foi vista por uma pessoa sequer** — o teste delas é o
tráfego de amanhã de manhã, não o desta madrugada.

**✅ O QUE VOCÊ PRECISA FAZER**
1. Nada.

**📋 O QUE ACONTECEU**
Esta hora não rendeu. Fui consertar três testes de segurança apagados que
guardavam a tela em que trabalhei hoje — dois deles quebrados por uma mudança da
nossa própria pista às 17:50, que deixou a caixa de venda de ~228 pessoas/mês sem
teste por quatro horas. A outra sessão que roda comigo consertou os três nos
mesmos minutos, e o meu trabalho chegou vazio na fila. Podia ter escondido isso
atrás de um resumo vago; prefiro que você saiba onde a hora foi. Duas coisas
salvo dela: o mecanismo de entrega funcionou como devia — parou com conflito em
vez de deixar uma sessão apagar a outra — e o diagnóstico dos nove testes que
continuam apagados, cinco dos quais escondem cerca de 141 verificações atrás de
uma única linha de erro, porque morrem na primeira falha. Nenhuma venda nova:
jejum de cinco dias, e nenhuma das portas de $1 criadas hoje foi vista por
alguém.

**ADENDO À #10 (21:55 BRT) — a rotação fechou depois de tudo, e com um conserto
de honestidade que ninguém quis.** Com 40 minutos restando, apliquei a lição que
acabei de escrever (`git log origin/main --since='25 minutes ago' --name-only`)
e descartei **três** alvos por já estarem tomados: os guardiões (a outra sessão
está varrendo a lista, `fv-r12` a `fv-r12e`), o `GenerateClient` de venda (ela
acabou de mexer na `fv-r11`) e o **e-mail de entrega** — que era a minha próxima
jogada declarada e que a pista de venda assistida **já entregou na `va-r5`**.
Terceira colisão evitada por uma consulta de 20 segundos.

**O QUE SOBROU, e é um defeito de verdade que eu mesmo declarei e ninguém
pegou.** Na #9 registrei no PEDIDOS que o botão de Starter da caixa "Want it
clean?" promete **"this video clean"** mesmo quando o navegador **não tem o
handoff** para reconstruir o arquivo — `handleRemoveWatermark` grava
`kineo_wm_unlock` só `if (lastFastRenderRef.current)` e segue para a Stripe de
qualquer jeito. Quem chega pela pílula de render ativo, pelo link do e-mail ou
depois de recarregar a página cai exatamente nesse estado: **paga, a assinatura
ativa, e o arquivo não volta limpo.** Eu não tinha consertado porque o botão é de
outra pista; passadas quatro horas e três rotações sem dono, prometer arquivo que
não volta é a definição de copy que mente — e o CLAUDE.md tem uma seção inteira
sobre isso.

**MUDOU — SHA `b085a815` · EM PRODUÇÃO.** Um predicado com **nome**
(`cleanExportRebuildReady = Boolean(lastFastRenderRef.current)`) governa agora as
**três** promessas da mesma caixa: a porta de $1 (que já o respeitava, com o
predicado anônimo) e os **dois** botões de plano, que não o respeitavam. Sem
handoff, o rótulo perde o `this video clean +` e mantém o que é verdade em
qualquer estado — `N credits every month`. **O botão não sai, não muda de lugar,
não muda de preço e não muda de checkout: some só a promessa que a casa não sabe
cumprir.**

**FALSIFICADO.** Devolver a promessa incondicional → guardião **vermelho**;
cravar o predicado em `true` mantendo o texto → **vermelho**; restaurado →
**verde**. `test-clean-export-trial-door` **52/52**. Os nove irmãos verdes,
`tsc` limpo. ⚠️ Uma nota para quem for mexer neste arquivo: o `test-next-door-bar`
(#47) reprova qualquer **diff não commitado** que toque preço/plano/crédito nesta
tela — ele lê `git diff HEAD`, não o produto. Ele acusou a minha edição enquanto
ela estava por commitar e voltou a 28/28 no instante do commit. **Não é defeito e
não deve ser afrouxado** — mas custa cinco minutos de susto a quem não sabe.

**A FRASE DA ROTAÇÃO — agora existe.** Quem chega na tela de filme pronto sem o
handoff no navegador (voltou pelo e-mail, pela pílula ou recarregou a página) não
lê mais uma promessa de que a assinatura devolve **este** arquivo limpo. Ontem, e
até as 21:55 de hoje, lia — e pagava por ela.

---

### #13 — 22:05 BRT — DOZE DE DOZE: A SUÍTE DE DINHEIRO E TRIAL VOLTOU A 94 VERDES / 0 VERMELHOS

Continuei a #12 até o fim. **82 verdes / 12 vermelhos → 94 verdes / 0
vermelhos**, `tsc` verde, e **nenhum arquivo de produto tocado em nenhum dos
doze** — os oito commits desta leva mexem só em `scripts/`.

| guardião | era | ficou | causa |
|---|---:|---:|---|
| `test-animate-paywall` | 1 falha | **61/61** | forma: `<UiLabel>` dentro do "Cost per clip" |
| `test-rewrite-candidate-offer` | 1 falha | **47/47** | expressão inline virou `const` nomeado |
| `test-porta-serie-impressao` | 4 falhas | **36/36** | as portas foram **embrulhadas**, não removidas |
| `test-checkout-profile-read` | estourava | **25/25** | **acusação legítima** — ver abaixo |
| `test-checkout-password-recovery` | estourava | **60/60** | destino `/generate` → `/studio` |
| `test-checkout-currency-truth` | estourava | **8158/8158** | adjacência literal quebrada por `<UiLabel>` |
| `test-stripe-checkout-failure-truth` | estourava | **67/67** | resolvedor ganhou 2º argumento |
| `test-business-content-plan` | estourava | **216/216** | destino `/generate` → `/studio/create` |

**ONZE ERAM FORMA. UM ERA VERDADE — e vale mais que os outros onze juntos.**
`test-checkout-profile-read` exigia que o `select` do checkout lesse
exatamente sete colunas de `profiles`. O commit de hoje que ligou o trial de $1
(`c902516f`) somou **quatro**: `video_credits`, `trial_credits_granted`,
`trial_credits_used`, `has_paid`. **A trava fez exatamente o que devia** — ela
existe para impedir que a rota de pagamento amplie em silêncio o que lê do
perfil. Conferi campo a campo que os quatro são consumidos (o `has_paid` é o
que o cobrador usa para recusar `?trial=1`; os outros três são o saldo do
trial), e então **atualizei a lista de propósito, com o motivo escrito** — não
afrouxei a regra. Falsifiquei nos **dois sentidos**: somar um campo ao `select`
deixa vermelho, remover um campo também.

**E UMA TRAVA QUE EU TENTEI E NÃO ENTREGUEI.** Quis somar ao mesmo guardião uma
segunda regra: cada campo lido tem de ser **consumido** na rota (ler dado de
`profiles` sem usar é ampliar permissão de graça). Ela passava com a rota real —
e **eu não consegui falsificá-la**: trocar o único uso de `has_paid` por
`is_pro` deixava a regra **verde**. Trava que não fica vermelha quando o defeito
existe é enfeite, então **ela não subiu**; ficou registrada como pendência
dentro do próprio arquivo, com a pista de por que a abordagem textual falha (a
rota lê esses campos por *cast*). Preferi um guardião menor e honesto a um
maior e decorativo.

**DUAS TRAVAS FICARAM MAIS APERTADAS DO QUE ERAM**, porque re-ancorar é a hora
de perguntar "o que isto deveria estar exigindo e não exigia":
- o webhook de recusa agora exige que o resolvedor de razão de cobrança seja
  **aguardado** — uma promessa não-aguardada ali gravaria `undefined` e a recusa
  entraria no banco sem saber se era renovação ou compra inicial, que é
  exatamente a distinção que o CLAUDE.md manda não perder;
- o reset de senha comum agora exige ser o **último** ramo, depois dos contextos
  de checkout e de criação — antes nada impedia que ele sequestrasse quem estava
  no meio de uma compra.

**O PADRÃO QUE SE REPETIU CINCO VEZES, e que vale mais que os doze consertos:**
guardião que casa com **FORMA** (`{creditLabel('x')}`, `{ANIMATE_COST} credits`,
duas frases grudadas, uma chamada com um argumento) morre no primeiro wrapper
ou no primeiro refactor honesto. Guardião que exige **ESTRUTURA** (o rótulo
deriva da constante; a decisão vem da política executada; o destino não é página
de marketing) sobrevive. Todos os doze foram falsificados por mutação no
**arquivo de produção**, com a mutação conferida em disco antes do julgamento —
e uma delas não provou nada na primeira tentativa porque caiu dentro de um
comentário.

**A FRASE DA ROTAÇÃO.** Hoje as travas que vigiam o dinheiro voltaram a ser
capazes de ficar vermelhas — onze delas estavam vermelhas por motivo nenhum, e
uma estava certa e ninguém tinha lido.

---

### #10b — 22:08 BRT — CHECKPOINT: o funil PÓS-CTA está mudo há 3h15 com tráfego ACIMA do normal — não é queda, e eu não consigo provar que não é

**NADA DE CÓDIGO.** Medição — e a retificação de uma leitura minha de duas horas
atrás, agora com controle de dia anterior em vez de só a linha de base de hoje.

**1. O QUE EU DISSE ÀS 21:08 E PRECISA DE AJUSTE.** No checkpoint #9b eu derrubei
o meu próprio alarme de "zero renders" comparando com **as outras horas de
hoje**. Com o controle certo — **a mesma hora de relógio nos 3 dias anteriores** —
o quadro muda:

| hora UTC | renders (média 3 dias) | renders hoje | landing (média) | landing hoje |
|---|---|---|---|---|
| 21 | 3,25 | **3** | 11,3 | 20 |
| 22 | 2,00 | **0** | 7,8 | 10 |
| 23 | 2,75 | **0** | 8,5 | 15 |
| 00 | 0,67 | **0** | 2,7 | 10 |

**A hora 21 foi normal.** Das 22h em diante esperavam-se ~5,4 renders e saíram
**0** — com o tráfego da landing **acima** da média em todas as horas. A leitura
"está dentro da variação de hoje" era fraca: variação de hoje inclui horas
mortas isoladas, não três seguidas contra tráfego acima da média.

**2. O DEGRAU EXATO ONDE O FUNIL PARA.** Todos os eventos **depois** do clique na
landing param no mesmo minuto, e o de antes continua vivo:

| evento | última ocorrência (UTC) | 6h | 24h |
|---|---|---|---|
| `landing_session_started` | **00:59 (agora)** | 87 | 348 |
| `organic_signup_handoff_viewed` | **00:00** | 3 | 27 |
| `organic_cta_clicked` | **21:46** | 6 | 35 |
| `generate_page_view` | 21:46 | 6 | 63 |
| `analyze_idea_clicked` | 21:48 | 6 | 52 |
| `video_generation_started` | 21:48 | 4 | 30 |

Contra a mesma janela de **ontem**: landing **35 vs 26** (mais hoje), eventos de
studio **0 vs 41**, renders **0 vs 11**, cadastros **0 vs 6**.

**3. O QUE JÁ ESTÁ DESCARTADO — sondado, não suposto.** `/` `200` · `/signup`
`200` · `/login` `200` · `/pricing` `200` · `/studio` `200` · `/studio/create`
`307` (deslogado, correto) · controle inexistente `404`. HTML da home com 350 KB
e o do signup com 43 KB — nada truncado. O JS do cliente **está rodando**: é ele
que emite `landing_session_started`, que continua chegando neste minuto.
`generation_stage_error`: **zero linhas em 6 horas**. Render preso **0**. E o
`organic_signup_handoff_viewed` disparou às **00:00 UTC — depois** do início do
silêncio, o que mostra que gente ainda atravessa a landing.

**4. O QUE EU NÃO CONSIGO DECIDIR, E POR QUÊ.** Faltam-me exatamente **duas**
informações para separar "noite magra com tráfego de robô" de "defeito sutil no
funil": `landing_session_started` **não carrega `ip_hash` nem UA**. Sem isso, 35
sessões podem ser 35 pessoas ou 3 crawlers — e eu já caí hoje, às 21:08, no
`count(distinct)` sobre um campo que não existe, que devolve um número com cara
de resposta. **Não vou repetir o erro na direção oposta declarando incidente.**
A estimativa honesta: com ~1,5 clique de CTA por hora nas últimas 24h, três horas
zeradas têm probabilidade de ~1% — **improvável, não impossível**.

**5. O TESTE QUE DECIDE, e ele é de amanhã de manhã.** Se às **09:00 BRT** o
funil pós-CTA voltar sozinho (`organic_cta_clicked` > 0 com tráfego normal), foi
a madrugada e não há defeito. **Se continuar zerado com a landing ativa, é
defeito** e o primeiro suspeito é o caminho landing → signup, não o render — o
servidor de render não recusou ninguém em 6 horas porque **ninguém pediu**.

**A INSTRUMENTAÇÃO QUE FALTA, e ela já foi pedida hoje por outra rotação.** O
checkpoint #11b da outra sessão propôs carimbar `ua` + `ip_hash` no
`checkout_attempted`. **O mesmo carimbo em `landing_session_started` responderia
esta pergunta para sempre** — e responderia também "quantos visitantes de
verdade a casa tem", que é a pergunta que o fundador faz há dias e que hoje só
tem resposta por estimativa.

**PLACAR DE FECHAMENTO — marco 2026-09-07 18:38 UTC (~6h30):** entrega real
**1** · filme pronto na tela **3** · baixou **0** · porta de $1 vista **0** ·
clique no $1 **0** · impressão com `slot_owner` **0** · checkout externo **0** ·
**pagou 0**.

**CHECAGEM ZERO (24h):** trial órfão **0** · render preso **0** · recusa sem
dono **0** · último `payment_success` **02/09 20:22 UTC**.

**✅ O QUE VOCÊ PRECISA FAZER**
1. **Amanhã de manhã, antes de qualquer coisa:** conferir se o funil voltou.
   Uma consulta responde — `organic_cta_clicked` e `video_generation_started` nas
   últimas 3 horas. Se estiverem zerados com a landing ativa, **isso passa na
   frente de qualquer superfície nova**.

**📋 O QUE ACONTECEU**
Checkpoint de medição, sem código. Refiz o alarme que eu mesmo tinha derrubado às
21:08, agora com o controle certo — a mesma hora nos três dias anteriores em vez
de só as outras horas de hoje — e ele fica de pé em parte: desde 21:48 UTC
ninguém clicou no botão da landing, ninguém se cadastrou e ninguém gerou vídeo,
enquanto o tráfego que chega na página inicial está **acima** da média. Não é
apagão: todas as páginas respondem, o JavaScript do site está rodando e o
servidor de render não recusou ninguém — simplesmente não pediram. Também não
posso garantir que seja só uma madrugada fraca, porque o evento da landing não
grava nada que distinga pessoa de robô. Deixei o teste que decide, para amanhã
cedo, e a instrumentação que resolveria isso de vez.

**ADENDO À #10 (22:15 BRT) — a pergunta que o checkpoint não soube responder
passa a ter resposta permanente.** O checkpoint #10b terminou com um "não sei"
honesto: 3h15 sem clique no CTA, sem cadastro e sem render, com a landing **acima
da média** — e sem como decidir entre madrugada de robô e defeito, porque
`landing_session_started` **não grava nada que distinga pessoa de varredor**. Um
"não sei" que se repete todo dia é um instrumento faltando, não uma dúvida.

**MUDOU — SHA `75ef30e4` · EM PRODUÇÃO.** O sink público de eventos
(`app/api/events/route.ts`, o ponto único por onde passa todo evento de
navegador) passa a carimbar **duas** chaves em cada linha: `ip_hash` (origem
pseudônima, para contar **visitantes** em vez de **sessões**) e `is_bot`.

**REUSO, NÃO CÓPIA.** As três funções — `clientIp`, `hashIp`, `isLikelyBot` — já
existiam e já são usadas pelo handoff do GPT e pelo episode-link. Importei-as.
Redigitar a regex de robô ou o hash criaria a segunda cópia que diverge e passa a
mentir onde ninguém audita (memória `a-regra-vive-em-varios-arquivos`).

**TRÊS DECISÕES DE PRIVACIDADE, deliberadas e travadas por teste:**
1. **IP cru nunca é gravado** — só `SHA-256(salt|ip)`, a mesma função do handoff.
2. **O user-agent inteiro nunca é gravado** — ele é lido, reduzido a um booleano
   e descartado. Guardar a string seria impressão digital de navegador, e esta
   medição não precisa disso.
3. **As duas chaves são escritas DEPOIS do `metadata` do cliente.** Se fossem
   antes, o navegador poderia sobrescrevê-las — e o carimbo que existe para
   separar robô de gente seria escrito pelo próprio robô.

**E O SINK CONTINUA SENDO ANALYTICS.** Nada passou a barrar nada: `is_bot` é
**etiqueta**, não porta (mesmo padrão do episode-link). O guardião **falha** se
alguém transformar o carimbo em bloqueio — analytics que interrompe funil é pior
que analytics ausente.

**TESTES.** `scripts/test-events-identity-stamp.mjs` **20/20**, com **5
mutantes**, cada um com prova de escrita: carimbar antes do cliente, gravar IP
cru, gravar o user-agent inteiro, voltar a gravar o metadata cru, e transformar o
carimbo em bloqueio. Nove irmãos verdes, `tsc` limpo.

**COMO MEDIR — e o corte é por CAMPO, nunca por relógio.** Linha com
`metadata ? 'ip_hash'` é de depois deste deploy; sem o campo, é de antes, e as
duas **não se misturam** (memória `campo-novo-e-o-carimbo-do-deploy`). A partir
de amanhã, "quantos visitantes a casa teve" responde-se com
`count(distinct metadata->>'ip_hash') filter (where metadata->>'is_bot' = 'false')`
— e a pergunta desta noite (madrugada magra ou funil quebrado?) responde-se
olhando se as sessões da landing são de gente ou de varredor.

**⚠️ AVISO DE ARQUIVO:** `app/api/events/route.ts` foi tocado hoje pela pista de
pagamentos (`pg-r7`, trilho Dodo). Minha edição é **aditiva** — dois campos e um
import; não mexi na lista `SERVER_ONLY_EVENTS`, no guarda de ambiente, nem no
caminho de erro.

---

### #17 — 22:35 BRT — ACHEI A CAUSA COMUM: O `<UiLabel>` DE 06/09 QUEBROU O ESTADO DOS GUARDIÕES POR FORMA, NÃO POR DEFEITO

Depois de consertar catorze travas, o padrão parou de ser coincidência e virou
uma causa datável. **Seis dos meus catorze consertos foram exatamente o mesmo
acidente**: a trava casava com um texto de tela e alguém envolveu esse texto num
`<UiLabel>`.

**A ORIGEM, com data e autor:** `<UiLabel>` entrou em **06/09**, pelos commits
`5aa0734a` e `6e30c986` do **Codex** ("add Spanish interface" / "extend Spanish
to Studio, Avatar and Animate controls"). Hoje são **500 ocorrências em 16
arquivos** — `StudioClient`, `LibraryClient`, `HistoryClient`, `KineoLanding`,
`AnimateClient`, `Sidebar`, `TopBar`, `MobileNav`, `Footer` e mais sete. É a
mudança certa para o produto (interface em espanhol) e não há nada a reverter.

**O CUSTO, medido:** a suíte inteira estava em **310 verdes / 115 vermelhos** na
base desta rotação. Está em **327 / 102** agora. E dos **102 que sobram, pelo
menos 25 leem um dos 16 arquivos que ganharam `<UiLabel>`** — ou seja, a maior
causa isolada do estado vermelho da casa não é defeito de produto: é um wrapper
de tradução que passou por baixo de travas que liam texto.

**O CONSERTO DESTA ROTAÇÃO** (`df48bdf9`): `test-avatar-card` acusava "nome do
site: Avatar" porque a etiqueta virou `<span className="tag"><UiLabel>Presenter
</UiLabel></span>`. O nome nunca mudou — a regra do CLAUDE.md continua cumprida.
Re-ancorado por estrutura, **11 ok / 0 fail**, e com uma trava que antes não
existia: o nome antigo "AI Presenter" não pode voltar ao card. Falsificado.

**ONDE PARAR, E POR QUÊ.** Olhei mais quatro dos 102 (`test-manrope-system`,
`test-library-search`, `test-studio-prompt-limit`, `test-free-limit-wall`) e
**não** são desta classe: acusam comportamento (navegação acima do teto, regra
de 16px anti-zoom do iOS, limite que só existe em comentário). Consertar trava
de comportamento em área que eu não trabalhei, no fim de um ciclo, é como se
quebra trava de dinheiro. Ficam nomeadas.

**A FRASE DA ROTAÇÃO.** Hoje a casa sabe POR QUE um quarto dos seus guardiões
está vermelho — e a resposta não é "o produto está quebrado", é "as travas leem
texto e o texto ganhou uma camada de tradução em 06/09".

**SONDA DO CARIMBO — feita em produção, e ela prova as três coisas que
importam.** Dois POSTs reais no sink, do mesmo lugar, com user-agents
diferentes. O primeiro **tentou forjar** o carimbo, mandando
`"ip_hash":"FORJADO_PELO_CLIENTE","is_bot":false` no metadata:

| variante | UA enviado | `is_bot` gravado | `ip_hash` gravado |
|---|---|---|---|
| bot (com `is_bot:false` forjado) | `KineoOpsProbe/1.0 (+bot; …)` | **`true`** | `67fc14c5443b…` |
| navegador | Chrome 128 | **`false`** | `67fc14c5443b…` |

1. **A etiqueta funciona:** o mesmo endpoint classificou robô e navegador
   corretamente.
2. **A forja não passa:** o cliente mandou `is_bot: false` e a linha gravada diz
   **`true`** — a precedência servidor-depois-do-cliente está de pé em produção,
   não só no guardião.
3. **A origem é estável:** os dois pedidos vieram do mesmo lugar e receberam o
   **mesmo** `ip_hash` — é isso que permite contar **visitantes** em vez de
   sessões. E `FORJADO_PELO_CLIENTE` não está em lugar nenhum.

As duas linhas de sonda estão nomeadas `ops_probe_identity_stamp` (não
`landing_session_started`), então **não contaminam nenhuma série do funil** —
qualquer consulta futura as exclui pelo nome.

---

## FECHAMENTO (sessão B) — 22:38–23:38 BRT · ciclo de 8h encerrado

### 📣 O QUE UM VISITANTE ENCONTRA ÀS 23:38 QUE NÃO ENCONTRAVA ÀS 15:38

Quem faz um filme hoje à noite e quer ficar com ele **sem a marca d'água**
encontra, pela primeira vez, uma porta que custa **um dólar** — e a encontra
**onde o desejo existe**, não numa página de preços que ninguém visita depois de
gerar um vídeo. São duas caixas diferentes, para as duas metades da plateia:
quem ainda está em trial vê a porta dentro da pergunta comercial da tela de filme
pronto; quem **já esgotou o trial** — a coorte maior, que até as 19:48 de hoje
levava o filme premium **limpo e de graça** — vê a mesma porta dentro da caixa
"Want it clean?", que até hoje só oferecia assinatura mensal cheia.

E duas coisas deixaram de mentir. O botão que vende o filme limpo **parou de
prometer "this video clean"** quando o navegador não tem como reconstruir o
arquivo (quem volta pelo e-mail, pela pílula de render ou recarrega a página).
E a casa **parou de confundir visitante com varredor**: cada evento passa a
carregar uma origem pseudônima e uma etiqueta de robô — sem gravar IP cru nem
user-agent.

### 📊 PLACAR DO CICLO — marco 2026-09-07 18:38 UTC → 02:38 UTC (contas externas)

| degrau | número |
|---|---|
| sessões na landing | **95** |
| cadastros | **4** |
| renders iniciados | **5** |
| pessoas com filme pronto na tela | **2** |
| baixaram | **0** |
| caixas de venda vistas | **0** |
| porta de $1 vista / clicada | **0 / 0** |
| checkout externo | **0** |
| **pagou** | **0** |

**Último `payment_success` da casa: 02/09 20:22 UTC — jejum de 5 dias.**

**A leitura honesta deste placar:** foi a janela de **menor tráfego útil** do
dia, e **nenhuma** das cinco portas de $1 criadas hoje pelas duas sessões foi
vista por uma pessoa sequer. Isso **não** as valida nem as condena — elas nasceram
com **zero oportunidades**. O teste delas é o tráfego de amanhã de manhã.

### ✅ O SUSTO DA NOITE — resolvido, e resolvido contra mim

Às 22:08 eu levantei um alarme: **3h15 sem um clique no CTA da landing, sem um
cadastro e sem um render**, com o tráfego da home **acima** da média das mesmas
horas dos 3 dias anteriores. Publiquei um "não sei" honesto e um teste para
amanhã. **O teste respondeu-se sozinho em uma hora:** `organic_cta_clicked`
voltou às **01:33 UTC** e um render começou às **01:35 UTC**. **Não era defeito
— era uma faixa magra da madrugada.** Fica registrado que o alarme era grande
demais para o dado que eu tinha, e que a linha de base é que decide.

### 🛠️ O CONSERTO DE UM DEFEITO QUE EU MESMO PUS NO AR HÁ 25 MINUTOS

Rodei a **suíte inteira** (430 guardiões) na ponta final, como prometi — e ela
me pegou. O `test-sharing-safety` estava **verde antes do meu commit e vermelho
depois**, com a mensagem certa: **"Unapproved import"**. Ele executa o sink de
eventos numa caixa com lista fechada de dependências, e eu tinha importado
`lib/gptHandoffStore` — que arrasta o cliente Supabase para dentro da rota de
analytics. **O guardião estava certo e o meu import estava errado.**

E ele achou um segundo defeito, pior: ele monta uma requisição **sem
cabeçalhos**, e o meu código fazia `req.headers.get('user-agent')` direto.
Como todo o corpo corre dentro de um `try`, o desfecho era **`ok: true` para o
cliente e o evento NÃO gravado, em silêncio** — o pior desfecho possível para
uma medição que existe justamente para contar.

**MUDOU — SHA `6534efeb`.** As três funções de identidade saíram para
`lib/requestIdentity.ts` — **puro, só `crypto`** — e `gptHandoffStore` passa a
**reexportá-las**, então todo chamador antigo continua igual e a regra continua
tendo **uma** fonte. A leitura do user-agent virou tolerante. Estendi o guardião
alheio em vez de só desbloqueá-lo: ele agora **exige** que a linha gravada
carregue o carimbo e **nunca** carregue IP cru. `test-sharing-safety` **70/70**,
`test-events-identity-stamp` **21/21**, `tsc` verde.

### 🔍 O NÚMERO QUE EU PROMETI, E A RESSALVA QUE ELE EXIGE

**Suíte completa na ponta final: 430 guardiões — 328 verdes, 102 vermelhos.**
O "doze vermelhos" que circulou hoje era o **subconjunto de dinheiro/trial**, não
a casa inteira. ⚠️ **Mas 102 não é "102 contratos quebrados"** — amostrei cinco e
os modos são diferentes: `test-runway` só pede `RUNWAY_API_KEY` (ambiente, não
defeito); `test-library-search` falha 1 de 22 por uma regra de CSS;
`test-manrope-system` e `test-free-limit-wall` acusam contrato de copy de
verdade. **Não transforme 102 em manchete sem classificar** — e vale lembrar o
que hoje ensinou três vezes: **em nenhum dos guardiões consertados hoje o produto
estava quebrado; era sempre a âncora que envelheceu.**

### ⏳ O QUE FICA ABERTO

1. **As cinco portas de $1 estão sem uma única impressão.** Prioridade absoluta
   de amanhã: medir, não construir a sexta.
2. **~141 verificações desligadas** em cinco guardiões do tipo `assert`, que
   morrem na primeira falha e escondem a suíte inteira. Nomeados no PEDIDOS.
3. **Duas sessões na mesma pista colidiram três vezes hoje.** O `enfileirar`
   segurou todas — ninguém sobrescreveu ninguém — mas custou-me uma hora.
4. **`test-gpt-handoff` e `test-topup-eligibility-handoff`** estão vermelhos e
   **já estavam antes** de eu tocar em qualquer coisa (falsifiquei na ponta
   anterior). Não são meus e não os consertei.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Amanhã de manhã, primeiro de tudo:** conferir se alguma das portas de $1 foi
   **vista** — `post_video_trial_1usd_shown` e `pricing_trial_1usd_clicked` nas
   últimas 12h. Se continuarem em zero **com tráfego normal**, o problema não é a
   oferta: é que ninguém chega até ela, e aí o alvo muda de superfície para
   aquisição.
2. **Use o carimbo novo** para responder a pergunta que você faz há dias:
   `count(distinct metadata->>'ip_hash')` com `is_bot = 'false'` dá **visitantes**
   de verdade, não sessões. Só vale para linhas com o campo — as antigas não têm.

### 📋 O QUE ACONTECEU

Oito horas, duas sessões na mesma pista e nenhuma venda nova — o jejum chega a
cinco dias. O que mudou de concreto para o cliente: quem quer o filme sem marca
d'água agora encontra uma porta de um dólar nos dois lugares onde esse desejo
aparece, e dois botões pararam de prometer coisas que a casa não sabia cumprir.
O que não mudou: ninguém passou por essas portas ainda, porque a janela da noite
teve 95 sessões na página inicial e apenas 2 pessoas chegando a ver um filme
pronto. Duas coisas que valem mais que a entrega: levantei um alarme de "funil
parado" que a própria linha de base derrubou uma hora depois — registrei o erro
em vez de deixá-lo passar — e a suíte completa de testes pegou um defeito que eu
mesmo tinha posto no ar 25 minutos antes, que teria feito eventos deixarem de ser
gravados em silêncio. Consertei, e ainda deixei o teste alheio mais exigente do
que estava. Amanhã a primeira pergunta não é o que construir: é se alguém vê o
que já foi construído.
