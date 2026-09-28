# Canários dos motores — 28/09/2026

Um filme de 35 s por motor, cinco motores: **Kling 2.5, Veo 3.1, Kling 3, Omni Flash e Seedance 2.5**.
Cada um passa PRIMEIRO pelo ensaio de $0 (`dry_run: true`) e só vai ao render pago com **PASS na mão**
(regra fixa de 24/08). Orçamento total de fal: **≤ US$ 42** (esperado ≈ US$ 31–33; o resto é folga
para uma retomada de cena por filme).

Por que agora: a retomada de cena passou a valer para os clássicos (CENA-CLASSICA-RETENTATIVA, commits
desta branch) e a cena Omni sem imagem deixou de cair no Kling em silêncio (evento
`omni_scene_kling_fallback`). Omni e Seedance 2.5 seguem **pausados ao público** (lib/engineLaunch.ts)
e o critério para voltar é 3 filmes de 35 s com juiz ≥ 75 (o mesmo que trouxe o H3 de volta em 22/09) —
este canário é o filme nº 1 de cada um.

## Antes de começar

1. **Saldo da fal ≥ US$ 45** (o render Omni 3c220f3b de 16/09 morreu por saldo: a fal responde 403 e
   isso parece recusa de cena). Pré-pago via Pix; conferir no painel da fal.
2. Conta do fundador (lista `DRY_RUN_EMAILS` em lib/cinematic/classicDryRun.ts — só ela roda o ensaio
   e só ela passa pela pausa do Omni/S25).
3. Ordem: do mais barato ao mais caro — Kling 2.5 → Veo 3.1 → Omni → Kling 3 → Seedance 2.5. Se o
   gasto acumulado passar de US$ 36 antes do último, parar e reavaliar.

## Como rodar o ensaio de $0 (igual para os cinco)

Chrome logado em `https://www.usekineo.com/studio` → F12 → Console. Trocar só `ENGINE` e `SCRIPT`:

```js
const ENGINE = "kling"; // kling | veo | hollywood | omni | s25
const SCRIPT = "…roteiro abaixo…";
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ generationId: crypto.randomUUID(), prompt: SCRIPT, duration: 35, engine: ENGINE, language: 'en', script_mode: 'verbatim', dry_run: true }) });
const j = await r.json();
console.log(JSON.stringify({ status: r.status, verdict: j.verdict, family: j.family, total_words: j.total_words, speech_seconds: j.speech_seconds,
  footage_seconds: j.footage_seconds, total_seconds: j.total_seconds, mute_seconds: j.mute_seconds, silence: j.silence_inside_scenes_seconds,
  preflight: j.preflight_problems, dispatch: j.dispatch_preview, scenes: j.scenes }, null, 2));
```

- Chaves de motor da rota: `kling` = Kling 2.5 · `veo` = Veo 3.1 · `hollywood` = Kling 3 · `omni` = Omni Flash ·
  `s25` = Seedance 2.5 (app/api/generate-video-cinematic/route.ts, `wantsKling`…`wantsS25`).
- **Motor pausado (omni, s25):** o ensaio pela API funciona direto para a conta interna (a rota deixa a
  conta interna passar no gate de manutenção). O **render pago pela tela** precisa de `&maint=1`:
  `https://www.usekineo.com/studio/create?engine=omni&maint=1` (sem ele o GenerateClient ignora o
  `?engine=` pausado).
- Nada vai à fal, os créditos são estornados na hora (`dry_run_no_charge`). Custo: o GPT do planejador.

## Os cinco roteiros

Documentário/faceless, narração em 3ª pessoa, **nenhuma cena de diálogo** (nenhuma fala entre aspas),
fatos verificáveis. Régua por voz (CLAUDE.md): clássico a 3,1 pal/s (35 s = 100–115 palavras; o ensaio
clássico reprova abaixo de 104 porque exige fala ≥ 95 % do alvo), família hollywood a 2,3 pal/s
(35 s = 80–95 palavras). Todos: **"Use my script as is"**, 35 s, 9:16, inglês.

### 1. Kling 2.5 — As pedras que andam sozinhas (natureza/mistério) · 109 palavras

```
In Death Valley there is a dry lakebed called Racetrack Playa, and its rocks move on their own. Some weigh hundreds of pounds. Behind them, long trails are carved into the cracked mud, some stretching for hundreds of feet. For decades nobody ever saw one move. Theories blamed hurricane-force winds, slick algae, even pranksters. Then scientists fitted rocks with GPS trackers, and in December 2013 they finally caught them moving. After rain, a thin layer of ice forms on the playa. When the sun breaks that ice into floating panels, a light breeze pushes them, and the panels shove the rocks across the mud, a few meters per minute.
```
⚙ Config: usekineo.com/studio/create?engine=kling · Kling 2.5 (30 cr) · 35 s · Use my script as is.
Fatos: Racetrack Playa (Parque Nacional do Death Valley); rastros de centenas de pés; o movimento foi
filmado e rastreado por GPS em dez/2013 (Norris et al., PLOS ONE, 2014): placas de gelo de poucos mm,
empurradas por vento leve, a alguns metros por minuto.

