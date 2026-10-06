// KINEO-CLIPES-TRES-2026-10-06 — guardião das três entregas dos Clipes de 06/10 (três "sim" do fundador).
//   (A) KINEO-AVISO-CLIPE-GRATIS-2026-10-06 — "Você tem 1 clipe grátis" no topo do /studio e do /clips: só para quem TEM o
//       presente e ainda não usou (a regra do layout, regionFreeClipAvailable); UM clique para a ideia pronta (que cabe no
//       presente); o aviso não tira o CTA que vende (planos) nem cobre a tela; nada dispara sozinho; eventos _shown/_clicked do
//       navegador (com session_id) e o pedido ACEITO gravado pelo servidor; 16 línguas.
// Estilo da casa: readFileSync + ts.transpileModule para os módulos puros (imports relativos) e o carregador offline da casa
// (scripts/test-support/offline-ts-loader.mjs) para EXECUTAR a rota com banco, fal e eventos falsos. Nada de rede, nada de
// crédito. Mutantes no fim: cada regra quebrada fica vermelha (só conta o vermelho NOVO).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const { createOfflineLoader } = await import('./test-support/offline-ts-loader.mjs')
const raw = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Módulo TS puro: imports relativos ('./x', '../x') resolvem para o .ts; qualquer outro import = erro (tem de ser puro). */
function loadPure(rel, over = {}) {
  const src = over[rel] ?? raw(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (name) => {
    if (!name.startsWith('./') && !name.startsWith('../')) throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    return loadPure(path.posix.normalize(path.posix.join(path.posix.dirname(rel), name)) + '.ts', over)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

/** Tira comentários de TS/TSX (as regras olham o CÓDIGO, não a explicação). */
const code = (text) => text.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const between = (text, from, to) => {
  const a = text.indexOf(from)
  if (a < 0) return ''
  const b = text.indexOf(to, a + from.length)
  return b < 0 ? '' : text.slice(a, b)
}

const NOTICE = 'lib/clips/freeClipNotice.ts'
const POLICY = 'lib/freeFilmPolicy.ts'
const PRICING = 'lib/clips/clipPricing.ts'
const CATALOG = 'lib/clips/clipCatalog.ts'
const COPY = 'lib/clips/clipCopy.ts'
const BANNER = 'components/RegionPaidOnlyBanner.tsx'
const NOTICE_UI = 'components/FreeClipNotice.tsx'
const LAYOUT = 'app/(dashboard)/layout.tsx'
const CLIENT = 'app/(dashboard)/clips/ClipsClient.tsx'
const ROUTE = 'app/api/clips/route.ts'
const EVENTS = 'app/api/events/route.ts'
const LANGS = ['pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

// ─── A rota real, com banco/fal/eventos falsos ───────────────────────────────
const CLIP = { id: 'fixture-clip', user_id: 'fixture-person', engine: 'seedance', seconds: 5, credits: 5, mode: 'text', prompt: 'x', status: 'processing' }
async function postClip(over, body, { replay = false, success = true } = {}) {
  const events = []
  let submits = 0
  const load = createOfflineLoader({
    source: (rel, text) => (over[rel] ?? text),
    mocks: {
      'next/server': { NextResponse: { json: (b, init = {}) => ({ body: JSON.parse(JSON.stringify(b)), status: init.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'fixture-person', email: 'person@example.test' } } }) } }) },
      '@/lib/growth/homeClipsFirstServer': { homeVariantStamp: () => ({}) },
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
      '@/lib/clips/clipFlow': {
        submitClip: async () => {
          submits++
          return success ? { ok: true, status: 200, replay, balance: 0, clip: CLIP } : { ok: false, status: 402, error: 'fixture', code: 'credits' }
        },
      },
      '@/lib/clips/clipServer': { clipsAdmin: () => ({}), loadClipAccount: async () => ({}), submitDepsFor: () => ({}), toPublicClip: (x) => x },
    },
  })
  const route = load(ROUTE)
  const res = await route.POST({ json: async () => body, headers: { get: (k) => (k === 'user-agent' ? 'Mozilla/5.0' : 'fixture-idempotency-key') } })
  return { res, events, submits }
}

