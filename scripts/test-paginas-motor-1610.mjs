// KINEO-PAGINAS-MOTOR-1610 — guardião do molde Seedance nas páginas de motor premium (Veo 3.1, Kling 3, Kling 2.5, Seedance 2.5),
// da página de custo (/cheapest-ai-shorts-maker) e da comparação (/seedance-vs-veo-vs-kling).
//
// Prova, renderizando as páginas REAIS offline (sem rede, sem banco, sem cliente):
//   P1  cada página reescrita tem o guia uma vez, com o resumo de EXATAMENTE 3 frases visível;
//   P2  FAQ visível = FAQPage JSON-LD (mesmas perguntas e respostas, na mesma ordem) e pelo menos 6 perguntas;
//   P3  nenhum preço da Kineo digitado: cada crédito do guia = creditCostForDuration; cada US$ = créditos × preço ÷ créditos
//       do Creator; varredura dos literais de texto dos arquivos novos sem "$9", "35 credits", "/month" cravados;
//   P4  Seedance 2.5 respeita S25_PUBLIC (desligado: some do guia, das tabelas e do HTML dos blocos; ligado: aparece);
//   P5  título ≤ 60 e description ≤ 155 nas páginas reescritas e na de custo;
//   P6  limites honestos presentes (Veo 3.1 Fast sem áudio do modelo; diálogo só Kling 3 e em inglês);
//   P7  concorrentes só com fonte oficial e data; aritmética dos 60 s feita em código; sem vencedor universal;
//   P8  a página de custo responde "cheapest way to make AI YouTube Shorts" no topo e não vende mais o Kineo 1 aposentado.
// Mutantes (cada um TEM de deixar vermelho): FAQ do JSON-LD diferente da visível, preço digitado, interruptor do 2.5 ignorado,
// meta longa, US$ no preço do plano errado, guia fora da página.
// Uso: node scripts/test-paginas-motor-1610.mjs
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { React, root, source, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const require = createRequire(resolve(root, 'package.json'))
const ts = require('typescript')

const ENGINE_PAGE = 'app/ai-video-generator/[engine]/page.tsx'
const S25_PAGE = 'app/ai-video-generator/seedance-2-5/page.tsx'
const COST_PAGE = 'app/cheapest-ai-shorts-maker/page.tsx'
const VS_PAGE = 'app/seedance-vs-veo-vs-kling/page.tsx'
const MOD = 'lib/seo/paginasMotor1610.ts'
const COMP = 'components/PaginasMotor1610.tsx'
const CATALOG = 'lib/growth/enginePageCatalog.ts'
const S25_COPY = 'lib/growth/s25EnginePage.ts'
const GUIDE_ENGINE_SLUGS = ['veo', 'kling-3', 'kling']
const OFICIAIS = ['support.google.com', 'www.seedance.tv', 'dreamina.capcut.com', 'www.capcut.com', 'kling.ai']

const BENCH = {
  rows: [
    { qualityMode: 'cinematic_ai', films: 120, people: 60, medianSeconds: 44 },
    { qualityMode: 'cinematic_veo', films: 4, people: 3, medianSeconds: 61 },
    { qualityMode: 'cinematic_kling', films: 3, people: 2, medianSeconds: 60 },
  ],
  totalFilms: 127, windowDays: 90, measuredOn: '2026-10-15', measured: true,
}

/** O mundo de render: fonte real + trocas + fronteiras de UI/banco simuladas. */
function mundo({ rep = {}, mocks = {} } = {}) {
  const plain = (name) => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
  const base = offlineModules()
  const pe = base('lib/publicExamples.ts')
  const vitrine = [...pe.ENGINE_PAGE_LEAD, ...pe.FOUNDER_SHOWCASE, ...pe.PUBLIC_ENGINE_EXAMPLES]
  const all = {
    ...Object.fromEntries(['Footer', 'AgencyVolumeBridge', 'StickyFreeShortCTA', 'WallMedia', 'ScriptToSeedanceBridge'].map((n) => [`components/${n}.tsx`, { __esModule: true, default: plain(n) }])),
    'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source: _s, placement: _p, ...props }) => React.createElement('a', props, children) },
    'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': { __esModule: true, default: plain('TopicGeneratorForm') },
    'app/cheapest-ai-shorts-maker/ShortCostCalculator.tsx': { __esModule: true, default: plain('ShortCostCalculator') },
    'lib/engineWall.ts': {
      getEngineRenders: async () => [],
      getHouseEngineExamples: (engine, limit) => {
        const seen = new Set()
        return vitrine.filter((v) => v.engine === engine && !seen.has(v.id) && seen.add(v.id)).slice(0, limit)
          .map((v) => ({ ...v, videoUrl: v.previewPath ?? v.arenaPreviewPath ?? v.videoPath, posterUrl: v.posterPath ?? v.arenaPosterPath, badge: engine }))
      },
    },
    'lib/engineBenchmarkStats.ts': { getEngineBenchmarkStats: async () => BENCH },
    'lib/studyStats.ts': { STUDY_REVALIDATE_SECONDS: 86400 },
    'lib/kineoFacts.ts': { ENGINE_FACTS: [] }, // a ficha 'what' cai no bestFor do catálogo; o kineoFacts puxa node:crypto (ads)
    ...mocks,
  }
  return offlineModules({ replacements: rep, mocks: all })
}

const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texto = (html) => unesc(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const norm = (s) => s.replace(/\s+/g, ' ').trim()
function faqLd(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const j = JSON.parse(m[1])
    if (j['@type'] === 'FAQPage') return j.mainEntity.map((x) => ({ q: x.name, a: x.acceptedAnswer.text }))
  }
  return null
}
/** As perguntas VISÍVEIS, na ordem, pelo elemento que a página usa para a pergunta (depois do título da seção de FAQ). */
function faqVisivel(html, titulo, abreQ, abreA, fechaA) {
  const at = html.indexOf(titulo)
  if (at < 0) return []
  const out = []
  const re = new RegExp(`${abreQ}([\\s\\S]*?)</(?:div|h3)>${abreA}([\\s\\S]*?)${fechaA}`, 'g')
  for (const m of html.slice(at).matchAll(re)) out.push({ q: unesc(m[1]), a: unesc(m[2]) })
  return out
}
const FAQ_ENGINE = ['Questions, answered', '<div style="font-weight:800;margin-bottom:6px;font-size:0.95rem">', '<p style="margin:0;color:#86868b;line-height:1.6;font-size:0.9rem">', '</p>']
const FAQ_COST = ['Frequently asked questions', '<div style="font-weight:700;color:#f5f5f7">', '<div style="font-size:14px;color:#86868b;margin-top:6px;line-height:1.6">', '</div>']
const FAQ_VS = ['Questions, answered', '<h3 style="font-weight:800;margin:0 0 6px;font-size:0.98rem">', '<p style="margin:0;color:#86868b;line-height:1.6;font-size:0.9rem">', '</p>']

/** Literais de TEXTO (string, template sem as expressões, JSX) de um arquivo, sem comentários. */
function literais(rel, src) {
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out = []
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text)
    else if (ts.isTemplateExpression(n)) { out.push(n.head.text); for (const sp of n.templateSpans) out.push(sp.literal.text) }
    else if (ts.isJsxText(n)) out.push(n.text)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}
