// KINEO-VERSAO-60S-2026-10-13 — guardião da AÇÃO 1 de vendas ("Faça a versão de 60 s deste filme", fundador 13/10).
// Prova por COMPORTAMENTO (módulo puro executado) e amarrado ao lugar que decide:
//   (a) o bloco só existe para conta que NÃO paga (has_paid=false + plano lido fora da assinatura) com o filme CURTO do
//       Seedance 1.5 entregue; plano não lido, pagante, trial de cartão, outro motor, 35 s+ = não;
//   (b) o link é o checkout do Creator mensal tier=basic&billing=monthly&intent_campaign=film_ready_60s_upsell, sem ?promo=;
//   (c) o preço e a contagem de filmes vêm da fonte única (buyCreatorPrice/creatorSeedanceFilms) — trocar a fonte troca a
//       frase nas 16 línguas; nenhum preço digitado na lib nem no componente;
//   (d) a volta: /checkout/success manda ao Studio com film60=1, engine=seedance, duration=60, script_mode=ai, sem texto
//       na URL; o Studio PREENCHE a caixa com o texto do bilhete (sessionStorage) e não dispara nada;
//   (e) o e-mail "seu filme está pronto" leva a mesma oferta só no mesmo recorte, sem mexer em quem recebe;
//   (f) os eventos novos não estão na lista server-only do /api/events;
//   (g) nenhum arquivo do pipeline de vídeo, de preço/crédito, da home ou do engineWall mudou neste commit.
// Roda: node scripts/test-versao-60s-1310.mjs
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

let passed = 0
const falhas = []
function ok(cond, name) {
  if (typeof name !== 'string' || typeof cond === 'string') throw new Error('ok(cond, name) chamado com argumentos trocados: ' + String(cond))
  if (cond === true) { passed += 1; return }
  falhas.push(name)
  console.error('  ✗ ' + name)
}
function roda(src, req = {}) {
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'x.ts',
  }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
function semComentarios(src, tsx) {
  return ts.transpileModule(src, {
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
    fileName: tsx ? 'x.tsx' : 'x.ts',
  }).outputText
}
function mutante(nome, src, de, para, provas) {
  if (src.split(de).length !== 2) { ok(false, `mutante "${nome}": âncora única encontrada`); return }
  const m = src.replace(de, para)
  ok(m.includes(para) && !src.includes(para), `mutante "${nome}" aplicou`)
  let caiu = false
  try { caiu = provas(m).some(([, c]) => c !== true) } catch { caiu = true }
  ok(caiu, `mutante "${nome}" é pego`)
}

const LIB_SRC = rd('lib/growth/filmReady60s.ts')
const HANDOFF_SRC = rd('lib/growth/filmReady60sHandoff.ts')
const COMP_SRC = rd('components/FilmReady60sUpsell.tsx')
const GEN_SRC = rd('app/(dashboard)/generate/GenerateClient.tsx')
const STUDIO_SRC = rd('app/(dashboard)/studio/StudioClient.tsx')
const SUCCESS_SRC = rd('app/checkout/success/page.tsx')
const EMAIL_SRC = rd('app/api/cron/send-video-ready/route.ts')
const BRIDGE_SRC = rd('app/film-60/page.tsx')
const EVENTS_SRC = rd('app/api/events/route.ts')

// Dependências reais e puras (sem import próprio): a régua de duração e a régua de plano do filme pronto.
const DURATION = roda(rd('lib/durationByEngine.ts'))
const TOPUP = roda(rd('lib/growth/topupEligibility.ts'))
const EXITS = roda(rd('lib/growth/filmReadyExits.ts'), { '@/lib/growth/topupEligibility': TOPUP })

