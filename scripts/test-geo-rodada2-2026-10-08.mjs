// KINEO-GEO-RODADA2-2026-10-08 — guardião da rodada 2 de GEO (sessão CEO 08/10: "nosso grande problema é o fluxo"; meta 300
// sessões/semana vindas do ChatGPT até 22/10). Executa o código real, offline (sem rede, sem banco, sem render pago), e prova:
//   (A) PÁGINA DO SEEDANCE 1.5 — dentro do cartão de preço (e SÓ no slug do Seedance): "é grátis e para quem" com os números
//       dos MESMOS interruptores que concedem (trial, filme de 15 s, filme e clipe de quem é de fora da lista); o CTA do filme
//       grátis abre o Studio com ?engine=seedance&duration=15 pela campanha seo_engine_seedance; a tabela 1.5 × 2.5 com os
//       preços das duas camadas citáveis (some com o 2.5 pausado); os filmes REAIS da vitrine do fundador renderizados no
//       Seedance, cada um com a ideia real no Studio; nenhum <video> a mais; as duas entradas novas no FAQPage;
//   (B) ESTUDO "STATE OF AI SHORTS" — a página lê a edição (data/state-of-ai-shorts/<AAAA-MM>.json): selo "Updated <mês>",
//       data, janela e fonte; SEM VOLUME ABSOLUTO (texto, metadados e JSON-LD); a faixa de amostra só na metodologia; a
//       edição recusa contagem; o espelho da manchete (sitemap e llms.txt) = o JSON; a consulta salva é só leitura, tem a
//       janela/edição do JSON, as contas da casa de lib/internalAccounts.ts e os mesmos nichos/cortes da lib; o módulo da
//       edição importa o JSON mais novo da pasta; as ideias do formulário são as dos três nichos que lideram;
//   (C) NICHOS — cada nicho com filme real da casa existe, o H1 espelhado bate com a página, o bloco renderiza o filme da
//       vitrine com o selo do motor real, a ideia e o CTA que leva ESSA ideia (buildPromptedSignupHref), diz quando o motor do
//       exemplo é pago e cita a posição do nicho na edição; nicho sem filme fica sem bloco;
//   (D) SITEMAP, LLMS.TXT E PING — lastmod real nas páginas desta rodada (sem re-datar o resto); as linhas do llms.txt
//       (estudo, Seedance, nichos, novidade datada); o ping do IndexNow (ensaio offline) escolhe EXATAMENTE as URLs da rodada.
// Cada regra tem mutante EM MEMÓRIA que precisa ficar VERMELHO pelo motivo certo, e controles (a fonte muda) que ficam VERDES.
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { engineFixture } from './gpt24h-engine-fixture.mjs'
import { React, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const BASE = 'https://www.usekineo.com'
const ENGINE_PAGE = 'app/ai-video-generator/[engine]/page.tsx'
const S25_PAGE = 'app/ai-video-generator/seedance-2-5/page.tsx'
const STATE_PAGE = 'app/state-of-ai-shorts-2026/page.tsx'
const NICHE_PAGE = 'app/free-ai-shorts/[niche]/page.tsx'
const SITEMAP = 'app/sitemap.ts'
const LLMS = 'app/llms.txt/route.ts'
const STATE_LIB = 'lib/seo/stateOfAiShorts.ts'
const STATE_EDITION_MOD = 'lib/seo/stateOfAiShortsEdition.ts'
const STATE_HEADLINE_MOD = 'lib/seo/stateOfAiShortsHeadline.ts'
const IDEAS = 'lib/seo/houseFilmIdeas.ts'
const ANSWER = 'lib/seo/seedanceAnswer.ts'
const CARD_COMPONENT = 'components/EngineCitationAnswer.tsx'
const SEEDANCE_COMPONENT = 'components/SeedanceAnswerSections.tsx'
const NICHE_COMPONENT = 'components/NicheHouseFilm.tsx'
const POLICY = 'lib/freeFilmPolicy.ts'
const PRICING = 'lib/checkoutPricing.ts'
const LAUNCH = 'lib/engineLaunch.ts'
const INTERNAL = 'lib/internalAccounts.ts'
const DATA_DIR = 'data/state-of-ai-shorts'
const PING = 'scripts/indexnow-ping-2026-10-08.mjs'
const CAMPAIGN = 'seo_engine_seedance'
// As decisões, escritas AQUI de forma independente da lib (a lib tem de bater com elas):
const RODADA2_ISO = '2026-10-08'
const UNKNOWN_MAX = 20 // regra do índice v2: desconhecido acima de 20% = "not enough data"
const MIN_SAMPLE = 10
const TIER_MOST = 10
const TIER_COMMON = 5
const NICHOS_DA_RODADA = ['mystery', 'history', 'truecrime', 'facts', 'money', 'science', 'horror'] // os 6 da sessão CEO + horror
const ENGINE_NAMES = { cinematic_ai: 'Seedance 1.5', cinematic_kling: 'Kling 2.5', cinematic_veo: 'Veo 3.1', cinematic_hollywood: 'Kling 3', cinematic_h3: 'MiniMax H3', cinematic_omni: 'Omni Flash' }
const CONTAGEM = /\b\d[\d,]*\s+(?:finished\s+|ai[- ]generated\s+|real\s+|distinct\s+|customer\s+)?(?:videos|films|shorts|creators|people|renders|customers|accounts|users|requests)\b/i

const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texto = (html) => unesc(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const usd = (cents) => `$${(Math.round(cents) / 100).toFixed(2)}`
const money = (cents) => (cents % 100 === 0 ? `$${cents / 100}` : usd(cents))
const ldDe = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]) } catch { return null } }).filter(Boolean)
const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => unesc(m[1]))
const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const mesAno = (ed) => { const [y, m] = ed.split('-').map(Number); return `${MESES[m - 1]} ${y}` }
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1))

