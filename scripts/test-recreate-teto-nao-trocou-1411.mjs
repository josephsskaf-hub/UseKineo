// KINEO-RECREATE-TETO-NAO-TROCOU-1411 — guardião do pedido 2 da CEO (14/11): teto de tentativas que não trocam no Recreate "com o seu vídeo".
// EXECUTA a regra pura (lib/recreate/tetoNaoTrocou.ts): sem plano, a 2ª tentativa passa e a 3ª é recusada; com plano, a 4ª passa e a 5ª é
// recusada; conta da casa nunca é recusada; falha de outro tipo não conta; resultado com mais de 24 h não conta; a recusa diz quando volta. E a
// rota (app/api/recreate/seu-video/route.ts): o teto vem ANTES de ler o vídeo, de cobrar (submitClip) e da fal; código próprio, 429, evento de
// servidor, frase em inglês que orienta e diz que nada foi cobrado; leitura que falha = segue. Revisão de 14/11 (KINEO-RECREATE-FILA-REVISAO-1411): a rota
// decide pela PORTA (lib/recreate/portaDoSeuVideo decidirPorta, executada aqui); swap_partial CONTA (decisão da CEO); a casa é a lista EXATA; a leitura
// só enxerga o "seu vídeo" (vídeo em recreate-uploads/), nunca o catálogo. Mutantes.
// Rodar: node scripts/test-recreate-teto-nao-trocou-1411.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const TETO = 'lib/recreate/tetoNaoTrocou.ts', ROTA = 'app/api/recreate/seu-video/route.ts', SRV = 'lib/recreate/seuVideoServer.ts', PORTA = 'lib/recreate/portaDoSeuVideo.ts'
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
function carregar(src) {
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(() => { throw new Error('import inesperado') }, mod, mod.exports)
  return mod.exports
}
const AGORA = Date.parse('2026-11-14T12:00:00Z'), H = 60 * 60 * 1000
const naoTrocou = (horasAtras) => ({ failure_reason: 'swap_unchanged', settled_at: new Date(AGORA - horasAtras * H).toISOString(), created_at: new Date(AGORA - horasAtras * H - 120_000).toISOString() })
const outro = (motivo, horasAtras = 1) => ({ failure_reason: motivo, settled_at: new Date(AGORA - horasAtras * H).toISOString() })

