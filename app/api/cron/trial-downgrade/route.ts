import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  REVERSE_TRIAL_ENABLED,
  TRIAL_CREDIT_CAP,
  downgradeExpiredTrial,
  trialNeedsDowngrade,
  type TrialDowngradeOutcome,
  type TrialProfileFields,
} from '@/lib/reverseTrial'

// trial-downgrade — REVERSE TRIAL FASE 2, ITEM 2 (06/08/2026).
// [KINEO-TRIAL-DOWNGRADE-2026-08-06]
//
// O QUE ESTE CRON É, E O QUE ELE NÃO É.
// Ele NÃO decide entitlement: isso já é passivo desde a fase 1
// (isTrialActive() volta false na primeira request depois do vencimento, sem
// esperar cron nenhum). O que ele faz é a parte que NENHUMA request faz
// sozinha: revogar o saldo remanescente dos créditos concedidos e registrar o
// instante do downgrade. Sem ele, ligar a flag entrega 40 créditos VITALÍCIOS
// por endereço de e-mail — a dívida #1 declarada no commit d1133c7.
//
// POR QUE DE HORA EM HORA E NÃO "MEIA-NOITE" (desvio consciente da ordem).
// A ordem do fundador diz "cron downgrade meia-noite". Só que o trial não vence
// à meia-noite de ninguém: trial_ends_at = instante do signup + 3 ou 7 dias, e
// os signups chegam nas 24 horas do dia. Um job diário deixaria, em média, 12h
// (pior caso 24h) de crédito revogável parado na conta de quem já saiu do
// trial — e é exatamente esse saldo que faz a pessoa não precisar assinar.
// De hora em hora, a exposição cai para ≤1h. O efeito para o usuário é o mesmo
// que o fundador pediu (ele perde o que não usou), com uma janela 24× menor.
//
// FLAG: este cron NÃO é gateado por KINEO_REVERSE_TRIAL_ENABLED, e isso é
// deliberado. Com a flag OFF não existe nenhuma linha com trial_status
// preenchido, então a query devolve 0 e o job é um no-op. Gatear seria pior nos
// dois sentidos: (a) desligar a flag como rollback deixaria crédito concedido
// órfão para sempre, e (b) a coorte tem que ser independente de flag para que
// desligá-la não signifique "revogar o crédito de todos os trials vivos" — ver
// trialNeedsDowngrade() em lib/reverseTrial.ts.
//
// Guarda-corpos: CRON_SECRET fail-closed · teto por rodada · uma escrita
// atômica por usuário (CAS em trial_status + video_credits) · idempotente por
// construção ('downgraded'/'converted' saem da coorte).

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Teto explícito (padrão dos outros crons). Cada linha custa ~3 round-trips
// (releitura + UPDATE com CAS + evento de auditoria), então 100 cabe folgado
// nos 60s de maxDuration; 200 não cabia com margem. Volume esperado por hora é
// de unidades — o teto só existe para a retomada depois de job parado, e a
// ordenação por trial_ends_at ASC garante que a fila drene pelos mais antigos.
const MAX_PER_RUN = 100

/**
 * Página lida do banco ANTES do filtro — deliberadamente muito maior que
 * MAX_PER_RUN, e a 2ª passada da revisão é a razão. Com os dois iguais, a
 * página (ordenada por trial_ends_at ASC) e o filtro brigavam: um trial que
 * estourou o TETO no dia 1 tem trial_ends_at no FUTURO, então ele ordena por
 * ÚLTIMO — e com >100 trials abertos ele cairia fora da página e só seria
 * processado quando o relógio dele vencesse, dias depois. Justo a pessoa que
 * consumiu os 40 créditos em um dia, isto é, o lead mais quente do funil, seria
 * a última a receber o e-mail de resgate. O teto que importa é o de ESCRITAS
 * (MAX_PER_RUN); ler 1000 linhas de 4 colunas de uma tabela com ~950 perfis é
 * de graça.
 */
const COHORT_PAGE = 1000

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[trial-downgrade] service-role env missing')
    return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  }
  const db = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  // COORTE — a primeira versão desta query escrevia a regra de vencimento em
  // SQL (`.or('trial_ends_at.lte.<iso>, trial_credits_used.gte.40')`). A
  // revisão adversarial derrubou por dois motivos independentes:
  //   · REGRA DUPLICADA. A condição passaria a existir em dois idiomas (SQL
  //     aqui, TypeScript em trialNeedsDowngrade) e envelheceria em um só. É
  //     literalmente a lição de 05/08 — "se o gatilho e o cron contam coisas
  //     diferentes, o cron está errado" — a caminho de acontecer de novo.
  //   · SINTAXE FRÁGIL. O filtro `or()` do PostgREST separa `coluna.op.valor`
  //     por ponto e os itens por vírgula, e o valor interpolado é um timestamp
  //     ISO cheio de pontuação. Um erro de parse aqui não estoura: devolve a
  //     coorte ERRADA em silêncio, e a coorte errada revoga dinheiro.
  // Sai mais barato buscar os trials ABERTOS (conjunto pequeno por natureza —
  // só existe trial aberto de quem se cadastrou nos últimos 3/7 dias) e aplicar
  // o MESMO predicado em memória. Ordenado por vencimento ASC, com nulos
  // primeiro: os mais atrasados entram na frente, e quem ainda não venceu fica
  // no fim da fila (e é descartado pelo filtro).
  const { data: openTrials, error } = await db
    .from('profiles')
    .select('id, trial_status, trial_ends_at, trial_credits_used')
    .in('trial_status', ['active', 'expired'])
    .order('trial_ends_at', { ascending: true, nullsFirst: true })
    .limit(COHORT_PAGE)

  if (error) {
    console.error('[trial-downgrade] cohort query failed:', error.message)
    return NextResponse.json({ error: 'cohort_query_failed' }, { status: 500 })
  }

  const open = openTrials ?? []
  const due = open
    .filter((row) => trialNeedsDowngrade(row as TrialProfileFields, now))
    .map((r) => (r as { id: string }).id)
    .filter(Boolean)
  // O teto é de ESCRITAS, aplicado DEPOIS do filtro. A fila que sobrar entra na
  // rodada seguinte (1h), e o entitlement dessas pessoas já está correto desde
  // o vencimento — quem espera é a revogação do saldo, não o direito de uso.
  const ids = due.slice(0, MAX_PER_RUN)
  const tally: Record<string, number> = {}
  let creditsRevoked = 0
  let downgraded = 0
  let converted = 0

  for (const id of ids) {
    const outcome: TrialDowngradeOutcome = await downgradeExpiredTrial(db, id, now)
    const key = outcome.action === 'skipped' ? `skipped_${outcome.reason}` : outcome.action
    tally[key] = (tally[key] ?? 0) + 1
    creditsRevoked += outcome.creditsRevoked
    if (outcome.action === 'downgraded') downgraded += 1
    if (outcome.action === 'converted') converted += 1
  }

  const payload = {
    ok: true,
    flag_enabled: REVERSE_TRIAL_ENABLED,
    // Todo número vem com o denominador (regra dos 30/07): `processed` sozinho
    // não distingue "não havia ninguém" de "a fila estourou o teto".
    open_trials: open.length,
    due: due.length,
    processed: ids.length,
    deferred: due.length - ids.length,
    page_full: open.length >= COHORT_PAGE,
    downgraded,
    converted,
    credits_revoked: creditsRevoked,
    tally,
    cap: TRIAL_CREDIT_CAP,
    ran_at: nowIso,
  }
  if (ids.length > 0) console.log('[trial-downgrade]', JSON.stringify(payload))
  return NextResponse.json(payload)
}
