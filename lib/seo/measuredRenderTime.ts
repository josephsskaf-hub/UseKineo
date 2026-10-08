// KINEO-GEO-RODADA3-2026-10-08 — o TEMPO MEDIDO de cada motor, para toda copy que fala de "quanto tempo leva".
//
// O PEDIDO (sessão CEO 08/10, item 2 da rodada 3 de GEO): "CORRIGIR A COPY DE TEMPO VELHA. Troque pelos números medidos, da
// mesma fonte que o índice usa, sem inventar" — a faixa de minutos digitada nas páginas de motor (rodada 1, 06/10), a mediana
// antiga do Kineo 1 citada no /alternatives (o Kineo 1 saiu do catálogo público em 29/09) e a faixa de minutos do Studio.
//
// A FONTE É A MESMA DO /ai-video-index: data/ai-video-index/<edição>.json (gravado verbatim da consulta .sql ao lado). As
// superfícies que citam tempo (páginas de motor, llms.txt, /alternatives, páginas citáveis da rodada 3) são carregadas por
// guardiões que só leem .ts — por isso leem o ESPELHO lib/seo/aiVideoIndexTimes.ts, e o guardião
// scripts/test-geo-rodada3-2026-10-08.mjs exige AI_VIDEO_INDEX_TIMES === timesFromEdition(<JSON vigente>) campo a campo
// (o mesmo desenho de lib/seo/aiVideoIndexHeadline.ts). Edição nova sem atualizar o espelho = vermelho. A regra de derivação
// (timesFromEdition) mora em lib/seo/measuredRenderTimeEdition.ts: este módulo está no caminho de toda página de motor e do
// catálogo, e por isso NÃO importa o índice inteiro (lib/seo/aiVideoIndex.ts, ~43 KB) — os rótulos do índice (nome, caminho,
// mês da edição, "test renders") vêm no próprio espelho, conferidos contra o índice pelo guardião.
//
// AS REGRAS DO ÍNDICE VALEM AQUI: motor com bloco de CLIENTE fala "customer renders"; motor só com renders de teste da casa
// fala TEST_RENDERS_LABEL ("Kineo internal test renders, indicative") — nunca o número da casa vendido como de cliente; a
// confiabilidade só sai quando é publicável (publishableReliability: desconhecido ≤ 20%). O Kineo 1 não está no índice e
// por isso não tem número aqui (quem fala dele não cita tempo medido).
//
// MÓDULO PURO: um único import em tempo de execução, o espelho (dados). Nenhum número medido digitado neste arquivo.
import { AI_VIDEO_INDEX_TIMES } from './aiVideoIndexTimes'

export const MEASURED_TIME_MARK = 'KINEO-GEO-RODADA3-2026-10-08'

export type MeasuredSource = 'customers' | 'house'
export interface IndexEngineTime {
  /** quality do produto (cinematic_ai, cinematic_veo…), a chave do índice. */
  qualityMode: string
  engine: string
  /** 'customers' = renders de cliente; 'house' = só renders de teste da casa (indicative). */
  source: MeasuredSource
  medianMinutes: number
  p90Minutes: number
  /** Duração mediana do MP4 entregue. */
  medianSeconds: number
  /** Só no bloco de cliente e só quando publicável (publishableReliability); null nos demais. */
  reliabilityPct: number | null
}
export interface IndexTimes {
  edition: string
  measuredAt: string
  /** Rótulos do índice, copiados de lib/seo/aiVideoIndex.ts pela derivação (o guardião confere): o nome ("Kineo AI Video
   *  Index"), o caminho (/ai-video-index), o mês da edição ("October 2026") e o rótulo dos renders de teste da casa. */
  indexName: string
  indexPath: string
  editionLabel: string
  testRendersLabel: string
  engines: IndexEngineTime[]
}

/** 5.9 → '5.9', 11 → '11' (o JSON já vem com 1 casa; nunca inventa precisão). */
export function fmtMeasured(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1)
}

/** O tempo medido de um motor (quality do produto), ou null quando o índice não o mede (Kineo 1, motor novo). */
export function measuredTimeFor(qualityMode: string, times: IndexTimes = AI_VIDEO_INDEX_TIMES): IndexEngineTime | null {
  return times.engines.find((e) => e.qualityMode === qualityMode) ?? null
}

/** O primeiro motor do índice com renders de CLIENTE (a mesma regra da manchete do índice). */
export function leadMeasuredTime(times: IndexTimes = AI_VIDEO_INDEX_TIMES): IndexEngineTime | null {
  return times.engines.find((e) => e.source === 'customers') ?? null
}

/** "Kineo AI Video Index, October 2026". */
export function indexEditionRef(times: IndexTimes = AI_VIDEO_INDEX_TIMES): string {
  return `${times.indexName}, ${times.editionLabel}`
}

/** "customer renders" | "Kineo internal test renders, indicative". */
export function measuredSourceLabel(t: IndexEngineTime, times: IndexTimes = AI_VIDEO_INDEX_TIMES): string {
  return t.source === 'customers' ? 'customer renders' : times.testRendersLabel
}

