// KINEO-ADS-V2-VIRADA-2026-09-29 — guardião da virada pública do anúncio v2 (Studio Ads).
//
// Ordem do fundador (29/09 madrugada): "deixa os motores já acionados para quem quiser fazer o tipo de ads" e "seria legal
// se a pessoa já entrasse na parte onde ela consegue fazer o produto dela". O que este guardião prova:
//   V — o interruptor ADS_V2_PUBLIC é true (um literal só);
//   N — /ads/new EXECUTADO (o page.tsx real, transpilado, com stubs só nas bordas): sem ?classic=1 → redirect ao /ads/v2
//       (anônimo ou logado, levando só utm_* limpos); com ?classic=1 → o assistente antigo, sem redirect; ?resume=pass fica
//       no assistente e ganha v2Href para seguir ao v2 quando o passe destrava; com o interruptor false → nada redireciona;
//   P — /ads: o botão principal abre o montador (/ads/v2), go=maker leva direto quem tem acesso, ?from=v2 ganha a faixa;
//   C — copy nova presente (fotos reais em movimento, ~15 s, 3 níveis por adsV2Credits, os 4 passos do montador, clássico
//       mais abaixo com ?classic=1) e as frases velhas de produto principal ausentes (legenda, "35 or 60", "8 ad models"…);
//   F — /ads/for: CTA com go=maker, passos do v2, sem legenda prometida; offer.ts sem as meias-frases que viraram mentira;
//   L — o link discreto do clássico no montador v2, com o preço vindo do servidor.
// Cada asserção central é provada por MUTAÇÃO em memória (o mutante tem de ficar vermelho). Lê arquivos com readFileSync;
// executa só módulos puros (v2Tiers, v2Screen, offer) e o page.tsx do /ads/new com stubs de next/navigation, supabase etc.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let verdes = 0
const vermelhos = []
async function check(nome, cond) {
  let ok = false
  try {
    ok = typeof cond === 'function' ? Boolean(await cond()) : Boolean(cond)
  } catch (e) {
    ok = false
    nome += ` (lançou: ${e && e.message})`
  }
  if (ok) verdes++
  else vermelhos.push(nome)
}
// Tira comentários de linha inteira, blocos e os comentários {…} do JSX — a copy é o que a pessoa lê, não o que o código comenta.
function semComentarios(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => (/^\s*\/\//.test(l) ? '' : l.replace(/\s\/\/ .*$/, '')))
    .join('\n')
}
const trocar = (src, de, para) => {
  if (!src.includes(de)) throw new Error(`mutante não aplicou: ${de.slice(0, 60)}`)
  return src.split(de).join(para)
}
function transpile(src) {
  return ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
}
function runModule(src, req) {
  const module = { exports: {} }
  new Function('exports', 'require', 'module', transpile(src))(module.exports, req, module)
  return module.exports
}
const pure = (p, src = rd(p)) => runModule(src, (s) => { throw new Error(`módulo puro importou ${s}`) })

// ── fontes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const F = {
  tiers: 'lib/ads/v2Tiers.ts',
  screen: 'lib/ads/v2Screen.ts',
  offer: 'lib/ads/offer.ts',
  newPage: 'app/(dashboard)/ads/new/page.tsx',
  wizard: 'app/(dashboard)/ads/new/AdsWizardClient.tsx',
  v2Page: 'app/(dashboard)/ads/v2/page.tsx',
  v2Client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  door: 'app/ads/page.tsx',
  segPage: 'app/ads/for/[segment]/page.tsx',
  segData: 'lib/growth/adsSegments.ts',
  segPres: 'lib/growth/adsSegmentPresentation.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))
const T = pure(F.tiers)
const SC = pure(F.screen)
const OF = pure(F.offer)

// ═══ V. interruptor ══════════════════════════════════════════════════════════════════════════════════════════════════
const interruptor = (src) => (src.match(/export const ADS_V2_PUBLIC\b/g) || []).length === 1 && /export const ADS_V2_PUBLIC = true\n/.test(src) && pure(F.tiers, src).ADS_V2_PUBLIC === true
await check('V1 ADS_V2_PUBLIC = true (um literal só, e o valor executado bate)', interruptor(SRC.tiers))
await check('V1-mutante: interruptor de volta a false fica vermelho', () => !interruptor(trocar(SRC.tiers, 'export const ADS_V2_PUBLIC = true', 'export const ADS_V2_PUBLIC = false')))

// ═══ N. /ads/new executado ═══════════════════════════════════════════════════════════════════════════════════════════
/** Roda o default export do page.tsx real. Devolve { redirect } ou { props } do AdsWizardClient desenhado. */
async function abrirAdsNew(pageSrc, { params = {}, user = null, reason = 'subscriber', publico = true } = {}) {
  const tiers = { ...T, ADS_V2_PUBLIC: publico }
  const stubs = {
    react: { Suspense: 'Suspense' },
    'react/jsx-runtime': { jsx: (t, p) => ({ t, p }), jsxs: (t, p) => ({ t, p }), Fragment: 'Fragment' },
    'next/navigation': { redirect: (url) => { const e = new Error('NEXT_REDIRECT'); e.url = url; throw e } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/ads/serverAccess': { adsGate: (r) => (r === 'none' ? 'no_access' : 'ok'), loadAdsAccess: async () => ({ reason }) },
    '@/lib/ads/autoBrief': { adsAutoVisible: () => true },
    '@/lib/serverEvents': { writeServerEvent: async () => {} },
    '@/lib/ads/v2Tiers': tiers,
    './AdsWizardClient': 'AdsWizardClient',
  }
  const mod = runModule(pageSrc, (s) => {
    if (Object.prototype.hasOwnProperty.call(stubs, s)) return stubs[s]
    throw new Error(`sem stub: ${s}`)
  })
  try {
    const el = await mod.default({ searchParams: params })
    // <Suspense><AdsWizardClient …/></Suspense>
    const inner = el && el.p && el.p.children
    return { props: inner && inner.t === 'AdsWizardClient' ? inner.p : null }
  } catch (e) {
    if (e && e.message === 'NEXT_REDIRECT') return { redirect: e.url }
    throw e
  }
}
const USER = { id: 'u1', email: 'cliente@exemplo.com' }
async function portaNova(pageSrc) {
  const r = {
    anon: await abrirAdsNew(pageSrc, {}),
    logado: await abrirAdsNew(pageSrc, { user: USER }),
    semAcesso: await abrirAdsNew(pageSrc, { user: USER, reason: 'none' }),
    utm: await abrirAdsNew(pageSrc, { user: USER, params: { utm_source: 'studio', utm_medium: 'tile', utm_campaign: 'sprint0927', evil: 'x' } }),
    utmSujo: await abrirAdsNew(pageSrc, { params: { utm_source: '<script>', utm_medium: 'a b' } }),
    classicAnon: await abrirAdsNew(pageSrc, { params: { classic: '1' } }),
    classicLogado: await abrirAdsNew(pageSrc, { user: USER, params: { classic: '1' } }),
    classicSemAcesso: await abrirAdsNew(pageSrc, { user: USER, reason: 'none', params: { classic: '1' } }),
    passe: await abrirAdsNew(pageSrc, { user: USER, params: { resume: 'pass', session_id: 'cs_123' } }),
    passeClassico: await abrirAdsNew(pageSrc, { user: USER, params: { resume: 'pass', session_id: 'cs_123', classic: '1' } }),
    fechado: await abrirAdsNew(pageSrc, { user: USER, publico: false }),
  }
  return r
}
let N = null
try {
  N = await portaNova(SRC.newPage)
} catch (e) {
  vermelhos.push(`N0 o page.tsx do /ads/new executa (lançou: ${e && e.message})`)
}
const NN = N ?? new Proxy({}, { get: () => ({}) })
const redirecionaAoV2 = (n) => n.anon.redirect === '/ads/v2' && n.logado.redirect === '/ads/v2' && n.semAcesso.redirect === '/ads/v2'
const classicoAbre = (n) => !n.classicAnon.redirect && n.classicAnon.props?.gate === 'anon' && !n.classicLogado.redirect && n.classicLogado.props?.gate === 'ok' && n.classicLogado.props?.v2Href === null && n.classicSemAcesso.redirect === '/ads?from=new'
await check('N1 /ads/new sem ?classic=1 → redirect ao /ads/v2 (anônimo, com acesso e sem acesso: o v2 decide login/preço)', redirecionaAoV2(NN))
await check('N2 utm_* limpos seguem no redirect; parâmetro estranho e utm sujo ficam para trás', NN.utm.redirect === '/ads/v2?utm_source=studio&utm_medium=tile&utm_campaign=sprint0927' && NN.utmSujo.redirect === '/ads/v2')
await check('N3 /ads/new?classic=1 abre o assistente antigo (anônimo = painel anon; logado = assistente sem v2Href; sem acesso = porta ?from=new)', classicoAbre(NN))
await check('N4 ?resume=pass fica no assistente (o webhook pode atrasar) e ganha v2Href=/ads/v2; com ?classic=1 o v2Href é null', !NN.passe.redirect && NN.passe.props?.resumingPass === true && NN.passe.props?.v2Href === '/ads/v2' && !NN.passeClassico.redirect && NN.passeClassico.props?.v2Href === null)
await check('N5 com ADS_V2_PUBLIC=false nada redireciona ao v2 (o redirect mora atrás do interruptor)', !NN.fechado.redirect && NN.fechado.props?.gate === 'ok' && NN.fechado.props?.v2Href === null)
await check('N6 o redirect vem ANTES de qualquer leitura (createClient/getUser/loadAdsAccess)', () => {
  const s = semComentarios(SRC.newPage)
  const i = s.indexOf('if (ADS_V2_PUBLIC && !classic && !resumingPass) redirect(adsV2Href(searchParams))')
  return i > 0 && i < s.indexOf('createClient()') && i < s.indexOf('loadAdsAccess(')
})
// mutantes da porta
await check('N-mutante: redirect que ignora ?classic=1 fica vermelho (N3)', async () => !classicoAbre(await portaNova(trocar(SRC.newPage, 'if (ADS_V2_PUBLIC && !classic && !resumingPass)', 'if (ADS_V2_PUBLIC && !resumingPass)'))))
await check('N-mutante: sem o redirect, N1 fica vermelho', async () => !redirecionaAoV2(await portaNova(trocar(SRC.newPage, 'if (ADS_V2_PUBLIC && !classic && !resumingPass) redirect(adsV2Href(searchParams))', ''))))
await check('N-mutante: classic sempre verdadeiro (nada redireciona) fica vermelho (N1)', async () => !redirecionaAoV2(await portaNova(trocar(SRC.newPage, "const classic = first(searchParams?.classic) === '1'", 'const classic = true'))))
await check('N-mutante: redirect que leva também o ?resume=pass fica vermelho (N4)', async () => {
  const m = await portaNova(trocar(SRC.newPage, 'if (ADS_V2_PUBLIC && !classic && !resumingPass)', 'if (ADS_V2_PUBLIC && !classic)'))
  return !(!m.passe.redirect && m.passe.props?.v2Href === '/ads/v2')
})

// o assistente: depois do destravamento do passe segue ao v2; login e limpeza do endereço voltam ao clássico
const W = SRC.wizard
const assistenteSegue = (w) => /if \(resumingPass && v2Href\) \{\n\s+try \{\n\s+window\.location\.replace\(v2Href\)\n\s+return/.test(w) && w.indexOf('if (resumingPass && v2Href)') > w.indexOf("if (d.gate !== 'ok') return setBoot({ kind: 'no_access' })") && w.indexOf('if (resumingPass && v2Href)') < w.indexOf('await hydrate(Array.isArray(d.orders)')
await check('N7 assistente: com o acesso JÁ confirmado (gate ok) e v2Href, window.location.replace(v2Href) antes de hidratar', assistenteSegue(W))
await check('N7-mutante: seguir ao v2 antes de conferir o acesso fica vermelho', () => {
  const m = trocar(W, "      if (d.gate !== 'ok') return setBoot({ kind: 'no_access' })\n", '').replace('      await hydrate(Array.isArray(d.orders)', "      if (d.gate !== 'ok') return setBoot({ kind: 'no_access' })\n      await hydrate(Array.isArray(d.orders)")
  return !assistenteSegue(m)
})
await check('N8 assistente: login e limpeza do endereço voltam ao clássico (wizardPath mantém ?classic=1)', W.includes('window.location.href = `/login?redirect=${encodeURIComponent(wizardPath())}`') && W.includes("window.history.replaceState(null, '', wizardPath())") && !W.includes("window.history.replaceState(null, '', '/ads/new')"))

// ═══ P. porta /ads ═══════════════════════════════════════════════════════════════════════════════════════════════════
const D = SRC.door
const portaAbreMontador = (d) => /const MAKER_HREF = ADS_V2_PUBLIC \? '\/ads\/v2' : '\/ads\/new'\n/.test(d) && /<AdsCtaLink href=\{MAKER_HREF\} cta="open"/.test(d) && !/href=\{WIZARD_HREF\}/.test(d)
await check('P1 /ads: o botão principal de quem tem acesso abre o montador (/ads/v2); quem não tem segue no checkout/preço', portaAbreMontador(D) && /<AdsCtaLink href=\{CHECKOUT_HREF\} cta="buy"/.test(D) && /if \(viewer\.gate === 'ok'\) cta = 'open'/.test(D))
await check('P1-mutante: botão de volta ao /ads/new fica vermelho', () => !portaAbreMontador(trocar(D, "const MAKER_HREF = ADS_V2_PUBLIC ? '/ads/v2' : '/ads/new'", "const MAKER_HREF = '/ads/new'")))
const goMaker = (d) => /if \(ADS_V2_PUBLIC && cta === 'open' && first\(searchParams\?\.go\) === 'maker'\) redirect\(withCleanUtm\(MAKER_HREF, searchParams\)\)/.test(d) && /import \{ redirect \} from 'next\/navigation'/.test(d)
await check('P2 /ads?go=maker leva direto ao montador SÓ quem já tem acesso (cta open)', goMaker(D))
await check('P2-mutante: go=maker sem exigir acesso fica vermelho', () => !goMaker(trocar(D, "ADS_V2_PUBLIC && cta === 'open' && first(", 'ADS_V2_PUBLIC && first(')))
// REVISÃO 29/09: o go=maker levava ao /ads/v2 PELADO — o clique do /ads/for (utm seo/ads_for/gpt24h/<segmento>) de quem já
// tem acesso chegava ao montador sem atribuição. withCleanUtm EXECUTADO (a função real, extraída do page.tsx).
const utmDaPorta = (d) => {
  const i = d.indexOf('function withCleanUtm('), j = d.indexOf('\n}\n', i)
  if (i < 0 || j < 0) return null
  const firstSrc = d.slice(d.indexOf('function first('), d.indexOf('\n}\n', d.indexOf('function first(')) + 2)
  return runModule(`${firstSrc}\n${d.slice(i, j + 2)}\nexports.f = withCleanUtm`, () => { throw new Error('sem import') }).f
}
const utmOk = (d) => {
  const f = utmDaPorta(d)
  return !!f && f('/ads/v2', { utm_source: 'seo', utm_medium: 'ads_for', utm_campaign: 'gpt24h', utm_content: 'restaurants', go: 'maker' }) === '/ads/v2?utm_source=seo&utm_medium=ads_for&utm_campaign=gpt24h&utm_content=restaurants' &&
    f('/ads/v2', { utm_source: '<x>', go: 'maker' }) === '/ads/v2' && f('/ads/v2', {}) === '/ads/v2'
}
await check('P4 go=maker leva os utm_* limpos ao montador (e deixa go/lixo para trás)', utmOk(D))
await check('P4-mutante: redirect sem os utm fica vermelho', () => !goMaker(trocar(D, 'redirect(withCleanUtm(MAKER_HREF, searchParams))', 'redirect(MAKER_HREF)')))
await check('P4-mutante: withCleanUtm que deixa passar utm sujo fica vermelho', () => !utmOk(trocar(D, 'if (v && /^[A-Za-z0-9._~-]{1,100}$/.test(v)) out.set(key, v)\n  }\n  const s = out.toString()\n  return s ? `${href}', 'if (v) out.set(key, v)\n  }\n  const s = out.toString()\n  return s ? `${href}')))

// REVISÃO 29/09: três superfícies ainda vendem o anúncio CLÁSSICO (narrado, com legenda, 3 créditos por 35 s) e apontavam
// para /ads/new — que desde a virada cai no v2 (34/41/51 por 15 s, sem legenda). O destino tem de cumprir a promessa: &classic=1.
const SUPERFICIES_CLASSICAS = {
  tile: ["app/(dashboard)/studio/StudioClient.tsx", "const ADS_TILE_WIZARD_HREF = '/ads/new?utm_source=studio&utm_medium=tile&utm_campaign=sprint0927&classic=1'", /\$\{KINEO1_35S_CREDITS\} credits per \$\{ADS_TILE_MIN_SECONDS\}-second ad/],
  sucesso: ['app/checkout/success/page.tsx', "const CHECKOUT_SUCCESS_ADS_HREF = '/ads/new?utm_source=checkout_success&utm_medium=studio_ads&utm_campaign=sprint0927&classic=1'", /with captions, music and your logo\. A \{ADS_SHORTEST_SECONDS\}-second ad costs \{KINEO1_35S_CREDITS\} credits/],
  email: ['lib/lifecycle/videoReadyFooter.ts', "const url = `${appUrl.replace(/\\/+$/, '')}/ads/new?${ADS_LINE_UTM}&classic=1`", /with captions, music and your logo\. ` \+\n\s+`A \$\{ADS_SHORTEST_SECONDS\}-second ad costs \$\{KINEO1_35S_CREDITS\} credits/],
}
for (const [nome, [arq, linha, promessa]] of Object.entries(SUPERFICIES_CLASSICAS)) {
  const s = rd(arq)
  await check(`S-${nome}: a superfície que vende o clássico (${arq}) leva ao clássico (&classic=1)`, promessa.test(s) && s.includes(linha))
  await check(`S-${nome}-mutante: sem &classic=1 fica vermelho`, () => !trocar(s, linha, linha.replace('&classic=1', '')).includes(linha))
}
await check('S-shell: o montador v2 tem título no shell ("Studio Ads", não "Dashboard")', rd('app/(dashboard)/DashboardShell.tsx').includes("'/ads/v2': 'Studio Ads',"))
const faixaV2 = (d) => d.includes("const returnedFromWizard = (from === 'new' || from === 'v2') && viewer.signedIn && viewer.gate === 'no_access'") && d.includes('<b>Studio Ads is part of every paid plan.</b>')
await check('P3 ?from=v2 (o montador devolve quem não tem acesso) ganha a mesma faixa do ?from=new', faixaV2(D) && /redirect\('\/ads\?from=v2'\)/.test(SRC.v2Page))
await check('P3-mutante: faixa só para ?from=new fica vermelho', () => !faixaV2(trocar(D, "(from === 'new' || from === 'v2')", "from === 'new'")))

// ═══ C. copy da porta ════════════════════════════════════════════════════════════════════════════════════════════════
const texto = (d) => semComentarios(d)
const hero = (d) => { const t = texto(d); return t.slice(t.indexOf('<header className="ads-hero">'), t.indexOf('</header>')) }
const copyNova = (d) => {
  const t = texto(d), h = hero(d)
  const iHow = t.indexOf('<h2 id="ads-how">How it works</h2>'), iLevels = t.indexOf('<h2 id="ads-levels">'), iClassic = t.indexOf('<h2 id="ads-models">Classic narrated ads</h2>')
  return h.includes('<h1>Your real photos, brought to life. A video ad of about {ADS_V2_SCREEN_SECONDS} seconds.</h1>') /* REVISÃO 29/09: o Cinema dura ~16,5 s (7 planos de 2 s + cartão de 2,5 s); o h1 diz 'about' como o resto da copy */ &&
    h.includes('Kineo gives your photos movement, adds music,') && h.includes('a short voice-over and your real logo at the end') &&
    h.includes('{V2_LEVELS.map((l) => <li key={l.id}><b>{l.name}</b> {l.credits} credits</li>)}') &&
    /const V2_LEVELS = ADS_V2_TIER_IDS\.map\(\(id\) => \(\{ id, name: ADS_V2_TIER_COPY\[id\]\.name, pitch: ADS_V2_TIER_COPY\[id\]\.pitch, credits: adsV2Credits\(id, ADS_V2_SCREEN_SECONDS\) \}\)\)/.test(t) &&
    iHow > 0 && iLevels > iHow && iClassic > iLevels && t.slice(iHow, iLevels).includes('{ADS_V2_HOW_IT_WORKS.map((s, i) => (') &&
    t.slice(iClassic).includes('<a href={CLASSIC_HREF}>Open the classic maker ({KINEO1_35S_CREDITS} credits) →</a>') && /const CLASSIC_HREF = '\/ads\/new\?classic=1'/.test(t) &&
    t.slice(iClassic, t.indexOf('</section>', iClassic)).includes('{ADS_MODELS.map((m) => (') &&
    t.includes('Enough for {newAdsLabel(passV2)}, or about {adsCoveredByPass(35)} classic ads of 35 s.') &&
    /const DESCRIPTION =\n\s+'Your real business photos, brought to life in a vertical video ad of about 15 seconds, with music, a short voice-over and your logo\. Included in any paid plan\.'/.test(d)
}
const semFraseVelha = (d) => {
  const t = texto(d), h = hero(d)
  const desc = (d.match(/const DESCRIPTION =\n\s+'([^']*)'/) || [])[1] || ''
  return !/caption|subtitle/i.test(t) && !/35 or 60|\{lengthsLabel\} seconds\.<\/p>\n\s+<ul className="ads-models">\n\s+\{ADS_MODELS/.test(t) &&
    !t.includes('<h2 id="ads-models">{ADS_MODELS.length} ad models</h2>') && !t.includes('A narrated video ad, made by you') && !t.includes('Five steps') &&
    !/ADS_MODELS|lengthsLabel|\b(35|60)\b/.test(h) && !/narrated|caption|clips/i.test(desc) &&
    !t.includes('{HOW_IT_WORKS.map(') && !t.includes('{copy.includes.map(') && !t.includes('<h2 id="ads-review">A person checks your first ad</h2>')
}
await check('C1 copy nova: hero do v2 (fotos reais em movimento, ~15 s, 3 níveis por adsV2Credits), 4 passos do montador, clássico depois com ?classic=1', copyNova(D))
await check('C2 frases velhas de produto principal ausentes (legenda, "35 or 60", "8 ad models" no topo, "A narrated video ad", 5 passos do v1, includes do passe v1, revisão humana como promessa geral)', semFraseVelha(D))
await check('C1-mutante: hero de volta ao v1 fica vermelho', () => !copyNova(trocar(D, '<h1>Your real photos, brought to life. A video ad of about {ADS_V2_SCREEN_SECONDS} seconds.</h1>', '<h1>Your photos. Your logo. A narrated video ad, made by you.</h1>')))
await check('C1-mutante: clássico ANTES dos níveis fica vermelho (a ordem é o v2 primeiro)', () => {
  const t = D
  const a = t.indexOf('        <section className="ads-sec" aria-labelledby="ads-levels">'), b = t.indexOf('        <section className="ads-sec" aria-labelledby="ads-get">')
  const c = t.indexOf('        <section className="ads-sec" aria-labelledby="ads-models">'), e = t.indexOf('        <section className="ads-sec" aria-labelledby="ads-price">')
  const levels = t.slice(a, b), classic = t.slice(c, e)
  return !copyNova(t.slice(0, a) + classic + t.slice(b, c) + levels + t.slice(e))
})
await check('C2-mutante: "captions" voltando a uma linha do "What you get" fica vermelho', () => !semFraseVelha(trocar(D, '<li>Music, a short voice-over you can turn off, and your real logo on the last frame</li>', '<li>Music, captions and your real logo on the last frame</li>')))
await check('C2-mutante: "{ADS_MODELS.length} ad models" de volta como seção principal fica vermelho', () => !semFraseVelha(trocar(D, '<h2 id="ads-models">Classic narrated ads</h2>', '<h2 id="ads-models">{ADS_MODELS.length} ad models</h2>')))
// fatos executados que a copy afirma
const levels = T.ADS_V2_TIER_IDS.map((id) => T.adsV2Credits(id, SC.ADS_V2_SCREEN_SECONDS))
await check('C3 EXECUTADO: 3 níveis a 34/41/51 créditos por 15 s (decisão do fundador 28/09), nomes Photo motion/Commercial/Cinema', SC.ADS_V2_SCREEN_SECONDS === 15 && JSON.stringify(levels) === '[34,41,51]' && T.ADS_V2_TIER_IDS.map((id) => SC.ADS_V2_TIER_COPY[id].name).join('|') === 'Photo motion|Commercial|Cinema')
await check('C4 EXECUTADO: o passe (60 créditos, US$19.90 — intocado) paga 1 anúncio novo de QUALQUER nível ("1 new ad at any level" é verdade)', OF.ADS_PASS_CREDITS === 60 && OF.ADS_PASS_USD_MINOR === 1990 && Math.floor(OF.ADS_PASS_CREDITS / Math.max(...levels)) === 1 && D.includes("return n === 1 ? '1 new ad at any level'"))
await check('C5 "How it works" da porta = os MESMOS 4 passos da coluna do montador (mesma fonte ADS_V2_HOW_IT_WORKS)', SC.ADS_V2_HOW_IT_WORKS.length === 4 && SRC.v2Client.includes('{ADS_V2_HOW_IT_WORKS.map((s, i) => (') && D.includes('{ADS_V2_HOW_IT_WORKS.map((s, i) => ('))

// ═══ F. /ads/for e offer.ts ══════════════════════════════════════════════════════════════════════════════════════════
const segCta = (src) => /export const adsSegmentCta = \(slug: string\) => `\/ads\?utm_source=seo&utm_medium=ads_for&utm_campaign=gpt24h&utm_content=\$\{encodeURIComponent\(slug\)\}&go=maker`/.test(src)
await check('F1 /ads/for: o botão vai à porta /ads com go=maker (quem tem acesso segue ao montador; o resto vê o preço)', segCta(SRC.segData))
await check('F1-mutante: CTA sem go=maker fica vermelho', () => !segCta(trocar(SRC.segData, '}&go=maker`', '}`')))
const segCopy = (page, data, pres) => {
  const p = semComentarios(page)
  return p.includes('{ADS_V2_HOW_IT_WORKS.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}') &&
    p.includes('Kineo gives them movement and turns them into a vertical ad of about {offer.v2Seconds} seconds, with music, a short voice-over and your logo at the end.') &&
    p.includes('from {offer.v2Credits} credits per {offer.v2Seconds}-second ad.') && !/(?<!fig)caption/i.test(p) &&
    !/caption/i.test((data.match(/description: '[^']*'/g) || []).join('\n')) && (data.match(/description: '[^']*'/g) || []).length === 8 &&
    !/captions/i.test(semComentarios(pres)) && /v2Credits: Math\.min\(\.\.\.ADS_V2_TIER_IDS\.map\(\(id\) => adsV2Credits\(id, ADS_V2_SCREEN_SECONDS\)\)\)/.test(pres)
}
await check('F2 /ads/for: intro e oferta do v2 (preço de adsV2Credits), os 4 passos do montador, e nenhuma legenda prometida (página, descrições, FAQ)', segCopy(SRC.segPage, SRC.segData, SRC.segPres))
await check('F2-mutante: descrição com "captions" de volta fica vermelho', () => !segCopy(SRC.segPage, trocar(SRC.segData, 'brought to life in a short vertical video ad with music, a voice-over and your logo. Make it', 'brought to life in a short vertical video ad with captions and your logo. Make it'), SRC.segPres))
const offerHonesta = (src) => {
  const copy = pure(F.offer, src).adsPassCopy()
  const all = JSON.stringify(copy)
  return !/15-second ads/i.test(all) && !/product shots inside generated scenes/i.test(all) && copy.excludes.length >= 2 && copy.excludes.includes('Ads with the original audio of your clip are coming next')
}
await check('F3 offer.ts EXECUTADO: sem "15-second ads … coming next" e sem "product shots inside generated scenes" (o v2 faz os dois)', offerHonesta(SRC.offer))
await check('F3-mutante: a frase velha de volta fica vermelho', () => !offerHonesta(trocar(SRC.offer, "'Ads with the original audio of your clip are coming next'", "'15-second ads and ads with the original audio of your clip are coming next'")))

// ═══ L. link discreto do clássico no montador ════════════════════════════════════════════════════════════════════════
const LINK = '<a href="/ads/new?classic=1">Prefer a narrated 35-second ad? Use the classic maker ({classicCredits} credits)</a>'
const linkClassico = (client, page) => client.split(LINK).length === 2 && /classicCredits = null \}: \{ initialBalance: number \| null; classicCredits\?: number \| null \}/.test(client) &&
  /<AdsV2Client initialBalance=\{balance\} classicCredits=\{KINEO1_35S_CREDITS\} \/>/.test(page) && /import \{ KINEO1_35S_CREDITS \} from '@\/lib\/ads\/offer'/.test(page) && OF.KINEO1_35S_CREDITS === 3
await check('L1 montador v2: link "Prefer a narrated 35-second ad? Use the classic maker (N credits)" → /ads/new?classic=1, N vindo do servidor (KINEO1_35S_CREDITS = 3)', linkClassico(SRC.v2Client, SRC.v2Page))
await check('L1-mutante: link apontando para /ads/new (sem ?classic=1, que agora volta ao v2) fica vermelho', () => !linkClassico(trocar(SRC.v2Client, 'href="/ads/new?classic=1">Prefer', 'href="/ads/new">Prefer'), SRC.v2Page))
await check('L1-mutante: preço do clássico digitado no page do v2 fica vermelho', () => !linkClassico(SRC.v2Client, trocar(SRC.v2Page, 'classicCredits={KINEO1_35S_CREDITS}', 'classicCredits={3}')))

console.log(`test-ads-v2-virada-2026-09-29: ${verdes} verdes, ${vermelhos.length} vermelhos`)
for (const v of vermelhos) console.log(`  ✗ ${v}`)
if (vermelhos.length) process.exit(1)
