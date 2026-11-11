// KINEO-TETO-K4-GRATIS-1111 — guardião do teto do Kling 4 grátis. Prova:
//   A. o CASO REAL de 08/11 (15h–21h UTC, fal sem saldo), tentativa a tentativa, na ordem e no horário de verdade: 51 pedidos
//      de 2 pessoas reais (H = RO, B = FR, cada uma com a própria digital), 5 cliques e 46 retomadas do robô da fila
//      ('parked-…'). Na época: 20 reservas de US$ 2,355 (US$ 47,10 no livro, teto do dia 58,88 de 60). Com o teto: 2 reservas
//      (1 por pessoa), as outras 49 vão ao motor barato com UM evento cada (46 retomada_do_robo + 3 teto_conta_24h);
//   B. regras: casa e conta paga fora do teto; o robô é desviado para TODA conta (casa incluída) antes de qualquer leitura;
//      2ª conta no mesmo aparelho em 24 h → teto_aparelho_24h; reserva de mais de 24 h não conta; reserva de US$ 0 (teto do dia)
//      não conta; leitura que falha = motor barato com 'sem_leitura';
//   C. a rota: UMA linha, depois da trava e antes da proporção 9:16, passando o modo serviço, o id do pedido e o "pago";
//   D. o evento está em SERVER_ONLY_EVENTS; E. mutantes.
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
  lib: read('lib/kling4GratisTeto.ts'),
  server: read('lib/kling4GratisTetoServer.ts'),
  route: read('app/api/generate-video-cinematic/route.ts'),
  events: read('app/api/events/route.ts'),
}
function modulo(code, req = {}) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, { module: m, exports: m.exports, require: (id) => { if (id in req) return req[id]; throw new Error('import inesperado ' + id) }, Date, Math, JSON, Number, String, Object, Array, Set, Promise, Error, console })
  return m.exports
}
const HOUSE = 'casa@kineo.test'
const isInternalEmail = (e) => String(e ?? '').toLowerCase() === HOUSE

// banco falso: digitais { user_id, fingerprint_hash }, reservas { user_id, job_id, reserved_milliusd, reserved_at }
function fakeDb(state, reads) {
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
        in(k, arr) { f.push((r) => arr.includes(r[k])); return b },
        limit() { return b },
        then(res, rej) {
          if (state.fail?.[table]) return Promise.resolve({ data: null, count: null, error: { message: 'down' } }).then(res, rej)
          const src = table === 'trial_signup_fingerprints' ? state.fps : table === 'kling4_trial_films' ? state.films : []
          const rows = src.filter((r) => f.every((x) => x(r)))
          return Promise.resolve(head ? { count: rows.length, data: null, error: null } : { data: rows, error: null }).then(res, rej)
        },
      }
      return b
    },
  }
}

function build(S) {
  const lib = modulo(S.lib)
  const events = []
  const server = modulo(S.server, {
    '@/lib/kling4GratisTeto': lib,
    '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    '@/lib/internalAccounts': { isInternalEmail },
  })
  return { lib, server, events }
}

