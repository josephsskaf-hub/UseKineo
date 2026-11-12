// KINEO-ADS-PESSOA-FALANDO-VIDEO-1211 — guardião do vídeo e do acompanhamento (lib/ads/pessoaFalando/video.ts), executado com io falso: fila,
// transcrição, juiz e estorno de mentira, o juiz de VERDADE (juizFala da Div. 2). Prova: só depois das fotos pagas e só com foto DESTE pedido;
// o pedido à fal é o seedance-2.0 image-to-video de 10 s com a fala; enviar 2× não manda 2 vídeos; pronto → juiz → cópia NOSSA → pronto;
// reprovado → 1 nova tentativa; reprovado de novo → estorno INTEGRAL (uma vez só) + falhou com charged:false; nunca debita. Mutantes.
// Rodar: node scripts/test-ads-pessoa-falando-video-1211.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const PF = 'lib/ads/pessoaFalando'
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
function carregar(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(over[rel] ?? lf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', js)((id) => { if (!id.startsWith('.')) throw new Error('import inesperado: ' + id); return load(path.posix.join(path.posix.dirname(rel), id) + '.ts') }, mod, mod.exports)
    return mod.exports
  }
  return load(`${PF}/video.ts`)
}
const U = 'u1', P = '11111111-2222-4333-8444-555555555555'
const FOTO = `https://x.supabase.co/storage/v1/object/public/renders/${U}/adspf-${P}-foto2.jpg`
const ROTEIRO = { fala: 'This cup rode in my car all day, and look, the ice from seven this morning is still here, and it fits my cup holder.', gestos: [{ palavra: 'look', gesto: 'tilts the cup toward the camera' }] }
const ENTRADA = { apresentadorId: 'sofia', formatoId: 'car_selfie', produto: 'Halo tumbler', fotoDoProduto: 'https://x/p.jpg', frase: 'Ice all day.' }

function mundo(o = {}) {
  const s = { eventos: [], envios: [], estornos: 0, debitos: 0, fotos: o.fotos ?? true, falas: o.falas ?? [ROTEIRO.fala], fila: o.fila ?? 'done' }
  const estado = async () => {
    const e = { fotosEntregues: s.fotos, estornado: false, entregue: null, tentativas: [], juizes: {} }
    for (const ev of s.eventos) {
      const m = ev.metadata
      if (ev.name === 'ads_pf_refunded') e.estornado = true
      if (ev.name === 'ads_pf_delivered') e.entregue = m.video
      if (ev.name === 'ads_pf_judge') e.juizes[m.tentativa] = m.aprovado
      if (ev.name === 'ads_pf_render_started') e.tentativas.push({ tentativa: m.tentativa, requestId: m.request_id, fala: m.fala, input: m.input })
    }
    return e
  }
  const io = {
    debitar: async () => { s.debitos++; return 'reserved' },
    estornar: async () => { s.estornos++; return s.estornos === 1 ? 55 : 0 },
    estado,
    submeter: async (endpoint, input) => { s.envios.push({ endpoint, input }); return 'req-' + s.envios.length },
    consultar: async () => ({ state: s.fila, url: s.fila === 'done' ? 'https://fal.media/v.mp4' : null }),
    transcrever: async () => { const texto = s.falas[Math.min(s.envios.length - 1, s.falas.length - 1)]; return { texto, inicio: 0.2, duracao: 10.04 } },
    guardar: async ({ tentativa }) => `https://x.supabase.co/storage/v1/object/public/renders/${U}/adspf-${P}-video${tentativa}.mp4`,
    evento: async (name, metadata) => { s.eventos.push({ name, metadata }) },
  }
  return { s, io }
}

