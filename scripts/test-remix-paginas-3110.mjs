// KINEO-REMIX-PAGINAS-3110 — guardião das duas frentes de aquisição de custo zero de 31/10:
//   A) o filme compartilhado (/v/<id>, só com consentimento do dono) vira "Make your own version": o Studio abre já
//      preenchido com a ideia, o motor e a duração do filme; o laço tem placar (share_page_viewed → remix_clicked →
//      remix_signup, este último gravado só pelo servidor — POST /api/remix/signup confere conta nova + filme publicado,
//      sem encostar no /auth/callback, que concede o trial e é conferido byte a byte por guardião antigo);
//   B) 10 páginas novas no catálogo que o ChatGPT/Bing citam (7 línguas com voz + 3 nichos de negócio local), com
//      sitemap/IndexNow automáticos (INTENT_SLUGS) e llms.txt apontando para cada uma.
// Cada regra roda contra o código real (tem de passar) e contra MUTANTES (cada um tem de derrubar a sua regra).
// Rodar: node scripts/test-remix-paginas-3110.mjs
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const FILES = {
  lib: 'lib/remixPaginas3110.ts',
  server: 'lib/remixPaginas3110Server.ts',
  page: 'app/v/[id]/page.tsx',
  beacon: 'app/v/[id]/SharePageBeacon.tsx',
  cta: 'components/PublicVideoCtaLink.tsx',
  route: 'app/api/remix/signup/route.ts',
  arrival: 'components/RemixSignupArrival.tsx',
  studioArrival: 'components/StudioIdeaArrival.tsx',
  events: 'app/api/events/route.ts',
  premiere: 'components/premiere/Premiere.tsx',
  studio: 'app/(dashboard)/studio/StudioClient.tsx',
  middleware: 'lib/supabase/middleware.ts',
  ideia: 'lib/growth/ideiaPousaNoStudio.ts',
  intent: 'lib/seo/intentPages.ts',
  llms: 'lib/seo/trafego2310.ts',
  langs: 'lib/textLanguage.ts',
  sitemap: 'app/sitemap.ts',
}
const REAL = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))

const run = (src, extra = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exports = {}
  const require = (id) => {
    if (id === '../freeFilmEngine') return { FREE_FILM_ENGINE_NAME: 'Seedance 1.5' }
    throw new Error(`import inesperado: ${id}`)
  }
  vm.runInNewContext(js, { exports, require, URLSearchParams, URL, Map, Set, Array, Object, String, Number, RegExp, ...extra })
  return exports
}

const UUID = '3f2b8c1e-7a4d-4e9b-9c11-0a1b2c3d4e5f'
const NEW_LANGS = [['norwegian', 'no'], ['hungarian', 'hu'], ['slovak', 'sk'], ['croatian', 'hr'], ['slovenian', 'sl'], ['catalan', 'ca'], ['afrikaans', 'af']]
const NEW_NICHES = ['dental-clinics', 'law-firms', 'hotels-and-vacation-rentals']
const PROIBIDAS = [/\b30 credits\b/i, /\$\d/, /every engine unlocked/i, /MiniMax H3/i, /Omni Flash/i, /Seedance 2\.5/i, /voice clon/i, /unlimited/i, /first month/i, /guarantee/i]

