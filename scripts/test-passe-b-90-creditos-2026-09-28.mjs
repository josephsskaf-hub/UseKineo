// KINEO-PASSE-B-2026-09-28 — guardião do passe B do fundador ("B, vai para as duas", 28/09): o passe do Studio Ads continua
// US$19,90 e passa de 60 para 90 créditos. Prova, EXECUTANDO os módulos puros e lendo as rotas por readFileSync:
//   1. offer.ts: 90 cr, 1990 c, 365 dias; continua PURO (sem import).
//   2. o espelho ADS_V2_LEVEL_PRICES_MIRROR (offer.ts) é IGUAL aos níveis derivados (v2Tiers adsV2Credits × v2Screen nomes),
//      e lib/ads/v2Levels.ts deriva do mesmo jeito (sem número digitado).
//   3. a frase do fundador sai calculada: "2 new ads (Photo motion or Commercial), 1 Cinema, or about 30 classic ads of 35 s".
//   4. o webhook concede metadata.pack_credits (o que a pessoa viu ao abrir o checkout); a constante só no fallback sem
//      pack_credits (revisão 28/09), e a chave de idempotência muda quando o crédito muda (sessão em cache não volta com 60).
//   5. superfícies: /ads (cartão e FAQ) e /pricing usam a frase calculada.
// Cada regra tem mutante que prova que o guardião fica vermelho.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let verdes = 0
const vermelhos = []
function check(nome, cond) {
  let ok = false
  try { ok = typeof cond === 'function' ? Boolean(cond()) : Boolean(cond) } catch (e) { nome += ` (lançou: ${e && e.message})` }
  if (ok) verdes++
  else vermelhos.push(nome)
}
const trocar = (src, de, para) => {
  if (!src.includes(de)) throw new Error(`mutante não aplicou: ${de.slice(0, 60)}`)
  return src.split(de).join(para)
}
const pure = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('exports', 'require', 'module', 'process', js)(module.exports, (s) => { throw new Error(`módulo puro importou ${s}`) }, module, { env: {} })
  return module.exports
}

const SRC = {
  offer: rd('lib/ads/offer.ts'),
  tiers: rd('lib/ads/v2Tiers.ts'),
  screen: rd('lib/ads/v2Screen.ts'),
  levels: rd('lib/ads/v2Levels.ts'),
  webhook: rd('app/api/stripe/webhook/route.ts'),
  checkout: rd('app/api/stripe/checkout/route.ts'),
  door: rd('app/ads/page.tsx'),
  blocks: rd('lib/growth/pricingOfferBlocks.ts'),
  adsBlock: rd('components/pricing/PricingAdsBlock.tsx'),
}
const T = pure(SRC.tiers)
const SC = pure(SRC.screen)
const derived = () => T.ADS_V2_TIER_IDS.map((id) => ({ name: SC.ADS_V2_TIER_COPY[id].name, credits: T.adsV2Credits(id, SC.ADS_V2_SCREEN_SECONDS) }))
const FRASE = '2 new ads (Photo motion or Commercial), 1 Cinema, or about 30 classic ads of 35 s'

// ── 1. números do passe ──────────────────────────────────────────────────────────────────────────────────────────────
const numeros = (src) => { const o = pure(src); return !/^import /m.test(src) && o.ADS_PASS_CREDITS === 90 && o.ADS_PASS_USD_MINOR === 1990 && o.ADS_PASS_ACCESS_DAYS === 365 }
check('1 offer.ts: 90 créditos, 1990 centavos, 365 dias, e continua puro (sem import)', numeros(SRC.offer))
check('1-mutante: ADS_PASS_CREDITS de volta a 60 fica vermelho', () => !numeros(trocar(SRC.offer, 'export const ADS_PASS_CREDITS = 90', 'export const ADS_PASS_CREDITS = 60')))
check('1-mutante: offer.ts importando o módulo dos níveis fica vermelho (os guardiões o executam cru)', () => !numeros("import { ADS_V2_TIER_IDS } from './v2Tiers'\n" + SRC.offer))

