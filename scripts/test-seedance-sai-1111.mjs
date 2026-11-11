// KINEO-SEEDANCE-SAI-1111 — a fal remove o Seedance 1.5 (fal-ai/bytedance/seedance/v1.5/pro/*) em 11/11/2026.
//
// Este guardião trava (Node puro: trechos reais do código executados; sem rede, sem banco, sem FAL_KEY):
//   (a) varredura: o endereço do Seedance 1.5 só sobra em IDENTIDADE (constante para reconhecer claim/consulta antiga, selo,
//       página de texto) e no Kineo 1 (fora da oferta, cai para banco de imagens) — nunca num ponto que monta um envio novo;
//   (b) filme: a 1ª tentativa da cena com quadro (inclusive desenho infantil) é o H3 Max Turbo i2v; a 2ª tentativa e a cena sem
//       quadro vão ao H3 Max Turbo t2v; o corpo do t2v só tem campos do schema (lido em 11/11) e 4:5 vira 3:4;
//   (c) reserva do filme grátis (e do Kling 4 pago): falta de quadro cai no H3 Turbo t2v; o envio vai ao endereço vivo com o
//       corpo que o claim grava; os validadores do claim aceitam o endereço novo e o antigo;
//   (d) clipe (/clips e o clipe antigo do Studio) e (e) refação grátis: H3 Turbo, com o corpo do H3;
//   (f) crédito cobrado igual: toda linha de CREDIT_COST da rota, o baseCost e a régua de clipes iguais à base;
//   (g) a consulta de status e a lista dos clássicos conhecem o endereço novo.
// Mutantes em memória no fim: cada regressão típica tem de ficar vermelha.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const BASE = '7d73c3a42' // origin/main antes do conserto
const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n')
const atBase = (p) => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const ts = (await import('typescript')).default
const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

const SEED = 'seedance/v1.5'
const H3T = 'minimax/h3-max-turbo/text-to-video', H3I = 'minimax/h3-max-turbo/image-to-video'
const T2V_KEYS = new Set(['prompt', 'prompt_expansion_mode', 'duration', 'resolution', 'aspect_ratio', 'seed', 'enable_safety_checker', 'sync_mode', 'target_audio_url'])
const I2V_KEYS = new Set([...T2V_KEYS, 'image_url', 'end_image_url'].filter((k) => k !== 'aspect_ratio'))
const AR = new Set(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'])

const FILES = {
  route: 'app/api/generate-video-cinematic/route.ts', claim: 'lib/cinematic/claim.ts', fallback: 'lib/kling4TrialFallback.ts',
  clipCatalog: 'lib/clips/clipCatalog.ts', semLetras: 'lib/clips/clipSemLetras.ts', kling4Scene: 'lib/freeRedo/kling4Scene.ts', core: 'lib/freeRedo/core.ts',
  classic: 'lib/classicSceneRetry.ts', poller: 'app/api/cinematic-clip-status/route.ts', trialClaim: 'lib/kling4TrialClaim.ts',
  paidClaim: 'lib/kling4PaidClaim.ts', label: 'lib/engineLabel.ts', clip: 'app/api/generate-clip/route.ts', pricing: 'lib/clips/clipPricing.ts',
  shotSpec: 'lib/cinematic/shotSpec.ts',
}
// Onde o endereço PODE sobrar (só fora de comentário), com o teto de ocorrências e o porquê.
const IDENTIDADE = {
  'app/api/generate-video-cinematic/route.ts': 2, // SEEDANCE_MODEL / SEEDANCE_I2V_MODEL: nome da família e claim antigo; o envio troca (t2vVivo, i2vDoFilmePadrao)
  'lib/classicSceneRetry.ts': 2, // reconhecer cena assinada antiga
  'app/api/cinematic-clip-status/route.ts': 2, // consultar job antigo
  'lib/cinematic/claim.ts': 1, // RESERVA_SEEDANCE_15_ANTIGO: aceitar claim antigo
  'lib/kling4TrialClaim.ts': 2, 'lib/kling4PaidClaim.ts': 1, // validadores aceitam claim antigo
  'lib/clips/clipPriceVsMarket.ts': 1, 'lib/growth/enginePageCatalog.ts': 1, // texto/página
  'lib/clips/clipCatalog.ts': 1, // KINEO-ROTULO-CLIPE-H3-1111 — clipLabelForModel: reconhecer o clipe ANTIGO pelo endereço gravado (selo honesto), nunca enviar
  'lib/fastAiClips.ts': 1, 'lib/fastAiHook.ts': 1, // Kineo 1, fora da oferta; falha cai para banco de imagens
}
function scan(S) {
  const byPath = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [p, S[k]]))
  const out = {}
  const walk = (dir) => {
    for (const name of readdirSync(new URL(dir, root))) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const rel = `${dir}/${name}`
      if (statSync(new URL(rel, root)).isDirectory()) walk(rel)
      else if (/\.(ts|tsx)$/.test(name)) {
        const n = code(byPath[rel] ?? read(rel)).split(SEED).length - 1
        if (n) out[rel] = n
      }
    }
  }
  walk('app'); walk('lib')
  return out
}
const creditLines = (route) => route.split('\n').filter((l) => /CREDIT_COST\s*=|const baseCost = /.test(l)).join('\n')
const block = (src, start, endRe = /\n  \}\n/) => { const i = src.indexOf(start); if (i < 0) return null; const rest = src.slice(i); const m = rest.match(endRe); return m ? rest.slice(0, m.index + m[0].length) : null }
const evalFn = (body, names, values) => new Function(...names, body)(...values)

