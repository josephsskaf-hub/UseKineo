import { readFileSync } from 'node:fs'
import { renderPage } from './preview-ux-complete.mjs'
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
const topLinked = html => /href="\/ads\/new"[^>]*>(?:<!-- -->)?(?:<[^>]+>)*Product ads</.test(html) && !html.includes('buy.stripe.com') && !/For businesses/.test(html)
check('desktop menu opens the Ads panel, not checkout', topLinked(desktop))
check('mobile menu opens the Ads panel, not checkout', topLinked(mobile))
check('top menu order: Product ads · More tools (Images · Spaces) · Pricing', (() => { const i = ['href="/ads/new"', 'href="/images', 'href="/spaces"', 'href="/pricing"'].map((h) => desktop.indexOf(h)); return i.every((x) => x >= 0) && i.every((x, k) => k === 0 || x > i[k - 1]) })())
check('/ads/new sends visitors to the public door, never /login', /redirect\(visitante \? adsV2Href\(searchParams\) : adsPublicHref\(searchParams\)\)/.test(read('app/(dashboard)/ads/new/page.tsx')))
check('shared footer opens the creator', linked(footer))
check('existing pricing and studio destinations survive', nav.includes('href="/pricing"') && nav.includes('href="/studio"'))
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
check('mutant: removing mobile destination is rejected', !topLinked(mobile.replaceAll('href="/ads/new"','href="/pricing"')))
