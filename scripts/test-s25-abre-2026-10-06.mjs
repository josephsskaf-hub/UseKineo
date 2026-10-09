// KINEO-S25-ABRE-2026-10-06 — guardião da volta do Seedance 2.5 SÓ PARA QUEM PAGA (aposta A do fundador, 06/10: o 2.5 é a
// isca — quem procura "Seedance 2.5" acha a página e, para usar, precisa assinar).
// Prova, EXECUTANDO os módulos (readFileSync + ts.transpileModule; '@/' resolvido por ESTE loader, nunca pelo Node):
//   (1) pausa: s25 fora (enginePaused/qualityPaused nulos), Omni dentro; a frase pública de pausa nomeia só o Omni;
//   (2) interruptor: S25_PUBLIC true; lista/contagem pública com o 2.5 marcado "(paid plans)";
//   (3) régua de quem USA (lib/s25Access.ts com o isPayingPlan REAL de app/api/admin/_shared/mrr.ts): planos pagos e a casa
//       (lista EXATA) passam; *_trial de cortesia, free, nulo e o e-mail que só casa com o padrão largo ('test%') ficam fora;
//   (4) rota do filme: o portão do 2.5 roda DEPOIS da leitura do perfil e ANTES do gate de trial, do gate de plano, do custo,
//       do claim e de qualquer débito; 402 + upsell 'studio' + reason + evento de SERVIDOR com o motivo; preço do 2.5 intacto;
//   (5) outros motores intactos: o portão só olha wantsS25; gates de trial/plano iguais; nenhuma outra pausa mudou;
//   (6) /api/me/credits EXECUTADO: s25Liberado = a mesma régua; /studio e /studio/create: 2.5 trancado com selo, clique vai
//       ao upgrade e NUNCA escolhe o motor; mega-menu com selo traduzido e clique nos planos;
//   (7) página /ai-video-generator/seedance-2-5 RENDERIZADA: números da fonte (TIER_PRICES, TIER_CREDITS, ANNUAL_PRICES,
//       custo do 2.5 e do Seedance 1.5), a frase da Pika só com a data da consulta, nenhuma resolução, nenhum "Enhance
//       incluso", nenhum "Start free"; o [engine] não gera mais o slug; a camada citável da TAREFA 12 (resposta logo
//       depois do H1, tabela 35/60 s por plano, CTA seo_engine_seedance-2-5) na versão "só plano pago" — e, desde
//       KINEO-S25-CLIPES-2026-10-06, nos DOIS estados do interruptor do clipe: desligado, sem clipe avulso (como antes);
//       ligado, o clipe com o preço da fonte e "Seedance 2.5 clips from N credits (paid plans)";
//       no cenário "2.5 pausado", noindex e sem preço citável; llms.txt com "paid plans only" e a voz da casa;
//   (8) Enhance: o automático do filme pronto (conta da casa) não roda no 2.5; nenhum upscale/Topaz na estrada s25;
//   (9) o clipe do 2.5 segue o interruptor ÚNICO dele (lib/clips/clipLaunch.ts CLIP_S25_PUBLIC — reancorado
//       KINEO-S25-CLIPES-2026-10-06) + o portão de pagante deste filme; (10) as 3 frases novas nas 16 línguas;
//  (11) mutantes: cada regra quebrada fica vermelha — e cada mutante prova que aplicou.
// Estilo readFileSync + transpile (molde scripts/test-clipe-gratis-regiao-2026-10-05.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const React = require(path.join(ROOT, 'node_modules', 'react'))
const JSX = require(path.join(ROOT, 'node_modules', 'react', 'jsx-runtime'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules', 'react-dom', 'server'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
// REANCORADO KINEO-GEO-RODADA3-2026-10-08 — a mediana MEDIDA de um motor no Kineo AI Video Index, lida do JSON da edição
// (clientes quando a edição os tem, senão a casa), escrita como a página escreve (1 casa decimal; inteiro sem casa).
const medianaMedidaDo = (quality) => {
  const ed = (read('lib/seo/aiVideoIndexTimes.ts').match(/edition: '(\d{4}-\d{2})'/) ?? [])[1]
  if (!ed) return null
  const reg = JSON.parse(read(`data/ai-video-index/${ed}.json`)).engines.find((x) => x.qualityMode === quality)
  const t = reg?.customers?.minutesToFilm ?? reg?.house?.minutesToFilm
  return t ? (Number.isInteger(t.median) ? String(t.median) : t.median.toFixed(1)) : null
}

const LAUNCH = 'lib/engineLaunch.ts'
const ACCESS = 'lib/s25Access.ts'
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const CREDITS = 'app/api/me/credits/route.ts'
const STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'
const LANDING = 'app/KineoLanding.tsx'
const NAVITEM = 'components/NavEngineItem.tsx'
const PAGE_LIB = 'lib/growth/s25EnginePage.ts'
const PAGE = 'app/ai-video-generator/seedance-2-5/page.tsx'
const ENGINE_PAGE = 'app/ai-video-generator/[engine]/page.tsx'
const CATALOG = 'lib/growth/enginePageCatalog.ts'
const STATUS = 'app/api/compose/status/[renderId]/route.ts'
const ENHANCE = 'app/api/enhance/route.ts'
const ROUTER = 'lib/hollywood/router.ts'
const CLIPS = 'lib/clips/clipServer.ts'
const MODELS = 'app/models-pricing/page.tsx'
const COPYFILE = 'lib/ui/refinementCopy.json'
const COST = 'lib/credits/engineCost.ts'
const TWO_PRODUCTS = 'components/pricing/TwoProductsPricing.tsx'
const LLMS = 'app/llms.txt/route.ts'
const CITATION = 'lib/seo/engineCitation.ts'

/** Carregador: fonte real (ou a do mutante), '@/x' e './x' resolvidos para arquivos do repo; o resto só por mock. */
function makeLoader(over = {}, mocks = {}) {
  const cache = new Map()
  const reactMocks = {
    react: React,
    'react/jsx-runtime': JSX,
    'next/link': { __esModule: true, default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) },
    'next/navigation': { notFound() { throw new Error('NEXT_NOT_FOUND') } },
  }
  const all = { ...reactMocks, ...mocks }
  function load(spec, fromDir = ROOT) {
    if (Object.hasOwn(all, spec)) return all[spec]
    let rel
    if (spec.startsWith('@/')) rel = spec.slice(2)
    else if (spec.startsWith('.')) rel = path.relative(ROOT, path.resolve(fromDir, spec)).split(path.sep).join('/')
    else throw new Error(`import inesperado (sem mock): ${spec}`)
    const found = [rel, rel + '.ts', rel + '.tsx'].find((c) => Object.hasOwn(over, c) || (fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()))
    if (!found) throw new Error(`arquivo não encontrado: ${spec}`)
    if (cache.has(found)) return cache.get(found).exports
    const mod = { exports: {} }
    cache.set(found, mod)
    const src = (over[found] ?? read(found)).replace(/\r\n/g, '\n')
    if (found.endsWith('.json')) { mod.exports = JSON.parse(src); return mod.exports }
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, (n) => load(n, path.dirname(path.join(ROOT, found))), { env: {} })
    return mod.exports
  }
  return load
}
const STRIPE_MOCK = { '@/lib/stripe': { stripe: {} } }

// Linha inteira (com ou sem comentário no fim): a âncora não casa com prefixo nem com comentário que cita o código.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const lineIndex = (src, line) => { const m = new RegExp(`^[ \\t]*${esc(line)}[ \\t]*(//.*)?$`, 'm').exec(src); return m ? m.index : -1 }
const hasLine = (src, line) => lineIndex(src, line) >= 0
/** Código sem comentários (para varrer chamadas): tira // e /* *\/ fora de strings de forma conservadora. */
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')

const HOUSE = 'josephsskaf@gmail.com'
const STRANGER = 'cliente@exemplo.com'

