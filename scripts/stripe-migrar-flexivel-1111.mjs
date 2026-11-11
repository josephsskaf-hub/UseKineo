// KINEO-PAUSA-POR-CARTAO-1111 — passo 3 de lib/billing/pausaPorCartao.ts (PAUSA_POR_CARTAO_PASSOS): migra as assinaturas
// ATIVAS da Stripe para billing mode FLEXÍVEL, o pré-requisito para "cartão recusado pausa em vez de cancelar".
//
//   node scripts/stripe-migrar-flexivel-1111.mjs            → ENSAIO: só lista (id, status, billing mode). Não muda nada.
//   node scripts/stripe-migrar-flexivel-1111.mjs --apply    → migra, uma por uma, as que ainda são classic.
//
// ⚠ IRREVERSÍVEL na Stripe (flexível não volta para classic). Rodar o --apply só com o sim do fundador, pela CEO.
// Lê STRIPE_SECRET_KEY do ambiente (ou do .env.local da raiz). Fala com a Stripe na API 2025-06-30.basil (a casa usa a
// 2024-06-20, que não conhece billing_mode nem /migrate). Assinaturas com schedule ativo: a API migra e atualiza o schedule.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '2025-06-30.basil'
const APPLY = process.argv.includes('--apply')

function chave() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    const m = env.match(/^STRIPE_SECRET_KEY=(.+)$/m)
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
  } catch { return null }
}

async function stripe(key, method, p, body) {
  const res = await fetch(`https://api.stripe.com${p}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': VERSION, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${json?.error?.code ?? ''} ${json?.error?.message ?? ''}`)
  return json
}

const key = chave()
if (!key) { console.error('STRIPE_SECRET_KEY ausente (ambiente ou .env.local).'); process.exit(1) }
if (!key.startsWith('sk_live_') && !key.startsWith('rk_live_')) console.warn('Aviso: a chave não é de produção (live).')

const subs = []
for (const status of ['active', 'past_due', 'trialing']) {
  let after = null
  for (;;) {
    const q = new URLSearchParams({ status, limit: '100' })
    if (after) q.set('starting_after', after)
    const page = await stripe(key, 'GET', `/v1/subscriptions?${q}`)
    subs.push(...page.data)
    if (!page.has_more) break
    after = page.data[page.data.length - 1].id
  }
}
const classic = subs.filter((s) => s.billing_mode?.type !== 'flexible')
console.log(`${subs.length} assinatura(s) ativa(s)/em atraso/em teste · ${classic.length} ainda classic · ${subs.length - classic.length} já flexível`)
for (const s of subs) console.log(`  ${s.id}  ${s.status.padEnd(9)}  ${s.billing_mode?.type ?? 'classic?'}  tier=${s.metadata?.tier ?? '-'}`)
if (!APPLY) { console.log('\nENSAIO: nada foi mudado. Para migrar: --apply (irreversível).'); process.exit(0) }

let ok = 0
let falhas = 0
for (const s of classic) {
  try {
    await stripe(key, 'POST', `/v1/subscriptions/${s.id}/migrate`, 'billing_mode[type]=flexible')
    ok++
    console.log(`  migrada  ${s.id}`)
  } catch (e) {
    falhas++
    console.log(`  FALHOU   ${s.id}  ${e.message}`)
  }
}
console.log(`\n${ok} migrada(s) · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
