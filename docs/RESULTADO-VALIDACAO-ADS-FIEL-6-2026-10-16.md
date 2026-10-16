# Resultado da validação paga: Ads Fiel 6 (KINEO-ADS-FIEL-6-1610), só o T1

Rodado em 16/10/2026, das 11:48 às 11:58 UTC (08:48 às 08:58 BRT). Só o T1 do `docs/PLANO-VALIDACAO-ADS-FIEL-6-1610.md` (em
origin/main). Produção em `main 6589b8f4d` (deploy `dpl_FN4BFgJ6ibPqUw6tToDJ2q1JPRVe`), com `ADS_V2_PRODUCT_LOCK_MODE = 'internal'`.
Não mudei código, não publiquei e não mexi na trava.

**Conta usada: josephsskaf@gmail.com** (já logada no Chrome, sem senha digitada). Pedido **`96fbb38f-9b4a-450e-9567-7ff7cf096389`**,
vídeo `d4161853-ac58-4959-9d7d-a1d341cd5019`.

**Vídeo entregue:**
https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/adsv2-96fbb38f-9b4a-450e-9567-7ff7cf096389-9e4720e7-5239-44bb-814a-52768e502d61.mp4

## Veredito: REPROVADO. Melhorou muito em relação à Fiel 5, mas o produto boia numa cena

O anúncio **não é mais o slideshow da caixa**: 2 das 3 cenas de gente chegaram ao vídeo com o produto colado no canto direito, e nenhum
rosto foi coberto. Os consertos A e B da Fiel 6 funcionaram: nenhuma resposta 0,637 e o `corner_person_sem_caixa` segurou as duas cenas
que a Fiel 5 teria jogado fora.

O plano manda reprovar se o produto boiar, e foi o que aconteceu:

1. **Cena 4 (homem, direita): o produto boia no ar.** A conferência respondeu borda `0.675`. A borda passou nos filtros (não é redonda,
   não foi copiada nem repetida), e a base foi para o tampo (`base_source = tabletop`, `top_edge_y 0.6764`, base 0,6814). O tampo do
   cubo de madeira, medido à mão no `-lock.png`, começa em **~0,715** (borda de trás) e vai até **~0,78** (borda da frente). O fundo da
   caixa ficou em 0,681, então ela flutua de 3 a 10 pontos acima do cubo, contra o chão e as janelas. É o defeito "boia sobre vão" do
   critério. Ver `fiel6-T1-cena4-homem-produto-boiando.jpg` e `fiel6-T1-p4-base-zoom.jpg`.
2. **Cena 3 (esquerda) caiu para a foto do produto, e o canto estava vazio nas duas imagens.** As duas tentativas foram descartadas com
   `face_in_rect`. Olhei as duas imagens que o Nano Banana gerou (baixadas do histórico da fal): nas duas, o casal está no lado
   **direito** do quadro e o canto esquerdo de baixo está livre (balcão e banco). As caixas de rosto que a conferência devolveu não
   batem com a imagem:
   - na 1ª tentativa, rostos em x 0,388–0,469 e 0,569–0,646. Os rostos reais estão em x ~0,67 e ~0,78;
   - na 2ª tentativa, **duas caixas idênticas**, 0,388–0,612 × 0,388–0,612 (centro ± 0,112), o que é um chute, não uma medida.

   Essas caixas passaram como "confiáveis" porque não são redondas, não são números da pergunta e não se repetem entre cenas (a regra
   compara cena com cena, não caixa com caixa dentro da mesma resposta). O limite global não entrou: só 1 de 3 cenas seria descartada.

Nenhum rosto coberto, nada inventado nas mãos, as frases ficaram legíveis, 15,0 s. Mas um anúncio de perfume com a caixa voando ao lado
de uma pessoa não vai para cliente.

## Critério × resultado

