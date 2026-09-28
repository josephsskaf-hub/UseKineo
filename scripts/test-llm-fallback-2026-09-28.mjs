// KINEO-PLANO-B-OPENAI-2026-09-28 — guardião do plano B quando a OpenAI cai.
// O caso: 26/09 16:22Z → 27/09 ~08:35Z a conta da OpenAI ficou sem crédito ("429 You have no credits remaining");
// 59 tentativas bloqueadas no roteiro, de 9 pessoas externas (47 no escritor de cenas do Kineo 1, 12 no generate-script),
// 8 delas sem nenhum filme entregue na vida. Este guardião EXECUTA o código real — lib/openai.ts (o Proxy), lib/llmFallback.ts
// (o embrulho), o SDK openai de verdade com uma rede falsa (api.openai.com × fal.run), lib/ttsFallback.ts, as duas fatias
// de TTS do /api/compose e a sonda /api/admin/llm-fallback-probe — e prova:
//   (a) o plano B de texto só entra em 429/5xx/conexão (nunca 400/401/422), só se a primária falhou em < 8 s, só com o
//       interruptor ligado e FAL_KEY presente; manda o MESMO corpo com 'openai/' + model para o roteador da fal com
//       Authorization "Key <FAL_KEY>"; grava `llm_fallback_used` e ainda avisa o fundador; se a fal falhar, relança o
//       erro ORIGINAL; chamada com stream passa direto; o resto do cliente não muda; nenhuma chave vaza em log/evento;
//   (b) a voz reserva usa o schema exato da rota /audio (prompt + output_format 'url' + language_boost 'auto') e só
//       entra em apagão com FAL_KEY; no compose, o 502 vira narração da fal, o corretivo vai direto ao plano B, e a voz
//       reserva fica fora do cache de voz e do passe corretivo;
//   (c) a sonda só abre para admin, não grava evento de uso e devolve {ok, model, ms, sample} sem segredo;
//   (d) REVISÃO ADVERSARIAL 28/09 — os três defeitos que ela achou, cada um com a verificação que o teria pego:
//       (d1) a estrada hollywood (Kling 3/H3/Omni/S25) fica SEM plano B de texto: o planejador REAL de
//            lib/hollywood/router.ts sob 429 relança o erro original ANTES do POST pago (senão a fal salvava o
//            planejador, os clipes eram pagos e o filme morria na narração hollywood, que só tem a voz da OpenAI) —
//            pela marca do prompt E pela rota lida da pilha; o Kineo 1 e o generate-script seguem com o plano B;
//       (d2) no corretivo do compose a MiniMax é tentada no máximo UMA vez por render (eram até 2 × 90 s);
//       (d3) evento + e-mail do plano B de VOZ têm o mesmo teto de 2,5 s do texto (eram aguardados sem teto).
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const requireRaiz = createRequire(join(RAIZ, 'package.json'))
const OpenAIMod = requireRaiz('openai')
const OpenAI = OpenAIMod.default ?? OpenAIMod.OpenAI ?? OpenAIMod
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHA ' + n) } }

const FAL_KEY = 'fal-teste-chave-0928'
const OPENAI_KEY = 'sk-teste-primaria-0928'
const BASE_FAL = 'https://fal.run/openrouter/router/openai/v1'
const CHUNK = '/var/task/.next/server/chunks/5123.js'
const ROTA = '/var/task/.next/server/app/api/generate-script/route.js'
const TS_OPTS = { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }

const consoleFalso = (logs) => {
  const put = (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x) } catch { return String(x) } })())).join(' '))
  return { log: put, warn: put, error: put, info: put, debug: put }
}
function carregar(src, { filename = CHUNK, reqs = {}, env = {}, logs = [], relogio, rede, timers } = {}) {
  const js = ts.transpileModule(src, TS_OPTS).outputText
  const module = { exports: {} }
  const require = (id) => { if (Object.prototype.hasOwnProperty.call(reqs, id)) return reqs[id]; throw new Error(`require não mapeado: ${id}`) }
  // (d3) `timers` troca o setTimeout do módulo por um que registra o atraso pedido e dispara já (teto de 2,5 s sem esperar 2,5 s)
  const ctx = { module, exports: module.exports, require, console: consoleFalso(logs), process: { env }, Buffer, setTimeout: timers?.setTimeout ?? setTimeout, clearTimeout: timers?.clearTimeout ?? clearTimeout, Promise, Headers, Response, AbortSignal }
  if (relogio) ctx.Date = relogio
  if (rede) ctx.fetch = rede
  vm.runInNewContext(js, ctx, { filename })
  return module.exports
}
const jsonRes = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
const semCredito = () => jsonRes(429, { error: { message: 'You have no credits remaining. Add credits to continue.', type: 'insufficient_quota', code: 'insufficient_quota' } }, { 'retry-after-ms': '1' })
const conclusao = (content) => jsonRes(200, { id: 'gen-1', object: 'chat.completion', created: 1, model: 'openai/gpt-4o', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }] })
const erroApi = (status, message) => OpenAI.APIError.generate(status, { error: { message } }, undefined, {})

const SRC_LF = rd('lib/llmFallback.ts')
const SRC_OPENAI = rd('lib/openai.ts')
const SRC_ALERTA = rd('lib/openaiAlert.ts')
const SRC_TTS = rd('lib/ttsFallback.ts')
const SRC_PARSER = rd('lib/scriptParser.ts')

