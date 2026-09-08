// Actual JSX + synthetic owner/session/film. No network, credentials or effects.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import React from 'react'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
export const ROOT = path.resolve(import.meta.dirname, '../..')
export const BASE = '0044fccf'
// Optional read-only compatibility check against a known upstream pricing commit.
// The before view always keeps the historical price; product files are untouched.
export const PRICING_REF = process.argv.find(arg => arg.startsWith('--pricing-ref='))?.slice('--pricing-ref='.length)
export const owner = '11111111-1111-4111-8111-111111111111'
export const filmId = '22222222-2222-4222-8222-222222222222'
export const validProfile = { has_paid: false, plan: 'free', is_pro: false, stripe_subscription_id: null, paypal_subscription_id: null }
export const film = { id: filmId, user_id: owner, topic: 'The mountain mystery · demonstration', status: 'completed', video_url: 'https://example.invalid/fixture.mp4', quality_mode: 'fast', created_at: '2026-09-08T03:00:00Z', credits_used: 0 }
export function source(file, before = false) {
  return before ? execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8' }) : fs.readFileSync(path.join(ROOT, file), 'utf8')
}
export function sandbox(options = {}) {
  const { before = false, entry = '', language = 'en', fixture = {}, profile = validProfile, signedIn = true } = options
  const cache = new Map(), effects = [], launches = [], events = [], reads = []
  const react = { ...React, useEffect: fn => effects.push(fn), useCallback: fn => fn, useMemo: fn => fn(), useRef: current => ({ current }), useState: value => [typeof value === 'function' ? value() : value, () => {}] }
  const checkout = { pending: null, error: null, launch: (...args) => { launches.push(args); return true } }
  const client = { auth: { getUser: async () => ({ data: { user: signedIn ? { id: owner } : null } }) }, from: table => {
    const query = { select: columns => { reads.push({ table, columns }); return query }, eq: (key, value) => { if (value !== owner) throw Error('Wrong owner'); return query }, order: () => query, limit: async () => ({ data: [film], error: null }), maybeSingle: async () => ({ data: profile, error: options.profileError ?? null }) }
    return query
  } }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    let code = file === 'lib/checkoutPricing.ts' && (before || PRICING_REF)
      ? execFileSync('git', ['show', `${before ? BASE : PRICING_REF}:${file}`], { cwd: ROOT, encoding: 'utf8' })
      : source(file, before && file === entry)
    if (options.transform) code = options.transform(file, code)
    if (file === entry) {
      const sf = ts.createSourceFile(file, code, 99, true, 4), edits = []
      const fn = sf.statements.find(n => ts.isFunctionDeclaration(n) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword))
      const walk = n => {
        if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useState') {
          const name = n.name.elements[0].getText(sf)
          if (Object.hasOwn(fixture, name)) edits.push([n.initializer.getStart(sf), n.initializer.end, `__fixtureState(${JSON.stringify(name)})`])
        }
        ts.forEachChild(n, walk)
      }
      if (fn) walk(fn)
      for (const [start, end, replacement] of edits.sort((a,b) => b[0]-a[0])) code = code.slice(0,start)+replacement+code.slice(end)
    }
    const box = { exports: {} }; cache.set(file, box.exports)
    const shim = id => {
      if (id === 'react') return react
      if (id === 'react/jsx-runtime') return require(id)
      if (id === 'crypto' || id === 'node:crypto') return require(id)
      if (id === 'next/link') return { __esModule: true, default: ({children,prefetch,...props}) => React.createElement('a',props,children) }
      if (id === 'next/navigation') return { redirect: url => { throw Error('REDIRECT:'+url) }, notFound: () => { throw Error('NOT_FOUND') }, useRouter: () => ({}), usePathname: () => '/history', useSearchParams: () => new URLSearchParams() }
      if (id === 'next/headers') return { headers: () => new Headers({'user-agent':'Synthetic fixture'}), cookies: () => ({get: () => undefined}) }
      if (id === '@/lib/supabase/server') return { createClient: () => client }
      if (id === '@/lib/supabase/client') return { createClient: () => { throw Error('Client database forbidden') } }
      if (id === '@/lib/serverEvents') return { writeServerEvent: async () => {} }
      if (id === '@/lib/gptHandoffStore') return { isLikelyBot: () => options.bot ?? false, markHandoffViewed: async () => {}, findHandoff: async () => ({status:'ok',expired:false,row:{token:'a'.repeat(32),channel:'chatgpt',engine_hint:'seedance',duration_sec:35,aspect:'9:16',language:'English',words:80,script:'A quiet city after the rain. '+('A new day begins with a small story to tell. '.repeat(8)),viewed_at:null}}) }
      if (id === '@/lib/checkoutTelemetry') return { useCheckoutLaunch: () => checkout }
      if (id === '@/lib/analytics') return { trackEvent: async (...args) => {events.push(args);return true}, trackClosedEvent: async (...args) => {events.push(args);return 'stored'} }
      if (id === '@/lib/seriesDoorImpressions') return { useSeriesDoorSeen: () => ({registrarPorta: () => () => {}}) }
      if (id === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => language, UiLabel: ({children}) => children }
      if (id === '@/components/PostFilmCreatorOffer') return load('components/PostFilmCreatorOffer.tsx')
      if (id.startsWith('@/components/')) return new Proxy({default:({children}) => children ?? null},{get:(obj,key) => key === '__esModule' ? true : obj[key] ?? (() => null)})
      if (id === 'server-only') return {}
      const base = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? path.posix.join(path.posix.dirname(file),id) : null
      if (!base) throw Error('Unapproved import '+id+' in '+file)
      for (const ext of ['.ts','.tsx']) if (fs.existsSync(path.join(ROOT,base+ext))) return load(base+ext)
      throw Error('Missing fixture dependency '+id)
    }
    vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:1,jsx:ts.JsxEmit.React,target:9,esModuleInterop:true}}).outputText,
      {module:box,exports:box.exports,require:shim,React:react,__fixtureState:name=>[fixture[name],()=>{}],process:{env:{}},URL,URLSearchParams,Headers,Date,console,fetch:()=>{throw Error('Network forbidden')},...options.globals},{filename:file})
    return box.exports
  }
  return {load,effects,launches,events,reads,checkout}
}
export async function render(entry, options = {}, props = {}) {
  const s = sandbox({...options,entry})
  const element = await s.load(entry).default(props)
  return {html:renderToStaticMarkup(element),...s}
}

