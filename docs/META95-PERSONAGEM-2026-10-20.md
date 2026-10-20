# Meta 95 — a folha de personagem: o MESMO personagem nas 3 cenas (20/10/2026)

Entrega **KINEO-META95-PERSONAGEM-2010** [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]. Fase 1: desenho + prova offline + código atrás de interruptor **DESLIGADO para clientes**. Nenhum render pago, nenhum `.env` lido, banco `cqqukkvjjrguayiyjvhh` só leitura.

Base: `docs/DIAGNOSTICO-META-95-2026-10-19.md` (C5 + §3: "identidade de personagem entre cenas" é o que nenhuma das 3 alavancas resolve), `docs/CONSISTENCIA-COMO-OS-LIDERES-GARANTEM-2026-10-19.md` (M7: referência travada) e `docs/FILMES-COMO-OS-LIDERES-FAZEM-2026-10-19.md` (§1.3-8: "estilo visual fixo repetido em todo prompt de cena").

---

## 0. Resposta curta

1. **Hoje cada still é um pedido independente.** A estrada clássica (Seedance 1.5, Kling 2.5, Veo 3.1) já faz image-to-video a partir de um still FLUX por cena, com a MESMA semente — mas a semente não trava identidade, e a única ficha de personagem é de TEXTO (`deriveStoryCharacter`, só quando o autor descreveu o personagem). O Dino (render b3732cf0) é "Dino" nos 3 prompts e em nenhum deles alguém diz o que o Dino É: o still da cena 3 saiu um menino humano, o crítico de pixel reprovou os 3 stills (30/30/30) e o juiz de coerência deu 95.
2. **O que já existe e não está ligado a isto:** a "Estrela do filme" (`lib/estrelaDoFilme.ts` + `lib/estrelaServer.ts`) gera o still de cada cena com protagonista pelo `fal-ai/nano-banana-pro/edit` a partir das FOTOS do cliente — é exatamente uma folha de personagem, só que com foto real. O crítico do still (`lib/cinematic/criticoStill.ts`) julga 1 imagem com 4 critérios e está em `log_only`. O elenco de texto (`elencoDaHistoria.ts`) só reconhece papéis que FALAM com rótulo.
3. **O desenho (padrão dos líderes):** 1 **folha** de referência por personagem, gerada UMA vez do roteiro (descrição canônica: espécie/idade/cor/roupa), reutilizada como `image_urls` do edit em TODA cena que cita o personagem; a mesma descrição injetada no prompt do still e do clipe; o crítico recebe a folha como 2ª imagem e o critério **IDENTITY**; still reprovado é refeito UMA vez (~US$ 0,15) antes do clipe pago. Sem personagem (documentário sem pessoa): nada muda.
4. **Custo extra por filme:** 15 s ≈ **US$ 0,42** (1 folha + 3 stills com folha + 3 críticos; pior caso US$ 0,88); 35 s ≈ **US$ 0,58** (2 folhas + 4 stills; pior caso US$ 1,18). Latência típica **+25–40 s** (folha 5–8 s, stills 10–20 s em paralelo, crítico 2–4 s), pior caso +110 s (dentro do `maxDuration` de 300 s).
5. **Prova offline (sem fornecedor):** nos roteiros REAIS do Dino, do Ravan e da biblioteca da meia-noite, o construtor de cena de hoje não descreve o personagem em nenhuma cena; com a folha, cada cena que o cita recebe a mesma descrição canônica e o still nasce do edit com a folha. O guardião `scripts/test-meta95-personagem-2010.mjs` executa isso (86 verificações, 19 mutantes).
6. **Desligado = fluxo e JSON idênticos**, provado de 3 jeitos: cada arquivo tocado, desfeitas as linhas marcadas, é byte a byte a origin/main; toda linha fora do bloco é import, comentário ou guardada por `personagem.ativo`; o bloco REAL da rota, executado com o interruptor desligado, não chama fornecedor, não toca `sceneStills`, não grava evento e não põe nada na resposta.

---

## 1. O mapa: como as cenas nascem hoje (código em origin/main b7662b717)

