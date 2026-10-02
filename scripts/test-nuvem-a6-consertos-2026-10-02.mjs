// KINEO-NUVEM-A6-2026-10-02 — dois consertos de 1 linha da sessão Nuvem (B2B):
//   (1) `spaces_montage_submitted` é PROVA DE DONO do GET de /api/spaces/montage (mesmo desenho do
//       producao_montage_submitted) e por isso precisa estar em SERVER_ONLY_EVENTS do sink público /api/events;
//   (2) ads_v2_orders (+ ads_v2_shots, ads_v2_variation_groups) entram em supabase/migrations/ no estado FINAL que
//       produção tem (conferido em 02/10 por information_schema/pg_constraint/pg_indexes), sem recriar o índice antigo
//       de "um ativo por conta" que as 3 variações trocaram.
// Estilo readFileSync. Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

function serverOnly(src) {
  const m = src.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\n\]\)/)
  if (!m) return null
  return new Set([...m[1].replace(/\/\/[^\n]*/g, '').matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]))
}

function eventProblems(eventsSrc, montageSrc) {
  const p = []
  const set = serverOnly(eventsSrc)
  if (!set) return ['SERVER_ONLY_EVENTS não encontrado']
  // Todo nome que a montagem do Espaços grava no servidor tem de ser recusado no sink público.
  const written = [...montageSrc.matchAll(/name: '([a-z0-9_]+)'/g)].map((m) => m[1])
  if (!written.includes('spaces_montage_submitted')) p.push('a montagem do Espaços deixou de gravar spaces_montage_submitted')
  for (const n of written) if (!set.has(n)) p.push(`${n} fora de SERVER_ONLY_EVENTS`)
  // A prova de dono: o GET procura exatamente esse nome.
  if (!/\.eq\('name', 'spaces_montage_submitted'\)/.test(montageSrc)) p.push('o GET não confere mais a prova de dono')
  if (!set.has('producao_montage_submitted')) p.push('a irmã producao_montage_submitted saiu da lista')
  return p
}

function migrationProblems(sql) {
  const p = []
  const s = sql.replace(/--[^\n]*/g, '')
  for (const t of ['ads_v2_orders', 'ads_v2_shots', 'ads_v2_variation_groups']) {
    if (!new RegExp(`create table if not exists public\\.${t} \\(`).test(s)) p.push(`${t} sem create table if not exists`)
    if (!new RegExp(`alter table public\\.${t} enable row level security`).test(s)) p.push(`${t} sem RLS`)
    if (!new RegExp(`revoke all on table public\\.${t} from anon, authenticated`).test(s)) p.push(`${t} sem revoke`)
    if (!new RegExp(`create trigger ${t}_touch_updated_at`).test(s)) p.push(`${t} sem gatilho de updated_at`)
  }
  // Colunas que existem em produção (02/10) e que o código lê.
  for (const c of ['billing_ref text unique', 'credits_charged integer', 'creatomate_render_id text', 'assembly_submit_at timestamptz', 'parent_order_id uuid', 'retake_idx integer', 'photos jsonb', 'card_footage_id text', 'voice_seconds numeric']) {
    if (!s.includes(c)) p.push(`coluna faltando: ${c}`)
  }
  if (!/add column if not exists variation_group_id uuid/.test(s) || !/add column if not exists variation_slot text/.test(s)) p.push('colunas das variações faltando')
  if (!/'text', 'user_video'\)\)/.test(s)) p.push("CHECK de kind sem 'user_video' (estado final)")
  if (!/ads_v2_shots_user_video_never_ai/.test(s)) p.push('trava "vídeo do cliente nunca vai à IA" faltando')
  // O índice antigo NUNCA é criado (só pode aparecer no drop).
  if (/create unique index if not exists ads_v2_orders_one_active_per_user\s/.test(s)) p.push('recria o índice antigo de um ativo por conta (travaria as 3 variações)')
  if (!/create unique index if not exists ads_v2_orders_one_active_per_user_slot/.test(s)) p.push('sem o índice um-ativo-por-letra')
  if (!/drop index if exists public\.ads_v2_orders_one_active_per_user;/.test(s)) p.push('sem o drop do índice antigo')
  // Nada destrutivo.
  if (/\bdrop table\b|\bdelete from\b|\btruncate\b|drop column/i.test(s)) p.push('migration destrutiva')
  return p
}

const EVENTS = read('app/api/events/route.ts')
const MONTAGE = read('app/api/spaces/montage/route.ts')
const MIG_PATH = 'supabase/migrations/20261002120000_ads_v2_orders.sql'
const MIG = read(MIG_PATH)

console.log('A6.1 — spaces_montage_submitted só pelo servidor')
const e = eventProblems(EVENTS, MONTAGE)
ok(e.length === 0, 'eventos do Espaços recusados no sink público' + (e.length ? ': ' + e.join('; ') : ''))

console.log('A6.2 — ads_v2_orders no repositório')
const m = migrationProblems(MIG)
ok(m.length === 0, `${MIG_PATH} reproduz o estado final de produção` + (m.length ? ': ' + m.join('; ') : ''))
ok(fs.existsSync(path.join(ROOT, 'migrations_pending/2026-09-29_ads_v2.sql')), 'os arquivos de migrations_pending continuam (outros guardiões os leem)')

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('nome fora da lista', eventProblems(EVENTS.replace("  'spaces_montage_submitted',\n", ''), MONTAGE))
mut('GET sem prova de dono', eventProblems(EVENTS, MONTAGE.replace(".eq('name', 'spaces_montage_submitted')", ".eq('name', 'x')")))
mut('índice antigo recriado', migrationProblems(MIG + "\ncreate unique index if not exists ads_v2_orders_one_active_per_user\n  on public.ads_v2_orders (user_id);\n"))
mut('sem user_video', migrationProblems(MIG.replace(/'text', 'user_video'\)\)/g, "'text'))")))
mut('sem RLS nas variações', migrationProblems(MIG.replace('alter table public.ads_v2_variation_groups enable row level security', '')))
mut('drop table', migrationProblems(MIG + '\ndrop table public.ads_v2_shots;\n'))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
