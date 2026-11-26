import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { aba, React } = require('../docs/studio-na-moldura-1011/runtime.cjs')
const first = { credits: 25, hasPaid: false, entitlementsResolved: true, filmsDelivered: 0, trial: { phase: 'active', creditsGranted: 25, creditsUsedForDisplay: 0, msLeft: 86400000 } }
const text = '  Hélène & Rui\n  What did you hear?  '
const gen = p => p['data-testid'] === 'studio-simple-generate'
const field = p => p.id === 'cx-ideia'
async function mount({ visitor, country, credits, query = {}, saved = [], showFilmStyle = false }) {
  const tab = aba({}, { credits })
  global.window.location = { search: '?utm_source=travel&utm_source_platform=social&utm_id=campaign-7' }
  for (const [k, v] of saved) tab.log.storage.set(k, v)
  const entry = tab.m('lib/create/publicEditor').filmEntry(query, visitor, country)
  const component = tab.m('components/create/StudioNaMoldura').default
  tab.mount(React.createElement(component, { entry, showFilmStyle, initialFilmLook: showFilmStyle ? entry.look : undefined, motor: 'seedance', campanha: 'travel', caixaNova: true, ideiaInicial: entry.text }))
  await tab.settle()
  return tab
}
const shared = new Map()
global.localStorage = { setItem: (k,v) => shared.set(k,v), getItem: key => shared.get(key) ?? null, removeItem: key => shared.delete(key) }
const guest = await mount({ visitor: true, country: true })
assert.match(guest.html(), /First film free/)
assert.equal(guest.log.fetches.some(([path]) => path === '/api/credits'), false)
guest.type(field, text, 'ideia inteira')
guest.click((p, tag) => tag === 'button' && p.children === 'Characters talk', 'dialogue')
guest.click(gen, 'cadastro no Generate')
assert.equal(guest.log.pushes.length, 1)
const signup = new URL(guest.log.pushes[0], 'https://example.invalid')
assert.equal(signup.pathname, '/signup')
const back = new URL(signup.searchParams.get('redirect'), signup)
assert.equal(back.pathname, '/create/film')
assert.equal(back.searchParams.get('utm_source'), 'travel')
assert.equal(back.searchParams.get('utm_source_platform'), 'social')
assert.equal(back.searchParams.get('utm_id'), 'campaign-7')
assert.ok(!back.searchParams.has('prompt') && !back.searchParams.has('ideia'))
assert.ok(!guest.log.storage.has('kineo:studio:go:v1'))
const transfer = [...shared]
for (const [credits, free] of [[first, true], [{ ...first, filmsDelivered: 1 }, false], [null, false]]) {
  for (const [key, value] of transfer) shared.set(key,value)
  const account = await mount({ visitor: false, country: true, credits, query: Object.fromEntries(back.searchParams), saved: [] })
  assert.equal(shared.size, 0, 'transferência entre abas consumida pela conta')
  assert.equal(account.one(field, 'restaurado').props.value, text)
  assert.equal(account.html().includes('First film free'), free)
  assert.ok(account.html().includes('Dialogue set to 15 s'))
  assert.deepEqual(account.log.pushes, [])
  assert.ok(!account.log.storage.has('kineo:studio:go:v1'))
  account.click(gen, 'Generate após conferência')
  await account.settle()
  const post = new URL(account.log.pushes[0], signup)
  assert.equal(post.searchParams.get('duration'), '15')
  assert.equal(post.searchParams.get('language'), 'en')
  assert.equal(post.searchParams.get('voice_mode'), 'characters')
}
const expiredGrant = await mount({ visitor: false, country: true, credits: first })
expiredGrant.type(field, text, 'ideia antes da perda da oferta')
global.fetch = async () => ({ok:true, json:async()=>({...first, filmsDelivered:1})})
expiredGrant.click(gen, 'gratuidade perdida entre a abertura e o clique')
await expiredGrant.settle()
assert.deepEqual(expiredGrant.log.pushes, [])
assert.ok(!expiredGrant.log.storage.has('kineo:studio:go:v1'))
assert.match(expiredGrant.html(), /no longer available/)
assert.doesNotMatch(expiredGrant.html(), /First film free/)
for (const visitor of [true,false]) {
  const seeded = await mount({ visitor, credits:first, country:true, query:{ideia:text,utm_source_platform:'social'} })
  assert.match(seeded.html(), /First film free/)
  assert.equal(seeded.one(field, 'ideia inicial').props.value, text)
}
const nonFree = await mount({ visitor: true, country: false })
assert.ok(!nonFree.html().includes('First film free'))
assert.match(nonFree.html(), /class="cx-custo"/)
const script = await mount({ visitor: false, country: true, credits: first, query: { prompt: text, duration: '45', script_mode: 'verbatim', language: 'pt' } })
assert.equal(script.one(field, 'roteiro literal').props.value, text)
assert.match(script.html(), /Requested 45 s/)
assert.deepEqual(script.log.pushes, [])
const styleGuest = await mount({ visitor: true, country: true, query: { look: 'anime', ideia: text } })
styleGuest.click(gen, 'guardar estilo pedido')
const styleRedirect = new URL(new URL(styleGuest.log.pushes[0],signup).searchParams.get('redirect'),signup)
const styleAccount = await mount({ visitor: false, country: true, credits:first, query:Object.fromEntries(styleRedirect.searchParams), showFilmStyle:true })
styleAccount.click(gen, 'estilo na conta com acesso')
assert.equal(new URL(styleAccount.log.pushes[0],signup).searchParams.get('look'), 'anime')
console.log('Film: visitante, CTA por país, conta elegível, conta já usada, consulta indisponível, cadastro, texto e voz restaurados, segundo clique, roteiro literal e duração explícita.')