| Critério (plano) | Resultado | |
|---|---|---|
| Saldo da fal ≥ US$ 10 antes | US$ 12,06 (11:49 UTC) | ✅ |
| Dry-run de US$ 0 antes | 41 cr, US$ 2,38, 15 s, `charged:false`, 6 planos (5 de IA, 3 imagens de cena) | ✅ |
| Parâmetros | foto `atheeri-produto.jpg`, "Perfume Atheeri", "num hotel com chuva", Automático, Comercial, 15 s, 9:16, PT, Um produto. A tela sugeriu "Close do produto" sozinha (`plan_served` com `style: product_closeup`) e eu troquei para Automático antes do plano final (`style: null`). Kit da marca "My brand" não usado (a tela decidiu sozinha), igual à Fiel 5 | ✅ |
| Um pedido pago só | 1 `ads_v2_started` (41 cr; gmail 217 → 176) | ✅ |
| 3 cenas de gente como `ads_v2_product_locked` (`source = 'reserved'`) | **2 de 3** (idx 2 e 4). O idx 3 virou `product_photo` | ❌ |
| Nenhuma `product_photo` com `lock_corner_busy` quando o canto está vazio | idx 3: `lock_corner_busy` / `face_in_rect` nas 2 tentativas, e o canto estava **vazio** nas duas imagens | ❌ |
| Lado direita · esquerda · direita | direita (2) ✅ · esquerda (3) não chegou ao vídeo · direita (4) ✅ | ⚠ |
| `check.corner` = `null` ou `corner_person_sem_caixa` nos cantos vazios | idx 2 e 4: `corner_person_sem_caixa` (com `corner_person: true`). O conserto B funcionou nas duas | ✅ |
| `face_in_rect`/`body_in_rect` só onde há gente de verdade no canto | idx 3: `face_in_rect` com o canto vazio (caixas de rosto inventadas, ver acima) | ❌ |
| Nenhuma resposta `top_edge_raw` = 0,637 | respostas: 0,5 · 0,675 · 0,52 · 0,5. Nenhuma 0,637 | ✅ |
| Borda copiada/repetida → base fixa | idx 2: 0,5 → `top_edge_why = 'copied'`, base fixa 0,85 | ✅ |
| `base_source = 'tabletop'` com base até ~1 ponto abaixo da borda medida | idx 4: base 0,6814; tampo medido à mão em ~0,715–0,78. A base ficou **3 a 10 pontos ACIMA** do tampo: o produto boia | ❌ |
| Produto no tampo ou na base fixa sem boiar | idx 2: apoiado no tampo do móvel (o frasco passa um pouco da borda da frente, mas não boia). idx 4: **boia** | ❌ |
| `conferencia_suspeita` | nenhuma (só 1 de 3 seria descartada, abaixo do limite) | — |
| Nenhum rosto coberto | idx 2: rosto da mulher em x ~0,23–0,34, produto em x 0,50–0,84. idx 4: rosto do homem em x ~0,03–0,21. Nenhum coberto | ✅ |
| Nada inventado nas mãos | nada | ✅ |
| Lado direito termina em x ≤ 0,84 · teto 28% · nada no terço de cima | retângulo x 0,50–0,8398, altura 0,264; idx 4 começa em y 0,417 | ✅ |
| Frases na zona segura | "Perfume Atheeri - Fragrâncias únicas" (2 linhas, ~75% da altura, sobre a caixa); "Descubra seu aroma ideal" (1 linha, no alto, ~20%, nas cenas de gente). Legíveis | ✅ |
| MP4 ≤ 15,5 s · cartão ≤ 3 s | 15,00 s, 1080×1920 · cartão 2,5 s, "Perfume Atheeri" sem contato | ✅ |
| Motor | Kling O3; desta vez nenhum `stuck:shot_stuck` | ✅ |
| `generation_stage_error` / `ads_v2_failed` | nenhum | ✅ |
| Entrega | `delivered` em 5,7 min. Voz 28 palavras, 13,68 s, `resynth 0` | ✅ |
| Nota do juiz de coerência | **não existe** para Studio Ads: nenhum evento de juiz para o pedido (o juiz de coerência só cobre os filmes) | — |

### Caixas devolvidas pela conferência × imagem (medido à mão)

