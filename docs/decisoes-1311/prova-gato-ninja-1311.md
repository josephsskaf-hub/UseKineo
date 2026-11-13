# Prova paga — gato ninja (7f92fe17) com o código final · 13/11/2026

**O que esta prova testa:** a peça (b) do KINEO-SUJEITO-APARENCIA-1311. O sujeito completo do pedido, com a cor que o cliente escreveu ("рыжий" → ginger), vai a todos os planos e às metades de cena. A ordem do corte é a do KINEO-SUJEITO-TODO-PLANO-CORTE-1311.

**O que ela NÃO testa:** o look desenhado ("стиль пиксар" → 3D, peça 2, no ar). Para testá-lo seria preciso refazer as 3 imagens-chave em 3D. Aqui as imagens e o look são os do filme real (fotorreal), para isolar só a cor e o lugar do gato.

**Como o pedido foi montado (sem rede):** partindo do pedido REAL salvo no claim (`cinematic_submission_claim.response.scene_fal_inputs[0]` do generation `7f92fe17-3ac2-4ac6-88a6-bce6cd574722`). Conferi que reconstruir o original com `buildKling4TrialInput` devolve os 4 planos byte a byte. Por cima dele entram só as mudanças do código final, pelas funções da branch:
- "Пиксар clearly visible…" não nasce (peça 3, no ar).
- `comSujeitoEmTodoPlano` nos planos de cena (1 e 4) e `comSujeitoNasMetades` nas metades (2 e 3).
- As durações vêm da régua da voz (`kling4TrialSceneDurationsPelaVoz`, voz medida de 9 s) e dão [2, 2, 2, 9], as mesmas do filme real.

Gerador: `scratchpad/rc/aparencia/gera-prova-gato2.mjs`.

Uma reconstrução do zero, a partir dos prompts de cena, NÃO bate byte a byte: os insumos anteriores ao passo do Kling 4 (falas depois do encaixe, prompts antes do eixo) não ficam salvos, e o código mudou durante o dia. Por isso a prova parte do pedido real.

## Endpoint
`POST https://queue.fal.run/kling/v4/image-to-video` — no playground da fal, o modelo `kling/v4/image-to-video`. Custo do filme real: US$ 2,355.

## O pedido (JSON exato, colar no playground)
```json
{
 "multi_prompt": [
  { "prompt": "Scene 1: use the start image. Photoreal film. Main subject clearly visible in frame: a ninja cat running on rooftops (ginger). A sleek orange cat perched on a rooftop, silhouetted against a glowing sunset, exuding a ninja-like presence. photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, , same photorealistic look in every scene no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.", "duration": 2 },
  { "prompt": "Scene 2: use middle keyframe 1. Photoreal film. Main subject clearly visible in frame: a ninja cat running on rooftops (ginger). Main subject of this shot: cat jumping rooftop, shown in motion. no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.", "duration": 2 },
  { "prompt": "Scene 3: text-directed shot, no new keyframe for this scene. Photoreal film. Main subject clearly visible in frame: a ninja cat running on rooftops (ginger). Wide shot. Main subject of this shot: cat stealthy movement, shown in motion. no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.", "duration": 2 },
  { "prompt": "Scene 4: use middle keyframe 2. Photoreal film. Main subject clearly visible in frame: a ninja cat running on rooftops (ginger). In a vibrant, animated style, the cat performs an epic leap, embodying the essence of a superhero ninja in action. photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, , same photorealistic look in every scene, one consistent color grade and lighting, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.", "duration": 9 }
 ],
 "duration": 15,
 "resolution": "720p",
 "start_image_url": "https://v3b.fal.media/files/b/0ab255d9/rldW-JOfy-ETgj0ivHoSb.jpg",
 "middle_image_urls": [
  "https://v3b.fal.media/files/b/0ab255d9/UMU9QPxKYGap-nEos5N_R.jpg",
  "https://v3b.fal.media/files/b/0ab255d9/n8EEjQIQ880cQcmL3oQpP.jpg"
 ]
}
```
As 3 imagens responderam 200 em 13/11 noite. Mais nada foi ao motor no filme real: sem `negative_prompt`, sem `aspect_ratio` (com imagem inicial o formato vem dela).

## Lado a lado: o que foi ao motor no filme real (ANTES) × o pedido acima (DEPOIS)
| plano | s | ANTES (filme real do cliente, 13/11 15:51 BRT) | o que muda DEPOIS |
|---|---|---|---|
| 1 | 2 | Scene 1: use the start image. Photoreal film. A sleek orange cat perched on a rooftop, silhouetted against a glowing sunset, exuding a ninja-like presence. photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, , same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain no readable text, … Mouth closed, no speaking. | + "Main subject clearly visible in frame: a ninja cat running on rooftops (ginger)." Para caber, sai "one consistent color grade and lighting, same lens and film grain" (texto fixo de estilo); a ação fica inteira. |
| 2 | 2 | Scene 2: use middle keyframe 1. Photoreal film. Main subject of this shot: cat jumping rooftop, shown in motion. no readable text, … | + a mesma linha do sujeito (o gato ruivo no telhado) |
| 3 | 2 | Scene 3: text-directed shot, no new keyframe for this scene. Photoreal film. Wide shot. Main subject of this shot: cat stealthy movement, shown in motion. no readable text, … | + a mesma linha do sujeito. No filme real este plano saiu NA RUA. |
| 4 | 9 | Scene 4: use middle keyframe 2. Photoreal film. Пиксар clearly visible as the subject of this shot.  In a vibrant, animated style, the cat performs an epic leap, … | − "Пиксар clearly visible as the subject of this shot." · + a linha do sujeito |

## O filme original (para o antes e depois)
- Filme entregue ao cliente (leonardodevenshi59, 13/11 18:51 UTC, nota 7 do revisor): https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/643fbc0f-fad0-4b40-8422-801f58bf983e/061a5c5d-584b-4060-a7a6-bbfc5d8757f7.mp4
- Pedido do Kling 4 na fal: `original_request_id` 01a1d639-ccfe-7853-856f-25681ba8d2b3 (claim).
- Relatório do revisor: `C:\kineo\docs\revisao-videos\2026-11-13.md`, rodada 16:10.

## A régua (escrita ANTES do render)
- **Aprovado se:**
  - o gato é **ruivo/laranja nos 4 planos**;
  - nos planos 2 e 3 ele está **em telhado** (no original, 2 cenas na rua);
  - a ação de cada plano acontece.
- **Não conta contra a prova:** o "In a vibrant, animated style" do plano 4 vem do texto do filme real (o planejador escreveu isso porque o look era fotorreal e o roteiro dizia Pixar). Se o gato virar desenho no fim, é a parte do look, que já está no ar e não está nesta prova.

## Avisos
- No filme real, a leitura do sujeito do Kling 4 **estourou o prazo** (8 s, `leitura_falhou:prazo` no claim), então nada foi lido nem injetado. Com o código final há mais uma pergunta curta (a aparência, ~1 s, sem segunda tentativa). Num dia lento, essa leitura ainda pode falhar, e nesse caso o filme sai como antes. O prazo do leitor não mudou nesta entrega.
- A leitura usada aqui ("a ninja cat running on rooftops") é a que o MESMO pedido deu na leitura da estrada clássica do mesmo filme e no ensaio A/B. A aparência "ginger" saiu nas 2 rodadas do ensaio.
