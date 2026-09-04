# PROGRAMA CODEX (ChatGPT) — 24h SÓ ASSINATURAS DE PESSOA FÍSICA (03/09/2026)

> Decisão do fundador (03/09, tarde): o Codex tem 99% da capacidade semanal
> sobrando (Pro, renova 10/09). Vai rodar 24h em paralelo com a sprint do Claude
> (`docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md`), em worktree separada, com a
> MESMA meta: mais pessoas físicas pagando um plano. O Claude é o cérebro da
> divisão; este arquivo é a divisão. Complementa, não substitui,
> `docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md`.

---

## 1. A DIVISÃO EM UMA LINHA

**Codex faz a pessoa que já viu o produto DECIDIR pagar. Claude faz o produto
ENTREGAR o primeiro filme e trazer a pessoa de volta.**

| | CODEX | CLAUDE |
|---|---|---|
| Tema | oferta, caixa, paywall, landing, canal, prova pública, idioma | render, gate de narração, cobrança, série, crons de resgate, e-mail de retorno, painel |
| Pista (arquivos) | `app/api/stripe/**`, `lib/checkoutPricing.ts`, `lib/growth/**`, `app/pricing`, `app/models-pricing`, landings públicas (`app/*` fora de `(dashboard)`), `components/UpgradeModal.tsx` (a caixa), `WelcomeOfferModal`, `ExitIntentOffer`, `CheckoutResumeBanner`, `ChatGptWelcomeBanner`, `app/v/[id]/**`, `app/llms.txt`, `lib/kineoFacts.ts`, `lib/comparisons.ts` | `app/(dashboard)/**`, `lib/compose.ts`, `app/api/compose/**`, `lib/cinematic/**`, `lib/hollywood/**`, `lib/narrationFit.ts`, `app/api/generate-video-*`, `app/api/analyze-idea`, `app/api/cron/**`, `app/api/admin/**`, `app/admin/**`, `lib/credits/**` |
| Entrega | branch `codex/*` → merge na main com Guardião verde (push direto, como hoje) | `bash scripts/enfileirar.sh` → fundador clica SUBIR-SITE.bat |
| Diário | `docs/HANDOFF-CODEX-CLAUDE-2026-09-03-ROUNDS-*.md` (como hoje) | `docs/SPRINT-ASSINATURAS-2026-09-03.md` |
| Zona compartilhada | `GenerateClient.tsx` (Codex: gate de plano/modal; Claude: fluxo/estados), `UpgradeModal` (Codex: caixa; Claude: gatilho), `engineCost.ts` (Codex: preço; Claude: custo). **Nunca no mesmo turno; quem vai mexer escreve no PEDIDOS antes.** |

**Fora do escopo dos DOIS por 24h:** B2B, agência, afiliados, Autopilot, packs
em lote, preço público, Stripe Dashboard, migrations, e-mail enviado.
Motivo: o fundador pediu pessoa física; o ciclo B2B de 72h do Codex fechou com
0 assinaturas dessa origem; afiliados têm 0 comissões na história.

---

## 2. O CONTRATO DE SINERGIA (o que faz os dois somarem, não colidirem)

1. **Mesmo marco zero, mesmo placar.** `created_at > '2026-09-03 16:00:00+00'`.
   As definições e o SQL canônico estão na seção 5. Os dois reportam os mesmos
   seis números, calculados do mesmo jeito. Se um número diverge entre os
   diários, o erro é de quem calculou diferente do SQL canônico.
2. **Ler o outro antes de escolher.** Codex lê o último `### #N` de
   `docs/SPRINT-ASSINATURAS-2026-09-03.md`; Claude lê o último
   `HANDOFF-CODEX-CLAUDE-2026-09-03-ROUNDS-*.md`. Jogada já feita ou em curso
   pelo outro = não escolher.
