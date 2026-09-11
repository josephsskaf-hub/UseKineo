# VIGIA DOS MOTORES — 11/09/2026 (15:00–20:30 BRT)

Missão do fundador (14h): "fique de alerta nas próximas 4-5 horas; quando as pessoas
fizerem vídeos, olhe se está bom e dê uma nota; nos motores mais caros ainda faltam
coisas encaixar; veja se todos os motores estão 100%, se a fala sai, se 90 s
funciona, se as plataformas/formatos que a pessoa seleciona são respeitados".

Regras desta vigília: banco só leitura (projeto cqqukkvjjrguayiyjvhh), zero render
pago, zero contato, zero notificação. Nota por filme (0-10) com 8 critérios fixos;
entrega (a) e fala (d) pesam 2×. Contas internas (josephsskaf/usekineo/kineo.local)
não recebem nota, só entram no retrato dos motores.

---

## Rotação 1 — 15:30 BRT (18:30 UTC) · branch codex/vigia-motores-1530 · base 26dd32a4

### Filmes de contas externas desde 14:30 UTC (11:30 BRT)

| id | motor | pessoa | pedido | saiu | fal | cadastro→filme | nota |
|---|---|---|---|---|---|---|---|
| 597f8237 | Seedance 1.5 (cinematic_ai) | conta nova via ChatGPT (push63_niche_horror), trial 30cr | 35 s · 9:16 (padrão) | 36 s · completed · URL ok · 15cr | 4/4 aceitas · 4 POSTs · 200×4 · deploy 26dd32a4 | 4 min 33 s | **9,0** |

Critérios do 597f8237: (a) entregou 10 · (b) 36 ≥ 35 → 10 · (c) formato: prompts
trazem "9:16 vertical framing", mas o quadro PEDIDO não existia em evento nenhum
(ver conserto abaixo) → 9 · (d) fala: caminho clássico (TTS por fora, visual_mode
documentary_faceless), nenhum verbo de fala nos 240 chars visíveis de cada prompt
→ 9 · (e) silêncio: 93 palavras ÷ 3,1 = 30 s de voz num filme de 36 s (≈6 s só de
música; a régua clássica pede 100-115 palavras para 35 s; a régua de silêncio nova
só cobre o caminho hollywood) → 8 · (f) tema: **2 das 4 cenas fora do roteiro** —
cena 3 (fala "police searched his apartment") recebeu "vintage security camera at
the entrance of the **Amityville House**… infamous paranormal events" (o gerador
de prompt visual injetou uma casa mal-assombrada real; contrato_cena marcou
`sem_ancora_comum`/genérica), cena 4 (fala "hidden room covered in photos")
recebeu "mirror reflecting a dark figure"; cenas 1-2 mostram casa suburbana
(história diz apartamento) → 5 · (g) fal 4/4, sem "falling back" → 10 · (h) 4,5 min
→ 10. Ponderado: (20+10+9+18+8+5+10+10)/10 = **9,0**. O que o espectador sente: um
Short coeso e no tempo, com duas cenas que não ilustram o que a voz diz.

Contas internas no mesmo intervalo (sem nota): fundador rodou Kling 3 "Tomás, o
faroleiro" às 11:53 BRT (deploy 679b789c, ANTES do d4d89499) → 60 s entregue,
150cr, 8/8 cenas — cena 1 ainda com "He begins speaking about his past" no prompt
de apoio (exatamente o que o d4d89499 removeu depois); dry-runs de $0 às 12:27,
12:28 (×3) e 13:51 (×2) em hollywood/omni/h3 sobre os deploys d4d89499 e
baecab96 (planned 0, http 200, nada pago). Nenhuma falha de cliente na janela.

### Retrato dos motores (1ª rotação)