// ── um mundo: SDK real com rede falsa, lib/openai + lib/llmFallback reais, evento e alarme espionados ──
// (d3) efeitosTravados: o evento e o e-mail são registrados mas nunca terminam (Supabase/Resend presos no apagão)
const travado = () => new Promise(() => {})
function mundo({ primaria, fal = () => conclusao('{"ok":true}'), env = { OPENAI_API_KEY: OPENAI_KEY, FAL_KEY }, srcLf = SRC_LF, efeitosTravados = false, timers } = {}) {
  const logs = [], eventos = [], alertas = []
  const chamadas = { primaria: [], fal: [] }
  let agora = 1_000_000
  class Relogio extends Date { static now() { return agora } }
  const avanca = (ms) => { agora += ms }
  const rede = async (url, init) => {
    const u = String(url)
    const headers = new Headers(init?.headers ?? {})
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    if (u.startsWith('https://api.openai.com/')) { chamadas.primaria.push({ url: u, headers, body }); return primaria({ avanca, n: chamadas.primaria.length, body }) }
    if (u.startsWith(BASE_FAL)) { chamadas.fal.push({ url: u, headers, body }); return fal({ n: chamadas.fal.length, body }) }
    throw new Error('rede inesperada: ' + u)
  }
  class OpenAITeste extends OpenAI { constructor(o = {}) { super({ ...o, fetch: rede }) } }
  const alertaReal = carregar(SRC_ALERTA, { reqs: { openai: OpenAITeste }, env, logs })
  const alertaSpy = { ...alertaReal, alertOpenAiExhausted: async (context, kind) => { alertas.push({ context, kind }); if (efeitosTravados) await travado() } }
  const lf = carregar(srcLf, {
    reqs: { openai: OpenAITeste, '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); if (efeitosTravados) await travado(); return true } }, '@/lib/openaiAlert': alertaSpy },
    env, logs, relogio: Relogio, timers,
  })
  const lib = carregar(SRC_OPENAI, { reqs: { openai: OpenAITeste, '@/lib/llmFallback': lf }, env, logs })
  const rota = carregar('exports.POST = (openai, body, opts) => openai.chat.completions.create(body, opts)', { filename: ROTA })
  return { openai: lib.openai, lf, rota, logs, eventos, alertas, chamadas, env, avanca }
}
const tenta = async (p) => { try { return { valor: await p } } catch (erro) { return { erro } } }
const CORPO_SCRIPT = { model: 'gpt-4o', temperature: 0.7, max_tokens: 700, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Write a script.' }, { role: 'user', content: 'the ocean' }] }
const semChave = (m) => !JSON.stringify({ logs: m.logs, eventos: m.eventos, alertas: m.alertas }).includes(FAL_KEY) && !JSON.stringify({ logs: m.logs, eventos: m.eventos }).includes(OPENAI_KEY)

console.log('== (a) plano B de texto: 429 sem crédito (o 26/09) sai pela fal ==')
{
  const m = mundo({ primaria: () => semCredito() })
  const r = await tenta(m.rota.POST(m.openai, CORPO_SCRIPT, { timeout: 35_000, maxRetries: 0 }))
  const f = m.chamadas.fal[0]
  const { model: mf, ...restoFal } = f?.body ?? {}
  const { model: mp, ...restoPrim } = CORPO_SCRIPT
  checa('a chamada do generate-script (gpt-4o, maxRetries 0) devolve a resposta da fal em vez do 429', r.valor?.choices?.[0]?.message?.content === '{"ok":true}')
  checa(`primária chamada igual (1 vez, maxRetries 0, mesmo corpo) e o plano B 1 vez (${m.chamadas.primaria.length}/${m.chamadas.fal.length})`, m.chamadas.primaria.length === 1 && m.chamadas.fal.length === 1 && JSON.stringify(m.chamadas.primaria[0].body) === JSON.stringify(CORPO_SCRIPT))
  checa(`plano B vai ao roteador da fal (${f?.url})`, f?.url === `${BASE_FAL}/chat/completions`)
  checa('autenticação da fal é "Key <FAL_KEY>" (o defaultHeaders vence o Bearer do SDK)', f?.headers.get('authorization') === `Key ${FAL_KEY}`)
  checa("modelo com prefixo 'openai/' (gpt-4o → openai/gpt-4o) e o resto do corpo idêntico", mf === 'openai/gpt-4o' && mp === 'gpt-4o' && JSON.stringify(restoFal) === JSON.stringify(restoPrim))
  const ev = m.eventos[0]
  checa('evento llm_fallback_used gravado com model, fallback_model, primary_status 429 e ms', m.eventos.length === 1 && ev.name === 'llm_fallback_used' && ev.metadata.model === 'gpt-4o' && ev.metadata.fallback_model === 'openai/gpt-4o' && ev.metadata.primary_status === 429 && typeof ev.metadata.ms === 'number' && typeof ev.metadata.primary_ms === 'number')
  checa(`a rota que chamou é lida da pilha real (${ev?.metadata?.route}) e vai no path do evento`, ev?.metadata?.route === '/api/generate-script' && ev?.path === '/api/generate-script')
  checa('o fundador AINDA é avisado, como sem crédito (kind quota) e com "PLANO B" no contexto', m.alertas.length === 1 && m.alertas[0].kind === 'quota' && /PLANO B ATIVO/.test(m.alertas[0].context))
  checa('nenhuma chave (fal ou OpenAI) aparece em log, evento ou alarme', semChave(m))
}
{
  const m = mundo({ primaria: () => semCredito() })
  const r = await tenta(m.openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'x' }] }))
  checa('gpt-4o-mini vira openai/gpt-4o-mini (e o retry do SDK na primária continua: 2 chamadas com o maxRetries 1 do cliente)', !r.erro && m.chamadas.fal[0]?.body?.model === 'openai/gpt-4o-mini' && m.chamadas.primaria.length === 2)
}

console.log('== (a) 5xx e conexão também são apagão ==')
for (const status of [500, 502, 503]) {
  const m = mundo({ primaria: () => jsonRes(status, { error: { message: 'upstream error' } }, { 'retry-after-ms': '1' }) })
  const r = await tenta(m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { timeout: 35_000 }))
  checa(`${status}: plano B salva a chamada, evento com primary_status ${status}, alarme kind hang`, !r.erro && m.chamadas.fal.length === 1 && m.eventos[0]?.metadata?.primary_status === status && m.alertas[0]?.kind === 'hang')
}
{
  const m = mundo({ primaria: () => { throw new TypeError('fetch failed') } })
  const r = await tenta(m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { timeout: 35_000 }))
  checa("conexão caída (fetch failed → APIConnectionError): plano B salva, primary_status 'connection'", !r.erro && m.chamadas.fal.length === 1 && m.eventos[0]?.metadata?.primary_status === 'connection')
}

console.log('== (a) 400/401/403/404/422 NUNCA vão para o plano B ==')
for (const [status, msg] of [[400, 'Invalid response_format'], [401, 'Incorrect API key provided'], [403, 'forbidden'], [404, 'model not found'], [422, 'content policy refusal']]) {
  const m = mundo({ primaria: () => jsonRes(status, { error: { message: msg } }) })
  const r = await tenta(m.openai.chat.completions.create({ ...CORPO_SCRIPT }))
  checa(`${status}: o erro original volta (status ${status}, instância do SDK), fal 0 chamadas, 0 eventos, 0 alarmes`, r.erro instanceof OpenAI.APIError && r.erro.status === status && m.chamadas.fal.length === 0 && m.eventos.length === 0 && m.alertas.length === 0)
}

console.log('== (a) o corte de 8 s protege o orçamento da rota ==')
{
  const lento = mundo({ primaria: ({ avanca }) => { avanca(8_001); return semCredito() } })
  const r1 = await tenta(lento.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))
  checa('primária falhou em 8,001 s: sem plano B, o 429 original volta, fal 0', r1.erro?.status === 429 && /no credits/.test(r1.erro?.message ?? '') && lento.chamadas.fal.length === 0 && lento.eventos.length === 0)
  const rapido = mundo({ primaria: ({ avanca }) => { avanca(7_999); return semCredito() } })
  const r2 = await tenta(rapido.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))
  checa('primária falhou em 7,999 s: plano B entra', !r2.erro && rapido.chamadas.fal.length === 1)
  checa('o teto é a constante LLM_FALLBACK_MAX_ELAPSED_MS = 8000', rapido.lf.LLM_FALLBACK_MAX_ELAPSED_MS === 8000)
}

