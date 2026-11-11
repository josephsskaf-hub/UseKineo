// KINEO-VITRINE-PAGINAS-1011 [fundador 10/11: "filmes prontos da vitrine na página que o GPT cita. Vamos fazer esse"] — guardião sem rede.
// Prova, lendo os arquivos e renderizando a faixa (components: app/claude-connector/ShowcaseGrid.tsx → ShowcaseStrip):
//   A. SELO HONESTO: todo clipe de cada página é de um motor que a página vende, e o motor de cada clipe é o que o código REGISTRA
//      (lib/publicExamples.ts, lib/ui/homeTwoDoors.ts, lib/clipesNos2Lugares.ts, lib/clips/clipEngineShowcase.ts,
//      app/claude-connector/ShowcaseGrid.tsx, lib/recreate/formats.ts) — nada adivinhado;
//   B. LEVE: prévia e pôster existem em public/, pôster é imagem, prévia ≤ VITRINE_MAX_BYTES;
//   C. A FAIXA: no HTML do servidor nenhum <video> tem src nem autoplay, todos têm pôster e preload="none", o selo é o nome do motor
//      e todo clique leva ao href da página;
//   D. MONTAGEM: toda página-alvo com acervo monta a faixa; página sem acervo (ou com menos de 3) está na lista de compras da etapa 2;
//   E. a lista de compras cabe em US$ 55.
// Mutantes: motor errado numa página de motor, registro que não bate, vídeo sem pôster (dado e componente), preload automático,
// autoplay, faixa ausente numa página-alvo, compra acima do teto.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = process.cwd()
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(path.join(ROOT, f), 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const LIB = 'lib/seo/vitrinePaginas1011.ts', COMP = 'app/claude-connector/ShowcaseGrid.tsx'
const PAGINAS_ARQ = {
  '/ai-video-generator': 'app/ai-video-generator/page.tsx',
  '/ai-video-generator/seedance': 'app/ai-video-generator/[engine]/page.tsx',
  '/ai-video-generator/seedance#seedance-1-5': 'app/ai-video-generator/[engine]/page.tsx',
  '/ai-video-generator/kling-3': 'app/ai-video-generator/[engine]/page.tsx',
  '/ai-video-generator/minimax-h3': 'app/ai-video-generator/[engine]/page.tsx',
  '/ai-video-generator/minimax-h3-max': 'app/ai-video-generator/[engine]/page.tsx',
  '/ai-video-generator/kling-4': 'app/ai-video-generator/kling-4/page.tsx',
  '/ai-video-generator/seedance-2-5': 'app/ai-video-generator/seedance-2-5/page.tsx',
  '/seedance-vs-veo-vs-kling': 'app/seedance-vs-veo-vs-kling/page.tsx',
  '/ai-face-swap-video': 'app/ai-face-swap-video/page.tsx',
  '/ai-ugc-ads': 'components/ugc/UgcPages.tsx',
  '/pricing': 'app/pricing/PricingClient.tsx', // travada (VITRINE_BLOQUEADAS)
}

const MOCKS = {
  '@/lib/analytics': { __esModule: true, trackEvent: async () => {} },
}
function carregador(mutar = {}) {
  const cache = new Map()
  const carrega = (nome, pai = ROOT) => {
    if (nome === 'react') return React
    if (nome === 'react/jsx-runtime') return require('react/jsx-runtime')
    if (MOCKS[nome]) return MOCKS[nome]
    let f = nome.startsWith('@/') ? path.join(ROOT, nome.slice(2)) : nome.startsWith('.') ? path.resolve(pai, nome) : null
    if (!f) return require(nome)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = [f + '.ts', f + '.tsx', path.join(f, 'index.ts')].find((x) => fs.existsSync(x)) ?? f
    if (cache.has(f)) return cache.get(f).exports
    const rel = path.relative(ROOT, f).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(f, mod)
    const fonte = mutar[rel] ? mutar[rel](lf(fs.readFileSync(f, 'utf8'))) : fs.readFileSync(f, 'utf8')
    const js = ts.transpileModule(fonte, { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: (n) => carrega(n, path.dirname(f)), console, process: { env: {} }, URL, URLSearchParams, Date, Math, Number, String, Array, Object, Set, Map, JSON, Error, RegExp, Boolean, Symbol, Promise }, { filename: f })
    return mod.exports
  }
  return carrega
}

// O motor que o CÓDIGO registra para cada arquivo de prévia (independente da lista da vitrine).
const QM = { cinematic_ai: 'seedance15', cinematic_hollywood: 'kling3', cinematic_h3: 'h3', cinematic_veo: 'veo31', cinematic_s25: 's25' }
function motorRegistrado(c, carrega) {
  const ex = /^\/previews\/ex-([0-9a-f-]{36})\.mp4$/.exec(c.src)
  if (ex) {
    const pe = carrega('@/lib/publicExamples.ts')
    const v = [...pe.FOUNDER_SHOWCASE, ...pe.ENGINE_PAGE_LEAD].find((x) => x.id === ex[1] && x.previewPath === c.src)
    return v ? QM[v.engine] ?? `?${v.engine}` : null
  }
  const door = /^\/previews\/door-([0-9a-f-]{36})\.mp4$/.exec(c.src)
  if (door) {
    const d = carrega('@/lib/ui/homeTwoDoors.ts').HOME_DOOR_FILM_TRIOS.flat().find((x) => x.src === c.src)
    return d ? QM[d.engine] ?? `?${d.engine}` : null
  }
  const gal = /^\/previews\/galeria\/([a-z0-9-]+)\.mp4$/.exec(c.src)
  if (gal) {
    const id = gal[1]
    const fonte = ler('lib/clipesNos2Lugares.ts')
    const linha = fonte.split('\n').find((l) => l.includes(`id: '${id}'`))
    if (!linha) return null
    if (/selo: 'Narrated film'/.test(linha) && /Kling 4\.0/.test(linha)) return 'kling4'
    // Os clipes do bloco KINEO-CLIPES-E-CARDS-0511: o comentário de abertura do bloco diz "feitos no H3 Max Turbo".
    if (/KINEO-CLIPES-E-CARDS-0511/.test(linha) && /KINEO-CLIPES-E-CARDS-0511[^\n]*feitos no H3 Max Turbo/.test(fonte)) return 'h3_turbo'
    const rec = carrega('@/lib/recreate/formats.ts').RECREATE_FORMATS.find((f) => f.id === id)
    if (rec && rec.type === 'swap' && rec.swapApproved === true) return 'recreate'
    return null
  }
  const s25 = carrega('@/lib/clips/clipEngineShowcase.ts').CLIP_ENGINE_SHOWCASE.s25
  if (s25 && s25.video === c.src) return 's25'
  const grid = ler(COMP).split('\n').find((l) => l.includes(`src: '${c.src}'`))
  if (grid) {
    const b = /badge: '([^']+)'/.exec(grid)?.[1]
    return b === 'Kling 3' ? 'kling3' : b === 'Kling 4.0' ? 'kling4' : `?${b}`
  }
  return null
}