3. **Pedidos entre pistas** vivem em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`
   (criar na 1ª rodada de quem chegar primeiro). Formato, append-only:
   `- [ ] DE codex PARA claude · 16:40 · <o que precisa, em que arquivo, por quê,
   como medir>` → quem atende marca `[x]` com o SHA. Os dois leem o arquivo em
   toda rodada. É assim que o Codex pede "exponha o evento X na tela do
   resultado" e o Claude pede "o modal não pode abrir quando Y".
4. **Nada de reconstruir o que o outro entregou.** Antes de codar:
   `git fetch origin && git log origin/main --oneline -60 | grep -i <palavra>`
   e grep nos dois diários. Existe → a rodada MEDE, não refaz.
5. **Um dono por arquivo.** Precisa de arquivo da outra pista → PEDIDO, não
   edição. Correção certa na pista errada custa mais que a fricção.
6. **Rebase antes de todo push.** O Claude enfileira por cima do que o Codex
   subiu; o Codex rebasa por cima do que o fundador clicou. Conflito de código
   real = parar e escrever no PEDIDOS.
7. **Toda rodada entrega algo que um visitante VÊ ou que muda o caminho do
   caixa.** Medição só acompanhando a mudança que ela mede (regra do fundador
   de 03/09: "leitura, relatório ou variação da mesma superfície não é ação").

---

## 3. CARDÁPIO DO CODEX — ordem de retorno em assinaturas

Cada rodada pega UMA. Tamanho: P <1h · M 1-3h · G meio dia.

**K1 · Paywall só depois do 1º filme** — M, retorno máximo da pista.
Dado: 11 das 28 pessoas no checkout/7d tinham 0 vídeos e 25cr intactos, entre 0
e 6 min de conta. `upgrade_modal_opened` com `trial_ended`/`trial_spent` para
conta que nunca viu um filme seu é paywall cedo. Regra: com `videos_ok = 0` e
crédito ≥ custo do Kineo 1, a caixa NÃO oferece plano — oferece "Make it now
with Kineo 1 (fits your free credits)", 1 clique, motor Kineo 1, 35s. O plano só
aparece para quem já tem um filme. Se o gatilho (`outOfCredits()`) precisar
mudar, é PEDIDO ao Claude; a caixa é do Codex. **Medir:** `checkout_started`
com `videos_ok=0` → ~0; taxa checkout→pago com denominador limpo.

**K2 · Landing `/paste-your-script`** — M.
50 pessoas/14d chegam do ChatGPT com `finished_script`; a única assinante da
semana pagou antes de testar com texto colado. Página: caixa grande no alto,
"Paste your script. Pick a voice. Film in 3 minutes.", sem onboarding, sem
seletor de duração (o autofit do Claude decide), CTA de cadastro com o roteiro
preservado na query (o porteiro já repassa). Apontar de `/llms.txt`,
`lib/kineoFacts.ts`, `chatgptQuickstart` e do banner do ChatGPT. **Medir:**
`signup_surface='paste_script'` → 1º vídeo → checkout → pago.

**K3 · Checkout classificado: desejo × defeito × roteiro-pronto** — P.
Nos eventos de checkout e no plan_fit, gravar `videos_ok`, `credits_intact` e
`had_finished_script`. Três classes: desejo (tem filme), roteiro-pronto (0 filme
+ script colado = Cintia), defeito (0 filme, 0 input). K1 só age na terceira.
Sem isso, K1 esconde a oferta de quem quer pagar.

**K4 · A oferta no pico: 2º download** — P (zona compartilhada, PEDIDO antes).
Cintia baixou 2× e pagou; ninguém que baixa 2× é convidado. No 2º
`video_download` de conta free com crédito < 1 filme do motor usado, o
`plan_fit` aparece com o filme DELA como prova ("your next one, no watermark,
4K"). Pedir ao Claude a exposição do evento na tela do resultado; o card é do
Codex. Sem preço novo — só o botão que já leva ao checkout.

**K5 · ChatGPT é o canal que paga: aprofundar, não diversificar** — M.
3 dos 3 últimos assinantes vieram de lá. Rodada de conteúdo para máquina:
`/llms.txt`, `kineoFacts`, `comparisons` e páginas `/scripts/[vertical]`
respondendo literalmente "I have a script, which tool turns it into a video
with voice?" e "cheapest AI video from my own script" com K2 como resposta.
Sem página nova sem launcher (regra do Codex de 03/09): o launcher é o próprio
ChatGPT.

**K6 · TAAFT: converter quem ativa e não paga** — M (metade é do fundador).
51 cadastros/2d, 85% fazem vídeo, 0 pagam. No produto: `utm_source=taaft` cai
na mesma esteira do ChatGPT (roteiro-pronto em destaque, Kineo 1 padrão), e o
banner de boas-vindas deles fala do filme 2, não de review. Fundador: trocar
screenshot "Five engines" e texto "40cr/$9.90" (hoje 50cr/$7) no dashboard do
TAAFT. Codex deixa o texto e a imagem prontos em `docs/TAAFT-LISTING-2026-09-03.md`.

**K7 · "Made in 3 minutes from N words" no `/v/[id]`** — P.
Rodapé automático com tempo REAL (claim criado → completed) e contagem de
palavras do roteiro, + "try yours free". É o ângulo aprovado do pacote de
publicação virando página de aquisição sem copy nova. Prova, não promessa:
se o tempo real for 9 min, mostra 9.

**K8 · Idioma como prova no checkout** — P.
IN, NG, BR, DE, ES, FR dominam a lista de checkout. Quem fez filme em
hindi/português/alemão/espanhol vê no card do plano o próprio filme com
"narrated in [idioma] — every plan, every engine". A dúvida "funciona na minha
língua?" morre com o exemplo dela mesma.

**K9 · Checkout cancelado → filme grátis no motor que cabe** — P.
`checkout_cancelled_trial_delivery_offered` disparou 1× (03/09). Ligar de
verdade na tela de cancelamento: com 0 vídeos, botão "make your first film free
with Kineo 1" leva direto ao `/studio/create` com Kineo 1 marcado. É a saída
digna do K1 para quem já tinha chegado no caixa.

**K10 · `/made-with/[slug]` para cada vídeo do dia do fundador** — P.
Script original + botão "remix this one" (`exampleRemix` já existe). Cada
vídeo publicado nas 3 redes vira landing sem copy nova. Launcher: o link na
descrição do YouTube/TikTok do próprio fundador.

**K11 · Página de preço com o filme da pessoa** — M.
`pricing_view` = 36 pessoas/7d. Para logado com ≥1 filme, o topo da /pricing
mostra o filme dela e "your next N films with Starter". Prova pessoal em vez de
exemplo genérico. Sem tocar em número de preço.

**K12 · Trilho de decisão do fundador (não executar, deixar pronto):** Stripe
Adaptive Pricing ainda ligado em Live contradiz a decisão USD-only (handoff
287-288). Codex deixa o passo a passo de 1 tela em
`docs/STRIPE-ADAPTIVE-PRICING-OFF-2026-09-03.md`; o clique é do fundador.

---

## 4. PROTOCOLO DE RODADA DO CODEX (30 min, 48 ciclos, reserva de 20%)

1. `git fetch origin` · `git log origin/main --oneline -30` · ler o último
   `### #N` do diário do Claude · ler `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`.
