# Resultado: teste "produto real na mão" (Atheeri), 16/10/2026

Tarefa KINEO-TESTE-PRODUTO-NA-MAO-1610. O fundador aprovou as 3 etapas em 16/10 ("Vai com as 3"). Teto: US$ 3.
Tudo foi feito pela interface do produto (usekineo.com), na conta da casa josephsskaf@gmail.com. Nenhum código foi mudado e nada foi publicado.
A trava do Ads não foi tocada. Horário: 13:47–14:02 UTC.

Arquivos em `C:\kineo-wt\prints-1610\mao-*`.

## 1. Caminho usado

| Etapa | Tela | Motor (endpoint) | Configuração |
|---|---|---|---|
| Foto da cena | `/images` → Nano Banana Pro + "Foto de referência" (`app/api/images/generate` com `fal-ai/nano-banana-pro/edit`, `lib/imageReference.ts`) | Nano Banana Pro edit, **1K**, 9:16 | Referência: `atheeri-produto.jpg`. Prompt da tarefa, palavra por palavra. A rota acrescenta sozinha "Keep the exact face and identity of the person in the reference photo(s)." |
| Animar (Kling) | `/clips` → Kling 3 + foto (`lib/clips/clipCatalog.ts`) | `fal-ai/kling-video/o3/pro/image-to-video` | **5 s**, sem áudio. A menor duração que a tela oferece é 5 s (os alvos são 5/7/10/15). 3 s não existe no /clips |
| Animar (Seedance) | `/clips` → Seedance 2.5 + foto | `fal-ai/seedance-2.5/image-to-video`, 480p | 5 s. **Falhou 2 vezes**, sem cobrança (ver §4) |
| Animar (Seedance, plano B) | `/clips` → Seedance 1.5 + foto | `fal-ai/bytedance/seedance/v1.5/pro/image-to-video`, 720p | 5 s, sem áudio |

- **O Seedance 2.0 Fast não tem caminho de foto fora do Studio Ads.** Hoje ele só existe no Ads (`lib/ads/v2Tiers.ts`), e a tarefa proíbe mexer lá.
- **Nenhuma tela usa quadro final.** O `/clips` manda só `image_url`. Por isso não deu para aplicar o truque dos líderes (a mesma foto como quadro inicial e final, para prender a embalagem nas duas pontas).
- **O Bria Product Holding não está integrado.** `git grep -i bria origin/main` só acha palavras como "abria" e "Brian". Ficou fora do teste.

## 2. Custo e saldo da fal

| Etapa | Previsto | Real (diferença de saldo na fal) | Créditos Kineo |
|---|---|---|---|
| 2 fotos Nano Banana Pro 1K | US$ 0,30 | **US$ 0,30** (o painel não separa as duas) | 10 |
| Kling O3 i2v, 5 s | US$ 0,34 (3 s) | **US$ 0,56** (16,70 → 15,84 menos as fotos; 5 s × 0,112) | 8 |
| Seedance 2.5 i2v, 2 tentativas | US$ 0,97 | **US$ 0,00** (provider_failed, estorno automático de 14 cr cada) | 0 (estornados) |
| Seedance 1.5 i2v, 5 s | (não previsto) | **US$ 0,13** (15,84 → 15,71) | 5 |
| **Total** | ≤ US$ 3 | **US$ 0,99** | 23 |

- **Saldo da fal antes:** US$ 16,70 (painel, ~13:47 UTC). **Depois:** US$ 15,71 (~14:02 UTC).
- O Kling custou mais que o previsto porque o produto não deixa pedir 3 s. A tarefa permitia de 3 a 5 s ("o mínimo que o produto permitir"), e o total ficou bem abaixo do teto.

## 3. Notas (olho do espectador, 0–10, nota dura)

O rótulo foi julgado como **"parecido e legível"**, não pixel a pixel. A pesquisa de 16/10 mostra que **todos os líderes admitem que texto pequeno de rótulo deforma em vídeo**.

### Etapa 1: as 2 fotos (`mao-fotos-grade.jpg`, `mao-foto-*-rotulo-zoom.jpg`)

| | Foto 1 (mulher de robe de cetim, janela com chuva e cidade) | Foto 2 (só mãos e queixo, quarto com abajur) |
|---|---|---|
| Parece foto real | 9: parece foto de celular de verdade | 8: real, mas o recorte sem rosto parece banco de imagem |
| Escala na mão | 7: caixa um pouco grande, mas plausível de perto | 7 |
| Luz da cena na caixa | 8: abajur quente no favo dourado, janela fria de lado | 8 |
| Rótulo igual | 8: أثيري, ATHEERI, abelha e favo certos. "Lattafa" virou "Lelafa" | 8: o mesmo. "Lattafa" virou "Lattate" |

**Escolhida: foto 1** (`mao-escolhida-lado-a-lado.jpg`). A pessoa aparece e olha o produto, que é o formato "product in hand" que vende. Nenhuma das duas tem cara de colagem.

