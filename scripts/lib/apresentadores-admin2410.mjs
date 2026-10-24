// KINEO-APRESENTADORES-2410 — local catalog review. No dotenv, database, provider SDK or paid work on import.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, writeFile, rename, mkdir, open, unlink, realpath } from 'node:fs/promises'
import { join, resolve, dirname, sep } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

export const CATALOG = 'lib/ads/presenterCandidates2410.json'
export const CHECKS = ['eyesOpen', 'naturalHands', 'neutralClothes', 'identityMatch', 'voiceMatch']
export const FOUNDER = 'Joseph Skaf'
const MAX_IMAGE = 120 * 1024
const MAX_SOURCE = 20 * 1024 * 1024
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fail = (message, status = 400) => Object.assign(new Error(message), { status })
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const paths = (id) => ({ portrait: `/ads/presenters/${id}.webp`, facePortrait: `/ads/presenters/${id}-face.webp`, voiceSample: `/ads/presenters/${id}-voice.mp3` })
const reset = (entry) => ({ ...entry, status: 'pending', reviewedBy: null, reviewedAt: null, assetHashes: null, checks: Object.fromEntries(CHECKS.map((key) => [key, false])) })

export async function loadCatalog(root) {
  const raw = await readFile(join(root, CATALOG), 'utf8')
  const entries = JSON.parse(raw)
  if (!Array.isArray(entries) || entries.length === 0) throw fail('O catálogo deve conter candidatos.', 422)
  const ids = new Set()
  for (const entry of entries) {
    if (!entry || !/^[a-z]{2,40}$/.test(entry.id) || ids.has(entry.id)) throw fail('ID de candidato inválido ou duplicado.', 422)
    if (!['pending', 'approved', 'rejected'].includes(entry.status)) throw fail(`Estado inválido: ${entry.id}.`, 422)
    ids.add(entry.id)
  }
  return { entries, hash: hash(raw) }
}

// A lock + re-read protects concurrent CLI/admin sessions. Rename never exposes half a JSON document.
export async function updateCatalog(root, expectedHash, update, afterSave) {
  const target = join(root, CATALOG)
  let lock
  try { lock = await open(`${target}.lock`, 'wx') } catch { throw fail('Catálogo ocupado. Recarregue e tente novamente.', 409) }
  let temp
  try {
    const current = await loadCatalog(root)
    if (expectedHash !== current.hash) throw fail('O catálogo mudou. Recarregue antes de decidir.', 409)
    const entries = await update(current.entries)
    temp = `${target}.${randomBytes(8).toString('hex')}.tmp`
    await writeFile(temp, `${JSON.stringify(entries, null, 2)}\n`, { flag: 'wx' })
    await rename(temp, target)
    temp = null
    if (afterSave) await afterSave()
    return loadCatalog(root)
  } finally {
    if (temp) await unlink(temp).catch(() => {})
    await lock.close()
    await unlink(`${target}.lock`)
  }
}

// Parse RIFF WebP canvas dimensions, including files with EXIF/XMP/alpha chunks. No image-processing dependency.
export function webpSize(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) return null
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunk = bytes.toString('ascii', offset, offset + 4)
    const length = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    if (start + length > bytes.length) return null
    if (chunk === 'VP8X' && length >= 10) return { width: 1 + bytes.readUIntLE(start + 4, 3), height: 1 + bytes.readUIntLE(start + 7, 3), animated: !!(bytes[start] & 2) }
    if (chunk === 'VP8L' && length >= 5 && bytes[start] === 0x2f) {
      const packed = bytes.readUInt32LE(start + 1)
      return { width: 1 + (packed & 0x3fff), height: 1 + ((packed >>> 14) & 0x3fff), animated: false }
    }
    if (chunk === 'VP8 ' && length >= 10 && bytes.toString('hex', start + 3, start + 6) === '9d012a') return { width: bytes.readUInt16LE(start + 6) & 0x3fff, height: bytes.readUInt16LE(start + 8) & 0x3fff, animated: false }
    offset = start + length + (length & 1)
  }
  return null
}