async function problems(S) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }

  // (a) varredura
  const found = scan(S)
  for (const [rel, n] of Object.entries(found)) {
    if (!(rel in IDENTIDADE)) p.push(`varredura: ${rel} monta/cita o Seedance 1.5 (${n}x) fora da lista de identidade`)
    else if (n > IDENTIDADE[rel]) p.push(`varredura: ${rel} cita o Seedance 1.5 ${n}x (teto ${IDENTIDADE[rel]})`)
  }

  // (b) filme
  const r = S.route
  no(!r.includes('    const i2vDoFilmePadrao = H3_TURBO_I2V_MODEL //'), 'filme: a 1ª tentativa da cena com quadro não é o H3 Turbo i2v (desenho infantil ia ao Seedance)')
  no(!r.includes('      const t2vVivo = model === SEEDANCE_MODEL ? H3_TURBO_T2V_MODEL : model //'), 'filme: o t2v do filme Seedance não troca para o H3 Turbo')
  no(!/i2vDoFilmePadrao \/\* KINEO-H3-TURBO-0511 \*\/ : model === VEO_MODEL \? VEO_I2V_MODEL : model, t2vVivo\]/.test(r) || !r.includes('        : [t2vVivo] //'), 'filme: a 2ª tentativa ou a cena sem quadro ainda vai ao modelo da família (Seedance)')
  no(code(r).includes("process.env.KINEO_SEEDANCE_SLUG") && !r.includes('const t2vVivo = model === SEEDANCE_MODEL'), 'filme: a env KINEO_SEEDANCE_SLUG volta a decidir o envio')
  const ramo = block(r, '  if (model === H3_TURBO_T2V_MODEL) {')
  if (!ramo) p.push('filme: buildFalInput sem o ramo do H3 Turbo t2v')
  else {
    const run = (frame, seconds, seed) => evalFn(`${ramo}\nreturn null`, ['model', 'prompt', 'seconds', 'seed', 'frame', 'H3_TURBO_T2V_MODEL'], [H3T, 'p', seconds, seed, frame, H3T])
    const a = run({ falAspectRatio: '9:16' }, 6, 7)
    no(!a || a.duration !== 6 || typeof a.duration !== 'number', 'filme t2v: duração não é o número da cena')
    no(a && (a.resolution !== '768P' || a.prompt_expansion_mode !== 'disabled' || a.aspect_ratio !== '9:16' || a.seed !== 7 || a.prompt !== 'p'), 'filme t2v: corpo fora do combinado (768P, disabled, 9:16, seed)')
    no(a && Object.keys(a).some((k) => !T2V_KEYS.has(k)), `filme t2v: campo fora do schema (${a && Object.keys(a).filter((k) => !T2V_KEYS.has(k))})`)
    no(run({ falAspectRatio: '9:16' }, 30)?.duration !== 15 || run({ falAspectRatio: '9:16' }, 1)?.duration !== 2 || run({ falAspectRatio: '9:16' })?.duration !== 10, 'filme t2v: duração fora de 2–15 (ou sem o padrão 10)')
    for (const f of ['9:16', '16:9', '1:1', '4:5']) no(!AR.has(run({ falAspectRatio: f }, 6)?.aspect_ratio), `filme t2v: formato ${f} vira um aspect_ratio que o H3 não tem`)
  }

  // (c) reserva
  const res = block(S.claim, '// RESERVA-INICIO', /\/\/ RESERVA-FIM\n/)
  if (!res) p.push('reserva: bloco RESERVA-INICIO/FIM sumiu')
  let R = null
  try { const m = { exports: {} }; new Function('module', 'exports', js(res))(m, m.exports); R = m.exports } catch (e) { p.push(`reserva: bloco não executa (${e.message})`) }
  if (R) {
    no(R.modeloDaReservaDoTeste([{ image_url: 'https://a' }, {}, { image_url: 'https://c' }]) !== H3T, 'reserva: cena sem quadro ainda cai fora do H3 Turbo t2v')
    no(R.modeloDaReservaDoTeste([{ image_url: 'https://a' }, { image_url: 'https://b' }, { image_url: 'https://c' }]) !== H3I, 'reserva: com 3 quadros deixou de ir ao H3 Turbo i2v')
    const e = R.entradaDaReserva({ prompt: 'x', duration: 7 }, H3T)
    no(Object.keys(e).some((k) => !T2V_KEYS.has(k)) || e.duration !== 7 || e.resolution !== '768P' || e.aspect_ratio !== '9:16', `reserva t2v: corpo fora do schema do H3 (${JSON.stringify(e)})`)
  }
  const sub = block(S.fallback, 'export async function submitKling4TrialSeedanceFallback(', /\n\}\n/)
  if (!sub || !R) p.push('reserva: envio da reserva de texto não encontrado')
  else {
    const calls = []
    const fetchStub = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ request_id: 'r1' }) } }
    class Err extends Error { constructor(a) { super('x'); this.ambiguous = a } }
    const model = (S.fallback.match(/export const KLING4_TRIAL_FALLBACK_MODEL = ([^\s/]+)/) || [])[1]
    const valor = model === 'RESERVA_SEEDANCE_MODEL' ? R.RESERVA_SEEDANCE_MODEL : model?.replace(/^'|'$/g, '')
    const fn = js(sub.replace('export async function', 'async function')) + '\nreturn submitKling4TrialSeedanceFallback'
    const submit = evalFn(fn, ['fetch', 'process', 'Kling4FallbackSubmitError', 'KLING4_TRIAL_FALLBACK_MODEL', 'entradaDaReserva', 'entradaSemConviteDeLetreiro', 'AbortSignal'],
      [fetchStub, { env: { FAL_KEY: 'k' } }, Err, valor, R.entradaDaReserva, (m, i) => i, { timeout: () => undefined }])
    const id = await submit({ prompt: 'x', duration: 6, resolution: '720p', aspect_ratio: '9:16', generate_audio: false })
    no(id !== 'r1' || calls.length !== 1, 'reserva: o envio não saiu uma vez')
    no(calls[0] && calls[0].url !== `https://queue.fal.run/${H3T}`, `reserva: o envio vai a ${calls[0]?.url}`)
    no(calls[0] && (Object.keys(calls[0].body).some((k) => !T2V_KEYS.has(k)) || typeof calls[0].body.duration !== 'number'), `reserva: corpo enviado fora do schema (${JSON.stringify(calls[0]?.body)})`)
  }
  no(!S.trialClaim.includes(`model === '${H3T}'`), 'reserva: o claim do grátis recusa o H3 Turbo t2v')
  no(!S.paidClaim.includes(`model === '${H3T}'`), 'reserva: o claim do Kling 4 pago recusa o H3 Turbo t2v')
  no(!S.claim.includes('model !== RESERVA_SEEDANCE_15_ANTIGO && model !== RESERVA_SEEDANCE_MODEL'), 'reserva: o claim da promoção recusa o endereço novo ou o antigo')

  // (d) clipes
  try {
    const sem = { exports: {} }; new Function('module', 'exports', 'require', js(S.semLetras))(sem, sem.exports, () => ({}))
    const cat = { exports: {} }; new Function('module', 'exports', 'require', js(S.clipCatalog))(cat, cat.exports, (m) => (m === './clipSemLetras' ? sem.exports : {}))
    const C = cat.exports
    no(C.CLIP_ENGINES.seedance.t2vModel !== H3T || C.CLIP_ENGINES.seedance.i2vModel !== H3I, 'clipe: o motor "Seedance 1.5" ainda chama o Seedance (t2v ou i2v)')
    const t = C.buildClipFalInput({ engine: 'seedance', mode: 't2v', seconds: 5, aspect: '9:16', prompt: 'a cat on a roof' })
    no(Object.keys(t).some((k) => !T2V_KEYS.has(k)) || t.duration !== 5 || t.resolution !== '768P' || t.aspect_ratio !== '9:16', `clipe t2v: corpo fora do schema do H3 (${JSON.stringify(t)})`)
    const i = C.buildClipFalInput({ engine: 'seedance', mode: 'i2v', seconds: 5, aspect: 'image', prompt: 'a cat', imageUrl: 'https://img' })
    no(Object.keys(i).some((k) => !I2V_KEYS.has(k)) || i.image_url !== 'https://img', `clipe i2v: corpo fora do schema do H3 (${JSON.stringify(i)})`)
  } catch (e) { p.push(`clipe: catálogo não executa (${e.message})`) }
  no(!S.clip.includes(`const SEEDANCE_MODEL = '${H3T}'`) || !/resolution: '768P',\n    duration: seconds,\n    prompt_expansion_mode: 'disabled',/.test(S.clip), 'clipe do Studio: ainda Seedance (ou corpo do Seedance)')

  // (e) refação grátis
  no(!S.kling4Scene.includes('model: still ? H3_TURBO_I2V_MODEL : H3_TURBO_T2V_MODEL'), 'refação do 1º filme: cena ainda refeita no Seedance')
  no(!S.kling4Scene.includes("resolution: '768P', prompt_expansion_mode: 'disabled'") || /generate_audio/.test(code(S.kling4Scene)), 'refação do 1º filme: corpo do Seedance')
  const viva = block(S.core, 'export function cenaNoMotorVivo(', /\n\}\n/)
  if (!viva) p.push('refação clássica: cenaNoMotorVivo sumiu')
  else {
    const f = evalFn(js(viva.replace('export function', 'function')) + '\nreturn cenaNoMotorVivo', ['SEEDANCE_MODEL', 'SEEDANCE_I2V_MODEL', 'H3_TURBO_I2V_MODEL', 'H3_TURBO_T2V_MODEL'],
      [`fal-ai/bytedance/${SEED}/pro/text-to-video`, `fal-ai/bytedance/${SEED}/pro/image-to-video`, H3I, H3T])
    const a = f(`fal-ai/bytedance/${SEED}/pro/text-to-video`, { prompt: 'x', duration: '8', aspect_ratio: '4:5', generate_audio: false, resolution: '720p', seed: 3 })
    no(a.model !== H3T || Object.keys(a.input).some((k) => !T2V_KEYS.has(k)) || a.input.duration !== 8 || !AR.has(a.input.aspect_ratio), `refação clássica t2v: ${JSON.stringify(a)}`)
    const b = f(`fal-ai/bytedance/${SEED}/pro/image-to-video`, { prompt: 'x', duration: '6', image_url: 'https://i', aspect_ratio: '9:16' })
    no(b.model !== H3I || Object.keys(b.input).some((k) => !I2V_KEYS.has(k)) || b.input.image_url !== 'https://i', `refação clássica i2v: ${JSON.stringify(b)}`)
    const k = { prompt: 'x', duration: '5' }
    no(f('fal-ai/kling-video/v2.5-turbo/pro/text-to-video', k).input !== k, 'refação clássica: motor vivo deixou de refazer a cena assinada exata')
  }

  // (f) crédito igual
  no(creditLines(S.route) !== creditLines(atBase(FILES.route)), 'crédito: uma linha de CREDIT_COST ou o baseCost da rota mudou')
  no(S.pricing !== atBase(FILES.pricing), 'crédito: a régua de clipes (clipPricing.ts) mudou')
  no(S.shotSpec !== atBase(FILES.shotSpec), 'crédito: shotSpec.ts (CLIP_CREDITS) mudou')

  // (g) consulta e clássicos
  no(!S.poller.includes(`const H3_TURBO_T2V_MODEL = '${H3T}'`) || !S.poller.includes('  H3_TURBO_T2V_MODEL, //'), 'consulta: o status do clipe não aceita o H3 Turbo t2v (o filme travaria em 503)')
  try {
    const m = { exports: {} }; new Function('module', 'exports', js(S.classic))(m, m.exports)
    no(!m.exports.CLASSIC.has(H3T), 'clássicos: CLASSIC não conhece o H3 Turbo t2v (retomada/refação/compose)')
  } catch (e) { p.push(`clássicos: não executa (${e.message})`) }
  no(!S.label.includes(`claim.falModels.includes(H3_TURBO_T2V_FAL_MODEL)`), 'selo: filme que rodou no H3 Turbo t2v não ganha o selo real')
  return p
}

