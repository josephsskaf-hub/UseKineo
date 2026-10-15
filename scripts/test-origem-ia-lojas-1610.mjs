// KINEO-ORIGEM-IA-LOJAS-1610 — guardião das duas entregas de 16/10:
//   1. ATRIBUIÇÃO: classe "ai_assistant_likely" (ESTIMATIVA) = pouso SEM referrer e SEM utm/click-id direto numa página de
//      conteúdo. Home sem referrer continua "direto"; utm/referrer chatgpt continua "chatgpt"; origem conhecida nunca perde.
//   2. PÁGINA DE LOJAS (/ads/for/online-stores): resumo de 3 linhas, fluxo, custo por anúncio DERIVADO do código, comparação
//      com fonte e data, FAQ visível = JSON-LD, título ≤ 60, descrição ≤ 155, nenhum preço nosso digitado.
// Cada prova tem mutante: o mutante tem de PROVAR que foi aplicado (o texto mudou) e tem de REPROVAR.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { root, source, offlineModules, React, renderToStaticMarkup, checks } from './gpt24h-offline-support.mjs'

const { check, finish } = checks()
const ACQ = 'lib/acquisitionSource.ts'
const GUIDE = 'lib/growth/adsStoreGuide.ts'
const PAGE = 'app/ads/for/[segment]/page.tsx'
const norm = (s) => s.replace(/\r\n/g, '\n')

// ── 1. A regra, executada ──────────────────────────────────────────────────────────────────────────────────────────
function rules(acqSource) {
  const load = offlineModules({ replacements: acqSource ? { [ACQ]: acqSource } : {} })
  return load(ACQ)
}
function ruleSuite(A) {
  const infer = (path, rawReferrer = '', search = '') => A.inferAiAssistantLikely({ path, rawReferrer, search })
  return {
    homeDirect: infer('/') === null && A.landingSessionSourceClass({}, '/') === 'direct',
    contentLanding: infer('/faceless-youtube-shorts-generator') === 'ai_assistant_likely' &&
      infer('/ads/for/online-stores') === 'ai_assistant_likely' && infer('/vs/creatify-alternative') === 'ai_assistant_likely' &&
      infer('/ai-video-generator/for/x') === 'ai_assistant_likely' && infer('/cheapest-ai-shorts-maker/') === 'ai_assistant_likely',
    productNotContent: infer('/ads') === null && infer('/pricing') === null && infer('/v/abc') === null && infer('/studio') === null && infer('/a/code') === null,
    referrerBlocks: infer('/faceless-youtube-shorts-generator', 'https://www.usekineo.com/') === null && infer('/vs/x', 'https://chatgpt.com/') === null,
    signalBlocks: infer('/vs/x', '', '?utm_source=chatgpt') === null && infer('/vs/x', '', '?gclid=abc') === null &&
      infer('/vs/x', '', '?ref=partner') === null && infer('/vs/x', '', '?utm_source=homepage') === null,
    chatgptWins: A.landingSessionSourceClass({ utm_source: 'chatgpt' }, '/faceless-youtube-shorts-generator') === 'chatgpt' &&
      A.landingSessionSourceClass({ source: 'chatgpt' }, '/vs/x') === 'chatgpt' &&
      A.landingSessionSourceClass({ referrer_host: 'chatgpt.com' }, '/vs/x') === 'chatgpt',
    knownWins: A.landingSessionSourceClass({ referrer_host: 'google' }, '/vs/x') === 'google' &&
      A.landingSessionSourceClass({ surface: 'homepage' }, '/vs/x') === 'direct',
    eventCarries: A.landingSessionSourceClass({ source: 'ai_assistant_likely' }, '/') === 'ai_assistant_likely',
    legacyDirectUntouched: A.acquisitionSource({}) === 'direct' && A.acquisitionSource({ referrer: 'https://chatgpt.com/' }) === 'chatgpt',
  }
}
const real = ruleSuite(rules())
check('home sem referrer continua "direto"', real.homeDirect)
check('pouso de conteúdo sem referrer e sem utm vira ai_assistant_likely', real.contentLanding)
check('telas do produto (/ads, /pricing, /v, /studio, /a) nunca viram estimativa', real.productNotContent)
check('qualquer referrer (inclusive o nosso) impede a estimativa', real.referrerBlocks)
check('utm_* (inclusive superfície interna), gclid e ref impedem a estimativa', real.signalBlocks)
check('utm/referrer chatgpt vence: continua "chatgpt"', real.chatgptWins)
check('origem conhecida vence; superfície interna sem origem fica "direto"', real.knownWins)
check('evento novo com source=ai_assistant_likely é lido como tal', real.eventCarries)
check('acquisitionSource() de antes não mudou (sem nada = direct)', real.legacyDirectUntouched)

