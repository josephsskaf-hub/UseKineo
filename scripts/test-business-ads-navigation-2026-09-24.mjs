import { readFileSync } from 'node:fs'
import { renderPage } from './preview-ux-complete.mjs'
import { createRequire } from 'node:module'
// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — o topo passa pela entrada única (lib/create/entry.ts):
// "Product ads" leva o LOGADO à aba Ads da tela nova; o VISITANTE (este render) segue no /ads/new de hoje (KINEO-ENTRADAS-SO-LOGADO-1011).
const { loader } = createRequire(import.meta.url)('../docs/recreate-0911/test-recreate.cjs')
const entry = loader()('lib/create/entry')
const ADS_TOP = entry.createEntryHref('ads', '/ads/new', false), FILM_TOP = entry.createEntryHref('film', '/studio', false)
const check = (name, condition) => { if (!condition) throw Error(name); console.log('PASS '+name) }
const read = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8')
// 27/09: visitante deslogado caía no /login; a porta pública é /ads (200 para todos), que leva ao criador.
const destination = 'href="/ads"'
const home = renderPage('app/KineoLanding.tsx')
const footer = renderPage('components/Footer.tsx', false, {}, {showStats:false})
const nav = home.match(/<nav aria-label="Main">[\s\S]*?<\/nav>/)?.[0] ?? ''
const mobile = nav.slice(nav.indexOf('id="mobile-nav-menu"'))
const desktop = nav.slice(0,nav.indexOf('class="nav-right"'))
// KINEO-MENU-4-VIDEO-IMAGEM-2026-09-25 — o topo diz "For businesses" (Para empresas, decisão do fundador de 25/09); o
// rodapé segue "Videos for businesses". Pedido explícito25/09: o destino agora é o criador /ads/new; acesso é validado lá, nunca um checkout direto.
const linked = html => html.includes(destination) && /Videos for businesses|For businesses/.test(html) && !html.includes('buy.stripe.com')
// Focused navigation keeps Ads directly accessible in both session states.
check('guest Ads creator resolves to the existing public entry', ADS_TOP === '/create/ads' && entry.LEGACY_ENTRY_PATH.ads === '/ads/new')
const closedRelease = read('lib/create/publicEditorRelease.ts').replace('PUBLIC_CREATE_EDITORS = true', 'PUBLIC_CREATE_EDITORS = false')
const closed = loader({}, {'lib/create/publicEditorRelease.ts':closedRelease})('lib/create/entry')
check('closing public Ads reverts guest entry to its legacy route', closed.createEntryHref('ads','/ads/new',false) === '/ads/new' && closed.createEntryHref('ads','/ads/new',true) === ADS_TOP)
check('signed-in Ads creator resolves to its existing workspace', entry.createEntryHref('ads', '/ads/new', true) === '/create/ads')
const focused = html => html.length > 0 && !/data-nav-item="(?:business|more:ugc)"|Product Ads|UGC Ads|href="\/ai-ugc-ads(?:[?"]|$)|href="(?:\/ads(?:[/?"]|$)|\/create\/ads(?:[?"]|$))|buy\.stripe\.com/i.test(html)
check('focused desktop omits Ads', focused(desktop))
check('focused mobile omits Ads', focused(mobile))
// KINEO-HOME-REMODELA-2010 — reancorado 20/10, fundador: "esses vão ser os quatro principais, e ao lado vai ser o MCP do Claude e do GPT… more tools a gente vai cancelar" — Images e Spaces saíram do topo (rodapé).
// KINEO-PRICING-NO-MENU-1911 — em 19/11 às 19:38 o fundador moveu Pricing para a lista, depois de Claude & ChatGPT.
const direita = nav.slice(nav.indexOf('class="nav-right"'), nav.indexOf('id="mobile-nav-menu"'))
const desktopDestinations = ['data-nav-item="video"', 'href="/create/cartoon"', 'href="/kineo-in-claude"', 'href="/pricing" data-nav-item="pricing"']
const positions = desktopDestinations.map(href => desktop.indexOf(href))
check('top menu order: Films · Cartoons · Claude & ChatGPT · Pricing, all in the list', positions.every((pos, i) => pos >= 0 && (i === 0 || pos > positions[i - 1])) && !direita.includes('data-nav-item="pricing"') && !desktop.includes('href="/images') && !desktop.includes('href="/spaces"'))
check('/ads/new sends visitors to the public door, never /login', /redirect\(visitante \? adsV2Href\(searchParams\) : adsPublicHref\(searchParams\)\)/.test(read('app/(dashboard)/ads/new/page.tsx')))
check('shared footer opens the creator', linked(footer))
check('existing pricing and studio destinations survive', nav.includes('href="/pricing"') && nav.includes('href="' + FILM_TOP + '"'))
// KINEO-FILMS-DIRETO-1311 [dono 13/11: "não precisa abrir essa mini tela… eles nem querem saber qual motor… o filme pode ir direto para o filme"] — nenhum motor no menu; os guias de motor seguem a um clique, no rodapé
check('no engine in the top menu; engine guides stay in the footer', !nav.includes('intent_campaign=nav_mega') && !/engine=(seedance|hollywood|h3|h3max|s25)/.test(nav) && footer.includes('href="/ai-video-generator"'))
for (const lang of ['es','hi','pt','fr','de','it','nl','pl','tr','ru','uk','ar','ur','id','vi']) {
  const file = lang==='es'?'lib/ui/interfaceLabels.ts':lang==='hi'?'lib/ui/interfaceHindi.ts':`lib/ui/interface/${lang}.ts`
  check(lang+' translates the top-menu label "Ads"', /'Ads': '[^']+'/.test(read(file)))
}
check('compact navigation protects translated label on tablets', read('app/KineoLanding.tsx').includes('@media(max-width:1200px)'))
for (const lang of ['es','hi','pt','fr','de','it','nl','pl','tr','ru','uk','ar','ur','id','vi']) {
  const file = lang==='es'?'lib/ui/interfaceLabels.ts':lang==='hi'?'lib/ui/interfaceHindi.ts':`lib/ui/interface/${lang}.ts`
  const value = read(file).match(/'Videos for businesses': '([^']+)'/)?.[1]
  check(lang+' has authored navigation translation', Boolean(value))
  const translated = renderPage('components/Footer.tsx', false, {interfaceLanguage:lang,interfaceDictionary:{'Videos for businesses':value}}, {showStats:false})
  check(lang+' footer renders translated link', translated.includes(destination) && translated.includes(value))
}
for (const html of [desktop, mobile]) {
  check('mutant: restoring UGC Ads is rejected', !focused(html + '<a href="/ai-ugc-ads">UGC Ads</a>'))
  check('mutant: restoring the Ads link is rejected', !focused(html + '<a href="/ads/new">Product Ads</a>'))
}
check('mutant: losing the Ads footer link is rejected', !linked(footer.replaceAll(destination, 'href="/pricing"')))
