# Estudo: produto real dentro da cena — como os líderes fazem (16/10/2026)

Tarefa KINEO-ESTUDO-PRODUTO-NA-CENA-1610. Custo zero: nenhum render, nenhuma chamada à fal ou à OpenAI, nenhum código mudado, nada publicado.
Gatilho: o fundador viu o anúncio do Studio Ads `93576217` (perfume Atheeri, "num hotel com chuva", Comercial 15 s) e o reprovou.
Os quadros estão em `C:\kineo-wt\prints-1610\fiel7-T1-quadros.jpg`.

> **Fontes:** a pesquisa web foi feita em 16/10/2026, só em páginas públicas. Cada afirmação traz a URL e a data. Onde aparece "não confirmado",
> não achei fonte. Onde aparece "indício", a fonte é Reddit, revendedor ou um trecho de busca.

---

## 1. Como os líderes põem o produto real na cena (pesquisa de 16/10/2026)

Tudo veio de páginas públicas. Onde aparece "trecho de busca", a página bloqueou a leitura e só vi o resumo do buscador. Isso vale como
indício, não como confirmação.

### Os 8 padrões (o que importa para nós)

1. **Primeiro a foto parada (still) com o produto já dentro da cena, depois a animação.** O still sai com pessoa e produto juntos, a
   pessoa escolhe entre 3 e 4 opções, e só então o vídeo é gerado a partir desse still. Fazem assim: Higgsfield UGC Factory (Nano Banana,
   4 quadros-chave por vez; trecho de busca de higgsfield.ai/blog/Higgsfield-UGC-Factory-Explained, set/2025), HeyGen, Topview, Pippit,
   Arcads e a API da Creatify (dois passos: imagem de prévia e depois vídeo, docs.creatify.ai, exemplos de 30/05/2025). O Google
   recomenda o mesmo: a referência no Nano Banana Pro e depois o Veo (blog.google, 13/01/2026).
2. **A foto real entra como REFERÊNCIA, nunca como recorte colado.** A HeyGen diz encaixar o produto "at the pixel level rather than
   pasting it on top", com luz, sombra e escala casadas (heygen.com/en-gb/tool/ai-product-placement, acesso em 16/10/2026; é a afirmação
   do próprio fornecedor). O Runway "locks onto the product's shape, label and colors as the reference" (runway.com/use-cases/product-video-ads,
   16/10/2026). **É exatamente o oposto do que fazemos hoje.**
3. **Várias tentativas e uma escolha humana.** Geram 3, 4 ou 6 opções. A Higgsfield manda conferir "o visual do produto, o texto e cada
   afirmação" (blog do Ad Multiplier, 06/10/2026).
