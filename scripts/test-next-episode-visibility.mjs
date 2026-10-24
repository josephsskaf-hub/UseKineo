// sprint-v1v4 #41 — verificacoes do "series_continue_seen" da tela de video pronto.
// Le o ARQUIVO REAL de producao: o objetivo e provar o caller, nao uma copia.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const ts = createRequire(join(raiz, 'package.json'))('typescript')
const ast = ts.createSourceFile('GenerateClient.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const nodes = []
function visit(node) { nodes.push(node); ts.forEachChild(node, visit) }
visit(ast)
const effect = nodes.find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('nextEpisodeSeenRef.current'))?.getText(ast) ?? ''
const button = nodes.find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'button' && node.openingElement.attributes.properties.some(property => ts.isJsxAttribute(property) && property.name.getText(ast) === 'ref' && property.initializer?.getText(ast) === '{nextEpisodeBtnRef}'))?.getText(ast) ?? ''
const original = execFileSync('git', ['show', 'd193b072221b21cf35ad6dfd24f8c1d78aca8d83:app/(dashboard)/generate/GenerateClient.tsx'], { cwd: raiz, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok += 1
  else falhas.push(nome)
}

// ── 1. o evento existe e nasce no lugar certo ──────────────────────────────
check('emite series_continue_seen', src.includes("trackEvent('series_continue_seen'"))
check('fonte done_screen no evento', /series_continue_seen'[\s\S]{0,200}source: 'done_screen'/.test(src))
check('carrega attempt_id', /series_continue_seen'[\s\S]{0,300}attempt_id: attemptId/.test(src))
check('carrega seconds_after_ready', /series_continue_seen'[\s\S]{0,300}seconds_after_ready/.test(src))
check('carrega observed', /series_continue_seen'[\s\S]{0,320}observed,/.test(src))
check('evento unico no efeito done_screen', effect.split("trackEvent('series_continue_seen'").length - 1 === 1)
check('porta de cima tem origem propria e nao duplica done_screen', src.includes("source: 'done_screen_top'") && effect.includes("source: 'done_screen'"))

// ── 2. so dispara na tela de video pronto, uma vez por render ──────────────
check('efeito preso a phase done', /nextEpisodeSeenRef[\s\S]{0,1200}/.test(src) && /useEffect\(\(\) => \{\s*\n\s*if \(phase !== 'done'\) return\s*\n\s*const attemptId = generationAttemptRef\.current\s*\n\s*if \(!attemptId \|\| nextEpisodeSeenRef\.current === attemptId\) return/.test(src))
check('guarda por attempt (nao por sessao)', src.includes('nextEpisodeSeenRef = useRef<string | null>(null)'))
check('marca antes de emitir (sem corrida)', /marcarVisto = \(observed: boolean\) => \{\s*\n\s*if \(nextEpisodeSeenRef\.current === attemptId\) return\s*\n\s*nextEpisodeSeenRef\.current = attemptId/.test(src))
check('dependencia do efeito e phase', /observer\?\.disconnect\(\)\s*\n\s*\}\s*\n\s*\}, \[phase\]\)/.test(src))

// ── 3. verdade de viewport, nao de montagem ────────────────────────────────
check('usa IntersectionObserver', src.includes('new IntersectionObserver('))
check('metade do botao visivel', /threshold: 0\.5/.test(src))
check('so marca em isIntersecting', /if \(entry\.isIntersecting\) \{\s*\n\s*marcarVisto\(true\)/.test(src))
check('desconecta no primeiro acerto', /marcarVisto\(true\)\s*\n\s*observer\?\.disconnect\(\)/.test(src))
check('fallback sem IO marca observed:false', /if \(typeof IntersectionObserver === 'undefined'\) \{\s*\n\s*marcarVisto\(false\)/.test(src))
check('nao ha marcarVisto(true) fora do observer done_screen', effect.split('marcarVisto(true)').length - 1 === 1)

// ── 4. nao vaza timer nem observer ─────────────────────────────────────────
check('retentativa limitada', /if \(tentativas > 25\) return/.test(src))
check('cleanup limpa timer', /if \(timer\) clearTimeout\(timer\)/.test(src))
check('cleanup desconecta observer', /return \(\) => \{\s*\n\s*if \(timer\) clearTimeout\(timer\)\s*\n\s*observer\?\.disconnect\(\)/.test(src))

// ── 5. o botao medido e o botao real ───────────────────────────────────────
check('ref plugado no botao', /ref=\{nextEpisodeBtnRef\}[\s\S]{0,220}handleContinueSeries\(analysis\?\.title \?\? prompt, 'done_screen'/.test(src))
check('ref declarado como HTMLButtonElement', src.includes("nextEpisodeBtnRef = useRef<HTMLButtonElement | null>(null)"))
check('destino intacto (handleContinueSeries done_screen)', src.includes("handleContinueSeries(analysis?.title ?? prompt, 'done_screen', publicVideoId)"))
check('copy do botao intacta', src.includes('Build the next episode →'))
check('subtitulo intacto', src.includes('Same settings stay selected · new hook, facts and payoff'))

// ── 6. o botao deixou de ser rodape ────────────────────────────────────────
check('fixture41 preserva fundo azul de acao original', /ref=\{nextEpisodeBtnRef\}[\s\S]{0,700}background: 'rgba\(41,151,255,\.10\)'/.test(original))
check('fixture41 preserva borda azul de acao original', /ref=\{nextEpisodeBtnRef\}[\s\S]{0,700}border: '1px solid rgba\(41,151,255,\.40\)'/.test(original))
check('botao atual usa tokens de acao do tema', button.includes("background: 'var(--accent-soft)'") && button.includes("border: '1px solid var(--border)'") && button.includes("color: 'var(--accent)'"))
check('cinza de rodape removido do botao', !/ref=\{nextEpisodeBtnRef\}[\s\S]{0,700}rgba\(255,255,255,\.055\)/.test(src))

// ── 7. pista alheia intocada (regra 2) ─────────────────────────────────────
for (const proibido of ['checkoutPricing', 'marketingPrice', 'WelcomeOfferModal(', 'stripe']) {
  check(`nao introduz ${proibido}`, !new RegExp(`series_continue_seen[\\s\\S]{0,900}${proibido.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(src))
}
check('nenhum toque em credito no bloco novo', !/series_continue_seen[\s\S]{0,900}credits/.test(src))

// ── 8. o vizinho que gerou a hipotese continua de pe ───────────────────────
const shelf = readFileSync(join(raiz, 'components/video/NextShortsSection.tsx'), 'utf8')
check('next_shorts_seen preservado', shelf.includes("onEvent?.('next_shorts_seen'"))
check('next_shorts_shown preservado', shelf.includes("onEvent?.('next_shorts_shown'"))

if (falhas.length) {
  console.error(`FALHOU (${falhas.length}):\n - ` + falhas.join('\n - '))
  process.exit(1)
}
console.log(`OK — ${ok} verificacoes`)
