# QA PÓS-DEPLOY — 2026-08-07

**Deploy sob teste:** `115985d` / `dpl_DuVkMA9WZya7ugxwbj1DQZvpPZaj`
**Estado:** READY em produção (`www.usekineo.com`, `usekineo.com`, `shortsforgeai.com`)
**Janela:** deploy `buildingAt` 02:12:06Z → **READY 02:13:02Z**. QA rodado 02:17Z–02:22Z.
**Env:** `KINEO_REVERSE_TRIAL_ENABLED=true`, `KINEO_TRIAL_FINGERPRINT_SALT` setado.

> Regra desta rodada: nada é afirmado sem comando+saída ou SQL+resultado. Onde não
> houve evidência de runtime, está escrito NÃO TESTADO — não "passa".

---

## ⚠️ ACHADO QUE GOVERNA O VEREDITO

**O fix `115985d` (double-count do teto do trial) nunca executou em produção.**

Linha do tempo, toda ela por evidência:

| Momento (UTC) | Fato | Evidência |
|---|---|---|
| 01:28:22 | trial ativado, grant 40, cap 40 | evento `trial_credits_granted` `{"cap":40,"credits":40,"variant":"7d"}` |
| 01:31:47 | 1 render cinematic, custo 20 | `credit_debits` 1 linha `amount=20`; `trial_debit_ledger` 1 linha `cost=20` |
| 01:31:47 | **trial morreu com UM vídeo** | evento `trial_expired` `{"cap":40,"reason":"credit_cap","credits_used":40,...}` ← 40 a partir de um débito de 20 = o bug |
| **02:13:02** | **deploy do fix fica READY** | `get_deployment` → `ready: 1786068782228` |
| 02:13:02 → agora | **zero renders, zero débitos, zero linhas de ledger** | SQL: `ai_debits_after_deploy=0`, `ledger_after_deploy=0` |

Ou seja: o único render de IA que existiu rodou **41 minutos ANTES** do fix subir, no
código velho, e reproduziu o bug em produção. Depois do fix, nada rodou.

**Consequência 2:** o perfil de teste hoje lê `trial_status='active'`,
`trial_credits_used=20` — **incompatível** com o evento `trial_expired` das 01:31:47.
Não existe nenhum evento de reparo em `events`. Logo a linha foi **corrigida à mão por
UPDATE fora do código**. Portanto "estorno devolve ao teto e ressuscita o trial"
**não está provado por dado de produção** — está provado só por leitura de código.

O que *está* provado no schema: `trial_debit_ledger` tem
`PRIMARY KEY (render_id)` + `CHECK (cost > 0)` — a idempotência por render é garantida
pelo banco, que era a raiz do defeito.

---

## Tabela de casos

### A — Saúde pública (13 rotas)

| Caso | Evidência | Status |
|---|---|---|
| Status HTTP de 13 rotas | `curl -o /dev/null -w %{http_code}`: `/`=200, `/pricing`=200, `/signup`=200, `/login`=200, `/forgot-password`=200, `/generate`=200, `/wall`=200, `/scripts`=200, `/vs`=200, `/facts`=200, `/youtube-automation-case-study`=200, `/sitemap.xml`=200, `/llms.txt`=200 | **PASSA** |
| + 2 páginas `/free-ai-shorts/*` | `/free-ai-shorts/money`=200, `/free-ai-shorts/mystery`=200 (colhidas do sitemap) | **PASSA** |
| Copy velha "3 free Shorts every 24h" | `grep -c` = **0** nas 15 páginas | **PASSA** |
| `[object Object]` | `grep -o` = **0** nas 15 páginas | **PASSA** |
| `undefined` visível | Ocorrências existem mas **todas** são `$undefined` do payload RSC do Next (`"crossOrigin":"$undefined"`, `"templateStyles":"$undefined"`). Nenhuma em texto renderizado. | **PASSA** |
| Copy nova do trial no ar | Home/pricing/signup: `"Start free — your first video is on us. New accounts get a full Creator trial: 40 credits, every engine except Studio."`; chip `"Free Creator trial on signup — 40 credits"`; FAQ `"New accounts get a Creator trial with clean exports"`; payload `{"reverseTrial":true}` | **PASSA** |
| Troca atômica de copy | O literal legado (`'3 watermarked Fast videos / 24h'`) segue no código dentro de `ft(OFFER, legado, novo)` (`app/(auth)/signup/page.tsx:428`, `login/page.tsx:215`, `AccountClient.tsx:405`) mas o HTML servido entrega **só** a variante nova ⇒ o toggle está resolvendo do lado certo | **PASSA** |
| "Start free" → `/signup` (`c7f12fd`) | `grep '<a...>Start free</a>'` na home: `href="/signup?src=nav"`, `href="/signup?src=nav-mobile"`, `href="/signup"`. Zero âncoras. | **PASSA** |
| Âncora residual na home | Ainda existe `<a class="btn btn-w" href="#try-kineo">Choose my topic — free</a>`. `grep 'id="try-kineo"'` = **1** ⇒ o alvo existe, então rola a página (não é link morto). | **RESSALVA** |
| `/signup` com texto novo | `🎁 Free Creator trial on signup — 40 credits · No card` + `Full Creator trial: 40 credits, every engine except Studio` | **PASSA** |

