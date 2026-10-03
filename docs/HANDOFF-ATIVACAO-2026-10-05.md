# HANDOFF — Ativação: Prévia das cenas, Brasil de volta, grupo de dentro, gancho, afiliados e Kineo Partners (03→05/10/2026)

**Branch:** `codex/nuvem-ativacao-previa-br-0310`, criada a partir de `origin/main` 6ac5d2b. Separada da `codex/nuvem-b2b-seo-lacos-0210`.

**Não está em produção.** Nada foi publicado em main, nenhum e-mail foi enviado, nenhum crédito foi concedido de verdade e não houve render pago.

**Pedidos:** a sessão CEO, em nome do fundador, mandou três tarefas em 03/10. O fundador mandou trabalhar em modo autônomo. Cada decisão tomada sem ele está marcada abaixo como **DECISÃO DO FUNDADOR PENDENTE**.

---

## TAREFA 1 — Ativação de quem nasceu fora da lista + Brasil

### Por que (medido em 03/10, só leitura no banco)

A ativação de cada janela abaixo é a % de cadastros com filme `completed` em até 24 h, agrupada pelo `signup_country` do perfil. A janela "antes" é 30/08 a 29/09 15:00 UTC; "depois" é de 29/09 15:00 UTC até 03/10.

| Grupo | Antes: cadastros | Antes: ativação | Depois: cadastros | Depois: ativação |
|---|---|---|---|---|
| Países da lista | 224 | 67,4% | 26 | 65,4% |
| **Brasil** | 56 | **62,5%** | 6 | **0%** |
| Fora da lista (sem BR) | 361 | 57,3% | 28 | **0%** |

Os números diferem pouco dos da sessão CEO (50% na lista). Ela contou "filme pronto"; eu contei `videos.status='completed'`. A conclusão é a mesma: a queda vem inteira da política de 29/09. O motor não tem defeito.

### Entrega 1 — "Prévia das cenas" (commit 6b9596cd)

**O que o cliente vê.** A conta `region_paid_only` (sem pagar, plano grátis) aperta **Gerar** no Studio e não bate mais na recusa 402. Cai em **/studio/previa**, com a mesma ideia já escrita.
- **"Ver prévia grátis"** mostra o roteiro, escrito pelo mesmo escritor da `/api/generate-script` para o filme de 15 s do Seedance 1.5, e **3 a 4 imagens das cenas** em FLUX schnell.
- **"Transformar em filme"** grava o clique no servidor, guarda ideia e roteiro e leva a `/pricing?from=scene_preview`.
- Depois de pagar, toda tela autenticada mostra **"Sua prévia está pronta para virar filme → Fazer meu filme"**. O aviso abre o Studio com o roteiro verbatim, no Seedance de 15 s. A pessoa só aperta Gerar.
- A faixa de topo "o filme grátis ainda não está disponível no seu país" ganhou o botão **"Ver prévia grátis"** antes do "Ver planos".
- Os textos estão em pt, en e es; outras línguas usam o inglês. A cópia é honesta: "isto é uma prévia; o filme é feito por um motor de vídeo a partir do mesmo roteiro e não sai idêntico a estas imagens".

**Travas no servidor.** Tudo abaixo roda antes de qualquer fornecedor, em `app/api/scene-preview`, na ordem:
1. login → interruptor `PREVIA_CENAS_PUBLIC` (nasce `true`, em `lib/scenePreview.ts`) → elegibilidade, pela mesma régua de `regionPaidOnlyNoticeVisible`;
2. tamanho da ideia (8 a 2.000 caracteres);
3. **1 prévia por conta por dia, 3 por conta no total e 200 por dia no total global**;
4. `moderateContent` no texto;
5. **reserva**: grava `scene_preview_requested` e reconta em ordem (created_at, id). Dois cliques simultâneos gravam duas reservas, e a segunda se vê além do teto e é recusada;
6. só então vêm o roteiro e as imagens. Cada imagem passa pela moderação de saída antes de ir para o nosso storage; ela entra também na galeria Images da pessoa (`persistImage`).

