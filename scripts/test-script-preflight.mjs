/**
 * sprint-v1v4 #48 — verificações da CHECAGEM ANTES DA VIAGEM.
 *
 * Lê o arquivo REAL (não uma cópia do raciocínio) e o DIFF contra o commit
 * anterior. Prova três famílias de coisa:
 *   1. a checagem existe, usa a régua do servidor e tem as três travas;
 *   2. ela não gera, não cobra, não navega e não emite falha;
 *   3. nenhuma linha nova encosta na pista do Codex (preço/plano/crédito).
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ARQ = 'app/(dashboard)/generate/GenerateClient.tsx'
const src = readFileSync(ARQ, 'utf8')
const diff = execSync(`git diff HEAD -- "${ARQ}"`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const linhasMais = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
const codigoMais = linhasMais
  .map((l) => l.slice(1))
  .filter((l) => {
    const t = l.trim()
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
  })

let ok = 0
let falhou = 0
const check = (nome, cond) => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) } else { falhou++; console.log(`  ✗ ${nome}`) }
}

console.log('\n— 1. a checagem existe e usa a régua do servidor —')
check('estado scriptTooShortPreflight existe', /const \[scriptTooShortPreflight, setScriptTooShortPreflight\] = useState\(false\)/.test(src))
check('ref de chave texto|duração existe', /const preflightFiredRef = useRef<string>\(''\)/.test(src))
check('usa speechSeconds (a função do servidor)', /const falaSeg = speechSeconds\(baseChecagem\)/.test(src))
check('usa MIN_COVERAGE (o limiar do servidor)', /const cobre = falaSeg >= duration \* MIN_COVERAGE/.test(src))
check('speechSeconds e MIN_COVERAGE vêm de lib/narrationFit', /import \{ MIN_COVERAGE, speechSeconds \} from '@\/lib\/narrationFit'/.test(src))
check('sugestão de duração vem de largestFittingDuration', /suggestedDuration: largestFittingDuration\(falaSeg\) \?\? 0/.test(src))
check('largestFittingDuration vem de lib/expandPolicy', /largestFittingDuration,\n\} from '@\/lib\/expandPolicy'/.test(src))
check('a conta de palavras que faltam é a mesma do contador vivo (× 2.3)', /Math\.ceil\(\(duration \* MIN_COVERAGE - falaSeg\) \* 2\.3\)/.test(src))
check('a checagem roda DENTRO do handleAnalyze', src.indexOf('const baseChecagem = expandBaseRef.current') > src.indexOf('async function handleAnalyze('))
check('roda ANTES de waitForActiveRenderRestore (nada de viagem começa)', src.indexOf('const baseChecagem = expandBaseRef.current') < src.indexOf('await waitForActiveRenderRestore()'))

console.log('\n— 2. as três travas (orientar sem aprisionar) —')
check('trava 1: só em script_mode verbatim', /if \(scriptMode === 'verbatim' && baseChecagem\)/.test(src))
check('trava 2: só acima de 12s (abaixo é ideia, ramo do servidor)', /!cobre && falaSeg > 12 && preflightFiredRef\.current !== chavePre/.test(src))
check('trava 3: chave é texto|duração', /const chavePre = `\$\{baseChecagem\}\|\$\{duration\}`/.test(src))
check('a chave é gravada antes de barrar (a segunda vontade passa)', src.indexOf('preflightFiredRef.current = chavePre') < src.indexOf('setScriptTooShortPreflight(true)'))
check('insistir é medido (script_preflight_overridden)', /trackEvent\('script_preflight_overridden'/.test(src))
check('barrar é medido (script_preflight_blocked)', /trackEvent\('script_preflight_blocked'/.test(src))
check('o evento diz fala, alvo e palavras que faltam', /speech_seconds: Math\.round\(falaSeg\),[\s\S]{0,80}target_seconds: duration,[\s\S]{0,80}missing_words: faltam,/.test(src))

console.log('\n— 3. o painel abre pelas duas portas —')
check('gate do painel aceita preflight', /\(phase === 'failed' \|\| scriptTooShortPreflight\) && scriptTooShort && \(/.test(src))
check('o painel antigo (phase failed) continua existindo', /phase === 'failed' \|\| scriptTooShortPreflight/.test(src))
check('a bandeira se apaga sozinha quando scriptTooShort some', /if \(!scriptTooShort\) setScriptTooShortPreflight\(false\)/.test(src))
check('preflight não vira tela de falha: setPhase(\'idle\')', /setPhase\('idle'\)\n *return\n *\}\n/.test(src.slice(src.indexOf('script_preflight_blocked'))))
check('showGenericFailure segue exigindo phase failed', /const showGenericFailure = phase === 'failed' && !scriptTooShort && !creditsHeld/.test(src))
check('failureScreenKind segue exigindo phase failed', /phase !== 'failed' \? null : scriptTooShort \?/.test(src))

console.log('\n— 4. o que o código NOVO não faz —')
check('nenhuma linha nova chama fetch(', !codigoMais.some((l) => /\bfetch\(/.test(l)))
check('nenhuma linha nova chama router.push', !codigoMais.some((l) => /router\.push/.test(l)))
check('nenhuma linha nova chama handleGenerate/submit de render', !codigoMais.some((l) => /handleGenerate|submitToFal|generate-video/.test(l)))
check('nenhuma linha nova chama trackGenerationFailure', !codigoMais.some((l) => /trackGenerationFailure/.test(l)))
check('nenhuma linha nova mexe em setError', !codigoMais.some((l) => /setError\(/.test(l)))
check('nenhuma linha nova chama handleReset (lição da #44)', !codigoMais.some((l) => /handleReset/.test(l)))

console.log('\n— 5. peneira da pista do Codex (todas as linhas + de código) —')
const proibido = /(price|pricing|plan\b|plans\b|credit|credits|checkout|stripe|coupon|cupom|tier|upgrade|paywall|subscri)/i
const sujas = codigoMais.filter((l) => proibido.test(l))
check(`nenhuma linha nova fala de preço/plano/crédito/checkout (achadas: ${sujas.length})`, sujas.length === 0)
if (sujas.length) sujas.forEach((l) => console.log('      →', l.trim().slice(0, 120)))
check('nenhum arquivo da pista do Codex foi tocado', execSync('git diff --name-only HEAD', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .every((f) => !/^app\/api\/stripe\/|checkoutPricing|marketingPrice|^lib\/growth\/|^app\/business-|^app\/ai-shorts-/.test(f)))

console.log(`\n${falhou === 0 ? '✅' : '❌'} ${ok} verificações passaram, ${falhou} falharam\n`)
process.exit(falhou === 0 ? 0 : 1)
