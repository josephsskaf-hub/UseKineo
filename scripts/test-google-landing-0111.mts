// KINEO-GOOGLE-ADS-TESTE-0111 — guardião sem rede e sem banco da campanha de teste no Google Search.
// Uso: node scripts/test-google-landing-0111.mts
// Prova, com os módulos REAIS (carregados pelo jiti do projeto com o alias "@/"):
//   A. cada grupo gs_* pousa numa página de motor que EXISTE (nunca a home, nunca um 301) e o botão dela abre o motor certo;
//   B. o URL final do Google vira um clique pago legível (source google, medium cpc, campaign gs_<grupo>, term = palavra-chave)
//      e o utm_source "google" sobrevive ao saneamento que grava profiles.signup_utm_*;
//   C. o cadastro preenche o anúncio a partir do cookie do clique pago só onde ficaria nulo (signupFillFromPaidClick) e a
//      rota app/api/track-signup-source/route.ts chama isso;
//   D. o doc é igual ao bloco gerado (preço lido da fonte), títulos ≤ 30, descrições ≤ 90, sem "free", palavras-chave
//      10–20 por grupo que nenhuma negativa bloqueia; a consulta SQL mede os mesmos gs_*.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { blocoDoDoc, montarGrupos, car, NEGATIVAS_AMPLAS, NEGATIVAS_FRASE } from './test-support/google-ads-teste-0111-anuncios.mts'
import { carregar, numerosDasFontes, RAIZ, DOC, INICIO, FIM } from './test-support/google-ads-teste-0111-fontes.mts'

let ok = 0, falhas = 0
const check = (nome: string, cond: boolean, extra = '') => {
  if (cond) { ok++; console.log(`ok   ${nome}`) } else { falhas++; console.log(`FAIL ${nome}${extra ? ` — ${extra}` : ''}`) }
}
const ler = (rel: string) => readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n')
const mod = (rel: string) => carregar(path.join(RAIZ, rel))

const gs = mod('lib/growth/googleAdsTeste0111.ts')
const paid = mod('lib/growth/paidClickAttribution.ts')
const acq = mod('lib/acquisitionSource.ts')
const intent = mod('lib/growth/engineLandingIntent.ts')
const catalogo = mod('lib/growth/enginePageCatalog.ts')
const AGORA = Date.UTC(2026, 10, 3, 15, 0, 0)

// ─── A. páginas de destino ────────────────────────────────────────────────────────────────────────────────────────────
const nextConfig = ler('next.config.js')
check('3 grupos: kling4, seedance, veo', JSON.stringify(gs.GS_GRUPOS.map((g: any) => g.key)) === JSON.stringify(['kling4', 'seedance', 'veo']))
for (const g of gs.GS_GRUPOS) {
  check(`${g.key}: não pousa na home`, g.path !== '/' && g.path.startsWith('/ai-video-generator/'))
  check(`${g.key}: nenhum redirect de next.config.js tem esta rota como origem`, !nextConfig.includes(`source: '${g.path}'`))
  const slug = g.path.split('/').pop()
  const estatica = path.join(RAIZ, 'app', 'ai-video-generator', slug, 'page.tsx')
  if (existsSync(estatica)) {
    const page = ler(`app/ai-video-generator/${slug}/page.tsx`)
    const comp = existsSync(path.join(RAIZ, 'components/Kling4PaidEnginePage.tsx')) ? ler('components/Kling4PaidEnginePage.tsx') : ''
    const ancora = `buildEngineLandingSignupHref({ engine: '${g.engineParam}', campaign: '${g.intentCampaign}' })`
    check(`${g.key}: rota própria existe e o botão da página leva ${g.engineParam}/${g.intentCampaign}`, page.includes(ancora) && comp.includes(ancora))
  } else {
    const dyn = ler('app/ai-video-generator/[engine]/page.tsx')
    const e = catalogo.ENGINES[slug as string]
    check(`${g.key}: slug ${slug} gerado pela rota [engine] (ENGINE_SLUGS)`, Boolean(e) && catalogo.ENGINE_SLUGS.includes(slug))
    check(`${g.key}: slug indexável (motor fora de manutenção)`, catalogo.isIndexableEngineSlug(slug))
    check(`${g.key}: o motor da página é ${g.engineParam}`, e?.param === g.engineParam, String(e?.param))
    check(`${g.key}: a rota [engine] monta o botão com seo_engine_<slug> e o motor da página`,
      dyn.includes('const campaign = `seo_engine_${params.engine}`') &&
      dyn.includes('const signupUrl = buildEngineLandingSignupHref({ engine: e.param, campaign })') &&
      `seo_engine_${slug}` === g.intentCampaign)
  }
  const href: string = intent.buildEngineLandingSignupHref({ engine: g.engineParam, campaign: g.intentCampaign })
  const redirect = new URLSearchParams(href.split('?')[1]).get('redirect') ?? ''
  check(`${g.key}: o botão vai ao cadastro e volta ao /studio no motor ${g.engineParam}`,
    href.startsWith('/signup?') && redirect.startsWith('/studio?') && new URLSearchParams(redirect.split('?')[1]).get('engine') === g.engineParam, href)
  check(`${g.key}: o botão NÃO carrega utm_source (a origem continua sendo o anúncio)`, !href.includes('utm_source'))
}