// A sequência REAL de 08/11 (kling4_trial_films das duas contas, em ordem): H/B = pessoa, c = clique, r = robô; HHMM UTC; reserva.
const SEQ_0811 = 'Hc1506:2355 Hc1507:2355 Bc1520:2355 Bc1526:2355 Hc1532:2355 Hr1533:2355 Br1543:2355 Br1548:2355 Hr1553:2355 Hr1558:2355 Br1608:2355 Br1618:2355 Br1628:2355 Br1633:2355 Hr1638:2355 Hr1643:2355 Br1653:2355 Br1658:2355 Hr1703:2355 Hr1708:2355 Br1718:0 Br1728:0 Br1733:0 Hr1738:0 Hr1743:0 Br1753:0 Br1758:0 Hr1803:0 Hr1808:0 Br1818:0 Br1828:0 Hr1833:0 Hr1838:0 Br1848:0 Br1853:0 Hr1858:0 Hr1903:0 Br1918:0 Br1928:0 Br1933:0 Hr1938:0 Hr1943:0 Br1953:0 Br1958:0 Hr2003:0 Hr2008:0 Br2018:0 Br2028:0 Hr2033:0 Hr2038:0 Br2048:0'
const H = '00000000-0000-4000-8000-0000000000a1'
const B = '00000000-0000-4000-8000-0000000000b2'

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  let built
  try { built = build(S) } catch (e) { t(false, 'módulos carregam: ' + e.message); return out }
  const { lib, server, events } = built

  // ── A. o caso real de 08/11 ──
  const seq = SEQ_0811.split(' ').map((s) => { const m = /^([HB])([cr])(\d\d)(\d\d):(\d+)$/.exec(s); return { who: m[1] === 'H' ? H : B, robo: m[2] === 'r', at: Date.UTC(2026, 10, 8, Number(m[3]), Number(m[4])), reservaDeEntao: Number(m[5]) } })
  const state = { fps: [{ user_id: H, fingerprint_hash: 'c8c9ee53' }, { user_id: B, fingerprint_hash: '1090f57d' }], films: [] }
  const reads = []
  const db = fakeDb(state, reads)
  let n = 0
  for (const a of seq) {
    n += 1
    const generationId = a.robo ? `parked-${String(n).padStart(24, '0')}` : `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`
    const passa = await server.kling4GratisDentroDoTeto(db, { userId: a.who, email: a.who === H ? 'h@x.test' : 'b@x.test', generationId, modoServico: a.robo, pago: false, now: a.at })
    if (passa) state.films.push({ user_id: a.who, job_id: generationId, reserved_milliusd: 2355, reserved_at: new Date(a.at).toISOString() })
  }
  const antes = seq.filter((a) => a.reservaDeEntao === 2355).length
  t(seq.length === 51 && seq.filter((a) => !a.robo).length === 5 && antes === 20, `A1 o caso real: 51 pedidos, 5 cliques, 46 do robô, ${antes} reservas na época (US$ ${(antes * 2.355).toFixed(2)})`)
  t(state.films.length === 2 && state.films.filter((f) => f.user_id === H).length === 1 && state.films.filter((f) => f.user_id === B).length === 1, `A2 com o teto: ${state.films.length} reservas (1 por pessoa, US$ ${(state.films.length * 2.355).toFixed(2)})`)
  t(state.films.every((f) => !f.job_id.startsWith('parked-')), 'A3 nenhuma reserva nasce de retomada do robô')
  const motivos = events.map((e) => e.metadata.motivo)
  t(events.length === 49 && motivos.filter((m) => m === 'retomada_do_robo').length === 46 && motivos.filter((m) => m === 'teto_conta_24h').length === 3, `A4 49 desvios, um evento cada (${motivos.filter((m) => m === 'retomada_do_robo').length} robô + ${motivos.filter((m) => m === 'teto_conta_24h').length} teto da conta)`)
  t(events.every((e) => e.name === 'kling4_trial_capped' && e.path === '/api/generate-video-cinematic' && e.metadata.destino === 'h3_max_turbo' && typeof e.metadata.generation_id === 'string'), 'A5 o evento diz motivo, pedido e o motor barato de destino')

  // ── B. regras ──
  const run = async (st, args) => { const r = []; const ev0 = events.length; const p = await server.kling4GratisDentroDoTeto(fakeDb(st, r), { email: 'p@x.test', generationId: '00000000-0000-4000-9000-000000000999', modoServico: false, pago: false, now: Date.UTC(2026, 10, 11, 12), ...args }); return { p, reads: r, ev: events.slice(ev0) } }
  const NOW = Date.UTC(2026, 10, 11, 12)
  const iso = (msAgo) => new Date(NOW - msAgo).toISOString()
  const comReserva = (u, msAgo, mil = 2355) => ({ user_id: u, job_id: 'j' + msAgo, reserved_milliusd: mil, reserved_at: iso(msAgo) })
  let r = await run({ fps: [], films: [comReserva(H, 3600e3)] }, { userId: H, email: HOUSE })
  t(r.p === true && r.reads.length === 0, 'B1 a casa fica fora do teto (sem ler nada)')
  r = await run({ fps: [], films: [comReserva(H, 3600e3)] }, { userId: H, pago: true })
  t(r.p === true && r.reads.length === 0, 'B2 conta paga fica fora do teto')
  r = await run({ fps: [], films: [] }, { userId: H, email: HOUSE, modoServico: true })
  t(r.p === false && r.reads.length === 0 && r.ev[0]?.metadata.motivo === 'retomada_do_robo', 'B3 o robô é desviado para toda conta, a casa incluída, antes de qualquer leitura')
  r = await run({ fps: [], films: [] }, { userId: H, generationId: 'parked-abc' })
  t(r.p === false && r.ev[0]?.metadata.motivo === 'retomada_do_robo', 'B4 pedido "parked-…" sem o cabeçalho de serviço também é retomada')
  r = await run({ fps: [], films: [] }, { userId: H })
  t(r.p === true && r.ev.length === 0, 'B5 primeiro envio da conta passa (nenhum evento)')
  r = await run({ fps: [{ user_id: H, fingerprint_hash: 'aa' }, { user_id: B, fingerprint_hash: 'aa' }], films: [comReserva(B, 2 * 3600e3)] }, { userId: H })
  t(r.p === false && r.ev[0]?.metadata.motivo === 'teto_aparelho_24h', 'B6 2ª conta no mesmo aparelho em 24 h → motor barato')
  r = await run({ fps: [], films: [comReserva(H, 25 * 3600e3)] }, { userId: H })
  t(r.p === true, 'B7 reserva de mais de 24 h não conta')
  r = await run({ fps: [], films: [comReserva(H, 3600e3, 0)] }, { userId: H })
  t(r.p === true, 'B8 linha de US$ 0 (teto do dia, nada enviado) não conta')
  r = await run({ fps: [], films: [], fail: { kling4_trial_films: true } }, { userId: H })
  t(r.p === false && r.ev[0]?.metadata.motivo === 'sem_leitura', 'B9 leitura do livro falhou → motor barato, sem_leitura')
  r = await run({ fps: [], films: [], fail: { trial_signup_fingerprints: true } }, { userId: H })
  t(r.p === false && r.ev[0]?.metadata.motivo === 'sem_leitura', 'B10 leitura da digital falhou → motor barato, sem_leitura')
  t(lib.KLING4_GRATIS_TETO_1111 === 'on' && lib.KLING4_GRATIS_TETO_ENVIOS === 1 && lib.KLING4_GRATIS_TETO_HORAS === 24, 'B11 nasce ligado: 1 envio por 24 h')
  t(lib.kling4GratisTetoMotivo({ robo: false, casa: true, pago: false, enviosConta: 3, enviosAparelho: 3 }) === null && lib.kling4GratisTetoMotivo({ robo: false, casa: false, pago: true, enviosConta: 3, enviosAparelho: 3 }) === null && lib.kling4GratisTetoMotivo({ robo: false, casa: false, pago: false, enviosConta: 1, enviosAparelho: 0 }) === 'teto_conta_24h', 'B13 a regra pura: casa e paga fora do teto mesmo com envios')
  t(/export const PARKED_RESUME_PREFIX = 'parked-'/.test(read('lib/filaQuedaFal.ts')) && lib.KLING4_GRATIS_TETO_PREFIXO_ROBO === 'parked-', 'B12 o prefixo do robô é o mesmo da fila (lib/filaQuedaFal.ts)')

  // ── C. a rota ──
  const iTrava = S.route.indexOf('kling4TrialCandidate = await kling4GratisPassaNaTrava(')
  const iTeto = S.route.indexOf('if (kling4TrialCandidate) kling4TrialCandidate = await kling4GratisDentroDoTeto(cinematicAdmin, { userId: user.id, email: user.email, generationId, modoServico: isServiceJob, pago: isPaidUser })')
  const i916 = S.route.indexOf("if (kling4TrialCandidate) aspectRequested = '9:16'")
  t(iTrava > 0 && iTeto > iTrava && i916 > iTeto && S.route.slice(iTrava, i916).split('\n').length === 3, 'C1 uma linha, depois da trava e antes do 9:16')
  t((S.route.match(/kling4GratisDentroDoTeto/g) || []).length === 2 && /import \{ kling4GratisDentroDoTeto \} from '@\/lib\/kling4GratisTetoServer'/.test(S.route), 'C2 importada e chamada uma vez')
  const iReserva = S.route.indexOf('reserve: () => reserveKling4Trial(')
  t(iReserva > iTeto, 'C3 o teto decide ANTES da reserva (nenhum envio pago sem passar por ele)')
  // ── D ──
  const iSet = S.events.indexOf('SERVER_ONLY_EVENTS')
  t(iSet > 0 && S.events.indexOf("'kling4_trial_capped'", iSet) > iSet, 'D1 kling4_trial_capped é evento só de servidor')
  return out
}

