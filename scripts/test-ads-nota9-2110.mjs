// KINEO-ADS-NOTA9-2110 — guardião do "Studio Ads nota 9" (fundador 21/10: "3 ajustes… experiência do cliente no mínimo em 9").
// Medido como cliente em produção (20/10 noite): AI Product Ads = 6,5 (~12 blocos antes de gerar), AI UGC Ads = 6 (a MESMA tela do produto, a pessoa
// escondida no meio, prévia genérica "Auto"). Alvo: a sensação do filme — 1 escolha visual + 1 frase + Gerar.
// Roda com `node scripts/test-ads-nota9-2110.mjs` da raiz, sem rede, sem banco: libs transpiladas pelo typescript do repo; a TELA é desenhada de verdade
// (react-dom/server) com o carregador offline daqui (efeitos desligados, rede/banco proibidos, componentes de fora = dublês vazios).
//
// O QUE PROVA:
//   L  lib pura (lib/ads/v2Nota9.ts): foco só por ?entry=ugc|product; passos (UGC: quem 1, produto 2, frase 3; produto: 1 e 2); os rostos = a lista
//      APROVADA, na ordem dela; a LINHA ÚNICA de custo (grátis com marca-d'água / "15-second ad · 41 credits · you have 1,000 → 959 left" /
//      "You need 41 credits, you have 0" + 1 botão de planos / saldo desconhecido sem inventar 0 / "3 ads" no kit); milhar sem Intl; en/pt/es + fallback;
//   T  a TELA desenhada: entry=ugc → "Pick who presents your product" com os 6 rostos aprovados ANTES do produto, frase "What should they say?", a linha
//      de custo e Gerar logo abaixo, "Advanced" recolhido (data-adv=closed), sem abas/atalhos no topo, Kit BF em UMA linha com o link de compra;
//      entry=product → sem rostos, "Add your product photo or link" + "What are you selling?"; amostra → "Your first ad is free (watermark)";
//      saldo curto → "You need 41 credits, you have 0" + "See plans"; SEM entrada → a tela de sempre (abas, atalhos, sem data-nota9, Kit BF grande);
//   P  os palcos: UGC mostra o apresentador escolhido (vídeo real se há, senão o retrato; "Me surpreenda" = o anúncio real da casa) com a foto do produto;
//      produto mostra a foto da pessoa; nenhum palco fala de crédito (a única linha de custo mora em cima do Gerar);
//   S  só tela: o Gerar da tela foco é o MESMO caminho (goFromBar → o botão do cartão de revisão); nenhuma linha marcada chama rota; os padrões do pedido
//      (nível, formato, apresentador, kit, estilo) não mudaram; o "Avançado" recolhe por CSS sem mover nada no DOM; o CSS esconde o Gerar antigo, a barra
//      do celular e o palco do estilo só na tela foco; servidor/curadoria/gerador/kids intocados;
//   D  desfaz exato (cada arquivo tocado volta a ser a base f53733122) + toda linha nova com a marca + o diff só toca a lista e os novos + encadeamento
//      (semDesenhoNota9_2110 → semHomeCardsClaros2010 → e as cabeças semBebeQueFala2010 / semMenuUgc2010 tiram esta camada primeiro);
//   M  mutantes (todos APLICADOS — provado por grep — e VERMELHOS).
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import ts from 'typescript'
import {
  semAdsNota92110, MARCA_ADS_NOTA9_2110 as MARCA, ADS_NOTA9_2110_BASE as B, ADS_NOTA9_2110_ARQUIVOS, ADS_NOTA9_2110_NOVOS, TROCAS_ADS_NOTA9_2110, ACRESCIMOS_ADS_NOTA9_2110,
} from './test-support/desfaz-ads-nota9-2110.mjs'
import { semHomeCardsClaros2010 } from './test-support/desfaz-home-cards-claros-2010.mjs'
import { semDesenhoNota9_2110 } from './test-support/desfaz-desenho-nota9-2110.mjs'
import { semBebeQueFala2010 } from './test-support/desfaz-bebe-que-fala-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const require = createRequire(join(ROOT, 'package.json'))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${B}:${p}`)) } catch { return null } }
/** Os arquivos DESTA entrega: os commits com a marca (rebase/fila não importam) + o que ainda não foi commitado + os novos sem rastreio. */
const daEntrega = () => { const meus = new Set(git('log', '--format=', '--name-only', `--grep=${MARCA}`, 'HEAD').trim().split('\n').map((f) => f.trim()).filter(Boolean)); const mudou = new Set(git('diff', '--name-only', B, 'HEAD').trim().split('\n').filter(Boolean)); return new Set([...[...meus].filter((f) => mudou.has(f)), ...git('diff', '--name-only', 'HEAD').trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter((f) => /nota9/i.test(f))].map((f) => f.trim()).filter(Boolean)) } // os meus commits que ainda diferem da base (merge/fila não contam)
const F = {
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  kit: 'components/ads/KitBfBuyCard.tsx',
  comp: 'components/ads/AdsNota9.tsx',
  lib: 'lib/ads/v2Nota9.ts',
  claros: 'scripts/test-support/desfaz-desenho-nota9-2110.mjs',
  approved: 'lib/ads/v2PresenterV2.ts',
}