// ─── B. URL final → clique pago e origem do cadastro ───────────────────────────────────────────────────────────────────
for (const g of gs.GS_GRUPOS) {
  const final: string = gs.gsFinalUrl(g)
  check(`${g.key}: URL final = base + sufixo utm_term={keyword}`, final === `${gs.gsFinalUrlBase(g)}&utm_term={keyword}` && gs.GS_FINAL_URL_SUFFIX === 'utm_term={keyword}')
  check(`${g.key}: URL final no domínio canônico, na página do motor`, final.startsWith(`https://www.usekineo.com${g.path}?`))
  const clicado = final.replace('{keyword}', encodeURIComponent(`${g.key} app`).replace(/%20/g, '+')) + '&gclid=Cj0KCQjw-test_GCLID123'
  const u = new URL(clicado)
  const click = paid.paidClickFromSearch(u.search, AGORA)
  check(`${g.key}: o clique vira clique pago google/cpc/gs_${g.key}`, click?.source === 'google' && click?.medium === 'cpc' && click?.campaign === `gs_${g.key}`)
  check(`${g.key}: utm_term chega como a palavra-chave`, click?.term === `${g.key} app`, String(click?.term))
  check(`${g.key}: gclid guardado`, click?.idType === 'gclid' && click?.id === 'Cj0KCQjw-test_GCLID123')
  const volta = paid.parsePaidClick(decodeURIComponent(paid.paidClickCookieWrite(u.search, AGORA, true).split(';')[0].split('=').slice(1).join('=')), AGORA + 3600_000)
  check(`${g.key}: o cookie do clique pago relido 1 h depois é o mesmo clique`, volta?.campaign === `gs_${g.key}` && volta?.id === click?.id)
}
check('utm_source "google" sobrevive ao saneamento do cadastro', acq.sanitizeAcquisitionUtmSource('google') === 'google')
check('"google" não é rótulo de superfície interna', acq.internalSurfaceLabel('google') === null)
const analytics = ler('lib/analytics.ts')
check('kineo_src captura source, medium e campaign', analytics.includes("const SRC_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign'] as const"))
check('todo evento da aba leva utm_term e gclid', analytics.includes("const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'msclkid', 'ref'] as const"))
check('SourceCapture grava o cookie do clique pago em todo pouso', ler('components/SourceCapture.tsx').includes('paidClickCookieWrite(window.location.search, Date.now()'))
check('SourceCapture está no layout raiz', /<SourceCapture\s*\/>/.test(ler('app/layout.tsx')))