2. Placar (SQL canônico da seção 5). Se houver PEDIDO do Claude aberto e
   viável em 30 min, ele vem primeiro.
3. Escolher a jogada K de maior retorno ainda não feita (K1, K3, K2, K4, K5, K9,
   K7, K8, K6, K11, K10, K12). Justificar com o número.
4. Worktree própria de origin/main. Código + teste + `npx tsc --noEmit` verde.
   Push em `codex/*`, merge na main só com Guardião verde. Nunca arquivo da
   pista do Claude. Nunca preço, migration, e-mail, Stripe Dashboard.
5. Handoff da rodada no formato atual (`ROUNDS-N`), com: dado que doía, o que
   mudou (arquivos), como medir, placar, próximo item, e PEDIDOS novos ao Claude.
6. A cada 6 rodadas (3h), uma rodada de MEDIÇÃO PURA: o que as 6 anteriores
   mudaram no placar contra o marco zero. Sem código. É a reserva de 20%.
7. Nunca esperar o fundador. Decisão que seria dele → padrão mais seguro,
   registrado como reversível. O que só ele pode fazer → lista ✅ no handoff.

---

## 5. PLACAR CANÔNICO (os dois usam este SQL, contas externas)

```sql
-- externos = não interno
with ext as (
  select id, email, created_at, plan, has_paid, video_credits,
         coalesce(nullif(signup_utm_source,''), nullif(utm_source,''), 'direto') origem
  from profiles
  where email not ilike '%josephsskaf%' and email not ilike '%usekineo%' and email not ilike '%kineo.local'
),
marco as (select '2026-09-03 16:00:00+00'::timestamptz t)
select
  (select count(*) from ext, marco where ext.created_at > marco.t) cadastros,
  (select count(distinct v.user_id) from videos v join ext on ext.id=v.user_id, marco where v.status='completed' and v.created_at > marco.t) pessoas_com_filme,
  (select count(distinct e.user_id) from events e join ext on ext.id=e.user_id, marco where e.name='checkout_started' and e.created_at > marco.t
     and exists (select 1 from videos v where v.user_id=e.user_id and v.status='completed')) checkout_desejo,
  (select count(distinct e.user_id) from events e join ext on ext.id=e.user_id, marco where e.name='checkout_started' and e.created_at > marco.t
     and not exists (select 1 from videos v where v.user_id=e.user_id and v.status='completed')) checkout_sem_filme,
  (select count(distinct e.user_id) from events e join ext on ext.id=e.user_id, marco where e.name='checkout_success_viewed' and e.created_at > marco.t) assinaturas,
  (select count(distinct e.user_id) from events e join ext on ext.id=e.user_id, marco where e.name='generation_stage_error' and e.created_at > marco.t
     and not exists (select 1 from videos v where v.user_id=e.user_id and v.status='completed')) pessoas_falha_sem_filme;
```
Assinatura = `checkout_success_viewed` de externo (cruzar com `has_paid` na
dúvida). Sessão, clique, abertura de e-mail e impressão NÃO são assinatura.

---

## 6. PROMPT PARA COLAR NO CODEX (ChatGPT)

