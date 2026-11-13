// KINEO-NOTA-AUTO-CUSTO-1311 — guardião do CUSTO da nota automática (ordem da CEO, 13/11 noite: o 1º filme em produção custou
// US$ 0,10, 5× o ensaio). OFFLINE (sem rede nem chave). Provas:
//   C3  o juiz da produção (juizV3ReguaInteira) manda ao modelo os quadros no TAMANHO DO VÍDEO, como a fal entrega (decisão da CEO
//       13/11 noite: o quadro grande viu no Milo a troca de desenho e o resgate que faltava; o de 432 px não viu). O custo é contido
//       pelo teto diário, não por redução;
//   C4  teto diário: soma o usd dos eventos nota_auto desde 00:00 de Brasília; ≥ teto (US$ 2) não julga e grava UM nota_auto_teto
//       no dia; abaixo do teto julga; NOTA_AUTO_TETO_DIA_USD troca o teto;
//   C5  o evento nota_auto leva usd_quadros, usd_modelo e ms_total;
//   M   mutantes.
// Rodar: npx tsx scripts/test-nota-auto-custo-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const FILME = 'lib/regua95/notaAutoFilme.ts'
const FONTE = lf(fs.readFileSync(FILME, 'utf8'))
const REVISOR = lf(fs.readFileSync('lib/regua95/notaRevisor.ts', 'utf8'))
const globals = { setTimeout: () => 0, clearTimeout() {}, AbortController }
const carregar = (f) => createOfflineLoader({ globals, env: {}, source: f ? (rel, text) => (rel.replace(/\\/g, '/').endsWith(FILME) ? f(lf(text)) : text) : null })(FILME)

// banco falso para o teto: eventos nota_auto de hoje com usd; captura inserts
function banco({ usdHoje = [], tetoJaGravado = false }) {
  const ops = []
  const from = (table) => {
    const q = { table, eq: {}, gte: null, op: 'select', payload: null }
    const resolve = () => {
      ops.push(q)
      if (q.op === 'insert') return { error: null }
      if (table === 'events' && q.eq.name === 'nota_auto') return { data: usdHoje.map((usd) => ({ metadata: { usd } })), error: null }
      if (table === 'events' && q.eq.name === 'nota_auto_teto') return { data: tetoJaGravado ? [{ id: 1 }] : [], error: null }
      if (table === 'events') return { data: [], error: null }
      if (table === 'videos') return { data: { id: 'v1', user_id: 'u1', created_at: new Date().toISOString(), quality_mode: 'cinematic', video_url: 'https://x/v.mp4', duration: 15, render_id: null, topic: 'a cat', engine_used: 'kling4', script: null, prompt: null, status: 'completed' }, error: null }
      return { data: null, error: null }
    }
    const b = { select() { return b }, eq(c, v) { q.eq[c] = v; return b }, in() { return b }, gte(c, v) { q.gte = v; return b }, order() { return b }, limit() { return b }, insert(p) { q.op = 'insert'; q.payload = p; return b }, maybeSingle() { return Promise.resolve(resolve()) }, then(r, j) { return Promise.resolve(resolve()).then(r, j) } }
    return b
  }
  return { ops, admin: { from } }
}
const readAll = async (fn) => await fn()

