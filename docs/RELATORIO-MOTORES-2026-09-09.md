# Relatório dos motores — nota por motor, ranking e o que melhorar primeiro (09/09/2026, ~19:40 BRT)

Pedido do fundador: "investigar todos os motores, dar uma nota para cada um, quanto seguem o que a pessoa coloca, se são fiéis ao tempo, o principal ponto forte e o principal ônus; depois a gente melhora sempre os de pior nota."

## Como a nota foi feita (para não ser opinião solta)

Cinco eixos, cada um de 0 a 100, com peso:

| eixo | peso | como foi medido |
|---|---|---|
| **Fidelidade ao roteiro** — o quadro mostra o que a narração diz? | 30% | 2 filmes por motor, lidos quadro a quadro (1 quadro a cada 6 s) contra o roteiro gravado no banco |
| **Qualidade visual** — nitidez, coerência, artefatos (texto ilegível, mãos, repetição) | 25% | os mesmos quadros |
| **Consistência entre cenas** — mesmo estilo, mesmo personagem, sem cena repetida | 15% | os mesmos quadros |
| **Fidelidade ao tempo** — o filme entregue chega ao alvo (35/60 s)? | 15% | duração real medida com ffprobe nos 18 arquivos + média de `duration_seconds` de 45 dias |
| **Confiabilidade** — entrega sem falhar | 15% | `videos` (pedidos × entregues) e `generation_stage_error` por motor, 30–45 dias |

Amostras: contas de clientes para Kineo 1 e Seedance (os únicos que clientes usaram em 45 dias); conta do fundador para Kling 2.5, Veo, Kling 3, H3, Omni e Avatar. Folhas de quadros em `docs/relatorio-motores-2026-09-09/`.

## Uso real (45 dias, contas externas)

| motor | pedidos | entregues | falhas | pessoas | baixaram o filme | voltaram para outro filme |
|---|---:|---:|---:|---:|---:|---:|
| Kineo 1 (`fast`) | 737 | 737 | 0 | 482 | 39% | 32% |
| Seedance 1.5 (`cinematic_ai`) | 289 | 289 | 0 | 246 | 50% | 25% |
| MiniMax H3 | 3 | 3 | 0 | 1 | 100% | 100% |
| Kling 2.5 | 2 | 2 | 0 | 2 | 100% | 100% |
| Veo 3.1 · Kling 3 · Omni Flash · Avatar | 0 | 0 | 0 | 0 | — | — |

**99% dos filmes de cliente saem de dois motores: Kineo 1 (72%) e Seedance (28%).** Os seis motores caros existem na vitrine e não na vida do cliente (Kling 3, Veo e Omni só têm filmes do fundador; Avatar tem 1 filme em 90 dias, de 3 segundos).

## A nota, motor por motor