let oks = 0, falhas = 0
const ok = (cond, msg) => { if (cond) { oks++; console.log(`  ok   ${msg}`) } else { falhas++; console.log(`  FALHA ${msg}`) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`erro: ${e && e.message}`] } }

// ─── carregador offline (tsx com React; efeitos desligados; rede/banco proibidos) ─────────────────────────────────────
function carregador(over = {}) {
  const cache = new Map()
  const react = { ...React, useEffect: () => {}, useLayoutEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn(), useRef: (current) => ({ current }) }
  const REAL = ['@/components/ads/KitBfBuyCard', '@/components/ads/AdsPresenterPicker', '@/components/ads/AdsNota9', '@/components/InterfaceLanguage', '@/components/studioKit', '@/components/ads/AdsFlow', '@/components/AdsPlanChanges', '@/components/ads/AdsStyles', '@/components/ProductStage', '@/components/ControlIcon']
  const src = (f) => (over[f] !== undefined ? over[f] : rd(f))
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }
    cache.set(file, box.exports)
    const shim = (id) => {
      if (id === 'react') return react
      if (id === 'react/jsx-runtime') return require(id)
      if (id === 'react-dom') return { ...require(id), createPortal: () => null }
      if (id === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...p }) => React.createElement('a', p, children) }
      if (id === 'next/image') return { __esModule: true, default: ({ priority, fill, ...p }) => React.createElement('img', p) }
      if (id === 'next/navigation') return { useSearchParams: () => new URLSearchParams(), usePathname: () => '/ads/v2', useRouter: () => ({}) }
      if (id === '@/lib/analytics') return { trackEvent: () => {} }
      if (id === '@/lib/supabase/client') return { createClient: () => { throw Error('banco proibido') } }
      if (id === 'node:crypto' || id === 'crypto') return require(id)
      if (id.endsWith('.css')) return {}
      if (REAL.includes(id)) return load(id.slice(2) + '.tsx')
      if (id.startsWith('@/components/')) { const Stub = ({ children }) => children ?? null; return new Proxy({ default: Stub }, { get: (t, k) => (k === '__esModule' ? true : t[k] ?? Stub) }) }
      const b = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? join(dirname(file), id).split('\\').join('/') : null
      if (!b) throw Error(`dependência inesperada ${id} em ${file}`)
      if (b.endsWith('.json')) return JSON.parse(src(b))
      for (const ext of ['', '.ts', '.tsx']) { const p = join(ROOT, b + ext); if (existsSync(p) && statSync(p).isFile()) return load(b + ext) }
      throw Error(`faltou ${b}`)
    }
    const js = ts.transpileModule(src(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { module: box, exports: box.exports, require: shim, React: react, process: { env: {} }, URL, URLSearchParams, console: { log() {}, warn() {}, error() {} }, fetch: () => { throw Error('rede proibida') }, setTimeout: () => 0, clearTimeout: () => {}, TextEncoder, TextDecoder }, { filename: file })
    cache.set(file, box.exports)
    return box.exports
  }
  return load
}
const libDe = (over = {}) => carregador(over)(F.lib)

/** A tela /ads/v2 desenhada (o invólucro já no modo simples, como depois do 1º efeito; a sessão nova; kit BF com a venda aberta). */
function tela({ entry = null, balance = 1000, sample = false, over = {} } = {}) {
  const rep = (s, a, b) => { if (!s.includes(a)) throw Error('âncora da tela sumiu: ' + a.slice(0, 70)); return s.split(a).join(b) }
  const o = {
    ...over,
    [F.client]: rep(rep(over[F.client] ?? rd(F.client), 'const [session, setSession] = useState(0)', 'const [session, setSession] = useState(1)'), "const [mode, setMode] = useState<'simple' | 'full' | 'batch' | null>(null)", "const [mode, setMode] = useState<'simple' | 'full' | 'batch' | null>('simple')"),
    [F.simple]: rep(over[F.simple] ?? rd(F.simple), "const marcasMode = marcas?.mode ?? 'legacy'", "const marcasMode = 'legacy' as 'loading' | 'legacy' | 'ready'"),
    [F.kit]: rep(over[F.kit] ?? rd(F.kit), 'const [o, setO] = useState<BfOffers | null>(null)', "const [o, setO] = useState<BfOffers | null>({ nowMs: 0, kit: { state: 'buy', endsAt: '', daysLeft: 31 }, annual: { open: false, endsAt: '', tiers: {} } } as any)"),
  }
  const load = carregador(o)
  const Client = load(F.client).default
  return renderToStaticMarkup(React.createElement(Client, { initialBalance: balance, classicCredits: 5, variations: false, producao: true, sample, workspace: null, business: null, entry }))
}
const ordem = (s, ...marcos) => { let i = -1; for (const m of marcos) { const j = s.indexOf(m, i + 1); if (j < 0) return false; i = j } return true }

