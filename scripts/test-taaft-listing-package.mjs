#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
const read = file => fs.readFileSync(file, 'utf8')
const listing = read('docs/TAAFT-LISTING-2026-09-03.md')
const entry = read('lib/entryPolicy.ts')
const trial = read('lib/reverseTrial.ts')
const pricing = read('lib/checkoutPricing.ts')
const engines = read('lib/engineLaunch.ts')
const ready = listing.split('## 2. Texto pronto para colar')[1]?.split('## 3. As três capturas')[0] ?? ''
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks += 1 }
const number = (text, regex) => { const m = text.match(regex); assert.ok(m, String(regex)); return Number(m[1]) }
const credits = number(entry, /export const FREE_ENTRY_CREDITS = (\d+)/)
const cap = number(trial, /export const TRIAL_CREDIT_CAP = (\d+)/)
const starter = number(pricing, /export const TIER_PRICES[\s\S]*?starter:\s*\{\s*usd:\s*(\d+)/) / 100
check(ready.length > 0, 'current paste section exists')
check(credits === cap, 'entry agrees with grant')
check(/CARD_ENTRY_ONLY\s*=\s*false/.test(entry), 'no-card entry active')
check(ready.includes(credits + ' credits'), 'canonical grant')
check(ready.includes('$' + starter.toFixed(2) + '/month'), 'canonical price')
// KINEO-FILME-GRATIS-15S-2026-09-29 — reancorado com motivo: o filme grátis passou a ser o Seedance 1.5 de 15 s (7 cr ≤ 10); a ficha não cita mais o Kineo 1.
for (const text of ['USD','Free to start','no card','10 credits, no card = one free 15-second Seedance film',
 'watermarked','engine and duration','available engine','account access','sufficient credits']) {
 check(ready.includes(text), 'current copy carries: ' + text)
}
for (const stale of ['30 credits','40 credits','50 credits','25 free credits',
 'from $14/month','$7/month','$1 trial','80 credits',
 'eight video engines','six video engines','every engine unlocked','every engine on every plan',
 'Studio unlocks every engine','Starter and Creator include','first film is premium',
 'first film is free and premium','Seedance free','free Seedance','Avatar',
 'MiniMax H3','Omni Flash','Seedance 2.5','Kineo 1','two Kineo 1','every week']) {
 check(!ready.toLowerCase().includes(stale.toLowerCase()), 'excludes: ' + stale)
}
for (const engine of ['Seedance 1.5','Kling 2.5','Kling 3','Veo 3.1']) {
 check(ready.includes(engine), 'current engine: ' + engine)
}
// KINEO-S25-ABRE-2026-10-06 — reancorado: o Seedance 2.5 voltou ao site (só plano pago); como o H3 em 22/09, o pacote do TAAFT
// segue SEM ele até o fundador editar a listagem lá (a exclusão de 'Seedance 2.5' acima continua valendo). Pausado: só o Omni.
check(/PAUSED_ENGINE_KEYS[^\n]*\['omni'\]/.test(engines), 'maintenance reconciled') // KINEO-H3-DE-VOLTA-2026-09-22: o H3 voltou ao site; o pacote do TAAFT segue sem o H3 até o fundador editar a listagem lá
check(listing.includes('v3.3.3') && listing.includes('histórico imutável'), 'history protected')
check(listing.includes('LOCAL') && listing.includes('validação independente DESCONHECIDA'), 'states separated')
check(!listing.includes('Generate · 20 cr'), 'no stale capture cost')
for (const url of ['https://www.usekineo.com/?utm_source=taaft&utm_medium=referral',
 'https://www.usekineo.com/studio?engine=seedance&utm_source=taaft&utm_medium=referral',
 'https://www.usekineo.com/history']) check(listing.includes(url), 'preserves URL: ' + url)
for (const marker of ['Name','Tagline','Short description','Long description','Pricing field',
 'Precisa estar visível','Não clique em Generate','não acessou o painel','checkout_success_viewed','Gate de parada']) {
 check(listing.includes(marker), 'package includes ' + marker)
}
console.log('PASS — ' + checks + '/' + checks + ' TAAFT listing-package checks')
