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

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// KINEO-SONDA-EFEITOS-VIRAIS-2026-10-13 — fundador (13/10: "tudo sim"): 6 efeitos virais de pessoa entram no catálogo FECHADO
// da mesma sonda para 1 render real cada. Prova:
//   (6) o catálogo PROBES executado de verdade (transpilado) devolve, para as 6 chaves fx_*, exatamente o modelo e a entrada
//       conferidos no OpenAPI da fal em 13/10 — e a foto é o ÚNICO valor que vem de fora;
//   (7) catálogo fechado: toda entrada usa um dos 4 modelos fixos, recebe só (image), não lê body/req/prompt, e as chaves
//       são procuradas com hasOwnProperty (POST e GET) — nada de modelo ou efeito vindo do cliente;
//   (8) o commit dos efeitos virais NÃO tocou lib/clips nem o pipeline de vídeo;
//   (9) mutantes: enum fora do schema, modelo trocado, entrada aceitando valor do cliente — todos vermelhos e aplicados.
// Enums verificados nos schemas OpenAPI salvos em 13/10 (fal-ai/vidu/template-to-video · fal-ai/kling-video/v1.6/standard/effects
// · fal-ai/pixverse/v5.5/effects). No Kling STANDARD o enum tem 'dollar_rain_pro' e NÃO tem 'dollar_rain'.
const VIRAL_IMG = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/x/foto.jpg'
const VIRAL_EXPECTED = {
  fx_hug: { model: 'fal-ai/vidu/template-to-video', input: { template: 'hug', input_image_urls: [VIRAL_IMG], aspect_ratio: '9:16' } },
  fx_kiss: { model: 'fal-ai/vidu/template-to-video', input: { template: 'kiss', input_image_urls: [VIRAL_IMG], aspect_ratio: '9:16' } },
  fx_vampire: { model: 'fal-ai/kling-video/v1.6/standard/effects', input: { effect_scene: 'vampire_transform', input_image_urls: [VIRAL_IMG], duration: '5' } },
  fx_wings: { model: 'fal-ai/kling-video/v1.6/standard/effects', input: { effect_scene: 'pure_white_wings', input_image_urls: [VIRAL_IMG], duration: '5' } },
  fx_dollar_rain: { model: 'fal-ai/kling-video/v1.6/standard/effects', input: { effect_scene: 'dollar_rain_pro', input_image_urls: [VIRAL_IMG], duration: '5' } },
  fx_muscle: { model: 'fal-ai/pixverse/v5.5/effects', input: { effect: 'Muscle Surge', image_url: VIRAL_IMG, resolution: '720p', duration: '5' } },
}
// KINEO-EFEITOS-NOVOS-2026-10-13 — Halloween SEM FOGO: o vampire_transform saiu demônio de fogo (fundador 13/10), então entram
// bruxa e zumbi na MESMA sonda fechada. Os dois valores estão no enum effect_scene de fal-ai/kling-video/v1.6/standard/effects
// (OpenAPI salvo em 13/10: 98 valores, contém 'witch_transform' e 'zombie_transform'; NÃO existe 'witch' nem 'zombie' soltos).
const HALLOWEEN_EXPECTED = {
  fx_witch: { model: 'fal-ai/kling-video/v1.6/standard/effects', input: { effect_scene: 'witch_transform', input_image_urls: [VIRAL_IMG], duration: '5' } },
  fx_zombie: { model: 'fal-ai/kling-video/v1.6/standard/effects', input: { effect_scene: 'zombie_transform', input_image_urls: [VIRAL_IMG], duration: '5' } },
}
const KLING_STD_ENUM_CHECKED = new Set(['vampire_transform', 'pure_white_wings', 'dollar_rain_pro', 'witch_transform', 'zombie_transform', 'bullet_time_360', 'splashsplash'])
/** Todas as chaves fx_* que o catálogo pode ter, na ordem: as 6 virais e as 2 de Halloween. */
const FX_EXPECTED = { ...VIRAL_EXPECTED, ...HALLOWEEN_EXPECTED }
const MODEL_CONSTS = {
  PIXVERSE: 'fal-ai/pixverse/v5/effects', KLING: 'fal-ai/kling-video/v1.6/standard/effects',
  VIDU: 'fal-ai/vidu/template-to-video', PIXVERSE_55: 'fal-ai/pixverse/v5.5/effects',
}
const PROBES_HEAD = 'const PROBES: Record<string, { model: string; input: (image: string) => Record<string, unknown> }> = {'

