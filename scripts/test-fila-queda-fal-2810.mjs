// KINEO-FILA-QUEDA-FAL-2810 — guardião do "estaciona, não perde" (fal sem saldo/capacidade, 28/10: 37 recusas, 12 primeiros filmes
// perdidos). Prova: (A) a decisão de estacionar é estreita — só recusa explícita de saldo/capacidade, POST real, nenhum gasto possível
// (aceita/ambígua nunca), estorno confirmado; (B) o pedido guardado é uma lista fechada sem generationId/dry_run e com teto; (C) a
// retomada: vencido em 24 h, substituído por pedido novo da conta, alugado por 10 min, mais velho primeiro, PARA na primeira recusa
// da fal, teto por passada, ids determinísticos (aluguel, fechamento, generationId da retomada); (D) a rota: modo serviço com o
// contrato do finish-orphan-jobs, cópia do pedido antes de qualquer mutação, estacionamento nas DUAS saídas de zero aceitas, depois
// do estorno e antes da frase antiga, a frase nova diz a verdade do dinheiro; (E) alarme do fundador: 1/h, em PT, com hora BRT,
// placar e recarga manual — nunca recarga automática, fora do finalizarDespacho; (F) resgate honesto: 'just refunded' e a frase do
// estacionado são "não é defeito", fal fora em 2 h cala o 'bug', última falha = fornecedor sai; (G) vercel.json agenda o cron com
// ?confirm=SEND; (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-fila-queda-fal-2810.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const MARCA = 'KINEO-FILA-QUEDA-FAL-2810'
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const F = {
  lib: 'lib/filaQuedaFal.ts',
  server: 'lib/filaQuedaFalServer.ts',
  route: 'app/api/generate-video-cinematic/route.ts',
  cron: 'app/api/cron/resume-parked-renders/route.ts',
  recovery: 'app/api/cron/send-failure-recovery/route.ts',
  vercel: 'vercel.json',
}

