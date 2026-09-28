# Especificação do anúncio v2 (Studio Ads) — 28/09/2026

Fonte única para a construção. Decisões do fundador em docs/DECISIONS.md (28/09: preço igual ao Higgsfield; os 5 motores passaram; o motor por nível fica com o CEO-executor). Receita em docs/RECEITA-ANUNCIO-V2-2026-09-28.md. Teste de motores em C:/kineo/docs/teste-motores-2026-09-28/ (15 vídeos + RELATORIO.md).

## 1. O que o cliente compra

Um anúncio vertical 9:16 de 15 s feito com as fotos REAIS do negócio dele, que ganham movimento. Ordem fixa dos planos: GANCHO → DESEJO → USO E EMOÇÃO → LUGAR/PRODUTO → CARTÃO FINAL com o logo real. Música instrumental, narração curta ligada por padrão (botão para desligar), 2 ou 3 frases desenhadas na tela, SEM legenda palavra por palavra.

| Nível | Créditos (15 s) | O que entra |
|---|---|---|
| Foto em movimento (`photo_motion`) | 34 | 6 planos, todos a partir das fotos do cliente |
| Comercial (`commercial`) | 41 | 6 planos: 3 das fotos do cliente + 3 cenas de gente comum usando/curtindo, criadas a partir das fotos do cliente (Nano Banana Pro edit, com as fotos como referência) |
| Cinema (`cinema`) | 51 | 7 planos (16,5 s): o Comercial + 2 closes-herói de produto/comida no Seedance 2.0 Fast + 1 cena criada a mais |

O preço cobre UMA geração. Refazer um plano é cobrado à parte, com o valor mostrado ANTES do clique: 5 cr por plano (Kling O3/H3) e 12 cr por plano-herói (Seedance 2.0). Esses valores de refação são provisórios até o fundador confirmar na virada pública. Falha nossa (recusa do fornecedor, plano preso, 503) é refeita 1 vez sozinha e sem cobrar.

## 2. Motor por tipo de plano (decidido pelo CEO-executor em 28/09)

Base: notas do fundador (10 em todos, velocidade normal) + leitura quadro a quadro com revisor cético (workflow wf_bfe5c2f2-fe7). A leitura de perto achou defeitos que matam anúncio e decidem a rota:

| Foto do teste | Melhor | Notas técnicas (0-10) | Defeitos que matam |
|---|---|---|---|
| Prato (comida) | Seedance 2.0 8,5 · H3 8,0 | Kling O3 6,5 (sem vapor, mindinho de borracha) · Seedance 1.5 5,5 · Veo 5,0 (não aproxima) | nenhum letal |
| Salão com gente | Kling O3 8,0 | H3 7,0 (larga o prato) · Seedance 2.0 7,0 · Veo 6,5 · Seedance 1.5 3,5 | Seedance 1.5: duas taças se mexem sozinhas |
| Tela de app (texto) | Kling O3 7,5 (único aproveitável) | Seedance 1.5 3 · Veo 2 · H3 1,5 · Seedance 2.0 1 | Seedance 2.0 trocou o PREÇO de $9.90 para $9.30; Seedance 1.5 trocou "US$19.90" por "USS19.90"; Veo inventou um logo; H3 ondula a página |

Rota por tipo de plano (`shotKind`):

| shotKind | Motor | Duração gerada | Custo fal |
|---|---|---|---|
| `people` (gente, mãos, rostos) | Kling O3 Pro i2v, sem áudio | 3 s | US$ 0,336 |
| `place` (salão, fachada, imóvel, loja) | Kling O3 Pro i2v, sem áudio | 3 s | US$ 0,336 |
| `product` (comida, produto, detalhe) | Kling O3 Pro i2v, sem áudio | 3 s | US$ 0,336 |
| `product_hero` (só no Cinema) | Seedance 2.0 Fast i2v 720p, 9:16 | 4 s | US$ 0,968 |
| `text` (tela de app, cardápio com preço, placa, documento) | NENHUMA IA: a foto parada entra com zoom lento feito pelo montador | 0 | US$ 0 |

Reserva automática quando o motor principal falha 2 vezes (503, recusa, preso): MiniMax H3 i2v 768P, 5 s, `prompt_expansion_mode: "disabled"`. Nunca em plano `text`.

Fora do anúncio: Veo 3.1 Fast (fraco em comida, inventa letra) e Seedance 1.5 Pro (objetos que andam sozinhos, troca letras).

REGRA DURA: texto nunca passa por IA de vídeo. Todo plano cuja foto tenha texto legível (tela, preço, cardápio, placa, rótulo) é `text`. O cliente vê o próprio preço errado e o anúncio morre.

## 3. Custo e margem (15 s)

Fixos por anúncio: ~US$ 0,25 (Lyria 3 Pro US$ 0,08 + voz MiniMax ~US$ 0,03 + Creatomate ~US$ 0,13 + GPT ~US$ 0,01). Nano Banana Pro edit: US$ 0,15 por imagem (conferir o schema; 1K/2K).

| Nível | Conta | Custo | Starter (US$ 0,165/cr) | Creator/Studio (US$ 0,133/cr) | Passe (US$ 0,332/cr) |
|---|---|---|---|---|---|
| Foto em movimento | 6 × 0,336 + 0,25 | US$ 2,27 | US$ 5,61 → 60% | US$ 4,51 → 50% | US$ 11,28 → 80% |
| Comercial | 6 × 0,336 + 3 × 0,15 + 0,25 | US$ 2,72 | US$ 6,77 → 60% | US$ 5,44 → 50% | US$ 13,60 → 80% |
| Cinema | 5 × 0,336 + 2 × 0,968 + 4 × 0,15 + 0,25 | US$ 4,47 | US$ 8,42 → 47% | US$ 6,77 → 34% | US$ 16,90 → 74% |

