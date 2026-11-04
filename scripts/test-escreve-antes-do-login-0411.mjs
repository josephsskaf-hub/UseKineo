// KINEO-ESCREVE-ANTES-DO-LOGIN-0411 [fundador 04/11: "1a"] — guardião sem rede: o visitante do cartão de filme da home escreve antes do login; nada mais muda.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === 'lib/growth/visitanteEscreveAntes.ts' ? mutar(t) : t) })('lib/growth/visitanteEscreveAntes.ts')
const m = carrega()
const d = (r, p = '/signup') => m.destinoDoVisitanteQueEscreve(p, r)
const homeThree = createOfflineLoader({ source: (_r, t) => t })('lib/ui/homeThreeCards.ts')
const homeTwo = createOfflineLoader({ source: (_r, t) => t })('lib/ui/homeTwoDoors.ts')
const viaHref = (href) => new URLSearchParams(href.split('?')[1]).get('redirect')
checa('cartão de filme da home vai direto', d(viaHref(homeThree.homeCardHref('films', false))) === homeThree.homeCardHref('films', true))
checa('porta de filme da home vai direto', d(viaHref(homeTwo.homeDoorHref('film', false))) === homeTwo.homeDoorHref('film', true))
checa('barra da home vai direto', d('/studio?intent_campaign=home_news_bar_k4_trial') === '/studio?intent_campaign=home_news_bar_k4_trial')
checa('botão do filme da home vai direto', d('/studio?intent_campaign=home_clips_first_film') === '/studio?intent_campaign=home_clips_first_film')
checa('anúncio segue pelo cadastro', d('/ads/v2?entry=product&utm_source=home_card') === null)
checa('Studio sem campanha da home segue pelo cadastro', d('/studio') === null && d('/studio?engine=fast&intent_campaign=outra') === null)
checa('pedido com texto segue pelo cadastro', d('/studio?prompt=oi&intent_campaign=home_card') === null)
checa('outra página não desvia', d('/studio?intent_campaign=home_card', '/login') === null)
checa('endereço externo não passa', d('https://evil.example/studio?intent_campaign=home_card') === null && d('//evil.example/studio?intent_campaign=home_card') === null)
checa('sem destino não desvia', d(null) === null && d('') === null)
const mut = carrega((t) => t.replace("new Set(['engine', 'intent_campaign'])", "new Set(['engine', 'intent_campaign', 'prompt'])"))
checa('mutante: aceitar qualquer parâmetro seria percebido', mut.destinoDoVisitanteQueEscreve('/signup', '/studio?prompt=oi&intent_campaign=home_card') !== null)
const mw = fs.readFileSync('middleware.ts', 'utf8')
checa('o desvio só vale sem sessão e em GET', mw.includes("request.method === 'GET' && request.nextUrl.pathname === '/signup' && !request.cookies.getAll().some((c) => c.name.startsWith('sb-')"))
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
