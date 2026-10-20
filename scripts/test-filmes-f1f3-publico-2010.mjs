// KINEO-FILMES-F1F3-PUBLICO-2010 [TRAVA 8.2 — vai do fundador 20/10 "nota 10"] — guardião da virada das fases F1 (legenda) e F3 (som) do
// "Faceless 15 s" para TODOS (render e48e17bf, nota 10). Roda com `node scripts/test-filmes-f1f3-publico-2010.mjs` da raiz do repo, sem rede, sem banco,
// sem fornecedor: a montagem REAL (lib/compose buildCreatomateSource) pelo carregador offline com o Whisper real da escada (fixture Carrington).
//
// O que prova:
//   P  o interruptor: FACELESS15_PUBLIC = f1 e f3; f2, f4 e cta seguem false (só por pedido de conta interna); o cliente no formato (Seedance 1.5 ·
//      15 s · 9:16, sem avatar, fora do Ads) recebe F1+F3 com ou sem pedido; fora do formato nada entra; o gancho escrito (f2) não entra para cliente;
//   X  o export limpo acompanha: /api/compose e /api/compose/unlock decidem pelo MESMO resolverFaceless15 com a conta interna do servidor, e o cliente
//      do unlock manda quality/duração do filme; a montagem do export (sem marca d'água, sem cartão final) recebe a MESMA legenda, música e SFX da
//      prévia; fora do formato o JSON do Creatomate segue idêntico byte a byte;
//   D  desfaz exato + marca em toda linha + encadeamento (as cabeças das cadeias tiram esta camada PRIMEIRO) + nada no motor/rotas + assunto;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semFilmesF1F3Publico2010, desfazFilmesF1F3Publico2010, diffSoFilmesF1F3Publico2010, FILMES_F1F3_PUBLICO_2010_ARQUIVOS, FILMES_F1F3_PUBLICO_2010_NOVOS, MARCA_FILMES_F1F3_PUBLICO_2010, ACRESCIMOS_FILMES_F1F3_PUBLICO_2010 } from './test-support/desfaz-filmes-f1f3-publico-2010.mjs'
import { semHomeCardsBotoes2010 } from './test-support/desfaz-home-cards-botoes-2010.mjs'
import { semApresentadorOlhos1910 } from './test-support/desfaz-apresentador-olhos-1910.mjs'
import { semHome3Cards1910 } from './test-support/desfaz-home-3-cards-1910.mjs'
import { semMeta95Escrita2010 } from './test-support/desfaz-meta95-escrita-2010.mjs' // KINEO-META95-ESCRITA-2010 — reancorado: a legenda na escrita do roteiro (a camada mais nova) sai em memória antes do byte a byte

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ) // o carregador offline resolve '@/' a partir do cwd
const MARCA = 'KINEO-FILMES-F1F3-PUBLICO-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = (m, fn) => { let v = false; try { v = !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const clone = (v) => JSON.parse(JSON.stringify(v))

// base = o pai do 1º commit com a marca (onde quer que a fila o tenha rebaseado); antes do commit, HEAD. TOPO = o último commit com a marca.
const SHAS = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
const BASE = SHAS.length ? SHAS[SHAS.length - 1] + '^' : 'HEAD'
const TOPO = SHAS[0] || 'HEAD'
const base = (p) => { try { return lf(git('show', `${BASE}:${p}`)) } catch { return null } }
console.log(`   base: ${BASE} · topo: ${TOPO}`)

const F15 = 'lib/filmes/faceless15.ts'
const ROTA = 'app/api/compose/route.ts'
const UNLOCK = 'app/api/compose/unlock/route.ts'
const GC = 'app/(dashboard)/generate/GenerateClient.tsx'
const FIX = JSON.parse(rd('scripts/test-support/fixture-whisper-carrington-1910.json'))
const NARRACAO = FIX.narracao
const FRASES = NARRACAO.split(/(?<=\.)\s+/)
const trilha = (src, n, tipo = null) => src.elements.filter((e) => Number(e.track) === n && (tipo == null || e.type === tipo))
const foraDaTrilha = (src, ns) => src.elements.filter((e) => !ns.includes(Number(e.track)))

