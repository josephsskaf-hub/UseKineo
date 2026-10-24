// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — approved completion preserves target and literal mode; review is neutral.
/**
 * KINEO-FIRST-CLICK-AUTOFIT-2026-09-03
 *
 * Contrato executável do pedido Claude → Codex: a tela /generate não pode
 * barrar o primeiro clique de um roteiro curto. A decisão de descer a duração
 * pertence ao servidor, que já mede a fala, registra o degrau e devolve a
 * duração pedida e a efetiva.
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const CLIENT = 'app/(dashboard)/generate/GenerateClient.tsx'
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const client = readFileSync(CLIENT, 'utf8')
const route = readFileSync(ROUTE, 'utf8')
const diff = execSync(`git diff HEAD -- "${CLIENT}"`, {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
const addedCode = diff
  .split('\n')
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .map((line) => line.slice(1))
  .filter((line) => {
    const value = line.trim()
    return value && !value.startsWith('//') && !value.startsWith('*') && !value.startsWith('/*')
  })

let ok = 0
let failed = 0
function check(name, condition) {
  if (condition) {
    ok++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.log(`  ✗ ${name}`)
  }
}

const handleStart = client.indexOf('async function handleAnalyze(')
const restoreGate = client.indexOf('if (!(await waitForActiveRenderRestore()))', handleStart)
const beforeTrip = client.slice(handleStart, restoreGate)
const autofitStart = beforeTrip.indexOf('KINEO-FIRST-CLICK-AUTOFIT-2026-09-03')
const autofitBlock = beforeTrip.slice(autofitStart)

console.log('\n— 1. primeiro clique não é barrado no cliente —')
check('handleAnalyze existe', handleStart > 0)
check('gate de restauração existe depois do início', restoreGate > handleStart)
check('contrato do primeiro clique está dentro do handleAnalyze', autofitStart > 0)
check('estado de preflight removido', !client.includes('scriptTooShortPreflight'))
check('ref de segunda tentativa removida', !client.includes('preflightFiredRef'))
check('evento de bloqueio local removido', !client.includes("trackEvent('script_preflight_blocked'"))
check('o bloco antes da viagem não cria painel curto', !autofitBlock.includes('setScriptTooShort({'))
check('o bloco antes da viagem não retorna cedo', !autofitBlock.includes('\n          return\n'))
check('a primeira vontade alcança o gate normal', restoreGate > client.indexOf('KINEO-FIRST-CLICK-AUTOFIT-2026-09-03'))

console.log('\n— 2. o autofit de roteiro longo continua intacto —')
check('fala verbatim é medida na régua canônica da voz e da língua', /scriptMode === 'verbatim'/.test(autofitBlock) && autofitBlock.includes('const reguaAnalise = reguaDoServidorNaTela(') && autofitBlock.includes('const falaSeg = falaNaReguaDaTela(baseChecagem, reguaAnalise)'))
check('cobertura usa a régua canônica', /const cobre = falaSeg >= duration \* minCoverageFor\(duration\)/.test(autofitBlock))
check('roteiro longo sobe pelo veredito canônico, limitado ao saldo, sem mudar a fala', autofitBlock.includes('const vereditoAnalise = contadorVoz({ script: baseChecagem, regua: reguaAnalise, requestedSeconds: duration })') && autofitBlock.includes('subidaQueOSaldoPaga(') && /if \(sobePara !== undefined\) \{\s*setDuration\(sobePara\)\s*alvoAnalise = sobePara/.test(autofitBlock))
check('alvo efetivo segue para analyze-idea', /JSON\.stringify\(\{ prompt: source, duration: alvoAnalise, language, scriptMode: opts\?\.scriptModeOverride \?\? scriptMode \}\)/.test(client))
check('reguas de cobertura e voz continuam importadas das fontes canônicas', /import \{[^}]*minCoverageFor[^}]*\} from '@\/lib\/narrationFit'/.test(client) && /import \{[^}]*reguaDoServidorNaTela[^}]*falaNaReguaDaTela[^}]*\} from '@\/lib\/contadorVoz'/.test(client))

console.log('\n— 3. a decisão de roteiro curto pertence ao servidor —')
check('servidor emite script_duration_autofit_down', route.includes("name: 'script_duration_autofit_down'"))
check('evento registra duração pedida', route.includes('requested_seconds: requestedDuration'))
check('evento registra duração efetiva', route.includes('effective_seconds: duration'))
check('resposta informa requested_duration', (route.match(/requested_duration: requestedDuration/g) || []).length >= 2)
check('resposta informa autofit_down', (route.match(/autofit_down: degrau\?\.applied === true/g) || []).length >= 2)
check('painel curto é revisão neutra após recusa do servidor', /\{phase === 'script_completion' && scriptTooShort && \(/.test(client) && !/\{phase === 'failed' && scriptTooShort && \(/.test(client))

console.log('\n— 4. escopo e segurança —')
check('nenhuma linha adicionada chama fetch', !addedCode.some((line) => /\bfetch\(/.test(line)))
check('nenhuma linha adicionada navega', !addedCode.some((line) => /router\.push/.test(line)))
check('nenhuma linha adicionada inicia render', !addedCode.some((line) => /handleGenerate|submitToFal|generate-video/.test(line)))
check('nenhuma linha adicionada mexe em preço ou checkout', !addedCode.some((line) => /(price|pricing|checkout|stripe|coupon|tier|paywall|subscri)/i.test(line)))
check('somente cliente, teste e evidência/handoff estão no diff', execSync('git diff --name-only HEAD', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .every((file) => file === CLIENT || file === 'scripts/test-script-preflight.mjs' || file.startsWith('docs/')))

console.log(`\n${failed === 0 ? '✅' : '❌'} ${ok} verificações passaram, ${failed} falharam\n`)
process.exit(failed === 0 ? 0 : 1)
