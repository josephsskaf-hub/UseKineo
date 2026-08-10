// KINEO-CREATOMATE-QUOTA-METER-2026-08-10 — o medidor de cota que o
// fornecedor não nos dá.
//
// O QUE ACONTECEU (medido, com as duas pontas conferidas):
//
//   · Painel do Creatomate em 10/08 22:0xZ, textual: "Credit Usage — 10.0K of
//     10.0K credits used — 100%".
//   · Último vídeo concluído da empresa: 09/08 16:21:08Z. Produto parado por
//     30 horas, 173 eventos `generation_stage_error`, 30 cadastros novos
//     durante o apagão — nenhum deles conseguiu um vídeo.
//   · Ninguém foi avisado, porque NÃO EXISTIA aviso: o `lib/creatomateAlert.ts`
//     (nascido no mesmo dia) dispara quando o fornecedor JÁ está recusando.
//     Ou seja, o melhor alarme que tínhamos toca depois do incidente começar.
//
// A diferença que este arquivo faz: o teto de cota é o ÚNICO modo de falha do
// render que é 100% previsível. Ele não acontece — ele CHEGA, num ritmo que
// medimos todo dia. Um alarme em 80% teria tocado em 08/08 de manhã, com o
// produto ainda de pé e 2 dias de folga para agir.
//
// COMO ELE MEDE SEM API DE COTA (o fornecedor não expõe saldo por API — a
// verificação foi feita: GET /v1/renders devolve 404, não há endpoint de conta):
//
//   Reconstruímos a conta do fornecedor a partir da NOSSA tabela `videos`, com
//   a fórmula pública dele (lib/renderProfile.ts):
//       créditos = width × height × fps × segundos / 1e8
//
//   Validação contra a verdade conhecida, ciclo de agosto (01/08 → 09/08):
//       309 vídeos `completed`, 14.415 segundos
//       1080×1920×30×14.415/1e8 = 8.967,3 créditos estimados
//       painel do fornecedor no mesmo instante ................ 10.000
//       razão real/estimado ................................... 1,115
//
//   A diferença de 11,5% NÃO é erro de fórmula — é o que a nossa tabela não vê:
//   renders que falharam depois de consumir pixels, jobs abandonados, a rota
//   legada `/api/render` e os testes internos. Por isso o medidor multiplica
//   pelo OVERHEAD_FACTOR medido (1,115) em vez de fingir precisão. Um medidor
//   que subestima em 11,5% é um medidor que toca tarde demais — e tarde demais
//   é o defeito que estamos consertando.
//
// ⚠️ ESTE MÓDULO NUNCA LANÇA E NUNCA BLOQUEIA UM RENDER. Ele é chamado depois
// de uma submissão BEM-SUCEDIDA, fire-and-forget. Um medidor com bug não pode
// ser o motivo de um vídeo não sair — seria a segunda vez que a instrumentação
// causa o dano que veio medir.
//
// ⚠️ LIMITE CONHECIDO, DITO AQUI PARA NINGUÉM SE ILUDIR DEPOIS: como o gancho
// vive no caminho de SUCESSO do compose, o patamar de 100% praticamente nunca
// dispara por ele — quando a cota zera, nenhuma submissão dá certo e o gancho
// deixa de ser alcançado. Isso é aceitável porque o 100% já tem dono
// (`lib/creatomateAlert.ts`, que toca na recusa). Os patamares que este arquivo
// existe para entregar são o de 80% e o de 95%, e esses tocam com o produto
// ainda de pé — que é o ponto inteiro. `readQuota` é exportada justamente para
// que um cron possa cobrir o 100% sem depender de um render bem-sucedido.

import type { SupabaseClient } from '@supabase/supabase-js'
import { creditsForSeconds, renderProfile, creditsPerSecond } from '@/lib/renderProfile'

// Razão medida entre o contador do fornecedor e a soma dos vídeos ENTREGUES.
// Recalcular sempre que houver um número real do painel: é a única constante
// aqui que degrada com o tempo.
const DEFAULT_OVERHEAD_FACTOR = 1.115

const DEFAULT_PLAN_CREDITS = 10_000
// O ciclo do Growth 10K vira no dia 1 (fatura de 01/08, renovação 01/09).
const DEFAULT_CYCLE_DAY = 1

// 80 = agir com folga · 95 = últimas horas · 100 = já parou (o alarme ainda
// vale: distingue "teto" de "fornecedor fora", que têm ações opostas).
const THRESHOLDS = [80, 95, 100] as const

const CHECK_THROTTLE_MS = 15 * 60 * 1000
const ALERT_EVENT = 'creatomate_quota_alert'

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  if (!raw || raw.trim() === '') return fallback
  const n = Number(raw.trim())
  if (!Number.isFinite(n) || n < min || n > max) {
    console.warn(`[creatomate-quota] ${name}="${raw}" inválido — usando ${fallback}`)
    return fallback
  }
  return n
}

