// KINEO-TRAVA-K4-GRATIS-1111 — guardião da trava do Kling 4 grátis. Prova:
//   A. regras puras: caixa normalizada (Gmail sem "+", sem pontos, googlemail = gmail), "+" e relay detectados, motivos;
//   B. o CASO REAL de 11/11 (e-mails anonimizados; a forma e a digital são as de verdade): a72a2b23 = "+grisham" e
//      "+maynard" → os dois desviados (plus; o 2º também por digital); duck.com na 2ª ativação de 56ed2e3e → desviado
//      (relay + digital); o lead real do Brasil (Gmail com ponto, sem "+", digital própria, caixa nova) → CONTINUA no Kling 4;
//   C. o lado de servidor EXECUTADO com banco falso: casa e 'off' passam sem ler nada; desvio grava UM evento de servidor
//      com os motivos; leitura que falha = 'sem_prova' (motor barato, nunca recusa); conta sem digital gravada passa;
//   D. a rota do filme: UMA linha, depois da candidatura e antes da proporção 9:16, dentro do bloco que já exige conta não
//      paga (conta paga nunca é desviada);
//   E. o evento está em SERVER_ONLY_EVENTS; F. mutantes.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const SRC = {
  lib: read('lib/kling4GratisTrava.ts'),
  server: read('lib/kling4GratisTravaServer.ts'),
  route: read('app/api/generate-video-cinematic/route.ts'),
  events: read('app/api/events/route.ts'),
}
function modulo(code, req = {}) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, { module: m, exports: m.exports, require: (id) => { if (id in req) return req[id]; throw new Error('import inesperado ' + id) }, Date, Math, JSON, Number, String, Object, Array, Promise, Error, Set })
  return m.exports
}
const HOUSE = 'josephsskaf@gmail.com'
const isInternalEmail = (e) => String(e ?? '').toLowerCase() === HOUSE

// banco falso: digitais { user_id, fingerprint_hash, created_at, outcome }, filmes K4 { user_id, engine_used }, perfis { id, email }
function fakeDb({ fps = [], films = [], profiles = [], fail = {} }, reads) {
  return {
    from(table) {
      reads.push(table)
      const f = []
      let head = false
      const b = {
        select(_c, o) { head = !!o?.head; return b },
        eq(k, v) { f.push((r) => r[k] === v); return b },
        neq(k, v) { f.push((r) => r[k] !== v); return b },
        gte(k, v) { f.push((r) => r[k] >= v); return b },
        lt(k, v) { f.push((r) => r[k] < v); return b },
        in(k, arr) { f.push((r) => arr.includes(r[k])); return b },
        order() { return b },
        limit(n) { return b.then ? b : b },
        then(res, rej) {
          if (fail[table]) return Promise.resolve({ data: null, count: null, error: { message: 'down' } }).then(res, rej)
          const src = table === 'trial_signup_fingerprints' ? fps : table === 'kling4_trial_films' ? films : profiles
          const rows = src.filter((r) => f.every((x) => x(r)))
          return Promise.resolve(head ? { count: rows.length, data: null, error: null } : { data: rows, error: null }).then(res, rej)
        },
      }
      return b
    },
  }
}
async function runServer(S, { userId, email, db = {}, now = Date.parse('2026-11-11T09:00:00Z') }) {
  const reads = []
  const events = []
  const L = modulo(S.lib)
  const Srv = modulo(S.server, {
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    '@/lib/internalAccounts': { isInternalEmail },
    '@/lib/kling4GratisTrava': L,
  })
  const passa = await Srv.kling4GratisPassaNaTrava(fakeDb(db, reads), { userId, email, now })
  return { passa, reads, events }
}

