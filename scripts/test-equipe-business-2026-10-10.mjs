// KINEO-EQUIPE-BUSINESS-2026-10-10 — guardião da EQUIPE do plano Business no Studio Ads (decisão do fundador, 10/10/2026).
//
// Prova, EXECUTANDO os módulos pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs) com um banco
// de mentira — o resolvedor (lib/ads/workspace.ts), loadAdsAccess (lib/ads/serverAccess.ts), a rota da equipe
// (/api/ads/team), o /start e o POST do /orders — e lendo o resto (readFileSync):
//   (1) teto: BUSINESS_SEATS = 3; o 4º convite vivo é recusado (409 seats_full); e-mail repetido também;
//   (2) o link do convite: assinado, preso ao convite E ao dono que convidou, vence em 7 dias, uso ÚNICO (o 2º aceite
//       recusa), token forjado / de outro dono / de outro segredo recusado, e-mail diferente do convidado recusado;
//   (3) o membro resolve para o DONO: no /start a cobrança (chargeAdsV2), o saldo, a trava e o pedido são do dono; no
//       /orders o pedido nasce com user_id = dono e created_by = membro; rastro ads_order_by_member com o membro;
//   (4) o dono deixou de ser 'business' → o membro perde o acesso NA HORA (próxima requisição), sem cobrança;
//   (5) fora do Studio Ads nada muda: loadAdsAccess sem { workspace: true } é sempre a conta pessoal (filmes, clipes,
//       imagens, v1); só as telas/rotas do Ads v2 pedem o workspace (varredura de app/ e lib/), e /api/footage só no
//       purpose 'ads'; quem não é membro não entra em pedido de outro workspace;
//   (6) em toda rota /api/ads/v2/* e /api/ads/brand-kit, user.id só sobra onde é do ATOR (moderação, negação, created_by,
//       rastro do membro) — todo dado e dinheiro passa por uid = dono;
//   (7) eventos novos só-servidor; migration com RLS ligado e sem policy; nada de e-mail mandado pelo código;
//   (8) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo readFileSync + transpile; nenhum import com alias @/ no guardião.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); return src.split(de).join(para) }

const F = {
  team: 'lib/ads/team.ts',
  ws: 'lib/ads/workspace.ts',
  invite: 'lib/ads/teamInvite.ts',
  access: 'lib/ads/serverAccess.ts',
  teamRoute: 'app/api/ads/team/route.ts',
  start: 'app/api/ads/v2/start/route.ts',
  orders: 'app/api/ads/v2/orders/route.ts',
  footage: 'app/api/footage/route.ts',
  page: 'app/(dashboard)/ads/v2/page.tsx',
  door: 'app/ads/page.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  events: 'lib/ads/events.ts',
  sink: 'app/api/events/route.ts',
  migration: 'migrations_pending/2026-10-10_equipe_business.sql',
  biz: 'lib/businessPlan.ts',
  bizPage: 'app/business/page.tsx',
}
const V2_ROUTES = ['start', 'status', 'orders', 'plan', 'research', 'retake', 'variations', 'link-import'].map((n) => `app/api/ads/v2/${n}/route.ts`)
const WS_ROUTES = [...V2_ROUTES, 'app/api/ads/brand-kit/route.ts']

const OWNER = '0a000000-0000-4000-8000-000000000001'
const MEMBER = '0b000000-0000-4000-8000-000000000002'
const STRANGER = '0c000000-0000-4000-8000-000000000003'
const OWNER2 = '0d000000-0000-4000-8000-000000000004'
const ORDER = '0e000000-0000-4000-8000-000000000005'
const SECRET = 'segredo-de-teste-equipe'

