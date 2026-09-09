/**
 * KINEO-SPRINT-FRIO-2026-09-09 r3 — guardiao da promessa de $1 no cadastro.
 *
 * Nao se contenta em casar texto: EXTRAI readColdTrialPromise() do modulo e a
 * EXECUTA contra URLs reais, usando a normalizeInternalRedirect() de verdade
 * extraida de lib/authRedirect.ts. Guardiao que so conta string fica verde com
 * o mutante que troca a condicao central por `true`.
 *
 * Estilo readFileSync sem imports de '@/': guardiao com alias morre no import
 * antes da primeira verificacao e passa a vida em falso verde.
 */
import { readFileSync } from 'node:fs'

let ok = 0
const falhas = []
function check(nome, condicao) {
  if (condicao) ok++
  else falhas.push(nome)
}

const MOD = readFileSync('lib/growth/coldTrafficTrialPromise.ts', 'utf8')
const SIGNUP = readFileSync('app/(auth)/signup/page.tsx', 'utf8')
const ENTRY = readFileSync('lib/entryPolicy.ts', 'utf8')
const REDIRECT = readFileSync('lib/authRedirect.ts', 'utf8')

// ---------------------------------------------------------------- premissas
check('entryPolicy ainda exporta CARD_ENTRY_COPY', /export const CARD_ENTRY_COPY\s*=/.test(ENTRY))
const chipDaFonte = (ENTRY.match(/chip:\s*'([^']+)'/) || [])[1]
const ctaLongDaFonte = (ENTRY.match(/ctaLong:\s*'([^']+)'/) || [])[1]
const sentenceDaFonte = (ENTRY.match(/sentence:\s*\n?\s*'([^']+)'/) || [])[1]
check('entryPolicy tem chip', typeof chipDaFonte === 'string' && chipDaFonte.length > 5)
check('entryPolicy tem ctaLong', typeof ctaLongDaFonte === 'string' && ctaLongDaFonte.length > 5)
check('entryPolicy tem sentence', typeof sentenceDaFonte === 'string' && sentenceDaFonte.length > 20)

// ------------------------------------------------- fonte unica, nao literal
// O modulo NUNCA pode digitar preco, prazo ou credito a mao: preco publico e
// decisao do fundador e mora em entryPolicy/checkoutPricing.
const corpoDoModulo = MOD.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
check('modulo nao digita o preco a mao', !/\$1\b/.test(corpoDoModulo))
check('modulo nao digita o prazo a mao', !/7\s*days/i.test(corpoDoModulo))
check('modulo nao digita os creditos a mao', !/\b80\b/.test(corpoDoModulo))
check('modulo importa CARD_ENTRY_COPY de entryPolicy',
  /import\s*\{[^}]*CARD_ENTRY_COPY[^}]*\}\s*from\s*'@\/lib\/entryPolicy'/.test(MOD))
check('modulo importa normalizeInternalRedirect',
  /import\s*\{\s*normalizeInternalRedirect\s*\}\s*from\s*'@\/lib\/authRedirect'/.test(MOD))

// ------------------------------------------------------ execucao de verdade
function extrair(fonte, nome) {
  const i = fonte.indexOf('export function ' + nome + '(')
  if (i < 0) return null
  let j = fonte.indexOf('{', i)
  let nivel = 0
  for (let k = j; k < fonte.length; k++) {
    if (fonte[k] === '{') nivel++
    else if (fonte[k] === '}') { nivel--; if (nivel === 0) { j = k; break } }
  }
  return fonte.slice(i, j + 1).replace(/^export /, '')
}

const fonteRedirect = extrair(REDIRECT, 'normalizeInternalRedirect')
const fontePromessa = extrair(MOD, 'readColdTrialPromise')
check('normalizeInternalRedirect extraida', !!fonteRedirect)
check('readColdTrialPromise extraida', !!fontePromessa)

const baseReal = (REDIRECT.match(/const AUTH_REDIRECT_BASE\s*=\s*'([^']+)'/) || [])[1]
check('base do authRedirect lida do arquivo', baseReal === 'https://kineo.local')

let readColdTrialPromise = null
if (fonteRedirect && fontePromessa && baseReal) {
  const limpar = (t) => t
    .replace(/:\s*string\s*\|\s*null\s*\|\s*undefined/g, '')
    .replace(/\)\s*:\s*[A-Za-z<>|\s.]+\s*\{/g, ') {')
    .replace(/:\s*string\s*\|\s*null/g, '')
  const versao = (MOD.match(/COLD_TRIAL_PROMISE_VERSION\s*=\s*'([^']+)'/) || [])[1] || ''
  const caminho = (MOD.match(/const CHECKOUT_PATH\s*=\s*(\/.+\/)\s*$/m) || [])[1]
  check('CHECKOUT_PATH lido do modulo', !!caminho)
  const bounded = (MOD.match(/function boundedCategory[\s\S]*?\n\}/) || [''])[0]
    .replace(/:\s*string\s*\|\s*null/g, '')
  const preludio = [
    'const AUTH_REDIRECT_BASE = ' + JSON.stringify(baseReal),
    'const CARD_ENTRY_COPY = ' + JSON.stringify({
      chip: chipDaFonte,
      sentence: sentenceDaFonte,
      ctaLong: ctaLongDaFonte,
    }),
    'const COLD_TRIAL_PROMISE_VERSION = ' + JSON.stringify(versao),
    'const CHECKOUT_PATH = ' + caminho,
    bounded,
  ].join('\n')
  try {
    readColdTrialPromise = new Function(
      preludio + '\n' + limpar(fonteRedirect) + '\n' + limpar(fontePromessa)
      + '\nreturn readColdTrialPromise'
    )()
  } catch (e) {
    falhas.push('nao executou o modulo extraido: ' + e.message)
  }
}

