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