function validMp3(bytes) {
  if (bytes.length < 128 || bytes.length > 5 * 1024 * 1024) return false
  let start = 0
  if (bytes.toString('ascii', 0, 3) === 'ID3') {
    if ([6, 7, 8, 9].some((i) => bytes[i] > 127)) return false
    start = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9])
  }
  for (let i = start; i < Math.min(start + 2048, bytes.length - 3); i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0 && (bytes[i + 1] & 0x18) !== 8 && (bytes[i + 1] & 6) !== 0 && (bytes[i + 2] & 0xf0) !== 0 && (bytes[i + 2] & 0xf0) !== 0xf0 && (bytes[i + 2] & 12) !== 12) return true
  }
  return false
}

async function safeAsset(root, id, key) {
  const expected = paths(id)[key]
  const full = join(root, 'public', expected.slice(1))
  const actual = await realpath(full)
  const allowed = await realpath(join(root, 'public', 'ads', 'presenters'))
  if (!actual.startsWith(`${allowed}${sep}`)) throw fail('Atalho fora da pasta de retratos não é permitido.')
  return { bytes: await readFile(actual), path: expected }
}

export async function inspectAssets(root, entry) {
  const assets = {}
  const errors = []
  for (const key of ['portrait', 'facePortrait', 'voiceSample']) {
    try {
      const asset = await safeAsset(root, entry.id, key)
      const dimensions = key === 'voiceSample' ? null : webpSize(asset.bytes)
      const ok = key === 'voiceSample' ? validMp3(asset.bytes) : !!dimensions && !dimensions.animated && dimensions.width * 16 === dimensions.height * 9 && dimensions.width >= 360 && asset.bytes.length <= MAX_IMAGE
      if (!ok) throw new Error(key === 'voiceSample' ? 'MP3 inválido ou maior que 5 MiB' : 'exige WebP 9:16 estático, largura mínima 360 px, até 120 KiB')
      assets[key] = { path: asset.path, hash: hash(asset.bytes), bytes: asset.bytes.length, ...dimensions }
    } catch (error) { errors.push(`${key}: ${error.code === 'ENOENT' ? 'arquivo pendente' : error.message}`) }
  }
  const assetHashes = errors.length ? null : Object.fromEntries(Object.entries(assets).map(([key, value]) => [key, value.hash]))
  const approvalCurrent = entry.status === 'approved' && entry.reviewedBy === FOUNDER && Number.isFinite(Date.parse(entry.reviewedAt)) && assetHashes && CHECKS.every((key) => entry.checks?.[key] === true) && Object.keys(assetHashes).every((key) => assetHashes[key] === entry.assetHashes?.[key])
  if (entry.status === 'approved' && !approvalCurrent) errors.push('Aprovação antiga: arquivos ou revisão mudaram. Desfaça e aprove novamente.')
  return { assets, assetHashes, errors, ready: !!assetHashes, approvalCurrent: !!approvalCurrent }
}

export async function decide(root, request) {
  if (!['approve', 'reject', 'undo'].includes(request.action)) throw fail('Decisão inválida.')
  if (request.reviewedBy !== FOUNDER || request.founderAcknowledgement !== true) throw fail('A decisão exige confirmação explícita de Joseph Skaf.', 403)
  return updateCatalog(root, request.expectedHash, async (entries) => {
    const index = entries.findIndex((entry) => entry.id === request.id)
    if (index < 0) throw fail('Candidato desconhecido.', 404)
    const entry = entries[index]
    if (request.action === 'undo') entries[index] = reset(entry)
    else if (request.action === 'reject') entries[index] = { ...reset(entry), status: 'rejected', reviewedBy: FOUNDER, reviewedAt: new Date().toISOString() }
    else {
      if (!CHECKS.every((key) => request.checks?.[key] === true)) throw fail('Confira todos os itens, inclusive a voz, antes de aprovar.', 422)
      const inspected = await inspectAssets(root, entry)
      if (!inspected.ready) throw fail(`Aprovação bloqueada: ${inspected.errors.join('; ')}.`, 422)
      const expected = request.expectedAssetHashes
      const assetKeys = ['portrait', 'facePortrait', 'voiceSample']
      if (!expected || Object.keys(expected).length !== assetKeys.length || !assetKeys.every(key => typeof expected[key] === 'string' && /^[a-f0-9]{64}$/.test(expected[key]) && expected[key] === inspected.assetHashes[key])) throw fail('Os arquivos da prévia mudaram ou não foram conferidos nesta aba. Recarregue e revise corpo, rosto e voz antes de aprovar.', 409)
      entries[index] = { ...entry, ...paths(entry.id), status: 'approved', reviewedBy: FOUNDER, reviewedAt: new Date().toISOString(), checks: Object.fromEntries(CHECKS.map((key) => [key, true])), assetHashes: inspected.assetHashes }
    }
    return entries
  })
}