### 2. Veo 3.1 — O computador de 2.000 anos (história) · 114 palavras

```
In 1901, sponge divers pulled a lump of corroded bronze from an ancient shipwreck off the Greek island of Antikythera. At first, nobody knew what it was. Decades later, X-rays revealed what was hiding inside: at least thirty interlocking bronze gears, cut by hand more than two thousand years ago. It was a machine. Turn its crank, and it showed the positions of the sun and the moon, the phase of the moon, and the dates of coming eclipses. One dial even tracked the four-year cycle of the Olympic Games. Nothing this complex would appear again in Europe for over a thousand years. Today its fragments rest in the National Archaeological Museum in Athens.
```
⚙ Config: usekineo.com/studio/create?engine=veo · Veo 3.1 (59 cr) · 35 s · Use my script as is.
Fatos: mecanismo de Antikythera, recuperado em 1901 por mergulhadores de esponja; radiografias de Price
(anos 1970) e tomografia de 2005; 30 engrenagens sobreviventes; sol, lua, fase da lua, eclipses e o
mostrador do ciclo olímpico; Museu Arqueológico Nacional de Atenas.

### 3. Kling 3 — A cachoeira de sangue da Antártida (natureza/mistério) · 86 palavras

```
At the edge of Antarctica's Taylor Glacier, a waterfall the color of blood pours onto the white ice. When the geologist Griffith Taylor found it in 1911, he blamed red algae. He was wrong. Deep under the glacier lies a lake of ancient brine, so salty it never freezes, and loaded with iron. When that water finally reaches the air, the iron rusts, staining the ice red. And the brine is not empty. Microbes live down there in total darkness, without sunlight, surviving by breathing iron.
```
⚙ Config: usekineo.com/studio/create?engine=hollywood · Kling 3 (88 cr) · 35 s · Use my script as is.
Fatos: Blood Falls, geleira Taylor (Vales Secos de McMurdo); descoberta por Griffith Taylor em 1911,
que culpou algas vermelhas; salmoura hipersalina rica em ferro sob a geleira; micróbios que respiram
ferro no escuro (Mikucki et al., Science, 2009).

### 4. Omni Flash — O olho do Saara (mistério/natureza) · 91 palavras

```
From orbit, astronauts can spot a giant bullseye in the middle of the Sahara. It is the Richat Structure in Mauritania, about forty kilometers across, rings of rock circling a single center. For years, many assumed a meteorite had punched it into the desert. But there is no crater and no shocked rock. The truth is slower. Deep below, molten rock pushed the ground up into a dome. Then wind and water spent millions of years grinding the dome away, exposing layer after layer, like the rings of a cut onion.
```
⚙ Config: usekineo.com/studio/create?engine=omni&maint=1 · Omni Flash (88 cr) · 35 s · Use my script as is.
Por que este roteiro: vários lugares diferentes (órbita, anéis, deserto, domo, erosão) — cenas fora do
"mundo do narrador" exercitam o still por cena, que é onde a 2ª chance nova atua.
Fatos: Estrutura de Richat, Mauritânia, ~40 km; já tida como cratera de impacto, sem evidência de choque;
domo soerguido por magma e erodido ao longo de milhões de anos.

### 5. Seedance 2.5 — A migração que ninguém ensinou (natureza) · 86 palavras

```
Every autumn, millions of monarch butterflies leave Canada and the United States and fly as far as three thousand miles to a few mountain forests in central Mexico. The butterflies that arrive were born generations after the ones that flew north in spring. They live up to eight months, while their summer relatives live only a few weeks. Researchers stick tiny tags on their wings to follow them. Every winter, the same groves of fir trees turn orange, covered by butterflies that somehow found the way.
```
⚙ Config: usekineo.com/studio/create?engine=s25&maint=1 · Seedance 2.5 (88 cr) · 35 s · Use my script as is.
Por que este roteiro: mistura cena SEM gente (borboletas, floresta) com cena COM gente (pesquisadores
marcando asas) — testa a hipótese KINEO-S25-PESSOA-T2V (pessoa em quadro vai em t2v, 15/09) que nunca
rodou num render de verdade.
Fatos: migração da monarca de até ~3.000 milhas até florestas de oyamel no centro do México; a geração
migratória vive até ~8 meses, as de verão 2–6 semanas; marcação com adesivos (Monarch Watch).