function carregar(f15 = null) {
  const load = createOfflineLoader({ source: (p, s) => (f15 !== null && p === F15 ? f15 : s) })
  const C = load('@/lib/compose')
  const F = load('@/lib/filmes/faceless15')
  const H = load('@/lib/hookFirstFrame')
  const G = load('@/lib/captionScriptSpelling')
  const words = () => G.alinharGrafiaDoRoteiro(clone(FIX.words), NARRACAO).words
  const montar = ({ watermark = false, endCard = undefined } = {}) => {
    C.setActiveCaptionFont('en')
    return C.buildCreatomateSource({
      clipUrls: ['https://cdn.test/seedance-a.mp4', 'https://cdn.test/seedance-b.mp4', 'https://cdn.test/seedance-c.mp4'], voiceoverUrl: 'https://cdn.test/vo.mp3',
      voiceoverScript: NARRACAO, sceneCaptions: FRASES, duration: 15, quality: 'cinematic_ai', realAudioDuration: FIX.audioDuration, whisperWords: words(),
      musicUrl: 'https://v3.fal.media/lyria/trilha.mp3', watermark, ...(endCard === undefined ? {} : { endCard }), aspect: '9:16', clipSeconds: [6, 6, 6],
    })
  }
  return { C, F, H, words, montar }
}
const decide = (F, o = {}) => F.resolverFaceless15({ interna: false, pedido: undefined, quality: 'cinematic_ai', duration: 15, aspect: '9:16', avatar: false, studioAds: false, ...o })
const VIVO = carregar()

// ═══ P. interruptor ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('P. F1+F3 públicas; f2/f4/cta só por pedido interno; fora do formato nada')
const provaInterruptor = (M = VIVO) => {
  const F = M.F
  const fora = [{ duration: 35 }, { duration: 60 }, { quality: 'fast' }, { quality: 'cinematic_kling' }, { aspect: '16:9' }, { aspect: '1:1' }, { avatar: true }, { studioAds: true }].map((o) => decide(F, o))
  return eqJ(F.FACELESS15_PUBLIC, { f1: true, f2: false, f3: true, f4: false, cta: false }) &&
    eqJ(decide(F).fases, ['f1', 'f3']) && decide(F).ativo === true && decide(F, { aspect: undefined }).ativo === true &&
    eqJ(decide(F, { pedido: ['f1', 'f2', 'f3', 'f4', 'cta'] }).fases, ['f1', 'f3']) && decide(F, { pedido: 'f2,f4' }).ignoradas.some((i) => i.endsWith(':conta_externa')) &&
    eqJ(decide(F, { interna: true }).fases, ['f1', 'f3']) && eqJ(decide(F, { interna: true, pedido: ['f2'] }).fases, ['f1', 'f2', 'f3']) && eqJ(decide(F, { interna: true, pedido: ['f4', 'cta'] }).fases, ['f1', 'f3', 'f4', 'cta']) &&
    fora.every((d) => d.formato === false && d.ativo === false && d.fases.length === 0)
}
check('P1 FACELESS15_PUBLIC = { f1: true, f2: false, f3: true, f4: false, cta: false }; cliente no formato recebe F1+F3 (com ou sem pedido — o pedido dele segue ignorado); interna soma o pedido; fora do formato (35/60 s, Kineo 1, Kling 2.5, 16:9, 1:1, avatar, Ads) nada', () => provaInterruptor())
const provaCliente = (M = VIVO) => {
  const s = M.montar({ watermark: true })
  const ref = clone(s)
  const r = M.F.aplicarFaceless15(s, decide(M.F), { whisperWords: M.words(), clipSeconds: [6, 6, 6] })
  const g = M.F.aplicarGanchoFaceless15(s, decide(M.F, { pedido: ['f2'] }), { narration: NARRACAO, font: 'Montserrat' })
  return r.ativo === true && eqJ(r.fases, ['f1', 'f3']) && r.f1?.chunks === 11 && r.f3?.musica === 'unica' && !r.f4 && !r.erros &&
    eqJ(foraDaTrilha(s, [5, 8, 12]), foraDaTrilha(ref, [5, 8, 12])) && s.duration === ref.duration && trilha(s, 5).every((e) => e.y === '62%') &&
    trilha(s, 8, 'audio').length === 1 && trilha(s, 8, 'audio')[0].volume === '14%' && trilha(s, 12, 'audio').length >= 3 &&
    g.aplicado === false && trilha(s, M.H.GANCHO_1Q_TRACK).length === 0 && M.H.GANCHO_1Q_PUBLIC === false
}
check('P2 o filme do CLIENTE no formato: legenda F1 (11 blocos a 62 %) + som F3 (música única a 14 % + SFX); clipes, voz e duração byte a byte; sem 5 planos, sem gancho escrito', () => provaCliente())

