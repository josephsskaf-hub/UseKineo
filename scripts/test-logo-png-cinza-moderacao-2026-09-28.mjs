// KINEO-PNG-CINZA-2026-09-28 — guardião do logo PNG cinza+alfa que nunca subia no Studio Ads.
// Caso de 28/09 (amostra do /ads/v2): logo PNG em cinza+alfa (ffprobe `ya8`) → /api/footage confirm → moderação da OpenAI
// responde 500 "Unexpected error" → evento content_moderation_unavailable {error:'500 Unexpected error', stage:'upload',
// surface:'footage'} → a pessoa lê "We could not check this file right now. Try the upload again in a minute." para sempre.
// Medido no endpoint (3 rodadas iguais): ya8 e gray16be = 500; rgba, rgb24, pal8, gray, ya16be, monob e JPEG = 200.
// Conserto: todo PNG passa pelo canvas no navegador e sobe como PNG 8 bits RGBA (sem perda, com transparência).
// Prova: (A) o código REAL de lib/ads/uploadFootage.ts roda (transpilado, canvas e fetch falsos): PNG sai do canvas antes do
// PUT, sem fundo branco; JPEG/vídeo intactos; falha do canvas devolve o original sem lançar; (B) os três caminhos de envio
// (v2, /ads/new, Studio) passam por ele; (C) a porta do servidor continua FECHADA em falha. Só readFileSync (sem alias @/).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const check = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const bloco = (src, inicio) => { const i = src.indexOf(inicio); return i < 0 ? '' : src.slice(i, src.indexOf('\n  }\n', i) + 4) }

const UP = rd('lib/ads/uploadFootage.ts')
const V2 = rd('app/(dashboard)/ads/v2/AdsV2Client.tsx')
const V1 = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
const ROUTE = rd('app/api/footage/route.ts')
const MOD = rd('lib/safety/contentModeration.ts')

// ── A. o código real, rodando ─────────────────────────────────────────────────────────────────
const MARCA = 'PNG-8BIT-RGBA-DO-CANVAS'
const cenario = { bitmapFalha: false, blobGigante: false }
const log = []
const fakeDocument = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('elemento inesperado: ' + tag)
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: '',
        imageSmoothingQuality: '',
        fillRect: () => log.push('fillRect'),
        drawImage: () => log.push('drawImage'),
      }),
      toBlob(cb, type) {
        log.push('toBlob:' + type)
        cb(cenario.blobGigante ? new Blob([new Uint8Array(50 * 1024 * 1024 + 1)], { type }) : new Blob([MARCA], { type }))
      },
    }
  },
}
const fakeCreateImageBitmap = async () => {
  log.push('createImageBitmap')
  if (cenario.bitmapFalha) throw new Error('decode')
  return { width: 400, height: 200, close() {} }
}
const pedidos = []
const fakeFetch = async (url, init = {}) => {
  const body = init.body
  pedidos.push({ url, method: init.method ?? 'GET', body })
  const json = (obj) => ({ ok: true, status: 200, json: async () => obj })
  if (url === '/api/footage') {
    const b = JSON.parse(body)
    if (b.action === 'upload-url') return json({ path: 'u/clip-1.png', signedUrl: 'https://storage.test/put', kind: 'image' })
    if (b.action === 'confirm') return json({ item: { id: 'f1', url: 'https://storage.test/u/clip-1.png', kind: 'image', size_bytes: b.sizeBytes } })
  }
  if (url === 'https://storage.test/put') return { ok: true, status: 200, json: async () => ({}) }
  throw new Error('fetch inesperado: ' + url)
}
const mod = (() => {
  const ts = createRequire(import.meta.url)(join(root, 'node_modules', 'typescript'))
  const js = ts.transpileModule(UP, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  const req = (spec) => {
    if (spec === '@/lib/videoEditing/browserEditor') return { readClip: async () => { throw new Error('sem vídeo aqui') } }
    throw new Error('import inesperado em uploadFootage.ts: ' + spec)
  }
  vm.runInNewContext(js, {
    exports: exp, require: req, console, Promise, Math, Error, Array, Object, String, Number, RegExp, JSON, Uint8Array,
    File, Blob, document: fakeDocument, createImageBitmap: fakeCreateImageBitmap, fetch: fakeFetch,
    URL: { createObjectURL: () => 'blob:local', revokeObjectURL() {} },
  })
  return exp
})()

const pngCru = (name = 'logo.png', type = 'image/png') => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 1, 0, 8, 4])], name, { type })
const reset = () => { log.length = 0; pedidos.length = 0; cenario.bitmapFalha = false; cenario.blobGigante = false }

