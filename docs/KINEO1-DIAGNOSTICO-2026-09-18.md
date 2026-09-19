# KINEO 1 — DIAGNÓSTICO DE QUALIDADE (18/09/2026)

Amostra: **57 filmes** Kineo 1 com nota do juiz (14 dias, 15→19/09), dos quais **29 têm plano de cenas**
(`fast_scene_plan` só existe desde 16/09) = **175 cenas** com fala, busca, origem e tags reais. Cruzado com
`compose_submission_claim` (narração + duração pedida), `videos.credits_used`, `payment_success`,
`video_downloaded`. **10 filmes assistidos** por folha de contato (1 quadro a cada 2,5 s, ffmpeg local):
Boeing 85, Amor 93, Trem de pouso 50, Jovem 50, Sapatos 63, Animais 70, Carros 100, Coelho 100, Windows 88,
Motu-Patlu hindi 50. `film_feedback`: **0 votos** em 30 dias (a régua humana ainda não tem dado).

## 1. Tabela de causas (cena ruim = 1 causa-raiz)

| # | Causa | Cenas | Filmes | % amostra | Créditos | Exemplo real |
|---|---|---|---|---|---|---|
| **5** | **Still enevoado/mole** — `lib/hollywood/anchors.ts` chama `fal-ai/flux/dev` com `num_inference_steps: 4` (receita do *schnell*; o *dev* pede ~28) + prompt "shallow depth of field, muted cinematic grade". Some-se o prompt de "still" pedindo "no real person's face" e entregando rostos de criança (Coelho) e logo do Superman. | **86 de 175 cenas têm still (49%)**; nas 6 folhas com still, **100% dos stills saíram moles** | 6 de 10 vistos | ~49% das cenas | ~US$0,02/still, já pago | `d11c86cb` Carros: 7 stills, 3 são névoa cinza; `e1da7fb4` Coelho: 7 stills moles, rostos de criança + logo Superman; `bc7d98eb` Boeing: silhueta de avião desfocada abre e fecha o filme |
| **6a** | **Narração cortada no filme grátis de 15 s** — o escritor gera 135 palavras (~50 s) e o compose corta em ~20 s: a pessoa ouve meia história | — | **13 de 13** filmes com `duration=15` (14 d), 13 pessoas, todas primeira impressão | 100% da cota grátis | 0 cr (mas é O filme que decide o cadastro) | `b8c3181f` Jovem: pedido 15 s, 177 palavras, MP4 de 22 s termina em "he realizes possibilities are…" |
| **2** | **Busca sem o sujeito da fala** — a query nasce do `visual_prompt`/pack do nicho, não da fala | **99 de 175 (57%)** | 16 de 29 filmes com ≥50% das cenas assim | visual médio **59 vs 71** | 63 cr nesses 16 filmes | `dfd9ccd2` Bezos: fala "Blue Origin em 2000", busca "stock market graph"; `a7a0638c` hindi: 6 cenas, uma só busca "jaipur neighborhood, animated characters" → Camogli, Austrália, Chittagong |
| **4** | **Portão deixou passar tag genérica** (engine/hands/neighborhood/preparation/danger) | ~20 de ~40 cenas de stock vistas nos filmes < 75 (≈50%) | 6 de 10 vistos | — | — | Boeing→carros/moto; Amor→covid/xadrez; Animais→vespa/doberman; Jovem→cafeteira ("preparation"). **Consertado 18/09 04:00 (SUJEITO)**, ainda sem medição |
| **6b** | **Still reciclado**: 7 stills para 44-49 s de filme → cada um aparece 2-3× (corte 4,5 s) | todos os filmes 100% still | 4 | 7 de 57 filmes | — | Carros/Coelho: Ferrari 2×, Bugatti 2×, menina-coelho 3× |
| **1** | **Roteiro diverge do pedido** (texto < 80) | — | **17 de 57 (30%)**; < 60: 7 | — | 55 cr | `33c24d46`: a RECUSA do GPT ("I'm sorry, I can't assist") virou narração e o juiz deu **100**; `df4eb4a4`: roteiro colado de meditação de 4 min reescrito para 35 s (texto 30); 3 filmes nota 0 = pílula sozinha (**já consertado**, isBareStarter) |
| **3** | **Banco não tem o sujeito** (precisava de still e não veio) | 7 cenas vistas | 4 | — | — | mosquito→vespa e mosca; caramujo de água doce→caramujo de jardim; Hiroshima 1945→escavadeira, velas, smartphone |
| **7** | **Pedido impossível para stock** | — | 4 de 57 | 7% | 8 cr | Jordan Bardella (pessoa real, nota 30); "use the provided image as the only source" (nota 25); Motu-Patlu cartoon (Seedance desenhou bem; o stock encheu de cidades italianas) |
| **6c** | Corte seco entre clipes | todos até 18/09 04:00 | — | — | — | **Consertado** (crossfade 0,25 s), validação a olho pendente |

