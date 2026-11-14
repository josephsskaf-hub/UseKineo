// KINEO-MODERACAO-DOWNLOAD-1411 — guardião do pedido 5 da CEO (14/11): quando o moderador não consegue BAIXAR a foto ("400 Failed to download
// image"), a casa tenta mais uma vez antes de recusar. EXECUTA lib/safety/contentModeration.ts (moderateContent) com OpenAI, rede e eventos de
// mentira e a regra real (moderationPolicy): (1) falha de download + nossa cópia em base64 = passa, 2 chamadas, evento do resgate; (2) falha
// duas vezes = FORA DO AR (unavailable, "tente de novo"), nunca "esta imagem não serve", e nunca uma 3ª chamada; (3) outro 4xx (formato,
// tamanho) = unprocessable, 1 chamada, como antes; (4) timeout/5xx = unavailable, 1 chamada, sem retry; (5) só baixamos do nosso Storage ou do
// fornecedor, até 8 MB — fora disso a 2ª chamada repete a URL; (6) bloqueio na 2ª chamada continua bloqueio. E a rota do "seu vídeo": a frase
// certa em cada recusa de moderação. 2ª rodada do revisor (KINEO-MODERACAO-DOWNLOAD-REVISAO-1411, itens 8 e 9 — bloqueavam): o resgate não segue
// redirecionamento; content-length acima de 8 MB não é baixado; corpo sem content-length é cortado no teto; sem cópia nossa NÃO há 2ª chamada e a
// resposta é a de antes (unprocessable). Mutantes. Rodar: node scripts/test-moderacao-download-1411.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const MOD = 'lib/safety/contentModeration.ts', ROTA = 'app/api/recreate/seu-video/route.ts'
const NOSSA = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/avatars/u/face-1.jpg'
const DE_FORA = 'https://example.org/foto.jpg'
const LIMPO = { flagged: false, categories: {}, category_scores: { sexual: 0.0001, 'sexual/minors': 0.00001 } }
const erro = (status, message) => Object.assign(new Error(message), { status })
const DOWNLOAD = () => erro(400, '400 Failed to download image from ' + NOSSA + '.')

