// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — guardião do Studio Ads feito pela própria empresa (fundador 24/09 à noite).
// Prende: (1) o contrato do render (validação pura, executada); (2) a escolha de mídia por tomada (executada: a foto da
// batida aparece na batida, o cartão fecha o filme, a lista nunca "dá a volta"); (3) a ordem das travas na rota de
// render e na de voz (dono → acesso → pedido → validação → arquivos no banco → saldo → trava do pedido → só então voz e
// compose); (4) a decisão de NÃO passar pelo generate-video-fast (que injeta Seedance na frente das fotos da empresa).
// Estilo da casa: readFileSync + regex para rotas; módulos puros por transpile + vm com resolvedor de '@/'. `ok(cond, nome)`.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }
const cache = {}
function carrega(rel) {
  const p = rel.endsWith('.ts') ? rel : rel + '.ts'
  if (cache[p]) return cache[p]
  const js = ts.transpileModule(rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
  const mod = { exports: {} }
  cache[p] = mod.exports
  const dir = p.split('/').slice(0, -1).join('/')
  const req = (spec) => {
    if (spec.startsWith('@/')) return carrega(spec.slice(2))
    if (spec.startsWith('./')) return carrega(`${dir}/${spec.slice(2)}`)
    throw new Error('import não puro em ' + p + ': ' + spec)
  }
  vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, console, Number, String, RegExp, Object, Array, Math, Date, JSON, Map, Set, Error })
  cache[p] = mod.exports
  return mod.exports
}

// ── 1. contrato do render, EXECUTADO ─────────────────────────────────────────────────────────────
const C = carrega('lib/ads/renderContract')
const M = carrega('lib/ads/models')
const modelo = M.adsModelById('oferta_relampago')
const n = modelo.beats.length
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333']
const card = '44444444-4444-4444-8444-444444444444'
const ORDER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const [lo, hi] = C.adsRenderWordRange(modelo)
const texto = (w) => Array.from({ length: w }, (_, i) => ['fresh', 'bread', 'every', 'morning', 'warm', 'golden'][i % 6]).join(' ')
const porBatida = (total) => Array.from({ length: n }, (_, i) => texto(Math.floor(total / n) + (i === 0 ? total % n : 0)))
const sb = Array.from({ length: n - 1 }, (_, i) => ({ beatIndex: i, footageIds: [ids[i % ids.length]] }))
const corpo = (extra = {}) => ({ order_id: ORDER, voice: 'nova', beats: porBatida(Math.round((lo + hi) / 2)), storyboard: sb, card_footage_id: card, ...extra })
const V = (b) => C.sanitizeRenderRequest(b, modelo, ids)
ok(V(corpo()).ok === true && V(corpo()).value.storyboard.length === n - 1, '1a. corpo válido passa (uma batida por modelo, mídia em todas menos a do cartão, cartão)')
ok(V(corpo({ beats: porBatida(lo + 5).slice(0, n - 1) })).error === 'beats_invalid' && V(corpo({ voice: 'alloy' })).error === 'voice_invalid' && V(corpo({ order_id: 'x' })).error === 'order_id_invalid',
  '1b. número de batidas errado, voz fora da lista e pedido sem id são recusados')
ok(V(corpo({ beats: porBatida(lo - 5) })).error === 'script_too_short' && V(corpo({ beats: porBatida(hi + 10) })).error === 'script_too_long',
  `1c. roteiro abaixo de ${lo} ou acima de ${hi} palavras é recusado (régua do modelo com folga)`)
ok(V(corpo({ storyboard: sb.slice(1) })).error === 'storyboard_invalid' && V(corpo({ storyboard: [...sb, { beatIndex: n - 1, footageIds: [ids[0]] }] })).error === 'storyboard_invalid' && V(corpo({ storyboard: sb.map((s, i) => (i === 0 ? { ...s, footageIds: ['99999999-9999-4999-8999-999999999999'] } : s)) })).error === 'media_not_owned',
  '1d. batida sem mídia, mídia na batida do cartão e arquivo fora do pedido são recusados')