```
Você é a pista GROWTH-B2C da Kineo (usekineo.com), rodando 24 horas em ciclos de
30 minutos, de 03/09 ~17:00 até 04/09 ~17:00 BRT, em paralelo com a sprint do
Claude. Repositório: josephsskaf-hub/UseKineo, main. Trabalhe SEMPRE numa
worktree própria criada de origin/main atualizado; nunca na árvore principal.

AUTORIZAÇÃO DO FUNDADOR PARA ESTA JANELA (vale como o "explícito" do
AGENTS.md §3.2): modificar código e docs DENTRO da sua pista; commit; push em
branches codex/*; merge na main com `npx tsc --noEmit` verde e Guardião verde;
SQL SOMENTE LEITURA no Supabase. CONTINUA PROIBIDO: preço, oferta ou promessa
nova; Stripe Dashboard; migration ou escrita em banco; e-mail, mensagem ou
rascunho; apagar dado; gastar crédito; tocar em arquivo da pista do Claude.

LEIA ANTES DE QUALQUER AÇÃO, nesta ordem: AGENTS.md ·
docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md ·
docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md (seu programa: pista, cardápio
K1-K12, protocolo, SQL canônico) · docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md
(o plano do Claude, para não repetir) · último docs/SPRINT-ASSINATURAS-
2026-09-03.md "### #N" · docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md (crie se não
existir).

MISSÃO ÚNICA: pessoas físicas pagando um plano. Cadastro, sessão, clique e
vídeo são meio; assinatura é o fim. B2B, agência, afiliados, Autopilot e packs
estão FORA por 24h.

CADA RODADA: (1) fetch + log da main + diário do Claude + PEDIDOS; (2) placar
com o SQL canônico da seção 5 do programa; (3) PEDIDO aberto do Claude viável
em 30 min vem primeiro; senão a jogada K de maior retorno ainda não feita, na
ordem K1, K3, K2, K4, K5, K9, K7, K8, K6, K11, K10, K12, justificada com o
número; (4) anti-repetição: grep no log da main e nos dois diários pela
palavra-chave — já existe → medir, não refazer; (5) executar INTEIRA: código +
teste + tsc + push codex/* + merge com Guardião verde; toda rodada entrega algo
que um visitante vê ou que muda o caminho do caixa — medição só acompanhando
a mudança que ela mede; (6) handoff ROUNDS-N com dado que doía, arquivos,
como medir, placar, próximo item, PEDIDOS novos ao Claude (append no arquivo
PEDIDOS, formato `- [ ] DE codex PARA claude · hora · o quê/arquivo/por quê/
como medir`); (7) a cada 6 rodadas, uma rodada só de medição contra o marco
zero 2026-09-03 16:00 UTC, sem código.

AUTONOMIA TOTAL: o fundador não está na tela. Nunca pergunte, nunca espere.
Decisão que seria dele → padrão mais seguro, registrado como reversível. O
que só ele pode fazer (TAAFT, Stripe, clicar) → lista ✅ no handoff, e siga.

ZONA COMPARTILHADA (GenerateClient gate/modal, UpgradeModal caixa,
engineCost preço): escreva no PEDIDOS antes de tocar e só toque se o Claude
não tiver commit nas últimas 2 rodadas nesse arquivo. Gatilho, fluxo e custo
são do Claude — se precisar deles, é PEDIDO.

Feche cada rodada com: PRÓXIMA JOGADA · ✅ O QUE VOCÊ PRECISA FAZER (só o que
depende do fundador; "Nada." se nada) · 📋 O QUE ACONTECEU (curto, linguagem
de dono). Depois de 04/09 17:00 BRT: handoff de fechamento (placar final
contra o marco zero, K entregues, K pendentes, pedidos abertos) e pare.
```

---

## 7. ADENDO 03/09 20:40 BRT — FRENTE F: FLUXO (o Codex ganha o topo do funil)

Contexto: a tarefa agendada do Codex NÃO disparou às 17:00 (zero commits até
20:30). O Claude entregou 5 jogadas e deixou 5 pedidos abertos. Nas 24h até
20:30 o ChatGPT caiu de 16 para 8 cadastros — é o único canal que paga.
Ninguém está trabalhando em VISITANTE NOVO. Esta frente entra ANTES de K5/K6
e vale para a sessão de trabalho longo que o fundador abrir à noite.

**Ordem nova para o Codex:** os 5 pedidos abertos em PEDIDOS-ENTRE-PISTAS →
K1 → F1 → K2 → F2 → K3 → F3 → resto do cardápio.

**F1 · Por que o ChatGPT caiu pela metade hoje** — P, só leitura + correção.
Medir por hora `landing_session_started` e cadastros com origem chatgpt nos
últimos 3 dias; conferir se `/llms.txt`, `lib/kineoFacts.ts`, `lib/comparisons`
e as páginas `/scripts/[vertical]` e `/free-script-generator` continuam
respondendo 200 e sem regressão de copy depois dos deploys de hoje (7 na main);
conferir `robots`/`sitemap`. Se algo quebrou, consertar na hora. Se nada
quebrou, registrar "queda orgânica, não nossa" com o dado.

