// KINEO-RESTAURACAO-2026-09-09 — guardião da volta ao momento que mais vendia.
//
// Ordem do fundador (09/09/2026 ~18h): "quero todas as mudanças pra agora,
// inclusive o preço, 9.90, 19.90 e 39.90" · "tira esse negócio de 1 dólar" ·
// "algo entre 25 e 40: 30 faz sentido, 1 Seedance e 1 Kineo".
//
// O que este guardião trava (cada linha lê a FONTE, não a copy):
//   1. preço V5 na fonte única (990/1990/3990; anual 10×; intro = cheio);
//   2. entrada grátis ligada (CARD_ENTRY_ONLY=false) com 30 créditos, e os
//      espelhos puros dizendo 30 (reverseTrial, freeTierOffer, entryPolicy);
//   3. trial de $1 morto na fonte (CARD_TRIAL_LIVE=false), no cobrador
//      (CARD_TRIAL_ENABLED lê a fonte) e no núcleo das portas (TRIAL_DOOR_LIVE=false);
//   4. gate de motores desligado (ENGINE_GATE_SINCE no futuro);
//   5. nenhuma página pública diz "$1 trial" / "7 days for $1" / "80 credits";
//   6. a /ph e o kit do PH mandam para o cadastro, não para o checkout de $1.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const cp = rd('lib/checkoutPricing.ts')
const ep = rd('lib/entryPolicy.ts')
const rt = rd('lib/reverseTrial.ts')
const fo = rd('lib/freeTierOffer.ts')
const gate = rd('lib/enginePlanGate.ts')
const door = rd('lib/growth/cleanFilmTrialDoor.ts')
const ck = rd('app/api/stripe/checkout/route.ts')

console.log('== 1. preço V5 ==')
checa('TIER_PRICES = 990 / 1990 / 3990', /starter: \{ usd: 990 \},\n  basic: \{ usd: 1990 \},\n  pro: \{ usd: 3990 \},/.test(cp))
checa('ANNUAL = 9900 / 19900 / 39900', /starter: \{ usd: 9900 \},\n  basic: \{ usd: 19900 \},\n  pro: \{ usd: 39900 \},/.test(cp))
checa('INTRO = preço cheio (990 / 1990)', /starter: \{ usd: 990 \},\n  basic: \{ usd: 1990 \},\n\}/.test(cp))
checa('créditos dos planos intactos (60/150/300)', /starter: 60,\n  basic: 150,\n  pro: 300,/.test(cp))

console.log('== 2. entrada grátis de 30 ==')
checa('CARD_ENTRY_ONLY = false', /export const CARD_ENTRY_ONLY = false/.test(ep))
checa('FREE_ENTRY_CREDITS = 30 (entryPolicy)', /export const FREE_ENTRY_CREDITS = 30/.test(ep))
checa('TRIAL_CREDIT_CAP = 30 (reverseTrial)', /export const TRIAL_CREDIT_CAP = 30/.test(rt))
checa('TRIAL_GRANT_CREDITS_COPY = 30 (freeTierOffer)', /export const TRIAL_GRANT_CREDITS_COPY = 30/.test(fo))
checa('CARD_ENTRY_COPY vira a copy grátis quando a versão B está desligada', /export const CARD_ENTRY_COPY = CARD_ENTRY_ONLY \? CARD_ENTRY_COPY_V_B : FREE_ENTRY_COPY/.test(ep) && /ctaShort: 'Start free'/.test(ep))
checa('caminho de entrada é o cadastro, não o checkout', /CARD_ENTRY_CHECKOUT_PATH = CARD_ENTRY_ONLY \? CARD_ENTRY_CHECKOUT_PATH_V_B : \('\/signup\?intent_campaign=free_entry' as const\)/.test(ep))

