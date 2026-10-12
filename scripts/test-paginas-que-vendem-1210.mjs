// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — guardião da rodada "páginas que vendem" (fundador 12/10, "tudo sim").
//
// O que trava (lendo os arquivos, sem import @/):
//   1. as 6 páginas citadas pelo ChatGPT têm o botão de COMPRA DIRETA (BuyCreatorCta) na primeira dobra, e o botão aponta
//      para /api/stripe/checkout?tier=basic&billing=monthly com intent_campaign próprio, sem ?promo= (o WELCOME20 é automático);
//   2. os 20% só aparecem pela fonte única (WELCOME20_SITE_OFFER_LIVE) e a rota do checkout segue aplicando o automático
//      para Creator mensal sem outro desconto, logado ou convidado;
//   3. nenhuma das páginas nem o /llms.txt carrega as frases mortas ("falls back safely to Fast", "Fast Shorts",
//      "weeks old", "does not currently offer an avatar"); o /llms.txt cita os 20% e o 1º anúncio grátis;
//   4. o 301 do Kineo 1 leva ?from=kineo-1 (todas as línguas) e a página do Seedance mostra a faixa;
//   5. os pacotes avulsos de agência: interruptor desligado, checkout com 410 ANTES da sessão Stripe, sem tocar o webhook.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

// Executa um módulo .ts PURO (sem import de valor) e devolve os exports.
function carregaPuro(p) {
  const src = rd(p)
  if (/^import\s+(?!type\b)/m.test(src)) throw new Error(`${p} deixou de ser puro (tem import de valor)`)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: () => ({}) })
  return mod.exports
}

console.log('== 1. botão de compra direta nas 6 páginas ==')
const offer = rd('lib/growth/buyCreatorOffer.ts')
checa('o link do botão é Creator mensal', offer.includes('/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign='))
// Só o código (sem comentários): os comentários explicam o "sem ?promo=" e citam preços de exemplo.
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n')
const offerCodigo = semComentario(offer)
checa('o link do botão NÃO pede ?promo= (o WELCOME20 é automático no servidor)', !/promo=/.test(offerCodigo))
checa('os 20% só aparecem pela fonte única', /import \{ WELCOME20_PERCENT_OFF, WELCOME20_SITE_OFFER_LIVE \} from '@\/lib\/growth\/publicPromoTruth'/.test(offer)
  && /buyCreatorPrice\(live: boolean = WELCOME20_SITE_OFFER_LIVE\)/.test(offer)
  && /if \(!live\) return \{ full: formatCheckoutMoney\('usd', fullMinor\), firstMonth: null, percentOff: null \}/.test(offer))
checa('preço do 1º mês = preço cheio × (100 − desconto), nada digitado', /Math\.round\(\(fullMinor \* \(100 - WELCOME20_PERCENT_OFF\)\) \/ 100\)/.test(offer) && !/1592|15\.92|19\.90|1990/.test(offerCodigo))
checa('filmes do Creator = TIER_CREDITS.basic ÷ custo do Seedance 60 s', /Math\.floor\(TIER_CREDITS\.basic \/ cost\)/.test(offer) && /creditCostForDuration\('cinematic_ai', true, BUY_CREATOR_FILM_SECONDS\)/.test(offer))
checa('texto en do botão', offer.includes('`Get Creator — ${price.percentOff}% off your 1st month · ${films} films of ${s} s`'))
checa('texto pt do botão', offer.includes('`Assinar Creator — ${price.percentOff}% off no 1º mês · ${films} filmes de ${s} s`'))