### Etapas 2 e 3: os vídeos (`mao-kling3-quadros.jpg`, `mao-seedance15-quadros.jpg`, `mao-fim-original-kling-seedance.jpg`)

Quadros a 0,1 / 1,25 / 2,5 / 3,75 / 4,9 s.

| Critério | Kling O3 (Kling 3), 5 s | Seedance 1.5, 5 s |
|---|---|---|
| 1. Parece filmado, não colagem | **7**: movimento natural nos primeiros ~3 s. No fim a caixa fica de frente, chapada, e perde a lateral (vira quase um cartão) | **6**: ela sorri e a cena tem vida, mas a janela dourada da caixa "acende" com um brilho que não existe e a abelha fica achatada |
| 2. Escala e luz da cena | **7**: escala certa até ~3 s. No fim a caixa cresce (o push-in junto com a subida) | **6**: o mesmo crescimento. O enquadramento do fim corta o rosto dela |
| 3. Interação com o produto | **7**: ela segura e levanta, os dedos ficam certos o tempo todo, mas o olhar não muda | **8**: ela olha, sorri e oferece a caixa à câmera. É a melhor "atuação" |
| 4. Rótulo durante o movimento | **8**: أثيري e ATHEERI ficam limpos do começo ao fim, a abelha segue 3D com esmalte. "Lattafa" ilegível. A caixa gira ~25° até ficar de frente, apesar do "does not rotate" | **5**: أثيري e ATHEERI ficam legíveis, mas a abelha vira desenho plano e "Lattafa" vira "IUREEX NOI". Também gira ~30° |
| 5. Daria para postar | **6**: sim, cortando em 2–3 s (antes de a caixa achatar) | **4**: só os 2 primeiros segundos. O fim tem rótulo inventado e rosto cortado |
| **Média** | **7,0** | **5,8** |

## 4. Seedance 2.5 com foto: quebrado no /clips (achado de produto)

- **Duas tentativas, as duas `provider_failed`** (clips `cd59befa…` e `c0c16e71…`, ~100 s cada). Estorno automático de 14 cr cada, e a fal não cobrou nada.
- **Na história do `/clips`, o Seedance 2.5 com foto nunca entregou nenhum clipe.** Nos últimos 20 dias: 0 de 2 com foto, 1 de 1 sem foto (06/10).
- **A causa exata não ficou registrada.** O log da Vercel só mostra o estorno, e a coluna `clips.failure_reason` só guarda "provider_failed", sem o texto da fal.
- **Hipóteses (não confirmadas):**
  1. A ByteDance recusa foto de pessoa realista como quadro de entrada. Isso bate com o "indício de 28/09" do estudo.
  2. A conta não tem acesso ao endpoint i2v. A página `fal.ai/models/fal-ai/seedance-2.5/image-to-video` mostra "Early access … Request access", com termos B2B e `end_user_id`. Não aceitei os termos.
- **O que custa ao cliente:** a tela vende "Seedance 2.5 · foto" e falha depois de ~2 min. O estorno funciona, mas a promessa não é cumprida.

## 5. Qual motor ganhou

**Kling O3 (Kling 3), 7,0 contra 5,8.** Ele segura o rótulo grande e a abelha 3D durante o movimento. O Seedance 1.5 atua melhor (o sorriso), mas reescreve o rótulo.
Nenhum dos dois cumpriu "the box does not rotate". Os dois giraram a caixa até ficar de frente e ampliaram demais no fim.

## 6. Vale levar para o Studio Ads?

**Sim, para o plano "USO com produto na mão", com 4 condições:**

1. **Still: Nano Banana Pro edit com a foto original como referência.** Ele passou sem colagem e sem redesenhar a embalagem: nome, árabe, abelha e favo certos. O texto pequeno ("Lattafa") deforma. Isso já é melhor que a trava atual, que cola o recorte.
2. **Vídeo: Kling O3, usando só os primeiros 2–2,5 s** do clipe. O defeito (caixa girando, achatando e crescendo) mora nos últimos 2 s. Isso confirma a regra do estudo ("usar só 2 a 2,5 s").
3. **Movimento mais contido que o deste prompt.** Tirar "raises the box toward the camera" junto com "slow push-in": somados, viram zoom na caixa. Testar "she holds the box still, only her fingers adjust, camera static".
4. **O rótulo exato continua no packshot real e no cartão.** O texto pequeno nunca sobrevive.

**Ainda não testado (próximo teste barato):**
- **Kling O3 com a mesma foto como quadro inicial e final** (o schema aceita `end_image_url`, conferido no estudo). É o melhor candidato para matar o giro e o crescimento. Precisa de rota interna ou do Ads, porque o /clips não manda quadro final.
- **Bria Product Holding (US$ 0,04)**, se for integrado.
- **Seedance 2.0 Fast pelo Ads, com quadro inicial e final**, depois que a causa do Seedance 2.5 for conhecida.