ok(V(corpo({ storyboard: sb.slice(0, n - 2).concat([{ beatIndex: n - 1, footageIds: [ids[0]] }]) })).error === 'storyboard_invalid', '1d2. trocar uma batida pela do cartão (mesma contagem) também é recusado')
// Reancorado com motivo (revisão 24/09): '<' e '>' passaram a ser REMOVIDOS do texto (o GPT escreve '->'), não motivo de recusa.
const comTag = V(corpo({ beats: porBatida(Math.round((lo + hi) / 2)).map((b, i) => (i === 0 ? '<b>' + b + ' -> ok' : b)) }))
ok(V(corpo({ card_footage_id: 'nope' })).error === 'card_invalid' && comTag.ok === true && !/[<>]/.test(comTag.value.beats[0]),
  '1e. sem cartão válido é recusado; "<" e ">" saem do texto em vez de derrubar o roteiro')
ok(C.ADS_VOICES.map((v) => v.id).join(',') === 'nova,shimmer,onyx,echo' && C.isAdsVoice('nova') && !C.isAdsVoice('fable'), '1f. as 4 vozes são da família tts-1-hd e só elas passam')

// ── 2. mídia por tomada, EXECUTADA ──────────────────────────────────────────────────────────────
const P = carrega('lib/ads/renderPlan')
const total = 38
const L = P.adsClipListLength(total)
ok(total / L < 2.5 && L === Math.floor(total / 2.5) + 2, `2a. lista com ${L} itens para ${total} s: total/n < 2,5 → o montador trava a tomada em 2,5 s e a lista não gira`)
const starts = P.beatStartTimes([10, 20, 20, 10], [], 40)
ok(starts.length === 4 && starts[0] === 0 && starts[1] === 6.67 * 0 + 40 * (10 / 60) && starts[3] === 40 * (50 / 60) && starts.every((t, i) => i === 0 || t >= starts[i - 1]),
  '2b. sem Whisper, a batida começa na fração de palavras já faladas (e nunca volta no tempo)')
const palavras = Array.from({ length: 60 }, (_, i) => ({ start: i * 0.6 }))
const s2 = P.beatStartTimes([10, 20, 20, 10], palavras, 36)
ok(s2[1] === palavras[10].start && s2[2] === palavras[30].start && s2[3] === palavras[50].start, '2c. com Whisper, o início da batida é o tempo da palavra correspondente')
const slots = Array.from({ length: 15 }, (_, j) => ({ time: j * 2.5, duration: 2.75 }))
const foto = (x) => ({ url: `https://f/${x}.jpg`, kind: 'image' })
const clipe = (x) => ({ url: `https://f/${x}.mp4`, kind: 'video' })
const plano = P.planClipUrls({ slots, beatStarts: [0, 8, 18, 30], beatMedia: [[foto('a'), foto('b')], [clipe('v'), foto('c')], [foto('d')]], cardUrl: 'https://f/card.png', listLength: L })
ok(plano.length === L && plano.slice(slots.length).every((u) => u === 'https://f/card.png'), '2d. folga no fim da lista é o cartão (nunca repete a primeira foto)')
const meio = (j) => slots[j].time + slots[j].duration / 2
const naBatida = (j) => (meio(j) >= 30 ? 3 : meio(j) >= 18 ? 2 : meio(j) >= 8 ? 1 : 0)
ok(slots.every((_, j) => { const b = naBatida(j); const u = plano[j]; return b === 3 ? u === 'https://f/card.png' : b === 0 ? /\/(a|b)\.jpg$/.test(u) : b === 1 ? /\/(v\.mp4|c\.jpg)$/.test(u) : /\/d\.jpg$/.test(u) }),
  '2e. cada tomada mostra a mídia da batida em que cai; as tomadas da última batida mostram o cartão')
ok(plano.slice(0, slots.length).filter((u) => u.endsWith('v.mp4')).length === 1, '2f. o vídeo entra uma vez só na batida (repetir reinicia o clipe e parece gagueira) quando há foto para alternar')
ok(plano[0] !== plano[1] || slots.filter((_, j) => naBatida(j) === 0).length < 2, '2g. fotos da mesma batida se alternam')