const SRC = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)]))
let n = 0
const atual = await problems(SRC)
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
console.log(`ok  estado atual limpo (Seedance 1.5 só em identidade: ${Object.entries(scan(SRC)).map(([f, c]) => `${f.split('/').pop()}×${c}`).join(', ')})`)
n++

const M = [
  ['M1 clipe volta ao Seedance t2v', 'clipCatalog', (s) => s.replace(`t2vModel: '${H3T}'`, `t2vModel: 'fal-ai/bytedance/${SEED}/pro/text-to-video'`)],
  ['M2 clipe com corpo do Seedance', 'clipCatalog', (s) => s.replace("return { prompt, ...image, duration: s, resolution: '768P', prompt_expansion_mode: 'disabled',", "return { prompt, ...image, duration: String(s), resolution: '720p', generate_audio: false,")],
  ['M3 desenho infantil volta ao Seedance i2v', 'route', (s) => s.replace('    const i2vDoFilmePadrao = H3_TURBO_I2V_MODEL //', '    const i2vDoFilmePadrao = !desenhoInfantil.ativo ? H3_TURBO_I2V_MODEL : SEEDANCE_I2V_MODEL //')],
  ['M4 cena sem quadro volta ao Seedance', 'route', (s) => s.replace('        : [t2vVivo] //', '        : [model] //')],
  ['M5 2ª tentativa volta ao Seedance', 'route', (s) => s.replace('model === VEO_MODEL ? VEO_I2V_MODEL : model, t2vVivo]', 'model === VEO_MODEL ? VEO_I2V_MODEL : model, model]')],
  ['M6 t2v do filme com áudio pedido', 'route', (s) => s.replace("      resolution: '768P',\n      prompt_expansion_mode: 'disabled',\n      ...(typeof seed === 'number' ? { seed } : {}),\n    }\n  }\n  if (model === H3_TURBO_I2V_MODEL)", "      resolution: '768P',\n      generate_audio: false,\n      prompt_expansion_mode: 'disabled',\n      ...(typeof seed === 'number' ? { seed } : {}),\n    }\n  }\n  if (model === H3_TURBO_I2V_MODEL)")],
  ['M7 4:5 sem tradução', 'route', (s) => s.replace("aspect_ratio: frame.falAspectRatio === '4:5' ? '3:4' : frame.falAspectRatio,", 'aspect_ratio: frame.falAspectRatio,')],
  ['M8 reserva de texto volta ao Seedance', 'claim', (s) => s.replace(`export const RESERVA_SEEDANCE_MODEL = '${H3T}'`, `export const RESERVA_SEEDANCE_MODEL = 'fal-ai/bytedance/${SEED}/pro/text-to-video'`)],
  ['M9 corpo da reserva do Seedance', 'fallback', (s) => s.replace(/body: JSON\.stringify\(entradaSemConviteDeLetreiro\(KLING4_TRIAL_FALLBACK_MODEL, entradaDaReserva\(\{ prompt: input\.prompt, duration: input\.duration \}, KLING4_TRIAL_FALLBACK_MODEL\)\)\),/, 'body: JSON.stringify({ ...input, duration: String(input.duration) }),')],
  ['M10 claim do grátis recusa o t2v novo', 'trialClaim', (s) => s.replace(`||\n        model === '${H3T}'`, '')],
  ['M11 consulta sem o t2v novo', 'poller', (s) => s.replace('  H3_TURBO_T2V_MODEL, //', '  //')],
  ['M12 CLASSIC sem o t2v novo', 'classic', (s) => s.replace('H3_TURBO_T2V_MODEL /* KINEO-SEEDANCE-SAI-1111 */, ', '')],
  ['M13 clipe do Studio volta ao Seedance', 'clip', (s) => s.replace(`const SEEDANCE_MODEL = '${H3T}'`, `const SEEDANCE_MODEL = process.env.KINEO_SEEDANCE_SLUG || 'fal-ai/bytedance/${SEED}/pro/text-to-video'`)],
  ['M14 refação clássica reenvia o Seedance', 'core', (s) => s.replace('  if (model !== SEEDANCE_MODEL && model !== SEEDANCE_I2V_MODEL) return { model, input: raw }', '  return { model, input: raw }')],
  ['M15 refação do 1º filme no Seedance', 'kling4Scene', (s) => s.replace('model: still ? H3_TURBO_I2V_MODEL : H3_TURBO_T2V_MODEL', 'model: still ? SEEDANCE_I2V_MODEL : SEEDANCE_MODEL')],
  ['M16 crédito do filme muda', 'route', (s) => s.replace('const S25_CREDIT_COST = 150', 'const S25_CREDIT_COST = 151')],
  ['M17 crédito do clipe muda', 'pricing', (s) => s.replace('filmCredits: 35', 'filmCredits: 36')],
  ['M18 novo envio cita o Seedance', 'kling4Scene', (s) => s + `\nexport const X = 'fal-ai/bytedance/${SEED}/pro/text-to-video'\n`],
]
let falhas = 0
for (const [nome, key, mut] of M) {
  const mutated = mut(SRC[key])
  if (mutated === SRC[key]) { console.log(`FALHA ${nome}: o mutante não aplicou (a fonte mudou de forma)`); falhas++; continue }
  const v = await problems({ ...SRC, [key]: mutated })
  if (v.length === 0) { console.log(`FALHA ${nome}: aplicou e o guardião ficou verde`); falhas++ }
  else { console.log(`ok  ${nome}: aplicou e ficou vermelho (${v[0]})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
