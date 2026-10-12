// KINEO-HOME-TEXTOS-2026-10-12 — guardião: a home não volta a dizer as frases falsas da auditoria de 12/10.
// O que ele prova (só readFileSync + asserts, sem alias @/):
//   (1) app/KineoLanding.tsx e components/StructuredData.tsx não contêm "Fast Mode usually finishes", "finds the footage",
//       "forever storage" nem "Every video engine incl. MiniMax H3";
//   (2) as duas respostas da FAQ vêm da MESMA constante (lib/growth/homeTextos.ts) na home e no JSON-LD, e o tempo vem da
//       fonte medida (PRODUCT_TIME), sem minuto digitado;
//   (3) os cartões Creator ('basic') e Studio ('pro') ligam o 1º mês pelo interruptor ÚNICO WELCOME20_SITE_OFFER_LIVE, o
//       Starter não; LandingPlanPrice calcula o 1º mês com publicPromoFirstChargeMinor (a conta do checkout) e só para
//       basic/pro; e a conta dá $15.92 / $43.92 sobre os preços de hoje;
//   (4) o comentário que dizia "o 1º mês não tem desconto" morreu;
//   (5) mutantes: cada frase falsa reinserida e o interruptor trocado por true digitado são pegos.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const check = (cond, msg) => { assert.ok(cond, msg); ok += 1 }

const landing = rd('app/KineoLanding.tsx')
const sd = rd('components/StructuredData.tsx')
const textos = rd('lib/growth/homeTextos.ts')
const price = rd('components/LandingPlanPrice.tsx')
const promo = rd('lib/growth/publicPromoTruth.ts')
const pricing = rd('lib/checkoutPricing.ts')

const FALSAS = ['Fast Mode usually finishes', 'finds the footage', 'forever storage', 'Every video engine incl. MiniMax H3']
const limpo = (src) => FALSAS.every((f) => !src.includes(f))

// (1)
for (const f of FALSAS) {
  check(!landing.includes(f), `home não contém "${f}"`)
  check(!sd.includes(f), `JSON-LD não contém "${f}"`)
}

// (2)
check(landing.includes("import { HOME_FAQ_EDITING_ANSWER, HOME_FAQ_TIME_ANSWER } from '@/lib/growth/homeTextos'"), 'home importa as respostas da fonte única')
check(sd.includes("import { HOME_FAQ_EDITING_ANSWER, HOME_FAQ_TIME_ANSWER } from '@/lib/growth/homeTextos'"), 'JSON-LD importa as mesmas respostas')
check(landing.includes('<UiLabel>{`${HOME_FAQ_EDITING_ANSWER} `}</UiLabel>') && landing.includes('<UiLabel>{HOME_FAQ_TIME_ANSWER}</UiLabel>'), 'FAQ visível renderiza as constantes')
check(sd.includes('text: `${HOME_FAQ_EDITING_ANSWER} ${ft(') && sd.includes('text: HOME_FAQ_TIME_ANSWER,'), 'FAQPage renderiza as mesmas constantes')
check(textos.includes("import { PRODUCT_TIME } from '@/lib/seo/measuredRenderTime'") && textos.includes('PRODUCT_TIME.median') && textos.includes('PRODUCT_TIME.lead.engine'), 'tempo vem da fonte medida')
check(!/\d+(?:\.\d+)?\s*(?:–|-)?\s*\d*\s*minutes/.test(textos.replace(/^\s*\/\/.*$/gm, '')), 'nenhum minuto digitado nas respostas')
check(textos.includes('generates every scene'), 'a IA gera cada cena')
check(textos.includes('KINEO-HOME-TEXTOS-2026-10-12') && landing.includes('KINEO-HOME-TEXTOS-2026-10-12'), 'comentário-marca presente')

// (3)
check(landing.includes("import { WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'"), 'home lê o interruptor único')
check(landing.includes('<LandingPlanPrice tier="basic" variant="big" welcomeFirstMonth={WELCOME20_SITE_OFFER_LIVE} />'), 'Creator mostra o 1º mês pelo interruptor')
check(landing.includes('<LandingPlanPrice tier="pro" variant="big" welcomeFirstMonth={WELCOME20_SITE_OFFER_LIVE} />'), 'Studio mostra o 1º mês pelo interruptor')
check(landing.includes('{WELCOME20_SITE_OFFER_LIVE ? <div className="pr-then"><LandingPlanPrice tier="basic" variant="then" /></div> : null}'), 'Creator diz "then $X/mo" só com a oferta ligada')
check(landing.includes('{WELCOME20_SITE_OFFER_LIVE ? <div className="pr-then"><LandingPlanPrice tier="pro" variant="then" /></div> : null}'), 'Studio diz "then $X/mo" só com a oferta ligada')
check(landing.includes('<LandingPlanPrice tier="starter" variant="big" />') && !/tier="starter"[^>]*welcomeFirstMonth/.test(landing), 'Starter sem desconto')
check(!/welcomeFirstMonth=\{true\}/.test(landing), 'nenhum true digitado no lugar do interruptor')
check(price.includes("import { publicPromoFirstChargeMinor, WELCOME20_PERCENT_OFF } from '@/lib/growth/publicPromoTruth'"), 'LandingPlanPrice usa a conta do checkout')
check(price.includes("welcomeFirstMonth && (tier === 'basic' || tier === 'pro')") && price.includes("publicPromoFirstChargeMinor('welcome_first_month_20', fullMinor)"), '1º mês só para basic/pro, pela mesma função')
check(price.includes('<s className="pr-was">{price}</s>'), 'preço cheio riscado')
check(/export const WELCOME20_SITE_OFFER_LIVE = (true|false)\n/.test(promo), 'interruptor existe na fonte única')
// a conta: mesma fórmula de publicPromoFirstChargeMinor sobre os preços da tabela
const pct = Number(promo.match(/export const WELCOME20_PERCENT_OFF = (\d+)/)[1])
check(promo.includes('return Math.round(fullAmountMinor * (100 - WELCOME20_PERCENT_OFF) / 100)'), 'fórmula do 1º mês inalterada')
const usd = (tier) => Number(pricing.match(new RegExp(`\\n  ${tier}: \\{ usd: (\\d+) \\}`))[1])
const first = (m) => Math.round(m * (100 - pct) / 100)
check(first(usd('basic')) === 1592 && first(usd('pro')) === 4392, `1º mês = $15.92 / $43.92 (basic ${usd('basic')}, pro ${usd('pro')}, ${pct}%)`)

// (4)
check(!landing.includes('o 1º mês não tem desconto'), 'comentário falso sobre o 1º mês morreu')

// (5) mutantes
for (const f of FALSAS) check(!limpo(landing + '\n' + f), `mutante "${f}" seria pego`)
const mutTrue = landing.replace('welcomeFirstMonth={WELCOME20_SITE_OFFER_LIVE}', 'welcomeFirstMonth={true}')
check(mutTrue !== landing && /welcomeFirstMonth=\{true\}/.test(mutTrue), 'mutante com true digitado seria pego')
const mutStarter = landing.replace('<LandingPlanPrice tier="starter" variant="big" />', '<LandingPlanPrice tier="starter" variant="big" welcomeFirstMonth={WELCOME20_SITE_OFFER_LIVE} />')
check(mutStarter !== landing && /tier="starter"[^>]*welcomeFirstMonth/.test(mutStarter), 'mutante com desconto no Starter seria pego')

console.log(`test-home-textos-1210: ${ok} verificações ok`)