// ═══ (A) O aviso do clipe grátis ═════════════════════════════════════════════
async function problemsA(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? raw(rel)).replace(/\r\n/g, '\n')
  let N, P, price, cat, copy
  try {
    N = loadPure(NOTICE, over); P = loadPure(POLICY, over); price = loadPure(PRICING, over); cat = loadPure(CATALOG, over); copy = loadPure(COPY, over)
  } catch (err) { return [`(A) módulo não carrega: ${err.message}`] }

  // (A1) quem vê: só quem TEM o presente e ainda não usou, e só no /studio e no /clips.
  const gift = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: P.REGION_FREE_CLIP_CREDITS }
  const people = [
    [gift, true, 'região com o presente intacto'],
    [{ ...gift, video_credits: 0 }, false, 'já usou o clipe (saldo 0)'],
    [{ ...gift, video_credits: P.REGION_FREE_CLIP_CREDITS - 1 }, false, 'saldo abaixo de 1 clipe'],
    [{ ...gift, has_paid: true }, false, 'já pagou'],
    [{ ...gift, plan: 'starter' }, false, 'tem plano'],
    [{ ...gift, trial_status: 'active' }, false, 'trial normal (não ganhou o presente)'],
    [{ ...gift, trial_status: null, video_credits: 50 }, false, 'conta comum com saldo'],
    [null, false, 'sem perfil'],
  ]
  const PATHS = [['/studio', 'studio'], ['/clips', 'clips'], ['/clips/', 'clips'], ['/images', null], ['/studio/create', null], ['/library', null], ['/', null]]
  for (const [row, has, label] of people) {
    const available = P.regionFreeClipAvailable(row)
    if (available !== has) p.push(`(A1) presente errado para: ${label}`)
    for (const [where, surface] of PATHS) {
      const got = N.freeClipNoticeSurface(where, available)
      const want = has ? surface : null
      if (got !== want) p.push(`(A1) aviso em ${where} para ${label}: ${got} (esperado ${want})`)
    }
  }
  if (N.freeClipNoticeSurface(null, true) !== null || N.freeClipNoticeSurface(undefined, true) !== null) p.push('(A1) sem endereço, apareceu aviso')
  // (A1b) o saldo que muda nesta aba: usou ou pagou → acabou; estorno → volta; nunca liga para quem o servidor disse que não tem.
  const G = P.REGION_FREE_CLIP_CREDITS
  const still = [
    [[false, false, { credits: 50 }], false, 'sem o presente no servidor, saldo alto'],
    [[true, true, { credits: 0 }], false, 'usou o presente (saldo 0)'],
    [[true, true, { credits: G - 1 }], false, 'saldo abaixo de 1 clipe'],
    [[true, false, { credits: G }], true, 'estorno devolveu o presente'],
    [[true, true, { credits: G, hasPaid: true }], false, 'pagou'],
    [[true, true, null], true, 'leitura falhou (fica como estava: com)'],
    [[true, false, null], false, 'leitura falhou (fica como estava: sem)'],
    [[true, true, { credits: 'x' }], true, 'saldo ilegível não decide'],
  ]
  for (const [[serverSaid, current, read], want, label] of still) {
    if (N.freeClipStillAvailable?.(serverSaid, current, read, G) !== want) p.push(`(A1b) presente depois da mudança de saldo errado: ${label}`)
  }

  // (A2) a ideia pronta: texto (sem foto), motor de entrada, duração e formato que o motor faz, e custa EXATAMENTE o presente.
  const idea = N.FREE_CLIP_IDEA ?? {}
  if (!cat.CLIP_ENGINES?.[idea.engine] || idea.engine === 's25') p.push(`(A2) motor da ideia fora do catálogo de quem não paga: ${idea.engine}`)
  else {
    if (!cat.modesFor(idea.engine).includes('t2v')) p.push('(A2) o motor da ideia não faz clipe de texto (pediria foto)')
    if (!cat.offeredSecondsFor(idea.engine).includes(idea.seconds)) p.push('(A2) o motor da ideia não faz essa duração')
    if (!cat.aspectsFor(idea.engine, 't2v').includes(idea.aspect)) p.push('(A2) o motor da ideia não faz esse formato')
    const cost = price.clipCreditCost(idea.engine, idea.seconds, false)
    if (cost !== P.REGION_FREE_CLIP_CREDITS) p.push(`(A2) a ideia custa ${cost} cr ≠ o presente (${P.REGION_FREE_CLIP_CREDITS} cr)`)
  }
  if (typeof idea.prompt !== 'string' || idea.prompt.trim().length < 20) p.push('(A2) ideia pronta vazia')
  if (N.FREE_CLIP_NOTICE_HREF !== `/clips?${N.FREE_CLIP_NOTICE_PARAM}=1`) p.push('(A2) o link do /studio não leva ao /clips com a ideia pronta')
  const EV = N.FREE_CLIP_NOTICE_EVENTS ?? {}
  if (EV.shown !== 'free_clip_notice_shown' || EV.clicked !== 'free_clip_notice_clicked' || EV.requested !== 'free_clip_notice_clip_requested') p.push('(A2) nomes dos eventos mudaram (a medição lê estes)')

  // (A3) o aviso entra NO LUGAR da faixa da região (uma faixa só); o resto do app segue com a faixa de sempre; o layout não mudou.
  const banner = src(BANNER)
  const outer = between(banner, 'export default function RegionPaidOnlyBanner(', 'function RegionPaidOnlyStrip(')
  if (!outer.includes('const gift = useFreeClipGift(freeClip)')
    || !outer.includes('const surface = freeClipNoticeSurface(usePathname(), gift)')
    || !outer.includes('if (surface) return <FreeClipNotice key={surface} surface={surface} />')
    || !outer.includes('return <RegionPaidOnlyStrip freeClip={gift} />')) p.push('(A3) a faixa não troca para o aviso (só com o presente, só nas duas telas)')
  const hook = between(banner, 'function useFreeClipGift(serverSaid: boolean): boolean {', '\n}\n')
  if (!hook.includes("window.addEventListener('creditsChanged', recheck)") || !hook.includes("fetch('/api/credits', { cache: 'no-store' })")
    || !hook.includes('freeClipStillAvailable(serverSaid, current, d, REGION_FREE_CLIP_CREDITS)')) p.push('(A3) usar o presente nesta aba não tira o aviso (fica dizendo "você tem" depois de usar)')
  const strip = banner.slice(banner.indexOf('function RegionPaidOnlyStrip('))
  if (!strip.includes('href={REGION_PAID_ONLY_PLANS_HREF}') || !strip.includes('href={REGION_FREE_CLIP_HREF}')) p.push('(A3) a faixa de sempre perdeu um dos botões')
  // o tema claro é o padrão (PORCELANA, 30/09): texto branco fixo some nele — e com ele o "See plans", o CTA que vende
  if (/color: '#fff'|rgba\(255,\s*255,\s*255/.test(code(strip))) p.push('(A3) a faixa de sempre com texto branco fixo (some no tema claro: o CTA que vende fica invisível)')
  const layout = src(LAYOUT)
  const slot = layout.indexOf('<RegionPaidOnlyBanner freeClip={regionFreeClipAvailable(profile as')
  const cardEntry = layout.indexOf('<CardEntryBanner')
  const continueNow = layout.indexOf('<TrialContinueNowBanner')
  const children = layout.indexOf('\n      {children}\n')
  if (slot < 0 || !(continueNow < slot && cardEntry < slot && slot < children)) p.push('(A3) o lugar da faixa mudou no layout (passou à frente das portas de compra ou foi para depois da página)')
  if ((layout.match(/<FreeClipNotice\b/g) ?? []).length) p.push('(A3) o layout monta um segundo aviso (duas faixas)')

  // (A4) o aviso: não cobre a tela, leva o CTA que vende, 1 clique para a ideia pronta, eventos, textos do dicionário.
  const ui = code(src(NOTICE_UI))
  if (!ui.includes('<Link href={REGION_PAID_ONLY_PLANS_HREF} data-testid="region-paid-only-plans"')) p.push('(A4) o aviso tirou o botão dos planos (o CTA que vende)')
  if (/\bposition\s*:|\bzIndex\b|z-index/.test(ui)) p.push('(A4) o aviso cobre a tela (position/z-index)')
  if (/color: '#fff'|rgba\(255,\s*255,\s*255/.test(ui)) p.push('(A4) texto branco fixo no aviso (some no tema claro, o padrão)')
  const clipsBranch = between(ui, "{surface === 'clips' ? (", ') : (')
  if (!/<button\b/.test(clipsBranch) || !clipsBranch.includes('window.dispatchEvent(new Event(FREE_CLIP_APPLY_EVENT))') || /\bhref=/.test(clipsBranch)) p.push('(A4) no /clips o botão do aviso não preenche a ideia ali mesmo (volta o link morto)')
  if (!ui.includes('<Link href={FREE_CLIP_NOTICE_HREF} data-testid="free-clip-notice-cta"')) p.push('(A4) no /studio o botão do aviso não leva à ideia pronta')
  if (!/if \(shownRef\.current\) return\n\s+shownRef\.current = true\n\s+void trackEvent\(FREE_CLIP_NOTICE_EVENTS\.shown, \{ version: FREE_CLIP_NOTICE_VERSION, surface, language \}\)/.test(ui)) p.push('(A4) sem o _shown (1× por montagem, com a tela)')
  if (!ui.includes('void trackEvent(FREE_CLIP_NOTICE_EVENTS.clicked, { version: FREE_CLIP_NOTICE_VERSION, surface, language, target })')
    || (ui.match(/clicked\('clip'\)/g) ?? []).length !== 2 || !ui.includes("onClick={() => clicked('plans')}")) p.push('(A4) cliques do aviso sem o _clicked')
  for (const k of ['freeClipTitle', 'freeClipBody', 'freeClipCta', 'seePlans']) if (!ui.includes(`clipCopy(language, '${k}'`)) p.push(`(A4) o aviso não usa o texto ${k} do dicionário`)
  if (/You have|free clip|See plans|Make my/i.test(ui)) p.push('(A4) texto em inglês fixo no aviso (fora do dicionário das 16 línguas)')
  if (!ui.includes("clipCopy(language, 'freeClipBody', { s: FREE_CLIP_IDEA.seconds })")) p.push('(A4) os segundos do texto não vêm da ideia pronta')

  // (A5) a tela do /clips: preenche a ideia, NADA dispara sozinho, o botão de gerar e o card que vende continuam.
  const client = src(CLIENT)
  const apply = between(client, 'if (!freeClipPending || engines.length === 0) return', '}, [freeClipPending, engines])')
  if (!apply) p.push('(A5) a tela não aplica a ideia pronta')
  else {
    for (const need of ['setPrompt(FREE_CLIP_IDEA.prompt)', 'setSeconds(FREE_CLIP_IDEA.seconds)', 'setAspect(FREE_CLIP_IDEA.aspect)', 'setEngineKey(target.key)', 'setEffectKey(null)', 'freeClipOriginRef.current = true'])
      if (!apply.includes(need)) p.push(`(A5) a ideia pronta não faz "${need}"`)
    if (/\bgenerate\(|\bsend\(|generateEffect\(|setLockedEngines|setEngines\(/.test(apply)) p.push('(A5) a ideia pronta dispara o clipe sozinha ou mexe no catálogo')
  }
  if (!client.includes('window.addEventListener(FREE_CLIP_APPLY_EVENT, onApply)') || !client.includes("get(FREE_CLIP_NOTICE_PARAM) === '1'")) p.push('(A5) a tela não ouve o aviso (botão daqui ou link do /studio)')
  if (!client.includes('...(freeClipOriginRef.current && !payload.effect ? { free_clip_notice: true } : {}),')) p.push('(A5) o pedido não diz que veio do aviso (ou diz também no efeito)')
  if (!client.includes('data-clip-action="generate" onClick={generate}') || !client.includes('{lockedEngines.map(')) p.push('(A5) a tela perdeu o botão de gerar ou o card que vende')

  // (A6) servidor: grava SÓ o pedido aceito e novo que veio do aviso; o navegador não cunha esse fato.
  try {
    const body = { engine: 'seedance', seconds: 5, aspect: '9:16', prompt: N.FREE_CLIP_IDEA?.prompt, free_clip_notice: true }
    const req = (e) => e.filter((x) => x.name === 'free_clip_notice_clip_requested')
    const okReq = await postClip(over, body)
    const got = req(okReq.events)
    if (okReq.res.status !== 200 || got.length !== 1 || got[0].userId !== 'fixture-person' || got[0].metadata?.clip_id !== 'fixture-clip' || got[0].metadata?.version !== 'free_clip_notice_v1') p.push(`(A6) pedido aceito do aviso sem o evento do servidor com o clip_id (${JSON.stringify(got)})`)
    if (req((await postClip(over, body, { replay: true })).events).length) p.push('(A6) replay contou outro pedido do aviso')
    if (req((await postClip(over, body, { success: false })).events).length) p.push('(A6) pedido recusado contou como pedido do aviso')
    if (req((await postClip(over, { ...body, free_clip_notice: undefined })).events).length) p.push('(A6) pedido comum contou como pedido do aviso')
    if (req((await postClip(over, { ...body, free_clip_notice: 'true' })).events).length) p.push('(A6) marca do aviso aceita sem ser booleano')
    const fx = await postClip(over, { effect: 'melt', image_url: 'https://example.test/p.jpg', free_clip_notice: true })
    if (req(fx.events).length || !fx.events.some((e) => e.name === 'clip_effect_chosen')) p.push('(A6) pedido de efeito virou pedido do aviso')
  } catch (err) { p.push(`(A6) a rota não executa: ${err.message}`) }
  const events = src(EVENTS)
  const open = events.indexOf('[', events.indexOf('const SERVER_ONLY_EVENTS = new Set(['))
  const literal = events.slice(open, events.indexOf('])', open) + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  let serverOnly = new Set()
  try { serverOnly = new Set(Function(`"use strict"; return (${literal})`)()) } catch (err) { p.push(`(A6) SERVER_ONLY_EVENTS ilegível: ${err.message}`) }
  if (!serverOnly.has('free_clip_notice_clip_requested')) p.push('(A6) o navegador conseguiria cunhar o pedido do aviso (fora de SERVER_ONLY_EVENTS)')
  if (serverOnly.has('free_clip_notice_shown') || serverOnly.has('free_clip_notice_clicked')) p.push('(A6) _shown/_clicked barrados no sink (o navegador não gravaria)')

  // (A7) 16 línguas: as 3 frases, traduzidas, com os segundos marcados.
  for (const lang of ['en', ...LANGS]) {
    const d = lang === 'en' ? copy.CLIP_COPY_EN : copy.CLIP_COPY?.[lang]
    for (const k of ['freeClipTitle', 'freeClipBody', 'freeClipCta']) {
      const v = d?.[k]
      if (typeof v !== 'string' || !v.trim()) p.push(`(A7) ${lang}.${k} vazio`)
      else if (lang !== 'en' && v === copy.CLIP_COPY_EN[k]) p.push(`(A7) ${lang}.${k} não é tradução`)
    }
    if (typeof d?.freeClipBody === 'string' && !d.freeClipBody.includes('{s}')) p.push(`(A7) ${lang}.freeClipBody sem {s}`)
  }
  if (copy.clipCopy?.('pt', 'freeClipTitle') !== 'Você tem 1 clipe grátis') p.push('(A7) o título em português não é "Você tem 1 clipe grátis"')
  if (!String(copy.clipCopy?.('pt', 'freeClipBody', { s: 5 })).includes('5 segundos')) p.push('(A7) o texto não diz o que o clipe é (5 segundos)')
  return p
}

console.log('TESTE clipes-tres — 06/10')
const realA = await problemsA()
ok(realA.length === 0, '(A) aviso do clipe grátis: só quem tem e não usou, no /studio e no /clips; ideia pronta cabe no presente; CTA que vende fica; nada dispara sozinho; eventos; 16 línguas' + (realA.length ? ' → ' + realA.join(' | ') : ''))

// ─── Mutantes ────────────────────────────────────────────────────────────────
const MUTANTS = [
  ['MA1 aviso para quem não tem o presente', NOTICE, "  if (freeClipAvailable !== true || typeof pathname !== 'string') return null", "  if (typeof pathname !== 'string') return null", problemsA, realA],
  ['MA2 aviso em toda tela', NOTICE, '  return Object.prototype.hasOwnProperty.call(FREE_CLIP_NOTICE_SURFACES, path) ? FREE_CLIP_NOTICE_SURFACES[path] : null', "  return 'studio'", problemsA, realA],
  ['MA3 o aviso tira o botão dos planos', NOTICE_UI, '<Link href={REGION_PAID_ONLY_PLANS_HREF} data-testid="region-paid-only-plans"', '<Link href="/clips" data-testid="region-paid-only-plans"', problemsA, realA],
  ['MA4 aviso fixo por cima da tela', NOTICE_UI, "        margin: '12px 16px 0',", "        position: 'fixed', zIndex: 50,\n        margin: '12px 16px 0',", problemsA, realA],
  ['MA5 no /clips volta o link morto', NOTICE_UI, '            window.dispatchEvent(new Event(FREE_CLIP_APPLY_EVENT))', "            window.location.assign('/clips')", problemsA, realA],
  ['MA6 a ideia pronta dispara o clipe sozinha', CLIENT, '    freeClipFocusRef.current = true\n  }, [freeClipPending, engines])', '    freeClipFocusRef.current = true\n    void generate()\n  }, [freeClipPending, engines])', problemsA, realA],
  ['MA7 ideia num motor que não cabe no presente', NOTICE, "  engine: 'seedance',\n  seconds: 5,", "  engine: 'omni',\n  seconds: 5,", problemsA, realA],
  ['MA8 a faixa ignora o presente', BANNER, 'const surface = freeClipNoticeSurface(usePathname(), gift)', 'const surface = freeClipNoticeSurface(usePathname(), true)', problemsA, realA],
  ['MA14 saldo da aba liga o aviso para quem não tem', NOTICE, '  if (serverSaid !== true) return false\n', '', problemsA, realA],
  ['MA15 usou o presente e o aviso continua', NOTICE, '  return read.hasPaid !== true && read.credits >= giftCredits', '  return true', problemsA, realA],
  ['MA16 título do aviso em branco fixo (some no tema claro)', NOTICE_UI, "color: 'var(--text)' }}>{clipCopy(language, 'freeClipTitle')}", "color: '#fff' }}>{clipCopy(language, 'freeClipTitle')}", problemsA, realA],
  ['MA17 "See plans" da faixa em branco fixo', BANNER, "          ? { color: 'var(--text)', border: '1px solid var(--border2, var(--border))'", "          ? { color: '#fff', border: '1px solid rgba(255,255,255,.55)'", problemsA, realA],
  ['MA9 replay conta outro pedido do aviso', ROUTE, 'if (!effect && body.free_clip_notice === true && result.ok && !result.replay) {', 'if (!effect && body.free_clip_notice === true && result.ok) {', problemsA, realA],
  ['MA10 todo pedido vira pedido do aviso', ROUTE, 'if (!effect && body.free_clip_notice === true && result.ok && !result.replay) {', 'if (!effect && result.ok && !result.replay) {', problemsA, realA],
  ['MA11 o navegador cunha o pedido do aviso', EVENTS, "  'free_clip_notice_clip_requested',\n", '', problemsA, realA],
  ['MA12 aviso sem tradução em vietnamita', COPY, "    freeClipTitle: 'Bạn có 1 clip miễn phí',\n", '', problemsA, realA],
  ['MA13 pedido de efeito marcado como do aviso', CLIENT, '...(freeClipOriginRef.current && !payload.effect ? { free_clip_notice: true } : {}),', '...(freeClipOriginRef.current ? { free_clip_notice: true } : {}),', problemsA, realA],
]
for (const [label, file, from, to, check, real] of MUTANTS) {
  const text = raw(file)
  const hits = text.split(from).length - 1
  if (hits !== 1) { ok(false, `(${label}) âncora do mutante encontrada ${hits}x — reancore`); continue }
  let bitten = false
  try {
    const fresh = (await check({ [file]: text.split(from).join(to) })).filter((x) => !real.includes(x))
    if (process.env.TRES_DEBUG) console.log(`    ${label}: ${fresh.join(' | ')}`)
    bitten = fresh.length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
