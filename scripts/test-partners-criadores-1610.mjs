// KINEO-PARTNERS-CRIADORES-1610 — guardião da /partners reescrita como "Kineo Creator Partners" (fundador 16/10).
//
// A página copia o MOLDE do programa de criadores da Higgsfield, mas só pode prometer o que o produto da Kineo executa.
// Este guardião prova, lendo e EXECUTANDO as fontes reais:
//   (1) a comissão vem do código (AFFILIATE_COMMISSION_PCT), nunca digitada; o único % digitado fora da tabela
//       comparativa é o do cupom, e ele bate com AFFILIATE_COUPON_PERCENT de lib/affiliateCoupon.ts;
//   (2) cada benefício prometido tem fonte viva no código (pacote/cortesia, interruptor PARTNER_PACK_LIVE, Seedance 2.5 e
//       Studio Ads para parceiro ativo, crédito pelo post público, sem piso de seguidores, 90 dias, auto-indicação);
//   (3) nenhuma promessa da Higgsfield que a Kineo não executa (crédito mensal, vitrine, acesso antecipado, prazo de
//       resposta, cachê por post/mil views, "ilimitado", ganho em dólar digitado);
//   (4) FAQ visível = JSON-LD (as duas saem da MESMA lista `faq`; nenhuma pergunta fora dela; toda resposta avalia);
//   (5) as regras (selo de IA, sem review falsa) estão na página; o CTA usa o fluxo que JÁ existe (/affiliate → apply);
//   (6) a mídia vem das listas da casa (exemplo do fundador + prévia real do Studio Ads) e os arquivos existem.
// Mutantes: cada regra quebrada fica vermelha; e um mutante POSITIVO (comissão muda na fonte) prova que a página segue.
// Opcional: PARTNERS_URL=http://localhost:3000/partners confere no HTML servido que o JSON-LD = o texto visível do FAQ.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  page: 'app/partners/page.tsx',
  commission: 'lib/affiliateCommission.ts',
  pack: 'lib/partnerPack.ts',
  partnerAccess: 'lib/partnerAccess.ts',
  adsServer: 'lib/ads/serverAccess.ts',
  cinematic: 'app/api/generate-video-cinematic/route.ts',
  me: 'app/api/affiliate/me/route.ts',
  coupon: 'lib/affiliateCoupon.ts',
  apply: 'app/api/affiliate/apply/route.ts',
  partnerPost: 'app/api/affiliate/partner-post/route.ts',
  dashboard: 'app/(dashboard)/affiliate/page.tsx',
  linkRoute: 'app/a/[code]/route.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
  attribution: 'lib/affiliateAttribution.ts',
}

// Carregador mínimo de módulos TS da casa (alias @/ e relativos), com troca de fonte para os mutantes.
function makeLoader(overrides = {}) {
  const cache = new Map()
  const resolve = (from, id) => {
    const base = id.startsWith('@/') ? path.join(ROOT, id.slice(2)) : path.resolve(path.dirname(from), id)
    for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) if (fs.existsSync(c)) return c
    throw Error('não resolvi ' + id)
  }
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const src = overrides[rel] ?? read(rel)
    const mod = { exports: {} }
    cache.set(file, mod)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, (id) => {
      if (id.startsWith('@/') || id.startsWith('.')) return load(resolve(file, id))
      throw Error('import externo inesperado ' + id)
    }, { env: {} })
    return mod.exports
  }
  return (rel) => load(path.join(ROOT, rel))
}

// Tira comentários de linha (sem confundir com "https://"), blocos /* */ e {/* */} do JSX.
function semComentarios(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n')
}

