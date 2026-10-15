// KINEO-PAYWALL-FILME-PRIMEIRO-1510 — guardião da caixa de planos com o FILME DA PESSOA na frente.
// (fundador 15/10: "foco total em MRR"; consertos de conversão aprovados; preço e planos intocados.)
//
// O defeito (7 d, contas internas fora): 33 pessoas abriram a caixa de planos do Studio (offer_version mrr0610_v1). 14 no
// teste ativo com 10 cr e ~0 filme pronto → 1 checkout. 8 testes encerrados → 0. Elas tentam comprar antes de ver o próprio
// filme; quem paga é quem fez o próprio filme primeiro.
// O conserto: lib/growth/paywallFilmePrimeiro.ts (regra pura + 16 línguas) e components/offers/ConversionUpgrade.tsx
// (cartão do filme grátis no topo; passe da região no topo para 'region_paid_only' sem filme grátis; planos logo abaixo).
//
// Este guardião RENDERIZA a caixa real (react-dom/server) com um carregador de TypeScript que resolve o '@/'. Só a rede é
// trocada: a leitura do próprio perfil (components/offers/useOwnRegionProfile.ts), o trackEvent (capturado), o cliente do
// Supabase, o idioma da interface e o cartão do passe de região (que pergunta ao servidor). A caixa "de hoje" é a MESMA
// caixa no PAI do commit que introduziu o conserto (git), renderizada com os mesmos props — byte a byte.
// Mutantes: aplicados em memória (node scripts/test-paywall-filme-primeiro-1510.mjs) — todos têm de ficar vermelhos.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const React = require(path.join(ROOT, 'node_modules', 'react'))
const jsxRuntime = require(path.join(ROOT, 'node_modules', 'react', 'jsx-runtime'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules', 'react-dom', 'server'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const temLinha = (src, linha) => src.split('\n').some((l) => l === linha)

const MODAL = 'components/offers/ConversionUpgrade.tsx'
const LIB = 'lib/growth/paywallFilmePrimeiro.ts'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'

// ─── a caixa "de hoje": o arquivo no PAI do commit que introduziu o conserto (ou HEAD, antes do commit) ───────────────────
function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null }
}
const intro = (git(['log', '--format=%H', '-S', 'useOwnRegionProfile', '--', MODAL]) ?? '').split('\n').filter(Boolean).pop() ?? null
const BASE = intro ? `${intro}~1` : 'HEAD'
const baseModal = git(['show', `${BASE}:${MODAL}`])
if (!baseModal) { console.log('FAIL não consegui ler a caixa de hoje no git (' + BASE + ')'); process.exit(1) }
const BASE_MODAL_SRC = baseModal.replace(/\r\n/g, '\n')

// ─── ambiente de render ─────────────────────────────────────────────────────────────────────────────────────────────────
const env = { events: [], lang: 'en', profile: null, clicks: {} }
globalThis.document = { activeElement: null, addEventListener() {}, removeEventListener() {}, querySelectorAll: () => [] }
globalThis.fetch = () => Promise.resolve({ ok: false, json: async () => null })
const reactProxy = { ...React, default: React, useEffect: (fn) => { fn() } } // efeitos rodam na hora (só impressão/ouvintes)
const jsxProxy = {
  ...jsxRuntime,
  jsx: (type, props, key) => { if (props && props['data-testid']) env.clicks[props['data-testid']] = props; return jsxRuntime.jsx(type, props, key) },
  jsxs: (type, props, key) => { if (props && props['data-testid']) env.clicks[props['data-testid']] = props; return jsxRuntime.jsxs(type, props, key) },
}
const STUBS = {
  '@/lib/analytics': { trackEvent: (name, meta) => { env.events.push({ name, meta }); return Promise.resolve() } },
  '@/lib/supabase/client': { createClient: () => { throw new Error('rede no guardião') } },
  '@/components/InterfaceLanguage': { useInterfaceLanguage: () => env.lang },
  '@/components/offers/useOwnRegionProfile': { useOwnRegionProfile: (enabled) => (enabled ? env.profile : null) },
  '@/components/RegionPassOffer': { __esModule: true, default: (p) => jsxRuntime.jsx('div', { 'data-region-pass-stub': p.surface }) },
}