async function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  const load = makeLoader(over, STRIPE_MOCK)
  let L, A, cost, CP, mrr
  try {
    L = load('@/' + LAUNCH)
    A = load('@/' + ACCESS)
    cost = load('@/' + COST)
    CP = load('@/lib/checkoutPricing')
    mrr = load('@/app/api/admin/_shared/mrr')
  } catch (err) { return [`módulos não carregam: ${err.message}`] }

  // (1) pausa
  if (L.enginePaused('s25') !== null) p.push('s25 continua pausado (enginePaused)')
  if (L.qualityPaused('cinematic_s25') !== null) p.push('cinematic_s25 continua pausado (qualityPaused)')
  if (!L.enginePaused('omni') || !L.qualityPaused('cinematic_omni')) p.push('Omni saiu da pausa (não podia)')
  if (JSON.stringify([...L.PAUSED_ENGINE_KEYS]) !== '["omni"]') p.push(`PAUSED_ENGINE_KEYS ≠ ['omni']: ${JSON.stringify(L.PAUSED_ENGINE_KEYS)}`)
  for (const k of ['fast', 'seedance', 'kling', 'veo', 'hollywood', 'h3']) if (L.enginePaused(k) !== null) p.push(`${k} ficou pausado`)
  const pausados = L.PAUSED_ENGINE_KEYS.map((k) => L.ENGINE_PAUSE[k]?.label ?? `(${k} sem registro de pausa)`)
  if (!pausados.every((n) => L.PAUSED_ENGINES_COPY.includes(n)) || /Seedance 2\.5/.test(L.PAUSED_ENGINES_COPY) || !/nothing is charged/i.test(L.PAUSED_ENGINES_COPY)) {
    p.push('frase pública de pausa não nomeia exatamente os pausados (ou ainda cita o 2.5)')
  }

  // (2) interruptor + catálogo público
  if (L.S25_PUBLIC !== true) p.push('S25_PUBLIC não está ligado')
  if (!L.VIDEO_ENGINE_LIST_COPY.includes('Seedance 2.5 (paid plans)')) p.push('lista pública sem o 2.5 marcado "(paid plans)"')
  if (L.VIDEO_ENGINE_COUNT_WORD !== 'Six') p.push(`contagem pública ${L.VIDEO_ENGINE_COUNT_WORD} (esperado Six: os 5 de antes + o 2.5)`)
  if (!L.s25Visible(STRANGER)) p.push('o 2.5 não aparece para o público')

  // (3) régua de quem usa — com o isPayingPlan REAL
  const casos = [
    [{ email: HOUSE, plan: 'free' }, true, 'house', 'casa (lista exata) usa mesmo sem plano'],
    ...['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot', 'autopilot_lite'].map((plan) => [{ email: STRANGER, plan }, true, 'paying_plan', `plano pago ${plan}`]),
    ...['studio_trial', 'creator_trial', 'basic_trial', 'pro_trial', 'starter_trial'].map((plan) => [{ email: STRANGER, plan }, false, 'trial_plan', `${plan} (cortesia/trial) NÃO usa`]),
    [{ email: STRANGER, plan: 'free' }, false, 'not_paying', 'conta free'],
    [{ email: STRANGER, plan: null }, false, 'not_paying', 'perfil sem plano (leitura falhou)'],
    [{ email: 'test123@gmail.com', plan: 'free' }, false, 'not_paying', "e-mail que só casa com o padrão largo 'test%' NÃO é casa"],
    [{ email: null, plan: undefined }, false, 'not_paying', 'deslogado/nulo'],
  ]
  for (const [conta, allowed, reason, label] of casos) {
    const d = A.s25AccessFor(conta)
    if (d.allowed !== allowed || d.reason !== reason) p.push(`régua errada: ${label} → ${JSON.stringify(d)}`)
  }
  // a régua É a do painel de pagantes: para todo plano conhecido, pagante (fora a casa) ⇔ isPayingPlan
  for (const plan of Object.keys(mrr.PLAN_PRICE_USD).concat(['free', '', 'qualquer'])) {
    if (A.s25AccessFor({ email: STRANGER, plan }).allowed !== mrr.isPayingPlan(plan)) p.push(`régua diverge de isPayingPlan em ${plan}`)
  }
  if (A.s25LiberadoNaTela(STRANGER, 'starter') !== true || A.s25LiberadoNaTela(STRANGER, 'studio_trial') !== false || A.s25LiberadoNaTela(STRANGER, 'free') !== false) {
    p.push('s25LiberadoNaTela não segue o portão no modo público')
  }
  const access = src(ACCESS)
  if (!access.includes("import { isPayingPlan, isTrialPlan } from '@/app/api/admin/_shared/mrr'")) p.push('s25Access não usa o isPayingPlan canônico')
  for (const rel of [STUDIO, GEN, LANDING, NAVITEM, PAGE, LAUNCH, PAGE_LIB]) if (/from ['"]@\/lib\/s25Access['"]|from ['"]\.\.?\/(?:\.\.\/)*s25Access['"]/.test(src(rel))) p.push(`${rel} importa lib/s25Access (só servidor: puxa a Stripe)`)

  // (4) rota do filme
  const rc = src(ROUTE)
  const iPlan = lineIndex(rc, "const planVal = (profile?.plan ?? 'free') as string")
  const iGate = lineIndex(rc, 'if (wantsS25 && S25_PUBLIC) {')
  const iTrial = lineIndex(rc, 'if ((wantsKling || wantsVeo || hollywoodPath) && !isPaidUser && !(TRIAL_UNLOCKS_PREMIUM && trialActive)) {')
  const iPlanGate = lineIndex(rc, 'const engineGate = decideEngineGate({')
  const iCost = rc.indexOf('    const cost = creditCostForDuration(costQuality, true, duration)')
  const iClaim = rc.indexOf('const acquired = await acquireCinematicClaim({')
  const iDebit = rc.indexOf('await debitVideoCredits(supabase, {')
  const iUpfront = rc.indexOf('const upfrontDebit = await ensureCinematicDebit(cost)')
  if ([iPlan, iGate, iTrial, iPlanGate, iCost, iClaim, iDebit, iUpfront].some((i) => i < 0)) p.push('âncoras da rota não encontradas (portão, perfil, gates, custo, claim ou débito)')
  else if (!(iPlan < iGate && iGate < iTrial && iTrial < iPlanGate && iPlanGate < iCost && iCost < iClaim && iGate < iDebit && iGate < iUpfront)) p.push('portão do 2.5 fora de ordem (precisa vir depois do perfil e antes dos gates, do custo, do claim e do débito)')
  else {
    const bloco = rc.slice(iGate, iTrial)
    for (const need of [
      // REANCORADO KINEO-PARCEIRO-ABRE-TUDO-2026-10-09: o portão passou a receber a flag do parceiro ativo (cortesia + afiliado
      // ativo, lida dentro deste bloco); a régua de quem paga e a recusa abaixo são as mesmas. Prova do parceiro:
      // scripts/test-parceiro-abre-tudo-2026-10-09.mjs.
      'const acessoS25 = s25AccessFor({ email: user.email, plan: planVal, partner: parceiroS25 })',
      'if (!acessoS25.allowed) {',
      'await writeServerEvent({ name: S25_PAID_ONLY_EVENT,',
      'reason: acessoS25.reason,',
      'charged: false,',
      "upsell: 'studio', reason: S25_PAID_ONLY_REASON, engine: 's25'",
      'error: S25_PAID_ONLY_MESSAGE',
      '{ status: 402 }',
    ]) if (!bloco.includes(need)) p.push(`portão do 2.5 sem "${need}"`)
  }
  if (!rc.includes("import { s25AccessFor } from '@/lib/s25Access'")) p.push('rota não importa o portão de lib/s25Access')
  if (L.S25_PAID_ONLY_REASON !== 's25_paid_plans_only' || L.S25_PAID_ONLY_EVENT !== 's25_paid_only_refused') p.push('nome do motivo/evento mudou (o painel lê esses nomes)')
  if (!/paid plans/i.test(L.S25_PAID_ONLY_MESSAGE) || !/nothing was charged/i.test(L.S25_PAID_ONLY_MESSAGE)) p.push('recusa sem dizer o caminho (plano pago) e que nada foi cobrado')
  if (!/^\/pricing\?intent_campaign=s25_paid_plans_server#plans$/.test(L.s25UpgradeHref('server'))) p.push('caminho de upgrade não leva aos planos')
  // preço do 2.5 intacto (o fundador proibiu mexer hoje): biller = espelho da rota = 150 (KINEO-S25-ESPERTA, 01/09)
  const espelho = /^const S25_CREDIT_COST = (\d+)$/m.exec(rc)
  if (cost.creditCostFor('cinematic_s25', true) !== 150 || !espelho || Number(espelho[1]) !== 150) p.push('custo do 2.5 em créditos mudou (fica 150 a 60 s)')

  // (5) outros motores intactos
  if (iGate >= 0 && !hasLine(rc, 'if (wantsS25 && S25_PUBLIC) {')) p.push('portão não é exclusivo do 2.5')
  const gate = load('@/lib/enginePlanGate')
  if (gate.ENGINE_GATE_SINCE !== '2099-01-01T00:00:00.000Z' || !['kling', 'veo', 'hollywood', 'h3', 's25', 'seedance'].every((e) => gate.decideEngineGate({ engine: e, plan: 'starter', profileCreatedAt: '2026-10-06T00:00:00Z' }).allowed)) p.push('gate de plano por motor mudou')
  if (!hasLine(rc, "if (wantsS25 && !S25_PUBLIC && !isInternalEmail(user.email)) {")) p.push('o portão do canário (S25_PUBLIC=false) sumiu — o rollback de uma linha deixaria de valer')

  // (6) /api/me/credits EXECUTADO + telas
  const runCredits = async (email, perfil) => {
    const sb = {
      auth: { getUser: async () => ({ data: { user: { id: 'u-1', email } } }) },
      from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: perfil, error: null }) }; return q },
    }
    const l2 = makeLoader(over, {
      ...STRIPE_MOCK,
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => sb },
      '@/lib/kineo1Access': { readKineo1Access: async () => ({ ok: true, usedFast: false, boughtPack: false }) },
      // REANCORADO KINEO-PARCEIRO-ABRE-TUDO-2026-10-09: a rota passou a ler o parceiro ativo pela chave de serviço
      // (lib/partnerAccess.ts → lib/userFootage). Aqui ninguém é parceiro (sem cortesia nem afiliado): a régua de pagante é a
      // de antes, intacta. O parceiro é provado em scripts/test-parceiro-abre-tudo-2026-10-09.mjs.
      '@/lib/userFootage': { footageAdminClient: () => ({ from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: null }) }; return q } }) },
    })
    return (await l2('@/' + CREDITS).GET()).body
  }
  try {
    const free = await runCredits(STRANGER, { video_credits: 10, plan: 'free', has_paid: false })
    const pago = await runCredits(STRANGER, { video_credits: 60, plan: 'starter', has_paid: true })
    const cortesia = await runCredits(STRANGER, { video_credits: 210, plan: 'studio_trial', has_paid: false })
    const pacote = await runCredits(STRANGER, { video_credits: 35, plan: 'free', has_paid: true })
    const casa = await runCredits(HOUSE, { video_credits: 168, plan: 'pro', has_paid: true })
    if (free.s25Liberado !== false || pago.s25Liberado !== true || cortesia.s25Liberado !== false || pacote.s25Liberado !== false || casa.s25Liberado !== true) {
      p.push(`/api/me/credits s25Liberado errado: free=${free.s25Liberado} pago=${pago.s25Liberado} cortesia=${cortesia.s25Liberado} pacote=${pacote.s25Liberado} casa=${casa.s25Liberado}`)
    }
    if (free.internal !== true) p.push('/api/me/credits: o 2.5 deixou de aparecer (internal = s25Visible)')
  } catch (err) { p.push(`GET /api/me/credits não roda: ${err.message}`) }

  const st = src(STUDIO)
  for (const need of [
    "const trancado = !pausa && e.key === 's25' && s25Liberado !== true",
    "onClick={() => { void trackEvent(S25_PAID_CLICK_EVENT, { surface: 'studio', balance }); setPickerOpen(false); router.push(s25UpgradeHref('studio')) }}>",
    '<b>{e.name}<span className="tag" style={{ background: \'rgba(41,151,255,.16)\', color: \'#7cc0ff\' }}><UiLabel>{S25_PAID_BADGE}</UiLabel></span></b>',
    '<span className="d" style={{ color: \'var(--accent)\', marginTop: 2 }}><UiLabel>{S25_PAID_HINT}</UiLabel></span>',
    "if (typeof d?.s25Liberado === 'boolean') setS25Liberado(d.s25Liberado)",
    'const [s25Liberado, setS25Liberado] = useState<boolean | null>(null)',
    "if (s25Liberado && !ENGINES.find((x) => x.key === 's25')?.paused) setEngine('s25')",
    "(e.key !== 's25' || s25Liberado === true)",
  ]) if (!st.includes(need)) p.push(`/studio sem "${need.slice(0, 70)}…"`)
  // o card trancado é um botão PRÓPRIO: entre "return trancado ? (" e ") : (" não pode haver setEngine/setDuration
  const iT = st.indexOf('; return trancado ? (')
  const fT = iT >= 0 ? st.indexOf('                ) : (\n', iT) : -1
  if (iT < 0 || fT < 0) p.push('/studio: card trancado do 2.5 não encontrado (return trancado ? … : …)')
  else if (/setEngine\(|setDuration\(/.test(st.slice(iT, fT))) p.push('/studio: o card trancado escolhe o motor/duração (devia só levar aos planos)')
  if (!st.includes("desc: 'ByteDance’s newest engine · Enhance available with one click'")) p.push('/studio: o card do 2.5 não diz "Enhance available with one click"')
  const gc = src(GEN)
  for (const need of [
    "const trancadoS25 = !pausa && m.key === 's25' && s25Liberado !== true",
    "onClick={() => { if (trancadoS25) { track?.(S25_PAID_CLICK_EVENT, { surface: 'studio_create' }); (onUpgradeS25 ?? onUpgrade)(); return } if (cinematicUnlocked) { setMode('cinematic_ai'); setAiEngine(m.key) } else { onUpgrade() } }}",
    '{trancadoS25 && <> · <UiLabel>{S25_PAID_BADGE}</UiLabel></>}',
    "onUpgradeS25={() => openOutOfCreditsModal('studio')}",
    "if (d.s25Liberado === false) setAiEngine((atual) => (atual === 's25' ? 'seedance' : atual))",
  ]) if (!gc.includes(need)) p.push(`/studio/create sem "${need.slice(0, 70)}…"`)
  const land = src(LANDING)
  if (!land.includes("href={S25_PUBLIC ? s25UpgradeHref('nav') : '/studio?engine=s25&intent_campaign=nav_mega'}") || !land.includes("chip={S25_PUBLIC ? undefined : 'INTERNAL'}")) p.push('mega-menu: 2.5 sem clique nos planos (KINEO-MENU-VIDEO-LIMPO-2026-10-09: o selo "NEW · paid plans" saiu do menu a pedido do fundador; o clique segue indo aos planos)')
  if (!src(NAVITEM).includes('{translateChip ? <UiLabel>{chip}</UiLabel> : chip}')) p.push('NavEngineItem não traduz o selo')
  if (L.S25_PAID_BADGE !== 'NEW · paid plans') p.push('selo do 2.5 mudou')

  // REANCORADO KINEO-S25-CLIPES-2026-10-06 — o clipe do 2.5 à venda segue o interruptor ÚNICO dele (lib/clips/clipLaunch.ts
  // CLIP_S25_PUBLIC; quem usa = o portão pago deste filme). As provas da página (7) e da camada citável rodam nos DOIS estados,
  // sempre: o do arquivo (ou do mutante) e o oposto, em memória. Desligado = a versão "só plano pago, sem clipe avulso" de
  // antes, intacta; ligado = o preço do clipe da fonte (clipCreditCost → o preço decidido), "on any paid plan" e a frase
  // "Seedance 2.5 clips from N credits (paid plans)". Mais estrito que antes: os dois lados ficam presos.
  const CLIP_LAUNCH = 'lib/clips/clipLaunch.ts'
  const CLIP_SWITCH_RE = /^export const CLIP_S25_PUBLIC = (true|false)\b/m
  const clipLaunchSrc = src(CLIP_LAUNCH)
  const mundosDoClipe = []
  if (!CLIP_SWITCH_RE.test(clipLaunchSrc)) p.push('âncora CLIP_S25_PUBLIC sumiu de lib/clips/clipLaunch.ts')
  else {
    const noArquivo = CLIP_SWITCH_RE.exec(clipLaunchSrc)[1] === 'true'
    for (const ligado of [noArquivo, !noArquivo]) {
      mundosDoClipe.push({ ligado, over: ligado === noArquivo ? over : { ...over, [CLIP_LAUNCH]: clipLaunchSrc.replace(CLIP_SWITCH_RE, `export const CLIP_S25_PUBLIC = ${ligado}`) } })
    }
  }

  // (7) página do 2.5 RENDERIZADA, números recalculados aqui da fonte — nos dois estados do clipe
  for (const mundo of mundosDoClipe) try {
    const tag = mundo.ligado ? '[clipe ligado] ' : '[clipe desligado] '
    const pl = makeLoader(mundo.over, {
      '@/components/Footer': { __esModule: true, default: () => null },
      '@/components/OrganicCtaLink': { __esModule: true, default: ({ children, href, source, placement, ...rest }) => React.createElement('a', { href, ...rest }, children) },
    })
    if (pl('@/' + CLIP_LAUNCH).CLIP_S25_PUBLIC !== mundo.ligado) { p.push(`${tag}o interruptor em memória não aplicou`); continue }
    const page = pl('@/' + PAGE)
    const S = pl('@/' + PAGE_LIB)
    const html = renderToStaticMarkup(page.default())
    const meta = page.generateMetadata()
    const clipPricing = pl('@/lib/clips/clipPricing')
    const clipSec = pl('@/lib/pricingTwoProducts').clipSecondsForTarget('s25', 5)
    const clipCr = clipPricing.clipCreditCost('s25', clipSec, false)
    const clipMin = Math.min(...pl('@/lib/clips/clipCatalog').offeredSecondsFor('s25').map((s) => clipPricing.clipCreditCost('s25', s, false)))
    const fmt = (minor) => CP.formatCheckoutMoney('usd', Math.round(minor))
    const cr = (s) => cost.creditCostForDuration('cinematic_s25', true, s)
    const cr35 = cr(35)
    const cr60 = cr(60)
    const usdMensal = fmt((cr35 * CP.TIER_PRICES.basic.usd) / CP.TIER_CREDITS.basic)
    const usdAnual = fmt((cr35 * CP.ANNUAL_PRICES.basic.usd) / 12 / CP.TIER_CREDITS.basic)
    const seed15 = cost.creditCostForDuration('cinematic_ai', true, 15)
    const esperados = [
      [`${cr35} credits for the 35-second option`, 'custo de 35 s do 2.5 (lead)'],
      [`about ${usdMensal} on the Creator plan`, '≈ US$ do Creator mensal (TIER_PRICES/TIER_CREDITS)'],
      [`about ${usdAnual} on the annual plan`, '≈ US$ do Creator anual (ANNUAL_PRICES ÷ 12)'],
      [`${cr35} credits (35 s) or ${cr60} credits (60 s)`, 'disponibilidade por créditos'],
      [`on Creator (${fmt(CP.TIER_PRICES.basic.usd)}/month, ${CP.TIER_CREDITS.basic} credits) or Studio`, 'linha de preço de entrada da comparação'],
      [`Seedance 1.5 films start at ${seed15} credits (15 seconds) — ${Math.floor(CP.TIER_CREDITS.starter / seed15)} films a month on the ${fmt(CP.TIER_PRICES.starter.usd)} Starter plan.`, 'bloco "mais filmes" (Seedance 1.5)'],
      [`Pika vs Kineo (checked ${S.PIKA_CHECKED_ON})`, 'cabeçalho da comparação com a data'],
      ['Seedance 2.5 online — finished films, not just clips', 'H1 da sessão CEO'],
      ['See paid plans', 'CTA de upgrade'],
      ['Enhance available with one click', 'Enhance como botão, nunca incluso'],
    ]
    const texto = html.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    for (const [t, label] of esperados) if (!texto.includes(t)) p.push(`${tag}página sem ${label}: "${t}"`)
    // KINEO-MOTORES-GEO-2026-10-06 (TAREFA 12) na rota própria: a 1ª frase depois do H1 é a resposta citável "só plano pago";
    // a tabela tem 35 e 60 s com quantos cabem em cada plano. REANCORADO KINEO-S25-CLIPES-2026-10-06: com o clipe DESLIGADO,
    // nenhum clipe (como antes); LIGADO, o clipe com o preço da fonte, "on any paid plan" e "clips from N credits (paid plans)".
    const depoisH1 = texto.slice(texto.indexOf('</h1>'))
    const primeiroP = depoisH1.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''
    const usdC = (credits) => fmt((credits * CP.TIER_PRICES.basic.usd) / CP.TIER_CREDITS.basic)
    const card = texto.match(/<section data-kineo="engine-price-card"[\s\S]*?<\/section>/)?.[0] ?? ''
    const fraseDe = `Seedance 2.5 clips from ${clipMin} credits (paid plans)`
    if (!primeiroP.startsWith('<p data-kineo="engine-answer"') || !primeiroP.includes('You can use Seedance 2.5 online in Kineo Studio') || !primeiroP.includes(', on any paid plan:')) p.push(`${tag}1ª frase depois do H1 não é a resposta citável "só plano pago"`)
    else if (mundo.ligado) {
      if (!primeiroP.includes(`a ${clipSec}-second Seedance 2.5 clip costs ${clipCr} credits (about ${usdC(clipCr)})`) || !primeiroP.includes(`video with voice, captions and music costs ${cr60} credits (about ${usdC(cr60)})`)) p.push(`${tag}1ª frase com preço do clipe/filme ≠ fonte`)
    } else if (!primeiroP.includes(`costs ${cr35} credits for 35 seconds (about ${usdC(cr35)}) or ${cr60} credits for 60 seconds (about ${usdC(cr60)})`)) p.push(`${tag}1ª frase com preço ≠ fonte`)
    if (mundo.ligado) {
      const linhaClipe = card.match(new RegExp(`${clipSec}-second clip[\\s\\S]*?</tr>`))?.[0] ?? ''
      const contagensClipe = [CP.TIER_CREDITS.starter, CP.TIER_CREDITS.basic, CP.TIER_CREDITS.pro].map((k) => (Math.floor(k / clipCr) > 0 ? `${Math.floor(k / clipCr)} per month` : '—'))
      if (!linhaClipe.includes(`${clipCr} cr`) || !linhaClipe.includes(usdC(clipCr)) || !contagensClipe.every((n) => linhaClipe.includes(`>${n}<`))) p.push(`${tag}tabela sem a linha do clipe de ${clipSec} s com o preço da fonte`)
      if (!texto.includes(`${fraseDe}.`)) p.push(`${tag}página sem "${fraseDe}"`)
      if (!texto.includes(`${clipCr} credits for a ${clipSec}-second clip (about ${usdC(clipCr)}), or ${cr60} credits for a finished 60-second video with voice, captions and music, on any paid plan.`)) p.push(`${tag}linha da Kineo no card sem o clipe "on any paid plan"`)
    } else {
      if (/clip costs|-second clip<|-second clip ·|clips from/.test(texto)) p.push(`${tag}página anuncia clipe avulso do 2.5 (não se vende)`)
    }
    if (!texto.includes('Seedance 2.5 is on paid plans — the free trial does not include it.')) p.push(`${tag}página sem a nota "on paid plans"`)
    // KINEO-S25-CLIPES-2026-10-06 — correção de fato público: a comparação do 2.5 cita a Runway PRO (runway.com/pricing, 06/10,
    // lista o Seedance 2.5 só no Pro e no Max), nunca a Standard — na lista do card e na FAQ.
    const semTags = texto.replace(/<[^>]+>/g, '')
    if (!semTags.includes('Runway (Pro plan) — $35/month') || !semTags.includes('Runway (Pro plan), about') || /Runway \(Standard plan\)/.test(semTags)) p.push(`${tag}comparação do 2.5 com plano da Runway que não lista o modelo (esperado Runway Pro)`)
    if (/New accounts[^.<]* start with \d+ free credits/.test(texto)) p.push(`${tag}página oferece o trial como porta do 2.5`)
    for (const s of [35, 60]) {
      const c = cr(s)
      const linha = card.match(new RegExp(`${s}-second video[\\s\\S]*?</tr>`))?.[0] ?? ''
      const contagens = [CP.TIER_CREDITS.starter, CP.TIER_CREDITS.basic, CP.TIER_CREDITS.pro].map((k) => (Math.floor(k / c) > 0 ? `${Math.floor(k / c)} per month` : '—'))
      if (!linha.includes(`${c} cr`) || !linha.includes(usdC(c)) || !contagens.every((n) => linha.includes(`>${n}<`))) p.push(`tabela de preço do ${s} s ≠ fonte`)
    }
    // CTAs: cadastro → Studio com o 2.5 e a campanha da página (padrão TAREFA 12), e os planos com a mesma campanha
    const ctaCadastro = `/signup?intent_campaign=seo_engine_seedance-2-5&redirect=${encodeURIComponent('/studio?engine=s25&intent_campaign=seo_engine_seedance-2-5')}`
    const ctas = [...texto.matchAll(/<a href="([^"]+)"[^>]*>(Make a [^<]+ →)<\/a>/g)]
    if (ctas.length < 2 || ctas.some((m) => m[1] !== ctaCadastro || m[2] !== 'Make a Seedance 2.5 video on a paid plan →')) p.push('CTAs do 2.5 fora do cadastro com a campanha (ou sem "on a paid plan")')
    if (!texto.includes('href="/pricing?intent_campaign=seo_engine_seedance-2-5#plans"')) p.push('página sem o caminho dos planos com a campanha da página')
    // REANCORADO KINEO-GEO-RODADA3-2026-10-08 (com motivo): a faixa digitada "Usually 8–25 minutes" saiu de toda página de motor;
    // o tempo honesto agora é o MEDIDO do Seedance 2.5 no Kineo AI Video Index (o JSON da edição que lib/seo/aiVideoIndexTimes.ts
    // declara; renders de teste da casa, indicativos). Prova completa: scripts/test-geo-rodada3-2026-10-08.mjs.
    const s25Medido = medianaMedidaDo('cinematic_s25')
    if (/8–25 minutes/.test(texto) || !s25Medido || !texto.includes(`Median ${s25Medido} min from request to finished film`)) p.push('página sem o tempo honesto de entrega')
    const pikaSecao = texto.match(/<section[^>]*data-kineo="s25-vs-pika"[\s\S]*?<\/section>/)?.[0] ?? ''
    if (/Standard/.test(pikaSecao)) p.push('Pika com o nome antigo do plano ("Standard")')
    // resolução por palavra inteira: o CSS da camada citável (max-width:720px) não é promessa de resolução
    for (const [re, label] of [[/\b1080p?\b|\b720p\b|\b480p\b|\b4K\b/i, 'resolução'], [/Topaz|then enhanced|every scene is enhanced|HD master/i, 'Enhance incluso'], [/Start free|Free trial:|unlocked on every account|Free to start/i, 'promessa de grátis'], [/watermark/i, "marca d'água da Pika (não bate com a página oficial)"], [/\$29 Studio|\$49/, 'preço velho/digitado'], [/built-in voice/i, '"built-in voice" (o 2.5 não tem voz: a narração é da casa)']]) {
      if (re.test(texto)) p.push(`página com ${label}`)
    }
    if (meta.robots) p.push('página do 2.5 com robots/noindex fora da pausa')
    // a frase de uso comercial da Pika só aparece dentro da seção datada
    const linha = S.PIKA_COMMERCIAL_LINE
    let i = texto.indexOf(linha)
    if (i < 0) p.push('comparação sem a linha de uso comercial')
    while (i >= 0) {
      const ini = texto.lastIndexOf('<section', i)
      const fim = texto.indexOf('</section>', i)
      const secao = texto.slice(ini, fim)
      if (!secao.includes(`checked ${S.PIKA_CHECKED_ON}`) || !secao.includes('data-kineo="s25-vs-pika"')) p.push('frase da Pika fora da seção com a data da consulta')
      i = texto.indexOf(linha, i + linha.length)
    }
    if (!/paid plans/.test(meta.description) || !/not in the free trial/.test(meta.description) || !meta.description.includes(`${cr35} credits`)) p.push('metadata da página sem preço/plano pago honesto')
  } catch (err) { p.push(`[clipe ${mundo.ligado ? 'ligado' : 'desligado'}] página do 2.5 não renderiza: ${err.message}`) }
  // CENÁRIO "2.5 pausado" (KINEO-MOTORES-GEO-2026-10-06): a rota própria segue a régua do [engine] — sem camada citável,
  // aviso de manutenção e robots noindex. Aplicado aqui sobre a fonte (ou a do mutante) de lib/engineLaunch.ts.
  try {
    const PAUSA_DE = "  return (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null"
    const launchSrc = src(LAUNCH)
    if (!launchSrc.includes(PAUSA_DE)) p.push('cenário pausado: âncora de enginePaused não encontrada')
    else {
      const pausado = launchSrc.replace(PAUSA_DE, () => "  return k === 's25' ? ENGINE_PAUSE.omni : (PAUSED_ENGINE_KEYS as readonly string[]).includes(k) ? ENGINE_PAUSE[k as PausedEngineKey] : null")
      const pl2 = makeLoader({ ...over, [LAUNCH]: pausado }, {
        '@/components/Footer': { __esModule: true, default: () => null },
        '@/components/OrganicCtaLink': { __esModule: true, default: ({ children, href, source, placement, ...rest }) => React.createElement('a', { href, ...rest }, children) },
      })
      const pg = pl2('@/' + PAGE)
      const cat2 = pl2('@/' + CATALOG)
      const m2 = pg.generateMetadata()
      const h2 = renderToStaticMarkup(pg.default())
      if (cat2.isIndexableEngineSlug('seedance-2-5') !== false || cat2.ENGINE_GEO['seedance-2-5'] !== null) p.push('cenário pausado: o 2.5 segue indexável / com camada citável')
      if (!m2.robots || m2.robots.index !== false) p.push('cenário pausado: a página do 2.5 não sai do índice (robots noindex)')
      if (h2.includes('data-kineo="engine-answer"') || h2.includes('data-kineo="engine-price-card"')) p.push('cenário pausado: a página segue com preço citável')
      if (!h2.includes('Temporarily paused for maintenance.')) p.push('cenário pausado: a página não avisa a manutenção')
    }
  } catch (err) { p.push(`cenário pausado não roda: ${err.message}`) }
  if (!src(ENGINE_PAGE).includes('return ENGINE_SLUGS.filter((engine) => engine !== S25_PAGE_SLUG).map((engine) => ({ engine }))')) p.push('[engine] ainda gera o slug do 2.5 (rota duplicada)')
  // REANCORADO KINEO-S25-CLIPES-2026-10-06 — a camada citável nos DOIS estados do interruptor do clipe (mundosDoClipe acima).
  for (const mundo of mundosDoClipe) try {
    const tag = mundo.ligado ? '[clipe ligado] ' : '[clipe desligado] '
    const lw = makeLoader(mundo.over, STRIPE_MOCK)
    const cat = lw('@/' + CATALOG)
    const S25C = lw('@/' + PAGE_LIB).s25PageCopy()
    const clipPricing = lw('@/lib/clips/clipPricing')
    const clipMin = Math.min(...lw('@/lib/clips/clipCatalog').offeredSecondsFor('s25').map((s) => clipPricing.clipCreditCost('s25', s, false)))
    const e = cat.ENGINES['seedance-2-5']
    if (!e || !cat.ENGINE_SLUGS.includes('seedance-2-5')) p.push(`${tag}catálogo sem a página do 2.5`)
    else if (/1080|480p|Topaz|\$29 Studio|fits the \$29|Studio tier|longest in the catalog|\$49/.test([e.model, e.intro, e.bestFor, e.tradeoff, ...e.faq.flatMap((f) => [f.q, f.a])].join(' '))) p.push(`${tag}catálogo do 2.5 ainda com as mentiras antigas`)
    else {
      // FAQ = a entrada citável da TAREFA 12 (onde usar + quanto custa; é mais barato direto?) + o texto da sessão CEO
      const g = cat.ENGINE_GEO['seedance-2-5']
      if (!g) p.push(`${tag}catálogo sem a camada citável do 2.5 (ENGINE_GEO)`)
      else {
        if (g.paidPlansOnly !== true) p.push(`${tag}camada citável do 2.5 esquece o "só plano pago"`)
        if (mundo.ligado) {
          // ligado: o clipe à venda com o preço da FONTE (clipCreditCost → preço decidido), "só plano pago" e a frase curta
          const c = g.rows.clip
          if (!c || c.credits !== clipPricing.clipCreditCost('s25', c.seconds, false)) p.push(`${tag}camada citável do 2.5 sem o clipe à venda ou com preço ≠ clipCreditCost`)
          if (g.clipFromLine !== `Seedance 2.5 clips from ${clipMin} credits (paid plans)`) p.push(`${tag}camada citável sem "Seedance 2.5 clips from ${clipMin} credits (paid plans)" (veio ${g.clipFromLine})`)
          if (!g.accessNote.startsWith(`Seedance 2.5 is on paid plans — the free trial does not include it. Seedance 2.5 clips from ${clipMin} credits (paid plans). `)) p.push(`${tag}nota de acesso sem a frase do clipe "(paid plans)"`)
          if (c && (!g.faqWhereCost.a.includes('on any paid plan (the free trial does not include it)') || !g.faqWhereCost.a.includes(`a ${c.seconds}-second Seedance 2.5 clip costs ${c.credits} credits`))) p.push(`${tag}FAQ citável do 2.5 sem "só plano pago" ou sem o clipe à venda`)
        } else {
          // desligado: nenhum clipe, nenhuma frase curta (a versão "sem clipe avulso" de antes, intacta)
          if (g.rows.clip !== null || g.clipFromLine !== null) p.push(`${tag}camada citável do 2.5 vende clipe avulso`)
          if (!g.faqWhereCost.a.includes('on any paid plan (the free trial does not include it)') || /clip costs/.test(g.faqWhereCost.a)) p.push(`${tag}FAQ citável do 2.5 sem "só plano pago" ou com clipe avulso`)
        }
        const faqEsperada = [g.faqWhereCost, ...(g.faqDirect ? [g.faqDirect] : []), ...S25C.faq]
        if (e.intro !== S25C.lead || e.h1 !== S25C.h1 || JSON.stringify(e.faq) !== JSON.stringify(faqEsperada)) p.push(`${tag}catálogo do 2.5 não lê o texto derivado (s25PageCopy + a entrada citável)`)
      }
      if (!cat.isIndexableEngineSlug('seedance-2-5') || !cat.INDEXABLE_ENGINE_SLUGS.includes('seedance-2-5')) p.push(`${tag}página do 2.5 fora da lista indexável (sitemap/llms.txt)`)
      // os motores ABERTOS (todos menos o 2.5) não ganham a frase curta: o texto deles segue byte a byte igual
      for (const [slug, geo] of Object.entries(cat.ENGINE_GEO)) if (slug !== 'seedance-2-5' && geo && geo.clipFromLine !== null) p.push(`${tag}${slug}: motor aberto ganhou "clips from … (paid plans)"`)
    }
  } catch (err) { p.push(`[clipe ${mundo.ligado ? 'ligado' : 'desligado'}] catálogo não carrega: ${err.message}`) }
  // llms.txt: a linha do 2.5 diz "só plano pago" e a voz é da casa (o modelo roda com generate_audio:false)
  const llms = src(LLMS)
  if (!llms.includes("const acesso = geo.paidPlansOnly ? 'paid plans only (not in the free trial); ' : ''")) p.push('llms.txt sem o "paid plans only" do motor pago')
  // KINEO-S25-CLIPES-2026-10-06 — a novidade do motor pago cita o clipe à venda pela frase da camada citável (o comportamento
  // executado, nos dois estados, está em scripts/test-motores-geo-2026-10-06.mjs).
  if (!llms.includes("narrates the script.${geo.clipFromLine ? ` ${geo.clipFromLine}.` : ''")) p.push('llms.txt: a novidade do 2.5 não cita o clipe à venda (clipFromLine)')
  if (/built-in voice \([^)]*Seedance 2\.5/.test(llms) || !llms.includes('and Seedance 2.5 (Kineo narrates it; the model’s own audio is off)')) p.push('llms.txt diz que o 2.5 tem voz própria (a narração é da casa)')
  if (!src(MODELS).includes("what: 'ByteDance’s newest engine · Enhance available with one click · paid plans only'") || !src(MODELS).includes("{r.quality === 'cinematic_s25' ? 'Paid plans only'")) p.push('/models-pricing: linha do 2.5 sem a verdade (Enhance com um clique, só plano pago)')

  // (8) Enhance: nada automático no 2.5, nenhum upscale por cena
  const status = src(STATUS)
  const iHouse = status.indexOf("const HOUSE_ENHANCE_EMAILS = new Set(['josephsskaf@gmail.com'])")
  const iSubmit = status.indexOf("fal.queue.submit('fal-ai/topaz/upscale/video'", iHouse)
  if (iHouse < 0 || iSubmit < 0 || !hasLine(status.slice(iHouse, iSubmit), "quality !== 'cinematic_s25' && // KINEO-S25-ABRE-2026-10-06 — sem Enhance automático no 2.5")) p.push('Enhance automático do filme pronto ainda roda no 2.5')
  for (const rel of [ROUTE, ROUTER]) if (/topaz|upscale/i.test(semComentarios(src(rel)))) p.push(`${rel} chama upscale/Topaz (a estrada s25 não pode ter Enhance por cena)`)
  const enh = src(ENHANCE)
  if (/cinematic_s25|quality_mode/.test(semComentarios(enh)) || !enh.includes(".select('id,video_url,enhanced_url,enhance_request_id')")) p.push('o botão manual de Enhance deixou de valer para qualquer filme')

  // (9) REANCORADO KINEO-S25-CLIPES-2026-10-06 — o clipe do 2.5 tem UM interruptor (lib/clips/clipLaunch.ts CLIP_S25_PUBLIC, que
  // substitui o s25ClipVisible daqui) e o portão de pagante DESTE filme (clipS25Paying → s25AccessFor). Desligado = só a casa
  // (como era); ligado = todo mundo vê, só quem paga usa. A prova executada (recusa antes do débito, card trancado, preço
  // decidido) mora em scripts/test-s25-clipes-2026-10-06.mjs; aqui fica a amarração com o filme e o /pricing.
  let CL = null
  try { CL = load('@/lib/clips/clipLaunch') } catch (err) { p.push(`interruptor do clipe não carrega: ${err.message}`) }
  if ('s25ClipVisible' in L) p.push('voltou uma 2ª régua do clipe do 2.5 em lib/engineLaunch.ts (o interruptor é o CLIP_S25_PUBLIC)')
  if (CL && (!CL.clipS25Visible(HOUSE) || CL.clipS25Visible(STRANGER) !== CL.CLIP_S25_PUBLIC || CL.clipS25Visible(null) !== CL.CLIP_S25_PUBLIC)) p.push('clipe do 2.5 fora do interruptor único (CLIP_S25_PUBLIC)')
  const clipSrc = src(CLIPS)
  // REANCORADO KINEO-PARCEIRO-ABRE-TUDO-2026-10-09: o portão de pagante do clipe passa a flag do parceiro ativo ao MESMO s25AccessFor.
  if (!hasLine(clipSrc, "launchVisible: engine !== 's25' || clipS25Visible(account.email),")
    || !hasLine(clipSrc, "...(engine === 's25' ? { paidAllowed: clipS25Paying(account) } : {}),")
    || !hasLine(clipSrc, 'return s25AccessFor({ email: account.email, plan: account.plan, partner: account.partner }).allowed')) p.push('/clips não usa o interruptor único + o portão de pagante do filme do 2.5')
  // /pricing nos dois estados do interruptor do clipe (o do arquivo e o oposto, em memória)
  for (const mundo of mundosDoClipe) try {
    const tp = makeLoader(mundo.over, STRIPE_MOCK)('@/' + TWO_PRODUCTS).twoProductsModelForPage()
    if (tp.clips.some((r) => r.engine === 's25') !== mundo.ligado) p.push(`[clipe ${mundo.ligado ? 'ligado' : 'desligado'}] /pricing: a linha do CLIPE do 2.5 não segue o interruptor único do clipe`)
    if (!tp.films.some((r) => r.engine === 's25')) p.push('/pricing não mostra o FILME do 2.5 (S25_PUBLIC liga a linha por desenho)')
  } catch (err) { p.push(`tabelas do /pricing não carregam: ${err.message}`) }

  // (10) 16 línguas
  try {
    const dict = JSON.parse(src(COPYFILE))
    const langs = Object.keys(dict)
    const chaves = [L.S25_PAID_BADGE, L.S25_PAID_HINT, 'ByteDance’s newest engine · Enhance available with one click']
    if (langs.length !== 16) p.push(`refinementCopy com ${langs.length} línguas`)
    for (const k of chaves) for (const l of langs) {
      const v = dict[l]?.[k]
      if (typeof v !== 'string' || !v.trim()) p.push(`tradução ausente: ${l} / ${k}`)
      else if (l === 'en' ? v !== k : v === k) p.push(`tradução inválida: ${l} / ${k}`)
    }
  } catch (err) { p.push(`refinementCopy ilegível: ${err.message}`) }
  return p
}

console.log('TESTE s25-abre — Seedance 2.5 de volta, só para quem paga — 06/10')
const real = await problems()
ok(real.length === 0, '(1–10) pausa, interruptor, régua canônica, portão antes do débito, telas, página, Enhance, clipe e 16 línguas' + (real.length ? ' → ' + real.join(' | ') : ''))

const mutants = [
  ['M1 s25 de volta à pausa', LAUNCH, "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni']", "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni', 's25' as PausedEngineKey]"],
  ['M2 Omni sai da pausa', LAUNCH, "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni']", 'export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = []'],
  ['M3 S25_PUBLIC desligado', LAUNCH, 'export const S25_PUBLIC = true', 'export const S25_PUBLIC = false'],
  ['M4 *_trial passa a usar (régua larga)', ACCESS, "  if (isPayingPlan(conta.plan)) return { allowed: true, reason: 'paying_plan' }", "  if (isPayingPlan(conta.plan) || isTrialPlan(conta.plan)) return { allowed: true, reason: 'paying_plan' }"],
  ['M5 casa pela régua larga (test%)', ACCESS, "  if (isDryRunAccount(conta.email)) return { allowed: true, reason: 'house' }", "  if (isDryRunAccount(conta.email) || /^test/.test(String(conta.email))) return { allowed: true, reason: 'house' }"],
  ['M6 portão desligado na rota', ROUTE, '    if (wantsS25 && S25_PUBLIC) {', '    if (false && wantsS25 && S25_PUBLIC) {'],
  ['M7 recusa sem evento de servidor', ROUTE, 'await writeServerEvent({ name: S25_PAID_ONLY_EVENT,', 'await Promise.resolve({ name: S25_PAID_ONLY_EVENT,'],
  ['M8 recusa sem caminho de upgrade', ROUTE, "upsell: 'studio', reason: S25_PAID_ONLY_REASON", 'reason: S25_PAID_ONLY_REASON'],
  ['M9 portão olha a decisão errada', ROUTE, '      if (!acessoS25.allowed) {', '      if (acessoS25.allowed === null) {'],
  // REANCORADOS KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 (M10, M23c): as duas linhas passaram a levar a flag do parceiro ativo; a intenção é a mesma.
  ['M10 /api/me/credits com a flag cravada', CREDITS, '  const s25Liberado = s25LiberadoNaTela(user.email, plan, parceiro)', '  const s25Liberado = true'],
  ['M11 /studio escolhe o motor trancado', STUDIO, "router.push(s25UpgradeHref('studio')) }}>", "router.push(s25UpgradeHref('studio')); setEngine(e.key) }}>"],
  ['M12 /studio sem o selo', STUDIO, '<UiLabel>{S25_PAID_BADGE}</UiLabel></span></b>', "<UiLabel>{e.tag ?? ''}</UiLabel></span></b>"],
  ['M12b /studio: degrau do card trancado volta a contar', STUDIO, "(e.key !== 's25' || s25Liberado === true)", '(true)'],
  ['M13 /studio falha aberta (sem flag = liberado)', STUDIO, "const trancado = !pausa && e.key === 's25' && s25Liberado !== true", "const trancado = !pausa && e.key === 's25' && s25Liberado === false"],
  ['M14 /studio/create escolhe o motor trancado', GEN, '(onUpgradeS25 ?? onUpgrade)(); return }', '(onUpgradeS25 ?? onUpgrade)() }'],
  ['M15 /studio/create falha aberta', GEN, "const trancadoS25 = !pausa && m.key === 's25' && s25Liberado !== true", "const trancadoS25 = !pausa && m.key === 's25' && s25Liberado === false"],
  ['M16 mega-menu sem os planos', LANDING, "href={S25_PUBLIC ? s25UpgradeHref('nav') : '/studio?engine=s25&intent_campaign=nav_mega'}", "href={'/studio?engine=s25&intent_campaign=nav_mega'}"],
  ['M17 página com preço digitado', PAGE_LIB, "    usd35Creator: creditsToUsd(cr35, 'basic', 'monthly'),", "    usd35Creator: '$17.00',"],
  ['M18 Pika sem a data', PAGE, 'Pika vs Kineo (checked {PIKA_CHECKED_ON})', 'Pika vs Kineo'],
  ['M19 página promete resolução', PAGE_LIB, "kineo: 'A finished film ready to post'", "kineo: 'A finished 1080p film ready to post'"],
  ['M20 Enhance automático volta no 2.5', STATUS, "          quality !== 'cinematic_s25' && // KINEO-S25-ABRE-2026-10-06 — sem Enhance automático no 2.5\n", ''],
  ['M21 upscale por cena na estrada s25', ROUTE, '  if (model === S25_I2V_MODEL) {\n', "  if (model === S25_I2V_MODEL) {\n    void ['fal-ai/topaz/upscale/video']\n"],
  ['M22 preço do 2.5 mudou', COST, '      return 150\n    case \'pro\':', '      return 160\n    case \'pro\':'],
  // REANCORADOS KINEO-S25-CLIPES-2026-10-06: a régua do clipe saiu daqui para o interruptor único (lib/clips/clipLaunch.ts).
  ['M23 clipe do 2.5 sem o portão de pagante', CLIPS, "    ...(engine === 's25' ? { paidAllowed: clipS25Paying(account) } : {}),\n", ''],
  ['M23b 2ª régua do clipe volta ao engineLaunch', LAUNCH, 'export function s25Visible(email?: string | null): boolean {', 'export function s25ClipVisible(email?: string | null): boolean { return isInternalEmail(email) }\nexport function s25Visible(email?: string | null): boolean {'],
  ['M23c clipe do 2.5 com régua de pagante larga', CLIPS, '  return s25AccessFor({ email: account.email, plan: account.plan, partner: account.partner }).allowed', "  return account.plan !== 'free'"],
  ['M24 frase de pausa ainda cita o 2.5', LAUNCH, "export const PAUSED_ENGINES_COPY = 'Omni Flash is temporarily paused", "export const PAUSED_ENGINES_COPY = 'Omni Flash and Seedance 2.5 are temporarily paused"],
  ['M25 tradução pt do selo faltando', COPYFILE, '    "NEW · paid plans": "NOVO · planos pagos",\n', ''],
  ['M26 [engine] volta a gerar o slug do 2.5', ENGINE_PAGE, 'return ENGINE_SLUGS.filter((engine) => engine !== S25_PAGE_SLUG).map((engine) => ({ engine }))', 'return ENGINE_SLUGS.map((engine) => ({ engine }))'],
  ['M27 clique do /studio/create sem a caixa de planos', GEN, "onUpgradeS25={() => openOutOfCreditsModal('studio')}", 'onUpgradeS25={() => undefined}'],
  ['M28 catálogo volta ao texto velho', CATALOG, '          intro: S25_COPY.lead,', "          intro: 'Kineo renders at 480p and masters to a 1080×1920 HD file with Topaz-based enhancement.',"],
  ['M29 tela de cliente importa o módulo de servidor', STUDIO, "import { S25_PAID_BADGE, S25_PAID_HINT,", "import { s25AccessFor } from '@/lib/s25Access'\nimport { S25_PAID_BADGE, S25_PAID_HINT,"],
  ['M30 /pricing ignora o interruptor do clipe do 2.5', TWO_PRODUCTS, "      clipListed: (engine) => engine !== 's25' || clipS25Visible(null),\n", "      clipListed: (engine) => engine !== 's25' || !clipS25Visible(null),\n"],
  // KINEO-MOTORES-GEO-2026-10-06 × KINEO-S25-ABRE-2026-10-06 — a camada citável na versão "só plano pago"
  // REANCORADOS KINEO-S25-CLIPES-2026-10-06: a camada citável segue o interruptor único do clipe (provado nos dois estados).
  ['M31 camada citável vende o clipe do 2.5 com o interruptor desligado', CATALOG, "clipOnSale: param !== 's25' || clipS25Visible(null) }", 'clipOnSale: true }'],
  ['M31b camada citável esconde o clipe do 2.5 com o interruptor ligado', CATALOG, "clipOnSale: param !== 's25' || clipS25Visible(null) }", "clipOnSale: param !== 's25' }"],
  ['M32 o 2.5 deixa de ser "só plano pago" nas páginas', LAUNCH, "export function engineIsPaidPlansOnly(engine: string | null | undefined): boolean {\n  return engine === 's25'", "export function engineIsPaidPlansOnly(engine: string | null | undefined): boolean {\n  return engine === 'nenhum'"],
  ['M33 página do 2.5 pausado continua indexável', PAGE, '    ...(isIndexableEngineSlug(S25_PAGE_SLUG) ? {} : { robots: { index: false, follow: true } }),\n', ''],
  ['M34 llms.txt volta a dar voz própria ao 2.5', LLMS, 'The engines with their own built-in voice (Kling 3, MiniMax H3, Omni) and Seedance 2.5 (Kineo narrates it; the model’s own audio is off) narrate in', 'The engines with their own built-in voice (Kling 3, MiniMax H3, Omni, Seedance 2.5) narrate in'],
  ['M35 llms.txt sem o "paid plans only"', LLMS, "const acesso = geo.paidPlansOnly ? 'paid plans only (not in the free trial); ' : ''", "const acesso = ''"],
  ['M36 a resposta citável sai de baixo do H1', PAGE, '          {geo && <EngineAnswerLead geo={geo} />}\n', ''],
  // M37 REANCORADO KINEO-S25-CLIPES-2026-10-06 (a nota ganhou a frase do clipe à venda; a intenção é a mesma).
  ['M37 a nota de acesso oferece o trial ao motor pago', CITATION, "    accessNote: access.paidPlansOnly ? `${name} is on paid plans — the free trial does not include it. ${clipFromLine ? `${clipFromLine}. ` : ''}${smallestMonthlySentence}` : `${trialSentence} ${smallestMonthlySentence}`,", '    accessNote: `${trialSentence} ${smallestMonthlySentence}`,'],
  ['M38 CTA do 2.5 sem "on a paid plan"', CITATION, "    ctaLabel: access.paidPlansOnly ? `Make a ${name} video on a paid plan →` : `Make a ${name} video →`,", '    ctaLabel: `Make a ${name} video →`,'],
  // KINEO-S25-CLIPES-2026-10-06 — "Seedance 2.5 clips from N credits (paid plans)" com o clipe ligado
  ['M39 a frase do clipe à venda some', CITATION, '  const clipFromLine = clipeAVenda && access.paidPlansOnly\n', '  const clipFromLine = null && clipeAVenda && access.paidPlansOnly\n'],
  ['M40 a frase do clipe sem "(paid plans)"', CITATION, ' credits (paid plans)`\n    : null', ' credits`\n    : null'],
  ['M41 o "from N credits" digitado', CITATION, '${Math.min(...offeredSecondsFor(key).map((s) => clipCreditCost(key, s, false)))}', '5'],
  ['M42 card: linha da Kineo com clipe sem "on any paid plan"', 'components/EngineCitationAnswer.tsx', "${geo.paidPlansOnly ? ', on any paid plan' : '' /* KINEO-S25-CLIPES-2026-10-06: clipe do 2.5 à venda, só plano pago */}", ''],
  ['M43 llms.txt: a novidade do 2.5 sem o clipe à venda', LLMS, "narrates the script.${geo.clipFromLine ? ` ${geo.clipFromLine}.` : '' /* KINEO-S25-CLIPES-2026-10-06 */}", 'narrates the script.'],
  // KINEO-S25-CLIPES-2026-10-06 — correção de fato público (Runway Standard → Pro no 2.5)
  ['M44 o 2.5 volta a comparar com a Runway Standard', CITATION, "runwayRoute('runway-s25-pro', 'Seedance 2.5 at its lowest resolution', s)", "runwayRoute('runway-s25-standard', 'Seedance 2.5 at its lowest resolution', s)"],
]
for (const [label, file, from, to] of mutants) {
  const src = read(file)
  if (!src.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = src.replace(from, to)
  if (mutated === src) { ok(false, `(${label}) mutante não aplicou`); continue }
  let bitten = false
  try {
    bitten = (await problems({ [file]: mutated })).length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