Por língua (narração): en 53 filmes (visual 67) · es 2 (55) · hi 2 (40). Só **1 de 175 buscas** tinha
caractere não-ASCII → a busca no Pixabay **é feita em inglês** (H6 derrubada). Hindi cai por outro motivo:
query única com "animated characters" e stock de cidade genérica.

## 2. Top 5 consertos (filmes afetados × facilidade)

| # | Conserto | Arquivo(s) | Trava 8.2 | Medir em 7 dias | Risco |
|---|---|---|---|---|---|
| **1** | **O filme grátis de 15 s nasce com roteiro de 15 s.** O cliente passa `targetSeconds = ent.maxDurationSeconds` (15 na cota grátis) e o escritor aceita 15 em `SUPPORTED_TARGETS` (régua do motor já existe: 15 s ≈ 42 palavras). A história fecha em vez de ser decapitada. | `app/(dashboard)/generate/GenerateClient.tsx`, `app/api/generate-script/route.ts` (+1 valor), `lib/scriptWriterRate.ts` | **sim** (generate-script) | `select count(*) filter (where (metadata->>'duration')::int=15 and array_length(regexp_split_to_array(metadata->>'narration','\s+'),1) <= 50) from events where name='compose_submission_claim' and created_at > <deploy>` → esperado 100% (hoje 0/13) | Nenhum de preço: o filme continua 15 s |
| **2** | **Still nítido.** `num_inference_steps` 4 → **28** no `flux/dev` (o modelo certo com o passo errado; preço da fal é por megapixel, igual) e tirar "shallow depth of field / muted" do prompt do Kineo 1; trocar "no real person's face" por "no faces" (criança gerada é risco). Janela de 10 s do still comporta (~5 s a 28 passos). | `lib/hollywood/anchors.ts` (parâmetro, compartilhado com as âncoras do Kling 3 — **pode ser a causa das "imagens sem impacto" do Kling 3 também**), `lib/fastAiScene.ts` | não (anchors) / não (fastAiScene) | Sem métrica automática (não há ffmpeg no servidor): 5 renders de prova a olho + `film_feedback`. Latência: `fast_ai_still.log` ok/miss não pode cair de 95% | Latência do still ×4; se estourar a janela, o still cai fora (falha aberta) |
| **3** | **A busca nasce da fala.** Cabeça da query = substantivo concreto da narração (ou entidade da família); ≤4 palavras; nunca a mesma query em 2 cenas; "animated characters"/"cinematic"/adjetivos nunca entram. Hoje: 57% das cenas sem token da fala; nota visual 73 (≤3,5 palavras) vs 53 (>5). | `lib/broll/broll-engine.ts` (prompt do diretor) + guarda em `app/api/generate-video-fast/route.ts` (derivar query da fala quando o plano falha no teste) | **sim** (lib/broll) | H1 (cenas cuja query compartilha token ≥4 com a fala) de 43% → ≥80%; H4 (filmes com query repetida ≥3×) de 9/29 → 0 | Query curta demais esvazia o pool → still (aceitável) |
| **4** | **Juiz honesto** (ver §3): still/Seedance = "provável, não verificado" (não 100 automático); ideia curta desenvolvida NÃO perde ponto (trem de pouso 50 → ~85); recusa do GPT como narração = nota 0 sem GPT (`knownCoherenceCase`); **narração cortada** = flag por aritmética (`palavras/2,6 > duração×1,3`) → teto 40 e problema nomeado. | `lib/fastCoherence.ts`, `lib/admin/fastCoherence.ts` | não | Reavaliar os 57 com `version = k1_coerencia_v4`: Carros/Coelho caem de 100; Trem sobe de 50; os 13 de 15 s ganham "narração cortada" | Nenhum: o juiz não toca o filme |
| **5** | **Pedido impossível avisa antes de cobrar**: pessoa real nomeada + "mostre ela" e "use a imagem como única fonte" ganham o mesmo aviso do cartoon (`kineo1FitNotice`): "o Kineo 1 não mostra pessoas reais / não usa a sua imagem como base; use Seedance/Kling 3 para isso". | `lib/growth/kineo1FitNotice.ts`, `lib/promptGuard.ts` | não | `kineo1_fit_notice_shown` com `reason in ('real_person','image_source')` > 0; filmes nota < 40 por pedido impossível → 0 | Falso positivo em nome de lugar (mitigar: só quando o nome vem com "mostre/show/ele/ela") |