export function generationJob(entry) {
  // Mirror of presenterCandidatePortraitPrompt2410; guarded for equality without adding a TS runtime to the CLI.
  const p = entry
  const prompt = `Photorealistic full-length head-to-toe portrait of ${p.look}. Fictional adult AI presenter, age ${p.ageMin} to ${p.ageMax}. Both eyes fully OPEN, looking directly at the camera, clear visible pupils, relaxed attentive expression, lips gently closed. Natural daylight from a large window, plain light neutral background. Neutral unbranded clothing and shoes, no text, no logos, no props. Both arms relaxed, both hands fully visible with five natural fingers each; anatomically correct hands. Entire body including head, hands and feet inside the frame with generous margins. Face large and sharply focused enough for a separate face crop. Stable straight camera, realistic skin texture, no beauty filter, no glamour retouching, no closed eyes, no sunglasses, no motion blur. Vertical 9:16.`
  if (prompt.length > 2000) throw fail(`Prompt longo demais: ${entry.id}.`)
  const age = entry.ageMin >= 50 ? 'mature' : entry.ageMax <= 30 ? 'young' : 'adult'
  const voiceIds = entry.gender === 'man' ? { young: 'Portuguese_ReservedYoungMan', adult: 'Portuguese_ReliableMan', mature: 'Portuguese_Deep-VoicedGentleman' } : { young: 'Portuguese_LovelyLady', adult: 'Portuguese_ConfidentWoman', mature: 'Portuguese_Wiselady' }
  const voice = { model: 'fal-ai/minimax/speech-2.8-hd', voiceId: voiceIds[age], languageBoost: 'Portuguese', speed: 1, sampleLanguage: 'pt', instruction: 'Preparar amostra PT com lib/avatar/voice.ts synthesizeWithVoice e estes parâmetros. /api/audio/generate usa voz padrão e não serve para esta amostra. Não executado nesta tarefa.' }
  return { id: entry.id, voice, endpoint: '/api/images/generate', method: 'POST', body: { prompt, model: 'nanobanana', size: 'portrait_16_9' }, outputs: paths(entry.id), face: 'Recortar o MESMO corpo inteiro com --import --crop; nenhuma segunda geração paga.' }
}

export function buildPlan(entries) {
  return { task: 'KINEO-APRESENTADORES-2410', generatedAt: new Date().toISOString(), execution: 'PREPARADO — nenhuma chamada executada; geração futura exige --generate --allow-paid.', priceSource: 'app/api/images/generate/route.ts:49-55, comentário sem verificação comercial atual; estimativa do fundador em 24/10/2026: US$ 0,15 por imagem, exclui voz e repetição.', jobs: entries.map(generationJob) }
}

async function sharpFor(root, modulePath) {
  try {
    const require = createRequire(join(root, 'package.json'))
    if (!modulePath) return require('sharp')
    if (/(^|[\\/])\.env(?:\.|$)/i.test(modulePath)) throw fail('Arquivos .env não são módulos permitidos.')
    const actual = await realpath(resolve(modulePath))
    if (/(^|[\\/])\.env(?:\.|$)/i.test(actual)) throw fail('Arquivos .env não são módulos permitidos.')
    return (await import(pathToFileURL(actual).href)).default
  } catch { throw fail('Conversão precisa do sharp já instalado: passe --sharp-module <caminho/index.js>, ou importe dois WebP já preparados com --source e --face-source. Nenhum pacote é instalado automaticamente.') }
}