Margens brutas, antes da taxa da Stripe (~5 pontos). Plano `text` custa zero e melhora a margem. Por que não multi-plano numa geração: no image-to-video só o 1º plano parte da foto; os outros são inventados pelo motor. Na Foto em movimento cada plano tem de ser a foto real, então é 1 geração por foto. O Kling O3 é o motor com a menor duração mínima (3 s) e o único que manteve o texto e a gente de pé.

## 4. Armadilhas da API da fal (valem para todo código novo)

1. Kling O3 i2v e H3 i2v aceitam `end_image_url`: nunca mandar vazio nem herdado; montar o input campo a campo, sem espalhar objeto de fora.
2. H3: mandar `prompt_expansion_mode: "disabled"` e `resolution: "768P"` explícitos (padrões são "balanced" e "2K", que reescreve o pedido e custa o dobro).
3. Kling O3: mandar `generate_audio: false` explícito. Seedance 2.0: `generate_audio: false` (preço igual, mas o áudio seria jogado fora). H3 gera áudio sempre; o montador zera.
4. Seedance: mandar `aspect_ratio: "9:16"`. Kling O3 e H3 NÃO têm aspect_ratio e seguem a foto: por isso a foto chega JÁ recortada em 9:16.
5. Kling O3 Pro sai em 1080p sem opção.
6. Envio à fila: 408/5xx no POST é ambíguo (lib/falQueue.ts). Nunca reenviar às cegas: o plano fica `ambiguous` e o avanço decide.

## 5. Fluxo

1. O cliente escolhe o nível, escreve 1 frase (ou cola o link do negócio), sobe o logo e 3 a 7 fotos (o pedido de fotos muda por setor: "seu anúncio vai mostrar o SEU lugar"). Cada foto é recortada em 9:16 (1080×1920) NO NAVEGADOR, com ponto focal escolhido pela pessoa, antes do upload.
2. O servidor extrai o brief (setor, nome, oferta, contato, idioma) e monta a lista de planos pelo molde do setor: 6 (ou 7) planos com segundos de corte, `shotKind`, foto de origem, prompt de 1 movimento terminando em "keep everything exactly as in the photo", 2-3 frases de tela e a narração de até 30 palavras. Os validadores anti-invenção (lib/ads/scriptPrompt.ts) rodam sobre narração, frases de tela e prompts. Nada de forno, prato, decoração ou número que o cliente não escreveu.
3. `dry_run: true` devolve o plano, o custo em créditos e o custo estimado em US$ SEM cobrar e sem chamar a fal (regra da casa: ensaio de US$ 0 antes de todo render pago).
4. Início: acesso (passe, assinante ou conta interna) → interruptor v2 → moderação → trava do pedido → débito → envio dos planos à fal (Nano Banana primeiro onde houver cena criada) → 202.
5. Avanço (tela + cron a cada 5 min com folga): consulta cada plano; refaz sozinho 1 vez o que falhou por culpa do fornecedor; copia cada clipe pronto para o nosso bucket (URL da fal expira); quando todos estão prontos, gera voz e música, monta no Creatomate, copia o MP4, grava em `videos` (quality_mode `ads_v2`) e entrega. Falha terminal → estorno confirmado.
6. Entrega: vídeo na tela e na /library, download, lembrete do rótulo de IA do TikTok, e "Refazer este plano" por plano (cobrado à parte).

## 6. Montagem (fora do /api/compose)

Linha do tempo fixa: planos de 2,0/2,0/2,5/2,0/2,0/2,0 s (15 s com o cartão) ou 7 planos (16,5 s) no Cinema; cada plano usa um trecho do clipe (trim_start + duration ≤ duração medida); dissolve curto; plano `text` = foto parada com zoom lento de ~1,08x; 2-3 frases no terço do meio (fora dos 14% de cima e dos 35% de baixo) com a fonte do idioma (lib/textLanguage.ts); voz a partir de 0,3 s; música por baixo (~25% com voz, ~70% sem); cartão final de 2,5 s com logo real sobre fundo neutro (cor da marca), desenhado pelo lib/ads/endCard.ts. Sem marca d'água (o v2 exige acesso pago).

## 7. Onde nasce o código (fora da trava 8.2)

Tabelas próprias (`ads_v2_orders`, `ads_v2_shots`) em migrations_pending/, RLS ligado e nenhuma policy; módulos em lib/ads/v2*.ts e lib/ads/adV2Montage.ts (nome NUNCA começa com lib/compose); rotas em app/api/ads/v2/; cron novo em app/api/cron/ads-v2-advance/; tela em app/(dashboard)/ads/v2/. Pode IMPORTAR de lib/compose.ts, lib/lyriaMusic.ts e lib/cinematic/* mas nunca editar. O v1 (/ads/new, /api/ads/render, ads_orders) fica intacto até a virada pública.

## 8. Portão

`ADS_V2_PUBLIC = false`: só contas internas (isAdsInternalEmail) veem e usam. O fundador faz 1 anúncio de uma empresa real; aprovado, o interruptor vira e a copy pública (/ads, pricing, e-mails, tile do /studio) muda junto, com os guardiões reancorados no mesmo commit. Na virada, /ads e /ads/for/[setor] abrem direto no montador, com "How it works" e os modelos ao lado, e o botão "Começar do zero" (pedido do fundador 28/09).

## 9. Pendências do fundador

- Passe do Ads: com 34-51 cr por anúncio, os 60 cr do passe pagam 1 anúncio. Decidir antes da virada pública.
- Valor da refação por plano (proposta: 5 cr e 12 cr no herói).