**F2 · Pacote de conteúdo diário pronto para o fundador postar** — P.
Todo dia às 18:00 BRT o Codex deixa em `docs/VIDEO-DO-DIA-<data>.md`: 1 tema
de alto potencial (vertical mistério/história/lugares, 150-165 palavras, 60s),
o script no bloco de código sozinho, a linha ⚙ Config, e o pacote de
publicação no modelo do Lago Natron (YouTube título/descrição/comentário fixado,
TikTok legenda/comentário, horário 19-21h BRT). O vídeo do dia é o único
tráfego que a casa controla e hoje não saiu.

**F3 · TAAFT: listing novo pronto para colar** — P.
`docs/TAAFT-LISTING-2026-09-03.md`: texto do listing (50cr grátis, from $7,
8 motores, 3 minutos, roteiro pronto vira filme), 3 legendas de screenshot e
a lista exata das telas a capturar (home com os 4 cards, /studio com custo no
botão, resultado com download). O fundador cola no dashboard do TAAFT.

**F4 · Landing por idioma para os países que chegam ao checkout** — M.
IN/NG/BR/DE/ES/FR dominam. Versões `/es`, `/pt-br`, `/de` da landing
"cole seu roteiro" (K2) com exemplo narrado no idioma, apontadas no llms.txt.
Sem página sem launcher: o launcher é a resposta do ChatGPT em cada idioma.

**F5 · Cada pessoa que fez filme vira um link público que traz gente** — P.
Depois de K7 (rodapé "made in N minutes"), o e-mail "Your Short is ready"
(pista do Claude — PEDIDO) e a tela do resultado (Codex) oferecem o link
`/v/[id]` com o botão de compartilhar em cima, não embaixo. Medir
`share_clicked` → `landing_session_started` com `ref=v`.

---

## 8. V2 MAJORADA — 03/09 21:00 BRT (pedido do fundador: "mais vezes em 24h, mais gente comprando")

### 8.1 O que muda

| | v1 (tarde) | **v2 (noite)** |
|---|---|---|
| Sessões do Codex | 1 | **2 em paralelo: CAIXA e FLUXO**, worktrees e branches separadas |
| Cadência | a cada 30 min, com espera | **contínua: acabou uma rodada, começa a próxima; rodada ≤ 20 min** |
| Rodadas em 24h | 48 | **~120-140 somadas** |
| Medição | a cada 6 rodadas | **a cada 4 rodadas por sessão + vigia do checkout em TODA rodada** |
| Fonte de jogada | cardápio fixo | cardápio + **as pessoas reais que chegaram ao checkout e não pagaram nas últimas 2h** |

As duas sessões não se tocam por arquivo:

| sessão | dona de | branches | handoff |
|---|---|---|---|
| **CAIXA** | `components/UpgradeModal.tsx`, `WelcomeOfferModal`, `ExitIntentOffer`, `CheckoutResumeBanner`, `app/pricing`, `app/models-pricing`, `app/api/stripe/**` (só leitura de sessão/webhook, nunca preço), `lib/growth/checkout*`, `lib/growth/planFit*`, `lib/growth/inlinePricing*`, `lib/growth/limitPurchaseFit`. `app/(dashboard)` NÃO (é do Claude; gate de plano dentro do GenerateClient = PEDIDO) | `codex/caixa-*` | `docs/HANDOFF-CODEX-CAIXA-2026-09-03.md` (um arquivo, append) |
| **FLUXO** | landings públicas (`app/*` fora de `(dashboard)`, `pricing`, `models-pricing`), `app/v/[id]/**`, `app/llms.txt`, `lib/kineoFacts.ts`, `lib/comparisons.ts`, `lib/growth/chatgpt*`, `lib/growth/engineLanding*`, `lib/growth/exampleRemix`, `app/share-to-kineo`, `ChatGptWelcomeBanner`, `PhWelcomeBanner`, `docs/VIDEO-DO-DIA-*`, `docs/TAAFT-*` | `codex/fluxo-*` | `docs/HANDOFF-CODEX-FLUXO-2026-09-03.md` (um arquivo, append) |

Os dois leem `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` e o diário do Claude em
toda rodada. Pedido CAIXA↔FLUXO também vai no mesmo arquivo (`DE codex-caixa
PARA codex-fluxo`). Merge na main sempre com rebase + tsc + Guardião verde; se a
main andou (o outro Codex ou o clique do fundador), rebase de novo antes de
empurrar. Nunca force.

### 8.2 VIGIA DO CHECKOUT — obrigatório em TODA rodada, das duas sessões

SQL só leitura, contas externas, últimas 2 horas: toda pessoa com
`checkout_started` ou `checkout_attempted` e sem `checkout_success_viewed`.
Para cada uma, a trilha (`events` dela em ordem, 30 min antes e depois): de
onde veio, quantos filmes tem, crédito, qual plano abriu, o que viu depois
(cancelou? sessão expirou? voltou ao studio? fechou a aba?). Classificar:
**desejo** (tem filme) · **roteiro-pronto** (0 filme + `finished_script`) ·
**defeito** (0 filme, 0 input). A rodada escreve no handoff 1 linha por pessoa
e escolhe a jogada a partir do padrão que mais se repetiu. Regra: pessoa real
vale mais que cardápio. Nunca escrever para ela (e-mail é proibido); a jogada
é no produto, para a próxima igual a ela.

