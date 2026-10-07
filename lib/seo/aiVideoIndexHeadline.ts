// KINEO-INDICE-VIDEO-IA-2026-10-06 — ESPELHO da manchete da edição vigente do Kineo AI Video Index, para o /llms.txt e o
// sitemap. Por que espelho e não o JSON: os guardiões que EXECUTAM essas duas rotas (test-llms-*, test-motores-geo,
// test-avatar-fora, test-copy-filme-gratis-15s…) carregam só módulos .ts de lib/ — nenhum carregador deles lê .json.
// A fonte é data/ai-video-index/<edição>.json (gravado verbatim da consulta .sql ao lado); a página lê o JSON inteiro.
// TRAVA: scripts/test-indice-video-ia-2026-10-06.mjs exige AI_VIDEO_INDEX_HEADLINE === headlineFromEdition(<JSON vigente>)
// campo a campo — edição nova sem atualizar este espelho fica vermelha. Nunca editar à mão sem rodar a consulta.
// V2 (sessão CEO 06/10): SEM VOLUME — só medianas e a confiabilidade publicável (o guardião recusa contagem aqui).
import type { IndexHeadline } from './aiVideoIndex'

export const AI_VIDEO_INDEX_HEADLINE: IndexHeadline = {
  edition: '2026-10',
  measuredAt: '2026-10-07T03:05:06Z',
  windowDays: 30,
  lead: { engine: 'Seedance 1.5', medianMinutes: 5.9, medianSeconds: 43, reliabilityPct: 98.2 },
}
