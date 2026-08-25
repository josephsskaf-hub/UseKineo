# Motor novo — META DA SEMANA: Gemini Omni Flash (25/08/2026)

## O caso, em números (pesquisa 25/08)

- **#1 do ranking cego** (Artificial Analysis arena, ago/2026): **1245 Elo** —
  acima do nosso MiniMax H3 (#2, 1242) e de todos os flagships.
- **Custa ~1/4 dos flagships**: no fal, ~**$0.13/s** em 720p — mais barato que
  o Kling 3 que já usamos ($0.168/s medido no render de ontem).
- **Disponível no fal HOJE**: `google/gemini-omni-flash` (endpoints
  image-to-video e edit) — mesmo fornecedor, mesma integração, zero infra nova.
- É o modelo que "as pessoas estão procurando": lançado com muito barulho,
  topo de todo roundup de agosto.
- Fontes: invideo.io/blog/best-ai-video-model · videogen.io/best-ai-video-models
  · fal.ai/models/google/gemini-omni-flash/image-to-video · atlascloud.ai/models/gemini-omni

## A conta de margem (60s de filme)

| Motor | custo fal/s | filme 60s (fal) | créditos hoje | receita @ $0.107/cr |
|---|---|---|---|---|
| Kling 3 | $0.168 | ~$11-13 | 150 | $16 (margem ~30%) |
| **Omni Flash** | **$0.13** | **~$8.50** | **150 (proposta)** | **$16 (margem ~47%)** |
| H3 | (~$0.09) | ~$5.50 | 45 | $4.80 (loss-leader) |

**Proposta de posicionamento:** entrar como o novo TOPO — "Omni Flash · #1
ranked worldwide" a **150cr**, mesmo preço do Kling 3 e margem 17pp melhor.
Kling 3 segue no catálogo (o lip sync dele é o diferencial provado). Card do
Studio ganha "the #1-ranked video model, included".

## Plano de implementação (2-3h, padrão H3 de 19/08)

1. `lib/hollywood/router.ts`: família nova 'omni' no cinematicSceneModel
   (i2v anchored igual Kling), modelo `google/gemini-omni-flash/image-to-video`.
2. `engineCost.ts`: quality 'cinematic_omni' = 150cr (+ espelho no compose).
3. Studio ENGINES: card "Omni Flash — #1 ranked video model, Aug 2026" tag NEW.
4. Dry-run de $0 com o script do Flight 19 ANTES do primeiro render pago.
5. 1 render de validação (~$8.50) → frames auditados → vitrine se aprovar.

## Risco/atenção

- Verificar no schema do fal: duração máx por clipe, áudio nativo (tem stereo?
  se tiver, testar rota de diálogo), e se aceita âncora de imagem (i2v ✓).
- Selo honesto: só anunciar "#1 ranked" com a fonte linkada (arena de agosto).

**Recomendação: GO esta semana.** É upside quase puro (pay-per-use), demanda
de busca no pico, e vira o argumento de venda do Studio no dia do launch.