## O que o ensaio deve devolver

| Motor | Família | Veredito esperado | Plano esperado | Cenas × s |
|---|---|---|---|---|
| Kling 2.5 | clássica | PASS: 109 pal. ≈ 35,2 s de fala para alvo 35 (esperadas 109, desvio 0 %) | footage 50 s | ~5 × 10 s |
| Veo 3.1 | clássica | PASS: 114 pal. ≈ 36,8 s (desvio +5 %) | footage 48 s | ~6 × 8 s |
| Kling 3 | hollywood | PASS: mudo ≤ 6 s, silêncio ≤ 1,5 s/cena e ≤ 8 s, total ≥ 35 s | 38–42 s (alvo interno 39) | 4–5 cenas, teto 12 s |
| Omni | hollywood | PASS + `dispatch_preview` com `google/gemini-omni-flash/image-to-video` em toda cena `model_with_anchor` | 39–43 s (teto alvo+4 = 43) | 4–5 cenas, teto 10 s |
| Seedance 2.5 | hollywood | PASS | 38–42 s | 4–5 cenas, teto 12 s |

Números do ensaio clássico: lib/cinematic/classicDryRun.ts (3,1 pal/s; reprova com fala < 95 % do alvo
ou fora de −8 %/+25 % das palavras esperadas). Plano hollywood: alvo 35 → 39 (route.ts,
`hollywoodTarget`, "tier curto"); o C1 dimensiona pelas palavras no ritmo da voz pinada. **FAIL no
ensaio = não renderiza**: ajustar o roteiro (quantas palavras faltam vem no próprio veredito).

## Custo esperado por filme (fal, US$)

| Motor | Conta | Esperado | Teto com 1 cena refeita |
|---|---|---|---|
| Kling 2.5 | 5 clipes × 10 s × $0,07/s (docs/PRECOS-MOTORES-V4.md) + ~5 stills FLUX | ≈ 4,00 | 4,70 |
| Veo 3.1 | 6 clipes × 8 s × $0,10/s (route.ts KINEO-VEO-90; i2v assumido ao mesmo preço) + ~6 stills | ≈ 5,40 | 6,20 |
| Omni | ~41 s × $0,13/s (router `OMNI_USD_PER_SECOND`) + âncoras/stills | ≈ 5,70 | 6,80 |
| Kling 3 | ~41 s × $0,168/s (router `KLING3_I2V_USD_PER_SECOND`) + âncoras/stills | ≈ 7,40 | 8,80 |
| Seedance 2.5 | ~41 s × $0,208/s (router `S25_USD_PER_SECOND`, 480p; sem o ✨HD Enhance) + stills | ≈ 8,90 | 10,60 |
| **Total** | | **≈ 31,40** | **≈ 37,10** (≤ 42) |

Stills contados a `ANCHORS_USD` = $0,10 cada (lib/hollywood/anchors.ts, estimativa conservadora).
Créditos debitados da conta do fundador: 30 + 59 + 88 + 88 + 88 = **353 cr**
(`creditCostForDuration` a 35 s = 60 % do preço de 60 s, arredondado para cima).

## O que conferir depois de cada render (SQL só de leitura)

```sql
-- troque <gen> pelo generationId do render (aparece na URL /studio/... e no evento cinematic_submission_claim)
select name, created_at, metadata->>'scene_index' cena, metadata->>'model' modelo,
       metadata->>'family' familia, metadata->>'reason' motivo
from events
where session_id = '<gen>'
  and name in ('cinematic_dispatch_result', 'cinematic_scene_stuck', 'hollywood_scene_retried',
               'omni_scene_kling_fallback', 'compose_submission_claim', 'generation_stage_error')
order by created_at;
```

Critério de PASS do canário:
- `cinematic_dispatch_result`: 100 % das cenas aceitas. **Omni:** zero cena em
  `fal-ai/kling-video/v3/pro/text-to-video`; se aparecer `omni_scene_kling_fallback`, o `reason` diz por quê.
  **Seedance 2.5:** zero 422 nas cenas com pessoa.
- Se uma cena falhar: `hollywood_scene_retried` com `metadata.family` = `classic` (Kling 2.5/Veo) ou
  `hollywood` (os outros três) e o filme sai **inteiro**, não com cena a menos. (A retomada clássica só
  existe depois que o commit [TRAVA 8.2] desta branch estiver no ar.)
- `compose_submission_claim` sem `quality_rejection`; linha em `videos` com status `completed`.
- Juiz ≥ 75 em /admin/coerencia (mesma régua do selo do Studio). Omni e S25 só voltam ao público com
  3 filmes aprovados cada — este é o 1º.
