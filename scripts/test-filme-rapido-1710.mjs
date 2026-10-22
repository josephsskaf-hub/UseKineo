// KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"] — guardião da entrega "filmes, Ads e clipes
// mais rápidos" (docs/AUDITORIA-VELOCIDADE-2026-10-17.md, parte A e "Recomendado para segunda").
//
// EXECUTA o código real (transpilado em memória, imports trocados por falsos; sem rede, sem banco, sem fornecedor, sem
// custo) e prova:
//   A  "pronto" na hora — a ROTA /api/compose/status inteira, executada: com ?rapido=1 e waitUntil, a resposta "done" sai
//      ANTES da cópia ao bucket terminar (link do Creatomate + asset_pending), e só DEPOIS da resposta vêm a cópia, a troca
//      condicional do link na linha do vídeo, o e-mail e o evento de tempo; sem waitUntil, sem rapido ou em modo serviço,
//      tudo inline como antes; ?asset=1 só lê a linha (bucket = sim, fornecedor = não); o gancho da tela troca o link.
//   B  cron de 1 min com idempotência — vercel.json, limiares de 90 s, a trava de uma rodada por vez (lib/cronLease)
//      executada com chave primária falsa (duas rodadas juntas: só uma roda; rodada morta não prende; erro = não roda), o
//      claim determinístico do compose (lib/composeClaim) executado: a 2ª montagem do mesmo filme bate no 23505, e a
//      corrida pendente não gasta tentativa.
//   C  voz e música no clique — lib/audioNoClique executado: 1 reserva por geração, trilha/voz/cenas em paralelo, a
//      montagem reaproveita SÓ com o mesmo prompt/chave, espera o que está a caminho e cai no caminho de sempre sem nada;
//      lib/musicScore executado: faixa do clique = nenhum Lyria novo; sem aquecimento = Lyria como sempre; esperado e não
//      veio = nenhum Lyria novo (catálogo). Fiação no cinematic (depois do débito, nunca no ensaio) e no compose.
//   D  polling — lib/pollingRapido executado (2,5 s / 3 s nos 2 primeiros minutos, depois o intervalo de antes) e a fiação
//      nas três telas.
//   E  eventos — lib/tempoDaMontagem executado; compose emite compose_stage_timing depois do envio aceito (2 caminhos).
//   F  Ads e clipes — lib/ads/v2AudioCedo executado (pedido sem ator: trilha e voz; com ator: nada; tabela de clima = a
//      do montador); cron novo com trava; settleClip para todo clipe em andamento.
//   G  desfaz (scripts/test-support/desfaz-filme-rapido-1710.mjs): cada arquivo protegido, desfeito, é EXATAMENTE a base.
//   M  mutantes: cada um é aplicado (provado por diferença de texto) e deixa a verificação-alvo VERMELHA.
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { semRoteiroCurto2210 } from './test-support/desfaz-roteiro-curto-2210.mjs' // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — historical byte comparisons undo this delta first; feature checks keep the actual source.
import fs from 'node:fs'
import { semFilmesF1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs' // reancorado KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"]: as linhas marcadas da rota do compose (Faceless 15 s) saem antes da comparação com a base
import { semFilmesF1Virgula1910 } from './test-support/desfaz-filmes-f1-virgula-1910.mjs' // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a camada mais nova sai primeiro
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p, historico2210 = false) => semCloseReal1910(semFilmesF1F4_1910(semFilmesF1Virgula1910((historico2210 ? semRoteiroCurto2210 : (s) => s)(fs.readFileSync(path.join(RAIZ, p), 'utf8'), p), p), p), p).replace(/\r\n/g, '\n') /* KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — only historical snapshots opt in, before the older reversals. */ /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */ // reancorado KINEO-FILMES-F1-F4-1910: o Faceless 15 s (camada mais nova) sai primeiro, por dentro do Close real · KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a fiação do Faceless 15 s no export limpo (a mais nova) sai PRIMEIRO
const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let ok = 0
const falhas = []
const checa = (nome, cond, extra = '') => { if (cond) { ok++; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  FAIL ' + nome + (extra ? ` — ${extra}` : '')) } }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const VERCEL_CTX = Symbol.for('@vercel/request-context')
const USUARIO = '11111111-2222-3333-4444-555555555555'

/** Carrega um .ts (texto) num contexto novo, com imports falsos. `ctx` volta para o chamador mexer no global. */
function carregar(codigo, imports, extras = {}) {
  const js = ts.transpileModule(codigo, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
  const exports = {}
  const ctx = vm.createContext({ exports, module: { exports }, console: { log() {}, warn() {}, error() {} }, Buffer, URL, URLSearchParams, Date, Error, Promise, Math, JSON, Symbol, Map, Set, Number, String, Array, Object, AbortController, AbortSignal, TextEncoder, setTimeout, clearTimeout, ...extras,
    require: (n) => { if (!(n in imports)) throw new Error('import inesperado: ' + n); return imports[n] } })
  vm.runInContext(js, ctx, { timeout: 10_000 })
  return { mod: exports, ctx }
}
const carregarArquivo = (p, imports, extras) => carregar(rd(p), imports, extras)

// ── banco falso genérico (encadeável, thenable) ─────────────────────────────────────────────────────────────────────
function bancoFalso(handler) {
  const ops = []
  const consulta = (tabela) => {
    const op = { tabela, tipo: 'select', filtros: [], dados: null, colunas: null }
    const exec = (unico) => Promise.resolve().then(() => { ops.push(op); return handler(op, unico) ?? { data: unico ? null : [], error: null } })
    const b = {
      select(c) { if (op.tipo === 'select') op.colunas = c; return b },
      insert(d) { op.tipo = 'insert'; op.dados = d; return b },
      update(d) { op.tipo = 'update'; op.dados = d; return b },
      upsert(d) { op.tipo = 'upsert'; op.dados = d; return b },
      delete() { op.tipo = 'delete'; return b },
      eq(c, v) { op.filtros.push(['eq', c, v]); return b },
      neq(c, v) { op.filtros.push(['neq', c, v]); return b },
      in(c, v) { op.filtros.push(['in', c, v]); return b },
      is(c, v) { op.filtros.push(['is', c, v]); return b },
      gte(c, v) { op.filtros.push(['gte', c, v]); return b },
      lte(c, v) { op.filtros.push(['lte', c, v]); return b },
      gt(c, v) { op.filtros.push(['gt', c, v]); return b },
      lt(c, v) { op.filtros.push(['lt', c, v]); return b },
      or() { return b }, ilike() { return b }, order() { return b }, limit() { return b }, range() { return b },
      maybeSingle() { return exec(true) }, single() { return exec(true) },
      then(res, rej) { return exec(false).then(res, rej) },
    }
    return b
  }
  return { db: { from: consulta, rpc: async () => ({ data: null, error: null }) }, ops }
}
const filtro = (op, c) => op.filtros.find((f) => f[1] === c)?.[2]

// ═══ A. "pronto" na hora — a rota de status EXECUTADA ════════════════════════════════════════════════════════════════
console.log('\nA. /api/compose/status: "pronto" antes da cópia; cópia, troca do link, e-mail e tempo depois da resposta')
const STATUS = 'app/api/compose/status/[renderId]/route.ts'
const POS = 'lib/posResposta.ts'
const posResposta = carregarArquivo(POS, {})
const CREATOMATE = 'https://cdn.creatomate.com/renders/r-1.mp4'
const BUCKET = 'https://x.supabase.co/storage/v1/object/public/renders/u/r-1.mp4'

async function rodarStatus({ rapido = true, waitUntil = true, servico = false, asset = false, fonte = rd(STATUS), linhaDoVideo = null } = {}) {
  const pendentes = []
  let liberarCopia
  const copiaPronta = new Promise((r) => { liberarCopia = r })
  const linha = linhaDoVideo ? { ...linhaDoVideo } : null
  const estado = { videoRow: linha, emails: [], eventos: [], copias: 0, copiaTerminou: false }
  const { db: admin, ops } = bancoFalso((op, unico) => {
    if (op.tabela === 'videos' && op.tipo === 'insert') { estado.videoRow = { id: 'v-1', ...op.dados }; return { data: { id: 'v-1' }, error: null } }
    if (op.tabela === 'videos' && op.tipo === 'update') {
      if (!estado.videoRow || filtro(op, 'video_url') !== estado.videoRow.video_url) return { data: [], error: null }
      estado.videoRow = { ...estado.videoRow, ...op.dados }
      return { data: [{ id: 'v-1' }], error: null }
    }
    if (op.tabela === 'videos' && op.tipo === 'select') return { data: estado.videoRow ? { id: 'v-1', video_url: estado.videoRow.video_url } : null, error: null }
    if (op.tabela === 'profiles') return { data: { has_paid: true, plan: 'creator', video_credits: 40, email: 'pessoa@exemplo.com' }, error: null }
    if (op.tabela === 'events' && op.tipo === 'insert') { estado.eventos.push(op.dados); return { data: null, error: null } }
    return { data: unico ? null : [], error: null }
  })
  const { db: doUsuario } = bancoFalso((op, unico) => ({ data: unico ? null : [], error: null }))
  const usuario = { ...doUsuario, auth: { getUser: async () => ({ data: { user: { id: USUARIO, email: 'pessoa@exemplo.com' } } }) } }
  const imports = {
    'next/server': {
      NextRequest: class {},
      NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) },
    },
    '@/lib/supabase/server': { createClient: () => usuario },
    '@/lib/episodeMemory': { MAX_EPISODE_MEMORY_CHARS: 4000 },
    '@supabase/supabase-js': { createClient: () => admin },
    '@/lib/compose': { pollCreatomateRender: async () => ({ status: 'succeeded', url: CREATOMATE, snapshotUrl: null, durationSeconds: 61 }) },
    '@/lib/renderAssets': { persistRenderAssets: async () => { estado.copias++; await copiaPronta; estado.copiaTerminou = true; return { videoUrl: BUCKET, thumbnailUrl: null, measuredSeconds: 61.2, measureMethod: 'mvhd' } } },
    '@/lib/posResposta': posResposta.mod,
    '@/lib/tempoDaMontagem': { COMPOSE_STATUS_TIMING_EVENT: 'compose_status_timing' },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { estado.eventos.push(e); return true } },
    '@/lib/credits/refund': { refundRenderCredits: async () => 0 },
    '@/lib/videoDescription': { buildBrandedYouTubeDescription: (d) => d },
    '@/lib/reverseTrial': { isTrialActive: () => false, TRIAL_ENTITLEMENT_COLUMNS: 'trial_ends_at' },
    '@/lib/credits/engineCost': { creditCostFor: () => 15, normalizeQuality: (q) => q, creditCostForDuration: () => 15 },
    '@/lib/credits/debit': { debitVideoCredits: async () => ({ data: 25, error: null }) },
    '@/lib/credits/composeHold': { releaseFailedFreeFastClaim: async () => true, settleComposeCreditHoldForRender: async () => true },
    '@/lib/videoShareLink': { publishHref: () => 'https://p', unpublishHref: () => 'https://u' },
    '@/lib/filmFeedback': { feedbackRowHtml: () => '' },
    '@/lib/publishPackServer': { garantirPacote: async () => null },
    '@/lib/publishPackEmail': { packEmailHtml: () => '' },
    '@/lib/credits/renderIntent': { getRenderIntent: async () => ({ quality: 'cinematic_ai', cost: 15, userId: USUARIO }) },
    '@/lib/lifecycle/videoReadyFooter': { videoReadyFooter: () => ({ html: '', kind: 'k', trialDoor: false, adsLine: false }) },
    '@/lib/composeClaim': { COMPOSE_CLAIM_EVENT: 'compose_submission_claim' },
    '@/lib/textLanguage': { narrationLanguage: () => null, resolveNarrationLanguage: () => ({ language: 'en' }) },
    '@/lib/avatar/reservation': { loadPrepaidAvatarClaimForRender: async () => ({ ok: true, claim: null }), settleAvatarCreditHoldForRender: async () => true },
    '@/lib/cinematic/claim': { loadSettledCinematicClaimForRender: async () => ({ ok: true, claim: { status: 'settled', creditCost: 15 } }), releaseCinematicClaim: async () => ({ ok: true }) },
    '@/lib/push': { sendPushToSubscriptions: async () => ({ sent: 0, gone: [] }) },
  }
  const fetchFalso = async (url, init) => { if (String(url).includes('resend.com')) estado.emails.push(JSON.parse(init.body)); return { ok: true, text: async () => '', json: async () => ({}) } }
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', CREATOMATE_API_KEY: 'c', RESEND_API_KEY: 'r', CRON_SECRET: 's' }
  const rota = carregar(fonte, imports, { process: { env }, fetch: fetchFalso })
  // O waitUntil da Vercel mora no global do módulo posResposta (o contexto dele).
  posResposta.ctx[VERCEL_CTX] = waitUntil ? { get: () => ({ waitUntil: (p) => pendentes.push(p) }) } : undefined
  const qs = new URLSearchParams({ quality: 'cinematic_ai', resume: '1', duration: '60', topic: 'A lost city' })
  if (rapido) qs.set('rapido', '1')
  if (asset) qs.set('asset', '1')
  const headers = servico ? { authorization: 'Bearer s', 'x-kineo-service-user': USUARIO } : {}
  const req = { nextUrl: { searchParams: qs }, headers: { get: (k) => headers[k.toLowerCase()] ?? null } }
  let respondeu = null
  const promessa = rota.mod.GET(req, { params: { renderId: 'r-1' } }).then((r) => { respondeu = r; return r })
  for (let i = 0; i < 60 && !respondeu; i++) await dormir(5)
  const antesDaCopia = { respondeu: !!respondeu, copiaTerminou: estado.copiaTerminou, emails: estado.emails.length, videoUrl: estado.videoRow?.video_url ?? null }
  liberarCopia()
  const resposta = await promessa
  await Promise.all(pendentes)
  return { resposta, antesDaCopia, estado, pendentes: pendentes.length, ops }
}

