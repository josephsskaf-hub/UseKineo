// KINEO-SUPPLIER-ALARM-2026-08-11 — a SEGUNDA metade do olho: a tendência.
//
// A taxa de falha (lib/supplier/generationHealth.ts) avisa quando o produto JÁ
// parou. Isso já teria evitado 32 das 33 horas do apagão de 09/08 — mas ainda
// é uma notícia ruim chegando tarde. O teto de cota é o único modo de falha do
// render que é 100% PREVISÍVEL: ele não acontece, ele CHEGA, num ritmo que
// medimos todo dia.
//
// Este módulo responde três perguntas por fornecedor, e nada além disso:
//   1. quanto do ciclo já foi consumido
//   2. em que ritmo diário está sendo queimado
//   3. em que DATA acaba, nesse ritmo
//
// ⚠️ SOMENTE LEITURA. Nunca escreve, nunca envia, nunca lança. Alimenta o cron
// de alarme e o painel /admin/supplier-health com o MESMO cálculo — duas telas
// de fornecedor discordando seria pior que uma só, como já aconteceu com o MRR
// (ver o cabeçalho de app/api/admin/ceo/compute.ts).
//
// DE ONDE VÊM OS NÚMEROS DE CUSTO (medidos contra fatura, não estimados):
//   docs/UNIT-ECONOMICS-2026-08-03.md e docs/CAPACIDADE-TAAFT-2026-08-08.md §1
//     · Fast   = 1 crédito  ≈ $0,10  → $0,100/crédito
//     · Seedance = 20 créditos ≈ $2,07 → $0,104/crédito  (dos quais $1,97 = fal)
//     · Creatomate entra em TODO render: $0,074/render
//     · OpenAI entra em TODO render: $0,027/render
//   A conclusão do próprio doc: "não existe motor barato em termos de crédito".
//   Por isso a queima em dólar é derivada de `render_jobs.cost` (créditos), que
//   é o único número que a nossa base guarda de forma confiável por job.

import type { SupabaseClient } from '@supabase/supabase-js'
import { readQuota, cycleStart } from '@/lib/creatomateQuota'

type BurnDb = Pick<SupabaseClient, 'from'>

const DAY_MS = 86_400_000

/** Parcela do fal no custo de um crédito de motor de IA: $1,97 / 20 créditos. */
export const FAL_USD_PER_AI_CREDIT = 0.0985
/** Custo OpenAI por render entregue (TTS + Whisper + script), medido. */
export const OPENAI_USD_PER_RENDER = 0.027
/** Teto mensal da conta OpenAI (tier 1, confirmado em 03/08). */
const OPENAI_MONTHLY_CAP_USD = 100

// `db.max_rows` deste projeto é 1000 (documentado em
// app/api/admin/_shared/db.ts). Pedir 20.000 numa chamada só, como fazia a
// primeira versão, não traz 20.000 — traz 1.000 e mente sobre isso. Em 31 dias
// já existem 442 linhas em `render_jobs`; no ritmo do TAAFT o teto seria
// cruzado, a queima do fal apareceria menor do que é e o painel ficaria
// otimista exatamente na véspera do estouro. Por isso: paginação de verdade.
const RENDER_PAGE = 1_000
const RENDER_HARD_CAP = 40_000

export interface SupplierBurnRow {
  key: 'creatomate' | 'fal' | 'openai'
  label: string
  unit: 'credits' | 'usd'
  cycleLabel: string
  cycleStartIso: string
  /** Fim do ciclo. null = fornecedor pré-pago sem ciclo (fal). */
  cycleEndIso: string | null
  used: number
  /** null = o fornecedor não nos dá um teto legível e o fundador não configurou. */
  limit: number | null
  percentUsed: number | null
  perDay: number
  daysElapsed: number
  daysLeftInCycle: number | null
  /** Data projetada de estouro no ritmo atual. null = não estoura / sem teto. */
  projectedExhaustionIso: string | null
  /** true = no ritmo atual acaba ANTES do fim do ciclo. É este o gatilho do aviso. */
  willBlowBeforeCycleEnd: boolean
  /** De onde saiu o número — para ninguém confundir estimativa com fatura. */
  basis: string
  note: string
}

/**
 * Idade mínima do ciclo antes de acreditar no ritmo.
 *
 * ⚠️ FALSO POSITIVO GARANTIDO, PEGO NA REVISÃO ADVERSARIAL. `readQuota` trava
 * `daysElapsed` num piso de 60 segundos para não dividir por zero. Consequência:
 * às 00:10 do primeiro dia do ciclo, UM vídeo renderizado vira uma queima
 * projetada de ~4.000 créditos/dia, a autonomia cai para 7 dias contra 30 de
 * ciclo, e o aviso de "vai estourar" dispara — TODO MÊS, na virada, sem que
 * nada esteja errado. Um alarme que grita todo dia 10 é um alarme que o
 * fundador silencia antes do dia 9 seguinte.
 *
 * 1,5 dia de amostra basta para o ritmo significar alguma coisa e continua
 * MUITO antes do estrago: no ciclo que estourou em 09/08, o ritmo já denunciava
 * o problema no dia 2 de 31.
 */
