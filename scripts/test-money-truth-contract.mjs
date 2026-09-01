#!/usr/bin/env node
// MONEY-TRUTH — contrato executável das promessas comerciais públicas.
//
// Sem rede, banco, env ou credencial. Executa os módulos canônicos reais e
// inspeciona apenas literais de código (comentários e números de concorrentes
// não entram no inventário). Rodar:
//   node scripts/test-money-truth-contract.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function source(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function loadTs(rel, mocks = {}) {
  const filename = join(root, rel)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} tentou importar módulo não permitido no teste: ${id}`)
  }
  const execute = new Function('require', 'module', 'exports', `${output}\n//# sourceURL=${filename}`)
  execute(localRequire, module, module.exports)
  return module.exports
}

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', {
  '@/lib/credits/engineCost': engine,
})
const checkout = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})
const marketing = loadTs('lib/marketingPrice.ts', {
  '@/lib/checkoutPricing': checkout,
  '@/lib/credits/engineCost': engine,
})
const freeTier = loadTs('lib/freeTierOffer.ts', {
  './credits/engineCost': engine,
})
const comparisons = loadTs('lib/comparisons.ts', {
  '@/lib/checkoutPricing': checkout,
  '@/lib/freeTierOffer': freeTier,
  '@/lib/marketingPrice': marketing,
})

let passed = 0
const failures = []
function check(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`✓ ${name}`)
  } catch (error) {
    failures.push({ name, error })
    console.error(`✗ ${name}`)
    console.error(`  ${error instanceof Error ? error.message : String(error)}`)
  }
}

const qualities = [
  'fast',
  'cinematic_ai',
  'cinematic_h3',
  'cinematic_kling',
  'cinematic_veo',
  'cinematic_hollywood',
  'cinematic_omni',
  'presenter',
  'avatar',
]

console.log('\nMONEY-TRUTH — economia canônica e inventário público\n')

for (const quality of qualities) {
  check(`${quality}: marketing usa o custo real de 60s`, () => {
    assert.equal(
      marketing.creditsPerReferenceVideo(quality),
      engine.creditCostForDuration(quality, true, 60),
    )
  })
}

for (const tier of ['starter', 'basic', 'pro']) {
  for (const quality of ['fast', 'cinematic_ai', 'cinematic_h3', 'cinematic_kling', 'cinematic_hollywood']) {
    check(`${tier}/${quality}: quantidade = grant ÷ custo de 60s`, () => {
      const expected = Math.floor(
        checkout.TIER_CREDITS[tier] / engine.creditCostForDuration(quality, true, 60),
      )
      assert.equal(marketing.videosPerMonth(tier, quality), expected)
    })
  }
}

for (const [id, credits] of Object.entries({
  starter: checkout.PACK_CREDITS.starter,
  starter290: checkout.PACK_CREDITS.starter290,
  ...checkout.TOPUP_CREDITS,
})) {
  check(`${id}: mix anunciado não inventa parcelas zero`, () => {
    const mix = marketing.videoMixForCredits(credits, 'cinematic_ai', 'fast')
    const parts = []
    if (mix.primary > 0) parts.push(marketing.formatResultCount(mix.primary, 'Seedance film'))
    if (mix.secondary > 0) parts.push(marketing.formatResultCount(mix.secondary, 'Kineo 1 video'))
    const expected = parts.length > 0
      ? parts.join(' plus ')
      : marketing.formatResultCount(marketing.videosForCredits(credits, 'fast'), 'Kineo 1 video')
    const actual = marketing.describeSeedanceMix(credits)
    assert.equal(actual, expected)
    assert.doesNotMatch(actual, /(?:^|\s)0\s+(?:Seedance|Kineo)/)
  })
}

check('trial traduz grant pelo custo Seedance de 60s', () => {
  assert.equal(
    freeTier.TRIAL_FILMS,
    Math.floor(
      freeTier.TRIAL_GRANT_CREDITS_COPY /
        engine.creditCostForDuration('cinematic_ai', true, 60),
    ),
  )
})

check('valor de créditos no Creator deriva de preço e grant canônicos', () => {
  assert.equal(
    marketing.planCreditSpendUsd('basic', 10),
    (checkout.TIER_PRICES.basic.usd / 100) * (10 / checkout.TIER_CREDITS.basic),
  )
  assert.equal(marketing.formatUsd(marketing.planCreditSpendUsd('basic', 10)), '$1.67')
})