// ── banco de mentira (o suficiente do PostgREST que as rotas usam) + os índices únicos da migration ──────────────────
const live = (x) => x.status === 'pending' || x.status === 'active'
function teamConflict(r, others) {
  return others.some((o) => o.id !== r.id && (
    (live(o) && live(r) && o.owner_id === r.owner_id && (Number(o.seat) === Number(r.seat) || o.email === r.email)) ||
    (o.status === 'active' && r.status === 'active' && o.member_id && o.member_id === r.member_id)))
}
function makeDb(seed = {}, opts = {}) {
  const tables = {}
  for (const [k, rows] of Object.entries(seed)) tables[k] = rows.map(clone)
  const missing = new Set(opts.missing ?? [])
  const reads = []
  function from(name) {
    const q = { op: 'select', filters: [], patch: null, rows: null, limit: null, count: false }
    const exec = (mode) => {
      reads.push(name)
      if (missing.has(name)) return { data: null, error: { code: '42P01', message: 'missing' } }
      const t = (tables[name] ??= [])
      if (q.op === 'insert' || q.op === 'upsert') {
        const rows = (Array.isArray(q.rows) ? q.rows : [q.rows]).map((r) => ({ id: r.id ?? crypto.randomUUID(), ...clone(r) }))
        for (const r of rows) if (name === 'ads_team_members' && teamConflict(r, t)) return { data: null, error: { code: '23505', message: 'unique' } }
        for (const r of rows) { if (q.op === 'upsert' && t.some((x) => x.id === r.id)) continue; t.push(r) }
        return { data: mode === 'maybeSingle' || mode === 'single' ? clone(rows[0]) : clone(rows), error: null }
      }
      let hit = t.filter((r) => q.filters.every((f) => f(r)))
      if (q.op === 'update') {
        for (const r of hit) if (name === 'ads_team_members' && teamConflict({ ...r, ...q.patch }, t.filter((x) => x !== r))) return { data: null, error: { code: '23505', message: 'unique' } }
        for (const r of hit) Object.assign(r, clone(q.patch))
      }
      if (q.limit !== null) hit = hit.slice(0, q.limit)
      if (q.count) return { data: null, count: hit.length, error: null }
      if (mode === 'maybeSingle' || mode === 'single') return { data: hit.length ? clone(hit[0]) : null, error: null }
      return { data: clone(hit), error: null }
    }
    const api = {
      select(_c, o) { if (o?.count) q.count = true; return api },
      eq(k, v) { q.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, vs) { q.filters.push((r) => vs.map(String).includes(String(r[k]))); return api },
      is(k, v) { q.filters.push((r) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)); return api },
      lt(k, v) { q.filters.push((r) => r[k] < v); return api },
      gt(k, v) { q.filters.push((r) => r[k] > v); return api },
      gte(k, v) { q.filters.push((r) => r[k] >= v); return api },
      like(k, p) { q.filters.push((r) => typeof r[k] === 'string' && r[k].startsWith(String(p).replace(/%$/, ''))); return api },
      order() { return api },
      limit(n) { q.limit = n; return api },
      insert(rows) { q.op = 'insert'; q.rows = rows; return api },
      upsert(rows) { q.op = 'upsert'; q.rows = rows; return api },
      update(p) { q.op = 'update'; q.patch = p; return api },
      maybeSingle() { return Promise.resolve(exec('maybeSingle')) },
      single() { return Promise.resolve(exec('single')) },
      then(res, rej) { return Promise.resolve(exec('many')).then(res, rej) },
    }
    return api
  }
  return { from, tables, reads }
}
const futuro = (dias = 7) => new Date(Date.now() + dias * 86400_000).toISOString()
const mundo = (over = {}) => ({
  profiles: [
    { id: OWNER, plan: 'business', ads_access_until: null, video_credits: 100, email: 'dona@empresa.test' },
    { id: MEMBER, plan: 'free', ads_access_until: null, video_credits: 0, email: 'colega@empresa.test' },
    { id: STRANGER, plan: 'free', ads_access_until: null, video_credits: 0, email: 'estranho@fora.test' },
    { id: OWNER2, plan: 'business', ads_access_until: null, video_credits: 50, email: 'outra@empresa.test' },
    ...(over.profiles ?? []),
  ],
  ads_team_members: over.team ?? [],
  ads_brand_kits: over.kits ?? [{ user_id: OWNER, business: 'Lume Cosméticos' }],
  ads_v2_orders: over.orders ?? [],
  ads_v2_shots: [],
  events: [],
})
const ATIVO = { id: '0f000000-0000-4000-8000-000000000006', owner_id: OWNER, email: 'colega@empresa.test', seat: 1, status: 'active', member_id: MEMBER, expires_at: futuro(), token_hash: null }

function loaderFor(db, { over = {}, mocks = {}, env = {} } = {}) {
  return createOfflineLoader({
    env: { SUPABASE_SERVICE_ROLE_KEY: SECRET, ...env },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
    mocks: {
      'next/server': { NextResponse: { json: (b, init) => ({ status: init?.status ?? 200, body: b }) } },
      '@/lib/userFootage': { footageAdminClient: () => db, FOOTAGE_PUBLIC_PREFIX: () => 'https://x.test/storage/v1/object/public/user-footage/' },
      '@/lib/partnerAccess': { isActivePartner: async () => false },
      '@/lib/mp4Duration': { probeMp4DurationSeconds: () => null },
      ...mocks,
    },
  })
}
const authAs = (id, email) => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: id ? { id, email } : null } }) } }) })

// ═══ 1. o módulo puro da equipe ═══════════════════════════════════════════════════════════════════════════════════════
const T = loaderFor(makeDb())(F.team)
ok(T.BUSINESS_SEATS === 3 && T.ADS_TEAM_PLAN === 'business' && T.ADS_TEAM_TABLE === 'ads_team_members' && T.ADS_TEAM_INVITE_DAYS === 7, '1a BUSINESS_SEATS = 3, só o plano business, tabela ads_team_members, convite de 7 dias')
ok(T.nextFreeSeat([]) === 1 && T.nextFreeSeat([1, 3]) === 2 && T.nextFreeSeat([1, 2, 3]) === null && T.nextFreeSeat(['1', '2']) === 3, '1b vagas: a primeira livre de 1..3; cheia = null')
ok(T.isTeamOwnerPlan('business') && T.isTeamOwnerPlan(' Business ') && !T.isTeamOwnerPlan('pro') && !T.isTeamOwnerPlan('business_trial') && !T.isTeamOwnerPlan(null), '1c só "business" abre equipe (nem pro, nem trial)')
ok(T.normalizeTeamEmail(' Ana@Empresa.COM ') === 'ana@empresa.com' && T.normalizeTeamEmail('sem-arroba') === null && T.normalizeTeamEmail(42) === null, '1d e-mail normalizado; lixo = null')
ok(T.inviteExpired(new Date(Date.now() - 1000).toISOString()) && !T.inviteExpired(futuro()) && T.inviteExpired('lixo'), '1e convite vencido (data ilegível = vencido)')
ok(Object.values(T.ADS_TEAM_EVENTS).join(',') === 'team_invite_created,team_member_joined,team_member_removed,ads_order_by_member', '1f os 4 eventos da equipe')