// ═══ L. lib pura ═══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nL. lib pura')
function libProblemas(L) {
  const p = []
  if (L.adsNota9Focus('ugc') !== 'ugc' || L.adsNota9Focus('product') !== 'product') p.push('foco das 2 entradas')
  for (const x of [null, undefined, '', 'UGC', 'film', 1, true, {}]) if (L.adsNota9Focus(x) !== null) p.push(`foco aceitou ${String(x)}`)
  if ([L.adsNota9Step('ugc', 'who'), L.adsNota9Step('ugc', 'product'), L.adsNota9Step('ugc', 'text'), L.adsNota9Step('product', 'product'), L.adsNota9Step('product', 'text')].join() !== '1,2,3,1,2') p.push('passos')
  const lib = [{ id: 'a', portrait: '/a.webp' }, { id: 'b', portrait: null }, { id: 'c', portrait: '/c.webp' }, { id: 'd', portrait: '/d.webp' }]
  if (L.adsNota9Faces(lib, ['d', 'b', 'zz', 'a']).map((x) => x.id).join() !== 'd,a') p.push('rostos: só aprovados com retrato, na ordem aprovada')
  const en = L.adsNota9Copy('en')
  const c = (o) => L.adsNota9Cost({ copy: en, lang: 'en', seconds: 15, ...o })
  const pay = c({ credits: 41, balance: 1000, sample: false })
  if (pay.kind !== 'pay' || pay.text !== '15-second ad · 41 credits · you have 1,000 → 959 left' || pay.plans) p.push(`pagante: ${pay.text}`)
  const free = c({ credits: 41, balance: 0, sample: true })
  if (free.kind !== 'free' || free.text !== 'Your first ad is free (watermark)' || free.plans) p.push('amostra')
  const short = c({ credits: 41, balance: 0, sample: false })
  if (short.kind !== 'short' || short.text !== 'You need 41 credits, you have 0' || short.plans !== true) p.push(`curto: ${short.text}`)
  const unk = c({ credits: 41, balance: null, sample: false })
  if (unk.kind !== 'unknown' || unk.text !== '15-second ad · 41 credits' || /you have/.test(unk.text)) p.push('saldo desconhecido não vira 0')
  const none = c({ credits: null, balance: 1000, sample: false })
  if (none.kind !== 'none' || none.text !== en.chooseLevel) p.push('sem nível')
  const many = c({ credits: 123, balance: 1000, sample: false, count: 3 })
  if (many.text !== '3 ads · 123 credits · you have 1,000 → 877 left') p.push(`kit 3: ${many.text}`)
  const exact = c({ credits: 41, balance: 41, sample: false })
  if (exact.kind !== 'pay' || !exact.text.endsWith('→ 0 left')) p.push('saldo exato paga')
  if (L.adsNota9Num(1234567, 'en') !== '1,234,567' || L.adsNota9Num(1000, 'pt') !== '1.000' || L.adsNota9Num(999, 'pt') !== '999') p.push('milhar')
  const pt = L.adsNota9Copy('pt'), es = L.adsNota9Copy('es')
  if (pt.who === en.who || es.who === en.who || L.adsNota9Copy('fr') !== en || L.adsNota9Copy('xx') !== en || L.adsNota9Copy(null) !== en) p.push('línguas')
  for (const [k, t] of [['pt', pt], ['es', es]]) for (const key of Object.keys(en)) if (typeof t[key] !== 'string' || !t[key]) p.push(`${k}.${key} vazio`)
  for (const [k, t] of [['en', en], ['pt', pt], ['es', es]]) for (const [key, v] of Object.entries(t)) if (/—/.test(v)) p.push(`${k}.${key} com travessão`)
  const T = (w, h, extra = {}) => ({ key: `${w}x${h}`, w, h, video: null, ...extra })
  if (L.ADS_NOTA9_TINY_MIN_SIDE !== 500 || L.adsNota9TinyPhoto([T(225, 225)])?.key !== '225x225' || L.adsNota9TinyPhoto([T(1080, 1920), T(499, 900)])?.key !== '499x900' || L.adsNota9TinyPhoto([T(500, 500)]) !== null || L.adsNota9TinyPhoto([T(0, 0)]) !== null || L.adsNota9TinyPhoto([T(100, 100, { video: {} })]) !== null) p.push('foto pequena (< 500 px no lado menor; vídeo e dimensão desconhecida não acusam)')
  if (L.adsNota9Fill(en.tooLong, { n: 450, max: 400 }) !== 'Too long: keep it under 400 characters (now 450). Nothing was cut.') p.push('aviso de texto longo')
  if (L.adsNota9Cost({ copy: pt, lang: 'pt', seconds: 15, credits: 41, balance: 1000, sample: false }).text !== 'Anúncio de 15 segundos · 41 créditos · você tem 1.000 → sobram 959') p.push('pt pagante')
  return p
}
{
  const p = tenta(() => libProblemas(libDe()))
  ok(p.length === 0, `L1 foco só por ?entry=ugc|product; passos; rostos = aprovados na ordem; linha única de custo nos 6 casos; milhar; en/pt/es + inglês de reserva (${p.join('; ') || 'ok'})`)
  const src = rd(F.lib)
  ok(!/^import (?!type )/m.test(src) && !/fetch\(|\/api\//.test(src), 'L2 lib PURA: só import type, nenhuma rota, nenhum preço digitado')
}

// ═══ T. a tela desenhada ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. a tela desenhada')
const FACES = ['sofia', 'amara', 'rahul', 'kenji', 'jade', 'robert']
function telaProblemas(over = {}) {
  const p = []
  const ugc = tela({ entry: 'ugc', over })
  if (!ugc.includes('data-nota9="ugc"') || !ugc.includes('data-adv="closed"')) p.push('ugc: sem data-nota9/data-adv=closed')
  if (!ugc.includes('<h1>AI UGC Ads</h1>')) p.push('ugc: título')
  if (!ordem(ugc, 'data-kineo="ads-nota9-who"', 'Pick who presents your product', ...FACES.map((f) => `data-id="${f}"`), 'data-id="auto"', 'id="adv2s-sec1"', 'Add your product photo (or link)', 'data-kineo="ads-nota9-text"', 'What should they say?', 'data-kineo="ads-nota9-cost"', '15-second ad · 41 credits · you have 1,000 → 959 left', 'data-kineo="ads-nota9-generate"', 'data-kineo="ads-nota9-advanced"', 'id="adv2s-sec2"', 'data-kineo="ads-quadro-level"', 'id="adv2s-sec4"')) p.push('ugc: ordem quem → produto → frase → custo → Gerar → Avançado → o resto')
  if ((ugc.match(/data-kineo="ads-nota9-face"/g) || []).length !== 7) p.push('ugc: 6 rostos + Me surpreenda')
  if (/data-id="(clara|hannah|chloe|marcus|lucia|yasmin)"/.test(ugc)) p.push('ugc: rosto em teste à vista')
  if (/data-kineo="ads-flow-tabs"/.test(ugc) || /prefer to fill in everything myself/i.test(ugc.split('data-kineo="ads-nota9-advanced"')[0])) p.push('ugc: abas/atalho no topo')
  if (!/data-slim="true"/.test(ugc) || !/kit-bf-cta" href="\/api\/[^"]*pack=kit_bf[^"]*surface=ads"/.test(ugc) && !/data-kineo="kit-bf-cta" href="[^"]*kit_bf[^"]*"/.test(ugc)) p.push('ugc: Kit BF em uma linha com o link de compra')
  if (/<ul>/.test(ugc.split('data-kineo="kit-bf-buy"')[1]?.split('</section>')[0] ?? '<ul>')) p.push('ugc: Kit BF com a lista grande')
  const visivel = ugc.split('data-kineo="ads-nota9-advanced"')[0]
  if ((visivel.match(/credits/gi) || []).length !== 1) p.push('ugc: mais de uma menção a créditos fora do Avançado')
  const prod = tela({ entry: 'product', over })
  if (!prod.includes('data-nota9="product"') || /data-kineo="ads-nota9-who"/.test(prod) || !prod.includes('<h1>AI Product Ads</h1>')) p.push('produto: foco sem rostos')
  if (!ordem(prod, 'id="adv2s-sec1"', 'Add your product photo or link', 'What are you selling?', '15-second ad · 41 credits', 'data-kineo="ads-nota9-generate"', 'data-kineo="ads-nota9-advanced"')) p.push('produto: ordem')
  const amostra = tela({ entry: 'ugc', sample: true, balance: 0, over })
  if (!amostra.includes('Your first ad is free (watermark)') || /You need/.test(amostra.split('data-kineo="ads-nota9-cost"')[1]?.slice(0, 200) ?? '')) p.push('amostra: grátis com marca-d\'água')
  const curto = tela({ entry: 'product', balance: 0, over })
  if (!/You need \d+ credits, you have 0/.test(curto) || !curto.includes('data-kineo="ads-nota9-plans"')) p.push('curto: precisa/tem + 1 botão de planos')
  const sempre = tela({ entry: null, over })
  if (/data-nota9|data-kineo="ads-nota9-|data-slim/.test(sempre) || !/data-kineo="ads-flow-tabs"/.test(sempre) || !/<h1>Studio Ads<\/h1>/.test(sempre)) p.push('sem entrada: a tela de sempre')
  return p
}
const tProb = tenta(() => telaProblemas())
ok(tProb.length === 0, `T1 UGC: quem apresenta (6 aprovados) → produto → frase → custo → Gerar → Avançado recolhido; produto: foto/link → frase → custo; amostra grátis; saldo curto com 1 botão; sem entrada = a de sempre (${tProb.join('; ') || 'ok'})`)

// ═══ P. os palcos ══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nP. palcos e rostos')
function palcoProblemas(compOver) {
  const p = []
  const load = carregador(compOver ? { [F.comp]: compOver } : {})
  const N = load(F.comp), L = load(F.lib), P = load('lib/ads/v2Presenter.ts')
  const copy = L.adsNota9Copy('en')
  const house = { src: '/previews/home-card-ugc-presenter.mp4', poster: '/posters/home-card-ugc-presenter.webp' }
  const photo = { srcUrl: 'blob:produto', position: '50% 50%' }
  const st = (d) => renderToStaticMarkup(React.createElement(N.AdsNota9StageView, { data: { focus: 'ugc', tint: ['#000', '#111'], presenter: null, houseClip: house, photo: null, productName: 'LUME', voice: 'English', ...d }, copy }))
  const sofia = st({ presenter: P.adsV2PresenterById('sofia'), photo })
  if (!sofia.includes('src="/ads/presenters/sofia.mp4"') || !sofia.includes('src="blob:produto"') || !/Sofia/.test(sofia)) p.push('UGC: vídeo da Sofia + foto do produto')
  const kenji = st({ presenter: P.adsV2PresenterById('kenji') })
  if (!kenji.includes('src="/ads/presenters/kenji.webp"') || kenji.includes('.mp4')) p.push('UGC sem vídeo: o retrato')
  const surpresa = st({})
  if (!surpresa.includes(house.src) || !surpresa.includes(copy.surprise)) p.push('Me surpreenda: o anúncio real da casa')
  const prod = st({ focus: 'product', photo })
  if (!prod.includes('src="blob:produto"') || prod.includes('presenters/')) p.push('produto: a foto da pessoa')
  for (const [n, h] of [['sofia', sofia], ['kenji', kenji], ['surpresa', surpresa], ['produto', prod]]) if (/credit|crédit/i.test(h)) p.push(`palco ${n} fala de crédito`)
  const faces = renderToStaticMarkup(React.createElement(N.AdsNota9Faces, { value: 'amara', onChange: () => {}, copy }))
  const ids = [...faces.matchAll(/data-id="([a-z]+)"/g)].map((m) => m[1])
  if (ids.join() !== [...FACES, 'auto'].join()) p.push(`rostos: ${ids.join()}`)
  if (!/data-on="true" data-kineo="ads-nota9-face" data-id="amara"/.test(faces) || (faces.match(/data-on="true"/g) || []).length !== 1) p.push('rostos: só o escolhido marcado')
  if ((faces.match(/class="ai">AI</g) || []).length !== 6) p.push('rostos: selo AI em todo rosto')
  return p
}
const pProb = tenta(() => palcoProblemas(null))
ok(pProb.length === 0, `P1 palco UGC = apresentador escolhido (vídeo/retrato) + foto do produto; Me surpreenda = anúncio real da casa; produto = a foto; nenhum palco fala de crédito; rostos aprovados com selo AI (${pProb.join('; ') || 'ok'})`)

// ═══ S. só tela ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nS. só tela: o pedido e o servidor não mudam')
function soTelaProblemas(simple, comp, kit) {
  const p = []
  const marcadas = simple.split('\n').filter((l) => l.includes(MARCA))
  if (marcadas.some((l) => /\/api\/|api<|await api\(|fetch\(|makeAd\(|planAd\(/.test(l))) p.push('linha marcada chama rota / makeAd / planAd direto')
  const goF = simple.slice(simple.indexOf('function goFocus() {'), simple.indexOf('function goFocus() {') + 400)
  if (!/if \(planFresh \|\| missing\.length === 0\) \{ goFromBar\(\); return \}/.test(goF)) p.push('Gerar da tela foco não é o goFromBar de sempre')
  if (!/onClick=\{goFocus\} data-kineo="ads-nota9-generate"/.test(simple)) p.push('botão Gerar foco')
  if (!/const n9Cost = adsNota9Cost\(\{ copy: n9, lang, seconds: ADS_V2_SCREEN_SECONDS, credits: shownCost, balance, sample: !!scopy, count: n9Count \}\)/.test(simple)) p.push('custo não é o shownCost/saldo/amostra de sempre')
  if (!/const \[advOpen, setAdvOpen\] = useState\(false\)/.test(simple)) p.push('Avançado não começa recolhido')
  if (!/<AdsNota9Faces value=\{presenterPick\} onChange=\{setPresenterPick\}/.test(simple)) p.push('rostos fora do presenterPick')
  if (!/value=\{text\} disabled=\{busy === 'start'\} onChange=\{\(e\) => setText\(e\.target\.value\)\}/.test(simple.slice(simple.indexOf('data-kineo="ads-nota9-text"')))) p.push('frase fora do estado de sempre')
  const quem = simple.indexOf('data-kineo="ads-nota9-who"')
  if (!/\{focus === 'ugc' \? \(/.test(simple.slice(Math.max(0, quem - 400), quem))) p.push('rostos fora do foco UGC')
  if (!/const focus = adsNota9Focus\(entry\)/.test(simple)) p.push('foco não vem da entrada')
  const caixa = simple.split('\n').find((l) => l.includes('<textarea ref={n9TextRef}')) ?? ''
  if (!caixa || /maxLength/.test(caixa) || !/data-kineo="ads-nota9-count">\{text\.length > ADS_V2_SCREEN_SENTENCE_MAX \? adsNota9Fill\(n9\.tooLong/.test(simple)) p.push('caixa da frase corta em silêncio / sem contador')
  if (!/if \(planFresh && n9Tiny && tinyOk !== n9Tiny\.key\) \{/.test(goF) || goF.indexOf('n9Tiny') > goF.indexOf('goFromBar()')) p.push('foto pequena não pede confirmação antes do Gerar')
  // os padrões do pedido: as linhas de estado de sempre estão intactas (nenhuma marcada)
  for (const linha of ['const [tier, setTier] = useState<AdsV2Tier | null>(', 'const [adFormatChoice, setAdFormatChoice] = useState<AdsV2AdFormat>(', 'const [presenterPick, setPresenterPick] = useState<string | null>(null)', 'const [kitCount, setKitCount] = useState<AdsV2KitBfCount>(1)', "const [kitOffer, setKitOffer] = useState('')", 'const [styleChoice, setStyleChoice] = useState<AdsV2StyleChoice | null>(', 'const [narrationOn, setNarrationOn] = useState(true)', 'const [formatChoice, setFormatChoice] = useState<AdsV2Format>(\'9:16\')', 'const baseSig = JSON.stringify(']) {
    const l = simple.split('\n').find((x) => x.includes(linha))
    if (!l || l.includes(MARCA)) p.push(`padrão mexido: ${linha.slice(0, 40)}`)
  }
  // o Avançado recolhe por CSS (nada muda de lugar): as regras existem e só valem com data-nota9 / data-adv
  if (!/\.adv2-layout\[data-adv=closed\] :is\(#adv2s-sec2,#adv2s-sec3,\[data-kineo="ads-quadro-level"\],\[data-kineo="ads-quadro-voice"\],\[data-kineo="ads-pronounce-ask"\],#adv2q-styles-all,\.adv2s-more,#adv2s-sec4\)\{display:none!important\}/.test(comp)) p.push('CSS do Avançado recolhido')
  if (!/\.adv2-layout\[data-nota9\] \[data-kineo="ads-quadro-go"\],\.adv2-layout\[data-nota9\] \.adv2s-bar,\.adv2-layout\[data-nota9\] \.adv2-aside/.test(comp)) p.push('CSS: Gerar antigo/barra/aside só na tela foco')
  if (/(^|\n)\.adv2 (?!.*data-nota9)[^\n{]*\{display:none/.test(comp.split('ADS_NOTA9_CSS = `')[1]?.split('`')[0] ?? '')) p.push('CSS esconde algo fora da tela foco')
  if (!/\{focus \? <style dangerouslySetInnerHTML=\{\{ __html: ADS_NOTA9_CSS \}\} \/> : null\}/.test(simple)) p.push('CSS da tela foco só com foco')
  if (/fetch\(|\/api\//.test(comp)) p.push('componente chama rota')
  if (!/import \{ ADS_V2_PRESENTER_V2_APPROVED, adsV2PresenterV2SampleFor \} from '@\/lib\/ads\/v2PresenterV2'/.test(comp) || !/adsNota9Faces\(ADS_V2_PRESENTER_LIBRARY, ADS_V2_PRESENTER_V2_APPROVED\)/.test(comp)) p.push('rostos não vêm da lista aprovada')
  // Kit BF: a mesma decisão do servidor ANTES da faixa; o mesmo link
  const kf = kit.slice(kit.indexOf('export function KitBfBuyCard('))
  if (!(kf.indexOf("if (!o || o.kit.state === 'closed') return null") > 0 && kf.indexOf("if (!o || o.kit.state === 'closed') return null") < kf.indexOf('if (slim) return ('))) p.push('Kit BF: faixa antes da decisão do servidor')
  if ((kf.match(/href=\{`\$\{KIT_BF_CHECKOUT_HREF\}&surface=\$\{surface\}`\}/g) || []).length !== 2) p.push('Kit BF: link de compra diferente')
  return p
}
const sProb = tenta(() => soTelaProblemas(rd(F.simple), rd(F.comp), rd(F.kit)))
ok(sProb.length === 0, `S1 Gerar = goFromBar de sempre; custo = shownCost/saldo/amostra; Avançado recolhido por CSS; padrões do pedido intactos; rostos = aprovados; Kit BF com a decisão do servidor e o mesmo link (${sProb.join('; ') || 'ok'})`)
{
  const tocados = daEntrega()
  const proibidos = [...tocados].filter((f) => /^app\/api\//.test(f) || /^lib\/(engineWall|homeVideoCuration)\.ts$/.test(f) || /^app\/\(dashboard\)\/generate\//.test(f) || /^(components|lib)\/kidsCartoon\//.test(f) || /^lib\/ads\/(serverAccess|v2Tiers|sample|sampleEntry|v2KitBf|kitBfSale|v2CloseReal|v2Presenter|v2PresenterV2|v2PresenterHolds|v2Screen|v2Simple)\.ts$/.test(f) || f === 'app/(dashboard)/ads/v2/page.tsx')
  ok(proibidos.length === 0, `S2 servidor, preços, amostra, apresentador, Kit BF, curadoria, /generate e kids intocados (${proibidos.join(', ') || 'ok'})`)
}

// ═══ D. desfaz, diff, encadeamento ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, diff, encadeamento')
{
  const difs = []
  for (const f of ADS_NOTA9_2110_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    try { if (lf(semAdsNota92110(readFileSync(join(ROOT, f), 'utf8'), f)) !== b) difs.push(f) } catch (e) { difs.push(`${f}: ${e.message}`) }
  }
  const novos = ADS_NOTA9_2110_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null)
  ok(difs.length === 0 && novos, `D1 ${ADS_NOTA9_2110_ARQUIVOS.length} arquivos tocados, desfeitos, = base ${B}; ${ADS_NOTA9_2110_NOVOS.length} novos existem e não existiam (${difs.join('; ') || 'ok'})`)
  const tocados = daEntrega()
  const permitidos = new Set([...ADS_NOTA9_2110_ARQUIVOS, ...ADS_NOTA9_2110_NOVOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = ADS_NOTA9_2110_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\n')); return !rd(f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) })
  const trocasOk = Object.entries(TROCAS_ADS_NOTA9_2110).filter(([f]) => f !== '__acrescimos').every(([f, t]) => ADS_NOTA9_2110_ARQUIVOS.includes(f) && t.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && trocasOk && !/KINEO-HOME-CARDS-CLAROS|KINEO-BEBE|KINEO-MENU-UGC|KINEO-DESENHO-NOTA9/.test(MARCA),
    `D2 o diff só toca a lista e os novos; toda linha nova com a marca; trocas de linha inteira (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`)].join('; ') || 'ok'})`)
  const cadeia = /export function semDesenhoNota9_2110\(texto, p\) \{\n  texto = semAdsNota92110\(texto, p\)/.test(rd(F.claros))
  const igual = ADS_NOTA9_2110_ARQUIVOS.every((f) => { const raw = readFileSync(join(ROOT, f), 'utf8'), semEste = semAdsNota92110(raw, f); return semDesenhoNota9_2110(raw, f) === semDesenhoNota9_2110(semEste, f) && semHomeCardsClaros2010(raw, f) === semHomeCardsClaros2010(semEste, f) && semBebeQueFala2010(raw, f) === semBebeQueFala2010(semEste, f) && semMenuUgc2010(raw, f) === semMenuUgc2010(semEste, f) })
  const idem = semAdsNota92110('qualquer coisa', F.simple) === 'qualquer coisa' && semAdsNota92110(`x ${MARCA}`, 'outro/arquivo.ts') === `x ${MARCA}` && semAdsNota92110(null, F.simple) === null
  let lanca = false
  try { semAdsNota92110(rd(F.simple) + `\n// mais uma ${MARCA}`, F.simple) } catch { lanca = true }
  ok(cadeia && igual && idem && lanca, 'D3 encadeamento: semDesenhoNota9_2110 (e semHomeCardsClaros2010, as cabeças semBebeQueFala2010 / semMenuUgc2010) tiram esta camada PRIMEIRO; idempotente fora da lista / sem a marca / null; acréscimo a mais lança')
}

// ═══ M. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (aplicados e vermelhos)')
const muta = (s, a, b) => { if (!s.includes(a)) throw Error('mutante não aplicou: ' + a.slice(0, 60)); const r = s.split(a).join(b); if (r === s) throw Error('mutante sem efeito'); return r }
const vermelho = (fn) => { const r = tenta(fn); return Array.isArray(r) && r.length > 0 }
{
  const S = rd(F.simple), C = rd(F.comp), K = rd(F.kit), Lsrc = rd(F.lib)
  ok(vermelho(() => libProblemas(libDe({ [F.lib]: muta(Lsrc, "return entry === 'ugc' || entry === 'product' ? entry : null", "return typeof entry === 'string' && entry ? (entry as AdsNota9Focus) : null") }))), 'M1 foco aceita qualquer entrada → L1 vermelho')
  ok(vermelho(() => libProblemas(libDe({ [F.lib]: muta(Lsrc, "return { kind: 'short', text: adsNota9Fill(copy.short, { c, n }), plans: true }", "return { kind: 'short', text: adsNota9Fill(copy.short, { c, n }), plans: false }") }))), 'M2 saldo curto sem o botão de planos → L1 vermelho')
  ok(vermelho(() => libProblemas(libDe({ [F.lib]: muta(Lsrc, "if (i.balance === null || !Number.isFinite(i.balance)) return", "if (false) return") }))), 'M3 saldo desconhecido vira número → L1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, 'credits: shownCost, balance', 'credits: cost, balance'), C, K)), 'M4 custo pelo preço de UM anúncio (ignora kit/variações) → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, 'const [advOpen, setAdvOpen] = useState(false)', 'const [advOpen, setAdvOpen] = useState(true)'), C, K)), 'M5 Avançado começa aberto → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, 'if (planFresh || missing.length === 0) { goFromBar(); return }', 'if (planFresh || missing.length === 0) { void makeAd(); return }'), C, K)), 'M6 Gerar foco chama o débito direto (fora do botão de sempre) → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, "{focus === 'ugc' ? (/* KINEO-ADS-NOTA9-2110 — o 1º passo do UGC", "{focus ? (/* KINEO-ADS-NOTA9-2110 — o 1º passo do UGC"), C, K)), 'M7 rostos também no produto → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(S, C, muta(K, "  if (!o || o.kit.state === 'closed') return null\n  const t = kitBfCardText(lang, o.kit.daysLeft)\n  const included = o.kit.state === 'included'\n  if (slim)", "  const t = kitBfCardText(lang, o?.kit.daysLeft ?? 0)\n  const included = o?.kit.state === 'included'\n  if (slim)"))), 'M8 faixa do Kit BF antes da decisão do servidor → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(S, muta(C, "adsNota9Faces(ADS_V2_PRESENTER_LIBRARY, ADS_V2_PRESENTER_V2_APPROVED)", "adsNota9Faces(ADS_V2_PRESENTER_LIBRARY, ADS_V2_PRESENTER_LIBRARY.map((p) => p.id))"), K)), 'M9 rostos fora da lista aprovada → S1 vermelho')
  ok(vermelho(() => telaProblemas({ [F.simple]: muta(S, "data-adv={focus ? (advOpen ? 'open' : 'closed') : undefined}", 'data-adv={undefined}') })), 'M10 sem o recolhimento do Avançado → T1 vermelho')
  ok(vermelho(() => telaProblemas({ [F.client]: muta(rd(F.client), "{mode && !n9Head ? <AdsFlowTabs", '{mode ? <AdsFlowTabs') })), 'M11 abas de volta no topo da tela foco → T1 vermelho')
  ok(vermelho(() => palcoProblemas(muta(C, '<span>⏱ {copy.delivery}</span>', '<span>⏱ {copy.delivery}</span><span>41 credits</span>'))), 'M12 palco fala de crédito (2ª linha de custo) → P1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, "const n9Count = kitN > 1", "const n9Count = (await api('/api/ads/v2/plan'), kitN) > 1"), C, K)), 'M13 linha marcada chamando rota → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, 'aria-describedby="adv2n-count" rows={2} value={text}', 'aria-describedby="adv2n-count" rows={2} maxLength={ADS_V2_SCREEN_SENTENCE_MAX} value={text}'), C, K)), 'M16 a caixa da frase volta a cortar em silêncio (maxLength) → S1 vermelho')
  ok(vermelho(() => soTelaProblemas(muta(S, '    if (planFresh && n9Tiny && tinyOk !== n9Tiny.key) {', '    if (false && n9Tiny && tinyOk !== n9Tiny.key) {'), C, K)), 'M17 foto pequena sem a confirmação antes do Gerar → S1 vermelho')
  ok(vermelho(() => libProblemas(libDe({ [F.lib]: muta(Lsrc, 'if (s > 0 && s < min) return p', 'if (s > 0 && s < 200) return p') }))), 'M18 miniatura 225×225 passa sem aviso → L1 vermelho')
  ok(vermelho(() => libProblemas(libDe({ [F.lib]: muta(Lsrc, "optional: 'optional with a link · we write the script',", "optional: 'optional with a link — we write the script',") }))), 'M19 travessão de volta num rótulo → L1 vermelho')
  let lancou = false
  try { const t = rd(F.client).split('\n').map((l) => (l.includes('<h1>{n9Head ? n9Head.title : shell.title}</h1>') ? l.replace('<h1>', '<h1 data-x="1">') : l)).join('\n'); semAdsNota92110(t, F.client) } catch { lancou = true }
  ok(lancou, 'M14 troca reescrita à mão (conserto pela metade) → o desfaz lança → D1 vermelho')
  const semCadeia = rd(F.claros).replace('  texto = semAdsNota92110(texto, p) // KINEO-ADS-NOTA9-2110 — a camada mais nova sai primeiro\n', '')
  ok(semCadeia !== rd(F.claros) && !/export function semDesenhoNota9_2110\(texto, p\) \{\n  texto = semAdsNota92110\(texto, p\)/.test(semCadeia), 'M15 semDesenhoNota9_2110 sem chamar esta camada → D3 vermelho')
}

console.log(`\n${falhas === 0 ? 'VERDE' : 'VERMELHO'} — ${oks} ok, ${falhas} falha(s)`)
process.exit(falhas === 0 ? 0 : 1)
