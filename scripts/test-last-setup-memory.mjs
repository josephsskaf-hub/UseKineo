// KINEO-SPRINT-V1V4-49 — provas lendo o ARQUIVO REAL e o DIFF.
// Nenhuma delas sobe servidor: a regra da sprint e que a verificacao possa
// rodar em 30 segundos e ainda assim provar o que importa.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const FILE = 'app/(dashboard)/generate/GenerateClient.tsx'
const src = readFileSync(FILE, 'utf8')
const diff = execSync('git diff HEAD -- "' + FILE + '"', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
const addedCode = added.filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*') && !l.trim().startsWith('*'))

let ok = 0, fail = 0
const t = (name, cond) => { if (cond) { ok++ } else { fail++; console.error('FALHOU: ' + name) } }

// ── a memoria existe e e fail-closed ────────────────────────────────────────
t('chave de storage por dono', src.includes("const LAST_SETUP_STORAGE_KEY = 'kineo_last_setup_v1'"))
t('chave namespaced por userId', src.includes('function lastSetupStorageKey(userId: string | null | undefined)'))
t('leitura existe', src.includes('function readLastSetup('))
t('escrita existe', src.includes('function writeLastSetup('))
t('leitura valida quality contra a lista', src.includes("const qualities: Quality[] = ['fast', 'basic', 'basic_ai', 'pro', 'cinematic_ai']"))
t('leitura valida duration contra a lista', src.includes('const durations: Duration[] = [35, 45, 60, 90]'))
t('leitura devolve null em quality invalida', src.includes('if (!qualities.includes(parsed.quality as Quality)) return null'))
t('leitura devolve null em duration invalida', src.includes('if (!durations.includes(parsed.duration as Duration)) return null'))
t('leitura nunca lanca (try/catch com return null)', /function readLastSetup[\s\S]*?catch \{\s*\r?\n\s*return null/.test(src))
t('escrita nunca lanca', /function writeLastSetup[\s\S]*?\} catch \{/.test(src))
t('SSR-safe na leitura', /function readLastSetup[\s\S]*?if \(typeof window === 'undefined'\) return null/.test(src))
t('SSR-safe na escrita', /function writeLastSetup[\s\S]*?if \(typeof window === 'undefined'\) return/.test(src))

// ── a memoria so nasce de um despacho REAL ──────────────────────────────────
const dispatchIdx = src.indexOf("trackEvent('video_generation_started', dispatchMetadata)")
const writeIdx = src.indexOf('writeLastSetup(currentUserIdRef.current, {')
t('grava depois do evento de despacho', dispatchIdx > 0 && writeIdx > dispatchIdx)
t('grava a menos de 20 linhas do despacho', src.slice(dispatchIdx, writeIdx).split('\n').length < 20)
t('nao grava no clique de analisar', !/analyze_idea_clicked[\s\S]{0,600}writeLastSetup/.test(src))
t('grava o motor REALMENTE usado, nao o seletor', src.includes("quality: (mode === 'fast' || mode === 'creator' ? 'fast' : quality) as Quality"))
t('uma unica escrita no arquivo inteiro', src.split('writeLastSetup(currentUserIdRef.current').length - 1 === 1)

// ── a oferta e passiva: nada e aplicado sozinho ─────────────────────────────
t('leitura no mount nao aplica nada', /setLastSetup\(readLastSetup\(currentUserIdRef\.current\)\)/.test(src))
t('mount nao chama setQuality', !/setLastSetup\(readLastSetup[\s\S]{0,200}setQuality\(/.test(src))
t('mount nao chama setDuration', !/setLastSetup\(readLastSetup[\s\S]{0,200}setDuration\(/.test(src))
t('aplicar so acontece no onClick', /onClick=\{\(\) => \{\s*\r?\n\s*setQuality\(lastSetupOffer\.setup\.quality\)/.test(src))
t('aplicar usa os MESMOS setters dos controles', src.includes('setDuration(lastSetupOffer.setup.duration)') && src.includes('setScriptMode(lastSetupOffer.setup.scriptMode)'))

// ── a oferta so aparece quando ha diferenca ─────────────────────────────────
t('deriva engineDiffers', src.includes('const engineDiffers = lastSetup.quality !== quality'))
t('deriva durationDiffers', src.includes('const durationDiffers = lastSetup.duration !== duration'))
t('deriva modeDiffers', src.includes('const modeDiffers = lastSetup.scriptMode !== scriptMode'))
t('sem diferenca, sem oferta', src.includes('if (!engineDiffers && !durationDiffers && !modeDiffers) return null'))
t('sem memoria, sem oferta', /const lastSetupOffer = \(\(\) => \{\s*\r?\n\s*if \(!lastSetup\) return null/.test(src))
t('a frase nomeia so o que muda', src.includes("if (durationDiffers) parts.push(`${lastSetup.duration}s`)"))
t('nunca nomeia um motor pelo nome', !/parts\.push\('(Kineo|Kling|Veo|Seedance|Sora|MiniMax|Omni)/.test(src))
t('so renderiza em phase options com analise', src.includes('if (!showStep2 || !analysis || !lastSetupOffer) return'))

// ── impressao medida (a licao da #46) ──────────────────────────────────────
t('emite last_setup_chip_shown', src.includes("trackEvent('last_setup_chip_shown'"))
t('emite last_setup_chip_applied', src.includes("trackEvent('last_setup_chip_applied'"))
t('impressao nao repete a mesma combinacao', src.includes('if (lastSetupShownKeyRef.current === key) return'))
t('impressao marca series_continuation', /last_setup_chip_shown[\s\S]{0,320}series_continuation: searchParams\?\.get\('series'\) === '1'/.test(src))
t('clique marca series_continuation', /last_setup_chip_applied[\s\S]{0,320}series_continuation: searchParams\?\.get\('series'\) === '1'/.test(src))
t('telemetria nunca derruba a tela', src.split("catch { /* telemetria nunca derruba a tela */ }").length - 1 >= 2)

// ── o que o codigo novo NAO pode fazer ─────────────────────────────────────
const forbidden = [
  ['fetch(', /\bfetch\(/],
  ['router.push', /router\.push\(/],
  ['handleGenerate', /handleGenerate\(/],
  ['handleReset', /handleReset\(/],
  ['handleAnalyze', /handleAnalyze\(/],
  ['setError', /setError\(/],
  ['trackGenerationFailure', /trackGenerationFailure\(/],
  ['openOutOfCreditsModal', /openOutOfCreditsModal\(/],
]
for (const [nome, re] of forbidden) {
  t('nenhuma linha nova chama ' + nome, !addedCode.some((l) => re.test(l)))
}

// ── peneira da pista do Codex ──────────────────────────────────────────────
const codexWords = /(price|pricing|plan\b|credits?\b|checkout|coupon|stripe|tier|upgrade|subscription|trial)/i
const sujas = addedCode.filter((l) => codexWords.test(l) && !l.includes('credito') && !l.includes('Cota cheia'))
t('nenhuma linha de codigo nova toca preco/plano/credito/checkout: ' + JSON.stringify(sujas.slice(0, 3)), sujas.length === 0)

// ── o diff mexeu em UM arquivo de produto ──────────────────────────────────
const arquivos = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const produto = arquivos.filter((f) => !f.startsWith('docs/') && !f.startsWith('scripts/'))
t('so GenerateClient.tsx mudou em producao: ' + JSON.stringify(produto), produto.length === 1 && produto[0] === FILE)
t('nenhum arquivo da pista do Codex no diff', !arquivos.some((f) => /^app\/api\/stripe\/|checkoutPricing|marketingPrice|^lib\/growth\/|^app\/business-|^app\/ai-shorts-|OfferModal|ExitIntentOffer|CheckoutResumeBanner|ReferralPromoBanner/.test(f)))
t('nenhum arquivo da vitrine de motores no diff', !arquivos.some((f) => /EngineCycleCard|engineWall|public\/previews/.test(f)))

console.log(`\n${ok} verificacoes passaram, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)