| motor | último filme entregue | última falha (causa) | 90 s | formato | voz | quebrado / a encaixar |
|---|---|---|---|---|---|---|
| Kineo 1 (fast) | 11/09 13:15 UTC · 93 em 7d · max 90 s | 11/09 11:23 broll_plan_threw_autopilot "Failed to fetch" (rede do cliente, 1 pessoa) | sim (SUPPORTED 35/45/60/90) | 9:16 cravado em lib/fastAiHook.ts:57 (Kineo 1 não recebe `aspect`) | TTS | — |
| Seedance 1.5 (cinematic_ai) | 11/09 17:58 UTC · 62 em 7d · max 84 s | 11/09 09:02 cinematic_dispatch_not_ok 409 "generation id belongs to a different cinematic request" (1 pessoa, ChatGPT) | sim (clipCount ≤ 9 × 9 s) | aspect_ratio: frame.falAspectRatio | TTS por fora | provider_abandoned_refunded: 14 claims / 12 pessoas em 15 dias (8% de 163) — pessoa fecha a aba e o servidor não termina |
| Kling 2.5 (cinematic_kling) | 11/09 09:30 UTC (externo, alwalidbasem; stranded finisher compôs) · 2 em 7d | nenhuma em 3d | sim | idem | TTS | — |
| Veo 3.1 (cinematic_veo) | 08/09 22:36 UTC · 4 em 7d · max 79 s | nenhuma em 3d | sim (cena ≤ 8 s) | idem | TTS | sem uso externo em 7d |
| Kling 3 (cinematic_hollywood) | 11/09 15:01 UTC (fundador) · 2 em 7d · 60 s | 11/09 14:41 narration_too_short (fundador, 35 s de fala p/ 60 s) | sim: hollywoodTarget = min(90)+8 → plano de 98 s | aspect_ratio no buildFalInput; **retry de cena crava '9:16'** (app/api/retry-hollywood-scene/route.ts:57,60,65) | host (TTS na boca via Avatar v2) desde 6b3384af — **0 filmes pagos depois do d4d89499** | ledger zerado (ver conserto) |
| MiniMax H3 (cinematic_h3) | **27/08 01:55 UTC — 15 dias sem entrega**; 11 em 30d | 11/09 09:22 UTC walidbasempayments (JO): 6 cenas submetidas (27cr = trial inteiro), cliente esperou **51 min** em fal_polling, foi embora; stranded finisher não compôs (sem stranded_outcome); refund-sweep estornou às 11:30 `cinematic_abandoned_no_delivery` | sim (cap 12/15) | idem hollywood | O3 nativo / host | causa da não-entrega DESCONHECIDA (sem chave fal local para ler o status das 6 cenas; a rota de status não logou erro) |
| Omni Flash (cinematic_omni) | 11/09 03:42 UTC (fundador) · 1 em 7d · 40 s | nenhuma | cap 10 s/cena (SCENE_CAP omni=10) | idem | O3/host | ledger zerado |
| Seedance 2.5 (s25) | nunca entregou (canário 01/09 3/6 → estorno) | 01/09 21:00 provider_abandoned | — | vermelho herdado test-motores-d1 | — | S25_PUBLIC=false |
| Avatar | **15/07/2026** — 0 em 30d | — | — | — | — | continua invisível (auditoria 28/08 item 2) |

Fatos medidos que mudam a leitura:

1. **Formato: a pessoa NÃO seleciona formato no Studio.** `aspect` só entra por
   `?aspect=` (handoff do GPT, lib/gptHandoff.ts); o GenerateClient não tem
   seletor e avisa honestamente que 16:9 "a casa não faz" (linha 7628). Em 9 dias
   nenhum evento de render gravou `aspect` — só gpt_handoff_created/gpt_landing
   (9:16 em 100%). Ou seja: 100% dos filmes são 9:16 e o critério (c) era
   IMENSURÁVEL no banco. Conserto desta rotação: `requested_aspect` em
   `generation_dispatch_received` e `aspect` no claim assinado.
2. **Livro-razão zerado nos motores caros.** Todos os 5 `cinematic_dispatch_result`
   da família hollywood (Kling 3 ×2, H3, Omni) em 7 dias saíam
   `attempted=0 · not_attempted=N · invariant_ok=false · claim_action=unknown ·
   provider_spend_possible=false` — inclusive os dois filmes de 150cr ENTREGUES.
   Causa: o laço hollywood nunca escrevia `ctx.outcomes/attempts` nem
   `claimAction` (só o clássico fazia). É a "observação não bloqueante" de 27/08
   (claim_action=unknown) que na verdade era o padrão de 100% da família.