console.log('== (a) a fal falhou também: o erro ORIGINAL da OpenAI volta ==')
for (const [nome, fal] of [['fal 404 (id de modelo errado, e a mensagem ecoa a chave)', () => jsonRes(404, { error: { message: `model openai/gpt-4o not found (key ${FAL_KEY})` } })], ['fal 500', () => jsonRes(500, { error: { message: 'router down' } })], ['fal sem rede', () => { throw new TypeError('fetch failed') }]]) {
  const m = mundo({ primaria: () => semCredito(), fal })
  const r = await tenta(m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))
  checa(`${nome}: relança o 429 "no credits" da OpenAI (não o erro da fal), 1 tentativa na fal, 0 eventos, 0 alarmes do embrulho`, r.erro instanceof OpenAI.RateLimitError && r.erro.status === 429 && /no credits/.test(r.erro.message) && m.chamadas.fal.length === 1 && m.eventos.length === 0 && m.alertas.length === 0)
  checa(`${nome}: o log diz que o plano B falhou, sem chave`, m.logs.some((l) => /plano B também falhou/.test(l)) && semChave(m))
}

console.log('== (a) interruptor e FAL_KEY ==')
{
  const src = SRC_LF.replace('export const LLM_FALLBACK_ENABLED = true', 'export const LLM_FALLBACK_ENABLED = false')
  checa('a mutação do interruptor foi aplicada', src !== SRC_LF && src.includes('export const LLM_FALLBACK_ENABLED = false'))
  const m = mundo({ primaria: () => semCredito(), srcLf: src })
  const r = await tenta(m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))
  checa('interruptor desligado: o 429 volta como sempre, fal 0', r.erro?.status === 429 && m.chamadas.fal.length === 0 && m.eventos.length === 0)
  const s = mundo({ primaria: () => semCredito(), env: { OPENAI_API_KEY: OPENAI_KEY } })
  const r2 = await tenta(s.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))
  checa('sem FAL_KEY: o 429 volta como sempre, fal 0', r2.erro?.status === 429 && s.chamadas.fal.length === 0)
}

console.log('== (a) streaming passa direto; o resto do cliente não muda ==')
{
  const m = mundo({ primaria: () => semCredito() })
  const r = await tenta(m.openai.chat.completions.create({ ...CORPO_SCRIPT, stream: true }, { maxRetries: 0 }))
  checa('stream: true com 429 → erro da primária, fal 0 (sem plano B)', r.erro?.status === 429 && m.chamadas.fal.length === 0)
  const sentinela = { stream: 'objeto-do-sdk' }
  let recebido = null
  const embrulhado = m.lf.withLlmFallback((body, opts) => { recebido = { body, opts }; return sentinela }, { defaultTimeoutMs: 20_000 })
  const devolvido = embrulhado({ model: 'gpt-4o', stream: true }, { timeout: 1 })
  checa('stream: o embrulho devolve o MESMO objeto da primária (não uma Promise nova) e repassa os argumentos', devolvido === sentinela && recebido?.opts?.timeout === 1)
  checa('openai.chat é memorizado e chat.completions.create é o embrulho', m.openai.chat === m.openai.chat && m.openai.chat.completions.create === m.openai.chat.completions.create)
  checa('o resto de chat.completions segue do SDK (retrieve/list/del são funções ligadas)', ['retrieve', 'list', 'del'].every((k) => typeof m.openai.chat.completions[k] === 'function'))
  checa('audio/models/moderations não passam pelo plano B (funções do SDK intactas)', typeof m.openai.audio.speech.create === 'function' && typeof m.openai.models.list === 'function' && typeof m.openai.moderations.create === 'function')
}

console.log('== (a) peças puras ==')
{
  const { lf } = mundo({ primaria: () => semCredito() })
  checa('fallbackModelFor: gpt-4o → openai/gpt-4o, openai/gpt-4o fica, vazio → null', lf.fallbackModelFor('gpt-4o') === 'openai/gpt-4o' && lf.fallbackModelFor('gpt-4o-mini') === 'openai/gpt-4o-mini' && lf.fallbackModelFor('openai/gpt-4o') === 'openai/gpt-4o' && lf.fallbackModelFor('') === null && lf.fallbackModelFor(undefined) === null)
  checa('isOpenAiOutageError: 429/500/503/conexão sim; 400/401/422/abort do usuário/erro comum não', [429, 500, 503].every((s) => lf.isOpenAiOutageError(erroApi(s, 'x'))) && lf.isOpenAiOutageError(new OpenAI.APIConnectionError({ message: 'x' })) && lf.isOpenAiOutageError(new OpenAI.APIConnectionTimeoutError()) && ![400, 401, 422].some((s) => lf.isOpenAiOutageError(erroApi(s, 'x'))) && !lf.isOpenAiOutageError(new OpenAI.APIUserAbortError()) && !lf.isOpenAiOutageError(new Error('429 no credits')))
  const vercel = 'Error\n    at run (/var/task/.next/server/chunks/5123.js:1:200)\n    at async POST (/var/task/.next/server/app/api/generate-video-fast/route.js:1:9000)'
  const win = 'Error\n    at run (C:\\kineo\\.next\\server\\app\\api\\admin\\ads\\[id]\\route.js:3:10)'
  checa('routeHintFromStack: Vercel → /api/generate-video-fast; Windows com segmento dinâmico; sem rota → null', lf.routeHintFromStack(vercel) === '/api/generate-video-fast' && lf.routeHintFromStack(win) === '/api/admin/ads/[id]' && lf.routeHintFromStack('Error\n    at x (/var/task/lib/a.js:1:1)') === null && lf.routeHintFromStack(undefined) === null)
  checa('base do roteador da fal e nome do evento', lf.FAL_OPENAI_ROUTER_BASE_URL === BASE_FAL && lf.LLM_FALLBACK_EVENT === 'llm_fallback_used')
}

// ═══════════════════════ (b) VOZ ═══════════════════════
const parser = carregar(SRC_PARSER, {})
function mundoTts({ env = { FAL_KEY }, subscribe, baixar, srcTts = SRC_TTS, efeitosTravados = false, timers } = {}) {
  const logs = [], eventos = [], alertas = [], subs = [], configs = [], baixados = [], sinais = []
  const m = mundo({ primaria: () => semCredito(), timers }) // o settleWithin da voz mora em lib/llmFallback
  const falMock = {
    fal: {
      config: (c) => configs.push(c),
      subscribe: async (slug, opts) => { subs.push({ slug, opts }); return subscribe ? subscribe(slug, opts) : { data: { audio: { url: 'https://v3.fal.media/files/voz.mp3' } } } },
    },
  }
  const rede = async (url, init) => { baixados.push(String(url)); sinais.push(init?.signal); return baixar ? baixar(url) : new Response(Buffer.from('ID3-mp3-da-minimax'), { status: 200 }) }
  const alertaReal = carregar(SRC_ALERTA, { reqs: { openai: OpenAI }, env, logs })
  const tts = carregar(srcTts, {
    reqs: {
      '@fal-ai/client': falMock,
      '@/lib/scriptParser': parser,
      '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); if (efeitosTravados) await travado(); return true } },
      '@/lib/openaiAlert': { ...alertaReal, alertOpenAiExhausted: async (context, kind) => { alertas.push({ context, kind }); if (efeitosTravados) await travado() } },
      '@/lib/llmFallback': m.lf,
    },
    env, logs, rede, timers,
  })
  return { tts, logs, eventos, alertas, subs, configs, baixados, sinais, lf: m.lf }
}

