// KINEO-RECREATE-VEREDITO-UMA-VEZ-1411 + KINEO-RECREATE-SOM-VERDADE-1411 — guardião dos itens (a) e (c) do revisor independente (CEO 14/11); o (b), o
// som que o clipe diz ter recebido, é EXECUTADO pela rota de status em scripts/test-recreate-fila-revisao-1411.mjs.
//  (a) com o som ligado, a montagem responde "ainda não" na 1ª passada. EXECUTA a liquidação real (lib/clips/clipFlow settleClip) com a trava e a
//      montagem de mentira: o juiz roda UMA vez; o veredito fica gravado na linha ('swapok_…'); a 2ª passada (no mesmo instante, sem esperar os 2
//      min da reserva) entrega SEM rodar o juiz de novo — mesmo que um 2º juiz dissesse "não trocou"; o evento do veredito é gravado uma vez.
//  (c) o vídeo do cliente sem trilha de som: EXECUTA temTrilhaDeSom e trilhaDeSomPorUrl (HEAD + Range) em MP4 sintéticos com e sem 'soun' (moov no
//      começo e no fim); e confere que, sem trilha, a montagem do som não entra e o clipe fica registrado como mudo.
// Mutantes. Rodar: node scripts/test-recreate-som-verdade-1411.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const FLOW = 'lib/clips/clipFlow.ts', SC = 'lib/recreate/swapCheck.ts', SV = 'lib/recreate/seuVideo.ts', SRV = 'lib/clips/clipServer.ts'
const KLING = 'kling/v4/video-to-video/edit'
const U = '11111111-2222-4333-8444-555555555555'
const NOW = Date.parse('2026-11-14T08:00:00Z')

// ── MP4 sintético: caixas mínimas para o leitor de cabeçalho ─────────────────────────────────────────────────────────
const caixa = (tipo, ...filhos) => { const corpo = Buffer.concat(filhos.map((f) => Buffer.from(f))); const b = Buffer.alloc(8); b.writeUInt32BE(8 + corpo.length, 0); b.write(tipo, 4, 'latin1'); return Buffer.concat([b, corpo]) }
const hdlr = (h) => caixa('hdlr', Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), Buffer.from(h, 'latin1'), Buffer.alloc(12))
const trak = (h) => caixa('trak', caixa('tkhd', Buffer.alloc(84)), caixa('mdia', caixa('mdhd', Buffer.alloc(24)), hdlr(h), caixa('minf')))
const mp4 = ({ som, moovNoFim }) => {
  const moov = caixa('moov', caixa('mvhd', Buffer.alloc(100)), trak('vide'), ...(som ? [trak('soun')] : []))
  const ftyp = caixa('ftyp', Buffer.from('isom0000', 'latin1')), mdat = caixa('mdat', Buffer.alloc(5000))
  return moovNoFim ? Buffer.concat([ftyp, mdat, moov]) : Buffer.concat([ftyp, moov, mdat])
}
const fetchDe = (buf, o = {}) => async (_url, init = {}) => {
  if (o.cai) throw new Error('rede')
  if (init.method === 'HEAD') return { ok: true, status: 200, headers: { get: (h) => (h === 'content-length' ? String(buf.length) : null) } }
  const m = /bytes=(\d+)-(\d+)/.exec(init.headers?.Range ?? '')
  const parte = buf.subarray(Number(m[1]), Number(m[2]) + 1)
  return { ok: true, status: 206, arrayBuffer: async () => parte.buffer.slice(parte.byteOffset, parte.byteOffset + parte.byteLength) }
}