// A fonte única do preço é TROCÁVEL no guardião: se a frase mudar junto, o número não está digitado na lib.
function fonte({ full = '$19.90', first = '$15.92', pct = 20, films = 4, live = true } = {}) {
  return {
    BUY_CREATOR_FILM_SECONDS: 60,
    creatorSeedanceFilms: () => films,
    buyCreatorPrice: (l = live) => (l ? { full, firstMonth: first, percentOff: pct } : { full, firstMonth: null, percentOff: null }),
  }
}
function carrega(src, opts, handoffSrc = HANDOFF_SRC) {
  return roda(src, {
    '@/lib/growth/filmReady60sHandoff': roda(handoffSrc),
    '@/lib/durationByEngine': DURATION,
    '@/lib/growth/buyCreatorOffer': fonte(opts),
    '@/lib/growth/publicPromoTruth': { WELCOME20_SITE_OFFER_LIVE: opts?.live ?? true },
    '@/lib/growth/filmReadyExits': EXITS,
  })
}

// ── (a)(b)(c)(d) o módulo puro ───────────────────────────────────────────────────────────────────────────────────
function provasLib(src, handoffSrc = HANDOFF_SRC) {
  const R = []
  const L = carrega(src, undefined, handoffSrc)
  const base = { plan: 'free', hasPaid: false, engine: 'seedance', seconds: 15, delivered: true }
  const e = (over) => L.film60UpsellEligible({ ...base, ...over })
  R.push(['(a) free + has_paid=false + Seedance 15 s entregue → mostra', e({}) === true])
  R.push(['(a) arquivo de 16-17 s do mesmo filme curto → mostra', e({ seconds: 17 }) === true && e({ seconds: 16 }) === true])
  R.push(['(a) quality cinematic_ai (e-mail) conta como Seedance', e({ engine: undefined, quality: 'cinematic_ai' }) === true])
  R.push(['(a) 35/60/90 s → não (só o filme curto)', [35, 60, 90].every((s) => e({ seconds: s }) === false)])
  R.push(['(a) o corte é MIN_DURATION_ALL_ENGINES (fonte única)', e({ seconds: DURATION.MIN_DURATION_ALL_ENGINES - 1 }) === true
    && e({ seconds: DURATION.MIN_DURATION_ALL_ENGINES }) === false])
  R.push(['(a) outro motor no filme curto → não', ['kling', 'veo', 'hollywood', 'fast'].every((g) => e({ engine: g }) === false)
    && e({ engine: undefined, quality: 'cinematic_kling' }) === false])
  R.push(['(a) quem já pagou (has_paid=true) → não', e({ hasPaid: true }) === false])
  R.push(['(a) has_paid não lido (null/undefined) → não', e({ hasPaid: null }) === false && e({ hasPaid: undefined }) === false])
  R.push(['(a) plano não lido → não (falha fechada)', [null, undefined, '', '  '].every((p) => e({ plan: p }) === false)])
  R.push(['(a) assinatura e trial de cartão → não', ['starter', 'basic', 'pro', 'basic_trial', 'starter_trial', 'autopilot', 'business'].every((p) => e({ plan: p }) === false)])
  R.push(['(a) filme não entregue → não', e({ delivered: false }) === false])
  R.push(['(a) duração inválida → não', [NaN, null, undefined, '15', 0, -1].every((s) => e({ seconds: s }) === false)])

  R.push(['(b) link = checkout do Creator mensal com a campanha', L.film60CheckoutHref() === '/api/stripe/checkout?tier=basic&billing=monthly&intent_campaign=film_ready_60s_upsell'])
  R.push(['(b) sem cupom manual (o WELCOME20 automático aplica no servidor)', !/promo|coupon|WELCOME/i.test(L.film60CheckoutHref()) && !/promo=/.test(L.film60CheckoutHref(L.FILM60_EMAIL_CAMPAIGN))])
  R.push(['(b) a campanha do e-mail mantém o prefixo medível', L.FILM60_EMAIL_CAMPAIGN.startsWith(L.FILM60_CAMPAIGN)
    && L.film60CheckoutHref(L.FILM60_EMAIL_CAMPAIGN).endsWith('intent_campaign=film_ready_60s_upsell_email')])

  // (c) a fonte manda: trocar os números da fonte troca a frase em TODAS as línguas.
  const A = carrega(src, { full: '$77.70', first: '$11.11', pct: 37, films: 9 }, handoffSrc)
  const okLingua = A.FILM60_LANGUAGES.length === 16 && A.FILM60_LANGUAGES.every((lg) => {
    const c = A.film60Copy(lg, true)
    return c.subtitle.includes('$11.11') && c.subtitle.includes('$77.70') && c.subtitle.includes('37') && c.subtitle.includes('9')
      && c.title.includes('60') && c.button.includes('60')
  })
  R.push(['(c) as 16 línguas leem preço, desconto e filmes da fonte única', okLingua])
  const off = carrega(src, { full: '$77.70', first: '$11.11', pct: 37, films: 9, live: false }).film60Copy('en', false)
  R.push(['(c) interruptor do WELCOME20 desligado: só o preço cheio, sem "% off"', off.subtitle.includes('$77.70') && !off.subtitle.includes('$11.11') && !/off/.test(off.subtitle)])
  const en = L.film60Copy('en', true)
  R.push(['(c) inglês = a frase aprovada', en.title === 'Make the 60-second version of this film'
    && en.subtitle === 'Same topic, full story, no watermark · Creator $15.92 first month (20% off), then $19.90 · 4 films of 60 s a month'])
  R.push(['(c) língua desconhecida cai no inglês', L.film60Copy('xx', true).title === en.title && L.film60Copy(undefined, true).title === en.title])

  // (d) a volta
  const href = L.film60StudioHref()
  const q = new URLSearchParams(href.split('?')[1] ?? '')
  R.push(['(d) volta = /studio com film60=1 · seedance · 60 s · Let AI structure', href.startsWith('/studio?') && q.get('film60') === '1'
    && q.get('engine') === 'seedance' && q.get('duration') === '60' && q.get('script_mode') === 'ai'])
  R.push(['(d) a volta não leva texto nem gatilho de disparo', !q.has('prompt') && !q.has('autoanalyze') && !q.has('studio') && !q.has('create_intent') && !q.has('resume')])
  R.push(['(d) a campanha atravessa até o próximo despacho', q.get('intent_campaign') === 'film_ready_60s_upsell'])
  const agora = 1_800_000_000_000
  const bilhete = L.serializeFilm60Handoff({ prompt: '  The paper boat crossing the flooded city  ', videoId: 'abc-123', surface: 'film_ready', at: agora })
  const lido = L.readFilm60Handoff(bilhete, agora + 60_000)
  R.push(['(d) bilhete ida e volta preserva o texto (aparado)', lido?.prompt === 'The paper boat crossing the flooded city' && lido?.videoId === 'abc-123' && lido?.surface === 'film_ready'])
  R.push(['(d) bilhete vencido, futuro, malformado ou vazio = null', L.readFilm60Handoff(bilhete, agora + L.FILM60_HANDOFF_TTL_MS + 1) === null
    && L.readFilm60Handoff(bilhete, agora - 10 * 60_000) === null && L.readFilm60Handoff('{', agora) === null
    && L.readFilm60Handoff(null, agora) === null && L.readFilm60Handoff('null', agora) === null])
  R.push(['(d) texto gigante é cortado no teto', L.readFilm60Handoff(L.serializeFilm60Handoff({ prompt: 'x'.repeat(9000), videoId: null, surface: 'email', at: agora }), agora)?.prompt.length === L.FILM60_PROMPT_MAX_CHARS])
  const mail = L.film60EmailHref('https://www.usekineo.com', 'abc-123')
  R.push(['(e) link do e-mail = ponte /film-60 só com o id (nunca o texto)', mail.startsWith('https://www.usekineo.com/film-60?v=abc-123&') && !/prompt|topic/.test(mail)
    && L.film60EmailHref('https://x', 'bad id <script>').indexOf('v=') === -1])
  return R
}
for (const [n, c] of provasLib(LIB_SRC)) ok(c, n)
mutante('pagante vê o bloco', LIB_SRC, "if (input.hasPaid !== false) return false", 'if (input.hasPaid === true) return false', provasLib)
mutante('filme de 35 s vira curto', LIB_SRC, 's > 0 && s < MIN_DURATION_ALL_ENGINES', 's > 0 && s <= MIN_DURATION_ALL_ENGINES', provasLib)
mutante('volta em 35 s', HANDOFF_SRC, 'duration: String(FILM60_TARGET_SECONDS)', "duration: '35'", (m) => provasLib(LIB_SRC, m))
mutante('cupom manual no link', HANDOFF_SRC, "billing=monthly&intent_campaign=", 'billing=monthly&promo=WELCOME20&intent_campaign=', (m) => provasLib(LIB_SRC, m))

