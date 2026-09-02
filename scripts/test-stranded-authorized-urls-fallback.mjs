// sprint-assinaturas #14 — o cron de resgate saía com `no_authorized_urls`
// com o claim cheio no banco. Verifica que o ramo agora (1) loga as 4 visões
// do claim, (2) tenta compor com a primeira que tiver URLs (o compose
// re-verifica contra o claim assinado), (3) só desiste quando NENHUMA tem.
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../app/api/cron/finish-stranded-renders/route.ts', import.meta.url), 'utf8')
let n = 0, bad = 0
const ok = (cond, msg) => { n++; if (!cond) { bad++; console.log('FAIL', msg) } }
const i = (s) => src.indexOf(s)
ok(i("outcome: 'no_authorized_urls' }") > 0, 'ramo terminal continua existindo')
ok(i('no_authorized_urls diag reload=') > 0, 'log de diagnóstico com a visão do reload')
ok(i('authorize=[') > 0 && i('batch=[') > 0 && i('fal=${fromFal.length}') > 0, 'log mostra as 4 visões')
ok(i('const fromAuthorize') > 0 && i('const fromBatchRow') > 0 && i('const fromFal') > 0, '3 fontes de fallback')
ok(i("src: 'authorize'") < i("src: 'batch_row'") && i("src: 'batch_row'") < i("src: 'fal'"), 'ordem: authorize → batch_row → fal')
ok(i('if (!fallback) { results.push({ generation: gen8, outcome: \'no_authorized_urls\' }); continue }') > 0, 'só desiste sem nenhuma fonte')
ok(i('clipUrls = fallback.urls') > 0, 'compose recebe as URLs do fallback')
ok(i("name: 'stranded_diag'") > 0, 'evento de diagnóstico separado (não mexe na contagem de outcomes do #7)')
ok(!/name: OUTCOME_EVENT[^\n]*no_authorized_urls_fallback/.test(src), 'fallback NÃO grava em stranded_outcome (teto do #7 intacto)')
// segurança: o fallback fica ANTES do payload do compose e DEPOIS do reload
ok(i('const fromAuthorize') > i('const reloaded = await loadVerifiedCinematicClaim') && i('clipUrls = fallback.urls') < i('clip_urls: clipUrls'), 'fallback entre reload e payload')
// não toca em crédito
const branch = src.slice(i('let clipUrls = onlyUrls'), i('const sceneSeconds ='))
ok(!/credit_debits|refund|video_credits|grant/i.test(branch), 'ramo não toca em crédito/estorno')
ok(!/fal\.queue|fetch\(/.test(branch), 'ramo não chama fornecedor nem rede')
// o compose continua sendo o juiz: clip_urls ainda vai para o compose que verifica inputsMatch
const compose = readFileSync(new URL('../app/api/compose/route.ts', import.meta.url), 'utf8')
ok(compose.includes('authorizedUrls.every((url, index) => url === clipUrls[index])'), 'compose ainda exige clip_urls == URLs assinadas (fallback é seguro)')
console.log(`${n - bad}/${n} verificações ok`)
process.exit(bad ? 1 : 0)
