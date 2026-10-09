// KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — guardião do "parceiro ativo usa TUDO dentro dos créditos que demos" (fundador, 09/10,
// por voz: "pode abrir tudo para ele fazer o que ele quiser dentro").
// Parceiro ativo = cortesia ATIVA (courtesy_grants: status 'active', ends_at no futuro, level = profiles.plan, só
// creator_trial/studio_trial) + linha em `affiliates` do mesmo user_id com status 'active'. Prova, EXECUTANDO os módulos
// (readFileSync + ts.transpileModule; '@/' resolvido por ESTE loader; banco falso que conta cada leitura):
//   (1) lib/partnerAccess.ts: parceiro → 'partner'; cortesia sem afiliado (o caso do Alfredo), afiliado pendente/suspenso,
//       cortesia vencida pelo relógio ou pelo status, nível trocado → 'not_partner'; erro de leitura, exceção, env ausente,
//       id vazio e leitura pendurada (teto de tempo) → 'unknown' = NÃO é parceiro (falha fechada); pagante e conta grátis
//       → nenhuma leitura;
//   (2) lib/s25Access.ts (com o isPayingPlan REAL): sem a flag = a régua de antes, idêntica; cortesia + parceiro → 'partner';
//       a flag não abre conta grátis, plano nulo nem o trial de $1 (só nível de cortesia); casa e pagante continuam na frente;
//   (3) /api/me/credits EXECUTADO: s25Liberado e `parceiro` verdadeiros só para o parceiro; leitura que falhou = false;
//       pagante e conta grátis sem leitura de parceiro;
//   (4) /clips (lib/clips/clipServer.ts EXECUTADO): loadClipAccount preenche `partner`; o 2.5 abre para o parceiro e segue
//       trancado ('paid') para a cortesia sem afiliado; os outros motores dão o mesmo veredito com e sem a flag;
//   (5) filme do 2.5 (rota cinematic, fonte): a leitura do parceiro roda DENTRO do portão do 2.5, antes do s25AccessFor, que a
//       recebe; a recusa de quem não é parceiro é a MESMA de antes (402, corpo e evento); toda linha que a entrega acrescenta à
//       rota leva a marca KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 (trava 8.2: os guardiões de diff da rota tiram as marcadas e comparam
//       o resto com a base, byte a byte);
//   (6) Studio Ads (lib/ads/access.ts + lib/ads/serverAccess.ts EXECUTADOS): parceiro → 'partner' → adsGate 'ok' (com o
//       interruptor desligado, 'closed', igual ao assinante); cortesia sem afiliado → 'none'; leitura que falhou → 'none';
//       ordem casa > passe > assinante > parceiro; a oferta da parede nunca aparece para 'partner' e a prova positiva da
//       porta (app/ads/page.tsx) exige 'not_partner' para plano de cortesia; o assistente aceita o motivo novo;
//   (7) o teto é o saldo: nenhuma rota de geração do Studio Ads decide preço pelo motivo de acesso; v2/retake/variações
//       cobram por chargeAdsV2; o clássico passa pelo /api/compose, que trata a cortesia como plano pago (débito normal);
//   (8) nada de dinheiro mudou: a cortesia segue NÃO pagante (isPayingPlan, a régua de pagantes/MRR), custo do 2.5 (150),
//       ADS_SUBSCRIBER_PLANS, COURTESY_LEVELS;
//   (9) /studio: o tile "Business ad" trata o parceiro (flag do servidor) como assinante;
//  (10) mutantes: cada regra quebrada fica vermelha — e cada mutante prova que aplicou.
// Estilo e carregador: scripts/test-s25-abre-2026-10-06.mjs.
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

const PARTNER = 'lib/partnerAccess.ts'
const S25 = 'lib/s25Access.ts'
const CREDITS = 'app/api/me/credits/route.ts'
const CLIPS = 'lib/clips/clipServer.ts'
const ROUTE = 'app/api/generate-video-cinematic/route.ts'
const ADS = 'lib/ads/access.ts'
const ADS_SERVER = 'lib/ads/serverAccess.ts'
const PAYWALL = 'lib/ads/paywall.ts'
const DOOR = 'app/ads/page.tsx'
const WIZARD = 'app/(dashboard)/ads/new/AdsWizardClient.tsx'
const STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const COMPOSE = 'app/api/compose/route.ts'
const ENGINE_LAUNCH = 'lib/engineLaunch.ts'
const CLIP_LAUNCH = 'lib/clips/clipLaunch.ts'
const TAG = 'KINEO-PARCEIRO-ABRE-TUDO-2026-10-09'

const UID = '11111111-2222-3333-4444-555555555555'
const HOUSE = 'josephsskaf@gmail.com'
const STRANGER = 'parceiro@exemplo.com'
const NOW = Date.now()
const FUTURO = new Date(NOW + 13 * 86400000).toISOString()
const PASSADO = new Date(NOW - 86400000).toISOString()

// ─── o 2.5 e o clipe dele ligados e sem pausa EM MEMÓRIA: a regra provada aqui é "no modo público, o parceiro passa" ───
function abreO25(rel, text) {
  if (rel === ENGINE_LAUNCH) {
    const re = /^export const S25_PUBLIC = (true|false)\b/m
    if (!re.test(text)) throw new Error('âncora S25_PUBLIC sumiu de lib/engineLaunch.ts')
    let out = text.replace(re, 'export const S25_PUBLIC = true')
    const pause = /(export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey\[\] = \[)([^\]]*)(\])/
    if (!pause.test(out)) throw new Error('âncora PAUSED_ENGINE_KEYS sumiu de lib/engineLaunch.ts')
    out = out.replace(pause, (_all, a, b, c) => a + b.split(',').map((s) => s.trim()).filter((s) => s && !/^'s25'/.test(s)).join(', ') + c)
    return out
  }
  if (rel === CLIP_LAUNCH) {
    const re = /^export const CLIP_S25_PUBLIC = (true|false)\b/m
    if (!re.test(text)) throw new Error('âncora CLIP_S25_PUBLIC sumiu de lib/clips/clipLaunch.ts')
    return text.replace(re, 'export const CLIP_S25_PUBLIC = true')
  }
  return text
}