// ── 3. rota de render: ordem das travas ─────────────────────────────────────────────────────────
const r = rd('app/api/ads/render/route.ts')
const post = (r.match(/export async function POST[\s\S]*?\n\}\n/) || [''])[0]
const pos = (s) => post.indexOf(s)
const ordem = [
  'supabase.auth.getUser()',
  'loadAdsAccess(user.id, user.email)',
  "if (gate !== 'ok')",
  ".eq('user_id', user.id)",
  "if (order.status !== 'draft' && order.status !== 'failed')",
  'if (!order.consent_at)',
  'sanitizeRenderRequest(body, model, nonLogoIds)',
  ".from('user_footage').select('id, url, kind').eq('user_id', user.id).in('id', ids)",
  "creditCostForDuration('fast', true, seconds)",
  ".in('status', ['draft', 'failed'])",
  'openai.audio.speech.create(',
  'buildCreatomateSource({',
  'planClipUrls({',
  'await composePost(',
]
const idx = ordem.map(pos)
ok(idx.every((i) => i > 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), `3a. POST na ordem: dono → acesso → pedido do dono → estado → consentimento → validação → arquivos no banco → saldo → trava → voz → simulação → lista → compose (${idx.join(',')})`)
ok(/if \(typeof r\.url !== 'string' \|\| !r\.url\.startsWith\(prefix\)\) continue/.test(post) && /const prefix = `\$\{FOOTAGE_PUBLIC_PREFIX\(\)\.replace\(\/\\\/\+\$\/, ''\)\}\/\$\{user\.id\}\/`/.test(post),
  '3b. a URL de cada arquivo vem do banco e precisa estar na pasta DO DONO')