3. **90 s:** aceito nos dois caminhos (hollywoodTarget min(90)+8; clássico até 9
   clipes de 9 s; SUPPORTED_DURATIONS 35/60/90). Nenhum filme externo de 90 s na
   janela; o Kineo 1 tem entregas de 90 s em 7d.
4. **Fala nos motores caros depois das mudanças de hoje: ainda sem prova em
   produção.** 0 renders pagos de Kling 3/H3/Omni de conta externa desde 6b3384af
   (11:34). O único canário (fundador, 11:53) rodou no deploy anterior ao
   d4d89499. Dry-runs do fundador às 12:27-13:51 passaram (200), mas dry-run não
   prova voz.

### O que mudou (rotação 1)

- `app/api/generate-video-cinematic/route.ts` (KINEO-VIGIA-LEDGER + KINEO-VIGIA-FORMATO):
  `hDispositions[]` paralelo a `hRequestIds` (accepted / explicit_reject /
  ambiguous nos 3 pontos de push); bloco que preenche `ctx.outcomes[i]`,
  `ctx.attempts[i]` e `totalPosts` entre o acolchoamento e o FAILFAST (cena
  nunca tentada fica de fora → not_attempted; recusa sem classe vai como
  unknown/never — nunca autoriza re-POST); `claimAction='published'` antes de
  `publishCinematicResponse` no sucesso hollywood e no salvage;
  `requested_aspect` no `generation_dispatch_received`; `aspect: aspectRequested`
  nos dois claims (hollywood e clássico). Nada de preço, crédito, prompt, motor
  ou tela.
- Guardião `scripts/test-vigia-ledger-hollywood-2026-09-11.mjs` (18 checks; 4
  deles executam `resumirPlano`/`invarianteFecha` de verdade com o vetor que a
  rota monta: 8/8 → invariante fecha; 2 aceitas + ambígua + break → not_attempted
  5; recusa explícita → rejected; vetor vazio = o defeito antigo). Falsificado
  por 6 mutantes, todos mortos com `git diff` provando que aplicaram: disposição
  sempre accepted · cena não tentada entra · claimAction hollywood some ·
  requested_aspect some · hValid antes do razão · aspect só num claim.
- tsc 0 · 16 baterias do CI + scene-truth + motores-r2-r6 + voz-na-boca +
  primeira-pessoa + silencio-na-cena verdes.

### O que fica (pedidos em PEDIDOS-ENTRE-PISTAS)

- Retry de cena crava `aspect_ratio: '9:16'` (Omni, H3 t2v, Kling 2.5 t2v) — fora
  do território desta vigília (última mudança: Codex 10:54 "compose mutex"). Com
  `aspect` agora no claim, o retry pode ler de lá.
- Gerador de prompt visual clássico injeta lugar real fora do roteiro
  ("Amityville House") — lib/cinematic/visualPromptPolicy.ts é do Codex (02:38).
- H3 de walidbasempayments: 51 min de espera, 0 entrega, causa desconhecida.
  Precisa ler o status das 6 cenas na fal (request_ids no claim 928eebd1) — não
  há chave fal local nesta máquina.
- Seedance: 12 pessoas em 15 dias fecham a aba e o stranded finisher não fecha o
  filme (`provider_abandoned_refunded`). Medir na próxima rotação quantas dessas
  tinham TODAS as cenas prontas na fal.

---

## Rotação 2 — 16:30 BRT (19:30 UTC) · branch codex/vigia-motores-1630 · base cbf30005

### Filmes de contas externas desde 18:30 UTC (15:30 BRT)