/** Carregador: fonte real (ou a do mutante), '@/x' e './x' resolvidos para arquivos do repo; o resto só por mock. */
function makeLoader(over = {}, mocks = {}, env = {}) {
  const cache = new Map()
  function load(spec, fromDir = ROOT) {
    if (Object.hasOwn(mocks, spec)) return mocks[spec]
    let rel
    if (spec.startsWith('@/')) rel = spec.slice(2)
    else if (spec.startsWith('.')) rel = path.relative(ROOT, path.resolve(fromDir, spec)).split(path.sep).join('/')
    else throw new Error(`import inesperado (sem mock): ${spec}`)
    const found = [rel, rel + '.ts', rel + '.tsx'].find((c) => Object.hasOwn(over, c) || (fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()))
    if (!found) throw new Error(`arquivo não encontrado: ${spec}`)
    if (cache.has(found)) return cache.get(found).exports
    const mod = { exports: {} }
    cache.set(found, mod)
    const src = abreO25(found, (over[found] ?? read(found)).replace(/\r\n/g, '\n'))
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, (n) => load(n, path.dirname(path.join(ROOT, found))), { env })
    return mod.exports
  }
  return load
}

/**
 * Banco falso da chave de serviço (profiles, courtesy_grants, affiliates). Respeita os filtros eq (user_id/id/status), conta
 * cada leitura e pode falhar, lançar ou pendurar uma tabela.
 */
function fakeAdmin(db = {}) {
  const reads = []
  return {
    reads,
    from(table) {
      if (db.throwOn === table || db.throwOn === '*') throw new Error(`rede caiu em ${table}`)
      let cols = ''
      const f = {}
      const q = {
        select(c) { cols = c; return q },
        eq(col, val) { f[col] = val; return q },
        maybeSingle() {
          reads.push(table)
          if (db.hang === table) return new Promise(() => {})
          if (table === 'profiles') {
            if (db.profileError) return Promise.resolve({ data: null, error: db.profileError })
            if (db.semColunaPasse && cols.includes('ads_access_until')) return Promise.resolve({ data: null, error: { code: '42703', message: 'column does not exist' } })
            return Promise.resolve({ data: f.id === UID ? db.profile ?? null : null, error: null })
          }
          if (table === 'courtesy_grants') {
            if (db.grantError) return Promise.resolve({ data: null, error: db.grantError })
            const g = db.grant && f.user_id === UID && (f.status === undefined || f.status === db.grant.status) ? db.grant : null
            return Promise.resolve({ data: g, error: null })
          }
          if (table === 'affiliates') {
            if (db.affiliateError) return Promise.resolve({ data: null, error: db.affiliateError })
            return Promise.resolve({ data: f.user_id === UID ? db.affiliate ?? null : null, error: null })
          }
          return Promise.reject(new Error(`tabela inesperada: ${table}`))
        },
      }
      return q
    },
  }
}

const GRANT = (level = 'creator_trial', ends_at = FUTURO, status = 'active') => ({ level, status, ends_at })
const ATIVO = { status: 'active' }
/** Os mundos de leitura: o que o banco tem para a conta UID. */
const MUNDOS = {
  parceiro: { grant: GRANT(), affiliate: ATIVO },
  parceiroStudio: { grant: GRANT('studio_trial'), affiliate: ATIVO },
  semAfiliado: { grant: GRANT(), affiliate: null }, // o caso do Alfredo: cortesia, sem afiliado
  afiliadoPendente: { grant: GRANT(), affiliate: { status: 'pending' } },
  afiliadoSuspenso: { grant: GRANT(), affiliate: { status: 'suspended' } },
  vencidaNoRelogio: { grant: GRANT('creator_trial', PASSADO), affiliate: ATIVO },
  vencidaNoStatus: { grant: GRANT('creator_trial', FUTURO, 'expired'), affiliate: ATIVO },
  nivelTrocado: { grant: GRANT('studio_trial'), affiliate: ATIVO },
  erroCortesia: { grantError: { code: '500', message: 'boom' }, affiliate: ATIVO },
  erroAfiliado: { grant: GRANT(), affiliateError: { code: '500', message: 'boom' } },
  lanca: { throwOn: '*' },
  pendura: { grant: GRANT(), affiliate: ATIVO, hang: 'affiliates' },
}

/** Corre com teto: o que não responde em `ms` vira 'PENDUROU' (nunca trava o guardião). */
function comTeto(p, ms = 1500) {
  let t
  return Promise.race([p, new Promise((r) => { t = setTimeout(() => r('PENDUROU'), ms) })]).finally(() => clearTimeout(t))
}

