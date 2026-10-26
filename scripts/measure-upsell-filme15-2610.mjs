// Read-only. No dotenv, no .env reads, no rendering, no database writes.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages } from './measurement-helpers.mjs'
import { buildFilm15UpsellReport, FILM15_REPORT_EVENTS, FILM15_PAYMENT_WINDOW_MS } from './upsell-filme15-report.mjs'

const args = new Map(process.argv.slice(2).map(arg => {
  const equal = arg.indexOf('=')
  if (equal < 0 || !arg.startsWith('--')) throw new Error('Use --name=value arguments')
  return [arg.slice(2, equal), arg.slice(equal + 1)]
}))
async function main() {
  const deployedAt = args.get('deployed-at'), generatedAt = args.get('at') ?? new Date().toISOString()
  const windowDays = Number(args.get('days') ?? 7)
  if (!deployedAt || !Number.isFinite(Date.parse(deployedAt))) throw new Error('Required: --deployed-at=<actual production ISO timestamp>; a branch push is not deployment')
  if (args.has('input')) {
    const filename = args.get('input')
    if (/(?:^|[\\/])\.env(?:\.|$)/i.test(filename)) throw new Error('.env input is forbidden')
    const { events, profiles } = JSON.parse(fs.readFileSync(filename, 'utf8'))
    process.stdout.write(JSON.stringify(buildFilm15UpsellReport({ events, profiles, deployedAt, generatedAt, windowDays }), null, 2) + '\n')
    return
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Provide a JSON export with --input, or authorized process environment variables (never read .env files)')
  // Validate all dates BEFORE constructing any request.
  buildFilm15UpsellReport({ events: [], profiles: [], deployedAt, generatedAt, windowDays })
  const start = new Date(Date.parse(deployedAt) - windowDays * 86_400_000 - FILM15_PAYMENT_WINDOW_MS).toISOString()
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const paged = (label, request) => fetchAllPages(async (from, to) => {
    const { data, error } = await request(from, to)
    if (error) throw new Error(`${label}: ${error.code ?? 'query_failed'}`)
    return data ?? []
  })
  const [events, profiles] = await Promise.all([
    paged('events', (from, to) => admin.from('events').select('id,name,user_id,session_id,created_at,metadata')
      .in('name', [...FILM15_REPORT_EVENTS]).gte('created_at', start).lte('created_at', generatedAt)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to)),
    paged('profiles', (from, to) => admin.from('profiles').select('id,email').order('id', { ascending: true }).range(from, to)),
  ])
  process.stdout.write(JSON.stringify(buildFilm15UpsellReport({ events, profiles, deployedAt, generatedAt, windowDays }), null, 2) + '\n')
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'measurement_failed'); process.exitCode = 1 })
