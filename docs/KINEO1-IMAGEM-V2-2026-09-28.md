# KINEO1-IMAGEM-V2 — parte A (28/09/2026): as peças da imagem nova do Kineo 1, INERTES, e o replay que prova

## Por quê
Kineo 1 faz 93% dos filmes de cliente. Desde 19/09 o juiz de coerência dá **69 no geral, 89 na fala e 53 na imagem**:
63 de 131 filmes de cliente tiraram 40 na imagem, 56 tiraram 60 e só 13 passaram de 80. Meta do fundador: 9 de 10.

Taxonomia das 136 cenas reprovadas em 40 filmes nota 40 (21-27/09, 33 pessoas):

| classe | cenas | exemplo real |
|---|---|---|
| busca errada para a fala | 36 | "long before people played" (roteiro próprio: 4 primeiras palavras); "space needle, brainstorming, skyline" para "Bezos preferia ovos e torrada" |
| assunto que o banco não tem | 23 | pessoa, evento, produto, personagem com nome |
| portão/ranking | 21 | "cone snail on coral" → vulcão (tag "cone"); "french handwriting" → Riviera Francesa |
| fala abstrata | 19 | "200-300% de norepinefrina" |
| cofre sem portão | 24 | raio-X de hospital servido a "close-up macro wolf tracks snow moonlight" (5 cenas, 4 filmes) |
| instrução colada narrada | 5 | "Estilo visual: ilustración minimalista…" |

## O que entrou (tudo desligado por padrão — nada muda em produção com este commit)
| peça | arquivo | como liga |
|---|---|---|
| portão do sujeito v2 (cabeça = última palavra da frase-cabeça; frase curta exige todas; sem substring ao contrário; plural só com base de 4+ letras; criança quando a BUSCA pede; homônimo "players" ≠ vitrola) | `lib/pixabay.ts` | `getPixabayClipsForScene(…, { v2: true })` |
| plano de câmera sai no USO (a instrução do roteirista em `lib/runway.ts` fica — `outraConsulta` depende dela) | `lib/pixabay.ts` `stripCameraPhrases` | idem |
| cofre com portão (só tags, palavra inteira, sem `ai-hook`, cada acerto pelo portão do pool) — as 8 linhas ai-hook NÃO foram apagadas | `lib/clipVault.ts` | `searchVault(q, { v2: true })` |
| buscas da fala: 1 chamada gpt-4o-mini por filme → sujeito, 3 buscas sem nome próprio, `stockable`, prompt de IA; falha aberta | `lib/kineo1/sceneQueries.ts` | a rota chama `planSceneQueries` |
| busca do plano com vírgula só guarda o pedaço que a fala menciona | `commaPlanQueryParts` | a rota chama |
| cena fraca DEPOIS da busca (reciclado > sem stock possível > só cofre > sujeito não é tag exata) | `weakSceneReason`, `pickAiClipScenesV2` | a rota chama |
| detector de personagem v2 (nome tem de aparecer no meio da frase e fechar o nome; lugar/marca/título/gentílico não contam) | `lib/fastAiScene.ts` | `characterStoryName(t, { v2: true })` |
| clipe de IA TROCA o stock (em vez de entrar antes dele) | `lib/fastAiClips.ts` | `replace_index` no evento `fast_ai_clips_pending` |
| duração do clipe para a fatia do montador, sem laço | `planAiClipForSlot`, `submitSceneClip(prompt, seconds)` | a rota chama |
| replay offline | `app/api/admin/kineo1-replay` + `lib/kineo1/replay.ts` | GET de admin |

No personagem, dos 61 filmes marcados como "história com personagem" de 19 a 27/09, o v2 solta 46 de não-ficção
(Google ×6, Earth ×5, Moon ×3, Singapore ×3, France, Mars, Lantana, Iran, Titanic, Kawasaki, Mustang…) e mantém os 15
de ficção ou gente real (Emily, Mimi, Dodi, Maria, Kevin, Naruto, Invincible, Bezos ×3, Verstappen, Yang Guifei, o
sultão Khalid, Mesmer, Wojtek).

## A regra 5 (âncora) — por que o replay mede DUAS variantes do portão
A regra pedida ("frase de até 3 palavras exige todas") foi implementada como padrão do v2. Medida offline (28/09) nos
clipes JÁ escolhidos das cenas de stock dos filmes de cliente julgados desde 19/09 (tags gravadas, cortadas em 160
caracteres — aproximação), ela recusa muito clipe bom:

