// sprint-assinaturas #9 (02/09): o teto de 5.000 do analyze-idea aparece no
// /studio (onde a pessoa escreve), o Generate nao navega com texto acima do
// teto, e existe um corte de 1 clique que respeita fronteira de frase.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
let checks = 0
const ok = (v, l) => { assert.ok(v, l); checks += 1 }
const eq = (a, b, l) => { assert.equal(a, b, l); checks += 1 }

function loadTs(p, mocks = {}) {
  const out = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const module = { exports: {} }
  const req = (id) => { if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }
  new Function('require', 'module', 'exports', out)(req, module, module.exports)
  return module.exports
}

const limits = loadTs('lib/analyzeLimits.ts')
const lib = loadTs('lib/studioPromptLimit.ts', { '@/lib/analyzeLimits': limits })
const MAX = limits.ANALYZE_PROMPT_MAX_CHARS
eq(MAX, 5000, 'teto unico continua 5000')

// ── promptLimitState ────────────────────────────────────────────────────────
{
  const s = lib.promptLimitState('hello')
  eq(s.over, false, 'curto nao passa do teto'); eq(s.excess, 0, 'excesso 0')
  const exact = lib.promptLimitState('a'.repeat(MAX))
  eq(exact.over, false, 'exatamente o teto ainda cabe')
  const over = lib.promptLimitState('a'.repeat(6228))
  eq(over.over, true, 'caso real 6228 passa'); eq(over.excess, 1228, 'excesso = 1228 (o numero da tela do adrianwells)')
  const padded = lib.promptLimitState('   ' + 'a'.repeat(MAX) + '  \n')
  eq(padded.over, false, 'espacos das pontas nao contam (mesma regua do analyze)')
  eq(lib.formatLimitCounter(over), '6,228 / 5,000 characters — 1,228 over the limit', 'contador com o numero exato')
  eq(lib.formatLimitCounter(s), '5 / 5,000 characters', 'contador abaixo do teto sem alarme')
}

// ── trimPromptToLimit ───────────────────────────────────────────────────────
{
  const r0 = lib.trimPromptToLimit('short text.')
  eq(r0.removed, 0, 'abaixo do teto nao corta'); eq(r0.boundary, 'none', 'boundary none')

  // roteiro de frases de ~60 chars ate ~6200 chars
  const sentence = 'The ocean hides a mountain taller than Everest beneath its waves. '
  const script = sentence.repeat(95).trim() // ~6270
  ok(script.length > MAX, 'fixture passa do teto')
  const r = lib.trimPromptToLimit(script)
  ok(r.text.length <= MAX, 'resultado cabe no teto')
  eq(r.boundary, 'sentence', 'corta em fronteira de frase')
  ok(/\.$/.test(r.text), 'termina com ponto final (frase inteira)')
  eq(r.removed, script.length - r.text.length, 'removed bate com a diferenca')
  ok(r.text.length > MAX - sentence.length - 1, 'usa a ULTIMA frase que cabe, nao uma la atras')
  ok(script.startsWith(r.text), 'so tira do fim — nunca reescreve o inicio')

  // quebra de linha como fronteira (formato ChatGPT com rubricas)
  const lines = Array.from({ length: 120 }, (_, i) => `[SCENE ${i + 1}] VISUAL: slow dolly over ruins. NARRATION: line ${i + 1}`).join('\n')
  const rl = lib.trimPromptToLimit(lines)
  ok(rl.text.length <= MAX, 'formato com linhas cabe')
  ok(!rl.text.endsWith('\n'), 'sem quebra pendurada no fim')
  ok(rl.text.split('\n').every((l) => l.startsWith('[SCENE')), 'nenhuma linha partida ao meio')

  // sem pontuacao → fronteira de palavra
  const words = ('lorem ipsum dolor sit amet ').repeat(300).trim()
  const rw = lib.trimPromptToLimit(words)
  eq(rw.boundary, 'word', 'sem frase = palavra inteira')
  ok(rw.text.length <= MAX && !rw.text.endsWith(' '), 'cabe e nao termina em espaco')
  ok(words.startsWith(rw.text + ' '), 'palavra nao partida')

  // sem espacos → corte duro (nunca trava)
  const blob = 'x'.repeat(7000)
  const rb = lib.trimPromptToLimit(blob)
  eq(rb.boundary, 'hard', 'sem espaco = corte duro'); eq(rb.text.length, MAX, 'corte duro no teto exato')

  // frase util la atras demais (antes da metade) nao vale — cai em palavra
  const early = 'Intro. ' + ('word '.repeat(1500)).trim()
  const re = lib.trimPromptToLimit(early)
  eq(re.boundary, 'word', 'fronteira de frase antes da metade e ignorada')
  ok(re.text.length > MAX / 2, 'resultado nao encolhe para 6 chars')

  // teto reduzido (sufixo [camera: ...]) respeitado
  const rc = lib.trimPromptToLimit(script, MAX - 80)
  ok(rc.text.length <= MAX - 80, 'teto menor para deixar espaco ao sufixo do preset')
}

// ── StudioClient: fiacao ────────────────────────────────────────────────────
{
  const src = read('app/(dashboard)/studio/StudioClient.tsx')
  ok(src.includes("from '@/lib/studioPromptLimit'"), 'StudioClient importa a lib')
  ok(src.includes('const limit = useMemo(() => promptLimitState(finalPrompt), [finalPrompt])'), 'teto medido no finalPrompt (com o sufixo da camera)')
  ok(/const generate = \(\) => \{\s*\n(?:\s*\/\/.*\n)*\s*if \(limit\.over\) return/.test(src), 'generate() nao navega acima do teto')
  ok(src.includes('disabled={!prompt.trim() || limit.over}'), 'botao Generate travado acima do teto')
  ok(src.includes('? `Trim ${limit.excess.toLocaleString(\'en-US\')} characters to continue`'), 'rotulo do botao diz quantos cortar')
  ok(src.includes('formatLimitCounter(limit)'), 'contador na caixa')
  ok(src.includes('✂ Trim to fit'), 'botao de corte de 1 clique')
  ok(src.includes('trimPromptToLimit(prompt, limit.max - suffixLen)'), 'corte deixa espaco para o sufixo da camera')
  ok(src.includes("trackEvent('studio_prompt_over_limit_shown'"), 'evento de medicao ao passar do teto')
  ok(src.includes("trackEvent('studio_prompt_trimmed_to_limit'"), 'evento de medicao do corte')
  ok(!/<textarea ref=\{promptRef\}[^>]*maxLength/.test(src), 'textarea SEM maxLength: colagem nunca e truncada em silencio')
  ok(src.includes('delete scene labels and visual notes'), 'dica honesta para roteiro verbatim com rubricas')
  // a tela seguinte continua com a propria regua (defesa em profundidade)
  const gen = read('app/(dashboard)/generate/GenerateClient.tsx')
  ok(gen.includes('if (sourceLen > ANALYZE_PROMPT_MAX_CHARS) {'), 'GenerateClient mantem o portao proprio')
}

console.log(`test-studio-prompt-limit: ${checks} verificacoes OK`)
