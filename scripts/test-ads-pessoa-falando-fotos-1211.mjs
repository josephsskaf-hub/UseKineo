// KINEO-ADS-PESSOA-FALANDO-FOTOS-1211 — guardião do passo PAGO das fotos-chave (lib/ads/pessoaFalando/fotosChave.ts), executado com io falso
// (livro-razão que imita o débito idempotente por chave e o estorno; fal e bucket de mentira). Prova: reserva ANTES da fal; sem saldo nada vai à
// fal; falha da fal ou da cópia = estorno integral + charged:false; sucesso = 2 fotos NOSSAS (nunca a URL da fal), 55 créditos, eventos; duplo
// clique e pedido estornado param antes de cobrar (o débito idempotente daria fotos de graça). Mutantes. Rodar: node scripts/test-ads-pessoa-falando-fotos-1211.mjs
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
    new Function('require', 'module', 'exports', js)((id) => {
      if (!id.startsWith('.')) throw new Error('import inesperado: ' + id)
      return load(path.posix.join(path.posix.dirname(rel), id) + '.ts')
    }, mod, mod.exports)
    return mod.exports
  }
  return load(`${PF}/fotosChave.ts`)
}

const ENTRADA = { apresentadorId: 'sofia', formatoId: 'car_selfie', produto: 'Halo insulated tumbler', fotoDoProduto: 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/u/halo.jpg', frase: 'Ice stays all day.' }
function io(opts = {}) {
  const s = { saldo: opts.saldo ?? 100, razao: new Map(), fal: 0, eventos: [], estados: opts.estados ?? new Map() }
  return { s, io: {
    debitar: async ({ chave, creditos }) => { if (s.razao.has(chave)) return 'reserved'; if (s.saldo < creditos) return 'insufficient'; s.saldo -= creditos; s.razao.set(chave, { creditos, estornado: false }); return 'reserved' },
    estornar: async (chave) => { const r = s.razao.get(chave); if (!r || r.estornado) return 0; r.estornado = true; s.saldo += r.creditos; return r.creditos },
    gerar: async (endpoint, input) => { s.fal++; s.ultimo = { endpoint, input }; if (opts.falFalha) return []; return ['https://fal.media/a.jpg', 'https://fal.media/b.jpg'] },
    guardar: async ({ idx }) => (opts.copiaFalha && idx === 1 ? null : `https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/u/adspf-p-foto${idx + 1}.jpg`),
    evento: async (name, metadata) => { s.eventos.push({ name, metadata }) },
    estado: async ({ pedidoId }) => s.estados.get(pedidoId) ?? 'novo',
    fotos: async () => ['https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/u/adspf-p-foto1.jpg', 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/u/adspf-p-foto2.jpg'],
  } }
}

async function bateria(over = {}) {
  const F = carregar(over)
  const p = []
  const check = async (nome, fn) => { try { await fn() } catch (e) { p.push(nome + ': ' + e.message) } }
  const P = '11111111-2222-4333-8444-555555555555'
  await check('sucesso', async () => {
    const { s, io: x } = io()
    const r = await F.gerarFotosChave(x, { userId: 'u', pedidoId: P, entrada: ENTRADA })
    if (r.status !== 200 || r.body.charged !== true || r.body.creditos !== 55) throw new Error('status ' + r.status)
    if (r.body.fotos.some((u) => u.includes('fal.media'))) throw new Error('entregou a URL da fal')
    if (s.saldo !== 45) throw new Error('saldo ' + s.saldo)
    if (s.ultimo.endpoint !== 'fal-ai/nano-banana-pro/edit' || s.ultimo.input.num_images !== 2) throw new Error('pedido à fal fora do aprovado')
    const nomes = s.eventos.map((e) => e.name)
    if (!nomes.includes('ads_pf_credits_reserved') || !nomes.includes('ads_pf_keyframes_ready')) throw new Error('eventos ' + nomes)
    if (nomes.indexOf('ads_pf_credits_reserved') > nomes.indexOf('ads_pf_keyframes_ready')) throw new Error('reservou depois')
  })
  await check('sem saldo: nada vai à fal', async () => {
    const { s, io: x } = io({ saldo: 20 })
    const r = await F.gerarFotosChave(x, { userId: 'u', pedidoId: P, entrada: ENTRADA })
    if (r.status !== 402 || r.body.charged !== false || s.fal !== 0) throw new Error('status ' + r.status + ' fal ' + s.fal)
  })
  await check('fal falha: estorno integral', async () => {
    const { s, io: x } = io({ falFalha: true })
    const r = await F.gerarFotosChave(x, { userId: 'u', pedidoId: P, entrada: ENTRADA })
    if (r.status !== 502 || r.body.charged !== false || s.saldo !== 100 || r.body.refunded !== 55) throw new Error('saldo ' + s.saldo)
    if (!s.eventos.some((e) => e.name === 'ads_pf_refunded')) throw new Error('sem evento de estorno')
  })
  await check('cópia falha: estorno integral, nada entregue', async () => {
    const { s, io: x } = io({ copiaFalha: true })
    const r = await F.gerarFotosChave(x, { userId: 'u', pedidoId: P, entrada: ENTRADA })
    if (r.status !== 502 || s.saldo !== 100) throw new Error('status ' + r.status + ' saldo ' + s.saldo)
  })
  await check('duplo clique e pedido estornado param antes de cobrar', async () => {
    { // replay do pedido já pago: as MESMAS fotos, 200, sem cobrar e sem fal
      const { s, io: x } = io({ estados: new Map([[P, 'entregue']]) })
      const r = await F.gerarFotosChave(x, { userId: 'u', pedidoId: P, entrada: ENTRADA })
      if (r.status !== 200 || r.body.charged !== false || r.body.fotos.length !== 2 || s.fal !== 0 || s.saldo !== 100) throw new Error('replay ' + r.status)
    }
    for (const est of ['em_andamento', 'estornado']) {
      const { s, io: x } = io({ estados: new Map([[P, est]]) })
      const r = await F.gerarFotosChave(x, { userId: 'u', pedidoId: P, entrada: ENTRADA })
      if (r.status !== 409 || s.fal !== 0 || s.saldo !== 100) throw new Error(est + ' status ' + r.status)
    }
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const fonte = lf(`${PF}/fotosChave.ts`)
const mutantes = [
  ['fal antes da reserva', fonte.replace('  const reserva = await reservarPessoaFalando(io, { userId: i.userId, pedidoId: i.pedidoId })\n', "  try { const pf = fotoChave(i.entrada); await io.gerar(pf.endpoint, pf.input) } catch {}\n  const reserva = await reservarPessoaFalando(io, { userId: i.userId, pedidoId: i.pedidoId })\n")],
  ['sem estorno na falha', fonte.replace('    const refunded = await estornarPessoaFalando(io, i.pedidoId)\n', '    const refunded = 0\n')],
  ['entrega a URL da fal', fonte.replace("    if (!u) return falha('keyframes_copy_failed')\n    nossas.push(u)", "    nossas.push(u ?? urls[idx])")],
  ['ignora o estado do pedido', fonte.replace("  if (estado !== 'novo') return", "  if (false) return")],
]
let mortos = 0
for (const [nome, src] of mutantes) {
  if (src === fonte) { console.error('MUTANTE SEM EFEITO: ' + nome); process.exit(1) }
  if ((await bateria({ [`${PF}/fotosChave.ts`]: src })).length) mortos++; else console.error('MUTANTE VIVO: ' + nome)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS fotos-chave pagas: reserva antes da fal, sem saldo nada vai à fal, falha = estorno integral, entrega só fotos nossas, duplo clique/estornado param; ${mortos}/${mutantes.length} mutantes mortos`)
