// KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — guardião das duas correções do dia (fundador: "conserta tudo, precisamos faturar
// essa semana"):
//   (1) STUDIO ADS DEPOIS DO ANÚNCIO GRÁTIS — quem já usou a amostra e tenta outro anúncio recebia 403 'no_access' e a tela
//       mostrava erro genérico. Agora a tela troca o erro pela OFERTA do Business (números derivados de lib/businessPlan.ts,
//       frases nas 16 línguas de lib/ads/sample.ts), com o anúncio que a pessoa já fez; o teto do dia ('sample_cap') diz
//       "amostras cheias hoje, volte amanhã ou assine o Business"; a porta /ads troca o convite da amostra pela oferta.
//       O caminho pago (assinante/passe/interna) não muda: tudo depende de sample=true.
//   (2) PAINEL — VENDA QUE NÃO ERA CONTADA: a troca para o anual de 08/10 (US$ 67,85, fatura de subscription_update) gravou
//       plan_switched_to_annual + subscription_update_invoice_paid, e quem contava só payment_success leu "0 vendas em 9 dias".
//       app/api/admin/_shared/sales.ts conta checkout + renovação + troca de plano + anual + Business, UMA venda por fatura/sessão.
// Estilo da casa: readFileSync + asserts; os módulos PUROS (sem import de valor) são importados pelo caminho (.ts, Node 24).
// Nenhum import com alias @/ roda aqui.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').split('\r\n').join('\n')
const imp = (p) => import(pathToFileURL(join(RAIZ, p)).href)

let verdes = 0
const vermelhos = []
const ok = (cond, nome) => {
  if (cond) verdes++
  else vermelhos.push(nome)
  console.log(`${cond ? '✓' : '✗'} ${nome}`)
}
const tenta = (fn) => {
  try {
    return !!fn()
  } catch (e) {
    console.log('   (lançou: ' + (e instanceof Error ? e.message : String(e)) + ')')
    return false
  }
}
// tira comentários de linha (o código é o que vale)
const codigo = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')

const F = {
  sales: 'app/api/admin/_shared/sales.ts',
  overview: 'app/admin/overview/page.tsx',
  webhook: 'app/api/stripe/webhook/route.ts',
  annual: 'lib/billing/annualSwitchCore.ts',
  troca: 'lib/billing/trocaBusiness.ts',
  sample: 'lib/ads/afterSample.ts',
  sampleBase: 'lib/ads/sample.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  biz: 'lib/businessPlan.ts',
  access: 'lib/ads/serverAccess.ts',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  page: 'app/(dashboard)/ads/v2/page.tsx',
  door: 'app/ads/page.tsx',
  start: 'app/api/ads/v2/start/route.ts',
}

