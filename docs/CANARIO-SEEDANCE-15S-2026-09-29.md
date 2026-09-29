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