{
  const r = await rodarStatus()
  checa('A1 rapido=1 + waitUntil: a resposta "done" sai com a cópia AINDA em curso (nada de e-mail ainda)', r.antesDaCopia.respondeu && !r.antesDaCopia.copiaTerminou && r.antesDaCopia.emails === 0 && r.resposta.body.phase === 'done')
  checa('A2 o "pronto" leva o link do Creatomate e asset_pending; a linha do vídeo nasce com ele', r.resposta.body.final_video_url === CREATOMATE && r.resposta.body.asset_pending === true && r.antesDaCopia.videoUrl === CREATOMATE)
  checa('A3 depois da resposta: 1 tarefa de fundo, cópia feita, a linha troca para o bucket (condicional ao link antigo)', r.pendentes === 1 && r.estado.copias === 1 && r.estado.videoRow?.video_url === BUCKET && r.ops.some((o) => o.tabela === 'videos' && o.tipo === 'update' && filtro(o, 'video_url') === CREATOMATE))
  const email = r.estado.emails[0]
  checa('A4 o e-mail de pronto sai DEPOIS da cópia, uma vez, com o link do bucket', r.estado.emails.length === 1 && typeof email?.html === 'string' && email.html.includes(BUCKET) && !email.html.includes(CREATOMATE))
  const tempo = r.estado.eventos.find((e) => e?.name === 'compose_status_timing')
  checa('A5 evento compose_status_timing com copia_ms, adiada=true e trocou_link=true', !!tempo && tempo.metadata.adiada === true && tempo.metadata.trocou_link === true && typeof tempo.metadata.copia_ms === 'number')
  const medida = r.estado.eventos.find((e) => e?.name === 'render_delivered_measured')
  checa('A6 a entrega medida sai depois da cópia, com a medida do ARQUIVO (61,2 s, mvhd)', !!medida && medida.metadata.measured_seconds === 61.2 && medida.metadata.measure_method === 'mvhd')
}
{
  const r = await rodarStatus({ waitUntil: false })
  checa('A7 sem waitUntil: tudo inline como antes (a resposta espera a cópia; link do bucket; sem asset_pending)', !r.antesDaCopia.respondeu && r.resposta.body.final_video_url === BUCKET && !('asset_pending' in r.resposta.body) && r.estado.emails.length === 1)
  const r2 = await rodarStatus({ rapido: false })
  checa('A8 sem ?rapido=1 (Ads v1, avatar, autopilot, cron): inline como antes', !r2.antesDaCopia.respondeu && r2.resposta.body.final_video_url === BUCKET && r2.pendentes === 0)
  const r3 = await rodarStatus({ servico: true })
  checa('A9 modo serviço (cron de resgate) com rapido=1: inline (o cron confere o e-mail logo depois)', !r3.antesDaCopia.respondeu && r3.resposta.body.final_video_url === BUCKET && r3.pendentes === 0)
}
{
  const naoAinda = await rodarStatus({ asset: true, linhaDoVideo: { video_url: CREATOMATE } })
  const ja = await rodarStatus({ asset: true, linhaDoVideo: { video_url: BUCKET } })
  checa('A10 ?asset=1 só lê a linha: fornecedor = ainda não; bucket = o link; nenhum débito/cópia/e-mail', naoAinda.resposta.body.asset_ready === false && naoAinda.resposta.body.final_video_url === null && ja.resposta.body.asset_ready === true && ja.resposta.body.final_video_url === BUCKET && ja.estado.copias === 0 && ja.estado.emails.length === 0 && !ja.ops.some((o) => o.tipo !== 'select'))
}
{
  const gancho = carregarArquivo('lib/useTrocaDoLink.ts', { react: { useEffect: () => {} } })
  const respostas = [{ ok: true, json: async () => ({ asset_ready: false, final_video_url: null }) }, { ok: true, json: async () => ({ asset_ready: true, final_video_url: BUCKET }) }]
  let n = 0
  const pedidos = []
  const f = async (u) => { pedidos.push(u); return respostas[n++] }
  const a = await gancho.mod.perguntarLinkDoBucket('r-1', f)
  const b = await gancho.mod.perguntarLinkDoBucket('r-1', f)
  const G = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('A11 a tela pergunta ?asset=1 e troca pelo link do bucket quando ele existe; o player volta ao mesmo ponto', a === null && b === BUCKET && pedidos.every((u) => u === '/api/compose/status/r-1?asset=1') &&
    G.includes("params.set('rapido', '1')") && G.includes("setLinkParaTrocar(data.asset_pending === true ? (renderId as string) : null)") && G.includes('useTrocaDoLinkDoBucket({ ativo: phase === \'done\', renderId: linkParaTrocar,') && G.includes('e.currentTarget.currentTime = retomar.t'))
}
{
  const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
  checa('A12 rede de trás: a fase D do cron só copia linha com 2 min+ (a cópia de fundo em curso não é duplicada)', cron.includes(".lte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())") && cron.indexOf(".lte('created_at', new Date(Date.now() - 2 * 60 * 1000)") > cron.indexOf('FASE D — FILME ENTREGUE COM LINK DO FORNECEDOR'))
  const s = rd(STATUS)
  checa('A13 o débito e a reserva continuam ANTES da decisão de adiar (nada de dinheiro depois da resposta)', s.indexOf('const adiarEntrega =') > s.indexOf('debitVideoCredits(supabase, {') && s.indexOf('const adiarEntrega =') > s.lastIndexOf('const composeHoldSettled = await settleComposeCreditHoldForRender({', s.indexOf('const adiarEntrega =')))
}

