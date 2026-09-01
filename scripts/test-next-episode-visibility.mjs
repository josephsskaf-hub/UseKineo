// sprint-v1v4 #41 — verificacoes do "series_continue_seen" da tela de video pronto.
// Le o ARQUIVO REAL de producao: o objetivo e provar o caller, nao uma copia.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')

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
check('evento unico no arquivo', src.split("trackEvent('series_continue_seen'").length - 1 === 1)

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
check('nao ha marcarVisto(true) fora do observer', src.split('marcarVisto(true)').length - 1 === 1)

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
check('fundo azul de acao', /ref=\{nextEpisodeBtnRef\}[\s\S]{0,700}background: 'rgba\(41,151,255,\.10\)'/.test(src))
check('borda azul de acao', /ref=\{nextEpisodeBtnRef\}[\s\S]{0,700}border: '1px solid rgba\(41,151,255,\.40\)'/.test(src))
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