for (const [c, m] of await suite(SRC)) ok(c, m)
const MUTANTS = [
  ['robô deixa de ser desviado', 'lib', "if (p.robo === true) return 'retomada_do_robo'", ''],
  ['teto vira 2 envios', 'lib', 'export const KLING4_GRATIS_TETO_ENVIOS = 1', 'export const KLING4_GRATIS_TETO_ENVIOS = 2'],
  ['janela vira 1 h', 'lib', 'export const KLING4_GRATIS_TETO_HORAS = 24', 'export const KLING4_GRATIS_TETO_HORAS = 1'],
  ['casa entra no teto', 'lib', 'if (p.casa === true || p.pago === true) return null', 'if (p.pago === true) return null'],
  ['servidor lê o livro da casa', 'server', 'if (!robo && !casa && a.pago !== true) {', 'if (!robo && a.pago !== true) {'],
  ['leitura que falha passa', 'lib', "if (typeof p.enviosConta !== 'number' || !Number.isFinite(p.enviosConta)) return 'sem_leitura'", "if (typeof p.enviosConta !== 'number' || !Number.isFinite(p.enviosConta)) return null"],
  ['aparelho ignorado', 'lib', "if (p.enviosAparelho >= KLING4_GRATIS_TETO_ENVIOS) return 'teto_aparelho_24h'", ''],
  ['"parked-" deixa de ser robô', 'lib', "a.generationId.startsWith(KLING4_GRATIS_TETO_PREFIXO_ROBO)", 'false'],
  ['conta reserva de US$ 0', 'server', ".eq('reserved_milliusd', RESERVA_MILLIUSD)", ''],
  ['desvio sem evento', 'server', 'await writeServerEvent({', 'void ({'],
  ['rota sem o teto', 'route', 'if (kling4TrialCandidate) kling4TrialCandidate = await kling4GratisDentroDoTeto(', 'if (false) kling4TrialCandidate = await kling4GratisDentroDoTeto('],
  ['rota não passa o modo serviço', 'route', 'modoServico: isServiceJob, pago: isPaidUser', 'modoServico: false, pago: isPaidUser'],
  ['evento sai da lista do servidor', 'events', "  'kling4_trial_capped',", ''],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  ok((await suite({ ...SRC, [key]: SRC[key].replace(from, to) })).some(([c]) => !c), `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