// ═══ 2. o token do convite ═══════════════════════════════════════════════════════════════════════════════════════════
function tokenOk(src) {
  const I = loaderFor(makeDb(), { over: src ? { [F.invite]: src } : {} })(F.invite)
  const now = Math.floor(Date.now() / 1000)
  const inv = crypto.randomUUID()
  const t = I.signTeamInviteToken({ inviteId: inv, ownerId: OWNER, expiresAtSeconds: now + 3600, secret: SECRET })
  const v = I.verifyTeamInviteToken(t, { secret: SECRET, nowSeconds: now })
  const parts = t.split('.')
  const outroDono = [parts[0], parts[1], OWNER2, parts[3], parts[4]].join('.')
  const vencido = I.signTeamInviteToken({ inviteId: inv, ownerId: OWNER, expiresAtSeconds: now - 1, secret: SECRET })
  const outroSegredo = I.signTeamInviteToken({ inviteId: inv, ownerId: OWNER, expiresAtSeconds: now + 3600, secret: 'outro' })
  return v.ok === true && v.inviteId === inv && v.ownerId === OWNER &&
    I.verifyTeamInviteToken(outroDono, { secret: SECRET, nowSeconds: now }).reason === 'bad_signature' &&
    I.verifyTeamInviteToken(vencido, { secret: SECRET, nowSeconds: now }).reason === 'expired' &&
    I.verifyTeamInviteToken(outroSegredo, { secret: SECRET, nowSeconds: now }).reason === 'bad_signature' &&
    I.verifyTeamInviteToken('t1.x.y.z.w', { secret: SECRET, nowSeconds: now }).reason === 'malformed' &&
    I.verifyTeamInviteToken(t, { secret: '', nowSeconds: now }).ok === false &&
    I.teamTokenHash(t) === crypto.createHash('sha256').update(t).digest('hex') && !I.teamTokenHash(t).includes(parts[4])
}
ok(tokenOk(), '2a token assinado: preso ao convite E ao dono (trocar o dono quebra a assinatura), vence, outro segredo/forjado/malformado recusados; o banco guarda só o hash')
ok(!/node:crypto/.test(code(read(F.ws))) && /from 'node:crypto'/.test(read(F.invite)), '2b node:crypto mora em lib/ads/teamInvite.ts, fora do resolvedor que toda rota do Ads carrega')

// ═══ 3. o resolvedor e loadAdsAccess executados ═══════════════════════════════════════════════════════════════════════
async function acesso(seed, userId, email, opts, over = {}) {
  const db = makeDb(seed)
  const SA = loaderFor(db, { over })(F.access)
  const r = await SA.loadAdsAccess(userId, email, opts)
  return { ...r, admin: undefined, reads: db.reads }
}
async function resolverOk(over = {}) {
  const m = await acesso(mundo({ team: [ATIVO] }), MEMBER, 'colega@empresa.test', { workspace: true }, over)
  const semOpcao = await acesso(mundo({ team: [ATIVO] }), MEMBER, 'colega@empresa.test', undefined, over)
  const dono = await acesso(mundo({ team: [ATIVO] }), OWNER, 'dona@empresa.test', { workspace: true }, over)
  const caiu = await acesso({ ...mundo({ team: [ATIVO] }), profiles: mundo().profiles.map((p) => (p.id === OWNER ? { ...p, plan: 'pro' } : p)) }, MEMBER, 'colega@empresa.test', { workspace: true }, over)
  const semTabela = await (async () => {
    const db = makeDb(mundo({ team: [ATIVO] }), { missing: ['ads_team_members'] })
    const r = await loaderFor(db, { over })(F.access).loadAdsAccess(MEMBER, 'colega@empresa.test', { workspace: true })
    return r
  })()
  const removido = await acesso(mundo({ team: [{ ...ATIVO, status: 'removed' }] }), MEMBER, 'colega@empresa.test', { workspace: true }, over)
  const membroBusiness = await acesso({ ...mundo({ team: [ATIVO] }), profiles: mundo().profiles.map((p) => (p.id === MEMBER ? { ...p, plan: 'business' } : p)) }, MEMBER, 'colega@empresa.test', { workspace: true }, over)
  const duas = await acesso(mundo({ team: [ATIVO, { ...ATIVO, id: crypto.randomUUID(), owner_id: OWNER2 }] }), MEMBER, 'colega@empresa.test', { workspace: true }, over)
  return {
    membro: m.role === 'member' && m.ownerId === OWNER && m.actorId === MEMBER && m.reason === 'subscriber' && m.ownerPlan === 'business',
    pessoalSemOpcao: semOpcao.role === 'owner' && semOpcao.ownerId === MEMBER && semOpcao.reason === 'none' && !semOpcao.reads.includes('ads_team_members'),
    dono: dono.role === 'owner' && dono.ownerId === OWNER && dono.reason === 'subscriber' && !dono.reads.includes('ads_team_members'),
    downgrade: caiu.role === 'owner' && caiu.ownerId === MEMBER && caiu.reason === 'none',
    semTabela: semTabela.role === 'owner' && semTabela.ownerId === MEMBER && semTabela.reason === 'none',
    removido: removido.role === 'owner' && removido.ownerId === MEMBER,
    membroBusiness: membroBusiness.role === 'owner' && membroBusiness.ownerId === MEMBER,
    duas: duas.role === 'owner' && duas.ownerId === MEMBER,
  }
}
const R0 = await resolverOk()
ok(R0.membro, '3a membro ativo de um Business resolve para o DONO (ownerId = dono, actorId = membro, acesso subscriber do plano do dono)')
ok(R0.pessoalSemOpcao, '3b sem { workspace: true } (filmes, clipes, imagens, v1) a conta é SEMPRE a pessoal — nem lê a tabela da equipe')
ok(R0.dono, '3c o dono do Business é dono do próprio workspace (não lê equipe)')
ok(R0.downgrade, '3d dono deixou de ser business → o membro volta a ser só ele (free = sem acesso) na hora')
ok(R0.semTabela && R0.removido && R0.duas, '3e tabela ausente, membro removido, ou duas equipes ativas = conta pessoal (falha fechada)')
ok(R0.membroBusiness, '3f quem tem o próprio Business nunca vira membro de outro')