Falha de fornecedor marca a reserva como `failed` e a vaga volta. Toda recusa tem texto legível nas três línguas. **Nada é cobrado.**

**Desvio do Gerar.** Fica no servidor de `/studio/create`, depois da ativação do trial (é ela que grava o `trial_status`). Só desvia quando as três condições valem:
- o pedido é o despacho do Studio (`studio=1` ou `autoanalyze=1`, com ideia);
- o saldo não paga o filme pedido;
- não há `create_intent` nem `resume`.

Link de e-mail, retomada de checkout e criação automática seguem iguais. StudioClient e GenerateClient não foram tocados.

**Eventos de servidor, todos com `user_id` e em `SERVER_ONLY_EVENTS`:**
- `scene_preview_routed`: o desvio, com custo do filme pedido.
- `scene_preview_requested`: a reserva, com status reserved, shown, failed ou refused.
- `scene_preview_shown`: ideia, roteiro, cenas, chamadas e megapixels.
- `scene_preview_refused`: com o motivo.
- `scene_preview_cta_clicked`.

**Como medir a conversão (depois do deploy):**
```sql
-- quem viu a prévia × quem clicou × quem pagou, por pessoa
with v as (select distinct user_id from events where name='scene_preview_shown'),
     c as (select distinct user_id from events where name='scene_preview_cta_clicked'),
     p as (select distinct user_id from events where name='payment_success')
select (select count(*) from v) viram, (select count(*) from c) clicaram,
       (select count(*) from v join p using (user_id)) viram_e_pagaram;
```

**Custo por prévia: DESCONHECIDO em US$.** Daqui não dá para ler a tabela de preços: `fal.ai` e `openai.com` estão bloqueados pela rede desta sessão, e comentário histórico não conta como prova. O que se mede, e vai gravado em `scene_preview_shown.metadata`:
- 1 roteiro (`script_calls: 1`, que chama a `/api/generate-script`; ela faz 1 ou 2 chamadas ao `gpt-4o`, conforme o próprio guarda de qualidade);
- 3 ou 4 imagens FLUX schnell `portrait_16_9` (576×1024 = 0,59 MP cada; `image_megapixels` por prévia);
- moderação: 1 chamada `omni-moderation` no texto + 1 por imagem (a OpenAI não cobra moderação).

Para pôr preço: fatura da fal filtrada por `fal-ai/flux/schnell` ÷ prévias mostradas, e fatura da OpenAI de `gpt-4o` no mesmo período. O teto de 200 prévias por dia limita o pior caso a 200 × (roteiro + 4 imagens) por dia.

**Riscos:**
- O roteiro é uma chamada servidor-a-servidor à própria `/api/generate-script` com o cookie da pessoa. Se a Vercel exigir proteção de preview no domínio, essa chamada falha e a prévia responde "o roteiro não saiu, tente de novo", sem custo.
- O timeout é de 40 s para o roteiro, dentro do `maxDuration` de 60 s da rota.
- Prévia guardada no navegador some se a pessoa pagar noutro aparelho. A tela `/studio/previa` também reabre a última prévia pelo servidor (GET).

### Entrega 2 — Brasil de volta ao filme grátis (commits 769266d2 e 64ce0675)

**A linha.** `'BR'` entrou em `PAISES_FILME_GRATIS` numa linha só, marcada com `KINEO-BRASIL-VOLTA-2026-10-03`. **Reverter = apagar essa linha.**
- Conta BR **nova** ganha o trial de 10 cr e a cota semanal de 1 Seedance de 15 s (7 cr, em `lib/freeWeeklyFilm.ts`).
- O texto público "in supported countries" continua verdadeiro, porque deriva da política.