| id | motor | pessoa | pedido | saiu | fal | cadastro→filme | nota |
|---|---|---|---|---|---|---|---|
| 802f024e | Seedance 1.5 (cinematic_ai) | conta nova via ChatGPT (DZ), trial 30cr | 35 s · 9:16 · "as is" | 49 s · completed · URL ok · 15cr | 5/5 aceitas · 5 POSTs · 200×5 · deploy a82071b6 | 10 min | **7,1** (régua) — para o espectador, 2 |
| c636e7a0 | Seedance 1.5 (cinematic_ai) | conta nova (gmail), trial 30cr | 60 s · 9:16 · "as is" | 62 s · completed · URL ok · 25cr | 7/7 aceitas · 7 POSTs · 200×7 · deploy a82071b6 | 6 min | **8,7** |

**802f024e ("Luffy vs Akainu")** — a pessoa colou uma FICHA DE PROMPT estilo
Sora/Veo (`{"clip":"07","duration":"10 seconds","action":…,"camera":…,"vfx":…,
"negative_prompt":…}`, 105 palavras) e apertou "Use my script as is". (a) 10 ·
(b) 49 ≥ 35 → 10 (pediu 10 s na ficha; `pasted_directives_detected`
asked_seconds=10, applied=35) · (c) requested_aspect 9:16 = "9:16 vertical" nos
prompts → 10 — **primeiro filme com o formato MEDÍVEL no banco** (conserto da
rotação 1 em produção: dispatch traz `requested_aspect`, claim traz `aspect`) ·
(d) **1** — a TTS leu a ficha em voz alta: "clip 07 duration 10 seconds action
Luffy rapidly dodges… camera High-speed FPV drone… negative prompt no clones no
random movement no teleportation no extra limbs" (compose_submission_claim.
narration = o JSON) · (e) 105 pal ÷ 3,1 = 34 s de voz em 49 s → 6 · (f) **3** —
visual_mode documentary_faceless com negative "cartoon, anime" para um pedido de
One Piece; o descritor devolveu 2 descrições para 5 cenas e as cenas 3-5 subiram
para a fal com o pedaço CRU da ficha como prompt ("…negative prompt no clones…,
faceless cinematic b-roll") · (g) 10 · (h) 10. Ponderado (20+10+10+2+6+3+10+10)/10
= 7,1. A régua mascara: entrega e fal perfeitas, mas o filme é inassistível.
Livro-razão da rotação 1 em produção no clássico: attempted=5, invariant_ok
true, claim_action published, deploy_sha gravado.

**c636e7a0 ("Lucas, 3h17")** — conto de terror em PT-BR, prosa limpa, 143
palavras, telefone que recebe MENSAGEM, apartamento, olho mágico. (a) 10 · (b)
62 ≥ 60 → 10 · (c) 9:16 = 9:16 → 10 · (d) 9 (TTS clássica, narração fiel, sem
verbo de fala nos prompts) · (e) 143 ÷ 3,1 = 46 s de voz em 62 s → 6 · (f) **3**
— 5 das 7 descrições inventaram época e lugar que a história não diz: "vintage
rotary phone 1960s", "1970s Bakelite phone… abandoned Victorian home", "Nokia
3310… abandoned cabin", "Winchester Mystery House in San Jose, California",
"1910 New England farmhouse", "1970s motel". Um telefone que recebe mensagem é
um smartphone; a história é de hoje. E pior, POR CÓDIGO: `eraLockSuffix` lia
`aiPrompt`/`description`, o "1910" inventado casou com ERA_YEAR_RE e as 7 cenas
subiram com "period piece set strictly in the year 1910, absolutely no modern
objects" — contradizendo a própria cena do Nokia · (g) 10 · (h) 10. Ponderado
(20+10+10+18+6+3+10+10)/10 = 8,7.

Contas internas no intervalo: nenhum render pago. **0 renders de Kling 3/H3/
Omni/S25 de qualquer conta desde a rotação 1** — voz na boca e primeira pessoa
seguem SEM PROVA em produção. Nenhuma falha (`generation_stage_error`) e nenhum
`plan_silence_rejected` na janela. Kineo 1 e Avatar: 0 renders na janela.

### O que mudou (rotação 2)

Enquanto esta rotação media, **outra sessão (fundador, 16:27, cbf30005) já
tinha decidido o destino da ficha colada**: três modos no Studio, modo clipe
(um clipe de 4-12 s no Seedance sem narrador, 5cr) e guarda `shot_spec_detected`
422 ANTES do débito em generate-video-cinematic e generate-video-fast. A
conversão que esta rotação tinha pronta (ficha → direção visual em prosa +
"Let AI structure") foi DESCARTADA antes de enfileirar — a decisão do fundador
é que ficha vira clipe, não filme narrado. Ficaram os três consertos que a
guarda NÃO cobre (ambos os filmes passaram por eles):

- `app/api/generate-video-cinematic/route.ts` (KINEO-VIGIA-DESCRICAO): o
  descritor visual faz uma SEGUNDA chamada cobrando "EXACTLY N descriptions"
  quando devolve menos cenas do que o pedido, guardando a melhor resposta, antes
  de o chamador cair no texto cru (foi o caso das cenas 3-5 do 802f024e).
- idem (regra do descritor): "NEVER add a real-world landmark, named house,
  city, decade, year, brand or model that the narration or topic does not
  mention… If the narration gives no era, the setting is PRESENT-DAY… Keep one
  consistent setting across scenes". Cobre o Amityville da rotação 1 (mesmo
  descritor, mesma família) e o Winchester/1910/Nokia desta.
