// KINEO-FILME-GRATIS-POR-PAIS-2026-09-29 — o interruptor da "saída B" do fundador (29/09: "vou sair na saída B"):
// filme grátis só para país rico. Nesta entrega (E1) ele nasce em 'todos' e NÃO pode ligar sozinho: uma conta
// 'region_paid_only' ainda é plano grátis e pegaria a cota semanal de Kineo 1 + o "1º filme" com clipes de IA da
// generate-video-fast (fal gasto, sem teto). Só depois da E4 (fim da cota semanal com guarda de servidor).
//
// O guardião EXECUTA o código real. Prova:
//   (a) lib/freeFilmPolicy.ts: padrão 'todos' (PK/IN/NG/null → true); sob 'pais_rico' PK/IN/NG/BR/MX → false,
//       US/ES → true, sem país / 'XX' → true (fail-open); BR e MX fora da lista;
//   (b) trava da ordem: enquanto a cota semanal existir (buildFreeTierOffer(true).limit > 0), a política é 'todos';
//   (c) lib/reverseTrial.ts EXECUTADO com banco falso: com 'todos' um cadastro do PK ganha o trial igual a antes;
//       com 'pais_rico' ganha trial_status='region_paid_only' (guarda .is('trial_status', null)), evento
//       trial_region_excluded { country } e NENHUM crédito; os EUA seguem ganhando;
//   (d) a guarda mora entre a conta paga e a digital do aparelho (âncora de linha inteira) e os 4 chamadores passam
//       o país do request.
// Cada bloco tem mutante em memória que precisa ficar VERMELHO.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { let v = false; try { v = typeof c === 'function' ? c() : c } catch { v = false } if (v) ok++; else falhas.push(n) }
const trocar = (src, de, para) => { if (!src.includes(de)) throw new Error('âncora do mutante sumiu: ' + de.slice(0, 80)); return src.split(de).join(para) }
const rodaPuro = (src) => { const exports = {}; vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText, { exports }); return exports }

// ── (a) régua pura ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log('== (a) lib/freeFilmPolicy.ts ==')
const polSrc = rd('lib/freeFilmPolicy.ts')
const P = rodaPuro(polSrc)
const provaPadrao = (M) => M.FREE_FILM_POLICY === 'todos' && ['PK', 'IN', 'NG', 'BR', 'US', null, undefined, ''].every((c) => M.filmeGratisPermitido(c) === true)
checa("padrão 'todos': PK, IN, NG, BR, US e sem país → filme grátis (comportamento de hoje)", provaPadrao(P))
const provaB = (M) =>
  ['PK', 'IN', 'NG', 'BR', 'MX', 'BD', 'KE'].every((c) => M.filmeGratisPermitido(c, 'pais_rico') === false) &&
  ['US', 'ES', 'GB', 'DE', 'PL', 'JP', 'AE', 'IL', 'us', ' es '].every((c) => M.filmeGratisPermitido(c, 'pais_rico') === true) &&
  [null, undefined, '', 'XX', 'T1', 'zzz'].every((c) => M.filmeGratisPermitido(c, 'pais_rico') === true)
