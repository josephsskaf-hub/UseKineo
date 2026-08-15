# PLANO — Generation v4 (resolução + duração + motores escolhíveis)
> Preparado 15/08 enquanto o fundador estava fora. Ele refaz a UI na volta;
> este é o mapa de construção pro backend plugar direto.

## O que o fundador quer
1. Usuário escolhe **720p ou 1080p**
2. Usuário escolhe **15s, 45s ou 60s**
3. Usuário escolhe o **motor** (já existe, ganha os novos)
4. UI do /generate refeita por ele na volta

## Estado atual (medido no código 15/08)
- `type Duration = 45 | 60 | 90` (GenerateClient:197); analyze-idea aceita `duration` e dimensiona cenas: `>=90→8, >=60→6, senão 5` (route:748). **15s NÃO existe ainda.**
- Resolução é fixa por motor em `buildFalInput` (generate-video-cinematic:187+):
  Veo 3.1 Fast → `resolution:'720p'` · Seedance 1.5 → `hd` flag (1080 só Studio) · Sora → 720p · Kling 2.5 → sem param de resolução no fal · Kling 3 → sem param (nativo ~1080)
- Custos atuais (lib/credits/engineCost.ts): fast 0/1 · seedance 20 · kling25 50 · veo 90 · sora 100 · kling3(hollywood) 150 · presenter 70 · avatar 110

## Mudanças exatas (ordem de execução)
1. **15s**: GenerateClient `Duration = 15|45|60` + DURATION_OPTIONS; analyze-idea: aceitar 15 na whitelist e `targetScenes = duration<=15 ? 2 : ...`; word count ~35 palavras.
2. **resolution**: novo campo `resolution: '720p'|'1080p'` no body do /generate → viaja até generate-video-cinematic → `buildFalInput(model, prompt, hd=resolution==='1080p', ...)`:
   - Veo: trocar string `'720p'`→`'1080p'` quando hd (validar se veo3.1/fast aceita 1080p no fal; senão usar `fal-ai/veo3.1` full — preço a confirmar)
   - Seedance: já pronto (flag hd)
   - Kling 2.5/Kling 3: fal não expõe resolução — UI deve mostrar "Full HD nativo" (sem toggle)
3. **Créditos por resolução** (engineCost.ts ganha param `hd`): proposta baseada em ~2× custo de fornecedor em 1080p:
   | Motor | 720p (hoje) | 1080p (proposta) |
   |---|---|---|
   | Seedance 1.5 | 20 | 32 |
   | Veo 3.1 | 90 | 145 |
   | Sora 2 | 100 | 160 |
   | Kling 2.5 | 50 (nativo) | — |
   | Kling 3 | 150 (nativo) | — |
   ⚠ Números finais dependem do preço fal real por segundo em 1080p — CONFIRMAR na hora (task do fundador aprovar).
4. **Créditos por duração**: hoje o custo é por RENDER, não por segundo — 60s custa igual a 45s (margem pior). Proposta: multiplicador `dur/45` arredondado (15s = 0.5×, 45 = 1×, 60 = 1.4×). Decisão do fundador.
5. **Motores novos (relatório 15/08)**: Seedance 2.0 (`fal-ai/bytedance/seedance/v2.0/...` — confirmar slug), Kling 3 t2v standalone (já integrado no Hollywood, expor como opção), Sora 2 (retestar bloqueio), Wan 2.6/2.7, Hailuo 2.3. Cada um = 1 entrada no MODEL map + 1 case no engineCost + 1 botão na UI nova.

## Guard-rails
- Preço/oferta: NUNCA mudar sem aprovação explícita do fundador (tabela acima é PROPOSTA).
- Free tier: 1080p nunca pra não-pagante (dobra custo do trial).
- UI nova dele: os params que o backend vai aceitar são `engine`, `duration: 15|45|60`, `resolution: '720p'|'1080p'`, `scriptMode` — contrato estável pra ele desenhar em cima.
