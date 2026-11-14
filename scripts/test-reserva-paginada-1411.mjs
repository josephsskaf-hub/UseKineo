// KINEO-RESERVA-PAGINADA-1411 — guardião da leitura PAGINADA dos claims de reserva [CEO 14/11 12:02, P0].
// O caso: a conta do fundador chegou a 1000 claims na vida (compose, cinematic, avatar) e inspectActiveComposeCreditHolds, que lia UMA página de
// 1000 e recusava ao vir 1000 linhas, passou a recusar TODO filme ("Your credit reservation could not be verified. Nothing was submitted.").
// EXECUTA o módulo real (lib/credits/composeHold.ts, com os verificadores reais e claims assinados de verdade) num banco de mentira que se comporta
// como o PostgREST (ordem created_at desc, id desc; range; no máximo max-rows por resposta):
//  1. 1000, 1001 e 2500 claims antigos liquidados + o claim atual: passa, enxerga o atual, reserva = só a atual.
//  2. uma reserva ATIVA na 2ª página (e na 3ª) é CONTADA (quem lê só a 1ª página erra a soma para menos: risco de dinheiro).
//  3. erro do banco na 2ª página: recusa. Teto de páginas estourado (mais de 20 mil claims): recusa como antes. 19.999 claims: passa.
//  4. o servidor devolvendo MENOS que 1000 por resposta (max-rows 500): ainda lê tudo (só para na página VAZIA).
//  5. claim novo gravado durante a leitura (a lista anda uma casa): nenhuma reserva some, nenhuma conta duas vezes.
// KINEO-RESERVA-POR-CHAVE-1411 [revisor da CEO 14/11 12:16] — a página seguinte vem pela ÚLTIMA CHAVE LIDA (created_at e id):
//  7. claim APAGADO entre as páginas (o caso do revisor): a reserva de 300 da posição 1001 é contada (410, nunca 220); cada linha lida UMA vez.
//  8. empate de created_at na borda da página (21 linhas com a mesma hora, uma reserva entre elas): nenhuma pulada nem relida.
//  9. chave ilegível na última linha (created_at nulo ou com aspas): recusa, nunca recomeça nem para no meio.
// Mutantes no fim. Rodar: node scripts/test-reserva-paginada-1411.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const HOLD = 'lib/credits/composeHold.ts'
const U = '11111111-2222-4333-8444-555555555555'
const SECRET = 'segredo-de-teste'
const NOW = Date.now()
const iso = (msAtras) => new Date(NOW - msAtras).toISOString()

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const m = loader({ '@supabase/supabase-js': { createClient: () => ({}) }, 'server-only': {} }, over)
  const hold = m('lib/credits/composeHold'), cc = m('lib/composeClaim')
  const uuid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`

  // Claim de compose assinado de verdade (o verificador real confere a assinatura).
  const compose = (gen, o = {}) => {
    const id = cc.composeClaimId(U, gen)
    const status = o.status ?? 'pending', quality = 'standard', cost = o.cost ?? 110, renderId = status === 'done' ? 'render-' + gen : undefined
    const authority = cc.signComposeClaim(SECRET, { claimId: id, userId: U, generationId: gen, status, ...(renderId ? { renderId } : {}), quality, cost })
    return { id, name: cc.COMPOSE_CLAIM_EVENT, user_id: U, path: cc.COMPOSE_CLAIM_PATH, session_id: gen, created_at: o.created_at ?? iso(60_000),
      metadata: { credit_hold: true, status, generation_id: gen, quality, cost, ...(renderId ? { render_id: renderId } : {}), authority, ...(o.settled ? { credit_hold_settled_at: iso(1000) } : {}) } }
  }
  // Claim antigo já liquidado (o laço pula antes de verificar): só enche páginas.
  const velho = (i) => ({ id: uuid(i), name: cc.COMPOSE_CLAIM_EVENT, user_id: U, path: cc.COMPOSE_CLAIM_PATH, session_id: 'velho-' + i, created_at: iso(3 * 3600_000 + i * 1000), metadata: { credit_hold: true, status: 'done', credit_hold_settled_at: iso(3600_000) } })

  // Banco de mentira no jeito do PostgREST: filtros, ordem (created_at desc, id desc), range e o teto de linhas por resposta (max-rows).
  function banco(rows, o = {}) {
    const st = { consultas: 0, rows: [...rows], lidas: 0, ids: [] }
    const from = (tabela) => {
      const f = []; let faixa = null, chaveRuim = false
      const b = {
        select() { return b }, order() { return b },
        eq(c, v) { f.push((r) => r[c] === v); return b },
        in(c, vs) { f.push((r) => vs.includes(r[c])); return b },
        range(a, z) { faixa = [a, z]; return b },
        or(e) { const m = /^created_at\.lt\."([^"]+)",and\(created_at\.eq\."([^"]+)",id\.lt\."([^"]+)"\)$/.exec(e); if (!m || m[1] !== m[2]) { chaveRuim = true; return b } f.push((r) => r.created_at < m[1] || (r.created_at === m[1] && r.id < m[3])); return b },
        limit(n) { faixa = [0, n - 1]; return b },
        then(ok, ko) {
          if (tabela !== 'events') return Promise.resolve({ data: [], error: null }).then(ok, ko)
          const k = st.consultas++
          if (o.antes) o.antes(k, st)
          if (o.erroNa === k) return Promise.resolve({ data: null, error: { message: 'canceling statement due to statement timeout' } }).then(ok, ko)
          if (chaveRuim) return Promise.resolve({ data: null, error: { message: '"failed to parse logic tree"' } }).then(ok, ko)
          const todos = st.rows.filter((r) => f.every((x) => x(r))).sort((a, z) => (a.created_at < z.created_at ? 1 : a.created_at > z.created_at ? -1 : a.id < z.id ? 1 : a.id > z.id ? -1 : 0))
          const [a, z] = faixa ?? [0, Infinity]
          const lote = todos.slice(a, Math.min(z + 1, a + (o.maxRows ?? 1000)))
          st.lidas += lote.length; st.ids.push(...lote.map((r) => r.id))
          const saida = lote.map((r) => ({ ...r }))
          if (o.depois) o.depois(k, saida)
          return Promise.resolve({ data: saida, error: null }).then(ok, ko)
        },
      }
      return b
    }
    return { st, db: { from } }
  }
  const auditar = (b, atual) => hold.inspectActiveComposeCreditHolds({ db: b.db, secret: SECRET, userId: U, currentClaimId: atual.id })

  for (const n of [1000, 1001, 2500]) {
    await check(`1 ${n} claims antigos liquidados + o atual: passa, enxerga o atual, reserva só a atual`, async () => {
      const atual = compose('atual-' + n)
      const b = banco([atual, ...Array.from({ length: n }, (_, i) => velho(i))])
      const r = await auditar(b, atual)
      if (!r.ok || !r.currentSeen || r.totalHeld !== 110) throw new Error(JSON.stringify(r))
      if (b.st.lidas !== n + 1 || new Set(b.st.ids).size !== n + 1) throw new Error(`leu ${b.st.lidas} linhas (${new Set(b.st.ids).size} distintas) de ${n + 1}`)
    })
  }
  await check('2 reserva ATIVA na 2ª e na 3ª página é CONTADA (110 + 110 + 110)', async () => {
    const atual = compose('atual-ativas')
    const na2 = compose('ativa-pagina-2', { status: 'done', created_at: iso(3 * 3600_000 + 1500 * 1000 + 1) })
    const na3 = compose('ativa-pagina-3', { status: 'done', created_at: iso(3 * 3600_000 + 2200 * 1000 + 1) })
    const b = banco([atual, na2, na3, ...Array.from({ length: 2500 }, (_, i) => velho(i))])
    const r = await auditar(b, atual)
    if (!r.ok || !r.currentSeen || r.totalHeld !== 330) throw new Error(JSON.stringify(r))
  })
  await check('3 erro do banco na 2ª página: recusa (nada de soma parcial)', async () => {
    const atual = compose('atual-erro')
    const r = await auditar(banco([atual, ...Array.from({ length: 1500 }, (_, i) => velho(i))], { erroNa: 1 }), atual)
    if (r.ok) throw new Error('passou com erro na 2ª página')
  })
  await check('3 teto de páginas: 20.001 claims recusa como antes; 19.999 passam', async () => {
    const atual = compose('atual-teto')
    const muitos = Array.from({ length: 20_001 }, (_, i) => velho(i))
    const r = await auditar(banco([atual, ...muitos]), atual)
    if (r.ok || !/truncated/.test(r.error)) throw new Error('20.001: ' + JSON.stringify(r))
    const r2 = await auditar(banco([atual, ...muitos.slice(0, 19_998)]), atual)
    if (!r2.ok || !r2.currentSeen) throw new Error('19.999: ' + JSON.stringify(r2))
    const r3 = await auditar(banco([atual, ...muitos.slice(0, 19_999)]), atual) // exatamente 20 páginas cheias e nada depois
    if (!r3.ok || !r3.currentSeen) throw new Error('20.000: ' + JSON.stringify(r3))
    if (hold.HOLD_SCAN_MAX_PAGES !== 20 || hold.HOLD_SCAN_PAGE !== 1000) throw new Error('teto e página')
  })
  await check('4 o servidor devolve no máximo 500 por resposta: ainda lê tudo e conta a reserva da posição 1500', async () => {
    const atual = compose('atual-500')
    const ativa = compose('ativa-500', { status: 'done', created_at: iso(3 * 3600_000 + 1500 * 1000 + 1) })
    const r = await auditar(banco([atual, ativa, ...Array.from({ length: 2500 }, (_, i) => velho(i))], { maxRows: 500 }), atual)
    if (!r.ok || r.totalHeld !== 220) throw new Error(JSON.stringify(r))
  })
  await check('5 claim novo gravado entre uma página e outra (a lista anda): a reserva da borda conta uma vez, nenhuma some', async () => {
    const atual = compose('atual-borda')
    const borda = compose('ativa-borda', { status: 'done', created_at: iso(3 * 3600_000 + 998 * 1000 + 500) }) // vira a 1000ª linha (última da 1ª página)
    const b = banco([atual, borda, ...Array.from({ length: 1500 }, (_, i) => velho(i))], { antes: (k, st) => { if (k === 1) st.rows.push(velho(900_000 + k)) && (st.rows[st.rows.length - 1].created_at = iso(0)) } })
    const r = await auditar(b, atual)
    if (!r.ok || !r.currentSeen || r.totalHeld !== 220) throw new Error(JSON.stringify(r))
  })
  await check('6 a leitura usa a MESMA ordem e a ÚLTIMA CHAVE LIDA (não a posição; não mais .limit(1000) com recusa)', async () => {
    const s = (over[HOLD] ?? lf(HOLD)).replace(/\/\/[^\n]*/g, '')
    for (const x of [".order('created_at', { ascending: false })\n      .order('id', { ascending: false })\n      .limit(HOLD_SCAN_PAGE)", 'if (!lote || lote.length === 0) break', 'consulta = consulta.or(']) if (!s.includes(x)) throw new Error('falta: ' + x)
    if (/\.limit\(1000\)|\.range\(/.test(s)) throw new Error('voltou o .limit(1000) ou a posição (range)')
  })
  await check('7 claim APAGADO entre a 1ª e a 2ª página (revisor): a reserva de 300 da posição 1001 conta (atual 110 + o pendente já lido na 1ª página 110 + 300 = 520; pela posição seria 220); cada linha lida uma vez', async () => {
    const atual = compose('atual-apagado')
    const recente = compose('pendente-apagado', { created_at: iso(30_000) })
    const alvo = compose('ativa-1001', { status: 'done', cost: 300, created_at: iso(3 * 3600_000 + 997 * 1000 + 500) })
    const velhos = Array.from({ length: 1500 }, (_, i) => velho(i))
    const b = banco([atual, recente, alvo, ...velhos], { antes: (k, st) => { if (k === 1) st.rows = st.rows.filter((r) => r !== recente) } })
    const r = await auditar(b, atual)
    if (!r.ok || !r.currentSeen || r.totalHeld !== 520) throw new Error('soma: ' + JSON.stringify(r))
    if (new Set(b.st.ids).size !== b.st.ids.length) throw new Error('linha lida duas vezes')
  })
  await check('8 empate de created_at na borda da página: 21 linhas com a MESMA hora (uma reserva entre elas) — nenhuma pulada nem relida', async () => {
    const atual = compose('atual-empate')
    const hora = iso(3 * 3600_000 + 995 * 1000 + 1)
    const velhos = Array.from({ length: 1500 }, (_, i) => velho(i))
    for (let i = 990; i <= 1009; i++) velhos[i] = { ...velhos[i], created_at: hora }
    const ativa = compose('ativa-empate', { status: 'done', created_at: hora })
    const b = banco([atual, ativa, ...velhos])
    const r = await auditar(b, atual)
    if (!r.ok || r.totalHeld !== 220 || b.st.lidas !== 1502 || new Set(b.st.ids).size !== 1502) throw new Error(JSON.stringify([r, b.st.lidas, new Set(b.st.ids).size]))
  })
  await check('9 chave ilegível na última linha da página (created_at nulo; aspas no id): recusa, nunca recomeça nem para no meio', async () => {
    const atual = compose('atual-chave')
    for (const estraga of [(r) => { r.created_at = null }, (r) => { r.id = 'x",id.gt."0' }, (r) => { r.created_at = '2026-11-14T10:00:00+00:00",id.gt."0' }]) {
      const velhos = Array.from({ length: 1500 }, (_, i) => velho(i))
      const r = await auditar(banco([atual, ...velhos], { depois: (k, lote) => { if (k === 0) estraga(lote[lote.length - 1]) } }), atual) // a última linha da 1ª página, como veio do banco
      if (r.ok || !/cursor unreadable/.test(r.error)) throw new Error(JSON.stringify(r))
    }
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const src = lf(HOLD)
const troca = (a, b) => { if (src.split(a).length !== 2) { console.error('âncora do mutante: ' + a.slice(0, 80)); process.exit(1) } return { [HOLD]: src.replace(a, () => b) } }
const mutantes = [
  ['lê só a 1ª página', troca('    cursor = { createdAt, id }\n  }\n', '    cursor = { createdAt, id }\n    break\n  }\n')],
  ['recusa ao vir 1000 linhas (o defeito de 14/11)', troca('    if (!lote || lote.length === 0) break\n', "    if (!lote || lote.length === 0) break\n    if (pagina === 0 && lote.length >= 1000) return { ok: false, error: 'credit hold scan truncated; refusing provider submission' }\n")],
  ['para na página curta (perde linhas com max-rows menor)', troca('    cursor = { createdAt, id }\n', '    cursor = { createdAt, id }\n    if (linhas.length < HOLD_SCAN_PAGE) break\n')],
  ['chave sem desempate pelo id (pula empate na borda)', troca("consulta.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)", "consulta.lt('created_at', cursor.createdAt)")],
  ['chave com lte (relê a borda)', troca("consulta.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)", "consulta.lte('created_at', cursor.createdAt)")],
  ['página pela posição (o defeito do revisor: apagar no meio pula a 1001)', troca("    if (cursor) consulta = consulta.or(`created_at.lt.\"${cursor.createdAt}\",and(created_at.eq.\"${cursor.createdAt}\",id.lt.\"${cursor.id}\")`)\n    const { data: lote, error } = await consulta\n      .order('created_at', { ascending: false })\n      .order('id', { ascending: false })\n      .limit(HOLD_SCAN_PAGE)\n", "    const lidas = data.length\n    const { data: lote, error } = await consulta\n      .order('created_at', { ascending: false })\n      .order('id', { ascending: false })\n      .range(lidas, lidas + HOLD_SCAN_PAGE - 1)\n")],
  ['chave sem conferência', troca("    if (!HOLD_SCAN_CHAVE.test(createdAt) || !HOLD_SCAN_CHAVE.test(id)) return { ok: false, error: 'credit hold scan cursor unreadable; refusing provider submission' }\n", '')],
  ['ignora erro da página', troca('    if (error) return { ok: false, error: error.message }\n    if (!lote', '    if (error) break\n    if (!lote')],
  ['sem teto de páginas', troca('export const HOLD_SCAN_MAX_PAGES = 20', 'export const HOLD_SCAN_MAX_PAGES = 1_000_000')],
  ['teto conta a página vazia (recusa 20.000)', troca('    if (pagina >= HOLD_SCAN_MAX_PAGES) return', '    if (pagina >= HOLD_SCAN_MAX_PAGES - 1 && lote.length === HOLD_SCAN_PAGE) return')],
  ['teto baixo (2 páginas)', troca('export const HOLD_SCAN_MAX_PAGES = 20', 'export const HOLD_SCAN_MAX_PAGES = 2')],
  ['ordem trocada (mais antigas primeiro)', troca(".order('created_at', { ascending: false })\n      .order('id', { ascending: false })\n      .limit(", ".order('created_at', { ascending: true })\n      .order('id', { ascending: true })\n      .limit(")],
]
let mortos = 0
for (const [n, over] of mutantes) { if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n) }
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS reserva paginada: 1000/1001/2500 claims passam e enxergam o atual; reserva ativa na 2ª e 3ª página contada; erro na 2ª página recusa; teto de 20 páginas recusa; max-rows 500 lê tudo; lista que anda não perde nem duplica; claim apagado entre páginas não pula a 1001; empate na borda lido uma vez; chave ilegível recusa; ${mortos}/${mutantes.length} mutantes mortos`)