// Lista derivada das rotas que EXISTEM em app/ (e nenhuma rota de produto nela).
const acq = norm(source(ACQ))
const segBlock = acq.match(/const CONTENT_LANDING_SEGMENTS = new Set\(\[([\s\S]*?)\]\)/)
const segs = segBlock ? [...segBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
check('lista de conteúdo lida do código (mais de 30 rotas)', segs.length > 30)
const missing = segs.filter((seg) => !existsSync(resolve(root, 'app', seg)))
check(`toda rota da lista existe em app/ (faltando: ${missing.join(', ') || 'nenhuma'})`, missing.length === 0)
const forbidden = ['', 'pricing', 'v', 'a', 's', 'studio', 'generate', 'login', 'signup', 'checkout', 'ads', 'partners', 'from-youtube', 'shopify', 'claude-connector']
check('nenhuma rota de produto/afiliado/rede na lista', forbidden.every((f) => !segs.includes(f)))
check('/ads/for/ é a única filha-de-produto aceita', /CONTENT_LANDING_CHILD_PREFIXES = \['\/ads\/for\/'\]/.test(acq))

// Mutantes da regra.
const mutants = [
  ['sem a trava do referrer cru', "  if ((input.rawReferrer ?? '').trim() !== '') return null\n", '', 'referrerBlocks'],
  ['home aceita como conteúdo', "  if (!p || p === '/') return false\n", "  if (!p) return false\n  if (p === '/') return true\n", 'homeDirect'],
  ['utm ignorado no evento antigo', "  if (utm) return sanitizeAcquisitionUtmSource(utm) ?? 'direct'\n", '', 'chatgptWins'],
  ['click-id ignorado', "    if (k.startsWith('utm_') || CLICK_ID_KEYS.includes(k)) signal = true\n", "    if (k.startsWith('utm_')) signal = true\n", 'signalBlocks'],
]
for (const [name, from, to, key] of mutants) {
  const applied = acq.includes(from)
  const mutated = applied ? ruleSuite(rules(acq.replace(from, to))) : null
  check(`mutante "${name}" aplicado e reprovado`, applied && mutated[key] === false)
}

// ── 2. Onde a regra é ligada ───────────────────────────────────────────────────────────────────────────────────────
const sc = norm(source('components/SourceCapture.tsx'))
check('SourceCapture: estimativa só quando NÃO há origem conhecida nem superfície', /if \(referrerHost === null && utmSource === null && surface === null\) \{[\s\S]{0,200}inferAiAssistantLikely\(\{[\s\S]{0,120}rawReferrer: document\.referrer/.test(sc))
check('SourceCapture: origem conhecida vence a estimativa', /const source = referrerHost \?\? utmSource \?\? inferredSource\n/.test(sc))
check('SourceCapture: estimativa não conta como origem conhecida e é marcada', /source_known: source !== null && inferredSource === null,/.test(sc) && /source_inferred: inferredSource !== null,/.test(sc))
const an = norm(source('lib/analytics.ts'))
check('analytics: estimativa só no ramo "nada a gravar" do first-touch', /\n\s*if \(Object\.keys\(src\)\.length === 0\) captureSourceGuessOnce\(\)\n\s*if \(Object\.keys\(src\)\.length === 0\) return\n/.test(an))
check('analytics: chave própria (kineo_src_guess), nunca dentro de kineo_src', /const SRC_GUESS_KEY = 'kineo_src_guess'/.test(an) && !/localStorage\.setItem\(SRC_KEY, guess\)/.test(an))
check('analytics: cadastro envia a estimativa em campo próprio', /signup_source_guess: storedSourceGuess\(\),/.test(an))
const route = norm(source('app/api/track-signup-source/route.ts'))
check('cadastro: estimativa só sem NENHUMA origem conhecida (perfil, pedido, gclid)', /const noKnownOrigin =\n\s*!profile\?\.signup_utm_source && !profile\?\.utm_source && !profile\?\.signup_referrer && !profile\?\.gclid &&\n\s*!signup_utm_source && !utm_source && !signup_referrer && !gclid\n\s*if \(sourceGuess && noKnownOrigin && !patch\.signup_utm_source\) patch\.signup_utm_source = sourceGuess/.test(route))
check('cadastro: só o valor exato ai_assistant_likely é aceito', /signup_source_guess = guess === AI_ASSISTANT_LIKELY_SOURCE \? guess : null/.test(route) && /cookieGuess === AI_ASSISTANT_LIKELY_SOURCE \? cookieGuess : null/.test(route))
check('cadastro: origem conhecida só substitui a ESTIMATIVA, nunca outra origem', /\(!profile\?\.signup_utm_source \|\| profile\.signup_utm_source === AI_ASSISTANT_LIKELY_SOURCE\) &&\n\s*signup_utm_source && signup_utm_source !== AI_ASSISTANT_LIKELY_SOURCE/.test(route))
const funnel = norm(source('app/api/admin/funnel/route.ts'))
check('painel: estimativa fora de "attributed" e separada de "direto"', /source\.source !== 'direct' && source\.source !== AI_ASSISTANT_LIKELY_SOURCE/.test(funnel) && /aiAssistantLikelySignups: sourceQuality\.find\(\(source\) => source\.source === AI_ASSISTANT_LIKELY_SOURCE\)/.test(funnel))
check('painel: sessões de pouso classificadas pela MESMA regra', /const cls = landingSessionSourceClass\(event\.metadata, event\.path\)/.test(funnel) && /landingSourceMix, firstVideoOnboarding/.test(funnel))
const fc = norm(source('app/(dashboard)/admin/funnel/FunnelClient.tsx'))
check('painel: a tela rotula a classe como ESTIMATE', fc.includes("row.estimate ? ' · ESTIMATE' : ''") && fc.includes('AI assistant (likely) · estimate'))

// ── 3. A página de lojas ───────────────────────────────────────────────────────────────────────────────────────────
function renderStore(mocks = {}) {
  const load = offlineModules({ mocks })
  const page = load(PAGE)
  const pres = load('lib/growth/adsSegmentPresentation.ts')
  const segs = load('lib/growth/adsSegments.ts')
  const html = renderToStaticMarkup(React.createElement(page.default, { params: { segment: 'online-stores' } }))
  return { page, pres, segs, html, meta: page.generateMetadata({ params: { segment: 'online-stores' } }) }
}
const store = renderStore()
const seg = store.segs.findAdsSegment('online-stores')
check('título ≤ 60 e descrição ≤ 155', store.meta.title.absolute.length <= 60 && store.meta.description.length <= 155 && store.meta.openGraph.title === store.meta.title.absolute)
const summary = store.html.match(/<section class="summary" aria-label="Summary">([\s\S]*?)<\/section>/)
check('resumo no topo (antes do hero) com exatamente 3 linhas', Boolean(summary) && (summary[1].match(/<p>/g) ?? []).length === 3 && store.html.indexOf('class="summary"') < store.html.indexOf('class="hero"'))
const ld = JSON.parse(store.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
const faq = store.pres.adsSegmentFaq(seg)
check('FAQ visível = JSON-LD (mesmas perguntas e respostas, mais que as 4 gerais)', ld['@type'] === 'FAQPage' && ld.mainEntity.length === faq.length && faq.length > 4 &&
  ld.mainEntity.every((q, i) => q.name === faq[i].question && q.acceptedAnswer.text === faq[i].answer && store.html.includes(`<summary>${q.name}</summary>`)))
check('a pergunta do ChatGPT está no FAQ', faq.some((q) => /AI tool to make product video ads for my online store/.test(q.question)))
for (const name of ['Creatify', 'Arcads', 'Pippit', 'Topview', 'Zeely']) check(`comparação cita ${name}`, store.html.includes(`>${name}</a>`))
const guide = offlineModules()(GUIDE)
check('cada concorrente tem fonte no domínio oficial e a data de consulta aparece', guide.STORE_COMPETITORS.every((c) => /^https:\/\/(www\.)?(creatify\.ai|arcads\.ai|pippit\.ai|topview\.ai|zeely\.ai)\//.test(c.source) && c.publicPrice && c.bestFor) && store.html.includes(guide.COMPETITORS_CHECKED_ON))
check('sem vencedor universal (a página diz que nenhuma ferramenta serve a toda loja)', store.html.includes('No tool is best for every store') && !/\b(best|#1|number one)\b[^.]{0,40}\bKineo\b/i.test(store.html.replace('No tool is best for every store', '')))
check('apresentador de IA rotulado como IA', /always labeled as AI/.test(store.html))
const other = renderStore()
const restHtml = renderToStaticMarkup(React.createElement(other.page.default, { params: { segment: 'restaurants' } }))
const restMeta = other.page.generateMetadata({ params: { segment: 'restaurants' } })
check('outros segmentos não mudam: sem guia, FAQ de 4, título de sempre', !restHtml.includes('class="summary"') && !restHtml.includes('COST PER AD') && other.pres.adsSegmentFaq(other.segs.findAdsSegment('restaurants')).length === 4 && restMeta.title.absolute === 'Video ads for Restaurants | Kineo')

// Nenhum preço/crédito/segundo NOSSO digitado no guia (fora da tabela de concorrentes, que é dado externo com fonte).
const gsrc = norm(source(GUIDE))
  .replace(/\/\/.*$/gm, '')
  .replace(/^import .*$/gm, '')
  .replace(/export const STORE_COMPETITORS[\s\S]*?\n\]\n/, '')
  .replace(/export const COMPETITORS_CHECKED_ON = '[^']*'/, '')
const literals = [...gsrc.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map((m) => m[2].replace(/\$\{[^}]*\}/g, ''))
const typed = literals.filter((l) => /\d/.test(l))
check(`guia sem número nosso digitado (achados: ${typed.join(' | ') || 'nenhum'})`, typed.length === 0)
check('a página não digita número no JSX', !/>[^<{}]*\d[^<{}]*</.test(norm(source(PAGE))))

// Mutantes de preço: a fonte muda → a página muda.
const prices = offlineModules()('lib/checkoutPricing.ts')
const cheaper = renderStore({ 'lib/checkoutPricing.ts': { ...prices, TIER_PRICES: { ...prices.TIER_PRICES, basic: { usd: 1234 } } } })
const expectedPerAd = prices.formatCheckoutMoney('usd', Math.round(1234 * 41 / prices.TIER_CREDITS.basic))
check('mutante de preço (Creator) aplicado e propagado à tabela e ao resumo', cheaper.html !== store.html && cheaper.html.includes(expectedPerAd))
const tiers = offlineModules()('lib/ads/v2Tiers.ts')
const pricier = renderStore({ 'lib/ads/v2Tiers.ts': { ...tiers, adsV2Credits: (t, s) => tiers.adsV2Credits(t, s) + 100 } })
check('mutante de créditos por nível aplicado e propagado', pricier.html !== store.html && pricier.html.includes('Commercial (141 credits)'))
const pres = offlineModules()('lib/ads/v2Presenter.ts')
const noPresenter = renderStore({ 'lib/ads/v2Presenter.ts': { ...pres, ADS_V2_PRESENTER_PUBLIC: false } })
const summaryOf = (html) => (html.match(/<section class="summary"[^>]*>([\s\S]*?)<\/section>/) ?? ['', ''])[1]
check('apresentador desligado some do resumo (a página só cita o que o produto faz)', !summaryOf(noPresenter.html).includes('AI presenter') && summaryOf(store.html).includes('AI presenter'))

finish()