### 8.3 CARDÁPIO ADICIONAL (v2) — o ato de pagar

**K13 · Sessão do Stripe expirada = a pessoa abriu o caixa e foi embora** — CAIXA, P.
7 dias: 17 pessoas com `checkout_session_expired`, 19 viram o banner de retomada,
14 fecharam o banner. O banner pede para "continuar"; ninguém continua. Trocar
por: o filme dela + "your film is ready to publish without watermark — finish
in 30s" + o plano que ela abriu, sem seletor. Medir `checkout_resume_banner_
viewed` → `checkout_started` da mesma pessoa em 24h (linha de base: ~0).

**K14 · Cancelou no Stripe → objeção com 3 botões, não 1 banner** — CAIXA, P.
`checkout_cancelled` 6 pessoas/7d, 0 voltaram. Na volta do cancelamento: "What
stopped you?" com 3 respostas de 1 clique (too expensive now · wanted to test
more first · payment issue) e cada resposta leva a uma resposta do produto que
JÁ existe (test more → filme grátis no Kineo 1; payment → guia de pagamento
`checkoutPaymentGuidance`; expensive → nada de desconto, mostra o custo por
filme já calculado). Grava `checkout_objection`. É a primeira medição honesta
da objeção: hoje a conclusão "é preço" vem de 19/08 sem pergunta feita.

**K15 · O checkout mostra o filme da pessoa** — CAIXA, P (auditar antes: `lib/growth/checkoutVisualProof.ts` existe).
Medir impressões→pago da prova visual que já existe. Se a prova é genérica,
trocar pelo último filme DELA (thumb + tema) ao lado do botão de pagar. Se já
é dela, medir e registrar, não refazer.

**K16 · A oferta certa por número de filmes** — CAIXA, M.
Quem tem 1 filme vê "make episode 2" antes de qualquer plano; quem tem 2+ vê o
plano com "your next N films". Hoje o pós-vídeo mostra plano para todo mundo
igual. Auditar `chatgptPostVideoOffer`, `historyFirstVideoOffer`,
`postvideo-*` do Codex antes: provavelmente metade existe e não está medida.

**K17 · Preço em filmes, não em créditos, em TODA superfície de venda** — CAIXA, P.
`/models-pricing` já fala em filmes. `UpgradeModal`, banners e `plan_fit`
ainda falam "credits". Trocar a unidade (sem mudar número): "Starter = ~12
Kineo 1 films/mo" usando `engineCost` como fonte (só leitura). Créditos são
abstração nossa; filme é o que a pessoa compra.

**K18 · Landing do canal que paga, na língua da resposta** — FLUXO, M.
O ChatGPT responde em espanhol para espanhol, em alemão para alemão. Para cada
um dos 4 idiomas dos países que chegam ao checkout (es, pt-BR, de, fr), uma
versão da landing "cole seu roteiro" (K2) com exemplo narrado no idioma,
listada no `/llms.txt` com `hreflang`. Sem página sem launcher: o launcher é
a resposta do ChatGPT no idioma.

**K19 · A página /v/ de cada filme pede cadastro no fim do vídeo** — FLUXO, P.
`/v/[id]` recebe visitante de fora (compartilhamento). Ao terminar o vídeo:
overlay "Made in N minutes from N words. Make yours free" com o botão de
cadastro que preserva `ref=v:<id>`. Medir `landing_session_started` com
`ref=v` → cadastro → filme → pago.

**K20 · O que o TAAFT mostra a 24 pessoas por dia** — FLUXO, P.
Além do texto (F3): lista das 3 capturas de tela a fazer, com a URL exata e o
que precisa estar visível (home com os 4 cards de motor girando; /studio com o
custo no botão; tela do resultado com download). O fundador captura e cola.
Enquanto o listing mentir, o TAAFT continua sendo o canal que ativa e não paga.

### 8.4 PROMPT — SESSÃO CAIXA

```
Você é a sessão CODEX-CAIXA da Kineo (usekineo.com). Trabalho contínuo até
04/09 21:00 BRT: acabou uma rodada, começa a próxima, sem esperar; cada rodada
dura no máximo 20 minutos e entrega UMA coisa que quem está no caminho de pagar
VÊ. Repositório josephsskaf-hub/UseKineo, main. Worktree própria de origin/main
atualizado; branches codex/caixa-*; merge na main com rebase + `npx tsc --noEmit`
verde + Guardião verde; nunca force.

AUTORIZAÇÃO DO FUNDADOR (o "explícito" do AGENTS.md §3.2): código e docs na sua
pista; commit; push; merge; SQL só leitura no Supabase. PROIBIDO: número de preço,
oferta ou desconto novo; Stripe Dashboard; migration/escrita em banco; e-mail,
mensagem ou rascunho; apagar dado; gastar crédito; arquivo do Claude
(app/(dashboard), compose, cinematic, cron, admin, credits) ou da sessão FLUXO.

