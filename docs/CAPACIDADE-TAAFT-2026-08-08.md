# CAPACIDADE PRÉ-TAAFT — 08/08/2026

Marcador: `KINEO-CAPACITY-2026-08-08`
Contexto: relançamento no TAAFT ($347) hoje à tarde. Pico anterior: 68 cadastros em 31/07
e 69 em 01/08 (medido em `auth.users`). Diferença que muda tudo: desde 07/08 todo cadastro
novo ganha 40 créditos de trial e é tratado como conta paga.

---

## 1. A CONTA

### Custo unitário real (medido contra fatura, `docs/UNIT-ECONOMICS-2026-08-03.md`)

| Tipo | Créditos | fal | Creatomate | OpenAI | **Total** |
|---|---:|---:|---:|---:|---:|
| Fast (stock + TTS) | 1 | $0 | $0,074 | $0,027 | **~$0,10** |
| Fast 1º vídeo (com AI hook Seedance) | 1 | $0,219 | $0,074 | $0,027 | **~$0,32** |
| AI Gen / `cinematic_ai` (Seedance) | 20 | ~$1,97 | $0,074 | $0,027 | **~$2,07** |
| Hollywood | 150 | ~$8,90–10,20 | — | — | **~$9–10** |
| Avatar / Presenter | 110 / 70 | — | — | — | **~$2,5–9,6** |

Fonte dos créditos: `lib/credits/engineCost.ts`. Cost basis conservador do código:
`WORST_CASE_USD_PER_CREDIT = 0.117` (`lib/checkoutPricing.ts:311-323`).

**Observação que mais importa para a margem:** Fast custa 1 crédito e ~$0,10 → **$0,10/crédito**.
Seedance custa 20 créditos e ~$2,07 → **$0,104/crédito**. São praticamente idênticos.
Ou seja: **não existe "motor barato" em termos de crédito**. O custo do pico é governado
pelo total de créditos gastos, não pelo mix de motores. E o **Creatomate entra em TODO
render** (Fast ou IA) — é o driver de volume; o fal é o driver de pico.

### O que o trial pode alcançar

`lib/reverseTrial.ts`: `TRIAL_CREDIT_CAP = 40`. `allowsStudioEngines: isPaidAccount` —
**Kling (50), Veo (90) e Hollywood (150) são inalcançáveis por desenho**, e Avatar (110) /
Presenter (70) não cabem em 40. O trial só chega a **Fast (1 cr)** e **Seedance (20 cr)**.
A afirmação "40 créditos = 2 vídeos de IA" está **correta e é intencional**.

### Os três cenários

Base: 65 cadastros × 40 créditos = **2.600 créditos concedidos**.

| Cenário | Créditos gastos | Renders de IA | **Custo provedor** |
|---|---:|---:|---:|
| Pior caso aritmético (100% em Seedance) | 2.600 | 130 | **~$269** |
| Cenário da missão ("metade usa tudo") | 1.300 | 65 | **~$135** |
| **Medido na coorte real de trial** | ~569 | ~16 | **~$60** |

O cenário medido vem das 12 contas de trial reais (07–08/08): **105 créditos gastos no
total, 8,75 por conta**, e **3 de 12 (25%) fizeram 1 Seedance cada**. Aplicando 8,75 cr/conta
a 65 cadastros: 569 créditos ≈ $60.

**Teto absoluto de exposição = ~$269**, e só se todo mundo gastar todo crédito em IA —
o que a coorte real está longe de fazer. Contra $347 de anúncio, **a empresa tem saldo para
isso**, desde que os saldos dos provedores estejam de pé (ver §2).

### Realidade histórica que reduz o medo

30 dias de `render_jobs`: **339 `fast` e 21 não-`fast`** (13 seedance, 4 veo, 2 presenter,
1 avatar, 1 hollywood). No dia de MAIOR tráfego já registrado (01/08, 69 cadastros,
73 renders, 54 pessoas) houve **ZERO renders de IA**. O pico de cadastros historicamente
**não** vira pico de IA — vira pico de Fast, e Fast é dominado por Creatomate + Pixabay.

---

## 2. SALDO DOS PROVEDORES — **CHECAGEM MANUAL DO FUNDADOR**

**Não consegui verificar saldo por API.** Motivo honesto: o `.env.local` da máquina só tem
placeholders (`OPENAI_API_KEY` com 7 caracteres, `CREATOMATE_API_KEY` com 14); as chaves
reais vivem só no Vercel e não são legíveis daqui. Além disso, `fal`, `Creatomate` e
`Resend` não expõem endpoint público de saldo.