// ─── C. cadastro preenche o anúncio só onde ficaria nulo ───────────────────────────────────────────────────────────────
const fill = gs.signupFillFromPaidClick
const clickK4 = paid.paidClickFromSearch('?utm_source=google&utm_medium=cpc&utm_campaign=gs_kling4&utm_term=kling+4+app&gclid=Cj0KCQjw-test_GCLID123', AGORA)
const vazio = { signup_utm_source: null, signup_utm_medium: null, signup_utm_campaign: null, gclid: null }
const f1 = fill({ profile: null, pedido: { signup_utm_source: 'google', signup_utm_medium: 'cpc', signup_utm_campaign: 'gs_kling4', gclid: null }, click: clickK4 })
check('pessoa nova (kineo_src já é o anúncio): utm intocado, só o gclid entra', JSON.stringify(f1) === JSON.stringify({ gclid: 'Cj0KCQjw-test_GCLID123' }), JSON.stringify(f1))
const f2 = fill({ profile: vazio, pedido: { ...vazio }, click: clickK4 })
check('primeiro toque só com referrer orgânico: o anúncio preenche source/medium/campaign + gclid',
  JSON.stringify(f2) === JSON.stringify({ signup_utm_source: 'google', signup_utm_medium: 'cpc', signup_utm_campaign: 'gs_kling4', gclid: 'Cj0KCQjw-test_GCLID123' }), JSON.stringify(f2))
const f3 = fill({ profile: vazio, pedido: { signup_utm_source: 'chatgpt', signup_utm_medium: null, signup_utm_campaign: null, gclid: null }, click: clickK4 })
check('primeiro toque do ChatGPT com utm: origem conhecida NUNCA é trocada', !('signup_utm_source' in f3) && !('signup_utm_campaign' in f3) && !('signup_utm_medium' in f3) && f3.gclid === 'Cj0KCQjw-test_GCLID123', JSON.stringify(f3))
const f3a = fill({ profile: { ...vazio, signup_utm_source: 'chatgpt' }, pedido: { ...vazio }, click: clickK4 })
check('perfil já gravado com utm do ChatGPT (pedido vazio): o anúncio não troca a origem', !('signup_utm_source' in f3a) && !('signup_utm_campaign' in f3a) && !('signup_utm_medium' in f3a), JSON.stringify(f3a))
const f3b = fill({ profile: { signup_utm_source: null, signup_utm_campaign: 'seo_engine_seedance' }, pedido: { ...vazio }, click: clickK4 })
check('perfil com campaign gravada (sem source): nada de trio misturado', !('signup_utm_campaign' in f3b) && !('signup_utm_source' in f3b))
const f4 = fill({ profile: { ...vazio, signup_utm_source: 'ai_assistant_likely' }, pedido: { ...vazio }, click: clickK4 })
check('estimativa ai_assistant_likely não é origem: o clique pago (atestado) entra', f4.signup_utm_source === 'google' && f4.signup_utm_campaign === 'gs_kling4')
check('GS_GUESS_SOURCE é igual a AI_ASSISTANT_LIKELY_SOURCE', gs.GS_GUESS_SOURCE === acq.AI_ASSISTANT_LIKELY_SOURCE)
check('sem clique pago: nada', JSON.stringify(fill({ profile: null, pedido: { ...vazio }, click: null })) === '{}')
check('perfil já tem gclid: não troca', !('gclid' in fill({ profile: { ...vazio, gclid: 'Cj0KCQjw-old_GCLID000' }, pedido: { ...vazio }, click: clickK4 })))
const clickBing = paid.paidClickFromSearch('?utm_source=bing&utm_medium=cpc&utm_campaign=x&msclkid=0123456789abcdef0123456789abcdef', AGORA)
check('clique do Bing (msclkid) não vira gclid', !('gclid' in fill({ profile: null, pedido: { ...vazio }, click: clickBing })))
check('medium já gravado não é trocado', !('signup_utm_medium' in fill({ profile: { ...vazio, signup_utm_medium: 'referral' }, pedido: { ...vazio }, click: clickK4 })))
check('cookie adulterado = sem clique', paid.parsePaidClick('{"v":1,"s":"google","m":"cpc","c":"gs_kling4 <script>","t":null,"k":null,"i":null,"a":1793790000}', AGORA) === null)