4. **A fidelidade vem de restringir o movimento.** A Arcads escreve regras no prompt ("mesma forma, tamanho, tampa e posição do logo,
   sem deformar", câmera estável; help.arcads.ai, 06/01/2026). A Pippit usa giro máximo de 20°, produto perto do tronco e dedos visíveis no
   contato (pippit.ai/blog/ai-character-product-in-hand-scale-test, 02/09/2026). A Higgsfield avisa que texto pequeno deforma nos presets
   que giram o produto (trecho de busca, Ads 2.0).
5. **A escala vem da mão.** A HeyGen recomenda produto pequeno, de mão, e reduzir o produto grande "para parecer natural na mão"
   (Academy, 16/10/2026). A Pippit usa "objeto de tamanho conhecido como âncora". Topview: indício de que joia fica em dúvida.
6. **O link do produto é a porta de entrada** (Higgsfield Click to Ad, Creatify, Topview, Pippit, Amazon).
7. **Clipes curtos montados num anúncio de 15 a 30 s:** gancho → demonstração → prova → CTA. A Creatify usa um template de 26 s (3 s de
   gancho, 15 s de demonstração, 5 s de prova, 3 s de CTA; creatify.ai/blog/product-ads…, 14/01/2026). A Amazon gera 6 anúncios de 15 s
   (advertising.amazon.com, 20/11/2025).
8. **O texto pequeno do rótulo é a fraqueza que todos admitem.** Higgsfield Ads 2.0, HeyGen (num teste, a lata saiu "distorcida e
   ilegível" no zoom; indício, provideocoalition.com), Amazon (mostrador do relógio ilegível; indício, retailwire não confirmado) e
   Creatify (o "rótulo virando rabisco" é a falha que o Boreal-H3 quer resolver, segundo a própria empresa). **Ninguém mostrou prova
   independente de rótulo legível do começo ao fim de um vídeo.**

### Por empresa

| Empresa | O que o usuário dá → o que sai | Modelo | Como mantém o rótulo | Segura/usa? | Duração/estrutura |
|---|---|---|---|---|---|
| **Higgsfield** | *Click to Ad*: link → puxa nome, até 8 fotos, cores e logo → template (1.500+) → anúncio (blog, 13/10/2026). *Marketing Studio*: link ou até 5 fotos + avatar, 9 modos (TV Spot, UGC, Tutorial, Review, Unboxing, Try-On, Hyper Motion…) (marketing-studio-intro, 16/10/2026). *Ad Multiplier*: anúncio de referência de 4 a 30 s + até 20 imagens → mesmos cortes e ritmo com produto, pessoa e local trocados (06/10/2026) | UGC Factory = Nano Banana (trecho de busca). O vídeo do Click to Ad e do Ad Multiplier: **não confirmado**. O Draw-to-Video antigo punha o produto "na mão" com Veo 3/Hailuo 02 (trecho de busca) | Still com Nano Banana antes de animar; o Canvas casa perspectiva e luz (trecho de busca) | Sim (UGC Factory, close de mãos no Review) | UGC e Motion até 30 s; o Click to Ad teria teto de 15 s (**não confirmado**) |
| **Creatify** | Link → 5 a 10 roteiros → avatar (1.500+) → editor com legenda, música e cartão final; lote de até 20 links (14/01/2026) | **Boreal**: modelo aberto pós-treinado em filmagem publicitária, áudio e vídeo juntos (blog, 15/09/2026). **Boreal-H3**: pós-treino sobre o MiniMax H3, até 9 imagens + 3 vídeos + 3 áudios de referência (orcarouter.ai, 30/09/2026; revendedor, indício). Segurar o produto: **Aurora** (28/01/2026) | O pós-treino mira "o produto exato enviado". Referência com várias vistas ficou em "próximos passos" (15/09/2026). Os números de fidelidade são só dela | Sim (Aurora, plano Pro) | Gancho 3 s · demonstração 15 s · prova 5 s · CTA 3 s. 15 a 30 s para Meta e TikTok |
| **Arcads** | Foto do produto como referência + "a 30 years old woman in a kitchen, holding the product in the reference image…" → still → ator falante, ou o still como 1º quadro do Veo 3.1 (help.arcads.ai, 06/01/2026) | Talking Actor (próprio), Veo 3.1, Sora 2 Pro. O modelo de imagem não é dito | Still primeiro. O ator falante dá "100% product consistency" porque só anima o rosto. Regras de "não deformar" escritas no prompt | Sim, só com ator customizado (os da biblioteca "ainda não seguram") | Clipes de Veo até 10 s, montagem manual |
| **Topview** | Product Avatar: template → sobe o produto → ajuste MANUAL de tamanho e posição → imagem em 1 a 2 min → Avatar 4 anima com voz (topview.ai/guides/product-avatar, 21/10/2025) | Avatar 4 (próprio) | Composição parada com escala manual, 3 prévias, máscara se o recorte falhar (trecho de busca). Diz "pixel-perfect" (PR, 07/07/2025; afirmação dela) | Sim (também veste e senta) | UGC falado em 20+ línguas |
| **Pippit (ByteDance)** | "Product showcase" → "Product-holding" ou "Virtual try-on" → avatar ou foto → produto → rascunhos → vídeo (pippit.ai/tools/product-showcase-design, 16/10/2026) | Lista Seedance 2.5, Seedream 5.0 Pro, Nano Banana Pro, Veo 3.1; qual roda o holding: **não confirmado** | 4 stills → 1 escolhido → clipe de 9 s. Regras de escala: giro ≤ 20°, perto do tronco, dedos no contato (02/09/2026). O teste dela **evitou** rótulo | Sim | Controle de 30 s exatos; 9:16, 1:1, 16:9 |
| **Runway** | *Product Shot Video Builder*: 1 foto → sugestões de posicionamento → giro 360°, revelação, macro, estilo de vida (16/10/2026). *Create Ad*: anúncio de referência + produto + prompt (trecho de busca, help.runwayml.com). Um produto chamado "Runway Ads": **não encontrado** | Gen-4.5 / Aleph 2.0 listados; qual roda o quê: **não confirmado** | "Locks onto shape, label and colors as the reference"; pede foto nítida | **Não declarado** | **Não declarada** |
| **HeyGen** | Apps → Product Placement → foto do produto (720p+, de frente) + avatar → 4 imagens combinadas → escolhe → vídeo com Avatar IV ou Veo 3.1 (Academy, 16/10/2026) | Avatar IV (próprio) ou Veo 3.1 | Still antes do vídeo, "pixel level, not pasting" (afirmação dela) | Sim; produto de mão | Avatar até 180 s; Veo até 8 cenas de 8 s |
| **Google (Veo 3.1 / Flow)** | "Ingredients to Video": até 3 referências (personagem, objeto, cenário) + prompt; primeiro e último quadro; extensão de cena (developers.googleblog.com, 15/10/2025) | Veo 3.1 | Referência no Nano Banana Pro e depois Veo (13/01/2026); produto em fundo liso, e o prompt não contradiz a imagem (ajuda do Flow, trecho de busca). Indício no fórum: a referência é "re-renderizada" | Possível, mas não é função de anúncio | Sem exemplo oficial |
| **Amazon Ads Video Generator** | 1 foto ou vídeo + ASIN → lê a página do produto → até 6 anúncios de 15 s, com cenas, texto e música (advertising.amazon.com, 20/11/2025) | Não divulgado | Não descrito; "blends seamlessly into the action" (VP, ppc.land, 29/06/2025) | Sim (relógio no pulso, ferramentas em uso) | 15 s, só EUA, beta |

**O que a pesquisa NÃO achou:** ninguém declara a técnica de "colar o produto real" que nós usamos. O mais perto de "rótulo exato" é
o cartão final no editor da Creatify e o Talking Actor da Arcads (que só mexe o rosto).

---

## 2. Os modelos da fal para isso (conferidos em 16/10/2026)

Fonte de cada linha: `https://fal.ai/models/<endpoint>/llms.txt`, acessada em 16/10/2026. As páginas da fal não mostram data. As promessas
são do fornecedor, e a fal não publica benchmark.

### Imagem: compor o still com o produto (e a pessoa)

| Modelo | Endpoint | Refs | Preço | Promessa sobre produto/texto |
|---|---|---|---|---|
| **Bria Product Holding (FIBO-Edit 1.5)** | `bria/fibo-edit-1.5/product-holding` | 1 foto da pessoa + 1 a 3 do produto | US$ 0,04/img | Geometria, cores, materiais, marca e **texto do rótulo "reproduced as given"**. Só o braço e a mão mudam. "Licensed AI". **É o único que promete o rótulo por escrito** |
| Nano Banana Pro edit (Gemini 3 Pro Image) | `fal-ai/nano-banana-pro/edit` | até 14 (o Google diz: até 6 de objeto, 5 de pessoa, 3 de estilo) | US$ 0,15 (4K custa 2×) | "Superior text rendering". O Google promete "accurate brand consistency" (ai.google.dev/gemini-api/docs/image-generation). **Já integrado** |
| Image Apps v2 Product Holding | `fal-ai/image-apps-v2/product-holding` | 1 pessoa + 1 produto | US$ 0,04 (4K) | Produto "naturally in a person's hands". **Não promete rótulo** |
| Bria Product Shot | `fal-ai/bria/product-shot` | 1 produto + cena opcional | US$ 0,04 | "High integrity of the product". Sem pessoa |
| Qwen Image Edit Plus (2509) | `fal-ai/qwen-image-edit-plus` | várias (o exemplo usa 3) | US$ 0,03/MP | "Superior text editing". Candidato a **consertar o rótulo** depois |
| GPT-image-1.5 edit | `fal-ai/gpt-image-1.5/edit` | várias + máscara, `input_fidelity: high` | US$ 0,133–0,20 (high) | "Preserving … fine-grained detail" |
| Seedream 4.5 / 4.0 edit | `fal-ai/bytedance/seedream/v4.5/edit` · `/v4/edit` | até 10 | US$ 0,04 / 0,03 | Nenhuma promessa explícita |
| FLUX.1 Kontext Pro · Max Multi · FLUX.2 Pro edit | `fal-ai/flux-pro/kontext` · `/kontext/max/multi` · `fal-ai/flux-2-pro/edit` | 1 · várias (experimental) · não informado | US$ 0,04 · 0,08 · 0,03+ | Nada sobre texto |
| Nano Banana 2 edit · Nano Banana edit | `fal-ai/nano-banana-2/edit` · `fal-ai/nano-banana/edit` | não informado | US$ 0,08 · 0,039 | Nenhuma promessa |
| Virtual Try-on | `fal-ai/image-apps-v2/virtual-try-on` | pessoa + roupa | US$ 0,04 | Só roupa. Não serve aqui |

### Vídeo: i2v (anima uma foto) × ref2v (gera usando o produto como referência)

| Modelo | Endpoint | Tipo | Refs | Preço | Promessa |
|---|---|---|---|---|---|
| Kling O3 Pro / Standard ref2v | `fal-ai/kling-video/o3/pro/reference-to-video` · `/o3/standard/…` | **ref2v** + quadro inicial e final | elements + `image_urls` | US$ 0,112/s · 0,084/s (com áudio 0,14 · 0,112) | "Stable character identity, **object details**". É a única família de vídeo que promete objeto por escrito |
| Kling O1 ref2v | `fal-ai/kling-video/o1/reference-to-video` | ref2v | até 7 | US$ 0,112/s | A mesma |
| Kling 3 Pro i2v (com **elements**) | `fal-ai/kling-video/v3/pro/image-to-video` | i2v + quadro final + elements | 1 + elements | US$ 0,112/s (3–15 s) | Nenhuma promessa explícita |
| Kling O3 Pro i2v | `fal-ai/kling-video/o3/pro/image-to-video` | i2v | 1 (+ quadro final) | US$ 0,112/s | **Já integrado** (schema conferido em 28/09, `lib/ads/v2Engines.ts`) |
| Kling 2.6 Pro / 2.5 Turbo i2v | `…/v2.6/pro/image-to-video` · `…/v2.5-turbo/pro/image-to-video` | i2v + quadro final | 1 + 1 | US$ 0,07/s · US$ 0,35 por 5 s | Genérica |
| Seedance 2.0 ref2v | `bytedance/seedance-2.0/reference-to-video` (e `/fast/`) | **ref2v** | 9 imagens + 3 vídeos + 3 áudios | US$ 0,3034/s em 720p | Nenhuma promessa explícita |
| Seedance 2.0 i2v / Fast i2v | `bytedance/seedance-2.0/image-to-video` · `/fast/…` | i2v + quadro final | 1 + 1 | Fast: US$ 0,2419/s em 720p (valor do código) | Nenhuma. O Fast **já está integrado** |
| Seedance 2.5 ref2v / i2v | `bytedance/seedance-2.5/reference-to-video` · `/image-to-video` | ref2v (até 30 imagens) / i2v até 30 s | 30 + 10 + 10 / 1 + 1 | ≈ US$ 0,22/s em 480p · 0,47/s em 720p | "Lock a character, set and palette". Nada sobre produto |
| Seedance 1.5 Pro i2v | `fal-ai/bytedance/seedance/v1.5/pro/image-to-video` | i2v + quadro final | 1 + 1 | ≈ US$ 0,26 por 5 s em 720p | Nenhuma |
| Vidu Q2 / Q1 ref2v | `fal-ai/vidu/q2/reference-to-video` · `/q1/…` | **ref2v** | até 7 | US$ 0,30 por vídeo em 720p · US$ 0,40 por 5 s | "Consistent subject appearance" |
| Veo 3.1 ref2v ("ingredients") | `fal-ai/veo3.1/reference-to-video` | **ref2v** | o exemplo usa 3 | US$ 0,20/s (com áudio 0,40) | "Consistent subject appearance" |
| Veo 3.1 i2v / quadro inicial e final | `fal-ai/veo3.1/image-to-video` · `/first-last-frame-to-video` | i2v / inicial + final | 1 / 2 | US$ 0,20/s | Genérica |
| Hailuo 2.3 Pro i2v | `fal-ai/minimax/hailuo-2.3/pro/image-to-video` | i2v | 1 | US$ 0,49 por vídeo | Nenhuma |
| MiniMax Subject Reference (S2V-01) | `fal-ai/minimax/video-01-subject-reference` | ref2v | 1 | US$ 0,50 por vídeo | Só rosto. **Descartar** para produto |
| Wan 2.6 i2v / ref2v | `wan/v2.6/image-to-video` · `/reference-to-video` | i2v / ref2v **só com vídeo** | 1 / 1–3 vídeos | US$ 0,10–0,15/s | O ref2v não aceita foto. **Descartar** |
| Wan VACE 14B | `fal-ai/wan-vace-14b` | v2v / ref2v / inicial + final / máscara | lista de refs | US$ 0,04–0,08/s | Genérica |
| Seedance 1.0 Lite ref2v | `fal-ai/bytedance/seedance/v1/lite/reference-to-video` | — | — | **Desativado** (redireciona para o Grok Imagine) | — |

**Não confirmados em 16/10:** GPT-image-1 (versão 1.0), Hailuo 02, Wan 2.2/2.5.

**O que a tabela ensina:**
1. **Still com a pessoa segurando o produto:** o primeiro candidato é o Bria Product Holding (US$ 0,04, promete o rótulo). O plano B é o
   Nano Banana Pro (US$ 0,15), que também cria a pessoa e a cena do zero. O Bria precisa de **uma foto da pessoa**, e nós já temos de onde
   tirar: o retrato da biblioteca de apresentadores (`public/ads/presenters/`) ou uma cena de gente feita pelo próprio Nano Banana.
2. **Animar sem perder o rótulo:** usar o still como quadro inicial **e** final (Seedance 1.5/2.0, Kling 2.6/3, Veo first-last), o que
   prende a embalagem nas duas pontas. Outra saída é o Kling 3/O3 com o produto como **element**.
3. **Nenhuma página promete texto legível em VÍDEO.** Isso só se prova com render.

---

## 3. O que temos hoje no código (`origin/main 15d61911c`)

### O fluxo do nível Comercial, 15 s (`ADS_V2_TIER_SLOTS.commercial`, `lib/ads/v2ShotLists.ts:333`)

| Plano | Corte | Fonte | No Atheeri (só 1 foto, a da caixa) |
|---|---|---|---|
| 1 GANCHO | 2,0 s | foto do cliente → Kling O3 i2v 3 s | caixa em fundo branco |
| 2 DESEJO | 2,0 s | foto do cliente → Kling O3 i2v | caixa em fundo branco |
| 3 USO | 2,5 s | cena criada 0 (Nano Banana + trava + Kling O3) | mulher à mesa, caixa colada |
| 4 EMOÇÃO | 2,0 s | cena criada 1 | casal, caixa colada |
| 5 EMOÇÃO | 2,0 s | cena criada 2 | homem, caixa colada |
| 6 LUGAR → PACKSHOT | 2,0 s | foto real parada com zoom (`adsV2PackshotShots`) | caixa em fundo branco |
| CARTÃO | 2,5 s | montagem | foto da caixa + nome |

Resultado: cerca de 6 s de caixa no branco mais 2,5 s de cartão. São **8,5 de 15 s sem cena**, e é daí que vem o "40% de packshot branco".
Com um pedido de 1 foto só, o gancho e o desejo não têm outra imagem para animar.

### Onde nasce a colagem: a "trava do produto" (`lib/ads/v2ProductLockServer.ts` + `v2ShotLists.ts` 848–1400)

1. `adsV2PrepareLockedScene` recorta a caixa uma vez (BiRefNet) e manda ao Nano Banana um **esboço cinza vazio**. No modo `scene`, o
   modelo **não vê o produto**: `adsV2LockSceneRefs` tira toda foto de produto das referências.
2. `adsV2LockedScenePromptAt` pede uma cena "com NENHUMA garrafa, caixa ou produto, mãos vazias, longe da superfície", com um canto de
   baixo vazio. Esse texto proíbe por escrito a interação com o produto.
3. `adsV2FinishReservedScene` → `adsV2PlacedFramePng` **cola o recorte** (os pixels da foto de estúdio) numa caixa fixa: base em 85% da
   altura (`ADS_V2_LOCK_RESERVE_BASE`) e altura de **28% do quadro** (`ADS_V2_LOCK_MAX_H`). Por cima vão uma elipse de sombra e um ajuste de
   tom (`adsV2ShadeAndMatch`).
4. O Kling O3 anima o quadro com "o produto parado, ninguém pega nada" (`ADS_V2_PRODUCT_LOCK_MOTIONS`, `ADS_V2_LOCK_NO_NEW_OBJECT`).

Isso explica, um por um, os 4 defeitos que o fundador viu:
- **Colagem igual nas 3 cenas:** é o mesmo recorte, com o mesmo ângulo e a mesma luz de estúdio. O ajuste de tom não refaz direção de luz,
  reflexo nem oclusão.
- **Escala errada:** o tamanho vem de uma **fração do quadro** (28%), não do tamanho real do objeto nem da distância na cena. Uma caixa de
  perfume de 12 cm fica com a altura de um banco.
- **Sem profundidade e sem interação:** o prompt proíbe mãos no produto, e o vídeo trata a caixa como uma camada parada. O relatório da
  Fiel 7 registra que "o cubo desliza atrás da caixa parada", que é a paralaxe falsa de uma colagem.
- **40% de packshot:** é a estrutura do nível com 1 foto, como mostra a tabela acima.

**Por que chegamos aqui (histórico, não é erro de execução):** no QA de 14 e 15/10, quando o Nano Banana via o produto, ele o
**redesenhava** (rostinho no líquido, frasco de outra proporção, texto fantasma, "fantasma" atrás do recorte). A resposta foi esconder o
produto do modelo e colar o original. Isso trocou "integração sem fidelidade" por "fidelidade sem integração". As 7 rodadas Fiel (1 a 7)
otimizaram **onde colar**, mas o defeito está **no método de colar**.

### O que já existe e dá para reaproveitar

- **Nano Banana Pro edit com várias referências** já está integrado (`buildSceneImageInput`, 2K, US$ 0,15).
- **Pessoa segurando o produto:** `lib/ads/v2PresenterHolds.ts` já monta o still com 2 referências (retrato + foto do produto) e o
  movimento "levanta o produto para a câmera e vira de leve para o rótulo pegar a luz" no Kling O3. Está **desligado**
  (`ADS_V2_PRESENTER_HOLDS = false`) porque nunca teve render validado.
- **O ator** (`v2Presenter.ts`, Kling AI Avatar) já gera a foto do ator com o produto como referência.
- **Packshot real e cartão final** com a foto verdadeira já existem: é o lugar certo para o rótulo ser lido 100% fiel.
- **Juiz barato de visão** (`v2LockVision.ts`, ~US$ 0,0003 por imagem 'low') já existe. Dá para trocar a pergunta para "o rótulo é igual?".
- **Seedance 2.0 Fast i2v** já está integrado e é o motor que os líderes usam para produto.

---

## 4. Proposta: o pipeline novo

### Recomendado (A): o modelo compõe a cena com o produto, um juiz confere, e o rótulo é lido no packshot real

1. **Still composto: Bria Product Holding (US$ 0,04; promete o rótulo "as given") ou Nano Banana Pro edit (2K, US$ 0,15). O teste da seção 5 escolhe entre os dois.** Referências: a foto do produto, de preferência a original inteira (e uma 2ª
   foto do produto, se o cliente tiver), mais o cenário. O prompt descreve **uma pessoa segurando ou usando o produto** ("segura a caixa
   na palma, a 30 cm do rosto, no quarto de hotel com chuva na janela, luz da janela"). A **escala vem da mão**: a mão é a régua natural, e
   isso mata o "caixa do tamanho da mesa". Também pede a luz e a sombra da cena. Sem recorte e sem colar nada.
2. **Juiz do rótulo (visão, ~US$ 0,01 em 'high').** Compara o still com a foto original: o nome está legível e igual? As cores e a
   proporção da embalagem batem? Tem elemento inventado? Se divergir, refaz 1 vez (+US$ 0,15). Se divergir de novo, o plano vira um plano
   **sem rótulo visível** (produto de lado ou desfocado na mão) ou a foto real. Nunca vai rótulo errado.
3. **Animar curto e lento: Kling O3 i2v 3 s (já integrado), ou Seedance 1.5/2.0 com o MESMO still como quadro inicial e final, que prende a embalagem nas duas pontas.** Movimento pequeno das mãos, câmera quase parada, sem girar o
   produto (girar é o que deforma o texto). Usar só 2 a 2,5 s do clipe.
4. **O rótulo é lido no plano REAL.** Fecha com o packshot da foto verdadeira (2 s) e o cartão (2,5 s). Nas cenas de gente o produto
   aparece **natural**, e a leitura exata do nome acontece no pixel real.

**Estrutura de 15 s recomendada** (gancho → uso → prova → marca, como no formato UGC/"product in hand" dos líderes):
- 0–2 s **GANCHO** com movimento e gente: a mão abrindo a caixa ou borrifando, já na cena. Nunca o fundo branco.
- 2–4,5 s **USO 1:** a pessoa segura o produto na cena (still composto + i2v).
- 4,5–7 s **USO 2 / EMOÇÃO:** outro ângulo (pulso, perfume na pele, sorriso), com o produto na mão ou na mesa, composto pelo modelo.
- 7–9,5 s **DETALHE:** close do produto **dentro da cena** (composto), com luz da janela.
- 9,5–12,5 s **PACKSHOT REAL** com zoom lento (o rótulo 100% fiel).
- 12,5–15 s **CARTÃO.**
- Packshot e cartão juntos ficam em ~5,5 s (37%), contra 8,5 s hoje. A cena com o produto vira 9,5 s.

**Custo por anúncio de 15 s (Comercial):** 4 stills × US$ 0,15 = 0,60 · ~1 refação = 0,15 · 4 clipes Kling O3 de 3 s × US$ 0,336 = 1,34
· juiz ~0,04 · fixos (voz, música, montagem, GPT) 0,25. Total **≈ US$ 2,40** (≈ US$ 2,75 com uma refação de vídeo). É o mesmo patamar de
hoje (US$ 2,38 no dry-run): **cabe nos 41 cr sem mexer no preço**. Com Seedance 2.0 Fast nos 4 planos, 4 × 4 s × 0,2419 = 3,87, e o total
fica em ≈ US$ 4,90 (estoura o Comercial; só no Cinema).

**Fidelidade do rótulo:** nas cenas de gente fica "parecido e legível", **não pixel a pixel**. Exato só no packshot e no cartão. É a
mesma troca dos líderes, que mostram o produto na mão e leem o rótulo no plano limpo.

**Riscos conhecidos e como contornar:**
- O texto do rótulo deforma no vídeo. Contorno: clipe curto (2–2,5 s usados), câmera lenta, sem girar o produto, rótulo de frente e grande
  o bastante, e a leitura exata no packshot real.
- Rótulo em árabe/latim ("أثيري / ATHEERI") é o pior caso para modelo de imagem. O juiz precisa comparar com a foto, não só ler o texto.
- Mãos com 6 dedos e caixa atravessando os dedos. Contorno: pegada simples (palma por baixo) e o juiz pergunta também pelas mãos.
- O vídeo inventa um segundo produto ou troca o produto. Contorno: manter `ADS_V2_LOCK_NO_NEW_OBJECT`, adaptado para "only this one product".
- **Política da casa:** isto liga um caminho que o QA de 14/10 reprovou (o produto redesenhado). A diferença agora é o juiz com
  refação, a pegada na mão em vez de produto sozinho em close, e o rótulo exato garantido no packshot. Só entra depois do teste da seção 5.

### Alternativa B: ref2v direto (Kling O3 reference-to-video com o produto como element, ou Seedance 2.0 reference-to-video com até 9 fotos)

O mesmo caminho do Creatify (até 9 fotos, 26/09/2026). Um pedido por plano já gera o vídeo com a pessoa e o produto.
- **Prós:** sem still intermediário, movimento mais natural, o produto em 3D (vê vários lados se houver várias fotos).
- **Contras:** sem ponto de aprovação barato antes do vídeo (o erro custa o clipe inteiro). O Kling O3 ref2v custa o mesmo que o i2v (US$ 0,084–0,112/s) e é
  a única família que promete "object details". O Seedance 2.0 ref2v custa US$ 0,30/s em 720p, ~3× o Kling. Com 1 foto só, a fidelidade
  deve cair. O Seedance pode recusar foto de pessoa real como referência (indício de 28/09).

### Alternativa C: manter a colagem, mas como "objeto de primeiro plano honesto"

Produto grande em primeiro plano, desfocando a cena atrás, como um close de estúdio sobre fundo da cena. Sem fingir que está sobre a mesa.
- **Prós:** rótulo 100% fiel em todo quadro, custo atual, quase tudo já existe.
- **Contras:** continua sem interação e sem a pessoa usando o produto. Resolve "parece colado" só em parte e não dá o formato "product in
  hand" que vende.

---

## 5. Um único teste (NÃO rodar sem o "vai" do fundador)

**O que:** 1 cena do Atheeri pelo caminho A, sem montar anúncio. Roda por sonda admin ou chamada manual, na conta da casa
(josephsskaf@gmail.com, sempre com marca d'água).
1. **Dois stills, lado a lado:**
   - **Bria Product Holding.** Entradas: a foto de uma pessoa (uma mulher da biblioteca de apresentadores, ou uma cena do hotel com chuva
     que já foi gerada nas rodadas Fiel, custo zero) e a foto original `atheeri-produto.jpg`. US$ 0,04.
   - **Nano Banana Pro edit, 2K, 9:16.** Referência: a foto original. Prompt: "uma mulher num quarto de hotel com chuva na janela segura
     a caixa do perfume na palma, rótulo de frente para a câmera, a 30–40 cm do rosto, luz da janela, tamanho real de uma caixa de
     perfume, mesma embalagem, mesmo texto, sem outro produto". US$ 0,15.
2. **Juiz.** O fundador olha os dois stills ao lado da foto original (custo zero) e escolhe o melhor.
3. **Animar o still escolhido em dois motores:**
   - Kling O3 Pro i2v, 3 s, sem áudio. Prompt: "a mão inclina levemente a caixa em direção à câmera, câmera quase parada, a caixa
     mantém exatamente a forma, as cores e o texto". US$ 0,34.
   - Seedance 1.5 Pro i2v, 5 s, 720p, com o MESMO still como quadro inicial e final. ≈ US$ 0,26.
4. **Opcional, só se sobrar orçamento:** testar a alternativa B, com Kling O3 Standard ref2v de 5 s e o produto como element. US$ 0,42.

**Custo:** ≈ US$ 0,79 sem o passo opcional e **≈ US$ 1,21 com ele**. Fica dentro do alvo de US$ 3 mesmo com uma refação de still. Antes
de rodar, conferir o saldo da fal (US$ 16,70 em 16/10, às 13:24 UTC).

**Critérios do "olho do espectador"** (o fundador dá nota de 0 a 10 em cada um, e só passa com todos ≥ 7):
1. **Parece filmado, não colagem:** a luz da caixa vem da janela, há sombra e reflexo coerentes, e os dedos passam por cima da caixa.
2. **Escala e luz da cena:** a caixa tem o tamanho de uma caixa de perfume na mão de um adulto.
3. **Interação:** a pessoa segura ou usa o produto, e isso faz sentido.
4. **Rótulo legível e igual ao original:** "ATHEERI", o árabe, a abelha, o favo dourado e as proporções batem com a foto, sem letra
   inventada, nos 2 a 2,5 s usados do clipe.
5. **Daria para postar:** sem 6º dedo, sem segundo produto, sem cara de IA plástica.

**Se passar:** o próximo passo é desenhar o plano "USO com produto na mão" no Comercial no lugar da trava (com o juiz e a refação), e o
gancho deixar de ser a foto no branco. **Se reprovar no rótulo:** testar a alternativa B (ref2v) num teste igual, depois de conferir o
preço na fal.
