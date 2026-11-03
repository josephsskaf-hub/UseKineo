// KINEO-AMOSTRA-QUEIMADA-0311 — guardião da leva das 15 pessoas de 03/11.
//   (A) a amostra grátis de anúncio cujo PLANO nunca saiu não conta como usada e a semente é retomada (bloom.boca.llc, pedido
//       8e456a32 parado em 'planned' só com a marca): pedidoDeAmostraSemPlano (pura) com a forma real; a rota retoma a semente sem
//       nova reserva; a elegibilidade e o upload da foto leem a mesma régua;
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-amostra-queimada-0311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '..')
const ts = createRequire(import.meta.url)(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { server: 'lib/ads/cena/escolhaSampleServer.ts', rota: 'lib/ads/cena/internalEscolha.ts', eleg: 'lib/ads/eligibility.ts' }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function carrega(src, inicio, fim, nomes) {
  const i = src.indexOf(inicio), j = fim ? src.indexOf(fim, i) : src.length
  if (i < 0 || j < 0) throw Error('trecho ausente: ' + inicio)
  const js = ts.transpileModule(src.slice(i, j) + `\nmodule.exports = { ${nomes.join(', ')} }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = { exports: {} }; new Function('module', 'exports', js)(m, m.exports); return m.exports
}

const AGORA = Date.parse('2026-11-03T14:00:00Z')
// A forma REAL do pedido 8e456a32 (02/11 23:43 UTC): semente 'planned', só a marca, lease da semente nunca liberada.
const SEMENTE = { id: '8e456a32-61a6-4540-a317-966301a78782', status: 'planned', error: null, credits_charged: 0, started_at: null, delivered_at: null, generation_id: null, assembly_lease_at: '2026-11-02T23:43:08.983+00:00', created_at: '2026-11-02T23:43:09.017923+00:00', updated_at: '2026-11-02T23:43:09.017923+00:00', plan: { cena: { plan: { escolha: { marker: 'KINEO-ADS-ESCOLHA-2310', sample: 'KINEO-AMOSTRA-ANUNCIO-2410' } }, route: 'kling4' } } }

function checa(over = {}) {
  const erros = []
  const req = (c, m) => { if (!c) erros.push(m) }
  const sv = over[F.server] ?? read(F.server)
  let f = null
  try { f = carrega(sv, 'export const AMOSTRA_QUEIMADA_MARCA', 'export async function amostraSemPlano', ['pedidoDeAmostraSemPlano']).pedidoDeAmostraSemPlano } catch (e) { erros.push('A helper não compila: ' + e.message) }
  if (f) {
    req(f(SEMENTE, AGORA) === true, 'A a semente real de 8e456a32 é "plano nunca saiu"')
    req(f({ ...SEMENTE, assembly_lease_at: new Date(AGORA - 60_000).toISOString() }, AGORA) === false, 'A planejamento em curso (semente de 1 min) continua contando como usada')
    req(f({ ...SEMENTE, status: 'cancelled', error: 'abandoned_48h' }, AGORA) === true, 'A a semente cancelada pela faxina de 48 h volta')
    req(f({ ...SEMENTE, status: 'cancelled', error: 'moderation' }, AGORA) === false, 'A cancelada por outro motivo continua usada')
    req(f({ ...SEMENTE, plan: { ...SEMENTE.plan, narration: 'Hi', escolhaFlow: {} } }, AGORA) === false, 'A pedido com plano gravado = usada')
    req(f({ ...SEMENTE, plan: { cena: { plan: { escolha: {}, script: { narration: 'x' } } } } }, AGORA) === false, 'A plano com roteiro = usada')
    req(f({ ...SEMENTE, status: 'generating' }, AGORA) === false && f({ ...SEMENTE, delivered_at: '2026-11-03' }, AGORA) === false && f({ ...SEMENTE, generation_id: 'g' }, AGORA) === false && f({ ...SEMENTE, credits_charged: 5 }, AGORA) === false, 'A em geração / entregue / com geração / com débito = usada')
    req(f(null, AGORA) === false, 'A sem pedido = usada (falha fechada)')
  }
  req(/if \(!r\.error && r\.data && await amostraSemPlano\(admin, actorId\)\) return false/.test(sv), 'A escolhaSampleUsed (upload da foto) lê a régua')
  const ro = over[F.rota] ?? read(F.rota)
  const iRet = ro.indexOf('const parada = await amostraSemPlano(d.admin, user.id, now())'), iSeed = ro.indexOf("const seed = sampleOrder ? null : await d.admin.from('ads_v2_orders').insert(")
  req(iRet > 0 && iSeed > iRet, 'A a rota procura a semente parada ANTES de criar uma nova')
  req(/retoma = parada\.lease \? retoma\.eq\('assembly_lease_at', parada\.lease\) : retoma\.is\('assembly_lease_at', null\)/.test(ro) && /\.in\('status', \['planned', 'cancelled'\]\)\.eq\('credits_charged', 0\)\.is\('started_at', null\)/.test(ro), 'A a retomada é condicional (lease, status, sem débito, sem início)')
  req(/if \(seed\) \{[^]*?const reservation = await reserveEscolhaSample/.test(ro), 'A só a semente NOVA reserva (a retomada não reserva de novo)')
  const el = over[F.eleg] ?? read(F.eleg)
  req(/if \(row && !base\.sampleDelivered && await amostraSemPlano\(admin, user\.id\)\) \{ used = false; base\.sampleOrderId = null \}/.test(el), 'A a elegibilidade (tela/cards) devolve a amostra')
  return erros
}

const base = checa()
ok(base.length === 0, `todas as provas verdes (${base.length} erro(s))${base.length ? ': ' + base.join(' · ') : ''}`)
const sv = read(F.server), ro = read(F.rota)
const MUTANTES = [
  ['semente em curso conta como parada', { [F.server]: sv.replace('nowMs - desde >= AMOSTRA_SEMENTE_PARADA_MS', 'nowMs - desde >= 0') }],
  ['plano gravado volta a valer', { [F.server]: sv.replace(" || plan!.escolhaFlow || plan!.narration) return false", ') return false') }],
  ['retomada sem lease condicional', { [F.rota]: ro.replace("retoma = parada.lease ? retoma.eq('assembly_lease_at', parada.lease) : retoma.is('assembly_lease_at', null)", 'retoma = retoma') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
