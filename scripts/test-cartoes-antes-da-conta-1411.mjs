// KINEO-CARTOES-ANTES-DA-CONTA-1411 — guardião do pedido 9 da CEO (14/11): nenhum cartão de FILME, ANÚNCIO ou CARTOON da home termina na tela de conta.
// Parte do HTML REAL da home: app/KineoLanding.tsx renderizado inteiro (React SSR, a árvore de verdade, com dublês só para link, roteador,
// eventos e Supabase do navegador), como visitante e como logado. Para CADA href da página: se é o cadastro (/signup?redirect=…), segue o desvio
// do middleware (lib/growth/visitanteEscreveAntes destinoDoVisitanteQueEscreve, a função que middleware.ts chama sem cookie de sessão) e vê
// onde termina. Prova:
//   A. visitante: todo cartão de filme, anúncio e cartoon termina numa tela que ABRE SEM CONTA, e a tela confirma isso pelas regras dela
//      (campanha de filme da lista, anuncioAbreSemConta, desenhoAbreSemConta);
//   B. os números antes (a regra da origin/main) e depois, por tipo, e os de /clips e /recreate (fora deste pedido, iguais);
//   C. o HTML da home não muda (visitante e logado byte a byte iguais aos da main); logado não tem cartão no cadastro; o middleware só desvia
//      GET sem cookie de sessão;
//   D. quem volta do login (MARCA_DA_VOLTA) não é desviado; redirect externo, com // ou barra invertida não é desviado; /create/film sem
//      campanha e com ideia seguem o cadastro de sempre;
//   E. mutantes.
// Rodar: node scripts/test-cartoes-antes-da-conta-1411.mjs
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(ROOT + '/node_modules/react')
const { renderToStaticMarkup } = require(ROOT + '/node_modules/react-dom/server')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const V = 'lib/growth/visitanteEscreveAntes.ts', MW = 'middleware.ts'
const MAIN = '265ce1799' // origin/main antes desta obra
const mainSrc = (p) => execFileSync('git', ['show', `${MAIN}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e8 }).replace(/\r\n/g, '\n')

const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const STUBS = {
  'next/link': link,
  'next/image': { __esModule: true, default: ({ priority, fill, ...p }) => React.createElement('img', p) },
  '@/lib/analytics': { trackEvent: async () => true, trackClosedEvent: async () => 'stored' },
  'next/navigation': { usePathname: () => '/', useRouter: () => ({ push() {}, refresh() {}, replace() {}, prefetch() {} }), useSearchParams: () => new URLSearchParams() },
  '@/lib/supabase/client': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }), getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }, channel: () => ({ on() { return this }, subscribe() { return this } }), removeChannel() {}, from: () => { throw Error('db') } }) },
}
const PROPS = { engineWall: null, trending: [], initialEmail: null, initialIsPro: false, resume: null, clipsFirst: false, watchVisitor: false }
const home = (over, logado) => renderToStaticMarkup(React.createElement(loader(STUBS, over)('app/KineoLanding').default, { ...PROPS, initialUser: logado ? { id: 'fixture' } : null }))
// Os CARTÕES da página: todo <a> medido como cartão da home (data-home-cta, data-home-card, data-home-recreate, portas kpc-porta) e todo <a> que
// leva ao cadastro (o defeito). O menu do topo (data-nav-item) não é cartão e fica fora.
const hrefs = (html) => [...html.matchAll(/<a\s[^>]*>/g)].map((m) => m[0])
  .filter((a) => !/data-nav-item=/.test(a) && (/data-home-(cta|card|recreate)=|class="kpc-porta"/.test(a) || /href="\/signup\?redirect=/.test(a)))
  .map((a) => (/href="([^"]*)"/.exec(a)?.[1] ?? '').replace(/&amp;/g, '&')).filter(Boolean)
const BASE = 'https://www.usekineo.com'

/** Onde o clique termina para o visitante: o href; ou, se é o cadastro, o desvio do middleware; null = a tela de conta. */
function fim(V_, href) {
  const u = new URL(href, BASE)
  if (u.pathname !== '/signup') return href
  return V_.destinoDoVisitanteQueEscreve('/signup', u.searchParams.get('redirect'))
}
/** O tipo do cartão pelo destino que ele carrega. */
function tipo(href) {
  const u = new URL(href, BASE)
  const alvo = u.pathname === '/signup' && u.searchParams.get('redirect') ? new URL(u.searchParams.get('redirect'), BASE) : u
  if (alvo.pathname === '/create/film' || alvo.pathname === '/studio') return 'filme'
  if (alvo.pathname === '/create/ads' || alvo.pathname === '/ads/v2' || alvo.pathname === '/ads/new') return 'anuncio'
  if (alvo.pathname === '/create/cartoon' || alvo.pathname === '/kids-cartoon') return 'cartoon'
  if (alvo.pathname === '/clips') return 'clips'
  if (alvo.pathname.startsWith('/recreate/')) return 'recreate'
  return null
}
/** A tela de destino abre sem conta, pelas regras DELA? */
function abreSemConta(V_, destino) {
  const u = new URL(destino, BASE)
  if (u.pathname === '/studio') return V_.destinoDoVisitanteQueEscreve('/signup', destino) === destino // a régua de 04/11 do /studio
  if (u.pathname === '/ads/v2') return V_.anuncioAbreSemConta(u.searchParams.get('entry'), u.searchParams.get('utm_source'))
  if (u.pathname === '/kids-cartoon') return V_.desenhoAbreSemConta(u.searchParams.get('utm_source'))
  return false
}
const contar = (V_, lista) => {
  const c = {}
  for (const h of lista) {
    const t = tipo(h)
    if (!t) continue
    c[t] ??= { cartoes: 0, conta: 0, semConta: 0 }
    c[t].cartoes++
    const f = fim(V_, h)
    if (f === null) c[t].conta++
    else c[t].semConta++
  }
  return c
}

const htmlVisitante = home({}, false), htmlLogado = home({}, true)
const visitante = hrefs(htmlVisitante), logado = hrefs(htmlLogado)

function bateria(over = {}, o = {}) {
  const p = []
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const V_ = loader({}, over)('lib/growth/visitanteEscreveAntes')
  check('A. visitante: nenhum cartão de filme, anúncio ou cartoon termina na conta; o destino abre sem conta pelas regras dele', () => {
    const ruins = []
    let n = 0
    for (const h of visitante) {
      const t = tipo(h)
      if (t !== 'filme' && t !== 'anuncio' && t !== 'cartoon') continue
      n++
      const f = fim(V_, h)
      if (f === null || !abreSemConta(V_, f)) ruins.push(`${t}: ${h} → ${f ?? 'CONTA'}`)
    }
    if (ruins.length) throw new Error(`${ruins.length} de ${n}: ` + ruins.slice(0, 4).join(' | '))
    if (n < 25) throw new Error('poucos cartões na home renderizada: ' + n)
  })
  check('B. contagem por tipo: filme 12, anúncio 13, cartoon 2, todos sem conta; /clips e /recreate iguais aos da main', () => {
    const d = contar(V_, visitante)
    const a = contar(o.antes, visitante)
    const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y)
    if (!eq(d.filme, { cartoes: 12, conta: 0, semConta: 12 }) || !eq(d.anuncio, { cartoes: 13, conta: 0, semConta: 13 }) || !eq(d.cartoon, { cartoes: 2, conta: 0, semConta: 2 })) throw new Error('depois: ' + JSON.stringify(d))
    if (!eq(d.clips, a.clips) || !eq(d.recreate, a.recreate)) throw new Error('/clips ou /recreate mudaram: ' + JSON.stringify([a.clips, d.clips, a.recreate, d.recreate]))
  })
  check('D. volta do login, externo, //, barra invertida, sem campanha e com ideia: o cadastro de sempre', () => {
    const marca = V_.MARCA_DA_VOLTA
    for (const r of [
      `/create/film?intent_campaign=home_clips_first_film&${marca}=1`, `/create/ads?entry=product&utm_source=home_card&${marca}=1`, `/create/ads?${marca}=1`,
      `/create/cartoon?utm_source=home_card&${marca}=1`, `/create/cartoon?${marca}=1`,
      'https://evil.example/create/ads', '//evil.example/create/ads', '/\\evil.example/create/ads', 'javascript:alert(1)//create/ads',
      '/create/film', '/create/film?intent_campaign=studio_simple', '/create/film?ideia=Rome&intent_campaign=home_card', '/create/ads?entry=avatar&utm_source=home_card', '/create/ads?entry=product&utm_source=google',
    ]) if (V_.destinoDoVisitanteQueEscreve('/signup', r) !== null) throw new Error('desviou: ' + r)
    if (V_.destinoDoVisitanteQueEscreve('/login', '/create/ads') !== null) throw new Error('fora do /signup')
    // o volta do login é o cadastroComVolta da própria tela: nunca desviado de novo
    for (const tela of ['/studio?intent_campaign=home_card', '/ads/v2?entry=product&utm_source=home_card', '/kids-cartoon?utm_source=home_card']) {
      const r = new URL(V_.cadastroComVolta(tela), BASE).searchParams.get('redirect')
      if (V_.destinoDoVisitanteQueEscreve('/signup', r) !== null) throw new Error('volta do login desviada: ' + r)
    }
  })
  check('D. o desvio de cada tipo, exato', () => {
    const casos = {
      '/create/film?intent_campaign=home_clips_first_film': '/studio?intent_campaign=home_clips_first_film',
      '/create/film?engine=seedance&intent_campaign=home_card': '/studio?engine=seedance&intent_campaign=home_card',
      '/create/ads': '/ads/v2?entry=product&utm_source=home_card',
      '/create/ads?entry=ugc&utm_source=home_card': '/ads/v2?entry=ugc&utm_source=home_card',
      '/create/cartoon': '/kids-cartoon?utm_source=home_card',
      '/create/cartoon?utm_source=home_card': '/kids-cartoon?utm_source=home_card',
      '/studio?intent_campaign=home_card': '/studio?intent_campaign=home_card', // a regra de 04/11, intacta
      '/ads/v2?entry=product&utm_source=home_card': '/ads/v2?entry=product&utm_source=home_card',
    }
    for (const [r, esperado] of Object.entries(casos)) if (V_.destinoDoVisitanteQueEscreve('/signup', r) !== esperado) throw new Error(`${r} → ${V_.destinoDoVisitanteQueEscreve('/signup', r)}`)
  })
  const mw = (over[MW] ?? lf(MW)).replace(/\/\/[^\n]*/g, '')
  check('C. o middleware só desvia GET sem cookie de sessão (logado nunca passa por aqui)', () => {
    if (!mw.includes("if (request.method === 'GET' && request.nextUrl.pathname === '/signup' && !request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))) {")) throw new Error('condição do middleware')
    if (!mw.includes("const destinoEscreve = destinoDoVisitanteQueEscreve(request.nextUrl.pathname, request.nextUrl.searchParams.get('redirect'))")) throw new Error('chamada')
  })
  return p
}

// C. a home não muda: o HTML de visitante e o de logado são byte a byte os da main (esta obra só mexe no desvio do middleware)
{
  const comMain = { [V]: mainSrc(V) }
  if (home(comMain, false) !== htmlVisitante || home(comMain, true) !== htmlLogado) { console.error('FALHA\nC. o HTML da home mudou'); process.exit(1) }
  const noCadastro = logado.filter((h) => h.startsWith('/signup?redirect=') && ['filme', 'anuncio', 'cartoon'].includes(tipo(h)))
  if (noCadastro.length) { console.error('FALHA\nC. logado com cartão no cadastro: ' + noCadastro.slice(0, 3).join(' | ')); process.exit(1) }
}
// E. KINEO-M12-LIGA-1411 [CEO 14/11, dono: "onde coloca a imagem, onde aperta generate"] — com RECREATE_FLOW_ENABLED ligado, o cartão de Recreate do
// VISITANTE vai DIRETO ao molde do catálogo (/recreate/<id> aprovado) e a conta vem só no Generate. Logado: o mesmo link de sempre. Mutante: a volta ao desligado.
const FLUXO = 'lib/recreate/flowRelease.ts'
function recreateDireto(htmlV, htmlL) {
  const entry = loader({})('lib/recreate/entry')
  const v = hrefs(htmlV).filter((h) => tipo(h) === 'recreate'), l = hrefs(htmlL).filter((h) => tipo(h) === 'recreate')
  if (v.length !== 13) return 'visitante com ' + v.length + ' cartões de Recreate (esperado 13)'
  const ruins = v.filter((h) => !/^\/recreate\/[a-z0-9-]+$/.test(h) || entry.publicRecreatePath(h.slice('/recreate/'.length)) !== h)
  if (ruins.length) return 'cartão de Recreate do visitante fora do molde aprovado ou via cadastro: ' + ruins.slice(0, 3).join(' | ')
  if (l.length !== 13 || l.some((h) => h.startsWith('/signup'))) return 'logado perdeu o link direto do Recreate'
  return null
}
{
  const e = recreateDireto(htmlVisitante, htmlLogado)
  if (e) { console.error('FALHA\nE. ' + e); process.exit(1) }
  const desligado = { [FLUXO]: lf(FLUXO).replace('RECREATE_FLOW_ENABLED = true', 'RECREATE_FLOW_ENABLED = false') }
  if (desligado[FLUXO] === lf(FLUXO) || !recreateDireto(home(desligado, false), home(desligado, true))) { console.error('MUTANTE VIVO: interruptor do Recreate desligado'); process.exit(1) }
  console.log('ok E. visitante: 13 cartões de Recreate direto ao molde, conta no Generate; mutante "interruptor desligado" vermelho')
}
const antes = loader({}, { [V]: mainSrc(V) })('lib/growth/visitanteEscreveAntes')
const real = bateria({}, { antes })
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const a = contar(antes, visitante), d = contar(loader({})('lib/growth/visitanteEscreveAntes'), visitante)
const v = lf(V), mws = lf(MW)
const mutantes = [
  ['sem o nome de hoje', { [V]: v.replace('  if (deHoje) return destinoDoVisitanteQueEscreve(pathname, deHoje)\n', '') }],
  ['filme sem query vira o Studio genérico', { [V]: v.replace("  if (url.pathname === '/create/film') return url.search ? `/studio${url.search}` : null", "  if (url.pathname === '/create/film') return `/studio${url.search || '?intent_campaign=home_card'}`") }],
  ['anúncio sem query vai a /ads/v2 sem os parâmetros', { [V]: v.replace("export const ANUNCIO_DO_CARTAO = `/ads/v2?entry=product&utm_source=${ORIGEM_DO_CARTAO}`", 'export const ANUNCIO_DO_CARTAO = `/ads/v2`') }],
  ['cartoon sem query fica no cadastro', { [V]: v.replace("  if (url.pathname === '/create/cartoon') return url.search ? `/kids-cartoon${url.search}` : DESENHO_DO_CARTAO", "  if (url.pathname === '/create/cartoon') return url.search ? `/kids-cartoon${url.search}` : null") }],
  ['a volta do login é desviada', { [V]: v.replace('  const deHoje = nomeDeHoje(url)', "  url.searchParams.delete(MARCA_DA_VOLTA)\n  const deHoje = nomeDeHoje(url)") }],
  ['redirect externo aceito', { [V]: v.replace("  if (url.origin !== 'https://www.usekineo.com' || redirect.startsWith('//')) return null\n  const deHoje", '  const deHoje') }],
  ['anúncio de qualquer entrada', { [V]: v.replace("const ENTRADAS_DE_ANUNCIO = new Set(['product', 'ugc'])", "const ENTRADAS_DE_ANUNCIO = new Set(['product', 'ugc', 'avatar'])") }],
  ['middleware desvia logado', { [MW]: mws.replace(" && !request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))) {", ') {') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, val] = Object.entries(over)[0]
  if (val === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(over, { antes }).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
const linha = (c) => Object.entries(c).map(([t, x]) => `${t} ${x.cartoes} (conta ${x.conta}, sem conta ${x.semConta})`).join(' · ')
console.log(`ANTES (regra da main): ${linha(a)}`)
console.log(`DEPOIS:                ${linha(d)}`)
console.log(`PASS cartões antes da conta: na home REAL de visitante, todo cartão de filme, anúncio e cartoon termina numa tela que abre sem conta; a home não muda (visitante e logado byte a byte); volta do login, externo e // seguem o cadastro; /clips e /recreate iguais; ${mortos}/${mutantes.length} mutantes mortos`)
