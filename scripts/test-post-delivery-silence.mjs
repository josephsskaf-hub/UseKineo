// KINEO-SILENCIO-POS-ENTREGA-2026-09-07 — contrato do auditor do slot unico.
// Sem rede, sem banco, sem credencial, sem escrita em producao.
//
// POR QUE ESTE GUARDIAO EXISTE: 89 de 220 primeiras entregas em 12 dias nao
// viram oferta nenhuma, e o produto nao tinha como saber — toda superficie
// emite quando APARECE, nenhuma emitia quando o slot ficava reservado e nada
// renderizava. Este auditor da denominador ao silencio; os casos abaixo o
// amarram as variaveis que decidem, e nao ao texto do arquivo.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}

const temp = mkdtempSync(join(tmpdir(), 'kineo-silence-'))
const sourceDir = join(temp, 'src')
const outDir = join(temp, 'out')
mkdirSync(sourceDir, { recursive: true })
writeFileSync(
  join(sourceDir, 'postDeliveryOfferAudit.ts'),
  readFileSync(join(root, 'lib/growth/postDeliveryOfferAudit.ts'), 'utf8'),
)
execFileSync(process.execPath, [
  findTsc(root),
  join(sourceDir, 'postDeliveryOfferAudit.ts'),
  '--outDir', outDir,
  '--rootDir', sourceDir,
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node',
  '--strict',
  '--skipLibCheck',
], { stdio: 'pipe' })
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
const audit = requireFromTemp(join(outDir, 'postDeliveryOfferAudit.js'))

let passed = 0
const failures = []
function check(label, condition) {
  if (condition) { passed += 1; return }
  failures.push(label)
  console.error('FAIL ' + label)
}

const base = {
  delivered: true,
  askShown: false,
  planFitShown: false,
  bridgeShown: false,
  repeatShown: false,
  exportChoiceShown: false,
  planFitOwnsSlot: false,
  lookupPending: false,
  trialPhase: 'active',
}
const run = (overrides) => audit.auditPostDeliveryOffer({ ...base, ...overrides })

console.log('\nKINEO — silencio pos-entrega\n')

// 1. Sem entrega nao existe slot: nada a auditar, nunca silencio.
check('undelivered screen is never silent', run({ delivered: false }).silent === false)
check('undelivered screen carries no reason', run({ delivered: false }).reason === null)

// 2. QUALQUER superficie visivel encerra o silencio. Cinco casos, um por
//    superficie: se alguem apagar uma da conta, exatamente um destes cai.
check('the ask breaks the silence', run({ askShown: true }).silent === false)
check('plan fit breaks the silence', run({ planFitShown: true }).silent === false)
check('the bridge breaks the silence', run({ bridgeShown: true }).silent === false)
check('the repeat episode breaks the silence', run({ repeatShown: true }).silent === false)
check('the export choice breaks the silence', run({ exportChoiceShown: true }).silent === false)

// 3. Os dois motivos de Plan Fit sao DISTINTOS porque os consertos sao
//    distintos: lookup pendente e defeito, primeira entrega e decisao.
check('a reserved slot with a pending lookup is named as such',
  run({ planFitOwnsSlot: true, lookupPending: true }).reason === 'plan_fit_reserved_pending_lookup')
check('a reserved slot with a settled lookup is named separately',
  run({ planFitOwnsSlot: true, lookupPending: false }).reason === 'plan_fit_reserved_eligible')
check('a reserved slot is silent either way',
  run({ planFitOwnsSlot: true, lookupPending: true }).silent === true &&
  run({ planFitOwnsSlot: true, lookupPending: false }).silent === true)

// 4. Sem fase de trial a pergunta nem sequer e elegivel — outro buraco, outro
//    nome.
check('no trial phase is its own reason',
  run({ trialPhase: null }).reason === 'no_trial_phase')
check('an unexplained silence is never silently swallowed',
  run({ trialPhase: 'ending' }).reason === 'unknown')

// 5. A precedencia do motivo: o slot reservado responde ANTES da fase ausente,
//    porque foi ele que decidiu. Trocar a ordem faria o numero apontar para a
//    guarda errada e o conserto iria para o lugar errado.
check('the reserved slot outranks the missing trial phase as the reason',
  run({ planFitOwnsSlot: true, lookupPending: true, trialPhase: null }).reason
    === 'plan_fit_reserved_pending_lookup')

// 6. Contrato sem chamador serve zero: o /generate precisa AUDITAR e EMITIR.
const client = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
check('GenerateClient runs the audit', client.includes('const postDeliveryAudit = auditPostDeliveryOffer({'))
check('GenerateClient emits the silence', client.includes("void trackEvent('post_delivery_no_offer', {"))
check('the emission is keyed per video, not per render',
  client.includes('postDeliverySilenceKeyRef.current === key'))
check('the emission carries the reason', client.includes('reason: postDeliveryAudit.reason,'))
check('the audit is fed the real ask flag', client.includes('askShown: showTrialPostVideoOffer,'))
check('the audit is fed the real slot owner', client.includes('planFitOwnsSlot: planFitOwnsRecurringSlot,'))

console.log('')
if (failures.length) {
  console.error(failures.length + ' failed of ' + (passed + failures.length) + '.')
  process.exit(1)
}
console.log(passed + '/' + passed + ' checks passed.')
