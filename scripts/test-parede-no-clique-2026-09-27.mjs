// KINEO-PAREDE-NO-CLIQUE + KINEO-PAREDE-TRIAL-KINEO1 — 2026-09-27 (sprint MRR). Guardião por leitura de fonte
// (readFileSync: o alias @/ não roda aqui). Prova: (1) o auto-analyze do /studio/create decide pela guarda de saldo
// ANTES de chamar o roteiro, espera o saldo chegar (até 1,5 s) e nunca deixa de analisar; (2) no modal, trial ativo com
// saldo que paga um Kineo 1 e nenhum filme vê a saída "Make it now with Kineo 1"; (3) a saída grátis de sempre não muda.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const G = rd('app/(dashboard)/generate/GenerateClient.tsx')

// (1) guarda antes do roteiro
const i0 = G.indexOf("const auto = searchParams?.get('autoanalyze') === '1'")
const eff = G.slice(i0, G.indexOf('}, [searchParams, activeRenderRestoreResolved, credits, autoWaitTick])', i0))
checa('auto-analyze: a guarda outOfCredits roda antes de handleAnalyze', eff.indexOf('} else if (outOfCredits()) {') > 0 && eff.indexOf('} else if (outOfCredits()) {') < eff.indexOf("handleAnalyze(sp, { fromTopic: true, skipPreview: true })"))
checa('auto-analyze: parede abre o modal e NÃO chama o roteiro', /outOfCredits\(\)\) \{[\s\S]*?openOutOfCreditsModal\(\)\n\s+return\n\s+\}/.test(eff))
checa('auto-analyze: saldo ainda não lido → espera 1,5 s uma vez e tenta de novo', eff.includes('if (credits === null) {') && eff.includes('setTimeout(() => setAutoWaitTick((t) => t + 1), 1500)') && G.includes('}, [searchParams, activeRenderRestoreResolved, credits, autoWaitTick])'))
checa('auto-analyze: depois da espera segue como sempre (nunca fica sem análise)', /if \(!autoWaitScheduledRef\.current\) \{[\s\S]*?return\n\s+\}\n\s+\}/.test(eff) && eff.includes("handleAnalyze(sp, { fromTopic: true, skipPreview: true })"))
checa('auto-analyze: a chave só é marcada quando decide (parede ou análise), não na espera', (eff.match(/autoAnalyzeKeyRef\.current = key/g) || []).length === 2 && eff.indexOf('autoAnalyzeKeyRef.current = key') > eff.indexOf('if (credits === null) {'))
checa('auto-analyze: evento wall_before_script com saldo, motor e duração', /trackEvent\('wall_before_script', \{ surface: 'studio_create_autoanalyze', credits, mode, engine: aiEngine, duration \}\)/.test(eff))
checa('outOfCredits não foi redigitada (fast continua livre da guarda)', G.includes("    if (mode === 'fast') return false\n    if (credits === null) return false"))

// (2) saída Kineo 1 no modal para trial ativo
checa('modal: prop trialKineo1 só com trial ativo, 0 filmes, não pagou e saldo ≥ custo do Kineo 1 (custo nunca digitado)', /trialActive === true && filmsDelivered === 0 && !hasPaid && credits !== null &&\n\s+credits >= creditCostForDuration\('fast', isPaidAccount, duration\)/.test(G) && G.includes("cost: creditCostForDuration('fast', isPaidAccount, duration), seconds: duration"))
checa('modal: a caixa existe e chama a mesma saída (seleciona Kineo 1, não gera)', G.includes('data-testid="trial-kineo1-offer"') && /\{trialKineo1 && onFirstFilmFree && \(/.test(G) && G.includes('Make it now with Kineo 1 · {trialKineo1.cost} credits →'))
checa('modal: o clique registra a variante (trial_kineo1 vs free)', G.includes("variant: trialActive === true ? 'trial_kineo1' : 'free', credits: credits ?? null,"))
checa('modal: a saída grátis de sempre ficou como estava', G.includes("  const firstFilmFreeAvailable =\n    freeFilmAvailable &&\n    filmsDelivered === 0 &&\n    !isStarter && !isCreator && !isStudio &&\n    !hasPaid &&\n    trialActive !== true"))
checa('modal: o custo mostrado é a variável, nunca um número', !/Kineo 1 · [0-9]+ credits/.test(G))
checa('nada foi tocado em CARD_ENTRY_ONLY (porta de $1 morta segue morta)', G.includes('trialKineo1={\n            !CARD_ENTRY_ONLY &&'))

console.log(`test-parede-no-clique-2026-09-27: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
