// KINEO-VEO-DESLIGA-1711 — a fal desliga os endereços do Veo 3.1 (fal-ai/veo3.1/*) em 17/11/2026.
//
// Este guardião trava (Node puro: módulos reais transpilados; sem rede, sem banco, sem FAL_KEY):
//   (a) a régua única (lib/veoDesligado.ts): todo endereço fal-ai/veo* que o código cita é reconhecido; a data é 17/11 00:00 UTC;
//   (b) o envio à fila da fal (lib/falQueue.ts, por onde passam filme, retomada de cena, refação grátis e anúncio) recusa o
//       Veo depois do desligamento SEM POST (fetch nunca chamado), com erro explícito (ambiguous:false, 410); outro motor segue;
//   (c) o portão do filme: o Veo recusa a conta da casa também (engineRetiredForHouse), o Kling 2.5 continua passando a casa;
//   (d) o anúncio interno: sem rota, com fala, ou com a 'veo31' que a tela manda, resolve para a rota dos clientes (kling3);
//   (e) a refação grátis recusa cena Veo desligada antes de gravar, reservar vaga ou enviar.
// Mutantes em memória no fim: cada regressão típica tem de ficar vermelha.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import('typescript')).default
const DESLIGA = Date.UTC(2026, 10, 17, 0, 0, 0)
const ANTES = DESLIGA - 1000

const tmp = mkdtempSync(join(tmpdir(), 'veo-1711-'))
let seq = 0
// Transpila a fonte (já com mutação, se houver), reescreve '@/lib/x' para os módulos indicados e devolve a URL do módulo.
async function moduleUrl(src, links = {}) {
  let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [from, to] of Object.entries(links)) out = out.split(`'${from}'`).join(`'${to}'`)
  const f = join(tmp, `m${seq++}.mjs`)
  writeFileSync(f, out)
  return pathToFileURL(f).href
}

const FILES = {
  veo: 'lib/veoDesligado.ts', queue: 'lib/falQueue.ts', launch: 'lib/engineLaunch.ts', adapters: 'lib/ads/cena/adapters.ts',
  redo: 'lib/freeRedo/filmServer.ts', route: 'app/api/generate-video-cinematic/route.ts', rate: 'lib/rateLimit.ts', letreiro: 'lib/semConviteDeLetreiro.ts',
}

// Todo endereço fal-ai/veo* citado em app/ e lib/ (o que um dia pode virar POST).
function veoEndpointsInRepo() {
  const found = new Set()
  const walk = (dir) => {
    for (const name of readdirSync(new URL(dir, root))) {
      const rel = `${dir}/${name}`
      if (name === 'node_modules' || name.startsWith('.')) continue
      const st = statSync(new URL(rel, root))
      if (st.isDirectory()) walk(rel)
      else if (/\.(ts|tsx)$/.test(name)) for (const m of read(rel).matchAll(/'(fal-ai\/veo[^'\s]*)'/g)) found.add(m[1])
    }
  }
  walk('app'); walk('lib')
  return [...found]
}
const ENDPOINTS = veoEndpointsInRepo()