function problems(overrides = {}) {
  const p = []
  const S = (rel) => overrides[rel] ?? read(rel)
  const page = S(F.page)
  const code = semComentarios(page)
  const req = makeLoader(overrides)
  const C = req(F.commission)
  const pack = req(F.pack)
  const scope = {
    ...C,
    ...pack,
    ...req('lib/freeTierOffer.ts'),
    ...req('lib/freeFilmPolicy.ts'),
    ...req('lib/growth/affiliateProgramComparison.ts'),
  }
  const evalExpr = (expr, extra = {}) => {
    const sc = { ...scope, ...extra }
    return new Function(...Object.keys(sc), `return (${expr})`)(...Object.values(sc))
  }
  const PCT = C.AFFILIATE_COMMISSION_PCT

  // Constante da página que entra nas respostas (PACK_DELIVERY), avaliada com as fontes reais.
  const packDeliveryM = page.match(/^const PACK_DELIVERY = (.+)$/m)
  let PACK_DELIVERY = null
  try { PACK_DELIVERY = packDeliveryM ? evalExpr(packDeliveryM[1]) : null } catch { PACK_DELIVERY = null }
  if (typeof PACK_DELIVERY !== 'string') p.push('PACK_DELIVERY sumiu ou não avalia')
  const local = { PACK_DELIVERY }

  // ── (4) FAQ: uma lista, uma linha por pergunta, toda resposta avalia ────────────────────────────────────────────
  const faqBlock = page.match(/const faq = \[\n([\s\S]*?)\n  \]\n/)
  if (!faqBlock) return [...p, 'lista `const faq = [...]` não encontrada']
  const items = []
  for (const line of faqBlock[1].split('\n')) {
    if (/^\s*\/\//.test(line) || !line.trim()) continue
    const m = line.match(/^\s*\{ q: '((?:[^'\\]|\\.)*)', a: ([\s\S]*) \},\s*$/)
    if (!m) { p.push('linha da FAQ fora do formato de uma linha: ' + line.slice(0, 70)); continue }
    let a
    try { a = evalExpr(m[2], local) } catch (e) { p.push(`resposta de "${m[1]}" não avalia: ${e.message}`); continue }
    if (typeof a !== 'string' || /undefined|NaN|\[object/.test(a)) p.push(`resposta de "${m[1]}" sai quebrada`)
    items.push({ q: m[1].replace(/\\'/g, "'"), a })
  }
  const A = (q) => items.find((i) => i.q === q)?.a ?? ''
  if ((page.match(/const faq = \[/g) || []).length !== 1) p.push('mais de uma lista de FAQ na página')
  if ((page.match(/FAQPage/g) || []).length !== 1 || (page.match(/application\/ld\+json/g) || []).length !== 1) p.push('JSON-LD de FAQ duplicado ou ausente')
  if (!page.includes("mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),")) p.push('JSON-LD não sai da lista inteira `faq`')
  const visible = page.match(/id="affiliate-program-faq"[\s\S]*?<\/section>/)?.[0] ?? ''
  if (!visible.includes('{faq.map((f) => (') || !visible.includes('{f.q}') || !visible.includes('{f.a}')) p.push('FAQ visível não desenha a lista inteira `faq`')
  if (/\?<\/div>|\?<\/p>|\?<\/summary>|<details/.test(visible)) p.push('FAQ visível tem pergunta escrita fora da lista (some do JSON-LD)')
  for (const q of ['Who can join?', 'What is the courtesy Creator account?', 'Can Kineo make a video for me?', 'What should I post?', 'What are the rules?', 'How much do I earn?']) {
    if (!A(q)) p.push('FAQ sem: ' + q)
  }

  // ── (1) comissão do código; único % digitado (fora da comparação) é o do cupom ─────────────────────────────────
  if (!/^import \{[^}]*\bAFFILIATE_COMMISSION_PCT\b[^}]*\} from '@\/lib\/affiliateCommission'/m.test(page)) p.push('a página não importa AFFILIATE_COMMISSION_PCT da fonte')
  for (const anchor of ['Earn {AFFILIATE_COMMISSION_PCT} Recurring</h1>', "t: `Post and earn ${AFFILIATE_COMMISSION_PCT} recurring`", 'pays you ${AFFILIATE_COMMISSION_PCT} of each eligible payment']) {
    if (!page.includes(anchor)) p.push('taxa não derivada em: ' + anchor)
  }
  if (!A('How much do I earn?').includes(`earn ${PCT} of each eligible payment`)) p.push(`FAQ de ganho não diz ${PCT} (fonte)`)
  // Texto que o visitante lê: sem a FAQ comparativa (números dos concorrentes, com fonte em affiliateProgramComparison),
  // sem o CSS da página e sem os style={{...}} / gridTemplateColumns (100% de layout não é promessa).
  const semComparacao = code
    .replace(/const PARTNERS_CREATOR_CSS = `[\s\S]*?`/, '')
    .replace(/style=\{\{[^}]*\}\}/g, '')
    .replace(/gridTemplateColumns: '[^']*'/g, '')
    .split('\n').filter((l) => !l.includes("q: 'How does Kineo compare with other AI video affiliate programs?'")).join('\n')
  const typedPct = [...semComparacao.matchAll(/\b(\d{1,3}) ?%/g)].map((m) => m[1])
  const couponSource = S(F.coupon)
  const coupon = couponSource.match(/^export const AFFILIATE_COUPON_PERCENT = (\d+)$/m)?.[1]
  if (!coupon || !/duration: 'once'/.test(couponSource)) p.push('fonte do cupom (AFFILIATE_COUPON_PERCENT, once) não encontrada')
  for (const n of typedPct) if (n !== coupon) p.push(`% digitado na página sem fonte: ${n}%`)
  if (!/50% off the first month of Creator or Studio monthly/.test(code) || coupon !== '50') p.push('cupom de 50% no 1º mês Creator/Studio mensal não bate com lib/affiliateCoupon.ts')

  // ── (2) cada benefício com fonte viva ──────────────────────────────────────────────────────────────────────────
  const court = A('What is the courtesy Creator account?')
  if (!court.includes(`${pack.PARTNER_PACK_STAGE1_CREDITS} credits`) || !court.includes(`${pack.PARTNER_PACK_DAYS} days`) || !court.includes(`${pack.PARTNER_PACK_STAGE2_CREDITS} more`)) p.push('cortesia sem os números de lib/partnerPack')
  if (pack.PARTNER_PACK_LIVE ? !/added the moment you join/.test(court) : (/added the moment you join/.test(court) || !/email us after you join/.test(court))) p.push('cortesia não segue o interruptor PARTNER_PACK_LIVE')
  if (pack.PARTNER_PACK_LEVEL !== 'creator_trial' && /Creator-level/.test(code)) p.push('página diz Creator-level, mas o nível do pacote mudou: ' + pack.PARTNER_PACK_LEVEL)
  if (!/^const PACK_DELIVERY = PARTNER_PACK_LIVE \?/m.test(page)) p.push('PACK_DELIVERY não lê PARTNER_PACK_LIVE')
  if (/Seedance 2\.5|Studio Ads/.test(code)) {
    const pa = S(F.partnerAccess)
    const ligado = /export async function isActivePartner/.test(pa) && /isActivePartner\(/.test(S(F.adsServer)) && /isActivePartner\(/.test(S(F.cinematic))
    if (!ligado) p.push('página promete Seedance 2.5/Studio Ads ao parceiro, mas lib/partnerAccess não está ligado no Ads e no 2.5')
  }
  if (/post link in your dashboard|public post/.test(code)) {
    if (!fs.existsSync(path.join(ROOT, F.partnerPost)) || !S(F.dashboard).includes("fetch('/api/affiliate/partner-post'")) p.push('crédito pelo post público sem rota/painel')
  }
  if (/No follower minimum|no follower minimum/.test(code)) {
    const ap = semComentarios(S(F.apply))
    if (/follower|subscriber|audience_size|min_?followers/i.test(ap) || !/status: 'active'/.test(ap)) p.push('"No follower minimum"/link ativo na hora não batem com app/api/affiliate/apply/route.ts')
  }
  if (/90-day|90 days/.test(code) && !/^const COOKIE_MAX_AGE = 90 \* 24 \* 60 \* 60/m.test(S(F.linkRoute))) p.push('90 dias de first touch não batem com app/a/[code]/route.ts')
  if (/Your own purchases do not count|own link or code/.test(code)) {
    if (!/aff\.user_id === compradorUserId/.test(S(F.webhook)) || !/'self_referral'/.test(S(F.attribution))) p.push('regra de auto-indicação sem a trava no webhook/atribuição')
  }
  if (!/const APPLY = '\/affiliate\?/.test(page) || !S(F.dashboard).includes("fetch('/api/affiliate/apply'")) p.push('CTA não leva ao fluxo de inscrição que já existe (/affiliate → /api/affiliate/apply)')
  for (const m of page.matchAll(/<OrganicCtaLink href=\{?([^ }]+)\}? source="partners" placement="(hero|comparison|bottom)"/g)) {
    if (m[1] !== 'APPLY') p.push(`CTA ${m[2]} não usa APPLY`)
  }
  if (/<form\b|fetch\(|\/api\/partners/.test(code)) p.push('página inventa backend/formulário próprio')

  // ── (3) nada da Higgsfield que a Kineo não executa ─────────────────────────────────────────────────────────────
  const forbidden = [
    [/early access/i, 'acesso antecipado'],
    [/featured (on|in) (our|kineo)|showcase (your|the best)|spotlight/i, 'vitrine dos posts nos canais da Kineo'],
    [/every month|each month|monthly credits|renew(ed|s)? (it )?(every|each|monthly)/i, 'crédito/cortesia renovado todo mês'],
    [/within \d+ ?(h\b|hours?|days?)|48 ?h/i, 'prazo de resposta'],
    [/per (1,?000|thousand) views|\bCPM\b|paid per post|upfront|sponsorship fee/i, 'cachê por post/mil views'],
    [/unlimited|guaranteed/i, 'ilimitado/garantido'],
    [/\$\d/, 'dinheiro digitado (exemplo de ganho só calculado)'],
  ]
  for (const [re, what] of forbidden) if (re.test(code)) p.push('promessa sem fonte no código: ' + what)

  // ── (5) regras curtas e honestas ───────────────────────────────────────────────────────────────────────────────
  if (!/t: 'Label it as AI'/.test(page) || !/t: 'Real opinions only', d: 'No fake reviews/.test(page)) p.push('regras sem selo de IA / sem review falsa')
  const rules = A('What are the rules?')
  if (!/AI-made/.test(rules) || !/no fake reviews/i.test(rules)) p.push('FAQ das regras sem selo de IA / sem review falsa')

  // ── (6) mídia das listas da casa, arquivos existem ──────────────────────────────────────────────────────────────
  if (/\.(mp4|webm|webp|jpg|png)['"`]/.test(code)) p.push('caminho de mídia digitado na página (fora das listas da casa)')
  try {
    const ex = req('lib/publicExamples.ts').PUBLIC_EXAMPLES.find((e) => e.slug === 'north-sentinel-island')
    const ad = req('lib/ads/v2Styles.ts').adsV2Style('giant_product')
    for (const f of [ex.videoPath, ex.posterPath.replace(/\.jpg$/, '.webp'), ad.preview, ad.poster]) {
      if (!fs.existsSync(path.join(ROOT, 'public', f))) p.push('mídia não existe: ' + f)
    }
  } catch (e) { p.push('mídia não carrega: ' + e.message) }
  if (!/PUBLIC_EXAMPLES\.find\(\(e\) => e\.slug === 'north-sentinel-island'\)/.test(page) || !/adsV2Style\('giant_product'\)/.test(page)) p.push('mídia não vem de lib/publicExamples + lib/ads/v2Styles')

  return { p, items, PCT }
}

const run = (o) => { try { return problems(o) } catch (e) { return { p: ['exceção: ' + e.message], items: [] } } }

console.log('TESTE /partners — Kineo Creator Partners (KINEO-PARTNERS-CRIADORES-1610)')
const real = run()
ok(real.p.length === 0, '(1–6) comissão do código, benefícios com fonte, nada da Higgsfield sem código, FAQ = JSON-LD, regras, CTA existente, mídia da casa' + (real.p.length ? ' → ' + real.p.join(' | ') : ''))
console.log(`       FAQ: ${real.items.length} perguntas avaliadas · comissão da fonte = ${real.PCT}`)

// ── mutantes ──────────────────────────────────────────────────────────────────────────────────────────────────────
const PAGE = read(F.page)
const mut = (file, from, to) => {
  const src = read(file)
  if (!src.includes(from)) return null // a âncora sumiu: o mutante não se aplica (conta como falha abaixo)
  const out = src.split(from).join(to)
  return out === src ? null : { [file]: out }
}
const mutants = [
  ['M1 h1 digita a taxa', F.page, 'Earn {AFFILIATE_COMMISSION_PCT} Recurring</h1>', 'Earn 40% Recurring</h1>'],
  ['M2 FAQ de ganho digita a taxa', F.page, 'a: `Affiliates earn ${AFFILIATE_COMMISSION_PCT} of each', 'a: `Affiliates earn 30% of each'],
  ['M3 promete acesso antecipado', F.page, "d: 'Everything Kineo makes is AI-generated.", "d: 'Everything Kineo makes is AI-generated. Partners get early access to new engines."],
  ['M4 promete cortesia renovada todo mês', F.page, 'email us and we can grant it again.', 'we renew it every month.'],
  ['M5 ignora o interruptor do pacote', F.page, "const PACK_DELIVERY = PARTNER_PACK_LIVE ? 'added the moment you join' : 'added by our team — email us after you join'", "const PACK_DELIVERY = 'added the moment you join'"],
  ['M6 JSON-LD de outra lista', F.page, 'mainEntity: faq.map((f) =>', 'mainEntity: faq.slice(1).map((f) =>'],
  ['M7 FAQ visível filtra pergunta (JSON-LD ≠ visível)', F.page, '{faq.map((f) => (', "{faq.filter((f) => f.q !== 'Who can join?').map((f) => ("],
  ['M8 cupom muda na fonte e a página fica', F.coupon, 'export const AFFILIATE_COUPON_PERCENT = 50', 'export const AFFILIATE_COUPON_PERCENT = 25'],
  ['M9 regra do selo de IA some', F.page, "{ t: 'Label it as AI', d: 'Everything Kineo makes is AI-generated. Use your platform’s AI label or say it in the caption.' },\n", ''],
  ['M10 ganho em dólar digitado', F.page, '<li>No follower minimum</li>', '<li>No follower minimum</li>\n            <li>Earn $500 a month</li>'],
  ['M11 CTA vai para backend novo', F.page, "const APPLY = '/affiliate?", "const APPLY = '/api/partners/apply?"],
  ['M12 Studio Ads perde a porta do parceiro', F.adsServer, 'await isActivePartner(userId, row.plan)', 'false'],
  ['M13 inscrição passa a pedir seguidores', F.apply, "          status: 'active',", "          status: (body as { followers?: number }).followers ? 'active' : 'pending', // min_followers"],
  ['M14 first touch cai para 30 dias', F.linkRoute, 'const COOKIE_MAX_AGE = 90 * 24 * 60 * 60', 'const COOKIE_MAX_AGE = 30 * 24 * 60 * 60'],
  ['M15 webhook perde a trava de auto-indicação', F.webhook, 'if (aff.user_id && aff.user_id === compradorUserId) {', 'if (false) {'],
  ['M16 FAQ visível ganha pergunta escrita à mão', F.page, '            {faq.map((f) => (', '            <p>Is Kineo free forever?</p>\n            {faq.map((f) => ('],
  ['M17 promete vitrine nos canais da Kineo', F.page, 'is the hook we use on our own channels.', 'is the hook we use on our own channels. The best posts get featured on our channels.'],
  ['M18 mídia digitada fora da lista', F.page, 'src={AD_EXAMPLE.preview}', 'src="/videos/random-client.mp4"'],
]
for (const [name, file, from, to] of mutants) {
  const o = mut(file, from, to)
  if (!o) { ok(false, `${name}: âncora não encontrada (mutante não aplicou)`); continue }
  const rr = run(o)
  ok(rr.p.length > 0, 'mutante vermelho: ' + name + (process.env.DEBUG ? ' → ' + rr.p.join(' | ') : ''))
}

// Mutante POSITIVO: a taxa muda NA FONTE → a página acompanha sozinha (continua verde e diz o número novo).
{
  const o = mut(F.commission, 'export const AFFILIATE_COMMISSION_RATE = 0.3', 'export const AFFILIATE_COMMISSION_RATE = 0.35')
  const r = o ? run(o) : { p: ['âncora da taxa sumiu'], items: [] }
  const earn = r.items.find((i) => i.q === 'How much do I earn?')?.a ?? ''
  ok(o && r.p.length === 0 && earn.includes('earn 35% of each eligible payment'), 'mutante verde: taxa da fonte 0.35 → a FAQ diz 35% sem tocar na página')
}
ok(PAGE.includes('KINEO-PARTNERS-CRIADORES-1610'), 'marcador KINEO-PARTNERS-CRIADORES-1610 na página')

// ── opcional: HTML servido (JSON-LD = texto visível) ──────────────────────────────────────────────────────────────
if (process.env.PARTNERS_URL) {
  const html = await (await fetch(process.env.PARTNERS_URL)).text()
  const lds = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]) } catch { return null } })
  const faqs = lds.filter((x) => x && x['@type'] === 'FAQPage')
  ok(faqs.length === 1, `HTML servido: exatamente 1 FAQPage (achei ${faqs.length})`)
  const ld = faqs[0] ?? { mainEntity: [] }
  const decode = (s) => s.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  const sec = html.match(/id="affiliate-program-faq"[\s\S]*?<\/section>/)[0]
  const vis = [...sec.matchAll(/<div style="font-weight:600[^"]*">([\s\S]*?)<\/div><p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({ q: decode(m[1]), a: decode(m[2]) }))
  const same = vis.length === ld.mainEntity.length && ld.mainEntity.every((e, i) => e.name === vis[i].q && e.acceptedAnswer.text === vis[i].a)
  ok(same, `HTML servido: JSON-LD (${ld.mainEntity.length}) = FAQ visível (${vis.length}), texto a texto`)
}

console.log(`\n${pass} ok · ${fail} falhas`)
process.exitCode = fail ? 1 : 0
