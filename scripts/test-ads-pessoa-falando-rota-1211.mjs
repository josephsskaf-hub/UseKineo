// KINEO-ADS-PESSOA-FALANDO-PLATAFORMA-1211 — guardião da parte da plataforma do anúncio "pessoa falando" (spec §3).
// EXECUTA a rota de verdade (app/api/ads/pessoa-falando/route.ts) e o módulo puro, com dublês só para sessão, eventos e next/server.
// Prova: (A) conta de fora = 404 sem ler o corpo; casa passa; (B) dry_run com os 3 aprovados (Halo, Veil, Orra) devolve os 3 JSON nos
// endpoints certos, charged:false, sem tocar a rede; (C) pedido pago com preço pendente = 409 ANTES de qualquer débito; (D) reserva
// e estorno pela mesma chave, idempotentes; sem preço, não reserva. Mutantes no fim. Rodar: node scripts/test-ads-pessoa-falando-rota-1211.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const PF = 'lib/ads/pessoaFalando'
const ROTA = 'app/api/ads/pessoa-falando/route.ts'

function mundo(over = {}) {
  const ctx = { user: { id: 'u-casa', email: 'casa@example.test' }, casa: true, eventos: [], redes: 0, corpoLido: 0 }
  const cache = new Map()
  const stubs = {
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, body }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: ctx.user } }) } }) },
    '@/lib/ads/access': { isAdsInternalEmail: () => ctx.casa },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { ctx.eventos.push(e); return true } },
  }
  function load(rel) {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? lf(rel)
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const req = (id) => {
      if (stubs[id]) return stubs[id]
      const alvo = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? path.posix.join(path.posix.dirname(rel), id) : null
      if (!alvo) throw new Error('import inesperado: ' + id + ' em ' + rel)
      const file = [alvo + '.ts', alvo + '.tsx', alvo].find((p) => fs.existsSync(p))
      if (!file || !file.startsWith(PF)) throw new Error('import inesperado (fora de lib/ads/pessoaFalando): ' + id)
      return load(file)
    }
    const fetchProibido = () => { ctx.redes++; throw new Error('rede proibida no teste') }
    new Function('require', 'module', 'exports', 'fetch', js)(req, mod, mod.exports, fetchProibido)
    return mod.exports
  }
  ctx.rota = load(ROTA)
  ctx.plat = load(`${PF}/plataforma.ts`)
  ctx.post = async (body) => ctx.rota.POST({ json: async () => { ctx.corpoLido++; return body } })
  return ctx
}

// As entradas dos 3 aprovados (mesmas do guardião da Div. 2, scripts/test-ads-pessoa-falando-1111.mjs).
const FOTO = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/x/produto.jpg'
const APROVADOS = [
  { apresentador: 'sofia', formato: 'car_selfie', produto: 'Halo insulated tumbler, matte sage-green steel with a clear lid', frase: 'Ice stays from 7 am to the evening, fits the car cup holder.',
    roteiro: { fala: 'Okay so this cup has been in my car all day and look, the ice from seven this morning is still here, it fits my cup holder and it never sweats.', gestos: [{ palavra: 'look', gesto: 'tilts the cup toward the camera' }] } },
  { apresentador: 'amara', formato: 'get_ready', produto: 'Veil tinted SPF moisturizer, cream tube', frase: 'A tinted SPF that replaces foundation; one pump covers the face.',
    roteiro: { fala: 'This is my whole base now, one pump of this tinted SPF and I am done, it evens everything out, it feels like nothing on my skin and I skip foundation.', gestos: [{ palavra: 'pump', gesto: 'squeezes the tube onto her fingers' }] } },
  { apresentador: 'rahul', formato: 'street_interview', produto: 'Orra Buds wireless earbuds, matte white case', frase: 'Earbuds for $40 that block out city noise, battery lasts all day.',
    roteiro: { fala: 'Honestly these are the earbuds I use every day on the train, they block out the city noise and the battery lasts all day, and they were forty dollars.', gestos: [{ palavra: 'these', gesto: 'holds the case up to the camera' }] } },
]

