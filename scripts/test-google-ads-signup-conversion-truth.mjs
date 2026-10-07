#!/usr/bin/env node
// KINEO-GOOGLE-ADS-SIGNUP-CURRENCY-TRUTH-2026-09-02
// The signup conversion has an assigned lead value, not purchase revenue.
// Its currency must still match the single USD commercial journey.

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(rel + ' imported unexpected module: ' + id) },
    module,
    module.exports,
  )
  return module.exports
}

let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }

const contract = loadTs('lib/growth/googleAdsSignupConversion.ts').GOOGLE_ADS_SIGNUP_CONVERSION
equal(contract, {
  send_to: 'AW-18156258081/SXGYCK_VlrEcEKGGytFD',
  value: 1,
  currency: 'USD',
}, 'signup conversion contract uses the canonical USD signal')
ok(Object.isFrozen(contract), 'signup conversion contract is immutable at runtime')

const callers = [
  'app/(auth)/signup/page.tsx',
  'components/SignupConversionTracker.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
]
for (const file of callers) {
  const body = source(file)
  ok(body.includes("import { GOOGLE_ADS_SIGNUP_CONVERSION } from '@/lib/growth/googleAdsSignupConversion'"), file + ' imports the canonical signal')
  ok(body.includes('...GOOGLE_ADS_SIGNUP_CONVERSION'), file + ' sends the canonical signal')
  ok(!body.includes("currency: 'BRL'"), file + ' does not report the retired BRL currency')
  ok(!body.includes('AW-18156258081/SXGYCK_VlrEcEKGGytFD'), file + ' does not duplicate the Ads label')
}

const runtimeFiles = ['app', 'components', 'lib'].flatMap((dir) =>
  readdirSync(join(root, dir), { recursive: true })
    .filter((entry) => /\.(?:ts|tsx)$/.test(String(entry)))
    // Windows returns backslashes here; normalize so the ownership contract
    // is identical on local development and Linux/Vercel.
    .map((entry) => join(dir, String(entry)).replaceAll('\\', '/')),
)
const labelOwners = runtimeFiles.filter((file) => source(file).includes('AW-18156258081/SXGYCK_VlrEcEKGGytFD'))
equal(labelOwners, ['lib/growth/googleAdsSignupConversion.ts'], 'the signup Ads label has one runtime owner')

// REANCORADO 07/10/2026 (KINEO-ANUNCIO-MOTOR-2026-10-07). Este bloco estava VERMELHO em origin/main 5ca07684: a
// conversão de compra saiu de app/checkout/success/page.tsx (a âncora `currency: purchaseCurrency` não existe mais)
// para lib/growth/checkoutPurchasePixels.ts, disparada só depois de /api/stripe/checkout/verify confirmar a sessão
// (observeCheckoutPurchase). A intenção é a MESMA — a compra reporta o valor e a moeda REAIS do checkout e nunca o valor
// atribuído do cadastro — e ficou mais estrita: o rótulo da compra tem um único dono e a página de sucesso continua
// ligando o observador.
const purchasePage = source('app/checkout/success/page.tsx')
const purchasePixels = source('lib/growth/checkoutPurchasePixels.ts')
ok(/send_to: 'AW-18156258081\/NL4bCKXEwa4cEKGGytFD',\s*value: purchase\.value, currency: purchase\.currency, transaction_id: purchase\.sessionId,/.test(purchasePixels), 'paid conversion keeps the actual checkout value and currency')
ok(!purchasePixels.includes('GOOGLE_ADS_SIGNUP_CONVERSION') && !purchasePage.includes('GOOGLE_ADS_SIGNUP_CONVERSION'), 'paid conversion never reuses the assigned signup value')
ok(/return observeCheckoutPurchase\(\{\s*sessionId,/.test(purchasePage), 'success page still wires the verified purchase observer')
const purchaseLabelOwners = runtimeFiles.filter((file) => source(file).includes('AW-18156258081/NL4bCKXEwa4cEKGGytFD'))
equal(purchaseLabelOwners, ['lib/growth/checkoutPurchasePixels.ts'], 'the purchase Ads label has one runtime owner')

console.log('\n' + checks + '/' + checks + ' Google Ads signup conversion-truth checks passed')