function loadProbes(src) {
  const consts = Object.keys(MODEL_CONSTS).map((k) => (src.match(new RegExp('^const ' + k + " = '[^'\\n]+'", 'm')) || [''])[0])
  const probes = block(src, PROBES_HEAD, '\n}\n')
  if (consts.some((c) => !c) || !probes) return null
  const js = ts.transpileModule(consts.join('\n') + '\n' + probes + '\nexport { PROBES }', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', js)(m, m.exports)
  return m.exports.PROBES
}
function rulesViral(src) {
  const P = loadProbes(src)
  if (!P) return false
  const fx = Object.keys(P).filter((k) => k.startsWith('fx_'))
  const other = 'https://other.example/z.jpg'
  // KINEO-EFEITOS-NOVOS-2026-10-13 — a lista fechada de fx_* agora é a das 6 virais + 2 de Halloween (FX_EXPECTED)
  return JSON.stringify(fx) === JSON.stringify(Object.keys(FX_EXPECTED)) &&
    Object.entries(VIRAL_EXPECTED).every(([k, v]) => P[k].model === v.model && JSON.stringify(P[k].input(VIRAL_IMG)) === JSON.stringify(v.input)) &&
    // a foto é o único valor externo: trocar a foto troca só a foto
    Object.entries(VIRAL_EXPECTED).every(([k, v]) => JSON.stringify(P[k].input(other)) === JSON.stringify(v.input).split(VIRAL_IMG).join(other)) &&
    src.includes("const PIXVERSE_55 = 'fal-ai/pixverse/v5.5/effects'")
}
function rulesClosedCatalog(src) {
  const P = loadProbes(src)
  const probes = block(src, PROBES_HEAD, '\n}\n')
  if (!P || !probes) return false
  const models = new Set(Object.values(MODEL_CONSTS))
  const lines = probes.split('\n').filter((l) => /^ {2}[a-z0-9_]+: /.test(l))
  const entries = lines.map((l) => l.match(/^ {2}([a-z0-9_]+): \{ model: ([A-Z0-9_]+), input: \(image\) => \(\{.*\}\) \},(?: \/\/.*)?$/)).filter(Boolean)
  const code = probes.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  const post = fn(src, 'POST'), get = fn(src, 'GET')
  return entries.length === lines.length && entries.length === Object.keys(P).length &&
    entries.every((m) => m[2] in MODEL_CONSTS) &&
    Object.values(P).every((p) => models.has(p.model) && p.input.length === 1) &&
    !/\b(body|req|prompt|searchParams|globalThis|process)\b/.test(code) &&
    post.includes('Object.prototype.hasOwnProperty.call(PROBES, key)') && get.includes('Object.prototype.hasOwnProperty.call(PROBES, key)') &&
    post.includes('probe!.input(image)') && post.includes('probe!.model')
}
function viralUntouched() {
  const c = git(['log', '--format=%H', '-S', 'KINEO-SONDA-EFEITOS-VIRAIS-2026-10-13', '--', ROUTE]).split('\n').filter(Boolean).pop()
  const paths = ['lib/clips', ...PIPELINE]
  const changed = c ? git(['diff', '--name-only', `${c}^`, c, '--', ...paths]) : git(['diff', '--name-only', 'HEAD', '--', ...paths])
  return changed === ''
}

check('6 efeitos virais: as 6 chaves fx_* executadas devolvem o modelo e a entrada exatos do schema (a foto é o único valor externo)', () => rulesViral(SRC))
check('7 catálogo fechado: 4 modelos fixos, entrada só (image), sem body/req/prompt; hasOwnProperty no POST e no GET', () => rulesClosedCatalog(SRC))
check('8 o commit dos efeitos virais não tocou lib/clips nem o pipeline de vídeo (diff vazio)', () => viralUntouched())

mut('Kling standard com dollar_rain (fora do enum)', "effect_scene: 'dollar_rain_pro'", "effect_scene: 'dollar_rain'", rulesViral)
mut('Muscle Surge apontado para a PixVerse v5 (sem o enum)', 'fx_muscle: { model: PIXVERSE_55,', 'fx_muscle: { model: PIXVERSE,', rulesViral)
mut('kiss trocado por french_kiss_8s', "template: 'kiss'", "template: 'french_kiss_8s'", rulesViral)
mut('wings com duração 10', "effect_scene: 'pure_white_wings', input_image_urls: [image], duration: '5'", "effect_scene: 'pure_white_wings', input_image_urls: [image], duration: '10'", rulesViral)
mut('chave fx_wings some do catálogo', '  fx_wings: { model: KLING,', '  wings: { model: KLING,', rulesViral)
mut('foto fixa em vez da foto recebida', "fx_hug: { model: VIDU, input: (image) => ({ template: 'hug', input_image_urls: [image]", "fx_hug: { model: VIDU, input: (image) => ({ template: 'hug', input_image_urls: ['" + VIRAL_IMG + "']", rulesViral)
mut('modelo livre (string crua) no catálogo', 'fx_hug: { model: VIDU,', "fx_hug: { model: 'fal-ai/qualquer/coisa',", rulesClosedCatalog)
mut('entrada lê valor de fora', "fx_vampire: { model: KLING, input: (image) => ({ effect_scene: 'vampire_transform',", "fx_vampire: { model: KLING, input: (image) => ({ effect_scene: (globalThis as any).scene ?? 'vampire_transform',", rulesClosedCatalog)
mut('GET sem hasOwnProperty no catálogo', ': Object.prototype.hasOwnProperty.call(PROBES, key) ? PROBES[key] : undefined', ': PROBES[key]', rulesClosedCatalog)

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// KINEO-EFEITOS-NOVOS-2026-10-13 — (10) Halloween sem fogo: fx_witch e fx_zombie executados devolvem o modelo (Kling 1.6
// STANDARD) e a entrada exatos; o valor de effect_scene está no enum conferido; nenhum dos dois é vampiro/fogo/demônio; a foto é
// o único valor externo. (11) mutantes vermelhos e aplicados.
function rulesHalloween(src) {
  const P = loadProbes(src)
  if (!P) return false
  const other = 'https://other.example/h.jpg'
  return Object.entries(HALLOWEEN_EXPECTED).every(([k, v]) => {
    const p = Object.prototype.hasOwnProperty.call(P, k) ? P[k] : null
    if (!p || p.model !== v.model || p.input.length !== 1) return false
    const got = p.input(VIRAL_IMG)
    return JSON.stringify(got) === JSON.stringify(v.input) &&
      KLING_STD_ENUM_CHECKED.has(got.effect_scene) &&
      !/fire|flame|demon|vampire|burn/i.test(JSON.stringify(got)) &&
      JSON.stringify(p.input(other)) === JSON.stringify(v.input).split(VIRAL_IMG).join(other)
  })
}
check('10 Halloween sem fogo: fx_witch/fx_zombie no Kling 1.6 standard com witch_transform/zombie_transform (enum conferido), 5 s, só a foto de fora', () => rulesHalloween(SRC))
check('10b o catálogo fechado e os 6 virais seguem verdes com as 2 chaves novas', () => rulesViral(SRC) && rulesClosedCatalog(SRC))
mut('bruxa trocada por vampiro (o que saiu de fogo)', "effect_scene: 'witch_transform'", "effect_scene: 'vampire_transform'", rulesHalloween)
mut('zumbi com valor fora do enum', "effect_scene: 'zombie_transform'", "effect_scene: 'zombie'", rulesHalloween)
mut('bruxa no Kling 1.6 PRO (outro endpoint/preço)', "  fx_witch: { model: KLING,", "  fx_witch: { model: 'fal-ai/kling-video/v1.6/pro/effects',", rulesHalloween)
mut('zumbi com duração 10', "effect_scene: 'zombie_transform', input_image_urls: [image], duration: '5'", "effect_scene: 'zombie_transform', input_image_urls: [image], duration: '10'", rulesHalloween)
mut('chave fx_zombie some do catálogo', '  fx_zombie: { model: KLING,', '  zombie: { model: KLING,', rulesHalloween)
mut('chave fx_witch renomeada (fora da lista fechada fx_*)', '  fx_witch: { model: KLING,', '  fx_bruxa: { model: KLING,', rulesViral)
mut('zumbi lê valor de fora', "fx_zombie: { model: KLING, input: (image) => ({ effect_scene: 'zombie_transform',", "fx_zombie: { model: KLING, input: (image) => ({ effect_scene: (globalThis as any).scene ?? 'zombie_transform',", rulesClosedCatalog)

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// KINEO-ESTILOS-DIA1-2026-10-13 — fundador (13/10): +10 estilos de anúncio NOVOS por dia (a meta subiu de 5 para 10 no mesmo
// dia), testados com render real antes de entrar. Lote do dia 1 na MESMA sonda fechada. Prova:
//   (12) as 10 chaves ad_* executadas devolvem EXATAMENTE a PixVerse v5 (o endpoint dos 15 estilos no ar) e { effect, image_url,
//        resolution:'720p', duration:'5' }; o effect está no enum conferido no OpenAPI vivo da fal em 13/10; a foto é o único
//        valor externo; a lista ad_* é fechada e na ordem;
//   (13) "claramente diferente": nenhum dos 10 é um efeito dos 15 estilos de lib/ads/v2Styles.ts nem um dos já reprovados
//        (Billboard AD, Truck AD, Microwave);
//   (14) o commit do lote NÃO tocou lib/ads (o estilo só entra na parte 2, após o render aprovado) nem o pipeline de vídeo;
//   (15) mutantes vermelhos e aplicados.
// Fonte do enum: https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/pixverse/v5/effects (154 valores em 13/10).
const AD_IMG = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/user-footage/x/produto.jpg'
const PIXVERSE_V5 = 'fal-ai/pixverse/v5/effects'
const pv5 = (effect) => ({ model: PIXVERSE_V5, input: { effect, image_url: AD_IMG, resolution: '720p', duration: '5' } })
const ESTILOS_DIA1_EXPECTED = {
  ad_dolly_zoom: pv5('Hitchcock Dolly Zoom'),
  ad_liquid_metal: pv5('Liquid Metal'),
  ad_boom_drop: pv5('BOOM DROP'),
  ad_mint_in_box: pv5('Mint in Box'),
  ad_snow_globe: pv5('Snow Globe Maker'),
  ad_smell_lens: pv5('Smell the Lens'),
  ad_macaron_machine: pv5('Macaron Machine'),
  ad_starlight_gift: pv5('Starlight Gift Box'),
  ad_earth_zoom: pv5('Earth Zoom'),
  ad_christmas_night: pv5('Christmas Night'),
}
const PIXVERSE_V5_ENUM_CHECKED = new Set(['Hitchcock Dolly Zoom', 'Liquid Metal', 'BOOM DROP', 'Mint in Box', 'Snow Globe Maker',
  'Smell the Lens', 'Macaron Machine', 'Starlight Gift Box', 'Earth Zoom', 'Christmas Night'])
const ADS_REPROVADOS = new Set(['Billboard AD', 'Truck AD', 'Microwave'])
// KINEO-ESTILOS-DIA1-2026-10-13 — reancorado: 4 efeitos DESTE lote viraram estilo (tipo AdsV2Dia1StyleKey em v2Styles). A regra
// "o lote é novo" compara com os estilos que já estavam no ar ANTES do lote (os 15); os promovidos têm de ser do próprio lote.
function v2StyleEffects() {
  const s = fs.readFileSync('lib/ads/v2Styles.ts', 'utf8')
  const dia1 = new Set((((s.match(/type AdsV2Dia1StyleKey = ([^\n]+)/) || [, ''])[1]).match(/'([a-z0-9_]+)'/g) || []).map((x) => x.slice(1, -1)))
  const all = [...s.matchAll(/^ {2}\{ key: '([a-z0-9_]+)', effect: '([^']+)'/gm)].map((m) => ({ key: m[1], effect: m[2] }))
  const set = new Set(all.filter((x) => !dia1.has(x.key)).map((x) => x.effect))
  set.promoted = all.filter((x) => dia1.has(x.key)).map((x) => x.effect)
  set.dia1Keys = dia1.size
  return set
}
function rulesEstilosDia1(src) {
  const P = loadProbes(src)
  if (!P) return false
  const ad = Object.keys(P).filter((k) => k.startsWith('ad_'))
  const other = 'https://other.example/p.jpg'
  return JSON.stringify(ad) === JSON.stringify(Object.keys(ESTILOS_DIA1_EXPECTED)) &&
    src.includes("const PIXVERSE = 'fal-ai/pixverse/v5/effects'") &&
    Object.entries(ESTILOS_DIA1_EXPECTED).every(([k, v]) => {
      const p = P[k]
      if (!p || p.model !== v.model || p.input.length !== 1) return false
      const got = p.input(AD_IMG)
      return JSON.stringify(got) === JSON.stringify(v.input) && PIXVERSE_V5_ENUM_CHECKED.has(got.effect) &&
        JSON.stringify(p.input(other)) === JSON.stringify(v.input).split(AD_IMG).join(other)
    })
}
function rulesEstilosDiferentes(src) {
  const P = loadProbes(src)
  const ja = v2StyleEffects()
  if (!P || ja.size !== 15) return false // os 15 estilos no ar (se o arquivo mudar de forma, o guardião acusa em vez de passar mudo)
  const effects = Object.keys(P).filter((k) => k.startsWith('ad_')).map((k) => P[k].input(AD_IMG).effect)
  return effects.length === 10 && new Set(effects).size === 10 && effects.every((e) => !ja.has(e) && !ADS_REPROVADOS.has(e)) &&
    ja.dia1Keys === 4 && ja.promoted.length === 4 && ja.promoted.every((e) => effects.includes(e)) // KINEO-ESTILOS-DIA1-2026-10-13
}
function estilosDia1Untouched() {
  const c = git(['log', '--format=%H', '-S', 'KINEO-ESTILOS-DIA1-2026-10-13', '--', ROUTE]).split('\n').filter(Boolean).pop()
  const paths = ['lib/ads', 'lib/clips', ...PIPELINE]
  const changed = c ? git(['diff', '--name-only', `${c}^`, c, '--', ...paths]) : git(['diff', '--name-only', 'HEAD', '--', ...paths])
  return changed === ''
}
check('12 estilos dia 1: as 10 chaves ad_* na PixVerse v5 com effect do enum conferido, 720p, 5 s, só a foto de fora', () => rulesEstilosDia1(SRC))
check('13 os 10 efeitos são novos: fora dos 15 estilos de lib/ads/v2Styles.ts e fora dos já reprovados (Billboard/Truck/Microwave)', () => rulesEstilosDiferentes(SRC))
check('14 o commit do lote não tocou lib/ads, lib/clips nem o pipeline de vídeo (diff vazio)', () => estilosDia1Untouched())
check('14b catálogo fechado, virais e Halloween seguem verdes com as 10 chaves ad_*', () => rulesClosedCatalog(SRC) && rulesViral(SRC) && rulesHalloween(SRC))
mut('Dolly Zoom com o nome fora do enum (sem "Hitchcock")', "effect: 'Hitchcock Dolly Zoom'", "effect: 'Dolly Zoom'", rulesEstilosDia1)
mut('BOOM DROP em caixa errada', "effect: 'BOOM DROP'", "effect: 'Boom Drop'", rulesEstilosDia1)
mut('Snow Globe Maker sem o "Maker"', "effect: 'Snow Globe Maker'", "effect: 'Snow Globe'", rulesEstilosDia1)
mut('Liquid Metal apontado para a PixVerse v5.5', '  ad_liquid_metal: { model: PIXVERSE,', '  ad_liquid_metal: { model: PIXVERSE_55,', rulesEstilosDia1)
mut('Mint in Box em 1080p (outro preço)', "effect: 'Mint in Box', image_url: image, resolution: '720p'", "effect: 'Mint in Box', image_url: image, resolution: '1080p'", rulesEstilosDia1)
mut('Snow Globe com 8 s', "effect: 'Snow Globe Maker', image_url: image, resolution: '720p', duration: '5'", "effect: 'Snow Globe Maker', image_url: image, resolution: '720p', duration: '8'", rulesEstilosDia1)
mut('chave ad_boom_drop renomeada', '  ad_boom_drop: { model: PIXVERSE,', '  boom_drop: { model: PIXVERSE,', rulesEstilosDia1)
mut('foto fixa no Dolly Zoom', "effect: 'Hitchcock Dolly Zoom', image_url: image,", "effect: 'Hitchcock Dolly Zoom', image_url: '" + AD_IMG + "',", rulesEstilosDia1)
mut('lote repete um estilo que já está no ar (Beach AD)', "effect: 'Liquid Metal'", "effect: 'Beach AD'", rulesEstilosDiferentes)
mut('lote traz um efeito já reprovado (Billboard AD)', "effect: 'Mint in Box'", "effect: 'Billboard AD'", rulesEstilosDiferentes)
mut('dois estilos do lote iguais', "effect: 'BOOM DROP'", "effect: 'Liquid Metal'", rulesEstilosDiferentes)
mut('estilo lê valor de fora', "ad_snow_globe: { model: PIXVERSE, input: (image) => ({ effect: 'Snow Globe Maker',", "ad_snow_globe: { model: PIXVERSE, input: (image) => ({ effect: (globalThis as any).fx ?? 'Snow Globe Maker',", rulesClosedCatalog)
mut('Smell the Lens com o "The" em maiúscula (fora do enum)', "effect: 'Smell the Lens'", "effect: 'Smell The Lens'", rulesEstilosDia1)
mut('Macaron Machine no plural', "effect: 'Macaron Machine'", "effect: 'Macaron Machines'", rulesEstilosDia1)
mut('Starlight Gift Box sem o "Box"', "effect: 'Starlight Gift Box'", "effect: 'Starlight Gift'", rulesEstilosDia1)
mut('Earth Zoom virando "Earth Zoom Out" (fora do enum)', "effect: 'Earth Zoom'", "effect: 'Earth Zoom Out'", rulesEstilosDia1)
mut('Christmas Night com 8 s', "effect: 'Christmas Night', image_url: image, resolution: '720p', duration: '5'", "effect: 'Christmas Night', image_url: image, resolution: '720p', duration: '8'", rulesEstilosDia1)
mut('Earth Zoom apontado para a PixVerse v5.5', '  ad_earth_zoom: { model: PIXVERSE,', '  ad_earth_zoom: { model: PIXVERSE_55,', rulesEstilosDia1)
mut('Macaron Machine em 1080p (outro preço)', "effect: 'Macaron Machine', image_url: image, resolution: '720p'", "effect: 'Macaron Machine', image_url: image, resolution: '1080p'", rulesEstilosDia1)
mut('chave ad_starlight_gift renomeada', '  ad_starlight_gift: { model: PIXVERSE,', '  starlight_gift: { model: PIXVERSE,', rulesEstilosDia1)
mut('chave ad_smell_lens some (lote com 9)', "  ad_smell_lens: { model: PIXVERSE, input: (image) => ({ effect: 'Smell the Lens', image_url: image, resolution: '720p', duration: '5' }) },\n", '', rulesEstilosDia1)
mut('foto fixa no Christmas Night', "effect: 'Christmas Night', image_url: image,", "effect: 'Christmas Night', image_url: '" + AD_IMG + "',", rulesEstilosDia1)
mut('Christmas Night trocado por um estilo no ar (Dreamlike Cloud)', "effect: 'Christmas Night'", "effect: 'Dreamlike Cloud'", rulesEstilosDiferentes)
mut('Starlight Gift Box trocado por um já reprovado (Truck AD)', "effect: 'Starlight Gift Box'", "effect: 'Truck AD'", rulesEstilosDiferentes)
mut('Earth Zoom repete o Dolly Zoom', "effect: 'Earth Zoom'", "effect: 'Hitchcock Dolly Zoom'", rulesEstilosDiferentes)
mut('Macaron Machine lê valor de fora', "ad_macaron_machine: { model: PIXVERSE, input: (image) => ({ effect: 'Macaron Machine',", "ad_macaron_machine: { model: PIXVERSE, input: (image) => ({ effect: (globalThis as any).fx ?? 'Macaron Machine',", rulesClosedCatalog)

console.log(fails ? `\n${fails} FALHA(S)` : '\nTODOS PASS')
process.exit(fails ? 1 : 0)