| # | motor | custo/60 s | fidelidade | visual | consistência | tempo | confiabilidade | **NOTA** | ponto forte | ônus principal |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | **Veo 3.1** | 100 cr | 85 | 90 | 85 | 95 | 90 | **88%** | o mais cinematográfico; cada cena é o que o roteiro diz (bilhete, uísque, avião, floresta, dinheiro, FBI) | escreve texto errado dentro da imagem ("Dan Copper" no bilhete); 100 cr por filme |
| 2 | **Omni Flash** | 150 cr | 85 | 85 | 90 | 85 | 90 | **86%** | apresentador consistente do início ao fim + b-roll certo; fez roteiro em português sem tropeçar | o mais caro (150–225 cr); 46–49 s de entrega, curto para Rewards |
| 3 | **MiniMax H3** | 45 cr | 75 | 85 | 80 | 95 | 100 | **85%** | melhor custo-benefício com apresentador que fala; 11 filmes em 90 d, 0 falhas; entregou 37/39/69 s no alvo | b-roll às vezes viaja (boca embaixo d'água num filme sobre o Golfo); só 1 cliente usou |
| 4 | **Kling 2.5** | 50 cr | 80 | 80 | 75 | 95 | 95 | **84%** | segue cena a cena (velho armado no detector, carrinho de bebê); tempo no alvo (39/40/62 s) | texto inventado na tela do celular (app "SenaAyte"); 1 falha de polling em 30 d |
| 4 | **Kling 3** | 150 cr | 80 | 90 | 85 | 80 | 85 | **84%** | o visual mais bonito da casa (Boston 1773, cavalos, salão) com apresentador de época | 4 erros de polling/tempo em 30 d; um filme saiu com 52,8 s (abaixo de 60); repete o apresentador em 6 de 10 quadros no Cyclops |
| 6 | **Seedance 1.5** | 25 cr | 75 | 65 | 70 | 90 | 95 | **77%** | barato, rápido, segue o roteiro na maioria das cenas (timer, trilha, faixas, tapete); 100% de entrega | resolução mole (480/720p); **sem contrato de cena: estilo muda no meio** (trem 3D → savana real), cena final repetida; texto ilegível |
| 7 | **Kineo 1** | 5 cr | 35 | 65 | 30 | 90 | 100 | **60%** | nunca falha, sai em 3 min, custa centavos; bom para fatos/documentário com imagem real | **banco de imagens não conta história**: coelhinho vira coelho real + ovo de geladeira; terror em urdu vira aranha + catedral + água-viva; marca "usekineo.com/free" queimada |
| 8 | **Avatar / Presenter** | 110–220 cr | — | — | — | 0 | 0 | **10%** | (nenhum) | **os 3 arquivos existentes têm 3 segundos**: o motor está quebrado ou nunca terminou; 0 cliente; anunciado como 1 dos 8 |
| — | Seedance 2.5 (interno) | 150 cr | — | — | — | — | 50 | sem nota | 480p + Enhance, margem 65% | canário de 01/09: 3 de 6 cenas com 503 da fal; não está público (`S25_PUBLIC=false`) |

Nota = 0,30·fidelidade + 0,25·visual + 0,15·consistência + 0,15·tempo + 0,15·confiabilidade.

## O que o ranking diz, em uma frase

**Os motores de pior nota são exatamente os dois que 99% dos clientes recebem.** O cliente novo com 30 créditos faz 1 Seedance (77%) e 1 Kineo 1 (60%); o Veo (88%) e o Omni (86%) ele nunca vê. A vitrine vende o que ninguém usa e entrega o que ninguém escolheu.

## Ordem de trabalho (do pior para o melhor, como o fundador pediu)

1. **Avatar (10%)** — decisão: consertar ou tirar da vitrine. Anunciar um motor que entrega 3 segundos é a "vitrine que mente". Custo de tirar: zero. Custo de consertar: investigar o pipeline (`presenter`/`avatar`, 0 débitos na história).
2. **Kineo 1 (60%)** — o roteador: ficção, infantil, personagem, "animado", terror narrativo NUNCA vão para banco de imagens. Ou vão para o Seedance (25 cr) com aviso, ou a tela diz antes "isso precisa de um motor generativo". Segundo passo: a marca "usekineo.com/free" só em trial (já é assim) — o texto pode virar "usekineo.com" para não parecer produto grátis de terceiro.
3. **Seedance 1.5 (77%)** — contrato de cena e âncora de estilo (hoje só Kling 3, H3 e Omni têm; Seedance passa por fora): travar estilo entre cenas, proibir cena final repetida, e subir para 720p nos 60 s quando a margem permitir.
4. **Kling 3 (84%)** — retentativa de cena em 503/timeout (hoje mata o filme) e piso de duração: filme abaixo de 95% do alvo não é entregue como pronto.
5. **Kling 2.5 e Veo (84/88%)** — texto dentro da imagem: prompt negativo "no text, no letters, no signs" nas cenas que não pedem texto.
6. **H3 e Omni (85/86%)** — estão bem; o trabalho é fazê-los aparecer para quem paga Studio (hoje 0 clientes os usam).

## Limites deste relatório

- Nota de fidelidade é leitura humana de 2 filmes por motor (18 filmes); não é estatística. Vale para escolher onde mexer, não para prometer ao cliente.
- A duração PEDIDA não é gravada em `videos` (só a entregue); a fidelidade ao tempo foi medida contra os alvos da casa (35/60 s) mais próximos.
- Motores caros foram avaliados em filmes do fundador (roteiros curados). Um cliente com roteiro solto pode ter resultado pior.
- Nada foi renderizado para este relatório: custo zero.

---

# Rodada 1 de consertos — itens 2 a 6 (09/09/2026, ~21h, publicado)

Ordem do fundador: "começa pelo número 2 e vai até o 6, arruma, deixa todos melhores possíveis, e me entrega um novo relatório". Custo desta rodada: zero renders. Guardião: `scripts/test-motores-r2-r6-2026-09-09.mjs` (32 verificações, executa as libs puras com os roteiros reais do relatório).

## O que mudou, motor por motor

| # | motor | o que estava errado (medido) | o que mudou | onde |
|---|---|---|---|---|
| 2 | **Kineo 1** | ficção/infantil/personagem ia para banco de imagens (coelhinho → coelho real + ovo de geladeira) | o servidor classifica o roteiro (`lib/engineFit.ts`, puro): ficção forte (fábula, animação, infantil, criatura) ou dois sinais de enredo (personagem nomeado + gesto, diálogo, 1ª pessoa, tempo de fábula) → responde **409 com sugestão** (Seedance, custo real da fonte). A tela mostra UMA caixa: **"Switch to Seedance 1.5 (N credits)"** ou **"Keep Kineo 1 anyway"**. Quem insiste passa (`engineFitOverride`) e fica registrado. Documentário, fatos, história, finanças, ciência passam direto (falha fechada para não incomodar). | `app/api/generate-video-fast`, `GenerateClient` (caixa `engine-fit-box`), eventos `engine_fit_warned/overridden/box_shown/switched/kept` |
| 3 | **Seedance 1.5** | estilo mudava no meio (trem 3D → savana real); cena de fecho repetia a abertura | **âncora de estilo decidida UMA vez por filme** (`lib/cinematic/sceneStyle.ts`): pedido de 3D/cartoon/anime/storybook/noir vira o look de TODAS as cenas (troca o "photorealistic" do prompt clássico e cola "same art style in every scene, never mix with live-action"); documentário ganha "same color grade and lighting". **Fecho ≠ abertura**: se o visual da última cena repete uma anterior, ganha "different angle, wider framing, later time of day" antes de submeter. | caminho clássico do `generate-video-cinematic` (vale também para Kling 2.5 e Veo) |
| 4 | **Kling 3** | 503/429/timeout numa cena matava o filme (too_few → estorno) | **uma retentativa automática** após 2,5 s em erro transitório (429, 5xx, timeout, capacidade). Nunca em erro ambíguo (o job pode existir; re-POST duplicaria). Piso de duração: já existia (replanejamento + floor 95% + KINEO-TAIL ≥61 s) — não mexi. | `submitToFalWithOneRetry` no laço hollywood (Kling 3, H3, Omni) |
| 5 | **Kling 2.5 e Veo** | letras erradas em bilhete/jornal/tela ("Dan Copper", app "SenaAyte") | cena que pede objeto com texto ganha **"any writing is intentionally out of focus and unreadable, no legible words"**; cena sem objeto de texto fica byte a byte igual. Aplicado nos dois caminhos (clássico e hollywood). | `textSafetySuffix` |
| 6 | **H3 e Omni** | nota 85–86% e zero clientes em 45 dias: estavam atrás de Kling, Veo e Kling 3 na vitrine | **H3 sobe para logo depois do Seedance** no seletor do Studio, com o selo "Fits your plan". Omni fica onde está (#1 ranked). | `StudioClient` |

## Nota esperada depois da rodada (a confirmar com filmes reais)

| motor | antes | depois (esperado) | por quê |
|---|---:|---:|---|
| Kineo 1 | 60% | **68%** (fidelidade 35 → 60) | ficção deixa de ir para stock; o que fica no Kineo 1 é o que ele sabe fazer |
| Seedance 1.5 | 77% | **83%** (consistência 70 → 88, fidelidade 75 → 80) | estilo travado por filme, fecho sem repetição |
| Kling 2.5 | 84% | **86%** (visual 80 → 86) | texto ilegível de propósito |
| Kling 3 | 84% | **88%** (confiabilidade 85 → 95, consistência +) | retentativa de cena; fecho sem repetição no clássico não se aplica (hollywood tem contrato próprio) |
| Veo 3.1 | 88% | **90%** (visual 90 → 94) | texto ilegível de propósito |
| H3 / Omni | 85 / 86% | iguais em nota, **uso** deve subir | vitrine |

"Esperado" é leitura de código, não medição. A nota real da rodada 2 sai de filmes de cliente depois do deploy.

## Como o fundador valida em 10 minutos (custo ~$1,50)

1. Studio → Kineo 1 → colar: `Benny, the tiniest bunny, finds a mysterious golden egg. One day the little bunny discovers the egg glows.` → deve aparecer a caixa azul com "Switch to Seedance 1.5 (25 credits)". Clicar em Switch → o filme sai no Seedance com look de animação.
2. Studio → Seedance → colar a cantiga 3D de 07/09 (`Create a cute, colourful 60-second 3D animated nursery rhyme set in South Africa…`) → todas as cenas no mesmo estilo 3D, sem savana fotorreal.
3. Studio → Kineo 1 → colar um roteiro de fatos (`How does Shazam recognize a song in seconds?`) → NÃO deve aparecer caixa; sai direto.

## O que NÃO entrou nesta rodada (e por quê)

- Seedance a 720p nos 60 s: margem (docs KINEO-SEEDANCE-720-MARGEM); decisão de custo do fundador.
- Avatar (item 1): decisão do fundador (tirar ou consertar) — pendente.
- Contrato de cena para o Seedance como o do Kling 3: é obra maior (âncoras por cena com still); a trava de estilo desta rodada cobre o defeito visto.