LEIA ANTES: AGENTS.md · docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md ·
docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md INTEIRO (seções 1-8; a 8 manda) ·
docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md · último "### #N" de
docs/SPRINT-ASSINATURAS-2026-09-03.md · docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md
· docs/HANDOFF-CODEX-CAIXA-2026-09-03.md (crie se não existir).

SUA PISTA: UpgradeModal (a caixa), WelcomeOfferModal, ExitIntentOffer,
CheckoutResumeBanner, /pricing, /models-pricing, lib/growth/checkout*,
planFit*, inlinePricing*, limitPurchaseFit, leitura de sessões Stripe. Gate de
plano dentro do GenerateClient e o gatilho do modal são do Claude → PEDIDO.

MISSÃO: pessoas físicas pagando um plano. Sessão, clique e vídeo são meio.

CADA RODADA: (1) git fetch + log da main + PEDIDOS + diário do Claude; (2)
VIGIA DO CHECKOUT (programa §8.2): toda pessoa externa que abriu checkout nas
últimas 2h e não pagou — trilha, classe (desejo / roteiro-pronto / defeito),
1 linha por pessoa no handoff; (3) placar com o SQL canônico (§5); (4) pedido
aberto para você vem primeiro; senão a jogada: o padrão que mais repetiu no
vigia manda; empate → ordem K1, K3, K13, K14, K15, K17, K16, K4, K9, K8, K11;
(5) anti-repetição: grep no log da main (-80) e nos handoffs; o Codex de 02-03/09
deixou dezenas de superfícies em lib/growth — se existe, MEDIR
impressão→clique→pago e consertar ou matar, não recriar; (6) executar inteira:
código + teste + tsc + push + merge; (7) handoff: dado que doía, pessoas do vigia,
o que mudou (arquivos), como medir, placar, próximo item, PEDIDOS novos; (8) a
cada 4 rodadas, uma só de medição: o que as 4 anteriores mudaram no placar.

AUTONOMIA TOTAL: o fundador não está na tela. Nunca pergunte, nunca espere,
nunca pause. Decisão dele → padrão mais seguro, registrado como reversível. O
que só ele faz → lista ✅ no handoff, e siga. Feche cada rodada com PRÓXIMA
JOGADA · ✅ O QUE VOCÊ PRECISA FAZER · 📋 O QUE ACONTECEU. Depois de 04/09
21:00 BRT: handoff de fechamento e pare.
```

### 8.5 PROMPT — SESSÃO FLUXO

```
Você é a sessão CODEX-FLUXO da Kineo (usekineo.com). Trabalho contínuo até
04/09 21:00 BRT: acabou uma rodada, começa a próxima, sem esperar; cada rodada
dura no máximo 20 minutos e entrega UMA coisa que traz ou converte VISITANTE
NOVO. Repositório josephsskaf-hub/UseKineo, main. Worktree própria de
origin/main atualizado; branches codex/fluxo-*; merge na main com rebase +
`npx tsc --noEmit` verde + Guardião verde; nunca force.

AUTORIZAÇÃO DO FUNDADOR (o "explícito" do AGENTS.md §3.2): código e docs na sua
pista; commit; push; merge; SQL só leitura no Supabase. PROIBIDO: número de
preço, oferta ou desconto novo; Stripe; migration/escrita em banco; e-mail,
mensagem, post ou rascunho enviado; apagar dado; gastar crédito; arquivo do
Claude ou da sessão CAIXA.

LEIA ANTES: AGENTS.md · docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md ·
docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md INTEIRO (seções 1-8; a 8 manda) ·
docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md · último "### #N" de
docs/SPRINT-ASSINATURAS-2026-09-03.md · docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md
· docs/HANDOFF-CODEX-FLUXO-2026-09-03.md (crie se não existir).

SUA PISTA: landings públicas fora do (dashboard), /v/[id], /llms.txt,
kineoFacts, comparisons, lib/growth/chatgpt*, engineLanding*, exampleRemix,
share-to-kineo, ChatGptWelcomeBanner, PhWelcomeBanner, docs/VIDEO-DO-DIA-*,
docs/TAAFT-*. Checkout, pricing e modais são da sessão CAIXA → PEDIDO.

MISSÃO: mais gente certa entrando (ChatGPT é o canal que paga: 3 dos 3 últimos
assinantes; caiu de 16 para 8 cadastros hoje) e cada visitante virando
cadastro com roteiro na mão.

