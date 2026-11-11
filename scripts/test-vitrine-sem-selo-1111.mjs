// KINEO-VITRINE-SEM-SELO-1111 [CEO 11/11, ronda de estabilização: "/images e /spaces: o selo 'MADE WITH NANO BANANA PRO' sai da vitrine"]
// Regra do dono: nenhum nome de motor em cartão ou botão. O palco compartilhado (components/ProductStage.tsx) ganha `semSelo`;
// Images e Spaces o usam; Anúncios (v2 e Produção) ficam como estavam. Offline: renderiza o componente real.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const STAGE = 'components/ProductStage.tsx'
const IMAGES = 'app/(dashboard)/images/ImagesClient.tsx'
const SPACES = 'app/(dashboard)/spaces/SpacesClient.tsx'
const ADS = ['app/(dashboard)/ads/v2/AdsV2Client.tsx', 'app/(dashboard)/ads/producao/ProducaoClient.tsx']
const ENGINE = /\b(nano banana|kling|seedance|veo|minimax|h3|flux|seedream|recraft|grok)\b/i
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const src = (o, p) => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function render(o, props) {
  const stubs = { '@/components/InterfaceLanguage': { UiLabel: ({ children }) => React.createElement(React.Fragment, null, children) } }
  const { ProductStage } = loader(stubs, o)(STAGE.replace(/\.tsx$/, ''))
  return renderToStaticMarkup(React.createElement(ProductStage, props))
}

function all(o = {}) {
  const video = [{ title: 'Perfume campaign shot', badge: 'Nano Banana Pro', video: '/previews/promo-images-1.mp4', poster: '/posters/promo-images-1.webp' }]
  const pair = [{ title: 'Empty floor → coffee shop', badge: 'Nano Banana Pro', before: '/a.webp', after: '/b.webp', poster: '/b.webp' }]
  for (const [nome, items] of [['vídeo (Images)', video], ['antes→depois (Spaces)', pair]]) {
    const sem = render(o, { name: 'Made on Kineo', items, semSelo: true })
    ok(!/Made with/i.test(text(sem)) && !ENGINE.test(text(sem)) && !sem.includes('kps-badge'), `${nome}: com semSelo, nenhum "Made with <motor>" na peça`)
    ok(sem.includes('kps-frame') && (sem.includes('<video') || sem.includes('<img')), `${nome}: a peça continua no palco`)
    const com = render(o, { name: 'Ads', items })
    ok(text(com).includes('Made with Nano Banana Pro'), `${nome}: sem semSelo (Anúncios), o selo de antes continua`)
  }
  // Os dois usos: a vitrine do /images e o palco do /spaces (vitrine da casa E resultado da pessoa) passam semSelo.
  const img = src(o, IMAGES).split('\n').filter(l => l.includes('<ProductStage '))
  ok(img.length === 1 && /items=\{HOUSE_IMAGES\}[^>]*\bsemSelo\b/.test(img[0]), '/images: a vitrine usa semSelo')
  const spa = src(o, SPACES).split('\n').filter(l => l.includes('<ProductStage '))
  ok(spa.length === 1 && /items=\{stageItems\.length \? stageItems : HOUSE_SPACES\}[^>]*\bsemSelo\b/.test(spa[0]), '/spaces: o palco (casa e resultado) usa semSelo')
  for (const p of ADS) ok(src(o, p).split('\n').filter(l => /<ProductStage\b/.test(l)).every(l => !/\bsemSelo\b/.test(l)), `${p}: Anúncios fora deste conserto`)
  // O dado segue honesto: cada peça da casa ainda diz o motor real (para quando o selo for pedido de volta).
  ok((src(o, IMAGES).match(/badge: 'Nano Banana Pro'/g) || []).length === 3 && (src(o, SPACES).match(/badge: 'Nano Banana Pro'/g) || []).length >= 3, 'o badge continua no dado')
}

all()
const real = passed

const s = p => read(p)
const mutants = [
  ['palco ignora semSelo', { [STAGE]: s(STAGE).replace('{semSelo ? null : <span className="kps-badge">', '{false ? null : <span className="kps-badge">') }],
  ['palco esconde o selo de todos (Anúncios também)', { [STAGE]: s(STAGE).replace('semSelo = false }', 'semSelo = true }') }],
  ['/images sem semSelo', { [IMAGES]: s(IMAGES).replace('items={HOUSE_IMAGES} wide semSelo />', 'items={HOUSE_IMAGES} wide />') }],
  ['/spaces sem semSelo', { [SPACES]: s(SPACES).replace("after: t('after') }} semSelo />", "after: t('after') }} />") }],
  ['peça some junto com o selo', { [STAGE]: s(STAGE).replace('{v && (\r\n          <div className="kps-frame">', '{v && !semSelo && (\r\n          <div className="kps-frame">').replace('{v && (\n          <div className="kps-frame">', '{v && !semSelo && (\n          <div className="kps-frame">') }],
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
console.log(`test-vitrine-sem-selo-1111: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