// ═══ 2. VENDAS (régua nova) ══════════════════════════════════════════════════════════════════════════════════════════
const S = await imp(F.sales)
const salesSrc = rd(F.sales)
ok(!/^\s*import\s/m.test(salesSrc), '2a _shared/sales.ts é puro (nenhum import)')
const NOMES = ['payment_success', 'subscription_invoice_paid', 'subscription_update_invoice_paid', 'plan_switched_to_annual', 'business_upgrade_credits_granted']
ok(NOMES.every((n) => S.SALE_EVENT_NAMES.includes(n)) && S.SALE_EVENT_NAMES.length === NOMES.length, '2b os 5 eventos de dinheiro confirmado pela Stripe entram na régua')
const trocaEvt = (rd(F.troca).match(/export const BUSINESS_UPGRADE_GRANTED_EVENT = '([^']+)'/) || [])[1]
ok(trocaEvt === 'business_upgrade_credits_granted', `2c o nome do evento da subida para o Business é o do razão (lib/billing/trocaBusiness.ts = ${trocaEvt})`)
// os campos que a régua lê são os que o servidor GRAVA
const wh = rd(F.webhook)
ok(/name: 'subscription_update_invoice_paid', path: '\/api\/stripe\/webhook', metadata: \{ invoice: invoice\.id \?\? null, amount_paid: invoice\.amount_paid \?\? 0, subscription:/.test(wh),
  '2d o webhook grava subscription_update_invoice_paid com invoice / amount_paid / subscription (o que a régua lê)')
ok(/stripe_invoice_id: summary\?\.invoiceId \?\? invoiceId,/.test(rd(F.annual)) && /amount_charged_minor: chargedMinor,/.test(rd(F.annual)) && /invoice_status: summary\?\.status \?\? null,/.test(rd(F.annual)),
  '2e a troca para o anual grava stripe_invoice_id / amount_charged_minor / invoice_status (o que a régua lê)')
ok(/stripe_invoice_id: input\.invoiceId,/.test(rd(F.troca)) && /amount_paid: input\.amountPaid,/.test(rd(F.troca)), '2f a subida para o Business grava stripe_invoice_id / amount_paid')
ok(/name: 'subscription_invoice_paid',[\s\S]{0,400}stripe_invoice_id: invoice\.id \?\? null,[\s\S]{0,400}amount_paid: invoice\.amount_paid \?\? 0,/.test(wh), '2g a renovação grava stripe_invoice_id / amount_paid')

// O CASO REAL de 08/10 (os dois eventos que o banco tem, com os mesmos campos)
const caso0810 = [
  { id: 'e1', name: 'plan_switched_to_annual', user_id: 'u-cliente', created_at: '2026-10-08T03:44:56.798Z', metadata: { tier: 'starter', currency: 'usd', annual_minor: 7100, invoice_status: 'paid', stripe_invoice_id: 'in_1UO8GIIah5dxzSBfkpPq58xC', amount_charged_minor: 6785, invoice_billing_reason: 'subscription_update', stripe_subscription_id: 'sub_1U5TQ3Iah5dxzSBfDZ9VuXGM' } },
  { id: 'e2', name: 'subscription_update_invoice_paid', user_id: null, created_at: '2026-10-08T03:44:57.657Z', metadata: { invoice: 'in_1UO8GIIah5dxzSBfkpPq58xC', amount_paid: 6785, subscription: 'sub_1U5TQ3Iah5dxzSBfDZ9VuXGM' } },
  { id: 'e3', name: 'payment_success', user_id: 'u-velho', created_at: '2026-10-02T13:46:46.528Z', metadata: { stripe_session_id: 'cs_velho', amount_total: 990, currency: 'usd', tier: 'starter' } },
]
const AGORA = Date.parse('2026-10-12T15:00:00Z')
const vendas = S.salesFromEvents(caso0810, { brlPerUsd: 5.5 })
const resumo = S.summarizeSales(vendas, AGORA)
ok(vendas.length === 2, `2h 08/10: a troca para o anual (2 eventos da MESMA fatura) vira UMA venda; com o checkout de 02/10 = 2 (achou ${vendas.length})`)
const anual = vendas.find((v) => v.key === 'in_1UO8GIIah5dxzSBfkpPq58xC')
ok(anual && anual.usd === 67.85 && anual.kind === 'annual_switch' && anual.userId === 'u-cliente' && anual.at === '2026-10-08T03:44:56.798Z' && anual.events.length === 2,
  '2i a venda de 08/10: US$ 67,85, "troca p/ anual", dono = o do plan_switched_to_annual, hora do 1º evento, nunca somada em dobro')
ok(resumo.d7.count === 1 && resumo.d7.usd === 67.85 && resumo.d7NotCheckout === 1 && resumo.last?.key === anual?.key && resumo.d30.count === 2 && resumo.d30.usd === 77.75,
  '2j painel em 12/10: vendas 7 d = 1 (US$ 67,85), última = 08/10; 30 d = 2 (US$ 77,75)')
// a régua velha (só payment_success) — o defeito que o fundador viu
const velha = caso0810.filter((e) => e.name === 'payment_success' && Date.parse(e.created_at) >= AGORA - 9 * 864e5).length
ok(velha === 0, '2k (o defeito) contar só payment_success em 9 dias dá 0 — a régua nova dá 1')
// subida para o Business: razão + fatura de troca = 1 venda, rótulo Business
const biz = S.salesFromEvents([
  { name: 'subscription_update_invoice_paid', user_id: null, created_at: '2026-10-11T10:00:00Z', metadata: { invoice: 'in_biz', amount_paid: 6500, subscription: 'sub_b' } },
  { name: 'business_upgrade_credits_granted', user_id: 'u-b', created_at: '2026-10-11T10:00:01Z', metadata: { stripe_invoice_id: 'in_biz', amount_paid: 6500, currency: 'usd', credits_granted: true } },
], { brlPerUsd: 5.5 })
ok(biz.length === 1 && biz[0].kind === 'business_upgrade' && biz[0].usd === 65 && biz[0].userId === 'u-b', '2l subida para o Business: 1 venda por fatura, rótulo Business, dono do razão')
// troca de plano sem razão: o dono sai da assinatura do perfil; conta interna fora; valor 0 / troca recusada não é venda
const mix = S.salesFromEvents([
  { name: 'subscription_update_invoice_paid', user_id: null, created_at: '2026-10-10T10:00:00Z', metadata: { invoice: 'in_int', amount_paid: 1000, subscription: 'sub_int' } },
  { name: 'subscription_update_invoice_paid', user_id: null, created_at: '2026-10-10T11:00:00Z', metadata: { invoice: 'in_ext', amount_paid: 1000, subscription: 'sub_ext' } },
  { name: 'subscription_invoice_paid', user_id: 'u-r', created_at: '2026-10-10T12:00:00Z', metadata: { stripe_invoice_id: 'in_zero', amount_paid: 0 } },
  { name: 'plan_switched_to_annual', user_id: 'u-x', created_at: '2026-10-10T13:00:00Z', metadata: { stripe_invoice_id: 'in_open', amount_charged_minor: 5000, invoice_status: 'open' } },
  { name: 'subscription_invoice_paid', user_id: 'u-brl', created_at: '2026-10-10T14:00:00Z', metadata: { stripe_invoice_id: 'in_brl', amount_paid: 5500, currency: 'brl' } },
  { name: 'events_qualquer', user_id: 'u-q', created_at: '2026-10-10T15:00:00Z', metadata: { amount_paid: 999 } },
], { brlPerUsd: 5.5, userBySubscription: new Map([['sub_int', 'u-interna'], ['sub_ext', 'u-ext']]), excluded: (id) => id === 'u-interna' })
ok(mix.length === 2 && mix.some((v) => v.key === 'in_ext' && v.userId === 'u-ext' && v.kind === 'plan_change') && mix.some((v) => v.key === 'in_brl' && v.usd === 10),
  '2m dono pela assinatura; interna fora; valor 0, troca não paga e evento alheio não contam; BRL pela taxa da casa')
// janela móvel: o futuro não entra; sem vendas = last null
const vazio = S.summarizeSales([], AGORA)
ok(vazio.last === null && vazio.d7.count === 0 && vazio.d30.usd === 0, '2n sem venda: last null, 0 e US$ 0 (nunca inventa)')

// mutante: se a chave da fatura sumir (cada evento vira venda), a troca de 08/10 conta em dobro → vermelho
const dir = mkdtempSync(join(tmpdir(), 'kineo-vendas-'))
try {
  const mutar = async (de, para) => {
    const src = salesSrc.split('\r\n').join('\n')
    if (!src.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 60))
    const p = join(dir, `m${Math.random().toString(36).slice(2)}.ts`)
    writeFileSync(p, src.split(de).join(para))
    return import(pathToFileURL(p).href)
  }
  const M1 = await mutar("key = str(m.invoice) ?? str(m.stripe_invoice_id) ?? (e.id ? `event:${e.id}` : null)", "key = e.id ? `event:${e.id}` : null")
  ok(M1.salesFromEvents(caso0810, { brlPerUsd: 5.5 }).length === 3, '2o-mutante: troca de plano sem a chave da fatura conta 08/10 em dobro (o guardião pega)')
  const M2 = await mutar("  'subscription_update_invoice_paid',\n  'plan_switched_to_annual',", "  'plan_switched_to_annual',")
  ok(!(NOMES.every((n) => M2.SALE_EVENT_NAMES.includes(n)) && M2.SALE_EVENT_NAMES.length === NOMES.length), '2p-mutante: tirar a fatura de troca da lista deixa o 2b vermelho')
} finally {
  rmSync(dir, { recursive: true, force: true })
}