- idem (KINEO-VIGIA-ERA): `eraLockSuffix` lê SÓ tema + fala (`voiceover`),
  nunca `aiPrompt`/`description` — a era vem das palavras da história, não da
  camada visual que o GPT inventa. História que diz a época ("In 1805,
  Napoleon…") continua trancando.
- Guardião `scripts/test-vigia-descritor-e-era-2026-09-11.mjs` (16 checks; 3
  executam `eraLockSuffix` de verdade com a fala real do c636e7a0 e a descrição
  inventada). Falsificado por 6 mutantes, todos mortos com `git diff` provando
  que aplicaram: era volta a ler aiPrompt · regra de lugar real some · sem
  presente por padrão · descritor sem segunda chamada · guarda a última em vez
  da melhor · segunda chamada sem cobrar N.
- tsc 0 · 16 baterias do CI + scene-truth + motores-r2-r6 + voz-na-boca +
  primeira-pessoa + silencio-na-cena + vigia-ledger + tres-modos-clipe verdes.

### O que fica

- A regra nova do descritor é PROMPT, não código: só o próximo filme prova se o
  modelo obedece. Medir na rotação 3: `submitted_prompts` sem nome próprio de
  lugar/década ausente do `topic`.
- O VISUAL-DRIFT-11 (pedido ao Codex na rotação 1) agora tem a metade do
  descritor consertada aqui; a metade de `visualPromptPolicy.ts` (filtro
  determinístico de nome próprio fora do roteiro) continua com eles.
- Régua (e): dois filmes de "as is" com 25-30% do tempo sem voz (34/49 s,
  46/62 s). A régua de silêncio nova (baecab96) só cobre o caminho hollywood; o
  clássico continua sem portão de palavras — anotado, não mexido (decisão do
  fundador 02/09: "não aperte a régua").
- Motores caros: 0 renders desde 11:34. O canário pago Kling 3 em 1ª pessoa
  continua sendo a única prova possível de voz na boca — pendência do fundador.

---

## Rotação 3 — 17:30 BRT (20:30 UTC) · branch codex/vigia-motores-1730 · base 2d5c5e44

### Filmes de contas externas desde 19:30 UTC (16:30 BRT)

**Nenhum render novo.** A única linha em `videos` depois de 19:30 UTC é o
c636e7a0 (created_at 19:38, despacho 19:33) — já lido e avaliado na rotação 2
(nota 8,7). Eventos de render entre 19:38 e 20:30 UTC: zero
(`generation_dispatch_received`, `cinematic_*`, `compose_*`,
`generation_stage_error`, `plan_silence_rejected`, `shot_spec_detected`,
avatar, clipe, Kineo 1 — todos 0). Uma pessoa externa chegou ao /generate
às 20:01 UTC (`generate_arrived_server` + `generate_page_view`) e não
despachou nada até o fechamento desta leitura. Contas internas: nenhum render
pago, nenhum dry-run. Kling 3/H3/Omni/S25: **0 renders de qualquer conta desde
11:34** — voz na boca e primeira pessoa continuam sem prova em produção.

### Delta dos motores (rotação 3)

Sem mudança no retrato da rotação 1 além do que a rotação 2 já registrou:
nenhuma falha nova de nenhum motor na janela; nenhum motor caro exercitado.
Pendências de medição herdadas continuam sem denominador (0 filmes novos):
descritor obedecendo a regra de lugar/época (prompt), `setting_scrubbed`
(código, entra nesta rotação).

### O que mudou (rotação 3) — a metade determinística do VISUAL-DRIFT-11

Sem filme para medir, a rotação fechou em código o buraco que os dois filmes
da tarde mostraram. A regra nova no prompt do descritor (16:30) é pedido; o
modelo pode ignorar palavras — os 8 prompts reais de hoje provam que ignora.
Isto é garantia:

- `lib/cinematic/visualPromptPolicy.ts` (KINEO-VIGIA-CENARIO):
  `scrubInventedSetting(visual, historia)` — puro, sem chamada de modelo.
  Remove da descrição visual (1) sequência de palavras Capitalizadas fora do
  início de frase cujas palavras não estão na história (nome próprio de
  lugar/casa/cidade/marca), com número colado junto ("Nokia 3310", "Model
  500"); (2) ano 1000-2099 e década ("1960s", "'70s") ausentes da história;
  (3) adjetivo de época (victorian, vintage, medieval, retro, antique…)
  ausente da história. A história = tema + fala (`voiceover`), nunca
  aiPrompt/description. O que a história cita fica: Luffy/Akainu, Daniel's,
  Napoleon/Alps/1805, Eiffel Tower, "medieval". Limpa preposição/artigo
  pendurados ("door from the , as" → "door, as"; "through Times Square at
  night" → "at night"). Devolve `{ text, removed }`.
- `app/api/generate-video-cinematic/route.ts`: no caminho clássico, depois
  do fim do hollywoodPath e ANTES de `contratoRelatoClassico` / "Prepare
  ONCE" (= antes de qualquer still ou clipe pago), as três fontes de visual
  (aiPrompt do descritor, stockSearchQuery, description) passam pelo filtro e
  o texto filtrado SUBSTITUI o original em `scenes`. O que foi removido vai
  ao contexto de despacho (`cenarioRemovido`) e sai em
  `cinematic_dispatch_result.setting_scrubbed` (por cena: "cena 3: Nokia |
  3310 | vintage") — medível na próxima rotação. Warn no log
  `[cinematic] cenario-scrub:`. Narração intocada. Hollywood não passa (tem
  planner próprio; fica anotado).
- Posição escolhida de propósito: o guardião do Codex
  `test-visual-contract-2026-09-11` fatia a rota a partir de
  `const contratoRelatoClassico` e executa o pedaço com globais próprios —
  o bloco novo dentro da fatia quebrava com "prompt is not defined". Movido
  para antes da fatia; guardião do Codex intocado e verde (326).
- Guardião `scripts/test-vigia-cenario-inventado-2026-09-11.mjs` (31
  checks): transpila e EXECUTA `scrubInventedSetting` com os 8 prompts REAIS
  que subiram hoje (7 do c636e7a0, 1 do 597f8237) contra as duas histórias
  reais; prova o que fica; prova posição do bloco, as 3 fontes, a
  substituição, a narração intocada e o campo no evento. Falsificado por 7
  mutantes, todos mortos com `git diff --stat` provando que aplicaram e
  `git checkout` restaurando: nome sempre conhecido (7 falhas) · ano nunca
  removido (5) · adjetivo nunca removido (3) · número colado fica (2) ·
  história lê aiPrompt (1) · filtra sem substituir (1) · evento sem
  setting_scrubbed (1).
- tsc 0 · 16 baterias do CI + scene-truth + motores-r2-r6 + voz-na-boca +
  primeira-pessoa + silencio-na-cena + vigia-ledger + vigia-descritor +
  tres-modos-clipe + vigia-cenario = 25/25 verdes. Vermelhos herdados
  conhecidos (test-motores-d1, test-multiformato) não fazem parte da lista.

### O que fica

- Medir na rotação 4: `setting_scrubbed` dos próximos `cinematic_dispatch_result`
  clássicos — quantos filmes tiveram remoção, o quê, e se os
  `submitted_prompts` saíram sem nome próprio/década ausente do `topic`.
  Também conferir se algum nome LEGÍTIMO foi removido (falso positivo:
  palavra Capitalizada que a história cita com outra grafia).
- Custo conhecido do filtro: perde "fog rolling in" → "fog rolling" (preposição
  final removida na limpeza) só quando houve remoção na mesma descrição.
  Aceito: só dispara em descrição que já inventou lugar/época.
- Hollywood (Kling 3/H3/Omni) não passa pelo filtro — o planner escreve os
  prompts com personagem e cenário próprios; sem filme desde 11:34 para saber
  se o mesmo drift existe lá.
- Continuam: retry de cena com '9:16' cravado (Codex), H3 de walidbasempayments
  (sem chave fal), Seedance provider_abandoned_refunded (12 pessoas/15 d, sem
  chave fal para saber se as cenas estavam prontas), canário pago Kling 3 em
  1ª pessoa (fundador).

---

## Rotação 4 — 18:30 BRT (21:30 UTC) · branch codex/vigia-motores-1831 · base aad34de2

### Filmes de contas externas desde 20:30 UTC (17:30 BRT)

**Nenhum render novo.** `videos` depois de 20:30 UTC: 0 linhas de qualquer
conta. Eventos de render na janela (`generation_dispatch_received`,
`cinematic_*`, `compose_*`, `generation_stage_error`, `plan_silence_rejected`,
`shot_spec_detected`, `clip_*`, avatar, Kineo 1): **0**. O que houve foi só
porta de entrada: 18 sessões de landing, 1 pessoa do ChatGPT em
/text-to-video-shorts escreveu um tema de 118 caracteres (`organic_topic_
submitted` 21:00 UTC), foi mandada ao /signup, voltou à home deslogada e
clicou "free" no exit-intent — nunca se cadastrou, nunca despachou. Fora do
território (funil de cadastro); anotado, não tocado. Contas internas: nenhum
render pago, nenhum dry-run. Kling 3/H3/Omni/S25: **0 renders de qualquer
conta desde 11:34** — voz na boca e primeira pessoa seguem sem prova.

Deploy da rotação 3 confirmado: aad34de2 = dpl_5BJofWYDPUqzKrPDDTQHVYWYxzmG
READY em produção (20:43 UTC). Nenhum outro autor publicou desde então.

### Delta dos motores (rotação 4) — duas pendências herdadas medidas no banco

**1. Seedance `provider_abandoned_refunded` "12 pessoas em 15 dias": ERA
REGIME VELHO, ESTÁ FECHADO.** A rotação 1 somou 15 dias sem olhar o
calendário do cron de resgate. Separando pelo relógio dos consertos do
finish-stranded-renders (sprint-assinaturas #1/#7/#14/#17, 01-02/09):

| período | claims Seedance externos abandonados | o que o cron fez |
|---|---|---|
| 28/08 → 01/09 23:12 UTC (antes do #1) | 8 (8 pessoas) — TODOS com N/N cenas COMPLETED e autorizadas no claim assinado | nada gravado: o cron não escrevia desfecho (o `stranded_outcome` nasceu no #1) |
| 02/09 02:53 → 11:41 UTC (janela do cache da Vercel, #17) | 3 (3 pessoas): e7f9f000 compôs na 3ª tentativa e ainda assim foi estornado; 1750d0ca e c3f568fa `no_authorized_urls` ×7 e ×6 com o claim cheio | o bug do data cache, consertado no c0ed1989 |
| **02/09 14:00 UTC → agora (9 dias)** | **0** | 88 claims Seedance externos settled+debitados, **88/88 compostos** (30 pelo cron = 34%, 58 pela própria aba); 1 Kling 2.5 composto pelo cron |

Ou seja: desde o conserto, a rede pega 100% dos Seedance de conta externa
que a pessoa abandona; um terço dos filmes Seedance da casa só existe porque
o cron montou. A pendência "medir quantas tinham todas as cenas prontas"
morre aqui: as 8 antigas tinham (N/N URLs autorizadas), e o cron da época
não escrevia nada. Não há defeito vivo no Seedance.

**2. H3 de walidbasempayments (09365f4a, 09:22 UTC): a causa deixa de ser
"desconhecida".** O claim assinado tem `fal_request_ids` 6/6 e
`authorized_completed_urls` **4 de 6** — 4 cenas ficaram COMPLETED e foram
autorizadas pela aba enquanto a pessoa esperou (51 min); 2 nunca chegaram
lá. O cron olhou o claim em ≥7 rodadas (settled de 09:23 a 11:30) e não
deixou UM evento: em `collectFinishedClips` (finish-stranded-renders
:151-171) cena IN_QUEUE/IN_PROGRESS ou `result()` que lança qualquer coisa
≠ 422/400 vira `stillRunning` → `pending:4/6`, e `pending` NÃO está no
SILENT_TERMINAL (:1277) → silêncio. Dois caminhos possíveis para as 2 cenas,
os dois mudos: (a) presas na fila do H3 por >2 h (o motor está há 15 dias
sem entrega); (b) COMPLETED com `error` no status — o que o Codex provou no
RENDER-POLL-11/2 para o poller da aba ("outra retorna status COMPLETED e
resultado HTTP 403") e deixou como PENDENTE para o cron irmão. Em qualquer
dos dois, 4/6 = 67% ≥ piso de 60%: o cron teria montado um filme de 4
cenas se soubesse que as outras 2 estavam mortas. O estorno de 27cr veio
às 11:30 e a pessoa (trial de 30cr) foi embora sem filme. Território do
cron não é desta vigília → PEDIDO ao Codex (dono do poller) abaixo.

**3. Hollywood sem drift de cenário no único filme com prompts.** Kling 3
6462ea66 (fundador, 11:53 BRT, 8/8): "Ilha das Cabras" no prompt da âncora
está na fala ("the last lighthouse keeper on Ilha das Cabras") → legítimo;
nenhum lugar/década inventado nas 8 cenas. CENARIO-HOLLYWOOD-11 continua
com 1 filme / 0 drift — sem razão para plugar o filtro lá ainda. Confirmado
de passagem: `visual_mode: documentary_faceless` e 8/8 cenas `support` para
um roteiro em 1ª pessoa ("My name is Tomás") — o retrato exato do que o
d4d89499 (11:57) corrige; o filme rodou no deploy anterior.

**4. Portões novos, 7 h de produção:** desde 14:00 UTC, 12 despachos de 5
pessoas; `plan_silence_rejected` 0, `shot_spec_detected` 0,
`narration_guard_blocked` 2 (2 pessoas, 14:00 e 14:41, a segunda é o
fundador). Nenhum portão novo barrou cliente externo.

### O que mudou (rotação 4)

Só diário e pedidos — nenhum filme novo para medir, e o único defeito
encontrado (poller do cron cego a cena morta) mora fora do território.
tsc 0 · baterias verdes (lista no fechamento). Base aad34de2 intacta.

### O que fica

- Os 2 request_ids mortos do H3 (claim 928eebd1) continuam sem leitura na
  fal — sem chave nesta máquina. Quem tiver: se COMPLETED+error, é o caso
  (b) e o pedido ao Codex fecha os dois pollers; se IN_QUEUE 2 h depois, é
  o H3 na fal e o caso é de fornecedor.
- Continuam: retry de cena com '9:16' cravado (Codex), canário pago Kling 3
  em 1ª pessoa (fundador), `setting_scrubbed` sem denominador (0 filmes
  clássicos desde o deploy 20:43 UTC).
- Próxima rotação (19:30) é o FECHAMENTO: tabela motor × filmes/nota/defeito/
  conserto, "o que falta encaixar" por motor, "para o fundador" em ≤5 linhas.