| Pergunta | Estrada clássica (Seedance 1.5 / Kling 2.5 / Veo 3.1) | Estrada hollywood (Kling 3 / H3 / Omni) | S25 |
|---|---|---|---|
| **Still por cena?** | SIM, em TODAS as cenas: `generateCinematicSceneStill` (FLUX dev, ~US$ 0,015, `lib/hollywood/anchors.ts`), pool de 3, orçamento 60 s (`route.ts` "KINEO-ANCORA-LEGENDA-1410") | SIM: 2 âncoras fixas (retrato + ambiente, `generateHollywoodAnchors`) + still por cena (`criticoHCena`) | foto-base própria (`lib/hollywood/juizStill.ts`) |
| **Imagem passada ao motor (i2v)?** | SIM: `image_url` do still da cena → `fal-ai/bytedance/seedance/v1.5/pro/image-to-video` (720p, 4–12 s, `generate_audio:false`, `seed`), `kling-video/v2.5-turbo/pro/image-to-video`, `veo3.1/fast/image-to-video` (`buildFalInput`, route ~L751) | SIM: retrato nas cenas de diálogo (O3 i2v), ambiente nas de apoio | foto-base |
| **Semente?** | UMA por geração (`deterministicSeed(billingReference)`, FNV-1a), em todos os stills e clipes | não | — |
| **Âncora de personagem?** | Só TEXTO: `deriveExplicitCharacter`/`deriveStoryCharacter` (`sceneStyle.ts`) quando o autor descreveu ("Benny, the tiniest bunny", "a middle-aged man with…"); `derivarElenco` para papéis que falam com rótulo (EyeBible). Um nome nu ("Dino", "Ravan") → **null** → nada em nenhuma cena | `characterSheet` do planejador (GPT, ~40 palavras) repetido nas cenas com a pessoa + retrato FLUX como `image_url` | — |
| **Referência de IMAGEM do personagem?** | Só com a **Estrela do filme** (fotos reais do cliente → `nano-banana-pro/edit`, `planoDaEstrela` decide as cenas, `gerarStillsDaEstrela` gera, moderação de saída). Sem fotos: nenhuma | retrato FLUX (sem o rosto do roteiro, inventado pelo planejador) | — |
| **Juiz do still?** | `criticoStill` (`STILL_CRITIC_MODE`, padrão **log_only**): 1 imagem, 4 critérios (anatomia, texto, sujeito, artefato); `enforce` existe (1 regeração/cena, teto 3/filme) e nunca foi ligado | o mesmo crítico | `juizStill` (anacronismo, câmera, texto, repetição) |
| **Modo visual** | `decidirFormato` (lexical): documentary_faceless por padrão — o apagão de pessoa tira "boy/man/woman" do prompt (C5 do diagnóstico); character_story só com look estilizado, romance, Estrela ou "stock_cannot_tell" | — | — |

**O que já existia e não estava ligado:** (a) o edit com referência da Estrela (endpoint, corpo, POST único, moderação) serve igual com uma folha gerada no lugar da foto; (b) o modo `enforce` do crítico; (c) as duas trilhas de ficha de texto (`policy.character` → "The same main character appears in this scene, consistent design: …" e `policy.elenco` → "Recurring characters, identical face, hair and costume…"), que só precisam receber uma descrição.

---

## 2. O desenho (`lib/cinematic/folhaDePersonagem.ts`, puro; a rede fica na rota)