| Cena | Lado | Tentativa | Borda crua | Rostos da conferência (x) | Rostos reais (x) | Canto pedido | Decisão |
|---|---|---|---|---|---|---|---|
| 2 | direita | 1 | 0,5 (copiada) | 0,388–0,487 | ~0,23–0,34 | vazio (móvel baixo) | travada, base fixa 0,85 ✅ |
| 3 | esquerda | 1 | 0,52 | 0,388–0,469 · 0,569–0,646 | ~0,64–0,70 · ~0,74–0,82 | **vazio** (balcão/banco) | refeita (`face_in_rect`) ❌ |
| 3 | esquerda | 2 | 0,5 | 0,388–0,612 **duas vezes, idênticas** | ~0,74 · ~0,84 | **vazio** (banco) | foto do produto ❌ |
| 4 | direita | 1 | 0,675 | 0,367–0,433 | ~0,03–0,21 | vazio (cubo) | travada, base no "tampo" 0,6814, tampo real ~0,715 ❌ |

Os rostos da conferência erram de lugar em **todas** as 4 respostas, não só nas descartadas. O `x0 = 0,388` aparece em 3 das 4.
A conferência devolve um formato plausível, mas a posição é chute.

### Linha do tempo dos eventos (UTC)

| Hora | Evento | Cena (idx) | O que disse |
|---|---|---|---|
| 11:48:58 | `ads_v2_order_created` | — | 41 cr, 15 s |
| 11:49:10 | `ads_v2_plan_served` | — | style `product_closeup` (sugestão da tela) |
| 11:49:33 | `ads_v2_plan_served` | — | style `null` (Automático), 6 planos, 3 cenas, US$ 2,38 |
| 11:50:16 / 11:50:20 | `ads_v2_dry_run_served` | — | 41 cr, US$ 2,38, `charged:false` |
| 11:50:40 | `ads_v2_started` | — | 41 cr, 6 planos |
| 11:51:28 | `ads_v2_shot_fallback` → `scene_retry` | 3 (esquerda) | `lock_dup_retry:corner`, `face_in_rect`, people 2, borda 0,52 |
| 11:51:50 | `ads_v2_product_locked` | 2 (direita) | `corner_person_sem_caixa`, borda 0,5 `copied` → base fixa 0,85 |
| 11:51:58 | `ads_v2_product_locked` | 4 (direita) | `corner_person_sem_caixa`, borda 0,675 → tampo 0,6764, base 0,6814 |
| 11:52:15 | `ads_v2_shot_fallback` → `product_photo` | 3 | `lock_corner_busy`, `face_in_rect`, borda 0,5 |
| 11:55:48 | `ads_v2_assembling` | — | 6 planos, voz 13,68 s, cartão 2,5 s |
| 11:56:21 | `ads_v2_delivered` | — | 5,7 min, 15 s |

## Custos

| | Valor |
|---|---|
| Créditos | **41** debitados (gmail: 217 → 176), sem estorno (pedido "entregue"). Dentro do teto de 41 |
| fal antes (11:49 UTC) | US$ 12,06 |
| fal depois (11:58 UTC) | **US$ 9,75** |
| Gasto visto na fal | **US$ 2,31** (previsto ~US$ 2,40 + ~US$ 0,15 da cena refeita). O painel atrasa até 1 h e soma o uso de clientes no mesmo intervalo |

**O saldo da fal ficou abaixo de US$ 10.** Outro reteste de ~US$ 2,50 ainda cabe, mas sobra pouco para os clientes. Recarga mínima
sugerida antes do próximo render da casa: US$ 10.

## Quadros e vídeo (`C:\kineo-wt\prints-1610\`)

- **Vídeo:** `fiel6-T1.mp4`
- **Vídeo inteiro, 1 quadro por segundo:** `fiel6-T1-quadros.jpg` (4 por segundo: `fiel6-T1-quadros-4fps.jpg`)
- Quadros soltos do vídeo:
  - `fiel6-T1-abertura.jpg`
  - `fiel6-T1-cena2-mulher-direita.jpg`: produto apoiado no móvel, rosto livre
  - `fiel6-T1-cena3-foto-do-produto.jpg`: a cena de gente que virou foto
  - `fiel6-T1-cena4-homem-produto-boiando.jpg` e `fiel6-T1-cena4b.jpg`: **o produto no ar**
  - `fiel6-T1-visual-final.jpg`
  - `fiel6-T1-cartao.jpg`