**Abrir estes painéis ANTES de disparar o TAAFT (5 minutos):**

| Provedor | Painel | O que olhar | Por que importa |
|---|---|---|---|
| **fal.ai** | fal.ai/dashboard/billing | Saldo em USD | Seedance é pré-pago. Teto de exposição $269. **Ter ≥ $300.** |
| **Creatomate** | creatomate.com → Billing | Créditos restantes | ~5,7 cr/Short. **Entra em TODO render.** Um pico de 200 Fast = ~1.140 cr. |
| **OpenAI** | platform.openai.com/settings/organization/billing | Saldo | Já causou o blackout de 31/07 (`openai_quota_dead`, 85 eventos / 24 pessoas). |
| **Resend** | resend.com → Usage | Envios no mês vs plano | Free = 3.000/mês, 100/dia. Um pico estoura o limite DIÁRIO. |
| **Supabase** | supabase.com → cqqukkvjjrguayiyjvhh → Usage | Storage + egress | 251 dos 259 vídeos moram no Storage. |
| **Pixabay / Pexels** | — | — | Gratuitos. Risco é rate limit e instabilidade, não saldo. |

**ElevenLabs NÃO é risco hoje:** `ELEVENLABS_API_KEY` não está configurada e
`isElevenLabsEnabled()` (`lib/narration/elevenlabs.ts:41`) devolve `false` sem ela — o TTS
cai em OpenAI `tts-1-hd`. Não há gasto de ElevenLabs a proteger.

---

## 3. O QUE QUEBRA PRIMEIRO — **Pixabay, e já quebrou**

Não é hipótese. Está nos logs de runtime da Vercel dos últimos 7 dias:

- **61 timeouts de 120s em `/api/generate-video-fast`, 20 pessoas.**
- **~40 grupos de erro distintos `[pixabay] non-ok status=500/503/504`**, todos na mesma rota.
- Concentrados em **05/08 15:18–16:47Z** — uma queda real do Pixabay de ~1h30.
- No mesmo instante: **`fast_dispatch_not_ok` = 134 eventos / 41 pessoas** (`events`),
  último em 05/08 16:42Z. **São as 41 pessoas sem vídeo.**

### Causa raiz (era exatamente o bug da OpenAI de 05/08, ainda aberto)

`lib/pixabay.ts` chamava `fetch(url, { cache: 'no-store' })` **sem timeout, sem retry,
sem backoff**. Consequências encadeadas:

1. Pixabay lento → a lambda fica presa → **Vercel mata em 120s** → nosso `catch` nunca roda
   → nem o fallback de `stockLibrary`, nem mensagem honesta. Gateway devolve 504 cru.
2. Pixabay 429/503 → `return []` → **indistinguível de "não achei nada"** → o vídeo sai com
   b-roll genérico e **ninguém fica sabendo**. Degradação 100% silenciosa.
3. Não havia alerta. `fal` tem `alertFalExhausted`, OpenAI tem `alertOpenAiExhausted`.
   Pixabay não tinha nada.

O comentário em `app/api/generate-video-fast/route.ts:500-506` já descrevia esse padrão
para a OpenAI e a correção aplicada lá (`lib/openai.ts`, timeout 20s + maxRetries 1).
**Pixabay ficou de fora.**

### Volume no pico (por que ia piorar)

`lib/pixabay.ts:458-461` faz **2 requests concorrentes por query**. Por vídeo de 9 cenas:
18 requests no caso bom, até 54 no caso ruim. **65 vídeos = 1.170 a 3.500 requests** contra
um limite documentado de 100 req/60s numa **única chave**. O cache é um `Map` de módulo
(`SEARCH_CACHE_MAX = 300`), **por instância de lambda** — no pico a Vercel escala para N
instâncias frias e o cache não existe exatamente quando é mais necessário.

---

## 4. O QUE FOI BLINDADO (implementado hoje)

### 4.1 `lib/pixabay.ts` — timeout + retry + disjuntor de instância

Três travas, todas com env var e **todas fail-open** (na dúvida devolve `[]`, exatamente
como já devolvia — nenhuma pode derrubar uma geração que hoje passa):