check('checker canônico de pricing fica verde', () => {
  assert.deepEqual(checkout.checkPricingInvariants(), [])
})

const requiredReferences = {
  'app/api/stripe/checkout/route.ts': [
    'TIER_CREDITS.basic',
    'TOPUP_CREDITS.topup100',
    'describeSeedanceMix',
    'videosForCredits',
  ],
  'app/pricing/PricingClient.tsx': [
    'creditsPerReferenceVideo',
    'videosPerMonth',
    'TIER_CREDITS.pro',
  ],
  'components/PricingCards.tsx': ['videosPerMonth'],
  'components/WelcomeOfferModal.tsx': ['TIER_CREDITS.basic', 'TIER_CREDITS.pro', 'videosPerMonth'],
  'components/Creator30OfferModal.tsx': ['TIER_CREDITS.basic', 'videosPerMonth', 'Claim {percent}% off'],
  'components/UpgradeModal.tsx': ['videosPerMonth'],
  'app/(dashboard)/generate/LowCreditsUpsell.tsx': ['videosPerMonth'],
  'components/CreditsTopupModal.tsx': ['videosForCredits', 'TOPUP_CREDITS'],
  'components/AvatarLandingClient.tsx': ["creditsPerReferenceVideo('avatar')"],
  'components/StructuredData.tsx': ["videosPerMonth('basic', 'cinematic_ai')", "videosPerMonth('basic', 'fast')"],
  'components/TrialActiveBanner.tsx': ["creditsPerReferenceVideo('cinematic_ai')"],
  'components/TrialDowngradeModal.tsx': ["creditsPerReferenceVideo('cinematic_ai')"],
  'components/ExitIntentOffer.tsx': ['TRIAL_FILMS', 'CREATOR_AI_FILMS'],
  'components/PostVideoPaywall.tsx': ['packPriceLabel()', 'PACK_CREDITS.starter'],
  'app/(dashboard)/generate/Offer290Banner.tsx': [
    "videosForCredits(PACK_CREDITS.starter290, 'cinematic_ai')",
  ],
  'app/(dashboard)/generate/GenerateClient.tsx': [
    "creditCostForDuration('cinematic_hollywood', true, duration)",
    'videosForCredits(TOPUP_CREDITS.topup300',
    'seedanceReferenceCost',
  ],
  'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx': [
    // The calculator moved from three direct 60s-only lookups to the Plan Fit
    // contract so engine + 35/60/90s + monthly volume share Checkout's ruler.
    // Anchoring the removed helper names made this inventory red while the
    // executed calculation was stronger. These needles describe behavior.
    'calculatePlanFit({ quality, seconds, monthlyFilms: videos, currency })',
    'PUBLIC_ENGINES.map',
    'PUBLIC_DURATIONS.map',
    'oneFilm.filmCredits',
  ],
  'app/ai-video-upscaler/page.tsx': [
    "creditsPerReferenceVideo('cinematic_ai')",
    "planCreditSpendUsd('basic', ENHANCE_CREDITS)",
  ],
  'app/ai-video-generator/[engine]/page.tsx': [
    "creditsPerReferenceVideo('cinematic_h3')",
    "videosPerMonth('basic', 'cinematic_h3')",
    "videosPerMonth('pro', 'cinematic_h3')",
  ],
  'lib/comparisons.ts': ['KINEO_ENGINE_METERING', 'TIER_CREDITS.starter', 'creditsPerReferenceVideo'],
  'lib/kineoFacts.ts': ['creditsPerReferenceVideo', 'videosPerMonth'],
}

for (const [file, needles] of Object.entries(requiredReferences)) {
  for (const needle of needles) {
    check(`${file}: ancora ${needle}`, () => {
      assert.ok(source(file).includes(needle), `referência ausente: ${needle}`)
    })
  }
}