// o caso de 11/11, anonimizado (horários e digitais reais; e-mails trocados)
const T = (h) => `2026-11-11T${h}Z`
const FPS = [
  { user_id: 'u-grisham', fingerprint_hash: 'a72a2b23xxxx', created_at: T('07:29:59'), outcome: 'activated' },
  { user_id: 'u-maynard', fingerprint_hash: 'a72a2b23xxxx', created_at: T('07:42:20'), outcome: 'activated' },
  { user_id: 'u-lead-br', fingerprint_hash: 'f731f9ccxxxx', created_at: T('07:47:26'), outcome: 'activated' },
  { user_id: 'u-at-1', fingerprint_hash: '56ed2e3exxxx', created_at: T('08:22:30'), outcome: 'activated' },
  { user_id: 'u-duck', fingerprint_hash: '56ed2e3exxxx', created_at: T('08:40:15'), outcome: 'activated' },
]
const E = {
  grisham: 'qwxzrtplkjhgfds+grisham@gmail.com',
  maynard: 'mnbvcxzasdf3736+maynard@gmail.com',
  leadBr: 'estudio.lead@gmail.com',
  at1: 'a12345678@gmail.com',
  duck: 'word-word-word@duck.com',
}

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  const L = modulo(S.lib)
  // A
  t(L.caixaNormalizada('Jo.Ao.Silva+promo@GoogleMail.com') === 'joaosilva@gmail.com' && L.caixaNormalizada('ana+x@outlook.com') === 'ana@outlook.com' && L.caixaNormalizada('a.b@outlook.com') === 'a.b@outlook.com' && L.caixaNormalizada('lixo') === null, 'A1 caixa normalizada: Gmail sem "+", sem pontos, googlemail = gmail; outros só sem "+"')
  t(L.emailTemMais('a+b@gmail.com') && !L.emailTemMais('a.b@gmail.com') && !L.emailTemMais(null), 'A2 "+" detectado')
  t(L.emailDeRelay('x@duck.com') && L.emailDeRelay('x@privaterelay.appleid.com') && L.emailDeRelay('x@mozmail.com') && !L.emailDeRelay('x@gmail.com') && !L.emailDeRelay('x@duck.com.br'), 'A3 relay detectado (duck, Apple, Firefox…), sem falso positivo')
  t(L.kling4GratisMotivos({ email: 'a@gmail.com', outrasNaDigitalAntes: 0, caixasQueJaReceberam: [] }).length === 0, 'A4 conta limpa: nenhum motivo')
  t(L.kling4GratisMotivos({ email: 'a.b@gmail.com', outrasNaDigitalAntes: 0, caixasQueJaReceberam: ['ab@gmail.com'] }).join() === 'gmail_repetido', 'A5 a mesma caixa com pontos = gmail_repetido')
  t(L.kling4GratisMotivos({ email: 'a@gmail.com', outrasNaDigitalAntes: null, caixasQueJaReceberam: [] }).join() === 'sem_prova', 'A6 leitura que falhou = sem_prova (motor barato, nunca recusa)')
  t(/KLING4_GRATIS_TRAVA_1111: Kling4GratisTravaRelease = 'on'/.test(S.lib), "A7 nasce LIGADA ('on')")
  // B — o caso real
  const db = { fps: FPS, films: [{ user_id: 'u-antigo', engine_used: 'kling4' }], profiles: [{ id: 'u-antigo', email: 'cliente.antigo@gmail.com' }] }
  const g = await runServer(S, { userId: 'u-grisham', email: E.grisham, db })
  t(g.passa === false && g.events[0]?.metadata?.motivos?.join() === 'plus', 'B1 a72a2b23, 1ª conta ("+grisham"): desviada por plus')
  const m = await runServer(S, { userId: 'u-maynard', email: E.maynard, db })
  t(m.passa === false && m.events[0]?.metadata?.motivos?.includes('plus') && m.events[0]?.metadata?.motivos?.includes('digital'), 'B2 a72a2b23, 2ª conta ("+maynard"): desviada por plus E digital')
  const d = await runServer(S, { userId: 'u-duck', email: E.duck, db })
  t(d.passa === false && d.events[0]?.metadata?.motivos?.includes('relay') && d.events[0]?.metadata?.motivos?.includes('digital'), 'B3 56ed2e3e, 2ª conta (duck.com): desviada por relay E digital')
  const at1 = await runServer(S, { userId: 'u-at-1', email: E.at1, db })
  t(at1.passa === true, 'B4 56ed2e3e, 1ª conta (Gmail limpo): passa — N=1 deixa a 1ª do aparelho')
  const lead = await runServer(S, { userId: 'u-lead-br', email: E.leadBr, db })
  t(lead.passa === true && lead.events.length === 0, 'B5 o lead real do Brasil (Gmail com ponto, sem "+", digital própria, caixa nova): CONTINUA no Kling 4')
  const rep = await runServer(S, { userId: 'u-novo', email: 'cliente.antigo+2@gmail.com', db: { ...db, fps: [] } })
  t(rep.passa === false && rep.events[0]?.metadata?.motivos?.includes('gmail_repetido'), 'B6 a caixa que já ganhou um Kling 4 voltando com "+": gmail_repetido')
  const repDot = await runServer(S, { userId: 'u-novo2', email: 'c.l.i.e.n.t.e.antigo@googlemail.com', db: { ...db, fps: [] } })
  t(repDot.passa === false && repDot.events[0]?.metadata?.motivos?.join() === 'gmail_repetido', 'B7 a mesma caixa com pontos e googlemail: gmail_repetido')
  // C
  const casa = await runServer(S, { userId: 'u-casa', email: HOUSE, db })
  t(casa.passa === true && casa.reads.length === 0 && casa.events.length === 0, 'C1 conta da casa passa direto (sem leitura, sem evento)')
  const offS = { ...S, lib: S.lib.replace("KLING4_GRATIS_TRAVA_1111: Kling4GratisTravaRelease = 'on'", "KLING4_GRATIS_TRAVA_1111: Kling4GratisTravaRelease = 'off'") }
  const off = await runServer(offS, { userId: 'u-grisham', email: E.grisham, db })
  t(off.passa === true && off.reads.length === 0 && off.events.length === 0, "C2 'off': passa sem ler nada (a regra de antes)")
  const semFp = await runServer(S, { userId: 'u-sem-fp', email: 'limpo@gmail.com', db })
  t(semFp.passa === true, 'C3 conta sem digital gravada passa (sem sinal = conceder)')
  const caiu = await runServer(S, { userId: 'u-lead-br', email: E.leadBr, db: { ...db, fail: { trial_signup_fingerprints: true } } })
  t(caiu.passa === false && caiu.events[0]?.metadata?.motivos?.join() === 'sem_prova', 'C4 banco fora do ar: sem_prova (motor barato, o filme grátis sai)')
  t(g.events.length === 1 && g.events[0].name === 'kling4_trial_diverted' && g.events[0].userId === 'u-grisham' && g.events[0].metadata?.version === 'trava_k4_gratis_v1_1111', 'C5 UM evento de servidor por desvio, com motivos e versão')
  // D — a rota
  const R = S.route
  const iCand = R.indexOf('kling4TrialCandidate = kling4TrialEligible(')
  const iTrava = R.indexOf('if (kling4TrialCandidate) kling4TrialCandidate = await kling4GratisPassaNaTrava(cinematicAdmin, { userId: user.id, email: user.email })')
  const iAspect = R.indexOf("if (kling4TrialCandidate) aspectRequested = '9:16'")
  const iBloco = R.lastIndexOf('if (KLING4_TRIAL_LIVE && seedanceShortFilm && !isPaidUser && currentProfile.has_paid !== true &&', iTrava)
  t(iCand > 0 && iTrava > iCand && iAspect > iTrava && iBloco > 0 && iBloco < iCand, 'D1 a trava roda DEPOIS da candidatura e ANTES do 9:16, dentro do bloco que exige conta não paga')
  t(R.split('kling4GratisPassaNaTrava(').length === 2 && /import \{ kling4GratisPassaNaTrava \} from '@\/lib\/kling4GratisTravaServer'/.test(R), 'D2 uma chamada só e o import')
  // E
  t(S.events.includes("'kling4_trial_diverted',"), 'E1 o evento está em SERVER_ONLY_EVENTS')
  return out
}