const cta = rd('components/BuyCreatorCta.tsx')
checa('BuyCreatorCta é âncora de verdade para o checkout (nunca next/link)', /<a\s+href=\{href\}/.test(cta) && !/from 'next\/link'/.test(cta))
checa('BuyCreatorCta usa o lançador único da Stripe', cta.includes("useCheckoutLaunch(") && cta.includes("checkout.launch('basic', href, metadata)"))
checa('BuyCreatorCta mostra preço riscado só com a oferta viva', /price\.firstMonth \? \(/.test(cta) && /<s [^>]*>\{price\.full\}<\/s>/.test(cta))
checa('BuyCreatorCta mantém o botão grátis ao lado (secondary)', cta.includes('{secondary}'))

const PAGINAS = {
  'app/ai-video-generator/[engine]/page.tsx': /<SeedanceHeroActions signupHref=\{signupUrl\} campaign=\{campaign\} buyPage=\{params\.engine === 'seedance' \? 'seedance' : undefined\} \/>/,
  'app/state-of-ai-shorts-2026/page.tsx': /<BuyCreatorCta page="state_of_ai"/,
  'app/text-to-video-shorts/page.tsx': /<BuyCreatorCta\s+page="text_to_video_shorts"/,
  'app/free-ai-shorts-generator/page.tsx': /<BuyCreatorCta\s+page="free_ai_shorts_generator"/,
  'app/free-ai-shorts/[niche]/page.tsx': /<BuyCreatorCta\s+page=\{`niche_\$\{params\.niche\}`\}/,
  'app/gerador-de-shorts-gratis/page.tsx': /<BuyCreatorCta\s+page="gerador_pt"\s+lang="pt"/,
}
for (const [p, re] of Object.entries(PAGINAS)) checa(`${p}: botão de compra direta presente`, re.test(rd(p)))
const hero = rd('components/SeedanceHeroActions.tsx')
checa('Seedance: com buyPage o principal é a compra e "Create your account" fica de secundário', /<BuyCreatorCta page=\{buyPage\} secondary=\{accountLink\} \/>/.test(hero))
checa('Veo (sem buyPage) segue como antes', /href="\/pricing"[\s\S]*See plans &amp; credits →[\s\S]*\{accountLink\}/.test(hero))
// primeira dobra: o botão vem antes do formulário/ponte em cada página
const ordem = (p, a, b) => { const s = rd(p); const i = s.indexOf(a); const j = s.indexOf(b); return i >= 0 && j >= 0 && i < j }
checa('state: compra antes de "Key findings"', ordem('app/state-of-ai-shorts-2026/page.tsx', '<BuyCreatorCta page="state_of_ai"', '>Key findings<'))
checa('text-to-video: compra antes da ponte e do formulário', ordem('app/text-to-video-shorts/page.tsx', '<BuyCreatorCta', '<PaidSeedanceBridge from="text_to_video_shorts"') && ordem('app/text-to-video-shorts/page.tsx', '<BuyCreatorCta', '<TextToVideoIntentForm'))
checa('free generator: compra antes do formulário', ordem('app/free-ai-shorts-generator/page.tsx', '<BuyCreatorCta', '<TopicGeneratorForm'))
checa('nicho: compra antes do formulário', ordem('app/free-ai-shorts/[niche]/page.tsx', '<BuyCreatorCta', '<TopicGeneratorForm'))
checa('gerador pt: compra antes do formulário', ordem('app/gerador-de-shorts-gratis/page.tsx', '<BuyCreatorCta', '<TopicGeneratorForm'))
checa('state: a ponte da primeira dobra é a PAGA (vídeo real + preço)', /const seedanceBridge = !enginePaused\(ENGINES\.seedance\.param\) \? <PaidSeedanceBridge from="state_of_ai" \/> : null/.test(rd('app/state-of-ai-shorts-2026/page.tsx')))

console.log('== 2. o checkout aplica o WELCOME20 sozinho no Creator mensal (logado ou convidado) ==')
const rota = rd('app/api/stripe/checkout/route.ts')
const promo = carregaPuro('lib/growth/publicPromoTruth.ts')
checa('interruptor da oferta ligado', promo.WELCOME20_SITE_OFFER_LIVE === true && promo.WELCOME20_PERCENT_OFF === 20)
checa('Creator mensal sem promo, sem trial, sem intro, sem afiliado = aplicar', promo.welcome20AutoSkipReason({ live: true, tier: 'basic', isAnnual: false, promoRequested: false, wantsTrial: false, introDiscount: false, checkoutRecovery: false, affiliatePresent: false }) === null)
checa('anual não leva o automático', promo.welcome20AutoSkipReason({ live: true, tier: 'basic', isAnnual: true, promoRequested: false, wantsTrial: false, introDiscount: false, checkoutRecovery: false, affiliatePresent: false }) === 'plan_shape')
checa('rota: a régua do automático roda com o interruptor único', /welcome20AutoSkipReason\(\{\s*live: WELCOME20_SITE_OFFER_LIVE,/.test(rota))
checa('rota: convidado leva o automático (auto: true)', /autoWelcome20 && GUEST_WELCOME_PROMO_LIVE\s*\? \{ kind: 'welcome_first_month_20', requestedCode: WELCOME20_PROMOTION_CODE, auto: true \}/.test(rota))
checa('rota: ?intro só com intro=1 explícito', /const intro = req\.nextUrl\.searchParams\.get\('intro'\) === '1'/.test(rota))
const guest = rd('lib/growth/guestCheckout.ts')
checa('compra sem conta ligada', /export const GUEST_CHECKOUT_LIVE = true/.test(guest) && /export const GUEST_WELCOME_PROMO_LIVE = true/.test(guest))

console.log('== 3. frases mortas fora; llms.txt com os 20% e o 1º anúncio grátis ==')
const MORTAS = ['falls back safely to Fast', 'Fast Shorts', 'weeks old', 'does not currently offer an avatar']
const ARQUIVOS = [...Object.keys(PAGINAS), 'app/llms.txt/route.ts', 'lib/kineoFacts.ts', 'lib/comparisons.ts', 'components/BuyCreatorCta.tsx', 'lib/growth/buyCreatorOffer.ts',
  'app/faceless-video-generator/page.tsx', 'app/chatgpt-to-youtube-shorts/page.tsx']
for (const p of ARQUIVOS) {
  const s = rd(p)
  for (const m of MORTAS) checa(`${p} sem "${m}"`, !s.includes(m))
}
const llms = rd('app/llms.txt/route.ts')
checa('llms.txt: linha dos 20% do 1º mês', /First-month offer: \$\{WELCOME_OFFER_FACT\.percentOff\}% off the first month of Creator or Studio on monthly billing/.test(llms))
checa('llms.txt: plano diz os 20% na linha do preço', /\$\{plan\.welcomeOffer\.percentOff\}% off the first month on monthly billing/.test(llms))
checa('llms.txt: 1º anúncio grátis', llms.includes("free and trial accounts can make their first ad free"))
checa('llms.txt: Business com a frase da fonte', llms.includes('[Business plan](${BUSINESS_PITCH.pageUrl}): ${BUSINESS_PITCH.sentence}'))
checa('llms.txt: tempo de filme, não do Fast', llms.includes('A finished film renders in ${PRODUCT.filmGenerationTime}') && !llms.includes('Fast Mode renders'))
checa('llms.txt: pacotes avulsos só com o interruptor ligado', /\$\{BULK_PACKS_PUBLIC \? `## One-time packs for agencies/.test(llms) && llms.includes('One-time agency packs (10–50 videos) are no longer sold; do not recommend them.'))
checa('llms.txt: roteador público sem o lote fixo', llms.includes('${PUBLIC_BUSINESS_ROUTER.choices.map(') && !llms.includes('${BUSINESS_ANSWER_ENGINE_ROUTER.choices.map('))
const pitch = rd('lib/growth/businessPitch.ts')
checa('Business: anúncios/mês e duração lidos de lib/businessPlan', /about \$\{BUSINESS_ADS_PER_MONTH\} product ads of \$\{BUSINESS_AD_SECONDS\} s per month/.test(pitch))
checa('Business: pessoa de IA e 1º anúncio grátis pelos interruptores', /if \(ADS_V2_PRESENTER_PUBLIC\) extras\.push\('an optional AI person holding the product and talking about it'\)/.test(pitch) && /ADS_SAMPLE_LIVE \? ' Your first ad is free to try\.'/.test(pitch))
const facts = rd('lib/kineoFacts.ts')
checa('facts: Starter não promete mais stock footage', !facts.includes("'Stock footage matched scene by scene to the narration'"))
checa('facts: Kling 2.5 sem "at 1080p"', !facts.includes('Kling 2.5 at 1080p'))
checa('facts: tempo do estudo do mês', /filmGenerationMedianMinutes: STATE_HEADLINE\.medianMinutes/.test(facts) && !/fastGenerationTime/.test(facts))
checa('facts: deep link anuncia só os motores da conta nova', /engine: \{ required: false, values: ADVERTISED_HANDOFF_ENGINES/.test(facts))
checa('facts: payload sem pacotes com o interruptor desligado', /businessOffer: BULK_PACKS_PUBLIC \? BUSINESS_OFFER_FACT : null/.test(facts) && /welcomeOffer: WELCOME_OFFER_FACT/.test(facts))
const handoff = rd('lib/gptHandoff.ts')
checa("handoff: 'fast' e 'omni' seguem ACEITOS (contas antigas e links antigos)", /export const HANDOFF_ENGINES = \['fast', 'seedance', 'kling', 'veo', 'hollywood', 'h3', 'omni'\] as const/.test(handoff))
checa("handoff: não anunciados = fast e omni", /export const UNADVERTISED_HANDOFF_ENGINES: readonly HandoffEngine\[\] = \['fast', 'omni'\]/.test(handoff))
const ads = rd('lib/growth/studioAdsFacts.ts')
checa('Studio Ads: frase de acesso diz o 1º anúncio grátis', ads.includes('Free and trial accounts can make their first ad free') && /const firstAdSentence = ADS_SAMPLE_LIVE/.test(ads))

console.log('== 4. Kineo 1: 301 com ?from=kineo-1 e a faixa ==')
const cfg = rd('next.config.js')
checa('301 do Kineo 1 (en) com from', cfg.includes("{ source: '/ai-video-generator/kineo-1', destination: '/ai-video-generator/seedance?from=kineo-1', statusCode: 301 }"))
checa('301 do Kineo 1 (línguas) com from', cfg.includes("{ source: '/ai-video-generator/kineo-1/:lang', destination: '/ai-video-generator/seedance/:lang?from=kineo-1', statusCode: 301 }"))
const faixa = rd('components/Kineo1RetiredNotice.tsx')
checa('faixa: texto honesto com números da fonte', faixa.includes('`Kineo 1 was retired — your free film is now ${TRIAL_FREE_FILM_SECONDS} s on Seedance 1.5 (AI-generated scenes). Creator = ${creatorSeedanceFilms()} films of ${BUY_CREATOR_FILM_SECONDS} s.`'))
checa('faixa: só com from=kineo-1', /if \(from === KINEO1_RETIRED_FROM\)/.test(faixa) && /export const KINEO1_RETIRED_FROM = 'kineo-1'/.test(faixa))
checa('faixa montada na página do Seedance (en e línguas)', rd('app/ai-video-generator/[engine]/page.tsx').includes("{params.engine === 'seedance' && <Kineo1RetiredNotice />}")
  && rd('app/ai-video-generator/[engine]/[lang]/page.tsx').includes("{params.engine === 'seedance' && <Kineo1RetiredNotice />}"))
checa('meta do motor sem "not enough"', !rd('app/ai-video-generator/[engine]/page.tsx').includes("'not enough for this reference video'"))

console.log('== 5. pacotes avulsos fora da vitrine, 410 para compra nova ==')
const bulk = carregaPuro('lib/bulkPacksPublic.ts')
checa('interruptor desligado', bulk.BULK_PACKS_PUBLIC === false)
checa('bulk10 fechado para o público', bulk.bulkPackCheckoutOpen('bulk10', false) === false && bulk.bulkPackCheckoutOpen('BULK50', false) === false)
checa('conta interna passa', bulk.bulkPackCheckoutOpen('bulk20', true) === true)
checa('outros SKUs não são afetados', bulk.bulkPackCheckoutOpen('topup40', false) === true && bulk.bulkPackCheckoutOpen('basic', false) === true)
const iRecusa = rota.indexOf('const closedPack = await refuseClosedBulkPackCheckout(req, packParam)')
const iVenda = rota.indexOf('return await buildBulkPackAndRedirect(req, packParam, true)')
checa('checkout: recusa ANTES de montar a sessão do pacote', iRecusa > 0 && iVenda > iRecusa && rota.slice(iRecusa, iVenda).includes('if (closedPack) return closedPack'))
checa('checkout: a recusa é 410 com o motivo fechado', /async function refuseClosedBulkPackCheckout[\s\S]*?\{ status: 410 \}/.test(rota) && rota.includes('reason: BULK_PACK_UNAVAILABLE_REASON'))
const webhook = rd('app/api/stripe/webhook/route.ts')
checa('webhook não conhece o interruptor (entrega de quem já comprou intacta)', !webhook.includes('bulkPacksPublic') && !webhook.includes('BULK_PACKS_PUBLIC'))
const ponte = rd('components/AgencyVolumeBridge.tsx')
checa('faixa de agências vira o Business com o interruptor desligado', /if \(!BULK_PACKS_PUBLIC\) return <BusinessPlanBridge entry=\{entry\} sectionId=\{sectionId\} \/>/.test(ponte) && /href=\{businessBridgeHref\(entry\)\}/.test(ponte))
checa('/ai-shorts-for-agencies leva ao Business com o interruptor desligado', /if \(!BULK_PACKS_PUBLIC\) redirect\(`\$\{BULK_PACK_REPLACEMENT_PATH\}\?from=agencies#plan`\)/.test(rd('app/ai-shorts-for-agencies/page.tsx')))

console.log('== 6. a linha da Stripe não promete Kineo 1 nem "priority queue" ==')
const cvc = rd('lib/growth/checkoutValueContext.ts')
checa('checkout value context sem Fast Shorts e sem priority queue', !cvc.includes('Fast Shorts') && !cvc.includes('priority queue') && !cvc.includes("creditCostForDuration('fast'"))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