/** Início do ciclo de faturamento vigente, em UTC. */
export function cycleStart(now: Date = new Date()): Date {
  const day = intFromEnv('KINEO_CREATOMATE_CYCLE_DAY', DEFAULT_CYCLE_DAY, 1, 28)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 0, 0, 0))
  // Antes do dia de virada, o ciclo vigente começou no mês passado.
  if (d.getTime() > now.getTime()) d.setUTCMonth(d.getUTCMonth() - 1)
  return d
}

export type QuotaReading = {
  cycleStartIso: string
  videos: number
  seconds: number
  estimatedCredits: number
  planCredits: number
  percentUsed: number
  creditsPerDay: number
  daysElapsed: number
  /** Dias de autonomia restantes no ritmo atual. Infinity se a queima for 0. */
  daysOfRunwayLeft: number
  /** Dias que faltam para o fim do ciclo. */
  daysLeftInCycle: number
}

// O cliente admin que o compose já tem em mãos. Tipado de verdade em vez de
// um `as never` no call site: o cast escondia justamente a classe de erro que
// derrubaria o medidor em produção sem o tsc reclamar.
type QuotaDb = Pick<SupabaseClient, 'from'>

const VIDEO_ROW_LIMIT = 20_000

/**
 * Lê o consumo do ciclo. Somente leitura, nunca lança — devolve `null` se não
 * conseguir medir (o chamador simplesmente não alerta).
 */
export async function readQuota(db: QuotaDb, now: Date = new Date()): Promise<QuotaReading | null> {
  try {
    const start = cycleStart(now)
    const planCredits = intFromEnv('KINEO_CREATOMATE_PLAN_CREDITS', DEFAULT_PLAN_CREDITS, 100, 10_000_000)
    const overhead = Number(process.env.KINEO_CREATOMATE_OVERHEAD_FACTOR ?? DEFAULT_OVERHEAD_FACTOR)
    const factor = Number.isFinite(overhead) && overhead >= 1 && overhead <= 3 ? overhead : DEFAULT_OVERHEAD_FACTOR

    const { data, error } = await db
      .from('videos')
      .select('duration, duration_seconds')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .limit(VIDEO_ROW_LIMIT)

    if (error || !Array.isArray(data)) {
      console.warn('[creatomate-quota] leitura falhou:', error?.message ?? 'sem dados')
      return null
    }

    if (data.length >= VIDEO_ROW_LIMIT) {
      // Truncou: a estimativa vira um PISO ainda mais frouxo. Dizer isso em log
      // é melhor que devolver um numero que parece completo e nao e.
      console.warn(
        `[creatomate-quota] leitura truncada em ${VIDEO_ROW_LIMIT} linhas — ` +
          'a estimativa esta SUBcontando o ciclo',
      )
    }

    let seconds = 0
    for (const row of data as Array<{ duration: number | null; duration_seconds: number | null }>) {
      const s = row.duration || row.duration_seconds || 0
      if (Number.isFinite(s) && s > 0) seconds += s
    }

    const estimatedCredits = creditsForSeconds(seconds) * factor
    const percentUsed = (estimatedCredits / planCredits) * 100

    const msElapsed = Math.max(now.getTime() - start.getTime(), 60_000)
    const daysElapsed = msElapsed / 86_400_000
    const creditsPerDay = estimatedCredits / daysElapsed

    const nextCycle = new Date(start)
    nextCycle.setUTCMonth(nextCycle.getUTCMonth() + 1)
    const daysLeftInCycle = Math.max((nextCycle.getTime() - now.getTime()) / 86_400_000, 0)

    return {
      cycleStartIso: start.toISOString(),
      videos: data.length,
      seconds,
      estimatedCredits,
      planCredits,
      percentUsed,
      creditsPerDay,
      daysElapsed,
      daysOfRunwayLeft: creditsPerDay > 0 ? Math.max(planCredits - estimatedCredits, 0) / creditsPerDay : Infinity,
      daysLeftInCycle,
    }
  } catch (e) {
    console.warn('[creatomate-quota] readQuota lançou:', e instanceof Error ? e.message : String(e))
    return null
  }
}

let LAST_CHECK = 0
// Guarda por instância: se o INSERT de dedupe falhar, isto ainda impede um
// e-mail a cada 15 min pela mesma lambda.
const ALERTED_IN_PROCESS = new Set<string>()

/**
 * Mede e, se cruzou um patamar novo neste ciclo, alerta UMA vez.
 * Fire-and-forget. Nunca lança.
 */