function normalizedCrop(raw) {
  const crop = String(raw ?? '').split(',').map(Number)
  if (crop.length !== 4 || crop.some((n) => !Number.isFinite(n) || n < 0 || n > 1) || crop[2] <= 0 || crop[3] <= 0 || crop[0] + crop[2] > 1 || crop[1] + crop[3] > 1) throw fail('--crop exige x,y,largura,altura entre 0 e 1, dentro da foto. Escolha manualmente o rosto; não há reconhecimento automático.')
  return crop
}

async function cappedFile(filename, cap = MAX_SOURCE) {
  if (/(^|[\\/])\.env(?:\.|$)/i.test(filename)) throw fail('Arquivos .env não são fontes permitidas.')
  const actual = await realpath(filename)
  if (/(^|[\\/])\.env(?:\.|$)/i.test(actual)) throw fail('Arquivos .env não são fontes permitidas.')
  const bytes = await readFile(actual)
  if (!bytes.length || bytes.length > cap) throw fail('Arquivo vazio ou maior que o limite.')
  return bytes
}

async function atomicAsset(root, id, key, bytes) {
  const folder = join(root, 'public', 'ads', 'presenters')
  await mkdir(folder, { recursive: true })
  const actualFolder = await realpath(folder)
  if (actualFolder !== resolve(folder)) throw fail('Pasta de retratos com atalho não é permitida.')
  const target = join(root, 'public', paths(id)[key].slice(1))
  const temp = `${target}.${randomBytes(8).toString('hex')}.tmp`
  await writeFile(temp, bytes, { flag: 'wx' })
  try { await rename(temp, target) } finally { await unlink(temp).catch(() => {}) }
}

export async function importCandidate(root, options) {
  const current = await loadCatalog(root)
  const entry = current.entries.find((item) => item.id === options.id)
  if (!entry) throw fail('Candidato desconhecido.')
  if (!options.source && !options.voiceSource) throw fail('Passe --source ou --voice-source.')
  let portrait, facePortrait, voice
  if (options.source) {
    const source = await cappedFile(resolve(options.source))
    if (options.faceSource) {
      portrait = source
      facePortrait = await cappedFile(resolve(options.faceSource))
    } else {
      const crop = normalizedCrop(options.crop)
      const sharp = await sharpFor(root, options.sharpModule)
      const metadata = await sharp(source, { limitInputPixels: 40000000 }).metadata()
      if (!metadata.width || !metadata.height || metadata.orientation && metadata.orientation !== 1) throw fail('Normalize a orientação da fonte antes de informar o recorte.')
      const [x, y, width, height] = crop
      const rect = { left: Math.floor(x * metadata.width), top: Math.floor(y * metadata.height), width: Math.max(1, Math.floor(width * metadata.width)), height: Math.max(1, Math.floor(height * metadata.height)) }
      const compress = async (pipeline) => {
        for (const quality of [88, 78, 68, 58]) { const bytes = await pipeline.clone().webp({ quality }).toBuffer(); if (bytes.length <= MAX_IMAGE) return bytes }
        throw fail('Retrato acima de 120 KiB após conversão; ajuste a fonte.')
      }
      portrait = await compress(sharp(source).resize(360, 640, { fit: 'contain', background: '#e8e6e2' }))
      facePortrait = await compress(sharp(source).extract(rect).resize(360, 640, { fit: 'cover' }))
    }
    for (const bytes of [portrait, facePortrait]) {
      const size = webpSize(bytes)
      if (!size || size.animated || size.width < 360 || size.width * 16 !== size.height * 9 || bytes.length > MAX_IMAGE) throw fail('Importe WebP 9:16 estático, mínimo 360 px de largura, até 120 KiB, para corpo E rosto.')
    }
  }
  if (options.voiceSource) { voice = await cappedFile(resolve(options.voiceSource), 5 * 1024 * 1024); if (!validMp3(voice)) throw fail('Amostra de voz MP3 inválida.') }
  // Revoke approval BEFORE replacing bytes, so partial writes fail closed. Keep rejected people rejected.
  return updateCatalog(root, current.hash, (entries) => {
    const index = entries.findIndex((item) => item.id === entry.id)
    entries[index] = { ...reset(entry), status: entry.status === 'rejected' ? 'rejected' : 'pending', ...(portrait ? { portrait: paths(entry.id).portrait, facePortrait: paths(entry.id).facePortrait } : {}), ...(voice ? { voiceSample: paths(entry.id).voiceSample } : {}) }
    // Persist the revocation before touching bytes; keep the catalog lock through every asset replacement.
    return entries
  }, async () => {
    if (portrait) await atomicAsset(root, entry.id, 'portrait', portrait)
    if (facePortrait) await atomicAsset(root, entry.id, 'facePortrait', facePortrait)
    if (voice) await atomicAsset(root, entry.id, 'voiceSample', voice)
  })
}

