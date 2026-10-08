// KINEO-GEO-RODADA3-2026-10-08 — a REGRA DE DERIVAÇÃO do espelho lib/seo/aiVideoIndexTimes.ts a partir de uma edição do
// Kineo AI Video Index (data/ai-video-index/<edição>.json). Fica FORA de lib/seo/measuredRenderTime.ts de propósito: quem
// cita tempo (páginas de motor nas 14 línguas, catálogo, /llms.txt) lê só o espelho e não paga, a cada carga, o módulo inteiro
// do índice (lib/seo/aiVideoIndex.ts, ~43 KB). Edição nova = rodar isto sobre o JSON novo e gravar o resultado no espelho; o
// guardião scripts/test-geo-rodada3-2026-10-08.mjs exige espelho === timesFromEdition(<JSON vigente>), campo a campo.
// As regras do índice valem: renders de CLIENTE quando a edição os tem (confiabilidade só quando publicável, desconhecido
// ≤ 20%); senão os de teste da casa ('house', indicativo). Sem volume.
import { AI_VIDEO_INDEX_NAME, AI_VIDEO_INDEX_PATH, INDEX_ENGINES, TEST_RENDERS_LABEL, editionLabel, publishableReliability, type IndexEdition } from './aiVideoIndex'
import type { IndexEngineTime, IndexTimes } from './measuredRenderTime'

export function timesFromEdition(edition: IndexEdition): IndexTimes {
  const engines: IndexEngineTime[] = []
  for (const meta of INDEX_ENGINES) {
    const rec = edition.engines.find((e) => e.qualityMode === meta.qualityMode)
    if (!rec) continue
    if (rec.customers) {
      engines.push({
        qualityMode: meta.qualityMode,
        engine: meta.name,
        source: 'customers',
        medianMinutes: rec.customers.minutesToFilm.median,
        p90Minutes: rec.customers.minutesToFilm.p90,
        medianSeconds: rec.customers.durationSeconds.median,
        reliabilityPct: publishableReliability(rec.customers.reliability),
      })
    } else if (rec.house) {
      engines.push({
        qualityMode: meta.qualityMode,
        engine: meta.name,
        source: 'house',
        medianMinutes: rec.house.minutesToFilm.median,
        p90Minutes: rec.house.minutesToFilm.p90,
        medianSeconds: rec.house.durationSeconds.median,
        reliabilityPct: null,
      })
    }
  }
  return {
    edition: edition.edition,
    measuredAt: edition.measuredAt,
    indexName: AI_VIDEO_INDEX_NAME,
    indexPath: AI_VIDEO_INDEX_PATH,
    editionLabel: editionLabel(edition.edition),
    testRendersLabel: TEST_RENDERS_LABEL,
    engines,
  }
}
