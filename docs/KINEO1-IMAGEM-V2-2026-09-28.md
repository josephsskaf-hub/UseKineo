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