### B — Estado do banco (perfil `84c9ddee-…fad0a`)

| Caso | Evidência | Status |
|---|---|---|
| Perfil | `plan=free`, `video_credits=20`, `trial_status=active`, `trial_credits_granted=40`, `trial_credits_used=20`, `trial_variant=7d`, `trial_ends_at=2026-08-14T01:28:22Z`, `trial_downgraded_at=null` | consistente **agora** |
| Débito somou 20 e não 40? | `credit_debits`: **1 linha**, `amount=20`, `kind=video`, `refunded_at=null`. `trial_debit_ledger`: **1 linha**, `cost=20`, `render_id=cinematic-0ea18752-…` | **PASSA** (contabilidade atual bate) |
| Trial só expirou se chegou a 40? | **NÃO.** Evento `trial_expired` às 01:31:47 com `credits_used:40` após um único débito de 20. | **FALHA (histórica, pré-fix)** |
| Existe 2º vídeo de IA pós-reparo? | **Não existe.** `videos` do perfil: 2 linhas — `fast` `credits_used=0` (01:24:42) e `cinematic_ai` `credits_used=20` (01:38:00). Ambas anteriores ao deploy. | **NÃO TESTADO** |
| Idempotência do ledger | `PRIMARY KEY (render_id)`, `CHECK (cost > 0)` | **PASSA** (schema) |
| Reparo da linha | Nenhum evento de reparo em `events`; estado atual ≠ estado que o evento `trial_expired` gravou ⇒ UPDATE manual | **RESSALVA** |
| Anti-abuso por fingerprint | `trial_signup_fingerprints`: 1 linha, `fingerprint_hash=df1b4fe1…4c62b` (hash real, não nulo), `outcome=activated`, 01:28:22 — mesmo instante do grant ⇒ o salt está em uso | **PASSA** |
| E-mails D0–D10 | `trial_emails_log` = **0 linhas**. Só existe 1 perfil com trial no banco inteiro. | **NÃO TESTADO** |

### C — Logs de runtime (Vercel, 3h)

| Caso | Evidência | Status |
|---|---|---|
| Erros 5xx | `get_runtime_logs statusCode=5xx since=3h` → "No logs found". Histograma `group_by=statusCode`: 200=2117, 304=152, 404=131, 401=35, 206=28, 307=17, 402=1. **Nenhum 5xx.** | **PASSA** |
| `ANTI-ABUSE INACTIVE` | `get_runtime_logs query="ANTI-ABUSE" since=3h` → "No logs found". String existe no código (`lib/reverseTrial.ts:617`), então a ausência é significativa. Corroborado pelo fingerprint hash gravado. | **PASSA** |
| Exceções nas rotas novas | Sem 5xx e sem log de erro nas rotas do trial | **PASSA** |
| Falhas de cron | Nenhum 5xx; os 35 respostas 401 são consistentes com o fail-closed dos crons | **PASSA** |
| Varredura `level=error/warning` | A consulta **estourou o time budget** da API da Vercel ("Query did not finish within the time budget"). Coberto indiretamente pelo histograma de status (sem 5xx). | **PARCIAL** |

### D — Crons