```
roteiro ──► 1. ELENCO (determinístico)  ──► 2. CASTING (gpt-4o-mini refina, 6 s, falha = determinístico)
                │                                   │
                │  nome com papel de sujeito/        │  "Dino, a small chubby bright-green dinosaur, cream belly,
                │  possessivo/fala ("Dino heard",    │   big round black eyes, short tail, tiny arms, no clothes"
                │  "Ravan's face", "Dino:") ou       ▼
                │  protagonista sem nome        3. FOLHA: 1 imagem por personagem (FLUX dev, corpo inteiro, de frente,
                │  ("a sad Indian boy")            fundo liso, look do filme, semente do filme + índice)   ~US$ 0,015
                ▼                                   │
        4. TEXTO em toda cena que cita o personagem (policy.character / policy.elenco — as trilhas que já existem):
           still E clipe i2v dizem o que o Dino é
                                                    ▼
        5. STILL COM FOLHA: cena que cita o personagem → nano-banana-pro/edit, image_urls = [folha(s)],
           prompt = prompt final da cena + "Character in this scene: Dino is …" + identidade pela imagem   US$ 0,15
                                                    ▼
        6. CRÍTICO com a folha como 2ª imagem + critério (5) IDENTITY, modo enforce:
           FAIL → UMA foto nova (edit com a folha + instrução positiva), julgada de novo, segue a melhor   ~US$ 0,001 (+0,15 se refaz)
                                                    ▼
        7. o still aprovado SUBSTITUI o FLUX daquela cena → clipe i2v (Seedance/Kling/Veo) como hoje.
           Folha, edit ou moderação que falha = a cena sai EXATAMENTE como hoje (FLUX). Sem personagem: nada roda.
```

Decisões e por quê:
- **Determinístico primeiro, modelo depois.** O elenco e a descrição canônica nascem de regras (mesmo roteiro → mesma ficha, retentativa estável); o gpt-4o-mini só refina a descrição mantendo nome e espécie (`lerCasting` recusa descrição humana para criatura, texto curto, "reference/photo/same", nome fora da lista). A ficha escrita pelo autor (`deriveExplicitCharacter`) vence as duas.
- **Nano Banana Pro edit, não FLUX Kontext.** A casa já validou o Nano Banana com referência em produção (Estrela, desde 01/10; aceita até 14 imagens, 2 personagens na mesma cena = 2 folhas no mesmo pedido). O Kontext (`fal-ai/flux-pro/kontext`, US$ 0,04, 1 `image_url`) é um EDITOR da própria imagem — serviria para a fase 2 como opção barata, não exercitada.
- **Folha em FLUX dev, não em Nano Banana.** A folha é só a referência (US$ 0,015 contra 0,15); o que precisa de qualidade é o still da cena.
- **O crítico decide (enforce) só nesta trilha.** O crítico de hoje segue em `log_only` nos stills FLUX; com a folha há referência objetiva para julgar identidade, então ele pode refazer. `STILL_CRITIC_MODE=off` desliga os dois.
- **O modo visual.** Com a folha pedida e um roteiro COM personagem, `documentary_faceless` vira `character_story` (o mesmo movimento da Estrela e do romance): o apagão de pessoa era o que tirava o protagonista da cena (C5). A tag `[faceless]` continua vencendo.
- **Fora da fase 1:** estrada hollywood (já tem retrato + characterSheet; a folha entraria no lugar do retrato FLUX), Sora/Kineo 1 (sem still), personagem só por pronome na camada de TEXTO (o still com folha já cobre: cenas 2 e 3 do menino da moto entram pelo "his/he").

---

## 3. Custo e latência por filme

| | 15 s (3 cenas, 1 personagem) | 35 s (4 cenas, 2 personagens) |
|---|---|---|
| Casting (gpt-4o-mini, 1 chamada) | US$ 0,0005 · 1–2 s | US$ 0,0005 · 1–2 s |
| Folha (FLUX dev 9:16) | 1 × US$ 0,015 · 4–8 s | 2 × US$ 0,015 (paralelo) · 4–8 s |
| Still com folha (Nano Banana Pro 1K) no lugar do FLUX (US$ 0,015) | 3 × (0,15 − 0,015) = US$ 0,405 · 10–20 s (pool 4) | 4 × 0,135 = US$ 0,54 · 10–25 s |
| Crítico (2 imagens em detail low) | 3 × US$ 0,001 · 2–4 s | 4 × US$ 0,001 · 2–4 s |
| **Total extra (típico)** | **≈ US$ 0,42 · +25–35 s** | **≈ US$ 0,58 · +25–40 s** |
| Pior caso (toda cena refeita 1×, teto 3/filme) | ≈ US$ 0,88 · +60–110 s | ≈ US$ 1,18 · +60–110 s |
| Hoje (base) | filme 15 s ≈ US$ 0,55–0,60 | filme 35 s ≈ US$ 1,50 |

