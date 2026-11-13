import { readFileSync } from 'node:fs'
import { renderPage } from './preview-ux-complete.mjs'
import { createRequire } from 'node:module'
// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — o topo passa pela entrada única (lib/create/entry.ts):
// "Product ads" leva o LOGADO à aba Ads da tela nova; o VISITANTE (este render) segue no /ads/new de hoje (KINEO-ENTRADAS-SO-LOGADO-1011).
const { loader } = createRequire(import.meta.url)('../docs/recreate-0911/test-recreate.cjs')
const entry = loader()('lib/create/entry')
const ADS_TOP = entry.createEntryHref('ads', '/ads/new', false), FILM_TOP = entry.createEntryHref('film', '/studio', false)
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
// reancorado 30/09 (KINEO-NAV-TOPO-ADS): o fundador trocou o topo para "Ads" (como os concorrentes) indo direto ao painel
// /ads/new — que manda o logado ao montador e o visitante à porta pública /ads (nunca ao /login nem ao checkout).
// O rodapé segue "Videos for businesses" → /ads.
// reancorado 13/10 (KINEO-DUAS-PORTAS-2026-10-13, fundador "tudo sim", ação B): o item vira a 2ª porta, "Product ads", mesmo
// destino /ads/new; Imagem e Spaces desceram para o "More tools" (depois da porta), Pricing segue por último.
// reancorado 12/11 (KINEO-NOMES-DE-PRODUTO-1211, nomes aprovados pelo fundador 11/11): o rótulo do topo vira "Product Ads"; destino e regras iguais.
const topLinked = html => new RegExp('href="' + esc(ADS_TOP) + '"[^>]*>(?:<!-- -->)?(?:<[^>]+>)*Product Ads<').test(html) && ADS_TOP === '/ads/new' && entry.createEntryHref('ads', '/ads/new', true) === '/create/ads' && entry.LEGACY_ENTRY_PATH.ads === '/ads/new' && !html.includes('buy.stripe.com') && !/For businesses/.test(html)
check('desktop menu opens the Ads panel, not checkout', topLinked(desktop))
check('mobile menu opens the Ads panel, not checkout', topLinked(mobile))
// KINEO-HOME-REMODELA-2010 — reancorado 20/10, fundador: "esses vão ser os quatro principais, e ao lado vai ser o MCP do Claude e do GPT… more tools a gente vai cancelar" — Images e Spaces saíram do topo (rodapé).
// reancorado 12/11 (KINEO-MENU-4-MAIS-1211, fundador 12/11 vendo a foto A/B/C: "C"): Pricing foi para a direita, ao lado do Log in (dentro de .nav-right) —
// a ordem passa a ser lida no topo inteiro do computador (tudo antes do menu do celular); os 4 produtos e Claude & ChatGPT seguem na faixa do meio.
const topoComputador = nav.slice(0, nav.indexOf('id="mobile-nav-menu"'))
check('top menu order: Product Ads · Cartoons · Claude & ChatGPT · Pricing (à direita), sem Images/Spaces no topo', (() => { const i = ['href="' + ADS_TOP + '"', 'href="/ai-kids-cartoon-videos"', 'href="/kineo-in-claude"', 'href="/pricing"'].map((h) => topoComputador.indexOf(h)); if (desktop.includes('href="/pricing"') || !desktop.includes('href="/kineo-in-claude"')) return false; return i.every((x) => x >= 0) && i.every((x, k) => k === 0 || x > i[k - 1]) && !desktop.includes('href="/images') && !desktop.includes('href="/spaces"') })()) // KINEO-HOME-REMODELA-2010
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
check('mutant: removing mobile destination is rejected', !topLinked(mobile.replaceAll('href="' + ADS_TOP + '"','href="/pricing"')))
