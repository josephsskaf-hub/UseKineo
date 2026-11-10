// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
// Guardião offline da faixa do /pricing para quem chega da prévia grátis. Prova, EXECUTANDO lib/growth/regiaoPaga1011.ts
// e LENDO os arquivos que a ligam:
//   (1) interruptor 'off' = a página de sempre (o /pricing devolve EXATAMENTE o mesmo JSX da main; a faixa nem monta);
//   (2) país COM filme grátis não muda nada (a régua é a de previaEligible: só 'region_paid_only'/'on_request' sem pagar);
//   (3) nenhum fornecedor, nenhum débito, nenhum preço novo antes da parede (a rota só lê o banco e redireciona ao checkout
//       de sempre; preço e créditos vêm de lib/marketingPrice, nunca digitados);
//   (4) os eventos de medição novos são de servidor e estão na lista que o navegador não pode cunhar;
//   (5) mutantes: cada regra quebrada derruba pelo menos uma verificação.
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
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const LIB_SRC = read('lib/growth/regiaoPaga1011.ts')
const ROUTE = read('app/api/scene-preview/pricing-strip/route.ts')
const STRIP = read('components/PreviewPricingStrip.tsx')
const PAGE = read('app/pricing/page.tsx')
const EVENTS = read('app/api/events/route.ts')
const P = load(read('lib/scenePreview.ts'))
const F = load(read('lib/freeFilmPolicy.ts').replace(/^import .*$/m, 'const FREE_FILM_ENGINE_NAME = "x"'))
const SB = 'https://cqqukkvjjrguayiyjvhh.supabase.co'
const IMG = `${SB}/storage/v1/object/public/renders/images/u/a.jpg`