check('A0. uploadFootage.ts exporta prepareFootageFile, normalizePngForUpload e uploadFootage (e só importa o leitor de vídeo)',
  typeof mod.prepareFootageFile === 'function' && typeof mod.normalizePngForUpload === 'function' && typeof mod.uploadFootage === 'function' &&
  (UP.match(/^import (?!type )/gm) ?? []).length === 1)

reset()
{
  const out = await mod.prepareFootageFile(pngCru('marca cinza.png'), { isLogo: true })
  check('A1. LOGO PNG (o caso ya8) sai do canvas: conteúdo novo, image/png, nome .png',
    (await out.file.text()) === MARCA && out.type === 'image/png' && out.file.type === 'image/png' && out.kind === 'image' && /\.png$/.test(out.file.name))
  check('A2. …pelo caminho certo (decodifica, desenha, codifica PNG) e SEM fundo branco — a transparência do logo fica',
    log.join(',') === 'createImageBitmap,drawImage,toBlob:image/png' && !log.includes('fillRect'))
}

reset()
{
  const out = await mod.prepareFootageFile(pngCru('foto.png'))
  check('A3. FOTO PNG também passa pelo canvas (a moderação é a mesma para foto e logo) e continua PNG, sem perda',
    (await out.file.text()) === MARCA && out.type === 'image/png' && log.includes('toBlob:image/png') && !log.includes('fillRect'))
}

reset()
{
  const out = await mod.prepareFootageFile(pngCru('logo.png', ''), { isLogo: true })
  check('A4. PNG com tipo vazio (seletor que não informa) é reconhecido pela extensão e passa pelo canvas',
    (await out.file.text()) === MARCA && out.type === 'image/png')
}

reset()
{
  const jpg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'foto.jpg', { type: 'image/jpeg' })
  const out = await mod.prepareFootageFile(jpg)
  const mp4 = new File([new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])], 'clip.mp4', { type: 'video/mp4' })
  const outV = await mod.prepareFootageFile(mp4)
  check('A5. JPEG e vídeo seguem INTACTOS (nenhum canvas, mesmos bytes) — o conserto só toca PNG',
    log.length === 0 && out.file === jpg && out.type === 'image/jpeg' && outV.file === mp4 && outV.kind === 'video')
}

reset()
cenario.bitmapFalha = true
{
  const orig = pngCru('logo.png')
  let lancou = false
  let out = null
  try { out = await mod.prepareFootageFile(orig, { isLogo: true }) } catch { lancou = true }
  check('A6. navegador que não decodifica: NÃO lança e sobe o ORIGINAL (o comportamento de antes; a porta do servidor decide)',
    !lancou && out && out.file === orig && out.type === 'image/png')
}

reset()
cenario.blobGigante = true
{
  const orig = pngCru('logo.png')
  const out = await mod.normalizePngForUpload(orig)
  check('A7. PNG recodificado acima de 50 MB volta ao original (não troca um upload que passava por um recusado)',
    out === orig && log.includes('toBlob:image/png'))
}

reset()
{
  const aud = new File([new Uint8Array([0x49, 0x44, 0x33, 4])], 'voz.mp3', { type: 'audio/mpeg' })
  const out = await mod.normalizePngForUpload(aud)
  check('A8. normalizePngForUpload (usada pelo Studio) devolve áudio/vídeo/JPEG sem tocar', out === aud && log.length === 0)
}

reset()
{
  const up = await mod.uploadFootage(pngCru('logo cinza.png'), { isLogo: true })
  const start = pedidos.find((p) => p.url === '/api/footage' && JSON.parse(p.body).action === 'upload-url')
  const put = pedidos.find((p) => p.method === 'PUT')
  const iCanvas = log.indexOf('toBlob:image/png')
  check('A9. uploadFootage(logo): o PUT leva o PNG DO CANVAS, não o arquivo cru, e o upload-url declara image/png com o tamanho novo',
    iCanvas >= 0 && put && put.body instanceof File && (await put.body.text()) === MARCA &&
    start && JSON.parse(start.body).contentType === 'image/png' && JSON.parse(start.body).sizeBytes === MARCA.length &&
    up.footageId === 'f1' && up.isLogo === true)
  check('A10. ordem: o canvas roda ANTES do primeiro pedido à rota (nada sobe sem passar por ele)',
    iCanvas >= 0 && pedidos.length === 3 && pedidos[0].url === '/api/footage' && pedidos[1].method === 'PUT' && JSON.parse(pedidos[2].body).action === 'confirm')
}