- Quadros travados (`-lock.png` reduzidos):
  - `fiel6-T1-p2-lock.jpg`, `fiel6-T1-p4-lock.jpg`
  - com caixas (vermelho = rosto da conferência, amarelo = corpo, verde = retângulo do produto): `fiel6-T1-p2-lock-caixas.jpg`, `fiel6-T1-p4-lock-caixas.jpg`
  - zoom da base: `fiel6-T1-p2-base-zoom.jpg` (no tampo), `fiel6-T1-p4-base-zoom.jpg` (boiando)
- **Cena 3 recusada nas 2 tentativas**, com as caixas da conferência e o retângulo esquerdo aproximado:
  `fiel6-T1-p3-recusadas-lado-a-lado.jpg` (soltas: `fiel6-T1-p3-t1-recusada-caixas.jpg`, `fiel6-T1-p3-t2-recusada-caixas.jpg`)
- Brutos (PNG de 1080×1920, JSON de conferência e de trava, imagens da cena 3 tiradas do histórico da fal): `fiel6-raw\`

## Serve como DEMO para a agência Universo (Gabi Perfumes, Atheeri)?

**Não do jeito que está.** A cena 2 (mulher no hotel com chuva, caixa sobre o móvel) é a melhor imagem de Atheeri que já saiu, mas a
cena 4 com a caixa voando estraga o vídeo para quem é do ramo. A melhor demo inteira continua sendo a `fiel4-T1.mp4` (pedido 08ef80e5).

## O que falta (para o Codex ou a próxima sessão, sem render)

1. **Base no tampo: parar de confiar na borda da conferência.** A 0,675 da cena 4 passou em todos os filtros e estava 4 a 10 pontos
   acima do tampo real. Saídas, da mais barata para a mais cara:
   - (a) desligar o `tabletop` e usar sempre a base fixa (85%). Na Fiel 4 e na cena 2 de hoje, a base fixa não cobriu rosto nem boiou
     sobre o vão. No pior caso, o frasco fica na frente do móvel, que é o defeito menor;
   - (b) só aceitar o `tabletop` quando a borda ficar **abaixo** da base fixa menos um teto (por exemplo, borda ≥ 0,80). Borda alta
     demais quer dizer produto no meio do quadro, e é aí que ele boia;
   - (c) medir a borda por pixel (mudança de luminância/gradiente vertical dentro do retângulo). É mais trabalho, mas é a única medida
     que não é chute.

   Minha recomendação: (a) agora, e (c) quando houver tempo.
2. **Caixas de rosto: tratar como chute o que é chute.** Desconfiar quando:
   - a mesma caixa aparece duas vezes na mesma resposta (2ª tentativa da cena 3);
   - a caixa é simétrica em torno de 0,5 (0,388/0,612);
   - o mesmo `x0` se repete em respostas de cenas diferentes (0,388 em 3 de 4).

   Com as caixas de rosto e de corpo tidas como não confiáveis, a cena 3 teria ficado como `corner_person_sem_caixa`, igual às cenas 2 e 4.
3. Depois do conserto, repetir **só o T1** (41 cr, ~US$ 2,40). Saldo da fal agora: US$ 9,75.

## Virada para `'all'`?

**Não recomendo abrir a trava para `'all'` ainda.** Um cliente receberia hoje um anúncio com 1 cena de gente a menos e uma cena com o
produto boiando, pagando 41 cr. A decisão é do fundador. A trava continua `'internal'`.

## Lembretes

- **Do fundador:**
  - decidir entre o conserto 1(a) (base fixa sempre) ou 1(c) (medir por pixel);
  - fal em US$ 9,75: recarregar ao menos US$ 10 antes do próximo reteste;
  - não mandar este vídeo para o Pedro. Se for mandar algo, que seja o `fiel4-T1.mp4`, ou só o quadro da cena 2 de hoje como amostra de cena.
- **Prometido por nós:** a demo da Universo vence em 21/10 e precisa de um Atheeri com cena de hotel e gente, sem defeito visível.