if (readColdTrialPromise) {
  const PH = '/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=ph_sep10&resumed=1'
  const casos = [
    ['CTA real da /ph devolve promessa', PH, true],
    ['checkout SEM trial fecha', '/api/stripe/checkout?tier=basic&billing=monthly', false],
    ['trial=0 fecha', '/api/stripe/checkout?tier=basic&billing=monthly&trial=0', false],
    ['trial=true (nao "1") fecha', '/api/stripe/checkout?tier=basic&trial=true', false],
    ['pagina comum fecha', '/studio?trial=1', false],
    ['destino externo fecha', '//evil.example/api/stripe/checkout?trial=1', false],
    ['destino nulo fecha', null, false],
    ['paypal com trial abre', '/api/paypal/checkout?tier=basic&billing=monthly&trial=1', true],
  ]
  for (const caso of casos) {
    const r = readColdTrialPromise(caso[1])
    check(caso[0], caso[2] ? !!r : r === null)
  }

  const p = readColdTrialPromise(PH)
  check('promessa usa o chip da fonte unica', !!p && p.chip === chipDaFonte)
  check('promessa usa o cta da fonte unica', !!p && p.cta === ctaLongDaFonte)
  check('promessa usa a sentence da fonte unica', !!p && p.sentence === sentenceDaFonte)
  check('promessa carrega a campanha do PH', !!p && p.campaign === 'ph_sep10')
  check('promessa carimba versao', !!p && typeof p.version === 'string' && p.version.length > 3)

  const sujo = readColdTrialPromise(
    '/api/stripe/checkout?trial=1&intent_campaign=' + encodeURIComponent('a b/c')
  )
  check('campanha invalida vira null sem matar a promessa', !!sujo && sujo.campaign === null)
}

// --------------------------------------------------- fiacao na tela real
check('signup importa readColdTrialPromise',
  /import\s*\{[\s\S]{0,160}readColdTrialPromise[\s\S]{0,160}\}\s*from\s*'@\/lib\/growth\/coldTrafficTrialPromise'/.test(SIGNUP))
check('signup calcula trialPromise a partir do destino preservado',
  /const trialPromise = useMemo\([\s\S]{0,90}isCheckoutResume \? readColdTrialPromise\(activationRedirect\) : null/.test(SIGNUP))
check('promessa tem selo proprio',
  /data-testid="cold-trial-promise-chip"/.test(SIGNUP) && /\{trialPromise\.chip\}/.test(SIGNUP))
check('selo da promessa so aparece com trial',
  /isCheckoutResume && trialPromise && !bulkCheckoutContext/.test(SIGNUP))
// A trava de test-checkout-signup-resolution exige este literal, e ela esta
// certa: quem escolheu um plano continua vendo o plano. A promessa SOMA, nao
// substitui — se alguem trocar o selo do plano por um ternario, os dois
// guardioes tem que gritar.
check('selo do plano segue intacto ao lado', /\{checkoutChoice\.summary\}/.test(SIGNUP))
check('subtitulo mostra a promessa',
  /trialPromise\?\.sentence \?\? checkoutChoice\?\.continuity/.test(SIGNUP))
check('botao mostra a promessa',
  /trialPromise\?\.cta \?\? checkoutChoice\?\.button/.test(SIGNUP))
check('overlay do Google carrega a promessa',
  /data-testid="cold-trial-promise-oauth"/.test(SIGNUP) && /\{trialPromise\.chip\}/.test(SIGNUP))
check('overlay so renderiza a promessa quando ela existe', /\{trialPromise && \(/.test(SIGNUP))
check('sonda cold_trial_promise_shown emitida',
  /trackEvent\('cold_trial_promise_shown', coldTrialPromiseTelemetry\(trialPromise, 'signup_page'\)\)/.test(SIGNUP))
check('sonda tem dedupe por navegacao', /kineo_cold_trial_promise:/.test(SIGNUP))

// A premissa que faz o overlay ser a tela principal desta gente: se o autostart
// sumir, a decisao de por a promessa la precisa ser revista.
check('autostart do Google ainda existe (premissa da medicao)',
  /signInWithOAuth\(\{ provider: 'google'/.test(SIGNUP)
  && /selection_kind/.test(readFileSync('lib/authAnalytics.ts', 'utf8')))

console.log(ok + ' verificacoes OK')
if (falhas.length) {
  console.error(falhas.length + ' FALHAS:')
  for (const f of falhas) console.error('  - ' + f)
  process.exit(1)
}
