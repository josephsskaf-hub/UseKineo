// KINEO1-JUIZ-HONESTO-2026-09-21 — guardião do conserto 4 do diagnóstico (fundador: "vai pro conserto 4, o juiz, tá
// validado, pode construir"). O juiz mentia nas duas direções; aqui cada mentira vira uma prova EXECUTADA sobre as
// funções puras (normalizeCoherence, knownCoherenceCase, narrationCutSeconds), com os números REAIS dos filmes de 18/09.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
function loadWith(file, requireMap, env = {}) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, process: { env }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Promise, setTimeout, clearTimeout, AbortController, fetch: undefined }, { filename: file })
  return exports
}
const refusal = loadWith('lib/modelRefusal.ts', {})
const guard = loadWith('lib/promptGuard.ts', {})
const J = loadWith('lib/fastCoherence.ts', { '@/lib/promptGuard': guard, '@/lib/modelRefusal': refusal })
const gen = (n, src) => ({ scene: n, voiceover: 'x', query: 'q', from: 0, sources: src, tags: [] })

console.log('== (c) a recusa do modelo ==')
checa('detector: as formas reais de recusa (en/pt/es), e um roteiro normal NÃO', refusal.looksLikeModelRefusal("I'm sorry, but I can't assist with that request.") && refusal.looksLikeModelRefusal('I cannot help with this request.') && refusal.looksLikeModelRefusal('Desculpe, mas não posso ajudar com isso.') && !refusal.looksLikeModelRefusal('HOOK (0-2s): [Pexels: airport] The Boeing 737 has a secret under its wing.') && !refusal.looksLikeModelRefusal(''))
const k = J.knownCoherenceCase('Three secret Windows shortcuts', "I'm sorry, but I can't assist with that request. I'm sorry, but I can't assist with that request.")
checa('juiz: narração = recusa → nota 0, off, sem GPT, request_pt = o pedido (era 100 no filme 33c24d46)', k && k.result.score === 0 && k.result.verdict === 'off' && k.result.model === null && k.result.request_pt === 'Three secret Windows shortcuts' && /RECUSA/.test(k.result.problems[0]))
checa('juiz: chamada antiga (só prompt) continua válida e um pedido normal não é caso conhecido', J.knownCoherenceCase('Why are Boeing 737 engines flat on the bottom?') === null && J.knownCoherenceCase('Why are Boeing 737 engines flat?', 'The Boeing 737 engines are flat because…') === null)
checa('versão nova (o painel julga de novo os filmes antigos)', J.FAST_COHERENCE_VERSION === 'k1_coerencia_v5_honesto')

console.log('== (a) gerado não vale 100 ==')
const base = { prompt_vs_narration: 100, narration_vs_visuals: 100, problems: [], summary: 's', request_pt: 'r' }
const ctx = (scenes, extra = {}) => ({ hasEvidence: true, model: 'm', ms: 1, scenes, narration: 'a b c', filmSeconds: 44, ...extra })
const carros = J.normalizeCoherence(base, ctx([1, 2, 3, 4, 5, 6, 7].map((n) => gen(n, ['aiStill']))))
checa('filme "Carros" (7 cenas só aiStill, juiz disse 100) → visual 90, nota 95 (não 100)', carros.narration_vs_visuals === 90 && carros.score === 95)
const misto = J.normalizeCoherence(base, ctx([gen(1, ['aiStill', 'pixabay']), gen(2, ['pixabay'])]))
checa('filme com stock verificado pelas tags mantém o 100 (o teto é só para o 100% gerado)', misto.narration_vs_visuals === 100 && misto.score === 100)
checa('prompt do juiz: origem gerada diz "QUALITY is NOT verified" e a GENERATED FOOTAGE RULE existe', rd('lib/fastCoherence.ts').includes("aiStill: 'image generated from this scene text (the SUBJECT probably matches; image QUALITY is NOT verified") && rd('lib/fastCoherence.ts').includes('GENERATED FOOTAGE RULE: stills and clips "generated from this scene text" match the subject by construction, but nothing verifies how they look'))

console.log('== (d) narração cortada ==')
checa('aritmética: 177 palavras (68 s) num filme de 15 s = corte; 110 palavras num filme de 35 s = não; 135 num de 60 s = não; sem duração = não', J.narrationCutSeconds({ words: 177, filmSeconds: 15 }).cut === true && J.narrationCutSeconds({ words: 110, filmSeconds: 35 }).cut === false && J.narrationCutSeconds({ words: 135, filmSeconds: 60 }).cut === false && J.narrationCutSeconds({ words: 300, filmSeconds: null }).cut === false)
checa('acima do teto de 90 s também é corte (260 palavras = 100 s)', J.narrationCutSeconds({ words: 260, filmSeconds: 90 }).cut === true)
const jovem = J.normalizeCoherence({ ...base, prompt_vs_narration: 60, narration_vs_visuals: 40 }, ctx([gen(1, ['pixabay'])], { narration: Array(177).fill('w').join(' '), filmSeconds: 15 }))
checa('filme "Jovem" (177 palavras, claim 15 s; juiz deu 50) → teto 40 e o problema nomeia o corte em 1º lugar', jovem.score === 40 && /narração cortada: ~68 s de fala para um filme de 15 s/.test(jovem.problems[0]))
const normal = J.normalizeCoherence({ ...base, prompt_vs_narration: 90, narration_vs_visuals: 80 }, ctx([gen(1, ['pixabay'])], { narration: Array(110).fill('w').join(' '), filmSeconds: 35 }))
checa('filme pago de 35 s com 110 palavras (o compose estica o filme) → sem flag, nota 85', normal.score === 85 && normal.problems.length === 0)

console.log('== (b) ideia curta desenvolvida ==')
checa('prompt do juiz traz o exemplo do trem de pouso: desenvolver a ideia = 90-100; "adiciona informação" NUNCA é problema em ideia curta', rd('lib/fastCoherence.ts').includes('EXAMPLE: request "Why are the landing-gear wheels of big planes tilted?"') && rd('lib/fastCoherence.ts').includes('is NEVER a problem for a SHORT IDEA'))

console.log('== ligações ==')
const adm = rd('lib/admin/fastCoherence.ts')
checa('leitor do painel passa a duração do CLAIM (já clampada) ao juiz, com a do vídeo de reserva', adm.includes('claim_seconds: number | null') && adm.includes('filmSeconds: r.claim_seconds ?? r.seconds'))
checa('scoreFastCoherence entrega narração + duração ao normalizador e consulta o caso conhecido com a narração', rd('lib/fastCoherence.ts').includes('const known = knownCoherenceCase(input.prompt, input.narration)') && rd('lib/fastCoherence.ts').includes('scenes: input.scenes ?? null, narration: input.narration, filmSeconds: input.filmSeconds ?? null }'))
const gs = rd('app/api/generate-script/route.ts')
checa('o ESCRITOR recusa a recusa (422 model_refused_topic) antes de qualquer gasto, pela mesma fonte única', gs.includes("import { looksLikeModelRefusal, MODEL_REFUSAL_MESSAGE } from '@/lib/modelRefusal'") && gs.includes("if (looksLikeModelRefusal(script)) {\n      return await recusar(422, { error: MODEL_REFUSAL_MESSAGE, reason: 'model_refused_topic', retryable: false }"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