// A suíte inteira roda contra uma fonte; os mutantes a rodam de novo contra a fonte alterada e esperam ao menos 1 falha.
function suite(libSrc, route = ROUTE, page = PAGE, events = EVENTS, strip = STRIP) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  let L
  try { L = load(libSrc) } catch (e) { t(false, 'lib carrega: ' + e.message); return out }

  // (1) interruptor
  t(L.REGIAO_PAGA_1011_RELEASE === 'internal', "nasce 'internal'")
  t(L.regiaoPagaStripMount('scene_preview', 'off') === false, "'off' = a faixa não monta")
  t(L.regiaoPagaStripMount(['scene_preview'], 'off') === false, "'off' = não monta nem com from em lista")
  t(L.regiaoPagaStripMount('scene_preview', 'internal') === true && L.regiaoPagaStripMount('scene_preview', 'public') === true, 'ligado + from=scene_preview = monta')
  t(L.regiaoPagaStripMount(undefined, 'public') === false && L.regiaoPagaStripMount('menu', 'public') === false && L.regiaoPagaStripMount('', 'public') === false, 'outro from = a página de sempre')
  const ret = "return <PricingClient key={handoff.key} initialBilling={handoff.initialBilling} characterLimits={characterLimits} />"
  t(page.split(ret).length === 2, 'o retorno de sempre do /pricing segue intacto, uma vez')
  t(/if \(regiaoPagaStripMount\(searchParams\.from\)\) return <><PreviewPricingStrip \/><PricingClient key=\{handoff\.key\} initialBilling=\{handoff\.initialBilling\} characterLimits=\{characterLimits\} \/><\/>/.test(page), 'ligado: só ACRESCENTA a faixa antes do mesmo PricingClient')
  t((page.match(/<PreviewPricingStrip \/>/g) || []).length === 1, 'a faixa aparece num único ponto do /pricing')
  t(/releaseVisible\(user\.email, REGIAO_PAGA_1011_RELEASE\)/.test(route), "a rota aplica a allowlist exata da casa (releaseVisible) com o interruptor próprio")
  t(route.indexOf('releaseVisible(') < route.indexOf('writeServerEvent('), 'a allowlist é conferida antes de qualquer evento')

  // (2) país com filme grátis não muda nada
  const rico = { trial_status: 'active', has_paid: false, plan: 'free', video_credits: 9 }
  const pago = { trial_status: 'region_paid_only', has_paid: true, plan: 'starter' }
  const regiao = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 }
  t(P.previaEligible(rico) === false && P.previaEligible(pago) === false && P.previaEligible(regiao) === true, 'régua da prévia: país rico e pagante fora, região dentro')
  t(F.regionPaidOnlyNoticeVisible(rico) === false && F.regionPaidOnlyNoticeVisible(regiao) === true, 'mesma régua do aviso de região')
  t(/const eligible = previaEligible\(profile as PreviaProfile \| null\)\s*\n\s*if \(!eligible\) return HIDE\(\)/.test(route), 'conta não elegível (país com filme grátis, pagante) = show:false')
  const sc = L.regiaoPagaScenes([{ label: 'HOOK', text: 'x', image: IMG }], SB)
  t(L.regiaoPagaShow({ visible: true, eligible: false, scenes: sc }) === false, 'não elegível nunca vê')
  t(L.regiaoPagaShow({ visible: false, eligible: true, scenes: sc }) === false, 'fora da allowlist nunca vê')
  t(L.regiaoPagaShow({ visible: true, eligible: true, scenes: [] }) === false, 'sem prévia mostrada nunca vê')
  t(L.regiaoPagaShow({ visible: true, eligible: true, scenes: sc }) === true, 'elegível + allowlist + prévia = vê')
  t(L.regiaoPagaScenes([{ image: 'https://evil.example/x.jpg' }, { image: 'javascript:alert(1)' }], SB).length === 0, 'só imagem do NOSSO bucket')
  t(L.regiaoPagaScenes(Array.from({ length: 9 }, () => ({ image: IMG })), SB).length === 4, 'no máximo 4 cenas')
  t(L.regiaoPagaScenes('lixo', SB).length === 0 && L.regiaoPagaScenes([{ image: IMG }], null).length === 0, 'metadata estranha não quebra')

  // (3) nada pago antes da parede; preço da tabela
  t(!/@fal-ai|\bfal\.|openai|generate-script|submitToFal|persistImage|moderateContent/i.test(route.replace(/^\/\/.*$/gm, '')), 'a rota não chama fornecedor nenhum')
  t(!/\.(insert|update|upsert|delete|rpc)\(/.test(route), 'a rota não escreve no banco (só writeServerEvent)')
  t(!/video_credits\s*[-+]|debit|charge/i.test(route.replace(/^\/\/.*$/gm, '').replace(/select\('[^']*'\)/g, '')), 'nenhum débito')
  t(/STARTER_MO/.test(route) && /STARTER_CREDITS/.test(route) && /SEEDANCE_SHORT_FILM_CREDITS/.test(route) && /from '@\/lib\/marketingPrice'/.test(route), 'preço e créditos vêm de lib/marketingPrice (TIER_PRICES/TIER_CREDITS)')
  t(!/\$\s?\d/.test(libSrc.replace(/^\/\/.*$/gm, '')) && !/\$\s?\d/.test(strip), 'nenhum preço digitado na faixa nem nos textos')
  t(L.REGIAO_PAGA_CHECKOUT_HREF === '/api/stripe/checkout?tier=starter&intent_campaign=region_preview_pricing_v1', 'checkout de sempre do Starter mensal, sem intro/desconto/promo')
  t(!/intro=|promo|coupon|discount|offer=/i.test(L.REGIAO_PAGA_CHECKOUT_HREF), 'nenhum desconto no link')
  t(L.regiaoPagaFilms(40, 9) === 4 && L.regiaoPagaFilms(40, 0) === 0 && L.regiaoPagaFilms(8, 9) === 0, 'filmes por mês = piso, nunca arredonda para cima')
  for (const lang of ['en', 'pt', 'es']) {
    const c = L.REGIAO_PAGA_COPY[lang]
    t(c && c.cta.includes('{price}') && c.body.includes('{films}') && c.body.includes('{price}'), `copy ${lang}: preço e filmes vêm por parâmetro`)
    t(!/unlimited|ilimitad|seedance|kling|veo|minimax|left today|hours|horas|expires|expira/i.test(JSON.stringify(c)), `copy ${lang}: sem ilimitado, relógio ou nome de motor`)
  }
  t(L.regiaoPagaFill('a {price} b {films}', { price: 'P', films: 4 }) === 'a P b 4', 'preenchimento dos textos')
  t(!/fetch\([^)]*method:\s*'POST'/.test(strip) && /fetch\(REGIAO_PAGA_STRIP_API/.test(strip), 'a faixa só lê (GET) a rota')
  t(/if \(!data\) return null/.test(strip), 'sem "show" do servidor a faixa não desenha nada')

  // (4) eventos de medição
  t(L.REGIAO_PAGA_EVENTS.shown === 'region_preview_pricing_shown' && L.REGIAO_PAGA_EVENTS.clicked === 'region_preview_pricing_clicked', 'nomes dos eventos')
  const set = events.slice(events.indexOf('const SERVER_ONLY_EVENTS'), events.indexOf('\n])', events.indexOf('const SERVER_ONLY_EVENTS')))
  t(set.includes("'region_preview_pricing_shown'") && set.includes("'region_preview_pricing_clicked'"), 'os dois eventos são SÓ de servidor (o navegador não cunha)')
  t(/name: REGIAO_PAGA_EVENTS\.shown/.test(route) && /name: REGIAO_PAGA_EVENTS\.clicked/.test(route), 'a rota grava shown e clicked com user_id')
  t(route.indexOf('REGIAO_PAGA_EVENTS.clicked') < route.indexOf('NextResponse.redirect(new URL(REGIAO_PAGA_CHECKOUT_HREF'), 'o clique é gravado antes do redirecionamento')
  t(/regiaoPagaShow\(\{ visible, eligible, scenes \}\)\) return HIDE\(\)[\s\S]*REGIAO_PAGA_EVENTS\.shown/.test(route), 'shown só é gravado quando a faixa aparece de verdade')
  t(/href=\{data\.go\}/.test(strip), 'o botão passa pela rota que grava o clique')
  return out
}

console.log('suíte contra a fonte real')
for (const [c, m] of suite(LIB_SRC)) ok(c, m)

console.log('mutantes (cada um precisa derrubar ≥1 verificação)')
const MUT = [
  ['nasce público', (s) => s.replace("REGIAO_PAGA_1011_RELEASE: RegiaoPagaRelease = 'internal'", "REGIAO_PAGA_1011_RELEASE: RegiaoPagaRelease = 'public'")],
  ["'off' ignorado", (s) => s.replace("if (release === 'off') return false", '')],
  ['qualquer from monta', (s) => s.replace('return f === REGIAO_PAGA_FROM', 'return true')],
  ['mostra sem elegibilidade', (s) => s.replace('args.eligible === true && ', '')],
  ['mostra sem allowlist', (s) => s.replace('args.visible === true && ', '')],
  ['imagem de qualquer host', (s) => s.replace('|| !x.image.startsWith(base)', '')],
  ['filmes arredondam para cima', (s) => s.replace('Math.floor(planCredits / filmCredits)', 'Math.ceil(planCredits / filmCredits)')],
  ['checkout com intro', (s) => s.replace('tier=starter&intent', 'tier=starter&intro=1&intent')],
  ['nome de motor no botão', (s) => s.replace("cta: 'Make my film with Starter — {price}'", "cta: 'Make my Seedance film — {price}'")],
  ['preço digitado', (s) => s.replace("cta: 'Make my film with Starter — {price}'", "cta: 'Make my film with Starter — $9/mo'")],
]
for (const [nome, f] of MUT) {
  const src = f(LIB_SRC)
  if (src === LIB_SRC) { ok(false, `mutante "${nome}" não aplicou`); continue }
  const r = suite(src)
  ok(r.some(([c]) => !c), `mutante "${nome}" é pego`)
}
const MUT_FILES = [
  ['rota sem allowlist', { route: ROUTE.replace('releaseVisible(user.email, REGIAO_PAGA_1011_RELEASE)', 'true') }],
  ['rota sem elegibilidade', { route: ROUTE.replace('if (!eligible) return HIDE()', '') }],
  ['rota chama fornecedor', { route: ROUTE.replace("import { writeServerEvent }", "import { fal } from '@fal-ai/client'\nimport { writeServerEvent }") }],
  ['rota debita', { route: ROUTE.replace('const films =', "await db.from('profiles').update({ video_credits: 0 }).eq('id', user.id)\n  const films =") }],
  ['página troca o retorno de sempre', { page: PAGE.replace('return <PricingClient key={handoff.key} initialBilling={handoff.initialBilling} characterLimits={characterLimits} />\n', 'return <><PreviewPricingStrip /><PricingClient key={handoff.key} initialBilling={handoff.initialBilling} characterLimits={characterLimits} /></>\n') }],
  ['evento cunhável pelo navegador', { events: EVENTS.replace("  'region_preview_pricing_clicked',\n", '') }],
  ['clique gravado depois do redirect', { route: ROUTE.replace(/await writeServerEvent\(\{ name: REGIAO_PAGA_EVENTS\.clicked[^\n]*\n/, '').replace("return NextResponse.redirect(new URL(REGIAO_PAGA_CHECKOUT_HREF, req.url), 303)", "return NextResponse.redirect(new URL(REGIAO_PAGA_CHECKOUT_HREF, req.url), 303)\n    await writeServerEvent({ name: REGIAO_PAGA_EVENTS.clicked, userId: user.id })") }],
  ['faixa desenha sem servidor', { strip: STRIP.replace('if (!data) return null', 'if (!data) return <div />') }],
]
for (const [nome, o] of MUT_FILES) {
  const r = suite(LIB_SRC, o.route ?? ROUTE, o.page ?? PAGE, o.events ?? EVENTS, o.strip ?? STRIP)
  const changed = (o.route && o.route !== ROUTE) || (o.page && o.page !== PAGE) || (o.events && o.events !== EVENTS) || (o.strip && o.strip !== STRIP)
  ok(changed && r.some(([c]) => !c), `mutante "${nome}" é pego`)
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