function literalText(file) {
  const sf = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const values = []
  function visit(node) {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      values.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return values.join('\n')
}

const stalePublicPatterns = [
  /140 credits(?:\s*\/\s*month)?/i,
  /320 credits(?:\s*\/\s*month)?/i,
  /1 Hollywood film included \(or ~7/i,
  /Creator Mode[^\n]*then 1 credit/i,
  /AI Generated (?:uses |)20(?: credits)?/i,
  /Seedance[^\n]{0,24}20 credits/i,
  /Veo[^\n]{0,24}90 credits/i,
  /Avatar[^\n]{0,24}120 credits/i,
  /roughly seven cinematic/i,
]

const publicFiles = [
  'app/api/stripe/checkout/route.ts',
  'app/pricing/PricingClient.tsx',
  'components/PricingCards.tsx',
  'components/WelcomeOfferModal.tsx',
  'components/Creator30OfferModal.tsx',
  'components/UpgradeModal.tsx',
  'components/CreditsTopupModal.tsx',
  'components/AvatarLandingClient.tsx',
  'components/StructuredData.tsx',
  'components/TrialActiveBanner.tsx',
  'components/TrialDowngradeModal.tsx',
  'components/ExitIntentOffer.tsx',
  'components/PostVideoPaywall.tsx',
  'app/(dashboard)/generate/LowCreditsUpsell.tsx',
  'app/(dashboard)/generate/Offer290Banner.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
  'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx',
  'app/cheapest-ai-shorts-maker/page.tsx',
  'app/ai-shorts-without-filming/page.tsx',
  'app/ai-robot-video-generator/page.tsx',
  'app/omni-flash-vs-sora/page.tsx',
  'app/ai-video-generator/[engine]/page.tsx',
  'app/ai-video-generator/page.tsx',
  'app/ai-video-upscaler/page.tsx',
  'lib/kineoFacts.ts',
]

for (const file of publicFiles) {
  const literals = literalText(file)
  for (const pattern of stalePublicPatterns) {
    check(`${file}: sem literal comercial antigo ${pattern}`, () => {
      assert.doesNotMatch(literals, pattern)
    })
  }
}

check('comparações: literais Kineo antigos morreram sem varrer dados dos concorrentes', () => {
  const literals = literalText('lib/comparisons.ts')
  const kineoOnly = [
    /Kineo[^\n]{0,240}(?:Fast 1|Fast video (?:is|costs|costing) 1|AI Generated 20)/i,
    /Kineo Starter[^\n]{0,80}(?:for |: )25 credits/i,
    /Kineo counts render engines:[^\n]*(?:Fast 1|AI Generated 20)/i,
    /Kineo[^\n]{0,160}4\.90 for a first month/i,
  ]
  for (const pattern of kineoOnly) assert.doesNotMatch(literals, pattern)
})

check('comparações: preço derivado não pode sair como placeholder literal', () => {
  for (const file of ['lib/comparisons.ts', 'app/alternatives/[competitor]/page.tsx']) {
    assert.doesNotMatch(
      literalText(file),
      /\$\{(?:K\(|TIER_|STARTER_|KINEO_)/,
      `${file} contém interpolação escrita dentro de string comum`,
    )
  }
})

check('comparações: Kineo vs Submagic executa a verdade atual de preço e Fast', () => {
  const pair = comparisons.PAIRS.find((item) => item.slug === 'kineo-vs-submagic')
  assert.ok(pair, 'par kineo-vs-submagic ausente')
  const renderedContract = JSON.stringify(pair)
  assert.match(
    renderedContract,
    new RegExp(`60-second Kineo 1 video costing ${marketing.creditsPerReferenceVideo('fast')} credits`),
  )
  assert.ok(
    renderedContract.includes(
      `Kineo Starter is ${checkout.formatCheckoutMoney('usd', checkout.TIER_PRICES.starter.usd)}/month`,
    ),
    'preço Starter derivado não chegou ao objeto renderizado',
  )
  assert.doesNotMatch(renderedContract, /\$\{|4\.90 for a first month|Fast video costing 1\b/i)
})

check('calculadora não mantém tabela numérica paralela de custo', () => {
  assert.doesNotMatch(source('app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx'), /creditCost:\s*(?:1|20|50)\b/)
})

check('topup100 preserva ID legado sem prometer 100 créditos', () => {
  const literals = literalText('app/api/stripe/checkout/route.ts')
  assert.match(source('app/api/stripe/checkout/route.ts'), /topup100/)
  assert.doesNotMatch(literals, /\+100 credits|One-time:\s*100 credits|5 AI-generated videos/i)
})

console.log(`\n${passed} verificações passaram; ${failures.length} falharam.`)
if (failures.length > 0) process.exit(1)