Crédito do cliente: **inalterado** nesta fase (interruptor interno). Para abrir ao público a conta de margem é: 15 s a 9 cr ≈ US$ 1,15 de receita por filme contra ≈ US$ 1,00 de custo com a folha — cabe, mas só vale no filme com personagem (≈ 8–15 % dos filmes: `character_story` são 7 de 113 em 7 d, mais os faceless com protagonista apagado).

Motores que aceitam imagem de entrada (schemas da fal lidos 20/10): Seedance 1.5 i2v (`image_url` + `end_image_url` opcional, 4–12 s, 480p/720p, `seed`, US$ 0,052/s a 720p) — **já em uso**; Kling 2.5 i2v e Veo 3.1 i2v — **já em uso**; `nano-banana-pro/edit` (`image_urls` até 14, 1K/2K/4K, US$ 0,15/imagem) — **já em uso na Estrela**; `flux-pro/kontext` (1 `image_url`, `seed`, US$ 0,04) — em uso no Avatar, não aqui.

---

## 4. Prova offline (roteiros reais do banco, sem chamar fornecedor)

### 4.1 Dino — render b3732cf0 (justomendes, 19/10, Seedance 1.5, 15 s, `documentary_faceless`)

**Antes (os 3 prompts REAIS do claim):** nenhum diz o que o Dino é.
- cena 1: "Close-up shot of rustling leaves and dark shadows in a dense forest at night…"
- cena 2: "Close-up of **Dino's** worried face, eyes wide, as he, "Oh no!" in a dimly lit room with a dinosaur blanket visible behind him., faceless cinematic b-roll, … no foreground human faces, photorealistic…"
- cena 3: "Tracking shot of **Dino** peering out of a window, his face illuminated by the soft glow of fireflies…"
- `deriveStoryCharacter(roteiro)` = **null**. Crítico do still (log_only): FAIL 30/30/30 ("Deformed facial features", "Child's body appears distorted at the window"). Juiz de coerência: 95.

**Depois (o código novo, executado):**
- Elenco determinístico: **Dino — criatura "dinosaur"** (pista: "dinosaur blanket" no roteiro), protagonista. Canônica determinística: *"Dino, a medium-sized teal dinosaur with a lighter belly, big round friendly eyes and a short tail, no clothes"*; com o casting (resposta boa do modelo): *"Dino, a small chubby bright-green dinosaur about the size of a child, cream belly, big round black eyes, short tail, tiny arms, a soft friendly face, no clothes, a little yellow star-shaped spot on the forehead"*.
- Modo: `documentary_faceless` → `character_story` (o roteiro tem personagem).
- Cenas com folha: **2 e 3** (a floresta da cena 1 fica no FLUX).
- Prompt da cena 2 pelo construtor REAL (`buildClassicVisualPrompt`): "…Close-up of Dino's worried face… **The same main character appears in this scene, consistent design: Dino, a medium-sized teal dinosaur with a lighter belly, big round friendly eyes and a short tail, no clothes.** 9:16 vertical…" — a cena 3 leva a mesma frase; a cena 1 fica byte a byte a de antes.
- Still das cenas 2 e 3: `nano-banana-pro/edit`, `image_urls: [folha do Dino]`, prompt = o de cima + "Character in this scene: Dino is a … / The character(s) named above must be EXACTLY the character shown in the reference image: same species, same body shape…".
- Crítico: folha + still, critério (5) IDENTITY. Um still "menino humano" → FAIL identity → foto nova com a folha.

### 4.2 Ravan — render 18d89c1f (20/10, Seedance 1.5, `character_story`, crítico FAIL 3/3)

