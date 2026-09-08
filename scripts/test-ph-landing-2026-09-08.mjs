// KINEO-PH-2026-09-10 — guardião da página de pouso do Product Hunt (/ph).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const page = rd('app/ph/page.tsx')
const semComentario = page.replace(/\/\/[^\n]*/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
checa('CTA é o trial do Creator com a campanha do lançamento', /tier=basic&billing=monthly&trial=1&intent_campaign=ph_sep10/.test(page))
checa('dois CTAs (topo e rodapé) com data-testid', /data-testid="ph-cta-trial"/.test(page) && /data-testid="ph-cta-trial-bottom"/.test(page))
checa('preços pela fonte única, nunca digitados', /TIER_PRICES\.starter\.usd/.test(page) && /TIER_PRICES\.basic\.usd/.test(page) && /TIER_PRICES\.pro\.usd/.test(page) && !/\$(7|15|9|19|29)\b/.test(semComentario))
checa('trial pela fonte única ($1 = usd(100), dias e créditos)', /CARD_TRIAL_DAYS/.test(page) && /CARD_TRIAL_GRANT_CREDITS/.test(page) && /usd\(100\)/.test(page))
checa('copy da porta pela política (ctaLong, noFreeTier)', /CARD_ENTRY_COPY\.ctaLong/.test(page) && /CARD_ENTRY_COPY\.noFreeTier/.test(page))
checa('galeria = os 12 filmes do fundador com o motor real', /FOUNDER_SHOWCASE\.slice\(0, 12\)/.test(page) && /engineLabel\(v\.engine\)/.test(page))
checa('sem número inventado (filmes/pagantes) na página', !/1,6\d\d\+? films|paying creators/.test(semComentario))
checa('noindex (é pouso de campanha, não página de SEO)', /robots: \{ index: false/.test(page))
checa('estática (aguenta pico do dia)', /export const dynamic = 'force-static'/.test(page))
checa('sinal de impressão com utm (placar por pessoa)', /<PhLandingBeacon \/>/.test(page) && /ph_landing_shown/.test(rd('components/PhLandingBeacon.tsx')))
checa('FAQ diz que não há free tier e que o $1 é real', /Is there a free tier\?/.test(page) && /Is the \$1 real\?/.test(page))
checa('não promete 3 minutos para motores cinematográficos', /cinematic engines \(Kling 3, Veo 3\.1\) take longer/.test(page))
const robot = page.match(/const ROBOT = '([^']+)'/)?.[1]
const poster = page.match(/const ROBOT_POSTER = '([^']+)'/)?.[1]
checa('robô do Omni e poster existem em public/', Boolean(robot && poster) && existsSync(join(RAIZ, 'public', robot)) && existsSync(join(RAIZ, 'public', poster)))
const posters = [...rd('lib/publicExamples.ts').matchAll(/posterPath: '([^']+)'/g)].map((m) => m[1])
checa('todos os posters da vitrine existem', posters.length >= 12 && posters.every((p) => existsSync(join(RAIZ, 'public', p))))

const beacon = rd('components/PhLandingBeacon.tsx')
checa('tráfego pago: utm_campaign na URL vira intent_campaign do CTA (Reddit ≠ PH no checkout)', beacon.includes("u.searchParams.set('intent_campaign', campaign)") && beacon.includes('a[data-testid^="ph-cta-trial"]') && beacon.includes('CAMPAIGN_OK.test(campaign)'))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — /ph pronta: porta de $1 na frente, preços pela fonte única, vitrine do fundador')