/** Compila um módulo TS SEM imports (o lib é puro de propósito); `over` troca a fonte (mutantes). */
function load(rel, over = {}) {
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', js)(() => { throw new Error(rel + ': import inesperado') }, mod, mod.exports)
  return mod.exports
}
/** A decisão REAL do cron de resgate: o recorte NAO_E_BUG…classifyFailure, como scripts/test-resgate-defeito.mjs compila. */
function loadEhDefeito(src) {
  const ini = src.indexOf('const NAO_E_BUG = [')
  const fim = src.indexOf('function classifyFailure')
  const recorte = src.slice(ini, fim) + '\nexport { NAO_E_BUG, ehDefeito }\n'
  const js = ts.transpileModule(recorte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', js)(() => { throw new Error('import inesperado') }, mod, mod.exports)
  return mod.exports
}

const rej = (reason_class) => ({ disposition: 'explicit_reject', reason_class })
const H = 3600_000

/** Todas as provas sobre um conjunto de fontes; devolve a lista de erros (vazia = verde). */
function checa(over = {}) {
  const e = []
  const src = (k) => over[F[k]] ?? read(F[k])
  let L
  try { L = load(F.lib, over) } catch (err) { return ['lib não carrega: ' + err.message] }

  // (A) estacionar — estreito
  const park = (outcomes, extra = {}) => L.decidirEstacionamento({ outcomes, totalPosts: 3, released: true, ...extra })
  if (!(park([rej('balance_quota'), rej('balance_quota'), rej('balance_quota')]).park)) e.push('3 recusas de saldo não estacionam')
  if (park([rej('balance_quota'), rej('balance_quota')]).reason !== 'balance_quota') e.push('motivo de saldo não é balance_quota')
  if (!(park([rej('rate_limit'), rej('rate_limit')]).park) || park([rej('rate_limit')]).reason !== 'capacity') e.push('429 (capacidade) não estaciona como capacity')
  if (park([rej('balance_quota'), rej('rate_limit')]).reason !== 'balance_quota') e.push('saldo + capacidade: saldo deve dominar')
  if (park([rej('balance_quota'), { disposition: 'accepted', reason_class: 'ok' }]).park) e.push('cena ACEITA (gasto possível) estacionou')
  if (park([rej('balance_quota'), { disposition: 'ambiguous', reason_class: 'transport_timeout_5xx' }]).park) e.push('cena AMBÍGUA (503, job pode existir) estacionou')
  if (park([rej('balance_quota'), rej('auth_model_access')]).park) e.push('recusa de acesso misturada estacionou')
  if (park([rej('provider_moderation')]).park || park([rej('invalid_payload')]).park || park([rej('unknown')]).park) e.push('classe que não é saldo/capacidade estacionou')
  if (park([rej('balance_quota')], { released: false }).park) e.push('estacionou SEM estorno confirmado')
  if (park([rej('balance_quota')], { totalPosts: 0 }).park) e.push('estacionou sem POST (plano vazio/defeito nosso)')
  if (park([]).park || park([undefined, null]).park) e.push('estacionou sem desfecho de cena')
  if (park([{ disposition: 'not_attempted', reason_class: 'unknown' }]).park) e.push('cena nunca tentada estacionou')
  if (!(L.PARKABLE_REASONS.has('balance_quota') && L.PARKABLE_REASONS.has('rate_limit') && L.PARKABLE_REASONS.size === 2)) e.push('PARKABLE_REASONS ≠ {balance_quota, rate_limit}')
  if (/transport_timeout_5xx/.test(String([...L.PARKABLE_REASONS]))) e.push('5xx ambíguo entrou nas classes estacionáveis')

  // (B) pedido fechado
  const pedido = L.pedidoEstacionavel({ generationId: 'g1', dry_run: true, prompt: '  A story  ', duration: 35, engine: 'seedance', language: 'en', aspect: '9:16', script_mode: 'verbatim', vertical: 'mystery', kids_cartoon: 'baby', brollScenes: [{ sceneNumber: 1 }], globalStyle: { mood: 'dark' }, estrela: { paths: ['x'] }, hacker: 'nope', characterId: 'c1' })
  if (!pedido || pedido.prompt !== 'A story' || pedido.duration !== 35 || pedido.engine !== 'seedance' || pedido.script_mode !== 'verbatim') e.push('pedido não guardou prompt/duração/motor/modo')
  if (pedido && ('generationId' in pedido || 'dry_run' in pedido || 'hacker' in pedido)) e.push('pedido vazou generationId/dry_run/campo desconhecido')
  if (pedido && (!Array.isArray(pedido.brollScenes) || pedido.globalStyle?.mood !== 'dark' || pedido.characterId !== 'c1' || pedido.kids_cartoon !== 'baby')) e.push('pedido perdeu b-roll/estilo/personagem/desenho')
  if (L.pedidoEstacionavel({ prompt: '', duration: 35 }) !== null || L.pedidoEstacionavel({ prompt: 'x', duration: 0 }) !== null || L.pedidoEstacionavel(null) !== null) e.push('pedido inválido não devolveu null')
  if (L.pedidoEstacionavel({ prompt: 'x'.repeat(L.PARKED_PROMPT_MAX + 1), duration: 35 }) !== null) e.push('prompt acima do teto foi guardado')
  const corpo = L.corpoDaRetomada({ prompt: 'p', duration: 35, engine: 'kling' }, 'parked-abc')
  if (corpo.generationId !== 'parked-abc' || corpo.prompt !== 'p' || corpo.engine !== 'kling') e.push('corpo da retomada não leva o pedido + id novo')
  if (!/^[A-Za-z0-9_-]{8,100}$/.test('parked-' + 'a'.repeat(24))) e.push('id da retomada fora do formato de validCinematicGenerationId')

  // (C) retomada
  const base = { parkedAtMs: 0, nowMs: 5 * 60_000, closed: false, newerDispatch: false, openLeaseAtMs: null }
  if (L.decidirRetomada(base) !== 'resume') e.push('estacionado fresco não retoma')
  if (L.decidirRetomada({ ...base, closed: true, nowMs: 30 * H }) !== 'closed') e.push('fechado não vence tudo')
  if (L.decidirRetomada({ ...base, nowMs: 24 * H }) !== 'expired' || L.decidirRetomada({ ...base, nowMs: 23 * H + 59 * 60_000 }) !== 'resume') e.push('vencimento não é exatamente 24 h')
  if (L.PARKED_TTL_MS !== 24 * H) e.push('PARKED_TTL_MS ≠ 24 h')
  if (L.decidirRetomada({ ...base, newerDispatch: true }) !== 'superseded') e.push('pedido novo da conta não descarta o estacionado')
  if (L.decidirRetomada({ ...base, nowMs: 20 * 60_000, openLeaseAtMs: 15 * 60_000 }) !== 'leased') e.push('aluguel aberto recente não segura a tentativa')
  if (L.decidirRetomada({ ...base, nowMs: 30 * 60_000, openLeaseAtMs: 15 * 60_000 }) !== 'resume') e.push('aluguel vencido (10 min) não libera')
  if (L.decidirRetomada({ ...base, nowMs: 25 * H, newerDispatch: true }) !== 'expired') e.push('vencido deve vencer substituído (e-mail honesto)')
  if (!(L.PARKED_MAX_RESUMES_PER_RUN >= 1 && L.PARKED_MAX_RESUMES_PER_RUN <= 3)) e.push('teto por passada fora de 1..3')
  const C = L.classificarRespostaDaRetomada
  if (C(200, { generationId: 'x' }) !== 'started') e.push('2xx não é started')
  if (C(503, { queued: true }) !== 'provider_down' || C(503, { parked: true, queued: true }) !== 'provider_down') e.push('503 queued/parked não para a passada')
  if (C(503, { pending: true }) !== 'retry_later' || C(429, {}) !== 'retry_later' || C(500, {}) !== 'retry_later' || C(0, null) !== 'retry_later' || C(409, { pending: true }) !== 'retry_later') e.push('corrida/pendência/resfriamento/5xx não ficam para a próxima')
  if (C(402, { error: 'needs credits' }) !== 'failed' || C(422, {}) !== 'failed' || C(409, {}) !== 'failed') e.push('4xx terminal não fecha como failed')
  const u = L.uuidDeHex('0123456789abcdef0123456789abcdef')
  if (u !== '01234567-89ab-cdef-0123-456789abcdef' || L.uuidDeHex('ABC') !== 'abc00000-0000-0000-0000-000000000000') e.push('uuidDeHex não é determinístico/formatado')

  // (E) alarme do fundador
  if (!L.deveAlertarFundador({ lastAlertAtMs: null, nowMs: 10 * H })) e.push('primeiro alarme não dispara')
  if (L.deveAlertarFundador({ lastAlertAtMs: 10 * H - 59 * 60_000, nowMs: 10 * H })) e.push('alarme repetiu antes de 1 h')
  if (!L.deveAlertarFundador({ lastAlertAtMs: 10 * H - 60 * 60_000, nowMs: 10 * H })) e.push('alarme não repetiu depois de 1 h')
  if (L.janelaDoAlertaDoFundador(10 * H + 1) !== L.janelaDoAlertaDoFundador(10 * H + 59 * 60_000) || L.janelaDoAlertaDoFundador(10 * H) === L.janelaDoAlertaDoFundador(11 * H)) e.push('janela da reserva não é a hora do relógio')
  const t = L.textoDoAlertaDoFundador({ nowMs: Date.UTC(2026, 9, 28, 6, 40), refusals: 37, parked: 12, engine: 'fal-ai/bytedance/seedance' })
  if (t.subject !== '⛔ fal sem saldo — filmes de clientes parados') e.push('assunto do fundador ≠ pedido')
  if (!t.text.includes('28/10/2026 03:40 BRT')) e.push('hora BRT errada: ' + t.text.split('\n')[2])
  if (!t.text.includes('37') || !t.text.includes('12') || !t.text.includes('seedance')) e.push('placar (recusas/estacionados/motor) não está no corpo')
  if (!t.text.includes('fal.ai → Usage & billing → Credits')) e.push('caminho da recarga manual ausente')
  if (/auto[- ]?top[- ]?up|recarga autom|automatic top/i.test(t.text + t.subject)) e.push('o alarme sugeriu recarga automática (proibido pelo fundador)')
  if (!/^[^\n]*fal[^\n]*$/m.test(t.text) || /\b(please|balance exhausted)\b/i.test(t.text)) e.push('corpo não está em português')
  if (L.FOUNDER_ALERT_GAP_MS !== H) e.push('FOUNDER_ALERT_GAP_MS ≠ 1 h')

  // (F) frase do cliente e resgate honesto
  if (!/paused for a few minutes/.test(L.PARKED_MESSAGE) || !/saved/.test(L.PARKED_MESSAGE) || !/email/.test(L.PARKED_MESSAGE) || !/24 hours/.test(L.PARKED_MESSAGE)) e.push('PARKED_MESSAGE perdeu pausa/salvo/e-mail/24 h')
  if (/credits are held/.test(L.PARKED_MESSAGE) || !/back in your account/.test(L.PARKED_MESSAGE)) e.push('PARKED_MESSAGE mente sobre o dinheiro (o crédito volta no estacionamento e é debitado na retomada)')
  for (const f of L.PARKED_MESSAGE_FRAGMENTS) if (!L.PARKED_MESSAGE.includes(f)) e.push('fragmento NAO_E_BUG fora da frase: ' + f)
  if (!L.recusaDeFornecedor({ reason_histogram: { balance_quota: 3 } }) || !L.recusaDeFornecedor({ reason_histogram: { rate_limit: 1, ok: 2 } }) || !L.recusaDeFornecedor({ balance_exhausted: true })) e.push('recusaDeFornecedor não vê saldo/capacidade')
  if (L.recusaDeFornecedor({ reason_histogram: { ok: 8 } }) || L.recusaDeFornecedor({ reason_histogram: { auth_model_access: 2 } }) || L.recusaDeFornecedor(null)) e.push('recusaDeFornecedor vê fornecedor onde não há')
  if (!L.ultimaFalhaFoiFornecedor({ lastFailureMs: 1000 * 60 * 60, lastProviderRefusalMs: 1000 * 60 * 60 - 1000 }) || !L.ultimaFalhaFoiFornecedor({ lastFailureMs: 100, lastProviderRefusalMs: 100 + 60_000 })) e.push('recusa 1 s antes da falha da aba não conta como última')
  if (L.ultimaFalhaFoiFornecedor({ lastFailureMs: 10 * H, lastProviderRefusalMs: 10 * H - 6 * 60_000 }) || L.ultimaFalhaFoiFornecedor({ lastFailureMs: 10 * H, lastProviderRefusalMs: null })) e.push('recusa antiga/nula contou como última falha')
  if (L.RECOVERY_PROVIDER_WINDOW_MS !== 2 * H) e.push('janela de supressão do resgate ≠ 2 h')

  // (D) a rota
  const rota = src('route')
  const cron = src('cron')
  if (!rota.includes("from '@/lib/filaQuedaFal'") || !rota.includes("from '@/lib/filaQuedaFalServer'")) e.push('rota não importa a fila')
  if (!rota.includes("req.headers.get('x-kineo-service-user')") || !rota.includes('`Bearer ${process.env.CRON_SECRET}`') || !rota.includes('supabase.auth.admin.getUserById(serviceUserHeader)')) e.push('modo serviço sem o contrato Bearer CRON_SECRET + x-kineo-service-user + e-mail do auth')
  if (/user = \{ id: serviceUserHeader, email: svcProfile/.test(rota)) e.push('modo serviço leu o e-mail de profiles (editável) em vez do auth')
  const iJson = rota.indexOf('body = await req.json()')
  const iCopia = rota.indexOf('const pedidoEstacionado = pedidoEstacionavel(body)')
  const iMut = rota.indexOf("body.script_mode = 'ai'")
  if (!(iJson > 0 && iCopia > iJson && iCopia - iJson < 400 && iMut > iCopia)) e.push('a cópia do pedido não vem logo depois do req.json() e antes da 1ª mutação do body')
  const iFn = rota.indexOf('const estacionarSePossivel = async (): Promise<NextResponse | null> =>')
  const iRelease = rota.indexOf('releaseActiveBirthClaim = releaseBirthClaim')
  if (!(iFn > iRelease && iRelease > 0)) e.push('estacionarSePossivel não nasce depois do releaseBirthClaim')
  const fn = iFn > 0 ? rota.slice(iFn, rota.indexOf('// Every concurrent generation inserts first', iFn)) : ''
  if (!fn.includes("released: c.claimAction === 'released' && c.refundConfirmed === true")) e.push('estaciona sem exigir claim liberado + estorno confirmado')
  if (!fn.includes('name: PARKED_EVENT') || !fn.includes('session_id: generationId') || !fn.includes('request: pedidoEstacionado') || !fn.includes('refunded: true')) e.push('render_parked sem pedido/generationId/refunded')
  if (!fn.includes('country: paisDoRequest(req.headers)')) e.push('render_parked sem o país do clique (a cota grátis por país decidiria diferente na retomada)')
  if (!cron.includes("'x-kineo-service-country': country") || !cron.includes("serviceHeaders(userId, typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null)")) e.push('cron não manda o país do clique (x-kineo-service-country)')
  if (!fn.includes("if (parkErr) { console.error('[cinematic] KINEO-FILA-QUEDA-FAL-2810: render_parked não gravado (resposta de sempre):', parkErr.message); return null }")) e.push('linha não gravada precisa cair na resposta de sempre')
  if (!fn.includes('queued: true, parked: true, error: PARKED_MESSAGE') || !/status: 503/.test(fn)) e.push('resposta do estacionado ≠ 503 queued+parked com PARKED_MESSAGE')
  const chamadas = rota.split('await estacionarSePossibleOuNada').length // placeholder nunca presente: só para manter a contagem abaixo honesta
  const usos = (rota.match(/await estacionarSePossivel\(\)/g) ?? []).length
  if (usos !== 2 || chamadas !== 1) e.push(`estacionarSePossivel deve ser chamado em exatamente 2 saídas (achei ${usos})`)
  // Hollywood FAILFAST: depois do estorno, só com zero aceitas, antes da frase antiga de saldo
  const iH = rota.indexOf('hollywood FAILFAST: only')
  const iHpark = rota.indexOf('const estacionado = hValid.length === 0 ? await estacionarSePossivel() : null', iH)
  const iHold = rota.indexOf("error: \"We're experiencing high demand right now. Nothing was charged — your credits were refunded automatically. Please try again in a few minutes.\"", iH)
  const iHrel = rota.indexOf("const released = await releaseBirthClaim(ctxDespacho().balanceExhausted ? 'provider_balance_rejected' : 'provider_rejected')", iH)
  if (!(iH > 0 && iHrel > iH && iHpark > iHrel && iHold > iHpark && rota.slice(iHrel, iHpark).includes('if (!released) {'))) e.push('Hollywood: estacionamento fora da ordem estorno → zero aceitas → frase antiga')
  // Clássico zero aceitas: depois do estorno, antes da frase antiga
  const iC = rota.indexOf('if (!hasRenderableClassicScene(falRequestIds)) {')
  const iCpark = rota.indexOf('{ const estacionado = await estacionarSePossivel(); if (estacionado) return estacionado }', iC)
  const iCold = rota.indexOf("error: \"We're experiencing high demand right now. Nothing started and your credits were refunded automatically.\"", iC)
  const iCrel = rota.indexOf('const released = await releaseBirthClaim(', iC)
  if (!(iC > 0 && iCrel > iC && iCpark > iCrel && iCold > iCpark && rota.slice(iCrel, iCpark).includes('if (!released) {'))) e.push('Clássico: estacionamento fora da ordem estorno → frase antiga')
  // O ramo PARCIAL (saldo com cenas aceitas = gasto) segue sem estacionar
  const iP = rota.indexOf("releaseBirthClaim('provider_balance_rejected_partial')")
  if (!(iP > 0 && !rota.slice(iP, iP + 1500).includes('estacionarSePossivel'))) e.push('ramo parcial (cenas aceitas) não pode estacionar')
  // Alarme do fundador: no wrapper POST, depois do finalizador, fora dele (o finalizador tem guardião próprio e executa a fatia real)
  const iFin = rota.indexOf('async function finalizarDespacho(ctx: DispatchContext, res: Response): Promise<void> {')
  const corpoFin = rota.slice(iFin, rota.indexOf('\n}\n', iFin))
  if (corpoFin.includes('alertarFundadorFalSemSaldo')) e.push('alarme horário entrou dentro de finalizarDespacho (quebra a fatia real do guardião de 28/09)')
  if (!/await finalizarDespacho\(ctx, res\)\n\s*if \(ctx\.balanceExhausted\) await alertarFundadorFalSemSaldo\(\{ engine: ctx\.engine \}\)/.test(rota)) e.push('alarme horário não roda logo depois de finalizarDespacho, guardado por ctx.balanceExhausted')
  if (/to:\s*\['[^']*@/.test(rota) || rota.includes('api.resend.com')) e.push('e-mail cravado na rota')

  // (E2) o lado servidor do alarme
  const srv = src('server')
  if (!srv.includes("import { notifyFounder } from '@/lib/supplier/notify'") || !srv.includes('emailOnly: true')) e.push('alarme do fundador não sai por notifyFounder só-e-mail (Resend, KINEO_ALERT_EMAIL)')
  if (/@gmail\.com|api\.resend\.com/.test(srv)) e.push('e-mail/Resend cravados no alarme')
  if (!srv.includes(".eq('name', FOUNDER_FAL_ALERT_EVENT).order('created_at', { ascending: false }).limit(1)") || !srv.includes('deveAlertarFundador(')) e.push('throttle não lê o último founder_alert_fal_balance')
  if (!srv.includes("code === '23505' ? 'duplicate'") || !srv.includes('id: idDoAlertaDoFundador(nowMs)') && !srv.includes('const id = idDoAlertaDoFundador(nowMs)')) e.push('reserva determinística por hora ausente (corrida entre lambdas)')
  if (!srv.includes('FOUNDER_ALERT_TIMEOUT_MS = 3000') || !srv.includes('Promise.race')) e.push('alarme sem teto de 3 s')
  if (/auto[- ]?top[- ]?up|recarga autom/i.test(srv)) e.push('lado servidor sugere recarga automática')

  // (C2) o cron de retomada (lido acima para a prova do país)
  // Por HTTP, nunca em processo: ninguém importa a rota cinematic (scripts/test-llm-fallback-2026-09-28.mjs — chunk compartilhado quebra a trava pela pilha)
  if (/generate-video-cinematic\/route['"]/.test(cron)) e.push('cron importa a rota cinematic (proibido: webpack a manda para chunk compartilhado)')
  if (!cron.includes('await fetch(`${APP_URL}/api/generate-video-cinematic`, { method: \'POST\', headers: serviceHeaders(userId,') || !cron.includes("cache: 'no-store', signal: AbortSignal.timeout(RESUME_TIMEOUT_MS)")) e.push('cron não chama a rota por HTTP com teto e sem cache')
  if (!cron.includes("'x-kineo-service-user': userId") || !cron.includes('authorization: `Bearer ${process.env.CRON_SECRET}`')) e.push('cron sem os cabeçalhos do modo serviço')
  if (!rota.includes("const svcCountry = (req.headers.get('x-kineo-service-country') ?? '').trim().toUpperCase()") || !rota.includes("h.set('x-vercel-ip-country', svcCountry); req = new NextRequest(req.url, { method: req.method, headers: h, body: await req.text() })")) e.push('a rota não repõe o país do clique em modo serviço (a Vercel reescreve x-vercel-ip-country)')
  if (!cron.includes(".order('created_at', { ascending: true })")) e.push('cron não lê mais velho primeiro')
  if (!cron.includes("export const fetchCache = 'force-no-store'")) e.push('cron sem force-no-store (Data Cache → retomada dupla)')
  if (!cron.includes('const leaseId = idDoAluguel(genId, attempt)') || !cron.includes('id: leaseId, user_id: userId, name: PARKED_LEASE_EVENT') || !cron.includes("code === '23505'")) e.push('aluguel por tentativa sem id determinístico/23505')
  if (!cron.includes('id: idDoFechamento(genId)')) e.push('fechamento sem id determinístico (e-mail duplicado em rodadas simultâneas)')
  if (!cron.includes("else if (outcome === 'provider_down') providerDown = true") || !cron.includes("if (providerDown) { results.push({ generation: g8, decision: 'provider_down_wait' }); continue }")) e.push('a passada não PARA na primeira recusa da fal')
  if (!cron.includes('if (resumed >= PARKED_MAX_RESUMES_PER_RUN)')) e.push('sem teto por passada')
  if (!cron.includes("startsWith('parked-')")) e.push('a própria retomada contaria como pedido novo da pessoa (superseded falso)')
  if (!cron.includes("decision === 'expired' && pedido) email = await enviarEmail(admin, userId, 'expired'")) e.push('vencido sem e-mail honesto')
  if (!cron.includes("if (f === 'novo') email = await enviarEmail(admin, userId, 'failed'")) e.push('4xx terminal sem e-mail honesto (e só no 1º fechamento)')
  if (!/Nothing was charged/.test(cron) || /credits were held|will be charged now/.test(cron)) e.push('e-mail do vencido não diz a verdade do dinheiro')
  if (!cron.includes("if (!confirm) return 'dry_run'")) e.push('e-mails saem sem ?confirm=SEND')
  if (!cron.includes('export const maxDuration = 300')) e.push('cron sem tempo para um despacho inteiro')
  if (!cron.includes('if (decision === \'closed\' || decision === \'leased\')')) e.push('fechado/alugado não são pulados')

  // (F2) o cron de resgate
  const rec = src('recovery')
  let D
  try { D = loadEhDefeito(rec) } catch (err) { e.push('recorte NAO_E_BUG…classifyFailure não compila sozinho: ' + err.message); D = null }
  if (D) {
    if (D.ehDefeito('Two AI attempts were just refunded. Please wait a few minutes before starting another one.') !== false) e.push('resfriamento "just refunded" ainda é defeito (os 2 e-mails falsos de 28/10 08:00)')
    if (D.ehDefeito(L.PARKED_MESSAGE) !== false) e.push('a frase do estacionado é lida como defeito')
    if (D.ehDefeito("We're experiencing high demand right now. Nothing started and your credits were refunded automatically.") !== false) e.push('alta demanda voltou a ser defeito')
    if (D.ehDefeito('Our video provider did not accept the job — this is on our side, not yours. Nothing started, your credits were refunded automatically.') !== true) e.push('confissão explícita deixou de ser defeito')
    for (const f of L.PARKED_MESSAGE_FRAGMENTS) if (!D.NAO_E_BUG.includes(f)) e.push('NAO_E_BUG sem o literal ' + f + ' (= PARKED_MESSAGE_FRAGMENTS)')
  }
  if (!rec.includes("import { RECOVERY_PROVIDER_WINDOW_MS, recusaDeFornecedor, ultimaFalhaFoiFornecedor } from '@/lib/filaQuedaFal'")) e.push('resgate não importa a decisão de fornecedor')
  if (!rec.includes(".eq('name', 'cinematic_dispatch_result').gte('created_at', desdeFornecedor)") || !rec.includes(".eq('name', 'fal_balance_exhausted').gte('created_at', desdeFornecedor)")) e.push('resgate não lê a verdade do servidor (despacho + alarme de saldo) nas últimas 2 h')
  if (!rec.includes("if (ultimaFalhaFoiFornecedor({ lastFailureMs: ms, lastProviderRefusalMs: ultimaRecusaPorPessoa.get(id) ?? null }) || (fornecedorCaiu && cls.kind === 'bug')) { caladosPeloFornecedor += 1; continue }")) e.push('a supressão (última falha = fornecedor; fal fora cala o bug) não está no laço dos alvos')
  const iSup = rec.indexOf('if (ultimaFalhaFoiFornecedor(')
  const iPush = rec.indexOf('alvos.push({', iSup)
  if (!(iSup > 0 && iPush > iSup)) e.push('a supressão precisa vir ANTES de alvos.push')
  if (!rec.includes('silenced_by_provider: caladosPeloFornecedor')) e.push('DRY_RUN/SENT não mostram quantos foram calados')

  // (G) vercel.json
  let v
  try { v = JSON.parse(src('vercel')) } catch (err) { e.push('vercel.json inválido: ' + err.message); v = { crons: [] } }
  const entrada = (v.crons ?? []).find((c) => String(c.path).startsWith('/api/cron/resume-parked-renders'))
  if (!entrada || entrada.path !== '/api/cron/resume-parked-renders?confirm=SEND') e.push('vercel.json sem /api/cron/resume-parked-renders?confirm=SEND')
  // A cada ~5 min, fora dos minutos 13 e 23 (o lembrete do cartão recusado em 13 14,22 não pode dividir minuto+hora — test-cartao-recusado-1510; rescue-vendor-assets/courtesy em 23)
  if (entrada && entrada.schedule !== '3,8,18,28,33,38,43,48,53,58 * * * *') e.push('agenda do cron ≠ 3,8,18,28,33,38,43,48,53,58 * * * *: ' + entrada?.schedule)
  if ((v.crons ?? []).filter((c) => String(c.path).startsWith('/api/cron/resume-parked-renders')).length !== 1) e.push('cron duplicado/ausente no vercel.json')
  return e
}

console.log('\n' + MARCA + ' — fontes reais')
const real = checa()
for (const err of real) console.log('  FALHA', err)
ok(real.length === 0, 'todas as provas verdes nas fontes reais (' + (real.length === 0 ? 'sem erros' : real.length + ' erro(s)') + ')')

// (M) mutantes — cada um tem de deixar pelo menos uma prova vermelha
const lib = read(F.lib)
const rota = read(F.route)
const cron = read(F.cron)
const rec = read(F.recovery)
const srv = read(F.server)
const mut = (nome, over) => {
  const antes = Object.values(over).every((v) => typeof v === 'string')
  const erros = antes ? checa(over) : ['mutante mal formado']
  ok(erros.length > 0, 'mutante vermelho: ' + nome + (erros.length ? ' — ' + erros[0] : ''))
}
const troca = (src, de, para, nome) => { if (!src.includes(de)) throw new Error('mutante ' + nome + ': trecho não encontrado: ' + de.slice(0, 80)); return src.replace(de, para) }
console.log('\n' + MARCA + ' — mutantes')
mut('capacidade (429) deixa de estacionar', { [F.lib]: troca(lib, "new Set(['balance_quota', 'rate_limit'])", "new Set(['balance_quota'])", 'm1') })
mut('5xx ambíguo passa a estacionar', { [F.lib]: troca(lib, "new Set(['balance_quota', 'rate_limit'])", "new Set(['balance_quota', 'rate_limit', 'transport_timeout_5xx'])", 'm1b') })
mut('cena ambígua/aceita não impede o estacionamento', { [F.lib]: troca(lib, "if (vistos.some((o) => o.disposition === 'accepted' || o.disposition === 'ambiguous')) return { park: false, reason: null, why: 'provider_spend_possible' }", '', 'm2') })
mut('estaciona sem estorno confirmado', { [F.lib]: troca(lib, "if (!input.released) return { park: false, reason: null, why: 'refund_not_confirmed' }", '', 'm3') })
mut('estaciona sem POST', { [F.lib]: troca(lib, "if (!(input.totalPosts > 0)) return { park: false, reason: null, why: 'no_provider_post' }", '', 'm3b') })
mut('vencimento em 1 h', { [F.lib]: troca(lib, 'export const PARKED_TTL_MS = 24 * 60 * 60 * 1000', 'export const PARKED_TTL_MS = 60 * 60 * 1000', 'm4') })
mut('vencido não vence substituído', { [F.lib]: troca(lib, "  if (input.nowMs - input.parkedAtMs >= PARKED_TTL_MS) return 'expired'\n  if (input.newerDispatch) return 'superseded'", "  if (input.newerDispatch) return 'superseded'\n  if (input.nowMs - input.parkedAtMs >= PARKED_TTL_MS) return 'expired'", 'm4b') })
mut('503 queued vira retry (a passada não para)', { [F.lib]: troca(lib, "if (status === 503 && (j.queued === true || j.parked === true)) return 'provider_down'", '', 'm5') })
mut('alarme do fundador sem throttle', { [F.lib]: troca(lib, 'export const FOUNDER_ALERT_GAP_MS = 60 * 60 * 1000', 'export const FOUNDER_ALERT_GAP_MS = 0', 'm6') })
mut('alarme sugere recarga automática', { [F.lib]: troca(lib, "`O que fazer: ${FOUNDER_ALERT_RECHARGE}.`", "`O que fazer: ${FOUNDER_ALERT_RECHARGE} ou ligue o auto top-up.`", 'm6b') })
mut('alarme sem a hora BRT', { [F.lib]: troca(lib, 'const d = new Date(nowMs - 3 * 60 * 60 * 1000)', 'const d = new Date(nowMs)', 'm6c') })
mut('pedido guarda o generationId antigo', { [F.lib]: troca(lib, 'const out: PedidoEstacionado = { prompt, duration }', "const out: PedidoEstacionado = { prompt, duration, ...(typeof b.generationId === 'string' ? { generationId: b.generationId } as object : {}) }", 'm7') })
mut('frase do cliente promete crédito retido', { [F.lib]: troca(lib, 'Nothing was charged: your credits are back in your account and are only used when it starts.', 'Your credits are held and come back automatically.', 'm8') })
mut("'just refunded' sai do NAO_E_BUG", { [F.recovery]: troca(rec, "  'just refunded',\n", '', 'm9') })
mut('frase do estacionado sai do NAO_E_BUG', { [F.recovery]: troca(rec, "  'Your film is saved',\n", '', 'm9b') })
mut('supressão do fornecedor some do laço', { [F.recovery]: troca(rec, "    if (ultimaFalhaFoiFornecedor({ lastFailureMs: ms, lastProviderRefusalMs: ultimaRecusaPorPessoa.get(id) ?? null }) || (fornecedorCaiu && cls.kind === 'bug')) { caladosPeloFornecedor += 1; continue } // KINEO-FILA-QUEDA-FAL-2810\n", '', 'm10') })
mut('fal fora deixa de calar o bug (só a última falha)', { [F.recovery]: troca(rec, " || (fornecedorCaiu && cls.kind === 'bug')) { caladosPeloFornecedor += 1; continue }", ") { caladosPeloFornecedor += 1; continue }", 'm10b') })
mut('recusa antiga não conta como última falha → folga some', { [F.lib]: troca(lib, 'input.lastProviderRefusalMs >= input.lastFailureMs - 5 * 60 * 1000', 'input.lastProviderRefusalMs >= input.lastFailureMs + 1', 'm10c') })
mut('rota estaciona antes do estorno (Hollywood)', { [F.route]: troca(troca(rota, "        { const estacionado = hValid.length === 0 ? await estacionarSePossivel() : null; if (estacionado) return estacionado } // KINEO-FILA-QUEDA-FAL-2810 — zero aceitas por saldo/capacidade: estaciona (cena aceita = gasto possível, segue o caminho de sempre)\n", '', 'm11'), "        const released = await releaseBirthClaim(ctxDespacho().balanceExhausted ? 'provider_balance_rejected' : 'provider_rejected')\n", "        { const estacionado = hValid.length === 0 ? await estacionarSePossivel() : null; if (estacionado) return estacionado }\n        const released = await releaseBirthClaim(ctxDespacho().balanceExhausted ? 'provider_balance_rejected' : 'provider_rejected')\n", 'm11') })
mut('rota estaciona com cena aceita (Hollywood)', { [F.route]: troca(rota, 'const estacionado = hValid.length === 0 ? await estacionarSePossivel() : null', 'const estacionado = await estacionarSePossivel()', 'm11b') })
mut('rota estaciona sem exigir claim liberado', { [F.route]: troca(rota, "released: c.claimAction === 'released' && c.refundConfirmed === true", 'released: true', 'm12') })
mut('rota promete mesmo sem gravar a linha', { [F.route]: troca(rota, "if (parkErr) { console.error('[cinematic] KINEO-FILA-QUEDA-FAL-2810: render_parked não gravado (resposta de sempre):', parkErr.message); return null }", "if (parkErr) { console.error('[cinematic] KINEO-FILA-QUEDA-FAL-2810: render_parked não gravado (resposta de sempre):', parkErr.message) }", 'm13') })
mut('cópia do pedido depois da mutação do body', { [F.route]: troca(troca(rota, '    const pedidoEstacionado = pedidoEstacionavel(body) // KINEO-FILA-QUEDA-FAL-2810 — a cópia fechada do pedido, ANTES de a rota mexer no body (script_mode do monumento etc.); null = não estaciona\n', '', 'm14'), "      body.script_mode = 'ai' // KINEO-MONUMENTO-2026-10-13", "      body.script_mode = 'ai' // KINEO-MONUMENTO-2026-10-13\n      var pedidoEstacionado = pedidoEstacionavel(body)", 'm14') })
mut('modo serviço lê e-mail de profiles', { [F.route]: troca(rota, "const { data: svcUser } = await supabase.auth.admin.getUserById(serviceUserHeader) // KINEO-FILA-QUEDA-FAL-2810\n      user = svcUser?.user ? { id: svcUser.user.id, email: svcUser.user.email ?? null } : null // KINEO-FILA-QUEDA-FAL-2810", "const { data: svcProfile } = await supabase.from('profiles').select('email').eq('id', serviceUserHeader).maybeSingle()\n      user = { id: serviceUserHeader, email: svcProfile?.email ?? null }", 'm15') })
mut('alarme horário entra no finalizarDespacho', { [F.route]: troca(troca(rota, '    if (ctx.balanceExhausted) await alertarFundadorFalSemSaldo({ engine: ctx.engine }) // KINEO-FILA-QUEDA-FAL-2810 — 1 e-mail/hora em PT com o placar (teto 3 s, nunca lança); o de 6 h do falAlert segue no finalizador\n', '', 'm16'), '  if (ctx.balanceExhausted) {\n    await alertFalExhausted({', '  if (ctx.balanceExhausted) {\n    await alertarFundadorFalSemSaldo({ engine: ctx.engine })\n    await alertFalExhausted({', 'm16') })
mut('cron não para na recusa da fal', { [F.cron]: troca(cron, "else if (outcome === 'provider_down') providerDown = true", '', 'm17') })
mut('cron sem aluguel determinístico', { [F.cron]: troca(cron, 'const leaseId = idDoAluguel(genId, attempt)', 'const leaseId = crypto.randomUUID()', 'm18') })
mut('cron fecha sem id determinístico (e-mail duplicado)', { [F.cron]: troca(cron, 'id: idDoFechamento(genId)', 'id: undefined', 'm19') })
mut('cron mais novo primeiro', { [F.cron]: troca(cron, ".order('created_at', { ascending: true })", ".order('created_at', { ascending: false })", 'm20') })
mut('cron conta a própria retomada como pedido novo', { [F.cron]: troca(cron, "    if (String((d.metadata as { generation_id?: unknown } | null)?.generation_id ?? '').startsWith('parked-')) continue\n", '', 'm21') })
mut('cron esquece o país do clique', { [F.cron]: troca(cron, "...(country ? { 'x-kineo-service-country': country } : {})", '', 'm22b') })
mut('cron importa a rota em processo', { [F.cron]: troca(cron, "import {\n  PARKED_EVENT,", "import { POST as cinematicPost } from '@/app/api/generate-video-cinematic/route'\nimport {\n  PARKED_EVENT,", 'm22c') })
mut('rota ignora o país do clique em modo serviço', { [F.route]: troca(rota, "h.set('x-vercel-ip-country', svcCountry); req = new NextRequest(req.url, { method: req.method, headers: h, body: await req.text() })", 'void h', 'm22d') })
mut('cron sem teto por passada', { [F.cron]: troca(cron, "if (resumed >= PARKED_MAX_RESUMES_PER_RUN) { results.push({ generation: g8, decision: 'deferred_budget' }); continue }", '', 'm22') })
mut('e-mails do cron sem ?confirm=SEND', { [F.cron]: troca(cron, "if (!confirm) return 'dry_run'", '', 'm23') })
mut('alarme servidor sem reserva por hora (23505)', { [F.server]: troca(srv, "if (reservaErr) return (reservaErr as { code?: string }).code === '23505' ? 'duplicate' : 'error'", "if (reservaErr) return 'error'", 'm24') })
mut('alarme servidor manda pelo webhook também (não só e-mail)', { [F.server]: troca(srv, 'emailOnly: true', 'emailOnly: false', 'm25') })
mut('vercel.json sem o cron', { [F.vercel]: read(F.vercel).replace('/api/cron/resume-parked-renders?confirm=SEND', '/api/cron/resume-parked-renders') })

console.log(`\n${MARCA}: ${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