for (const [c, m] of await suite(SRC)) ok(c, m)

const MUTANTS = [
  ['nasce desligada', 'lib', "KLING4_GRATIS_TRAVA_1111: Kling4GratisTravaRelease = 'on'", "KLING4_GRATIS_TRAVA_1111: Kling4GratisTravaRelease = 'off'"],
  ['"+" liberado', 'lib', "  if (emailTemMais(p.email)) m.push('plus')\n", ''],
  ['relay liberado', 'lib', "  if (emailDeRelay(p.email)) m.push('relay')\n", ''],
  ['digital N=2', 'lib', "p.outrasNaDigitalAntes > 0) m.push('digital')", "p.outrasNaDigitalAntes > 1) m.push('digital')"],
  ['gmail sem tirar pontos', 'lib', "return `${semMais.replace(/\\./g, '')}@gmail.com`", 'return `${semMais}@gmail.com`'],
  ['googlemail diferente', 'lib', "const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com']", "const GMAIL_DOMAINS = ['gmail.com']"],
  ['sem prova vira Kling 4', 'lib', "  if (p.outrasNaDigitalAntes === null || p.caixasQueJaReceberam === null) m.push('sem_prova')\n", ''],
  ['casa desviada', 'server', '  if (isInternalEmail(email)) return true\n', ''],
  ['desvio sem evento', 'server', '  await writeServerEvent({', '  void ({'],
  ['digital conta quem veio depois', 'server', ".gte('created_at', desde).lt('created_at', row.created_at)", ".gte('created_at', desde)"],
  ['rota sem a trava', 'route', 'if (kling4TrialCandidate) kling4TrialCandidate = await kling4GratisPassaNaTrava(', 'if (false) kling4TrialCandidate = await kling4GratisPassaNaTrava('],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  let caught = false
  try { caught = (await suite({ ...SRC, [key]: SRC[key].replace(from, to) })).some(([c]) => !c) } catch { caught = true }
  ok(caught, `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