const rota = ler('app/api/track-signup-source/route.ts')
check('rota importa o leitor do cookie e o preenchimento', rota.includes("import { PAID_CLICK_COOKIE, parsePaidClick } from '@/lib/growth/paidClickAttribution'") && rota.includes("import { signupFillFromPaidClick } from '@/lib/growth/googleAdsTeste0111'"))
check('rota lê o cookie kineo_paid_click do pedido', rota.includes('click: parsePaidClick(req.cookies.get(PAID_CLICK_COOKIE)?.value, Date.now()),'))
check('rota passa o que já vai gravar (patch ?? pedido)', rota.includes('signup_utm_campaign: patch.signup_utm_campaign ?? signup_utm_campaign,') && rota.includes('gclid: patch.gclid ?? gclid,'))
const iFill = rota.indexOf('signupFillFromPaidClick({'), iGuess = rota.indexOf('const sourceGuess ='), iUpdate = rota.indexOf(".from('profiles').update(patch)")
check('o preenchimento roda depois do first-touch e antes da estimativa e do update', iFill > rota.indexOf('patch.signup_surface = signup_surface') && iFill < iGuess && iGuess < iUpdate)
check('o select do perfil traz as colunas que o preenchimento consulta', /gclid, utm_source, signup_country, signup_utm_source, signup_utm_medium, signup_utm_campaign/.test(rota))

// ─── D. doc, anúncios, palavras-chave, negativas e SQL ─────────────────────────────────────────────────────────────────
const n = numerosDasFontes()
const urlFinal = (key: string) => {
  const g = gs.GS_GRUPOS.find((x: any) => x.key === key)
  return { base: gs.gsFinalUrlBase(g), sufixo: gs.GS_FINAL_URL_SUFFIX, clique: gs.gsFinalUrl(g) }
}
const doc = ler('docs/GOOGLE-ADS-TESTE-2026-11-01.md')
const i = doc.indexOf(INICIO), f = doc.indexOf(FIM)
const blocoDoc = i >= 0 && f > i ? doc.slice(i + INICIO.length, f).trim() : ''
const gerado = blocoDoDoc(n, urlFinal as any)
check('doc = bloco gerado com os números das fontes (rode scripts/gerar-google-ads-teste-0111.mts se mudou preço)', blocoDoc === gerado.trim())
check('controle negativo: com outro preço o bloco gerado é diferente', blocoDoDoc({ ...n, starter: '$1.00' }, urlFinal as any).trim() !== blocoDoc)
check(`preço do anúncio = TIER_PRICES.starter (${n.starter}) escrito como "from $X/mo"`, doc.includes(`Plans From ${n.starter}/mo`) && doc.includes(`Plans from ${n.starter}/mo.`))
check('DOC aponta para o arquivo do doc', DOC === path.join(RAIZ, 'docs', 'GOOGLE-ADS-TESTE-2026-11-01.md'))