checa("'pais_rico': PK/IN/NG/BR/MX/BD/KE → false; US/ES/GB/DE/PL/JP/AE/IL → true; sem país/'XX' → true", provaB(P))
checa('BR e MX fora da lista; a lista é ISO-2 sem repetição', !P.PAISES_FILME_GRATIS.includes('BR') && !P.PAISES_FILME_GRATIS.includes('MX') && P.PAISES_FILME_GRATIS.every((c) => /^[A-Z]{2}$/.test(c)) && new Set(P.PAISES_FILME_GRATIS).size === P.PAISES_FILME_GRATIS.length)
checa('lista pedida pelo fundador inteira', ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'PL', 'CZ', 'LT', 'LV', 'EE', 'SK', 'SI', 'HR', 'GR', 'HU', 'RO', 'PT', 'ES', 'IT', 'FR', 'DE', 'NL', 'BE', 'LU', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'CH', 'MT', 'CY', 'JP', 'KR', 'SG', 'HK', 'TW', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL'].every((c) => P.PAISES_FILME_GRATIS.includes(c)))
checa("mutante (padrão 'pais_rico') → vermelho em \"'todos' é o padrão\"", !provaPadrao(rodaPuro(trocar(polSrc, "export const FREE_FILM_POLICY: FreeFilmPolicy = 'todos'", "export const FREE_FILM_POLICY: FreeFilmPolicy = 'pais_rico'"))))
checa('mutante (BR entra na lista) → vermelho', !provaB(rodaPuro(trocar(polSrc, "  'US', 'CA',", "  'BR', 'US', 'CA',"))))
checa('mutante (sem país vira recusa) → vermelho', !provaB(rodaPuro(trocar(polSrc, '  if (c === null) return true\n', '  if (c === null) return false\n'))))
checa('paisDoRequest lê x-vercel-ip-country e normaliza', P.paisDoRequest({ get: (n) => (n === 'x-vercel-ip-country' ? 'pk' : null) }) === 'PK' && P.paisDoRequest({ get: () => null }) === null && P.paisDoRequest(null) === null)

// ── (b) a B não liga antes da E4 ────────────────────────────────────────────────────────────────────────────────────
console.log('== (b) ordem: B só depois da E4 ==')
{
  const offer = createOfflineLoader()('lib/freeTierOffer.ts')
  const cotaViva = offer.buildFreeTierOffer(true).limit > 0
  const trava = (M) => !cotaViva || M.FREE_FILM_POLICY === 'todos'
  checa(`cota semanal de Kineo 1 ainda viva (limit ${offer.buildFreeTierOffer(true).limit}) ⇒ política tem de ser 'todos'`, trava(P))
  checa("mutante (ligar 'pais_rico' com a cota viva) → vermelho", !cotaViva || !trava(rodaPuro(trocar(polSrc, "= 'todos'", "= 'pais_rico'"))))
}

// ── (c) maybeActivateReverseTrial executado ────────────────────────────────────────────────────────────────────────
console.log('== (c) lib/reverseTrial.ts executado com banco falso ==')
function bancoFalso() {
  const perfil = { id: 'u-1', trial_status: null, plan: 'free', has_paid: false, video_credits: 0 }
  const updates = []
  const db = {
    perfil, updates,
    from(tabela) {
      const st = { tabela, op: 'select', patch: null, filtros: [] }
      const exec = () => {
        if (st.tabela !== 'profiles') return { data: [], error: null, count: 0 }
        if (st.op === 'update') {
          const casa = st.filtros.every(([k, c, v]) => (k === 'is' ? perfil[c] === v : perfil[c] === v))
          updates.push({ patch: st.patch, filtros: st.filtros, casou: casa })
          if (!casa) return { data: [], error: null }
          Object.assign(perfil, st.patch)
          return { data: [{ id: perfil.id }], error: null }
        }
        return { data: { ...perfil }, error: null }
      }
      const q = {
        select() { return q }, update(p) { st.op = 'update'; st.patch = p; return q }, insert() { st.op = 'insert'; return q },
        eq(c, v) { st.filtros.push(['eq', c, v]); return q }, is(c, v) { st.filtros.push(['is', c, v]); return q },
        gte() { return q }, limit() { return q },
        maybeSingle() { return Promise.resolve(exec()) }, single() { return Promise.resolve(exec()) },
        then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
      }
      return q
    },
  }
  return db
}
const ENV = { KINEO_REVERSE_TRIAL_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const politicaReal = createOfflineLoader()('lib/freeFilmPolicy.ts')
async function ativa({ country, politica }) {
  const db = bancoFalso()
  const eventos = []
  const mocks = {
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
  }
  if (politica) mocks['./freeFilmPolicy'] = { ...politicaReal, filmeGratisPermitido: (c) => politicaReal.filmeGratisPermitido(c, politica) }
  const RT = createOfflineLoader({ env: ENV, mocks })('lib/reverseTrial.ts')
  const r = await RT.maybeActivateReverseTrial({ userId: 'u-1', email: 'pessoa@example.com', userCreatedAt: new Date().toISOString(), fingerprintHash: null, country })
  return { r, db, eventos, RT }
}
{
  const hoje = await ativa({ country: 'PK' })
  checa(`'todos' (padrão real): cadastro do PK ganha o trial como antes (${hoje.r.reason}, ${hoje.db.perfil.video_credits} cr)`, hoje.r.activated === true && hoje.db.perfil.trial_status === 'active' && hoje.db.perfil.video_credits === hoje.RT.TRIAL_GRANT_CREDITS && !hoje.eventos.some((e) => e.name === 'trial_region_excluded'))
  const pk = await ativa({ country: 'PK', politica: 'pais_rico' })
  const marca = pk.db.updates.find((u) => u.patch?.trial_status === 'region_paid_only')
  checa(`'pais_rico' + PK: region_paid_only, 0 crédito, evento com o país (${pk.r.reason})`, pk.r.activated === false && pk.r.reason === 'region_paid_only' && pk.db.perfil.trial_status === 'region_paid_only' && pk.db.perfil.video_credits === 0 && !!marca && marca.filtros.some(([k, c, v]) => k === 'is' && c === 'trial_status' && v === null) && pk.eventos.some((e) => e.name === 'trial_region_excluded' && e.metadata?.country === 'PK') && !pk.eventos.some((e) => e.name === 'trial_credits_granted'))
  const us = await ativa({ country: 'US', politica: 'pais_rico' })
  checa("'pais_rico' + US: trial concedido", us.r.activated === true && us.db.perfil.trial_status === 'active')
  const semPais = await ativa({ country: null, politica: 'pais_rico' })
  checa("'pais_rico' sem cabeçalho de país: concede (fail-open)", semPais.r.activated === true)
  // Mutante no produto: sem a guarda, o PK volta a ganhar crédito mesmo sob 'pais_rico'.
  const rtSrc = readFileSync(join(RAIZ, 'lib/reverseTrial.ts'), 'utf8')
  const mutSrc = trocar(rtSrc, 'if (!filmeGratisPermitido(args.country ?? null)) {', 'if (false) {')
  const db = bancoFalso(); const eventos = []
  const exports = {}
  const loadReal = createOfflineLoader({ env: ENV, mocks: { '@supabase/supabase-js': { createClient: () => db }, '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } }, './freeFilmPolicy': { ...politicaReal, filmeGratisPermitido: (c) => politicaReal.filmeGratisPermitido(c, 'pais_rico') } } })
  const js = ts.transpileModule(mutSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, { exports, require: (id) => loadReal(id, join(RAIZ, 'lib')), process: { env: { ...ENV } }, console: { log() {}, warn() {}, error() {} }, Buffer, URL, TextEncoder, TextDecoder })
  const rm = await exports.maybeActivateReverseTrial({ userId: 'u-1', email: 'pessoa@example.com', userCreatedAt: new Date().toISOString(), fingerprintHash: null, country: 'PK' })
  checa('mutante (guarda desligada) → PK sob pais_rico ganha trial → vermelho', rm.activated === true && db.perfil.trial_status === 'active')
}

// ── (d) posição e chamadores ────────────────────────────────────────────────────────────────────────────────────────
console.log('== (d) posição da guarda e os 4 chamadores ==')
{
  const rt = rd('lib/reverseTrial.ts')
  const pos = (src) => {
    const linhas = src.split('\n')
    const i = (l) => linhas.findIndex((x) => x === l)
    const pago = i("      return { activated: false, reason: 'already_paid' }")
    const porta = i("      return { activated: false, reason: 'card_entry_only' }")
    const pais = i('    if (!filmeGratisPermitido(args.country ?? null)) {')
    const digital = i('    const verdict = await evaluateTrialFingerprint(db, fingerprintHash)')
    return pago > 0 && porta > pago && pais > porta && digital > pais
  }
  checa('a guarda de país mora depois da conta paga (e da porta de cartão) e antes da digital (linhas inteiras)', pos(rt))
  checa('mutante (guarda movida para depois da digital) → vermelho', !pos(trocar(trocar(rt, '    if (!filmeGratisPermitido(args.country ?? null)) {', '    if (!filmeGratisPermitido__MOVIDO) {'), '    const verdict = await evaluateTrialFingerprint(db, fingerprintHash)', '    const verdict = await evaluateTrialFingerprint(db, fingerprintHash)\n    if (!filmeGratisPermitido(args.country ?? null)) {')))
  const chamadores = [
    ['app/auth/callback/route.ts', '            country: paisDoRequest(request.headers), // KINEO-FILME-GRATIS-POR-PAIS-2026-09-29'],
    ['app/api/auth/activation-completed/route.ts', '        country: paisDoRequest(req.headers), // KINEO-FILME-GRATIS-POR-PAIS-2026-09-29'],
    ['app/api/track-signup-source/route.ts', '        country: paisDoRequest(req.headers), // KINEO-FILME-GRATIS-POR-PAIS-2026-09-29'],
    ['app/(dashboard)/studio/create/page.tsx', '      country: paisDoRequest(headers()), // KINEO-FILME-GRATIS-POR-PAIS-2026-09-29'],
  ]
  for (const [f, linha] of chamadores) {
    const src = rd(f)
    checa(`${f}: passa o país do request ao grant`, src.split('\n').includes(linha) && src.includes("import { paisDoRequest } from '@/lib/freeFilmPolicy'") && (src.split('await maybeActivateReverseTrial({').length - 1) === 1)
  }
}

// ── (e) o evento da recusa é só do servidor ─────────────────────────────────────────────────────────────────────────
// Conserto da revisão E1 (A3): trial_region_excluded estava fora de SERVER_ONLY_EVENTS e qualquer navegador podia
// gravá-lo em POST /api/events — a prova "= 0 com 'todos'" e a contagem de excluídos ficavam falsificáveis.
console.log('== (e) trial_region_excluded só do servidor ==')
{
  const sink = rd('app/api/events/route.ts')
  const nomes = (src) => new Set([...((src.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\n\]\)/) || ['', ''])[1].matchAll(/^\s*'([a-z0-9_]+)',/gm))].map((m) => m[1]))
  const prova = (src) => { const n = nomes(src); return n.size > 20 && n.has('payment_success') && n.has(P.TRIAL_REGION_EXCLUDED_EVENT) }
  checa(`SERVER_ONLY_EVENTS (${nomes(sink).size} nomes) inclui ${P.TRIAL_REGION_EXCLUDED_EVENT} (nome derivado de lib/freeFilmPolicy.ts)`, P.TRIAL_REGION_EXCLUDED_EVENT === 'trial_region_excluded' && prova(sink))
  checa('mutante (nome fora da lista do servidor) → vermelho', !prova(trocar(sink, "  'trial_region_excluded',\n", '')))
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log("PASS — interruptor de país pronto em 'todos'; a saída B só liga depois da E4.")