// ═══ B. cron de 1 min com idempotência ═══════════════════════════════════════════════════════════════════════════════
console.log('\nB. cron de 1 min, limiares de 90 s, uma rodada por vez, nunca montar duas vezes')
const VJ = JSON.parse(rd('vercel.json')).crons
const sched = (p) => VJ.filter((c) => c.path === p).map((c) => c.schedule)
checa('B1 vercel.json: finish-stranded-renders e rapido-ads-clipes a cada 1 min; ads-v2-advance (lotes e demos) intocado em 2-57/5', JSON.stringify(sched('/api/cron/finish-stranded-renders')) === '["* * * * *"]' && JSON.stringify(sched('/api/cron/rapido-ads-clipes')) === '["* * * * *"]' && JSON.stringify(sched('/api/cron/ads-v2-advance')) === '["2-57/5 * * * *"]')
const SR = carregarArquivo('lib/strandedRescue.ts', {}).mod
const agora = Date.parse('2026-10-17T12:00:00Z')
checa('B2 limiares: claim com 90 s e aba calada há 90 s (eram 4 min / 3 min); batida de 65 s = viva, 2 min = morta', SR.STRANDED_MIN_AGE_MS === 90_000 && SR.CLIENT_ALIVE_MS === 90_000 && SR.clientStillAlive(agora - 65_000, agora) === true && SR.clientStillAlive(agora - 120_000, agora) === false)

