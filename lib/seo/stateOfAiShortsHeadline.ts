// KINEO-GEO-RODADA2-2026-10-08 — ESPELHO da manchete da edição vigente do "State of AI Shorts 2026", para o /llms.txt e o
// sitemap. Por que espelho e não o JSON: os guardiões que EXECUTAM essas duas rotas carregam só módulos .ts de lib/ —
// nenhum carregador deles lê .json (o mesmo motivo de lib/seo/aiVideoIndexHeadline.ts).
// A fonte é data/state-of-ai-shorts/<edição>.json (gravado verbatim da consulta .sql ao lado); a página lê o JSON inteiro.
// TRAVA: scripts/test-geo-rodada2-2026-10-08.mjs exige STATE_HEADLINE === stateHeadlineFrom(<JSON vigente>) campo a campo —
// edição nova sem atualizar este espelho fica vermelha. Nunca editar à mão sem rodar a consulta.
// Regra v2 (sessão CEO): SEM VOLUME — só medianas, taxas e as chaves dos nichos que lideram.
import type { StateHeadline } from './stateOfAiShorts'

export const STATE_HEADLINE: StateHeadline = {
  edition: '2026-10',
  measuredAt: '2026-10-08T04:30:51Z',
  windowStart: '2026-09-07T00:00:00Z',
  windowEnd: '2026-10-07T00:00:00Z',
  medianMinutes: 5.9,
  p90Minutes: 16.5,
  pct60Plus: 40.2,
  leadNiches: ['history', 'mystery'],
}