**Antes:** "A close-up of a young Indian boy with tears in his eyes… effigy of Ravan, the demon king" / "A close-up of Ravan's painted face…" / "…the Indian boy's face as he stares in shock at the Ravan effigy… Ravan's eyes rolling". Nenhuma ficha (`deriveStoryCharacter` = null): o menino e o Ravan nascem de novo em cada still.

**Depois:** elenco = **o menino** ("the sad indian boy", protagonista, criança: *"a boy about nine years old with short dark hair, narrow face and sharp eyes, wearing a red t-shirt and blue shorts"*) + **Ravan** (nomeado, adulto: *"a man in their early thirties with short reddish hair, freckles and a small nose, wearing a dark blue jacket over a grey t-shirt"* — o casting corrige para o rei-demônio; o determinístico garante ao menos UM Ravan). Cenas: 1 = menino (+ a efígie), 2 = Ravan, 3 = os dois (**2 folhas no mesmo edit**). O menino entra pela trilha `character` e o Ravan pela trilha `elenco` ("Recurring characters, identical face, hair and costume…: the ravan is …").

### 4.3 A biblioteca da meia-noite — render f21beead (17/10, Seedance 1.5, `character_story`, crítico FAIL 3/3)

**Antes:** "…the silhouette of an ornate library…" / "A close-up of a young man's hands as he opens a dusty, book…" / "…a young woman stands in the doorway, clutching the same glowing book…". Sem ficha.

**Depois:** elenco = **"the young man"** (adulto jovem: *"a man in their early twenties with wavy chestnut hair, freckles and a small nose, wearing a dark blue jacket over a grey t-shirt"*); só a cena 2 o cita (a irmã da cena 3 é outra pessoa, a rua da cena 1 não tem ninguém) → 1 still com folha. O limite honesto: a irmã não entra no elenco (teto de 2 e só o 1º protagonista sem nome); fase 2.

### 4.4 O menino da moto — render 5a114e02 (18/10; o diagnóstico: "o menino nunca aparece, só a bicicleta")

Roteiro real: "Midnight. A boy rode his bike home… His bike stopped. Her photo… on a grave. He vanished…". Elenco = **"the boy"** (*"a boy about nine years old with short dark hair, high cheekbones and dark eyes, wearing a blue jacket over a white t-shirt"*); nas **3 cenas** (2 e 3 pelo "his/he" que continua a cena 1). Com a folha, o modo vira `character_story` (hoje é faceless: "a boy" virava "a distant silhouetted figure seen from behind").

Tudo acima roda no guardião (`node scripts/test-meta95-personagem-2010.mjs`, seções E, P, J, R) com fornecedores falsos; o bloco da rota executado liga/desliga está na seção R.

---

## 5. Como ligar por pedido (só conta interna; clientes: nada muda)

`PERSONAGEM_PUBLIC = false` em `lib/cinematic/folhaDePersonagem.ts`. A folha só liga quando TUDO é verdade: conta interna (`lib/internalAccounts`), corpo do `POST /api/generate-video-cinematic` com `formatFlags: ["personagem"]` (também aceito `format_flags` e texto `"f1,personagem"`), motor Seedance 1.5 (padrão) / Kling 2.5 / Veo 3.1, âncora ligada (`CINEMATIC_ANCHOR_ENABLED`), **sem** Estrela e **sem** a tag `[faceless]`.

Ensaio de $0 primeiro (conta do fundador):
```json
{ "prompt": "<roteiro>", "engine": "seedance", "duration": 15, "script_mode": "verbatim", "dry_run": true, "formatFlags": ["personagem"] }
```
A resposta traz `personagem: { elenco (canônica, tipo, origem), folhas (os prompts), cenas (quem está em cada uma), cenas_com_personagem, custo_estimado_usd, custo_pior_caso_usd }` — nada é gerado. Depois, o mesmo corpo sem `dry_run`. O log mostra `[personagem] gen=… folha LIGADA`, `elenco=…`, e no fim `folhas=1/1 cenas_com_personagem=2/3 stills_ok=2 fallback=0 critico=2:PASS 3:FAIL→regerada extra_usd=0.44`. Eventos: `cinematic_character_sheet` (session_id = generation_id: elenco, folhas, cenas, stills, vereditos, custo) e `cinematic_still_critic` com `path_kind: 'personagem'`. A resposta do claim ganha `personagem: <relato>`.

