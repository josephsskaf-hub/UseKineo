// KINEO-ANCORA-LEGENDA-1410 [TRAVA 8.2 — vai do fundador 14/10, "1 sim, 3 sim"] — guardião dos dois ajustes de 14/10:
//   1. Seedance 1.5 com still FLUX em TODAS as cenas (o teto de 6 caiu; orçamento de stills 60 s, como Kling 2.5 e Veo 3.1);
//   3. legenda centralizada também no vertical 9:16 (x_alignment '50%'), em todos os builders de filme e no render legado.
//
// Prova, executando fatias REAIS (sem rede, sem banco, sem fornecedor, sem render pago):
//   (a) o bloco de âncoras da rota, rodado em vm com o gerador de still simulado: Seedance de 7, 8 e 9 cenas ancora TODAS
//       (cada still da própria cena); 12 e 15 cenas no pior caso (12 s por lote) também; ≤ 6 cenas = byte a byte a base;
//       Kling 2.5 e Veo 3.1 = o MESMO vetor de stills e o MESMO tempo da base em todos os tamanhos; nunca mais de 3 em voo;
//   (b) o compose real (buildCreatomateSource clássico/Kineo 1, karaoke, buildHollywoodCreatomateSource): 9:16 e "sem aspect"
//       com toda legenda em x_alignment 50% e caixa inalterada (x 50%, largura 78%, piso 78%); fora o x_alignment, a fonte
//       inteira do Creatomate é a da base; 16:9, 1:1 e 4:5 seguem centralizados; o render legado (/api/render) centraliza;
//   (c) byte a byte: desfeito o ajuste (scripts/test-support/desfaz-ancora-legenda-1410.mjs), cada arquivo é EXATAMENTE o pai
//       do primeiro commit marcado (nunca origin/main nem a worktree); os commits do ajuste não tocam ads, preço nem motor;
//   (d) mutantes: 7 sabotagens em memória, cada uma provada aplicada, e cada uma deixa ao menos uma prova vermelha.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAncoraLegenda1410, desfazAncoraLegenda1410, ARQUIVOS_ANCORA_LEGENDA_1410, FORMA_ANCORA_LEGENDA_1410, MARCA_ANCORA_LEGENDA_1410 as MARCA } from './test-support/desfaz-ancora-legenda-1410.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let total = 0
let falhas = 0
const checa = (nome, cond, detalhe = '') => {
  total++
  if (cond) console.log(`  ok   ${nome}`)
  else { falhas++; console.log(`  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}
const secao = (t) => console.log(`\n── ${t}`)
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ASPECT = 'lib/aspect.ts'
const RENDER = 'app/api/render/route.ts'

// ── base = pai do PRIMEIRO commit marcado (não-merge) na história de HEAD; antes do commit existir, HEAD ──────────────
let BASE = null
try {
  const shas = git(['log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean)
  BASE = shas.length ? shas[shas.length - 1] + '^' : 'HEAD'
  BASE = git(['rev-parse', BASE]).trim()
} catch { BASE = null }
const rdBase = (p) => { if (!BASE) return null; try { return lf(git(['show', `${BASE}:${p}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
checa('a base existe e NÃO carrega a marca (é o antes de verdade)', Boolean(BASE) && ARQUIVOS_ANCORA_LEGENDA_1410.every((p) => { const b = rdBase(p); return b !== null && !b.includes(MARCA) }))

// ═══ máquina de execução do bloco de âncoras ═════════════════════════════════════════════════════════════════════════
const INI_BLOCO = '    if (anchorActive) {\n'
const FIM_BLOCO = '(user credits unchanged; kling=${KLING_CREDIT_COST}cr)`,\n      )\n    }\n'
const transp = (src) => ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
const roda = (src) => {
  const exp = {}
  vm.runInNewContext(transp(src), { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, String, Array, Object, Set, Map, Promise, process: { env: {} }, romanceAdulto: { ativo: false } })
  return exp
}
const harness = (bloco) => `
async function fatiaAncora(ctx) {
  const { anchorEngine, scenes, classicScenePrompts, generationSeed, aspectRequested, generationId, generateCinematicSceneStill, Date } = ctx
  const anchorActive = true
  const anchorI2vModel = 'i2v'
  const ANCHORS_USD = 0.1
  const KLING_CREDIT_COST = 50
  const ROMANCE_ADULT_SUFFIX = ''
  let providerSubmissionMayExist = false
  const sceneStills = new Array(scenes.length).fill(null)
${bloco}
  return { sceneStills, providerSubmissionMayExist }
}
exports.fatiaAncora = fatiaAncora
`
// Relógio simulado: cada LOTE (o primeiro still em voo) consome msPorStill — o pior caso é a janela de 12 s por imagem.
async function simula(bloco, { anchorEngine, planos, msPorStill = 3000 }) {
  const { fatiaAncora } = roda(harness(bloco))
  const relogio = { t: 1_000_000 }
  let emVoo = 0
  let maxEmVoo = 0
  const generateCinematicSceneStill = async (args) => {
    emVoo++
    maxEmVoo = Math.max(maxEmVoo, emVoo)
    if (emVoo === 1) relogio.t += msPorStill
    await Promise.resolve()
    emVoo--
    return `still:${args.scenePrompt}`
  }
  const scenes = Array.from({ length: planos }, (_, i) => ({ voiceover: `fala ${i + 1}` }))
  const r = await fatiaAncora({
    anchorEngine, scenes, classicScenePrompts: scenes.map((_, i) => `p${i + 1}`), generationSeed: 7, aspectRequested: '9:16', generationId: 'g1',
    generateCinematicSceneStill, Date: { now: () => relogio.t },
  })
  return { stills: r.sceneStills.filter(Boolean).length, sceneStills: r.sceneStills, maxEmVoo, decorridoMs: relogio.t - 1_000_000, pago: r.providerSubmissionMayExist }
}

// ═══ máquina das legendas ════════════════════════════════════════════════════════════════════════════════════════════
const legendas = (src) => JSON.parse(JSON.stringify(src)).elements.filter((e) => e.type === 'text' && e.track === 5)
const semXAlign = (src) => { const j = JSON.parse(JSON.stringify(src)); for (const e of j.elements) if (e.type === 'text' && e.track === 5) delete e.x_alignment; return j }
const NARR = 'Hold the line now. We go home tonight, all of us, together.'
const palavras = NARR.split(/\s+/)
const whisper = palavras.map((w, i) => ({ word: w.replace(/[^\p{L}\p{N}'-]/gu, ''), start: i * 0.4, end: i * 0.4 + 0.35 }))
const entradas = (aspect) => ({
  'clássico (Seedance/IA)': (m) => m.buildCreatomateSource({ clipUrls: ['https://a/1.mp4', 'https://a/2.mp4'], voiceoverUrl: 'https://a/v.mp3', voiceoverScript: NARR, duration: 35, aspect, quality: 'cinematic_ai', realAudioDuration: 30, whisperWords: null, musicUrl: null }),
  'clássico com karaoke (Whisper)': (m) => m.buildCreatomateSource({ clipUrls: ['https://a/1.mp4', 'https://a/2.mp4'], voiceoverUrl: 'https://a/v.mp3', voiceoverScript: NARR, duration: 35, aspect, quality: 'cinematic_ai', realAudioDuration: 30, whisperWords: whisper, musicUrl: null }),
  'Kineo 1 (fast)': (m) => m.buildCreatomateSource({ clipUrls: ['https://a/1.mp4', 'https://a/2.mp4', 'https://a/3.mp4'], voiceoverUrl: 'https://a/v.mp3', voiceoverScript: NARR, duration: 35, aspect, quality: 'fast', realAudioDuration: 30, whisperWords: whisper, musicUrl: null }),
  'hollywood (Kling 3/H3/Omni)': (m) => m.buildHollywoodCreatomateSource({ clips: [{ url: 'https://a/h1.mp4', engine: 'cinematic', seconds: 5, caption: 'Hold the line now.' }, { url: 'https://a/h2.mp4', engine: 'cinematic', seconds: 5, caption: 'We go home tonight.' }], narrationBlocks: [{ time: 0, url: 'https://a/n1.mp3', audioDuration: 4, text: 'Hold the line now.' }, { time: 5, url: 'https://a/n2.mp3', audioDuration: 4, text: 'We go home tonight, all of us, together.' }], aspect }),
})
const carregaCompose = (transforma) => createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: transforma })('lib/compose.ts')
// A base do compose: a mesma árvore com o ajuste desfeito (lib/aspect.ts volta a ser o do pai do commit — provado em (c)).
const composeBase = carregaCompose((p, s) => desfazAncoraLegenda1410(p, s))

// ═══ as provas, em função das fontes (os mutantes reusam) ═══════════════════════════════════════════════════════════
const rotaBase = rdBase(ROTA) ?? ''
const blocoBase = fatia(rotaBase, INI_BLOCO, FIM_BLOCO)
async function provas({ rota, aspectSrc, renderSrc }) {
  const r = []
  const p = (nome, cond, detalhe = '') => r.push([nome, Boolean(cond), detalhe])
  const bloco = fatia(rota, INI_BLOCO, FIM_BLOCO)
  p('o bloco de âncoras clássico existe na rota e na base', Boolean(bloco) && Boolean(blocoBase))
  if (bloco && blocoBase) {
    // 1 · Seedance ancora todas as cenas
    for (const n of [7, 8, 9]) {
      const s = await simula(bloco, { anchorEngine: 'seedance', planos: n })
      p(`Seedance com ${n} cenas: ${n} stills, cada um da própria cena (antes: 6)`, s.stills === n && s.sceneStills.every((u, i) => u === `still:p${i + 1}`), `${s.stills} stills`)
    }
    for (const n of [12, 15]) {
      const s = await simula(bloco, { anchorEngine: 'seedance', planos: n, msPorStill: 12_000 })
      p(`Seedance com ${n} cenas no PIOR caso (12 s por lote): ${n} stills — o orçamento de 60 s cobre`, s.stills === n, `${s.stills} stills em ${s.decorridoMs / 1000}s`)
    }
    for (const n of [3, 5, 6]) {
      const [s, b] = [await simula(bloco, { anchorEngine: 'seedance', planos: n }), await simula(blocoBase, { anchorEngine: 'seedance', planos: n })]
      p(`Seedance com ${n} cenas (35 s): o mesmo vetor de stills e o mesmo tempo da base — nada muda até 6`, eqJ(s.sceneStills, b.sceneStills) && s.decorridoMs === b.decorridoMs && s.stills === n)
    }
    // 2 · Kling 2.5 e Veo 3.1 intocados
    const iguais = []
    for (const motor of ['kling', 'veo']) for (const n of [3, 5, 7, 9, 12, 14]) for (const ms of [3000, 12_000]) {
      const [s, b] = [await simula(bloco, { anchorEngine: motor, planos: n, msPorStill: ms }), await simula(blocoBase, { anchorEngine: motor, planos: n, msPorStill: ms })]
      iguais.push(eqJ(s.sceneStills, b.sceneStills) && s.decorridoMs === b.decorridoMs && s.maxEmVoo === b.maxEmVoo && s.pago === b.pago)
    }
    p('Kling 2.5 e Veo 3.1: o mesmo vetor de stills, o mesmo tempo e o mesmo pool da base (24 casos, 3 a 14 cenas, 3 s e 12 s por lote)', iguais.length === 24 && iguais.every(Boolean))
    // 3 · concorrência limitada
    const voos = []
    for (const motor of ['seedance', 'kling', 'veo']) for (const n of [7, 9, 15]) voos.push((await simula(bloco, { anchorEngine: motor, planos: n })).maxEmVoo)
    p('nunca mais de 3 stills em voo (STILL_POOL = 3), em qualquer motor e tamanho', voos.every((v) => v === 3), voos.join(','))
    p('o claim fica protegido quando há still (providerSubmissionMayExist = true)', (await simula(bloco, { anchorEngine: 'seedance', planos: 9 })).pago === true)
  }
  p('a rota segue com maxDuration = 300 (60 s de stills + despacho paralelo do Seedance cabem)', /export const maxDuration = 300\b/.test(rota))

  // 4 · legendas
  const compose = carregaCompose((q, s) => (q === ASPECT ? aspectSrc : s))
  for (const aspect of [undefined, '9:16']) {
    for (const [nome, fonte] of Object.entries(entradas(aspect))) {
      const ls = legendas(fonte(compose))
      p(`9:16 (${aspect ?? 'sem aspect'}) · ${nome}: toda legenda centralizada (x_alignment 50%)`, ls.length > 0 && ls.every((e) => e.x_alignment === '50%'), `${ls.length} legendas`)
      p(`9:16 (${aspect ?? 'sem aspect'}) · ${nome}: a caixa NÃO mudou (x 50%, largura 78%, piso 78%, âncora de baixo)`, ls.length > 0 && ls.every((e) => e.x === '50%' && e.width === '78%' && e.y === '78%' && e.y_anchor === '100%'))
      p(`9:16 (${aspect ?? 'sem aspect'}) · ${nome}: fora o x_alignment, a fonte do Creatomate é a da base`, eqJ(semXAlign(fonte(compose)), JSON.parse(JSON.stringify(fonte(composeBase)))))
    }
  }
  for (const aspect of ['16:9', '1:1', '4:5']) {
    const todas = Object.values(entradas(aspect)).flatMap((fonte) => legendas(fonte(compose)))
    p(`${aspect}: segue centralizado (x_alignment 50%) em todos os builders, e igual à base`, todas.length > 0 && todas.every((e) => e.x_alignment === '50%') && Object.values(entradas(aspect)).every((fonte) => eqJ(fonte(compose), fonte(composeBase))))
  }
  const legado = fatia(renderSrc, '    // Track 4: narration text per scene', '      cursor += dur') ?? ''
  p('render legado (/api/render, /create e /video): a legenda centralizada', /type: 'text',\n\s+track: 4,[\s\S]*\n {12}x: '50%',[\s\S]*\n {12}x_alignment: '50%',/.test(legado))
  return r
}

secao('(a)+(b) as provas na árvore de HEAD')
const REAL = { rota: rd(ROTA), aspectSrc: rd(ASPECT), renderSrc: rd(RENDER) }
for (const [nome, ok, det] of await provas(REAL)) checa(nome, ok, det)

secao('o defeito reproduz na base (as provas medem mudança de verdade)')
if (blocoBase) {
  for (const n of [7, 8, 9]) checa(`base: Seedance com ${n} cenas tinha só 6 stills (cenas 7+ em t2v)`, (await simula(blocoBase, { anchorEngine: 'seedance', planos: n })).stills === 6)
  checa('base: Seedance com 12 cenas no pior caso também parava em 6', (await simula(blocoBase, { anchorEngine: 'seedance', planos: 12, msPorStill: 12_000 })).stills === 6)
}
checa('base: legenda 9:16 sem x_alignment (o texto nascia à esquerda dentro da caixa de 78%)', legendas(entradas('9:16')['clássico (Seedance/IA)'](composeBase)).every((e) => !('x_alignment' in e)))
checa('base: render legado sem x_alignment', !(rdBase(RENDER) ?? 'x_alignment').includes('x_alignment'))

secao('(c) desfeito o ajuste, cada arquivo é EXATAMENTE o pai do primeiro commit marcado')
for (const p of ARQUIVOS_ANCORA_LEGENDA_1410) {
  const atual = rd(p)
  const base = rdBase(p)
  let desfeito = null
  try { desfeito = semAncoraLegenda1410(p, atual) } catch (e) { desfeito = `ERRO ${e.message}` }
  checa(`${p}: desfeito = base ${(BASE ?? '').slice(0, 8)}`, base !== null && desfeito === base, typeof desfeito === 'string' && desfeito.startsWith('ERRO') ? desfeito : '')
  const marcadas = atual.split('\n').filter((l) => l.includes(MARCA)).length
  const f = FORMA_ANCORA_LEGENDA_1410[p]
  checa(`${p}: ${f.trocas} troca(s) + ${f.acrescimos} acréscimo(s) marcados`, marcadas === f.trocas + f.acrescimos, String(marcadas))
}
checa('o desfaz é idempotente (sem linha marcada, devolve igual)', semAncoraLegenda1410(ASPECT, 'x\ny') === 'x\ny')
checa('o desfaz recusa ajuste pela metade', (() => { try { semAncoraLegenda1410(ROTA, `a // ${MARCA}`); return false } catch { return true } })())
let tocados = []
try {
  const shas = git(['log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD']).split('\n').filter(Boolean)
  tocados = [...new Set(shas.flatMap((h) => git(['diff-tree', '--no-commit-id', '--name-only', '-r', h]).split('\n').filter(Boolean)))]
  tocados.push(...git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean))
} catch { /* sem git: (c) acima já cobre */ }
checa('existe ao menos um commit do ajuste (ou trabalho na worktree)', tocados.length > 0)
checa('o ajuste não toca ads, preço, crédito nem vitrine (lib/ads, engineWall, homeVideoCuration, engineCost, pricing)', !tocados.some((p) => p.startsWith('lib/ads/') || p.includes('/ads/') || p === 'lib/engineWall.ts' || p === 'lib/homeVideoCuration.ts' || /engineCost|pricing|credits\//i.test(p)), tocados.join(', '))
checa('fora de scripts/, só os 3 arquivos declarados', tocados.filter((p) => !p.startsWith('scripts/')).every((p) => ARQUIVOS_ANCORA_LEGENDA_1410.includes(p)), tocados.join(', '))

secao('(d) mutantes: cada sabotagem aplicada deixa ao menos uma prova vermelha')
const troca = (s, a, b) => (s.split(a).length === 2 ? s.split(a).join(b) : null)
const MUTANTES = [
  ['M1 Seedance volta ao teto de 6', { rota: troca(REAL.rota, '      const MAX_ANCHORED_SCENES = scenes.length //', "      const MAX_ANCHORED_SCENES = anchorEngine === 'kling' || anchorEngine === 'veo' ? scenes.length : 6 //") }],
  ['M2 Seedance volta aos 30 s de orçamento', { rota: troca(REAL.rota, '      const STILL_BUDGET_MS = 60_000 //', "      const STILL_BUDGET_MS = anchorEngine === 'seedance' ? 30_000 : 60_000 //") }],
  ['M3 pool sem limite (todos os stills de uma vez)', { rota: troca(REAL.rota, '      const STILL_POOL = 3\n', '      const STILL_POOL = 99\n') }],
  ['M4 Kling perde a âncora das cenas 7+', { rota: troca(REAL.rota, '      const MAX_ANCHORED_SCENES = scenes.length //', "      const MAX_ANCHORED_SCENES = anchorEngine === 'kling' ? 6 : scenes.length //") }],
  ['M5 9:16 volta a alinhar à esquerda', { aspectSrc: troca(REAL.aspectSrc, "    captionXAlignment: '50%', // KINEO-ANCORA-LEGENDA-1410", "    // captionXAlignment: '50%', // KINEO-ANCORA-LEGENDA-1410") }],
  ['M6 16:9 perde o centro', { aspectSrc: troca(REAL.aspectSrc, "    captionXAlignment: '50%', // KINEO-PARCEIRO-EYEBIBLE-1410 — 16:9", "    // captionXAlignment: '50%', // KINEO-PARCEIRO-EYEBIBLE-1410 — 16:9") }],
  ['M7 render legado sem o centro', { renderSrc: troca(REAL.renderSrc, "            x_alignment: '50%', // KINEO-ANCORA-LEGENDA-1410", "            // x_alignment: '50%', // KINEO-ANCORA-LEGENDA-1410") }],
]
for (const [nome, mut] of MUTANTES) {
  const [campo, src] = Object.entries(mut)[0]
  const aplicado = typeof src === 'string' && src !== REAL[campo]
  checa(`${nome}: a sabotagem foi aplicada (fonte diferente)`, aplicado)
  if (!aplicado) continue
  const vermelhas = (await provas({ ...REAL, [campo]: src })).filter(([, ok]) => !ok)
  checa(`${nome}: fica VERMELHO (${vermelhas.length} prova(s) caem${vermelhas.length ? ': ' + vermelhas[0][0].slice(0, 70) : ''})`, vermelhas.length > 0)
}

console.log(`\n${total - falhas}/${total} verificações — ${falhas ? 'VERMELHO' : 'VERDE'}`)
process.exit(falhas ? 1 : 0)
