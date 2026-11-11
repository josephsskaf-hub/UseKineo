// KINEO-COMPRA-SEM-SEEDANCE-1111 [CEO 11/11, ronda do caminho de compra: "conserte só o que for fato errado sem decisão (preço/crédito/
// motor que não existe mais)"]. A fal tirou o Seedance 1.5 em 11/11 (ead4a920a): todo envio novo vai ao MiniMax H3 Turbo, inclusive a
// reserva do filme grátis. O /pricing, o /free-ai-shorts-generator e a home ainda vendiam "Seedance 1.5". Offline: carrega os módulos reais.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const ENGINE = 'lib/freeFilmEngine.ts'
const CLAIM = 'lib/cinematic/claim.ts'
const PRICING = 'app/pricing/PricingClient.tsx'
const BRIDGE = 'components/ScriptToSeedanceBridge.tsx'
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const src = (o, p) => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')
const stubs = {
  'next/link': { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) },
  '@/lib/analytics': { trackEvent: async () => true },
}

function all(o = {}) {
  const load = loader(stubs, o)
  // 1) O nome do motor do filme grátis segue o modelo que a reserva usa de verdade.
  const fallbackModel = load('lib/kling4TrialFallback').KLING4_TRIAL_FALLBACK_MODEL
  const { FREE_FILM_ENGINE_NAME, FREE_FILM_IS_KLING4 } = load('lib/freeFilmEngine')
  ok(typeof fallbackModel === 'string' && fallbackModel.length > 0, 'modelo da reserva do grátis lido')
  if (/seedance\/v1\.5/.test(fallbackModel)) ok(FREE_FILM_ENGINE_NAME.includes('Seedance 1.5'), 'reserva no Seedance 1.5 → o nome diz Seedance 1.5')
  else ok(/h3-max-turbo/.test(fallbackModel) && FREE_FILM_ENGINE_NAME.includes('MiniMax H3 Turbo') && !/Seedance/.test(FREE_FILM_ENGINE_NAME), `reserva no H3 Turbo (${fallbackModel}) → o nome diz MiniMax H3 Turbo, nunca Seedance`)
  ok(FREE_FILM_ENGINE_NAME === (FREE_FILM_IS_KLING4 ? 'Kling 4.0 / MiniMax H3 Turbo' : 'MiniMax H3 Turbo'), 'nome curto do grátis com e sem o Kling 4')
  const { FREE_FILM_LABEL } = load('lib/freeTierOffer')
  ok(!/Seedance/.test(FREE_FILM_LABEL) && FREE_FILM_LABEL.includes(FREE_FILM_ENGINE_NAME), `rótulo do grátis (${FREE_FILM_LABEL}) sem Seedance`)
  // 2) /pricing, FAQ: créditos em "standard film" (como os cartões), sem o Fast (fora da oferta) e sem top-up quando não há top-up à venda.
  const p = src(o, PRICING)
  ok(!p.includes("'Seedance film')") && (p.match(/'standard film'\)/g) || []).length === 3, 'FAQ dos créditos: ≈N standard films nos 3 planos')
  ok(!p.includes('Fast Mode uses smart stock footage'), 'FAQ: sem o Fast Mode (Kineo 1 fora da oferta)')
  ok(p.includes("${TOPUPS_LIVE ? '; you can add extra credits when needed' : ''}") && !p.includes('the full cost; you can add extra credits when needed.'), 'FAQ: "add extra credits" só com top-up à venda')
  ok(load('lib/checkoutPricing').TOPUPS_LIVE === false, 'hoje não há top-up à venda (a frase não aparece)')
  // 3) A ponte do roteiro (/free-ai-shorts-generator e páginas de motor), nas duas formas, vende o motor real e conta certo.
  const Bridge = load(BRIDGE.replace(/\.tsx$/, '')).default
  const proof = { id: 'castle', title: 'The castle hiding inside a university building', src: '/x.mp4', poster: '/x.webp' }
  for (const [nome, props] of [['com prévia', { from: 't', compact: true, proof }], ['sem prévia', { from: 't' }]]) {
    const html = renderToStaticMarkup(React.createElement(Bridge, props))
    const visivel = text(html).replace(/Existing Seedance preview/g, '')
    ok(!/Seedance 1\.5|Render my script on Seedance|See Seedance films/i.test(visivel), `ponte ${nome}: não vende Seedance 1.5`)
    ok(/MiniMax H3 Turbo/i.test(visivel), `ponte ${nome}: nomeia o MiniMax H3 Turbo`)
    ok(!/\b1 films\b/.test(visivel), `ponte ${nome}: "1 film", nunca "1 films"`)
    ok(html.includes('aria-label="Render your script on MiniMax H3 Turbo"'), `ponte ${nome}: rótulo de acessibilidade com o motor real`)
  }
  ok(text(renderToStaticMarkup(React.createElement(Bridge, { from: 't', proof }))).includes('Existing Seedance preview · ' + proof.title), 'a prévia antiga segue dizendo que é do Seedance (selo honesto)')
}

all()
const real = passed

const s = p => read(p)
const mutants = [
  ['nome do grátis volta ao Seedance 1.5', { [ENGINE]: s(ENGINE).replace("'Kling 4.0 / MiniMax H3 Turbo' : 'MiniMax H3 Turbo'", "'Kling 4.0 / Seedance 1.5' : 'Seedance 1.5'") }],
  ['reserva volta ao Seedance e o nome não acompanha', { [CLAIM]: s(CLAIM).replace("export const RESERVA_SEEDANCE_MODEL = 'minimax/h3-max-turbo/text-to-video'", "export const RESERVA_SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'") }],
  ['FAQ volta a contar em Seedance', { [PRICING]: s(PRICING).replace("videosPerMonth('starter', 'cinematic_ai'), 'standard film')", "videosPerMonth('starter', 'cinematic_ai'), 'Seedance film')") }],
  ['FAQ promete top-up sem top-up', { [PRICING]: s(PRICING).replace("${TOPUPS_LIVE ? '; you can add extra credits when needed' : ''}", '; you can add extra credits when needed') }],
  ['ponte volta a vender Seedance 1.5', { [BRIDGE]: s(BRIDGE).replace('>GENERATED SCENES · MINIMAX H3 TURBO</p>', '>GENERATED SCENES · SEEDANCE 1.5</p>') }],
  ['ponte volta a dizer "1 films"', { [BRIDGE]: s(BRIDGE).replace("The plan covers {films} {films === 1 ? 'film' : 'films'} of", 'The plan covers {films} films of') }],
  ['botão da ponte volta ao Seedance', { [BRIDGE]: s(BRIDGE).replace('Render my script on MiniMax H3 Turbo →', 'Render my script on Seedance →') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === s(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-compra-sem-seedance-1111: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