async function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let V, Q, L, A
  try {
    const veoUrl = await moduleUrl(S.veo)
    V = await import(veoUrl)
    const rateUrl = await moduleUrl(S.rate), letUrl = await moduleUrl(S.letreiro)
    Q = await import(await moduleUrl(S.queue, { '@/lib/rateLimit': rateUrl, '@/lib/semConviteDeLetreiro': letUrl, '@/lib/veoDesligado': veoUrl }))
    const internalUrl = await moduleUrl('export function isInternalEmail() { return false }')
    L = await import(await moduleUrl(S.launch, { '@/lib/internalAccounts': internalUrl }))
    A = await import(await moduleUrl(S.adapters))
  } catch (e) { return [`módulos não carregam: ${e instanceof Error ? e.message : e}`] }

  // (a) régua única
  no(ENDPOINTS.length < 6, `varredura achou só ${ENDPOINTS.length} endereço(s) Veo — a varredura quebrou`)
  for (const ep of ENDPOINTS) no(V.ehEnderecoVeo?.(ep) !== true, `régua: ${ep} não é reconhecido como Veo`)
  for (const ep of ['fal-ai/bytedance/seedance/v1.5/pro/text-to-video', 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', 'minimax/h3-max-turbo/image-to-video', 'kling/v4/flash/image-to-video', 'bytedance/seedance-2.0/image-to-video'])
    no(V.ehEnderecoVeo?.(ep) !== false, `régua: ${ep} (vivo) foi lido como Veo`)
  no(V.VEO_FAL_DESLIGA_EM_MS !== DESLIGA, 'régua: a data do desligamento não é 17/11/2026 00:00 UTC')
  no(V.veoDesligado?.('fal-ai/veo3.1/fast', ANTES) !== false, 'régua: Veo recusado ANTES de 17/11 (refação grátis de filme antigo morreria cedo)')
  no(V.veoDesligado?.('fal-ai/veo3.1/fast', DESLIGA) !== true, 'régua: Veo liberado em 17/11')
  no(V.veoDesligado?.('fal-ai/veo3.1/reference-to-video', NaN) !== true, 'régua: relógio inválido libera o Veo (falha tem de ser fechada)')
  no(V.veoDesligado?.('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', DESLIGA + 1e9) !== false, 'régua: motor vivo recusado')

  // (b) envio à fila: sem POST
  const realNow = Date.now, realFetch = globalThis.fetch, realKey = process.env.FAL_KEY
  let posts = 0, fetches = 0
  globalThis.fetch = async () => { fetches++; return new Response(JSON.stringify({ request_id: 'req-1' }), { status: 200 }) }
  process.env.FAL_KEY = 'test-key-sem-rede'
  try {
    Date.now = () => DESLIGA + 60_000
    for (const ep of ENDPOINTS) {
      let err = null
      try { await Q.submitFalQueueOnce(ep, { prompt: 'x' }, () => { posts++ }) } catch (e) { err = e }
      no(!err, `fila: ${ep} foi enviado depois de 17/11`)
      no(err && !(err instanceof Q.FalQueueSubmitError), `fila: ${ep} recusado com erro genérico (o chamador leria como ambíguo e gastaria tentativa)`)
      no(err && err.ambiguous !== false, `fila: ${ep} recusado como AMBÍGUO`)
      no(err && err.status !== 410, `fila: ${ep} recusado sem o 410`)
    }
    no(fetches !== 0 || posts !== 0, `fila: houve ${fetches} fetch(es)/${posts} POST(s) para o Veo depois de 17/11`)
    const id = await Q.submitFalQueueOnce('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', { prompt: 'x' }).catch(() => null)
    no(id !== 'req-1', 'fila: motor vivo deixou de ser enviado depois de 17/11')
    fetches = 0
    Date.now = () => ANTES
    const antes = await Q.submitFalQueueOnce('fal-ai/veo3.1/fast', { prompt: 'x' }).catch(() => null)
    no(antes !== 'req-1' || fetches !== 1, 'fila: Veo recusado antes de 17/11')
  } finally {
    Date.now = realNow; globalThis.fetch = realFetch
    if (realKey === undefined) delete process.env.FAL_KEY; else process.env.FAL_KEY = realKey
  }

  // (c) portão do filme
  no(L.engineRetiredForHouse?.('veo') !== true, 'filme: a casa ainda passa no Veo')
  no(L.engineRetiredForHouse?.('VEO') !== true, 'filme: "VEO" maiúsculo escapa do portão da casa')
  no(L.engineRetiredForHouse?.('kling') !== false, 'filme: o Kling 2.5 (vivo na fal) passou a recusar a casa')
  for (const k of ['seedance', 'hollywood', 'h3', 'h3max', 's25', '', null]) no(L.engineRetiredForHouse?.(k) !== false, `filme: ${k} recusado para a casa`)
  const r = S.route
  no(!r.includes('if (aposentado && (!isDryRunAccount(user.email) || engineRetiredForHouse(body.engine))) {'), 'filme: o portão do aposentado não recusa a casa no Veo')
  no(r.split('engineRetiredForHouse(').length !== 2, 'filme: engineRetiredForHouse fora do portão (ou duplicado)')
  no(!r.includes("reason: ENGINE_RETIRED_REASON, engine: body.engine, alternative: aposentado.alternative, retryable: false, charged: false, refunded: false }, { status: 410 })"), 'filme: a recusa deixou de ser o mesmo 410 dos clientes')

  // (d) anúncio interno
  no(A.cenaResolveRoute?.('talking') !== 'kling3', 'anúncio: padrão da fala não é a rota dos clientes (kling3)')
  no(A.cenaResolveRoute?.('narrated') !== 'kling3', 'anúncio: padrão narrado mudou')
  no(A.cenaResolveRoute?.('talking', 'veo31') !== 'kling3', 'anúncio: rota veo31 pedida pela tela ainda resolve para Veo')
  for (const rota of ['kling3', 'kling4', 'seedance2']) no(A.cenaResolveRoute?.('talking', rota) !== rota, `anúncio: rota ${rota} escolhida foi trocada`)
  let bad = null; try { A.cenaResolveRoute('talking', 'sora') } catch (e) { bad = e }
  no(!(bad instanceof Error) || bad.message !== 'cena_bad_route', 'anúncio: rota desconhecida deixou de ser recusada')

  // (e) refação grátis
  const redo = S.redo
  const iCena = redo.indexOf("if (!cena) return r(400, { ok: false, motivo: 'cena_invalida'")
  const iGate = redo.indexOf("if (veoDesligado(cena.model, d.now())) return r(409, { ok: false, motivo: 'motor_desligado', estado: 'unavailable' })")
  const iPedido = redo.indexOf('const lido = await lerPedido(d, a.userId, videoId)', iCena)
  const iVaga = redo.indexOf('reservarVagaDoDia(d.db', iCena)
  const iSubmit = redo.indexOf('d.submitScene(cena.model', iCena)
  no(iGate < 0, 'refação: cena Veo desligada não é recusada')
  no(iGate >= 0 && !(iGate > iCena && iGate < iPedido && iGate < iVaga && iGate < iSubmit), 'refação: a recusa do Veo veio depois de gravar/reservar/enviar')
  return p
}

const SRC = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)]))
let n = 0
const atual = await problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
console.log(`ok  estado atual limpo (${ENDPOINTS.length} endereços Veo varridos: ${ENDPOINTS.join(', ')})`)
n++

