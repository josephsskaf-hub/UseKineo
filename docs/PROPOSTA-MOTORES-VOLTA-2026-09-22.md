# PROPOSTA — O QUE FALTA EM CADA MOTOR E QUAL VOLTA ESTA SEMANA (22/09/2026)

Pedido do fundador (21/09, noite): "pegar todos os nossos motores e ver o que está faltando em cada um… tem alguns
que a gente colocou sob manutenção… ver o que você já consegue melhorar para talvez trazer um de volta essa semana
com 75-80% de coerência e visualmente bom. Me traz uma resposta e uma proposta amanhã."

Complementa (não repete) docs/MOTORES-ESTADO-E-PLANO-2026-09-21.md (placar de 30 d, defeitos por motor, blocos A-E).
Aqui entra o que aquele doc não tinha: **por que os três pausados morrem**, o **juiz rodado nos filmes hollywood**, as
**folhas de contato** dos últimos renders e a **escolha** de qual volta.

## 1. O que o rastro mostra sobre os três pausados (H3, Omni, S25)

Achado central — **os pausados não morrem na qualidade, morrem no COMPOSE, e ninguém grava o motivo**:

| Render (fundador) | Despacho na fal | O que aconteceu depois | Motivo gravado |
|---|---|---|---|
| H3 15/09 18:47 | 7/7 aceitas | `compose_submission_claim` pending → **falhou 38 s depois** | `no_detail:unreported_stage_failure` |
| H3 15/09 19:29 | 7/7 aceitas | idem, **falhou 47 s depois** | `no_detail` |
| Omni 16/09 04:31 | **11/11 aceitas** | claim pending → **falhou 40 s depois** | `no_detail` |
| Omni 16/09 04:48 | 6/11 (5 rejeitadas, fallback Kling v3) | claim released | saldo da fal |
| S25 16/09 00:07 | 7/7 aceitas | `fal_poll_retries_exhausted` **http 503** no polling | capacidade da fal |
| Kling 3 15/09 22:28 (mesma estrada) | 7/7 | compose done em 5 min → filme 60 s | — |

Em 30 dias existem **637 `compose_submission_claim` e 137 `compose_refused`, e ZERO evento de falha do compose**:
o `app/api/compose/route.ts` não tem catch geral que grave a exceção — quando a montagem hollywood estoura (Whisper
por cena de fala, `assertCinematicTimeline`, Lyria, Creatomate), o cliente vê `stage=failed` sem texto e o ledger
sintetiza `unreported_stage_failure`. **Kling 3 passa pela mesma estrada e monta**; H3 e Omni não. A diferença está
nos clipes (H3 768p com áudio nativo mudo; Omni i2v) — mas sem o erro gravado é chute. Os logs da Vercel de 15-16/09
já expiraram.

O que isso muda no plano: a primeira ação de QUALQUER volta é barata e é a mesma para os três — **gravar o erro do
compose** (evento `compose_failed` com estágio + mensagem + generation_id, dentro do catch que hoje não existe) e
rodar UM render de 35 s por motor. Sem isso, cada tentativa de "melhorar o H3" é às cegas.

## 2. O juiz nos filmes hollywood (rodado hoje, conta do fundador, 30 d)

O juiz cobre a estrada hollywood (evidência = `cinematic_dispatch_result`), só que o painel exclui a conta do
fundador — e 100% dos filmes de Kling 3/H3/Omni/S25 são dele. Rodando pelo `/api/admin/person-media`:

| Filme | Motor | Nota (texto/visual) | Problema nº 1 |
|---|---|---|---|
| 07252598 (17/09, 83 s) | Kling 3 | **70** (80/60) | "jarras de cobre em vez de jarros de óleo e vinho" — folha de contato: a mesma sala submarina 8 quadros, 4 veleiros idênticos |
| d6d73a90 (15/09, 60 s) | Kling 3 | **65** (70/60) | "data da gravação não é mencionada" |
| 604afd43 (14/09, 65 s) | H3 | sem nota (evidência antiga) | Board: 12 s de retrato parado na abertura, onda sem escala, 3 rostos para o mesmo sobrevivente |
| 8df84efb (11/09, 40 s p/ 60) | Omni | sem nota | planejador escreveu 96 palavras (consertado 14/09, não comprovado em vídeo) — visual ON-TOPIC: vulcão, cientistas, balões, drone |

Leitura honesta: **nenhum motor da estrada hollywood tem hoje um filme ≥ 75**. O Kling 3, que está no ar a 150 cr,
faz 65-70. Os pausados nem chegam ao fim.

## 3. O que falta em cada motor (com o que já dá para fazer)