const grupos = montarGrupos(n)
check('a cópia cobre os mesmos 3 grupos do módulo', JSON.stringify(grupos.map((g) => g.key)) === JSON.stringify(gs.GS_GRUPOS.map((g: any) => g.key)))
const proibido = /\bfree\b|\bofficial\b|unlimited|\{keyword|\bguarantee/i
for (const g of grupos) {
  const total = g.exatas.length + g.frases.length
  check(`${g.key}: ${total} palavras-chave (10–20)`, total >= 10 && total <= 20)
  check(`${g.key}: sem palavra-chave repetida dentro do mesmo tipo`, new Set(g.exatas).size === g.exatas.length && new Set(g.frases).size === g.frases.length)
  const todas = [...g.exatas, ...g.frases]
  const bloqueada = todas.filter((k) => {
    const palavras = k.toLowerCase().split(/\s+/)
    return NEGATIVAS_AMPLAS.some((neg) => palavras.includes(neg)) || NEGATIVAS_FRASE.some((neg) => k.toLowerCase().includes(neg)) ||
      g.negativasDoGrupo.some((neg) => palavras.includes(neg.toLowerCase()))
  })
  check(`${g.key}: nenhuma negativa bloqueia uma palavra-chave do grupo`, bloqueada.length === 0, bloqueada.join(', '))
  g.anuncios.forEach((a, idx) => {
    const nome = `${g.key} anúncio ${idx ? 'B' : 'A'}`
    check(`${nome}: 15 títulos e 4 descrições`, a.titulos.length === 15 && a.descricoes.length === 4)
    check(`${nome}: títulos ≤ 30`, a.titulos.every((t) => car(t) <= 30), a.titulos.filter((t) => car(t) > 30).join(' | '))
    check(`${nome}: descrições ≤ 90`, a.descricoes.every((d) => car(d) <= 90), a.descricoes.filter((d) => car(d) > 90).join(' | '))
    check(`${nome}: títulos sem repetição`, new Set(a.titulos).size === 15)
    check(`${nome}: caminho exibido ≤ 15 por parte`, a.caminho.every((c) => car(c) <= 15))
    check(`${nome}: sem "free", "official", "unlimited", inserção dinâmica`, [...a.titulos, ...a.descricoes].every((s) => !proibido.test(s)))
  })
  const b = g.anuncios[1]
  check(`${g.key}: anúncio B sem marca de terceiro`, [...b.titulos, ...b.descricoes].every((s) => !/kling|seedance|veo|bytedance|google/i.test(s)))
}
const k4 = grupos.find((g) => g.key === 'kling4')!
check('créditos do Kling 4.0 no anúncio = KLING4_PAID_CREDITS', k4.anuncios[0].descricoes.some((d) => d.includes(`${n.k4[15]}, ${n.k4[30]} or ${n.k4[60]} credits`)))
check('créditos do Seedance 1.5 e do Veo no anúncio = creditsPerReferenceVideo', doc.includes(`Seedance 1.5 film costs ${n.seedance60} credits`) && doc.includes(`Veo 3.1 film costs ${n.veo60} credits`))
check('negativas pedidas pelo fundador presentes', ['free', 'crack', 'apk', 'download', 'jobs', 'course', 'tutorial', 'porn'].every((x) => (NEGATIVAS_AMPLAS as readonly string[]).includes(x)))
check('doc tem a régua de parada (0 cadastros em 3 dias; US$ 70 sem pagamento)', doc.includes('0 cadastros em 3 dias → para') && doc.includes('US$ 70 sem nenhum pagamento → para'))
check('doc para antes do pagamento', doc.includes('PARE AQUI'))

const sql = ler('docs/queries/GOOGLE-ADS-TESTE-LEITURA-2026-11-01.sql')
check('SQL mede o padrão gs_ (com _ literal)', sql.includes("'gs\\_%'::text"))
check('SQL lista os 3 grupos do módulo', gs.GS_GRUPOS.every((g: any) => sql.includes(`('${gs.gsCampaign(g)}',`)))
check('SQL é só leitura', !/\b(insert|update|delete|drop|alter|truncate)\b/i.test(sql.replace(/--.*$/gm, '')))
check('SQL conta cadastro, checkout e pagamento', ['cadastros', 'checkout_aberto', 'pagantes', "pg.name = 'payment_success'", "c.name = 'checkout_started'"].every((x) => sql.includes(x)))

console.log(`\n${falhas ? '🔴' : '🟢'} google-landing-0111: ${ok} ok, ${falhas} falha(s)`)
if (falhas) process.exit(1)
