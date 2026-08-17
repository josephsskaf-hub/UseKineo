# MOTOR-MAX — auditoria de schema fal x o que enviamos (16/08, noite)
> Metodo: baixar o llms.txt oficial de cada modelo e comparar parametro a
> parametro com buildFalInput. O achado do Veo 1080p gratis veio deste metodo.

## LIGADO HOJE (16/08 noite — commit MOTORMAX)
| Motor | Achado | Efeito |
|---|---|---|
| Kling 3 t2v | `duration` aceita 3-15 continuo (snap 5\|10 nosso criava dead air/fala cortada) → duracao EXATA da cena | cenas justas, sem silencio |
| Kling 3 t2v | `cfg_scale` não enviado (default 0.5) → 0.6 | +aderencia ao prompt, menos cena aleatoria/gemea |
| Veo 3.1 Fast | `safety_tolerance` '5' (default 4) | menos bloqueio espurio = menos cena dropada |
| Seedance 1.5 | `duration` aceita 4-12 continuo (mandavamos '10' fixo) → exata | sem dead air E ~20% mais barato (preco por token ∝ duracao) |
| (ontem) Veo | resolution 1080p mesmo preco | Full HD gratis |
| (hoje cedo) anchors | flux/schnell → flux/DEV + DNA de pele | rosto real |

## FASE 2 (descobertas grandes que pedem engenharia + teste)
- **Kling 3 multi_prompt + shot_type**: multi-shot NATIVO num job so — 15s com
  3 shots dirigidos = menos jobs, menos falha, transicoes do proprio modelo.
  Candidato a re-arquitetura do Hollywood (1 job de 15s por bloco narrativo).
- **Kling O3 i2v `end_image_url`**: frame inicial E final — gerar still de
  chegada e animar a transicao = controle de cinema (image-first v2).
- **Kling 3 voice control** ($0.196/s): controle de voz nativo — resolver
  genero/persona da voz no proprio motor.
- **Seedance `camera_fixed`**: base pros presets de camera do Studio.
- **Seedance audio nativo**: generate_audio true no classico (hoje false) —
  ambiencia gratis? custa +100% por token (2.4 vs 1.2/M) — A/B se vale.
- Kling 2.5: schema so aceita 5|10 (sem mudanca).

## Regra permanente
Todo motor novo entra SO depois de: llms.txt lido + tabela como esta + A/B.

## ADENDO 17/08 (tarde) — candidatos da arena de agosto/2026 (schemas oficiais conferidos)

### MiniMax H3 (`minimax/h3/text-to-video` + `/image-to-video`) — ★ A PECHINCHA DE ELITE
- Arena: nº 2 do mundo (1242 Elo), 3 pontos do líder.
- Preço: $0.05/s @480p · $0.08/s @768p · **$0.13/s @2K** · $0.16/s @4K.
  → 2K mais BARATO que o Kling 3 ($0.168/s) e que o Veo fast ($0.15/s).
- t2v: duration 5-15 (int), 7 aspect ratios, `enable_prompt_expansion` (default true — DESLIGAR: nosso prompt já é dirigido).
- i2v: primeira imagem E/OU last frame (transição entre 2 imagens!) — aspect segue a imagem → image-first trava 9:16 igual fizemos no Kling.
- 2K/4K são upscale de base 768p (nativo = 480/768).
- VEREDITO: candidato nº 1 a motor novo ("MiniMax 2K") e a substituto do slot 'cinematic' do Hollywood. Pay-per-use, upside quase puro.

### Seedance 2.5 (`bytedance/seedance-2.5/*`) — ⚠️ NÃO é upgrade de slug, é OUTRO PRODUTO
- Single-shot NATIVO de até 30s, coerente, com áudio + FALA LIP-SYNCED inclusos no preço.
- Preço: **~$0.47/s @720p** (~$14 por clipe de 30s) — 20x o custo/s do 1.5. 
- VEREDITO: caríssimo pro motor-workhorse (fica no 1.5). MAS: 2 clipes de 30s com fala nativa = filme de 60s em 2 requests — é um HOLLYWOOD ALTERNATIVO de arquitetura radicalmente simples, viável só com preço premium próprio (~$28 de insumo → precificar 400cr+?). Guardar pra tier "Kineo Max".

### Sora 2 — ☠️ REMOVER: app fechou em abril/26, API desliga em 24/09/2026. O bloqueio antigo virou acerto; limpar o slug do código.

### Gemini Omni Flash — nº 1 da arena a ¼ do custo dos flagships; verificar disponibilidade no fal/Google API (não visto no fal hoje).
