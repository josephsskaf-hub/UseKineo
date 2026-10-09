// KINEO-HOLD-EM-LOTES-2026-10-09 — conta com 517 claims cinematic recebia 400 "Bad Request" do PostgREST
// no .in('render_id', [...517]) e TODO render dela era recusado ("Your credit reservation could not be verified").
// Prova: executa inspectActiveComposeCreditHolds com um banco falso que recusa .in() com mais de 100 itens.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
let ok = 0; const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.error('  ✗ ' + n) } }
const src = readFileSync('lib/credits/composeHold.ts', 'utf8')
checa('constante de lote = 100', /export const PROVIDER_DEBIT_REF_CHUNK = 100/.test(src))
checa('o .in de credit_debits usa slice por lote', /\.in\('render_id', candidateProviderDebitRefs\.slice\(i, i \+ PROVIDER_DEBIT_REF_CHUNK\)\)/.test(src))
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
const NOMES = { COMPOSE_CLAIM_EVENT: 'compose_submission_claim', AVATAR_CLAIM_EVENT: 'avatar_submission_claim', CINEMATIC_CLAIM_EVENT: 'cinematic_submission_claim' }
const req = (n) => new Proxy({}, { get: (_, k) => (k in NOMES ? NOMES[k] : typeof k === 'string' && /^[A-Z_]+$/.test(k) ? 3600000 : () => ({})) })
vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, console, Date, Map, Set, Number, String, JSON, Math, Promise, Array, Object, RegExp, Error })
const uuid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const claims = Array.from({ length: 517 }, (_, i) => ({ id: uuid(i), name: 'cinematic_submission_claim', user_id: 'u1', metadata: {}, created_at: new Date(Date.now() - i * 1000).toISOString() }))
let maiorLote = 0, chamadas = 0
function q(table) {
  const st = { table, inList: null }
  const b = {
    select() { return b }, eq() { return b }, order() { return b }, limit() { return b },
    in(col, list) { if (table === 'events') return b; st.inList = list; return b },
    then(res) {
      if (table === 'events') return res({ data: claims, error: null })
      chamadas++; maiorLote = Math.max(maiorLote, st.inList.length)
      if (st.inList.length > 100) return res({ data: null, error: { message: 'Bad Request' } })
      return res({ data: [], error: null })
    },
  }
  return b
}
const r = await mod.exports.inspectActiveComposeCreditHolds({ db: { from: q }, userId: 'u1', secret: 's', currentClaimId: 'x' }).catch((e) => ({ ok: false, error: String(e) }))
checa('517 claims: a conferência NÃO devolve "Bad Request"', !(r && r.ok === false && /Bad Request/.test(String(r.error))))
checa('nenhum lote passa de 100 refs', maiorLote <= 100 && maiorLote > 0)
checa('517 refs viram 6 lotes', chamadas === 6)
console.log(`${ok} ok · ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