const STRIPE_MOCK = { '@/lib/stripe': { stripe: {} } }
const forbidden = (what) => () => { throw new Error(`offline: ${what} proibido neste guardião`) }
const CLIP_MOCKS = {
  '@supabase/supabase-js': { createClient: forbidden('Supabase real') },
  'node:crypto': require('node:crypto'),
  '@fal-ai/client': { fal: new Proxy({}, { get: forbidden('fal') }) },
  '@/lib/credits/debit': { debitVideoCredits: forbidden('débito real') },
  '@/lib/credits/refund': { refundRenderCredits: forbidden('estorno real') },
  '@/lib/safety/contentModeration': { moderateContent: forbidden('moderação real') },
  '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
  '@/lib/animate/remoteImage': { downloadPublicAnimateImage: forbidden('download') },
  '@/lib/serverEvents': { writeServerEvent: forbidden('evento real') },
  '@/lib/falAlert': { alertFalExhausted: forbidden('alerta'), looksExhausted: () => false },
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const lineIndex = (src, line) => { const m = new RegExp(`^[ \\t]*${esc(line)}[ \\t]*(//.*)?$`, 'm').exec(src); return m ? m.index : -1 }
const hasLine = (src, line) => lineIndex(src, line) >= 0

async function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  // A chave de serviço que lib/userFootage devolve neste mundo (Error = env ausente: footageAdminClient lança).
  let ADMIN = null
  const userFootage = { footageAdminClient: () => { if (ADMIN instanceof Error) throw ADMIN; return ADMIN } }
  const baseMocks = { ...STRIPE_MOCK, '@/lib/userFootage': userFootage }

  // ── (1) lib/partnerAccess.ts ────────────────────────────────────────────────────────────────────────────────────
  let PA, A, mrr, cost, CL
  try {
    const load = makeLoader(over, baseMocks)
    PA = load('@/' + PARTNER)
    A = load('@/' + S25)
    mrr = load('@/app/api/admin/_shared/mrr')
    cost = load('@/lib/credits/engineCost')
    CL = load('@/lib/courtesy')
  } catch (err) { return [`módulos não carregam: ${err.message}`] }

  const status = async (plan, mundo, opts = {}) => {
    const db = fakeAdmin(mundo)
    const r = await comTeto(PA.readPartnerStatus(opts.userId ?? UID, plan, { client: db, timeoutMs: 60, nowMs: NOW }))
    return { r, reads: db.reads.length }
  }
  const casos = [
    ['creator_trial', 'parceiro', 'partner', 'cortesia ativa + afiliado ativo = parceiro'],
    ['studio_trial', 'parceiroStudio', 'partner', 'studio_trial + afiliado ativo = parceiro'],
    [' Creator_Trial ', 'parceiro', 'partner', 'plano com espaço/maiúscula normaliza'],
    ['creator_trial', 'semAfiliado', 'not_partner', 'cortesia sem afiliado (Alfredo) NÃO é parceiro'],
    ['creator_trial', 'afiliadoPendente', 'not_partner', 'afiliado pendente NÃO'],
    ['creator_trial', 'afiliadoSuspenso', 'not_partner', 'afiliado suspenso NÃO'],
    ['creator_trial', 'vencidaNoRelogio', 'not_partner', 'cortesia vencida no relógio (status ainda active) NÃO'],
    ['creator_trial', 'vencidaNoStatus', 'not_partner', 'cortesia expirada no status NÃO'],
    ['creator_trial', 'nivelTrocado', 'not_partner', 'cortesia de outro nível que o plano NÃO'],
    ['creator_trial', 'erroCortesia', 'unknown', 'erro ao ler courtesy_grants = não sei (falha fechada)'],
    ['creator_trial', 'erroAfiliado', 'unknown', 'erro ao ler affiliates = não sei (falha fechada)'],
    ['creator_trial', 'lanca', 'unknown', 'exceção do cliente = não sei'],
    ['creator_trial', 'pendura', 'unknown', 'leitura pendurada passa do teto = não sei'],
  ]
  for (const [plan, mundo, want, label] of casos) {
    try {
      const { r } = await status(plan, MUNDOS[mundo])
      if (r !== want) p.push(`partnerAccess: ${label} → ${r}`)
    } catch (err) { p.push(`partnerAccess lançou (${label}): ${err.message}`) }
  }
  for (const plan of ['free', '', null, 'starter', 'basic', 'pro', 'studio', 'basic_trial', 'autopilot']) {
    const { r, reads } = await status(plan, MUNDOS.parceiro)
    if (r !== 'not_partner' || reads !== 0) p.push(`partnerAccess: plano ${JSON.stringify(plan)} leu o banco (${reads}) ou virou ${r} — só cortesia paga leitura`)
  }
  {
    const { r, reads } = await status('creator_trial', MUNDOS.parceiro, { userId: '' })
    if (r !== 'unknown' || reads !== 0) p.push(`partnerAccess: id vazio → ${r} com ${reads} leitura(s)`)
  }
  // o caminho de produção (sem cliente injetado): a chave de serviço de lib/userFootage; env ausente = não é parceiro
  try {
    ADMIN = fakeAdmin(MUNDOS.parceiro)
    const sim = await comTeto(PA.isActivePartner(UID, 'creator_trial'))
    const leu = ADMIN.reads.slice().sort().join(',')
    ADMIN = fakeAdmin(MUNDOS.semAfiliado)
    const nao = await comTeto(PA.isActivePartner(UID, 'creator_trial'))
    ADMIN = new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.')
    const semEnv = await comTeto(PA.isActivePartner(UID, 'creator_trial'))
    if (sim !== true || leu !== 'affiliates,courtesy_grants' || nao !== false || semEnv !== false) p.push(`isActivePartner (chave de serviço): parceiro=${sim} (${leu}) semAfiliado=${nao} semEnv=${semEnv}`)
  } catch (err) { p.push(`isActivePartner lançou: ${err.message}`) } finally { ADMIN = null }
  if (typeof PA.PARTNER_READ_TIMEOUT_MS !== 'number' || !(PA.PARTNER_READ_TIMEOUT_MS > 0 && PA.PARTNER_READ_TIMEOUT_MS <= 5000)) p.push('teto da leitura do parceiro ausente ou maior que 5 s')
  const pa = src(PARTNER)
  if (!pa.includes(TAG)) p.push('lib/partnerAccess.ts sem a etiqueta ' + TAG)
  if (!pa.includes("import { footageAdminClient } from '@/lib/userFootage'")) p.push('lib/partnerAccess.ts não lê pela chave de serviço (footageAdminClient)')
  if (JSON.stringify([...CL.COURTESY_LEVELS]) !== '["creator_trial","studio_trial"]') p.push(`COURTESY_LEVELS mudou: ${JSON.stringify(CL.COURTESY_LEVELS)}`)

  // ── (2) lib/s25Access.ts ─────────────────────────────────────────────────────────────────────────────────────────
  const s25casos = [
    [{ email: STRANGER, plan: 'creator_trial' }, false, 'trial_plan', 'cortesia sem a flag = a régua de antes'],
    [{ email: STRANGER, plan: 'creator_trial', partner: false }, false, 'trial_plan', 'cortesia com partner:false'],
    [{ email: STRANGER, plan: 'creator_trial', partner: true }, true, 'partner', 'cortesia creator + parceiro usa'],
    [{ email: STRANGER, plan: 'studio_trial', partner: true }, true, 'partner', 'cortesia studio + parceiro usa'],
    [{ email: STRANGER, plan: 'free', partner: true }, false, 'not_paying', 'a flag NÃO abre conta grátis'],
    [{ email: STRANGER, plan: null, partner: true }, false, 'not_paying', 'a flag NÃO abre plano ilegível'],
    [{ email: STRANGER, plan: 'basic_trial', partner: true }, false, 'trial_plan', 'a flag NÃO abre o trial de $1 (não é nível de cortesia)'],
    [{ email: STRANGER, plan: 'starter', partner: true }, true, 'paying_plan', 'pagante segue pagante'],
    [{ email: STRANGER, plan: 'starter' }, true, 'paying_plan', 'pagante sem a flag'],
    [{ email: HOUSE, plan: 'creator_trial', partner: true }, true, 'house', 'a casa decide primeiro'],
    [{ email: STRANGER, plan: 'free' }, false, 'not_paying', 'conta grátis sem a flag'],
  ]
  for (const [conta, allowed, reason, label] of s25casos) {
    const d = A.s25AccessFor(conta)
    if (d.allowed !== allowed || d.reason !== reason) p.push(`s25AccessFor: ${label} → ${JSON.stringify(d)}`)
  }
  for (const plan of Object.keys(mrr.PLAN_PRICE_USD).concat(['free', '', 'qualquer'])) {
    if (A.s25AccessFor({ email: STRANGER, plan }).allowed !== mrr.isPayingPlan(plan)) p.push(`s25AccessFor sem a flag diverge de isPayingPlan em ${plan}`)
  }
  if (A.s25LiberadoNaTela(STRANGER, 'creator_trial', true) !== true || A.s25LiberadoNaTela(STRANGER, 'creator_trial', false) !== false || A.s25LiberadoNaTela(STRANGER, 'creator_trial') !== false || A.s25LiberadoNaTela(STRANGER, 'free', true) !== false) p.push('s25LiberadoNaTela não segue a flag do parceiro')

  // ── (8) dinheiro intocado ───────────────────────────────────────────────────────────────────────────────────────
  for (const plan of ['creator_trial', 'studio_trial']) if (mrr.isPayingPlan(plan) !== false) p.push(`${plan} passou a contar como pagante (isPayingPlan, a régua de pagantes/MRR)`)
  if (cost.creditCostFor('cinematic_s25', true) !== 150) p.push('custo do 2.5 mudou (fica 150 a 60 s)')

  // ── (3) /api/me/credits executado ────────────────────────────────────────────────────────────────────────────────
  const runCredits = async (email, perfil, mundo) => {
    ADMIN = fakeAdmin(mundo ?? {})
    const sb = {
      auth: { getUser: async () => ({ data: { user: { id: UID, email } } }) },
      from: (t) => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: t === 'profiles' ? perfil : null, error: null }) }; return q },
    }
    const l2 = makeLoader(over, {
      ...baseMocks,
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => sb },
      '@/lib/kineo1Access': { readKineo1Access: async () => ({ ok: true, usedFast: false, boughtPack: false }) },
    })
    const body = (await comTeto(l2('@/' + CREDITS).GET())).body
    const reads = ADMIN.reads.length
    ADMIN = null
    return { ...body, reads }
  }
  try {
    const parceiro = await runCredits(STRANGER, { video_credits: 150, plan: 'creator_trial', has_paid: false }, MUNDOS.parceiro)
    const alfredo = await runCredits(STRANGER, { video_credits: 150, plan: 'creator_trial', has_paid: false }, MUNDOS.semAfiliado)
    const falhou = await runCredits(STRANGER, { video_credits: 150, plan: 'creator_trial', has_paid: false }, MUNDOS.erroCortesia)
    const pago = await runCredits(STRANGER, { video_credits: 60, plan: 'starter', has_paid: true }, MUNDOS.parceiro)
    const free = await runCredits(STRANGER, { video_credits: 10, plan: 'free', has_paid: false }, MUNDOS.parceiro)
    const linha = (n, b) => `${n}: s25Liberado=${b.s25Liberado} parceiro=${b.parceiro} leituras=${b.reads}`
    if (parceiro.s25Liberado !== true || parceiro.parceiro !== true) p.push('/api/me/credits ' + linha('parceiro', parceiro))
    if (alfredo.s25Liberado !== false || alfredo.parceiro !== false) p.push('/api/me/credits ' + linha('cortesia sem afiliado', alfredo))
    if (falhou.s25Liberado !== false || falhou.parceiro !== false) p.push('/api/me/credits ' + linha('leitura falhou', falhou))
    if (pago.s25Liberado !== true || pago.parceiro !== false || pago.reads !== 0) p.push('/api/me/credits ' + linha('pagante', pago))
    if (free.s25Liberado !== false || free.parceiro !== false || free.reads !== 0) p.push('/api/me/credits ' + linha('free', free))
    if (parceiro.plan !== 'creator_trial' || parceiro.credits !== 150) p.push('/api/me/credits: plano ou saldo do parceiro mudou na resposta')
  } catch (err) { p.push(`GET /api/me/credits não roda: ${err.message}`) } finally { ADMIN = null }

  // ── (4) /clips: lib/clips/clipServer.ts executado ────────────────────────────────────────────────────────────────
  try {
    const lc = makeLoader(over, { ...baseMocks, ...CLIP_MOCKS }, { NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' })
    const CS = lc('@/' + CLIPS)
    const conta = async (plan, mundo) => {
      ADMIN = fakeAdmin(mundo ?? {})
      const sb = { from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { plan, video_credits: 150, created_at: '2026-10-08T00:00:00Z' }, error: null }) }; return q } }
      const account = await comTeto(CS.loadClipAccount(sb, { id: UID, email: STRANGER }))
      const reads = ADMIN.reads.length
      ADMIN = null
      return { account, reads }
    }
    const par = await conta('creator_trial', MUNDOS.parceiro)
    const alf = await conta('creator_trial', MUNDOS.semAfiliado)
    const err = await conta('creator_trial', MUNDOS.erroAfiliado)
    const free = await conta('free', MUNDOS.parceiro)
    const pago = await conta('starter', MUNDOS.parceiro)
    if (par.account?.partner !== true || alf.account?.partner !== false || err.account?.partner !== false || free.account?.partner !== false || pago.account?.partner !== false) {
      p.push(`loadClipAccount.partner: parceiro=${par.account?.partner} semAfiliado=${alf.account?.partner} erro=${err.account?.partner} free=${free.account?.partner} pago=${pago.account?.partner}`)
    }
    if (free.reads !== 0 || pago.reads !== 0) p.push(`loadClipAccount lê parceiro para quem não é cortesia (free=${free.reads}, pago=${pago.reads})`)
    if (par.account?.plan !== 'creator_trial' || par.account?.balance !== 150) p.push('loadClipAccount: plano/saldo do parceiro mudou')
    const v = (acc) => CS.engineAccessFor(acc)('s25')
    if (!v(par.account).ok) p.push(`/clips: o 2.5 segue trancado para o parceiro → ${JSON.stringify(v(par.account))}`)
    if (v(alf.account).ok || v(alf.account).reason !== 'paid') p.push(`/clips: cortesia sem afiliado não ficou no card trancado → ${JSON.stringify(v(alf.account))}`)
    if (v(err.account).ok) p.push('/clips: leitura que falhou abriu o 2.5')
    if (!v(pago.account).ok || v(free.account).ok) p.push('/clips: pagante/free mudaram no 2.5')
    if (!CS.clipCatalogFor(CS.engineAccessFor(par.account)).some((e) => e.key === 's25') || CS.lockedClipEnginesFor(CS.engineAccessFor(par.account)).some((e) => e.key === 's25')) p.push('/clips: catálogo do parceiro sem o 2.5 livre')
    if (!CS.lockedClipEnginesFor(CS.engineAccessFor(alf.account)).some((e) => e.key === 's25')) p.push('/clips: catálogo da cortesia sem afiliado perdeu o card trancado do 2.5')
    for (const key of Object.keys(lc('@/lib/clips/clipCatalog').CLIP_ENGINES)) {
      if (key === 's25') continue
      const com = JSON.stringify(CS.engineAccessFor({ ...alf.account, partner: true })(key))
      const sem = JSON.stringify(CS.engineAccessFor({ ...alf.account, partner: false })(key))
      if (com !== sem) p.push(`/clips: a flag do parceiro mexeu no motor ${key} (${sem} → ${com})`)
    }
    if (!CS.clipS25Paying({ email: STRANGER, plan: 'creator_trial', partner: true }) || CS.clipS25Paying({ email: STRANGER, plan: 'creator_trial' })) p.push('clipS25Paying não segue a flag do parceiro')
  } catch (err) { p.push(`/clips não roda: ${err.message}`) } finally { ADMIN = null }

  // ── (5) filme do 2.5: a rota (fonte) ─────────────────────────────────────────────────────────────────────────────
  const rc = src(ROUTE)
  if (!hasLine(rc, "import { isActivePartner } from '@/lib/partnerAccess'")) p.push('rota do filme não importa isActivePartner de lib/partnerAccess')
  const iPlan = lineIndex(rc, "const planVal = (profile?.plan ?? 'free') as string")
  const iGate = lineIndex(rc, 'if (wantsS25 && S25_PUBLIC) {')
  const iRead = lineIndex(rc, 'const parceiroS25 = await isActivePartner(user.id, planVal)')
  const iAcc = lineIndex(rc, 'const acessoS25 = s25AccessFor({ email: user.email, plan: planVal, partner: parceiroS25 })')
  const iRefuse = lineIndex(rc, 'if (!acessoS25.allowed) {')
  const iTrial = lineIndex(rc, 'if ((wantsKling || wantsVeo || hollywoodPath) && !isPaidUser && !(TRIAL_UNLOCKS_PREMIUM && trialActive)) {')
  if ([iPlan, iGate, iRead, iAcc, iRefuse, iTrial].some((i) => i < 0)) p.push('rota do filme: âncoras do portão do 2.5 com o parceiro não encontradas')
  else if (!(iPlan < iGate && iGate < iRead && iRead < iAcc && iAcc < iRefuse && iRefuse < iTrial)) p.push('rota do filme: a leitura do parceiro não está DENTRO do portão do 2.5, antes do s25AccessFor')
  else {
    const bloco = rc.slice(iRefuse, iTrial)
    for (const need of [
      "await writeServerEvent({ name: S25_PAID_ONLY_EVENT, userId: user.id, path: '/api/generate-video-cinematic', metadata: { engine: 's25', reason: acessoS25.reason, plan: planVal, has_paid: profile?.has_paid === true, trial_active: trialActive, balance, dry_run: body.dry_run === true, charged: false, version: 's25_abre_20261006' } })",
      "return NextResponse.json({ error: S25_PAID_ONLY_MESSAGE, upsell: 'studio', reason: S25_PAID_ONLY_REASON, engine: 's25', upgradeHref: s25UpgradeHref('server'), balance, retryable: false, charged: false, refunded: false }, { status: 402 })",
    ]) if (!bloco.includes(need)) p.push(`rota do filme: a recusa de quem não é parceiro mudou (falta "${need.slice(0, 60)}…")`)
  }
  if ((rc.match(/isActivePartner\(/g) ?? []).length !== 1) p.push('rota do filme: isActivePartner chamado fora do portão do 2.5 (lê o banco em todo pedido)')
  // trava 8.2: a rota só GANHA linhas, todas marcadas (os guardiões de diff da rota — test-veo-marcado, test-veo-modo-ia,
  // test-estrela-sobretaxa-assinada — tiram as linhas com a marca e comparam o resto com a base, byte a byte)
  const semMarcaNaRota = rc.split('\n').filter((l) => /isActivePartner|parceiroS25|partnerAccess|PARCEIRO-ABRE/.test(l) && !l.includes(TAG))
  if (semMarcaNaRota.length) p.push(`rota do filme: linha do parceiro sem a marca ${TAG}: ${semMarcaNaRota[0].trim().slice(0, 80)}`)
  {
    const iBloco = lineIndex(rc, 'if (wantsS25 && S25_PUBLIC) {')
    const bloco = iBloco >= 0 ? rc.slice(iBloco, rc.indexOf('if (!acessoS25.allowed) {', iBloco)) : ''
    const soltas = bloco.split('\n').slice(1).filter((l) => l.trim() && !l.includes(TAG) && !l.includes('KINEO-S25-ABRE-2026-10-06'))
    if (!bloco || soltas.length) p.push(`rota do filme: linha sem marca dentro do portão do 2.5: ${(soltas[0] ?? '(portão não achado)').trim().slice(0, 80)}`)
  }

  // ── (6) Studio Ads ─────────────────────────────────────────────────────────────────────────────────────────────
  try {
    const la = makeLoader(over, baseMocks)
    const ACC = la('@/' + ADS)
    const SA = la('@/' + ADS_SERVER)
    const now = new Date(NOW)
    const fut = FUTURO
    const R = ACC.adsAccessReason
    const ordem = [
      [R({ plan: 'creator_trial', ads_access_until: null }, STRANGER, now), 'none', 'cortesia sem a flag = none (a régua de antes)'],
      [R({ plan: 'creator_trial', ads_access_until: null }, STRANGER, now, true), 'partner', 'cortesia + parceiro = partner'],
      [R({ plan: 'starter', ads_access_until: null }, STRANGER, now, true), 'subscriber', 'assinante vem antes do parceiro'],
      [R({ plan: 'creator_trial', ads_access_until: fut }, STRANGER, now, true), 'pass', 'passe vem antes do parceiro'],
      [R({ plan: 'creator_trial', ads_access_until: null }, HOUSE, now, true), 'internal', 'a casa vem antes do parceiro'],
      [R({ plan: 'free', ads_access_until: null }, STRANGER, now), 'none', 'free segue none'],
    ]
    for (const [got, want, label] of ordem) if (got !== want) p.push(`adsAccessReason: ${label} → ${got}`)
    const load = async (mundo, perfil, email = STRANGER) => {
      ADMIN = fakeAdmin({ ...mundo, profile: perfil === undefined ? { id: UID, plan: 'creator_trial', ads_access_until: null } : perfil })
      const { reason } = await comTeto(SA.loadAdsAccess(UID, email))
      const reads = ADMIN.reads.filter((t) => t !== 'profiles').length
      ADMIN = null
      return { reason, reads }
    }
    const par = await load(MUNDOS.parceiro)
    const parStudio = await load(MUNDOS.parceiroStudio, { id: UID, plan: 'studio_trial', ads_access_until: null })
    const alf = await load(MUNDOS.semAfiliado)
    const errA = await load(MUNDOS.erroAfiliado)
    const sub = await load(MUNDOS.parceiro, { id: UID, plan: 'starter', ads_access_until: null })
    const free = await load(MUNDOS.parceiro, { id: UID, plan: 'free', ads_access_until: null })
    const passe = await load(MUNDOS.parceiro, { id: UID, plan: 'creator_trial', ads_access_until: fut })
    const casa = await load(MUNDOS.parceiro, undefined, HOUSE)
    const semColuna = await load({ ...MUNDOS.parceiro, semColunaPasse: true })
    const perfilFalhou = await load({ ...MUNDOS.parceiro, profileError: { code: '500', message: 'boom' } })
    const linha = (n, r) => `${n}=${r.reason}/${r.reads}`
    if (par.reason !== 'partner' || parStudio.reason !== 'partner') p.push(`loadAdsAccess: parceiro não entra (${linha('creator', par)}, ${linha('studio', parStudio)})`)
    if (alf.reason !== 'none' || errA.reason !== 'none') p.push(`loadAdsAccess: ${linha('semAfiliado', alf)} ${linha('erro', errA)} (esperado none)`)
    if (sub.reason !== 'subscriber' || sub.reads !== 0 || free.reason !== 'none' || free.reads !== 0) p.push(`loadAdsAccess: assinante/free mudaram ou leram parceiro (${linha('assinante', sub)}, ${linha('free', free)})`)
    if (passe.reason !== 'pass' || passe.reads !== 0 || casa.reason !== 'internal' || casa.reads !== 0) p.push(`loadAdsAccess: passe/casa leram parceiro ou mudaram (${linha('passe', passe)}, ${linha('casa', casa)})`)
    if (semColuna.reason !== 'partner') p.push(`loadAdsAccess sem a coluna do passe (42703) não vê o parceiro → ${semColuna.reason}`)
    if (perfilFalhou.reason !== 'none' || perfilFalhou.reads !== 0) p.push(`loadAdsAccess: perfil ilegível → ${linha('perfil', perfilFalhou)} (esperado none sem ler parceiro)`)
    if (SA.adsGate('partner') !== 'ok' || SA.adsGate('subscriber') !== 'ok' || SA.adsGate('none') !== 'no_access') p.push('adsGate não trata partner como subscriber (passe ligado)')
    const fechado = makeLoader(over, baseMocks, { NEXT_PUBLIC_ADS_PASS_LIVE: '0' })('@/' + ADS_SERVER)
    if (fechado.adsGate('partner') !== 'closed' || fechado.adsGate('subscriber') !== 'closed' || fechado.adsGate('internal') !== 'ok') p.push('adsGate com o interruptor desligado: partner devia ser closed como o assinante')
    const P = la('@/' + PAYWALL)
    const viewer = (reason) => ({ signedIn: true, gate: 'no_access', noSession: false, proof: { reason, trialStatus: null } })
    if (P.adsPaywallVisible({ live: true, from: 'v2', viewer: viewer('partner') }) !== false || P.adsPaywallVisible({ live: true, from: 'v2', viewer: viewer('none') }) !== true) p.push('a oferta da parede aparece para partner (ou sumiu para none)')
    // KINEO-BUSINESS-84-2026-10-09 — re-ancorado: o plano Business (fundador 09/10) entra na lista dos planos que abrem o Studio Ads; o parceiro continua fora dela.
    if (JSON.stringify([...ACC.ADS_SUBSCRIBER_PLANS]) !== JSON.stringify(['starter', 'basic', 'creator', 'pro', 'studio', 'autopilot', 'autopilot_lite', 'business'])) p.push('ADS_SUBSCRIBER_PLANS mudou (o parceiro não entra pela lista de planos)')
  } catch (err) { p.push(`Studio Ads não roda: ${err.message}`) } finally { ADMIN = null }
  const door = src(DOOR)
  const proofFn = door.slice(door.indexOf('async function readPaywallProof('), door.indexOf('/** Who is looking'))
  const iGuard = proofFn.indexOf("if ((await readPartnerStatus(userId, typeof row.plan === 'string' ? row.plan : null)) !== 'not_partner') return null")
  if (iGuard < 0 || iGuard > proofFn.indexOf('reason: adsAccessReason(row, authEmail)')) p.push('app/ads/page.tsx: a prova positiva da parede não exige "not_partner" antes de oferecer plano')
  if (!/type Access = 'pass' \| 'subscriber' \| 'internal' \| 'partner' \| 'none'/.test(src(WIZARD))) p.push('AdsWizardClient: o tipo Access não aceita partner')

  // ── (7) o teto é o saldo ─────────────────────────────────────────────────────────────────────────────────────────
  for (const rel of ['app/api/ads/v2/start/route.ts', 'app/api/ads/v2/retake/route.ts', 'app/api/ads/v2/variations/route.ts', 'app/api/ads/render/route.ts']) {
    const s = src(rel)
    if (/(reason|access)\s*[!=]==\s*'(partner|subscriber|pass|internal)'/.test(s)) p.push(`${rel}: decide algo pelo motivo de acesso (o preço tem de ser o mesmo para todo mundo)`)
  }
  for (const rel of ['app/api/ads/v2/start/route.ts', 'app/api/ads/v2/retake/route.ts', 'app/api/ads/v2/variations/route.ts']) if (!src(rel).includes('chargeAdsV2(admin, { userId: user.id, billingRef')) p.push(`${rel}: geração sem chargeAdsV2`)
  const compose = src(COMPOSE)
  if (!/const PAID_PLANS = new Set\(\[\n\s*'starter', 'starter_trial', 'basic', 'basic_trial',\n\s*'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',\n\s*\]\)\n\s*const isFreePlan = !PAID_PLANS\.has/.test(compose)) p.push('/api/compose: a cortesia deixou de ser plano pago no débito do anúncio clássico (free path)')

  // ── (9) /studio: o tile "Business ad" ───────────────────────────────────────────────────────────────────────────
  const st = src(STUDIO)
  for (const need of [
    'const [parceiro, setParceiro] = useState(false)',
    'if (d?.parceiro === true) setParceiro(true)',
    'const adsTileAccess = plan !== null && ADS_SUBSCRIBER_PLANS.includes(plan) || parceiro',
  ]) if (!st.includes(need)) p.push(`/studio sem "${need}"`)
  const cr = src(CREDITS)
  if (!/estrela: estrelaVisible\(user\.email\), parceiro, internal: s25Visible\(user\.email\)/.test(cr)) p.push('/api/me/credits não devolve a flag `parceiro`')

  // etiqueta em cada arquivo tocado
  for (const rel of [S25, CREDITS, CLIPS, ROUTE, ADS, ADS_SERVER, DOOR, WIZARD, STUDIO]) if (!src(rel).includes(TAG)) p.push(`${rel} sem a etiqueta ${TAG}`)
  return p
}