function makeLoader(overrides) {
  const cache = new Map()
  const resolveFile = (abs) => {
    for (const c of [abs, abs + '.ts', abs + '.tsx', path.join(abs, 'index.ts'), path.join(abs, 'index.tsx')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
    }
    throw new Error('não achei ' + abs)
  }
  function load(abs) {
    if (cache.has(abs)) return cache.get(abs).exports
    const rel = path.relative(ROOT, abs).split(path.sep).join('/')
    const src = overrides[rel] ?? fs.readFileSync(abs, 'utf8')
    const js = ts.transpileModule(src, { fileName: abs, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    const mod = { exports: {} }
    cache.set(abs, mod)
    const dir = path.dirname(abs)
    const req = (spec) => {
      if (STUBS[spec]) return STUBS[spec]
      if (spec === 'react') return reactProxy
      if (spec === 'react/jsx-runtime') return jsxProxy
      if (spec.startsWith('@/')) return load(resolveFile(path.join(ROOT, spec.slice(2))))
      if (spec.startsWith('.')) return load(resolveFile(path.join(dir, spec)))
      return require(spec)
    }
    new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
    return mod.exports
  }
  return (rel) => load(resolveFile(path.join(ROOT, rel)))
}

const noop = () => {}
const PROPS = { currency: 'usd', region: 'standard', onClose: noop, onUpgrade: noop, onFilmPass: noop, loading: false, error: null, freeAction: { label: 'Make my included 15-second Seedance film', onClick: noop }, regionPass: { beforeBuy: noop } }
function render(Modal, props, opts = {}) {
  env.events = []; env.clicks = {}; env.lang = opts.lang ?? 'en'; env.profile = opts.profile === undefined ? null : opts.profile
  if (opts.pending) env.profile = undefined
  const err = console.error; console.error = () => {}
  try { return renderToStaticMarkup(React.createElement(Modal, props)) } finally { console.error = err }
}

// ─── a bateria (roda no código real e em cada mutante) ──────────────────────────────────────────────────────────────────
function battery(over = {}) {
  const fails = []
  const ok = (c, m) => { if (!c) fails.push(m) }
  const src = (rel) => over[rel] ?? read(rel)
  const load = makeLoader(over)
  const L = load(LIB)
  const Modal = load(MODAL).default
  const Base = makeLoader({ [MODAL]: BASE_MODAL_SRC })(MODAL).default
  const ofertaVersion = 'mrr0610_v1'

  // 0 — a regra pura
  const d = (o) => L.decidirFilmePrimeiro({ filmsDelivered: 0, isSubscriber: false, notPaidProven: true, freeFilm: false, regionFreeFilm: false, regionPaidOnly: false, ...o })
  ok(d({ freeFilm: true }) === 'free_film', 'regra: teste + 0 filmes + filme grátis → free_film')
  ok(d({ regionFreeFilm: true }) === 'free_film', 'regra: região com o filme grátis → free_film')
  ok(d({ regionPaidOnly: true }) === 'region_pass', 'regra: região sem filme grátis → region_pass')
  ok(d({ freeFilm: true, filmsDelivered: 1 }) === null && d({ freeFilm: true, filmsDelivered: null }) === null, 'regra: ≥1 filme (ou não sei) → caixa de hoje')
  ok(d({ freeFilm: true, isSubscriber: true }) === null && d({ freeFilm: true, notPaidProven: false }) === null, 'regra: quem paga/pode pagar → caixa de hoje')
  ok(d({ regionPaidOnly: null }) === null && d({}) === null, 'regra: região ainda lendo, ou conta comum sem filme grátis → caixa de hoje')
  ok(L.ideiaDoCartao('  um   polvo tem\n três corações  ') === 'um polvo tem três corações' && L.ideiaDoCartao('ab') === null && L.ideiaDoCartao(null) === null, 'ideia: uma linha, vazia = null')
  const longa = L.ideiaDoCartao('palavra '.repeat(40))
  ok(typeof longa === 'string' && longa.length <= 91 && longa.endsWith('…'), 'ideia: longa é cortada em ≤ 90 + …')

  // 1 — 16 línguas (a lista da interface, executada)
  const IL = load('lib/ui/interfaceLanguage.ts')
  const codes = IL.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
  ok(codes.length === 16 && codes.every((c) => L.FILME_PRIMEIRO_COPY[c]), `copy: as 16 línguas da interface têm o cartão (${codes.filter((c) => !L.FILME_PRIMEIRO_COPY[c]).join(',') || 'todas'})`)
  for (const c of codes) {
    const k = L.FILME_PRIMEIRO_COPY[c]
    if (!k) continue
    const fields = [k.kicker, k.title(15), k.ideaLabel, k.body, k.bodyNoIdea, k.cta]
    ok(fields.every((f) => typeof f === 'string' && f.trim().length > 1), `copy ${c}: nenhum campo vazio`)
    ok(k.title(15).includes('15'), `copy ${c}: o título diz os segundos`)
    if (c !== 'en') ok(k.title(15) !== L.FILME_PRIMEIRO_COPY.en.title(15) && k.cta !== L.FILME_PRIMEIRO_COPY.en.cta && k.body !== L.FILME_PRIMEIRO_COPY.en.body, `copy ${c}: traduzida (não é o inglês)`)
    ok(!/watermark|no card|sem cartão|sem marca/i.test(fields.join(' ')), `copy ${c}: não promete o que o filme grátis não garante`)
  }
  ok(L.FILME_PRIMEIRO_COPY.en.title(15) === 'Make your free film first — 15 s, on us', 'copy en: o título pedido')

  // 2 — teste ativo + 0 filmes → cartão do filme grátis PRIMEIRO, planos inteiros abaixo
  let started = null
  const trial = { ...PROPS, filmFirst: { filmsDelivered: 0, idea: 'Why octopuses have three hearts', freeFilm: { variant: 'trial_seedance15', seconds: 15 }, onStart: (v) => { started = v } } }
  const hb = render(Base, PROPS)
  const h = render(Modal, trial)
  const iCard = h.indexOf('data-filme-primeiro="free_film"')
  const iH2 = h.indexOf('id="conversion-upgrade-title"')
  const iPlans = h.indexOf('Making more? Choose a plan.')
  ok(iCard >= 0 && iCard < iH2 && iH2 < iPlans, 'teste + 0 filmes: o cartão do filme grátis vem ANTES do título e dos planos')
  ok(h.includes('Make your free film first — 15 s, on us') && h.includes('Make my free film') && h.includes('Why octopuses have three hearts'), 'teste + 0 filmes: título, botão e a última ideia no cartão')
  const planNames = ['Starter', 'Creator', 'Studio']
  const planRows = (html) => planNames.map((n) => (html.match(new RegExp(`<strong>${n} · [^<]*</strong>`)) ?? [''])[0])
  ok(planRows(h).every(Boolean) && JSON.stringify(planRows(h)) === JSON.stringify(planRows(hb)), 'teste + 0 filmes: os 3 planos visíveis, com os MESMOS preços da caixa de hoje')
  ok(h.includes('Monthly') && h.includes('Annual · save') && (h.includes('data-region-pass-stub') || h.includes('data-conversion-pass')), 'teste + 0 filmes: mensal/anual e o passe de um filme continuam na caixa')
  ok(!h.includes('You still have a film available before you buy.') && !h.includes('<video'), 'teste + 0 filmes: sem a saída pequena repetida e sem a amostra da casa')
  const off = env.events.filter((e) => e.name === 'upgrade_modal_free_film_offered')
  ok(off.length === 1 && off[0].meta.variant === 'trial_seedance15' && off[0].meta.seconds === 15 && off[0].meta.offer_version === ofertaVersion && off[0].meta.has_idea === true, 'evento: upgrade_modal_free_film_offered uma vez, com variante, segundos e offer_version')
  const btn = env.clicks['free-film-first']
  ok(btn && typeof btn.onClick === 'function', 'o cartão tem o botão do filme grátis')
  if (btn) {
    env.events = []
    btn.onClick()
    const clk = env.events.filter((e) => e.name === 'upgrade_modal_free_film_clicked')
    ok(clk.length === 1 && clk[0].meta.variant === 'trial_seedance15' && clk[0].meta.offer_version === ofertaVersion, 'evento: upgrade_modal_free_film_clicked no clique')
    ok(started === 'trial_seedance15', 'clique: devolve a variante ao Studio (onStart)')
  }
  const semIdeia = render(Modal, { ...trial, filmFirst: { ...trial.filmFirst, idea: null } })
  ok(semIdeia.includes(L.FILME_PRIMEIRO_COPY.en.bodyNoIdea) && !semIdeia.includes('Your idea</span>'), 'sem ideia: o cartão convida a escrever uma (não inventa)')

  // 3 — 16 línguas renderizadas (e RTL)
  for (const c of codes) {
    const k = L.FILME_PRIMEIRO_COPY[c]
    if (!k) continue
    const hl = render(Modal, trial, { lang: c })
    ok(hl.includes(k.title(15).replace(/&/g, '&amp;')) && hl.includes(k.cta), `render ${c}: o cartão sai na língua da interface`)
    if (c === 'ar' || c === 'ur') ok(/data-filme-primeiro="free_film"[^>]*dir="rtl"/.test(hl), `render ${c}: direita para a esquerda`)
  }

  // 4 — ≥ 1 filme, não sei, ou sem filmFirst → a caixa de hoje, byte a byte
  for (const [nome, ff] of [['3 filmes', { filmsDelivered: 3, idea: 'x idea', freeFilm: { variant: 'trial_seedance15', seconds: 15 }, onStart: noop }], ['1 filme', { filmsDelivered: 1, idea: null, freeFilm: null, onStart: noop }], ['não sei', { filmsDelivered: null, idea: 'x idea', freeFilm: { variant: 'trial_kineo1', seconds: 35 }, onStart: noop }], ['sem filmFirst', null]]) {
    const hx = render(Modal, { ...PROPS, filmFirst: ff }, { profile: { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 } })
    ok(hx === hb, `${nome}: a caixa é idêntica à de hoje`)
    ok(!env.events.some((e) => e.name.startsWith('upgrade_modal_free_film') || e.name === 'upgrade_modal_pass_first_offered'), `${nome}: nenhum evento novo`)
  }
  // conta comum, 0 filmes, sem filme grátis, perfil lido (não é região) → a de hoje
  const comum = render(Modal, { ...PROPS, filmFirst: { filmsDelivered: 0, idea: 'x idea', freeFilm: null, onStart: noop } }, { profile: { trial_status: 'downgraded', has_paid: false, plan: 'free', video_credits: 0 } })
  ok(comum === hb, 'teste encerrado sem filme grátis (não região): a caixa de hoje')
  // quem paga: a caixa de conversão nem monta (guarda do pai inalterada) e a regra diz null
  const gen = src(GEN)
  ok(temLinha(gen, '  if (MRR_CONVERSION_ENABLED && notPaidProven && !isSubscriber) {'), 'quem paga: a caixa de conversão continua só para quem não assina e comprovadamente não pagou')

  // 5 — região sem filme grátis + 0 filmes → o PASSE primeiro (um só), planos abaixo
  const regiao = { ...PROPS, filmFirst: { filmsDelivered: 0, idea: 'x idea', freeFilm: null, onStart: noop } }
  const hr = render(Modal, regiao, { profile: { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 } })
  const iPass = hr.indexOf('data-region-pass-stub="wall"')
  ok(iPass >= 0 && iPass < hr.indexOf('id="conversion-upgrade-title"') && hr.indexOf('id="conversion-upgrade-title"') < hr.indexOf('Making more? Choose a plan.'), 'região sem filme grátis: o passe vem ANTES do título e dos planos')
  ok(hr.split('data-region-pass-stub').length - 1 === 1 && !hr.includes('data-conversion-pass'), 'região: UM passe só (o lugar de baixo fica vazio)')
  ok(planRows(hr).every(Boolean) && JSON.stringify(planRows(hr)) === JSON.stringify(planRows(hb)), 'região: os 3 planos com os mesmos preços')
  ok(env.events.filter((e) => e.name === 'upgrade_modal_pass_first_offered').length === 1, 'evento: upgrade_modal_pass_first_offered')
  ok(!hr.includes('data-filme-primeiro="free_film"'), 'região sem filme grátis: nenhum cartão de filme grátis')
  // sem o passe da região (interruptor/pai) → o cartão de sempre do passe sobe
  const hr2 = render(Modal, { ...regiao, regionPass: null }, { profile: { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 } })
  ok(hr2.indexOf('data-conversion-pass') >= 0 && hr2.indexOf('data-conversion-pass') < hr2.indexOf('id="conversion-upgrade-title"') && hr2.split('data-conversion-pass=').length - 1 === 1, 'região sem o passe local: o passe de sempre sobe (um só)')
  // região COM o filme grátis (saldo ≥ 1 filme, 0 filmes) → o filme grátis primeiro (Seedance 15 s), o passe no lugar de sempre
  const hrf = render(Modal, regiao, { profile: { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 9 } })
  ok(hrf.indexOf('data-filme-primeiro="free_film"') >= 0 && hrf.indexOf('data-filme-primeiro="free_film"') < hrf.indexOf('id="conversion-upgrade-title"') && hrf.includes('data-variant="region_free_film"'), 'região com o filme grátis: o cartão do filme grátis primeiro')
  ok(hrf.split('data-region-pass-stub').length - 1 === 1 && hrf.indexOf('data-region-pass-stub') > hrf.indexOf('id="conversion-upgrade-title"'), 'região com o filme grátis: o passe continua no lugar de sempre')
  // lendo a região → nenhum passe montado duas vezes, planos já na tela
  const hp = render(Modal, regiao, { pending: true })
  ok(!hp.includes('data-region-pass-stub') && !hp.includes('data-conversion-pass') && planRows(hp).every(Boolean), 'lendo a região: planos na tela, passe espera a leitura (montado uma vez)')

  // 6 — a fiação no Studio (GenerateClient)
  ok(gen.includes("import { ideiaDoCartao, type FilmeGratisVariante } from '@/lib/growth/paywallFilmePrimeiro' // KINEO-PAYWALL-FILME-PRIMEIRO-1510"), 'Studio: importa a régua')
  ok(temLinha(gen, '          filmFirst={{') && temLinha(gen, '            filmsDelivered,') && temLinha(gen, '            idea: ideiaDoCartao(prompt),'), 'Studio: passa filmes entregues e a última ideia à caixa')
  ok(temLinha(gen, "        freeFilm: firstFilmFree && onFirstFilmFree ? { variant: 'free', seconds: TRIAL_FREE_FILM_SECONDS }") &&
    temLinha(gen, "          : trialSeedance15 && onFirstFilmFree ? { variant: 'trial_seedance15', seconds: trialSeedance15.seconds }") &&
    temLinha(gen, "          : trialKineo1 && onFirstFilmFree ? { variant: 'trial_kineo1', seconds: trialKineo1.seconds } : null,"), 'Studio: o filme grátis do topo é o MESMO da saída de baixo (mesma ordem)')
  ok(temLinha(gen, "        onStart: (variant: FilmeGratisVariante) => { if (variant === 'region_free_film') filmFirst.onRegionFreeFilm(); else onFirstFilmFree?.() },"), 'Studio: o clique do teste é o mesmo onFirstFilmFree')
  ok(temLinha(gen, "              setMode('cinematic_ai'); setAiEngine('seedance'); setDuration(SEEDANCE_SHORT_SECONDS)"), 'Studio: o filme grátis de região deixa o Seedance de 15 s escolhido')
  ok(/trialSeedance15=\{\n\s+!CARD_ENTRY_ONLY && entrada15 && !kineo1Shown && trialActive === true && filmsDelivered === 0 && !hasPaid && credits !== null &&\n\s+credits >= custoSeedance\(SEEDANCE_SHORT_SECONDS\)/.test(gen), 'Studio: o filme do teste só existe com 0 filmes e saldo que paga (predicado de sempre)')

  // 7 — dinheiro intocado
  const changed = intro
    ? (git(['diff', '--name-only', `${intro}~1`, intro]) ?? '').split('\n').filter(Boolean)
    : [...(git(['diff', '--name-only', 'HEAD']) ?? '').split('\n'), ...(git(['ls-files', '--others', '--exclude-standard']) ?? '').split('\n')].filter(Boolean)
  const proibido = changed.filter((f) => /^(lib\/checkoutPricing|lib\/engineWall|lib\/homeVideoCuration|lib\/offers\/mrrConversion|lib\/credits\/|lib\/regionPass|app\/api\/stripe\/|app\/api\/credits\/|app\/api\/region-pass\/|components\/RegionPassOffer)/.test(f))
  ok(changed.length > 0 && proibido.length === 0, `dinheiro: preço, checkout, Stripe e crédito intocados (${proibido.join(', ') || 'nenhum arquivo de dinheiro no commit'})`)
  return fails
}

// ─── real ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const real = battery()
if (real.length) {
  for (const f of real) console.log('  FAIL ' + f)
  console.log(`\nVERMELHO: ${real.length} falha(s) no código real`)
  process.exit(1)
}
console.log('  ok  bateria verde no código real (base da caixa de hoje: ' + BASE + ')')

// ─── mutantes (em memória) ──────────────────────────────────────────────────────────────────────────────────────────────
function trocar(rel, a, b) {
  const s = read(rel)
  if (!s.includes(a)) throw new Error(`mutante não aplicou em ${rel}: ${a.slice(0, 70)}`)
  return { [rel]: s.split(a).join(b) }
}
const MUTANTS = [
  ['M1 a regra ignora os filmes entregues', () => trocar(LIB, '  if (f.filmsDelivered !== 0) return null\n', '')],
  ['M2 a região sem filme grátis não ganha o passe no topo', () => trocar(LIB, "  if (f.regionPaidOnly === true) return 'region_pass'\n", '')],
  ['M3 a impressão do cartão some', () => trocar(MODAL, '    void trackEvent(FREE_FILM_OFFERED_EVENT, meta)\n', '')],
  ['M4 o clique não é medido', () => trocar(MODAL, 'onClick={() => { void trackEvent(FREE_FILM_CLICKED_EVENT, meta); onStart(variant) }}', 'onClick={() => { onStart(variant) }}')],
  ['M5 com o cartão, os planos somem (portão)', () => trocar(MODAL, '      {CONVERSION_TIERS.map(tier => {', '      {(leadFree ? [] : CONVERSION_TIERS).map(tier => {')],
  ['M6 o cartão vai para baixo do título', () => {
    const s = read(MODAL)
    const card = '      {leadFree && filmFirst && <FreeFilmFirstCard variant={leadFree.variant} seconds={leadFree.seconds} idea={filmFirst.idea} onStart={filmFirst.onStart} /> /* KINEO-PAYWALL-FILME-PRIMEIRO-1510 */}\n'
    const h2 = "      <h2 id=\"conversion-upgrade-title\" style={{ fontSize: 25, lineHeight: 1.2, margin: '6px 40px 10px 0' }}>Your idea. Your next film.</h2>\n"
    if (!s.includes(card) || !s.includes(h2)) throw new Error('M6 não aplicou')
    return { [MODAL]: s.split(card).join('').split(h2).join(h2 + card) }
  }],
  ['M7 uma língua cai no inglês (vi)', () => {
    const s = read(LIB)
    const a = s.indexOf('  vi: {'); const b = s.indexOf('  },\n', a)
    if (a < 0 || b < 0) throw new Error('M7 não aplicou')
    return { [LIB]: s.slice(0, a) + s.slice(b + 5) }
  }],
  ['M8 o passe aparece duas vezes na região', () => trocar(MODAL, "  const passMovedOrPending = lead === 'region_pass' || regionPending\n", '  const passMovedOrPending = false\n')],
  ['M9 o Studio não manda a ideia', () => trocar(GEN, '            idea: ideiaDoCartao(prompt),', '            idea: null,')],
  ['M10 a caixa mostra o cartão para quem já tem filme', () => trocar(MODAL, '  const leadFree = lead === \'free_film\' && filmFirst\n', '  const leadFree = (lead === \'free_film\' || filmFirst?.freeFilm) && filmFirst\n')],
]
let red = 0
for (const [nome, make] of MUTANTS) {
  let fails
  try { fails = battery(make()) } catch (e) { fails = ['exceção: ' + String(e?.message ?? e).slice(0, 120)] }
  if (fails.length > 0 && !String(fails[0]).startsWith('exceção: mutante não aplicou')) { red++; console.log(`  ok  ${nome} → vermelho (${fails[0]})`) }
  else console.log(`  FAIL ${nome} → sobreviveu`)
}
if (red !== MUTANTS.length) { console.log(`\nVERMELHO: ${MUTANTS.length - red} mutante(s) sobreviveram`); process.exit(1) }
console.log(`\nVERDE: KINEO-PAYWALL-FILME-PRIMEIRO-1510 — bateria verde, ${MUTANTS.length}/${MUTANTS.length} mutantes vermelhos`)