const MIN_DAYS_FOR_PROJECTION = 1.5

function projectExhaustion(now: Date, remaining: number, perDay: number): string | null {
  // ⚠️ DIVISÃO POR ZERO. perDay = 0 acontece de verdade (dia sem render, começo
  // de ciclo). Sem esta guarda a projeção viraria Infinity → `new Date(NaN)` →
  // "Invalid Date" no painel e no e-mail.
  if (!Number.isFinite(perDay) || perDay <= 0) return null
  if (!Number.isFinite(remaining)) return null
  if (remaining <= 0) return now.toISOString()
  const days = remaining / perDay
  // Projeção além de 10 anos é ruído aritmético, não informação.
  if (days > 3650) return null
  return new Date(now.getTime() + days * DAY_MS).toISOString()
}

async function creatomateRow(db: BurnDb, now: Date): Promise<SupplierBurnRow | null> {
  const q = await readQuota(db, now)
  if (!q) return null

  const start = new Date(q.cycleStartIso)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)

  const remaining = Math.max(q.planCredits - q.estimatedCredits, 0)
  const projected = projectExhaustion(now, remaining, q.creditsPerDay)

  return {
    key: 'creatomate',
    label: 'Creatomate (render — entra em 100% dos vídeos)',
    unit: 'credits',
    cycleLabel: `ciclo ${q.cycleStartIso.slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
    cycleStartIso: q.cycleStartIso,
    cycleEndIso: end.toISOString(),
    used: Math.round(q.estimatedCredits),
    limit: q.planCredits,
    percentUsed: q.percentUsed,
    perDay: q.creditsPerDay,
    daysElapsed: q.daysElapsed,
    daysLeftInCycle: q.daysLeftInCycle,
    projectedExhaustionIso: projected,
    // Comparação de dias, não de datas: `daysOfRunwayLeft` é Infinity quando a
    // queima é 0, e Infinity < n é false — que é a resposta certa (sem queima,
    // não estoura). O piso de idade impede o falso positivo da virada de ciclo.
    willBlowBeforeCycleEnd: q.daysElapsed >= MIN_DAYS_FOR_PROJECTION && q.daysOfRunwayLeft < q.daysLeftInCycle,
    basis: 'tabela `videos` × fórmula pública do fornecedor × overhead medido (1,115)',
    note: 'O fornecedor não expõe saldo por API. Este é o medidor reconstruído — ver lib/creatomateQuota.ts.',
  }
}

interface RenderJobRow {
  quality: string | null
  cost: number | null
  created_at: string | null
}

async function readRenderJobs(db: BurnDb, sinceIso: string): Promise<RenderJobRow[] | null> {
  const out: RenderJobRow[] = []
  for (let from = 0; from < RENDER_HARD_CAP; from += RENDER_PAGE) {
    const { data, error } = await db
      .from('render_jobs')
      .select('quality, cost, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(from, from + RENDER_PAGE - 1)
    if (error || !Array.isArray(data)) {
      console.warn('[supplier-burn] leitura de render_jobs falhou:', error?.message ?? 'sem dados')
      // Página parcial ainda é melhor que nada — mas SÓ se já tivermos alguma.
      // Zero linhas com erro é indistinguível de "ninguém renderizou", e essa
      // confusão faria o painel mostrar queima zero durante uma pane do banco.
      return out.length > 0 ? out : null
    }
    const batch = data as unknown as RenderJobRow[]
    out.push(...batch)
    if (batch.length < RENDER_PAGE) break
  }
  return out
}

function falRow(jobs: RenderJobRow[], now: Date): SupplierBurnRow {
  const since30 = now.getTime() - 30 * DAY_MS
  const since7 = now.getTime() - 7 * DAY_MS

  let usd30 = 0
  let usd7 = 0
  for (const j of jobs) {
    // `fast` não toca o fal — é stock + TTS. Contá-lo aqui inflaria a queima do
    // fal em ~20× e transformaria o painel numa fábrica de susto.
    if ((j.quality ?? 'fast') === 'fast') continue
    const t = j.created_at ? Date.parse(j.created_at) : NaN
    if (!Number.isFinite(t) || t < since30) continue
    const credits = Number.isFinite(j.cost) && (j.cost ?? 0) > 0 ? (j.cost as number) : 20
    const usd = credits * FAL_USD_PER_AI_CREDIT
    usd30 += usd
    if (t >= since7) usd7 += usd
  }

  // Ritmo de 7 dias, não de 30: o fal é o fornecedor de PICO (o doc de
  // capacidade diz isso com todas as letras) e uma média de 30 dias esconderia
  // exatamente o pico que interessa.
  const perDay = usd7 / 7

  const rawBalance = Number(process.env.KINEO_FAL_BALANCE_USD ?? '')
  const limit = Number.isFinite(rawBalance) && rawBalance > 0 ? rawBalance : null
  const projected = limit === null ? null : projectExhaustion(now, limit, perDay)

  return {
    key: 'fal',
    label: 'fal.ai (motores de IA — pré-pago)',
    unit: 'usd',
    cycleLabel: 'últimos 30 dias (pré-pago, sem ciclo)',
    cycleStartIso: new Date(since30).toISOString(),
    cycleEndIso: null,
    used: Number(usd30.toFixed(2)),
    limit,
    percentUsed: limit === null || limit <= 0 ? null : (usd30 / limit) * 100,
    perDay: Number(perDay.toFixed(2)),
    daysElapsed: 30,
    daysLeftInCycle: null,
    projectedExhaustionIso: projected,
    // Sem ciclo não existe "estourar antes do fim do ciclo". O critério
    // equivalente para um pré-pago é: o saldo informado não cobre 7 dias.
    willBlowBeforeCycleEnd: limit !== null && perDay > 0 && limit / perDay < 7,
    basis: '`render_jobs` não-fast × $0,0985/crédito (parcela do fal em $2,07 por Seedance de 20 cr)',
    note:
      limit === null
        ? 'Saldo do fal NÃO é legível por API. Defina KINEO_FAL_BALANCE_USD na Vercel depois de recarregar para ganhar a data de estouro.'
        : 'Saldo veio de KINEO_FAL_BALANCE_USD (informado pelo fundador), não do fornecedor — reconfira ao recarregar.',
  }
}

function openaiRow(jobs: RenderJobRow[], now: Date): SupplierBurnRow {
  // Ciclo de faturamento da OpenAI = mês-calendário.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const startMs = start.getTime()

  let renders = 0
  for (const j of jobs) {
    const t = j.created_at ? Date.parse(j.created_at) : NaN
    if (!Number.isFinite(t) || t < startMs) continue
    renders++
  }
  const used = renders * OPENAI_USD_PER_RENDER
  const daysElapsed = Math.max((now.getTime() - startMs) / DAY_MS, 1 / 24)
  const perDay = used / daysElapsed
  const daysLeftInCycle = Math.max((end.getTime() - now.getTime()) / DAY_MS, 0)
  const remaining = Math.max(OPENAI_MONTHLY_CAP_USD - used, 0)
  const projected = projectExhaustion(now, remaining, perDay)

  return {
    key: 'openai',
    label: 'OpenAI (script + TTS + Whisper)',
    unit: 'usd',
    cycleLabel: `mês ${start.toISOString().slice(0, 7)}`,
    cycleStartIso: start.toISOString(),
    cycleEndIso: end.toISOString(),
    used: Number(used.toFixed(2)),
    limit: OPENAI_MONTHLY_CAP_USD,
    percentUsed: (used / OPENAI_MONTHLY_CAP_USD) * 100,
    perDay: Number(perDay.toFixed(2)),
    daysElapsed,
    daysLeftInCycle,
    projectedExhaustionIso: projected,
    // Mesmo piso de idade do Creatomate: no dia 1 do mês, `daysElapsed` é uma
    // fração de dia e qualquer render vira uma projeção catastrófica.
    willBlowBeforeCycleEnd:
      daysElapsed >= MIN_DAYS_FOR_PROJECTION && perDay > 0 && remaining / perDay < daysLeftInCycle,
    basis: '`render_jobs` × $0,027/render, contra o teto de auto-reload de $100/mês (tier 1)',
    // Dito explicitamente porque um número que parece completo e não é vale
    // menos que um número honestamente rotulado como piso.
    note: 'É um PISO: não conta scripts que nunca viraram render, nem a demo pública da landing.',
  }
}

/**
 * Uma linha por fornecedor. Nunca lança; devolve o que conseguiu medir.
 */
export async function readSupplierBurn(db: BurnDb, now: Date = new Date()): Promise<SupplierBurnRow[]> {
  try {
    const since = new Date(now.getTime() - 31 * DAY_MS).toISOString()
    const [creatomate, jobs] = await Promise.all([creatomateRow(db, now), readRenderJobs(db, since)])
    const rows: SupplierBurnRow[] = []
    if (creatomate) rows.push(creatomate)
    if (jobs) {
      rows.push(falRow(jobs, now))
      rows.push(openaiRow(jobs, now))
    }
    return rows
  } catch (e) {
    console.warn('[supplier-burn] readSupplierBurn lançou:', e instanceof Error ? e.message : String(e))
    return []
  }
}

/** Reexportado para o painel dizer de que ciclo está falando sem recalcular. */
export { cycleStart }