function bateria(over = {}) {
  const p = []
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const T = carregar(over[TETO] ?? lf(TETO))
  const d = (casa, pagante, resultados) => T.decidirTeto({ casa, pagante, resultados, agoraMs: AGORA })
  check('sem plano: 2ª passa, 3ª recusa', () => {
    if (!d(false, false, []).ok || !d(false, false, [naoTrocou(1)]).ok) throw new Error('1ª ou 2ª recusada')
    const r = d(false, false, [naoTrocou(1), naoTrocou(5)])
    if (r.ok || r.limite !== 2 || r.usados !== 2) throw new Error('3ª passou: ' + JSON.stringify(r))
  })
  check('com plano: 4ª passa, 5ª recusa', () => {
    if (!d(false, true, [naoTrocou(1), naoTrocou(2), naoTrocou(3)]).ok) throw new Error('4ª recusada')
    const r = d(false, true, [naoTrocou(1), naoTrocou(2), naoTrocou(3), naoTrocou(4)])
    if (r.ok || r.limite !== 4) throw new Error('5ª passou')
  })
  check('conta da casa nunca é recusada', () => {
    if (!d(true, false, Array.from({ length: 30 }, (_, i) => naoTrocou(i / 2))).ok) throw new Error('casa recusada')
  })
  check('swap_partial e swap_uncertain contam (decisões da CEO 14/11)', () => {
    const r = d(false, false, [naoTrocou(1), outro('swap_partial', 2)])
    if (r.ok || r.usados !== 2) throw new Error(JSON.stringify(r))
    const u = d(false, false, [outro('swap_uncertain', 1), outro('swap_uncertain', 2)]) // KINEO-RECREATE-TRAVA-REVISAO-1411 (item 1): 6 incertos em 1 h e o teto lia 0
    if (u.ok || u.usados !== 2) throw new Error('incerto: ' + JSON.stringify(u))
    if (JSON.stringify(T.TETO_MOTIVOS) !== JSON.stringify(['swap_unchanged', 'swap_partial', 'swap_uncertain'])) throw new Error('motivos: ' + JSON.stringify(T.TETO_MOTIVOS))
  })
  check('falha de outro tipo não conta', () => {
    const r = d(false, false, [naoTrocou(1), outro('queue_stuck'), outro('queue_timeout'), outro('provider_failed'), outro('provider_rejected'), outro('expired'), outro('persist_failed'), outro(null)])
    if (!r.ok || r.usados !== 1) throw new Error(JSON.stringify(r))
  })
  check('fora das 24 h não conta; data ruim não conta', () => {
    const r = d(false, false, [naoTrocou(1), naoTrocou(24.5), naoTrocou(80), { failure_reason: 'swap_unchanged', settled_at: 'ruim', created_at: null }])
    if (!r.ok || r.usados !== 1) throw new Error(JSON.stringify(r))
  })
  check('a recusa diz quando volta (o mais antigo dentro do teto sai da janela)', () => {
    const r = d(false, false, [naoTrocou(1), naoTrocou(20)])
    if (r.ok || r.retryAt !== new Date(AGORA + 4 * H).toISOString() || r.horas !== 4) throw new Error(JSON.stringify(r))
    const s = d(false, false, [naoTrocou(1), naoTrocou(2), naoTrocou(20)]) // 3 na janela (teto mudou no meio): volta quando sobrar 1
    if (s.ok || s.retryAt !== new Date(AGORA + 22 * H).toISOString()) throw new Error('3 na janela: ' + JSON.stringify(s))
  })
  check('frase: inglês, orienta, nada cobrado, sem nome de motor', () => {
    const f = T.fraseDoTeto({ usados: 2, horas: 4 })
    if (!/^We could not swap the person in your last 2 tries/.test(f) || !/about 4 hours/.test(f) || !/front-facing photo of one person/.test(f) || !/shorter video/.test(f) || !/Nothing was charged\.$/.test(f)) throw new Error(f)
    if (/kling|seedance|fal\b/i.test(f) || f.length > 260) throw new Error('motor ou longa: ' + f)
    if (!/about 1 hour\./.test(T.fraseDoTeto({ usados: 2, horas: 1 }))) throw new Error('singular')
  })
  const r = (over[ROTA] ?? lf(ROTA)).replace(/\/\/[^\n]*/g, '')
  const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  check('rota: teto antes do vídeo, da cobrança e da fal; 429, código, evento; casa fora', () => {
    const iTeto = r.indexOf('const recusa = decidirPorta({ replay, casa, pagante, abertos: abertos ? abertos.length : null, resultados, fila, agoraMs: Date.now() })')
    const iVideo = r.indexOf('const v = await lerVideoDoCliente('), iCobra = r.indexOf('await submitClip(')
    if (iTeto < 0 || !(iTeto < iVideo && iVideo < iCobra)) throw new Error('ordem')
    if (!r.includes("const casa = releaseVisible(user.email, 'internal')") || !r.includes('casa ? Promise.resolve([]) : lerNaoTrocouDaConta(admin, user.id),') || !r.includes('const pagante = isPayingPlan(account.plan)')) throw new Error('casa/leitura')
    const bloco = r.slice(iTeto, iVideo)
    if (!bloco.includes('  if (recusa) {') || !bloco.includes("name: recusa.code === TETO_CODIGO ? TETO_EVENTO : 'recreate_seu_video_refused'") || !bloco.includes('return json({ error: recusa.error, code: recusa.code, ...recusa.extra }, recusa.status)')) throw new Error('recusa')
    // a porta EXECUTADA: a 3ª tentativa sem plano é recusada com 429, o código do teto, a frase e "nada cobrado"; a casa passa; o replay passa
    const P = loader({}, over)('lib/recreate/portaDoSeuVideo')
    const base = { replay: false, casa: false, pagante: false, abertos: 0, resultados: [naoTrocou(1), naoTrocou(5)], fila: null, agoraMs: AGORA }
    const x = P.decidirPorta(base)
    if (!x || x.status !== 429 || x.code !== 'swap_cap' || x.extra.charged !== false || x.extra.limit !== 2 || x.extra.used !== 2 || x.error !== T.fraseDoTeto({ usados: 2, horas: 19 })) throw new Error('porta: ' + JSON.stringify(x))
    if (P.decidirPorta({ ...base, casa: true }) !== null || P.decidirPorta({ ...base, replay: true }) !== null || P.decidirPorta({ ...base, resultados: null }) !== null) throw new Error('casa, replay ou leitura que falhou foram recusados')
    if (T.TETO_CODIGO !== 'swap_cap' || T.TETO_EVENTO !== 'recreate_seu_video_swap_cap') throw new Error('nomes')
  })
  check('servidor: só o "não trocou" do seu vídeo (recreate-uploads/), nunca o catálogo; erro de leitura = segue', () => {
    const ini = s.indexOf('export async function lerNaoTrocouDaConta')
    const bloco = ini >= 0 ? s.slice(ini) : ''
    if (!bloco.includes(".eq('user_id', userId).eq('status', 'failed')") || !bloco.includes(".in('failure_reason', [...TETO_MOTIVOS]).in('model', [KLING4_EDIT_MODEL, SEEDANCE25_MODEL]).like('fingerprint', `%/${SEU_VIDEO_PASTA}/%`)")) throw new Error('consulta')
    if (!/if \(error\) \{[^\n]*return null \}/.test(bloco)) throw new Error('erro de leitura tranca o cliente')
  })
  return p
}

