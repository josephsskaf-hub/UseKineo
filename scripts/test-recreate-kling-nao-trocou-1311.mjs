// KINEO-RECREATE-KLING-NAO-TROCOU-1311 — guardião da trava "não trocou" no Kling 4.0 edição (lib/recreate/swapCheck.ts). EXECUTA a trava inteira
// (runSwapCheck) com fal e OpenAI falsos sobre uma linha do Kling: o caso real do clip 19e29401 (same_as_base yes + result_vs_photo yes) agora dá
// UNCHANGED (falha + estorno), não mais unverified (entrega e cobra). Trocou de verdade = swapped. Nas linhas do Seedance e do Recast a regra é a de
// antes (o "parece a foto" desempata como sempre). 2 pessoas no Kling: uma mantida = partial. Mutantes. Rodar: node scripts/test-recreate-kling-nao-trocou-1311.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const SC = 'lib/recreate/swapCheck.ts'
const KLING = 'kling/v4/video-to-video/edit', SEEDANCE = 'bytedance/seedance-2.5/reference-to-video'
function carregar(src) {
  const mod = { exports: {} }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const stubs = {
    '@/lib/aiModels': { AI_TEXT_MODELS: { writer: 'gpt-4o' } },
    '@/lib/regua95/coherenceV2': { usdFromUsage: () => 0.01 },
    '@/lib/regua95/pixelScore': { FAL_NTH_FRAME_MODEL: 'fal-ai/workflow-utilities/extract-nth-frame', FAL_USD_PER_COMPUTE_SECOND: 0.001, PIXEL_MODEL_RATES: {} },
    './formats': { RECREATE_CHECK_FRAMES: [84, 168], RECREATE_FORMATS: [] },
    './generation': { RECREATE_MODEL: 'recast', RECREATE_PROVIDER_ORIGIN: 'https://www.usekineo.com' },
    './seuVideo': { catalogoNoSeedance25: () => false, KLING4_EDIT_MODEL: KLING, SEEDANCE25_MODEL: SEEDANCE, SEU_VIDEO_PASTA: 'recreate-uploads', metaPorUrl: async () => ({ segundos: 5, fps: 30, largura: 720, altura: 1280 }) },
  }
  new Function('require', 'module', 'exports', 'process', js)((id) => { if (id in stubs) return stubs[id]; throw new Error('import inesperado: ' + id) }, mod, mod.exports, { env: {}, cwd: () => '.' })
  return mod.exports
}
const U = '11111111-2222-4333-8444-555555555555', V = '66666666-7777-4888-9999-000000000000'
const VIDEO = `https://x.supabase.co/storage/v1/object/public/renders/recreate-uploads/${U}/${V}.mp4`
const FOTOS = ['https://x.supabase.co/storage/v1/object/public/renders/avatars/u/face-1.jpg', 'https://x.supabase.co/storage/v1/object/public/renders/avatars/u/face-2.jpg']
const linha = (model, fotos = 1) => ({ model, fingerprint: JSON.stringify(['pedido', model, model === KLING ? { prompt: 'p', video_url: VIDEO, image_urls: FOTOS.slice(0, fotos), resolution: '720p' } : { prompt: 'p', task: 'reference', video_urls: [VIDEO], image_urls: FOTOS.slice(0, fotos) }]) })
function fetchFalso(pessoas) {
  return async (url) => {
    if (String(url).startsWith('https://fal.run/')) return { ok: true, json: async () => ({ images: [{ url: 'https://f/0.jpg' }, { url: 'https://f/1.jpg' }, { url: 'https://f/2.jpg' }] }) }
    if (String(url).includes('api.openai.com')) return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ persons: pessoas }) } }], usage: {} }) }
    throw new Error('rede inesperada: ' + url)
  }
}
// readPerson só aceita "mesma pessoa" com algum atributo do rosto igual e nenhum diferente (e "outra" com algum diferente): a visão falsa diz isso.
const P = (person, same, photo) => ({ person, same_person: same, result_vs_photo: photo, note: '',
  base_vs_result: same === 'yes' ? { hair_color: 'same', face_shape: 'same' } : same === 'no' ? { hair_color: 'different', face_shape: 'different' } : {} })

async function bateria(src) {
  const S = carregar(src)
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const roda = (row, pessoas) => S.runSwapCheck(row, 'https://fal.media/saida.mp4', { fetchImpl: fetchFalso(pessoas), falKey: 'k', apiKey: 'k', budgetMs: 5000 })
  await check('Kling: caso do clip 19e29401 (mesma + parece a foto) = unchanged', async () => {
    const v = await roda(linha(KLING), [P(1, 'yes', 'yes')])
    if (v.result !== 'unchanged') throw new Error(v.result + ' ' + v.reason)
  })
  await check('Kling: mesma pessoa, foto incerta = unchanged', async () => {
    const v = await roda(linha(KLING), [P(1, 'yes', 'uncertain')])
    if (v.result !== 'unchanged') throw new Error(v.result)
  })
  await check('Kling: trocou de verdade = swapped', async () => {
    const v = await roda(linha(KLING), [P(1, 'no', 'yes')])
    if (v.result !== 'swapped') throw new Error(v.result)
  })
  await check('Kling: 2 pessoas, uma mantida = partial', async () => {
    const v = await roda(linha(KLING, 2), [P(1, 'no', 'yes'), P(2, 'yes', 'yes')])
    if (v.result !== 'partial') throw new Error(v.result)
  })
  await check('Kling: juiz incerto continua unverified (entrega)', async () => {
    const v = await roda(linha(KLING), [P(1, 'uncertain', 'yes')])
    if (v.result !== 'unverified') throw new Error(v.result)
  })
  await check('Seedance: regra de antes (mesma + parece a foto = unverified)', async () => {
    const v = await roda(linha(SEEDANCE), [P(1, 'yes', 'yes')])
    if (v.result !== 'unverified') throw new Error(v.result)
    const w = await roda(linha(SEEDANCE), [P(1, 'yes', 'no')])
    if (w.result !== 'unchanged') throw new Error('seedance mantida ' + w.result)
  })
  await check('decideSwap sem a opção = byte a byte a regra antiga', async () => {
    const d = S.decideSwap({ persons: [P(1, 'yes', 'yes')].map((x) => ({ ...x })) }, 1)
    if (d.result === 'unchanged') throw new Error('a regra antiga mudou')
  })
  return p
}

const fonte = lf(SC)
const real = await bateria(fonte)
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['Kling sem a trava nova', fonte.replace('{ cenaMantida: row.model === KLING4_EDIT_MODEL }', '{ cenaMantida: false }')],
  ['trava nova em todo motor', fonte.replace('{ cenaMantida: row.model === KLING4_EDIT_MODEL }', '{ cenaMantida: true }')],
  ['regra ignora a opção', fonte.replace('(opts.cenaMantida === true || p.matches_photo !== true)', 'p.matches_photo !== true')],
]
let mortos = 0
for (const [n, src] of mutantes) {
  if (src === fonte) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(src)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS Kling não trocou: mesma pessoa da base = unchanged (estorno) mesmo com "parece a foto"; trocou = swapped; 2 pessoas = partial; incerto = unverified; Seedance e Recast com a regra de antes; ${mortos}/${mutantes.length} mutantes mortos`)