CADA RODADA: (1) git fetch + log da main + PEDIDOS + diário do Claude; (2)
VIGIA DO CHECKOUT (programa §8.2), você também lê, para saber DE ONDE vêm os
que quase pagam; (3) placar canônico (§5) + cadastros por origem nas últimas
2h; (4) pedido aberto para você vem primeiro; senão a ordem: F1 (por que o
ChatGPT caiu hoje: regressão nossa ou orgânico), K2, F2 (pacote do vídeo do
dia ANTES das 18:00 BRT de 04/09, e um hoje ainda se der tempo), F3+K20
(listing e capturas do TAAFT), K5, K7, K19, K18, F4, K10, F5; (5)
anti-repetição: grep no log da main e nos handoffs; página sem launcher é
proibida: o launcher é a resposta do ChatGPT, o link do vídeo do dia ou o
/v/ compartilhado; (6) executar inteira: código + teste + tsc + push + merge;
(7) handoff: dado, o que mudou, como medir, placar, próximo item, PEDIDOS;
(8) a cada 4 rodadas, uma só de medição contra o marco zero.

AUTONOMIA TOTAL: nunca pergunte, nunca espere, nunca pause. O que só o
fundador faz (postar vídeo, editar TAAFT) → lista ✅ com o material PRONTO
para colar. Feche cada rodada com PRÓXIMA JOGADA · ✅ O QUE VOCÊ PRECISA FAZER
· 📋 O QUE ACONTECEU. Depois de 04/09 21:00 BRT: handoff de fechamento e pare.
```

### 8.6 INCREMENTO PARA A SESSÃO QUE JÁ ESTÁ RODANDO (colar na conversa existente)

O fundador prefere não abrir sessão nova: a sessão do Codex que já recebeu o
prompt da seção 6 recebe este incremento. Ela mesma decide se abre a pista
FLUXO como segunda tarefa paralela (se o ambiente permitir) ou se alterna
CAIXA/FLUXO rodada sim, rodada não. O texto está na resposta do Claude de
03/09 21:00 e reproduzido aqui para registro:

```
INCREMENTO (fundador, 03/09 21:00 BRT). Continue com o prompt anterior; o que
muda é frequência e intensidade:
1. git fetch origin e releia docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md
   INTEIRO. A seção 8 manda sobre as anteriores.
2. CADÊNCIA: sem espera entre rodadas. Acabou uma, começa a próxima. Rodada
   de no máximo 20 minutos. Até 04/09 21:00 BRT.
3. DUAS PISTAS: CAIXA (§8.4) e FLUXO (§8.5). Se o ambiente permite tarefas
   paralelas, abra FLUXO como segunda tarefa em worktree e branch próprias
   (codex/fluxo-*) e siga em CAIXA nesta. Se não permite, alterne: rodada
   ímpar CAIXA, rodada par FLUXO, cada uma com seu handoff.
4. VIGIA DO CHECKOUT em toda rodada (§8.2): quem abriu o caixa nas últimas
   2h e não pagou, trilha e classe. Pessoa real manda sobre cardápio.
5. ORDEM: os 5 pedidos abertos em docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md
   vêm primeiro (todos prontos). Depois CAIXA: K1, K3, K13, K14, K15, K17,
   K16; FLUXO: F1, K2, F2, F3+K20, K5, K7, K19, K18.
6. Até agora (13:21→21:00) não há nenhum commit seu na main. A primeira
   rodada desta noite precisa terminar com um merge na main com Guardião
   verde; se algo impede (permissão, sandbox, conflito), escreva no handoff
   O QUE impede, em uma linha, e siga para a próxima jogada que não dependa
   daquilo.
7. Tudo o mais continua: autonomia total, sem pergunta, sem preço, sem
   e-mail, sem arquivo do Claude, handoff a cada rodada com ✅ e 📋.
```

### 8.7 CORREÇÃO DA F2 (fundador, 03/09 23:10 BRT) — ele NÃO quer roteiro

Palavras dele: *"antigamente eu pedia pra ele escrever pra mim um roteiro. Mas
hoje em dia eu busco no Google, e eu mesmo coloco no site, sai um vídeo
perfeito. A única coisa que eu peço é pra ele me descrever legendas, descrições,
e daí ele coloca tudo no YouTube e no TikTok."*

**A F2 muda de conteúdo.** O pacote diário NÃO leva mais tema nem roteiro — o
fundador escolhe o tema sozinho e o produto faz o filme. O que falta, e o que
o pacote deve conter, é só a camada de publicação:

- legenda de tela (on-screen)
- título e descrição do YouTube, no modelo do Lago Natron (CLAUDE.md)
- comentário fixado do YouTube
- legenda e comentário fixado do TikTok
- hashtags e horário (19-21h BRT)

E o pacote não nasce de um tema inventado: ele nasce **do filme que o fundador
acabou de fazer** — ou seja, é uma FUNÇÃO DO PRODUTO, não um documento. A
jogada certa deixa de ser "escrever um .md por dia" e passa a ser: na tela do
resultado, um botão que gera o pacote de publicação a partir do roteiro real
daquele filme. Isso serve o fundador E todo cliente que publica.

A tela do resultado é do Claude → vira PEDIDO. A geração do texto e o formato
são do Codex. A subida nas redes é do Cowork (pista a desenhar em 04/09).