function rules(S) {
  const R = []
  const rule = (id, fn) => { let okv = false; try { okv = !!fn() } catch { okv = false } R.push([id, okv]) }
  const L = (() => { try { return run(S.lib) } catch { return {} } })()

  // ── A) o laço do filme compartilhado ────────────────────────────────────────────────────────────────
  rule('A1 o botão abre o cadastro com a ideia e, depois dele, o Studio preenchido (ideia + motor + duração)', () => {
    const href = L.buildRemixHref({ title: '  The island   nobody found  ', sourceVideoId: UUID, engineUsed: 'kling4', durationSeconds: 39 })
    const u = new URL(href, 'https://www.usekineo.com')
    const studio = new URL(u.searchParams.get('redirect'), 'https://www.usekineo.com')
    return u.pathname === '/signup' && u.searchParams.get('prompt') === 'The island nobody found'
      && studio.pathname === '/studio' && studio.searchParams.get('prompt') === 'The island nobody found'
      && studio.searchParams.get('engine') === 'hollywood' && studio.searchParams.get('duration') === '35'
      && !studio.searchParams.has('create_intent') && !studio.searchParams.has('autoanalyze')
  })
  rule('A2 o filme de origem viaja como utm_content (UUID) + campanha do remix, no cadastro e no Studio', () => {
    const u = new URL(L.buildRemixHref({ title: 'x idea', sourceVideoId: UUID }), 'https://x.test')
    const studio = new URL(u.searchParams.get('redirect'), 'https://x.test')
    return [u, studio].every((x) => x.searchParams.get('utm_content') === UUID && x.searchParams.get('intent_campaign') === 'public_video_remake' && x.searchParams.get('utm_source') === 'public_video')
  })
  rule('A3 id inválido não vira atribuição; motor desconhecido não chuta motor', () => {
    const u = new URL(L.buildRemixStudioPath({ title: 'x idea', sourceVideoId: 'abc"><script>', engineUsed: 'veo9', durationSeconds: 61 }), 'https://x.test')
    return !u.searchParams.has('utm_content') && !u.searchParams.has('engine') && u.searchParams.get('duration') === '60'
  })
  rule('A4 duração: 15 só no Seedance; 35/60/90 nos outros; sem duração conhecida, sem ?duration', () =>
    L.remixDurationFrom(14, 'seedance') === 15 && L.remixDurationFrom(14, 'hollywood') === 35 && L.remixDurationFrom(14, null) === 35
    && L.remixDurationFrom(68, null) === 60 && L.remixDurationFrom(95, null) === 90 && L.remixDurationFrom(null, null) === null
    && !new URL(L.buildRemixStudioPath({ title: 'x', sourceVideoId: UUID }), 'https://x.test').searchParams.has('duration'))
  rule('A5 motores: kling4 → hollywood (Kling 4.0), seedance15_fallback → seedance (Seedance 1.5)', () =>
    L.remixEngineFromEngineUsed('kling4') === 'hollywood' && L.remixEngineFromEngineUsed('seedance15_fallback') === 'seedance'
    && L.remixEngineFromEngineUsed(null) === null && L.remixEngineLabel('kling4') === 'Kling 4.0' && L.remixEngineLabel(null) === null)
  rule('A6 o título é cortado em 160 caracteres (o teto do prefill)', () => {
    const u = new URL(L.buildRemixStudioPath({ title: 'a'.repeat(400), sourceVideoId: UUID }), 'https://x.test')
    return u.searchParams.get('prompt').length === 160
  })
  rule('A7 remix_signup só nasce com a campanha do remix E um UUID', () => {
    const p = (q) => new URLSearchParams(q)
    return L.remixSourceFromDestination(p(`intent_campaign=public_video_remake&utm_content=${UUID}`)) === UUID
      && L.remixSourceFromDestination(p(`intent_campaign=intent_law-firms&utm_content=${UUID}`)) === null
      && L.remixSourceFromDestination(p('intent_campaign=public_video_remake&utm_content=nope')) === null
  })
  rule('A8 o destino do Studio atravessa intacto a régua pós-cadastro (destinoDaIdeia) e o redirect do logado', () => {
    const { destinoDaIdeia } = run(S.ideia)
    const studio = L.buildRemixStudioPath({ title: 'x idea', sourceVideoId: UUID, engineUsed: 'kling4', durationSeconds: 60 })
    return destinoDaIdeia(studio) === studio && S.middleware.includes("request.nextUrl.searchParams.get('redirect')")
  })
  rule('A9 o Studio lê exatamente as chaves que o botão manda (prompt, engine, duration, intent_campaign)', () =>
    ["sp.get('engine')", "sp.get('prompt')", "sp.get('duration')", "sp.get('intent_campaign')"].every((k) => S.studio.includes(k)))
  rule('A10 /v: o botão principal E a barra fixa usam o remix do filme, com destino /studio e remix_clicked', () =>
    /href=\{remixFilmHref\}\n\s*videoId=\{params\.id\}\n\s*placement="under_player"\n\s*destination="\/studio"\n\s*remix=\{remixMeta\}/.test(S.page)
    && /href=\{remixFilmHref\}\n\s*videoId=\{params\.id\}\n\s*placement="sticky_bar"\n\s*destination="\/studio"\n\s*remix=\{remixMeta\}/.test(S.page)
    && S.page.includes('Make your own version — free →') && S.page.includes('Make your own version →'))
  rule('A11 /v: o href nasce do helper com o título, o id e o motor lido do banco', () =>
    S.page.includes('const remixFilmHref = buildRemixHref({ title, sourceVideoId: params.id, engineUsed, durationSeconds: v?.durationSeconds ?? null })'))
  rule('A12 /v: motor só é lido depois do consentimento (resultado ok) e por consulta mínima com published_at', () =>
    S.page.includes('const engineUsed = v ? await getPublicVideoEngineUsed(params.id) : null')
    && S.page.indexOf("if (result.status === 'missing') notFound()") < S.page.indexOf('getPublicVideoEngineUsed(params.id)')
    && S.server.includes(".select('engine_used')") && S.server.includes(".not('published_at', 'is', null)")
    && !/select\([^)]*\b(prompt|script|user_id)\b/.test(S.server))
  rule('A13 /v: share_page_viewed (1 vez por filme por aba) só quando a página existe', () =>
    S.page.includes('{v && <SharePageBeacon videoId={params.id} engine={remixEngine} duration={remixDuration} />}')
    && S.beacon.includes("trackEvent('share_page_viewed'") && S.beacon.includes('source_video_id: videoId')
    && S.beacon.includes("sessionStorage.getItem(marker) === '1'"))
  rule('A14 /v: assinatura "Made with Kineo" visível, com o motor real só quando a linha o registra', () =>
    S.page.includes('data-remix-attribution="made-with-kineo"') && S.page.includes("🎬 Made with Kineo{engineLabel ? ` · ${engineLabel}` : ''}"))
  rule('A15 CTA: remix_clicked só sai quando o botão é de remix, com o filme de origem', () =>
    /if \(remix\) \{\n\s*void trackEvent\('remix_clicked', \{\n\s*source_video_id: videoId,/.test(S.cta))
  rule('A16 rota remix_signup: sessão obrigatória, conta NOVA (janela), filme PUBLICADO, uma vez por conta, antes de gravar', () => {
    const r = S.route
    const iWrite = r.indexOf("name: 'remix_signup'")
    return r.includes('if (!user) return json({ ok: false, error: \'unauthorized\' }, 401)')
      && r.includes('if (!(minutes >= 0 && minutes <= REMIX_SIGNUP_WINDOW_MIN))')
      && r.includes(".eq('id', sourceVideoId).not('published_at', 'is', null)")
      && r.includes(".eq('name', 'remix_signup').eq('user_id', user.id)")
      && r.includes("if (Array.isArray(previous) && previous.length > 0) return json({ ok: true, counted: false, reason: 'already_counted' })")
      && [r.indexOf('REMIX_SIGNUP_WINDOW_MIN))'), r.indexOf(".not('published_at'"), r.indexOf(".eq('name', 'remix_signup')")].every((i) => i > 0 && i < iWrite)
      && r.includes('const stored = await writeServerEvent({') && L.REMIX_SIGNUP_WINDOW_MIN === 60
  })
  rule('A17 a chegada no Studio chama a rota uma vez por aba, só com a campanha do remix, e o Studio monta a chegada', () =>
    S.arrival.includes('source = remixSourceFromDestination(new URLSearchParams(window.location.search))')
    && /if \(!source\) return/.test(S.arrival) && S.arrival.includes("if (sessionStorage.getItem(marker) === '1') return")
    && S.arrival.includes("fetch('/api/remix/signup'") && S.studioArrival.includes('<RemixSignupArrival />')
    && !/fetch\(/.test(S.studioArrival))
  rule('A18 o navegador não cunha remix_signup (SERVER_ONLY_EVENTS)', () => {
    const block = S.events.slice(S.events.indexOf('const SERVER_ONLY_EVENTS = new Set(['), S.events.indexOf('])', S.events.indexOf('const SERVER_ONLY_EVENTS = new Set([')))
    return block.includes("'remix_signup',")
  })
  rule('A19 estreia (clipe/imagem/áudio sem página pública): o compartilhamento leva a assinatura', () =>
    S.premiere.includes("text: 'Made with Kineo — usekineo.com', url: props.url"))

  // ── B) as 10 páginas que a IA cita ──────────────────────────────────────────────────────────────────
  const C = (() => { try { return run(S.intent) } catch { return { INTENT_PAGES: [], getIntentPage: () => undefined, INTENT_SLUGS: [] } } })()
  const fresh = [...NEW_LANGS.map(([s]) => s), ...NEW_NICHES].map((s) => C.getIntentPage(s))
  rule('B1 as 7 línguas novas existem na família language com o código do catálogo', () =>
    NEW_LANGS.every(([slug, code]) => { const p = C.getIntentPage(slug); return p && p.family === 'language' && p.language === code }))
  rule('B2 cada língua nova é narrada com voz no catálogo (minimaxBoost)', () =>
    NEW_LANGS.every(([, code]) => new RegExp(`\\{ code: '${code}',[^\\n]*minimaxBoost: '`).test(S.langs)))
  rule('B3 os 3 nichos novos existem na família niche', () => NEW_NICHES.every((s) => C.getIntentPage(s)?.family === 'niche'))
  rule('B4 as 10 têm 3 FAQ (FAQPage do template), prompt próprio com 8+ palavras e motor Seedance', () =>
    fresh.every((p) => p && p.faq.length === 3 && p.examplePrompt.trim().split(/\s+/).length >= 8 && p.engine === 'cinematic_ai'))
  rule('B5 nenhuma frase proibida nas 10 (preço literal, motor pausado, promessa)', () =>
    fresh.every((p) => p && PROIBIDAS.every((re) => !re.test([p.title, p.h1, p.intro, p.engineWhy, p.examplePrompt, ...p.faq.flatMap((f) => [f.q, f.a])].join(' ')))))
  rule('B6 slugs únicos e INTENT_SLUGS (sitemap + IndexNow) inclui as 10', () =>
    new Set(C.INTENT_SLUGS).size === C.INTENT_SLUGS.length && fresh.every((p) => p && C.INTENT_SLUGS.includes(p.slug))
    && S.sitemap.includes('for (const slug of INTENT_SLUGS) {'))
  rule('B7 llms.txt aponta para cada uma das 10', () =>
    [...NEW_LANGS.map(([s]) => s), ...NEW_NICHES].every((s) => S.llms.includes(`/ai-video-generator/for/${s})`)))
  rule('B8 Nynorsk e japonês/coreano/chinês/tailandês seguem sem página', () =>
    ['norwegian-nynorsk', 'nynorsk', 'japanese', 'korean', 'chinese', 'thai'].every((s) => !C.getIntentPage(s)))
  return R
}

// ── código real: tudo verde ─────────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FAIL', m) } }
console.log('— código real —')
const real = rules(REAL)
for (const [id, v] of real) ok(v, id)

// ── mutantes: cada um tem de derrubar a regra dele ──────────────────────────────────────────────────
const MUTANTES = [
  ['A1', 'o botão volta a mandar só o título (sem redirect para o Studio)', 'lib', "  q.set('redirect', buildRemixStudioPath(input))\n", ''],
  ['A1', 'o motor some do Studio', 'lib', "  if (engine) q.set('engine', engine)\n", ''],
  ['A2', 'o filme de origem some da atribuição', 'lib', "  if (sourceVideoId) pairs.push(['utm_content', sourceVideoId])\n", ''],
  ['A3', 'qualquer texto vira id de origem', 'lib', "  return UUID.test(v) ? v.toLowerCase() : null", '  return v || null'],
  ['A4', '15 s em qualquer motor', 'lib', "if (s <= 22 && engine === 'seedance') return 15", 'if (s <= 22) return 15'],
  ['A5', 'kling4 vira Kling 2.5', 'lib', "if (e === 'kling4') return 'hollywood'", "if (e === 'kling4') return 'kling' as RemixEngine"],
  ['A6', 'o teto do título some', 'lib', '.trim().slice(0, REMIX_TITLE_MAX_CHARS)', '.trim()'],
  ['A7', 'qualquer campanha vira remix_signup', 'lib', "  if ((params.get('intent_campaign') ?? '').trim() !== REMIX_CAMPAIGN) return null\n", ''],
  ['A8', 'o destino vira a casa de máquinas com auto-start', 'lib', "return `/studio?${q.toString()}`", "return `/studio/create?${q.toString()}&create_intent=fast`"],
  ['A10', 'o botão principal volta ao /signup?prompt= antigo', 'page', 'href={remixFilmHref}\n            videoId={params.id}\n            placement="under_player"', "href={generateFromScriptHref(title, 'public_video_remake')}\n            videoId={params.id}\n            placement=\"under_player\""],
  ['A10', 'a barra fixa perde o remix_clicked', 'page', 'placement="sticky_bar"\n          destination="/studio"\n          remix={remixMeta}', 'placement="sticky_bar"\n          destination="/studio"'],
  ['A12', 'o motor é lido antes do consentimento', 'page', 'const engineUsed = v ? await getPublicVideoEngineUsed(params.id) : null', 'const engineUsed = await getPublicVideoEngineUsed(params.id)'],
  ['A12', 'a consulta do motor esquece o consentimento', 'server', "      .not('published_at', 'is', null)\n", ''],
  ['A12', 'a consulta do motor passa a ler o prompt privado', 'server', ".select('engine_used')", ".select('engine_used, prompt')"],
  ['A13', 'o beacon conta a cada recarga', 'beacon', "      if (sessionStorage.getItem(marker) === '1') return\n", ''],
  ['A14', 'a assinatura some', 'page', 'data-remix-attribution="made-with-kineo"', ''],
  ['A15', 'remix_clicked sai de qualquer CTA', 'cta', 'if (remix) {', 'if (true) {'],
  ['A16', 'remix_signup para conta antiga', 'route', 'if (!(minutes >= 0 && minutes <= REMIX_SIGNUP_WINDOW_MIN))', 'if (false)'],
  ['A16', 'id de filme não publicado conta', 'route', ".eq('id', sourceVideoId).not('published_at', 'is', null)", ".eq('id', sourceVideoId)"],
  ['A16', 'remix_signup duplicado por conta', 'route', "    if (Array.isArray(previous) && previous.length > 0) return json({ ok: true, counted: false, reason: 'already_counted' })\n", ''],
  ['A17', 'a chegada chama a rota em toda recarga', 'arrival', "      if (sessionStorage.getItem(marker) === '1') return\n", ''],
  ['A17', 'o Studio deixa de montar a chegada do remix', 'studioArrival', '      <RemixSignupArrival />\n', ''],
  ['A18', 'o navegador volta a poder cunhar remix_signup', 'events', "  'remix_signup', //", '  //'],
  ['A19', 'a estreia compartilha sem assinatura', 'premiere', "text: 'Made with Kineo — usekineo.com', ", ''],
  ['B1', 'uma língua nova some', 'intent', "  { name: 'Catalan', code: 'ca'", "  // { name: 'Catalan', code: 'ca'"],
  ['B2', 'língua sem voz no catálogo', 'langs', "{ code: 'hu', name: 'Hungarian', native: 'Magyar', captionFont: DEFAULT_CAPTION_FONT, minimaxBoost: 'Hungarian',", "{ code: 'hu', name: 'Hungarian', native: 'Magyar', captionFont: DEFAULT_CAPTION_FONT,"],
  ['B3', 'um nicho novo some', 'intent', "  { name: 'law firms',", "  // { name: 'law firms',"],
  ['B4', 'prompt raso', 'intent', "prompt: 'Three things to do within walking distance of a seaside hotel on a rainy day'", "prompt: 'Hotel rainy day'"],
  ['B5', 'preço literal numa página nova', 'intent', "who: 'firms explaining one common legal question a week in plain language'", "who: 'firms explaining one legal question a week for $9'"],
  ['B7', 'o llms.txt esquece uma página', 'llms', '[law firms](${base}/ai-video-generator/for/law-firms), ', ''],
  ['B8', 'Nynorsk ganha página duplicada', 'intent', "  { name: 'Afrikaans', code: 'af'", "  { name: 'Nynorsk', code: 'nn', prompt: 'Korleis isen forma fjordane på Vestlandet og kvifor dei er djupe', note: 'Nynorsk.' },\n  { name: 'Afrikaans', code: 'af'"],
]
console.log('— mutantes —')
for (const [id, nome, key, from, to] of MUTANTES) {
  if (!REAL[key].includes(from)) { ok(false, `mutante "${nome}" não aplicável (âncora ausente em ${FILES[key]})`); continue }
  const S = { ...REAL, [key]: REAL[key].replace(from, to) }
  const got = rules(S).find(([rid]) => rid.startsWith(`${id} `))
  ok(got && got[1] === false, `mutante "${nome}" derruba ${id}`)
}
console.log(`${fail ? '🔴' : '🟢'} remix-paginas-3110: ${pass}/${pass + fail}`)
if (fail) process.exit(1)
