// KINEO-SUPPLIER-ALARM-2026-08-11 — O OLHO.
//
// A empresa ficou fora do ar DUAS vezes em 11 dias por saldo de fornecedor, e
// nas duas ninguém foi avisado:
//
//   · 31/07 11:07Z — crédito da OpenAI zerou. 163 gerações, 116 falhas, 16% de
//     sucesso no dia de maior tráfego pago da história (65 cadastros do TAAFT).
//   · 09/08 17:00Z → 11/08 02:00Z — ~33 horas com o Creatomate recusando todo
//     job porque os 10.000 créditos do plano acabaram. 76 gerações num único
//     dia, ZERO vídeos. 23 dos 92 trials ativos queimaram prazo. Descoberto
//     porque o FUNDADOR PERGUNTOU, não por alarme.
//
// Nos dois casos o código estava certo. O defeito era não ter olho.
//
// O QUE ESTE CRON FAZ, DE HORA EM HORA, EM DUAS CAMADAS:
//
//   CAMADA 1 — SINTOMA (lib/supplier/generationHealth.ts).
//     Mede taxa de falha da geração e alerta quando o produto para de
//     entregar, SEJA QUAL FOR A CAUSA. Não pergunta saldo a ninguém: saldo de
//     fornecedor nem sempre é legível por API, o sintoma sempre é. Por isso
//     cobre também a próxima causa, a que ainda não aconteceu.
//
//   CAMADA 2 — TENDÊNCIA (lib/supplier/burn.ts + lib/creatomateQuota.ts).
//     Mede o ritmo de queima e avisa quando a projeção estoura a cota ANTES do
//     fim do ciclo. É o aviso que teria chegado com DIAS de antecedência no
//     incidente #2, com o produto ainda de pé.
//
// PROVA DE QUE PEGARIA OS DOIS (contagens reais de `events`, por hora; o cron
// roda no minuto 7, então a janela avaliada é rolante, não a hora cheia):
//   31/07 — apagão começou 11:07Z. A rodada das 12:07Z vê 9 tentativas, 3
//     pessoas e 0 entregas: acendem as regras (a) e (b). ⇒ ~60 min, contra as
//     ~14 horas reais.
//   09/08 — apagão começou ~17:00Z. A rodada das 17:07Z vê 11 tentativas, 1
//     entrega e 8 falhas (73%): acende a regra (a). ⇒ ~1 hora, contra as ~33
//     horas reais. E a camada 2 teria avisado DIAS antes, por projeção.
//
// Detalhe medido que mudou o desenho: entre 20:00Z de 09/08 e 02:00Z de 10/08,
// nenhuma hora isolada chegou a 5 tentativas (2, 0, 3, 2, 1, 2). Um alarme só
// de 1 hora ficaria MUDO a madrugada inteira. Somadas, as 6 horas dão 10
// tentativas e 0 entregas — e é por isso que existe a segunda janela.
//
// ⚠️ NÃO TOCA EM DINHEIRO. Nenhum preço, nenhum crédito, nenhum entitlement,
// nenhuma cobrança, nenhum bloqueio de render. Este endpoint só LÊ o produto e
// ESCREVE marcadores de alarme em `events`.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { readGenerationHealth, describeRules, type GenerationHealth } from '@/lib/supplier/generationHealth'
import { readSupplierBurn, type SupplierBurnRow } from '@/lib/supplier/burn'
import { checkCreatomateQuota } from '@/lib/creatomateQuota'
import {
  readStorageCapacity,
  maybeAlertStorageThreshold,
  maybeAlertStorageProjection,
} from '@/lib/supplier/storageCapacity'
import { notifyFounder } from '@/lib/supplier/notify'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FIRED_EVENT = 'supplier_alarm_fired'
const REMINDER_EVENT = 'supplier_alarm_reminder'
const CLEARED_EVENT = 'supplier_alarm_cleared'
const PROJECTION_EVENT = 'supplier_burn_projection'

const HOUR_MS = 3_600_000