function harness(flow, readSwapApproval, swapApproval, o = {}) {
  const s = { juiz: 0, eventos: [], estornos: 0, persist: 0, row: null }
  const vereditos = o.vereditos ?? ['swapped', 'unchanged']
  const deps = {
    poll: async () => ({ state: 'done', url: 'https://v3.fal.media/files/saida.mp4' }),
    persist: async () => { s.persist++; if (s.persist === 1) { const e = new Error('free clip mark not ready: rendering'); e.name = 'FreeClipNotReady'; throw e } return 'https://ours.org/clips/x.som.mp4' },
    refund: async () => { s.estornos++; return 40 },
    markDone: async () => true, markFailed: async () => true,
    event: async (n) => { s.eventos.push(n) },
    now: () => NOW,
    recreateSwap: {
      applies: () => true,
      busy: (row, now) => typeof row.failure_reason === 'string' && /^swapcheck_(\d{13})/.test(row.failure_reason) && now - Number(row.failure_reason.slice(10, 23)) < 120_000,
      claim: async (row) => { if (s.row.failure_reason) return null; s.row.failure_reason = 'swapcheck_' + String(NOW).padStart(13, '0') + '_x'; return s.row.failure_reason },
      check: async () => ({ result: vereditos[Math.min(s.juiz++, vereditos.length - 1)], reason: 'fixture' }),
      markFailed: async (_id, reason, lock) => { if (s.row.failure_reason !== lock) return false; Object.assign(s.row, { status: 'failed', failure_reason: reason }); return true },
      setRefunded: async () => {},
      markDone: async (_id, url, lock) => { if (s.row.failure_reason !== lock || s.row.status !== 'processing') return false; Object.assign(s.row, { status: 'done', video_url: url, failure_reason: null }); return true },
      record: async (_row, v, outcome) => { s.eventos.push(`check:${v.result}:${outcome.delivered}`) },
      ...(o.semAprovacao ? {} : {
        approved: (row) => (row.status === 'processing' ? readSwapApproval(row.failure_reason) : null),
        approve: async (_id, lock, result) => { if (s.row.failure_reason !== lock) return null; s.row.failure_reason = swapApproval(result, NOW); return s.row.failure_reason },
      }),
    },
  }
  return { s, deps }
}

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const m = loader({}, over)
  const flow = m('lib/clips/clipFlow'), sc = m('lib/recreate/swapCheck'), sv = m('lib/recreate/seuVideo')
  const linha = () => ({ id: U, user_id: U, idempotency_key: 'k', fingerprint: 'f', billing_reference: 'clips-' + U, engine: 'h3', mode: 'image', model: KLING, seconds: 3, aspect: '9:16', prompt: 'p', image_url: 'i', credits: 40, fal_usd: 0.6, status: 'processing', fal_request_id: 'req-1', video_url: null, failure_reason: null, credits_refunded: 0, created_at: new Date(NOW - 3 * 60_000).toISOString() })
  await check('(a) o juiz roda UMA vez: a 1ª passada aprova e grava; a montagem diz "ainda não"; a 2ª passada (mesmo instante) entrega sem juiz', async () => {
    const h = harness(flow, sc.readSwapApproval, sc.swapApproval)
    h.s.row = linha()
    const r1 = await flow.settleClip(h.deps, { ...h.s.row })
    if (r1.status !== 'processing' || h.s.juiz !== 1 || sc.readSwapApproval(h.s.row.failure_reason) !== 'swapped') throw new Error('1ª passada: ' + JSON.stringify([r1.status, h.s.juiz, h.s.row.failure_reason]))
    const r2 = await flow.settleClip(h.deps, { ...h.s.row })
    if (r2.status !== 'done' || h.s.juiz !== 1 || h.s.estornos || h.s.row.status !== 'done') throw new Error('2ª passada: ' + JSON.stringify([r2.status, h.s.juiz, h.s.estornos, h.s.row.status]))
    const checks = h.s.eventos.filter((e) => e.startsWith('check:'))
    if (JSON.stringify(checks) !== '["check:swapped:true"]') throw new Error('eventos do veredito: ' + JSON.stringify(checks))
    if (h.s.eventos.filter((e) => e === 'clip_delivered').length !== 1) throw new Error('entrega não registrada uma vez')
  })
  await check('(a) sem a aprovação gravada (o de antes), o 2º juiz poderia virar o veredito — o cenário do revisor existe', async () => {
    const h = harness(flow, sc.readSwapApproval, sc.swapApproval, { semAprovacao: true })
    h.s.row = linha()
    await flow.settleClip(h.deps, { ...h.s.row })
    h.s.row.failure_reason = 'swapcheck_' + String(NOW - 121_000).padStart(13, '0') + '_x' // a reserva venceu (2 min)
    const claimVelho = h.deps.recreateSwap.claim
    h.deps.recreateSwap.claim = async (row) => { h.s.row.failure_reason = null; return claimVelho(row) }
    const r2 = await flow.settleClip(h.deps, { ...h.s.row })
    if (r2.status !== 'failed' || h.s.juiz !== 2) throw new Error('o cenário do revisor não reproduziu: ' + JSON.stringify([r2.status, h.s.juiz]))
  })
  await check('(a) a marca do veredito: só swapped|unverified, formato fixo, e a reserva velha nunca a confunde', async () => {
    const mk = sc.swapApproval('swapped', NOW)
    if (!mk.startsWith('swapok_') || sc.readSwapApproval(mk) !== 'swapped' || sc.readSwapApproval(sc.swapApproval('unverified', NOW)) !== 'unverified') throw new Error('marca')
    for (const x of [null, '', 'swapok_', 'swapok_123_swapped', 'swapok_' + String(NOW) + '_unchanged', sc.swapCheckLock(NOW, 'x'), 'swap_unchanged']) if (sc.readSwapApproval(x) !== null) throw new Error('leu ' + x)
    if (sc.swapCheckBusy(mk, NOW)) throw new Error('a marca aprovada parece reserva ocupada')
  })
  const srv = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  await check('(a) servidor: aprovado só com a linha em processing; aprovar é condicional à reserva deste ator', async () => {
    if (!srv.includes("approved: (row) => (row.status === 'processing' ? readSwapApproval(row.failure_reason) : null),")) throw new Error('approved')
    if (!srv.includes(".update({ failure_reason: marca }).eq('id', id).eq('status', 'processing').eq('failure_reason', lock).select('id')")) throw new Error('approve')
  })
  await check('(c) temTrilhaDeSom e trilhaDeSomPorUrl: com e sem som, moov no começo e no fim; erro = null', async () => {
    for (const moovNoFim of [false, true]) {
      if ((await sv.trilhaDeSomPorUrl('https://x/v.mp4', fetchDe(mp4({ som: true, moovNoFim })))) !== true) throw new Error('com som, moov no fim=' + moovNoFim)
      if ((await sv.trilhaDeSomPorUrl('https://x/v.mp4', fetchDe(mp4({ som: false, moovNoFim })))) !== false) throw new Error('sem som, moov no fim=' + moovNoFim)
    }
    if ((await sv.trilhaDeSomPorUrl('https://x/v.mp4', fetchDe(mp4({ som: true }), { cai: true }))) !== null) throw new Error('rede caída não deu null')
    if ((await sv.trilhaDeSomPorUrl('https://x/v.mp4', fetchDe(Buffer.from('não é mp4 nenhum, só texto')))) !== null) throw new Error('arquivo ruim não deu null')
  })
  await check('(c)(b) servidor: sem trilha, a montagem do som não entra; caminho sem montagem com som prometido = registrado mudo', async () => {
    if (!srv.includes('const audio = semTrilha ? null : somDaLinha') || !srv.includes('(await trilhaDeSomPorUrl(somDaLinha.url,')) throw new Error('sem trilha')
    if (!srv.includes("if (marked !== null) { if (semTrilha) await mudo('sem_trilha_no_original'); return marked }") || !srv.includes("if (somDaLinha) await mudo(semTrilha ? 'sem_trilha_no_original' : 'sem_montagem')")) throw new Error('registro do mudo')
    if (!srv.includes("x.name === SEU_VIDEO_MUDO_EVENTO || (x.name === 'clip_watermark_failed' && x.metadata?.stage !== 'profile')")) throw new Error('leitura do mudo')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const flowSrc = lf(FLOW), sc = lf(SC), sv = lf(SV), srv = lf(SRV)
const mutantes = [
  ['sem gravar a aprovação', { [FLOW]: flowSrc.replace("      if (swap.approve && (swapVerdict.result === 'swapped' || swapVerdict.result === 'unverified')) {", '      if (false) {') }],
  ['aprovação ignorada (o juiz roda de novo)', { [FLOW]: flowSrc.replace('    const jaAprovado = swap?.approved ? swap.approved(row) : null', '    const jaAprovado = null as null') }],
  ['veredito gravado duas vezes', { [FLOW]: flowSrc.replace('if (swap && swapVerdict && !swapRecorded) await swap.record(', 'if (swap && swapVerdict) await swap.record(') }],
  ['marca aceita qualquer resultado', { [SC]: sc.replace('/^swapok_\\d{13}_(swapped|unverified)$/', '/^swapok_\\d{13}_(\\w+)$/') }],
  ['trilha de som sempre "tem"', { [SV]: sv.replace("      for (const hdlr of caixasDe(moov, mdia.ini, mdia.fim)) if (hdlr.t === 'hdlr' && tipos(moov, hdlr.ini + 8) === 'soun') return true", '      return true') }],
  ['sem trilha ainda vai à montagem', { [SRV]: srv.replace('  const audio = semTrilha ? null : somDaLinha', '  const audio = somDaLinha') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS veredito uma vez e som de verdade: o juiz roda uma vez e a montagem não reabre a troca (sem esperar 2 min); a marca é estrita; original sem trilha de som não vai à montagem e fica registrado mudo; ${mortos}/${mutantes.length} mutantes mortos`)