console.log('== 3. o $1 morreu ==')
checa('CARD_TRIAL_LIVE = false na fonte única', /export const CARD_TRIAL_LIVE = false/.test(cp))
checa('cobrador lê a fonte (CARD_TRIAL_ENABLED = CARD_TRIAL_LIVE)', /const CARD_TRIAL_ENABLED = CARD_TRIAL_LIVE/.test(ck) && /^\s+CARD_TRIAL_LIVE,$/m.test(ck))
checa('núcleo das portas: TRIAL_DOOR_LIVE = false, espelho do CARD_TRIAL_LIVE', /export const TRIAL_DOOR_LIVE = false/.test(door) && /if \(!TRIAL_DOOR_LIVE\) \{\n    return \{ visible: false, reason: 'retired'/.test(door))
checa('pricing: botão do $1 gateado', /const CARD_TRIAL_LINK_ENABLED = CARD_TRIAL_LIVE/.test(rd('app/pricing/PricingClient.tsx')) && /planSwitch\.subscribed \|\| !CARD_TRIAL_LIVE \? null/.test(rd('components/PricingCards.tsx')))
checa('oferta pós-filme (history/go) e e-mail de entrega leem CARD_TRIAL_LIVE', /if \(!CARD_TRIAL_LIVE\) return false/.test(rd('lib/growth/postFilmCreatorOffer.ts')) && /if \(!CARD_TRIAL_LIVE\) return null/.test(rd('lib/lifecycle/videoReadyFooter.ts')))
checa('porta do bloqueio (CardEntryDoor) só abre com CARD_TRIAL_LIVE', /const cardEntryCohort =\n      CARD_TRIAL_LIVE &&/.test(rd('app/(dashboard)/generate/GenerateClient.tsx')))

console.log('== 4. todo motor aberto ==')
checa("ENGINE_GATE_SINCE no futuro ('2099-...')", /export const ENGINE_GATE_SINCE = '2099-01-01T00:00:00\.000Z'/.test(gate))

console.log('== 5. nenhuma página pública fala em $1 ==')
{
  const alvos = []
  const anda = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const st = statSync(p); if (st.isDirectory()) { if (!/node_modules|\.next|admin$|^api$/.test(n)) anda(p) } else if (/\.tsx?$/.test(n)) alvos.push(p) } }
  anda(join(RAIZ, 'app')); anda(join(RAIZ, 'components'))
  const ruins = []
  for (const p of alvos) {
    if (/app[\\/]api[\\/]|app[\\/]admin[\\/]|checkout[\\/]cancelled|llms\.txt/.test(p)) continue
    const s = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '') // fora blocos de comentário (JSX e TS)
      .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l) && !/CARD_ENTRY_ONLY \?|noCardRequired \?/.test(l)).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n') // fora comentários de linha e ramos mortos da versão B
    if (/\$1 trial|7 days for \$1|for \$1\b|\$1 for 7|80 credits|There is no free tier|\$1 trial required/.test(s)) ruins.push(p.replace(RAIZ, ''))
  }
  checa('0 páginas/componentes vivos com "$1 trial", "7 days for $1", "80 credits": ' + (ruins.length ? ruins.join(', ') : 'nenhum'), ruins.length === 0)
}

console.log('== 6. /ph e o kit do PH ==')
const ph = rd('app/ph/page.tsx')
checa('/ph: CTA vai para o cadastro com utm do PH', /const CTA = '\/signup\?utm_source=producthunt[^']*intent_campaign=ph_sep10'/.test(ph) && !/trial=1'/.test(ph))
checa('/ph: letra miúda fala em créditos grátis, não em $1', /\{FREE_ENTRY_CREDITS\} credits free · every engine unlocked · no card/.test(ph) && !/Is the \$1 real\?/.test(ph))
const kit = rd('docs/ph/PH-TEXTOS-2026-09-10.md')
checa('kit do PH: sem "$1 for 7 days", com "Free to start"', !/\$1 for 7 days/.test(kit) && /Free to start, 30 credits, no card/.test(kit))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — restauração: V5 na fonte, entrada grátis de 30, $1 morto, motores abertos, copy limpa')