| Env var | Default | Efeito |
|---|---:|---|
| `PIXABAY_TIMEOUT_MS` | 6000 | Orçamento de UMA chamada. Resposta saudável é <1s. |
| `PIXABAY_MAX_ATTEMPTS` | 2 | 1 retentativa, **só** em falha transiente (rede, 429, 5xx). |
| `PIXABAY_RETRY_BACKOFF_MS` | 300 | Espera entre tentativas. |
| `PIXABAY_BREAKER_THRESHOLD` | 4 | Falhas transientes consecutivas que abrem o disjuntor. |
| `PIXABAY_BREAKER_COOLDOWN_MS` | 60000 | Quanto tempo fica aberto antes de deixar uma sonda passar. |

**Por que o disjuntor é obrigatório e não enfeite:** só com timeout+retry, o pior caso
seria 9 cenas × 12,3s = **110s** — o timeout de 120s de volta pela porta dos fundos.
Com o disjuntor, 2 rodadas de falha (~25s) abrem o circuito e o resto do vídeo cai
instantaneamente no fallback. **A pessoa recebe um vídeo com b-roll genérico em segundos
em vez de nada em dois minutos.** É essa a degradação graciosa.

Classificação correta de erro, que era o defeito central:
- **429 e 5xx = transiente** → retenta e conta para o disjuntor.
- **4xx que não seja 429 = permanente** (chave errada, query malformada) → falha rápido,
  **não** conta para o disjuntor, porque o Pixabay está de pé e a culpa é nossa.

Também adicionado `readPixabayHealth()` — contadores `ok / transient / hard / timeout /
shortCircuited` da instância, para o diagnóstico deixar de ser adivinhação.

**A única mudança de comportamento:** com o disjuntor aberto, uma query que *talvez*
funcionasse é pulada por até 60s naquela instância. É o trade-off certo durante uma queda
real, e é desligável (`PIXABAY_BREAKER_THRESHOLD` alto).

### 4.2 `lib/aiRenderCircuitBreaker.ts` — o disjuntor global (NOVO)

Antes de hoje, **o único teto global do produto inteiro** era o do post-to-earn
(`POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP = 100`). Todo o resto é por usuário: `freeFastQuota`
(3/24h), cooldown de 2 falhas/15min do cinematic, `TRIAL_CREDIT_CAP` de 40. **Nada olhava
a soma.** Não havia nada entre 65 contas novas e a fatura do fal.

| Env var | Default | Efeito |
|---|---:|---|
| `KINEO_GLOBAL_DAILY_AI_RENDER_CAP` | **150** | Teto global de renders de IA em 24h. `off` desliga sem redeploy. |

**Justificativa do número pelo caixa:** 150 renders/dia × ~$2,07 = **~$310/dia** de exposição
máxima ao fal — abaixo do que o próprio relançamento custa ($347). A regra é "nunca perder
num dia mais do que se gastou para comprar o dia". Ao mesmo tempo é **7× o pior caso
aritmético do pico** (130), **9× o pico medido** (16) e **~200× a linha de base** (21 em
30 dias). Não estrangula lançamento nenhum.

`fast` fica **fora do teto de propósito**: custa ~$0,10, não toca o fal, e é o caminho de
ativação de todo mundo. Capar Fast seria estrangular exatamente o que o lançamento quer.

Posicionamento em `app/api/generate-video-cinematic/route.ts`: **depois** da checagem de
saldo, **antes** de `ensureCinematicDebit`. Quem bate no teto **não é cobrado, não perde
crédito e não precisa de estorno**. `releaseBirthClaim('global_daily_ai_cap')` devolve o
claim — e essa função já é ciente de reembolso (`route.ts:1097-1098`), então mesmo num
caminho de resume que já debitou, o crédito volta antes do claim ser liberado.

Mensagem honesta ao usuário (`AI_RENDER_CAP_MESSAGE`): diz que o limite é **nosso**, que
**nada foi cobrado**, que **Fast continua disponível** e que reabre em algumas horas.

**Fail-open sempre.** Se a contagem falhar, o render passa. Um disjuntor que derruba
cliente pagante porque a nossa telemetria piscou é pior do que não ter disjuntor.

> ⚠️ **LIMITE CONHECIDO, DOCUMENTADO E NÃO EMPURRADO.** `render_jobs` não é escrito por
> esta rota — quem escreve é `recordRenderIntent()`, chamado só de `/api/compose`,
> `/api/compose/unlock` e `/api/render` (`lib/credits/renderIntent.ts:59`), ou seja na
> **montagem final**, um ciclo de geração depois do submit ao fal. Portanto o teto é um
> freio de **queima sustentada**, não um portão instantâneo: contra 65 pessoas gerando ao
> longo de horas ele engata; contra uma avalanche verdadeiramente simultânea de 150+
> submissões, não. O caminho de precisão está medido — `credit_debits` com render_id
> `cinematic-%` é escrito **no submit** (15 linhas / 910 créditos em 40 dias, amounts
> 20–150) e daria contagem em tempo real. **Não foi trocado hoje** porque inverteria o viés
> de erro do lado seguro (subcontar → passa) para o perigoso (supercontar → bloqueia
> cliente pagante), a horas de um lançamento. É a primeira melhoria pós-pico.

