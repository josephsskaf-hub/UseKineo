// KINEO-SEM-CARD-DE-PROMO-0411 [fundador 04/11: "quero que tire todos esses cards de promoção também"] — guardião sem rede: nenhum cartão de oferta abre sozinho, e cada um passa pelo interruptor antes de marcar ou medir.
import fs from 'node:fs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
checa('o interruptor está desligado', /PROMO_CARDS_LIVE = false as boolean/.test(lf('lib/growth/promoCards.ts')))
const e = lf('components/ExitIntentOffer.tsx')
checa('saída: não abre nem arma o contador', e.indexOf('if (!PROMO_CARDS_LIVE) return') > 0 && e.indexOf('if (!PROMO_CARDS_LIVE) return') < e.indexOf("localStorage.setItem(EXIT_SEEN_KEY") && e.indexOf('if (!PROMO_CARDS_LIVE) return') < e.indexOf("trackEvent('exit_intent_shown'"))
const w = lf('components/WelcomeOfferModal.tsx')
checa('boas-vindas: não começa o relógio nem abre', w.indexOf('if (!PROMO_CARDS_LIVE) return') > 0 && w.indexOf('if (!PROMO_CARDS_LIVE) return') < w.indexOf("fetchWelcome20Deadline('welcome_modal')") && w.indexOf('if (!PROMO_CARDS_LIVE) return') < w.indexOf('markWelcomeOfferSeen(Date.now())'))
const c = lf('components/Creator30OfferModal.tsx')
checa('Creator 30: não consulta nem abre', c.indexOf('if (!PROMO_CARDS_LIVE) return') > 0 && c.indexOf('if (!PROMO_CARDS_LIVE) return') < c.indexOf("fetch('/api/me/creator30-offer'"))
const s = lf('components/Studio50OfferBanner.tsx')
checa('Studio 50: não mede nem desenha', s.includes('if (!PROMO_CARDS_LIVE || !elig?.eligible || shown.current) return') && s.includes('if (!PROMO_CARDS_LIVE) return null'))
const p = lf('app/pricing/PricingClient.tsx')
checa('a tabela de planos segue na página', p.includes('<PricingAudience') || p.includes('PricingAudience'))
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