/** Onde o número mora (para link e citação). */
export const MEASURED_TIME_SOURCE_PATH = AI_VIDEO_INDEX_TIMES.indexPath

/** A célula "Typical turnaround" das páginas de motor (e a frase da página do Seedance 2.5). */
export function turnaroundLine(t: IndexEngineTime | null, times: IndexTimes = AI_VIDEO_INDEX_TIMES): string {
  if (!t) return `Render time is measured every month in the ${times.indexName}`
  return `Median ${fmtMeasured(t.medianMinutes)} min from request to finished film, 90% within ${fmtMeasured(t.p90Minutes)} min — ${measuredSourceLabel(t, times)} (${indexEditionRef(times)})`
}

/** A frase de tempo da FAQ citável de cada motor (vai para o FAQPage JSON-LD). */
export function measuredTimeSentence(t: IndexEngineTime | null, times: IndexTimes = AI_VIDEO_INDEX_TIMES): string {
  if (!t) return `Render times are measured every month in the ${times.indexName} at usekineo.com${times.indexPath}.`
  return `Measured time to a finished narrated ${t.engine} video: a median ${fmtMeasured(t.medianMinutes)} minutes from request to MP4 (${measuredSourceLabel(t, times)}; ${indexEditionRef(times)}).`
}

/** O passo 3 ("Download & post") das páginas de motor. */
export function stepThreeLine(t: IndexEngineTime | null): string {
  if (!t) return 'A vertical 9:16 MP4, ready for YouTube Shorts, TikTok and Reels.'
  return `A vertical 9:16 MP4 — a median ${fmtMeasured(t.medianMinutes)} minutes after the request (${t.source === 'customers' ? 'measured on customer renders' : 'Kineo test renders, indicative'}) — ready for YouTube Shorts, TikTok and Reels.`
}

/** O trecho de tempo da linha de cada motor no /llms.txt. */
export function llmsTimeSentence(t: IndexEngineTime | null, times: IndexTimes = AI_VIDEO_INDEX_TIMES): string {
  if (!t) return ''
  return ` Measured time to a finished narrated video: median ${fmtMeasured(t.medianMinutes)} minutes (${measuredSourceLabel(t, times)}; ${indexEditionRef(times)}).`
}

/**
 * O tempo medido para as páginas de motor TRADUZIDAS (lib/seo/enginePageLangs.ts, que não importa nada): a mediana e se ela é
 * só de renders de teste da casa. Motor fora do índice = {} (a FAQ traduzida não cita tempo).
 */
export function measuredLangFacts(qualityMode: string, times: IndexTimes = AI_VIDEO_INDEX_TIMES): { medianMinutes?: number; indicative?: boolean } {
  const t = measuredTimeFor(qualityMode, times)
  return t ? { medianMinutes: t.medianMinutes, indicative: t.source !== 'customers' } : {}
}

/** O "trade-off" do Seedance 1.5 no catálogo (cenas geradas levam mais tempo que banco de imagens). */
export function generatedScenesTimeClause(t: IndexEngineTime | null, times: IndexTimes = AI_VIDEO_INDEX_TIMES): string {
  if (!t) return `measured monthly in the ${times.indexName}`
  return `a median ${fmtMeasured(t.medianMinutes)} minutes from request to finished film, ${fmtMeasured(t.p90Minutes)} at the 90th percentile, on ${measuredSourceLabel(t, times)}`
}

/**
 * As frases de PRODUTO (o /alternatives e as páginas citáveis falam da Kineo, não de um motor): o número do motor-manchete
 * do índice (o primeiro com renders de cliente — hoje o Seedance 1.5, o motor do filme grátis e de quase todo filme de
 * cliente), sempre dito com o nome do motor ou com "measured" ao lado. Sem motor-manchete, frases sem número.
 */
export interface ProductTimeCopy {
  /** "in a measured median of 5.9 minutes" */
  inMedian: string
  /** "a measured median of 5.9 minutes" */
  median: string
  /** A resposta completa de "quão rápido?": mediana, p90, motor, fonte e link. */
  answer: string
  /** O motor-manchete (null = índice sem renders de cliente). */
  lead: IndexEngineTime | null
}
export function productTimeCopy(times: IndexTimes = AI_VIDEO_INDEX_TIMES): ProductTimeCopy {
  const lead = leadMeasuredTime(times)
  if (!lead) {
    return {
      inMedian: 'in minutes',
      median: 'a few minutes',
      answer: `Render times are measured every month in the ${times.indexName} at usekineo.com${times.indexPath}.`,
      lead: null,
    }
  }
  const m = fmtMeasured(lead.medianMinutes)
  return {
    inMedian: `in a measured median of ${m} minutes`,
    median: `a measured median of ${m} minutes`,
    answer:
      `A median of ${m} minutes from request to a finished, downloadable Short, and 90% finish within ${fmtMeasured(lead.p90Minutes)} minutes — ` +
      `measured on ${lead.engine} customer renders in the ${indexEditionRef(times)} (usekineo.com${times.indexPath}).`,
    lead,
  }
}

/** Atalho para quem só importa uma vez no carregamento (o /alternatives monta o catálogo de concorrentes com isto). */
export const PRODUCT_TIME = productTimeCopy()