export async function generateCandidates(root, options, env = process.env) {
  if (options.allowPaid !== true) throw fail('Nenhuma chamada: --generate exige --allow-paid e autorização futura para gastar.')
  if ((!options.id && !options.all) || options.id && options.all) throw fail('Escolha exatamente --id <id> ou --all.')
  const base = new URL(env.KINEO_BASE_URL ?? '')
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' || !(base.origin === 'https://www.usekineo.com' || base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname))) throw fail('KINEO_BASE_URL exige https://www.usekineo.com ou servidor local HTTP. O cookie nunca é enviado a outro domínio.')
  const cookie = env.KINEO_FOUNDER_COOKIE
  if (!cookie || /[\r\n]/.test(cookie)) throw fail('Passe KINEO_FOUNDER_COOKIE no ambiente da sessão; o script não lê .env.')
  let current = await loadCatalog(root)
  const selected = options.all ? current.entries.filter((entry) => entry.status === 'pending') : current.entries.filter((entry) => entry.id === options.id)
  if (!selected.length) throw fail('Nenhum candidato selecionado.')
  if (selected.some((entry) => entry.status !== 'pending')) throw fail('Geração só aceita pendentes; desfaça a decisão local antes.')
  const outputDir = join(root, 'docs', 'assets', 'apresentadores-2410')
  await mkdir(outputDir, { recursive: true })
  const outputs = []
  for (const entry of selected) {
    const target = join(outputDir, `${entry.id}-source.bin`)
    let reservation
    try { reservation = await open(target, 'wx') } catch {
      if (options.all) { outputs.push({ id: entry.id, file: target, skipped: true }); continue }
      throw fail(`Fonte de ${entry.id} já existe. Preserve e importe o arquivo; não há repetição paga automática.`, 409)
    }
    try {
      current = await updateCatalog(root, current.hash, (entries) => entries.map((item) => item.id === entry.id ? reset(item) : item))
      const job = generationJob(entry)
      const response = await fetch(new URL(job.endpoint, base), { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(job.body), redirect: 'error', signal: AbortSignal.timeout(90000) })
      if (!response.ok) throw fail(`Gerador recusou ${entry.id} (HTTP ${response.status}). Sem repetição automática.`, 502)
      const result = await response.json()
      const source = new URL(result.url)
      if (source.protocol !== 'https:' || source.username || source.password) throw fail('O gerador retornou uma origem inválida.', 502)
      // Cookie goes ONLY to the first-party generation endpoint; never to the asset host or logs.
      const image = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(60000) })
      if (!image.ok || !/^image\/(png|jpeg|webp)(?:;|$)/i.test(image.headers.get('content-type') ?? '')) throw fail('O gerador não devolveu um arquivo de imagem suportado.', 502)
      if (Number(image.headers.get('content-length')) > MAX_SOURCE) throw fail('Fonte gerada acima de 20 MiB.', 502)
      let total = 0
      for await (const chunk of image.body) { total += chunk.length; if (total > MAX_SOURCE) throw fail('Fonte gerada acima de 20 MiB.', 502); await reservation.write(chunk) }
      if (!total) throw fail('Fonte vazia.', 502)
      outputs.push({ id: entry.id, file: target, next: '--import --id <id> --source <arquivo> --crop x,y,w,h' })
    } catch (error) {
      // Keep the reservation as a receipt; an error may happen AFTER billing. Never silently regenerate.
      throw fail(`Geração interrompida em ${entry.id}. Confira o resultado na galeria e a fonte local antes de repetir. ${error.status ? error.message : 'Falha de transporte ou resposta inválida.'}`, error.status ?? 502)
    } finally { await reservation.close() }
  }
  return outputs
}

