// KINEO-AGENCIAS-2026-10-13 (reancorado no merge com KINEO-AFILIADO-30-NOVOS: select e régua ganharam created_at) — guardião do PROGRAMA DE AGÊNCIAS (fundador 13/10, "tudo sim").
//
// Prova, EXECUTANDO os módulos puros pelo carregador offline da casa e lendo as rotas que não rodam fora do servidor:
//   (1) comissão: agência (affiliates.partner_type = 'agency') ganha 30% SÓ na cobrança do Business; afiliado comum segue
//       nos 20% do Business; e em TODO plano que não é Business o número é exatamente o de antes
//       (effectiveAffiliateCommissionRate) — matriz completa de taxa gravada × plano × tipo de parceiro;
//   (2) webhook: o select de sempre ('id, commission_rate, status') não mudou; o tipo é lido À PARTE e só no Business;
//       coluna ausente (42703/PGRST204) = criador; outra falha lança (a Stripe reenvia, nada é subpago calado);
//   (3) formulário: validação, armadilha de robô, site normalizado (javascript:/data: recusados), aviso ao fundador;
//   (4) números da oferta derivados das fontes (30%, US$ 84, 500, 12, 3 vagas, 15 estilos) e a página não os digita;
//   (5) migration: partner_type com padrão 'creator' + check; agency_applications com RLS, sem policy, sem privilégio
//       para anon/authenticated;
//   (6) rota: service role, teto por IP/e-mail, armadilha, aviso ao fundador, NENHUMA conta criada;
//   (7) superfícies: sitemap, llms.txt (Key pages), rodapé, /business e o botão do /admin/affiliates;
//   (8) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Nenhum import com alias @/ no guardião (readFileSync + carregador offline).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  AFF: 'lib/affiliateCommission.ts',
  PROG: 'lib/growth/agencyProgram.ts',
  WEBHOOK: 'app/api/stripe/webhook/route.ts',
  ROUTE: 'app/api/agencies/apply/route.ts',
  PAGE: 'app/agencies/page.tsx',
  FORM: 'app/agencies/AgencyApplyForm.tsx',
  MIG: 'supabase/migrations/20261013120000_agency_program.sql',
  SITEMAP: 'app/sitemap.ts',
  LLMS: 'app/llms.txt/route.ts',
  FOOTER: 'components/Footer.tsx',
  BUSINESS: 'app/business/page.tsx',
  ADMIN_ID: 'app/api/admin/affiliates/[id]/route.ts',
  ADMIN_GET: 'app/api/admin/affiliates/route.ts',
  ADMIN_PAGE: 'app/(dashboard)/admin/affiliates/page.tsx',
}

function offline(over = {}) {
  return createOfflineLoader({
    mocks: { '@/lib/stripe': { stripe: {} } },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
  })
}
const src = (over, rel) => (over[rel] !== undefined ? over[rel] : read(rel))
const codeOnly = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