ok(/if \(!card \|\| card\.kind !== 'image' \|\| !\/\\\.png\(\\\?\|#\|\$\)\/i\.test\(card\.url\)\) return fail\('card_invalid', 400\)/.test(post), '3c. o cartão tem de ser PNG da própria conta')
ok(/if \(!\(balance >= cost\)\) return fail\('out_of_credits', 402, \{ needed: cost, balance \}\)/.test(post), '3d. sem saldo = 402 antes de gastar voz e Whisper')
ok(/headers: serviceHeaders\(user\.id\)/.test(post) && /'x-kineo-service-user': userId/.test(r) && !/body\.user_id|body\.userId/.test(post), '3e. o compose roda em nome do usuário do getUser, nunca de um id vindo do navegador')
ok(!/generate-video-fast/.test(r.replace(/\/\/[^\n]*/g, '')) && /import \{ POST as composePost \} from '@\/app\/api\/compose\/route'/.test(r),
  '3f. o anúncio NÃO passa pelo generate-video-fast (que injeta Seedance na frente das fotos da empresa); vai direto ao montador')
ok(/user_voiceover_url: voiceUrl/.test(post) && /speed: 1,/.test(post) && /quality: 'fast'/.test(post) && /aspect: '9:16'/.test(post), '3g. o compose recebe a voz escolhida já pronta, velocidade 1 (texto narrado como está), Kineo 1, vertical')
ok(/if \(res\.status === 402\) \{\n\s*await back\('draft', 'out_of_credits'\)/.test(post) && /await back\('failed', `compose \$\{res\.status\}/.test(post), '3h. compose sem saldo devolve o pedido a rascunho; outra falha marca failed com o motivo (nunca fica preso em rendering)')
const get = (r.match(/export async function GET[\s\S]*?\n\}\n/) || [''])[0]
ok(/\.from\('videos'\)\.select\('id, video_url'\)\.eq\('user_id', user\.id\)\.eq\('render_id', renderId\)/.test(get) && /\.update\(\{ status: 'delivered', video_id: video\.id, delivered_at: new Date\(\)\.toISOString\(\) \}\)[\s\S]{0,160}\.eq\('status', 'rendering'\)/.test(get) && /if \(d\.data\) \{\n\s*await writeServerEvent\(\{ name: 'ads_render_served'/.test(get),
  "3i. GET entrega só o vídeo DO DONO, só a partir de 'rendering', e grava ads_delivered uma vez (quando o UPDATE pegou a linha)")

// ── 3b. revisão adversarial de 24/09 (32 achados confirmados): o que o render passou a garantir ──────────────
const ip = (s) => post.indexOf(s)
ok(ip('if (narrationSeconds > ADS_MAX_NARRATION_SECONDS) {') > ip('estimateMp3DurationSeconds(voiceBuf)') && ip('if (narrationSeconds > ADS_MAX_NARRATION_SECONDS) {') < ip('await composePost(') && /await back\('draft', 'script_too_long'\)\n\s*return fail\('script_too_long', 400/.test(post) && C.ADS_MAX_NARRATION_SECONDS <= 89 && C.adsRenderWordRange(M.adsModelById('historia_fundador'))[1] <= C.ADS_MAX_NARRATION_WORDS,
  '3j. narração acima de 89 s é recusada ANTES do compose (o montador cortaria em 90 s a chamada e o cartão); o teto de palavras dos modelos de 60 s respeita a voz mais lenta')
ok(/let words = await transcribeTTSWithTimestamps\(voiceBuf\)\.catch\(\(\) => \[\]\)\n\s*if \(words\.length === 0\) words = await transcribeTTSWithTimestamps\(voiceBuf\)\.catch\(\(\) => \[\]\)\n\s*if \(words\.length === 0\) \{\n\s*await back\('draft', 'whisper_empty'\)/.test(post) && ip("await back('draft', 'whisper_empty')") < ip('uploadVoiceoverToSupabase(user.id, voiceBuf)') && ip('uploadVoiceoverToSupabase(user.id, voiceBuf)') < ip('buildCreatomateSource({'),
  '3k. sem palavras do Whisper (2 tentativas) não monta — a simulação cairia no corte fixo e a mídia escorregaria; a voz só sobe depois')
ok(ip("return fail('another_rendering', 409)") > 0 && ip("return fail('another_rendering', 409)") < ip(".in('status', ['draft', 'failed'])") && /\.eq\('user_id', user\.id\)\.eq\('status', 'rendering'\)\.neq\('id', orderId\)/.test(post),
  '3l. um render por vez por conta, checado antes de travar o pedido (sem laço de voz/Whisper enquanto o compose recusa)')
ok(/while \(slots\.length > listLength && listLength < maxList\) \{/.test(post) && /let listLength = Math\.max\(2, Math\.ceil\(total \/ 4\.5\)\)/.test(post) && /beatStartTimes\(input\.beats\.map\(countWords\), words, narrationSeconds\)/.test(post),
  '3m. a lista é a mais curta que não gira (tomadas de até 4,5 s, menos reinício de zoom e vídeo) e as batidas são medidas na narração real')
ok(/if \(order\.status === 'rendering' && !order\.render_id\) \{/.test(get) && /composeClaimId\(user\.id, order\.generation_id\)/.test(get) && /age > 6 \* 60 \* 1000/.test(get) && /\.eq\('status', 'rendering'\)\.is\('render_id', null\)\.select\('id'\)\.maybeSingle\(\)/.test(get) && /reason: 'stuck_no_render_id'/.test(get),
  "3n. pedido preso em 'rendering' sem render_id: recupera pelo claim do compose; sem claim e com mais de 6 min vira 'failed' (nada fica preso para sempre)")
ok(/else if \(sj\.phase === 'failed' && sj\.reconcile !== true\) \{/.test(get) && /failure = typeof sj\.failure_reason === 'string' && \/\^\[a-z0-9_\]\{2,60\}\$\/\.test\(sj\.failure_reason\) \? sj\.failure_reason : 'render_failed'/.test(get),
  "3o. 'failed' transitório (reconcile) não encerra o pedido; a tela recebe código, nunca a frase interna do compose")
ok(/let link = await linkOnce\(\)\n\s*if \(link\.error \|\| !link\.data\) link = await linkOnce\(\)/.test(post), '3p. a gravação do render_id é conferida e repetida uma vez')

// ── 4. prévia de voz ───────────────────────────────────────────────────────────────────────────
const v = rd('app/api/ads/voice/route.ts')
const vi = (s) => v.indexOf(s)
// Reancorado com motivo (revisão 24/09): a prévia RESERVA a linha no teto antes de gastar (paralelo não fura) e falha fechada.
ok(vi('supabase.auth.getUser()') < vi('adsGate(reason)') && vi('adsGate(reason)') < vi('const reserved = await writeServerEvent({ name: ADS_VOICE_PREVIEW_SERVED_EVENT') && vi('const reserved = await writeServerEvent({ name: ADS_VOICE_PREVIEW_SERVED_EVENT') < vi("eq('name', ADS_VOICE_PREVIEW_SERVED_EVENT)") && vi("eq('name', ADS_VOICE_PREVIEW_SERVED_EVENT)") < vi('openai.audio.speech.create(') && (v.match(/name: ADS_VOICE_PREVIEW_SERVED_EVENT/g) || []).length === 1,
  '4a. voz: dono → acesso → reserva no teto → contagem no banco → síntese (uma escrita só, antes de gastar)')
ok(/if \(!reserved\) return fail\('voice_unavailable', 503\)/.test(v) && /if \(used\.error\) return fail\('voice_unavailable', 503\)/.test(v) && /if \(\(used\.count \?\? 0\) > ADS_VOICE_PREVIEW_DAILY_CAP\) return fail\('daily_limit', 429\)/.test(v),
  '4c. o teto diário é APLICADO (429, contando a própria reserva) e falha FECHADA quando o banco não responde (503)')
const EV = carrega('lib/ads/events')
ok(EV.ADS_EVENTS.includes('ads_voice_preview_served') && EV.ADS_SERVER_ONLY_EVENTS.includes('ads_voice_preview_served') && /'ads_voice_preview_served',/.test(rd('app/api/events/route.ts')) && C.ADS_VOICE_PREVIEW_SERVED_EVENT === 'ads_voice_preview_served',
  '4b. o evento da prévia é só de servidor nas duas listas (o navegador não forja o teto)')

// ── 6. gerador de roteiro (teste da padaria 24/09 noite: 0 de 6 versões passavam; depois do conserto, 11 de 12 casos) ──
const SP = carrega('lib/ads/scriptPrompt')
const briefP = { business: 'Padaria Pão Dourado', offer: 'Pão francês a R$ 0,90', cta: 'whatsapp', contact: '+55 11 98765-4321', language: 'pt', tone: 'warm', audience: 'bairro', extra: { deadline: 'só até sexta-feira' } }
const msgs = SP.buildAdsScriptMessages(modelo, briefP, 'Portuguese')
ok(msgs.system.includes('"beat ' + n + '"') && !msgs.system.includes('"beat ' + (n + 1) + '"') && /exactly 3 versions, each with exactly \d+ strings in "beats"/.test(msgs.system),
  '6a. o exemplo de resposta tem EXATAMENTE as batidas do modelo (o exemplo antigo com 2 fazia o GPT devolver 4 "versões" de 2)')
ok(/about \d+ words/.test(msgs.user) && /idea \(do not copy\)/.test(msgs.user) && msgs.user.includes('must say this contact in full, exactly as written: +55 11 98765-4321'),
  '6b. cada batida tem meta de palavras, o molde é só a ideia, e o contato é exigido por extenso na última')
ok(SP.inventedNumbers('Mais de mil pessoas já vieram', briefP).includes('mil') && SP.inventedNumbers('Hundreds of neighbours', briefP).length === 1 && SP.inventedNumbers('Só R$ 0,90 até sexta', briefP).length === 0,
  '6c. quantidade por extenso que o brief não diz ("mil", "hundreds") conta como número inventado')
const ultima = (t) => JSON.stringify({ versions: [{ angle: 'question', beats: [...Array.from({ length: n - 1 }, () => texto(26)), t] }] })
ok(SP.parseAdsScriptOutput(ultima(texto(18) + ' chame no whatsapp (11) 98765-4321'), modelo, briefP)?.length === 1 && SP.parseAdsScriptOutput(ultima(texto(18) + ' toque no botão'), modelo, briefP) === null,
  '6d. o telefone falado sem o +55 vale (8 últimos dígitos); a última batida sem contato é descartada')
ok(SP.adsScriptMinWords(modelo) === Math.min(Math.floor(modelo.words[0] * 0.9), Math.floor(modelo.seconds * 2.45)) && SP.adsScriptMinWords(modelo) <= 86,
  '6e. o piso de palavras é o que a voz real (~2,45 pal/s) enche na duração do modelo, não a régua de 3,1')
const sr2 = rd('app/api/ads/script/route.ts')
ok(/const fix = diagnoseAdsScriptOutput\(raw, model, brief\.value\)/.test(sr2) && /model: 'gpt-4o',/.test(sr2) && /None of these versions can be used\. Fix all of this/.test(sr2) && /export const maxDuration = 60/.test(sr2),
  '6f. a rota tenta de novo com o MOTIVO da recusa (gpt-4o), dentro de 60 s')

// ── 5. migration aplicada guardada ───────────────────────────────────────────────────────────────
const mig = rd('migrations_pending/2026-09-24_studio_ads_render.sql')
ok(/add column if not exists generation_id uuid/.test(mig) && /add column if not exists render_id text/.test(mig) && /generation_id: generationId/.test(post) && /update\(\{ render_id: renderId \}\)/.test(post),
  '5. as colunas que o render grava existem na migration (generation_id antes do compose, render_id depois)')

console.log(`test-ads-self-serve-2026-09-24: ${passou} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