const MUTANTES = [
  ['M1 fila sem o cinto do Veo', 'queue', (s) => s.replace(/  if \(veoDesligado\(model, Date\.now\(\)\)\) \{\n[^\n]*\n  \}\n/, '')],
  ['M2 cinto lança erro AMBÍGUO', 'queue', (s) => s.replace("{ ambiguous: false, status: 410 })", "{ ambiguous: true, status: 410 })")],
  ['M3 cinto depois do POST', 'queue', (s) => s.replace(/  if \(veoDesligado\(model, Date\.now\(\)\)\) \{\n([^\n]*)\n  \}\n/, '').replace("  return requestId\n}", "  if (veoDesligado(model, Date.now())) throw new FalQueueSubmitError('late', { ambiguous: false, status: 410 })\n  return requestId\n}")],
  ['M4 régua só pega veo3.1/fast', 'veo', (s) => s.replace("startsWith('fal-ai/veo')", "startsWith('fal-ai/veo3.1/fast')")],
  ['M5 data trocada para 18/11', 'veo', (s) => s.replace('Date.UTC(2026, 10, 17, 0, 0, 0)', 'Date.UTC(2026, 10, 18, 0, 0, 0)')],
  ['M6 relógio inválido libera', 'veo', (s) => s.replace('(!Number.isFinite(nowMs) || nowMs >= VEO_FAL_DESLIGA_EM_MS)', '(Number.isFinite(nowMs) && nowMs >= VEO_FAL_DESLIGA_EM_MS)')],
  ['M7 Veo recusado já (sem data)', 'veo', (s) => s.replace('(!Number.isFinite(nowMs) || nowMs >= VEO_FAL_DESLIGA_EM_MS)', 'true')],
  ['M8 casa volta a passar no Veo', 'launch', (s) => s.replace("RETIRED_EVEN_FOR_HOUSE_KEYS: readonly string[] = ['veo']", 'RETIRED_EVEN_FOR_HOUSE_KEYS: readonly string[] = []')],
  ['M9 Kling 2.5 recusa a casa também', 'launch', (s) => s.replace("RETIRED_EVEN_FOR_HOUSE_KEYS: readonly string[] = ['veo']", "RETIRED_EVEN_FOR_HOUSE_KEYS: readonly string[] = ['veo', 'kling']")],
  ['M10 portão da casa removido da rota', 'route', (s) => s.replace('if (aposentado && (!isDryRunAccount(user.email) || engineRetiredForHouse(body.engine))) {', 'if (aposentado && !isDryRunAccount(user.email)) {')],
  ['M11 fala volta a padrão veo31', 'adapters', (s) => s.replace("if (route === undefined || route === 'veo31') return 'kling3'", "if (route === undefined) return voiceMode === 'talking' ? 'veo31' : 'kling3'")],
  ['M12 veo31 explícito passa', 'adapters', (s) => s.replace("if (route === undefined || route === 'veo31') return 'kling3'", "if (route === undefined) return 'kling3'")],
  ['M13 refação sem recusa do Veo', 'redo', (s) => s.replace("  if (veoDesligado(cena.model, d.now())) return r(409, { ok: false, motivo: 'motor_desligado', estado: 'unavailable' })\n", '')],
  ['M14 refação recusa depois da vaga do dia', 'redo', (s) => s.replace("  if (veoDesligado(cena.model, d.now())) return r(409, { ok: false, motivo: 'motor_desligado', estado: 'unavailable' })\n", '').replace('  const input = variarEntrada(', "  if (veoDesligado(cena.model, d.now())) return r(409, { ok: false, motivo: 'motor_desligado', estado: 'unavailable' })\n  const input = variarEntrada(")],
]
let falhas = 0
for (const [nome, key, mut] of MUTANTES) {
  const mutated = mut(SRC[key])
  if (mutated === SRC[key]) { console.log(`FALHA ${nome}: o mutante não aplicou (a fonte mudou de forma)`); falhas++; continue }
  const v = await problems({ ...SRC, [key]: mutated })
  if (v.length === 0) { console.log(`FALHA ${nome}: aplicou e o guardião ficou verde`); falhas++ }
  else { console.log(`ok  ${nome}: aplicou e ficou vermelho (${v[0]})`); n++ }
}
rmSync(tmp, { recursive: true, force: true })
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
