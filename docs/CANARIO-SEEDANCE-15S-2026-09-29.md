# Canário — Seedance 1.5 a 15 s (E2a) — 29/09/2026

**O que está sendo provado:** o filme de 15 s no Seedance 1.5 ("vai" nominal do fundador). Custa
`creditCostForDuration('cinematic_ai', true, 15)` = **7 créditos** e é o primeiro filme de IA que cabe no trial de 10.
O botão de 15 s está atrás de `SEEDANCE_15S_PUBLIC = false` (lib/engineLaunch.ts): **só contas da casa veem**. O
servidor aceita 15 s no Seedance para qualquer conta e **recusa 15 s nos outros motores** (422, sem débito). Depois da
revisão (29/09) também recusa **Seedance abaixo de 15 s** (`duration_not_offered`, sem débito): antes, `duration: 10`
pagava 5 cr pelo piso de 10 s da conta e levava 2 clipes de IA.
⚠ "Só a casa vê" vale para o botão aberto pela tela. Um link `/studio?engine=seedance&duration=15` acende o 15 s para
qualquer conta logada (o preço cobrado continua certo, 7 cr). O canário não está isolado por URL — só pelo botão.

Guardião: `node scripts/test-seedance-15s-2026-09-29.mjs` (68 checagens; mutantes em memória que precisam ficar
vermelhos, inclusive os 7 da revisão adversarial: P1, P2, P3, M-D, M-J, M-K, M-L).

## Antes de começar

1. O commit desta entrega precisa estar no ar (deploy READY) — a rota antiga não conhece a recusa nem a guarda.
2. Conta: **josephsskaf@gmail.com** — é a única da lista `DRY_RUN_EMAILS` (lib/cinematic/classicDryRun.ts) e é interna
   (vê o botão de 15 s). ⚠ Ela está em `FORCE_WATERMARK_EMAILS`: o filme pago sai com a marca d'água
   `usekineo.com/free`. É esperado; **não usar este filme como vitrine**.