// ═══ 4. a rota da equipe executada ════════════════════════════════════════════════════════════════════════════════════
function teamRoute(db, who, over = {}) {
  const events = []
  const emails = { [OWNER]: 'dona@empresa.test', [MEMBER]: 'colega@empresa.test', [STRANGER]: 'estranho@fora.test', [OWNER2]: 'outra@empresa.test' }
  const R = loaderFor(db, { over, mocks: { '@/lib/supabase/server': authAs(who, emails[who]), '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } } } })(F.teamRoute)
  const post = (body) => R.POST({ json: async () => body })
  return { R, post, events, get: () => R.GET() }
}
const tokenDe = (res) => decodeURIComponent(String(res.body.path ?? '').split('token=')[1] ?? '')
async function equipeOk(over = {}) {
  const out = {}
  const db = makeDb(mundo())
  const dona = teamRoute(db, OWNER, over)
  const convites = []
  for (const e of ['colega@empresa.test', 'b@empresa.test', 'c@empresa.test']) convites.push(await dona.post({ action: 'invite', email: e }))
  const quarto = await dona.post({ action: 'invite', email: 'd@empresa.test' })
  const repetido = await dona.post({ action: 'invite', email: 'B@empresa.test' })
  out.teto = convites.every((r) => r.status === 201 && r.body.path.startsWith('/ads/team/join?token=')) && quarto.status === 409 && quarto.body.error === 'seats_full' &&
    db.tables.ads_team_members.filter(live).length === 3 && new Set(db.tables.ads_team_members.map((r) => r.seat)).size === 3
  out.repetido = repetido.status === 409 && repetido.body.error === 'already_invited'
  const tok = tokenDe(convites[0])
  const linha = db.tables.ads_team_members.find((r) => r.email === 'colega@empresa.test')
  out.hash = linha && linha.token_hash === crypto.createHash('sha256').update(tok).digest('hex') && !JSON.stringify(db.tables.ads_team_members).includes(tok)
  out.eventoConvite = dona.events.filter((e) => e.name === 'team_invite_created').length === 3 && dona.events.every((e) => !JSON.stringify(e).includes('colega@'))
  // aceite: estranho com o link certo (e-mail diferente) é recusado; o convidado entra; o 2º uso é recusado
  const estranho = await teamRoute(db, STRANGER, over).post({ action: 'accept', token: tok })
  const colega = teamRoute(db, MEMBER, over)
  const entrou = await colega.post({ action: 'accept', token: tok })
  const deNovo = await colega.post({ action: 'accept', token: tok })
  out.email = estranho.status === 403 && estranho.body.error === 'email_mismatch'
  out.entrou = entrou.status === 200 && db.tables.ads_team_members.find((r) => r.id === linha.id)?.status === 'active' && db.tables.ads_team_members.find((r) => r.id === linha.id)?.member_id === MEMBER &&
    colega.events.some((e) => e.name === 'team_member_joined' && e.userId === OWNER && e.metadata.member_id === MEMBER)
  out.usoUnico = deNovo.status === 410 && db.tables.ads_team_members.find((r) => r.id === linha.id)?.token_hash === null
  // forjado: assinado com outro segredo / outro dono no token / dono que não convidou
  const now = Math.floor(Date.now() / 1000)
  const I = loaderFor(db)(F.invite)
  const linhaB = db.tables.ads_team_members.find((r) => r.email === 'b@empresa.test')
  const forjado = I.signTeamInviteToken({ inviteId: linhaB.id, ownerId: OWNER, expiresAtSeconds: now + 3600, secret: 'chute' })
  const outroDono = I.signTeamInviteToken({ inviteId: linhaB.id, ownerId: OWNER2, expiresAtSeconds: now + 3600, secret: SECRET })
  const r1 = await teamRoute(db, STRANGER, over).post({ action: 'accept', token: forjado })
  const r2 = await teamRoute(db, STRANGER, over).post({ action: 'accept', token: outroDono })
  // token com assinatura VÁLIDA para o convite B e o dono certo, mas que não é o link emitido (o hash gravado não bate).
  const trocado = I.signTeamInviteToken({ inviteId: linhaB.id, ownerId: OWNER, expiresAtSeconds: now + 999, secret: SECRET })
  const r3 = await teamRoute(db, STRANGER, over).post({ action: 'accept', token: trocado })
  out.forjado = r1.status === 400 && r2.status !== 200 && r3.status !== 200 && db.tables.ads_team_members.filter((r) => r.status === 'active').length === 1
  // vencido
  const dbV = makeDb(mundo())
  const donaV = teamRoute(dbV, OWNER, over)
  const cv = await donaV.post({ action: 'invite', email: 'colega@empresa.test' })
  dbV.tables.ads_team_members[0].expires_at = new Date(Date.now() - 1000).toISOString()
  const tv = tokenDe(cv)
  const aceV = await teamRoute(dbV, MEMBER, over).post({ action: 'accept', token: tv })
  out.vencido = aceV.status === 410 && dbV.tables.ads_team_members[0].status === 'pending'
  // dono que caiu do business não convida e o convite dele não abre
  const dbC = makeDb(mundo())
  const cc = await teamRoute(dbC, OWNER, over).post({ action: 'invite', email: 'colega@empresa.test' })
  dbC.tables.profiles.find((p) => p.id === OWNER).plan = 'pro'
  const aceC = await teamRoute(dbC, MEMBER, over).post({ action: 'accept', token: tokenDe(cc) })
  const naoBiz = await teamRoute(dbC, OWNER, over).post({ action: 'invite', email: 'x@empresa.test' })
  out.donoCaiu = aceC.status === 409 && aceC.body.error === 'owner_not_business' && naoBiz.status === 403 && naoBiz.body.error === 'business_only'
  // remover: o dono tira; o acesso do membro cai (resolvedor)
  const rem = await dona.post({ action: 'remove', row_id: linha.id })
  const SA = loaderFor(db, { over })(F.access)
  const depois = await SA.loadAdsAccess(MEMBER, 'colega@empresa.test', { workspace: true })
  out.remover = rem.status === 200 && depois.role === 'owner' && depois.ownerId === MEMBER && dona.events.some((e) => e.name === 'team_member_removed')
  // GET: dono vê a lista; membro vê o saldo DO DONO
  const dbG = makeDb(mundo({ team: [ATIVO] }))
  const gm = await teamRoute(dbG, MEMBER, over).get()
  const go = await teamRoute(dbG, OWNER, over).get()
  out.get = gm.status === 200 && gm.body.role === 'member' && gm.body.credits === 100 && gm.body.owner_label === 'Lume Cosméticos' && !('team' in gm.body) &&
    go.status === 200 && go.body.role === 'owner' && go.body.business === true && go.body.team.length === 1 && go.body.seats === 3 && !JSON.stringify(go.body).includes('token')
  return out
}
const E0 = await equipeOk()
ok(E0.teto && E0.repetido, '4a teto: 3 convites vivos em 3 vagas distintas; o 4º = 409 seats_full; e-mail repetido = 409 already_invited')
ok(E0.hash && E0.eventoConvite, '4b o banco guarda só o sha256 do token; team_invite_created sem o e-mail inteiro no evento')
ok(E0.email, '4c link aberto por OUTRA conta (e-mail diferente do convidado) = 403 email_mismatch')
ok(E0.entrou, '4d o convidado entra: linha active com member_id; team_member_joined no dono')
ok(E0.usoUnico, '4e uso ÚNICO: o mesmo link de novo = 410 e o hash foi apagado no aceite')
ok(E0.forjado, '4f token forjado (outro segredo), de outro dono, ou de outro convite = recusado; nenhum membro a mais')
ok(E0.vencido, '4g convite vencido não abre (410) e segue pendente')
ok(E0.donoCaiu, '4h dono fora do business: não convida (403) e o convite dele não abre (409 owner_not_business)')
ok(E0.remover, '4i dono remove o membro → o resolvedor devolve a conta pessoal na hora')
ok(E0.get, '4j GET: membro vê o saldo e o nome DO DONO (sem lista); dono vê a lista e as vagas, nunca token')

// ═══ 5. o /start e o /orders executados: o dono paga, o dono guarda ═══════════════════════════════════════════════════
const PLANO = { shots: [{ idx: 0, kind: 'product', source: 'client_photo', cutSeconds: 3, prompt: 'p' }], narration: 'Olá', overlays: [], totalSeconds: 15 }
const pedido = (dono) => ({ id: ORDER, user_id: dono, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', brief: {}, language: 'pt', narration: true, card_url: 'https://x.test/card.png', plan: clone(PLANO), billing_ref: null, credits_charged: 0, generation_id: null, video_id: null })
function startRoute(db, who, over = {}) {
  const events = []
  const charges = []
  const emails = { [OWNER]: 'dona@empresa.test', [MEMBER]: 'colega@empresa.test', [STRANGER]: 'estranho@fora.test' }
  const R = loaderFor(db, {
    over,
    mocks: {
      '@/lib/supabase/server': authAs(who, emails[who]),
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
      '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
      '@/lib/ads/v2Access': { adsV2Visible: () => true },
      '@/lib/ads/v2Tiers': { adsV2Credits: () => 41, estimateAdUsd: () => ({ totalUsd: 2 }) },
      '@/lib/ads/v2Billing': {
        adsV2BillingRef: (o, g) => `adsv2-${o}-${g}`,
        chargeAdsV2: async (_a, args) => {
          charges.push(args)
          const p = db.tables.profiles.find((x) => x.id === args.userId)
          if (!p || p.video_credits < args.cost) return { ok: false, code: 'out_of_credits', status: 402, balance: p?.video_credits ?? 0, debitPossible: false }
          p.video_credits -= args.cost
          return { ok: true, balance: p.video_credits }
        },
        failAdsV2Order: async () => ({ won: true }),
      },
      '@/lib/ads/v2Advance': {
        adsV2View: (o) => ({ order_id: o.id, status: o.status }),
        buildInitialShotRows: (orderId) => [{ order_id: orderId, idx: 0, attempt: 1, kind: 'product', status: 'pending' }],
        dispatchAdsV2Shots: async () => 0,
        loadAdsV2Order: async (_a, id, uid) => { const o = db.tables.ads_v2_orders.find((x) => x.id === id); return { order: o && (!uid || o.user_id === uid) ? clone(o) : null, error: null } },
        loadAdsV2Shots: async () => [],
      },
    },
  })(F.start)
  return { post: (body) => R.POST({ json: async () => body }), events, charges }
}
async function startOk(over = {}) {
  const out = {}
  const db = makeDb(mundo({ team: [ATIVO], orders: [pedido(OWNER)] }))
  const s = startRoute(db, MEMBER, over)
  const r = await s.post({ order_id: ORDER })
  const o = db.tables.ads_v2_orders[0]
  out.donoPaga = r.status === 202 && s.charges.length === 1 && s.charges[0].userId === OWNER && s.charges[0].cost === 41 &&
    db.tables.profiles.find((p) => p.id === OWNER).video_credits === 59 && db.tables.profiles.find((p) => p.id === MEMBER).video_credits === 0 &&
    o.user_id === OWNER && o.status === 'generating'
  out.rastro = s.events.some((e) => e.name === 'ads_order_by_member' && e.userId === MEMBER && e.metadata.owner_id === OWNER && e.metadata.action === 'start') &&
    s.events.some((e) => e.name === 'ads_v2_started' && e.userId === OWNER)
  // o dono caiu do business: o membro é barrado ANTES de qualquer cobrança
  const dbC = makeDb({ ...mundo({ team: [ATIVO], orders: [pedido(OWNER)] }), profiles: mundo().profiles.map((p) => (p.id === OWNER ? { ...p, plan: 'pro' } : p)) })
  const sc = startRoute(dbC, MEMBER, over)
  const rc = await sc.post({ order_id: ORDER })
  // (sem o Business do dono, o membro volta a ser a conta free dele: 403, ou 404 se a amostra grátis dele abrir — o pedido do dono não é dele)
  out.downgrade = (rc.status === 403 || rc.status === 404) && sc.charges.length === 0 && dbC.tables.ads_v2_orders[0].status === 'planned' && !sc.events.some((e) => e.name === 'ads_order_by_member')
  // estranho com plano próprio não alcança o pedido de outro workspace
  const dbS = makeDb({ ...mundo({ orders: [pedido(OWNER)] }), profiles: mundo().profiles.map((p) => (p.id === STRANGER ? { ...p, plan: 'starter', video_credits: 100 } : p)) })
  const ss = startRoute(dbS, STRANGER, over)
  const rs = await ss.post({ order_id: ORDER })
  out.estranho = rs.status === 404 && ss.charges.length === 0
  // o dono, sem equipe nenhuma, segue igual (paga ele, nenhum rastro de membro)
  const dbD = makeDb(mundo({ orders: [pedido(OWNER)] }))
  const sd = startRoute(dbD, OWNER, over)
  const rd = await sd.post({ order_id: ORDER })
  out.dono = rd.status === 202 && sd.charges[0]?.userId === OWNER && !sd.events.some((e) => e.name === 'ads_order_by_member')
  return out
}
const S0 = await startOk()
ok(S0.donoPaga, '5a /start do MEMBRO: chargeAdsV2 no DONO (saldo do dono cai 41, o do membro nem é tocado), trava e pedido do dono')
ok(S0.rastro, '5b rastro: ads_order_by_member com o membro (owner_id = dono) e ads_v2_started no dono')
ok(S0.downgrade, '5c dono caiu do business → o membro é barrado (403/404) antes de qualquer cobrança e sem tocar o pedido do dono')
ok(S0.estranho, '5d conta de fora (mesmo com plano próprio) não alcança pedido de outro workspace (404, nada cobrado)')
ok(S0.dono, '5e o dono sem equipe: o /start de sempre (paga ele, sem rastro de membro)')

function ordersRoute(db, who, over = {}) {
  const events = []
  const emails = { [OWNER]: 'dona@empresa.test', [MEMBER]: 'colega@empresa.test' }
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const R = loaderFor(db, {
    over,
    mocks: {
      '@/lib/supabase/server': authAs(who, emails[who]),
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
      '@/lib/ads/v2Access': { adsV2Visible: () => true },
      '@/lib/ads/v2Tiers': { adsV2Credits: () => 41 },
      '@/lib/ads/v2Contract': {
        isUuid: (x) => typeof x === 'string' && UUID.test(x),
        sanitizeCreateOrderBody: () => ({ ok: true, value: { tier: 'commercial', seconds: 15, sector: 'store', sentence: 'Loja X vende sabonete', link: null, language: 'pt', narration: true, mode: 'full' } }),
        sanitizeAssetsBody: () => ({ ok: true, value: { logo_footage_id: null, card_footage_id: null, photos: [] } }),
        sanitizePatchBody: () => ({ ok: false, error: 'x' }),
      },
      '@/lib/ads/v2Advance': { adsV2View: () => ({}), loadAdsV2Order: async () => ({ order: null, error: null }), loadAdsV2Shots: async () => [] },
    },
  })(F.orders)
  return { post: () => R.POST({ json: async () => ({}) }), events }
}
async function ordersOk(over = {}) {
  const db = makeDb(mundo({ team: [ATIVO] }))
  const m = ordersRoute(db, MEMBER, over)
  const r = await m.post()
  const row = db.tables.ads_v2_orders[0]
  const dbD = makeDb(mundo())
  const d = ordersRoute(dbD, OWNER, over)
  const rd = await d.post()
  return r.status === 201 && row?.user_id === OWNER && row?.created_by === MEMBER &&
    m.events.some((e) => e.name === 'ads_order_by_member' && e.userId === MEMBER && e.metadata.action === 'create' && e.metadata.owner_id === OWNER) &&
    m.events.some((e) => e.name === 'ads_v2_order_created' && e.userId === OWNER) &&
    rd.status === 201 && dbD.tables.ads_v2_orders[0]?.user_id === OWNER && !('created_by' in dbD.tables.ads_v2_orders[0])
}
ok(await ordersOk(), '5f /orders do MEMBRO: o pedido nasce do DONO (user_id) com created_by = membro; o do dono não toca a coluna nova')

// ═══ 6. fiação: todas as rotas do Ads v2 pedem o workspace; user.id só sobra onde é do ATOR ══════════════════════════
const ATOR_OK = [
  /loadAdsAccess\(user\.id, user\.email, \{ workspace: true \}\)/,
  /const uid: string = (ws|access)\.ownerId \?\? user\.id/,
  /name: 'ads_access_denied', userId: user\.id/,
  /moderateContent\(\{ surface: '[a-z_]+', stage: '[a-z]+', userId: user\.id/,
  /created_by: user\.id/,
  /name: 'ads_order_by_member', userId: user\.id/,
]
const fiacao = (srcOf) => {
  const p = []
  for (const rel of WS_ROUTES) {
    const s = code(srcOf(rel))
    if (!/loadAdsAccess\(user\.id, user\.email, \{ workspace: true \}\)/.test(s)) p.push(`${rel}: sem { workspace: true }`)
    if (!/const uid: string = (ws|access)\.ownerId \?\? user\.id/.test(s)) p.push(`${rel}: sem uid do dono`)
    for (const l of s.split('\n')) if (l.includes('user.id') && !ATOR_OK.some((re) => re.test(l))) p.push(`${rel}: user.id fora do ator → ${l.trim().slice(0, 90)}`)
  }
  for (const n of ['start', 'retake', 'variations']) if (!code(srcOf(`app/api/ads/v2/${n}/route.ts`)).includes('chargeAdsV2(admin, { userId: uid,')) p.push(`${n}: cobrança fora do dono`)
  for (const n of ['orders', 'retake', 'variations', 'start']) if (!/name: 'ads_order_by_member', userId: user\.id/.test(code(srcOf(`app/api/ads/v2/${n}/route.ts`)))) p.push(`${n}: sem rastro do membro`)
  for (const n of ['orders', 'retake', 'variations', 'link-import']) if (!/\.\.\.\((ws|access)\.role === 'member' \? \{ created_by: user\.id \} : \{\}\)/.test(code(srcOf(`app/api/ads/v2/${n}/route.ts`)))) p.push(`${n}: sem created_by`)
  return p
}
const P6 = fiacao(read)
ok(P6.length === 0, `6a as 9 rotas (8 do /api/ads/v2 + brand-kit) resolvem o workspace; user.id só no ator; cobrança no dono; created_by e rastro do membro ${P6.slice(0, 3).join(' | ')}`)
{
  const pg = code(read(F.page))
  ok(/loadAdsAccess\(user\.id, user\.email, \{ workspace: true \}\)/.test(pg) && /adsSampleOpen\(admin, uid, reason\)/.test(pg) && /\.eq\('id', uid\)/.test(pg) && /workspace=\{workspace\}/.test(pg) && /teamOwner: !member && isTeamOwnerPlan\(ws\.ownerPlan\)/.test(pg),
    '6b página /ads/v2: workspace, amostra e saldo do DONO; o aviso do membro e o link da equipe vão para a tela')
  const door = code(read(F.door))
  ok(/loadAdsAccess\(user\.id, user\.email, \{ workspace: true \}\)/.test(door), '6c porta /ads: o membro vê a porta do dono ("Make your ad")')
  const cl = code(read(F.client))
  ok(/workspace\?\.role === 'member' \? '\/api\/ads\/team' : '\/api\/credits'/.test(cl) && /Working in/.test(read(F.client)) && /href="\/ads\/team"/.test(cl), '6d tela: membro relê o saldo do DONO (/api/ads/team) e vê "Working in …"; dono vê o link da equipe')
}
const footOk = (raw) => {
  const s = code(raw)
  return /if \(body\.purpose === 'ads' && \(body\.action === 'upload-url' \|\| body\.action === 'confirm'\)\) \{\n\s*try \{\n\s*const ws = await loadAdsAccess\(user\.id, user\.email, \{ workspace: true \}\)/.test(s) &&
    /if \(ws\.role === 'member' && ws\.ownerId !== user\.id && adsGate\(ws\.reason\) === 'ok'\) teamOwnerId = ws\.ownerId/.test(s) &&
    /const folderId: string = teamOwnerId \?\? user\.id/.test(s) && /const path = `\$\{folderId\}\/clip-/.test(s) && /if \(!path\.startsWith\(`\$\{folderId\}\/`\)\) \{/.test(s) &&
    /\.insert\(\{ user_id: folderId, url, kind, size_bytes: sizeBytes, \.\.\.\(teamOwnerId \? \{ created_by: user\.id \} : \{\}\) \}\)/.test(s) &&
    (s.match(/workspace: true/g) || []).length === 1
}
ok(footOk(read(F.footage)), '6e /api/footage: o workspace SÓ no purpose "ads" (upload-url/confirm); o membro sobe na pasta e na cota do dono com created_by; o resto por conta')

// varredura: quem pede o workspace (e quem importa o resolvedor)
const files = []
const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const r = `${d}/${e.name}`; if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(r) } else if (/\.tsx?$/.test(e.name)) files.push(r) } }
walk('app'); walk('lib'); walk('components')
const PERMITIDOS_WS = new Set([...WS_ROUTES, F.footage, F.page, F.door, F.teamRoute])
const pedem = files.filter((f) => /workspace: true \}\)/.test(code(read(f))))
const importam = files.filter((f) => /from '@\/lib\/ads\/workspace'/.test(read(f)))
ok(pedem.every((f) => PERMITIDOS_WS.has(f)) && [...PERMITIDOS_WS].every((f) => pedem.includes(f)),
  `6f SÓ o Studio Ads v2 pede o workspace (9 rotas + footage do Ads + página /ads/v2 + porta /ads + /api/ads/team) — filmes, clipes e imagens não (${pedem.filter((f) => !PERMITIDOS_WS.has(f)).join(', ')})`)
ok(importam.every((f) => [F.access, F.page, F.teamRoute].includes(f)), `6g o resolvedor só entra por lib/ads/serverAccess.ts (+ rótulo/saldo na página e na rota da equipe) (${importam.join(', ')})`)

// ═══ 7. eventos, migration, e-mail ════════════════════════════════════════════════════════════════════════════════════
{
  const EV = loaderFor(makeDb())(F.events)
  const sink = (read(F.sink).match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
  ok(EV.isAdsEvent('ads_order_by_member') && EV.ADS_SERVER_ONLY_EVENTS.includes('ads_order_by_member') && Object.values(T.ADS_TEAM_EVENTS).every((n) => sink.includes(`'${n}'`)),
    '7a ads_order_by_member na lista fechada do Ads e só-servidor; os 4 eventos da equipe no SERVER_ONLY_EVENTS do sink')
  const sql = read(F.migration)
  ok(/create table if not exists public\.ads_team_members/.test(sql) && /enable row level security/.test(sql) && /revoke all on table public\.ads_team_members from anon, authenticated/.test(sql) && !/create policy/i.test(sql) &&
    /ads_team_members_live_seat[\s\S]*?\(owner_id, seat\)[\s\S]*?where status in \('pending', 'active'\)/.test(sql) && /check \(seat between 1 and 3\)/.test(sql) &&
    /ads_team_members_one_team[\s\S]*?\(member_id\)[\s\S]*?where status = 'active'/.test(sql) &&
    /alter table public\.ads_v2_orders add column if not exists created_by/.test(sql) && /alter table public\.user_footage add column if not exists created_by/.test(sql),
    '7b migration: RLS ligado, sem policy, sem privilégio para anon/authenticated; vagas 1..3 únicas por dono (teto atômico); 1 equipe ativa por conta; created_by nas 2 tabelas')
  ok(!/sendEmail|resend|Resend|sendTransactional/.test(code(read(F.teamRoute))) && /TODO\(KINEO-EQUIPE-BUSINESS-2026-10-10\): e-mail transacional/.test(read(F.teamRoute)), '7c a rota não manda e-mail (o dono copia o link); o TODO do e-mail transacional está anotado')
  const B = loaderFor(makeDb())(F.biz)
  ok(B.BUSINESS_TEAM_SEATS === T.BUSINESS_SEATS && B.BUSINESS_BULLETS.includes(`${T.BUSINESS_SEATS} teammates included, using your credits`) && /BUSINESS_TEAM_SEATS/.test(read(F.bizPage)) && /BUSINESS_TEAM_HREF/.test(read(F.bizPage)) && !/up to 3 teammates/.test(read(F.bizPage)),
    '7d /business e /pricing leem as vagas da fonte (nada de "3" digitado) e linkam a equipe')
}

// ═══ 8. mutantes (cada um prova que aplicou e fica vermelho) ═══════════════════════════════════════════════════════════
async function mutante(nome, rel, de, para, aindaOk) {
  const orig = read(rel)
  const m = trocar(orig, de, para)
  const aplicou = m !== orig && m.includes(para)
  let verde = true
  try { verde = await aindaOk({ [rel]: m }) } catch { verde = false }
  ok(aplicou && !verde, `8 mutante: ${nome} fica vermelho`)
}
await mutante('teto de 4 vagas', F.team, 'export const BUSINESS_SEATS = 3', 'export const BUSINESS_SEATS = 4', async (over) => (await equipeOk(over)).teto)
await mutante('resolvedor que não confere o plano do dono (downgrade)', F.ws, '    if (o.error || !isTeamOwnerPlan(plan)) return personal\n', '    if (o.error) return personal\n', async (over) => (await resolverOk(over)).downgrade)
await mutante('aceite sem conferir o e-mail convidado', F.teamRoute, "      if (!mine || mine !== row.email) return v2Fail('email_mismatch', 403, { invited: row.email.replace(/^(.).*(@.*)$/, '$1…$2') })\n", '', async (over) => (await equipeOk(over)).email)
await mutante('aceite reaproveitável (sem uso único)', F.teamRoute, "        .eq('status', 'pending')\n        .eq('token_hash', hash)\n", '', async (over) => {
  const o2 = { ...over, [F.teamRoute]: trocar(over[F.teamRoute], "      if (!row || row.status !== 'pending' || !row.token_hash || !sameHash(row.token_hash, hash) || inviteExpired(row.expires_at)) return v2Fail('invite_invalid', 410)", "      if (!row) return v2Fail('invite_invalid', 410)") }
  return (await equipeOk(o2)).usoUnico
})
await mutante('token sem conferir a assinatura', F.invite, "  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }\n", '', async (over) => tokenOk(over[F.invite]) && (await equipeOk(over)).forjado)
await mutante('token que não vence', F.invite, "  if (expiresAtSeconds <= input.nowSeconds) return { ok: false, reason: 'expired' }\n", '', async (over) => tokenOk(over[F.invite]))
await mutante('/start cobrando o MEMBRO', F.start, 'chargeAdsV2(admin, { userId: uid, billingRef, cost })', 'chargeAdsV2(admin, { userId: user.id, billingRef, cost })', async (over) => (await startOk(over)).donoPaga && fiacao((rel) => over[rel] ?? read(rel)).length === 0)
await mutante('/orders sem created_by', F.orders, "        ...(ws.role === 'member' ? { created_by: user.id } : {}), // KINEO-EQUIPE-BUSINESS-2026-10-10 — quem criou (auditoria; NULL = o dono)\n", '', async (over) => ordersOk(over))
await mutante('/api/footage resolvendo o workspace fora do purpose ads', F.footage, "    if (body.purpose === 'ads' && (body.action === 'upload-url' || body.action === 'confirm')) {\n      try {\n        const ws =", "    if ((body.action === 'upload-url' || body.action === 'confirm')) {\n      try {\n        const ws =", async (over) => footOk(over[F.footage]))
await mutante('rota do Ads lendo pedido pelo user.id (membro fora do workspace)', 'app/api/ads/v2/status/route.ts', 'const { order, error } = await loadAdsV2Order(admin, orderId, uid)', 'const { order, error } = await loadAdsV2Order(admin, orderId, user.id)', async (over) => fiacao((rel) => over[rel] ?? read(rel)).length === 0)

console.log(`\ntest-equipe-business-2026-10-10: ${pass} ok · ${fail} falhas`)
if (fail) process.exit(1)