if (process.argv.includes('--preview')) {
  const poster = 'data:image/webp;base64,'+fs.readFileSync(path.join(ROOT,'public/posters/showcase-sep07/f3de57b0-3486-4400-ba72-c9390774d426.webp')).toString('base64')
  const escape = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
  const pages = []
  for (const [label,file,fixture,props] of [
    ['Filme próprio','app/(dashboard)/history/HistoryClient.tsx',{lightbox:filmId,cleanExportLocked:true},{videos:[film],snapshotTime:Date.parse('2026-09-08T03:00:00Z'),creatorTrialEligible:true}],
    ['Pouso do roteiro /go','app/go/[token]/page.tsx',{}, {params:{token:'a'.repeat(32)}}],
  ]) {
    const variants=[]
    for (const before of [true,false]) {
      const {html}=await render(file,{before,fixture,signedIn:false},props)
      // Approved in-repo poster is a labelled media fixture, never a customer film.
      variants.push(html.replaceAll('<video ',`<video poster="${poster}" `).replaceAll('https://example.invalid/fixture.mp4','').replaceAll('autoPlay=""',''))
    }
    for (const width of [1280,390]) pages.push(`<section><h2>${label} · ${width===390?'mobile':'desktop'}</h2><div class="pair">${variants.map((html,index)=>`<article><h3>${index?'DEPOIS · implementação':'ANTES · '+BASE}</h3><iframe title="${label} ${index?'depois':'antes'} ${width}" width="${width}" height="${label==='Filme próprio'?1000:1250}" sandbox="allow-same-origin" srcdoc="${escape('<!doctype html><html lang="en"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#080b10;color:#f5f5f7;font:14px Arial,sans-serif;--muted:#adb6c2;--text:#f5f5f7}button,a{font:inherit}video{display:block}</style><body>'+html+'</body></html>')}"></iframe></article>`).join('')}</div></section>`)
  }
  const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Pista 3 · oferta após o filme</title><style>body{margin:24px;background:#080b10;color:#eef3fa;font:15px Arial}h1{font-size:30px}section{margin:32px 0 48px}.pair{display:flex;gap:20px;overflow:auto}article{flex-shrink:0}iframe{border:1px solid #34475b;border-radius:12px}p{max-width:1000px;line-height:1.6}</style><h1>O próximo filme começa com uma compra clara</h1><p>Antes/depois do JSX real. Filme, conta e roteiro sintéticos; poster do acervo público aprovado. Sem dados de clientes, geração, pagamento, rede ou telemetria. O vídeo atual continua disponível; a entrada Creator vale para novas criações. As telas são navegáveis por rolagem.</p>${pages.join('')}</html>`
  fs.mkdirSync(path.join(ROOT,'docs/previews'),{recursive:true})
  const pricingNote = PRICING_REF ? ` O depois usa a fonte canônica de preços do commit ${escape(PRICING_REF)}; o antes mantém a base histórica.` : ''
  fs.writeFileSync(path.join(ROOT,'docs/previews/PISTA3-POS-FILME-2026-09-08.html'),html.replace('As telas são navegáveis por rolagem.', 'As telas são navegáveis por rolagem.' + pricingNote))
  console.log('Preview saved: docs/previews/PISTA3-POS-FILME-2026-09-08.html')
}