function runChecks(over = {}, verbose = false) {
  const failed = []
  const check = (c, m) => { if (verbose) ok(c, m); if (!c) failed.push(m) }
  const load = offline(over)
  let A, P, B, ST
  try {
    A = load('@/' + F.AFF); P = load('@/' + F.PROG); B = load('@/lib/businessPlan.ts'); ST = load('@/lib/ads/v2Styles.ts')
  } catch (e) {
    check(false, 'carregar os módulos: ' + (e && e.message))
    return failed
  }

  // (1) comissão
  check(A.AGENCY_BUSINESS_COMMISSION_RATE === 0.3 && A.AGENCY_BUSINESS_COMMISSION_PCT === '30%', '(1) taxa de agência no Business = 0.3 (30%)')
  check(A.BUSINESS_AFFILIATE_COMMISSION_RATE === 0.2, '(1) Business comum segue 0.2')
  check(A.businessAffiliateCommissionRate('agency') === 0.3 && A.businessAffiliateCommissionRate(' Agency ') === 0.3, '(1) agência → 30% no Business')
  check([undefined, null, '', 'creator', 'agencyx', 'x', 1, {}].every((t) => A.businessAffiliateCommissionRate(t) === 0.2), '(1) criador / nulo / lixo → 20% no Business')
  check(A.affiliateCommissionRateForPlan(0.3, 'business', undefined, 'agency') === 0.3 && A.affiliateCommissionRateForPlan(0.5, 'business', undefined, 'agency') === 0.3, '(1) agência no Business = 30% (acordo maior não vale no Business)')
  check(A.affiliateCommissionRateForPlan(0.3, 'business') === 0.2 && A.affiliateCommissionRateForPlan(0.5, 'business', undefined, 'creator') === 0.2, '(1) sem tipo / criador no Business = 20% (como antes)')
  {
    let same = true
    for (const stored of [null, undefined, 0.3, 0.4, 0.5, 0.9, 'x', 2, -1, '0.45']) {
      for (const plan of ['basic', 'pro', 'studio', 'starter', 'autopilot', 'autopilot_lite', null, undefined, '']) {
        for (const t of [undefined, null, 'creator', 'agency']) {
          if (A.affiliateCommissionRateForPlan(stored, plan, undefined, t) !== A.effectiveAffiliateCommissionRate(stored)) same = false
        }
      }
    }
    check(same, '(1) matriz: fora do Business, agência e criador recebem EXATAMENTE a régua de antes (effectiveAffiliateCommissionRate)')
  }
  check(A.normalizePartnerType('agency') === 'agency' && A.normalizePartnerType(' CREATOR ') === 'creator' && A.normalizePartnerType('admin') === null && A.normalizePartnerType(1) === null, '(1) normalizePartnerType só aceita agency/creator')

  // (2) webhook
  const wh = codeOnly(src(over, F.WEBHOOK))
  check(wh.includes(".select('id, commission_rate, status, created_at')"), "(2) webhook: o select de sempre ('id, commission_rate, status') não mudou")
  check(wh.includes('const rate = effectiveAffiliateCommissionRate(aff.commission_rate, aff.created_at)'), '(2) webhook: régua dos outros planos intacta')
  check(/const partnerType = isBusinessCommissionPlan\(args\.plan\) \? await readAffiliatePartnerType\(supabase, affiliateId\) : null\n\s+const chargeRate = isBusinessCommissionPlan\(args\.plan\) \? businessAffiliateCommissionRate\(partnerType\) : rate\n\s+const commission = calculateAffiliateCommission\(args\.amountGross, chargeRate\)/.test(wh), '(2) webhook: tipo lido só no Business e a taxa do Business sai de businessAffiliateCommissionRate(partnerType)')
  const fn = wh.match(/async function readAffiliatePartnerType\([\s\S]*?\n\}/)?.[0] ?? ''
  check(/\.select\('partner_type'\)/.test(fn) && /\.eq\('id', affiliateId\)/.test(fn), '(2) readAffiliatePartnerType lê só partner_type da linha do afiliado')
  check(/if \(error\.code === '42703' \|\| error\.code === 'PGRST204'\) return null/.test(fn), '(2) coluna ausente (migration não aplicada) = criador, sem erro')
  check(/throw new AffiliateLedgerIntegrityError\('Could not read affiliate partner type'\)/.test(fn), '(2) outra falha de leitura LANÇA (Stripe reenvia; nada subpago calado)')
  check((wh.match(/readAffiliatePartnerType\(/g) || []).length === 2, '(2) o tipo é lido num único ponto (definição + 1 chamada)')

  // (3) formulário
  const good = { name: 'Ana Souza', agency: 'Pixel Co', website: 'pixelco.com/', email: 'Ana@PixelCo.com ', client_count: '6-15', note: 'Shopify\nbrands' }
  const r = P.sanitizeAgencyApplication(good)
  check(r.ok && r.value.website === 'https://pixelco.com' && r.value.email === 'ana@pixelco.com' && r.value.note === 'Shopify brands', '(3) inscrição válida: site normalizado, e-mail em minúsculas, sem quebra de linha')
  const bad = P.sanitizeAgencyApplication({ name: 'A', agency: '', website: 'javascript:alert(1)', email: 'x@', client_count: '999' })
  check(!bad.ok && ['name', 'agency', 'website', 'email', 'client_count'].every((f) => bad.invalid.includes(f)), '(3) campos inválidos recusados (inclusive javascript:)')
  check(P.normalizeAgencyWebsite('data:text/html,x') === null && P.normalizeAgencyWebsite('localhost') === null && P.normalizeAgencyWebsite('http://user:pw@x.com') === null, '(3) site: data:, sem domínio e com credencial recusados')
  check(!P.sanitizeAgencyApplication(null).ok && !P.sanitizeAgencyApplication('x').ok, '(3) corpo vazio / não-objeto recusado sem lançar')
  check(P.isAgencyHoneypotHit({ [P.AGENCY_HONEYPOT_FIELD]: 'bot' }) && !P.isAgencyHoneypotHit({ [P.AGENCY_HONEYPOT_FIELD]: '  ' }) && !P.isAgencyHoneypotHit({}), '(3) armadilha de robô')
  if (r.ok) {
    const alert = P.agencyApplicationAlert(r.value)
    check(alert.subject.includes('Pixel Co') && alert.text.includes('ana@pixelco.com') && alert.text.includes('Nenhuma conta foi criada') && alert.text.includes('30%'), '(3) aviso ao fundador traz os dados, diz que nenhuma conta foi criada e cita os 30%')
  }
  check(JSON.stringify(P.AGENCY_CLIENT_COUNT_OPTIONS) === JSON.stringify(['1-5', '6-15', '16-40', '40+']), '(3) faixas de clientes = enum da tabela')

  // (4) números derivados
  const O = P.AGENCY_OFFER
  check(O.commissionPct === '30%' && O.standardBusinessPct === '20%' && O.otherPlansPct === A.AFFILIATE_COMMISSION_PCT, '(4) taxas da oferta = fontes')
  check(O.priceLabel === B.BUSINESS_PRICE_LABEL && O.monthlyCredits === B.BUSINESS_MONTHLY_CREDITS && O.adsPerMonth === B.BUSINESS_ADS_PER_MONTH && O.seats === B.BUSINESS_TEAM_SEATS, '(4) preço/créditos/anúncios/vagas = lib/businessPlan.ts')
  check(O.priceLabel === '$84' && O.monthlyCredits === 500 && O.adsPerMonth === 12 && O.seats === 3 && O.styles === ST.ADS_V2_STYLES.length, '(4) hoje: $84 · 500 · 12 · 3 vagas · estilos da fonte')
  check(P.agencyMonthlyEarningLabel(3, 8400, 0.3) === '$75.60' && P.agencyMonthlyEarningLabel(10, 8400, 0.3) === '$252', '(4) ilustração de ganho calculada (3 → $75.60, 10 → $252)')
  check(P.AGENCY_SHOWCASE_STYLE_KEYS.every((k) => ST.ADS_V2_STYLES.some((s) => s.key === k) && fs.existsSync(path.join(ROOT, 'public/ads-styles', `${k}.mp4`)) && fs.existsSync(path.join(ROOT, 'public/ads-styles', `${k}.jpg`))), '(4) vitrine: estilos existem na fonte e as prévias reais existem em public/ads-styles')
  check(fs.existsSync(path.join(ROOT, 'public/ads-styles/presenter.mp4')), '(4) vitrine: prévia real do ator de IA existe')
  const page = codeOnly(src(over, F.PAGE))
  check(!/30%|\$84|\b500 credits|\b12 ads|\b3 seats|\b15 styles/.test(page), '(4) /agencies não digita 30% / $84 / 500 / 12 / 3 vagas / 15 estilos')
  check(page.includes('<AgencyApplyForm />') && page.includes('id="apply"') && page.includes('data-testid="agency-showcase"'), '(4) página tem formulário, âncora #apply e a vitrine')
  check(/one Kineo login can be an active teammate in one Business team at a time/.test(page), '(4) FAQ honesto: 1 login = 1 equipe ativa (ads_team_members_one_team)')
  check(/plans bought on your own account do not earn commission/.test(page), '(4) FAQ honesto: auto-indicação não paga')
  check(/Free samples are limited per day/.test(page) && /simplest level/.test(page), '(4) FAQ honesto: amostra grátis no nível mais simples e com teto diário')
  check(/After we approve your application and mark your partner account as an agency/.test(page), '(4) FAQ honesto: o 30% começa depois da marcação de agência')
  const form = src(over, F.FORM)
  check(form.includes('AGENCY_APPLY_API_PATH') && form.includes('name={AGENCY_HONEYPOT_FIELD}') && ['"name"', '"agency"', '"website"', '"email"', '"client_count"'].every((n) => form.includes(`name=${n}`)), '(4) formulário: 5 campos + armadilha, posta na rota')

  // (5) migration
  const mig = src(over, F.MIG)
  check(/add column if not exists partner_type text not null default 'creator'/.test(mig), "(5) partner_type com padrão 'creator' (nenhuma linha de hoje muda de taxa)")
  check(/check \(partner_type in \('creator', 'agency'\)\)/.test(mig), '(5) partner_type só creator/agency')
  check(/create table if not exists public\.agency_applications/.test(mig) && /client_count\s+text not null check \(client_count in \('1-5', '6-15', '16-40', '40\+'\)\)/.test(mig), '(5) tabela agency_applications com o enum de clientes')
  check(/alter table public\.agency_applications enable row level security;/.test(mig), '(5) RLS ligado')
  check(/revoke all on table public\.agency_applications from public, anon, authenticated;/.test(mig), '(5) anon/authenticated sem privilégio')
  check(!/create policy/i.test(mig), '(5) nenhuma policy (só a rota servidor escreve)')

  // (6) rota
  const route = codeOnly(src(over, F.ROUTE))
  check(route.includes('SUPABASE_SERVICE_ROLE_KEY') && route.includes('export async function POST') && !/export async function (GET|PUT|DELETE|PATCH)/.test(route), '(6) só POST, com service role')
  check(route.includes('if (isAgencyHoneypotHit(body)) return reply({ ok: true })'), '(6) armadilha: robô recebe ok e nada é gravado')
  check(route.includes('overMemoryLimit(ip)') && route.includes('>= AGENCY_APPLY_MAX_PER_IP_HOUR') && route.includes('>= AGENCY_APPLY_MAX_PER_EMAIL_DAY'), '(6) teto por IP (memória + banco) e por e-mail')
  check(route.includes("createHash('sha256')") && !/insert\(\{[^}]*\bip\b:/.test(route), '(6) IP guardado só como hash')
  check(route.includes('notifyFounder(subject, text)'), '(6) avisa o fundador (Resend via notifyFounder)')
  check(!/auth\.admin|signUp|createUser|from\('affiliates'\)|from\('profiles'\)|credit/i.test(route), '(6) NENHUMA conta, afiliado, perfil ou crédito criado pela rota')

  // (7) superfícies
  check(/\{ path: '\/agencies', priority: 0\.8, freq: 'weekly' \}/.test(src(over, F.SITEMAP)), '(7) sitemap tem /agencies')
  const llms = src(over, F.LLMS)
  const keyPages = llms.slice(llms.indexOf('## Key pages'), llms.indexOf('## Programs and free embeds'))
  check(keyPages.includes('- [Kineo for agencies](${BASE}${AGENCIES_PAGE_PATH})') && keyPages.includes('${AGENCY_OFFER.commissionPct}'), '(7) llms.txt: linha em Key pages, taxa derivada')
  check(src(over, F.FOOTER).includes("{ href: '/agencies', label: 'Agency partner program - resell Kineo' }"), '(7) rodapé global aponta para /agencies')
  const biz = src(over, F.BUSINESS)
  check(biz.includes('href={AGENCIES_PAGE_PATH}') && biz.includes('{AGENCY_BUSINESS_COMMISSION_PCT}'), '(7) /business linka /agencies com a taxa derivada')
  const adminId = src(over, F.ADMIN_ID)
  check(adminId.includes('const partnerType = normalizePartnerType(body.partner_type)') && adminId.includes('update.partner_type = partnerType'), '(7) admin grava partner_type só normalizado')
  check(src(over, F.ADMIN_GET).includes("'id, partner_type'") && src(over, F.ADMIN_GET).includes('partnerTypeReady = false'), '(7) painel lê o tipo à parte e sobrevive sem a coluna')
  check(src(over, F.ADMIN_PAGE).includes("post(a.id, { partner_type: 'agency' })"), '(7) /admin/affiliates tem o botão "Marcar agência"')
  return failed
}

console.log('— caminho real')
const realFailed = runChecks({}, true)

function mutate(rel, from, to) {
  const orig = read(rel)
  if (!orig.includes(from)) return { applied: false }
  const next = orig.split(from).join(to)
  return { applied: next !== orig, over: { [rel]: next } }
}
const MUTANTS = [
  ['agência volta a 20%', F.AFF, 'export const AGENCY_BUSINESS_COMMISSION_RATE = 0.3', 'export const AGENCY_BUSINESS_COMMISSION_RATE = 0.2', /\(1\) taxa de agência/],
  ['todo afiliado vira agência', F.AFF, "return isAgencyPartner(partnerType) ? AGENCY_BUSINESS_COMMISSION_RATE : BUSINESS_AFFILIATE_COMMISSION_RATE", 'return AGENCY_BUSINESS_COMMISSION_RATE', /\(1\) criador \/ nulo/],
  ['agência ganha 30% em todo plano', F.AFF, '  return effectiveAffiliateCommissionRate(stored, createdAt)\n}\n\n// KINEO-AGENCIAS', '  return isAgencyPartner(partnerType) ? AGENCY_BUSINESS_COMMISSION_RATE : effectiveAffiliateCommissionRate(stored, createdAt)\n}\n\n// KINEO-AGENCIAS', /\(1\) matriz/],
  ['webhook ignora o tipo', F.WEBHOOK, '? businessAffiliateCommissionRate(partnerType) : rate', '? businessAffiliateCommissionRate(null) : rate', /\(2\) webhook: tipo lido/],
  ['webhook lê o tipo em todo plano', F.WEBHOOK, 'const partnerType = isBusinessCommissionPlan(args.plan) ? await readAffiliatePartnerType(supabase, affiliateId) : null', 'const partnerType = await readAffiliatePartnerType(supabase, affiliateId)', /\(2\) webhook: tipo lido/],
  ['webhook engole erro de leitura', F.WEBHOOK, "    throw new AffiliateLedgerIntegrityError('Could not read affiliate partner type')", '    return null', /\(2\) outra falha/],
  ['select principal muda', F.WEBHOOK, ".select('id, commission_rate, status, created_at')", ".select('id, commission_rate, status, created_at, partner_type')", /\(2\) webhook: o select de sempre/],
  ['site aceita host sem domínio', F.PROG, "if (!u.hostname.includes('.') || u.username || u.password) return null", 'if (u.username || u.password) return null', /\(3\) site/],
  ['site perde a limpeza de credencial', F.PROG, "if (!u.hostname.includes('.') || u.username || u.password) return null", "if (!u.hostname.includes('.')) return null", /\(3\) site/],
  ['armadilha removida da rota', F.ROUTE, '  if (isAgencyHoneypotHit(body)) return reply({ ok: true })\n', '', /\(6\) armadilha/],
  ['teto por e-mail removido', F.ROUTE, '>= AGENCY_APPLY_MAX_PER_EMAIL_DAY', '>= 999', /\(6\) teto/],
  ['migration sem RLS', F.MIG, 'alter table public.agency_applications enable row level security;', '', /\(5\) RLS/],
  ['migration abre para anon', F.MIG, 'revoke all on table public.agency_applications from public, anon, authenticated;', 'grant insert on table public.agency_applications to anon;', /\(5\) anon/],
  ['página digita 30%', F.PAGE, '<b>{O.commissionPct}</b>', '<b>30%</b>', /\(4\) \/agencies não digita/],
  ['FAQ esconde a trava de 1 equipe', F.PAGE, 'one Kineo login can be an active teammate in one Business team at a time', 'one Kineo login can join many Business teams', /\(4\) FAQ honesto: 1 login/],
  ['sitemap sem /agencies', F.SITEMAP, "    { path: '/agencies', priority: 0.8, freq: 'weekly' },", '', /\(7\) sitemap/],
  ['admin grava tipo cru', F.ADMIN_ID, 'update.partner_type = partnerType', 'update.partner_type = body.partner_type', /\(7\) admin grava/],
]
console.log('— mutantes')
for (const [name, rel, from, to, expect] of MUTANTS) {
  const m = mutate(rel, from, to)
  ok(m.applied, `mutante aplicou: ${name}`)
  if (!m.applied) continue
  const failed = runChecks(m.over)
  ok(failed.some((f) => expect.test(f)), `mutante fica vermelho: ${name} → [${failed.slice(0, 3).join(' | ')}]`)
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 && realFailed.length === 0 ? 0 : 1)