Os 3 filmes de teste sugeridos (1 variável por vez, régua do olho na folha de quadros): o Dino (criatura nomeada), o Ravan (2 personagens, 1 cena com os dois) e o menino da moto (protagonista sem nome, pronome). Comparar com os renders originais (b3732cf0, 18d89c1f, 5a114e02).

---

## 6. O que está no código (origin/main b7662b717 + esta entrega)

- **Novo:** `lib/cinematic/folhaDePersonagem.ts` (puro: interruptor, elenco, casting, folha, cenas, prompts, custo, relato, ensaio).
- **`lib/cinematic/criticoStill.ts`** (18 linhas marcadas: 12 acréscimos + 6 trocas): `referencia?` na entrada, 2ª imagem + critério (5) IDENTITY só com referência, `lerRespostaDoCritico(raw, comIdentidade=false)`, problema `identidade` + instrução positiva primeiro. Sem referência: pedido, leitura e instrução **byte a byte** os da base (provado contra a lib da base lida do git).
- **`app/api/generate-video-cinematic/route.ts`** (59 acréscimos, 0 trocas): 2 imports; `personagemPedido` + o modo visual; `personagem = decidirPersonagem(…)`; `personagemElenco` (casting) → `policy.character`/`policy.elenco`; o bloco `>>> … <<<` depois da Estrela e antes de qualquer POST de clipe; a linha do ensaio de $0; `personagemRelatoFinal` na resposta.
- **Guardião** `scripts/test-meta95-personagem-2010.mjs` (I, E, C, P, J, R, D, M — 86 verificações, 19 mutantes) + **desfaz** `scripts/test-support/desfaz-meta95-personagem-2010.mjs` (+ `-trocas.json`), encadeado como camada mais nova: `semMeta95Ideia1910` (cabeça da cadeia da rota) e `semMenuUgc2010` (cabeça das cadeias da home/kit, que leem o desfaz da ideia) chamam este primeiro; `linhaDoFilmeRapido1710` aceita a marca; o guardião da trilha filtra os commits desta entrega do selo de 16/10; o guardião do publicador (`test-quality-route-integration`) recebe `personagemRelatoFinal: null` no contexto.
- **Suíte inteira** (955 guardiões, 2 fatias): zero vermelho novo frente à base de 19/10 — os 14 "vermelhos" da rodada paralela eram timeouts de 120 s (passam sozinhos ou com 300 s) e 3 reâncoras acima; `tsc --noEmit` limpo.

## 7. Próximas jogadas

1. **Amanhã:** os 3 filmes de teste (dry-run antes; saldo da fal antes). Nota do olho ≥ 9 na identidade = abrir a fase 2.
2. **Fase 2:** a folha no retrato da estrada hollywood (no lugar do FLUX inventado), a irmã/2º personagem sem nome, a ficha no TEXTO das cenas por pronome, best-of-2 do still com folha (R4/F6 já com "vai").
3. **Público:** `PERSONAGEM_PUBLIC = true` só para filmes com personagem (o próprio elenco decide), depois da conta de margem (§3).

## ✅ O QUE VOCÊ PRECISA FAZER

1. Clicar em SUBIR-SITE.bat quando a fila estiver pronta (a sessão CEO avisa).
2. Amanhã, rodar os 3 filmes de teste com `formatFlags: ["personagem"]` (dry_run primeiro) e dar a nota do olho na identidade.

## 📋 O QUE ACONTECEU

O filme trocava de personagem entre as cenas porque cada imagem era um pedido independente e o Dino nunca foi descrito. Agora existe, atrás de um interruptor interno, uma folha de personagem gerada do roteiro que vira referência de imagem em toda cena que cita o personagem, com juiz comparando cada still à folha e refazendo o reprovado antes do clipe pago. Custa ~US$ 0,42 a mais num filme de 15 s. Desligado, nada muda — provado byte a byte.