// o painel usa a régua nova
const ov = codigo(rd(F.overview))
ok(/'subscription_update_invoice_paid',\n\s+'business_upgrade_credits_granted',/.test(ov) && /from '@\/app\/api\/admin\/_shared\/sales'/.test(ov) &&
  /salesFromEvents\(eventRows\.filter\(\(e\) => saleNames\.has\(e\.name\)\) as SaleEvent\[\], \{ brlPerUsd: BRL_PER_USD_HOUSE, userBySubscription, excluded: \(id\) => internalIds\.has\(id\) \}\)/.test(ov) &&
  /label="Vendas · 7 d"/.test(ov) && /m\.sales\.last \?/.test(ov) && /\n\s+sales,\n/.test(ov),
  '2q /admin/overview busca os 5 eventos, conta pela régua nova (interna fora, dono pela assinatura) e mostra "Vendas · 7 d" + última venda')

// ═══ 1. STUDIO ADS DEPOIS DA AMOSTRA ══════════════════════════════════════════════════════════════════════════════════
const SA = await imp(F.sample)
const IF = await imp(F.iface)
const LANGS = IF.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
const C = SA.ADS_AFTER_SAMPLE_COPY
const KEYS = ['title', 'yourAd', 'body', 'cta', 'more', 'cap']
ok(LANGS.length === 16 && Object.keys(C).length === 16 && LANGS.every((l) => C[l] && KEYS.every((k) => typeof C[l][k] === 'string' && C[l][k].trim().length > 0)),
  '1a as frases do pós-amostra existem nas 16 línguas da interface')
