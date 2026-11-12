// KINEO-STUDIO-PREENCHIDO-1211 — guardião: o Studio chega PREENCHIDO com a ideia-exemplo da página de entrada, e nada começa sozinho.
// Prova: (1) cada página de entrada dá a frase DELA (examplePrompt das páginas de intenção; 1ª ideia do nicho, conferida literal na
// página), no idioma dela; páginas de outro produto (anúncio, desenho) e preços nunca preenchem; (2) só conta nova (≤ 24 h), sem filme
// pronto, com o interruptor ligado; (3) chegada com ideia na URL (ou com série, filme de 60 s, quickstart) nunca é trocada; (4) o Studio
// só ESCREVE na caixa vazia — não gera, não analisa, não debita — e mede impressão e clique; (5) a rota só lê.
// Cada mutante tem de derrubar a bateria. Rodar: node scripts/test-studio-preenchido-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/growth/studioPreenchido1211.ts'
const ROUTE = 'app/api/me/entry-prefill/route.ts'
const STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const NICHE_PAGE = 'app/free-ai-shorts/[niche]/page.tsx'
const SRC = Object.fromEntries([LIB, ROUTE, STUDIO, NICHE_PAGE].map((p) => [p, rd(p)]))

function loader(src) {
  const cache = new Map()
  function get(p) {
    if (cache.has(p)) return cache.get(p)
    const exports = {}
    cache.set(p, exports)
    const code = ts.transpileModule(src[p] ?? rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(code, { exports, console, process: { env: {} }, require: (id) => {
      if (id.startsWith('@/')) return get(id.slice(2) + '.ts')
      if (id.startsWith('.')) return get(relative(root, resolve(root, dirname(p), id)).split('\\').join('/') + '.ts')
      throw new Error('import inesperado: ' + id)
    } }, { filename: p })
    return exports
  }
  return get
}

function battery(src) {
  const p = []
  let lib, intent
  try { const get = loader(src); lib = get(LIB); intent = get('lib/seo/intentPages.ts') } catch (e) { return [`os módulos não carregam: ${e.message}`] }
  // (1) a frase da própria página, no idioma dela
  const urdu = lib.ideiaDaPagina('/ai-video-generator/for/urdu')
  if (!urdu || urdu.idea !== intent.getIntentPage('urdu').examplePrompt || urdu.language !== 'ur') p.push('/for/urdu não dá a frase da própria página em urdu')
  const pt = lib.ideiaDaPagina('/gerador-de-shorts-gratis')
  if (!pt || pt.idea !== intent.getIntentPage('portuguese').examplePrompt || pt.language !== 'pt') p.push('/gerador-de-shorts-gratis não dá a frase em português')
  const de = lib.ideiaDaPagina('/free-shorts-generator/de')
  if (!de || de.language !== 'de') p.push('/free-shorts-generator/de não dá a frase em alemão')
  const horror = lib.ideiaDaPagina('/free-ai-shorts/horror')
  if (!horror || horror.idea !== 'The 3am rule you should never break') p.push('/free-ai-shorts/horror não dá a 1ª ideia do nicho')
  for (const [k, v] of Object.entries(lib.NICHE_FIRST_IDEA)) {
    if (!src[NICHE_PAGE].includes(JSON.stringify(v).slice(1, -1)) && !src[NICHE_PAGE].includes(v)) p.push(`a ideia do nicho ${k} não está mais na página (frase inventada ou página mudou)`)
  }
  if (lib.ideiaDaPagina('/')?.idea !== intent.getIntentPage('youtube-shorts').examplePrompt) p.push('a home não dá a frase do Short narrado')
  if (lib.ideiaDaPagina('/text-to-video-shorts/?utm_source=chatgpt')?.idea !== intent.getIntentPage('text-to-video').examplePrompt) p.push('/text-to-video-shorts (com query e barra) não normaliza')
  if (!lib.ideiaDaPagina('/ai-video-generator/seedance')) p.push('/ai-video-generator/seedance (52 de 53 sem ideia) ficou sem frase')
  for (const nunca of ['/ai-ugc-ads', '/ai-kids-cartoon-videos', '/pricing', '/studio', '/xyz-desconhecida', '/free-ai-shorts/nao-existe', null, 'http://x.test/']) {
    if (lib.ideiaDaPagina(nunca) !== null) p.push(`a página ${nunca} preencheria o Studio de filme`)
  }
  // (2) só conta nova, sem filme, interruptor ligado
  const now = Date.parse('2026-11-12T03:00:00Z')
  const ok = { accountCreatedAt: '2026-11-12T01:00:00Z', completedFilms: 0, nowMs: now }
  if (lib.KINEO_STUDIO_PREENCHIDO_1211 !== 'on' || !lib.contaRecebePreenchimento(ok)) p.push('conta nova sem filme não recebe')
  if (lib.contaRecebePreenchimento({ ...ok, chave: 'off' })) p.push("'off' ainda preenche")
  if (lib.contaRecebePreenchimento({ ...ok, completedFilms: 1 })) p.push('conta com filme pronto recebe')
  if (lib.contaRecebePreenchimento({ ...ok, completedFilms: null })) p.push('leitura de filmes que falhou recebe (tem de falhar fechado)')
  if (lib.contaRecebePreenchimento({ ...ok, accountCreatedAt: '2026-11-10T23:00:00Z' })) p.push('conta de mais de 24 h recebe')
  if (lib.contaRecebePreenchimento({ ...ok, accountCreatedAt: null })) p.push('conta sem data recebe')
  // (3) chegada com ideia ou outro fluxo nunca é trocada
  const sp = (q) => new URLSearchParams(q)
  if (!lib.chegadaSemIdeia(sp('signup=1&engine=seedance'))) p.push('chegada vazia não conta como sem ideia')
  for (const q of ['prompt=minha+ideia', 'film60=1', 'series=x', 'studio_continuation=1', 'chatgpt_quickstart=idea']) if (lib.chegadaSemIdeia(sp(q))) p.push(`chegada com ${q} seria preenchida por cima`)
  // (4) o Studio só escreve na caixa vazia e mede
  const st = src[STUDIO]
  const i = st.indexOf('const pagePrefillAskedRef = useRef(false)')
  const efeito = i < 0 ? '' : st.slice(i, st.indexOf('}, [searchSignature])', i))
  if (!efeito) p.push('o efeito do preenchimento sumiu')
  if (!efeito.includes('const preencher = !hadIdea && idea !== null && !(promptRef.current?.value ?? \'\').trim()')) p.push('o preenchimento não respeita "já tinha ideia" e "caixa já escrita"')
  if (!efeito.includes("fetch('/api/me/entry-prefill'")) p.push('o Studio não pergunta ao servidor')
  if (/generate\(|generateClip\(|handleAnalyze|autoanalyze|fetch\('\/api\/(generate|compose|stripe)/u.test(efeito)) p.push('o efeito do preenchimento dispara algo além de escrever na caixa')
  if (!efeito.includes('void trackEvent(STUDIO_PREFILL_EVENT, { version: STUDIO_PREENCHIDO_VERSION, page, had_idea: hadIdea, prefilled: preencher')) p.push('a impressão não grava página, ideia e preenchimento')
  if (!efeito.includes('localStorage.getItem(STUDIO_PREFILL_DONE_KEY)') || !efeito.includes('localStorage.setItem(STUDIO_PREFILL_DONE_KEY')) p.push('falta a trava de uma vez por aparelho')
  if (!st.includes('void trackEvent(STUDIO_PREFILL_GENERATED_EVENT, { version: STUDIO_PREENCHIDO_VERSION, page: pf.page, edited: prompt.trim() !== pf.idea })') || !st.includes('pagePrefillRef.current = null')) p.push('o clique em gerar com a ideia da página não é medido uma vez')
  if (!st.includes("onGenerate={() => { recordMrr('mrr_generate_clicked'); marcarPrefillGerado(); generate() }}") || !st.includes("recordMrr('mrr_generate_clicked'); marcarPrefillGerado() }}")) p.push('os dois botões de gerar não medem o clique com a ideia da página')
  const g = st.indexOf('  const generate = () => {')
  if (g < 0 || st.slice(g, st.indexOf('\n  }\n', g)).includes('marcarPrefillGerado')) p.push('a medida entrou no generate() (o diagnóstico da série executa o corpo isolado)')
  // (5) a rota só lê e decide pelo servidor
  const r = src[ROUTE]
  if (/\.(insert|update|upsert|delete|rpc)\(/u.test(r)) p.push('a rota escreve no banco')
  if (!r.includes('if (!user) return NextResponse.json(VAZIO, { status: 401 })')) p.push('a rota responde sem login')
  if (!r.includes('contaRecebePreenchimento({') || !r.includes('ideiaDaPagina(page)')) p.push('a rota não usa a régua do módulo')
  if (!r.includes(".eq('name', 'landing_session_started').in('session_id', sessions)")) p.push('a página de entrada não vem do pouso do mesmo session_id')
  if (!r.includes("export const fetchCache = 'force-no-store'")) p.push('a rota pode ir para cache (resposta por conta)')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS Studio preenchido: frase da própria página no idioma dela; só conta nova; nunca por cima; só escreve; rota só lê' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['interruptor ignorado', muta(LIB, "if ((input.chave ?? KINEO_STUDIO_PREENCHIDO_1211) !== 'on') return false", '')],
  ['janela de 48 h', muta(LIB, 'export const STUDIO_PREFILL_WINDOW_MS = 24 * 60 * 60 * 1000', 'export const STUDIO_PREFILL_WINDOW_MS = 48 * 60 * 60 * 1000')],
  ['conta com filme recebe', muta(LIB, '  if (input.completedFilms !== 0) return false\n', '')],
  ['anúncio preenche filme', (() => { const m = muta(LIB, "  if (!p || NUNCA.some((n) => p === n || p.startsWith(`${n}/`))) return null", '  if (!p) return null'); return { ...m, [LIB]: m[LIB].replace("  '/': 'youtube-shorts',", "  '/ai-ugc-ads': 'product-demos',\n  '/': 'youtube-shorts',") } })()],
  ['frase inventada no nicho', muta(LIB, 'horror: "The 3am rule you should never break"', 'horror: "A scary story about a haunted house"')],
  ['urdu sem idioma', muta(LIB, "return { idea, language: typeof page?.language === 'string' ? page.language : null, source: 'intent' }", "return { idea, language: null, source: 'intent' }")],
  ['por cima da ideia da URL', muta(STUDIO, "const preencher = !hadIdea && idea !== null && !(promptRef.current?.value ?? '').trim()", "const preencher = idea !== null && !(promptRef.current?.value ?? '').trim()")],
  ['por cima da caixa escrita', muta(STUDIO, "const preencher = !hadIdea && idea !== null && !(promptRef.current?.value ?? '').trim()", 'const preencher = !hadIdea && idea !== null')],
  ['começa sozinho', muta(STUDIO, '          setPrompt(idea)\n', '          setPrompt(idea)\n          generate()\n')],
  ['série é trocada', muta(LIB, "'film60', 'studio_continuation', 'series', ", "'film60', 'studio_continuation', ")],
  ['rota grava', muta(ROUTE, '    return NextResponse.json({ page, idea:', "    await admin.from('events').insert({ name: 'x' })\n    return NextResponse.json({ page, idea:")],
  ['clique sem medida', muta(STUDIO, 'void trackEvent(STUDIO_PREFILL_GENERATED_EVENT,', 'void (STUDIO_PREFILL_GENERATED_EVENT,')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