| Caso | Evidência | Status |
|---|---|---|
| Registrados | `vercel.json`: `/api/cron/trial-downgrade` → `55 * * * *`; `/api/cron/trial-lifecycle-emails` → `30 16 * * *` | **PASSA** |
| Colisão de horário | Nenhum outro cron em `:55` nem em `30 16`. Os vizinhos são `:05,:35`, `:10,:40`, `:15,:45`, `:40`, `:50`, `:00`, `20 */2`. | **PASSA** |
| (pré-existente) | `send-activation-nudge` e `send-video-ready` **colidem em `:40`** — não é desta entrega, mas fica registrado | **RESSALVA** |
| Fail-closed sem segredo | `curl` sem header: `trial-downgrade` → **401**, `trial-lifecycle-emails` → **401**, `refund-sweep` (controle) → **401** | **PASSA** |

### E — Marca d'água (`3e54616`)

Prova por leitura de código no HEAD `115985d`, `lib/compose.ts`:

| Caso | Evidência | Status |
|---|---|---|
| Só existem 2 builders | `grep '^export function build.*CreatomateSource'` → `buildCreatomateSource` (:1572) e `buildHollywoodCreatomateSource` (:2497) | — |
| Exatamente 1 gate por builder | `grep -c 'if (watermark)'` = **2** → linhas 2396 e 2828 | **PASSA** |
| Elemento emitido | Cada gate empurra **1** `{type:'text', track:9, time:0, duration:totalDuration, text: WATERMARK_TEXT, y:'5%'}`; `WATERMARK_TEXT = 'usekineo.com/free'` (:34) | **PASSA** |
| Lockups e CTA da cauda sumiram | `grep 'track: (6|7|10)'` → **nenhuma ocorrência**. `'Made with Kineo'` como literal só aparece em **comentários** de `compose.ts` e no widget de embed (`app/widget/page.tsx`, `app/llms.txt/route.ts`) — nada no render. | **PASSA** |
| `endCard` inerte | Param ainda aceito (`:271`, `:2505`) mas **não há nenhum `if (endCard)`**; nunca emite elemento | **PASSA** |
| Free = 1 / Pago = 0 | Flag vem de `lib/reverseTrial.ts:520` → `watermark: !treatAsPaid`, com `treatAsPaid = isPaidAccount \|\| isTrial`. Pago **e trial** ⇒ `watermark:false` ⇒ **0 elementos de marca**. Free ⇒ 1. Hollywood usa `forced = FORCE_WATERMARK_EMAILS.has(email)` (contas de auto-promo). | **PASSA** |
| Conferência no artefato | MP4 mais recente do perfil: `HTTP/2 200`, `content-length: 46521715`, **`last-modified: Fri, 07 Aug 2026 01:38:00 GMT`** — 35 min ANTES do deploy ⇒ foi renderizado pelo builder **velho** (3 marcas). Não serve de prova do `3e54616`. | **NÃO TESTADO** |

### F — Regressão de dinheiro

`profiles` não tem coluna `updated_at`; a checagem foi feita por atividade
(`credit_debits`, `videos`, `events`, `stripe_events`) nas últimas 6h.

| Perfil | plano | créditos | débitos 6h | vídeos 6h | linhas ledger trial | eventos 6h |
|---|---|---|---|---|---|---|
| josephsskaf@gmail.com | autopilot_trial | 571 | 0 | 0 | 0 | 24 (navegação) |
| valos87196@gouziben.com | basic | 75 | 0 | 0 | 0 | 0 |
| josephskaf@hotmail.com | pro | 43 | 0 | 0 | 0 | 0 |
| akajitin@gmail.com | starter | 22 | 0 | 0 | 0 | 0 |
| emiliomontinari@gmail.com | starter | 25 | 0 | 0 | 0 | 0 |

| Caso | Evidência | Status |
|---|---|---|
| Nenhum pagante mudou plano/saldo | 0 débitos, 0 vídeos, 0 linhas de ledger de trial em todos os 5 | **PASSA** |
| Nenhum webhook de cobrança | `stripe_events` nas 6h = **0** | **PASSA** |
| Nenhum evento de plano | eventos com `plan/subscription/downgrade/checkout_completed/refund` nas 6h = **0** | **PASSA** |
| Trial não vazou para pagante | nenhum perfil pago tem `trial_status` não-nulo (`trial_profiles_total = 1`, que é o de teste) | **PASSA** |

### Itens fora do alcance desta rodada