ok(LANGS.filter((l) => l !== 'en').every((l) => ['title', 'body', 'cta', 'cap'].every((k) => C[l][k] !== C.en[k])), '1b nenhuma língua é cópia do inglês (título, promessa, botão, teto)')
ok(LANGS.every((l) => ['{ads}', '{seconds}', '{credits}', '{price}'].every((t) => C[l].body.includes(t)) && C[l].cta.includes('{price}')),
  '1c a promessa leva {ads} {seconds} {credits} {price} e o botão leva {price} em TODAS as línguas (número nunca digitado)')
ok(LANGS.every((l) => KEYS.every((k) => !/\b(84|500|12|41)\b|\$\d/.test(C[l][k]))), '1d nenhuma frase digita 84 / 500 / 12 / $')
ok(/free samples are full today/i.test(C.en.cap) && /tomorrow/i.test(C.en.cap) && /Business/.test(C.en.cap), '1e teto do dia em inglês: "Free samples are full today… tomorrow… Business"')
ok(SA.adsAfterSampleCopy('xx') === C.en && SA.adsAfterSampleCopy(null) === C.en && SA.adsAfterSampleCopy('pt').title === C.pt.title, '1f língua desconhecida = inglês')
const offer = { price: '$84', credits: 500, ads: 12, seconds: 15, checkoutHref: '/x', pageHref: '/y' }
ok(SA.fillAfterSample(C.en.body, offer) === 'Business: 12 product ads of 15 s per month (500 credits) for $84/month. Cancel anytime.' && !/\{/.test(SA.fillAfterSample(C.ar.body, offer)),
  '1g fillAfterSample troca os 4 marcadores (inglês exato; árabe sem marcador sobrando)')
ok(!/^\s*import\s(?!type)/m.test(rd(F.sample)) && !/POS-AMOSTRA|AfterSample|AdsBusinessOffer/.test(rd(F.sampleBase)),
  '1h lib/ads/afterSample.ts é puro (só import type); lib/ads/sample.ts (o dinheiro da amostra) não ganhou nada')

// a oferta vem DERIVADA de lib/businessPlan.ts
const bizSrc = codigo(rd(F.biz))
ok(/export const BUSINESS_AFTER_SAMPLE_CHECKOUT_HREF = `\$\{BUSINESS_CHECKOUT_HREF\}&intent_campaign=ads_after_sample`/.test(bizSrc) &&
  /price: BUSINESS_PRICE_LABEL,\n\s+credits: BUSINESS_MONTHLY_CREDITS,\n\s+ads: BUSINESS_ADS_PER_MONTH,\n\s+seconds: BUSINESS_AD_SECONDS,\n\s+checkoutHref: BUSINESS_AFTER_SAMPLE_CHECKOUT_HREF,/.test(bizSrc),
  '1i businessAdsOffer lê preço, créditos, anúncios/mês e duração de lib/businessPlan.ts; checkout tier=business com a campanha ads_after_sample')

// as duas sessões: só a conta da amostra (sample=true) e só o 'no_access' viram oferta
const cli = codigo(rd(F.client))
const sim = codigo(rd(F.simple))
const sessaoOk = (s, erro) => /const sampleGone = \(code: string \| null \| undefined\): boolean => \{\n\s+if \(!sample \|\| code !== 'no_access'\) return false\n\s+onSampleGone\?\.\(\)\n\s+return true\n\s+\}/.test(s) &&
  new RegExp(`const failText = \\(r: \\{ code: string; body: Record<string, unknown> \\}\\): string \\| null => \\(sampleGone\\(r\\.code\\) \\? null : ${erro}\\)`).test(s) &&
  /const uploadGone = \(e: unknown\): boolean => \(e instanceof AdsUploadError && e\.reason === 'paid_feature' \? sampleGone\('no_access'\) : false\)/.test(s) &&
  (s.match(/if \(uploadGone\(e\)\) return/g) || []).length === 3 && (s.match(/setPlanError\(failText\(r\)\)/g) || []).length >= 3 &&
  /scopy && r\.code === 'sample_level_only' \? scopy\.note : failText\(r\)\)/.test(s)