const semPublic = (p) => path.join(ROOT, 'public', p)
function problemas(mutar = {}) {
  const probs = []
  const carrega = carregador(mutar)
  const L = carrega('@/' + LIB)
  const G = carrega('@/' + COMP)
  const paginas = L.VITRINE_PAGINAS
  const fonteDe = (f) => mutar[f] ? mutar[f](ler(f)) : ler(f)
  for (const [key, p] of Object.entries(paginas)) {
    for (const c of p.clipes) {
      if (!p.motores.includes(c.motor)) probs.push(`${key}: ${c.id} é de ${c.motor}, a página vende ${p.motores.join('/')}`)
      const reg = motorRegistrado(c, carrega)
      if (reg !== c.motor) probs.push(`${key}: ${c.id} diz ${c.motor}, o código registra ${reg ?? 'nada'}`)
      if (!c.registro || !fs.existsSync(path.join(ROOT, c.registro.split(' ')[0]))) probs.push(`${key}: ${c.id} sem registro apontando um arquivo`)
      if (!/\.(webp|jpg)$/.test(c.poster || '') || !fs.existsSync(semPublic(c.poster))) probs.push(`${key}: ${c.id} sem pôster`)
      if (!fs.existsSync(semPublic(c.src))) probs.push(`${key}: ${c.id} prévia não existe`)
      else if (fs.statSync(semPublic(c.src)).size > L.VITRINE_MAX_BYTES) probs.push(`${key}: ${c.id} prévia pesada`)
    }
    if (p.clipes.length > 6) probs.push(`${key}: mais de 6 vídeos`)
    const v = L.vitrineDaPagina(key)
    const comprada = L.COMPRAS_ETAPA2.some((c) => c.pagina === key)
    if ((!v || p.clipes.length < 3) && !comprada) probs.push(`${key}: sem faixa completa e fora da lista de compras`)
    // Montagem: a página-alvo com acervo chama a faixa.
    const arq = PAGINAS_ARQ[key]
    if (!arq) { probs.push(`${key}: página sem arquivo conhecido`); continue }
    const src = fonteDe(arq)
    const bloqueio = L.VITRINE_BLOQUEADAS[key]
    if (bloqueio !== undefined) {
      // Pronta e NÃO montada: a trava do fundador manda. Montar sem soltar a trava fica vermelho aqui (e no guardião da trava).
      if (!bloqueio || bloqueio.length < 40) probs.push(`${key}: bloqueada sem motivo escrito`)
      if (/<ShowcaseStrip\s/.test(src)) probs.push(`${key}: faixa montada numa página travada`)
      continue
    }
    if (v) {
      if (!/<ShowcaseStrip\s/.test(src)) probs.push(`${key}: faixa ausente em ${arq}`)
      const chave = arq.includes('[engine]') ? /vitrineDaPagina\(vitrineKey/.test(src) : src.includes(`vitrineDaPagina('${key}')`)
      if (!chave) probs.push(`${key}: ${arq} não lê a vitrine desta página`)
    }
  }
  // [engine]: o endereço do Seedance segue o motor vendido (H3 Turbo ligado/desligado).
  const eng = fonteDe('app/ai-video-generator/[engine]/page.tsx')
  if (!eng.includes("standardH3 ? '/ai-video-generator/seedance' : params.engine === 'seedance' ? '/ai-video-generator/seedance#seedance-1-5'")) probs.push('[engine]: a faixa não segue o motor vendido no endereço do Seedance')
  // C. A faixa no HTML do servidor.
  const clipes = paginas['/ai-video-generator/kling-3'].clipes
  const html = renderToStaticMarkup(React.createElement(G.ShowcaseStrip, { titulo: 'T', linha: 'L', clipes, href: '/signup?intent_campaign=x', source: 'x' }))
  const videos = [...html.matchAll(/<video\b[^>]*>/g)].map((m) => m[0])
  if (videos.length !== clipes.length) probs.push('faixa: número de vídeos ≠ clipes')
  if (videos.some((t) => /\bsrc=/.test(t))) probs.push('faixa: vídeo com src no HTML do servidor')
  if (videos.some((t) => /autoplay/i.test(t))) probs.push('faixa: autoplay')
  if (videos.some((t) => !/preload="none"/.test(t))) probs.push('faixa: preload automático')
  if (videos.some((t) => !/poster="\/posters\//.test(t))) probs.push('faixa: vídeo sem pôster')
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
  if (links.length !== clipes.length || links.some((h) => h !== '/signup?intent_campaign=x')) probs.push('faixa: clique não leva ao cadastro da página')
  for (const c of clipes) if (!html.includes(`>${L.VITRINE_MOTOR_LABEL[c.motor]}</span>`)) probs.push(`faixa: selo de ${c.id} não é o nome do motor`)
  // E. Compras.
  if (L.comprasTotalUsd() > L.COMPRAS_TETO_USD) probs.push(`compras: US$ ${L.comprasTotalUsd()} acima do teto`)
  return probs
}

console.log('\nKINEO-VITRINE-PAGINAS-1011 — faixa "Made with <motor>" nas páginas que vendem\n')
const base = problemas()
for (const p of base) console.log('    · ' + p)
checa('origem: zero problemas (selo, pôster, peso, faixa, montagem, compras)', base.length === 0)

const L0 = carregador()('@/' + LIB)
const pags = Object.entries(L0.VITRINE_PAGINAS)
checa('toda página-alvo com faixa tem de 2 a 6 vídeos', pags.every(([k, p]) => !L0.vitrineDaPagina(k) || (p.clipes.length >= 2 && p.clipes.length <= 6)))
checa('as 10 páginas pedidas estão na lista', ['/ai-video-generator', '/ai-video-generator/seedance', '/ai-video-generator/kling-4', '/ai-video-generator/seedance-2-5', '/ai-video-generator/minimax-h3', '/ai-video-generator/minimax-h3-max', '/seedance-vs-veo-vs-kling', '/ai-face-swap-video', '/ai-ugc-ads', '/pricing'].every((k) => k in L0.VITRINE_PAGINAS))
checa('nenhum anúncio de Natal (feito fora do produto) numa faixa "made on Kineo"', pags.every(([, p]) => p.clipes.every((c) => !/anuncio-/.test(c.src))))
checa('nenhuma prévia HD pesada (examples-hd-sep24)', pags.every(([, p]) => p.clipes.every((c) => !c.src.includes('examples-hd-sep24'))))
checa('Recreate: só a prévia pública, nunca /api/recreate/assets', L0.VITRINE_PAGINAS['/ai-face-swap-video'].clipes.every((c) => c.src.startsWith('/previews/galeria/')))
checa('Recreate: a página filtra pelos formatos aprovados', ler('app/ai-face-swap-video/page.tsx').includes('formatos.some((f) => f.id === c.id)'))
checa('hub: o card "Kling 4.0" não leva mais filme do Kling 3', ler('app/ai-video-generator/page.tsx').includes("slug === 'kling-3' && engineOfferName(slug) === VITRINE_MOTOR_LABEL.kling4"))
checa(`compras da etapa 2: US$ ${L0.comprasTotalUsd()} ≤ US$ ${L0.COMPRAS_TETO_USD}`, L0.comprasTotalUsd() <= L0.COMPRAS_TETO_USD)

console.log('\nMutantes (cada um precisa ficar vermelho):')
const MUT = [
  ['vídeo de motor errado na página do Kling 4.0', { [LIB]: (t) => t.replace('clipes: [A.maryCeleste, A.anticitera, A.portaDoInferno, A.lobisomem]', 'clipes: [A.maracaibo, A.anticitera, A.portaDoInferno, A.lobisomem]') }, /é de kling3, a página vende kling4/],
  ['vídeo do Seedance 1.5 na página do H3 Turbo', { [LIB]: (t) => t.replace('clipes: [A.adeus2026, A.petBarista, A.tenisRua, A.glowUp]', 'clipes: [A.castelo, A.petBarista, A.tenisRua, A.glowUp]') }, /é de seedance15, a página vende h3_turbo/],
  ['selo que o código não registra (Titanic do Veo como Kling 3)', { [LIB]: (t) => t.replace("door('d16781b8-0557-4c7e-b339-3bf048ff700c', 'Titanic', 'veo31')", "door('d16781b8-0557-4c7e-b339-3bf048ff700c', 'Titanic', 'kling3')") }, /o código registra veo31/],
  ['vídeo sem pôster (dado)', { [LIB]: (t) => t.replace("poster: '/posters/studio-kling4-werewolf-kid.webp'", "poster: ''") }, /sem pôster/],
  ['vídeo sem pôster (componente)', { [COMP]: (t) => t.replace('                poster={c.poster}\n                muted\n                loop', '                muted\n                loop') }, /faixa: vídeo sem pôster/],
  ['preload automático', { [COMP]: (t) => t.replace('                playsInline\n                preload="none"\n                aria-hidden', '                playsInline\n                preload="auto"\n                aria-hidden') }, /preload automático/],
  ['autoplay no HTML', { [COMP]: (t) => t.replace('                muted\n                loop\n                playsInline\n                preload="none"\n                aria-hidden', '                autoPlay\n                muted\n                loop\n                playsInline\n                preload="none"\n                aria-hidden') }, /autoplay/],
  ['src no HTML do servidor', { [COMP]: (t) => t.replace('src={near ? c.src : undefined}\n                poster={c.poster}\n                muted\n                loop', 'src={c.src}\n                poster={c.poster}\n                muted\n                loop') }, /src no HTML/],
  ['faixa ausente numa página-alvo (Seedance 2.5)', { 'app/ai-video-generator/seedance-2-5/page.tsx': (t) => t.replace(/\{vitrine && <ShowcaseStrip[^\n]*\n/, '\n') }, /faixa ausente/],
  ['faixa ausente numa página-alvo (Kling 4.0)', { 'app/ai-video-generator/kling-4/page.tsx': (t) => t.replace(/\{vitrine && <div[^\n]*<ShowcaseStrip[^\n]*\n/, '\n') }, /faixa ausente/],
  ['faixa ausente numa página-alvo (motores no [engine])', { 'app/ai-video-generator/[engine]/page.tsx': (t) => t.replace(/\{vitrine && <ShowcaseStrip[^\n]*\n/, '\n') }, /faixa ausente/],
  ['/pricing destravado sem ordem (tirado da lista de bloqueadas)', { [LIB]: (t) => t.replace("  '/pricing': 'Trava do fundador", "  '/pricing-x': 'Trava do fundador") }, /\/pricing: faixa ausente/],
  ['faixa montada no /pricing travado', { 'app/pricing/PricingClient.tsx': (t) => t.replace('<FilmsMadeProof surface="pricing" />', '<FilmsMadeProof surface="pricing" /><ShowcaseStrip titulo="x" linha="x" clipes={[]} href="/" source="x" />') }, /faixa montada numa página travada/],
  ['página sem acervo tirada da lista de compras (H3 Max)', { [LIB]: (t) => t.replace("{ pagina: '/ai-video-generator/minimax-h3-max'", "{ pagina: '/ai-video-generator/kling-3'") }, /minimax-h3-max: sem faixa completa/],
  ['compra acima do teto', { [LIB]: (t) => t.replace('usdCada: 13.7,', 'usdCada: 40,') }, /acima do teto/],
  ['endereço do Seedance com a faixa do Seedance 1.5 no H3 Turbo', { 'app/ai-video-generator/[engine]/page.tsx': (t) => t.replace("standardH3 ? '/ai-video-generator/seedance' : params.engine === 'seedance' ? '/ai-video-generator/seedance#seedance-1-5'", "params.engine === 'seedance' ? '/ai-video-generator/seedance#seedance-1-5' : standardH3 ? '/ai-video-generator/seedance'") }, /não segue o motor vendido/],
]
for (const [nome, mutar, espera] of MUT) {
  const arq = Object.keys(mutar)[0]
  const mudou = mutar[arq](ler(arq)) !== ler(arq)
  const ps = mudou ? problemas(mutar) : []
  checa(`(M) ${nome} → vermelho`, mudou && ps.some((p) => espera.test(p)))
}

console.log(`\n${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
