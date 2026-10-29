// KINEO-VERSAO-COMPLETA-K4-2910 — a versão completa pós-compra sai em Kling 4.0 quando a promo do assinante está confirmada.
// Guardião de fonte: a decisão é lida do servidor, gravada uma vez, enviada com kling4_expect_promo (a rota recusa sem cobrar)
// e, na recusa 409, a próxima tentativa volta ao Seedance com roteiro novo.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const src = readFileSync(new URL('../lib/filmComplete/server.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/generate-video-cinematic/route.ts', import.meta.url), 'utf8')
const checks = [
  ['motor do Kling 4.0 = hollywood, 30 s (durações do pago: 15/30/60)', /FILM_COMPLETE_KLING4_ENGINE = 'hollywood'/.test(src) && /FILM_COMPLETE_KLING4_SECONDS = 30\b/.test(src)],
  ['promo lida no servidor (readKling4PaidAvailability: paidLive && promoAvailable)', /readKling4PaidAvailability\(db, \{ userId, seconds: FILM_COMPLETE_KLING4_SECONDS/.test(src) && /a\.paidLive && a\.promoAvailable/.test(src)],
  ['decisão gravada uma vez e reusada (dispatch_engine/dispatch_seconds)', /next\.dispatch_engine = engine/.test(src) && /const savedEngine = text\(intent\.metadata\.dispatch_engine\)/.test(src)],
  ['roteiro e despacho usam o mesmo motor e duração', /targetSeconds: seconds, engine, forceAuthoring: true/.test(src) && /engine, duration: seconds, \.\.\.\(useKling4 \? \{ kling4_expect_promo: true \} : \{\}\)/.test(src)],
  ['recusa 409 sem cobrança → próxima tentativa em Seedance com roteiro novo', /useKling4 && response\.status === 409 && result\.charged === false/.test(src) && /dispatch_prompt: '', dispatch_engine: FILM_COMPLETE_ENGINE/.test(src)],
  ['a rota cinematográfica recusa sem cobrar quando kling4_expect_promo e a promo não está livre', /kling4_expect_promo === true && !paidKling4Promo\?\.isFree/.test(route) && /charged: false/.test(route)],
  ['sem io.kling4Free (testes antigos) = Seedance', /!dispatchPrompt && io\.kling4Free \? await io\.kling4Free\(db, intent\.userId\) : false/.test(src)],
]
let ok = 0
for (const [name, pass] of checks) { assert.ok(pass, name); ok++; console.log(`ok  ${name}`) }
console.log(`versao-completa-k4: ${ok}/${checks.length}`)