ok(sessaoOk(cli, 'apiError\\(r\\)'), '1j modo completo: 403 no_access / 402 do envio viram oferta SÓ com sample=true; o resto dos erros segue igual')
ok(sessaoOk(sim, 'errorText\\(lang, r\\)') && /if \(sampleGone\(r\.code\)\) return \/\/ KINEO-BUSINESS-POS-AMOSTRA-2026-10-12\n\s+setLinkNote/.test(rd(F.simple)), '1k modo simples: as mesmas regras (e o link do produto também)')
ok(/\{sampleGone && sample && business && mode \? \(\n\s+<AdsAfterSampleOffer lang=\{mode === 'full' \? 'en' : lang\} business=\{business\} \/>\n\s+\) : mode === 'full' \? \(/.test(cli) &&
  (cli.match(/onSampleGone=\{\(\) => setSampleGone\(true\)\}/g) || []).length === 2,
  '1l o invólucro troca a sessão pela oferta (no modo completo em inglês; no simples na língua da tela)')
// a oferta mostra o anúncio que a pessoa já fez (rotas da própria tela, sem custo) e leva ao checkout do Business
ok(/export function AdsAfterSampleOffer\(/.test(sim) && /api<[^>]+>\('\/api\/ads\/v2\/orders'\)/.test(sim) && /\.find\(\(o\) => o\.status === 'delivered' && !!o\.video_id\)/.test(sim) &&
  /`\/api\/ads\/v2\/status\?order_id=\$\{encodeURIComponent\(last\.id\)\}`/.test(sim) && /href=\{business\.checkoutHref\}>\{fillAfterSample\(c\.cta, business\)\}/.test(sim) && !/trackEvent\(/.test(sim),
  '1m AdsAfterSampleOffer: último anúncio ENTREGUE (orders → status) + botão do checkout do Business; sem anúncio = só texto')
// o teto do dia: frase honesta + Business, e /pricing continua
const capOk = (s, b) => new RegExp(`\\{scopy && sampleCap \\? <p className="adsw-warn" role="alert">\\{${b} \\? acopy\\.cap : scopy\\.cap\\} \\{${b} \\? <><a className="adsw-link" href=\\{${b}\\.checkoutHref\\}>\\{fillAfterSample\\(acopy\\.cta, ${b}\\)\\} →</a>`).test(s) && /href="\/pricing"/.test(s)
ok(capOk(cli, 'businessOffer') && capOk(sim, 'business'), '1n sample_cap: "amostras cheias hoje, volte amanhã ou assine o Business" com o checkout; o link dos planos fica')
ok(/\{scopy && businessOffer \? <AdsAfterSampleOffer lang="en" business=\{businessOffer\} compact \/> : null\}/.test(cli) && /\{scopy && business \? <AdsAfterSampleOffer lang=\{lang\} business=\{business\} compact \/> : null\}/.test(sim),
  '1o a amostra entregue já mostra a oferta (compacta) logo abaixo do anúncio')
// a página só entrega a oferta para a amostra; o caminho pago fica sem prop
const pg = codigo(rd(F.page))
ok(/ sample=\{sample\} business=\{sample \? businessAdsOffer\(\) : null\} \/>/.test(pg) && /import \{ businessAdsOffer \} from '@\/lib\/businessPlan'/.test(pg), '1p /ads/v2 passa a oferta SÓ com sample (assinante/passe/interna: null)')
ok(!/businessAdsOffer|POS-AMOSTRA|AfterSample/.test(rd(F.start)) && /return v2Fail\(gate === 'closed' \? 'closed' : 'no_access', 403\)/.test(rd(F.start)) && /if \(!\(balance >= cost\)\) return v2Fail\('out_of_credits', 402, \{ needed: cost, balance \}\)/.test(rd(F.start)),'1q /api/ads/v2/start intocado (o 403 no_access e o caminho pago seguem iguais no servidor)')
// a porta /ads: amostra usada → oferta no lugar do convite
const door = codigo(rd(F.door))
ok(/const afterSample: AdsSampleUsedAd \| null = ADS_SAMPLE_LIVE && live && ADS_V2_PUBLIC && !sampleHref && viewer\.signedIn && viewer\.gate === 'no_access' && viewer\.userId\n\s+\? await withTimeout\(loadAdsSampleUsedAd\(footageAdminClient\(\), viewer\.userId\), null\)\.then\(\(r\) => \(r && r\.used && r\.delivered \? r : null\)\)\n\s+: null/.test(door),
  '1r porta /ads: oferta só para logado barrado, sem amostra aberta e com a amostra USADA e ENTREGUE; timeout = porta de antes')
const iS = door.indexOf('{sampleHref ? ('), iA = door.indexOf('{afterSample ? ('), iP = door.indexOf('{paywallOffer ? (')
ok(iS > 0 && iA > iS && iP > iA && /href=\{business\.checkoutHref\}/.test(door) && /fillAfterSample\(afterCopy\.body, business\)/.test(door) && !/\$84|\b500 credits|\b12 product ads/.test(door.slice(iA, iP)),
  '1s a oferta fica onde estava o convite (antes da oferta paga), com números derivados e o checkout do Business')
const acc = codigo(rd(F.access))
const listaOpen = (acc.slice(acc.indexOf('export async function adsSampleOpen'), acc.indexOf('export function adsSampleLevelOk')).match(/\.in\('status', (\[[^\]]+\])\)/) || [])[1]
const listaUsed = (acc.match(/const ADS_SAMPLE_USED_STATUSES = (\[[^\]]+\])/) || [])[1]
ok(/export async function loadAdsSampleUsedAd\(/.test(acc) && !!listaOpen && listaOpen === listaUsed && /\.like\('billing_ref', `\$\{ADS_SAMPLE_PREFIX\}%`\)\n\s+\.in\('status', ADS_SAMPLE_USED_STATUSES\)/.test(acc) &&
  /\.from\('videos'\)\.select\('video_url, thumbnail_url'\)\.eq\('id', videoId\)\.eq\('user_id', userId\)/.test(acc) && /\} catch \{\n\s+return none\n\s+\}/.test(acc),
  '1t "amostra usada" = o mesmo critério do adsSampleOpen; o vídeo é do próprio dono; erro = sem oferta')

console.log(`\ntest-business-depois-da-amostra: ${verdes} verdes, ${vermelhos.length} vermelhos`)
if (vermelhos.length) {
  for (const v of vermelhos) console.log('  ✗ ' + v)
  process.exit(1)
}