function bancoComChave(opts = {}) {
  const linhas = new Map()
  const { db } = bancoFalso((op, unico) => {
    if (opts.erro) return { data: null, error: { code: 'XX000', message: 'banco fora' } }
    const id = filtro(op, 'id')
    if (op.tipo === 'insert') {
      if (linhas.has(op.dados.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      linhas.set(op.dados.id, JSON.parse(JSON.stringify(op.dados)))
      return { data: null, error: null }
    }
    if (op.tipo === 'select') return { data: linhas.has(id) ? { metadata: linhas.get(id).metadata } : null, error: null }
    if (op.tipo === 'delete') {
      const dono = filtro(op, 'metadata->>dono')
      if (linhas.has(id) && linhas.get(id).metadata.dono === dono) linhas.delete(id)
      return { data: null, error: null }
    }
    if (op.tipo === 'update') { if (linhas.has(id)) linhas.get(id).metadata = op.dados.metadata; return { data: null, error: null } }
    return { data: unico ? null : [], error: null }
  })
  return { db, linhas }
}
const LEASE_SRC = rd('lib/cronLease.ts')
const lease = (src = LEASE_SRC) => carregar(src, { 'node:crypto': crypto }).mod
{
  const L = lease()
  const b = bancoComChave()
  const [v1, v2] = await Promise.all([L.tomarVezDoCron(b.db, 'finish-stranded-renders', 315_000, agora), L.tomarVezDoCron(b.db, 'finish-stranded-renders', 315_000, agora)])
  checa('B3 duas rodadas no mesmo minuto: exatamente UMA roda; a outra recebe "ocupada"', [v1, v2].filter((v) => v.ok).length === 1 && [v1, v2].some((v) => !v.ok && v.motivo === 'ocupada'))
  const vencedora = v1.ok ? v1 : v2
  await vencedora.liberar()
  const v3 = await L.tomarVezDoCron(b.db, 'finish-stranded-renders', 315_000, agora + 60_000)
  checa('B4 liberada a vez, a rodada do minuto seguinte roda', v3.ok === true)
  const v4 = await L.tomarVezDoCron(b.db, 'finish-stranded-renders', 315_000, agora + 400_000)
  checa('B5 rodada morta (lambda caiu sem liberar): vencido o prazo, a próxima toma a vez', v4.ok === true)
  const v5 = await L.tomarVezDoCron(bancoComChave({ erro: true }).db, 'finish-stranded-renders', 315_000, agora)
  checa('B6 erro de banco na trava = a rodada NÃO roda (falha fechada; o próximo minuto tenta)', v5.ok === false && v5.motivo === 'erro_de_banco')
  checa('B7 id da trava determinístico por cron (formato uuid), diferente entre crons', L.idDaVez('a') === L.idDaVez('a') && L.idDaVez('a') !== L.idDaVez('b') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(L.idDaVez('a')))
}
{
  const CC = carregarArquivo('lib/composeClaim.ts', { 'node:crypto': crypto }).mod
  const b = bancoComChave()
  const id1 = CC.composeClaimId(USUARIO, 'gen-123456789')
  const id2 = CC.composeClaimId(USUARIO, 'gen-123456789')
  const ins = async () => (await b.db.from('events').insert({ id: CC.composeClaimId(USUARIO, 'gen-123456789'), name: CC.COMPOSE_CLAIM_EVENT, metadata: { status: 'pending' } })).error
  const [e1, e2] = await Promise.all([ins(), ins()])
  const compose = rd('app/api/compose/route.ts')
  checa('B8 nunca montar duas vezes: aba e cron no MESMO filme geram o MESMO claim; o 2º insert recebe 23505 (o compose responde 409/replay)', id1 === id2 && [e1, e2].filter((e) => e === null).length === 1 && [e1, e2].some((e) => e?.code === '23505') && compose.includes('const claimId = composeClaimId(authenticatedUserId, generationId)') && compose.includes("if ((claimError as { code?: string }).code !== '23505') {"))
  const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
  const iGet = cron.indexOf('export async function GET(req: NextRequest) {'), iVez = cron.indexOf("const vez = await tomarVezDoCron(trava, 'finish-stranded-renders', STRANDED_RUN_LEASE_MS)"), iRod = cron.indexOf('return await rodadaDoResgate(req)'), iLib = cron.indexOf('await vez.liberar()'), iFn = cron.indexOf('async function rodadaDoResgate(req: NextRequest)')
  checa('B9 o cron roda dentro da trava (GET → tomarVezDoCron → rodadaDoResgate → liberar no finally)', iGet > 0 && iGet < iVez && iVez < iRod && iRod < iLib && iLib < iFn && cron.slice(iRod, iLib).includes('} finally {') && cron.split('\n').filter((l) => l.startsWith('export async function GET(')).length === 1)
  checa('B10 corrida pendente (409: a aba montando) fica marcada e não gasta tentativa', cron.includes("await admin.from('events').insert({ user_id: userId, name: PENDING_RACE_EVENT, session_id: genId,") && cron.includes('const attemptCount = ownAttempts(genId)') && cron.includes('Math.max(0, (attempts.get(sid) ?? 0) - (pendingRaces.get(sid) ?? 0))'))
}

// ═══ C. voz e música no clique ═════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. voz e música no clique: reserva única, paralelo, reaproveita só o MESMO, espera, e cai no de sempre')
const ANC_SRC = rd('lib/audioNoClique.ts')
const anc = (src = ANC_SRC) => carregar(src, { 'node:crypto': crypto }).mod
{
  const A = anc()
  const b = bancoComChave()
  const ordem = []
  const job = { requestId: 'lyr-1', statusUrl: 'https://queue.fal.run/x/requests/lyr-1/status', responseUrl: 'https://queue.fal.run/x/requests/lyr-1' }
  let liberaTrilha
  const trilha = new Promise((r) => { liberaTrilha = r })
  const deps = { db: b.db, agora: () => Date.now(), submeterLyria: async () => { ordem.push('lyria_submit'); return job }, esperarLyria: async () => { await trilha; ordem.push('lyria_ok'); return 'https://v3.fal.media/trilha.mp3' } }
  const pedido = { generationId: 'gen-AAAA1111', userId: USUARIO, promptMusica: 'PROMPT-X', voz: { chave: 'k-voz', produzir: async () => { ordem.push('voz'); return true } }, cenas: [async () => { ordem.push('cena1'); return true }, async () => { ordem.push('cena2'); return true }] }
  const r1 = await A.reservarAquecimento(b.db, pedido, Date.now())
  const r2 = await A.reservarAquecimento(b.db, pedido, Date.now())
  checa('C1 uma reserva por geração (retry/replay do despacho não paga a mesma voz duas vezes)', r1.ok === true && r2.ok === false)
  const exec = A.executarAquecimento(deps, pedido, r1.registro)
  await dormir(20)
  checa('C2 voz e cenas não esperam a trilha (em paralelo)', ordem.includes('voz') && ordem.includes('cena1') && ordem.includes('cena2') && !ordem.includes('lyria_ok'))
  const meio = await A.lerAquecimento(b.db, 'gen-AAAA1111')
  checa('C3 o registro já guarda o job da trilha (quem chegar depois espera o MESMO job, sem pagar outro)', meio?.musica?.status === 'pendente' && meio.musica.job?.requestId === 'lyr-1' && meio.voz?.status === 'pronta')
  liberaTrilha()
  const fim = await exec
  checa('C4 fim: trilha pronta (URL), voz pronta, cenas 2/2', fim.musica.status === 'pronta' && fim.musica.url === 'https://v3.fal.media/trilha.mp3' && fim.voz.status === 'pronta' && fim.cenas.status === 'pronta' && fim.cenas.prontas === 2)

  const montagem = (lookup, extra = {}) => A.montagemComAudioDoClique({ db: b.db, generationId: 'gen-AAAA1111', lookup, esperarLyria: async () => null, orcamentoLyriaMs: 45_000, dormir: async () => {}, ...extra })
  const M = montagem(async () => null)
  checa('C5 montagem com o MESMO prompt: a trilha do clique', (await M.musica('PROMPT-X')) === 'https://v3.fal.media/trilha.mp3' && M.relato.musica === 'pronta')
  checa('C6 prompt diferente (a montagem pediria outra trilha): nada reaproveitado → gera como sempre (undefined)', (await M.musica('OUTRO PROMPT')) === undefined)
  const semNada = montagem(async () => null)
  const outro = A.montagemComAudioDoClique({ db: bancoComChave().db, generationId: 'gen-SEM-AQUECER', lookup: async () => null, esperarLyria: async () => 'x', orcamentoLyriaMs: 45_000, dormir: async () => {} })
  checa('C7 filme sem aquecimento (sem waitUntil, antigo, cron): trilha undefined, voz null, cena null = o caminho de sempre', (await outro.musica('PROMPT-X')) === undefined && (await outro.voz('k')) === null && (await outro.cena('t', 'onyx', 1)) === null && semNada.relato.voz === 'sem')

  // a voz que ainda está sendo feita: a montagem espera e pega
  const b2 = bancoComChave()
  const p2 = { ...pedido, generationId: 'gen-BBBB2222', cenas: [] }
  const res2 = await A.reservarAquecimento(b2.db, p2, Date.now())
  let pronta = false
  setTimeout(() => { pronta = true }, 30)
  let t = 0
  const espera = await A.esperarVozDoClique({ db: b2.db, generationId: 'gen-BBBB2222', parte: 'voz', chave: 'k-voz', buscar: async () => (pronta ? { voiceoverUrl: 'https://vo', audioDuration: 9, words: [] } : null), prazoAbsolutoMs: 1_000_000, agora: () => t, dormir: async () => { t += 1500; await dormir(10) } })
  checa('C8 voz a caminho (registro pendente, mesma chave): a montagem ESPERA e reaproveita', res2.ok && espera?.voiceoverUrl === 'https://vo')
  const chaveErrada = await A.esperarVozDoClique({ db: b2.db, generationId: 'gen-BBBB2222', parte: 'voz', chave: 'OUTRA', buscar: async () => ({ x: 1 }), prazoAbsolutoMs: 1_000_000, agora: () => 0, dormir: async () => {} })
  t = 0
  const estourou = await A.esperarVozDoClique({ db: b2.db, generationId: 'gen-BBBB2222', parte: 'voz', chave: 'k-voz', buscar: async () => null, prazoAbsolutoMs: 3000, agora: () => t, dormir: async () => { t += 1500 } })
  checa('C9 outra chave = não espera (gera como sempre); prazo vencido = null (gera como sempre)', chaveErrada === null && estourou === null)
  checa('C10 chave da cena por FILME (geração + voz + velocidade + texto): outro filme nunca toca nela', A.chaveDaCenaAquecida({ generationId: 'g1', texto: 'a', voz: 'onyx', velocidade: 1 }) !== A.chaveDaCenaAquecida({ generationId: 'g2', texto: 'a', voz: 'onyx', velocidade: 1 }) && A.chaveDaCenaAquecida({ generationId: 'g1', texto: 'a ', voz: 'onyx', velocidade: 1.0004 }) === A.chaveDaCenaAquecida({ generationId: 'g1', texto: 'a', voz: 'onyx', velocidade: 1 }))
}
{
  // lib/musicScore executado: a decisão de pedir (ou não) um Lyria novo
  let lyrias = 0, catalogo = 0
  const MS = carregarArquivo('lib/musicScore.ts', {
    '@/lib/musicDirection': { resolveMusicDirection: () => ({ enabled: true, mood: 'suspense', emotion: 'tension', source: 'emotion', curatedFallback: true }) },
    '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => { lyrias++; return 'https://lyria-nova' }, lyriaPromptFor: (m) => `PROMPT-${m}` },
    '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => { catalogo++; return 'https://catalogo' } },
  }).mod
  let visto = null
  const a = await MS.selectMusicForScript({ script: 's', lyriaPronta: async (p) => { visto = p; return 'https://do-clique' } })
  checa('C11 faixa do clique (mesmo prompt que esta função mandaria): NENHUM Lyria novo', a === 'https://do-clique' && lyrias === 0 && visto === 'PROMPT-suspense')
  const b = await MS.selectMusicForScript({ script: 's', lyriaPronta: async () => undefined })
  const c = await MS.selectMusicForScript({ script: 's' })
  checa('C12 sem aquecimento útil (ou sem gancho): o Lyria de sempre', b === 'https://lyria-nova' && c === 'https://lyria-nova' && lyrias === 2)
  const d = await MS.selectMusicForScript({ script: 's', lyriaPronta: async () => null })
  checa('C13 o job do clique foi esperado e não veio: nenhum Lyria novo, cai no catálogo (o estouro de hoje)', d === 'https://catalogo' && lyrias === 2 && catalogo === 1)
}
{
  const cin = rd('app/api/generate-video-cinematic/route.ts')
  const fimSettle = cin.indexOf('const acquired = await acquireCinematicClaim({')
  const settle = cin.slice(cin.indexOf('const settleDebitAndRespond = async ('), fimSettle)
  checa('C14 cinematic: o aquecimento só nasce com o despacho ACEITO e o débito confirmado (claim liquidado), nunca no ensaio', cin.includes("body.dry_run === true ? Promise.resolve(false) : agendarAudioNoClique({ generationId, userId: user.id, quality: claimQuality, response: resp,") && settle.lastIndexOf('await audioNoClique(response)') > settle.indexOf('const settled = await settleCinematicClaim({') && settle.lastIndexOf('await audioNoClique(response)') < settle.indexOf('return NextResponse.json({ ...response, credits_charged: claim.creditCost, balance: debit.balance })') && settle.includes("if (claim.status === 'settled') await audioNoClique(response)") && settle.indexOf("if (claim.status === 'released') {") < settle.indexOf('await audioNoClique('))
  const comp = rd('app/api/compose/route.ts')
  checa('C15 compose: voz clássica espera a do clique depois do cache; as 2 trilhas usam o gancho; cada cena da estrada hollywood tenta a do clique (só na 1ª tentativa)', comp.includes('if (!cachedVoiceover) cachedVoiceover = await audioDoClique.voz(voiceoverCacheKey)') && (comp.match(/lyriaPronta: audioDoClique\.musica,/g) ?? []).length === 2 && comp.includes('if (tentativasCena === 1) { const daCena = await audioDoClique.cena(pending.text, hollywoodPinnedVoice.voice, hollywoodPinnedVoice.defaultSpeed * (explicitSpeed ?? 1.0));') && comp.indexOf('cachedVoiceover = await lookupCachedVoiceover(voiceoverCacheKey)') < comp.indexOf('cachedVoiceover = await audioDoClique.voz('))
  const srv = rd('lib/audioNoCliqueServer.ts')
  checa('C16 servidor do clique: sem waitUntil nada é reservado; espelhos do compose (narration_voice, verbatim, host_voice, velocidade)', srv.includes('if (!podeAdiarParaDepoisDaResposta()) return false') && srv.includes('const assinada = vozAssinadaDoClaim(r)') && srv.includes("if (explicitSpeed != null || r.verbatim === true)") && srv.includes('hollywoodVoiceFromClaim(r.host_voice) ?? resolveHollywoodVoice(voiceoverScript, language, vertical)') && srv.includes('const velocidade = pinned.defaultSpeed * (explicitSpeed ?? 1.0)'))
  const pw = rd('app/api/prewarm-voiceover/route.ts')
  checa('C17 a aba não paga a mesma voz de novo quando o servidor já aquece (generationId → registro)', pw.includes("if (reg?.voz) return NextResponse.json({ warmed: false, reason: 'server_prewarm' })") && rd('app/(dashboard)/generate/GenerateClient.tsx').includes('generationId: cinematicGenerationId, // KINEO-FILME-RAPIDO-1710'))
}

// ═══ D. polling ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. polling 2,5–3 s nos 2 primeiros minutos, depois o intervalo de antes')
const PR_SRC = rd('lib/pollingRapido.ts')
const PR = carregar(PR_SRC, {}).mod
checa('D1 filme 2,5 s até 2 min; depois 6 s (cenas) / 5 s (montagem); Ads e clipes 3 s', PR.intervaloDePoll(0, 10_000, PR.POLL_RAPIDO_FILME_MS, 6000) === 2500 && PR.intervaloDePoll(0, 119_999, 2500, 6000) === 2500 && PR.intervaloDePoll(0, 120_000, 2500, 6000) === 6000 && PR.intervaloDePoll(0, 600_000, 2500, 5000) === 5000 && PR.POLL_RAPIDO_ADS_MS === 3000 && PR.intervaloDePoll(NaN, 1, 2500, 6000) === 6000)
{
  const G = rd('app/(dashboard)/generate/GenerateClient.tsx')
  const A = rd('app/(dashboard)/ads/v2/AdsV2Client.tsx')
  const C = rd('app/(dashboard)/clips/ClipsClient.tsx')
  checa('D2 filme: cenas (1º poll em 2,5 s) e montagem usam o recuo', G.includes('scheduleNextPoll(intervaloDePoll(pollStartedAt, Date.now(), POLL_RAPIDO_FILME_MS, 6000))') && G.includes('pollTimerRef.current = setTimeout(pollFal, POLL_RAPIDO_FILME_MS)') && G.includes('scheduleNextComposePoll(intervaloDePoll(pollStartedAt, Date.now(), POLL_RAPIDO_FILME_MS, POLL_COMPOSING_MS))'))
  checa('D3 Ads: 3 s por pedido nos 2 primeiros minutos, depois 8 s; erro segue em 20 s', A.includes('schedulePoll(v.order_id, intervaloDePoll(pollDesdeRef.current.t, Date.now(), POLL_RAPIDO_ADS_MS, POLL_MS))') && A.includes('const POLL_MS = 8000') && A.includes('schedulePoll(orderId, POLL_RETRY_MS)'))
  checa('D4 clipes: pergunta JÁ (sem esperar 6 s) e encadeia com recuo; sem setInterval', C.includes('    perguntar() // KINEO-FILME-RAPIDO-1710') && C.includes('timer = window.setTimeout(perguntar, intervaloDePoll(desde, Date.now(), POLL_RAPIDO_ADS_MS, 6000))') && !C.split('\n').some((l) => l.trim().startsWith('const timer = window.setInterval(')))
}

// ═══ E. eventos de tempo ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. evento de tempo por etapa (voz, transcrição, música, envio ao Creatomate, render, cópia)')
{
  const T = carregarArquivo('lib/tempoDaMontagem.ts', {}).mod
  let t = 1000
  const c = T.cronometroDaMontagem(() => t)
  c.inicio('voz'); t += 400; c.fim('voz'); c.inicio('voz'); t += 100; c.fim('voz')
  c.inicio('musica'); t += 50; c.fim('musica'); c.fim('transcricao')
  const md = c.metadados({ render_id: 'r' })
  checa('E1 cronômetro: soma a etapa repetida (cenas), ignora fim sem início, total desde o começo', md.voz_ms === 500 && md.musica_ms === 50 && !('transcricao_ms' in md) && md.total_ms === 550 && md.render_id === 'r')
  const comp = rd('app/api/compose/route.ts')
  const emissoes = comp.match(/void writeServerEvent\(\{ name: COMPOSE_STAGE_TIMING_EVENT,/g) ?? []
  const iC = comp.indexOf("renderId = await submitCreatomateOnce(source, submissionKey)")
  const iH = comp.indexOf("hollywoodRenderId = await submitCreatomateOnce(hollywoodSource, submissionKey)")
  checa('E2 compose: inicio/fim de voz, transcrição, música e envio nos 2 caminhos; o evento sai logo DEPOIS do envio aceito', emissoes.length === 2 && comp.indexOf('COMPOSE_STAGE_TIMING_EVENT', iC) - iC < 400 && comp.indexOf('COMPOSE_STAGE_TIMING_EVENT', iH) - iH < 400 && ['voz', 'transcricao', 'musica', 'envio_creatomate'].every((e) => comp.includes(`tempo.inicio('${e}')`) && comp.includes(`tempo.fim('${e}')`)))
  const s = rd(STATUS)
  checa('E3 status: render_ms (do envio ao pronto) e copia_ms no compose_status_timing, inline e adiado', s.includes('renderMs = renderTimeMs') && s.includes("void registrarTempoDaEntrega(false, false)") && s.includes('await registrarTempoDaEntrega(true, trocou)'))
}

// ═══ F. Ads e clipes ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nF. Studio Ads (trilha e voz no início; o ator intocado) e clipes (cron de 1 min)')
{
  const chamadas = []
  const AC = carregarArquivo('lib/ads/v2AudioCedo.ts', {
    '@/lib/compose': { estimateMp3DurationSeconds: () => 12.3456, uploadVoiceoverToSupabase: async () => { chamadas.push('upload'); return 'https://vo/ads.mp3' } },
    '@/lib/lyriaMusic': { getLyriaMusicUrl: async (_n, mood) => { chamadas.push('lyria:' + mood); return 'https://fal/lyria.mp3' } },
    '@/lib/ttsFallback': { synthesizeTtsFallback: async (txt) => { chamadas.push('tts:' + txt); return Buffer.from('mp3') } },
    '@/lib/textLanguage': { narrationLanguage: () => 'en' },
    '@/lib/ads/speakable': { speakableForTts: (t) => t },
    '@/lib/ads/v2Pronounce': { adsV2NarrationForTts: (t) => t, adsV2PronounceOf: () => null },
    '@/lib/ads/v2Images': { persistAudioCopy: async () => 'https://bucket/music.mp3' },
    '@/lib/ads/v2Advance': { adsV2PresenterPlanOf: (plan) => (plan && plan.presenter ? plan.presenter : null) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { chamadas.push('evento:' + e.name); return true } },
    '@/lib/cronLease': { tomarVezDoCron: async () => ({ ok: true, dono: 'd', liberar: async () => {} }) },
  }).mod
  const pedido = { id: 'o-1', user_id: USUARIO, generation_id: 'g', status: 'generating', sector: 'gym', language: 'en', brief: {}, narration: true, plan: { narration: 'Train harder today.' }, music_url: null, voice_url: null, voice_seconds: null }
  const escritas = []
  const { db } = bancoFalso((op) => { if (op.tipo === 'update') escritas.push({ dados: op.dados, is: op.filtros.filter((f) => f[0] === 'is').map((f) => f[1]) }); return { data: null, error: null } })
  const r = await AC.adsV2AudioCedo(db, pedido)
  checa('F1 pedido sem ator: trilha Lyria do clima do setor (gym → hustle) e a voz de sempre, gravadas SÓ se vazias', r.musica === 'pronta' && r.voz === 'pronta' && chamadas.includes('lyria:hustle') && chamadas.includes('tts:Train harder today.') && escritas.some((e) => e.dados.music_url === 'https://bucket/music.mp3' && e.is.includes('music_url')) && escritas.some((e) => e.dados.voice_url === 'https://vo/ads.mp3' && e.dados.voice_seconds === 12.346 && e.is.includes('voice_url')))
  const comAtor = AC.adsV2AudioCedoFalta({ ...pedido, plan: { narration: 'x', presenter: { presenterId: 'p1' } } })
  const pronto = AC.adsV2AudioCedoFalta({ ...pedido, music_url: 'https://m', voice_url: 'https://v', voice_seconds: 9 })
  checa('F2 pedido COM apresentador: nada adiantado (o caminho do ator fica intocado); nada faltando = nada', !comAtor.musica && !comAtor.voz && !pronto.musica && !pronto.voz)
  const mesa = (s) => { const i = s.indexOf('{', s.indexOf('= {', s.indexOf(s.includes('ADS_V2_SECTOR_MOOD_CEDO') ? 'ADS_V2_SECTOR_MOOD_CEDO' : 'const SECTOR_MOOD'))); return s.slice(i, s.indexOf('}', i) + 1).replace(/\s+/g, ' ') }
  checa('F3 a tabela de clima por setor é a MESMA do montador (lib/ads/v2Advance SECTOR_MOOD)', mesa(rd('lib/ads/v2AudioCedo.ts')) === mesa(rd('lib/ads/v2Advance.ts')))
  const cron = rd('app/api/cron/rapido-ads-clipes/route.ts')
  checa('F4 o cron de 1 min adianta trilha e voz dos pedidos em geração, junto com o avanço (e espera antes de responder); /status, v2Advance e v2PresenterV2 intocados', cron.includes("if (order) audios.push(adsV2AudioCedo(admin, order))") && cron.indexOf('audios.push(adsV2AudioCedo(') < cron.indexOf('const view = await advanceAdsV2Order(') && cron.includes('await Promise.all(audios)') && !rd('app/api/ads/v2/status/route.ts').includes('KINEO-FILME-RAPIDO-1710') && !rd('lib/ads/v2Advance.ts').includes('KINEO-FILME-RAPIDO-1710') && !rd('lib/ads/v2PresenterV2.ts').includes('KINEO-FILME-RAPIDO-1710'))
  checa('F5 cron de 1 min: trava, Ads pelo MESMO motor da tela, clipes pela MESMA settleClip', cron.includes("const vez = await tomarVezDoCron(admin, 'rapido-ads-clipes', (maxDuration + 15) * 1000)") && cron.includes('await advanceAdsV2Order(admin, o.id,') && cron.includes('advanceActiveClipJobs({ deadlineMs: started + TOTAL_BUDGET_MS })') && cron.includes('await vez.liberar()'))
  const clip = rd('lib/clips/clipServer.ts')
  checa('F6 clipe parado com 20 s+: settleClip (transições condicionais), vencidos também fecham', clip.includes("const after = await settleClip(settleDepsFor(admin, row.user_id), row).catch(() => row)") && clip.includes("(opts.minAgeMs ?? 20_000)") && clip.includes(".in('status', ['pending', 'processing']).lte('created_at', youngest)"))
}

// ═══ G. desfaz ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. desfeita a entrega, cada arquivo protegido é EXATAMENTE a base')
const SUP = await import(pathToFileURL(path.join(RAIZ, 'scripts/test-support/desfaz-filme-rapido-1710.mjs')).href)
const { desfazApresentadorV2Libera1910 } = await import(pathToFileURL(path.join(RAIZ, 'scripts/test-support/desfaz-apresentador-v2-libera-1910.mjs')).href) // reancorado KINEO-APRESENTADOR-V2-LIBERA-1910: a liberação de 19/10 (camada mais nova) sai antes da comparação com a base
let BASE = null
try {
  const shas = git('log', '--format=%H', '--grep=KINEO-FILME-RAPIDO-1710', 'HEAD').trim().split('\n').filter(Boolean)
  BASE = shas.length ? shas[shas.length - 1] + '^' : 'HEAD'
} catch { BASE = null }
{
  const ruins = []
  for (const p of SUP.ARQUIVOS_PROTEGIDOS_FILME_RAPIDO_1710) {
    let base = null
    try { base = git('show', `${BASE}:${p}`).replace(/\r\n/g, '\n') } catch { base = null }
    if (base === null || SUP.semFilmeRapido1710(semFilmesF1F4_1910(desfazApresentadorV2Libera1910(p, rd(p, true)), p), p) !== base) ruins.push(p) /* KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 */ // reancorado KINEO-APRESENTADOR-V2-LIBERA-1910: era SUP.semFilmeRapido1710(rd(p), p) · reancorado KINEO-FILMES-F1-F4-1910
  }
  checa(`G1 ${SUP.ARQUIVOS_PROTEGIDOS_FILME_RAPIDO_1710.length} arquivos protegidos: desfeitos = base ${String(BASE).slice(0, 10)}`, !!BASE && SUP.ARQUIVOS_PROTEGIDOS_FILME_RAPIDO_1710.length >= 8 && ruins.length === 0, ruins.join(', '))
  checa('G2 o desfaz é idempotente (sem a marca devolve igual) e nunca toca linha sem a marca', SUP.semFilmeRapido1710('a\nb', 'x') === 'a\nb' && SUP.semFilmeRapido1710('a\nb // KINEO-FILME-RAPIDO-1710\nc', 'x') === 'a\nc')
  const assuntos = git('log', '--format=%s', '--grep=KINEO-FILME-RAPIDO-1710', 'HEAD').trim().split('\n').filter(Boolean)
  checa('G3 todo commit da entrega traz a tag da TRAVA 8.2 no assunto', assuntos.length > 0 && assuntos.every((s) => s.includes('[TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]')), assuntos.find((s) => !s.includes('[TRAVA 8.2')) ?? '')
  const topoFR = git('log', '--format=%H', '--grep=KINEO-FILME-RAPIDO-1710', 'HEAD').trim().split('\n').filter(Boolean)[0] || 'HEAD' // reancorado KINEO-APRESENTADOR-V2-LIBERA-1910: mede a entrega até o SEU último commit (as camadas de depois têm guardião próprio)
  const tocados = git('diff', '--name-only', `${BASE}`, topoFR).split('\n').filter(Boolean) // reancorado KINEO-APRESENTADOR-V2-LIBERA-1910: era git('diff', '--name-only', `${BASE}`, 'HEAD')
  checa('G4 nada de preço, créditos, motores, roteiro ou réguas; o apresentador do Ads intocado', !tocados.some((p) => /engineCost|pricing|lib\/credits\/|engineLaunch|lib\/ads\/v2PresenterV2|lib\/ads\/v2Advance\.ts|lib\/ads\/v2Billing|v2Tiers|durationByEngine|speechRate|narrationFit/.test(p)), tocados.filter((p) => /engineCost|pricing|lib\/credits\/|v2PresenterV2|v2Advance\.ts/.test(p)).join(', '))
}

// ═══ M. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (aplicados e VERMELHOS)')
const troca = (s, de, para) => { if (!s.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 60)); return s.replace(de, para) }
{
  const mut = troca(rd(STATUS), '        if (!adiarEntrega) await copiarParaOBucket()', '        await copiarParaOBucket()')
  const r = await rodarStatus({ fonte: mut })
  checa('M1 "copia antes de responder" volta: a resposta espera a cópia → A1 VERMELHO', mut !== rd(STATUS) && !(r.antesDaCopia.respondeu && !r.antesDaCopia.copiaTerminou))
}
{
  const mut = troca(rd(STATUS), "const adiarEntrega = !isServiceFinish && req.nextUrl.searchParams.get('rapido') === '1'", "const adiarEntrega = req.nextUrl.searchParams.get('rapido') === '1'")
  const r = await rodarStatus({ fonte: mut, servico: true })
  checa('M2 cron adiando a entrega (e-mail disputado) → A9 VERMELHO', !( !r.antesDaCopia.respondeu && r.pendentes === 0))
}
{
  const mut = troca(LEASE_SRC, "    if (ins.error.code !== '23505') return { ok: false, motivo: 'erro_de_banco' }", "    if (ins.error.code === '23505') return { ok: true, dono, liberar }\n    if (ins.error.code !== '23505') return { ok: false, motivo: 'erro_de_banco' }")
  const L = lease(mut)
  const b = bancoComChave()
  const vs = await Promise.all([L.tomarVezDoCron(b.db, 'x', 1000, agora), L.tomarVezDoCron(b.db, 'x', 1000, agora)])
  checa('M3 trava que ignora a chave primária: duas rodadas juntas → B3 VERMELHO', vs.filter((v) => v.ok).length !== 1)
}
{
  const mut = troca(ANC_SRC, "  const daqui = (r: RegistroDoAquecimento | null) => (r?.musica && r.musica.prompt_sha === shaDoPrompt(a.prompt) ? r.musica : null)", "  const daqui = (r: RegistroDoAquecimento | null) => (r?.musica ? r.musica : null)")
  const A = anc(mut)
  const b = bancoComChave()
  const ped = { generationId: 'gen-MUT00001', userId: 'u', promptMusica: 'P1', voz: null, cenas: [] }
  const res = await A.reservarAquecimento(b.db, ped, Date.now())
  await A.executarAquecimento({ db: b.db, agora: () => Date.now(), submeterLyria: async () => ({ requestId: 'r', statusUrl: 'https://q/s', responseUrl: 'https://q/r' }), esperarLyria: async () => 'https://trilha' }, ped, res.registro)
  const M = A.montagemComAudioDoClique({ db: b.db, generationId: 'gen-MUT00001', lookup: async () => null, esperarLyria: async () => null, orcamentoLyriaMs: 1, dormir: async () => {} })
  checa('M4 trilha reaproveitada com OUTRO prompt (música errada no filme) → C6 VERMELHO', (await M.musica('P2')) !== undefined)
}
{
  const mut = troca(ANC_SRC, "    const ins = await (db.from('events').insert({ id: idDoAquecimento(pedido.generationId),", "    const ins = await (db.from('events').insert({ id: idDoAquecimento(pedido.generationId + Math.random()),")
  const A = anc(mut)
  const b = bancoComChave()
  const ped = { generationId: 'gen-MUT00002', userId: 'u', promptMusica: 'P', voz: null, cenas: [] }
  const r1 = await A.reservarAquecimento(b.db, ped, Date.now())
  const r2 = await A.reservarAquecimento(b.db, ped, Date.now())
  checa('M5 reserva sem id determinístico (2 aquecimentos pagos do mesmo filme) → C1 VERMELHO', !(r1.ok && !r2.ok))
}
{
  const mut = troca(PR_SRC, '  return passou >= 0 && passou < POLL_RAPIDO_JANELA_MS ? rapidoMs : depoisMs', '  return rapidoMs')
  const P = carregar(mut, {}).mod
  checa('M6 polling rápido para sempre (sem recuo, estoura a cota) → D1 VERMELHO', P.intervaloDePoll(0, 600_000, 2500, 5000) !== 5000)
}
{
  const src = rd('lib/strandedRescue.ts')
  const mut = troca(src, 'export const CLIENT_ALIVE_MS = 90 * 1000', 'export const CLIENT_ALIVE_MS = 30 * 1000')
  const S = carregar(mut, {}).mod
  checa('M7 "aba viva" curta demais (o cron montaria por cima de uma aba viva) → B2 VERMELHO', S.clientStillAlive(agora - 65_000, agora) === false)
}

console.log(`\n═══ ${ok} ok · ${falhas.length} falha(s) ═══`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