// ═══ X. export limpo ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nX. o export limpo (unlock) acompanha a prévia')
const linhaDe = (src, a) => { const i = src.indexOf(a); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i)) }
const provaRotas = (rota = rd(ROTA), unlock = rd(UNLOCK), gc = rd(GC)) => {
  const rc = linhaDe(rota, 'const faceless15 = resolverFaceless15({')
  const ru = linhaDe(unlock, 'const faceless15 = resolverFaceless15({')
  return rc.includes('interna: isInternalEmail(user.email)') && ru.includes('interna: isInternalEmail(user.email)') && ru.includes('quality: rebuildQuality, duration, aspect, avatar: false, studioAds: false') &&
    unlock.includes('const rebuildQuality = rebuildQualityOf(body.quality)') && unlock.includes('const aspect = normalizeAspect(body.aspect)') &&
    linhaDe(unlock, 'const faceless15Relato = aplicarFaceless15(source, faceless15, {').length > 0 && linhaDe(unlock, 'const g2 = aplicarGanchoFaceless15(source, faceless15,').length > 0 &&
    gc.includes("const safeDuration = requestedDuration === 15 ||") && gc.includes('    duration: safeDuration,') && gc.includes("...(input.quality === 'fast' || input.quality === 'cinematic_ai' ? { quality: input.quality } : {}),")
}
check('X1 /api/compose e /api/compose/unlock decidem pelo MESMO resolverFaceless15 com a conta interna do servidor; o unlock lê quality/duração/quadro do corpo e o GenerateClient manda quality e a duração de 15 s', () => provaRotas())
const provaExport = (M = VIVO) => {
  const prev = M.montar({ watermark: true })
  const exp = M.montar({ watermark: false, endCard: false })
  const refExp = clone(exp)
  const rp = M.F.aplicarFaceless15(prev, decide(M.F), { whisperWords: M.words(), clipSeconds: [6, 6, 6] })
  const re = M.F.aplicarFaceless15(exp, decide(M.F, { pedido: ['f4'] }), { whisperWords: M.words(), clipSeconds: null })
  const fora = [{ duration: 35 }, { quality: 'fast' }].map((o) => { const x = M.montar({ watermark: false, endCard: false }); const foto = JSON.stringify(x); const r = M.F.aplicarFaceless15(x, decide(M.F, o), { whisperWords: M.words(), clipSeconds: null }); return r.ativo === false && JSON.stringify(x) === foto })
  return eqJ(rp.fases, ['f1', 'f3']) && eqJ(re.fases, ['f1', 'f3']) && re.f1?.chunks === 11 && eqJ(trilha(exp, 5), trilha(prev, 5)) && eqJ(trilha(exp, 8), trilha(prev, 8)) && eqJ(trilha(exp, 12), trilha(prev, 12)) &&
    eqJ(foraDaTrilha(exp, [5, 8, 12]), foraDaTrilha(refExp, [5, 8, 12])) && fora.every(Boolean)
}
check("X2 a montagem do export limpo do cliente (sem marca d'água, sem cartão final) recebe a MESMA legenda, música e SFX da prévia; o resto do export fica byte a byte; fora do formato, JSON idêntico", () => provaExport())

