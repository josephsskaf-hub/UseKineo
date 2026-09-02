// KINEO-COERENCIA-HISTORIA + KINEO-PRIMEIRO-VIDEO — 02/09/2026
// Provas lendo o codigo real (o gate que existe so na biblioteca nao conta).
import { readFileSync } from 'node:fs'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
let ok = 0, fail = 0
const check = (name, cond) => { if (cond) { ok++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name) } }

const router = src('lib/hollywood/router.ts')
console.log('router.ts')
check('teto do planner acompanha o alvo (nao mais 60 chumbado)', router.includes("const ceiling = Math.max(60, Math.round(durationSeconds || 60) + 6)") && !router.includes('while (total > 60 && outScenes.length > 2)'))
check('quando corta, sai a penultima cena — PAYOFF fica', router.includes('outScenes.splice(outScenes.length - 2, 1)'))
check('prompt do planner aceita alvo ate 100s (era 70)', router.includes('Math.max(30, Math.min(100, Math.round(durationSeconds || 60)))'))
check('regra de ORCAMENTO DE NARRACAO no prompt (palavras, nao seconds)', router.includes('NARRATION BUDGET (STRICT') && router.includes('at least 2.1 × the target seconds'))
check('regra: a historia TEM de acabar (PAYOFF falado inteiro)', router.includes('THE STORY MUST END (STRICT)'))
check('faceless de verdade: dialogue do planner vira support narrado', router.includes('KINEO-FACELESS-DE-VERDADE-2026-09-02') && router.includes("sc.type = 'support'"))

const route = src('app/api/generate-video-cinematic/route.ts')
console.log('route.ts')
check('gate de PALAVRAS faladas no caminho automatico', route.includes('KINEO-COERENCIA-HISTORIA-2026-09-02') && route.includes('const neededWords = Math.ceil(hollywoodTarget * WPS * 0.92)'))
check('replaneja ate 2x com deficit em numeros', route.includes('coerenciaReplans < 2') && route.includes('the story ended before it was told'))
check('gate roda ANTES do DURATIONFIX por seconds', route.indexOf('KINEO-COERENCIA-HISTORIA-2026-09-02') < route.indexOf('KINEO-DURATIONFIX-2026-08-17 — dois renders'))
check('prova no claim: narration_words + narration_replans', route.includes('narration_words: coerenciaPalavras') && route.includes('narration_replans: coerenciaReplans'))

// Regex de limpeza da cena faceless contra o prompt REAL do render 79a75506
const real = 'The man looks directly into the lens, excitement in his eyes, as he declares the mystery: "For over 17 years, Reddit users have debated the origins of a mysterious song from 1983.", subtle handheld camera movement'
const cleaned = real
  .replace(/\s*—?\s*looking (straight |directly )?into the lens,? the person says: "[^"]*"/gi, '')
  .replace(/looks? (directly |straight )?(into|at) the (lens|camera)/gi, 'looks away from the camera, mouth closed')
  .replace(/(speaks|speaking|talks|talking|declares|says|addresses) (directly )?to (the )?(camera|lens|viewer)/gi, 'silent, mouth closed')
console.log('limpeza do prompt')
check('"looks directly into the lens" sai do prompt', !/into the lens/i.test(cleaned) && /looks away from the camera, mouth closed/.test(cleaned))
const forced = 'Medium shot, 9:16 vertical framing — looking straight into the lens, the person says: "Hello there" The person speaks'
check('linha forcada do host e removida inteira', !/the person says/.test(forced.replace(/\s*—?\s*looking (straight |directly )?into the lens,? the person says: "[^"]*"/gi, '')))

// Aritmetica do caso real
const WPS = 2.3, target = 68
const needed = Math.ceil(target * WPS * 0.92)
console.log('aritmetica')
check('86 palavras (render do fundador) < ' + needed + ' exigidas → replan dispara', 86 < needed)
check('150 palavras (roteiro certo p/ 60s) passa', 150 >= needed)

// Primeiro video
const handoff = src('lib/creationHandoff.ts')
const gen = src('app/(dashboard)/generate/GenerateClient.tsx')
const topic = src('lib/momentumTopic.ts')
console.log('primeiro video')
check('auto-start sem duration nasce em 35 (era 45)', handoff.includes('duration: handoff.duration ?? 35'))
check('duration=45 na URL vira 35', handoff.includes('rawDuration === 45\n        ? 35'))
check('GenerateClient: os 2 residuais de 45 viraram 35', !/: 45$/m.test(gen.split('\n').filter(l => l.includes('safeDuration') || l.includes('restoredDuration: Duration')).join('\n')))
check('onboarding: consulta /api/credits antes de escolher motor', gen.includes('KINEO-PRIMEIRO-VIDEO-2026-09-02 — CORRIDA') && gen.includes("fetch('/api/credits', { cache: 'no-store' })\n        if (r.ok)"))
check('onboarding: evento first_video_engine_decided', gen.includes("trackEvent('first_video_engine_decided'"))
check('auto-start pula texto que e instrucao', gen.includes("consumeAndSkip('prompt_looks_like_instruction')"))
check('looksLikeInstruction exportado', topic.includes('export function looksLikeInstruction'))
// simula looksLikeInstruction
const INSTRUCTION_START = /^(create|make|generate|write|produce|give me|i want|i need|please|absolutely|sure|certainly|of course|below is|okay|ok\b)/i
const MARKDOWN = /\*\*|^#{1,6}\s|^---/
const LABEL_LINE = /^[A-Z][A-Z /&-]{2,}:/
const like = (t) => { const f = t.trim().split(/\r?\n/).map(l=>l.trim()).find(Boolean) ?? ''; return INSTRUCTION_START.test(f) || LABEL_LINE.test(f) || MARKDOWN.test(f) }
check('"Absolutely. Below is a **complete content package" = instrucao', like('Absolutely. Below is a **complete content package of 10'))
check('"Create a 40-second Shorts video titled" = instrucao', like('Create a 40-second Shorts video titled "What Would Happen"'))
check('"This dog saved a man\'s life... from a deadly tornado!" = tema (auto-start segue)', !like("This dog saved a man's life... from a deadly tornado!"))
check('"Killer clowns... their terrifying history" = tema', !like('Killer clowns... their terrifying history will haunt you.'))

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