check('A11. o ramo PNG está em prepareFootageFile, logo depois do WEBP/HEIC e antes da checagem de tipo',
  /\} else if \(type === 'image\/png'\) \{\n\s+file = await normalizePngForUpload\(file\)\n\s+\}\n\s+if \(!isRouteType\(type\)\)/.test(UP))

// ── B. os três caminhos de envio passam por ele ───────────────────────────────────────────────
const chooseLogo = bloco(V2, 'async function chooseLogo(')
check('B1. /ads/v2: o logo sobe por uploadFootage(file, { isLogo: true }) — o caminho do defeito de 28/09',
  chooseLogo.includes('const up = await uploadFootage(file, { isLogo: true })') && V2.includes("from '@/lib/ads/uploadFootage'"))
check('B2. /ads/v2 e /ads/new não sobem arquivo por conta própria (nenhum PUT em signedUrl fora do uploadFootage)',
  !/signedUrl/.test(V2) && !/signedUrl/.test(V1) && !/method: 'PUT'/.test(V2) && !/method: 'PUT'/.test(V1))
check('B3. /ads/new: logo e fotos sobem por uploadFootage (os dois assistentes)',
  V1.includes('const up = await uploadFootage(file, { isLogo: asLogo })') && V1.includes('const up = await uploadFootage(f, { isLogo })'))
const uploadUserFile = bloco(GEN, 'async function uploadUserFile(')
check('B4. Studio: uploadUserFile normaliza o PNG ANTES do upload-url e usa só o arquivo normalizado',
  GEN.includes("import { normalizePngForUpload } from '@/lib/ads/uploadFootage'") &&
  uploadUserFile.includes('const file = await normalizePngForUpload(input)') &&
  uploadUserFile.indexOf('const file = await normalizePngForUpload(input)') < uploadUserFile.indexOf("await fetch('/api/footage'") &&
  (uploadUserFile.match(/\binput\b/g) ?? []).length === 2 && uploadUserFile.includes('body: file,'))

// ── C. a porta do servidor continua fechada em falha ──────────────────────────────────────────
const confirm = ROUTE.slice(ROUTE.indexOf("if (body.action === 'confirm') {"))
check('C1. /api/footage: foto passa pela moderação e QUALQUER !safety.ok responde erro antes de gravar a linha',
  /if \(kind === 'image'\) \{\n\s+const safety = await moderateContent\(\{ surface: 'footage', stage: 'upload'/.test(confirm) &&
  /if \(!safety\.ok\) \{\n[\s\S]*?return NextResponse\.json\(\{ error: moderationRefusalMessage\(safety\.reason, 'upload'\)/.test(confirm) &&
  confirm.indexOf('if (!safety.ok) {') > 0 && confirm.indexOf('if (!safety.ok) {') < confirm.indexOf(".from('user_footage')"))
check('C2. contentModeration: erro da chamada (o 500) vira ok:false — os únicos ok:true são "nada a conferir" e "conferido limpo"',
  (MOD.match(/return \{ ok: true \}/g) ?? []).length === 2 &&
  MOD.includes("return { ok: false, reason: unprocessable ? 'unprocessable' : 'unavailable', error: message.slice(0, 200) }") &&
  MOD.includes('if (!text && images.length === 0) return { ok: true }') && MOD.includes('if (!worst) return { ok: true }') &&
  MOD.indexOf('} catch (error) {') < MOD.indexOf('if (!worst) return { ok: true }'))
check('C3. contentModeration: sem retry nem "passa se falhar" (maxRetries 0; o catch só sai com ok:false ou segue ao bloqueio)',
  MOD.includes('{ timeout: MODERATION_TIMEOUT_MS, maxRetries: 0 }') && !/catch[^{]*\{[^}]*ok: true/.test(MOD))

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} falha(s), ${ok} ok — test-logo-png-cinza-moderacao`)
  process.exit(1)
}
console.log(`✓ ${ok} verificações ok — logo/foto PNG passa pelo canvas antes do upload; porta de moderação intacta`)