Fora do top 5, barato e certo: **still reciclado** — quando `stills×4,5 s < duração`, o still fica na tela
até 6-7 s (Ken Burns mais lento) em vez de voltar 3× (`lib/compose.ts`, trava 8.2).

## 3. O que o juiz erra e como corrigir

| Erro | Prova | Correção |
|---|---|---|
| **Still = 100 por construção** | Carros e Coelho: visual 100; a olho, stills moles, reciclados, rosto de criança, logo | Origem `aiStill`/`aiClip` vira "provavelmente bate; qualidade não verificada" → teto 90 no visual; painel mostra badge "gerado" |
| **Pune ideia curta desenvolvida** | Trem de pouso: pedido "por que as rodas são inclinadas?" → narração explica exatamente isso, com fatos; juiz deu texto 50 ("informações adicionais não solicitadas") — contradiz a própria regra SHORT IDEA | Reforçar no prompt com o exemplo negativo; e o `request_pt` curto (<12 palavras) força o modo SHORT IDEA |
| **Recusa do GPT virou filme com nota 100** | `33c24d46`: narração "I'm sorry, but I can't assist with that request" ×6 cenas; juiz: texto 100 | `knownCoherenceCase`: narração com padrão de recusa → 0 + problema "o roteirista recusou o pedido"; **e o estruturador deve devolver 422 nesse caso, não um roteiro** |
| **Não vê narração cortada** | 13 filmes de 15 s com ~135 palavras: notas 50-100 | Flag aritmética antes do GPT (claim: palavras × duração) |
| **Não vê borrado, corte seco, logo, rosto** | Boeing (still desfocado) 85; Amor (2 clipes medium borrados) 93 | Limite declarado: o juiz lê o plano. Registrar `rendition` (large/medium) e `source=aiStill` no plano já permite penalizar "medium" por aritmética; o resto só com feedback humano |

## 4. O que NÃO fazer (os dados descartaram)

- **Não** mexer na língua da busca: 174/175 queries em inglês; o problema do hindi é a query genérica, não o idioma.
- **Não** atacar fallbackA/stockLibrary: **1 cena em 175** (H5 derrubada). O reciclo hoje é de *stills*, não de fallback.
- **Não** esticar clipes por cena para cobrir fala longa: 152 cenas com fala > 12 palavras e nenhuma virou fallback.
- **Não** comprar Seedance em todas as cenas: o filme "Sapatos" (Seedance na loja) ainda pegou banco de praça e escada rolante por causa da BUSCA; o gargalo é a query, não o motor.
- **Não** usar a nota do juiz como prova de qualidade de still enquanto a regra "por construção" existir (item 3).
- **Não** concluir sobre pagamento: 0 pagantes novos em 14 dias em qualquer faixa de nota — a amostra não tem poder para isso. O que a nota move (fraco) é o 2º filme: 30% (<60) vs 26% (≥80)… ou seja, **nem isso**: quem faz o 2º filme faz por outro motivo. O que decide é o 1º filme inteiro (cota de 15 s cortada = item 1).

## 5. Fecho para o fundador

✅ **O QUE VOCÊ PRECISA FAZER**
1. Dizer **"vai"** para o conserto 1 (roteiro de 15 s para o filme grátis — toca `generate-script`, trava 8.2). É 13 de 13 primeiras impressões hoje terminando no meio da frase.
2. Dizer **"vai"** para o conserto 3 (busca nasce da fala — toca `lib/broll`, trava 8.2).
3. Decidir se o still nítido (conserto 2) sobe **junto com** a âncora do Kling 3 (mesmo parâmetro, mesmo arquivo) ou só no Kineo 1 primeiro.

📋 **O QUE ACONTECEU**
Assisti 10 filmes e li o rastro de 175 cenas. Os filmes feios têm 3 causas que pesam de verdade: **(1)** as
imagens geradas saem enevoadas porque o gerador roda com 4 passos onde precisa de ~28 — metade das cenas de
todo Kineo 1 passa por isso, e o juiz dá 100 sem olhar; **(2)** o filme grátis de 15 s recebe um roteiro de
50 s e corta a história no meio — todas as 13 pessoas da cota grátis nos últimos 14 dias viram isso;
**(3)** a busca de stock não parte do que a narração diz (57% das cenas), e isso custa 12 pontos de nota
visual. O conserto do "carro no filme de avião" de hoje de madrugada ataca a metade de (3) que era do portão;
a outra metade (a busca em si) está no conserto 3. O juiz precisa de 4 correções para parar de mentir nas duas
direções (100 para slideshow enevoado, 50 para filme de avião bom). Nada disso muda preço, oferta ou crédito.
