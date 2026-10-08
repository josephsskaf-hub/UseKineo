// KINEO-GEO-RODADA3-2026-10-08 — ESPELHO do TEMPO MEDIDO por motor na edição vigente do Kineo AI Video Index, para as
// superfícies que citam tempo (páginas de motor nas 14 línguas, /llms.txt, /alternatives, páginas citáveis da rodada 3).
// Por que espelho e não o JSON: os guardiões que EXECUTAM essas superfícies carregam só módulos .ts — nenhum carregador
// deles lê .json (o mesmo motivo de lib/seo/aiVideoIndexHeadline.ts). A fonte é data/ai-video-index/<edição>.json
// (gravado verbatim da consulta .sql ao lado); a página /ai-video-index lê o JSON inteiro.
// TRAVA: scripts/test-geo-rodada3-2026-10-08.mjs exige AI_VIDEO_INDEX_TIMES === timesFromEdition(<JSON vigente>) campo a
// campo (a derivação mora em lib/seo/measuredRenderTimeEdition.ts; os 4 rótulos são os de lib/seo/aiVideoIndex.ts, trazidos
// para cá para que as páginas de motor não carreguem o índice inteiro) — edição nova sem atualizar este espelho fica
// vermelha. Nunca editar à mão sem a edição nova do índice.
// Regra v2 do índice: sem volume (só medianas, p90 e a confiabilidade publicável); motor sem bloco de cliente = 'house'.
import type { IndexTimes } from './measuredRenderTime'

export const AI_VIDEO_INDEX_TIMES: IndexTimes = {
  edition: '2026-10',
  measuredAt: '2026-10-07T03:05:06Z',
  indexName: 'Kineo AI Video Index',
  indexPath: '/ai-video-index',
  editionLabel: 'October 2026',
  testRendersLabel: 'Kineo internal test renders, indicative',
  engines: [
    { qualityMode: 'cinematic_ai', engine: 'Seedance 1.5', source: 'customers', medianMinutes: 5.9, p90Minutes: 16.2, medianSeconds: 43, reliabilityPct: 98.2 },
    { qualityMode: 'cinematic_kling', engine: 'Kling 2.5', source: 'house', medianMinutes: 7.7, p90Minutes: 13.8, medianSeconds: 62, reliabilityPct: null },
    { qualityMode: 'cinematic_veo', engine: 'Veo 3.1', source: 'house', medianMinutes: 6.3, p90Minutes: 16.8, medianSeconds: 63, reliabilityPct: null },
    { qualityMode: 'cinematic_hollywood', engine: 'Kling 3', source: 'house', medianMinutes: 7.4, p90Minutes: 11, medianSeconds: 53, reliabilityPct: null },
    { qualityMode: 'cinematic_h3', engine: 'MiniMax H3', source: 'house', medianMinutes: 7.4, p90Minutes: 10.2, medianSeconds: 41, reliabilityPct: null },
    { qualityMode: 'cinematic_s25', engine: 'Seedance 2.5', source: 'house', medianMinutes: 16.8, p90Minutes: 18.9, medianSeconds: 44.5, reliabilityPct: null },
    { qualityMode: 'cinematic_omni', engine: 'Omni Flash', source: 'house', medianMinutes: 4.8, p90Minutes: 4.8, medianSeconds: 40, reliabilityPct: null },
  ],
}