const PRECO_DIGITADO = /\$\s?\d|\b\d+(?:\.\d+)?\s*(?:credits?|cr)\b|\b\d+\s*\/\s*mo(?:nth)?\b/i

async function verificar({ rep = {} } = {}) {
  const falhas = []
  const ok = (cond, msg) => { if (!cond) falhas.push(msg) }
  const tentar = async (msg, fn) => { try { await fn() } catch (e) { falhas.push(`${msg}: ${e.message}`) } }
  const L = mundo({ rep })
  const M = L(MOD)
  const { creditCostForDuration } = L('lib/credits/engineCost.ts')
  const { TIER_PRICES, TIER_CREDITS } = L('lib/checkoutPricing.ts')
  const { ENGINES } = L(CATALOG)
  const launch = L('lib/engineLaunch.ts')
  const cents = (cr) => Math.round((cr * TIER_PRICES.basic.usd) / TIER_CREDITS.basic)
  const usd = (c) => `$${(c / 100).toFixed(2)}`

  // ── P1/P2/P5/P6 nas páginas de motor servidas pelo [engine]
  for (const slug of GUIDE_ENGINE_SLUGS) {
    await tentar(`${slug}: renderiza`, async () => {
      const page = L(ENGINE_PAGE)
      const html = renderToStaticMarkup(await page.default({ params: { engine: slug } }))
      const g = M.engineGuideFor(slug)
      ok(g && g.summary.length === 3, `${slug}: resumo de exatamente 3 frases`)
      ok((html.match(/<section data-kineo="engine-guide-1610"/g) ?? []).length === 1, `${slug}: guia renderizado uma vez`)
      const vis = texto(html)
      for (const l of g?.summary ?? []) ok(vis.includes(norm(l)), `${slug}: frase do resumo visível — ${l.slice(0, 50)}`)
      const ld = faqLd(html), v = faqVisivel(html, ...FAQ_ENGINE)
      ok(ld && ld.length >= 6, `${slug}: pelo menos 6 perguntas no FAQPage (${ld?.length})`)
      ok(ld && JSON.stringify(ld) === JSON.stringify(v), `${slug}: FAQ visível = FAQPage JSON-LD`)
      ok(ld && JSON.stringify(ld) === JSON.stringify(ENGINES[slug].faq), `${slug}: FAQPage = catálogo`)
      const meta = page.generateMetadata({ params: { engine: slug } })
      ok(meta.title.length <= 60, `${slug}: título ≤ 60 (${meta.title.length})`)
      ok(meta.description.length <= 155, `${slug}: description ≤ 155 (${meta.description.length})`)
      ok(meta.description === ENGINES[slug].metaDescription, `${slug}: a meta própria do catálogo é a que vai ao ar`)
      ok(!html.includes('<video') || (html.match(/<video /g) ?? []).length === 2, `${slug}: nenhum vídeo novo além das 2 prévias`)
      ok(!/1080p/.test(html), `${slug}: sem resolução prometida`)
      // P3 — números derivados
      for (const r of g?.rows ?? []) {
        const want = creditCostForDuration(ENGINES[slug].qualityMode, true, r.seconds)
        ok(r.credits === want, `${slug} ${r.seconds}s: créditos = creditCostForDuration (${r.credits} vs ${want})`)
        ok(r.usdCents === cents(r.credits), `${slug} ${r.seconds}s: US$ = créditos × preço do Creator ÷ créditos`)
        ok(vis.includes(`${r.credits} cr`) && vis.includes(usd(r.usdCents)), `${slug} ${r.seconds}s: número da tabela visível`)
      }
      // P6 — limites
      if (slug === 'veo') {
        ok(vis.includes('The model is Veo 3.1 Fast') && vis.includes('Veo’s native audio is off'), 'veo: Veo 3.1 Fast e áudio do modelo desligado ditos')
        ok(/Kling 3 \(English only\)/.test(vis), 'veo: diálogo só no Kling 3 e em inglês')
        ok(ENGINES.veo.faq.some((f) => /Google AI Pro or Ultra/.test(f.q)), 'veo: a pergunta da assinatura do Google')
      }
      if (slug === 'kling-3') {
        ok(vis.includes('Dialogue is English only'), 'kling-3: diálogo só em inglês')
        ok(!/native generated voice|native voice and lip sync/.test(JSON.stringify(ENGINES['kling-3'])), 'kling-3: sem "native voice" (a fala é a voz da casa)')
      }
      if (slug === 'kling') ok(vis.includes('characters do not speak on camera'), 'kling: sem diálogo na câmera')
      ok(vis.includes('When NOT to use'), `${slug}: seção "When NOT to use"`)
    })
  }
  // um motor sem guia não ganha bloco (selo honesto e trava das irmãs)
  await tentar('seedance: sem guia', async () => {
    const html = renderToStaticMarkup(await L(ENGINE_PAGE).default({ params: { engine: 'seedance' } }))
    ok(!html.includes('engine-guide-1610'), 'seedance: a página que já funciona não ganha o guia')
  })

  // ── Seedance 2.5 (rota própria)
  await tentar('seedance-2-5: renderiza', async () => {
    const page = L(S25_PAGE)
    const html = renderToStaticMarkup(page.default())
    const vis = texto(html)
    ok((html.match(/<section data-kineo="engine-guide-1610"/g) ?? []).length === (launch.S25_PUBLIC ? 1 : 0), 's25: guia só com o interruptor')
    const ld = faqLd(html), v = faqVisivel(html, ...FAQ_ENGINE)
    ok(ld && ld.length >= 6 && JSON.stringify(ld) === JSON.stringify(v), 's25: FAQ visível = JSON-LD, ≥ 6')
    const meta = page.generateMetadata()
    ok(meta.title.length <= 60 && meta.description.length <= 155, `s25: título ≤ 60 e description ≤ 155 (${meta.title.length}/${meta.description.length})`)
    ok(vis.includes('Paid plans only'), 's25: só plano pago dito no guia')
  })

  // ── P4 — o interruptor do 2.5
  await tentar('interruptor S25', async () => {
    for (const ligado of [false, true]) {
      const Lx = mundo({ rep, mocks: { 'lib/engineLaunch.ts': { ...offlineModules()('lib/engineLaunch.ts'), S25_PUBLIC: ligado } } })
      const Mx = Lx(MOD), Cx = Lx(COMP)
      const g = Mx.engineGuideFor('seedance-2-5')
      const nas = [...Mx.kineoCostRows().map((r) => r.name), ...Mx.decisionRows1610().map((r) => r.name)]
      const html = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(Cx.CheapestAnswer1610), React.createElement(Cx.EngineDecision1610, { whenNot: [] }), React.createElement(Cx.EngineBuyerGuide, { slug: 'seedance-2-5', ctaHref: '/x', campaign: 'c' })))
      if (ligado) ok(g !== null && nas.includes('Seedance 2.5') && html.includes('Seedance 2.5'), 'S25 ligado: aparece no guia e nas tabelas')
      else ok(g === null && !nas.includes('Seedance 2.5') && !html.includes('Seedance 2.5'), 'S25 desligado: some do guia, das tabelas e do HTML')
    }
  })

  // ── P7 — concorrentes
  const comp = M.competitors1610()
  ok(comp.length === 5 && ['google-flow', 'seedance-tv', 'dreamina', 'capcut', 'kling-app'].every((id) => comp.some((c) => c.id === id)), 'concorrentes: Google Flow, Seedance.tv, Dreamina, CapCut e o app do Kling')
  for (const c of comp) {
    ok(c.sources.length > 0 && c.sources.every((s) => { try { const u = new URL(s.url); return u.protocol === 'https:' && OFICIAIS.includes(u.hostname) } catch { return false } }), `${c.id}: só fonte oficial https`)
    ok(/^\d{4}-\d{2}-\d{2}$/.test(c.checkedOn), `${c.id}: data da leitura`)
  }
  const F = M.FONTES_CONCORRENTES_1610
  const flow60 = Math.ceil(60 / F.googleFlow.veoFastMaxSeconds) * F.googleFlow.veoFastCreditsPerGeneration
  ok(comp.find((c) => c.id === 'google-flow').sixtySeconds.includes(`= ${flow60} credits`), 'Google Flow: 60 s calculados em código')
  const st60 = Math.round((Math.ceil(60 / F.seedanceTv.clipSeconds) * F.seedanceTv.seedance2Mini480p5sCredits * F.seedanceTv.miniUsdCentsMonthly) / F.seedanceTv.miniCreditsMonthly)
  ok(comp.find((c) => c.id === 'seedance-tv').sixtySeconds.includes(usd(st60)), 'Seedance.tv: 60 s calculados em código')

  // ── P8/P2/P5 — página de custo
  await tentar('custo: renderiza', async () => {
    const page = L(COST_PAGE)
    const html = renderToStaticMarkup(React.createElement(page.default))
    const vis = texto(html)
    const a = M.cheapestAnswer()
    ok(a.summary.length === 3, 'custo: resumo de 3 frases')
    const s60 = creditCostForDuration('cinematic_ai', true, 60)
    ok(a.cheapest.c60 === s60 && a.summary[1].includes(`${s60} credits`), 'custo: o Short mais barato de 60 s vem do cobrador')
    ok(/^The cheapest way to make AI YouTube Shorts/.test(a.summary[0]), 'custo: a primeira frase responde a pergunta exata')
    const resumoAt = html.indexOf('data-kineo="summary-1610-cheapest"'), calcAt = html.indexOf('data-offline-boundary="ShortCostCalculator"')
    ok(resumoAt > 0 && calcAt > 0 && resumoAt < calcAt && resumoAt < html.indexOf('</h1>') + 400, 'custo: o resumo vem logo depois do H1, antes da calculadora')
    for (const l of a.summary) ok(vis.includes(norm(l)), `custo: frase visível — ${l.slice(0, 40)}`)
    ok(vis.includes('No tool here is the cheapest for everyone'), 'custo: sem vencedor universal')
    ok(!/Fast Mode|Fast videos|3 watermarked/i.test(vis) && !literais(COST_PAGE, rep[COST_PAGE] ?? source(COST_PAGE)).some((t) => /Fast Mode|Fast video/.test(t)), 'custo: não vende mais o Kineo 1 aposentado')
    ok(!/pay in BRL/.test(vis) && vis.includes(L('lib/marketingPrice.ts').CHECKOUT_CURRENCY_DISCLOSURE), 'custo: moeda pela frase canônica')
    const ld = faqLd(html), v = faqVisivel(html, ...FAQ_COST)
    ok(ld && ld.length >= 6 && JSON.stringify(ld) === JSON.stringify(v), `custo: FAQ visível = JSON-LD, ≥ 6 (${ld?.length}/${v.length})`)
    ok(page.metadata.title.length <= 60 && page.metadata.description.length <= 155, `custo: título ≤ 60 e description ≤ 155 (${page.metadata.title.length}/${page.metadata.description.length})`)
  })

  // ── comparação de motores
  await tentar('vs: renderiza', async () => {
    const page = L(VS_PAGE)
    const html = renderToStaticMarkup(await page.default())
    const vis = texto(html)
    ok(html.includes('data-kineo="engine-decision-1610"') && html.includes('data-kineo="competitors-1610"'), 'vs: seções novas presentes')
    const ld = faqLd(html), v = faqVisivel(html, ...FAQ_VS)
    ok(ld && JSON.stringify(ld) === JSON.stringify(v), `vs: FAQ visível = JSON-LD (${ld?.length}/${v.length})`)
    for (const f of M.compareExtras1610().faq) ok(ld && ld.some((x) => x.q === f.q && x.a === f.a), `vs: pergunta nova no JSON-LD — ${f.q}`)
    for (const r of M.decisionRows1610()) ok(r.credits60 === creditCostForDuration(ENGINES[Object.keys(ENGINES).find((s) => ENGINES[s].name === r.name)].qualityMode, true, 60) && vis.includes(`${r.credits60} cr`), `vs: ${r.name} 60 s do cobrador`)
  })

  // ── P3 — varredura de preço digitado nos textos novos
  for (const rel of [COMP, COST_PAGE, MOD]) {
    const src = rep[rel] ?? source(rel)
    const bad = literais(rel, src).filter((t) => PRECO_DIGITADO.test(t))
    ok(bad.length === 0, `${rel}: sem preço/crédito digitado (${bad.slice(0, 2).join(' | ')})`)
  }
  {
    // no catálogo, só as entradas marcadas por esta mudança (o resto tem dono e guardião próprios)
    const src = rep[CATALOG] ?? source(CATALOG)
    const novos = [...ENGINES.veo.faq.slice(-2), ...ENGINES['kling-3'].faq.slice(-3), ENGINES.kling.faq.at(-1)]
    ok(novos.every((f) => src.includes(f.q)), 'catálogo: as perguntas novas existem na fonte')
    const lits = literais(CATALOG, src).filter((t) => novos.some((f) => f.a.includes(t.trim()) && t.trim().length > 12))
    ok(lits.every((t) => !PRECO_DIGITADO.test(t)), 'catálogo: perguntas novas sem crédito digitado')
    const s25src = rep[S25_COPY] ?? source(S25_COPY)
    ok(!/metaDescription: `[^`]*\b\d+ credits/.test(s25src), 's25: meta sem crédito digitado')
  }
  return falhas
}