| Caso | Motivo |
|---|---|
| `920f50f` — "already registered" → login + recuperar senha | Exige submeter o form com e-mail existente. **Código conferido** (`app/(auth)/signup/page.tsx:747`): `/already\s*registered\|already\s*exists/i.test(error)` renderiza `Sign in instead` + `Forgot your password?` → `/forgot-password`. O texto do Supabase é "User already registered" ⇒ casa com a regex. Runtime **NÃO TESTADO**. |
| `cd750ea` — ativação server-side no `/generate` | O grant real das 01:28:22 tem `path: null` (server-side) mas foi disparado logo após `autopilot_page_viewed`, não `/generate`. Ativação server-side **funciona**; o caminho específico do `/generate` **NÃO TESTADO**. |
| `6696498` — hero em `clamp()` na primeira dobra | Verificação visual/viewport; não fiz screenshot. **NÃO TESTADO**. |
| Downgrade, modal de paywall, gates de feature em runtime | Exigem sessão autenticada / conta. **NÃO TESTADO**. |

---

## Problemas por severidade

### ALTA
1. **O fix principal do deploy nunca rodou.** `115985d` READY às 02:13:02Z; zero
   débitos e zero linhas de ledger depois disso (`ai_debits_after_deploy=0`,
   `ledger_after_deploy=0`). O comportamento corrigido (débito conta uma vez, estorno
   devolve ao teto, trial ressuscita) **não tem uma única amostra de produção**.
2. **O bug foi confirmado em produção e o dado foi consertado à mão.** Evento
   `trial_expired` às 01:31:47 gravou `credits_used:40` a partir de um débito de 20.
   O perfil hoje lê 20/40 ativo, sem nenhum evento de reparo ⇒ UPDATE manual. Qualquer
   leitura de "está funcionando" a partir do estado atual do perfil é circular.

### MÉDIA
3. **Marca d'água não verificada em artefato.** O MP4 mais recente
   (`last-modified 01:38:00Z`) é anterior ao deploy e foi gerado pelo builder de 3
   marcas. A prova de "1 marca no free / 0 no pago" é **só de código**.
4. **E-mails D0–D10 sem nenhuma execução.** `trial_emails_log` vazio; existe 1 único
   perfil com trial no banco. O cron `trial-lifecycle-emails` só roda às 16:30 UTC.

### BAIXA
5. **Âncora residual na home:** `href="#try-kineo"` no CTA "Choose my topic — free".
   O alvo `id="try-kineo"` existe, então rola em vez de não fazer nada — mas é
   exatamente o padrão que o `c7f12fd` foi corrigir no botão principal.
6. **Colisão de cron pré-existente em `:40`** entre `send-activation-nudge` e
   `send-video-ready`. Não é desta entrega.
7. **Cobertura de log incompleta:** a varredura `level=error/warning` estourou o time
   budget da API da Vercel. Suprida pelo histograma de status (sem nenhum 5xx).

---

## VEREDITO

### **ESTÁVEL COM RESSALVAS**

Não há motivo para reverter: **zero 5xx em 3h**, 15 rotas públicas em 200, copy nova do
trial no ar sem resíduo da antiga, "Start free" apontando para `/signup`, crons novos
registrados sem colisão e fechando em 401 sem segredo, anti-abuso comprovadamente ativo
(hash de fingerprint gravado, log `ANTI-ABUSE INACTIVE` ausente), e **nenhum perfil
pagante tocado** — sem débito, sem vídeo, sem webhook, sem mudança de plano.

Mas o deploy **não pode ser declarado validado**. A correção que dá nome a ele
(`115985d`) subiu há minutos e não processou nenhum render; o único render de IA que
existe é anterior ao fix e reproduziu o bug; e o estado saudável do perfil de teste veio
de um reparo manual, não do código. Do mesmo jeito, a mudança de marca d'água
(`3e54616`) não tem nenhum MP4 pós-deploy para conferir.

**Para fechar o veredito em "estável", falta exatamente um teste:** gerar **dois** vídeos
de IA no perfil de trial depois de 02:13:02Z e confirmar que
`trial_credits_used` vai 20 → 40 (e não 20 → 40 no primeiro), que
`trial_debit_ledger` ganha uma linha por render, e que o MP4 resultante tem uma marca só.
Enquanto isso não acontecer, o risco continua registrado, não resolvido.
