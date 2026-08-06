# QA DO REVERSE TRIAL — 07/08/2026

**Escopo:** (1) regressão em produção com `KINEO_REVERSE_TRIAL_ENABLED` **OFF**, dos 5
commits de hoje (`7cfc259`, `e839e02`, `15e4154`, `ffcd3f0`, `ec9f112`); (2) teste
funcional do trial com a flag **ON**; (3) reverificação do achado de segurança em
`/api/render/[id]`.

**Deploy auditado:** `ec9f112` servindo em `https://www.usekineo.com`.
**Postura:** adversarial. Nenhuma linha abaixo é opinião — cada uma tem comando +
saída ou SQL + resultado.

---

## MÉTODO — o que pôde e o que não pôde ser executado

| Recurso | Estado | Consequência |
|---|---|---|
| Produção HTTP | OK | Parte 1 verificada por `curl` real. |
| Supabase (MCP `cqqukkvjjrguayiyjvhh`) | OK | Schema e contagens verificados por SQL real. |
| `.env.local` da raiz | **É O STUB** (`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`; nomes de chave idênticos a `.env.local.example`) | Impossível subir o app contra o banco real. |
| `npm run build` com flag ON | **NÃO CONCLUIU** — o host corta cada chamada de shell em ~178 s e não preserva processo em background (3 tentativas, `nohup`/`setsid`, log com 0 byte) | Sem HTML gerado com a flag ON. Ver "Não testado". |
| Execução da lógica real | OK, via type-stripping do Node 22 (`node --experimental-strip-types`) sobre `lib/reverseTrial.ts` e `lib/trialFingerprint.ts`, com stub in-memory do `@supabase/supabase-js` que reavalia os filtros **no momento da escrita** (CAS fiel) e cede o event loop a cada operação (interleaving real) | Parte 2 (a,b,c,e,g) **executada**, 39/39 asserções. |

Harness em `/tmp/qa/` (`fakeSupabase.mjs`, `run.mjs`, `off.mjs`, `compose-gate.mjs`) —
efêmero, fora do repositório, não commitado.

---

## PARTE 1 — REGRESSÃO COM A FLAG OFF (o que está no ar agora)

| Caso | Como testei | Evidência | Veredito |
|---|---|---|---|
| Status das páginas | `curl -o /dev/null -w %{http_code}` em 8 rotas | `/ 200 · /pricing 200 · /wall 200 · /scripts 200 · /sitemap.xml 200 · /llms.txt 200 · /free-ai-shorts 200 · /free-ai-shorts-generator 200`; `/generate` **307** (redirect de auth para deslogado — correto) | **PASSA** |
| Copy do free tier intacta | `grep -c` no HTML baixado das 6 páginas | `"3 free Shorts every 24h"` presente **1×** em todas as 6; `"3 watermarked Fast"` presente em todas; `"Creator trial"` = **0**; `"40 credits"` = **0** | **PASSA** |
| Sem `undefined` / `[object Object]` visível | `grep -o` + inspeção de contexto | `[object Object]` = **0** em todas. `undefined` aparece 8–16×, **100% dentro do payload RSC do Next** (`"crossOrigin":"$undefined"`, `"errorStyles":"$undefined"`) — não é texto renderizado | **PASSA** |
| `/api/credits` e `/api/compose` | `curl` sem sessão | `credits → 401`; `compose → 401 {"error":"You must be signed in."}` — comportamento normal | **PASSA** |
| Crons novos fail-closed | `curl` sem `CRON_SECRET` | `trial-downgrade → 401`, `trial-lifecycle-emails → 401`, `?dry=1 → 401` (o dry-run **não** fura a auth) | **PASSA** |
| Flag realmente OFF no banco | SQL | `any_trial=0, fp_rows=0, email_rows=0, trial_events=0` sobre 961 perfis / 360 signups em 30 d — **nenhum caminho novo executou em produção** | **PASSA** |
| Rollback é completo | `off.mjs` executando o código real com a flag OFF | `maybeActivateReverseTrial → {activated:false, reason:'flag_off'}` com **0 escritas** e **0 eventos**; `isTrialActive→false`; `trialUiState→'none'` e `showDowngradeModal=false`; `recordReverseTrialDebit` = 0 escritas | **PASSA** |
| Desligar a flag não revoga trial vivo | idem | `trialNeedsDowngrade(trial válido)=false` mesmo com a flag OFF — o cron é deliberadamente não-gateado e não vira máquina de revogação em massa no rollback | **PASSA** |
| Post to Earn (`ffcd3f0`) — migração aplicada? | SQL em `post_to_earn_claims` | Colunas `status` (NOT NULL, default `'granted'`), `source`, `verification`, `reason`, `granted_at`, `reviewed_at`, `reviewed_by` **existem**. O código novo lê `status` e não vai estourar `42703` | **PASSA** |
| Webhook Stripe (`7cfc259`) | Leitura de `markTrialConverted` | Primeira linha é `if (!REVERSE_TRIAL_ENABLED) return` — no-op absoluto com a flag OFF | **PASSA** |
| Layout do dashboard (`ec9f112`) | `git show ec9f112 -- 'app/(dashboard)/layout.tsx'` | Única mudança de runtime: `{user && <PaymentConfirmedToast />}`. Independente da flag e retorna no primeiro efeito sem `?success` na URL | **PASSA** |

### ⇒ NENHUMA REGRESSÃO EM PRODUÇÃO. Não há motivo de rollback.