async function provas(F) {
  const falhas = []
  const checa = (n, c) => { if (!c) falhas.push(n) }
  const agora = Date.parse('2026-11-14T02:30:00Z') // 23:30 de 13/11 em Brasília
  checa('C4 00:00 de Brasília em UTC', F.inicioDoDiaBrasilia(agora) === '2026-11-13T03:00:00.000Z' && F.inicioDoDiaBrasilia(Date.parse('2026-11-14T03:30:00Z')) === '2026-11-14T03:00:00.000Z')
  const B0 = banco({ usdHoje: [0.5, 0.4] })
  checa('C4 gasto do dia = soma do usd dos nota_auto desde 00:00 de Brasília', Math.abs((await F.gastoDoDia(B0.admin, readAll, '/x', agora)) - 0.9) < 1e-9 && B0.ops.some((o) => o.gte === '2026-11-13T03:00:00.000Z'))
  checa('C4 teto padrão US$ 2; variável troca; inválida = padrão', F.tetoDoDiaUsd({}) === 2 && F.tetoDoDiaUsd({ NOTA_AUTO_TETO_DIA_USD: '3.5' }) === 3.5 && F.tetoDoDiaUsd({ NOTA_AUTO_TETO_DIA_USD: 'x' }) === 2)
  const B1 = banco({ usdHoje: [1.2, 0.9] })
  const r1 = await F.notaAutoDoFilme(B1.admin, { videoId: 'v1', route: '/x', readAll, modo: 'sombra', agora })
  const teto1 = B1.ops.filter((o) => o.op === 'insert' && o.payload?.name === 'nota_auto_teto')
  checa('C4 estourou: não julga e grava UM nota_auto_teto', r1.feito === false && r1.motivo === 'teto_diario' && teto1.length === 1 && teto1[0].payload.metadata.teto_usd === 2 && !B1.ops.some((o) => o.op === 'insert' && o.payload?.name === 'nota_auto_inicio'))
  const B2 = banco({ usdHoje: [1.2, 0.9], tetoJaGravado: true })
  await F.notaAutoDoFilme(B2.admin, { videoId: 'v1', route: '/x', readAll, modo: 'sombra', agora })
  checa('C4 o evento de teto sai uma vez por dia', !B2.ops.some((o) => o.op === 'insert' && o.payload?.name === 'nota_auto_teto'))
  const B3 = banco({ usdHoje: [0.3] })
  const r3 = await F.notaAutoDoFilme(B3.admin, { videoId: 'v1', route: '/x', readAll, modo: 'sombra', agora })
  checa('C4 abaixo do teto segue para o julgamento (marcador nota_auto_inicio)', r3.motivo !== 'teto_diario' && B3.ops.some((o) => o.op === 'insert' && o.payload?.name === 'nota_auto_inicio'))
  return falhas
}

function provasDeFonte() {
  const falhas = []
  const checa = (n, c) => { if (!c) falhas.push(n) }
  checa('C3 o juiz da produção usa os quadros como a fal entrega (sem redução)', FONTE.includes('    { plano: a.plano, quadros: a.quadros,') && !/quadroPequeno|reduzirJpeg|jpeg-js/.test(FONTE))
  checa('C5 o evento nota_auto leva usd_quadros, usd_modelo e ms_total', /usd_quadros: usdQuadros, usd_modelo: Math\.round\(\(r\.usd - usdQuadros\) \* 1e6\) \/ 1e6, ms_total: Date\.now\(\) - t0/.test(REVISOR))
  return falhas
}

let ok = 0, ruim = 0
const linha = (bom, nome) => { if (bom) { ok++; console.log('  ok  ' + nome) } else { ruim++; console.log('  XX  ' + nome) } }
const real = await provas(carregar(null))
linha(real.length === 0, `código real: C4${real.length ? ' — falharam: ' + real.join(' | ') : ''}`)
const fo = provasDeFonte()
linha(fo.length === 0, `fonte: C3, C5${fo.length ? ' — falharam: ' + fo.join(' | ') : ''}`)

const MUTANTES = [
  ['M3 teto ignorado', (t) => t.replace('    if (gasto >= teto) {', '    if (false) {')],
  ['M4 evento de teto a cada filme', (t) => t.replace('      if (!((ja.data ?? []) as unknown[]).length) {', '      if (true) {')],
  ['M5 dia em UTC, não em Brasília', (t) => t.replace('  const d = new Date(agora - 3 * 3600_000)\n  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 0, 0)).toISOString()', '  const d = new Date(agora)\n  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)).toISOString()')],
]
for (const [nome, f] of MUTANTES) {
  if (f(FONTE) === FONTE) { linha(false, `${nome}: o mutante NÃO aplicou (âncora sumiu)`); continue }
  let falhas
  try { falhas = await provas(carregar(f)) } catch (e) { falhas = ['carregar: ' + e.message] }
  linha(falhas.length > 0, `${nome} → vermelho (${falhas.slice(0, 2).join(' | ') || 'NENHUMA prova pegou'})`)
}
console.log(`\n${ruim === 0 ? '🟢' : '🔴'} nota-auto-custo-1311: ${ok}/${ok + ruim}`)
process.exit(ruim === 0 ? 0 : 1)