export const ADMIN_CSS = `:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#e8eaf0;background:#0b0e15;font-synthesis:none}*{box-sizing:border-box}body{margin:0}main{max-width:1360px;margin:auto;padding:36px 28px}header{display:flex;justify-content:space-between;gap:24px;align-items:start;margin-bottom:24px}h1{font-size:30px;letter-spacing:-.8px;margin:4px 0 10px}h2{font-size:18px;margin:0}p{color:#aeb8cb;line-height:1.5;font-size:14px}.eyebrow{color:#a8b9ff;font-size:11px;font-weight:750;letter-spacing:2px}.chip{border:1px solid #384364;color:#b7c7ff;border-radius:99px;padding:6px 10px;font-size:12px;white-space:nowrap}.stats{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.note{background:#141b2b;border:1px solid #2a3653;border-radius:12px;padding:14px 18px;color:#bbc8e1;font-size:13px;line-height:1.5}.founder{margin:20px 0;display:flex;gap:14px;align-items:center;flex-wrap:wrap}.founder label{font-size:13px;color:#bdc6d8}input[type=text]{background:#151b29;border:1px solid #3b4662;border-radius:8px;color:white;padding:10px;font:inherit}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{background:#121722;border:1px solid #2b3449;border-radius:16px;overflow:hidden}.cardtop{padding:16px 18px 12px;display:flex;justify-content:space-between;gap:8px}.meta{font-size:12px;color:#9eabc2;margin:6px 0 0}.portraits{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 16px}.photo{aspect-ratio:9/16;position:relative;background:#1b2232;border-radius:10px;overflow:hidden;display:grid;place-items:center;text-align:center;color:#8f9cb6;font-size:12px;padding:10px}.photo img{position:absolute;width:100%;height:100%;object-fit:contain}.photo .caption{position:absolute;left:7px;bottom:7px;background:#0b0e15dc;padding:5px 7px;border-radius:6px;color:#c0cbdf;font-size:10px}.details{padding:12px 18px 16px}.voice{width:100%;height:32px;margin:5px 0}.pendingvoice{padding:10px 0;color:#99a8c0;font-size:12px}.checks{display:grid;gap:9px;margin:12px 0}.checks label{font-size:12px;color:#c2cbdd;display:flex;gap:8px;align-items:start;line-height:1.4}input[type=checkbox]{accent-color:#8ba4ff}.actions{display:flex;gap:7px;flex-wrap:wrap}button{border:1px solid #465478;background:#1b263e;color:#cedaff;border-radius:8px;padding:9px 11px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}button.primary{background:#aac0ff;color:#101b33;border-color:#aac0ff}button:disabled{opacity:.4;cursor:not-allowed}button:hover:enabled{filter:brightness(1.12)}button:focus-visible,input:focus-visible{outline:3px solid #c3d0ff;outline-offset:3px}.errors{font-size:11px;line-height:1.5;color:#b1bad0;margin:10px 0}.status{font-size:10px;color:#d7c49a;background:#342d20;padding:5px 7px;border-radius:6px;height:fit-content}.status.approved{color:#b0d8c2;background:#1d332e}.status.rejected{color:#c5bdd4;background:#302b39}.review{font-size:11px;color:#a9b7ce;line-height:1.5;margin-top:10px}.message{position:sticky;bottom:16px;background:#263957;color:white;border:1px solid #6b83b4;padding:14px;border-radius:10px;margin-top:20px;display:none}@media(max-width:950px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){main{padding:24px 16px}header{display:block}header>.chip{display:inline-block;margin-top:8px}h1{font-size:26px}.grid{grid-template-columns:1fr}.cardtop{padding-top:18px}.founder{align-items:start;display:grid;gap:12px}.founder input[type=text]{width:100%}}`
const labels = { eyesOpen: 'Olhos abertos nas duas fotos', naturalHands: 'Mãos naturais e corpo inteiro no enquadramento', neutralClothes: 'Roupa neutra e luz natural', identityMatch: 'Corpo e rosto são a mesma pessoa', voiceMatch: 'Ouvi a voz: gênero e idade coerentes' }
const statusLabels = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Recusado' }

