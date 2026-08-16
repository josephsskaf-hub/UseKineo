# PROJETO PISO — garantia de qualidade mínima em todo render
> Aprovado pelo fundador em 16/08 ("sim"). Execução começa 17/08, pós-pico TAAFT.
> Regra de ouro: NADA disso entra em produção no dia 16/08 (dia do boost).

## Objetivo
O pior vídeo que sai do Kineo deve parecer o vídeo médio do concorrente.
O motor terceirizado decide ~40% do resultado; os outros 60% são nossos — este
projeto ataca os 60%.

## Nível 1 — trocas de fornecedor (0.5 dia cada; piso sobe de graça)
- [x] Veo 3.1 em 1080p (FEITO 16/08 — mesmo preço no fal, commit 01e2b6b)
- [ ] Seedance 1.5 → 2.0 (troca de slug; validar params; MESMO preço em créditos = evento de marketing)
- [ ] Kling 3 como motor avulso na UI (já integrado via Hollywood)
- [ ] Sora 2: retestar bloqueio upstream com 1 render de ~$1; liberou → expor (100cr)

## Nível 2 — engenharia de prompt e acabamento (custo ~zero/render)
- [ ] DNA CINEMATOGRÁFICO obrigatório no analyze-idea: toda cena sai com lente,
      luz, paleta e movimento definidos + "estilo de mundo" fixo por vídeo
      (mesma fotografia do início ao fim). Validar OFFLINE antes (A/B de clipes
      via fal direto, fora da produção). Deploy atrás de flag KINEO_CINE_DNA.
- [ ] Negative prompts universais endurecidos (morphing, dedos, texto na tela,
      pele plástica, watermark) em todos os motores.
- [ ] Pós leve no compose: grain sutil + color grade + sharpening (ffmpeg).

## Nível 3 — o salto (3-4 dias): modo image-first
- [ ] Generalizar a técnica do Hollywood 3.0 (still ancorado → image-to-video)
      para Seedance/Kling/Veo. É o segredo do visual Higgsfield.
- [ ] Biblioteca de presets de câmera validados por motor (dolly, crash zoom,
      orbit, crane — strings testadas, não esperança).

## Nível 4 — o guardião: quality gate automático
- [ ] Pós-render: check barato de frames (tela preta, blur extremo, artefato)
      → re-render automático 1x antes de entregar. O usuário nunca vê o pior
      output do motor. Medir taxa de rejeição por motor no admin.

## Protocolo de ship (inegociável)
1. Toda mudança de pipeline nasce atrás de flag OFF.
2. A/B offline com amostras lado a lado ANTES do flip (fundador vê e aprova).
3. Flip fora de pico de tráfego; watch de falhas por 24h após cada flip.
4. Preços/créditos: qualquer mudança só com aprovação explícita do fundador
   (tabela proposta em docs/PRECOS-MOTORES-V4.md).