| filmes | clipes que o v1 aceitava | v2 regra 2 pura recusa | v2 + regra 5 recusa |
|---|---|---|---|
| nota 80+ | 16 | 8 | 3 |
| nota 60 | 197 | 99 | 80 |
| nota 40 | 155 | 72 | 61 |

Os bons que a regra 2 pura derruba: "tiger stalking in jungle", "tiger paw closeup", "earth spinning", "new york
skyline sunset", "eagle wings folding" — o que falta na tag é AÇÃO (-ing), HORA/LUZ ou PARTE DO CORPO. A regra 5
(`headFallback: true`) aceita pela ÂNCORA (a última palavra que não é nada disso) quando nenhum clipe bate todas, sempre
atrás dos completos. Continua recusando vulcão, Riviera, chafariz, frasco, cachoeira e garfo; deixa passar o presépio de
"joyful child dancing". O replay devolve `after` (regra 2 pura) e `after_fallback` (com a regra 5) para a parte B
escolher pelo número, não pela opinião. A frase-cabeça também passou a cortar em at/with/under/into/from/above… ("wolf
looking at camera" exigia "camera").

## Sem laço — a decisão do modo troca
No Kineo 1 o montador (`lib/compose.ts`, travado) não tem "duração de cena": cada clipe da lista ganha UMA fatia de
2,5 a 4,5 s. Uma fatia cheia lê 4,91 s do arquivo (0,1 de trim + 4,5 + 0,06 de sobreposição + 0,25 de crossfade),
então um clipe de 5 s cobre qualquer fatia **sem repetir quadro**. A troca mantém a contagem de clipes que a rota
planejou. O único caso de laço é a volta de reciclagem do montador (poucos clipes para o filme), que reentra no
mesmo arquivo mais adiante: `planAiClipForSlot` calcula, com a aritmética do montador, se aquele índice pode reentrar;
se pode, devolve a duração que cobre (até 12 s, US$ 0,026/s) ou, se o teto de custo não pagar, o modo inserção de
hoje. Regra: **só troca quando a duração cobre a fatia sem laço**.

## Como provar antes de ligar (custo ~US$ 0,003-0,004 por filme, nenhum render, nada gravado)
- um filme: `/api/admin/kineo1-replay?generation_id=<uuid>`
- lote: `/api/admin/kineo1-replay?last=10&max_image=60` (teto 40; continua com `&offset=` do `next_offset`)
- opções: `&variants=strict|fallback|both` (padrão both), `&ai_max=4` (simula 4 clipes de IA), `&ai_scope=all` (clipe de IA também em filme que hoje não ganha),
  `&rejudge=1` (re-julga a evidência gravada: mede o ruído do juiz), `&rpm=40` (teto da Pixabay: a chave é da produção)
- devolve `before` (nota gravada), `after` (o mesmo juiz na evidência nova), cena a cena, e a distribuição do lote.

Limites: o juiz lê texto, não pixel — cena que vira clipe de IA sai sem tags e o juiz tende a aceitar "gerado". A
nota do replay é o primeiro filtro; o segundo é o olho do fundador numa amostra renderizada.

## Parte B (commit `[TRAVA 8.2]` na rota `app/api/generate-video-fast/route.ts`) — o que ligar
1. `planSceneQueries` antes do laço de cenas (1 chamada; nulo → buscas de hoje);
2. roteiro próprio: as buscas do plano novo no lugar de `fallbackStockQuery`; busca com vírgula por `commaPlanQueryParts`;
3. `searchVault(…, { v2: true, sceneText, sceneNeedsPeople })` e `getPixabayClipsForScene(…, { v2: true, headFallback?, onReport })`
   (a regra 5 entra ou não conforme o replay);
4. `characterStoryName(falas, { v2: true })`;
5. cena fraca por `weakSceneReason` DEPOIS da busca, clipe submetido dentro do laço (p90 da Seedance já é 54 s dos 60);
   cena fraca fica com 1 stock e o evento pendente leva `replace_index` = índice desse stock (e `seconds` do
   `planAiClipForSlot`);
6. evidência do juiz com a origem do clipe (pool/cadeia/cofre/reciclado) e as buscas inteiras.

## Riscos
- portão mais duro esvazia mais pools; pool vazio vira clipe reciclado (o juiz pune): ligar junto com as buscas novas e
  o clipe de IA nas cenas fracas, nunca sozinho;
- a lista de não-personagem é derivada dos dados de 19-27/09 e vai precisar de manutenção;
- mais clipes de IA (a proposta 4c: até 4 por filme, ~US$ 0,52) é decisão de custo do fundador.

Guardião: `scripts/test-kineo1-imagem-v2-2026-09-28.mjs` (executa o código real com as tags reais e prova que, sem a
opção, tudo devolve o mesmo que a origin/main 22c8e70e).

---

# Parte B — ligado na rota (B.1 inerte `f8a43fb2` + commit `[TRAVA 8.2]`)

## O que muda para o cliente
| antes | depois |
|---|---|
| a busca de stock vinha do plano de B-roll (às vezes com marcos inventados: "space needle, brainstorming, skyline" para os ovos do Bezos) ou das 4 primeiras palavras do bloco no roteiro próprio | UMA chamada gpt-4o-mini por filme escreve, pela FALA, 3 buscas por cena sem nome próprio nem plano de câmera; elas vão na frente, as de hoje depois (máx. 4 por cena); da busca com vírgula só fica o pedaço que a fala menciona |
| portão do sujeito pegava a 1ª palavra ("cone snail" → vulcão) | portão v2 com a regra 5 (âncora) ligada, cofre com o mesmo portão, sem as 8 linhas ai-hook |
| "Google", "Earth", "Moon" viravam personagem (modo ficção + stills) | detector v2 (46 de 61 filmes de 19-27/09 deixam de ser "história com personagem") |
| clipe Seedance escolhido ANTES da busca, entrando na frente do stock ruim (38 de 103 cenas reprovadas já tinham clipe pronto) | cena fraca decidida DEPOIS da busca (reciclado · assunto que o banco não tem · só cofre · sujeito não é tag exata); o clipe é pedido na hora, dentro do laço, e TROCA o stock da cena (a cena fica com 1 stock; clipe não pronto → o stock fica) |
| instrução colada era narrada ("Comece nos primeiros 2 segundos…", "Estilo visual: …") | linhas de instrução saem da fala (a fala do autor fica palavra por palavra); texto que é só briefing vira "a IA estrutura" — inclusive o briefing cujo resto são só o gancho e o fecho entre aspas (17dd0c7a); roteiro de UM parágrafo nunca vira briefing |

## Custo (teto duro por filme: `KINEO1_AI_BUDGET_USD = 0.65`)
- Elegibilidade = a de hoje: 1º filme de qualquer conta ou conta paga. Filme grátis depois do primeiro: sem clipe (preço é seu).
- Conta: hook (0,13) + clipes das cenas fracas + a RESERVA dos stills do híbrido (3 × 0,03 = 0,09; 6 × 0,03 = 0,18 em história
  com personagem) nunca passa de 0,65. Até 4 clipes de cena fraca além do hook.
- Sem laço (sua regra): o clipe que troca precisa cobrir a fatia do montador também na volta de reciclagem. Filme do Kineo 1
  tem poucos clipes para os cortes de 2,5-4,5 s, então quase toda troca no começo/meio do filme precisa de 11 s (US$ 0,286);
  só as do fim cabem em 5 s (0,13). Quando o teto não paga os 11 s, o clipe entra como hoje (inserção de 5 s, abre a cena).
- Na prática, um 1º filme de 60 s com 3-5 cenas fracas sai com: hook + 1 troca de 11 s + 1 inserção de 5 s ≈ US$ 0,55 (hoje
  0,39). Para 2 trocas por filme o teto teria de ir a ~US$ 0,80 — decisão sua (1 linha: `KINEO1_AI_BUDGET_USD`).

## Como desligar
`app/api/generate-video-fast/route.ts`: `const KINEO1_IMAGEM_V2 = false` → a rota volta ao caminho de 22c8e70e (nenhuma
chamada nova, clipes escolhidos antes do laço, fala sem o filtro de instrução). `KINEO1_GATE_HEAD_FALLBACK = false` desliga
só a regra 5 do portão.

## O que olhar depois de subir
- `fast_scene_plan.metadata.scenes[*]`: `origin` (pool/chain/vault/recycled/ai), `candidates`, `subject`, `stockable`,
  `weak`, `ai_clip` (modo, segundos, custo ou por que não saiu: cap/budget/not_eligible); `metadata.image_v2`
  (plano ok, cenas fracas, gasto do filme).
- `fast_ai_clips_pending`: `replace_index`, `seconds`, `usd` por clipe, `budget_usd` 0,65, `stills_reserved_usd`.
- `fast_ai_clips_result`: `replaced` (quantos trocaram) e `est_usd` com o preço real.
- `pasted_brief_detected`: quantas vezes a instrução colada saiu da fala (só contagens).
- Nota do juiz (painel): cenas trocadas são julgadas só pelo gerado (o stock que saiu não entra na evidência).

## Limites conhecidos
- O juiz lê texto: cena trocada por clipe de IA tende a passar "por construção". A nota é o 1º filtro; o 2º é o seu olho
  numa amostra renderizada (o replay `/api/admin/kineo1-replay` mede antes/depois sem render).
- Clipe de IA é pedido na ordem das cenas (dentro do laço, por causa da espera da Seedance); com o teto apertado, as primeiras
  cenas fracas levam o orçamento. O replay prioriza a pior razão (pickAiClipScenesV2) — pode dar número melhor que o real.
- Briefing só de instrução ("Use narração em inglês americano…") vira modo IA, mas o idioma da narração segue a regra de
  hoje (o texto em português puxa português): honrar o idioma pedido no briefing fica para depois.
- A instrução colada no MEIO de um parágrafo de fala não sai (a regra é por linha inteira).
- Briefing com gancho/fecho entre aspas vira "a IA estrutura": o escritor de cenas lê o briefing inteiro (as aspas
  dentro, com "o seguinte gancho:" / "Termine com:" do autor), mas nada obriga as duas frases a saírem palavra por
  palavra — dar ao escritor um campo explícito de gancho/fecho mexe em `lib/runway.ts` e fica para depois.
- "Create a 1-minute video of…" SOZINHO em "Use my script as is" continua como hoje (curto demais → recusa sem
  cobrança): uma linha forte sozinha nunca troca o modo do autor.

### Revisão pós-auditoria (28/09) — o filtro da instrução colada
O revisor executou a v1 de `lib/kineo1/pastedBrief.ts` e provou dois defeitos:
- **D1 — briefing com sobra de instrução virava filme cobrado lendo instrução.** 17dd0c7a/2fa42114 (24/09, a mesma
  pessoa da Lua, 1ª tentativa, 284 palavras a 60 s): em 22c8e70e era recusa sem cobrança (108 s de fala); a v1 deixava
  102 palavras ("Conte a história aumentando…; depois mostre…", "O resultado final deve parecer um YouTube Short…" e as
  aspas) e o filme saía a 35 s, cobrado. O mesmo buraco num filme REAL entregue: 8b23d27a (tênis, ES) narrava "Utiliza
  imágenes…", "El primer segundo debe…", "No inventes escenas…". Agora a SOBRA de um texto que fala com o editor é lida
  frase a frase (verbo de direção com história, verbo depois de ";", "O resultado/Every visual/El primer segundo deve",
  plano de câmera, "Para X, mostre…", negação com produção, ficha técnica, cadeia de ordens) e sai; e se o que sobra
  são só falas entre aspas curtas demais para o filme mais curto (< 80 palavras = 35 s × 95% × 2,5 pal/s), o texto é
  briefing → "a IA estrutura". 17dd0c7a → brief_only; 8b23d27a → as 6 linhas de fala do autor, idênticas; 8c0ed465
  ("3 Places on Earth…") → a fala do autor com os títulos, 17 linhas de direção fora.
- **D2 — roteiro de UM parágrafo lido como briefing** (a rota trocava para "a IA estrutura" e o escritor reescrevia):
  "Este vídeo vai mudar…", "Evite estes três erros… Em poucos segundos…", "Change your life in 30 seconds a day…".
  Agora: parágrafo com mais de uma frase e > 40 palavras nunca é classificado inteiro; o substantivo de produção só vale
  na 1ª frase; "segundos" só como especificação ("a cada 2–3 segundos", "35 a 45 segundos"); "vai/va a" não é frase
  sobre o filme; e UMA linha forte sozinha nunca troca o modo (só sai se sobrar fala).
Calibração nos 78 textos verbatim do Kineo 1 de 17-28/09 (render_job_opened + fast_scene_plan): 46 têm [Pexels:] (a
peça nem roda); os briefings e roteiros-com-direção reais (17dd0c7a, 2ff93c15, b3b3e101, 8b23d27a, 8c0ed465,
e90a2f9c, 801d0adf, f60b0c36) e os 4 anúncios narrados de 28/09 foram executados; nos outros roteiros narrados,
nenhuma linha que abre com verbo, rótulo ou artigo é forte (a peça não mexe neles). Guardiões: 127 ok (peças) e 50 ok (rota); 21 mutantes, 21 mortos.

Guardiões: `scripts/test-kineo1-imagem-v2-2026-09-28.mjs` (peças) e `scripts/test-kineo1-imagem-v2-rota-2026-09-28.mjs`
(executa o laço real da rota com a rede falsa: plano de buscas, opções v2, cena fraca, troca, teto, evidência, instrução
colada, ensaio e o interruptor desligado).