---

## PARTE 2 — TESTE FUNCIONAL COM A FLAG ON

Saída completa: 33/33 em `run.mjs` + 6/6 em `off.mjs`.

| Caso | Como testei | Evidência | Veredito |
|---|---|---|---|
| **(a)** Signup novo → trial + 40 créditos 1× | `run.mjs`, código real | `activated=true status=active credits=40 granted=40`; variantes **3d e 7d** ambas cobertas pelo hash A/B; `trial_credits_granted` = 1 evento por conta | **PASSA** |
| (a) Replay não concede 2× | idem | 2ª chamada → `reason=trial_already_used`, saldo `40→40` | **PASSA** |
| (a) 2 ativações **simultâneas** do mesmo user | `Promise.all` com interleaving real | `credits=40` (não 80), `activated=[true,false]` — o CAS `.is('trial_status', null)` segura | **PASSA** |
| (a) Conta antiga / e-mail descartável | idem | `not_new_signup` e `disposable_email`, `trial_status` segue `null` | **PASSA** |
| **(b)** 2º signup do mesmo fingerprint | 3 signups com o mesmo hash | **2** ganham trial, o **3º** não: `trial_status=null, credits=0`, conta normal, evento `trial_blocked_fingerprint {reason:"over_limit", prior_activations:2, max_activations:2, window_days:30}` | **PASSA — com ressalva** |
| (b) ⚠️ O limite é **N=2**, não N=1 | idem | O **2º** signup do mesmo fingerprint **ganha trial por design** (colisão de NAT/família). Se o pedido era "o segundo não ganha", o código **não faz isso** | **DIVERGE DA ESPECIFICAÇÃO DO PEDIDO** |
| (b) ⚠️ Sem o salt de ambiente a camada some | `trialFingerprintFromHeaders()` sem `KINEO_TRIAL_FINGERPRINT_SALT` | Retorna `null` → `evaluateTrialFingerprint` devolve `{allow:true, reason:'no_signal'}` → **concede, sem evento, sem linha, sem log**. Anti-abuso vira **no-op 100% silencioso** | **RISCO — ver bloqueador #3** |
| **(c)** Débito acumula e trava em 40 | 2×20 créditos | `used=40`, `status=expired`, `isTrialActive=false`, evento `trial_expired{reason:'credit_cap'}` | **PASSA** |
| (c) Débito após expirar não soma | idem | `used 40 → 40` | **PASSA** |
| (c) **Concorrência** 2 débitos simultâneos de 20 | `Promise.all` | `used=40` (não 20 — nenhum débito perdido), `status=expired` | **PASSA** |
| (c) **Concorrência** 4 débitos simultâneos de 20 (80 pedidos contra teto 40) | `Promise.all` de 4 | `trial_credits_used=40`, `status=expired` | **PASSA** |
| **(d)** Motor Studio no trial → 402 | Predicados verbatim do gate | `isPaidUser=false` para o perfil de trial ⇒ Kling/Veo/Hollywood caem em **402** `reason='trial_studio_engine'`; `isTrialActive=true` ⇒ Seedance passa o gate | **PASSA no gate** (mas ver bloqueador #1) |
| **(e)** Cron expira quem venceu | Coorte + `downgradeExpiredTrial` reais | `dg-expired` revogou 40 → saldo 0, `downgraded`; `dg-partial` revogou 25 (40−15) | **PASSA** |
| (e) Não mexe em quem está válido | idem | `dg-valid` segue `active` com 40 créditos | **PASSA** |
| (e) Não tira crédito de pagante | idem | `dg-paid` → `converted`, saldo **100 intacto** | **PASSA** |
| (e) Não destrói crédito comprado | perfil com 90 (50 comprados + 40 do grant) | `90 → 60` — revogou só os 30 não gastos do grant | **PASSA** |
| (e) 2 rodadas sem efeito duplo | snapshot antes/depois | 2ª rodada: `processed=0`, estado **byte a byte idêntico** | **PASSA** |
| **(f)** Lifecycle emails: coorte / duplicados / `converted` | Leitura da rota + SQL | `.in('trial_status',['active','expired','downgraded'])` — **`converted` fora da query**; `?dry=1` retorna antes de qualquer escrita, extensão ou claim; dedupe garantido por **`PRIMARY KEY (user_id, email_kind)`** em `trial_emails_log` (confirmado no `pg_constraint` de produção) + pré-filtro + claim; `email_opted_out` tem **0 NULL** em 961 linhas (nenhuma exclusão acidental) | **PASSA por leitura + SQL** (dry-run não executado — sem `CRON_SECRET`) |
| (f) `converted` nunca entra em coorte nenhuma | `run.mjs` | `trialNeedsDowngrade(converted)=false`; cron `processed=0` | **PASSA** |
| **(g)** Webhook → `converted` | `markTrialConverted` replicado verbatim | `.in('trial_status',['active','expired'])` → status vira `converted` | **PASSA** |
| (g) Débito posterior **não** reverte para `expired` | 2 débitos após a conversão, um deles estourando o teto | `status=converted` nos dois casos — a guarda `.eq('trial_status','active')` de `recordReverseTrialDebit` segura | **PASSA** |
| **(h)** Nenhuma superfície promete "3 free Shorts every 24h" com ON | Varredura de 155 ocorrências literais em `app/`, `components/`, `lib/`, classificadas uma a uma | 144 encapsuladas em `ft()`/`<FreeTierCopy legacy=>`. Das 11 restantes: 2 são comentários JSX (`PricingClient:449,454`), 3 são fatos de concorrente (`comparisons.ts` — Submagic/Descript), 3 são literais sobrescritos em runtime (`SocialProof:29`, `SocialProofToast:16,48`), 1 é o ramo OFF de um ternário já ligado à flag (`kineoFacts:248`), 1 é tela de admin (`LeadsClient:192`). **Sobra exatamente 1 vazamento real** | **FALHA — 1 item** |
| (h) Vazamento real | `app/youtube-automation-case-study/page.tsx:197` | Botão `Start free — 3 videos a day` **hardcoded**, duas linhas abaixo de um parágrafo que **é** trocado por `ft(OFFER, …)`. Com ON a mesma caixa diz "Creator trial: 40 credits" no texto e "3 videos a day" no botão. Confirmado no ar: `curl .../youtube-automation-case-study \| grep` → `Start free — 3 videos a day` | **FALHA (cosmética)** |
| (h) Nenhuma superfície pública menciona desconto/50% | `grep -rn "50%\|COMEBACK\|half off"` fora do cron de e-mails | Só CSS (`border-radius:'50%'`, gradientes, keyframes). O 50% vive **exclusivamente** em `trial-lifecycle-emails` (D5/D10), como a spec manda | **PASSA** |
| Troca atômica da oferta | `getFreeTierOffer()` executado sob as duas flags | OFF: `limit=3, janela=1d, clamp=null, "3 free Shorts every 24h"`. ON: `limit=1, janela=30d, clamp=15s, "1 free Fast video/month"`. `swapFreeTierCopy` devolve o literal byte a byte com OFF | **PASSA** |

---

## PARTE 3 — SEGURANÇA: `/api/render/[id]`

**O achado está FECHADO.** Corrigido em `d1133c7`, e `d1133c7` é ancestral de
`ec9f112`, que é o deploy servindo hoje.

| Verificação | Evidência |
|---|---|
| Posse é exigida | `const intent = await getRenderIntent(\`legacy-${id}\`)` e `if (!intent \|\| intent.userId !== user.id) → 404` |
| A prova de posse não é forjável | `getRenderIntent` lê `render_jobs.user_id` (escrita pelo servidor com service-role) e, no fallback, `events.user_id` do claim do compose — **nunca** a tabela `videos`, que é escrita pelo cliente |
| Falha fechada | Ausência de linha **e** mismatch → `404` (não `403`, que confirmaria a existência do render) |
| Blip transitório não vaza | `intent === undefined` → `200 {status:'rendering', url:null}` — **sem URL** |
| Sem auth | `curl /api/render/abc123` → `401 {"error":"You must be signed in."}` |

**Gravidade real hoje: NENHUMA.** Não é possível ler o render de outro usuário: a URL
do MP4 só sai depois de `intent.userId === user.id`. O único método exportado do
arquivo é `GET`. **Não é bloqueador.**

---

## BLOQUEADORES (impedem ligar a flag)

### 🔴 #1 — Trial em Seedance é DEBITADO e depois RECUSADO no render (402)

O caminho principal do trial não funciona, e o usuário perde crédito no processo.

`maybeActivateReverseTrial` grava `trial_status`, `trial_ends_at`, `trial_variant`,
`video_credits`, `trial_credits_granted` — e **não toca em `plan` nem em `has_paid`**
(`lib/reverseTrial.ts:581-595`). A conta em trial permanece `plan='free'`,
`has_paid=false`. Então:

1. `/api/generate-video-cinematic`: `trialActive=true` ⇒ passa o gate ⇒ **debita 20
   créditos** (`SEEDANCE_CREDIT_COST`, linha 96; débito na linha 860).
2. `/api/compose` recebe `quality='cinematic_ai'` (o cliente fixa
   `falQualityRef.current='cinematic_ai'` para Seedance, `GenerateClient.tsx:4448`) e
   avalia (linha 1044-1053):
   ```
   isFreePlan = !PAID_PLANS.has('free')            → true
   hasPaid    = false
   hasPaidCreditAccess = !isFreePlan || (hasPaid && balance>0) → false
   if (!hasPaidCreditAccess) → 402
   ```
3. Resultado executado: `402 "AI Generated videos are available on paid plans.
   Upgrade to continue."` — **e o `if (!hasPaidCreditAccess)` não é contornado por
   `cinematicUpstreamDebited`.**

O crédito só volta pelo `sweepAbandonedCinematicDebits` do cron `refund-sweep`, que
roda **1× por dia às 09:30**. A promessa é "40 créditos, todo motor exceto Studio"; a
entrega é 402 mais um estorno no dia seguinte.

**Correção mínima:** `hasPaidCreditAccess` (e `isFreePlanFast`) precisam considerar
`isTrialActive(profile)` — hoje `isTrialActive` é consultado em **um único arquivo**,
`generate-video-cinematic`.

### 🔴 #2 — Trial em Fast: marca d'água, corte em 15 s e cota de 1/30 dias

Mesmo perfil, `quality='fast'`, mesma raiz (`plan='free'`):

```
isFreePlanFast = isFreePlan && !hasPaid = true
  → withEndCard = true                       (MARCA D'ÁGUA)
  → duration = FREE_OFFER.maxFreeFastSeconds = 15s   (CORTE)
  → reserveFreeFastPreviewSlot(): limit=1 / janela 30 dias
  → ao estourar: "You've used this month's free Fast video."
```

O comentário em `compose/route.ts:1086` afirma *"Contas em trial ativo não passam por
aqui — trial gera com crédito (caminho pago)"*. **A afirmação é falsa**: nada no
caminho de `fast` consulta o trial. E `15e4154` **piorou** o quadro — a mesma conta
que hoje faz 3 Fast/24 h passa a fazer **1 Fast/30 dias** assim que a flag sobe.

### 🔴 #3 — `KINEO_TRIAL_FINGERPRINT_SALT` não verificado, e sem ele o anti-abuso é um no-op mudo

`trialFingerprintHash()` retorna `null` quando o salt não está no ambiente ⇒
`evaluateTrialFingerprint` devolve `{allow:true, reason:'no_signal'}` ⇒ concede **sem
evento, sem linha em `trial_signup_fingerprints`, sem warning**. Não existe nenhuma
checagem em lugar nenhum do repositório que reclame da ausência do salt.

Exposição, com os números reais de produção: 360 signups/30 d, 40 créditos por trial,
~$4,1 de custo por trial ⇒ **~$1.480/mês** só no tráfego legítimo, sem nenhum teto de
abuso ativo.

**Gate obrigatório:** confirmar `KINEO_TRIAL_FINGERPRINT_SALT` na Vercel (produção)
**no mesmo deploy** em que `KINEO_REVERSE_TRIAL_ENABLED=true`. Não foi possível ler as
env vars da Vercel por esta sessão.

---

## LIGA MAS MONITORA

1. **`/youtube-automation-case-study` — botão contraditório.** Uma linha:
   `ft(OFFER, 'Start free — 3 videos a day', 'Start free — 40 credits, no card')`.
   Cosmético, uma página, não bloqueia.
2. **`trial_credits_used` pode ultrapassar 40.** Se o último débito custar mais do que
   faltava (ex.: `used=39` + Seedance 20 = 59), o teto é rompido *nesse débito*. O
   gasto real continua limitado pelo saldo de 40, e `creditsUsedForDisplay` já protege
   a copy. Aceitável; medir `trial_expired.credits_used > 40` nos primeiros dias.
3. **`fingerprint` N=2 por 30 dias.** Um abusador com IP rotativo (VPN barata) passa
   sem esforço. Combinado com o teto de 40, o pior caso por identidade é aceitável —
   mas o painel `/admin/trial-abuse` precisa ser olhado diariamente na 1ª semana.
4. **`/api/credits/deduct` soma sempre 1** (`recordReverseTrialDebit(user.id, 1)`),
   independente do custo real. É o caminho legado `/create`, medido com 0 tráfego —
   armadilha carregada, não vazamento ativo.
5. **`UpgradeModal` do `/generate` imprime preço USD fixo** (`lib/pricing.priceLabel`)
   e a coorte pós-trial inclui BR e IN. Dívida já registrada pelo fundador em
   `f50c983`; não bloqueia, mas contamina a conversão medida do A/B.
6. **480p do free tier residual está PENDENTE** — o builder Creatomate não tem knob de
   resolução. A copy nova não promete 480p, então não há mentira; só menos contenção
   de custo do que o desenho previa.

---

## NÃO CONSEGUI TESTAR (e por quê)

| Item | Motivo |
|---|---|
| App rodando localmente com a flag ON | `.env.local` da raiz é o **stub** (`https://your-project.supabase.co`, `your-service-role-key`). Sem chaves reais o app não sobe contra o banco. |
| `next build` com a flag ON (HTML gerado) | O host corta cada chamada de shell em ~178 s e mata processos em background (3 tentativas, log com 0 byte). A verificação de copy foi feita por (i) execução real de `getFreeTierOffer`/`swapFreeTierCopy` sob as duas flags e (ii) varredura exaustiva e classificada dos 155 call sites. |
| `?dry=1` do `trial-lifecycle-emails` contra produção | Exige `CRON_SECRET`, que não está nesta sessão (a rota devolveu `401`, o que é o comportamento correto). Coorte, dry-run e idempotência foram verificados por leitura + o `PRIMARY KEY (user_id, email_kind)` confirmado no banco. |
| Env vars da Vercel (`KINEO_TRIAL_FINGERPRINT_SALT`, `CRON_SECRET`) | O MCP da Vercel não expõe variáveis de ambiente. **Bloqueador #3 depende disto.** |
| Signup fim-a-fim com dois navegadores reais | Sem app rodando. Substituído por execução do código real de ativação/fingerprint com stub de banco CAS-fiel. |
| Leitura de render alheio com duas contas reais | Sem app rodando. Substituído por leitura da guarda + confirmação de que a fonte de posse é escrita pelo servidor + `401` em produção. |

---

## VEREDITO

# 🔴 NÃO PODE LIGAR

Ligar hoje entrega um trial que **cobra e não entrega**: quem escolhe Seedance — o
motor que o trial existe para liberar — é debitado em 20 créditos e recebe
`402 "AI Generated videos are available on paid plans"`, com estorno só no dia
seguinte; e quem escolhe Fast recebe marca d'água, corte em 15 s e uma cota que
**encolhe de 3/24 h para 1/30 dias**. O A/B 3d vs 7d mediria um trial quebrado contra
a baseline de 1,4 pagante por 100 signups, e o número resultante não significaria nada.

**A infraestrutura do trial está boa.** Grant, CAS, teto, concorrência, cron de
downgrade, idempotência e webhook passaram nas 39 asserções executadas — inclusive nos
cenários de corrida. **Nada disso é o problema.** O problema é que o entitlement do
trial existe em **um único arquivo** e o `/api/compose`, que decide marca d'água, cota
e export, nunca soube que o trial existe.

### O que exatamente falta

1. **`/api/compose` precisa consultar `isTrialActive()`** nos dois pontos:
   `hasPaidCreditAccess` (linha 1051) e `isFreePlanFast` (linha 1077). Isto sozinho
   fecha os bloqueadores #1 e #2. — *gate do fundador (marca d'água + cota)*
2. **Confirmar `KINEO_TRIAL_FINGERPRINT_SALT` na Vercel produção** antes ou junto do
   deploy que sobe a flag. Sem isso o anti-abuso não existe e ninguém fica sabendo.
3. *(opcional, 1 linha)* envolver o botão de `youtube-automation-case-study:197` em
   `ft()`.

### Reteste obrigatório depois da correção

Um signup real, gerar **um Seedance** e **um Fast**, e conferir: o Seedance renderiza
sem 402, o Fast sai **sem marca d'água** e **não** consome a cota do free tier.
Enquanto esses dois casos não passarem contra o banco real, o veredito não muda.

---

# CORREÇÕES DOS BLOQUEADORES — `[KINEO-TRIAL-BLOCKERS-2026-08-07]`

*Escrito depois do veredito acima, sobre `a4d73dd`. Fecha os 3 bloqueadores e o item
cosmético. Nada além disso foi alterado — o que foi auditado e deliberadamente NÃO
mexido está listado, com o motivo, na tabela de pontos auditados.*

**`npx tsc --noEmit` → EXIT=0.**

## A raiz comum de #1 e #2, e por que a correção não foi "escrever `plan='creator'`"

Uma conta em trial é, para o banco, `plan='free' has_paid=false` — e isso é
**deliberado**: escrever um plano pago numa conta que não pagou contaminaria MRR,
`/admin/overview`, as coortes de e-mail e o webhook da Stripe. A consequência é que o
entitlement do trial não existe em coluna nenhuma; ele tem que ser **derivado na
leitura**. Até `a4d73dd` essa derivação existia em **um arquivo só**.

A correção é uma fonte única — `getEffectiveEntitlement()` em `lib/reverseTrial.ts` —
consultada por todo gate free/pago do caminho de geração:

```ts
getEffectiveEntitlement(profile, { isPaidAccount /* predicado LOCAL do call site */ })
  → { isTrial, isPaidAccount, treatAsPaid, allowsStudioEngines,
      watermark, maxDurationSeconds, countsAgainstFreeQuota }
```

Três invariantes ficaram escritas no código (bloco de comentário do próprio arquivo):

1. **`isPaidAccount` continua sendo calculado no call site e é PASSADO para o helper.**
   Os `PAID_PLANS` do repositório divergem entre si (o de `/api/footage` tem 6 planos,
   o de `/api/compose` tem 10). Se o helper recalculasse "quem paga" com uma lista
   própria, a flag OFF deixaria de ser diff-zero em algum arquivo e ninguém notaria.
   Do jeito que está, **toda mudança é um termo `|| isTrialActive(...)` que vale
   `false` com a flag desligada** — auditável por inspeção local, linha a linha.
2. **`allowsStudioEngines = isPaidAccount`, nunca `treatAsPaid`.** Kling/Veo/Hollywood
   jamais entram no trial. É por isso que o teto é 40 (Hollywood custa 150).
3. **O teto de 40 não migrou para o helper.** Continua passivo dentro de
   `isTrialActive()` — é o que faz `isTrial` virar false no próprio débito que estoura
   o teto, na mesma request.

## 🔴 #1 — Trial em Seedance debitado e recusado (402) — **FECHADO**

| O que mudou | Onde |
|---|---|
| `hasPaidCreditAccess` ganhou `\|\| ent.isTrial` | `app/api/compose/route.ts` (bloco de entitlement de `cinematic_ai`) |
| O `SELECT` do perfil passou a trazer as colunas de trial (`TRIAL_ENTITLEMENT_COLUMNS`) | idem |
| `currentPaid` da **releitura de admissão** ganhou `\|\| isTrialActive(currentProfile)` | `app/api/generate-video-cinematic/route.ts` |

⚠️ **Achado NOVO, que o QA original não tinha pego:** o bloqueador #1 tinha um **segundo
portão**, dentro da própria rota cinematic. O gate trial-aware de entrada (`:685`)
aprovava a conta, e a **releitura de admissão** poucas linhas antes do débito
(`currentPaid`) tinha o seu próprio predicado de "conta paga", que não conhecia o
trial, e a matava com `402 "AI Generated videos require a paid plan."` — dois
veredictos opostos sobre a mesma conta, na mesma request. Corrigir só o `/api/compose`
teria deixado o Seedance do trial **igualmente impossível**, e o reteste teria falhado
antes mesmo de chegar ao compose.

⚠️ **Segundo achado, da 1ª revisão adversarial da própria correção — o ÚLTIMO Seedance
do trial.** Com o teto em 40 e o Seedance em 20, o trial tem exatamente 2 renders. No
**segundo**, o débito leva `trial_credits_used` a 40, o que **expira o trial na mesma
request** (expiração passiva, por desenho). Quando o cliente chamava `/api/compose` em
seguida, `ent.isTrial` já era `false`, o saldo era 0 — e o 402 voltava, com os 20
créditos já gastos. Ou seja: o bloqueador #1 sobreviveria exatamente no render que mais
importa. A regra correta não é "é trial?", é **"o crédito já foi cobrado ⇒ entrega"**:

```ts
const hasPaidCreditAccess =
  !isFreePlan || (hasPaid && creditBalance > 0) || ent.isTrial ||
  (REVERSE_TRIAL_ENABLED && cinematicUpstreamDebited)
```

`cinematicUpstreamDebited` é `cinematicBirthClaim.status === 'settled'` — uma linha de
claim assinada e verificada no servidor (`lib/cinematic/claim.ts`), que o cliente não
consegue forjar. O `REVERSE_TRIAL_ENABLED &&` na frente é explicado na seção de
flag-OFF, abaixo.

**Como reverificar:** conta nova com a flag ON → gerar **dois** Seedance seguidos. Os
dois renderizam, sem 402. Ao fim: `trial_credits_used = 40`, `trial_status = 'expired'`,
`video_credits = 0`, e **nenhuma** linha no estorno do `refund-sweep` do dia seguinte.

## 🔴 #2 — Trial em Fast: marca d'água, corte de 15s e cota free — **FECHADO**

`isFreePlanFast` é o interruptor **mestre** do free tier: dele saem, em cascata, a marca
d'água, o end card, o clamp de 15s, a reserva de cota (1/30d com a flag ON) e o **preço
0** do render. Uma linha fecha os cinco:

```ts
isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial
```

⚠️ **Achado da revisão adversarial: essa linha sozinha teria TROCADO um defeito por
outro pior.** Deixando de ser "free", o Fast do trial passa a ser um render **pago** e
cai em `reservePaidCreditSlot()` — que tem o **seu próprio** predicado de conta paga
(`hasPaidEntitlement`) e o recusaria com `402 "Clean and premium exports require a paid
plan."`. O trial perderia o Fast **por completo**, em vez de recebê-lo sujo. Por isso
`hasPaidEntitlement` também ganhou `|| isTrialActive(creditProfile)` (e as colunas de
trial no `SELECT`).

**O Fast do trial agora custa 1 crédito de verdade**, e isso é intencional: um Fast
grátis não passaria por `recordReverseTrialDebit` (que só roda com `cost > 0`) e seria
**invisível para o próprio teto de 40** — o trial poderia gerar Fast infinito.

O clamp passou a ler `ent.maxDurationSeconds` em vez de `FREE_OFFER.maxFreeFastSeconds`
direto. Dentro daquele ramo os dois são o mesmo valor por construção (runtime idêntico);
o ganho é que a regra "quem sofre clamp" deixou de ser reconstruída ali. **Foi
exatamente a divergência entre "quem é free para o clamp" e "quem é free para o trial"
que produziu este bloqueador.**

O comentário de `compose/route.ts` que afirmava *"contas em trial ativo não passam por
aqui"* foi corrigido: a afirmação agora é verdadeira, e o comentário **aponta o código
que a impõe** em vez de só declará-la.

**Como reverificar:** conta em trial → gerar um Fast. O MP4 sai **sem marca d'água e sem
end card**, com a **duração pedida** (não 15s), a cota de 1/30d **não é consumida**
(nenhuma linha nova de `compose_claim` com `cost=0` na janela) e `video_credits` cai
**1**, com `trial_credits_used` subindo 1.

## 🔴 #3 — `KINEO_TRIAL_FINGERPRINT_SALT` ausente = anti-abuso mudo — **FECHADO (nunca mais silencioso)**

A postura **não mudou** — continua **fail-open** (concede o trial), como o fundador
determinou. O que mudou é que deixou de ser silenciosa, em três lugares:

1. **`lib/trialFingerprint.ts`** — novo `trialFingerprintSaltConfigured()`, com o
   **mesmo predicado** que `trialFingerprintHash()` usa (presente e não-vazio após
   `trim`). Se os dois divergissem, o painel mentiria sobre o estado do anti-abuso. O
   nome da env var virou a constante exportada `TRIAL_FINGERPRINT_SALT_ENV` — não é
   redigitado em mensagem nenhuma.
2. **`lib/reverseTrial.ts`** — na ativação, se o salt falta: `console.error` explícito +
   evento `trial_fingerprint_salt_missing`. **Uma vez por PROCESSO** (latch de módulo),
   não por signup: um log por signup em pico é indistinguível de ruído, e log que
   ninguém lê é o mesmo silêncio com custo de storage. Serverless recicla processo com
   frequência, então a linha reaparece sozinha sem virar spam.
3. **`/admin/trial-abuse`** — faixa **vermelha** permanente no topo:
   *"anti-abuso INATIVO: falta KINEO_TRIAL_FINGERPRINT_SALT"*. Vem **antes** da faixa de
   tabela ausente, porque sem salt a tabela nem chega a ser consultada — a ordem das
   faixas espelha a ordem em que as coisas falham. É lida do **ambiente vivo** (Server
   Component), não de evento: evento só prova que faltava quando alguém se cadastrou.

O texto da faixa diz em voz alta o que o painel não conseguia dizer antes: **os
contadores ficam em zero por falta de sinal, não por falta de abuso.**

### ⚙️ AÇÃO MANUAL OBRIGATÓRIA DO FUNDADOR (não foi feita por esta sessão, de propósito)

| Campo | Valor |
|---|---|
| **Onde** | Vercel → projeto `shortsforgeai` → Settings → Environment Variables |
| **Nome (exato)** | `KINEO_TRIAL_FINGERPRINT_SALT` |
| **Ambiente** | **Production** (marcar também Preview se quiser testar em preview) |
| **Quando** | No **MESMO deploy** em que `KINEO_REVERSE_TRIAL_ENABLED=true`. Nunca depois. |
| **Valor sugerido (gerado agora, 48 bytes aleatórios)** | `Rviw6C1J28OBB0oFDL9dnmQC/XlGVgOPjMgd+qpB8UHo1SQmKskpE42MMA2VAoLg` |

Para gerar outro em vez de usar o sugerido, qualquer um dos dois:

```bash
openssl rand -base64 48
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

⚠️ **Trocar o salt depois invalida TODA a base de fingerprints** (o hash muda), o que
zera a janela de 30 dias e libera quem estava bloqueado. Definir **uma vez** e não
mexer. O valor não é segredo de autenticação — é sal de derivação; o risco de vazá-lo é
tornar os hashes de IP correlacionáveis, não dar acesso a nada.

**Como reverificar:** depois do deploy, abrir `/admin/trial-abuse`. **Sem a faixa
vermelha = salt configurado.** Com a faixa = ainda falta, e o anti-abuso está inativo.

## BÔNUS (item "liga mas monitora" #1) — **FECHADO**

`app/youtube-automation-case-study/page.tsx` — o botão hardcoded virou
`{ft(OFFER, 'Start free — 3 videos a day', 'Start free — 40 credits, no card')}`.
Flag OFF devolve o literal **byte a byte**. Era o último dos 155 call sites classificados
no item (h) que ainda vazava.

---

## PROVA DE QUE A FLAG OFF CONTINUA IDÊNTICA

Toda mudança de runtime desta correção é de **uma** destas 5 formas — verificado linha a
linha no diff (`git diff --cached`, filtrando comentários):

| Forma | Vale o quê com a flag OFF | Onde |
|---|---|---|
| `\|\| isTrialActive(row)` / `\|\| ent.isTrial` | `false` (primeira linha de `isTrialActive` é `if (!REVERSE_TRIAL_ENABLED) return false`) | compose ×2, cinematic, compose/status ×2, youtube/upload |
| `&& !isTrialActive(row)` / `&& !trialActive` | `true` (termo neutro no AND) | video-summary, compose (`isFreePlanFast`), 8 sites do GenerateClient |
| `\|\| d.trialActive === true` | `false` — `/api/credits` só popula `trialActive` dentro de `if (REVERSE_TRIAL_ENABLED)` | HistoryClient, MyVideosClient |
| `SELECT` ganhando colunas de trial | Nenhum efeito: PostgREST devolve campos a mais, ninguém os lê com a flag OFF | 6 rotas |
| `ft(OFFER, legacy, on)` | Devolve `legacy` byte a byte | case study |

**A única exceção, e ela é EXPLÍCITA:** `(REVERSE_TRIAL_ENABLED && cinematicUpstreamDebited)`.
A 1ª versão não tinha o `REVERSE_TRIAL_ENABLED &&`, e a conferência de flag-OFF achou um
caso **hoje alcançável** em que ela mudaria comportamento com a flag desligada —
descrito na dívida #7 abaixo. O gate foi então amarrado à flag para preservar
"flag OFF ⇒ produção idêntica ao estado de hoje", que é a fronteira de rollback do
sprint inteiro.

---

## PONTOS DE GATE AUDITADOS — a pergunta foi "existe algum outro caminho onde trial ainda é tratado como free?"

Varredura exaustiva de `PAID_PLANS`, `has_paid`, `is_pro`, `isFreePlan`, `isFreePlanFast`,
`hasPaidCreditAccess`, `isPaidUser`, `isPaidAccount`, `fetchUserPlan`, `creditCostFor`,
`withEndCard`, `watermark`, `FREE_OFFER`, `reserveFreeFastPreviewSlot`, `402`, `403` em
`app/`, `lib/` e `components/`. Duas passadas.

### ✅ CORRIGIDOS (12 pontos, 12 arquivos)

| # | Arquivo : predicado | Consequência que o trial sofria |
|---|---|---|
| 1 | `api/compose` · `hasPaidCreditAccess` | 402 no Seedance **já debitado** |
| 2 | `api/compose` · `isFreePlanFast` | marca d'água + end card + clamp 15s + cota 1/30d + preço 0 |
| 3 | `api/compose` · `reservePaidCreditSlot.hasPaidEntitlement` | 402 no Fast **e** em avatar/presenter |
| 4 | `api/compose` · clamp lendo `ent.maxDurationSeconds` | (fonte da regra, runtime idêntico) |
| 5 | `api/generate-video-cinematic` · `currentPaid` (releitura de admissão) | 402 poucas linhas antes do débito |
| 6 | `api/compose/status` · branding do histórico | descrição marcada persistida |
| 7 | `api/compose/status` · `fastIsPaidUser` (liquidação legada) | render legado liquidado a 0 → marcado como asset com watermark |
| 8 | `api/youtube/upload` · `isPaid` | linha de crédito Kineo gravada na descrição **real** do canal |
| 9 | `api/video-summary` · `isFreePlan` | descrição marcada no painel |
| 10 | `GenerateClient` · `isPaidAccount` + 7 sites de copy/telemetria | "0 / FREE", "free preview · watermark", venda de remoção de marca d'água ($4.90) de um vídeo **já limpo**, export rotulado `watermarked` |
| 11 | `HistoryClient` · `cleanAccess` | paywall de export limpo + selo "⬇ WM" |
| 12 | `MyVideosClient` · `cleanAccess` | idem |

O selo "⬇ WM" das duas bibliotecas se resolve sozinho por um segundo caminho:
`isWatermarkedFastAsset()` é `quality_mode === 'fast' && credits_used === 0`, e o Fast do
trial agora custa 1.

### ⚪ AUDITADOS E **NÃO** ALTERADOS — com o motivo

Escopo desta correção: os 3 bloqueadores + o item cosmético. Estes gates tratam o trial
como free, foram conferidos um a um e **não** afetam o caminho de geração/export que os
bloqueadores descrevem. Ficam registrados para o fundador decidir.

| Arquivo : gate | O que o trial perde | Por que não foi mexido |
|---|---|---|
| `api/footage` · `isPaid` | upload de footage própria | Feature de plano pago fora do caminho de geração; nenhum grep do escopo (`isFreePlan`/`hasPaidCreditAccess`/`isFreePlanFast`) casa aqui |
| `api/characters` · `characterLimitFor(plan, hasPaid)` → 0 | salvar personagem | idem |
| `api/autopilot/schedules` · `AUTOPILOT_PAID_PLANS` | Autopilot | O predicado **de propósito** ignora `has_paid`/`is_pro` (comentário no próprio arquivo); Autopilot é tier próprio, não "Creator" |
| `api/generate` · `is_pro` + `FREE_LIMIT=1` | geração de script em lote | Caminho **legado** (`!isTopicMode`); o pipeline v2.5 usa `generate-script`→`analyze-idea`. Mesma classe do `/api/credits/deduct` já registrado como "armadilha carregada, não vazamento ativo" |
| `api/generate-thumbnail` · `plan === 'pro'` | thumbnail `low` em vez de `medium` | Um **Creator pago** também recebe `low` — não é regressão de trial |
| `api/generate-video` e `compose` · `fetchUserPlan().isPro` | 403 em `basic`/`basic_ai`/`pro` | Qualidades da era Runway; a UI atual só emite `fast`/`cinematic_ai`/`creator` |
| `api/generate-video-fast` · `AI_HOOK_PAID_PLANS` | — | Classifica o trial como free-tier e por isso **dá** o hook AI grátis. É benefício, não degradação |
| ~30 sites de admin/métricas/coorte de e-mail | — | Leitura, sem impacto de entitlement. O trial entra em coorte de upsell free enquanto o trial corre: **defeito de mensagem**, não de acesso |
| `AccountClient`, `DashboardClient`, `layout`, `ThumbnailGeneratorClient`, `LowCreditsUpsell` | copy de free tier | Cosmético, fora do caminho de geração/export |

### 💸 DÍVIDA NOVA DESCOBERTA (não é do trial, não foi corrigida)

**#7 — Comprador de pacote pode tomar 402 num Seedance que já pagou.**
`plan='free'`, `has_paid=true`, saldo exatamente 20: o débito de 20 zera o saldo,
`hasPaid && creditBalance > 0` vira `false`, e `/api/compose` recusa um render **já
cobrado** — estorno só no `refund-sweep` das 09:30 do dia seguinte. É o **mesmo defeito
do bloqueador #1**, atingindo um cliente **pagante**, e é **anterior** ao reverse trial
(existe hoje, em produção, com a flag OFF). A correção é uma linha (tirar o
`REVERSE_TRIAL_ENABLED &&` do termo `cinematicUpstreamDebited`), mas isso alargaria um
gate para contas **fora** do trial — fora do escopo desta correção e fora da fronteira
de rollback da flag. **Decisão do fundador.**

---

## VEREDITO ATUALIZADO

# 🟡 PODE LIGAR — depois de 1 ação manual + 1 reteste

Os 3 bloqueadores estão fechados no código. **Sobram duas coisas, e nenhuma é código:**

1. **Setar `KINEO_TRIAL_FINGERPRINT_SALT` na Vercel (produção)**, no mesmo deploy da
   flag. Instruções exatas + valor sugerido na seção do #3. Confirmação visual:
   `/admin/trial-abuse` **sem** a faixa vermelha.
2. **O reteste fim-a-fim contra o banco real continua obrigatório** — e continua **não
   executado por esta sessão**, pelos mesmos motivos da tabela "NÃO CONSEGUI TESTAR"
   (o `.env.local` da raiz é o stub, e o host corta shell em ~178s). Um signup real,
   **dois** Seedance (para exercitar o teto de 40 e o caso do último render) e **um**
   Fast, conferindo: os dois Seedance renderizam sem 402, o Fast sai **sem marca
   d'água**, com a **duração pedida**, **não** consome a cota do free tier e debita
   **1** crédito. Enquanto esses três casos não passarem contra o banco real, o veredito
   não vira verde.

*Correções de 07/08/2026 sobre `a4d73dd`. `tsc --noEmit` EXIT=0. Flag
`KINEO_REVERSE_TRIAL_ENABLED` permanece OFF neste commit.*

---

*QA executado em 07/08/2026. Deploy `ec9f112`. Flag `KINEO_REVERSE_TRIAL_ENABLED` OFF
durante toda a auditoria de produção.*
