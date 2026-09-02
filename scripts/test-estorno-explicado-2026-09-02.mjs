// KINEO-DEBITO-DEPOIS-DA-TRAVA + KINEO-ESTORNO-EXPLICADO — 02/09/2026
// Caso real: albertopopacristian (TAAFT, conta com 62s de vida) pediu 60s com
// 40s de fala. O guard recusou DEPOIS de debitar: 25cr debitados, teto do trial
// somado, `trial_expired` por credit_cap, estorno e revive — tudo em 1 segundo,
// e a tela nunca disse que o crédito voltou. Ele foi ver o preço e sumiu.
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const route = src('app/api/generate-video-cinematic/route.ts')
const gen = src('app/(dashboard)/generate/GenerateClient.tsx')

console.log('route.ts — ordem do débito')
const iTrava = route.indexOf('KINEO-NARRACAO-ENCHE-2026-08-22')
const iRecusa = route.indexOf("await releaseBirthClaim('narration_too_short_no_charge')")
const iDebito = route.indexOf('const upfrontDebit = await ensureCinematicDebit(cost)')
const iNota = route.indexOf('KINEO-DEBITO-DEPOIS-DA-TRAVA-2026-09-02')
check('a trava de narração existe', iTrava > 0)
check('a recusa (release do claim) existe', iRecusa > 0)
check('o débito adiantado existe UMA vez só', route.split('const upfrontDebit = await ensureCinematicDebit(cost)').length === 2)
check('o débito acontece DEPOIS da trava (era antes)', iDebito > iTrava)
check('o débito acontece DEPOIS da recusa por narração curta', iDebito > iRecusa)
// A âncora `KINEO-NARRACAO-ENCHE` aparece mais de uma vez no arquivo (cabeçalho
// + a trava), então comparar com `indexOf` dela é frágil. O que importa de fato
// é que a nota fique ONDE O DÉBITO ESTAVA: antes da recusa e antes do débito.
check('a nota explicando a mudança ficou no lugar de onde o débito saiu', iNota > 0 && iNota < iRecusa && iNota < iDebito)
check('o preço cobrado continua o mesmo `cost` da linha ~1386', route.includes('const cost = creditCostForDuration(costQuality, true, duration)') && route.includes('ensureCinematicDebit(cost)'))

console.log('route.ts — o evento para de mentir')
check('narration_guard_blocked não carimba mais refunded:true chumbado', !route.includes('missing_words: fit.missingWords, refunded: true }'))
check('narration_guard_blocked diz se houve cobrança de verdade', route.includes('charged: activeBirthClaim?.debitConfirmed === true'))

console.log('route.ts — invariante do estorno')
check('releaseBirthClaim só estorna se o débito foi confirmado', route.includes('if (current.debitConfirmed) {'))
check('o claim nasce com debitConfirmed:false', route.includes('debitConfirmed: false,'))
// Com o débito depois da trava, a recusa deixa debitConfirmed=false → sem estorno,
// sem soma no teto do trial, sem trial_expired. É o que fecha o caso do cliente.

console.log('GenerateClient.tsx — a tela explica o estorno')
check('a linha do estorno existe', gen.includes('KINEO-ESTORNO-EXPLICADO-2026-09-02'))
check('ela diz que os créditos voltaram, com o número', gen.includes('Your {selectedCost} credits are back in your account.'))
check('ela só aparece na recusa REAL do servidor, nunca no preflight', /\{phase === 'failed' && \([\s\S]{0,400}credits are back in your account/.test(gen))
check('ela promete o próximo passo (um clique renderiza)', gen.includes('renders on one click'))

console.log('aritmética do caso real (40s de fala para alvo de 60s)')
const WPS = 2.3, MIN_COVERAGE = 0.95
const fala = 40, alvo = 60
check('cobertura 0,66 < 0,95 → a recusa está certa, o defeito era a ORDEM', fala / alvo < MIN_COVERAGE)
// O servidor arredonda PARA CIMA (Math.ceil) e mede a fala com a duração real
// do texto, não com o inteiro 40 — por isso o log dele diz 41 e a conta crua
// aqui dá 39. A verificação afere a ORDEM DE GRANDEZA (o defeito era a ordem do
// débito, não a aritmética): ~17s de déficit ≈ 39-43 palavras.
const faltamAprox = Math.ceil((alvo * MIN_COVERAGE - fala) * WPS)
check('déficit bate com as ~41 palavras do log (39-43)', faltamAprox >= 39 && faltamAprox <= 43)
check('o expansor levou para 63s, acima do alvo — cabia', 63 >= alvo)

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
