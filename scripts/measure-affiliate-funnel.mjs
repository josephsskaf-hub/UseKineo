import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildAffiliateFunnelReport, fetchAllPages } from './affiliate-funnel-report.mjs'

function loadEnv(path) {
  const values = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1)
    values[match[1]] = value
  }
  return values
}

function parseDays() {
  const index = process.argv.indexOf('--days')
  const raw = index >= 0 ? Number(process.argv[index + 1]) : 30
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 365) : 30
}

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? 'unknown'} ${result.error.message}`)
  return result.data ?? []
}

async function main() {
  const env = { ...loadEnv('.env.local'), ...process.env }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service-role configuration is missing')
  }
  const days = parseDays()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const paged = (label, request) => fetchAllPages(async (from, to) =>
    unwrap(await request(from, to), `${label}[${from}:${to}]`),
  )
  const [affiliates, clicks, referrals, commissions, events, profiles] = await Promise.all([
    paged('affiliates', (from, to) => supabase.from('affiliates')
      .select('id,user_id,email,status,created_at')
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('affiliate_clicks', (from, to) => supabase.from('affiliate_clicks')
      .select('id,affiliate_id,ip_hash,created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('affiliate_referrals', (from, to) => supabase.from('affiliate_referrals')
      .select('id,affiliate_id,referred_user_id,email,status,first_touch_at,converted_at')
      .order('first_touch_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('affiliate_commissions', (from, to) => supabase.from('affiliate_commissions')
      .select('id,affiliate_id,referral_id,status,commission_amount,currency,created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('events', (from, to) => supabase.from('events')
      .select('id,name,user_id,session_id,path,metadata,created_at')
      .gte('created_at', cutoff)
      .in('name', ['landing_session_started', 'organic_cta_clicked', 'affiliate_application_submitted'])
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => supabase.from('profiles')
      .select('id,email,created_at,signup_utm_campaign')
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
  ])

  const report = buildAffiliateFunnelReport({
    generatedAt: new Date().toISOString(),
    days,
    cutoff,
    affiliates,
    clicks,
    referrals,
    commissions,
    events,
    profiles,
  })
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