// ── (c) nada digitado na lib e no componente ────────────────────────────────────────────────────────────────────────
const LIB_CODE = semComentarios(LIB_SRC) + '\n' + semComentarios(HANDOFF_SRC)
const COMP_CODE = semComentarios(COMP_SRC, true)
ok(!/\$\s?\d|\b\d+\.\d{2}\b/.test(LIB_CODE) && !/\$\s?\d|\b\d+\.\d{2}\b/.test(COMP_CODE), '(c) nenhum preço digitado na lib nem no componente')
ok(/from '@\/lib\/growth\/buyCreatorOffer'/.test(LIB_SRC) && /buyCreatorPrice\(live\)/.test(LIB_CODE) && /creatorSeedanceFilms\(\)/.test(LIB_CODE),
  '(c) a lib lê buyCreatorPrice/creatorSeedanceFilms da fonte única')
const SEG_VOLTA = /export const FILM60_TARGET_SECONDS = (\d+)/.exec(HANDOFF_SRC)?.[1]
const SEG_PROMESSA = /export const BUY_CREATOR_FILM_SECONDS = (\d+)/.exec(rd('lib/growth/buyCreatorOffer.ts'))?.[1]
ok(/s: BUY_CREATOR_FILM_SECONDS,/.test(LIB_CODE) && SEG_VOLTA === '60' && SEG_VOLTA === SEG_PROMESSA,
  '(c)(d) os 60 s da volta são os MESMOS 60 s da promessa (BUY_CREATOR_FILM_SECONDS)')
