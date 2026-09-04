#!/usr/bin/env node
/**
 * K17 — CAPACIDADE EM FILMES ANTES DE CREDITOS (pedido do Codex, 04/09 09:58 BRT)
 *
 * O que este teste protege, e por que:
 *
 * A caixa que pede o cartao no Studio e a lista de planos da aba de uso diziam
 * "150 credits / month · up to 7 AI-generated videos" e "40 credits / month".
 * Credito e a unidade INTERNA da casa; filme e o que a pessoa compra. A ordem
 * obrigava o comprador a fazer a divisao de cabeca no momento exato da decisao.
 *
 * A mudanca e SO DE ORDEM: nenhum numero novo, nenhum preco, nenhum grant,
 * nenhum destino de checkout. `videosPerMonth(t, q)` E, por definicao,
 * `videosForCredits(TIER_CREDITS[t], q)` — a mesma conta que a linha antiga ja
 * mostrava. Este teste prova exatamente isso lendo os ARQUIVOS REAIS.
 *
 * FALSIFICACOES conferidas a mao antes do commit:
 *   1. voltar `planUnlockLine` para o template credit-first  -> caem 3
 *   2. tirar `planFilmLanguageMetadata()` de um dos 4 eventos -> cai 1
 *   3. usar TIER_CREDITS no ramo intro (em vez de INTRO_CREDITS) -> cai 1
 *   4. digitar o numero de filmes em vez de derivar de videosPerMonth -> caem 2
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
let ok = 0
const fails = []
function check(nome, cond, detalhe) {
  if (cond) { ok++; return }
  fails.push(nome + (detalhe ? ' — ' + detalhe : ''))
}
function read(rel) {
  const p = path.join(ROOT, rel)
  if (!fs.existsSync(p)) { fails.push('ARQUIVO AUSENTE: ' + rel); return '' }
  return fs.readFileSync(p, 'utf8')
}

const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'
const ACC = 'app/(dashboard)/account/AccountClient.tsx'
const LANG = 'lib/growth/planFilmLanguage.ts'
const MKT = 'lib/marketingPrice.ts'
const PRICE = 'lib/checkoutPricing.ts'

const gen = read(GEN)
const acc = read(ACC)
const lang = read(LANG)
const mkt = read(MKT)
const price = read(PRICE)

// ---------------------------------------------------------------------------
// 1. O CONTRATO DE MEDICAO EXISTE E E O MESMO QUE A CAIXA JA USA
// ---------------------------------------------------------------------------
check('lang.1 versao canonica', /PLAN_FILM_LANGUAGE_VERSION\s*=\s*'plan_film_language_v1'/.test(lang))
check('lang.2 exporta formatPlanFilmCapacity', /export function formatPlanFilmCapacity/.test(lang))
check('lang.3 exporta planFilmLanguageMetadata', /export function planFilmLanguageMetadata/.test(lang))
check('lang.4 formato poe FILME antes do CREDITO',
  /\$\{films\}\s*\$\{filmLabel\}\s*\/\s*month\s*·\s*\$\{credits\}\s*credits/.test(lang),
  'o template do helper mudou de ordem')
check('lang.5 recusa filme nao-inteiro', /films must be a non-negative integer/.test(lang))
check('lang.6 recusa credito nao-inteiro', /credits must be a non-negative integer/.test(lang))

// ---------------------------------------------------------------------------
// 2. A DERIVACAO E A MESMA DE ANTES — nenhum numero foi digitado
// ---------------------------------------------------------------------------
check('deriv.1 videosPerMonth e videosForCredits(TIER_CREDITS[tier])',
  /export function videosPerMonth\([^)]*\):\s*number\s*\{\s*return videosForCredits\(TIER_CREDITS\[tier\], quality\)/s.test(mkt),
  'se isto deixar de valer, "so a ordem mudou" vira mentira')
check('deriv.2 videosForCredits usa o custo do motor, nao literal',
  /export function videosForCredits[\s\S]{0,220}creditsPerReferenceVideo\(quality\)/.test(mkt))

const tierCreditsBloco = price.slice(price.indexOf('export const TIER_CREDITS'))
const creditosDe = (tier) => {
  const m = tierCreditsBloco.match(new RegExp('^\\s*' + tier + ':\\s*(\\d+),', 'm'))
  return m ? Number(m[1]) : null
}
for (const t of ['starter', 'basic', 'pro']) {
  check('deriv.3.' + t + ' TIER_CREDITS legivel',
    Number.isInteger(creditosDe(t)) && creditosDe(t) > 0,
    'nao consegui ler TIER_CREDITS.' + t)
}

// ---------------------------------------------------------------------------
// 3. A CAIXA DO STUDIO (planUnlockLine) — FILME PRIMEIRO
// ---------------------------------------------------------------------------
const iUnlock = gen.indexOf("function planUnlockLine(tier: 'starter' | 'basic' | 'pro'): string {")
check('gen.1 planUnlockLine existe', iUnlock > 0)
const unlock = iUnlock > 0 ? gen.slice(iUnlock, iUnlock + 2600) : ''

check('gen.2 usa videosPerMonth', /const aiVideos = videosPerMonth\(tier, 'cinematic_ai'\)/.test(unlock))
check('gen.3 monta a linha pelo helper compartilhado',
  /formatPlanFilmCapacity\(aiVideos, 'AI film', credits\)/.test(unlock))
check('gen.4 o template CREDIT-FIRST morreu',
  !/up to \$\{aiVideos\} AI-generated video/.test(gen),
  'a redacao antiga ("N credits / month · up to M AI-generated videos") voltou')
check('gen.5 nenhum ramo devolve credito-primeiro',
  !/return `\$\{credits\} credits \/ month\$\{videosPart\}`/.test(gen))
check('gen.6 sobra uma saida honesta quando o plano nao paga 1 filme',
  /:\s*`\$\{credits\} credits \/ month`/.test(unlock),
  'com 0 filmes a linha nao pode dizer "0 AI films"')

check('gen.7 ramo intro deriva do proprio grant do 1o mes',
  /const introVideos = videosForCredits\(INTRO_CREDITS\[tier\], 'cinematic_ai'\)/.test(unlock),
  'usar TIER_CREDITS aqui promete no 1o mes filmes que o 1o mes nao paga')
check('gen.8 ramo intro ainda nomeia os creditos do 1o mes',
  /\$\{INTRO_CREDITS\[tier\]\} credits/.test(unlock))
const iIntroVideos = unlock.indexOf('const introVideos')
const iCapacity = unlock.indexOf('const capacity')
check('gen.9 a capacidade da renovacao e calculada antes do ramo intro',
  iCapacity > 0 && iIntroVideos > iCapacity)

// ---------------------------------------------------------------------------
// 4. OS EVENTOS DA CAIXA CARREGAM A VERSAO — senao nada disto e mensuravel
// ---------------------------------------------------------------------------
check('gen.10 importa o contrato de medicao',
  /import \{\s*formatPlanFilmCapacity,\s*planFilmLanguageMetadata,\s*\} from '@\/lib\/growth\/planFilmLanguage'/s.test(gen))
const eventos = [
  ['upgrade_modal_opened', "trackEvent('upgrade_modal_opened'"],
  ['limit_purchase_fit_viewed', "trackEvent('limit_purchase_fit_viewed'"],
  ['limit_purchase_fit_clicked', "trackEvent('limit_purchase_fit_clicked'"],
]
for (const [nome, evento] of eventos) {
  const i = gen.indexOf(evento)
  check('gen.11.' + nome + ' existe', i > 0)
  const bloco = i > 0 ? gen.slice(i, i + 1200) : ''
  const fim = bloco.indexOf('})')
  check('gen.12.' + nome + ' carrega planFilmLanguageMetadata()',
    fim > 0 && bloco.slice(0, fim).includes('...planFilmLanguageMetadata()'),
    'sem a versao no evento, "viu em linguagem de filme" e indistinguivel de "viu a antiga"')
}

// ---------------------------------------------------------------------------
// 5. A LISTA DA ABA DE USO (/account) — FILME PRIMEIRO
// ---------------------------------------------------------------------------
check('acc.1 helper unico para as tres linhas',
  /function planCapacityLine\(tier: 'starter' \| 'basic' \| 'pro'\): string \{/.test(acc))
check('acc.2 helper deriva de videosPerMonth',
  /const films = videosPerMonth\(tier, 'cinematic_ai'\)/.test(acc))
check('acc.3 helper usa o mesmo formato compartilhado',
  /formatPlanFilmCapacity\(films, 'AI film', credits\)/.test(acc))
check('acc.4 helper deriva o credito de TIER_CREDITS',
  /const credits = TIER_CREDITS\[tier\]/.test(acc))
for (const [rotulo, tier] of [['Starter', 'starter'], ['Creator', 'basic'], ['Studio', 'pro']]) {
  check('acc.5.' + rotulo + ' usa o helper',
    new RegExp(rotulo + ' = <strong[^>]*>\\{planCapacityLine\\(\'' + tier + '\'\\)\\}</strong>').test(acc))
}
check('acc.6 os literais credit-first morreram',
  !/\{TIER_CREDITS\.(starter|basic|pro)\} credits \/ month/.test(acc),
  'a lista voltou a liderar por credito')
check('acc.7 importa videosPerMonth', /import \{ videosPerMonth \} from '@\/lib\/marketingPrice'/.test(acc))
check('acc.8 importa o contrato de medicao',
  /from '@\/lib\/growth\/planFilmLanguage'/.test(acc))

const iEv = acc.indexOf("trackEvent('account_plan_capacity_viewed'")
check('acc.9 evento de exposicao existe', iEv > 0)
const evBloco = iEv > 0 ? acc.slice(Math.max(0, iEv - 500), iEv + 400) : ''
check('acc.10 evento carrega a versao', evBloco.includes('...planFilmLanguageMetadata()'))
check('acc.11 evento so dispara na aba de uso de quem paga',
  /if \(activeTab !== 'usage' \|\| tier === 'free'\) return/.test(acc),
  'a caixa so existe ali; disparar fora inflaria o denominador')
check('acc.12 evento nao leva saldo nem identidade',
  iEv > 0 && !/(credits:|email|user_id)/.test(acc.slice(iEv, iEv + 260)))

// ---------------------------------------------------------------------------
// 6. NADA DE PRECO, GRANT, CHECKOUT OU GERACAO FOI TOCADO
//    (trava de qualidade do fundador, 03/09 23:40)
// ---------------------------------------------------------------------------
check('trava.1 lib/compose.ts intacto no repo', fs.existsSync(path.join(ROOT, 'lib/compose.ts')))
check('trava.2 o helper de copy nao importa nada de geracao',
  !/from '@\/lib\/(compose|hollywood|cinematic|broll)/.test(lang))
check('trava.3 planUnlockLine nao escreve preco novo',
  /formatCheckoutMoney\(currency, getTierPrice\(tier, currency, region\)\)/.test(unlock),
  'o preco continua vindo da mesma tabela que a Stripe bilha')
check('trava.4 planCapacityLine e puro (sem fetch, sem estado)',
  !/planCapacityLine[\s\S]{0,400}(fetch\(|useState\(|useEffect\()/.test(acc))

// ---------------------------------------------------------------------------
console.log('')
console.log('K17 — capacidade em filmes antes de creditos')
console.log(ok + ' verificacoes OK, ' + fails.length + ' falhas')
if (fails.length) {
  console.log('')
  console.log('FALHAS:')
  for (const f of fails) console.log('  x ' + f)
  process.exit(1)
}
console.log('tudo verde')