// ── carregadores (fonte real; `world.rep` troca arquivos em memória; `world.json` troca a edição; `world.dir` a pasta) ──────
const plain = (name) => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
const ctaMock = { __esModule: true, default: ({ children, source, placement, analyticsEvent, focusTargetId, ...props }) => React.createElement('a', { ...props, 'data-source': source, 'data-placement': placement }, children) }
function stateMocks(world) {
  const lib = offlineModules({ replacements: world.rep })(STATE_LIB)
  const mocks = {
    'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': { __esModule: true, default: ({ examples }) => React.createElement('div', { 'data-offline-boundary': 'TopicGeneratorForm', 'data-examples': JSON.stringify(examples ?? []) }) },
    'components/AgencyVolumeBridge.tsx': { __esModule: true, default: plain('AgencyVolumeBridge') },
    'components/ScriptToSeedanceBridge.tsx': { __esModule: true, default: plain('ScriptToSeedanceBridge') },
    'components/OrganicCtaLink.tsx': ctaMock,
  }
  if (world.json) mocks[STATE_EDITION_MOD] = { STATE_DATA_FILE: 'x', STATE_EDITION: lib.parseStateEdition(world.json) }
  return mocks
}
function nicheModules(world) {
  return offlineModules({
    replacements: world.rep,
    mocks: {
      'components/Footer.tsx': { __esModule: true, default: plain('Footer') },
      'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': { __esModule: true, default: plain('TopicGeneratorForm') },
      'app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx': { __esModule: true, default: plain('LocalBusinessAdBrief') },
      'components/OrganicCtaLink.tsx': ctaMock,
      'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
    },
  })
}
const SITEMAP_MOCKS = (nicheSlugs) => ({
  'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: nicheSlugs }, 'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
  'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] }, 'lib/comparisons.ts': { CANONICAL_SLUGS: [] }, 'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
  'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
  'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
  'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
  'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
})
const listaPasta = (world) => world.dir ?? readdirSync(join(ROOT, DATA_DIR))
const jsonVigente = () => JSON.parse(rd(`${DATA_DIR}/${edicaoImportada({})}.json`))
function edicaoImportada(rep) {
  const src = rep[STATE_EDITION_MOD] ?? rd(STATE_EDITION_MOD)
  return (src.match(/^import\s+\w+\s+from\s+'\.\.\/\.\.\/data\/state-of-ai-shorts\/(\d{4}-\d{2})\.json'/m) ?? [])[1] ?? null
}