/**
 * A TRAVA: um alerta por INCIDENTE, não um por hora.
 *
 * Sem isto, as 33 horas de 09/08 teriam virado 33 e-mails idênticos — e um
 * fundador que recebe 33 e-mails iguais cria uma regra de filtro, que é como um
 * alarme morre de verdade. O incidente fica ABERTO enquanto o último
 * `supplier_alarm_fired` for mais novo que o último `supplier_alarm_cleared`.
 *
 * O LEMBRETE (a cada 6h, no máximo 4) é uma exceção CONSCIENTE à regra de "um
 * por incidente". Motivo medido: o apagão #2 durou 33 horas e atravessou duas
 * madrugadas. Um único e-mail às 17:00Z que o fundador não viu antes de dormir
 * teria produzido exatamente o resultado que já tivemos — descoberta manual no
 * dia seguinte. Quatro lembretes cobrem ~24h de incidente e continuam sendo
 * 5 e-mails em 33 horas, não 33.
 */
const REMINDER_HOURS = 6
const MAX_REMINDERS = 4

function isAuthorized(req: NextRequest): boolean {
  // Fail-closed (padrão KINEO-CRON-FAILCLOSED-2026-07-27): sem segredo
  // configurado, o endpoint é fechado, não aberto.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

interface AlarmRow {
  name: string
  created_at: string
  metadata: { incident_key?: unknown } | null
}

function fmtPct(v: number | null): string {
  return v === null ? 'n/d' : `${v.toFixed(1)}%`
}

function fmtDate(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') + 'Z' : '—'
}

function burnLines(rows: SupplierBurnRow[]): string {
  if (rows.length === 0) return '  (não foi possível medir o consumo agora)\n'
  return rows
    .map((r) => {
      const limit = r.limit === null ? 'teto desconhecido' : r.limit.toLocaleString('pt-BR')
      const used = r.unit === 'usd' ? `$${r.used.toFixed(2)}` : Math.round(r.used).toLocaleString('pt-BR')
      const perDay = r.unit === 'usd' ? `$${r.perDay.toFixed(2)}/dia` : `${Math.round(r.perDay).toLocaleString('pt-BR')} cr/dia`
      return (
        `  ${r.label}\n` +
        `    ${r.cycleLabel}: ${used} de ${limit} (${fmtPct(r.percentUsed)}) · ${perDay}\n` +
        `    estouro projetado: ${fmtDate(r.projectedExhaustionIso)}` +
        (r.willBlowBeforeCycleEnd ? '  ⚠️ ANTES DO FIM DO CICLO' : '')
      )
    })
    .join('\n')
}

function alarmBody(health: GenerationHealth, burn: SupplierBurnRow[], reminderIndex: number): string {
  const w = health.firedWindow
  const head =
    reminderIndex > 0
      ? `LEMBRETE ${reminderIndex}/${MAX_REMINDERS} — o produto CONTINUA sem entregar vídeo.\n\n`
      : 'O produto PAROU DE ENTREGAR VÍDEO.\n\n'

  const detail = w
    ? `Janela: ${w.label} (desde ${fmtDate(w.sinceIso)})\n` +
      `  tentativas ............ ${w.attempts} (de ${w.distinctUsers} pessoa(s) distintas)\n` +
      `  vídeos entregues ...... ${w.completed}\n` +
      `  falhas ................ ${w.failed} (${fmtPct(w.failureRatePct)})\n` +
      `  erros de etapa ........ ${w.stageErrors}\n` +
      `  motivo mais repetido .. ${w.topReason ?? '—'}${w.topReasonCount ? ` (${w.topReasonCount}x)` : ''}\n` +
      `  regra(s) que acenderam: ${describeRules(w.triggered)}\n`
    : ''

  return (
    head +
    detail +
    '\nCONSUMO DOS FORNECEDORES AGORA:\n' +
    burnLines(burn) +
    '\n\nONDE OLHAR, NESTA ORDEM (as duas causas dos últimos dois apagões):\n' +
    '  1. Creatomate — creatomate.com → Credit Usage. Cota do plano zerada = todo\n' +
    '     job volta com "Render service rejected the job". Foi o apagão de 33h de 09/08.\n' +
    '  2. OpenAI — platform.openai.com/settings/organization/billing. Saldo zerado\n' +
    '     mata script, TTS e Whisper. Foi o apagão de 31/07.\n' +
    '  3. fal.ai — fal.ai/dashboard/billing (só afeta motores de IA, não o Fast).\n' +
    '  4. Vercel → Observability → Runtime Logs, se os três saldos estiverem de pé.\n' +
    '\nPainel com a mesma conta: /admin/supplier-health\n' +
    '\nEste alarme dispara pelo SINTOMA (taxa de falha), não pelo saldo — ele acende\n' +
    'mesmo que a causa seja uma que nunca aconteceu antes.\n' +
    `Um alerta por incidente, mais lembrete a cada ${REMINDER_HOURS}h enquanto durar (máx. ${MAX_REMINDERS}).\n` +
    'Você recebe um "voltou ao normal" quando resolver.'
  )
}

/**
 * CAMADA 2 — o aviso que chega ANTES do apagão.
 *
 * `checkCreatomateQuota` avisa por PATAMAR consumido (70/80/95/100%). Esta
 * função avisa por PROJEÇÃO: no ritmo de hoje, a cota acaba antes do fim do
 * ciclo — mesmo que o percentual ainda esteja baixo. As duas coisas são
 * diferentes e a segunda chega primeiro num pico. No apagão #2 o ciclo tinha
 * 31 dias e a queima entregava 8,6 dias de autonomia: a projeção teria gritado
 * no dia 2 do ciclo, com 09/08 ainda a uma semana de distância.
 *
 * Um aviso por fornecedor por ciclo. Nunca lança.
 */
async function maybeAlertProjection(
  admin: SupabaseClient,
  burn: SupplierBurnRow[],
  now: Date,
): Promise<string[]> {
  const sent: string[] = []
  try {
    const doomed = burn.filter((r) => r.willBlowBeforeCycleEnd && r.perDay > 0)
    if (doomed.length === 0) return sent

    for (const row of doomed) {
      const cycleKey = `${row.key}:${row.cycleStartIso.slice(0, 10)}`
      const { error } = await admin.from('events').insert({
        user_id: null,
        name: PROJECTION_EVENT,
        path: '/api/cron/supplier-watch',
        metadata: {
          cycle_key: cycleKey,
          supplier: row.key,
          used: row.used,
          limit: row.limit,
          percent_used: row.percentUsed === null ? null : Number(row.percentUsed.toFixed(1)),
          per_day: row.perDay,
          projected_exhaustion: row.projectedExhaustionIso,
        },
      })
      // 23505 = já avisamos deste fornecedor neste ciclo. Nada a fazer.
      if (error) {
        if (error.code !== '23505') {
          console.warn(`[supplier-watch] marcador de projeção falhou: ${error.code ?? '?'} ${error.message}`)
        }
        continue
      }
      const notified = await notifyFounder(
        `⚠️ Kineo: no ritmo atual o ${row.key.toUpperCase()} estoura ANTES do fim do ciclo`,
        `A cota não acabou ainda — mas a projeção diz que vai acabar cedo.\n\n` +
          burnLines([row]) +
          '\n\nFOI EXATAMENTE ASSIM QUE 09/08 ACONTECEU: o ciclo tinha 31 dias e a queima\n' +
          'entregava 8,6 dias de autonomia. Ninguém mediu o ritmo, então a cota estourou\n' +
          'no dia 9 e o produto ficou 33 horas sem renderizar UM vídeo.\n\n' +
          'DUAS AÇÕES (a primeira custa dinheiro, a segunda não):\n' +
          '  1. Subir o plano em creatomate.com → Credit Usage → Subscription.\n' +
          '  2. Baixar o perfil de output pelas envs KINEO_RENDER_WIDTH / _HEIGHT / _FPS\n' +
          '     na Vercel (sem commit, só redeploy). A tabela de autonomia por perfil\n' +
          '     está no cabeçalho de lib/renderProfile.ts.\n\n' +
          'Um aviso de projeção por fornecedor por ciclo. Painel: /admin/supplier-health',
      )
      // Mesma compensação do alarme de incidente: marcador que sobrevive a um
      // envio que não saiu é um "já avisei" mentiroso, e este aqui vale por um
      // CICLO INTEIRO — 30 dias de silêncio por um 429.
      if (!notified.delivered) {
        await admin.from('events').delete().eq('name', PROJECTION_EVENT).eq('metadata->>cycle_key', cycleKey)
        console.error(`[supplier-watch] 🔴 aviso de projeção de ${row.key} não chegou — marcador desfeito, retenta`)
        continue
      }
      sent.push(row.key)
      console.warn(`[supplier-watch] PROJEÇÃO DE ESTOURO alertada para ${row.key} (${cycleKey})`)
    }
  } catch (e) {
    console.warn('[supplier-watch] maybeAlertProjection lançou:', e instanceof Error ? e.message : String(e))
  }
  return sent
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }

  // Leitura sem cache: este job decide "já avisei?" lendo o banco, e leitura
  // velha aqui vira alarme repetido — o mesmo defeito documentado em
  // app/api/cron/send-cap-hit/route.ts.
  //
  // A anotação de tipo é explícita, igual a app/api/compose/route.ts:539: sem
  // ela o tsc resolve os genéricos do cliente para `never` e o `.insert()`
  // deixa de aceitar qualquer objeto.
  const admin: SupabaseClient = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: freshFetch },
  })

  const now = new Date()

  const [health, burn] = await Promise.all([
    readGenerationHealth(admin, now),
    readSupplierBurn(admin, now),
  ])

  // Camada 2 compartilha a dedupe POR CICLO de lib/creatomateQuota.ts, então o
  // cron e o gancho do compose nunca mandam o mesmo patamar duas vezes. O cron
  // existe aqui porque o gancho vive no caminho de SUCESSO — quando a cota
  // zera, nenhum render dá certo e o gancho deixa de ser alcançado. Ou seja:
  // sem esta linha, o patamar de 100% nunca é anunciado por ninguém.
  await checkCreatomateQuota(admin, now)
  const projected = await maybeAlertProjection(admin, burn, now)

  // KINEO-STORAGE-WATCH-2026-08-13 — CAMADA 2, QUARTO FORNECEDOR.
  //
  // Este cron vigiava Creatomate, OpenAI e fal.ai. O Supabase Storage estava
  // fora, e em 13/08 ele chegou a 91,9% de 100 GB com ~3 a 5 dias de folga sem
  // um único alarme — quem achou foi um humano abrindo o check-up manual.
  //
  // Storage cheio não é uma conta mais cara, é uma PAREDE: com Spend Cap ligado
  // o upload falha, e todo vídeo gerado passa por um upload. Seria o apagão de
  // 09/08 outra vez, só que na porta de entrada do funil em vez do render.
  //
  // Roda ANTES do `if (!health)`: a capacidade é legível mesmo quando a saúde
  // da geração não é, e "não consegui medir a saúde" é justamente o estado em
  // que ninguém mais vai olhar o storage.
  const storage = await readStorageCapacity(admin)
  let storageThreshold: number | null = null
  let storageProjected = false
  if (storage) {
    storageThreshold = await maybeAlertStorageThreshold(admin, storage)
    storageProjected = await maybeAlertStorageProjection(admin, storage, now)
  }
  const storageOut = storage
    ? { headline: storage.headline, percent_used: Number(storage.percentUsed.toFixed(1)), threshold_alerted: storageThreshold, projection_alerted: storageProjected }
    : { headline: null, unreadable: true }

  if (!health) {
    // Não medir NÃO é sinal de saúde. Sai em silêncio e diz por quê.
    return NextResponse.json({ ok: false, reason: 'health_unreadable', burn: burn.length, projected, storage: storageOut })
  }

  const { data: priorRaw } = await admin
    .from('events')
    .select('name, created_at, metadata')
    .in('name', [FIRED_EVENT, REMINDER_EVENT, CLEARED_EVENT])
    .gte('created_at', new Date(now.getTime() - 14 * 24 * HOUR_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(200)

  const prior = (priorRaw ?? []) as unknown as AlarmRow[]
  const lastFired = prior.find((r) => r.name === FIRED_EVENT) ?? null
  const lastCleared = prior.find((r) => r.name === CLEARED_EVENT) ?? null
  const lastReminder = prior.find((r) => r.name === REMINDER_EVENT) ?? null

  const firedAt = lastFired ? Date.parse(lastFired.created_at) : NaN
  const clearedAt = lastCleared ? Date.parse(lastCleared.created_at) : NaN
  const incidentOpen = Number.isFinite(firedAt) && (!Number.isFinite(clearedAt) || clearedAt < firedAt)
  const openIncidentKey =
    incidentOpen && typeof lastFired?.metadata?.incident_key === 'string'
      ? (lastFired.metadata.incident_key as string)
      : null

  // ── SAUDÁVEL ──────────────────────────────────────────────────────────────
  //
  // ANTI-FLAPPING, e é de graça: `health.unhealthy` só é falso quando NENHUMA
  // das duas janelas acende. A janela de 6 horas é inercial por construção —
  // ela ainda carrega as falhas do incidente por horas depois do fim. Ou seja,
  // um produto oscilando em torno dos 50% de falha NÃO consegue alternar
  // aberto/fechado a cada hora, que seria a forma mais boba de transformar esta
  // trava numa fábrica de e-mail. Conferido contra o fim real do apagão #2: às
  // 02:07Z de 11/08 a janela de 6h tinha 7 tentativas maduras (abaixo do mínimo
  // de 8) e 1 entrega, a de 1h tinha 1 entrega — encerra exatamente ali, que é
  // o horário verdadeiro em que o produto voltou.
  if (!health.unhealthy) {
    if (!incidentOpen) {
      return NextResponse.json({ ok: true, healthy: true, headline: health.headline, burn: burn.length, projected, storage: storageOut })
    }
    // ⚠️ SÓ ENCERRA COM PROVA POSITIVA DE ENTREGA. Ver o comentário de
    // `hasFreshDelivery` em lib/supplier/generationHealth.ts: sem esta linha,
    // as sete horas SEM NENHUMA TENTATIVA que o apagão de 09/08 teve virariam
    // sete "voltou ao normal" seguidos de sete reaberturas.
    if (!health.hasFreshDelivery) {
      console.warn('[supplier-watch] sem falha na janela, mas TAMBÉM sem vídeo entregue — incidente segue aberto')
      return NextResponse.json({ ok: true, healthy: false, incident_open: true, reason: 'no_delivery_evidence' })
    }
    const downForMs = Number.isFinite(firedAt) ? now.getTime() - firedAt : 0
    const hours = (downForMs / HOUR_MS).toFixed(1)
    const notified = await notifyFounder(
      '✅ Kineo: geração VOLTOU AO NORMAL',
      `O produto voltou a entregar vídeo.\n\n` +
        `Duração do incidente: ~${hours}h (início ${fmtDate(lastFired?.created_at ?? null)}).\n` +
        `Agora: ${health.headline}.\n\n` +
        'CONSUMO DOS FORNECEDORES:\n' +
        burnLines(burn) +
        '\n\nNão é preciso fazer nada. Registrado em /admin/supplier-health.',
    )
    await admin.from('events').insert({
      user_id: null,
      name: CLEARED_EVENT,
      path: '/api/cron/supplier-watch',
      metadata: {
        incident_key: openIncidentKey,
        down_hours: Number(hours),
        headline: health.headline,
        channels: notified,
      },
    })
    console.log(`[supplier-watch] incidente ENCERRADO após ~${hours}h — fundador avisado`)
    return NextResponse.json({ ok: true, healthy: true, recovered: true, down_hours: Number(hours), notified })
  }

  // ── DOENTE ────────────────────────────────────────────────────────────────
  const rules = describeRules(health.firedRules)

  if (!incidentOpen) {
    // Chave do incidente = a hora UTC em que ele foi detectado. Estável dentro
    // da hora, então duas lambdas concorrentes colidem no índice único e apenas
    // UMA manda e-mail; nova hora só vira incidente novo se o anterior tiver
    // sido encerrado (senão nem chegamos aqui).
    const incidentKey = `generation:${now.toISOString().slice(0, 13)}Z`

    const { error: reserveErr } = await admin.from('events').insert({
      user_id: null,
      name: FIRED_EVENT,
      path: '/api/cron/supplier-watch',
      metadata: {
        incident_key: incidentKey,
        rules: health.firedRules,
        window: health.firedWindow?.key ?? null,
        attempts: health.firedWindow?.attempts ?? 0,
        completed: health.firedWindow?.completed ?? 0,
        failed: health.firedWindow?.failed ?? 0,
        distinct_users: health.firedWindow?.distinctUsers ?? 0,
        top_reason: health.firedWindow?.topReason ?? null,
        headline: health.headline,
      },
    })

    // ⚠️ RESERVA ANTES DE ENVIAR, igual a send-cap-hit. 23505 = o banco já tem
    // este incidente: outra lambda ganhou a corrida e já avisou.
    if (reserveErr) {
      if (reserveErr.code === '23505') {
        console.log(`[supplier-watch] incidente ${incidentKey} já registrado — e-mail duplicado evitado`)
        return NextResponse.json({ ok: true, healthy: false, duplicate: true })
      }
      // Sem reserva não há garantia de alerta único. Aqui a escolha é OPOSTA à
      // de send-cap-hit: aquele arquivo protege a reputação do domínio contra
      // reenvio; este protege a empresa contra silêncio. Alarme repetido é
      // chato; alarme que não toca custou 33 horas. Avisa mesmo assim.
      console.error(
        `[supplier-watch] reserva do incidente falhou (${reserveErr.code ?? '?'} ${reserveErr.message}) —` +
          ' ALERTANDO ASSIM MESMO; pode repetir na próxima hora',
      )
    }

    const notified = await notifyFounder(
      `🚨 Kineo: GERAÇÃO PAROU — ${health.headline}`,
      alarmBody(health, burn, 0),
    )

    // ⚠️ O DEFEITO MAIS PERIGOSO DESTA SPRINT, PEGO NA 2ª REVISÃO ADVERSARIAL.
    //
    // "Reservar antes de enviar" é a doutrina certa desta casa contra REENVIO
    // (send-cap-hit). Mas o objetivo AQUI é o oposto: garantir que alguém seja
    // avisado. Se o Resend recusar — e ele vai: o plano é de 100 e-mails/dia
    // COMPARTILHADOS com os crons de lifecycle, e um pico consome essa cota
    // exatamente no dia em que o produto quebra —, o marcador de incidente
    // ficaria gravado dizendo "já avisei" enquanto NINGUÉM foi avisado. O
    // próximo som sairia só 6 horas depois, pelo lembrete. Seria o apagão de
    // 09/08 de novo, agora com um alarme instalado dando a impressão de
    // cobertura. Pior que não ter alarme.
    //
    // Como `notifyFounder` nunca lança e diz canal a canal o que aconteceu,
    // `delivered === false` significa que NADA saiu — logo desfazer o marcador
    // é seguro (não há risco de duplicata) e correto: a próxima rodada, daqui a
    // uma hora, tenta de novo com uma chave nova, e segue tentando até algum
    // canal funcionar. É a mesma compensação de `releaseReservation` em
    // send-cap-hit, com o viés invertido de propósito.
    if (!notified.delivered) {
      const { error: releaseErr } = await admin
        .from('events')
        .delete()
        .eq('name', FIRED_EVENT)
        .eq('metadata->>incident_key', incidentKey)
      console.error(
        `[supplier-watch] 🔴 ALARME NÃO CHEGOU EM NENHUM CANAL (${JSON.stringify(notified)}) — marcador ` +
          (releaseErr ? `NÃO pôde ser desfeito (${releaseErr.message}); só o lembrete de 6h vai retentar` : 'desfeito; retenta na próxima hora'),
      )
    }

    console.error(`[supplier-watch] 🔴 INCIDENTE ABERTO (${rules}) — ${health.headline}`)
    return NextResponse.json({ ok: true, healthy: false, opened: incidentKey, rules: health.firedRules, notified })
  }

  // Incidente já aberto: no máximo um lembrete a cada REMINDER_HOURS.
  const reminders = prior.filter(
    (r) => r.name === REMINDER_EVENT && Date.parse(r.created_at) > firedAt,
  ).length
  const lastPingMs = Math.max(
    firedAt,
    lastReminder && Date.parse(lastReminder.created_at) > firedAt ? Date.parse(lastReminder.created_at) : 0,
  )
  const dueForReminder =
    reminders < MAX_REMINDERS && now.getTime() - lastPingMs >= REMINDER_HOURS * HOUR_MS

  if (!dueForReminder) {
    console.warn(`[supplier-watch] incidente segue aberto (${rules}) — sem novo e-mail (trava por incidente)`)
    return NextResponse.json({ ok: true, healthy: false, incident_open: true, reminders, notified: null })
  }

  const notified = await notifyFounder(
    `🚨 Kineo: geração AINDA parada (${((now.getTime() - firedAt) / HOUR_MS).toFixed(0)}h) — ${health.headline}`,
    alarmBody(health, burn, reminders + 1),
  )
  await admin.from('events').insert({
    user_id: null,
    name: REMINDER_EVENT,
    path: '/api/cron/supplier-watch',
    metadata: {
      incident_key: openIncidentKey,
      reminder_index: reminders + 1,
      hours_open: Number(((now.getTime() - firedAt) / HOUR_MS).toFixed(1)),
      headline: health.headline,
      channels: notified,
    },
  })
  return NextResponse.json({ ok: true, healthy: false, incident_open: true, reminders: reminders + 1, notified })
}
