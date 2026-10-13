// KINEO-SONDA-H3MAX-2026-10-13 — guardião da sonda de comparação H3 × H3 Max (app/api/admin/effect-probe/route.ts).
// Fundador (13/10: "Testar o H3"): ETAPA 1 = só a sonda; o pipeline de vídeo fica intocado.
// Prova (readFileSync + execução do validador real transpilado; nenhum import com alias @/):
//   (1) só admin: POST e GET recusam com 403 antes de qualquer coisa; a lista de e-mails é a de sempre;
//   (2) texto livre SÓ nas chaves h3*: o catálogo antigo não lê prompt e recusa prompt com 400 'prompt_not_allowed';
//       as 4 chaves h3* existem com os endpoints exatos da fal e os MESMOS parâmetros (5 s, 768P, 'disabled');
//   (3) limite de 600: o validador real aceita 600, recusa 601, vazio, não-string e caractere de controle;
//   (4) o commit que trouxe a sonda NÃO tocou lib/hollywood, lib/compose*, generate-video-cinematic nem compose;
//   (5) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const ROUTE = 'app/api/admin/effect-probe/route.ts'
const PIPELINE = ['lib/hollywood', 'lib/compose.ts', 'lib/composeClaim.ts', 'app/api/generate-video-cinematic', 'app/api/compose']
const SRC = fs.readFileSync(ROUTE, 'utf8').replace(/\r\n/g, '\n')

let fails = 0
const check = (name, fn) => {
  let ok = false
  try { ok = fn() === true } catch (e) { ok = false; name += ' [' + (e && e.message) + ']' }
  console.log((ok ? 'PASS ' : 'FAIL ') + name)
  if (!ok) fails++
}

const block = (src, start, end) => {
  const i = src.indexOf(start)
  if (i < 0) return ''
  const j = src.indexOf(end, i + start.length)
  return j < 0 ? '' : src.slice(i, j + end.length)
}
const fn = (src, name) => block(src, `export async function ${name}(`, '\n}\n')

function rulesAdmin(src) {
  const post = fn(src, 'POST'), get = fn(src, 'GET')
  const gate = "if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"
  return !!post && !!get &&
    post.split('\n')[1].trim() === gate && get.split('\n')[1].trim() === gate &&
    src.includes("const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])") &&
    src.includes('return user && ADMIN_EMAILS.has((user.email ?? \'\').toLowerCase()) ? user : null')
}

const H3_EXPECTED = {
  h3_t2v: "{ model: 'minimax/h3/text-to-video', needsImage: false, input: (prompt) => ({ prompt, ...H3_SAME, aspect_ratio: '9:16' }) }",
  h3max_t2v: "{ model: 'minimax/h3-max/text-to-video', needsImage: false, input: (prompt) => ({ prompt, ...H3_SAME, aspect_ratio: '9:16' }) }",
  h3_i2v: "{ model: 'minimax/h3/image-to-video', needsImage: true, input: (prompt, image) => ({ prompt, image_url: image, ...H3_SAME }) }",
  h3max_i2v: "{ model: 'minimax/h3-max/image-to-video', needsImage: true, input: (prompt, image) => ({ prompt, image_url: image, ...H3_SAME }) }",
}
function rulesPromptOnlyH3(src) {
  const probes = block(src, 'const PROBES: Record<string, { model: string; input: (image: string) => Record<string, unknown> }> = {', '\n}\n')
  const h3 = block(src, 'const H3_PROBES:', '\n}\n')
  const post = fn(src, 'POST')
  const keys = [...h3.matchAll(/^ {2}([a-z0-9_]+): /gm)].map((m) => m[1])
  const promptReads = post.match(/body\?\.prompt/g) || []
  return !!probes && !!h3 &&
    !/prompt/i.test(probes) && // catálogo antigo: a entrada só recebe a foto
    JSON.stringify(keys) === JSON.stringify(Object.keys(H3_EXPECTED)) && keys.every((k) => k.startsWith('h3')) &&
    Object.entries(H3_EXPECTED).every(([k, v]) => h3.includes(`  ${k}: ${v},`)) &&
    src.includes("const H3_SAME = { duration: 5, resolution: '768P', prompt_expansion_mode: 'disabled' } as const") &&
    // o prompt só é lido em dois lugares: para RECUSAR no catálogo antigo e, nas chaves h3*, pelo validador
    promptReads.length === 2 &&
    post.includes("if (probe && body?.prompt !== undefined) return NextResponse.json({ error: 'prompt_not_allowed' }, { status: 400 })") &&
    post.includes('const prompt = h3 ? h3Prompt(body?.prompt) : null') &&
    post.includes("if (h3 && !prompt) return NextResponse.json({ error: 'bad_prompt', max_chars: H3_PROMPT_MAX }, { status: 400 })") &&
    post.includes('const input = h3 ? h3.input(prompt as string, image) : probe!.input(image)') &&
    // a chave é procurada com hasOwnProperty (nada de 'constructor'/'__proto__' virando sonda)
    post.includes('Object.prototype.hasOwnProperty.call(H3_PROBES, key)') && post.includes('Object.prototype.hasOwnProperty.call(PROBES, key)') &&
    // foto: o catálogo antigo e o i2v continuam presos ao NOSSO storage
    post.includes('const needsImage = h3 ? h3.needsImage : true') &&
    post.includes("if (needsImage && (!image || !storage.startsWith('https://') || !image.startsWith(storage)))")
}

