// KINEO-REGIAO-PAGA-1011 [fundador 10/11: "3 ações para a gente conseguir vender mais… ações sem dinheiro"]
// Guardião offline das 3 mudanças para quem nasceu fora do filme grátis. Prova, EXECUTANDO lib/growth/regiaoPaga1011.ts
// e LENDO os arquivos que a ligam:
//   (1) interruptor 'off' = a main: o /pricing devolve o MESMO JSX, o aviso não troca nada, a prévia não monta a faixa;
//   (2) país COM filme grátis não muda nada (a régua de previaEligible / regionPaidOnlyNoticeVisible, intocadas);
//   (3) conta de fora NUNCA cai no caminho de conferência da casa, em nenhum valor do interruptor;
//   (4) tetos da prévia (3 por conta, 1 por dia, 200 por dia) e a rota da prévia intactos (iguais à origin/main);
//   (5) nenhum fornecedor, débito ou preço novo antes da parede (a faixa só lê o banco; preço e créditos da tabela);
//   (6) eventos de medição de servidor, fora do alcance do navegador; o aviso invertido marca os seus eventos;
//   (7) mutantes: cada regra quebrada derruba pelo menos uma verificação.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const norm = (s) => s.replace(/\r\n/g, '\n')
const read = (rel) => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const main = (rel) => { try { return norm(execSync(`git show origin/main:${rel}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const SRC = {
  lib: read('lib/growth/regiaoPaga1011.ts'),
  route: read('app/api/scene-preview/pricing-strip/route.ts'),
  strip: read('components/PreviewPricingStrip.tsx'),
  page: read('app/pricing/page.tsx'),
  events: read('app/api/events/route.ts'),
  banner: read('components/RegionPaidOnlyBanner.tsx'),
  layout: read('app/(dashboard)/layout.tsx'),
  previa: read('app/(dashboard)/studio/previa/ScenePreviewClient.tsx'),
}
const P = load(read('lib/scenePreview.ts'))
const F = load(read('lib/freeFilmPolicy.ts').replace(/^import .*$/m, 'const FREE_FILM_ENGINE_NAME = "x"'))
const SB = 'https://cqqukkvjjrguayiyjvhh.supabase.co'
const IMG = `${SB}/storage/v1/object/public/renders/images/u/a.jpg`
const strip = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

console.log('0 — o que NÃO pode mudar (igual à origin/main)')
for (const rel of ['lib/scenePreview.ts', 'app/api/scene-preview/route.ts', 'lib/freeFilmPolicy.ts', 'lib/credits/engineCost.ts', 'lib/enginePlanGate.ts', 'lib/recreate/access.ts']) {
  const m = main(rel)
  // KINEO-RECARGA-ASSINANTE-1111 — preço e checkout ganham SKUs novos (recarga do assinante): nesses dois a regra é "só
  // acréscimos" (toda linha da main continua lá, na mesma ordem); os outros seguem idênticos à main.
  // reancorado KINEO-RECREATE-MOVIMENTO-1411 — lib/recreate/access.ts ganhou a linha do molde de movimento (antes da regra do efeito): aqui a regra é
  // "só acréscimos" (toda linha da main continua lá, na mesma ordem), como no preço; a visibilidade do Recreate é guardada por
  // scripts/test-recreate-movimento-1411.mjs e scripts/test-recreate-trava-1011.mjs.
  if (rel === 'lib/checkoutPricing.ts' || rel === 'app/api/stripe/checkout/route.ts' || rel === 'lib/recreate/access.ts') {
    const cur = read(rel).split('\n')
    let k = 0
    const soAcrescimos = m !== null && m.split('\n').every((line) => { while (k < cur.length && cur[k] !== line) k++; if (k >= cur.length) return false; k++; return true })
    ok(soAcrescimos, `${rel}: só acréscimos em relação à main`)
    continue
  }
  ok(m !== null && m === read(rel), `${rel} idêntico à main`)
}
// KINEO-REGIAO-FILME-199-1011 — lib/checkoutPricing.ts (SKU do filme de US$ 1,99 + invariante 9) e a rota de checkout (o ramo
// ?pack=region_film_199) ganharam linhas NOVAS legítimas; o guardião delas é scripts/test-regiao-filme-199-1011.mjs. Aqui
// continua provado o que esta entrega exige: nenhuma linha da main saiu nem mudou (só acréscimos, na mesma ordem).
const soAcrescimos = (base, cur) => { const b = base.split('\n'), c = cur.split('\n'); let i = 0; for (const l of c) if (i < b.length && l === b[i]) i++; return i === b.length }
for (const rel of ['lib/checkoutPricing.ts', 'app/api/stripe/checkout/route.ts']) {
  const m = main(rel)
  ok(m !== null && soAcrescimos(m, read(rel)), `${rel}: só acréscimos sobre a main (nenhuma linha de preço/checkout mudou)`)
}
ok(P.PREVIA_PER_ACCOUNT_TOTAL === 3 && P.PREVIA_PER_ACCOUNT_PER_DAY === 1 && P.PREVIA_GLOBAL_PER_DAY === 200, 'tetos da prévia: 3 por conta, 1 por dia, 200 por dia')
ok(main('app/pricing/PricingClient.tsx') === read('app/pricing/PricingClient.tsx'), 'a tabela de preços (PricingClient) idêntica à main')

const HOUSE = [true, false]
const RELEASES = ['off', 'internal', 'public']

function suite(s) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  let L
  try { L = load(s.lib) } catch (e) { t(false, 'lib carrega: ' + e.message); return out }

  // (1) interruptor
  t(L.REGIAO_PAGA_1011_RELEASE === 'public', "aberto em 10/11 (KINEO-REGIAO-PAGA-ABRE-1011)")
  t(L.regiaoPagaStripMount('scene_preview', 'off') === false && L.regiaoPagaStripMount(['scene_preview'], 'off') === false, "'off' = a faixa não monta no /pricing")
  t(L.regiaoPagaStripMount('scene_preview', 'internal') === true && L.regiaoPagaStripMount('scene_preview', 'public') === true, 'ligado + from=scene_preview = monta')
  t(L.regiaoPagaStripMount(undefined, 'public') === false && L.regiaoPagaStripMount('menu', 'public') === false, 'outro from = a página de sempre')
  const ret = 'return <PricingClient key={handoff.key} initialBilling={handoff.initialBilling} characterLimits={characterLimits} />'
  t(s.page.split(ret).length === 2, 'o retorno de sempre do /pricing segue intacto, uma vez')
  t(/if \(regiaoPagaStripMount\(searchParams\.from\)\) return <><PreviewPricingStrip \/><PricingClient key=\{handoff\.key\} initialBilling=\{handoff\.initialBilling\} characterLimits=\{characterLimits\} \/><\/>/.test(s.page), 'ligado: só ACRESCENTA a faixa antes do mesmo PricingClient')
  t((s.page.match(/<PreviewPricingStrip \/>/g) || []).length === 1, 'a faixa aparece num único ponto do /pricing')
  t(L.regiaoPagaSwitchOpen('off', true) === false && L.regiaoPagaSwitchOpen('off', false) === false, "'off' = o aviso não inverte nem para a casa")
  t(L.regiaoPagaSwitchOpen('internal', true) === true && L.regiaoPagaSwitchOpen('internal', false) === false && L.regiaoPagaSwitchOpen('public', false) === true, "'internal' = só a casa; 'public' = todos")
  t(/REGIAO_PAGA_1011_RELEASE !== 'off' \? <PreviewPricingStrip surface="preview_limit" \/> : null/.test(s.previa), "a prévia só monta a faixa com o interruptor não-'off' (desligado nem pergunta ao servidor)")
  t(/!aPedido && !preview && \(limite \|\| left === 0\) && REGIAO_PAGA_1011_RELEASE !== 'off'/.test(s.previa), 'a faixa da prévia só aparece na recusa por limite, sem prévia na tela, fora do teste "a pedido"')
  t(/if \(!user \|\| REGIAO_PAGA_1011_RELEASE === 'off'\) return go \? back\(\) : HIDE\(\)/.test(s.route), "rota: 'off' esconde para todos, antes de ler qualquer coisa")

  // (2) país com filme grátis
  const rico = { trial_status: 'active', has_paid: false, plan: 'free', video_credits: 9 }
  const pago = { trial_status: 'region_paid_only', has_paid: true, plan: 'starter' }
  const regiao = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0 }
  t(P.previaEligible(rico) === false && P.previaEligible(pago) === false && P.previaEligible(regiao) === true, 'régua da prévia: país rico e pagante fora, região dentro')
  t(F.regionPaidOnlyNoticeVisible(rico) === false && F.regionPaidOnlyNoticeVisible(regiao) === true, 'régua do aviso: país rico nunca vê o aviso (logo, nunca o invertido)')
  for (const r of RELEASES) t(L.regiaoPagaMode({ release: r, house: false, eligible: false, previaPublic: true }) === 'hide', `país com filme grátis (fora da casa) não vê nada com '${r}'`)
  t(s.layout === main('app/(dashboard)/layout.tsx'), 'layout idêntico à main: o aviso continua montado pela MESMA régua (regionPaidOnlyNoticeVisible)')
  t(L.REGIAO_PAGA_BANNER_PREVIEW_FIRST === (L.REGIAO_PAGA_1011_RELEASE === 'public'), "aviso invertido só com 'public' (a casa não é conta de região)")
  t(s.lib.includes('regiaoPagaSwitchOpen(REGIAO_PAGA_1011_RELEASE, false)'), "aviso invertido nunca abre pela casa (com 'internal' ninguém vê) — KINEO-REGIAO-PAGA-ABRE-1011")
  t(s.banner.includes('return <RegionPaidOnlyStrip freeClip={gift} previewFirst={REGIAO_PAGA_BANNER_PREVIEW_FIRST} />') && s.banner.split('previewFirst={').length === 2, 'só a faixa dos planos de sempre recebe a inversão')

  // (3) caminho de conferência da casa
  for (const r of RELEASES) for (const e of [true, false]) for (const pp of [true, false]) {
    t(L.regiaoPagaMode({ release: r, house: false, eligible: e, previaPublic: pp }) !== 'qa', `conta de fora nunca é 'qa' (${r}, elegível=${e}, prévia=${pp})`)
  }
  t(L.regiaoPagaMode({ release: 'off', house: true, eligible: false, previaPublic: true }) === 'hide', "'off' tira a conferência também")
  t(L.regiaoPagaMode({ release: 'internal', house: true, eligible: false, previaPublic: true }) === 'qa' && L.regiaoPagaMode({ release: 'public', house: true, eligible: false, previaPublic: true }) === 'qa', 'casa não-região = conferência')
  t(L.regiaoPagaMode({ release: 'public', house: false, eligible: true, previaPublic: true }) === 'real' && L.regiaoPagaMode({ release: 'internal', house: false, eligible: true, previaPublic: true }) === 'hide', "cliente de região: 'real' só com 'public'")
  t(/const house = releaseVisible\(user\.email, 'internal'\)/.test(s.route) && !/releaseVisible\(user\.email, REGIAO_PAGA_1011_RELEASE\)/.test(s.route), "rota: a casa = allowlist EXATA com 'internal', nunca com o valor do interruptor")
  t(/const mode = regiaoPagaMode\(\{ release: REGIAO_PAGA_1011_RELEASE, house, eligible, previaPublic: PREVIA_CENAS_PUBLIC \}\)\s*\n\s*if \(mode === 'hide'\) return go \? back\(\) : HIDE\(\)/.test(s.route), 'rota: decide pelo regiaoPagaMode e esconde o resto antes de qualquer evento')
  t(/const sample = qa && own\.length === 0/.test(s.route), 'a amostra só existe no modo de conferência')
  t(/QA sample/.test(L.REGIAO_PAGA_QA_SAMPLE.idea) && L.REGIAO_PAGA_QA_SAMPLE.scenes.every((x) => /^\/posters\/[0-9a-f-]+\.jpg$/.test(x.image)), 'amostra marcada "QA sample", com pôsteres públicos da casa')
  t(L.REGIAO_PAGA_QA_SAMPLE.scenes.every((x) => fs.existsSync(path.join(ROOT, 'public', x.image))), 'os pôsteres da amostra existem em public/')
  t(/data\.qa \? <div[^>]*>\{copy\.qa\}<\/div> : null/.test(s.strip) && /only the Kineo team sees this/.test(L.REGIAO_PAGA_COPY.en.qa), 'a faixa de conferência vem marcada na tela')
  t(/qa, sample \}/.test(s.route) && /surface, qa \}/.test(s.route), 'eventos da conferência marcados qa (o placar separa)')
  t(/if \(data\.qa \|\| !data\.script\.trim\(\)\) return/.test(s.strip), 'a conferência nunca grava retomada no navegador')

  // (5) nada pago antes da parede; preço da tabela
  const r = strip(s.route)
  t(!/@fal-ai|\bfal\.|openai|generate-script|submitToFal|persistImage|moderateContent/i.test(r), 'a rota não chama fornecedor nenhum')
  t(!/\.(insert|update|upsert|delete|rpc)\(/.test(s.route), 'a rota não escreve no banco (só writeServerEvent)')
  t(!/video_credits\s*[-+]|debit|charge/i.test(r.replace(/select\('[^']*'\)/g, '')), 'nenhum débito')
  t(/from '@\/lib\/marketingPrice'/.test(s.route) && /regiaoPagaFilms\(STARTER_CREDITS, SEEDANCE_SHORT_FILM_CREDITS\)/.test(s.route) && /price: STARTER_MO/.test(s.route), 'preço e créditos vêm de lib/marketingPrice (TIER_PRICES/TIER_CREDITS/creditCostForDuration)')
  t(!/\$\s?\d/.test(strip(s.lib)) && !/\$\s?\d/.test(s.strip), 'nenhum preço digitado na faixa nem nos textos')
  t(L.REGIAO_PAGA_CHECKOUT_HREF === '/api/stripe/checkout?tier=starter&intent_campaign=region_preview_pricing_v1', 'checkout de sempre do Starter mensal, sem intro/desconto/promo')
  t(L.regiaoPagaFilms(40, 9) === 4 && L.regiaoPagaFilms(40, 0) === 0 && L.regiaoPagaFilms(8, 9) === 0, 'filmes por mês = piso, nunca arredonda para cima')
  for (const lang of ['en', 'pt', 'es']) {
    const c = L.REGIAO_PAGA_COPY[lang]
    t(c && c.cta.includes('{price}') && c.body.includes('{films}') && c.body.includes('{price}'), `faixa ${lang}: preço e filmes vêm por parâmetro`)
    t(!/unlimited|ilimitad|seedance|kling|veo|minimax|left today|hours|horas|expires|expira/i.test(JSON.stringify(c)), `faixa ${lang}: sem ilimitado, relógio ou nome de motor`)
    t(!/makes this|faz este|hace esta/i.test(c.body), `faixa ${lang}: não promete que "faz ESTE filme" (a rota pode recusar roteiro longo)`)
    const b = L.REGIAO_PAGA_BANNER_COPY[lang]
    t(b && /country|país/i.test(b.body), `aviso ${lang}: o "não disponível no seu país" continua escrito`)
    t(!/video|vídeo|voice|voz|narra|film is free|filme é grátis|película es gratis/i.test(b.title + ' ' + b.body), `aviso ${lang}: não promete vídeo nem voz grátis`)
    t(!/unlimited|ilimitad|seedance|kling|veo|minimax/i.test(JSON.stringify(b)), `aviso ${lang}: sem ilimitado nem nome de motor`)
  }
  t(L.REGIAO_PAGA_BANNER_COPY.en.body.startsWith(P.PREVIA_COPY.en.sub.split(' When')[0]), 'aviso en: o subtítulo usa as palavras da própria tela da prévia')
  t(L.REGIAO_PAGA_BANNER_COPY.pt.body.startsWith(P.PREVIA_COPY.pt.sub.split(' Gostou')[0]) && L.REGIAO_PAGA_BANNER_COPY.es.body.startsWith(P.PREVIA_COPY.es.sub.split(' ¿Te')[0]), 'aviso pt/es: idem')
  t(L.regiaoPagaScenes([{ image: 'https://evil.example/x.jpg' }, { image: 'javascript:alert(1)' }], SB).length === 0, 'cena da prévia: só imagem do NOSSO bucket')
  t(L.regiaoPagaScenes(Array.from({ length: 9 }, () => ({ image: IMG })), SB).length === 4 && L.regiaoPagaScenes('lixo', SB).length === 0, 'no máximo 4 cenas; metadata estranha não quebra')
  t(L.regiaoPagaFill('a {price} b {films}', { price: 'P', films: 4 }) === 'a P b 4', 'preenchimento dos textos')
  t(!/method:\s*'POST'/.test(s.strip) && /fetch\(`\$\{REGIAO_PAGA_STRIP_API\}\?surface=\$\{surface\}`/.test(s.strip), 'a faixa só lê (GET) a rota')
  t(/if \(!data\) return null/.test(s.strip), 'sem "show" do servidor a faixa não desenha nada')

  // aviso invertido
  t(/const pf = previewFirst && !freeClip && !filmLive && PREVIA_CENAS_PUBLIC/.test(s.banner), 'aviso: só inverte a faixa dos planos sem clipe/filme grátis e com a prévia ligada')
  t(s.banner.includes('  const head = pf ? pickInterfaceCopy(REGIAO_PAGA_BANNER_COPY, language) : copy\n') && s.banner.includes('{head.title}</div>') && s.banner.includes('{head.body}</div>') && s.banner.includes('  const copy = filmLive ? pickInterfaceCopy(freeClip ? REGION_FREE_CLIP_NOTICE_FILM_LIVE : REGION_PLANS_NOTICE_FILM_LIVE, language) : copyHoje\n'), 'aviso: textos pelo mesmo pickInterfaceCopy; desligado = os de sempre (a linha do texto de sempre intacta)')
  t(/const pfMeta = pf \? \{ banner: REGIAO_PAGA_BANNER_VARIANT \} : \{\}/.test(s.banner), 'aviso de sempre não ganha campo nenhum nos eventos')
  t(/'region_paid_only_preview_clicked', \{ version: REGION_PAID_ONLY_BANNER_VERSION, language, \.\.\.pfMeta \}/.test(s.banner) && /variant: freeClip \? 'free_clip' : 'plans', \.\.\.pfMeta \}/.test(s.banner), 'medição: o clique na prévia e a exibição do aviso invertido vêm marcados preview_first')
  t(/style=\{pf \? \{ background: '#2997ff'/.test(s.banner) && /style=\{freeClip \|\| pf\n/.test(s.banner), 'aviso invertido: prévia = botão principal; "See plans" = secundário')
  t(/return <RegionPaidOnlyStrip freeClip=\{gift\} filmLive \/>/.test(s.banner), 'só a faixa de sempre (sem filme grátis ligado) recebe previewFirst')

  // (6) eventos
  t(L.REGIAO_PAGA_EVENTS.shown === 'region_preview_pricing_shown' && L.REGIAO_PAGA_EVENTS.clicked === 'region_preview_pricing_clicked', 'nomes dos eventos')
  const i0 = s.events.indexOf('const SERVER_ONLY_EVENTS')
  const set = s.events.slice(i0, s.events.indexOf('\n])', i0))
  t(set.includes("'region_preview_pricing_shown'") && set.includes("'region_preview_pricing_clicked'"), 'os dois eventos são SÓ de servidor (o navegador não cunha)')
  t(s.route.indexOf('REGIAO_PAGA_EVENTS.clicked') > 0 && s.route.indexOf('REGIAO_PAGA_EVENTS.clicked') < s.route.indexOf('NextResponse.redirect(new URL(REGIAO_PAGA_CHECKOUT_HREF'), 'o clique é gravado antes do redirecionamento')
  t(s.route.indexOf("if (mode === 'hide')") < s.route.indexOf('writeServerEvent('), 'nenhum evento antes da decisão de quem vê')
  t(s.route.indexOf('if (scenes.length === 0) return HIDE()') < s.route.indexOf('REGIAO_PAGA_EVENTS.shown'), 'shown só é gravado quando a faixa aparece de verdade')
  t(/href=\{data\.go\}/.test(s.strip), 'o botão passa pela rota que grava o clique')
  t(L.regiaoPagaSurface('preview_limit') === 'preview_limit' && L.regiaoPagaSurface('x') === 'pricing' && L.regiaoPagaSurface(undefined) === 'pricing', 'superfície sanitizada')
  return out
}

console.log('suíte contra a fonte real')
for (const [c, m] of suite(SRC)) ok(c, m)

console.log('mutantes (cada um precisa derrubar ≥1 verificação)')
const M = (file, a, b) => ({ file, a, b })
const MUT = [
  ['fecha sem querer', M('lib', "REGIAO_PAGA_1011_RELEASE: RegiaoPagaRelease = 'public'", "REGIAO_PAGA_1011_RELEASE: RegiaoPagaRelease = 'off'")],
  ["'off' ignorado no /pricing", M('lib', "if (release === 'off') return false", '')],
  ['qualquer from monta', M('lib', 'return f === REGIAO_PAGA_FROM', 'return true')],
  ['cliente vira casa no public', M('lib', 'if (a.house === true) return \'qa\'', "if (a.house === true || a.release === 'public') return 'qa'")],
  ['conferência sem casa', M('lib', "if (a.house === true) return 'qa'", "return 'qa'")],
  ["'off' não tira a conferência", M('lib', "if (a.release === 'off') return 'hide'", '')],
  ['real sem elegibilidade', M('lib', "a.eligible === true && regiaoPagaSwitchOpen", 'regiaoPagaSwitchOpen')],
  ['switch internal abre para todos', M('lib', "(release === 'internal' && house === true)", "release === 'internal'")],
  ['imagem de qualquer host', M('lib', '|| !x.image.startsWith(base)', '')],
  ['filmes arredondam para cima', M('lib', 'Math.floor(planCredits / filmCredits)', 'Math.ceil(planCredits / filmCredits)')],
  ['checkout com intro', M('lib', 'tier=starter&intent', 'tier=starter&intro=1&intent')],
  ['nome de motor no botão', M('lib', "cta: 'Make my film with Starter — {price}'", "cta: 'Make my Seedance film — {price}'")],
  ['promete este filme', M('lib', "body: 'Starter ({price}) has credits for", "body: 'Starter ({price}) makes this film and has credits for")],
  ['aviso esconde o país', M('lib', ' The free film is not available in your country yet; plans work normally.', '')],
  ['aviso promete vídeo', M('lib', "title: 'Write your idea — see your film’s script and scenes free'", "title: 'Write your idea — get your video free'")],
  ['amostra sem marca', M('lib', "idea: 'QA sample — not a customer preview'", "idea: 'Your idea'")],
  ['rota: casa pelo interruptor', M('route', "const house = releaseVisible(user.email, 'internal')", 'const house = releaseVisible(user.email, REGIAO_PAGA_1011_RELEASE)')],
  ['rota: off ignorado', M('route', "if (!user || REGIAO_PAGA_1011_RELEASE === 'off') return go ? back() : HIDE()", 'if (!user) return go ? back() : HIDE()')],
  ['rota: amostra para todos', M('route', 'const sample = qa && own.length === 0', 'const sample = own.length === 0')],
  ['rota chama fornecedor', M('route', "import { writeServerEvent }", "import { fal } from '@fal-ai/client'\nimport { writeServerEvent }")],
  ['rota debita', M('route', 'const films =', "await db.from('profiles').update({ video_credits: 0 }).eq('id', user.id)\n  const films =")],
  ['rota: preço digitado', M('route', 'price: STARTER_MO,', "price: '$9/mo',")],
  ['página troca o retorno de sempre', M('page', 'return <PricingClient key={handoff.key} initialBilling={handoff.initialBilling} characterLimits={characterLimits} />\n', 'return <><PreviewPricingStrip /><PricingClient key={handoff.key} initialBilling={handoff.initialBilling} characterLimits={characterLimits} /></>\n')],
  ['evento cunhável pelo navegador', M('events', "  'region_preview_pricing_clicked',\n", '')],
  ['faixa desenha sem servidor', M('strip', 'if (!data) return null', 'if (!data) return <div />')],
  ['conferência grava retomada', M('strip', 'if (data.qa || !data.script.trim()) return', 'if (!data.script.trim()) return')],
  ['prévia monta a faixa com off', M('previa', " && REGIAO_PAGA_1011_RELEASE !== 'off' ? <PreviewPricingStrip", ' ? <PreviewPricingStrip')],
  ['aviso inverte com clipe grátis', M('banner', 'const pf = previewFirst && !freeClip && !filmLive', 'const pf = previewFirst && !filmLive')],
  ['aviso de sempre ganha campo', M('banner', "const pfMeta = pf ? { banner: REGIAO_PAGA_BANNER_VARIANT } : {}", "const pfMeta = { banner: pf ? REGIAO_PAGA_BANNER_VARIANT : 'plans' }")],
  ['aviso invertido com internal', M('lib', 'regiaoPagaSwitchOpen(REGIAO_PAGA_1011_RELEASE, false)', 'regiaoPagaSwitchOpen(REGIAO_PAGA_1011_RELEASE, true)')],
  ['aviso invertido sempre', M('banner', 'previewFirst={REGIAO_PAGA_BANNER_PREVIEW_FIRST}', 'previewFirst')],
  ['layout mexido', M('layout', '<RegionPaidOnlyBanner freeClip=', '<RegionPaidOnlyBanner freeFilm={false} freeClip=')],
]
for (const [nome, m] of MUT) {
  const src = SRC[m.file]
  if (src.split(m.a).length !== 2) { ok(false, `mutante "${nome}" não aplicou`); continue }
  const r = suite({ ...SRC, [m.file]: src.replace(m.a, m.b) })
  ok(r.some(([c]) => !c), `mutante "${nome}" é pego`)
}

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