async function bateria(over = {}) {
  const V = carregar(over)
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const ini = (io, foto = FOTO) => V.iniciarVideo(io, { userId: U, pedidoId: P, fotoChave: foto, roteiro: ROTEIRO, entrada: ENTRADA })
  await check('sem fotos pagas = 409, nada à fal', async () => {
    const { s, io } = mundo({ fotos: false }); const r = await ini(io)
    if (r.status !== 409 || s.envios.length) throw new Error('status ' + r.status)
  })
  await check('foto de outro pedido = 400', async () => {
    const { s, io } = mundo(); const r = await ini(io, FOTO.replace(P, '99999999-2222-4333-8444-555555555555'))
    if (r.status !== 400 || s.envios.length) throw new Error('status ' + r.status)
  })
  await check('envio certo e idempotente', async () => {
    const { s, io } = mundo(); const a = await ini(io); const b = await ini(io)
    if (a.status !== 202 || b.status !== 202 || s.envios.length !== 1) throw new Error('envios ' + s.envios.length)
    const e = s.envios[0]
    if (e.endpoint !== 'bytedance/seedance-2.0/image-to-video' || e.input.duration !== '10' || e.input.generate_audio !== true) throw new Error('pedido fora do aprovado')
    if (!JSON.stringify(e.input).includes('the ice from seven this morning')) throw new Error('a fala não vai')
    if (s.debitos !== 0) throw new Error('o vídeo debitou')
  })
  await check('renderizando enquanto a fila não termina', async () => {
    const { io } = mundo({ fila: 'processing' }); await ini(io); const r = await V.acompanhar(io, { userId: U, pedidoId: P })
    if (r.body.status !== 'renderizando') throw new Error(r.body.status)
  })
  await check('aprovado → pronto com vídeo NOSSO', async () => {
    const { s, io } = mundo(); await ini(io); const r = await V.acompanhar(io, { userId: U, pedidoId: P })
    if (r.body.status !== 'pronto' || String(r.body.video).includes('fal.media')) throw new Error(JSON.stringify(r.body))
    if (s.estornos !== 0) throw new Error('estornou um aprovado')
  })
  await check('reprovado → nova tentativa → reprovado → estorno integral 1 vez', async () => {
    const { s, io } = mundo({ falas: ['honestly honestly the cup', 'something else entirely'] })
    await ini(io)
    const r1 = await V.acompanhar(io, { userId: U, pedidoId: P })
    if (r1.body.status !== 'renderizando' || s.envios.length !== 2) throw new Error('sem nova tentativa: ' + JSON.stringify(r1.body))
    const r2 = await V.acompanhar(io, { userId: U, pedidoId: P })
    if (r2.body.status !== 'falhou' || r2.body.charged !== false || r2.body.refunded !== 55) throw new Error(JSON.stringify(r2.body))
    const r3 = await V.acompanhar(io, { userId: U, pedidoId: P })
    if (r3.body.status !== 'falhou' || s.estornos !== 1 || s.envios.length !== 2) throw new Error('estornos ' + s.estornos + ' envios ' + s.envios.length)
  })
  await check('fornecedor falha 2× → estorno', async () => {
    const { s, io } = mundo({ fila: 'failed' }); await ini(io)
    await V.acompanhar(io, { userId: U, pedidoId: P }); const r = await V.acompanhar(io, { userId: U, pedidoId: P })
    if (r.body.status !== 'falhou' || s.estornos !== 1) throw new Error(JSON.stringify(r.body))
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const fonte = lf(`${PF}/video.ts`)
const mutantes = [
  ['sem checar as fotos pagas', fonte.replace("  if (!s.fotosEntregues) return", "  if (false) return")],
  ['aceita foto de outro pedido', fonte.replace("  if (!new RegExp(`/${i.userId}/adspf-${i.pedidoId}-foto[12]\\\\.(jpg|png|webp)$`).test(i.fotoChave)) {", "  if (false) {")],
  ['manda o vídeo 2 vezes', fonte.replace("  if (s.tentativas.length) return", "  if (false) return")],
  ['sem nova tentativa', fonte.replace('export const VIDEO_TENTATIVAS = 2', 'export const VIDEO_TENTATIVAS = 1')],
  ['sem estorno na falha final', fonte.replace('  const refunded = await estornarPessoaFalando(io, pedidoId)\n', '  const refunded = 55\n')],
  ['entrega a URL da fal', fonte.replace("  if (!nossa) return { status: 200, body: { status: 'renderizando', tentativa: ultima.tentativa } }", "  if (!nossa || nossa) return { status: 200, body: { status: 'pronto', video: p.url } }")],
]
let mortos = 0
for (const [n, src] of mutantes) {
  if (src === fonte) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria({ [`${PF}/video.ts`]: src })).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS vídeo pessoa falando: só depois das fotos pagas e com foto do pedido, 1 envio, juiz real, 1 nova tentativa, estorno integral 1 vez, entrega só vídeo nosso, nunca debita; ${mortos}/${mutantes.length} mutantes mortos`)