/** Tudo o que esta rodada promete, medido no código real com as trocas do `world`. [] = verde. */
async function problemas(world = { rep: {} }) {
  const p = []
  const rep = world.rep
  const fx = engineFixture(rep)
  const cost = fx('lib/credits/engineCost.ts')
  const pricing = fx(PRICING)
  const offer = fx('lib/freeTierOffer.ts')
  const policy = fx(POLICY)
  const answer = fx(ANSWER)
  const ideas = fx(IDEAS)
  const cat = fx('lib/growth/enginePageCatalog.ts')
  const launch = fx(LAUNCH)
  const showcase = fx('lib/publicExamples.ts')

  // ═══ (A) página do Seedance 1.5 ═══════════════════════════════════════════════════════════════════════════════════
  const geo15 = cat.ENGINE_GEO.seedance
  if (!geo15) p.push('A: Seedance sem camada citável')
  const html = renderToStaticMarkup(await fx(ENGINE_PAGE).default({ params: { engine: 'seedance' } }))
  const t = texto(html)
  const card = html.match(/<section data-kineo="engine-price-card"[\s\S]*?<\/section>/)?.[0] ?? ''
  const bloco = card.slice(card.indexOf('<div data-kineo="seedance-answers"'))
  if (!card.includes('<div data-kineo="seedance-answers"')) p.push('A: bloco do Seedance fora do cartão de preço (os guardiões de trava só descontam o cartão)')
  if (card.indexOf('<div data-kineo="seedance-answers"') < card.indexOf('60 seconds+ is the length')) p.push('A: bloco do Seedance antes da frase da marca do cartão')
  if ((html.match(/<video /g) ?? []).length !== 2) p.push(`A: a página do Seedance tem ${(html.match(/<video /g) ?? []).length} <video> (são exatamente 2)`)
  for (const slug of ['veo', 'kling', 'kling-3', 'minimax-h3']) {
    if (!cat.ENGINES[slug]) continue
    const outra = renderToStaticMarkup(await fx(ENGINE_PAGE).default({ params: { engine: slug } }))
    if (outra.includes('data-kineo="seedance-answers"')) p.push(`A: bloco do Seedance fora da página do Seedance (${slug})`)
  }
  if (cat.ENGINES['seedance-2-5'] && launch.S25_PUBLIC) {
    const s25html = renderToStaticMarkup(await fx(S25_PAGE).default())
    if (s25html.includes('data-kineo="seedance-answers"')) p.push('A: bloco do Seedance fora da página do Seedance (seedance-2-5)')
  }
  // o grátis e para quem — conta feita AQUI, das constantes que concedem
  const restrito = policy.FREE_FILM_POLICY === 'pais_rico'
  const anunciar = answer.ANNOUNCE_REGION_FREE_OFFER === true
  const regiaoFilme = restrito && anunciar && policy.REGION_FREE_FILM_LIVE && policy.REGION_FREE_FILM_QUALITY === 'cinematic_ai'
  const seg = offer.TRIAL_FREE_FILM_SECONDS
  const crFilme = cost.creditCostForDuration('cinematic_ai', true, seg)
  const trial = offer.TRIAL_CREDITS_SHOWN
  const clipSeedance = geo15?.rows.clip
  const regiaoClipe = restrito && anunciar && policy.REGION_FREE_CLIP_PUBLIC && clipSeedance && clipSeedance.credits <= policy.REGION_FREE_CLIP_CREDITS ? clipSeedance.seconds : null
  const tb = texto(bloco)
  if (crFilme > trial) p.push('A: o teste não paga o filme curto (a régua desta página presume que paga)')
  if (!tb.includes(`${trial} free credits on signup — your free ${seg}-second Seedance 1.5 film uses ${crFilme}.`)) p.push(`A: grátis: créditos do filme ≠ fonte (${trial} cr, ${seg} s, ${crFilme} cr)`)
  const fraseRegiao = `New account anywhere else: one free ${seg}-second Seedance 1.5 film${regiaoClipe ? `, plus one free ${regiaoClipe}-second clip` : ''}.`
  if (regiaoFilme && !tb.includes(fraseRegiao)) p.push('A: grátis: o filme de quem é de fora da lista (interruptor ligado) não aparece')
  if (!regiaoFilme && /anywhere else: one free \d+-second Seedance/.test(tb)) p.push('A: grátis: região anunciada com o filme desligado (ou anúncio desligado)')
  const lead = regiaoFilme || !restrito ? `Yes — one free ${seg}-second Seedance 1.5 film for every new account` : `Yes, in supported countries — one free ${seg}-second Seedance 1.5 film for every new account there`
  if (!tb.includes(lead)) p.push(`A: grátis: a primeira frase não é "${lead}"`)
  const starterUsd = pricing.TIER_PRICES.starter.usd
  const starterCr = pricing.TIER_CREDITS.starter
  const n35 = Math.floor(starterCr / cost.creditCostForDuration('cinematic_ai', true, 35))
  const n60 = Math.floor(starterCr / cost.creditCostForDuration('cinematic_ai', true, 60))
  if (!tb.includes(`Starter (${money(starterUsd)}/month, ${starterCr} credits) covers ${n35} ${n35 === 1 ? 'film' : 'films'} of 35 seconds or ${n60} of 60 seconds.`)) p.push('A: grátis: a linha do Starter ≠ checkout')
  if (!tb.includes('Free films carry a small Kineo watermark; any paid plan downloads clean.')) p.push('A: grátis: sem a marca d’água dita')
  // CTA do filme grátis
  // (o OrganicCtaLink do engineFixture é um <a> simples: o CTA é achado pelo rótulo)
  const cta = bloco.match(/<a href="([^"]+)"[^>]*>(Make your free \d+-second Seedance film →)<\/a>/)
  if (!cta) p.push('A: CTA do filme grátis ausente')
  else {
    const u = new URL(unesc(cta[1]), BASE)
    const dest = new URL(u.searchParams.get('redirect') ?? '/', BASE)
    if (u.pathname !== '/signup' || u.searchParams.get('intent_campaign') !== CAMPAIGN || dest.pathname !== '/studio' || dest.searchParams.get('engine') !== 'seedance' || dest.searchParams.get('duration') !== String(seg) || dest.searchParams.get('intent_campaign') !== CAMPAIGN) {
      p.push(`A: CTA do filme grátis não abre o Studio no Seedance de ${seg} s pela campanha (${unesc(cta[1])})`)
    }
    if (/^Make a /.test(unesc(cta[2]))) p.push('A: CTA do filme grátis usa o rótulo dos CTAs de cadastro ("Make a … video") — colide com a trava da rodada 1')
  }
  if (!rd(SEEDANCE_COMPONENT).includes('placement="free_answer"') || !rd(SEEDANCE_COMPONENT).includes('source={SEEDANCE_CAMPAIGN}')) p.push('A: o CTA do filme grátis não mede o clique (organic_cta_clicked com a campanha)')
  // 1.5 × 2.5
  const geo25 = cat.ENGINE_GEO['seedance-2-5'] ?? null
  const s25Ativo = Boolean(geo25)
  const vs = bloco.match(/<div data-kineo="seedance-vs-25"[\s\S]*?<\/table>/)?.[0] ?? ''
  if (s25Ativo && !vs) p.push('A: sem a tabela 1.5 × 2.5 com o 2.5 no ar')
  if (!s25Ativo && bloco.includes('data-kineo="seedance-vs-25"')) p.push('A: tabela 1.5 × 2.5 com o 2.5 fora do ar')
  if (s25Ativo && vs) {
    const ref = { usd: pricing.TIER_PRICES.basic.usd, cr: pricing.TIER_CREDITS.basic }
    const cents = (cr) => Math.round((cr * ref.usd) / ref.cr)
    const linhas = [...vs.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => texto(c[1])))
    for (const [rotulo, segs] of [['Narrated film, 35 seconds', 35], ['Narrated film, 60 seconds', 60]]) {
      const l = linhas.find((x) => x[0] === rotulo)
      const c15 = cost.creditCostForDuration('cinematic_ai', true, segs)
      const c25 = cost.creditCostForDuration('cinematic_s25', true, segs)
      if (!l || l[1] !== `${c15} credits (about ${usd(cents(c15))})` || l[2] !== `${c25} credits (about ${usd(cents(c25))})`) p.push(`A: 1.5 × 2.5: linha "${rotulo}" ≠ fonte (${JSON.stringify(l)})`)
    }
    const lm = linhas.find((x) => (x[0] ?? '').startsWith('60-second films a month on Creator'))
    if (!lm || lm[1] !== String(Math.floor(ref.cr / cost.creditCostForDuration('cinematic_ai', true, 60))) || lm[2] !== String(Math.floor(ref.cr / cost.creditCostForDuration('cinematic_s25', true, 60)))) p.push('A: 1.5 × 2.5: filmes por mês no Creator ≠ fonte')
    const quem = linhas.find((x) => x[0] === 'Who can use it')
    if (!quem || (launch.engineIsPaidPlansOnly('s25') && quem[2] !== 'Paid plans only — not in the free trial')) p.push('A: 1.5 × 2.5: o 2.5 não diz que é só de plano pago')
    if (!hrefs(vs.length ? bloco : '').includes('/ai-video-generator/seedance-2-5')) p.push('A: 1.5 × 2.5 sem o link da página do 2.5')
  }
  // filmes reais da vitrine, renderizados no Seedance 1.5
  const vitrine = [...showcase.ENGINE_PAGE_LEAD, ...showcase.FOUNDER_SHOWCASE]
  const problemasSementes = ideas.houseFilmSeedProblems()
  if (problemasSementes.length) p.push(`sementes: ${problemasSementes.join(' | ')}`)
  const cards = [...bloco.matchAll(/<img src="([^"]+)" alt="([^"]*)"[^>]*\/?>\s*<p[^>]*>([^<]*)<\/p>\s*<a href="([^"]+)"[^>]*>Start from this idea →<\/a>/g)]
  const esperados = ideas.seedanceGalleryFilms()
  if (cards.length === 0 || cards.length !== esperados.length) p.push(`A: galeria com ${cards.length} filmes (esperado ${esperados.length})`)
  for (const [i, c] of cards.entries()) {
    const f = esperados[i]
    const v = vitrine.find((x) => x.posterPath === c[1])
    if (!v || v.engine !== 'cinematic_ai' || v.ownershipEvidence !== 'founder_confirmed_owned') p.push(`A: filme da galeria fora da vitrine do Seedance (${c[1]})`)
    if (!existsSync(join(ROOT, 'public', c[1]))) p.push(`A: capa ausente em public/ (${c[1]})`)
    const u = new URL(unesc(c[4]), BASE)
    const dest = new URL(u.searchParams.get('redirect') ?? '/', BASE)
    if (!f || dest.searchParams.get('prompt') !== f.idea || dest.searchParams.get('engine') !== 'seedance' || dest.searchParams.get('intent_campaign') !== CAMPAIGN || u.searchParams.get('intent_campaign') !== CAMPAIGN) p.push(`A: o atalho do filme "${unesc(c[3])}" não leva a ideia real dele ao Studio no Seedance`)
  }
  // FAQPage: as duas entradas novas, com os números da fonte
  const faq = ldDe(html).find((x) => x['@type'] === 'FAQPage')
  const qGratis = faq?.mainEntity?.find((x) => x.name === 'Can I use Seedance 1.5 without paying?')
  if (!qGratis || !qGratis.acceptedAnswer.text.includes(`one free ${seg}-second Seedance 1.5 film`) || !qGratis.acceptedAnswer.text.includes(`(the film uses ${crFilme})`) || (regiaoFilme !== qGratis.acceptedAnswer.text.includes('elsewhere it is granted as one free film'))) p.push('A: FAQ "without paying" ≠ fonte/interruptores')
  const qVs = faq?.mainEntity?.find((x) => x.name === 'Seedance 1.5 vs Seedance 2.5 — what is the difference on Kineo?')
  if (s25Ativo && (!qVs || !qVs.acceptedAnswer.text.includes(`${cost.creditCostForDuration('cinematic_s25', true, 35)} credits for 35 seconds and ${cost.creditCostForDuration('cinematic_s25', true, 60)} for 60`))) p.push('A: FAQ 1.5 × 2.5 ausente ou ≠ fonte')
  if (!s25Ativo && qVs) p.push('A: FAQ 1.5 × 2.5 com o 2.5 fora do ar')
  if (/\b(weekly|every week|each week)\b/i.test(tb)) p.push('A: o bloco anuncia a cota semanal (não é anunciada)')
  if (/qualif/i.test(texto(card))) p.push('A: promete que o vídeo "se qualifica"')

  // ═══ (B) o estudo ═════════════════════════════════════════════════════════════════════════════════════════════════
  const json = world.json ?? jsonVigente()
  const stLib = offlineModules({ replacements: rep })(STATE_LIB)
  let ed = null
  try { ed = stLib.parseStateEdition(json) } catch (err) { p.push(`B: edição recusada: ${err.message}`) }
  if (ed) {
    const st = offlineModules({ replacements: rep, mocks: stateMocks(world) })
    const page = st(STATE_PAGE)
    const sh = renderToStaticMarkup(page.default())
    const meta = await page.generateMetadata()
    const tt = texto(sh)
    const label = mesAno(ed.edition)
    const selo = `Updated ${label}`
    if (!tt.includes(`Original research · ${selo}`)) p.push(`B: sem o selo "${selo}" no topo`)
    if (meta.title !== `State of AI Shorts 2026 — Original Data, ${selo}` || meta.openGraph?.title !== meta.title || meta.twitter?.title !== 'State of AI Shorts 2026') p.push(`B: título ≠ o da edição (${meta.title})`)
    if (meta.openGraph?.siteName !== 'Kineo (usekineo.com)') p.push('B: og:site_name sem o domínio')
    const lido = `${MESES[Number(ed.measuredAt.slice(5, 7)) - 1]} ${Number(ed.measuredAt.slice(8, 10))}, ${ed.measuredAt.slice(0, 4)}`
    if (!tt.includes(`Source: Kineo production database, customer accounts only (internal and test accounts excluded), read ${lido}.`)) p.push('B: sem a fonte e a data da leitura')
    // SEM VOLUME ABSOLUTO — texto, metadados e JSON-LD
    const ld = ldDe(sh)
    const tudo = [tt, meta.title, meta.description, JSON.stringify(ld)].join(' \n ')
    const cont = tudo.match(CONTAGEM)
    if (cont) p.push(`B: contagem publicada ("${cont[0]}")`)
    if (/\bn\s*=\s*\d/.test(tudo)) p.push('B: "n = …" publicado')
    for (const velho of ['472', '331 ', 'updated daily', 'last read August', 'Fast Mode', 'engine mix']) if (tudo.includes(velho)) p.push(`B: resto da versão antiga ("${velho}")`)
    // faixa de amostra SÓ na metodologia
    const metodo = sh.slice(sh.indexOf('>Methodology</h2>'))
    const antes = texto(sh.slice(0, sh.indexOf('>Methodology</h2>')))
    if (/n ≥ \d|n \d+–\d+/.test(antes)) p.push('B: faixa de amostra fora da metodologia')
    if (!texto(metodo).includes('Sample: n ≥ 100.') && !texto(metodo).includes('Sample: n 10–99.')) p.push('B: a metodologia não dá a faixa da amostra')
    // números da edição na página e no JSON-LD
    if (ed.renderTime && (!tt.includes(`${fmt(ed.renderTime.medianMinutes)} min`) || !tt.includes(`${fmt(ed.renderTime.p90Minutes)} min`))) p.push('B: tempo da edição fora da página')
    if (ed.length && !tt.includes(`${fmt(ed.length.pct60Plus)}%`)) p.push('B: % de 60 s+ da edição fora da página')
    const rel = ed.reliability && ed.reliability.pct !== null && ed.reliability.unknownPct <= UNKNOWN_MAX ? ed.reliability.pct : null
    if (ed.reliability && rel === null && !tt.includes('not enough data')) p.push('B: confiabilidade sem dado não diz "not enough data"')
    if (ed.reliability && rel !== null && !tt.includes(`${fmt(rel)}%`)) p.push('B: confiabilidade da edição fora da página')
    if (ed.reliability && ed.reliability.pct !== null && ed.reliability.unknownPct > UNKNOWN_MAX && tudo.includes(`${fmt(ed.reliability.pct)}%`)) p.push('B: taxa publicada com o desconhecido acima do corte')
    const article = ld.find((x) => x['@type'] === 'Article')
    const dataset = ld.find((x) => x['@type'] === 'Dataset')
    const faqSt = ld.find((x) => x['@type'] === 'FAQPage')
    if (!article || article.dateModified !== ed.measuredAt.slice(0, 10) || article.datePublished !== '2026-07-24') p.push('B: Article sem a data da edição')
    if (!dataset || dataset.dateModified !== ed.measuredAt.slice(0, 10) || (dataset.variableMeasured ?? []).some((v) => /total|count|creators|videos$/i.test(v.name))) p.push('B: Dataset sem a data da edição ou com contagem')
    if (!faqSt || (faqSt.mainEntity ?? []).length < 2) p.push('B: sem FAQPage da edição')
    // nichos: os três que lideram viram as ideias do formulário; o ranking renderiza com link para as páginas de nicho
    const top = ed.niches.ranking.slice(0, 3).map((r) => stLib.STATE_NICHES[r.key].starterIdea)
    const ex = JSON.parse(unesc(sh.match(/data-examples="([^"]*)"/)?.[1] ?? '[]'))
    if (JSON.stringify(ex) !== JSON.stringify(top)) p.push(`B: ideias do formulário ≠ três nichos que lideram (${JSON.stringify(ex)})`)
    for (const r of ed.niches.ranking) {
      const meta2 = stLib.STATE_NICHES[r.key]
      if (meta2.path && !sh.includes(`href="${meta2.path}"`)) p.push(`B: nicho ${r.key} sem link para ${meta2.path}`)
    }
    if (!sh.includes('href="/seedance-vs-veo-vs-kling"') || !sh.includes('href="/ai-video-index"')) p.push('B: sem os links para as páginas de dado irmãs')
  }
  // a edição recusa contagem e campo novo
  try { stLib.parseStateEdition({ ...jsonVigente(), length: { ...jsonVigente().length, films: 1 } }); p.push('B: a edição aceitou uma contagem') } catch { /* ok */ }
  // o espelho da manchete = o JSON vigente
  const mirror = offlineModules({ replacements: rep })(STATE_HEADLINE_MOD).STATE_HEADLINE
  let vig = null
  try { vig = stLib.parseStateEdition(world.json ?? jsonVigente()) } catch { /* acusado acima */ }
  if (vig && JSON.stringify(mirror) !== JSON.stringify(stLib.stateHeadlineFrom(vig))) p.push('B: espelho da manchete ≠ JSON da edição (sitemap e llms.txt mentiriam)')
  // a edição vigente = a mais nova da pasta; toda edição tem a .sql
  const arquivos = listaPasta(world)
  const edicoes = arquivos.filter((a) => /^\d{4}-\d{2}\.json$/.test(a)).map((a) => a.slice(0, 7)).sort()
  const importada = edicaoImportada(rep)
  if (!importada || importada !== edicoes[edicoes.length - 1]) p.push(`B: a página lê ${importada}, mas a edição mais nova da pasta é ${edicoes[edicoes.length - 1]}`)
  for (const e of edicoes) if (!arquivos.includes(`${e}.sql`)) p.push(`B: ${e}.json sem ${e}.sql ao lado`)
  // a consulta salva
  if (importada) {
    const sqlRel = `${DATA_DIR}/${importada}.sql`
    const sql = (rep[sqlRel] ?? rd(sqlRel)).replace(/--[^\n]*/g, '')
    const data = world.json ?? jsonVigente()
    for (const re of [/\binsert\s+into\b/i, /\bdelete\s+from\b/i, /\bupdate\s+[\w.]+\s+set\b/i, /\b(drop|alter|truncate|grant|revoke|copy)\b/i, /\bcreate\s+(table|function|or|index|view|policy|trigger|schema|extension)\b/i]) if (re.test(sql)) p.push(`B: a consulta escreve no banco (${re})`)
    const iso = (s) => s.replace('T', ' ').replace('Z', '+00')
    if (!sql.includes(`timestamptz '${iso(data.window.start)}'`) || !sql.includes(`timestamptz '${iso(data.window.end)}'`)) p.push('B: janela da consulta ≠ JSON')
    if (!sql.includes(`'${data.edition}'::text`)) p.push('B: edição da consulta ≠ JSON')
    const ia = offlineModules({ replacements: rep })(INTERNAL)
    const exatos = (sql.match(/lower\(pr\.email\) in \(([^)]*)\)/) ?? [])[1]
    const listaExata = exatos ? [...exatos.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : []
    const likes = [...sql.matchAll(/lower\(pr\.email\) like '([^']+)'/g)].map((m) => m[1]).sort()
    if (JSON.stringify(listaExata) !== JSON.stringify([...ia.INTERNAL_EXACT_EMAILS].map((e) => e.toLowerCase()).sort()) || JSON.stringify(likes) !== JSON.stringify([...ia.INTERNAL_LIKE_PATTERNS].sort())) p.push('B: contas da casa na consulta ≠ lib/internalAccounts.ts')
    const chaves = [...(sql.match(/niches \(key, rx\) as \(\n\s*values\n([\s\S]*?)\n\),/) ?? ['', ''])[1].matchAll(/^\s*\('(\w+)',/gm)].map((m) => m[1]).sort()
    if (JSON.stringify(chaves) !== JSON.stringify(Object.keys(stLib.STATE_NICHES).sort())) p.push(`B: nichos da consulta ≠ STATE_NICHES (${chaves})`)
    if (!sql.includes(`when 100.0 * rs.unknown / rs.started > ${UNKNOWN_MAX} then null`) || stLib.STATE_UNKNOWN_SHARE_MAX !== UNKNOWN_MAX) p.push('B: corte do desconhecido ≠ 20')
    if (!sql.includes(`when 100.0 * h.creators / ct.n >= ${TIER_MOST} then 'most'`) || !sql.includes(`when 100.0 * h.creators / ct.n >= ${TIER_COMMON} then 'common'`) || stLib.STATE_TIER_MOST_FROM !== TIER_MOST || stLib.STATE_TIER_COMMON_FROM !== TIER_COMMON) p.push('B: faixas de nicho da consulta ≠ lib')
    for (const bloco of ['ls.n >= ', 'ts.n >= ', 'rs.started >= ']) if (!sql.includes(`${bloco}${MIN_SAMPLE} then`)) p.push(`B: amostra mínima da consulta (${bloco}) ≠ ${MIN_SAMPLE}`)
    if (stLib.STATE_MIN_SAMPLE !== MIN_SAMPLE) p.push('B: STATE_MIN_SAMPLE ≠ 10')
    const saida = sql.slice(sql.indexOf('select jsonb_pretty('))
    const chaveContagem = saida.match(/'(n|films|creators|requests|delivered|failed|started|unknown|count|total|shorts|people)'\s*,/)
    if (chaveContagem) p.push(`B: a saída da consulta publica contagem ('${chaveContagem[1]}')`)
    if (!saida.includes("'schema', 'kineo-state-of-ai-shorts/1'") || stLib.STATE_SCHEMA !== 'kineo-state-of-ai-shorts/1') p.push('B: schema da consulta ≠ STATE_SCHEMA')
  }
  // o JSON não tem dado pessoal
  const bruto = JSON.stringify(world.json ?? jsonVigente())
  if (/@|https?:\/\/|[0-9a-f]{8}-[0-9a-f]{4}-/i.test(bruto)) p.push('B: o JSON tem e-mail, URL ou id')

  // ═══ (C) nichos ════════════════════════════════════════════════════════════════════════════════════════════════════
  const nicheSrc = rep[NICHE_PAGE] ?? rd(NICHE_PAGE)
  const nm = nicheModules(world)
  const nichePage = nm(NICHE_PAGE)
  const nicheSlugs = nichePage.NICHE_SLUGS
  if (JSON.stringify([...ideas.NICHE_HOUSE_FILM_SLUGS].sort()) !== JSON.stringify([...NICHOS_DA_RODADA].sort())) p.push(`C: nichos com filme ≠ os da rodada (${ideas.NICHE_HOUSE_FILM_SLUGS})`)
  const edAtual = vig
  for (const slug of ideas.NICHE_HOUSE_FILM_SLUGS) {
    if (!nicheSlugs.includes(slug)) { p.push(`C: /free-ai-shorts/${slug} não existe`); continue }
    const h1 = (nicheSrc.match(new RegExp(`\\n  ${slug}: \\{[\\s\\S]*?\\n    h1: '([^']+)'`)) ?? [])[1]
    if (h1 !== ideas.NICHE_PAGE_H1[slug]) p.push(`C: H1 espelhado de ${slug} ≠ página ("${ideas.NICHE_PAGE_H1[slug]}" vs "${h1}")`)
    const film = ideas.nicheHouseFilm(slug)
    if (!film) { p.push(`C: ${slug} sem filme resolvido`); continue }
    const v = vitrine.find((x) => x.id === film.id)
    if (!v || v.engine !== film.engine || v.ownershipEvidence !== 'founder_confirmed_owned') p.push(`C: filme de ${slug} fora da vitrine do fundador`)
    if (film.engineName !== ENGINE_NAMES[film.engine]) p.push(`C: selo do motor de ${slug} ≠ motor real (${film.engineName})`)
    const nh = renderToStaticMarkup(nichePage.default({ params: { niche: slug } }))
    const b = nh.match(/<section data-kineo="niche-house-film"[\s\S]*?<\/section>/)?.[0] ?? ''
    if (!b) { p.push(`C: ${slug} sem o bloco do filme`); continue }
    const tb2 = texto(b)
    if (!tb2.includes(film.title) || !tb2.includes(film.idea) || !tb2.includes(film.ideaLabel) || !tb2.includes(ENGINE_NAMES[film.engine])) p.push(`C: ${slug}: bloco sem título, ideia, rótulo da ideia ou selo do motor`)
    if (!b.includes(`src="${film.previewPath}"`) || !existsSync(join(ROOT, 'public', film.previewPath)) || !existsSync(join(ROOT, 'public', film.posterPath))) p.push(`C: ${slug}: prévia/capa ausente`)
    const tagN = b.match(/<a\b[^>]*data-placement="house_film"[^>]*>/)?.[0] ?? ''
    const hrefN = tagN.match(/href="([^"]+)"/)?.[1]
    const u = hrefN ? new URL(unesc(hrefN), BASE) : null
    if (!u || u.pathname !== '/signup' || u.searchParams.get('prompt') !== film.idea || u.searchParams.get('intent_campaign') !== `push63_niche_${slug}` || !['trial_best', 'fast'].includes(u.searchParams.get('create_intent'))) p.push(`C: ${slug}: o CTA não leva a ideia do filme pelo contrato do nicho`)
    const pago = film.engine !== 'cinematic_ai'
    if (pago !== tb2.includes(`This example was rendered on ${film.engineName}, which needs a paid plan.`)) p.push(`C: ${slug}: não diz (ou diz à toa) que o motor do exemplo é pago`)
    const pos = edAtual?.niches.ranking.find((r) => stLib.STATE_NICHES[r.key].path === `/free-ai-shorts/${slug}`)
    if (pos && !tb2.includes(`This niche ranked #${pos.rank}`)) p.push(`C: ${slug}: não cita a posição na edição`)
  }
  for (const slug of ['motivation', 'localbusiness', 'space']) {
    if (!nicheSlugs.includes(slug)) continue
    const nh = renderToStaticMarkup(nichePage.default({ params: { niche: slug } }))
    if (nh.includes('data-kineo="niche-house-film"')) p.push(`C: bloco de filme num nicho sem filme real (${slug})`)
  }

  // ═══ (D) sitemap, llms.txt, ping ═════════════════════════════════════════════════════════════════════════════════
  const sm = offlineModules({ replacements: rep, mocks: SITEMAP_MOCKS(nicheSlugs) })(SITEMAP).default()
  const lm = (path) => { const e = sm.find((x) => x.url === `${BASE}${path}`); return e ? new Date(e.lastModified).toISOString() : null }
  const r2 = new Date(`${RODADA2_ISO}T12:00:00.000Z`).toISOString()
  if (ideas.GEO_RODADA2_REVIEWED_ISO !== RODADA2_ISO) p.push('D: GEO_RODADA2_REVIEWED_ISO ≠ 2026-10-08')
  if (cat.INDEXABLE_ENGINE_SLUGS.includes('seedance') && lm('/ai-video-generator/seedance') !== r2) p.push('D: sitemap: Seedance sem o lastmod da rodada 2')
  if (mirror && lm('/state-of-ai-shorts-2026') !== new Date(mirror.measuredAt).toISOString()) p.push('D: sitemap: estudo sem o lastmod da leitura da edição')
  for (const slug of nicheSlugs) {
    const want = ideas.NICHE_HOUSE_FILM_SLUGS.includes(slug) ? r2 : new Date('2026-09-17T05:00:00.000Z').toISOString()
    if (lm(`/free-ai-shorts/${slug}`) !== want) p.push(`D: sitemap: nicho ${slug} com lastmod ${lm(`/free-ai-shorts/${slug}`)} (esperado ${want})`)
  }
  for (const path of ['/pricing', '/ai-video-generator/veo', '/free-ai-shorts-generator']) if (lm(path) === r2) p.push(`D: sitemap: re-datou página que a rodada não tocou (${path})`)
  // llms.txt
  const L = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }, globals: { Response, Date }, source: (rel, raw) => (Object.hasOwn(rep, rel) ? rep[rel] : raw) })
  const llms = await L(LLMS).GET().text()
  const linha = (prefixo) => llms.split('\n').find((l) => l.startsWith(prefixo)) ?? ''
  const lEstudo = linha(`- [State of AI Shorts 2026 — ${mesAno(mirror.edition)} edition](${BASE}/state-of-ai-shorts-2026): `)
  if (!lEstudo || lEstudo !== stLib.stateLlmsLine(mirror) || /updated daily|how many creators|engine mix/.test(lEstudo)) p.push('D: llms.txt: linha do estudo ≠ a da edição (ou com texto velho)')
  const lSeed = linha(`- [Seedance 1.5 engine](${BASE}/ai-video-generator/seedance): `)
  if (!lSeed.includes('"is Seedance free"') || !lSeed.includes('"Seedance 1.5 vs 2.5"') || !lSeed.includes(`one free ${seg}-second film`)) p.push('D: llms.txt: linha do Seedance sem o grátis / 1.5 × 2.5')
  const ini = llms.indexOf('## Niche pages with a real Kineo film and the idea behind it')
  const secao = ini >= 0 ? llms.slice(ini, llms.indexOf('\n## ', ini + 5)) : ''
  for (const slug of ideas.NICHE_HOUSE_FILM_SLUGS) {
    const f = ideas.nicheHouseFilm(slug)
    if (!secao.includes(`- [${ideas.NICHE_PAGE_H1[slug]}](${BASE}/free-ai-shorts/${slug}): `) || (f && !secao.includes(`“${f.title}”, rendered on ${f.engineName}`))) p.push(`D: llms.txt: nicho ${slug} fora da seção (ou com motor errado)`)
  }
  if (!llms.includes(`- ${RODADA2_ISO}: the Seedance 1.5 page now answers what is free and for whom`)) p.push('D: llms.txt: sem a novidade datada da rodada')
  const regLlms = /Outside those countries, a new account gets one free \d+-second Seedance 1\.5 film/.test(llms)
  if (regLlms !== Boolean(regiaoFilme && restrito)) p.push('D: llms.txt: o que ganha quem é de fora da lista ≠ interruptores')
  return { p, sm }
}