console.log('TESTE parceiro-abre-tudo — parceiro ativo usa o Seedance 2.5 e o Studio Ads dentro do crédito — 09/10')
const real = await problems()
ok(real.length === 0, '(1–9) régua do parceiro, 2.5 (filme, clipe, tela), Studio Ads, teto no saldo, dinheiro intocado, /studio' + (real.length ? ' → ' + real.join(' | ') : ''))

const mutants = [
  ['M1 cortesia vencida passa (sem o relógio)', PARTNER, "  if (!isCourtesyActive(", "  if (false && !isCourtesyActive("],
  ['M2 afiliado de qualquer status passa', PARTNER, "  return input.affiliate?.status === 'active'", '  return input.affiliate != null'],
  ['M3 falha de leitura vira parceiro (falha aberta)', PARTNER, "    if (grant.error || affiliate.error) return 'unknown'", "    if (grant.error || affiliate.error) return 'partner'"],
  ['M4 lê o banco para qualquer plano', PARTNER, "  if (!partnerReadNeeded(plan)) return 'not_partner'\n", ''],
  ['M5 cortesia de outro nível passa', PARTNER, '  if (!g || norm(g.level) !== plan) return false', '  if (!g) return false'],
  ['M6 sem teto de tempo', PARTNER, '    const lido = await Promise.race([leitura, estouro])', '    const lido = await leitura'],
  ['M7 exceção vira parceiro', PARTNER, "  } catch {\n    return 'unknown'", "  } catch {\n    return 'partner'"],
  ['M8 2.5 ignora o parceiro', S25, "  if (conta.partner === true && isCourtesyLevel(", "  if (false && isCourtesyLevel("],
  ['M9 flag do parceiro abre qualquer plano', S25, "  if (conta.partner === true && isCourtesyLevel(", "  if (conta.partner === true || isCourtesyLevel("],
  ['M10 /api/me/credits sem a flag no 2.5', CREDITS, '  const s25Liberado = s25LiberadoNaTela(user.email, plan, parceiro)', '  const s25Liberado = s25LiberadoNaTela(user.email, plan)'],
  ['M11 /api/me/credits sem `parceiro` na resposta', CREDITS, 'estrela: estrelaVisible(user.email), parceiro, internal:', 'estrela: estrelaVisible(user.email), internal:'],
  ['M12 /clips sem ler o parceiro', CLIPS, '    partner: await isActivePartner(user.id, p.plan ?? null),', '    partner: false,'],
  ['M13 clipe do 2.5 ignora a flag', CLIPS, '  return s25AccessFor({ email: account.email, plan: account.plan, partner: account.partner }).allowed', '  return s25AccessFor({ email: account.email, plan: account.plan }).allowed'],
  ['M14 rota do filme sem o parceiro', ROUTE, 'const acessoS25 = s25AccessFor({ email: user.email, plan: planVal, partner: parceiroS25 })', 'const acessoS25 = s25AccessFor({ email: user.email, plan: planVal })'],
  ['M14b linha do parceiro na rota sem a marca (trava 8.2)', ROUTE, 'falha = não é parceiro [KINEO-PARCEIRO-ABRE-TUDO-2026-10-09]', 'falha = não é parceiro'],
  ['M15 Studio Ads sem o motivo partner', ADS, "  if (partner === true) return 'partner'\n", ''],
  ['M16 parceiro antes do assinante/passe/casa', ADS, "  if (isAdsInternalEmail(authEmail)) return 'internal'\n", "  if (partner === true) return 'partner'\n  if (isAdsInternalEmail(authEmail)) return 'internal'\n"],
  ['M17 loadAdsAccess não lê o parceiro', ADS_SERVER, '  return adsAccessReason(row, authEmail, undefined, await isActivePartner(userId, row.plan))', '  return adsAccessReason(row, authEmail)'],
  ['M18 adsGate barra o parceiro', ADS_SERVER, "  if (reason === 'none') return 'no_access'", "  if (reason === 'none' || reason === 'partner') return 'no_access'"],
  ['M19 a parede vende plano ao parceiro', DOOR, "    if ((await readPartnerStatus(userId, typeof row.plan === 'string' ? row.plan : null)) !== 'not_partner') return null\n", ''],
  ['M20 tile do /studio ignora o parceiro', STUDIO, 'const adsTileAccess = plan !== null && ADS_SUBSCRIBER_PLANS.includes(plan) || parceiro', 'const adsTileAccess = plan !== null && ADS_SUBSCRIBER_PLANS.includes(plan)'],
  ['M21 a cortesia vira pagante no MRR', 'app/api/admin/_shared/mrr.ts', 'export function isPayingPlan(plan: string | null | undefined): boolean {\n  return isPaidPlan(plan) && !isTrialPlan(plan)', 'export function isPayingPlan(plan: string | null | undefined): boolean {\n  return isPaidPlan(plan)'],
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
