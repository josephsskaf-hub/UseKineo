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