// ── 2. espelho = derivado ────────────────────────────────────────────────────────────────────────────────────────────
const espelhoIgual = (src) => JSON.stringify(pure(src).ADS_V2_LEVEL_PRICES_MIRROR) === JSON.stringify(derived())
check('2 ADS_V2_LEVEL_PRICES_MIRROR (offer.ts) = nomes de ADS_V2_TIER_COPY × adsV2Credits(tier, 15 s), na ordem de ADS_V2_TIER_IDS', espelhoIgual(SRC.offer) && JSON.stringify(derived()) === JSON.stringify([{ name: 'Photo motion', credits: 34 }, { name: 'Commercial', credits: 41 }, { name: 'Cinema', credits: 51 }]))
check('2-mutante: espelho com Photo motion a 35 fica vermelho', () => !espelhoIgual(trocar(SRC.offer, "{ name: 'Photo motion', credits: 34 }", "{ name: 'Photo motion', credits: 35 }")))
const levelsDeriva = (src) => /name: ADS_V2_TIER_COPY\[id\]\.name,\n\s+credits: adsV2Credits\(id, ADS_V2_SCREEN_SECONDS\),/.test(src) && /ADS_V2_TIER_IDS\.map\(/.test(src) && !/\b(34|41|51)\b/.test(src.replace(/^\s*\/\/.*$/gm, ''))
check('2b lib/ads/v2Levels.ts deriva nome e crédito das fontes (nenhum 34/41/51 digitado)', levelsDeriva(SRC.levels))
check('2b-mutante: v2Levels com crédito digitado fica vermelho', () => !levelsDeriva(trocar(SRC.levels, 'credits: adsV2Credits(id, ADS_V2_SCREEN_SECONDS),', 'credits: 34,')))

// ── 3. a frase calculada ─────────────────────────────────────────────────────────────────────────────────────────────
const O = pure(SRC.offer)
check('3 adsCoverageLine(90) com os níveis derivados = a frase do fundador', O.adsCoverageLine(90, derived()) === FRASE && O.adsCoverageLine() === FRASE)
check('3b a linha de créditos da copy do passe (/llms.txt, /api/facts) começa pela frase calculada', O.adsPassCopy().includes[0].startsWith(`90 credits: ${FRASE}`))
check('3c nunca promete mais do que o crédito paga: para todo saldo de 0 a 400, cada número da frase ≤ floor(saldo ÷ preço)', () => {
  for (let c = 0; c <= 400; c++) {
    const line = O.adsCoverageLine(c, derived())
    const classic = Number((line.match(/about (\d+) classic ads of 35 s/) || [])[1])
    if (classic !== Math.floor(c / O.KINEO1_35S_CREDITS)) return false
    const cheapest = Math.floor(c / 34)
    const first = Number((line.match(/^(\d+) new ads?/) || [])[1] || 0)
    if (first !== cheapest) return false
    if (c < 34 && /new ad/.test(line)) return false
  }
  return true
})
check('3c-mutante: arredondar para cima fica vermelho', () => {
  const m = pure(trocar(SRC.offer, 'n: Math.floor(credits / l.credits)', 'n: Math.ceil(credits / l.credits)'))
  return m.adsCoverageLine(90, derived()) !== FRASE
})
check('3d 60 créditos (Starter) seguem "1 new ad at any level" — a mesma função serve às duas portas', O.adsNewAdsLabel(60, derived()) === '1 new ad at any level')

// ── 4. o webhook concede o que a pessoa viu ──────────────────────────────────────────────────────────────────────────
// 28/09 (revisão do passe B): o webhook passou a ler ADS_PASS_CREDITS num ÚNICO lugar — o fallback de uma sessão do passe que
// manteve metadata.pack mas perdeu metadata.pack_credits (antes: cobrada sem crédito nem acesso). O caminho normal segue
// concedendo metaCredits; a constante só vale DENTRO do `if (creditsToAdd === 0)` que vem logo depois dele.
const semComentario = (s) => s.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
const MAIN = 'let creditsToAdd = metaCredits > 0 ? metaCredits : 0\n          if (creditsToAdd === 0) {'
const FALLBACK = 'else if (packMeta === ADS_PASS_ID) creditsToAdd = ADS_PASS_CREDITS'
const concedeMetadata = (wh, co) => {
  const code = semComentario(wh)
  const ini = code.indexOf(MAIN)
  const fim = ini >= 0 ? code.indexOf('if (creditsToAdd === 0) {', ini + MAIN.length) : -1
  const fb = code.indexOf(FALLBACK)
  return /const metaCredits = Number\(session\.metadata\?\.pack_credits \?\? 0\)/.test(code) && ini >= 0 &&
    (code.match(/\bADS_PASS_CREDITS\b/g) || []).length === 2 && /import \{[^}]*\bADS_PASS_CREDITS\b[^}]*\} from '@\/lib\/ads\/offer'/.test(code) &&
    fb > ini && fb < fim &&
    /pack: ADS_PASS_ID,\n\s*pack_credits: String\(ADS_PASS_CREDITS\)/.test(co)
}
check('4 webhook: creditsToAdd = metadata.pack_credits gravado na abertura do checkout; ADS_PASS_CREDITS só no fallback sem pack_credits', concedeMetadata(SRC.webhook, SRC.checkout))
check('4-mutante: webhook concedendo a constante no caminho normal fica vermelho', () => !concedeMetadata(trocar(SRC.webhook, 'let creditsToAdd = metaCredits > 0 ? metaCredits : 0', 'let creditsToAdd = packMeta === ADS_PASS_ID ? ADS_PASS_CREDITS : metaCredits > 0 ? metaCredits : 0'), SRC.checkout))
check('4-mutante: sem o fallback do passe (sessão sem pack_credits volta a ser cobrada sem crédito) fica vermelho', () => !concedeMetadata(trocar(SRC.webhook, FALLBACK, '{}'), SRC.checkout))
check('4-mutante: checkout sem pack_credits fica vermelho', () => !concedeMetadata(SRC.webhook, trocar(SRC.checkout, 'pack_credits: String(ADS_PASS_CREDITS)', "pack_credits: '0'")))
// 4b. Sessão aberta antes do deploy: a chave de idempotência da Stripe (janela de 5 min) inclui a descrição, que traz
// ${ADS_PASS_CREDITS}. Sem isso, quem abrisse o checkout logo depois do deploy receberia de volta a sessão em cache com
// pack_credits '60' enquanto a página mostra 90.
const passBuilder = (co) => co.slice(co.indexOf('async function buildAdsPassAndRedirect'))
const chaveMudaComCredito = (co) => {
  const b = passBuilder(co)
  return /description: `\$\{ADS_PASS_CREDITS\} credits and 12 months of Studio Ads\./.test(b) &&
    /const adsIdempotencyKey = oneTimeIdempotencyKey\(\{[\s\S]*?description: sessionParams\.line_items\?\.\[0\]\?\.price_data\?\.product_data\?\.description,[\s\S]*?\}\)/.test(b)
}
check('4b a chave de idempotência do passe inclui a descrição com ${ADS_PASS_CREDITS} (mudar o crédito nunca devolve sessão em cache)', chaveMudaComCredito(SRC.checkout))
check('4b-mutante: chave sem a descrição fica vermelho', () => !chaveMudaComCredito(trocar(SRC.checkout, '    description: sessionParams.line_items?.[0]?.price_data?.product_data?.description,\n', '')))

// ── 5. superfícies ───────────────────────────────────────────────────────────────────────────────────────────────────
const porta = (d) => d.includes('const passCoverage = adsCoverageLine(ADS_PASS_CREDITS, V2_LEVELS)') && d.includes('<p className="ads-cover">Enough for {passCoverage}.</p>') && d.includes('with {ADS_PASS_CREDITS} credits — enough for {passCoverage} — and {ADS_PASS_ACCESS_DAYS} days of Studio Ads.') && !d.includes('newAdsLabel(passV2)')
check('5 /ads: cartão e FAQ do passe dizem a frase calculada com os níveis derivados da página', porta(SRC.door))
check('5-mutante: cartão de volta a "newAdsLabel(passV2)" fica vermelho', () => !porta(trocar(SRC.door, 'Enough for {passCoverage}.', 'Enough for {newAdsLabel(passV2)}.')))
const pricing = (b, a) => /coverage: adsCoverageLine\(ADS_PASS_CREDITS, ADS_V2_LEVEL_PRICES\),/.test(b) && a.includes('{pass.coverage ? <p className="text-sm text-[var(--muted)]">Enough for {pass.coverage}.</p> : null}')
check('5b /pricing: o bloco de anúncios pinta o que o passe paga (adsCoverageLine com os níveis derivados)', pricing(SRC.blocks, SRC.adsBlock))
check('5b-mutante: sem a linha no modelo fica vermelho', () => !pricing(trocar(SRC.blocks, '        coverage: adsCoverageLine(ADS_PASS_CREDITS, ADS_V2_LEVEL_PRICES),\n', ''), SRC.adsBlock))
// 5c. (revisão 28/09) o número de créditos do passe nunca é digitado nas telas: o valor "Credits" do cartão do /ads e o botão
// do montador sem saldo leem a constante. Antes desta regra, `<b>60</b>` no cartão passava verde em toda a suíte.
const wizard = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const semDigitar = (d, w) => d.includes('<div className="val"><span>Credits</span><b>{ADS_PASS_CREDITS}</b></div>') && d.includes('<CreditMinutesSummary credits={ADS_PASS_CREDITS} />') &&
  !/<b>\s*(60|90)\s*<\/b>/.test(d) && w.includes('Get {ADS_PASS_CREDITS} more credits') && !/Get (60|90) more credits/.test(w)
check('5c /ads (valor "Credits" e minutos) e o botão do montador leem ADS_PASS_CREDITS — nenhum 60/90 digitado', semDigitar(SRC.door, wizard))
check('5c-mutante: "Credits" digitado como 60 no cartão do /ads fica vermelho', () => !semDigitar(trocar(SRC.door, '<b>{ADS_PASS_CREDITS}</b>', '<b>60</b>'), wizard))

console.log(`test-passe-b-90-creditos-2026-09-28: ${verdes} verdes, ${vermelhos.length} vermelhos`)
for (const v of vermelhos) console.log('  ✗ ' + v)
process.exit(vermelhos.length ? 1 : 0)