console.log('== (b) voz reserva: schema exato da rota /audio ==')
{
  const w = mundoTts()
  const roteiro = 'HOOK\nThe ocean hides a river of brine.\n[Pexels: deep ocean]\nFish that swim in it die in minutes.'
  const buf = await w.tts.synthesizeTtsFallback(roteiro)
  const input = w.subs[0]?.opts?.input ?? {}
  checa(`slug fal-ai/minimax/speech-2.8-hd (${w.subs[0]?.slug})`, w.subs.length === 1 && w.subs[0].slug === 'fal-ai/minimax/speech-2.8-hd')
  checa("input = {prompt, output_format:'url', language_boost:'auto'} — nada inventado, output_format 'url' obrigatório", JSON.stringify(Object.keys(input).sort()) === '["language_boost","output_format","prompt"]' && input.output_format === 'url' && input.language_boost === 'auto')
  checa('a fala passa pela mesma limpeza do generateTTS (stripScriptMarkers): sem [Pexels], sem rótulo HOOK', input.prompt === parser.stripScriptMarkers(roteiro).trim() && !/Pexels|HOOK/.test(input.prompt) && /river of brine/.test(input.prompt))
  checa('o mp3 da URL vira o Buffer que o compose espera; credenciais da fal = FAL_KEY; timeout no subscribe', Buffer.isBuffer(buf) && buf.toString() === 'ID3-mp3-da-minimax' && w.baixados[0] === 'https://v3.fal.media/files/voz.mp3' && w.configs[0]?.credentials === FAL_KEY && w.subs[0].opts.timeout === w.tts.TTS_FALLBACK_TIMEOUT_MS)
  checa('(d2) o download do mp3 também tem teto: leva um AbortSignal vivo (TTS_FALLBACK_DOWNLOAD_MS = 20 s) — o timeout do subscribe não cobre o fetch da URL', w.sinais[0] instanceof AbortSignal && w.sinais[0].aborted === false && w.tts.TTS_FALLBACK_DOWNLOAD_MS === 20_000)
  const semUrl = mundoTts({ subscribe: () => ({ data: {} }) })
  const e1 = await tenta(semUrl.tts.synthesizeTtsFallback('Some narration here.'))
  const baixaRuim = mundoTts({ baixar: () => new Response('x', { status: 403 }) })
  const e2 = await tenta(baixaRuim.tts.synthesizeTtsFallback('Some narration here.'))
  const semKey = mundoTts({ env: {} })
  const e3 = await tenta(semKey.tts.synthesizeTtsFallback('Some narration here.'))
  checa('sem URL, download recusado ou sem FAL_KEY → lança (o compose cai no caminho de sempre)', !!e1.erro && !!e2.erro && !!e3.erro && semKey.subs.length === 0)
  checa('ttsFallbackApplies: 429/500/conexão sim; 400/401/erro comum não', w.tts.ttsFallbackApplies(erroApi(429, 'You have no credits remaining'), 0) && w.tts.ttsFallbackApplies(erroApi(500, 'x'), 0) && w.tts.ttsFallbackApplies(new OpenAI.APIConnectionError({ message: 'x' }), 0) && !w.tts.ttsFallbackApplies(erroApi(400, 'x'), 0) && !w.tts.ttsFallbackApplies(erroApi(401, 'x'), 0) && !w.tts.ttsFallbackApplies(new Error('boom'), 0))
  checa('ttsFallbackApplies: só falha rápida — 19,999 s sim, 20 s não (timeout de 55 s + MiniMax estouraria o maxDuration 300)', w.tts.TTS_FALLBACK_MAX_ELAPSED_MS === 20_000 && w.tts.ttsFallbackApplies(erroApi(429, 'no credits'), 19_999) && !w.tts.ttsFallbackApplies(erroApi(429, 'no credits'), 20_000) && !w.tts.ttsFallbackApplies(new OpenAI.APIConnectionTimeoutError(), 55_000))
  checa('ttsFallbackApplies: sem FAL_KEY → não', !semKey.tts.ttsFallbackApplies(erroApi(429, 'no credits'), 0))
  const off = mundoTts({ srcTts: SRC_TTS.replace('export const TTS_FALLBACK_ENABLED = true', 'export const TTS_FALLBACK_ENABLED = false') })
  checa('interruptor TTS_FALLBACK_ENABLED = false → não', SRC_TTS.includes('export const TTS_FALLBACK_ENABLED = true') && !off.tts.ttsFallbackApplies(erroApi(429, 'no credits'), 0))
}