// ═══ D. desfaz ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, nada no motor')
const provaDesfaz = (sem = semFilmesF1F3Publico2010) =>
  FILMES_F1F3_PUBLICO_2010_ARQUIVOS.length === 5 && FILMES_F1F3_PUBLICO_2010_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(sem(readFileSync(join(RAIZ, f), 'utf8'), f)) === b }) &&
  FILMES_F1F3_PUBLICO_2010_NOVOS.length === 3 && FILMES_F1F3_PUBLICO_2010_NOVOS.every((f) => existsSync(join(RAIZ, f)) && statSync(join(RAIZ, f)).size > 0 && base(f) === null) && MARCA_FILMES_F1F3_PUBLICO_2010 === MARCA &&
  eqJ(carregar(lf(sem(readFileSync(join(RAIZ, F15), 'utf8'), F15))).F.FACELESS15_PUBLIC, { f1: false, f2: false, f3: false, f4: false, cta: false })
check('D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-filmes-f1f3-publico-2010.mjs), é EXATAMENTE a base; desfeito, o interruptor volta a tudo false; os novos existem e não existiam', () => provaDesfaz())
check('D2 toda linha nova traz a marca; o diff da base até o último commit da entrega só toca a lista, os novos e o doc; lib/compose, hookFirstFrame, lyriaMusic, as rotas do compose/unlock e a cobrança intocados', () => {
  const tocados = git('diff', '--name-only', BASE, TOPO).trim().split('\n').concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter((f) => f && !diffSoFilmesF1F3Publico2010(git('diff', '-U0', '--no-color', 'HEAD', '--', f), f))).filter(Boolean)
  const permitidos = new Set([...FILMES_F1F3_PUBLICO_2010_ARQUIVOS, ...FILMES_F1F3_PUBLICO_2010_NOVOS, 'docs/FILMES-F1-F4-1910.md'])
  const linhas = FILMES_F1F3_PUBLICO_2010_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return semMeta95Escrita2010(rd(f), f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) }) // KINEO-META95-ESCRITA-2010 — reancorado: as linhas da legenda na escrita do roteiro (camada mais nova) saem em memória
  return tocados.length > 0 && tocados.every((f) => permitidos.has(f)) && linhas && !/KINEO-FILMES-F1-F4|KINEO-FILMES-F1F3-AJUSTE|KINEO-FILMES-F1-VIRGULA|KINEO-HOME/.test(MARCA) &&
    ['lib/compose.ts', 'lib/hookFirstFrame.ts', 'lib/lyriaMusic.ts', ROTA, UNLOCK, 'lib/engineCost.ts'].every((f) => !tocados.includes(f))
})
check('D3 encadeamento: semHomeCardsBotoes2010 (e, por ela, semApresentadorOlhos1910 e semHome3Cards1910) tira esta camada PRIMEIRO; sem a marca, fora da lista e null passam igual', () => {
  return FILMES_F1F3_PUBLICO_2010_ARQUIVOS.every((f) => {
    const raw = readFileSync(join(RAIZ, f), 'utf8'), semEste = semFilmesF1F3Publico2010(raw, f)
    return semHomeCardsBotoes2010(raw, f) === semHomeCardsBotoes2010(semEste, f) && semApresentadorOlhos1910(raw, f) === semApresentadorOlhos1910(semEste, f) && semHome3Cards1910(raw, f) === semHome3Cards1910(semEste, f)
  }) && /export function semHomeCardsBotoes2010\(texto, p\) \{\n  texto = semFilmesF1F3Publico2010\(texto, p\)/.test(rd('scripts/test-support/desfaz-home-cards-botoes-2010.mjs')) &&
    semFilmesF1F3Publico2010(rd(ROTA), ROTA) === semMeta95Escrita2010(rd(ROTA), ROTA) && semFilmesF1F3Publico2010(rd(F15), 'outro/arquivo.ts') === rd(F15) && desfazFilmesF1F3Publico2010(F15, null) === null && // KINEO-META95-ESCRITA-2010 — reancorado: a rota ganhou a legenda na escrita do roteiro (camada mais nova, que a cadeia tira); esta camada segue sem tocá-la
    Object.values(ACRESCIMOS_FILMES_F1F3_PUBLICO_2010).every((n) => Number.isInteger(n) && n >= 0)
})
check('D4 todo commit da entrega traz a marca e a [TRAVA 8.2 — vai do fundador 20/10 "nota 10"] no assunto', () => {
  const assuntos = git('log', '--no-merges', '--format=%s', `${BASE}..${TOPO}`).trim().split('\n').filter(Boolean)
  return BASE === 'HEAD' || (assuntos.length > 0 && assuntos.every((s) => s.includes(MARCA) && s.includes('[TRAVA 8.2 — vai do fundador 20/10 "nota 10"]')))
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const vermelho = (fn) => { try { return !fn() } catch { return true } }
const mF = (a, b) => carregar(trocar(rd(F15), a, b))
check('M1 f2 pública (gancho escrito para todos sem nota) → P1 e P2 vermelhos', () => { const m = mF('f1: true, f2: false, f3: true', 'f1: true, f2: true, f3: true'); return vermelho(() => provaInterruptor(m)) && vermelho(() => provaCliente(m)) })
check('M2 f1 volta a ser só interna → P1, P2 e X2 vermelhos', () => { const m = mF('f1: true, f2: false', 'f1: false, f2: false'); return vermelho(() => provaInterruptor(m)) && vermelho(() => provaCliente(m)) && vermelho(() => provaExport(m)) })
check('M3 f3 volta a ser só interna → P1 e P2 vermelhos', () => { const m = mF('f2: false, f3: true, f4: false', 'f2: false, f3: false, f4: false'); return vermelho(() => provaInterruptor(m)) && vermelho(() => provaCliente(m)) })
check('M4 f4 pública (5 planos sem nota) → P1 e P2 vermelhos', () => { const m = mF('f3: true, f4: false, cta: false', 'f3: true, f4: true, cta: false'); return vermelho(() => provaInterruptor(m)) && vermelho(() => provaCliente(m)) })
check('M5 o cliente passa a ligar fase pelo pedido → P1 e X2 vermelhos', () => { const m = mF('if (input.interna === true) pedidas.push(...pedidasBrutas)', 'pedidas.push(...pedidasBrutas)'); return vermelho(() => provaInterruptor(m)) && vermelho(() => provaExport(m)) })
check('M6 o GenerateClient deixa de mandar a quality ao unlock (o export cairia no Kineo 1, fora do formato) → X1 vermelho', () => { const g = trocar(rd(GC), "...(input.quality === 'fast' || input.quality === 'cinematic_ai' ? { quality: input.quality } : {}),", ''); return vermelho(() => provaRotas(rd(ROTA), rd(UNLOCK), g)) })
check('M7 o unlock decide pela conta do corpo → X1 vermelho', () => { const u = trocar(rd(UNLOCK), 'resolverFaceless15({ interna: isInternalEmail(user.email),', 'resolverFaceless15({ interna: body.interna === true,'); return vermelho(() => provaRotas(rd(ROTA), u, rd(GC))) })
check('M8 linha marcada a mais na receita → D1 vermelho (o desfaz lança na contagem)', () => {
  const extra = rd(F15) + `\n// sobra ${MARCA}`
  return vermelho(() => provaDesfaz((t, f) => semFilmesF1F3Publico2010(f === F15 ? extra : t, f)))
})

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