**Contas BR que já nasceram `region_paid_only`.** São **6 contas** desde 29/09, contadas pelo evento `trial_region_excluded` com país BR, ainda sem pagar.
- Rota admin **`/api/admin/br-recredit`**:
  - **GET** é dry-run: lista ids curtos (sem e-mail), 10 cr por conta, total de créditos e quantos filmes isso paga no máximo.
  - **POST `?confirm=APPLY`** aplica o mesmo grant do trial, com compare-and-set em `trial_status='region_paid_only'` e no saldo, e grava o evento `admin_br_trial_recredited`.
- **Não apliquei.** Custo se aplicar: 6 × 10 = 60 créditos, ou no máximo 6 filmes de 15 s.
- **DECISÃO DO FUNDADOR PENDENTE:** aplicar ou não.

**Pagantes BR na história.** O sinal é `profiles.signup_country = 'BR'` (preenchido nos 21 pagantes) e a moeda `brl` no `payment_success`. `metadata.customer_country` vem nulo e não serve.
- **3 pessoas BR, 4 eventos `payment_success`:**
  - duas em junho/julho (eventos antigos, sem metadata de moeda);
  - uma em 10/09, **Starter em BRL, R$ 49,90**. É o único pagamento em BRL da história e veio depois da moeda local de 09/09.
- `has_paid` hoje: 154 cadastros BR, 2 com `has_paid`. Para comparar: US tem 332 e 6; IN tem 462 e 1.

```sql
select date(e.created_at), lower(coalesce(e.metadata->>'currency','?')), e.metadata->>'tier', e.metadata->>'amount_total', p.signup_country
from events e join profiles p on p.id=e.user_id
where e.name='payment_success' and (p.signup_country='BR' or lower(coalesce(e.metadata->>'currency',''))='brl');
```

**Ativação BR antes e depois:** 62,5% (35/56) antes de 29/09 e 0% (0/6) depois. Os números estão na tabela do topo.

**Custo mensal estimado da cota semanal BR:**
- **Volume:** cerca de 56 cadastros BR em 30 dias (último mês antes da saída B).
- **Teto teórico:** cada conta tem direito a 1 filme Seedance de 15 s por semana, ou seja, 7 cr e cerca de 4,3 filmes por mês. A conta é a seguinte:
  - 56 contas novas por mês × 4,3 = cerca de 240 filmes por mês no primeiro mês, somando as coortes nos meses seguintes;
  - em créditos: 240 × 7 = cerca de 1.700 cr por mês.
- **Uso real medido:** desde 29/09, **0 admissões** da cota semanal (`free_weekly_film_admitted`) em todos os países da lista. Houve 4 recargas (`free_weekly_film_granted`) nos últimos 7 dias, sem nenhum filme admitido.
- **US$:** DESCONHECIDO pela fatura. A estimativa da casa (`lib/clips/clipPricing.ts`, Seedance 1.5 a US$ 0,026/s em 720p, não é fatura) dá cerca de US$ 0,39 por clipe de 15 s, sem voz nem montagem. No uso medido hoje, o custo é próximo de zero; no teto teórico, cerca de US$ 95 por mês só em vídeo.

---

## Testes da Tarefa 1
- Guardiões novos:
  - `test-previa-cenas-2026-10-03`: 46 ok, 6 mutantes.
  - `test-brasil-volta-2026-10-03`: 20 ok, 4 mutantes.
- Reancorados, cada um com o motivo no arquivo:
  - `test-moderacao-2026-09-25`: 27 importadores da moderação.
  - `test-filme-gratis-por-pais-2026-09-29` e `test-e4-saida-b-cota-seedance-2026-09-29`: a exclusão continua provada com PK, IN, NG e MX, e o BR passa a ser provado dentro. O único vermelho que sobra no `test-e4` (recarga semanal dependente de data) é idêntico na main.
- `npx tsc --noEmit`: 0 erros.

---