console.log('== (b) compose: as duas fatias reais de TTS ==')
const compose = rd('app/api/compose/route.ts')
const fatia = (ini, fim, incluiFim = true) => { const a = compose.indexOf(ini); const b = compose.indexOf(fim, a); return a < 0 || b < a ? null : compose.slice(a, incluiFim ? b + fim.length : b) }
const FECHO = fatia('    let ttsFallbackUsed = false\n', '    // ═══ fim KINEO-PLANO-B-OPENAI-2026-09-28 (narrarPeloPlanoB) ═══')
const PRIMARIA = fatia('      const inicioTts = Date.now() // KINEO-PLANO-B-OPENAI-2026-09-28 — o plano B de voz só entra em falha rápida\n      try {\n        if (!cachedVoiceover && (!audioBuffer || audioBuffer.length === 0)) {\n          audioBuffer = await generateTTS(', '        audioBuffer = planoB\n        ttsFallbackUsed = true\n      }')
const CORRETIVA = fatia('        let retryBuffer: Awaited<ReturnType<typeof generateTTS>> | null = null\n', 'if (retryBuffer && retryBuffer.length > 0) {', false)
checa('as três fatias existem no compose (fecho narrarPeloPlanoB, TTS primária, laço corretivo)', !!FECHO && !!PRIMARIA && !!CORRETIVA)
const CTX = ['generateTTS', 'scaledScript', 'explicitSpeed', 'vertical', 'narrationTier', 'language', 'rejectBeforeProviderSubmission', 'NextResponse', 'ttsFallbackApplies', 'synthesizeTtsFallback', 'registerTtsFallbackUse', 'TTS_FALLBACK_MODEL', 'primaryStatusOf', 'authenticatedUserId', 'generationId', 'quality', 'correctiveSpeed']
const montarPrimaria = (relogio) => carregar(`exports.rodar = async function (ctx: any) {\n  const { ${CTX.join(', ')} } = ctx\n  let audioBuffer: any = null\n  const cachedVoiceover: any = null\n  const clonedVoiceUsed = false\n${FECHO}\n${PRIMARIA}\n  return { audioBuffer, ttsFallbackUsed, rejeitado: null }\n}`, { filename: '/compose-primaria.js', relogio }).rodar
const montarCorretiva = (relogio) => carregar(`exports.rodar = async function (ctx: any) {\n  const { ${CTX.join(', ')} } = ctx\n  let audioBuffer: any = null\n${FECHO}\n${CORRETIVA}\n  return { retryBuffer, correctiveViaPlanoB, ttsFallbackUsed }\n}`, { filename: '/compose-corretiva.js', relogio }).rodar
function ctxCompose(w, gerar) {
  let chamadasTts = 0
  let agora = 5_000_000
  class Relogio extends Date { static now() { return agora } }
  const avanca = (ms) => { agora += ms }
  const ctx = {
    generateTTS: async (...a) => { chamadasTts++; return gerar(chamadasTts, avanca, ...a) },
    scaledScript: 'The ocean hides a river of brine. Fish that swim in it die in minutes.', explicitSpeed: null, vertical: 'science', narrationTier: 'free', language: 'en',
    rejectBeforeProviderSubmission: async (r) => r, NextResponse: { json: (b, init) => ({ rejeitado: b, status: init?.status ?? 200 }) },
    ttsFallbackApplies: w.tts.ttsFallbackApplies, synthesizeTtsFallback: w.tts.synthesizeTtsFallback, registerTtsFallbackUse: w.tts.registerTtsFallbackUse, TTS_FALLBACK_MODEL: w.tts.TTS_FALLBACK_MODEL,
    primaryStatusOf: w.lf.primaryStatusOf, authenticatedUserId: 'u-1', generationId: 'gen-0928', quality: 'fast', correctiveSpeed: 1.1,
  }
  return { ctx, chamadas: () => chamadasTts, Relogio }
}
if (FECHO && PRIMARIA && CORRETIVA) {
  {
    const w = mundoTts()
    const { ctx } = ctxCompose(w, () => { throw erroApi(429, 'You have no credits remaining') })
    const r = await montarPrimaria()(ctx)
    const ev = w.eventos[0]
    checa('TTS primária com 429: em vez do 502, a narração da fal vira o audioBuffer e ttsFallbackUsed = true', r.rejeitado === null && Buffer.isBuffer(r.audioBuffer) && r.audioBuffer.toString() === 'ID3-mp3-da-minimax' && r.ttsFallbackUsed === true)
    checa('evento tts_fallback_used (stage primary, pessoa, generation_id na sessão, primary_status 429) e alarme ao fundador', w.eventos.length === 1 && ev.name === 'tts_fallback_used' && ev.userId === 'u-1' && ev.sessionId === 'gen-0928' && ev.metadata.stage === 'primary' && ev.metadata.primary_status === 429 && ev.metadata.model === 'fal-ai/minimax/speech-2.8-hd' && w.alertas.length === 1 && /PLANO B DE VOZ/.test(w.alertas[0].context))
    checa("a fal recebeu output_format 'url' e o texto da narração", w.subs[0]?.opts?.input?.output_format === 'url' && /river of brine/.test(w.subs[0]?.opts?.input?.prompt ?? ''))
  }
  for (const [nome, erro, env] of [['400 (pedido ruim)', erroApi(400, 'bad input'), { FAL_KEY }], ['401 (chave errada)', erroApi(401, 'bad key'), { FAL_KEY }], ['429 sem FAL_KEY', erroApi(429, 'no credits'), {}]]) {
    const w = mundoTts({ env })
    const { ctx } = ctxCompose(w, () => { throw erro })
    const r = await montarPrimaria()(ctx)
    checa(`TTS primária ${nome}: o 502 "Voiceover generation failed" de sempre, fal 0, 0 eventos`, r.status === 502 && r.rejeitado?.error === 'Voiceover generation failed. Please try again.' && w.subs.length === 0 && w.eventos.length === 0)
  }
  {
    const lenta = mundoTts()
    const c1 = ctxCompose(lenta, (_n, avanca) => { avanca(55_000); throw new OpenAI.APIConnectionTimeoutError() })
    const r1 = await montarPrimaria(c1.Relogio)(c1.ctx)
    checa('TTS primária em TIMEOUT (55 s): o 502 de sempre, sem plano B (o orçamento de 300 s não cabe a MiniMax depois)', r1.status === 502 && lenta.subs.length === 0 && lenta.eventos.length === 0)
    const quase = mundoTts()
    const c2 = ctxCompose(quase, (_n, avanca) => { avanca(19_000); throw erroApi(503, 'overloaded') })
    const r2 = await montarPrimaria(c2.Relogio)(c2.ctx)
    checa('TTS primária com 503 em 19 s: plano B entra, evento com primary_ms 19000', r2.ttsFallbackUsed === true && quase.eventos[0]?.metadata?.primary_ms === 19_000 && quase.eventos[0]?.metadata?.primary_status === 503)
    const lentaC = mundoTts()
    const c3 = ctxCompose(lentaC, (_n, avanca) => { avanca(25_000); throw erroApi(429, 'no credits') })
    const r3 = await tenta(montarCorretiva(c3.Relogio)(c3.ctx))
    checa('corretivo com falha lenta (25 s): sem plano B, as 2 tentativas de sempre e o erro sobe', !!r3.erro && c3.chamadas() === 2 && lentaC.subs.length === 0)
  }
  {
    const w = mundoTts({ subscribe: () => { throw new Error('fal 503') } })
    const { ctx } = ctxCompose(w, () => { throw erroApi(429, 'no credits') })
    const r = await montarPrimaria()(ctx)
    checa('TTS primária 429 e a fal também falha: o 502 de sempre, 0 eventos', r.status === 502 && w.subs.length === 1 && w.eventos.length === 0)
  }
  {
    const w = mundoTts()
    const { ctx } = ctxCompose(w, () => Buffer.from('mp3-openai'))
    const r = await montarPrimaria()(ctx)
    checa('TTS primária saudável: áudio da OpenAI, sem plano B', r.audioBuffer?.toString() === 'mp3-openai' && r.ttsFallbackUsed === false && w.subs.length === 0)
  }
  {
    const w = mundoTts()
    const c = ctxCompose(w, () => { throw erroApi(429, 'no credits') })
    const r = (await tenta(montarCorretiva()(c.ctx))).valor ?? {}
    checa('corretivo com 429: vai DIRETO ao plano B (1 chamada à OpenAI, não 2), retryBuffer = voz da fal, correctiveViaPlanoB', c.chamadas() === 1 && r.retryBuffer?.toString() === 'ID3-mp3-da-minimax' && r.correctiveViaPlanoB === true && w.eventos[0]?.metadata?.stage === 'corrective')
    checa('corretivo: a voz reserva só marca ttsFallbackUsed se for ADOTADA (no `improved`)', r.ttsFallbackUsed === false)
  }
  {
    const w = mundoTts()
    const c = ctxCompose(w, () => { throw erroApi(400, 'bad') })
    const r = await tenta(montarCorretiva()(c.ctx))
    checa('corretivo com 400 duas vezes: lança como antes (o catch de fora mantém o original), fal 0', !!r.erro && c.chamadas() === 2 && w.subs.length === 0)
  }
  {
    const w = mundoTts()
    const c = ctxCompose(w, (n) => { if (n === 1) throw erroApi(400, 'bad'); return Buffer.from('mp3-openai-2') })
    const r = await montarCorretiva()(c.ctx)
    checa('corretivo 400 e depois ok: a 2ª tentativa da OpenAI segue valendo', r.retryBuffer?.toString() === 'mp3-openai-2' && r.correctiveViaPlanoB === false && w.subs.length === 0)
  }
}
{
  const iCond = compose.indexOf('    if (\n      !cachedVoiceover && // never re-synthesize a cache hit')
  const cond = iCond < 0 ? '' : compose.slice(iCond, compose.indexOf('      Math.abs(realAudioDuration - duration) > DURATION_TOLERANCE_SECONDS\n    ) {', iCond))
  checa('passe corretivo pula a voz reserva (!ttsFallbackUsed na condição)', /^\s+!ttsFallbackUsed && \/\/ KINEO-PLANO-B-OPENAI-2026-09-28/m.test(cond))
  checa('voz reserva adotada no corretivo marca ttsFallbackUsed dentro do `if (improved)`', /if \(improved\) \{\n\s+audioBuffer = retryBuffer\n\s+realAudioDuration = retryDuration\n\s+if \(correctiveViaPlanoB\) ttsFallbackUsed = true/.test(compose))
  checa('voz reserva nunca entra no cache de voz (a chave é a da voz da OpenAI)', /^\s+const cacheable = !avatarMode && !hasUserVoice && !clonedVoiceUsed && !ttsFallbackUsed && !!voiceoverCacheKey$/m.test(compose))
  checa('compose importa o plano B de voz de lib/ttsFallback', /^import \{ ttsFallbackApplies, synthesizeTtsFallback, registerTtsFallbackUse, TTS_FALLBACK_MODEL \} from '@\/lib\/ttsFallback'$/m.test(compose))
  checa('hollywood segue em synthesizeHostSpeech (lib/hollywood, trava 8.2) — este plano B não toca o arquivo travado', compose.includes("import { hollywoodVoiceFromClaim, resolveHollywoodVoice, synthesizeHostSpeech, type HollywoodVoice } from '@/lib/hollywood/hostVoice'"))
}

// ═══════════════════════ (c) SONDA ═══════════════════════
console.log('== (c) sonda /api/admin/llm-fallback-probe ==')
{
  const SRC_PROBE = rd('app/api/admin/llm-fallback-probe/route.ts')
  const rodaSonda = async (email, fal) => {
    const m = mundo({ primaria: () => semCredito(), fal })
    const probe = carregar(SRC_PROBE, {
      reqs: {
        'next/server': { NextResponse: { json: (b, init) => ({ body: b, status: init?.status ?? 200 }) } },
        '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { email } : null } }) } }) },
        '../_shared/db': { isAdminEmail: (e) => e === 'admin@kineo.test' },
        '@/lib/llmFallback': m.lf,
      },
      env: m.env, logs: m.logs,
    })
    return { r: await probe.GET(), m }
  }
  const fora = await rodaSonda('cliente@x.com')
  const anon = await rodaSonda(null)
  checa('não-admin e anônimo: 403, nenhuma chamada à fal', fora.r.status === 403 && anon.r.status === 403 && fora.m.chamadas.fal.length === 0 && anon.m.chamadas.fal.length === 0)
  const adm = await rodaSonda('admin@kineo.test', () => conclusao('{"ok":true,"probe":"kineo-plano-b"}'))
  const b = adm.r.body
  checa(`admin: sonda os dois ids (${adm.m.chamadas.fal.map((c) => c.body.model).join(', ')}) com json_object, Key da fal`, adm.m.chamadas.fal.length === 2 && adm.m.chamadas.fal[0].body.model === 'openai/gpt-4o-mini' && adm.m.chamadas.fal[1].body.model === 'openai/gpt-4o' && adm.m.chamadas.fal.every((c) => c.body.response_format?.type === 'json_object' && c.headers.get('authorization') === `Key ${FAL_KEY}`))
  checa('admin: {ok, results:[{ok, model, ms, json_ok, sample}]} e nenhuma chamada à OpenAI', b.ok === true && b.results.length === 2 && b.results.every((x) => x.ok && x.json_ok && typeof x.ms === 'number' && typeof x.sample === 'string') && adm.m.chamadas.primaria.length === 0)
  checa('sonda não grava llm_fallback_used nem alarma (não é uso orgânico) e não devolve chave', adm.m.eventos.length === 0 && adm.m.alertas.length === 0 && !JSON.stringify(b).includes(FAL_KEY))
  const ruim = await rodaSonda('admin@kineo.test', () => jsonRes(404, { error: { message: `model not found (key ${FAL_KEY})` } }))
  checa('id rejeitado pela fal: ok false, error_status 404, mensagem sem a chave', ruim.r.body.ok === false && ruim.r.body.results.every((x) => x.ok === false && x.error_status === 404) && !JSON.stringify(ruim.r.body).includes(FAL_KEY))
  checa("sonda é SÓ-GET com fetchCache 'force-no-store' (KINEO-DATA-CACHE)", /^export const fetchCache = 'force-no-store'$/m.test(SRC_PROBE) && !/export (async )?function (POST|PUT|DELETE|PATCH)/.test(SRC_PROBE))
}

// ═══════════════════════ (d) REVISÃO ADVERSARIAL 28/09 ═══════════════════════
// (d1) Na origin/main, um apagão da OpenAI derrubava o planejador hollywood ANTES do POST pago (custo zero, 502 na hora).
// A 1ª versão deste plano B salvava o planejador pela fal; os clipes eram pagos (Omni e7918140 ≈ US$ 11,86, H3 7127d8b4
// ≈ US$ 5,70) e o filme morria na narração hollywood (synthesizeHostSpeech = tts-1-hd, sem plano B). Estas verificações
// executam o planejador REAL (lib/hollywood/router.ts, transpilado; só as bibliotecas puras e o preço do apresentador
// entram de fora) através do Proxy real de lib/openai e do embrulho real.
console.log('== (d1) estrada hollywood: o planejador REAL sob 429 falha ANTES do POST pago ==')
const ROTA_CINE = '/var/task/.next/server/app/api/generate-video-cinematic/route.js'
const ROTA_FAST = '/var/task/.next/server/app/api/generate-video-fast/route.js'
const CHUNK_ROUTER = '/var/task/.next/server/chunks/7071.js'
const CHUNK_AJUDA = '/var/task/.next/server/chunks/8841.js'
const MARCA = 'THE FOUR KEYS TO REALISM'
const libsPuras = { '@/lib/aspect': carregar(rd('lib/aspect.ts')), '@/lib/analyzeLimits': carregar(rd('lib/analyzeLimits.ts')), '@/lib/hollywood/fidelidade': carregar(rd('lib/hollywood/fidelidade.ts')) }
const planejadorReal = (m) => carregar(rd('lib/hollywood/router.ts'), {
  filename: CHUNK_ROUTER,
  reqs: { '@/lib/openai': { openai: m.openai }, ...libsPuras, '@/lib/avatar/veed': { PRESENTER_MODEL: 'fal-ai/kling-video/ai-avatar/v2/standard', PRESENTER_USD_PER_SECOND: 0.0562 } },
  env: m.env, logs: m.logs,
})
const ARGS_PLANO = { idea: 'The Boiling River of the Amazon: water hot enough to cook anything that falls in.', durationSeconds: 60, language: 'en' }
// a rota cinematográfica e um ajudante num chunk compartilhado, com await no meio (os quadros da rota chegam como "at async")
const rotaCine = carregar('exports.POST = async (planejar) => { await Promise.resolve(); return await planejar() }', { filename: ROTA_CINE })
const ajudante = carregar('exports.ajuda = async (fn) => { await Promise.resolve(); return await fn() }\nexports.fundo = (n, fn) => (n === 0 ? fn() : exports.fundo(n - 1, fn))', { filename: CHUNK_AJUDA })
const retido = (m) => m.logs.some((l) => /SEM plano B na estrada hollywood/.test(l))
{
  // chamado de um chunk: a pilha NÃO mostra a rota (é o que o bundle faz com módulo importado por 2+ entradas) — só a marca segura
  const m = mundo({ primaria: () => semCredito() })
  const hw = planejadorReal(m)
  const r = await tenta(hw.planHollywoodScenes(ARGS_PLANO))
  const corpo = m.chamadas.primaria[0]?.body
  checa('o planejador hollywood REAL manda à OpenAI gpt-4o + json_object com a marca no system (é ela que a trava reconhece)', corpo?.model === 'gpt-4o' && corpo?.response_format?.type === 'json_object' && corpo?.messages?.[0]?.role === 'system' && String(corpo.messages[0].content).includes(MARCA))
  checa(`planejador hollywood sob 429 chamado de um chunk (rota fora da pilha): o 429 ORIGINAL sobe, fal 0, 0 eventos, 0 alarmes (${m.chamadas.primaria.length} primária/${m.chamadas.fal.length} fal)`, r.erro instanceof OpenAI.RateLimitError && /no credits/.test(r.erro.message) && m.chamadas.primaria.length >= 1 && m.chamadas.fal.length === 0 && m.eventos.length === 0 && m.alertas.length === 0)
  checa('o log diz que o plano B foi RETIDO na estrada hollywood (planejador), sem chave', retido(m) && m.logs.some((l) => /planejador hollywood/.test(l)) && semChave(m))
}
{
  const m = mundo({ primaria: () => semCredito() })
  const hw = planejadorReal(m)
  const r = await tenta(rotaCine.POST(() => ajudante.ajuda(() => hw.planHollywoodScenes(ARGS_PLANO))))
  checa('rota cinematográfica → ajudante (await) → planejador real sob 429: erro original, fal 0, o log nomeia a rota', r.erro?.status === 429 && m.chamadas.fal.length === 0 && retido(m) && m.logs.some((l) => /estrada hollywood \(\/api\/generate-video-cinematic, planejador hollywood\)/.test(l)))
}
console.log('== (d1) a rota cinematográfica inteira fica como na origin/main (trava pela pilha, sem a marca) ==')
{
  const m = mundo({ primaria: () => semCredito() })
  const r = await tenta(rotaCine.POST(() => ajudante.ajuda(() => m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))))
  checa('outra chamada de texto da rota cinematográfica (ex.: as descrições de cena) sob 429: erro original, fal 0 — rota lida nos quadros assíncronos', r.erro?.status === 429 && m.chamadas.fal.length === 0 && m.eventos.length === 0 && retido(m))
  const fundo = mundo({ primaria: () => semCredito() })
  const r2 = await tenta(rotaCine.POST(() => ajudante.fundo(14, () => fundo.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))))
  checa('o quadro da rota 17 quadros abaixo (a Node guarda só 10 por padrão): ainda achado — erro original, fal 0', r2.erro?.status === 429 && fundo.chamadas.fal.length === 0 && retido(fundo))
}
console.log('== (d1) controle: o Kineo 1 e o generate-script SEGUEM com o plano B ==')
{
  // /api/generate-video-fast é importada pelo cron finish-orphan-jobs: no bundle ela vive num chunk e a pilha não mostra a
  // rota. Sem a marca do planejador hollywood, o plano B entra — é o caso de 47 das 59 tentativas de 26-27/09.
  const m = mundo({ primaria: () => semCredito() })
  const r = await tenta(ajudante.ajuda(() => m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 })))
  checa('chamada vinda de um chunk sem rota na pilha (o Kineo 1 no bundle real): plano B salva, evento com route null', !r.erro && m.chamadas.fal.length === 1 && m.eventos[0]?.metadata?.route === null && !retido(m))
  const rotaFast = carregar('exports.POST = async (fn) => { await Promise.resolve(); return await fn() }', { filename: ROTA_FAST })
  const f = mundo({ primaria: () => semCredito() })
  const r2 = await tenta(rotaFast.POST(() => ajudante.ajuda(() => f.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))))
  checa('chamada da rota /api/generate-video-fast com a rota na pilha: plano B salva, route no evento', !r2.erro && f.chamadas.fal.length === 1 && f.eventos[0]?.metadata?.route === '/api/generate-video-fast')
}
console.log('== (d1) peças puras e as premissas das duas travas ==')
{
  const { lf } = mundo({ primaria: () => semCredito() })
  const base = { err: erroApi(429, 'You have no credits remaining'), elapsedMs: 100, enabled: true, hasFalKey: true, streaming: false, model: 'gpt-4o', route: null, hollywoodPlanner: false }
  const d = (x) => lf.decideLlmFallback({ ...base, ...x })
  checa("decideLlmFallback: rota cinematográfica → 'hollywood_road'; planejador sem rota → 'hollywood_road'; fast/script/null → usa", d({ route: '/api/generate-video-cinematic' }).why === 'hollywood_road' && d({ hollywoodPlanner: true }).why === 'hollywood_road' && d({ route: '/api/generate-video-fast' }).use === true && d({ route: '/api/generate-script' }).use === true && d({}).use === true)
  checa("decideLlmFallback: 'hollywood_road' só quando o plano B entraria (400 na rota cinematográfica = not_outage; sem FAL_KEY = no_fal_key)", d({ route: '/api/generate-video-cinematic', err: erroApi(400, 'x') }).why === 'not_outage' && d({ hollywoodPlanner: true, hasFalKey: false }).why === 'no_fal_key')
  checa('isHollywoodPlannerBody: marca no system (string ou partes) sim; corpo sem marca, sem messages ou nulo não', typeof lf.isHollywoodPlannerBody === 'function' && lf.isHollywoodPlannerBody({ messages: [{ role: 'system', content: `x ${MARCA} y` }] }) && lf.isHollywoodPlannerBody({ messages: [{ role: 'user', content: [{ type: 'text', text: MARCA }] }] }) && !lf.isHollywoodPlannerBody(CORPO_SCRIPT) && !lf.isHollywoodPlannerBody({}) && !lf.isHollywoodPlannerBody(null))
  checa("LLM_FALLBACK_BLOCKED_ROUTES = ['/api/generate-video-cinematic'] e HOLLYWOOD_PLANNER_MARKER = a marca do prompt", JSON.stringify(lf.LLM_FALLBACK_BLOCKED_ROUTES) === '["/api/generate-video-cinematic"]' && lf.HOLLYWOOD_PLANNER_MARKER === MARCA)
  const varre = (dir, casa, achados) => {
    for (const e of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`
      if (e.isDirectory()) varre(p, casa, achados)
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && casa(rd(p))) achados.push(p)
    }
    return achados
  }
  // premissa da trava pela marca: ela só existe no prompt do planejador hollywood — nenhum outro prompt perde o plano B por engano
  const comMarca = ['app', 'lib', 'components'].flatMap((dir) => varre(dir, (s) => s.includes(MARCA), [])).sort()
  checa(`a marca só aparece em lib/hollywood/router.ts e na constante de lib/llmFallback.ts (${comMarca.join(', ')})`, JSON.stringify(comMarca) === '["lib/hollywood/router.ts","lib/llmFallback.ts"]')
  // premissa da trava pela pilha: ninguém importa a rota cinematográfica — senão o webpack do servidor (minChunks 2) a manda
  // para um chunk compartilhado e a pilha perde o caminho, como já acontece com /api/generate-video-fast e /api/compose
  const importadores = ['app', 'lib', 'components'].flatMap((dir) => varre(dir, (s) => /(?:from\s+|import\(\s*|require\(\s*)['"][^'"]*generate-video-cinematic\/route['"]/.test(s), []))
  checa(`ninguém importa app/api/generate-video-cinematic/route — o módulo fica só no bundle da rota e a pilha mostra o caminho (${importadores.join(', ') || 'nenhum'})`, importadores.length === 0)
  const rc = rd('app/api/generate-video-cinematic/route.ts')
  const iPlano = rc.indexOf('        plan = await planHollywoodScenes({')
  const iLibera = rc.indexOf("releaseBirthClaim('hollywood_planner_rejected')", iPlano)
  const iSubmit = rc.indexOf('submitToFal(scenePrompt, sceneModel, false, true, hs.seconds')
  checa('na rota, a falha do planejador libera o claim e responde ANTES do POST pago dos clipes (planejador < catch/release < submitToFal)', iPlano > 0 && iLibera > iPlano && iSubmit > iLibera && rc.slice(iPlano, iLibera).includes('} catch (e) {'))
}

// (d2) A 1ª versão chamava a MiniMax de novo na 2ª volta do laço corretivo: com a fal presa, até ~2 × 90 s dentro dos 300 s do
// compose (depois do débito), para no fim manter o áudio original. Na origin/main o mesmo estado custava duas recusas rápidas.
console.log('== (d2) corretivo: a MiniMax é tentada no máximo UMA vez por render ==')
if (FECHO && CORRETIVA) {
  {
    const w = mundoTts({ subscribe: () => { throw new Error('Client timed out waiting for the request to complete after 90000ms') } })
    const c = ctxCompose(w, () => { throw erroApi(429, 'You have no credits remaining') })
    const r = await tenta(montarCorretiva()(c.ctx))
    checa(`corretivo com 429 nas 2 voltas e a MiniMax em timeout: 1 chamada à MiniMax (não 2), 2 à OpenAI, o erro sobe e o catch de fora mantém o original (${w.subs.length} MiniMax/${c.chamadas()} OpenAI)`, !!r.erro && w.subs.length === 1 && c.chamadas() === 2 && w.eventos.length === 0)
  }
  {
    const w = mundoTts()
    const c = ctxCompose(w, (n) => { throw n === 1 ? erroApi(400, 'bad input') : erroApi(429, 'You have no credits remaining') })
    const r = (await tenta(montarCorretiva()(c.ctx))).valor ?? {}
    checa('corretivo 400 e depois 429: a recusa que não é apagão NÃO gasta a vez — a 2ª volta usa a voz reserva (1 MiniMax)', c.chamadas() === 2 && w.subs.length === 1 && r.correctiveViaPlanoB === true && r.retryBuffer?.toString() === 'ID3-mp3-da-minimax')
  }
}
{
  const f = fatia('    let ttsFallbackUsed = false\n', '    // ═══ fim KINEO-PLANO-B-OPENAI-2026-09-28 (narrarPeloPlanoB) ═══') ?? ''
  const iAplica = f.indexOf('if (!ttsFallbackApplies(err, primaryMs)) return null')
  const iVez = f.indexOf('if (planoBDeVozTentado) {')
  const iMarca = f.indexOf('planoBDeVozTentado = true')
  const iChama = f.indexOf('await synthesizeTtsFallback(scaledScript)')
  checa('narrarPeloPlanoB: aplica? → já tentou? → marca a vez → chama a MiniMax, nesta ordem (a vez só é gasta quando a MiniMax vai ser chamada)', iAplica > 0 && iVez > iAplica && iMarca > iVez && iChama > iMarca)
}

// (d3) A 1ª versão aguardava o evento e o e-mail do plano B de VOZ sem teto (o fetch do Resend não tem timeout; o undici
// espera 300 s pelos cabeçalhos): um Resend/Supabase preso no apagão segurava o compose depois do débito. O texto já tinha 2,5 s.
console.log('== (d3) evento + e-mail do plano B têm teto de 2,5 s — voz E texto ==')
const relogioFalso = () => {
  const atrasos = []
  return { atrasos, timers: { setTimeout: (fn, ms) => { atrasos.push(ms); return setImmediate(fn) }, clearTimeout: (id) => clearImmediate(id) } }
}
const dentroDe = async (p, ms = 1_000) => {
  let t
  const r = await Promise.race([p.then(() => 'resolveu', () => 'lançou'), new Promise((res) => { t = setTimeout(() => res('travou'), ms) })])
  clearTimeout(t)
  return r
}
{
  const rf = relogioFalso()
  const w = mundoTts({ efeitosTravados: true, timers: rf.timers })
  const r = await dentroDe(w.tts.registerTtsFallbackUse({ err: erroApi(429, 'You have no credits remaining'), stage: 'primary', primaryMs: 300, ms: 4000, bytes: 10, chars: 10, userId: 'u-1', generationId: 'gen-0928', quality: 'fast' }))
  checa(`registerTtsFallbackUse com Supabase e Resend travados: volta pelo teto (${r}; atraso pedido ${rf.atrasos.join('/') || 'nenhum'} ms), e os dois efeitos foram disparados`, r === 'resolveu' && rf.atrasos.includes(2_500) && w.eventos.length === 1 && w.alertas.length === 1)
}
if (FECHO && PRIMARIA) {
  const rf = relogioFalso()
  const w = mundoTts({ efeitosTravados: true, timers: rf.timers })
  const { ctx } = ctxCompose(w, () => { throw erroApi(429, 'You have no credits remaining') })
  const r = await dentroDe(montarPrimaria()(ctx))
  checa('compose: a narração da fal segue mesmo com o evento e o e-mail travados (o teto vale dentro do narrarPeloPlanoB)', r === 'resolveu')
}
{
  const rf = relogioFalso()
  const m = mundo({ primaria: () => semCredito(), efeitosTravados: true, timers: rf.timers })
  const r = await dentroDe(m.openai.chat.completions.create({ ...CORPO_SCRIPT }, { maxRetries: 0 }))
  checa('texto: com Supabase e Resend travados, a resposta da fal volta pelo mesmo teto de 2,5 s', r === 'resolveu' && rf.atrasos.includes(2_500) && m.chamadas.fal.length === 1)
  checa('o teto é UM só: FALLBACK_SIDE_EFFECTS_MS = 2500 em lib/llmFallback, usado pelo texto e pela voz via settleWithin', m.lf.FALLBACK_SIDE_EFFECTS_MS === 2_500 && /await settleWithin\(FALLBACK_SIDE_EFFECTS_MS, \[/.test(SRC_TTS) && /await settleWithin\(FALLBACK_SIDE_EFFECTS_MS, \[/.test(SRC_LF))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