export async function checkCreatomateQuota(db: QuotaDb, now: Date = new Date()): Promise<void> {
  try {
    if (now.getTime() - LAST_CHECK < CHECK_THROTTLE_MS) return
    LAST_CHECK = now.getTime()

    const q = await readQuota(db, now)
    if (!q) return

    const crossed = THRESHOLDS.filter((t) => q.percentUsed >= t).pop()
    if (!crossed) return

    const dedupeKey = `${q.cycleStartIso}:${crossed}`
    if (ALERTED_IN_PROCESS.has(dedupeKey)) return

    // Dedupe durável: um evento por patamar por ciclo. UMA consulta — a versão
    // anterior deste bloco fazia duas (uma para saber se havia algo, outra para
    // ler o metadata), o que é um round-trip a mais no caminho quente para
    // responder a mesma pergunta.
    const { data: prior } = await db
      .from('events')
      .select('metadata')
      .eq('name', ALERT_EVENT)
      .gte('created_at', q.cycleStartIso)
      .limit(50)

    const already = (prior ?? []).some(
      (r: { metadata: { threshold?: number } | null }) => Number(r?.metadata?.threshold) === crossed,
    )
    if (already) {
      ALERTED_IN_PROCESS.add(dedupeKey)
      return
    }

    ALERTED_IN_PROCESS.add(dedupeKey)
    await sendQuotaAlert(q, crossed)

    try {
      await db.from('events').insert({
        user_id: null,
        name: ALERT_EVENT,
        path: '/api/compose',
        metadata: {
          threshold: crossed,
          cycle_start: q.cycleStartIso,
          percent_used: Number(q.percentUsed.toFixed(1)),
          estimated_credits: Math.round(q.estimatedCredits),
          plan_credits: q.planCredits,
          credits_per_day: Math.round(q.creditsPerDay),
          days_of_runway_left: Number(q.daysOfRunwayLeft.toFixed(1)),
          profile: renderProfile(),
        },
      })
    } catch (e) {
      console.warn('[creatomate-quota] marcador de dedupe falhou:', e instanceof Error ? e.message : String(e))
    }
  } catch (e) {
    console.warn('[creatomate-quota] checkCreatomateQuota lançou:', e instanceof Error ? e.message : String(e))
  }
}

async function sendQuotaAlert(q: QuotaReading, threshold: number): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_resend_api_key_here') return
    const from = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'

    const p = renderProfile()
    const perSecond = creditsPerSecond(p)
    const runway = q.daysOfRunwayLeft === Infinity ? '∞' : q.daysOfRunwayLeft.toFixed(1)
    const vaiEstourar = q.daysOfRunwayLeft < q.daysLeftInCycle

    const subject =
      threshold >= 100
        ? '🚨 Kineo: cota do Creatomate ESTOURADA — nenhum vídeo vai renderizar'
        : threshold >= 95
          ? `🚨 Kineo: ${q.percentUsed.toFixed(0)}% da cota do Creatomate — horas até parar`
          : `⚠️ Kineo: ${q.percentUsed.toFixed(0)}% da cota do Creatomate consumida`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: ['josephsskaf@gmail.com'],
        subject,
        text:
          `Cota do Creatomate no ciclo iniciado em ${q.cycleStartIso.slice(0, 10)}:\n\n` +
          `  consumido (estimado) .... ${Math.round(q.estimatedCredits).toLocaleString('pt-BR')} de ${q.planCredits.toLocaleString('pt-BR')} créditos (${q.percentUsed.toFixed(1)}%)\n` +
          `  vídeos entregues ........ ${q.videos} (${Math.round(q.seconds).toLocaleString('pt-BR')} s)\n` +
          `  queima .................. ${Math.round(q.creditsPerDay).toLocaleString('pt-BR')} créditos/dia\n` +
          `  autonomia restante ...... ${runway} dias\n` +
          `  faltam no ciclo ......... ${q.daysLeftInCycle.toFixed(1)} dias\n` +
          `  perfil de output ........ ${p.width}×${p.height}@${p.fps} (${perSecond.toFixed(5)} cr/s)\n\n` +
          (vaiEstourar
            ? `PROJEÇÃO: no ritmo atual a cota acaba ANTES do fim do ciclo — faltam ${q.daysLeftInCycle.toFixed(1)} dias e há ${runway} de autonomia.\n\n`
            : `PROJEÇÃO: no ritmo atual a cota cobre o resto do ciclo.\n\n`) +
          'DUAS AÇÕES POSSÍVEIS (a primeira custa dinheiro, a segunda não):\n' +
          '  1. Subir o plano em creatomate.com → Credit Usage → Subscription.\n' +
          '  2. Baixar o perfil de output pelas envs KINEO_RENDER_WIDTH / _HEIGHT / _FPS\n' +
          '     na Vercel (720×1280@30 corta 56% da conta; 720×1280@24 corta 64%).\n' +
          '     Não precisa de commit — só redeploy.\n\n' +
          'A estimativa vem da nossa tabela `videos` com a fórmula pública do fornecedor,\n' +
          'multiplicada pelo fator de overhead medido (renders falhos e testes que a\n' +
          'nossa tabela não vê). Em 10/08 a estimativa deu 8.967 e o painel marcava\n' +
          '10.000 — o fator existe por causa dessa diferença.\n\n' +
          'Um alarme por patamar por ciclo (80% / 95% / 100%).',
      }),
    })
    console.error(`[creatomate-quota] ALERTA ${threshold}% enviado — ${q.percentUsed.toFixed(1)}% consumido`)
  } catch (e) {
    console.error('[creatomate-quota] envio do alerta falhou:', e instanceof Error ? e.message : String(e))
  }
}