---

## 5. O QUE **NÃO** FOI TOCADO (achado, medido, deliberadamente não empurrado hoje)

Cada um destes é real e está documentado para depois do pico. Nenhum foi mexido porque
todos ficam no caminho do dinheiro ou do e-mail, e o momento é errado.

1. **Resend estoura 2 req/s garantidamente.** Os 9 `app/api/admin/send-*` têm
   `setTimeout(700ms)` entre envios. **Nenhum dos crons automáticos tem.** `send-video-ready`
   (a cada 30 min), `send-activation-nudge`, `send-recovery` e `send-reminders` fazem
   `for (...) await fetch(resend)` **sem pausa e sem teto por execução**. Com 65 cadastros
   gerando no mesmo dia, uma execução tenta ~65 envios back-to-back.
   **Pior:** `send-cap-hit:415` carimba a reserva **antes** do envio — quando o Resend
   recusa, o e-mail é **perdido para sempre** (o próprio código diz isso no log).
   *Mitigação disponível hoje sem deploy:* `KINEO_LIFECYCLE_EMAILS_ENABLED` ≠ `'true'`
   pausa 4 crons — **mas `send-video-ready`, `send-recovery` e `send-reminders` não checam
   esse gate** e não dá para desligá-los sem redeploy.

2. **429 é tratado como erro terminal no fal e no Creatomate.**
   `lib/falQueue.ts:66` → `const ambiguous = response.status === 408 || response.status >= 500`.
   **429 fica de fora** → vira "rejeição explícita", sem retry. `lib/compose.ts:2890` tem a
   forma idêntica. Nos dois casos é o oposto do correto: 429 é o sinal que mais merece
   backoff e é o único garantido no pico. (O lado bom: em 429 o crédito **volta na hora**;
   é em 503/timeout que ele fica preso até o cron.)

3. **`refund-sweep` roda 1×/dia, 09:30 UTC** (`vercel.json`). Numa falha **ambígua**
   (503/timeout do fal) o crédito **não** é estornado na hora — fica preso **até ~24h**.
   Durante um pico isso é muita gente com crédito parado.

4. **Creatomate falha depois de assets do fal pagos → crédito NÃO volta.**
   `app/api/compose/status/[renderId]/route.ts:944`:
   `const creditsRefunded = prepaidProviderAsset ? 0 : await refundRenderCredits(renderId)`.
   É deliberado (os clipes do fal foram entregues e pagos), mas o resultado prático é o
   usuário perdendo 20–150 créditos por falha de um **terceiro**, com assets brutos que a
   UI não entrega como vídeo final.

5. **`/api/footage` não tem `maxDuration`** — exatamente o padrão que causou o blackout de
   05/08 em `/api/generate-script` (documentado no cabeçalho daquele arquivo).

6. **`/api/generate-video-cinematic` tem `maxDuration = 60`** enquanto `generate-video-fast`
   tem 120, e faz 3 rodadas de submissão em pool de 3 + até 2 rodadas de stills. É a menor
   margem do caminho crítico sob latência elevada do fal.

7. **`lib/falAlert.ts` alerta por instância** (`let LAST_FAL_ALERT = 0`). No pico, N lambdas
   frias = **N e-mails**, não um. E o gatilho é `looksExhausted` — **429 puro não alerta**.

---

## 6. MONITORAMENTO — a query de 10 segundos

O fundador vai estar sozinho. **Uma query, 8 linhas, responde tudo.** Rodar no SQL Editor
do Supabase (projeto `cqqukkvjjrguayiyjvhh`). Testada em 08/08.