| Motor | Estado | O que falta | Dá para fazer esta semana? |
|---|---|---|---|
| **Kineo 1** (5 cr) | no ar, 74 média, 57% ≥ 75 | visual 49 → medir consertos de 18-21/09 (sujeito, nitidez, modo desenhado, fr/de/it); TypeError ×15 | sim — medição com corte no deploy, sem render pago |
| **Seedance 1.5** (25 cr) | no ar, 73,6 média, 62% ≥ 75 | visual 59: livro de estado (19/09) e sem-letras (21/09) ainda sem medição; título ≠ filme (2 casos) | sim — medição + trava do título |
| **Veo 3.1** (100 cr) | no ar, **94** (5 filmes) | ninguém usa (preço); 1 cena 16:9 no ep. 2 | decisão de produto (Veo 35 s), não engenharia |
| **Kling 2.5** (50 cr) | no ar, 61 média (5), 1 filme 85 (16/09 pós-âncora) | amostra pequena; texto 40 num filme (tema errado) | sim — 1 render de prova a 50 cr depois da trava do título |
| **Kling 3** (150 cr) | no ar, 65-70 | imagens repetidas (8 quadros iguais), ainda sem prova do conserto de 17/09 (69bfb44d, "a imagem abre o prompt") | sim — 1 render 35 s (~$6) |
| **MiniMax H3** (45 cr) | PAUSADO | morre no compose sem motivo gravado; visual: abertura parada, identidade varia; fidelidade (branch codex/fidelidade-0914) já foi parcialmente absorvida (lib/hollywood/fidelidade.ts está na main) | **sim, é o candidato** — ver §4 |
| **Omni Flash** (150 cr) | PAUSADO | morre no compose sem motivo gravado; quando montou (11/09) o visual era o mais on-topic da estrada; 150 cr com 0 clientes | depois do H3 — mesmo conserto de compose, preço é problema de produto |
| **Seedance 2.5** (150 cr) | fechado (S25_PUBLIC=false) | 503 da fal no polling (capacidade, 2 canários); cena que falha mata o filme (sem retentar a cena); 480p+Enhance | não esta semana — depende de capacidade do fornecedor, não de código nosso |
| **Avatar** | invisível | 0 débitos na história, ausente dos seletores | decisão: card ou tirar da lista |

## 4. Proposta: trazer o **MiniMax H3** de volta esta semana

Por quê o H3 e não o Omni: (a) é o único pausado com **cliente pago** na história (3 pessoas, 2 pagantes, 45 cr —
cabe num Starter de 60 cr; Omni/S25 a 150 cr não cabem em plano nenhum abaixo do Studio); (b) custo de fornecedor
US$ 0,06/s em 768p = **US$ 3,90 por filme de 65 s** contra US$ 8-9 do Omni — cada render de prova custa metade;
(c) o defeito visual do H3 já tem conserto escrito e em parte publicado (fidelidade: ficha do personagem verbatim,
ação central no prompt, "a imagem abre o prompt"); (d) o dry-run do H3 é PASS em EN e PT desde 14/09.

Meta do fundador traduzida em número: **juiz ≥ 75 em 3 filmes de 35-60 s seguidos** (texto ≥ 80, visual ≥ 70) +
folha de contato sem quadro repetido e sem rosto trocado no mesmo personagem. Só aí o `enginePaused('h3')` sai.

Sequência (ordem = dependência; custo total de renders ≈ US$ 12-16, 3-4 renders):

1. **Compose grava o motivo** (`compose_failed` + `stage`, mensagem, generation_id, quality) — 1 commit em
   `app/api/compose/route.ts` (fora da trava 8.2), guardião de mutação. Vale para os 8 motores: hoje 0 falhas de
   compose têm nome. Sem render.
2. **Render H3 nº 1 (35 s, ~US$ 2,50, conta do fundador, dry-run antes)** — o objetivo é ler o erro, não o filme.
   Se montar: juiz + folha de contato. Se não montar: o evento diz onde, e o conserto é dirigido.
3. **Conserto dirigido** (o que o erro mandar; hipóteses ordenadas pelo tempo de 40 s até a falha: Whisper nas cenas
   de fala com áudio nativo mudo do H3 → `assertCinematicTimeline` recusando a soma dos clipes 768p → clipe da fal
   com URL que o Creatomate recusa). Toca `lib/hollywood/` ou `lib/compose` só com "vai" — trava 8.2.
4. **Visual**: no mesmo commit, para o H3, (a) abertura nunca é retrato parado — cena 1 começa na AÇÃO da história
   (regra já existe para o Kling 3 em 69bfb44d, estender ao H3); (b) ficha do personagem verbatim em toda cena com
   pessoa (fidelidade.ts, já na main — conferir que a rota chama para a família h3); (c) `prompt_expansion_mode:
   disabled` (16/09) validado na nota visual.
5. **Renders nº 2 e nº 3 (60 s)** com dois roteiros diferentes (um história, um documentário). Critério de saída:
   3 notas ≥ 75. Despausa + copy de vitrine honesta ("768p, voz própria") — sem selo "#1"/"novo".
6. Omni entra na fila DEPOIS com o mesmo compose instrumentado; S25 fica fechado até a fal parar de dar 503.

O que eu faço sozinho (autorização permanente): 1, 2 (dry-run + 1 render de 35 s na sua conta), medições, guardiões,
docs. O que depende de você: "vai" para tocar `lib/hollywood`/`lib/compose` no passo 3-4; os renders de 60 s do
passo 5 (2 × 45 cr); e a decisão de despausar quando os 3 números estiverem na mesa.

## 5. O que NÃO está nesta proposta
- Preço (congelado até 09/10). Omni/S25 a 150 cr sem cliente é problema de preço/plano, não de motor.
- Seedance 2.5: bloqueio é capacidade do fornecedor (503); a dívida "retentar a cena que falhou" vale para todos os
  hollywood e entra no passo 3 se o erro do compose apontar para lá.
- Kineo 1 e Seedance 1.5 continuam sendo onde o dinheiro está (8 dos 8 pagantes de 30 d): as medições dos consertos
  de 18-21/09 correm em paralelo, com corte no deploy, sem render pago.
