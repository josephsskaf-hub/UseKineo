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