```sql
with j as (select now() - interval '24 hours' as t0)
select 'A. cadastros 24h' as linha, count(*)::text as valor from auth.users, j where created_at > t0
union all select 'B. trials ativos (saldo)', count(*)||' contas / '||coalesce(sum(video_credits),0)||' cr nao gastos'
  from public.profiles where trial_status='active'
union all select 'C. creditos de trial gastos 24h', coalesce(sum(cost),0)::text
  from public.trial_debit_ledger, j where created_at > t0
union all select 'D. renders 24h (IA / total)',
  (count(*) filter (where quality<>'fast'))||' IA / '||count(*)||' total  [TETO IA=150]'
  from public.render_jobs, j where created_at > t0
union all select 'E. $ provedor 24h (estimado)',
  '~$'||round((count(*) filter (where quality<>'fast'))*2.07 + (count(*) filter (where quality='fast'))*0.10, 2)
  from public.render_jobs, j where created_at > t0
union all select 'F. FALHAS 24h (eventos/pessoas)',
  coalesce((select count(*)||' / '||count(distinct user_id) from public.events, j
            where name='generation_stage_error' and created_at > t0),'0 / 0')
union all select 'G. top motivo de falha 24h',
  coalesce((select r||' ('||n||')' from (
     select metadata->>'reason' r, count(*) n from public.events, j
     where name='generation_stage_error' and created_at > t0 and metadata->>'reason' is not null
     group by 1 order by 2 desc limit 1) x),'nenhum')
union all select 'H. entregues 24h (video pronto)',
  coalesce((select count(*)::text from public.events, j where name='generate_completed' and created_at > t0),'0');
```

**Linha de base medida hoje (08/08, antes do pico):**

| | |
|---|---|
| A. cadastros 24h | 9 |
| B. trials ativos | 11 contas / 386 cr não gastos |
| C. créditos de trial gastos 24h | 82 |
| D. renders 24h | 3 IA / 16 total `[TETO IA=150]` |
| E. $ provedor 24h | ~$7,51 |
| F. falhas 24h | 26 eventos / 7 pessoas |
| G. top motivo | `analyze_blocked_active_render_gate` (8) |
| H. entregues 24h | 15 |

### Como ler em 10 segundos

- **A sobe e H sobe junto** → está entrando gente E gerando. Tudo certo.
- **A sobe e H fica parado** → está entrando gente e **ninguém está conseguindo gerar**. Ler G.
- **G = `fast_dispatch_not_ok`** → **é o Pixabay.** Foi a assinatura das 41 pessoas de 05/08.
- **D perto de 150** → o disjuntor vai engatar. Subir `KINEO_GLOBAL_DAILY_AI_RENDER_CAP` no
  Vercel (aplica sem redeploy) se o caixa aguentar.
- **E acima de ~$150** → parar e conferir o saldo do fal antes de continuar. E é estimativa,
  não fatura.
- **F/A alto** (falhas por cadastro) → algo sistêmico; abrir o painel de runtime da Vercel.

**Complemento na Vercel:** Observability → Runtime Logs, filtrar por `[pixabay] BREAKER OPEN`
(disjuntor abriu, degradação ativa) e `[ai-render-cap] TETO GLOBAL` (teto atingido).

---

## 7. PROVAS

- `npx tsc --noEmit` → **EXITCODE=0**.
- **tsc FALSIFICADO:** erro de tipo plantado nos 3 arquivos tocados, todos capturados —
  `app/api/generate-video-cinematic/route.ts(2057,7)`, `lib/aiRenderCircuitBreaker.ts(130,7)`,
  `lib/pixabay.ts(1234,7)`, todos `TS2322`, `EXITCODE=2`. Restaurado, `EXITCODE=0`.
- **EOL conferido no HEAD por arquivo:** `lib/pixabay.ts`, `lib/postToEarn.ts` e
  `app/api/generate-video-cinematic/route.ts` — **0 linhas CRLF**. Padrão LF preservado.
- **Revisão adversarial 2×.** Defeitos meus derrubados na 2ª passada:
  1. **`TS2589` real** — a interface estrutural do cliente Supabase estourava o tsc
     ("type instantiation is excessively deep"). Corrigido isolando a cadeia
     `.select().neq().gte()` num tipo mínimo e afirmando `from()` num ponto só.
  2. **Comentário que mentia** — a 1ª versão do cabeçalho do disjuntor dava a entender que
     o teto era um portão em tempo real. Não é: `render_jobs` nasce no compose. Reescrito
     com o limite explícito e o caminho de precisão medido.
  3. **Timeout sem disjuntor seria uma regressão** — 9 cenas × 12,3s = 110s reintroduziria
     o timeout de 120s. O disjuntor de instância existe por causa disso, não por elegância.
- **Nada de dinheiro foi alterado:** nenhum preço, nenhum crédito por render, nenhum
  entitlement, nenhuma migração, nenhuma flag de checkout. O disjuntor **recusa antes de
  debitar** e devolve o claim; não cria caminho novo de cobrança.