3. Saldo da fal ≥ US$ 5 (o render pago de 15 s custa ~US$ 0,52 com 2 clipes; **até ~US$ 0,80 com 3 clipes**).
   Em verbatim o nº de clipes segue a fala (#442: palavras ÷ 2,5 ÷ 10 s): **até 50 palavras = 2 clipes; 51–56 palavras
   = 3 clipes pelos mesmos 7 cr** (56 é o teto da guarda de roteiro longo). Decisão consciente da revisão de 29/09:
   manter 56 (filme mais completo, "passar do alvo é bom"); se a margem apertar, baixar SHORT_FILM_SPEECH_FACTOR para
   4/3 (teto 50 palavras = sempre 2 clipes).
4. Chrome logado em `https://www.usekineo.com/studio` → F12 → Console. Todos os passos abaixo colam no Console.

## Passo 1 — ensaio de $0, "Use my script as is" (roteiro de 45 palavras)

Roteiro (45 palavras; ≈ 17,6 s de fala na régua de 2,55 pal/s do ensaio; ≈ 18 s na régua de 2,5 da guarda):

```
In 1986, a lake in Cameroon killed more than 1,700 people in one night without a single flame. Lake Nyos released a hidden cloud of carbon dioxide from its depths. The gas rolled downhill, silent and invisible. Today, pipes vent the lake gas every day.
```

Payload:

```json
{ "generationId": "<crypto.randomUUID()>", "prompt": "<roteiro acima>", "duration": 15, "engine": "seedance", "language": "en", "script_mode": "verbatim", "dry_run": true }
```

```js
const SCRIPT = "In 1986, a lake in Cameroon killed more than 1,700 people in one night without a single flame. Lake Nyos released a hidden cloud of carbon dioxide from its depths. The gas rolled downhill, silent and invisible. Today, pipes vent the lake gas every day.";
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ generationId: crypto.randomUUID(), prompt: SCRIPT, duration: 15, engine: 'seedance', language: 'en', script_mode: 'verbatim', dry_run: true }) });
const j = await r.json(); console.log(r.status, JSON.stringify(j, null, 2));
```

**Esperado:** HTTP 200, `verdict` começando com `PASS`, **2 cenas** (2 × 10 s de footage ≥ ~18 s de fala),
`target_seconds: 15`, `total_words: 45`, `rescale_risk: false`. Créditos estornados na hora (`dry_run_no_charge`) —
o saldo do topo da tela não muda.

## Passo 2 — ensaio de $0, "Let AI structure my text" (o caminho real do produto)

No Studio, o roteirista escreve o roteiro de 15 s antes do render. Pela API são duas chamadas:

```json
POST /api/generate-script
{ "topic": "Why Lake Nyos in Cameroon killed 1,700 people in one night in 1986", "language": "en", "targetSeconds": 15, "engine": "cinematic_ai" }
```

```json
POST /api/generate-video-cinematic
{ "generationId": "<crypto.randomUUID()>", "prompt": "<script devolvido acima>", "duration": 15, "engine": "seedance", "language": "en", "script_mode": "ai", "dry_run": true }
```

```js
const g = await fetch('/api/generate-script', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ topic: 'Why Lake Nyos in Cameroon killed 1,700 people in one night in 1986', language: 'en', targetSeconds: 15, engine: 'cinematic_ai' }) }).then((x) => x.json());
console.log('palavras do roteirista:', g.words, g.minWords, g.script);
const r2 = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ generationId: crypto.randomUUID(), prompt: g.script, duration: 15, engine: 'seedance', language: 'en', script_mode: 'ai', dry_run: true }) });
const j2 = await r2.json(); console.log(r2.status, JSON.stringify(j2, null, 2));
```

**Esperado:** o roteirista devolve **47–56 palavras** com marcadores (HOOK / MICRO REWARD / PAYOFF), o que faz a rota
tratar como verbatim. HTTP 200 com o plano de **2–3 cenas**. **Ler o veredito sabendo disto (M10 do cético):** o ensaio
mede a 2,55 pal/s e dá `FAIL` por `rescale_risk` a partir de **48 palavras** (+25 % sobre as 38 esperadas), mesmo em
verbatim, onde o compose não reescreve. Esse FAIL **não bloqueia** o canário; o que bloqueia é: 0 cenas, cena muda, ou
footage menor que a fala. Com até 56 palavras a guarda nova do servidor **não** recusa (56 ÷ 2,5 = 22,4 s ≤ 22,5 s).

## Passo 3 — ensaios negativos (todos devem ser recusados SEM débito)

3a. **Kling 3 a 15 s** (estrada hollywood) — antes desta entrega planejava ~34 s e cobrava 15 s:

```json
POST /api/generate-video-cinematic
{ "generationId": "<crypto.randomUUID()>", "prompt": "<roteiro do passo 1>", "duration": 15, "engine": "hollywood", "language": "en", "script_mode": "verbatim", "dry_run": true }
```

**Esperado:** HTTP **422**, `reason: "only_seedance_15s"`, `error: "15-second films are available on Seedance 1.5; pick 35 s for this engine."`,
`suggested_seconds: 35`, `charged: false`. Repetir com `"engine": "kling"` e `"engine": "veo"` → o mesmo 422.

3b. **Roteiro longo pedido como 15 s** (B4 — sem a guarda, virava um filme de ~60 s por 7 cr):

```json
POST /api/generate-video-cinematic
{ "generationId": "<crypto.randomUUID()>", "prompt": "<roteiro do passo 1 repetido 3 vezes = 135 palavras>", "duration": 15, "engine": "seedance", "language": "en", "script_mode": "verbatim", "dry_run": true }
```

```js
const LONGO = (SCRIPT + ' ').repeat(3).trim();
const r3 = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ generationId: crypto.randomUUID(), prompt: LONGO, duration: 15, engine: 'seedance', language: 'en', script_mode: 'verbatim', dry_run: true }) });
console.log(r3.status, await r3.json());
```

**Esperado:** HTTP **422**, `reason: "script_too_long_for_short_film"`, `est_speech_seconds: 54`, `suggested_seconds: 35`,
`charged: false`. A frase oferece primeiro encurtar ("Shorten it to about 56 words to keep the 15-second price") e só
depois 35 s com o custo real (calculado pela mesma função que debita) — o trial de 10 cr não paga 35 s.

3c. **Seedance abaixo de 15 s** (revisão de 29/09): o mesmo corpo do passo 1 com `"duration": 10`.
**Esperado:** HTTP **422**, `reason: "duration_not_offered"`, `suggested_seconds: 15`, `charged: false`.

Conferência no banco (os negativos não criam claim nem débito):

```sql
select name, metadata->>'engine' as engine, metadata->>'requested_seconds' as seg, metadata->>'charged' as cobrou, created_at
from events
where name in ('duration_engine_refused', 'short_film_script_too_long_refused')
  and created_at > now() - interval '1 hour'
order by created_at desc;
```

## Passo 4 — 1 render pago de 15 s (7 cr, ~US$ 0,52 de fal)

Só com o passo 1 em **PASS** e os passos 3a/3b recusando.

1. Abrir `https://www.usekineo.com/studio?engine=seedance&duration=15` (conta josephsskaf@gmail.com).
2. Conferir na tela: botão **15s** aceso ao lado de 35s/60s/90s; "Estimated cost" = **7 cr**.
3. Colar o roteiro do passo 1, escolher **"Use my script as is"**, Generate.
4. Trocar o motor para Kling 2.5 com 15 s aceso deve voltar o seletor para **35s** (conferir antes de gerar e voltar
   para o Seedance + 15s).

Payload que o /generate manda (para conferir na aba Network):

```json
{ "generationId": "…", "prompt": "<roteiro do passo 1>", "duration": 15, "engine": "seedance", "language": "en", "script_mode": "verbatim" }
```

## Passo 5 — conferências do filme

```sql
-- o filme
select id, status, quality_mode, credits_used, created_at
from videos
where user_id = (select id from auth.users where email = 'josephsskaf@gmail.com')
order by created_at desc limit 1;
-- esperado: status = 'completed', quality_mode = 'cinematic_ai', credits_used = 7

-- o despacho cena a cena
select created_at, metadata->>'planned' as planejadas, metadata->>'accepted' as aceitas, metadata->>'rejected' as recusadas,
       metadata->>'total_posts' as posts, metadata
from events
where name = 'cinematic_dispatch_result'
  and user_id = (select id from auth.users where email = 'josephsskaf@gmail.com')
order by created_at desc limit 1;
-- esperado: 2 planejadas / 2 aceitas / 0 recusadas
```

Duração real do MP4 (caixa `mvhd`), no Console, com a URL do filme:

```js
const buf = new Uint8Array(await (await fetch('<URL do MP4>')).arrayBuffer());
const i = buf.findIndex((_, k) => buf[k] === 0x6d && buf[k + 1] === 0x76 && buf[k + 2] === 0x68 && buf[k + 3] === 0x64);
const dv = new DataView(buf.buffer, i + 4); const v1 = dv.getUint8(0) === 1;
const ts = v1 ? dv.getUint32(20) : dv.getUint32(12); const dur = v1 ? Number(dv.getBigUint64(24)) : dv.getUint32(16);
console.log('segundos =', (dur / ts).toFixed(2));
```

**Esperado: entre 15 e 22 s** ("passar do alvo é bom; ficar abaixo é defeito"). Marca d'água presente (conta forçada).

## Passo 6 — export limpo do filme de 15 s

Na tela de filme pronto, **Download clean**. O export limpo remonta o MESMO filme (lista de durações do
`/api/compose/unlock` agora tem 15; e, depois da revisão de 29/09, o unlock só pula a reescala da narração nas MESMAS
condições do compose: velocidade explícita ou filme de IA em verbatim — o cliente leva `verbatim: true` do cinematic).
Conferir no MP4 limpo: mesma narração palavra por palavra, **mesmo nº de clipes do passo 5** (2 ou 3), duração `mvhd`
**15–22 s** (a mesma do passo 5 ± 1 s). No modo IA ("Let AI structure"), o compose pode reescalar a narração e o
unlock reescala de novo com o mesmo alvo — o texto pode variar em palavras (o GPT reescreve), como já acontece em
35/60/90; o tamanho é o mesmo.
⚠ Se o botão pedir pagamento, é dinheiro saindo: decisão do fundador (pode pular este passo e anotar como pendente).

## Veredito

- **Aprovado:** passos 1, 3a, 3b e 5 como esperado (e 6, se feito). Então o fundador decide virar
  `SEEDANCE_15S_PUBLIC = true` (um commit, uma linha) — o botão aparece para todo mundo no /studio e no /generate.
- **Reprovado:** qualquer débito em 3a/3b; `credits_used ≠ 7`; filme < 15 s; export limpo com outra duração ou
  narração diferente. O interruptor fica em `false` e o público não vê nada.

## O que NÃO está nesta entrega (E2b)

A entrada do trial continua como hoje (o padrão do contrato de ativação é 35 s; o auto-disparo, o ChatGPT e o "tentar
de novo" ainda chegam em 35 s). Trocar a entrada para o Seedance de 15 s é a E2b.

---

# Canário do 3x6 — o filme de 15 s em 3 clipes de 6 s — 29/09/2026 [TRAVA 8.2 — "vai" do 3x6]

**Por quê.** O canário real de hoje (29/09 04:34 UTC, conta interna, verbatim de 45 palavras) saiu com **17,8 s**,
**2 clipes de 10 s**, e a montagem **repetiu o 1º clipe nos últimos 2,9 s**: o corte clássico do compose
(`slotLen = min(CLIP_LEN, total/clipes)`, encaixe no início de frase) encurtou o 1º trecho para 7,2 s e, sem saber o
tamanho real dos clipes, reciclou o clipe 0 no fim — com ~2 s do clipe 1 ainda sem uso. Fundador: *"3x6 gostei dessa
opção bora fazer"*.

**O que mudou (commit `SEEDANCE-15S-3X6`):**
- 15 s no Seedance 1.5 = **exatamente 3 cenas** (ideia e verbatim; roteiro marcado com 2 blocos vira 3 blocos da prosa).
- Cada clipe vai à fal com **duration explícita** (`'6'|'7'|'8'`, no i2v e no t2v de reserva): o menor s de {6, 7, 8}
  com 3 × s ≥ fala + 3 × 0,16 (fala = palavras ÷ 2,5, a régua da guarda; nunca menor que a fala na voz da persona).
- O claim assina `clip_seconds` e `clip_word_starts` (os campos do Kling 2.5 e do Veo); o `/api/compose` alinha o plano
  do Seedance 15 s e o lib/compose monta pela linha do tempo por nível d'água, corte no início da fala de cada cena,
  **sem reciclar enquanto houver imagem não usada** e sem passar do tamanho real de nenhum clipe.
- Roteirista (`/api/generate-script`, via lib/scriptWriterRate): **41–43 palavras** para o 15 s do Seedance (era 47–56).
  Conta: piso ⌈15 × 0,95 × 2,81⌉ = 41 (a voz mais rápida do catálogo não cai abaixo do piso C2); teto
  ⌊3 × (6 − 0,16) × 2,5⌋ = 43 (cabe em 3 × 6 s na régua da casa). 41–43 palavras = 16,4–17,2 s a 2,5 pal/s.
- **Crédito não muda:** `creditCostForDuration('cinematic_ai', true, 15)` = **7 cr**.
- **Custo de clipe por filme** (720p sem áudio, US$ 0,026/s — lib/fastAiClips): **3 × 6 s = 18 s ≈ US$ 0,47**
  (antes 2 × 10 s = 20 s ≈ US$ 0,52). Voz lenta (persona a 2,3 pal/s) com 43 palavras pede 3 × 7 s ≈ US$ 0,55; o teto
  3 × 8 s ≈ US$ 0,62 só com roteiro perto do limite da guarda (56 palavras).

Guardião: `node scripts/test-seedance-15s-3x6-2026-09-29.mjs` (compose real nos 4 casos — 16,0 s [6,6,6]; 17,8 s
[7,7,7]; 20,5 s [8,8,8]; o canário 17,8 s [10,10] — sem reuso; a montagem antiga reproduz o reuso do canário).

## Passo 3x6-1 — ensaio de $0 (roteiro de 42 palavras)

```
In 1986, a lake in Cameroon killed more than 1,700 people in one night without a single flame. Lake Nyos released a hidden cloud of carbon dioxide from below. The gas rolled downhill, silent and invisible. Today, pipes vent it every day.
```

```js
const SCRIPT42 = "In 1986, a lake in Cameroon killed more than 1,700 people in one night without a single flame. Lake Nyos released a hidden cloud of carbon dioxide from below. The gas rolled downhill, silent and invisible. Today, pipes vent it every day.";
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ generationId: crypto.randomUUID(), prompt: SCRIPT42, duration: 15, engine: 'seedance', language: 'en', script_mode: 'verbatim', dry_run: true }) });
const j = await r.json(); console.log(r.status, j.verdict, j.clip_seconds, j.clips_usd, j.footage_useful_seconds, j.scenes?.length);
```

**Esperado:** HTTP 200, `verdict` `PASS`, **3 cenas**, `clip_seconds: [6,6,6]`, `clips_usd: 0.47`,
`footage_useful_seconds: 17.5`, `total_words: 42`, estorno na hora. Se vier `[7,7,7]` (`clips_usd: 0.55`), a persona
escolhida para o tema fala abaixo de 2,45 pal/s (ex.: dark-mystery, onyx × 0,92 = 2,3) — é a regra funcionando (mais
imagem para voz mais lenta), não defeito; anotar a persona do log `KINEO-RITMO-POR-VOZ`.

## Passo 3x6-2 — 1 render pago (7 cr, ≈ US$ 0,47 de clipes)

Só com o passo 3x6-1 em PASS. Mesmo payload **sem** `dry_run`:

```json
{ "generationId": "<crypto.randomUUID()>", "prompt": "<SCRIPT42>", "duration": 15, "engine": "seedance", "language": "en", "script_mode": "verbatim" }
```

(ou pela tela: `/studio?engine=seedance&duration=15`, "Use my script as is", custo mostrado **7 cr**).

## Passo 3x6-3 — conferências

```sql
-- o claim assinado: 3 clipes de 6 s, início da fala de cada cena e a duration que foi à fal
select created_at, metadata->>'credit_cost' as cr,
       metadata->'response'->'clip_seconds' as clip_seconds,
       metadata->'response'->'clip_word_starts' as inicios,
       jsonb_path_query_array(metadata->'response'->'scene_fal_inputs', '$[*].duration') as duration_fal,
       metadata->'response'->'fal_models' as modelos
from events
where name = 'cinematic_submission_claim'
  and user_id = (select id from auth.users where email = 'josephsskaf@gmail.com')
order by created_at desc limit 1;
-- esperado: cr = 7 · clip_seconds [6,6,6] · inicios [0,14,28] · duration_fal ["6","6","6"] (i2v ou t2v, tanto faz)

-- o despacho
select metadata->>'planned' as planejadas, metadata->>'accepted' as aceitas, metadata->>'rejected' as recusadas
from events
where name = 'cinematic_dispatch_result'
  and user_id = (select id from auth.users where email = 'josephsskaf@gmail.com')
order by created_at desc limit 1;
-- esperado: 3 / 3 / 0

-- o filme
select id, status, quality_mode, credits_used from videos
where user_id = (select id from auth.users where email = 'josephsskaf@gmail.com')
order by created_at desc limit 1;
-- esperado: completed · cinematic_ai · 7
```

- **Duração pelo `mvhd`** (script do Passo 5 acima): **15–17 s** (42 palavras a ~2,5 pal/s ≈ 16,8 s).
- **Cortes = 2, nenhum retorno ao 1º clipe** — com o MP4 baixado:

  ```
  ffmpeg -hide_banner -i filme.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | findstr pts_time
  ```

  Esperado: **2 linhas** (≈ 5–6 s e ≈ 11 s — os inícios da fala da 2ª e da 3ª cena). Uma 3ª linha perto do fim é o
  defeito antigo (clipe 1 de volta). No log da Vercel do `/api/compose`: `3 clipe(s) [6,6,6] em 3 trecho(s) … —
  nenhum clipe repetido`.
- Marca d'água presente (conta forçada) — esperado; não usar como vitrine.

## Veredito do 3x6

- **Aprovado:** PASS no ensaio; 3/3 aceitos; `clip_seconds [6,6,6]` e `duration_fal ["6","6","6"]`; `mvhd` 15–17 s;
  2 cortes; 7 cr. Custo de clipes ≈ US$ 0,47.
- **Reprovado:** 2 cenas; `duration_fal` "10"; 3º corte (clipe 1 de volta); `mvhd` < 15 s; `credits_used ≠ 7`.