## Regra de trabalho no meio da noite
**O que mudou:** a sessão CEO mandou parar de usar o conector do Supabase, porque cada consulta pedia autorização ao fundador.
- As medições que já tinham rodado antes dessa ordem estão abaixo, marcadas "medido 03/10".
- Tudo o que ainda falta medir virou consulta em **`docs/HANDOFF-ATIVACAO-SQL-2026-10-05.sql`** (SQL #1 a #15, cada uma com o que mede, a decisão que alimenta e o resultado esperado).
- Onde a decisão dependia do número, escolhi a opção conservadora e marquei **AGUARDA SQL #n**.

## TAREFA 2 — o grupo de dentro, o gancho e os afiliados

### Item A — A ideia de antes do cadastro chega ao Studio (commits bae8a207 e 1934e4c1)

**Medido em 03/10, por pessoa.** Coorte: 30 dias, países da lista, sem `blocked`/`region_paid_only`, 206 pessoas.
- **A ideia NÃO se perde no login.** Ela sobrevive ao OAuth Google/Apple (`/auth/callback`) e à confirmação de e-mail. Não existe "e-mail mágico" OTP no código; a confirmação também passa pelo callback.
  - 134 de 135 (99%) das pessoas que digitaram ideia chegaram à tela de criar com ela.
- **O defeito era o destino.**
  - 133 de 135 caíam no `/studio/create`, a tela antiga.
  - Lá, 60 de 135 (44%) tinham o filme **disparado sozinho** pelo auto-start (`create_intent=fast` das páginas SEO).
  - Em 60 dias, o auto-start pagou 2 de 327 (0,6%); quem apertou à mão pagou 9 de 430 (2,1%).

**Gerou filme depois do cadastro:**

| Grupo | n | 1 h | 24 h | 48 h | nunca apertou |
|---|---|---|---|---|---|
| Todos | 206 | 64,6% | 68,4% | 69,4% | 20,9% |
| Digitou ideia antes | 135 | 74% (60 de 100 por auto-start) | — | 75,6% | 17 |
| Sem ideia | 71 | 46% | — | 57,7% | 36,6% |
| Sem ideia, pousou na home | 46 | — | — | — | 41% |

**Conserto, só no caminho.** StudioClient, `studio/create/page.tsx` e `lib/scenePreview` não foram tocados.
- **Régua:** `lib/growth/ideiaPousaNoStudio.ts`, com `IDEIA_POUSA_NO_STUDIO=true`. Um destino da tela antiga **com ideia** vira `/studio` com a ideia e as escolhas, **sem** `create_intent`, `autoanalyze` nem `studio`. Nada inicia render sozinho.
- **Onde vale:** callback, cadastro com confirmação automática e login por senha.
- **Continua igual:** destino sem ideia, checkout, retomada de render, desbloqueio, avatar e tópico viral.
- **O `/studio` herdou a chegada da tela antiga** (`components/StudioIdeaArrival.tsx`): conversão de cadastro do Ads/TikTok, `trackSignupSource` e o evento `studio_idea_arrived_v1`.

**Lembrete de ~1 h:** o cron `send-activation-nudge` já cobria essa coorte.
- Medido: 47 de 50 receberam, com mediana de 89 min; 10,6% fizeram filme em até 48 h.
- O que mudou:
  - A carta passa a citar a ideia da pessoa, pela régua `lib/lifecycle/lembreteComIdeia.ts`, com `LEMBRETE_COM_IDEIA='dry_run'`. A carta que sai hoje é a mesma; o JSON da rota conta `with_idea`.
  - As contas `region_paid_only`/`blocked` **deixam de receber "seu primeiro filme é grátis"**: têm 0 crédito, então a promessa era falsa.
  - A rota aceita `?dry_run=1`.
  - Evento novo `activation_nudge_sent`.
  - `vercel.json` não mudou.
- **DECISÃO DO FUNDADOR PENDENTE:** ligar `LEMBRETE_COM_IDEIA='live'`. AGUARDA SQL #11.

**Risco:** o filme na 1ª hora pode cair de 74% para 55–65% entre quem tem ideia, porque o auto-start sai. A aposta é em pagantes, não em contagem de filmes. Para reverter, basta `IDEIA_POUSA_NO_STUDIO=false`. AGUARDA SQL #7 e #8.

**Encaixe com a Entrega 1:** quem é `region_paid_only` agora pousa no `/studio` com a ideia. Ao apertar Gerar, o despacho vai para `/studio/create` e o desvio para a prévia acontece ali. O guardião da prévia cobre esse desvio.

### Item B — Gancho escrito no primeiro quadro (commits 6e747fe2 e 6e823f1d)

**O que aparece no vídeo:** a 1ª frase da narração (até ~8 palavras) escrita no alto do quadro, de 0 a 2,5 s.
- Fica visível já no frame 0, num cartão claro, fonte 64/800 na fonte da língua.
- A posição é medida no próprio filme: abaixo da marca d'água, da barra do Kineo 1, do logo da marca e da faixa das abas do TikTok, e sempre acima da legenda mais alta possível. Se colidir, o gancho não entra.
- Fica na faixa 11, acima de tudo, e usa só propriedades já usadas em produção.

**Como foi injetado:**
- **Sem tocar em `lib/compose.ts`.** A injeção é pós-build nas rotas `app/api/compose` (caminho hollywood e clássico) e `compose/unlock`, só em linhas marcadas `KINEO-GANCHO-1Q-2026-10-03`. É a mesma técnica do logo.
- Avatar e Studio Ads ficam de fora.
- **Interruptor `GANCHO_1Q_PUBLIC=false`:** só contas internas recebem o gancho.
- Os guardiões `test-veo-marcado` e `test-veo-modo-ia` aprenderam a ignorar o marcador novo. Sem esse filtro, a checagem byte a byte da rota fica vermelha.

**Fade de abertura do Kineo 1 (só relatado, não mexido):** o frame 0 é **preto**.
- `lib/compose.ts:227`: `FAST_OPENING_FADE_SECONDS = 0.5`, aplicado em `:2599-2600`, só no 1º corte do Kineo 1.
- O hollywood não tem fade.
- As barras de cinema de 6% (`:224`, `:2745-2760`) não escurecem o centro.
- Com o gancho, o frame 0 do Kineo 1 passa a mostrar o texto sobre o preto.
- Tirar o fade exige mexer em `lib/compose.ts` (trava). **DECISÃO DO FUNDADOR PENDENTE.**

**Riscos:**
- Texto duplicado com a legenda por 2,5 s. É o padrão do TikTok, e o estilo é diferente da legenda.
- A contagem de linhas é estimada.
- A saída aos 2,5 s é seca (`exit_transition` nunca foi usada em produção).
- Não há detecção de rosto.
- Conta "interna" inclui o padrão `test%` de `isInternalEmail`.

**Como testar:**
1. Gerar um Kineo 1 de 60 s numa conta da casa.
2. No log, procurar `[compose] KINEO-GANCHO-1Q-2026-10-03: "<frase>" y=<%>`.
3. Conferir o frame 0 e o corte aos 2,5 s.

**Próxima jogada:** o mesmo filme da casa postado com e sem o gancho no TikTok, comparando a retenção em 0:02.

### Item C — Afiliados: atribuição de ponta a ponta (commit 4ef68cbe)

**Código, passo a passo:** clique `/a/[code]` (cookies `sf_aff` + `sf_aff_click`) → cadastro (`/auth/callback` e `/api/auth/activation-completed`) → checkout (`affiliate_system=custom`) → webhook (`recordAffiliateCommission`, no inicial, na renovação e no pacote) → `affiliate_commissions`. **A cadeia está inteira.** O ponto cego de 28/08 já estava consertado na main, e o teste da casa de 09/09 passou de ponta a ponta.

**Onde rompe HOJE: clique → cadastro.** Medido em 03/10, 30 dias, sem a casa:
- 22 afiliados ativos;
- 60 cliques, dos quais **18 de robô**;
- 42 cliques humanos, 20 deles de um único afiliado;
- **0 cadastros** e **0 pagamentos** atribuídos.

Nenhum cadastro se perdeu no meio do caminho: das sessões logadas depois de um clique, 4 eram o próprio dono do link. Os 3 cadastros em até 10 min depois de um clique estão abaixo do acaso (≈6) e começaram em outras páginas.

**Conserto:** `isAffiliatePreviewBot` passa a reconhecer crawlers que se declaram (ClaudeBot, Bytespider, SemrushBot, ShapBot, Applebot…). Eles não contam mais como clique nem geram prova de clique.

**Guardião:** `test-afiliados-atribuicao` executa a rota `/a/`, o finalizador e o checkout reais, e roda o webhook com eventos simulados (inicial, renovação, pacote). Prova que a comissão de 30% nasce, idempotente. Não chama a Stripe.

**Lacuna sem conserto:** a fatura de troca de plano (`subscription_update`) não gera comissão. Houve 0 casos desde 09/09, e consertar exigiria mexer no webhook. **DECISÃO DO FUNDADOR PENDENTE.**

**O que o kit do parceiro precisaria** (entregue na Tarefa 3):
- o link rastreável `usekineo.com/a/<código>` (cookie de 90 dias) ou o cupom;
- o painel `/affiliate` com cliques, cadastros, pagantes e comissão pendente/aprovada/paga.

## TAREFA 3 — Kit "Kineo Partners"

### D1 — Conta cortesia (commit 15c3e3e1)
Não havia nada de cortesia em `origin/codex/*`, então foi construída do zero.

**Como funciona:**
- **Regra:** `lib/courtesy.ts` (pura) + `lib/courtesyStore.ts`.
- **Limites:** nível só `creator_trial` ou `studio_trial` (**nunca plano cheio**), só para conta sem plano, teto de 300 cr e 90 dias, motivo obrigatório.
- **Grava** o plano anterior, a data de fim e o evento `admin_courtesy_granted`.
- **Onde se usa:** botão "cortesia" em `/admin/people` → `POST /api/admin/courtesy`.
- **Banco:** migration `supabase/migrations/20261003120000_courtesy_grants.sql`, **não aplicada**. Uma cortesia ativa por pessoa.

**Fora do MRR e de "pagantes":**
- `isPayingPlan` já excluía `*_trial`.
- `overview`, `/admin/paying`, `ceo/compute` e `users` contavam cortesia como "trial de $1" ou pagante; agora mostram o plano real (`maskCourtesyPlans`).
- As cartas de cobrança e renovação nascem de evento da Stripe, e cortesia não tem assinatura.

**Validade:**
- O cron `app/api/cron/courtesy-expire` é dry-run por padrão, só aplica com `?confirm=APPLY`, tem `force-no-store` e **não está no `vercel.json`**.
- Linha sugerida: `{ "path": "/api/cron/courtesy-expire?confirm=APPLY", "schedule": "35 * * * *" }`.
- Quem assinou no meio vira `superseded`.
- **Sem o cron agendado, a cortesia não vence.**

**Saldo que sobra quando vence:** `COURTESY_LEFTOVER_RULE='keep'`, a opção conservadora: não tira nada de ninguém. A recomendação é `'remove_courtesy_leftover'` (zerar só o que sobrou da cortesia). **DECISÃO DO FUNDADOR PENDENTE.**

### D2 — Pacote de demonstração do parceiro (commit 31af26d4)
- **Regra:** `lib/partnerPack.ts` (`PARTNER_PACK_*`): 25 cr com `creator_trial` por 30 dias na entrada, mais 25 depois do post aprovado. Tudo via cortesia.
- **Quem pode:** 1 pacote por afiliado (migration `20261003121000_partner_packs.sql`, **não aplicada**, depois da `20261003120000`); conta que já paga não recebe.
- **Post:** o parceiro registra o link do post público em `POST /api/affiliate/partner-post` (só https, nunca o nosso domínio). O admin aprova com 1 clique em **`/admin/partners`**, com trava contra dois cliques.
- **A tela `/admin/partners` mostra:** etapa 1/2, post, cortesia até, créditos usados, indicados e pagantes.
- **Entrada automática:** `app/api/affiliate/apply` só entrega a etapa 1 sozinha com **`PARTNER_PACK_LIVE=false`** → hoje é manual. **DECISÃO DO FUNDADOR PENDENTE.** AGUARDA SQL #14 (custo: ~20 afiliados × 25–50 cr).
- **Painel do afiliado:** cartão do pacote e "Paid out $". Cliques, cadastros, pagantes e comissão já eram reais.
- **Comissão:** 30% (`AFFILIATE_COMMISSION_RATE=0.3`), sem mudança de taxa nem de termos.
- **Convite (rascunho en/pt/es, sem promessa de ganho):** `docs/CONVITE-KINEO-PARTNERS-2026-10-03.md`.

### D3 — Copy da /partners (commit ecab2f9f)
- **Saiu** a frase falsa "10 credits and every engine unlocked".
- **Entrou:** os créditos de cadastro pagam 1 Seedance 1.5 de 15 s com marca d'água, Kling/Veo pedem plano, e o pacote do parceiro aparece (com "Email us after you join" enquanto `PARTNER_PACK_LIVE` estiver desligado).
- **Origem dos números:** `lib/freeTierOffer` e `lib/partnerPack`.
- **A cota semanal não é citada:** `lib/freeWeeklyFilm.ts` manda não anunciá-la.
- **Comentários `commission_rate: 0.4`** → `AFFILIATE_COMMISSION_RATE` (0.3).
- **A verificar no merge:** `lib/ui/canonicalCopySpanish.ts` ainda traduz uma frase antiga "every engine unlocked, Kling 3 included". Não muda o que aparece na tela, porque a frase em inglês saiu, mas fica registrado.
- **Merge com `codex/nuvem-b2b-seo-lacos-0210`:** haverá conflito trivial em `app/partners/page.tsx` (lá a taxa já vem de `AFFILIATE_COMMISSION_PCT`). Resolver mantendo as duas mudanças.

---

## Como testar (resumo)
1. **Guardiões novos:**
   ```
   node scripts/test-previa-cenas-2026-10-03.mjs
   node scripts/test-brasil-volta-2026-10-03.mjs
   node scripts/test-ideia-sobrevive-login-2026-10-03.mjs
   node scripts/test-lembrete-com-ideia-2026-10-03.mjs
   node scripts/test-gancho-1q-2026-10-03.mjs
   node scripts/test-afiliados-atribuicao-2026-10-03.mjs
   node scripts/test-cortesia-2026-10-03.mjs
   node scripts/test-kineo-partners-2026-10-03.mjs
   node scripts/test-partners-copy-2026-10-03.mjs
   ```
2. **Prévia em preview:** conta de teste com `trial_status='region_paid_only'`, `plan='free'`, `has_paid=false` e 0 crédito. No `/studio`, escrever uma ideia e apertar Gerar. Esperado:
   - cair em `/studio/previa` com a ideia;
   - "Ver prévia grátis" mostra roteiro e 3–4 imagens;
   - a 2ª tentativa no mesmo dia é recusada com texto;
   - "Transformar em filme" leva a `/pricing?from=scene_preview`;
   - marcar `has_paid=true` na conta de teste faz aparecer "Sua prévia está pronta para virar filme", que abre o Studio com o roteiro.
3. **Brasil:**
   - cadastro novo com `x-vercel-ip-country: BR` nasce com `trial_status='active'` e 10 cr;
   - `GET /api/admin/br-recredit` (admin) devolve o dry-run.
4. **Ideia:** cadastro Google a partir de `/signup?prompt=teste%20X&create_intent=fast` pousa em `/studio?prompt=teste+X…` sem render.
5. **Lembrete:** `GET /api/cron/send-activation-nudge?dry_run=1` com `Bearer CRON_SECRET`.
6. **Gancho:** filme Kineo 1 numa conta interna (ver item B).
7. **Cortesia e parceiro:** aplicar as 2 migrations; depois "cortesia" em `/admin/people`, `GET /api/cron/courtesy-expire` (dry-run) e "dar etapa 1" em `/admin/partners`.

## Riscos principais
- **A prévia chama a própria `/api/generate-script` com o cookie da pessoa.** Se a proteção de preview da Vercel barrar essa chamada, a prévia recusa ("roteiro não saiu") sem custo.
- **Auto-start desligado para quem chega com ideia:** o filme na 1ª hora pode cair. A aposta é em pagantes.
- **Cortesia sem cron agendado não vence.**
- **Afiliados:** o gargalo é tráfego e conversão do clique, não código. O kit do parceiro é a alavanca.

## Commits (sem merges, mais antigo primeiro)
6b9596cd Entrega 1 (prévia) · 769266d2 Entrega 2 (BR) · 64ce0675 Entrega 2b (recrédito BR, dry-run) · 4ef68cbe Afiliados C ·
6e747fe2 Gancho 1Q · bae8a207 Ideia pousa no Studio · 33f37def docs · 15c3e3e1 Partners D1 (cortesia) ·
6e823f1d Gancho (reancora E4) · 1934e4c1 Lembrete com ideia · 31af26d4 Partners D2 · c5d62681 docs SQL 2A ·
ecab2f9f Partners D3 · (+ este commit do handoff). Merges de integração: 5a9b6372, 7326cbdf, b9168ac4.

## Suíte inteira (node em cada scripts/test-*.mjs, 4 em paralelo, 120 s por arquivo)

| | Guardiões | Verdes | Vermelhos |
|---|---|---|---|
| `origin/main` 6ac5d2b | 744 | 608 | 136 |
| esta branch (b9168ac4) | 753 | 618 | 135 |

- **Nenhum verde virou vermelho.**
- **1 vermelho virou verde:** `test-plan-fit`.
- **Os 9 guardiões novos estão verdes.**
- **Os 135 vermelhos são herdados da main.**
- **Reancorados, com motivo escrito em cada arquivo:**
  - `test-moderacao`, `test-filme-gratis-por-pais`, `test-e4-saida-b-cota-seedance`
  - `test-veo-marcado`, `test-veo-modo-ia`, `test-estrela-sobretaxa-assinada`
  - `test-affiliate-attribution`, `test-checkout-auth-session-bridge`, `test-sem-porteiro-2026-09-02`, `test-primeiro-episodio-pronto`
  - `test-affiliate-me-currency-contract`

`npx tsc --noEmit`: 0 erros. `npm ci` passou na primeira sessão.

## DECISÕES DO FUNDADOR PENDENTES (lista única)
1. Aplicar o recrédito das 6 contas BR (`POST /api/admin/br-recredit?confirm=APPLY`, 60 cr).
2. Ligar `LEMBRETE_COM_IDEIA='live'` (AGUARDA SQL #11).
3. Manter `IDEIA_POUSA_NO_STUDIO=true`, sem auto-start para quem chega com ideia (AGUARDA SQL #7/#8).
4. Abrir o gancho para todos (`GANCHO_1Q_PUBLIC`), depois do teste A/B no TikTok. Também: estilo e tempo do gancho, e tirar o fade preto do Kineo 1 (exige mexer em `lib/compose.ts`).
5. Comissão sobre a fatura de troca de plano (`subscription_update`).
6. Saldo que sobra quando a cortesia vence (`COURTESY_LEFTOVER_RULE`; recomendação: `remove_courtesy_leftover`).
7. `PARTNER_PACK_LIVE`: etapa 1 automática na inscrição (AGUARDA SQL #14).
8. Agendar o cron `courtesy-expire` e aplicar as migrations `20261003120000` → `20261003121000`.
9. Manter os tetos da prévia (1/dia, 3 no total, 200/dia global) e `PREVIA_CENAS_PUBLIC=true` (AGUARDA SQL #5/#6).