ok(!/^import /m.test(HANDOFF_SRC) && LIB_SRC.split('\n').includes("export * from '@/lib/growth/filmReady60sHandoff'"),
  '(d) o módulo do bilhete é leve (sem import) e reexportado pela lib')
ok(SUCCESS_SRC.includes("from '@/lib/growth/filmReady60sHandoff'") && STUDIO_SRC.includes("from '@/lib/growth/filmReady60sHandoff'"),
  '(d) sucesso e Studio leem o bilhete do módulo leve')

// ── o componente ───────────────────────────────────────────────────────────────────────────────────────────────────
ok(/const href = film60CheckoutHref\(\)/.test(COMP_CODE) && /href=\{href\}/.test(COMP_CODE), '(b) o botão usa film60CheckoutHref()')
ok(/const copy = film60Copy\(language\)/.test(COMP_CODE) && /useInterfaceLanguage\(\)/.test(COMP_CODE), '(c) a copy segue a língua da interface')
ok(/sessionStorage\.setItem\(FILM60_HANDOFF_KEY, serializeFilm60Handoff\(\{ prompt, videoId, surface: 'film_ready'/.test(COMP_CODE),
  '(d) o clique grava o bilhete com o texto do filme')
ok(/trackEvent\(FILM60_SHOWN_EVENT/.test(COMP_CODE) && /trackEvent\(FILM60_CLICKED_EVENT/.test(COMP_CODE), '(f) shown e clicked emitidos')
ok(/FILM60_SHOWN_EVENT = 'film_ready_60s_upsell_shown'/.test(HANDOFF_SRC) && /FILM60_CLICKED_EVENT = 'film_ready_60s_upsell_clicked'/.test(HANDOFF_SRC), '(f) nomes dos eventos')
ok(!/fetch\(|generate|autoanalyze/i.test(COMP_CODE.replace(/film_ready_60s|FILM60_/g, '')), '(d) o componente não chama rede nem geração')

// ── GenerateClient: o recorte e o lugar ─────────────────────────────────────────────────────────────────────────────
const GEN = semComentarios(GEN_SRC, true)
const iTwin = GEN.indexOf('{!showPostVideoExportChoice && cleanDownloadTwinButton}')
const iBloco = GEN.indexOf('film60UpsellEligible({')
const iExits = GEN.indexOf('<FilmReadyExits ')
ok(GEN.split('<FilmReady60sUpsell ').length === 2, '(a) o bloco monta UMA vez no filme pronto')
ok(iTwin > 0 && iBloco > iTwin && iExits > iBloco, '(a) depois do download (deliver-first), antes das 3 saídas')
const chamada = GEN.slice(iBloco, GEN.indexOf('<FilmReady60sUpsell ', iBloco))
ok(/plan: commercialPlan/.test(chamada) && /hasPaid,/.test(chamada) && /engine: mode === 'cinematic_ai' \? aiEngine : null/.test(chamada)
  && /seconds: duration/.test(chamada) && /delivered: phase === 'done' && Boolean\(finalVideoUrl\)/.test(chamada),
  '(a) a decisão recebe plano cru, has_paid, motor real, duração pedida e entrega')
ok(/<FilmReady60sUpsell videoId=\{publicVideoId\} plan=\{commercialPlan\} seconds=\{finalVideoSeconds \?\? duration\} prompt=\{prompt\}\s*\/>/.test(GEN),
  '(d) o texto do filme (a caixa) vai ao bilhete')

// ── /checkout/success: o destino ────────────────────────────────────────────────────────────────────────────────────
const SUC = semComentarios(SUCCESS_SRC, true)
const ramo = SUC.slice(SUC.indexOf("if (destination === '/studio') {"), SUC.indexOf('useEffect(', SUC.indexOf("if (destination === '/studio') {")))
ok(/if \(film60Pending\)\s+destination = film60StudioHref\(\)/.test(ramo) && ramo.indexOf('film60Pending') > ramo.indexOf('if (freshDraft)'),
  '(d) bilhete fresco: o destino (botão e relógio) é o Studio da versão de 60 s')
ok(/readFilm60Handoff\(sessionStorage\.getItem\(FILM60_HANDOFF_KEY\), Date\.now\(\)\)\)\s+setFilm60Pending\(true\)/.test(SUC),
  '(d) o sucesso usa o MESMO leitor (chave e TTL do módulo)')

// ── Studio: preenche e PARA (execução real do efeito com sessionStorage falso) ──────────────────────────────────────
function provasStudio(src) {
  const R = []
  const code = semComentarios(src, true)
  const ini = code.indexOf('const film60ConsumedRef = useRef(false)')
  const fim = code.indexOf('}, [searchSignature])', ini)
  if (ini < 0 || fim < 0) return [['(d) efeito da volta encontrado no Studio', false]]
  const corpo = code.slice(ini, fim + '}, [searchSignature])'.length)
  const L = carrega(LIB_SRC)
  function cena({ busca, bilhete }) {
    const store = new Map(bilhete ? [[L.FILM60_HANDOFF_KEY, bilhete]] : [])
    const prompts = []
    const eventos = []
    const js = ts.transpileModule(corpo, { compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.Preserve }, fileName: 'x.tsx' }).outputText
    new Function('useRef', 'useEffect', 'searchSignature', 'sessionStorage', 'setPrompt', 'trackEvent', 'readFilm60Handoff', 'FILM60_HANDOFF_KEY', 'FILM60_ARRIVED_EVENT', 'FILM60_VERSION', 'Date', js)(
      (v) => ({ current: v }), (fn) => fn(), busca,
      { getItem: (k) => store.get(k) ?? null, removeItem: (k) => store.delete(k), setItem: (k, v) => store.set(k, v) },
      (p) => prompts.push(p), (name, meta) => eventos.push({ name, meta }),
      L.readFilm60Handoff, L.FILM60_HANDOFF_KEY, L.FILM60_ARRIVED_EVENT, L.FILM60_VERSION, { now: () => 1_800_000_000_000 })
    return { prompts, eventos, sobrou: store.has(L.FILM60_HANDOFF_KEY) }
  }
  const b = L.serializeFilm60Handoff({ prompt: 'A tiny paper boat sails a flooded city', videoId: 'v1', surface: 'film_ready', at: 1_800_000_000_000 - 60_000 })
  const a = cena({ busca: 'film60=1&engine=seedance&duration=60&script_mode=ai', bilhete: b })
  R.push(['(d) a volta preenche a caixa com o texto do filme', a.prompts.length === 1 && a.prompts[0] === 'A tiny paper boat sails a flooded city'])
  R.push(['(d) o bilhete é consumido', a.sobrou === false])
  R.push(['(d) a chegada é medida', a.eventos.length === 1 && a.eventos[0].name === 'film_ready_60s_upsell_arrived' && a.eventos[0].meta.prompt_filled === true])
  R.push(['(d) sem film60=1 nada acontece', cena({ busca: 'engine=seedance', bilhete: b }).prompts.length === 0])
  R.push(['(d) ?prompt= explícito vence o bilhete', cena({ busca: 'film60=1&prompt=x', bilhete: b }).prompts.length === 0])
  R.push(['(d) bilhete vencido não preenche', cena({ busca: 'film60=1', bilhete: L.serializeFilm60Handoff({ prompt: 'velho', videoId: null, surface: 'email', at: 1 }) }).prompts.length === 0])
  R.push(['(d) o efeito não dispara geração (sem fetch/router/autoanalyze/handleCreate)', !/fetch\(|router\.|autoanalyze|location|handle[A-Z]\w*\(/.test(corpo)])
  // O efeito de URL que já existia escolhe motor/duração/modo: as três chaves da volta são lidas lá.
  R.push(['(d) o Studio lê duration=60, script_mode=ai e engine da URL', /requestedDuration === 35 \|\| requestedDuration === 60/.test(code)
    && /requestedScriptMode === 'ai'/.test(code) && /const e = sp\.get\('engine'\)/.test(code)])
  return R
}
for (const [n, c] of provasStudio(STUDIO_SRC)) ok(c, n)
mutante('Studio ignora o bilhete', STUDIO_SRC, 'if (filled && handoff) setPrompt(handoff.prompt)', 'if (filled && handoff) void 0', provasStudio)
mutante('Studio deixa o bilhete vivo', STUDIO_SRC, '      sessionStorage.removeItem(FILM60_HANDOFF_KEY)\n', '      void FILM60_HANDOFF_KEY\n', provasStudio)

// ── (e) o e-mail ───────────────────────────────────────────────────────────────────────────────────────────────────
const MAIL = semComentarios(EMAIL_SRC)
ok(/film60UpsellEligible\(\{ plan: prof\.plan, hasPaid: prof\.has_paid, quality: video\.qualityMode, seconds: video\.duration, delivered: true \}\)/.test(MAIL),
  '(e) o e-mail usa a MESMA régua (plano, has_paid, motor, duração)')
ok(/\.eq\('email_opted_out', false\)/.test(MAIL) && /\.is\('video_ready_sent_at', null\)/.test(MAIL), '(e) quem recebe e a frequência continuam os de antes')
ok(/const film60 = ctx\.film60 \? film60Copy\('en'\) : null/.test(MAIL) && /film60EmailHref\(APP_URL, video\.id\)/.test(MAIL)
  && /\$\{film60Html\}/.test(MAIL) && /\$\{film60Text\}/.test(MAIL), '(e) o bloco entra no HTML e no texto, com o link da ponte')
ok(/film60_offer: !!ctx\.film60/.test(MAIL), '(e) o carimbo video_ready_nudge_sent guarda o denominador')
ok(/quality_mode/.test(MAIL.slice(MAIL.indexOf(".from('videos')"), MAIL.indexOf(".from('videos')") + 400)), '(e) o motor do filme vem da leitura do vídeo')
const PONTE = semComentarios(BRIDGE_SRC, true)
ok(/window\.location\.replace\(film60CheckoutHref\(FILM60_EMAIL_CAMPAIGN\)\)/.test(PONTE) && /sessionStorage\.setItem\(FILM60_HANDOFF_KEY/.test(PONTE)
  && /fetch\('\/api\/videos\?limit=100'/.test(PONTE) && !/generate|compose|cinematic/.test(PONTE), '(e) a ponte grava o bilhete, segue ao checkout e não gera nada')
ok(existsSync(join(root, 'app/film-60/layout.tsx')) && /index: false/.test(rd('app/film-60/layout.tsx')), '(e) a ponte é noindex')

// ── (f) eventos aceitos pelo sink ──────────────────────────────────────────────────────────────────────────────────
const SERVER_ONLY = EVENTS_SRC.slice(EVENTS_SRC.indexOf('const SERVER_ONLY_EVENTS = new Set(['), EVENTS_SRC.indexOf('])', EVENTS_SRC.indexOf('const SERVER_ONLY_EVENTS = new Set([')))
ok(SERVER_ONLY.length > 50 && ['film_ready_60s_upsell_shown', 'film_ready_60s_upsell_clicked', 'film_ready_60s_upsell_arrived'].every((n) => !SERVER_ONLY.includes(`'${n}'`)),
  '(f) os eventos novos não estão na lista server-only')

// ── (g) nada do pipeline, preço/crédito, home ou engineWall mudou NESTE commit (medido contra o pai do commit) ──────
const PROIBIDOS = [/^lib\/hollywood\//, /^lib\/compose/, /^app\/api\/generate-video-cinematic\//, /^app\/api\/compose\//, /^lib\/engineWall\.ts$/,
  /^lib\/checkoutPricing\.ts$/, /^lib\/credits\//, /^app\/page\.tsx$/, /^app\/HomePageClient\.tsx$/, /^components\/HomePageClient\.tsx$/,
  /^app\/api\/stripe\/checkout\//, /^lib\/growth\/publicPromoTruth\.ts$/, /^lib\/growth\/buyCreatorOffer\.ts$/]
let mudados = null
try {
  const git = (c) => execSync(c, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  const h = git('git log -1 --format=%H --grep=KINEO-VERSAO-60S-2026-10-13')
  mudados = h
    ? git(`git diff --name-only ${h}^ ${h}`).split('\n')
    : [...git('git diff --name-only HEAD').split('\n'), ...git('git ls-files --others --exclude-standard').split('\n')]
} catch { mudados = null }
if (mudados) {
  const tocados = mudados.filter(Boolean).filter((f) => PROIBIDOS.some((re) => re.test(f)))
  ok(tocados.length === 0, '(g) nenhum arquivo do pipeline/preço/home/engineWall mudou' + (tocados.length ? ': ' + tocados.join(', ') : ''))
} else {
  console.log('  · (g) sem git disponível: verificação de diff pulada')
}

console.log(`test-versao-60s-1310: ${passed} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