function loadValidator(src) {
  const max = src.match(/^const H3_PROMPT_MAX = (\d+)$/m)
  const body = block(src, 'function h3Prompt(', '\n}\n')
  if (!max || !body) return null
  const js = ts.transpileModule(`const H3_PROMPT_MAX = ${max[1]}\n${body}\nexport { h3Prompt }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', js)(m, m.exports)
  return m.exports.h3Prompt
}
function rulesLimit(src) {
  const v = loadValidator(src)
  if (!v) return false
  const s600 = 'a'.repeat(600)
  return v(s600) === s600 && v('a'.repeat(601)) === null && v('  ' + s600 + '  ') === s600 &&
    v('') === null && v('   ') === null && v(42) === null && v(['x']) === null && v({ toString: () => 'x' }) === null && v(null) === null && v(undefined) === null &&
    v('storm over the sea\u0000') === null && v('a\u001bb') === null &&
    v('line one\nline two') === 'line one\nline two' && v('Wide shot, slow push-in. "We hold the line."') === 'Wide shot, slow push-in. "We hold the line."'
}

function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
function pipelineUntouched() {
  // Commit que introduziu a marca na rota da sonda; o diff DELE contra o pai não pode tocar o pipeline.
  // Antes do commit (árvore de trabalho), mede a árvore contra HEAD.
  const c = git(['log', '--format=%H', '-S', 'KINEO-SONDA-H3MAX-2026-10-13', '--', ROUTE]).split('\n').filter(Boolean).pop()
  const changed = c ? git(['diff', '--name-only', `${c}^`, c, '--', ...PIPELINE]) : git(['diff', '--name-only', 'HEAD', '--', ...PIPELINE])
  return changed === ''
}

check('1 só admin: POST e GET abrem com o portão 403 e a lista de e-mails de sempre', () => rulesAdmin(SRC))
check('2 prompt livre SÓ nas chaves h3*; catálogo antigo sem prompt e recusando prompt; mesmos parâmetros nos dois motores', () => rulesPromptOnlyH3(SRC))
check('3 limite de 600 executado no validador real: 600 passa, 601/vazio/não-string/controle recusados', () => rulesLimit(SRC))
check('4 o commit da sonda não tocou lib/hollywood, lib/compose*, generate-video-cinematic nem compose (diff vazio)', () => pipelineUntouched())

// Mutantes: cada um tem de aplicar (o texto muda) e deixar a regra vermelha.
const mut = (name, from, to, rule) => {
  const m = SRC.split(from).join(to)
  check(`M ${name}`, () => m !== SRC && rule(m) === false)
}
mut('portão admin removido do GET', "export async function GET(req: NextRequest) {\n  if (!(await adminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n", 'export async function GET(req: NextRequest) {\n  if (false) return null\n', rulesAdmin)
mut('e-mail estranho na lista de admin', "'joseph-test@shortsforgeai.com'])", "'joseph-test@shortsforgeai.com', 'x@y.com'])", rulesAdmin)
mut('prompt entra no catálogo antigo', "billboard_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Billboard AD', image_url: image,", "billboard_ad: { model: PIXVERSE, input: (image) => ({ effect: 'Billboard AD', prompt: 'x', image_url: image,", rulesPromptOnlyH3)
mut('recusa de prompt no catálogo antigo removida', "  if (probe && body?.prompt !== undefined) return NextResponse.json({ error: 'prompt_not_allowed' }, { status: 400 })\n", '', rulesPromptOnlyH3)
mut('chave nova fora do prefixo h3', "  h3max_i2v: { model: 'minimax/h3-max/image-to-video'", "  omni_t2v: { model: 'minimax/h3-max/image-to-video'", rulesPromptOnlyH3)
mut('resolução diferente entre motores', "  h3max_t2v: { model: 'minimax/h3-max/text-to-video', needsImage: false, input: (prompt) => ({ prompt, ...H3_SAME, aspect_ratio: '9:16' }) }", "  h3max_t2v: { model: 'minimax/h3-max/text-to-video', needsImage: false, input: (prompt) => ({ prompt, ...H3_SAME, resolution: '1080P', aspect_ratio: '9:16' }) }", rulesPromptOnlyH3)
mut('i2v sem foto do nosso storage', "needsImage: true, input: (prompt, image) => ({ prompt, image_url: image, ...H3_SAME }) },\n  h3max_i2v", "needsImage: false, input: (prompt, image) => ({ prompt, image_url: image, ...H3_SAME }) },\n  h3max_i2v", rulesPromptOnlyH3)
mut('limite sobe para 6000', 'const H3_PROMPT_MAX = 600\n', 'const H3_PROMPT_MAX = 6000\n', rulesLimit)
mut('validador aceita não-string', "if (typeof raw !== 'string') return null", 'raw = String(raw)', rulesLimit)
mut('validador sem filtro de controle', '  if (/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/.test(p)) return null\n', '', rulesLimit)

console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS PASS')
process.exit(fails ? 1 : 0)