// ── o ping do IndexNow (ensaio offline contra o sitemap gerado aqui) ────────────────────────────────────────────────────
async function regraPing(world = { rep: {} }) {
  const p = []
  const { sm } = await problemas(world)
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset>${sm.map((x) => `<url><loc>${x.url}</loc><lastmod>${new Date(x.lastModified).toISOString()}</lastmod></url>`).join('')}</urlset>`
  const dir = mkdtempSync(join(tmpdir(), 'kineo-indexnow-r2-'))
  writeFileSync(join(dir, 'sitemap.xml'), xml)
  let saida = null
  try { saida = JSON.parse(execFileSync(process.execPath, [PING, '--sitemap-file', join(dir, 'sitemap.xml')], { cwd: ROOT, encoding: 'utf8' }).split('\nNada foi enviado.')[0]) } catch (err) { p.push(`ping offline falhou: ${err?.message ?? err}`) }
  const ideas = engineFixture({})(IDEAS)
  const deveTer = [`${BASE}/ai-video-generator/seedance`, `${BASE}/state-of-ai-shorts-2026`, ...ideas.NICHE_HOUSE_FILM_SLUGS.map((s) => `${BASE}/free-ai-shorts/${s}`)].sort()
  const veio = [...(saida?.urlList ?? [])].sort()
  if (saida?.mode !== 'ensaio-offline' || JSON.stringify(veio) !== JSON.stringify(deveTer)) p.push(`ping escolheu ${veio.length} URLs (esperado ${deveTer.length}): ${veio.join(', ')}`)
  const s = rd(PING)
  if (!(s.includes("const submit = args.includes('--submit')") && s.indexOf('await fetch(ENDPOINT') > s.indexOf('if (!submit) {'))) p.push('ping não é ensaio por padrão')
  return { p, deveTer }
}

console.log('TESTE geo-rodada2 — Seedance, estudo de outubro, nichos com filme real (08/10)')
const real = await problemas()
ok(real.p.length === 0, '(A–D) Seedance (grátis/para quem, 1.5 × 2.5, filmes reais), estudo sem volume com selo e fonte, nichos com filme e ideia, sitemap e llms.txt' + (real.p.length ? ' → ' + real.p.join(' | ') : ''))
const ping = await regraPing()
ok(ping.p.length === 0, `(D) ping do IndexNow (ensaio offline) escolhe EXATAMENTE as ${ping.deveTer.length} URLs da rodada` + (ping.p.length ? ' → ' + ping.p.join(' | ') : ''))
console.log('  URLs para o IndexNow: ' + ping.deveTer.join(' '))

// ── mutantes e controles ───────────────────────────────────────────────────────────────────────────────────────────────
const troca = (rel, de, para, extra = {}) => {
  const src = Object.hasOwn(extra, rel) ? extra[rel] : rd(rel)
  if (src.split(de).length !== 2) throw new Error(`âncora do mutante ausente/ambígua em ${rel}: ${de.slice(0, 80)}`)
  return { ...extra, [rel]: src.split(de).join(para) }
}
const precoCreatorMudou = troca(PRICING, 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 990 },\n  basic: { usd: 1990 },', 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 990 },\n  basic: { usd: 3190 },')
const regiaoDesligada = troca(POLICY, 'export const REGION_FREE_FILM_LIVE = true', 'export const REGION_FREE_FILM_LIVE = false')
const anuncioDesligado = troca(ANSWER, 'export const ANNOUNCE_REGION_FREE_OFFER = true', 'export const ANNOUNCE_REGION_FREE_OFFER = false')
const s25Pausado = troca(LAUNCH, '  return (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null', "  return k === 's25' ? ENGINE_PAUSE.omni : (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null")
const jsonNovo = (() => { const j = jsonVigente(); return { ...j, renderTime: { ...j.renderTime, medianMinutes: 6.3 } } })()
const espelhoNovo = troca(STATE_HEADLINE_MOD, '  medianMinutes: 5.9,', '  medianMinutes: 6.3,')
const controles = [
  ['K1 preço do Creator muda na fonte → US$ da 1.5 × 2.5 acompanham', { rep: precoCreatorMudou }],
  ['K2 filme de região desligado no interruptor → nenhuma frase de região (página, FAQ, llms.txt)', { rep: regiaoDesligada }],
  ['K3 anúncio de região desligado → idem, com o filme ainda concedido', { rep: anuncioDesligado }],
  ['K4 Seedance 2.5 pausado → a comparação e a FAQ 1.5 × 2.5 somem sozinhas', { rep: s25Pausado }],
  ['K5 edição nova (JSON + espelho) → a página, o llms.txt e o sitemap seguem a edição', { rep: espelhoNovo, json: jsonNovo }],
]
for (const [rotulo, world] of controles) {
  const r = await problemas(world)
  ok(r.p.length === 0, `${rotulo} → verde` + (r.p.length ? ' → ' + r.p.join(' | ') : ''))
}
const mutantes = [
  ['G1 créditos do filme grátis digitados', { rep: troca(ANSWER, '    filmCredits: TRIAL_FREE_FILM_CREDITS,', '    filmCredits: 7,') }, /grátis: créditos do filme ≠ fonte/],
  ['G2 região anunciada ignorando o interruptor (com o filme desligado)', { rep: troca(ANSWER, '    regionFilm: announceRegion && restrito && REGION_FREE_FILM_LIVE && ', '    regionFilm: announceRegion && restrito && ', regiaoDesligada) }, /região anunciada com o filme desligado/],
  ['G3 preço do 2.5 digitado (com o Creator mudando)', { rep: troca(ANSWER, "    { label: 'Narrated film, 60 seconds', v15: rowCell(s15.rows.film60), v25: rowCell(s25.rows.film60) },", "    { label: 'Narrated film, 60 seconds', v15: rowCell(s15.rows.film60), v25: '150 credits (about $29.90)' },", precoCreatorMudou) }, /1\.5 × 2\.5: linha "Narrated film, 60 seconds" ≠ fonte/],
  ['G4 filme da galeria fora da vitrine', { rep: troca(IDEAS, "  { id: '07208070-f6cc-40e1-8c82-4fb0fe53b583', engine: 'cinematic_ai',", "  { id: '00000000-0000-4000-8000-000000000000', engine: 'cinematic_ai', source: 'exact_prompt', idea: 'An invented film that is not in the founder showcase at all, ever.' },\n  { id: '07208070-f6cc-40e1-8c82-4fb0fe53b583', engine: 'cinematic_ai',") }, /sementes: .*não está na vitrine/],
  ['G5 CTA do filme grátis sem a duração', { rep: troca(ANSWER, 'seedanceStudioSignupHref({ duration: f.filmSeconds })', 'seedanceStudioSignupHref({})') }, /CTA do filme grátis não abre o Studio/],
  ['G6 bloco do Seedance em toda página de motor', { rep: troca(CARD_COMPONENT, "{geo.slug === 'seedance' ? <SeedanceAnswerSections", '{true ? <SeedanceAnswerSections') }, /bloco do Seedance fora da página do Seedance/],
  ['G7 a galeria vira <video>', { rep: troca(SEEDANCE_COMPONENT, '<img src={f.posterPath}', '<video src={f.previewPath} poster={f.posterPath}') }, /<video> \(são exatamente 2\)|galeria com/],
  ['G8 FAQ "without paying" volta à frase velha', { rep: troca('lib/growth/enginePageCatalog.ts', '      SEEDANCE_FREE ? SEEDANCE_FREE.faq : {', '      false ? SEEDANCE_FREE!.faq : {') }, /FAQ "without paying" ≠ fonte/],
  ['S1 contagem volta ao estudo', { rep: troca(STATE_LIB, '      detail: `The median finished Short runs ${num(e.length.medianSeconds)} seconds, and', '      detail: `Across 353 finished Shorts, the median runs ${num(e.length.medianSeconds)} seconds, and') }, /contagem publicada/],
  ['S2 edição com chave de contagem', { rep: {}, json: (() => { const j = jsonVigente(); return { ...j, length: { ...j.length, films: 353 } } })() }, /edição recusada/],
  ['S3 selo do mês some (volta o "updated daily")', { rep: troca(STATE_PAGE, '          Original research · {VIEW.seal}', '          Original research — updated daily') }, /sem o selo/],
  ['S4 espelho da manchete diverge do JSON', { rep: troca(STATE_HEADLINE_MOD, '  medianMinutes: 5.9,', '  medianMinutes: 5.8,') }, /espelho da manchete ≠ JSON/],
  ['S5 sitemap dá ao estudo a data velha', { rep: troca(SITEMAP, ' r.path === STATE_STUDY_PATH ? STATE_STUDY_LAST_MODIFIED :', '') }, /estudo sem o lastmod/],
  ['S6 consulta que escreve', { rep: troca(`${DATA_DIR}/2026-10.sql`, 'select jsonb_pretty(jsonb_build_object(', 'delete from public.events where false;\nselect jsonb_pretty(jsonb_build_object(') }, /a consulta escreve/],
  ['S7 consulta sem um padrão da casa', { rep: troca(`${DATA_DIR}/2026-10.sql`, "     or lower(pr.email) like 'smoketest%'\n", '') }, /contas da casa na consulta/],
  ['S8 edição mais nova na pasta não importada', { rep: {}, dir: [...readdirSync(join(ROOT, DATA_DIR)), '2099-01.json', '2099-01.sql'] }, /edição mais nova da pasta é 2099-01/],
  ['S9 nicho na consulta que a lib não conhece', { rep: troca(`${DATA_DIR}/2026-10.sql`, "    ('health',", "    ('cooking',    '(recipe)'),\n    ('health',") }, /nichos da consulta ≠ STATE_NICHES/],
  ['S10 llms.txt volta à linha velha do estudo', { rep: troca(LLMS, '${stateLlmsBody(STATE_HEADLINE)}', 'original platform data read from Kineo\'s own renders — how many creators and videos, the median render time — updated daily and free to cite.') }, /linha do estudo/],
  ['S11 consulta publica contagem', { rep: troca(`${DATA_DIR}/2026-10.sql`, "    'medianSeconds', ls.median_seconds,", "    'shorts', ls.n,\n    'medianSeconds', ls.median_seconds,") }, /publica contagem/],
  ['N1 CTA do nicho sem a ideia do filme', { rep: troca(NICHE_PAGE, 'buildPromptedSignupHref({ prompt: houseFilm.idea, campaign,', 'buildPromptedSignupHref({ prompt: primaryIdea, campaign,') }, /o CTA não leva a ideia do filme/],
  ['N2 sitemap não re-data o nicho com filme', { rep: troca(SITEMAP, 'lastModified: NICHE_HOUSE_FILM_SLUGS.includes(slug) ? GEO_RODADA2_LAST_MODIFIED : LAST_MODIFIED,', 'lastModified: LAST_MODIFIED,') }, /sitemap: nicho mystery/],
  ['N3 H1 espelhado diverge da página', { rep: troca(IDEAS, "  mystery: 'Free AI Mystery Shorts Generator',", "  mystery: 'Free AI Mystery Video Generator',") }, /H1 espelhado de mystery/],
  ['N4 selo do motor errado no exemplo', { rep: troca(IDEAS, "  cinematic_veo: 'Veo 3.1',\n  cinematic_hollywood: 'Kling 3',\n  cinematic_h3", "  cinematic_veo: 'Kling 3',\n  cinematic_hollywood: 'Kling 3',\n  cinematic_h3") }, /selo do motor de truecrime/],
  ['N5 bloco não diz que o motor do exemplo é pago', { rep: troca(NICHE_COMPONENT, "  const paidEngine = film.engine !== 'cinematic_ai'", '  const paidEngine = false') }, /motor do exemplo é pago/],
]
for (const [rotulo, world, re] of mutantes) {
  let r
  try { r = (await problemas(world)).p } catch (err) { r = [`(mutante lançou: ${err instanceof Error ? err.message.slice(0, 160) : String(err)})`] }
  const motivo = r.find((x) => re.test(x))
  ok(Boolean(motivo), `${rotulo} → vermelho pelo motivo certo` + (motivo ? ` (${motivo.slice(0, 110)}…)` : ` (esperado ${re}; veio: ${(r[0] ?? 'nada').slice(0, 140)})`))
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
if (fail) process.exit(1)