export function renderCards(entries, inspections, { staticPreview = false } = {}) {
  return entries.map((entry) => {
    const inspected = inspections[entry.id] ?? { assets: {}, ready: false, errors: ['Retratos e voz ainda não gerados.'] }
    const pictures = [['portrait', 'Corpo inteiro'], ['facePortrait', 'Rosto']].map(([key, title]) => `<div class="photo">${inspected.assets[key] ? `<img src="/asset/${escape(entry.id)}/${key}?v=${escape(inspected.assets[key].hash)}" alt="${escape(title)} de ${escape(entry.name)}">` : '<span>Prévia pendente<br>Imagem não gerada</span>'}<span class="caption">${title}</span></div>`).join('')
    const voice = inspected.assets.voiceSample ? `<audio class="voice" controls preload="none" aria-label="Voz de ${escape(entry.name)}" src="/asset/${escape(entry.id)}/voiceSample?v=${escape(inspected.assets.voiceSample.hash)}"></audio>` : '<div class="pendingvoice">◌ Amostra de voz pendente</div>'
    return `<article class="card" data-id="${escape(entry.id)}"><div class="cardtop"><div><h2>${escape(entry.name)}</h2><p class="meta">${escape(entry.ageMin)}–${escape(entry.ageMax)} anos · ${escape(entry.style)}</p><p class="meta">${escape(entry.ethnicity)}</p></div><span class="status ${entry.status}">${statusLabels[entry.status]}</span></div><div class="portraits">${pictures}</div><div class="details">${voice}<div class="checks">${CHECKS.map((key) => `<label><input type="checkbox" name="${key}" ${entry.checks?.[key] ? 'checked' : ''} ${staticPreview ? 'disabled' : ''}>${labels[key]}</label>`).join('')}</div><div class="errors">${inspected.errors.map(escape).join('<br>')}</div><div class="actions"><button class="primary" data-action="approve" ${!inspected.ready || staticPreview ? 'disabled' : ''}>Aprovar pessoa</button><button data-action="reject" ${staticPreview ? 'disabled' : ''}>Recusar</button><button data-action="undo" ${staticPreview || entry.status === 'pending' ? 'disabled' : ''}>Desfazer</button></div>${entry.reviewedAt ? `<div class="review">${escape(entry.reviewedBy)} · ${escape(entry.reviewedAt)}${inspected.approvalCurrent ? '<br>Arquivos conferidos pela assinatura SHA-256.' : ''}</div>` : ''}</div></article>`
  }).join('')
}