function mundo(src, roteiro, o = {}) {
  const s = { chamadas: [], eventos: [], downloads: [], inits: [], lidos: 0, cancelado: false }
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(rel === MOD ? src : lf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const fetchFalso = async (url, init) => {
      s.downloads.push(String(url)); s.inits.push(init ?? {})
      if (o.downloadFalha) throw new Error('rede')
      if (o.redireciona && init?.redirect === 'error') throw new TypeError('fetch failed: unexpected redirect')
      const bytes = new Uint8Array(o.bytes ?? 2048).fill(7)
      const headers = { get: (h) => (h === 'content-type' ? (o.tipo ?? 'image/jpeg') : h === 'content-length' ? (o.declarado ?? null) : null) }
      // corpo em pedaços de 1 MB, sem fim (o servidor que nunca para): conta o que foi lido e se a leitura foi cancelada
      const pedaco = new Uint8Array(1024 * 1024) // o mesmo pedaço sempre (o guardião não gasta memória com o corpo sem fim)
      const body = o.semFim ? { cancel: async () => { s.cancelado = true }, getReader: () => ({ read: async () => { s.lidos += pedaco.byteLength; if (s.lidos > 200 * 1024 * 1024) return { done: true, value: undefined }; return { done: false, value: pedaco } }, cancel: async () => { s.cancelado = true } }) } : o.declarado ? { cancel: async () => { s.cancelado = true }, getReader: () => { throw new Error('leu o corpo com content-length acima do teto') } } : undefined
      return { ok: true, headers, body, arrayBuffer: async () => { s.lidos += bytes.byteLength; return bytes.buffer } }
    }
    new Function('require', 'module', 'exports', 'process', 'fetch', 'Buffer', 'AbortSignal', 'console', js)((id) => {
      if (id === '@/lib/openai') return { openai: { moderations: { create: async (body) => { s.chamadas.push(body.input); const passo = roteiro[Math.min(s.chamadas.length - 1, roteiro.length - 1)]; if (passo instanceof Error) throw passo; return { results: [passo] } } } } }
      if (id === '@/lib/serverEvents') return { writeServerEvent: async (e) => { s.eventos.push(e); return true } }
      if (id.startsWith('.')) return load(path.posix.join(path.posix.dirname(rel), id) + '.ts')
      throw new Error('import inesperado: ' + id)
    }, mod, mod.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://cqqukkvjjrguayiyjvhh.supabase.co' } }, fetchFalso, Buffer, AbortSignal, { error() {}, warn() {}, log() {} })
    return mod.exports
  }
  return { s, M: load(MOD) }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const src = over[MOD] ?? lf(MOD)
  const roda = async (roteiro, o = {}, url = NOSSA) => { const w = mundo(src, roteiro, o); const v = await w.M.moderateContent({ surface: 'clip', stage: 'input', userId: 'u1', text: 'a dancer', imageUrls: [url] }); return { v, s: w.s } }
  const urlDaChamada = (s, i) => s.chamadas[i].find((x) => x.type === 'image_url').image_url.url
  await check('o caso de 14/11: 1ª não baixa, 2ª em base64 passa', async () => {
    const { v, s } = await roda([DOWNLOAD(), LIMPO])
    if (!v.ok || s.chamadas.length !== 2) throw new Error(JSON.stringify(v) + ' chamadas ' + s.chamadas.length)
    if (urlDaChamada(s, 0) !== NOSSA || !urlDaChamada(s, 1).startsWith('data:image/jpeg;base64,')) throw new Error('a 2ª chamada não foi em base64')
    if (!s.chamadas[1].some((x) => x.type === 'text')) throw new Error('o texto sumiu da 2ª chamada')
    const ev = s.eventos.find((e) => e.name === 'content_moderation_download_retry')
    if (!ev || ev.metadata.outcome !== 'ok' || ev.metadata.inline_images !== 1) throw new Error('evento do resgate')
  })
  await check('falhou duas vezes: fora do ar (tente de novo), 2 chamadas e nenhuma 3ª', async () => {
    const { v, s } = await roda([DOWNLOAD(), DOWNLOAD(), LIMPO])
    if (v.ok || v.reason !== 'unavailable' || s.chamadas.length !== 2) throw new Error(JSON.stringify(v) + ' chamadas ' + s.chamadas.length)
    if (!s.eventos.some((e) => e.name === 'content_moderation_unavailable' && e.metadata.reason === 'unavailable' && /download failed twice/.test(e.metadata.error))) throw new Error('evento')
  })
  await check('outro 4xx (formato/tamanho): unprocessable, 1 chamada, como antes', async () => {
    const { v, s } = await roda([erro(400, '400 Invalid image format.'), LIMPO])
    if (v.ok || v.reason !== 'unprocessable' || s.chamadas.length !== 1 || s.downloads.length) throw new Error(JSON.stringify(v) + ' chamadas ' + s.chamadas.length)
  })
  await check('timeout e 5xx: unavailable, 1 chamada, sem retry', async () => {
    for (const e of [erro(500, '500 server error'), new Error('Request timed out.'), erro(429, '429 rate limit')]) {
      const { v, s } = await roda([e, LIMPO])
      if (v.ok || v.reason !== 'unavailable' || s.chamadas.length !== 1) throw new Error(e.message + ' → ' + JSON.stringify(v) + ' chamadas ' + s.chamadas.length)
    }
  })
  // reancorado KINEO-MODERACAO-DOWNLOAD-REVISAO-1411 (item 9): sem cópia nossa NÃO há 2ª chamada; a resposta é a de antes de 14/11 (unprocessable)
  await check('só baixamos do nosso Storage ou do fornecedor, até 8 MB; sem cópia nossa: 1 chamada, unprocessable, evento skipped', async () => {
    const semCopia = (r, nome) => { if (r.v.ok || r.v.reason !== 'unprocessable' || r.s.chamadas.length !== 1) throw new Error(nome + ': ' + JSON.stringify(r.v) + ' chamadas ' + r.s.chamadas.length); if (!r.s.eventos.some((e) => e.name === 'content_moderation_download_retry' && e.metadata.outcome === 'skipped')) throw new Error(nome + ': sem evento skipped') }
    const a = await roda([DOWNLOAD(), LIMPO], {}, DE_FORA)
    if (a.s.downloads.length !== 0) throw new Error('baixou de host de fora')
    semCopia(a, 'host de fora')
    semCopia(await roda([DOWNLOAD(), LIMPO], { bytes: 9 * 1024 * 1024 }), '9 MB')
    semCopia(await roda([DOWNLOAD(), LIMPO], { tipo: 'text/html' }), 'não é imagem')
    semCopia(await roda([DOWNLOAD(), LIMPO], { downloadFalha: true }), 'nosso download falhou')
    const e = await roda([DOWNLOAD(), LIMPO], {}, 'https://v3.fal.media/files/a/b.png')
    if (!urlDaChamada(e.s, 1).startsWith('data:image/jpeg;base64,')) throw new Error('fornecedor fora do resgate')
  })
  await check('2ª rodada (item 8): redirecionamento é erro; content-length acima do teto não é lido; corpo sem fim é cortado no teto', async () => {
    const a = await roda([DOWNLOAD(), LIMPO], { redireciona: true })
    if (a.s.inits[0]?.redirect !== 'error') throw new Error('o resgate segue redirecionamento: ' + JSON.stringify(a.s.inits[0]))
    if (a.v.ok || a.v.reason !== 'unprocessable' || a.s.chamadas.length !== 1) throw new Error('302: ' + JSON.stringify(a.v))
    const b = await roda([DOWNLOAD(), LIMPO], { declarado: String(64 * 1024 * 1024) })
    if (b.s.lidos !== 0 || !b.s.cancelado || b.v.ok || b.s.chamadas.length !== 1) throw new Error(`64 MB declarados: lidos ${b.s.lidos}, cancelado ${b.s.cancelado}, ${JSON.stringify(b.v)}`)
    const c = await roda([DOWNLOAD(), LIMPO], { semFim: true })
    if (c.s.lidos > 9 * 1024 * 1024 || !c.s.cancelado || c.v.ok || c.s.chamadas.length !== 1) throw new Error(`sem fim: lidos ${c.s.lidos}, cancelado ${c.s.cancelado}`)
  })
  await check('bloqueio na 2ª chamada continua bloqueio', async () => {
    const { v } = await roda([DOWNLOAD(), { flagged: true, categories: { 'sexual/minors': true }, category_scores: { sexual: 0.99, 'sexual/minors': 0.99 } }])
    if (v.ok || v.reason !== 'blocked') throw new Error(JSON.stringify(v))
  })
  await check('sem falha de download: 1 chamada, nenhum download nosso', async () => {
    const { v, s } = await roda([LIMPO])
    if (!v.ok || s.chamadas.length !== 1 || s.downloads.length || s.eventos.length) throw new Error('caminho feliz mudou')
  })
  const r = (over[ROTA] ?? lf(ROTA)).replace(/\/\/[^\n]*/g, '')
  await check('rota do seu vídeo: a frase certa em cada recusa de moderação', async () => {
    if (!r.includes("const FRASE_FOTO_NAO_CONFERIDA = 'Could not check your photo right now. Try again in a moment. Nothing was charged.'")) throw new Error('frase')
    if (!r.includes("if (result.code === 'moderation_unavailable') return json({ error: FRASE_FOTO_NAO_CONFERIDA, code: result.code, charged: false }, result.status)")) throw new Error('fora do ar')
    if (!r.includes("if (result.code === 'moderation' || result.code === 'moderation_unprocessable') return json({ error: result.error, code: result.code, charged: false }, result.status)")) throw new Error('bloqueio/imagem')
    if (r.indexOf("result.code === 'moderation_unavailable'") > r.indexOf("'Could not start this video. Check your photos, plan and balance, then retry.'")) throw new Error('a frase genérica vem antes')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mod = lf(MOD), rota = lf(ROTA)
const mutantes = [
  ['sem a 2ª tentativa', { [MOD]: mod.replace('    if (!moderationDownloadFailure(error)) throw error\n', '    throw error\n') }],
  ['retry em qualquer 4xx', { [MOD]: mod.replace('  return error instanceof ModerationUnprocessable && MODERATION_DOWNLOAD_ERROR.test(error.message)', '  return error instanceof ModerationUnprocessable') }],
  ['falha dupla vira "imagem não serve"', { [MOD]: mod.replace('      if (moderationDownloadFailure(second)) throw new ModerationDownloadFailed(', '      if (false) throw new ModerationDownloadFailed(') }],
  ['baixa de qualquer host', { [MOD]: mod.replace('  if (!moderationRescueHost(url)) return null\n', '') }],
  ['sem teto de tamanho', { [MOD]: mod.replace('return b.byteLength > max ? null : b }', 'return b }') }], // reancorado KINEO-MODERACAO-DOWNLOAD-REVISAO-1411
  ['segue redirecionamento', { [MOD]: mod.replace(", cache: 'no-store', redirect: 'error' })", ", cache: 'no-store' })") }],
  ['não confere o content-length', { [MOD]: mod.replace('    if (Number.isFinite(declarado) && declarado > MODERATION_RESCUE_MAX_BYTES) { await res.body?.cancel().catch(() => {}); return null }\n', '') }],
  ['corpo sem teto', { [MOD]: mod.replace('    if (total > max) { await reader.cancel().catch(() => {}); return null }\n', '    if (total > 16 * max) return null\n') }],
  ['sem cópia ainda faz a 2ª chamada', { [MOD]: mod.replace('    if (inline === 0) {', '    if (inline < 0) {') }],
  ['2ª chamada sem base64', { [MOD]: mod.replace("      return data ? { type: 'image_url', image_url: { url: data } } : part", '      return part') }],
  ['rota com a frase genérica', { [ROTA]: rota.replace("      if (result.code === 'moderation_unavailable') return json({ error: FRASE_FOTO_NAO_CONFERIDA, code: result.code, charged: false }, result.status)\n", '') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS moderação e download: falha de download ganha UMA 2ª chamada em base64 (só com cópia nossa: sem ela, 1 chamada e unprocessable como antes); falhou duas vezes = fora do ar; sem redirecionamento; 8 MB antes e durante a leitura; outros erros sem retry; só nosso Storage e fornecedor, até 8 MB; bloqueio respeitado; frase certa na rota; ${mortos}/${mutantes.length} mutantes mortos`)
