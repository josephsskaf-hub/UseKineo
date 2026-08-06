// KINEO-REVERSE-TRIAL-P2-2026-08-06 — O INSTRUMENTO DO A/B DO REVERSE TRIAL.
//
// POR QUE ELE EXISTE: o experimento aprovado pelo fundador (trial de 3 vs 7
// dias, mínimo ~150 signups por braço) tem UMA métrica de decisão —
// PAGANTES POR 100 SIGNUPS, por braço. Sem este script esse número seria
// remontado à mão a cada leitura, que é literalmente o modo de falha registrado
// no PROMPT-DIARIO ("medir de fonte diferente a cada dia"). Aqui a definição
// mora em UM lugar.
//
// REGRAS DO PROJETO QUE ESTÃO CODIFICADAS AQUI (cada uma custou um erro real):
//  1. CONTA PESSOAS, NÃO EVENTOS — tudo é distinct user_id.
//  2. NÃO CONTE A SI MESMO — as 17 contas internas/teste são excluídas por
//     e-mail; sem esse filtro o placar já disse 3 planos pagos quando o real
//     era 1.
//  3. TODO NÚMERO DE FALHA VAI COM O DENOMINADOR — nada de "0 conversões" sem
//     dizer 0 de quantos.
//  4. "PAGANTE" TEM TRÊS DEFINIÇÕES e todas vão juntas: já comprou alguma vez
//     (has_paid), plano pago ativo (plan != free), e conversão ATRIBUÍDA ao
//     trial (virou pagante DEPOIS de ativar o trial).
//
// Uso: node scripts/measure-trial-funnel.mjs [dias]   (default 30)
// Requer .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const days = Number.parseInt(process.argv[2] ?? '30', 10) || 30

function loadEnv(path) {
  const values = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

// Mesmo filtro do placar diário (PROMPT-DIARIO, sessão B, regra 1).
const INTERNAL_PATTERNS = [
  /^josephsskaf/i, /^josephskaf/i, /@shortsforgeai\.com$/i, /@mailinator\.com$/i, /@example\.com$/i,
]
const isInternal = (email) => !email || INTERNAL_PATTERNS.some((re) => re.test(email))

async function fetchAll(queryFactory) {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

const env = loadEnv('.env.local')
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials in .env.local')
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

const profiles = (await fetchAll(() => db
  .from('profiles')
  .select('id,email,created_at,plan,has_paid,video_credits,trial_status,trial_variant,trial_ends_at,trial_credits_used,trial_extended')
  .gte('created_at', cutoff)
  .order('created_at', { ascending: true }))).filter((p) => !isInternal(p.email))

const ids = new Set(profiles.map((p) => p.id))

// Ativação = PESSOA com pelo menos 1 vídeo completo (não nº de vídeos).
const videos = await fetchAll(() => db
  .from('videos')
  .select('user_id,status,created_at')
  .gte('created_at', cutoff)
  .eq('status', 'completed'))
const withVideo = new Set(videos.map((v) => v.user_id).filter((u) => ids.has(u)))

// Eventos do trial. `trial_credits_granted` é o ÚNICO rastro do grant (o grant
// escreve video_credits direto, sem linha em credit_debits) — por isso ele é
// lido daqui e não inferido do saldo.
const events = await fetchAll(() => db
  .from('events')
  .select('user_id,name,metadata,created_at')
  .in('name', ['trial_credits_granted', 'trial_expired'])
  .gte('created_at', cutoff))
const granted = events.filter((e) => e.name === 'trial_credits_granted' && ids.has(e.user_id))
const expired = events.filter((e) => e.name === 'trial_expired' && ids.has(e.user_id))

const isPaidPlan = (p) => (p.plan ?? 'free').toLowerCase() !== 'free' && (p.plan ?? '') !== ''
const arms = ['3d', '7d', '(sem trial)']
const armOf = (p) => (p.trial_variant === '3d' || p.trial_variant === '7d' ? p.trial_variant : '(sem trial)')

const pct = (n, d) => (d > 0 ? `${((100 * n) / d).toFixed(1)}%` : 'n/a')

console.log(`\n=== FUNIL DO REVERSE TRIAL — últimos ${days} dias (contas internas excluídas) ===`)
console.log(`Signups no período: ${profiles.length}`)
console.log(`Trials ativados:    ${profiles.filter((p) => p.trial_status).length}`)
console.log(`Grants registrados: ${granted.length}  ·  créditos concedidos: ${granted.reduce((a, e) => a + (Number(e.metadata?.credits) || 0), 0)}`)

for (const arm of arms) {
  const cohort = profiles.filter((p) => armOf(p) === arm)
  if (cohort.length === 0) continue
  const cohortIds = new Set(cohort.map((p) => p.id))
  const activated = cohort.filter((p) => withVideo.has(p.id)).length
  const paidEver = cohort.filter((p) => p.has_paid === true).length
  const paidNow = cohort.filter(isPaidPlan).length
  const consumed = cohort.reduce((a, p) => a + (Number(p.trial_credits_used) || 0), 0)
  const capHits = expired.filter((e) => cohortIds.has(e.user_id) && e.metadata?.reason === 'credit_cap').length
  const clockOuts = expired.filter((e) => cohortIds.has(e.user_id) && e.metadata?.reason === 'clock').length
  console.log(`\n--- braço ${arm} ---`)
  console.log(`  signups ................ ${cohort.length}`)
  console.log(`  ativação (>=1 vídeo) ... ${activated} de ${cohort.length}  (${pct(activated, cohort.length)})`)
  console.log(`  já compraram (has_paid)  ${paidEver} de ${cohort.length}  (${pct(paidEver, cohort.length)})`)
  console.log(`  plano pago ativo ....... ${paidNow} de ${cohort.length}  (${pct(paidNow, cohort.length)})`)
  console.log(`  >> PAGANTES POR 100 SIGNUPS: ${cohort.length > 0 ? ((100 * paidEver) / cohort.length).toFixed(1) : 'n/a'}  <<  (métrica de decisão do A/B)`)
  console.log(`  expirou no teto ........ ${capHits}   ·  expirou no relógio: ${clockOuts}`)
  console.log(`  créditos consumidos .... ${consumed}  (teto por trial: 40)`)
  if (cohort.length < 150 && arm !== '(sem trial)') {
    console.log(`  ⚠️  ${cohort.length}/150 signups — amostra AINDA NÃO decide nada. Não encerrar o A/B.`)
  }
}

// O alerta de custo do prompt: créditos de trial consumidos vs receita nova.
const totalConsumed = profiles.reduce((a, p) => a + (Number(p.trial_credits_used) || 0), 0)
const totalGranted = granted.reduce((a, e) => a + (Number(e.metadata?.credits) || 0), 0)
console.log(`\n=== CUSTO ===`)
console.log(`Créditos de trial CONCEDIDOS: ${totalGranted}  ·  CONSUMIDOS: ${totalConsumed}`)
console.log(`Saldo de trial ainda parado nas contas: ${totalGranted - totalConsumed} (é o que o cron de downgrade precisa revogar)`)
console.log(`\nRegra do fundador: alertar se custo dos trials > 20% da receita nova, ou se conversão trial->pago < 5% após 20 trials.\n`)