async function bateria(over = {}) {
  const p = []
  const check = async (nome, fn) => { try { await fn() } catch (e) { p.push(`${nome}: ${e.message}`) } }
  await check('(A) conta de fora = 404 sem ler o corpo', async () => {
    const c = mundo(over); c.casa = false
    const r = await c.post({ ...APROVADOS[0], foto_do_produto: FOTO, dry_run: true })
    if (r.status !== 404) throw new Error('status ' + r.status)
    if (c.corpoLido !== 0) throw new Error('leu o corpo antes do portão')
  })
  await check('(A) sem sessão = 401', async () => { const c = mundo(over); c.user = null; const r = await c.post({}); if (r.status !== 401) throw new Error('status ' + r.status) })
  await check('(B) dry-run dos 3 aprovados', async () => {
    for (const a of APROVADOS) {
      const c = mundo(over)
      const r = await c.post({ ...a, foto_do_produto: FOTO, dry_run: true })
      if (r.status !== 200) throw new Error(a.produto + ' status ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 120))
      const b = r.body
      if (b.charged !== false || b.dry_run !== true) throw new Error('dry-run cobrou ou não marcou')
      if (b.foto_chave?.endpoint !== 'fal-ai/nano-banana-pro/edit') throw new Error('foto-chave fora do endpoint aprovado')
      if (b.video?.endpoint !== 'bytedance/seedance-2.0/image-to-video') throw new Error('vídeo fora do endpoint aprovado')
      if (!String(JSON.stringify(b.video.input)).includes(a.roteiro.fala.slice(0, 40))) throw new Error('a fala inteira não vai ao vídeo')
      if (b.credits_status !== 'PENDENTE_DECISAO_DO_DONO') throw new Error('o preço pendente não aparece')
      if (c.redes !== 0) throw new Error('dry-run tocou a rede')
      if (!c.eventos.some((e) => e.name === 'ads_pf_dry_run')) throw new Error('sem evento do dry-run')
    }
  })
  await check('(B) dry-run sem roteiro = 400 (não chama o escritor)', async () => {
    const c = mundo(over); const { roteiro, ...sem } = APROVADOS[0]
    const r = await c.post({ ...sem, foto_do_produto: FOTO, dry_run: true }); if (r.status !== 400) throw new Error('status ' + r.status)
  })
  await check('(B) entrada ruim = 400', async () => {
    for (const ruim of [{ ...APROVADOS[0], apresentador: 'jade' }, { ...APROVADOS[0], formato: 'nope' }, { ...APROVADOS[0], foto_do_produto: 'http://x.example/a.jpg' }]) {
      const c = mundo(over); const r = await c.post({ ...ruim, foto_do_produto: ruim.foto_do_produto ?? FOTO, dry_run: true })
      if (r.status !== 400) throw new Error('aceitou ' + JSON.stringify(ruim).slice(0, 60))
    }
  })
  await check('(C) pedido pago com preço pendente = 409, nada cobrado', async () => {
    const c = mundo(over); const r = await c.post({ ...APROVADOS[0], foto_do_produto: FOTO })
    if (r.status !== 409 || r.body.charged !== false || r.body.reason !== 'price_pending') throw new Error('status ' + r.status + ' ' + r.body.reason)
  })
  await check('(D) reserva e estorno', async () => {
    const c = mundo(over); const P = c.plat
    let saldo = 100; const razao = new Map()
    const io = {
      debitar: async ({ chave, creditos }) => { if (razao.has(chave)) return 'reserved'; if (saldo < creditos) return 'insufficient'; saldo -= creditos; razao.set(chave, { creditos, estornado: false }); return 'reserved' },
      estornar: async (chave) => { const r = razao.get(chave); if (!r || r.estornado) return 0; r.estornado = true; saldo += r.creditos; return r.creditos },
    }
    if (await P.reservarPessoaFalando(io, { userId: 'u', pedidoId: 'p1' }) !== 'price_pending') throw new Error('reservou sem preço')
    if (saldo !== 100) throw new Error('debitou sem preço')
    if (await P.reservarPessoaFalando(io, { userId: 'u', pedidoId: 'p1', creditos: 40 }) !== 'reserved') throw new Error('não reservou')
    await P.reservarPessoaFalando(io, { userId: 'u', pedidoId: 'p1', creditos: 40 })
    if (saldo !== 60) throw new Error('cobrou 2 vezes: saldo ' + saldo)
    if (await P.estornarPessoaFalando(io, 'p1') !== 40 || saldo !== 100) throw new Error('estorno não integral')
    if (await P.estornarPessoaFalando(io, 'p1') !== 0 || saldo !== 100) throw new Error('estornou 2 vezes')
    if (P.chaveDeCobranca('p1') !== 'adspf-p1') throw new Error('chave mudou')
  })
  return p
}

const real = await bateria()
const fonteRota = lf(ROTA)
if (/queue\.fal\.run|fal\.run|fal\.subscribe|api\.openai\.com/.test(fonteRota)) real.push('a rota chama fornecedor direto')
if (fonteRota.indexOf('pessoaFalandoAcesso(') > fonteRota.indexOf('req.json(')) real.push('o portão vem depois de ler o corpo')
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }

const plat = lf(`${PF}/plataforma.ts`)
const mutantes = [
  ['portão aberto para todos', { [`${PF}/plataforma.ts`]: plat.replace('return pessoaFalandoLigado(modo, contaDaCasa)', 'return true') }],
  ['pedido pago sem checar o preço', { [ROTA]: fonteRota.replace('if (ADS_PESSOA_FALANDO_CREDITS === null) {', 'if (false) {') }],
  ['reserva sem preço decidido', { [`${PF}/plataforma.ts`]: plat.replace("if (creditos === null || !Number.isInteger(creditos) || creditos <= 0) return 'price_pending'", "if (creditos === null) return io.debitar({ userId: i.userId, chave: chaveDeCobranca(i.pedidoId), creditos: 1 })") }],
  ['foto http aceita', { [`${PF}/plataforma.ts`]: plat.replace('const URL_HTTPS = /^https:', 'const URL_HTTPS = /^https?:') }],
  ['dry-run sem roteiro chama o escritor', { [`${PF}/plataforma.ts`]: plat.replace("if (dryRun && !roteiro) return { ok: false, erro: 'dry_run_needs_the_script' }", '') }],
]
let mortos = 0
for (const [nome, over] of mutantes) {
  const k = Object.keys(over)[0]
  if (over[k] === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + nome); process.exit(1) }
  const f = await bateria(over)
  if (f.length) mortos++; else console.error('MUTANTE VIVO: ' + nome)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS pessoa falando (plataforma): 404 fora, dry-run dos 3 aprovados sem rede e sem cobrar, pago recusado antes do débito, reserva/estorno idempotentes; ${mortos}/${mutantes.length} mutantes mortos`)
