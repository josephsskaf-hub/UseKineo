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

*QA executado em 07/08/2026. Deploy `ec9f112`. Flag `KINEO_REVERSE_TRIAL_ENABLED` OFF
durante toda a auditoria de produção.*