// ── 1. a árvore real tem de passar
const reais = await verificar()
for (const f of reais) console.log('  ✗ ' + f)
console.log(reais.length === 0 ? 'PASS árvore real' : `FAIL árvore real: ${reais.length}`)

// ── 2. mutantes — cada um tem de deixar vermelho (e o mutante precisa ter sido aplicado)
const troca = (rel, de, para) => {
  const src = source(rel).replace(/\r\n/g, '\n')
  if (!src.includes(de)) throw new Error(`mutante não aplicou em ${rel}: ${de.slice(0, 60)}`)
  return { [rel]: src.split(de).join(para) }
}
const MUTANTES = [
  ['JSON-LD sem a 1ª pergunta', troca(ENGINE_PAGE, 'mainEntity: e.faq.map((f) => ({', 'mainEntity: e.faq.slice(1).map((f) => ({')],
  ['preço digitado no componente', troca(COMP, "<h3 style={H3}>Limits to know before you buy</h3>", "<h3 style={H3}>Limits to know before you buy — from 35 credits</h3>")],
  ['interruptor do 2.5 ignorado', troca(MOD, "(key !== 's25' || S25_PUBLIC)", '(true)')],
  ['meta longa', troca(CATALOG, 'for ${VEO_COST} credits per 60 seconds.`, // KINEO-PAGINAS-MOTOR-1610', 'for ${VEO_COST} credits per 60 seconds, with every scene generated by Google’s model and assembled for you.`, // KINEO-PAGINAS-MOTOR-1610')],
  ['US$ no preço do plano errado', troca(MOD, "export function creditsToCents(credits: number, tier: PaidTier = 'basic')", "export function creditsToCents(credits: number, tier: PaidTier = 'starter')")],
  ['guia fora da página', troca(ENGINE_PAGE, '        <EngineBuyerGuide slug={params.engine} ctaHref={signupUrl} campaign={campaign} />', '')],
  ['vencedor universal na página de custo', troca(COMP, 'No tool here is the cheapest for everyone.', 'Kineo is the cheapest tool for everyone.')],
]
let mutOk = 0
for (const [nome, rep] of MUTANTES) {
  const f = await verificar({ rep })
  if (f.length > 0) { mutOk++; console.log(`  mutante "${nome}" → vermelho (${f.length})`) } else console.log(`  ✗ mutante "${nome}" passou verde`)
}
console.log(`${mutOk}/${MUTANTES.length} mutantes vermelhos`)
if (reais.length > 0 || mutOk !== MUTANTES.length) process.exitCode = 1
else console.log('PASS test-paginas-motor-1610')