export function renderAdmin(entries, inspections, { token = '', catalogHash = '', nonce = '', staticPreview = false } = {}) {
  const counts = (status) => entries.filter((entry) => entry.status === status).length
  // Only known safe IDs and exact hash keys enter executable JSON, never arbitrary catalog text.
  const snapshot = Object.fromEntries(entries.filter(entry => /^[a-z][a-z0-9-]{1,39}$/.test(entry.id)).map(entry => [entry.id, Object.fromEntries(['portrait', 'facePortrait', 'voiceSample'].map(key => [key, /^[a-f0-9]{64}$/.test(inspections[entry.id]?.assets?.[key]?.hash ?? '') ? inspections[entry.id].assets[key].hash : null]))]))
  const script = staticPreview ? '' : `<script nonce="${nonce}">const token=${JSON.stringify(token)},expectedHash=${JSON.stringify(catalogHash)},assetSnapshot=${JSON.stringify(snapshot)};const notice=document.querySelector('#message');document.querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',async()=>{const card=button.closest('[data-id]');const checks=Object.fromEntries([...card.querySelectorAll('input[type=checkbox]')].map(input=>[input.name,input.checked]));const reviewedBy=document.querySelector('#founder').value;const founderAcknowledgement=document.querySelector('#ack').checked;button.disabled=true;try{const response=await fetch('/decision',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify({id:card.dataset.id,action:button.dataset.action,checks,reviewedBy,founderAcknowledgement,expectedHash,expectedAssetHashes:assetSnapshot[card.dataset.id]})});const result=await response.json();if(!response.ok)throw Error(result.error);location.reload()}catch(error){notice.textContent=error.message;notice.style.display='block';button.disabled=false}}));</script>`
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio Ads · aprovação de apresentadores</title><style>${ADMIN_CSS}</style></head><body><main><header><div><div class="eyebrow">KINEO · STUDIO ADS</div><h1>Aprovação de apresentadores</h1><p>Confira cada pessoa antes de liberar sua presença na escolha do Studio Ads.</p></div><span class="chip">Interno · somente neste computador</span></header><div class="note">${entries.length} candidatos novos para escolher 6. Aprovar exige corpo inteiro, rosto e voz reais, os cinco itens de revisão e confirmação de Joseph Skaf. Esta página não gera imagens nem faz chamadas pagas. A decisão fica no catálogo local; exposição pública exige revisão, commit e publicação posteriores.</div><div class="stats"><span class="chip">${counts('pending')} pendentes</span><span class="chip">${counts('approved')} aprovados</span><span class="chip">${counts('rejected')} recusados</span></div><div class="founder"><label>Nome do fundador <input id="founder" type="text" autocomplete="off" placeholder="Joseph Skaf" ${staticPreview ? 'disabled' : ''}></label><label><input id="ack" type="checkbox" ${staticPreview ? 'disabled' : ''}> Sou Joseph Skaf e esta é minha decisão pessoal.</label></div><section class="grid" aria-label="Candidatos">${renderCards(entries, inspections, { staticPreview })}</section><div id="message" class="message" role="status" aria-live="polite"></div></main>${script}</body></html>`
}

export async function startAdmin(root) {
  await loadCatalog(root)
  const token = randomBytes(32).toString('hex')
  const nonce = randomBytes(18).toString('base64')
  let origin = ''
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    response.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`)
    try {
      if (request.socket.remoteAddress !== '127.0.0.1' || request.headers.host !== new URL(origin).host || request.headers.origin && request.headers.origin !== origin || request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site'])) throw fail('Acesso permitido apenas pela origem local desta sessão.', 403)
      const url = new URL(request.url, origin)
      if (request.method === 'GET' && url.pathname === '/') {
        const catalog = await loadCatalog(root)
        const inspections = Object.fromEntries(await Promise.all(catalog.entries.map(async (entry) => [entry.id, await inspectAssets(root, entry)])))
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        return response.end(renderAdmin(catalog.entries, inspections, { token, catalogHash: catalog.hash, nonce }))
      }
      if (request.method === 'GET' && url.pathname.startsWith('/asset/')) {
        const parts = url.pathname.split('/')
        const catalog = await loadCatalog(root)
        const entry = catalog.entries.find((item) => item.id === parts[2])
        const key = parts[3]
        if (parts.length !== 4 || !entry || !['portrait', 'facePortrait', 'voiceSample'].includes(key)) throw fail('Arquivo desconhecido.', 404)
        const checked = await inspectAssets(root, entry)
        if (!checked.assets[key]) throw fail('Arquivo ainda não está pronto.', 404)
        const asset = await safeAsset(root, entry.id, key)
        response.setHeader('Content-Type', key === 'voiceSample' ? 'audio/mpeg' : 'image/webp')
        return response.end(asset.bytes)
      }
      if (request.method !== 'POST' || url.pathname !== '/decision') throw fail('Caminho desconhecido.', 404)
      const sentToken = Buffer.from(String(request.headers['x-csrf-token'] ?? ''))
      if (request.headers.origin !== origin || sentToken.length !== token.length || !timingSafeEqual(sentToken, Buffer.from(token))) throw fail('Sessão inválida. Reabra a página local.', 403)
      if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) throw fail('Envie JSON.', 415)
      let bytes = 0
      const chunks = []
      for await (const chunk of request) { bytes += chunk.length; if (bytes > 8192) throw fail('Pedido muito grande.', 413); chunks.push(chunk) }
      let body
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw fail('JSON inválido.') }
      await decide(root, body)
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ ok: true }))
    } catch (error) {
      response.statusCode = error.status ?? 500
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: error.status ? error.message : 'Falha local ao ler ou gravar o catálogo. Nenhuma chamada paga foi feita.' }))
    }
  })
  server.requestTimeout = 10000
  server.headersTimeout = 10000
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept) })
  origin = `http://127.0.0.1:${server.address().port}`
  return { server, origin }
}