const real = bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const teto = lf(TETO), rota = lf(ROTA), porta = lf(PORTA), servidor = lf(SRV)
const mutantes = [
  ['sem plano com teto 3', { [TETO]: teto.replace('semPlano: 2,', 'semPlano: 3,') }],
  ['com plano com teto 5', { [TETO]: teto.replace('comPlano: 4,', 'comPlano: 5,') }],
  ['casa entra no teto', { [TETO]: teto.replace('  if (a.casa) return { ok: true, usados: 0, limite: null }\n', '') }],
  ['toda falha conta', { [TETO]: teto.replace("    .filter((r) => typeof r.failure_reason === 'string' && TETO_MOTIVOS.includes(r.failure_reason))\n", '') }],
  ['parcial não conta', { [TETO]: teto.replace("['swap_unchanged', 'swap_partial', 'swap_uncertain']", "['swap_unchanged', 'swap_uncertain']") }],
  ['incerto não conta', { [TETO]: teto.replace("['swap_unchanged', 'swap_partial', 'swap_uncertain']", "['swap_unchanged', 'swap_partial']") }],
  ['janela infinita', { [TETO]: teto.replace('Number.isFinite(t) && t > a.agoraMs - janela && t <= a.agoraMs', 'Number.isFinite(t)') }],
  ['recusa no limite + 1', { [TETO]: teto.replace('if (naJanela.length < limite) return', 'if (naJanela.length <= limite) return') }],
  ['rota: a porta não recusa', { [ROTA]: rota.replace('  if (recusa) {', '  if (false) {') }],
  ['rota: casa pela lista larga', { [ROTA]: rota.replace("const casa = releaseVisible(user.email, 'internal')", 'const casa = isInternalEmail(user.email)') }],
  ['porta: o teto não recusa', { [PORTA]: porta.replace('  if (!teto.ok) return {', '  if (false) return {') }],
  ['servidor: o catálogo conta no teto', { [SRV]: servidor.replace(".like('fingerprint', `%/${SEU_VIDEO_PASTA}/%`)", '') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(over).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS teto não trocou: sem plano 2ª passa/3ª recusa; com plano 4ª passa/5ª recusa; casa (lista exata) nunca; parcial conta; outra falha, catálogo e fora de 24 h não contam; recusa antes do vídeo, da cobrança e da fal, com código, evento e orientação; ${mortos}/${mutantes.length} mutantes mortos`)
