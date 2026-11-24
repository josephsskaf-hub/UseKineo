// KINEO-BF-ONDAS-PUBLICO-2411 [dono 16/11, Black Friday opção B: "a carta dos 4 crons vai só para quem baixou filme ou teve nota 8+ em
// 60 dias (...) não para a base toda; respeitar quem recebeu e-mail nos últimos 7 dias."]
// Guardião sem rede. EXECUTA a regra pura (lib/billing/bf2026Audience.ts) e a ROTA das ondas (/api/admin/send-black-friday-2026, modo
// ensaio) com um banco falso em memória, e confere:
//   (a) entra quem baixou filme em 60 dias (robô e clipe não contam); (b) entra quem tem filme com nota ≥ 8 em 60 dias (ponte link →
//   video_url/final_video_url); fora do público = `fora_do_publico`;
//   (7d) cai em `email_7d` quem recebeu e-mail de marketing/ciclo de vida nas últimas 168 h, por CAIXA (alias também); o "vídeo pronto"
//   e os avisos de entrega não contam; a própria onda 'bf' conta (quem levou a bf em 27/11 não leva a cyber em 30/11);
//   (erro) qualquer leitura nova que falhe = 500, nada gravado;
//   (trava) a carta da base continua suprimindo.
// Cada mutante plantado deixa ao menos uma verificação vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const raiz = process.cwd()
const lf = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8').replace(/\r\n/g, '\n')
const F = {
  regra: 'lib/billing/bf2026Audience.ts',
  rota: 'app/api/admin/send-black-friday-2026/route.ts',
  bf: 'lib/billing/blackFriday2026.ts',
  sup: 'lib/lifecycle/suppression.ts',
}
const SRC = Object.fromEntries(Object.values(F).map((rel) => [rel, lf(rel)]))
const H = 3_600_000, D = 24 * H

// ── banco falso: filtros do PostgREST que as rotas usam ──────────────────────────────────────────────────────────────────────
function fakeAdmin(tables, { failTable = null, writes }) {
  const from = (table) => {
    const filters = []
    let head = false
    const q = {
      select(c, opts) { if (opts?.head) head = true; q._cols = typeof c === 'string' && c.trim() !== '*' ? c.split(',').map((x) => x.trim()) : null; return q },
      eq(c, v) { filters.push((r) => r[c] === v); return q },
      gte(c, v) { filters.push((r) => r[c] !== null && r[c] !== undefined && (typeof v === 'number' ? Number(r[c]) >= v : String(r[c]) >= String(v))); return q },
      lte(c, v) { filters.push((r) => r[c] !== null && r[c] !== undefined && String(r[c]) <= String(v)); return q },
      in(c, vs) { const s = new Set(vs); filters.push((r) => s.has(r[c])); return q },
      not(c, op, v) { filters.push((r) => (v === null ? r[c] !== null && r[c] !== undefined : r[c] !== v)); return q },
      order() { return q },
      range(a, b) { q._range = [a, b]; return q },
      insert(row) { writes.push({ table, row }); return Promise.resolve({ error: null }) },
      update() { writes.push({ table, update: true }); return { eq: () => Promise.resolve({ error: null }) } },
      then(res, rej) {
        if (failTable === table) return Promise.resolve({ data: null, error: { message: `boom ${table}`, code: 'X' } }).then(res, rej)
        let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)))
        if (head) return Promise.resolve({ data: null, error: null, count: rows.length }).then(res, rej)
        if (q._range) rows = rows.slice(q._range[0], q._range[1] + 1)
        // Como o PostgREST: só as colunas pedidas voltam (coluna esquecida no select = campo ausente).
        if (q._cols) rows = rows.map((r) => Object.fromEntries(q._cols.map((k) => [k, r[k]])))
        return Promise.resolve({ data: rows, error: null }).then(res, rej)
      },
    }
    return q
  }
  return { from }
}

function mundo(now) {
  const iso = (ms) => new Date(ms).toISOString()
  const p = (id, email, extra = {}) => ({ id, email, plan: 'free', email_opted_out: false, ...extra })
  const dl = (user_id, ago, md = {}) => ({ id: `dl-${user_id}-${ago}`, user_id, name: 'video_downloaded', created_at: iso(now - ago), metadata: { is_bot: false, surface: 'history', ...md } })
  const ev = (user_id, name, ago) => ({ id: `ev-${user_id}-${name}`, user_id, name, created_at: iso(now - ago), metadata: {} })
  return {
    profiles: [
      p('u01', 'one@ex.invalid'),                      // (a) download → entra
      p('u02', 'two@ex.invalid'),                      // nada → fora_do_publico
      p('u03', 'three@ex.invalid'),                    // (b) nota 9 pelo final_video_url → entra
      p('u04', 'four@ex.invalid'),                     // download + hotlead há 2 dias → email_7d
      p('u05', 'five@ex.invalid', { video_ready_sent_at: iso(now - 30 * H) }), // download + "vídeo pronto" (evento e coluna) → entra
      p('u06', 'six@ex.invalid'),                      // download + bf2026_emailed há 3 dias (a cyber depois da bf) → email_7d
      p('u07', 'seven@ex.invalid'),                    // download há 70 dias → fora_do_publico
      p('u08', 'eight@ex.invalid'),                    // nota 7.9 → fora_do_publico
      p('u09', 'nine@ex.invalid'),                     // download + carta da base → recent_bf_base_2311
      p('u10', ' Alias@Ex.invalid '),                  // download; a OUTRA conta da caixa recebeu trial há 1 dia → email_7d
      p('u11', 'alias@ex.invalid'),                    // sem público → fora_do_publico
      p('u12', 'twelve@ex.invalid'),                   // download de robô → fora_do_publico
      p('u13', 'thirteen@ex.invalid'),                 // download + guest_account_ready (entrega) há 3 dias → entra
      p('u14', 'fourteen@ex.invalid', { cap_hit_sent_at: '1970-01-01T00:00:00.000Z' }), // download + carimbo de PULO → entra
      p('u15', 'fifteen@ex.invalid'),                  // download + ledger da onda bf há 3 dias → email_7d
      p('u16', 'sixteen@ex.invalid'),                  // só download de CLIPE → fora_do_publico
      p('u17', 'seventeen@ex.invalid', { post_nudge_sent_at: iso(now - 5 * D) }), // download + post_nudge há 5 dias → email_7d
      p('u18', 'eighteen@ex.invalid'),                 // download + e-mail há 7 dias e 1 h → entra
    ],
    events: [
      dl('u01', 2 * D), dl('u04', D), dl('u05', D), dl('u06', 4 * D), dl('u07', 70 * D), dl('u09', D), dl('u10', D),
      dl('u12', D, { is_bot: true }), dl('u13', D), dl('u14', D), dl('u15', D), dl('u16', D, { product: 'clip', surface: 'clips' }),
      dl('u17', D), dl('u18', D),
      ev('u05', 'video_ready_email_sent', 30 * H), ev('u06', 'bf2026_emailed', 3 * D), ev('u09', 'bf_base_2311_sent', 2 * D),
    ],
    film_review_notes_com_motor: [
      { link: 'https://x/v3.mp4', nota: 9, quando: iso(now - 10 * D) },
      { link: 'https://x/v8.mp4', nota: 7.9, quando: iso(now - 10 * D) },
    ],
    videos: [
      { id: 'v3', user_id: 'u03', video_url: 'https://x/raw3.mp4', final_video_url: 'https://x/v3.mp4' },
      { id: 'v8', user_id: 'u08', video_url: 'https://x/v8.mp4', final_video_url: null },
    ],
    email_send_log: [
      { id: 'l4', user_id: 'u04', sent_at: iso(now - 2 * D), kind: 'hotlead_stalled', ok: true, yielded: false },
      { id: 'l13', user_id: 'u13', sent_at: iso(now - 3 * D), kind: 'guest_account_ready', ok: true, yielded: false },
      { id: 'l15', user_id: 'u15', sent_at: iso(now - 3 * D), kind: 'bf2026', ok: true, yielded: false },
      { id: 'l18', user_id: 'u18', sent_at: iso(now - 7 * D - H), kind: 'hotlead_stalled', ok: true, yielded: false },
    ],
    trial_emails_log: [{ user_id: 'u11', email_kind: 'ending_soon', sent_at: iso(now - D) }],
    checkout_abandoned: [],
    courtesy_grants: [],
  }
}

// KINEO-BF-CYBER-ULTIMO-DIA-2411 — relógio FIXO (30/11 10:00 em Nova York, dia da cyber, dentro da janela): a rota e o banco falso usam o
// mesmo instante, e o confirm=SEND continua testável depois que a janela real fechar.
const FIXO = Date.parse('2026-11-30T15:00:00Z')
class FakeDate extends Date {
  constructor(...a) { if (a.length === 0) super(FIXO); else super(...a) }
  static now() { return FIXO }
}

// O mundo da cyber: a exceção "último dia" (quem recebeu a bf em 27/11 recebe a cyber) e as travas que NÃO cedem.
function mundoCyber(now) {
  const iso = (ms) => new Date(ms).toISOString()
  const p = (id, extra = {}) => ({ id, email: `${id}@cy.invalid`, plan: 'free', email_opted_out: false, ...extra })
  const dl = (user_id) => ({ id: `dl-${user_id}`, user_id, name: 'video_downloaded', created_at: iso(now - 10 * D), metadata: { is_bot: false, surface: 'history' } })
  const bfEv = (user_id, md = { campaign: 'bf2026', wave: 'bf' }) => ({ id: `bfe-${user_id}`, user_id, name: 'bf2026_emailed', created_at: iso(now - 3 * D), metadata: md })
  const bfClaim = (user_id, wave) => ({ id: `cl-${user_id}-${wave}`, user_id, name: 'bf2026_email_claimed', created_at: iso(now - 3 * D), metadata: { campaign: 'bf2026', wave } })
  const bfLedger = (user_id) => ({ id: `bfl-${user_id}`, user_id, sent_at: iso(now - 3 * D), kind: 'bf2026', ok: true, yielded: false })
  const comBf = ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07']
  return {
    profiles: [
      p('c01'),                              // recebeu a bf em 27/11 (carimbo + reserva + ledger) → ENTRA na cyber (a exceção)
      p('c02'),                              // recebeu a bf + hotlead há 2 dias → email_7d (outro e-mail continua travando)
      p('c03'),                              // recebeu a bf + carta da BASE há 8 dias (dentro das 240 h) → recent_bf_base_2311
      p('c04'),                              // recebeu a bf + JÁ tem a reserva da cyber (rodada do dia) → already_got_wave
      p('c05', { email_opted_out: true }),   // recebeu a bf e se DESCADASTROU depois → opted_out
      p('c06'),                              // recebeu a bf e comprou o ANUAL depois → annual_buyer
      p('c07', { plan: 'starter' }),         // recebeu a bf e assinou o Starter MENSAL depois → paying_plan
      p('c08'),                              // carimbo bf2026_emailed SEM wave → conta (falha fechada) → email_7d
      p('c09'),                              // nada → entra (controle)
      p('c10'),                              // nota 9 no próprio filme → entra
      p('c11'),                              // vídeo com URL que só COMEÇA igual ao link da nota de c10 → fora_do_publico
    ],
    events: [
      ...['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08', 'c09'].map(dl),
      ...comBf.map((u) => bfEv(u)), ...comBf.map((u) => bfClaim(u, 'bf')), bfEv('c08', {}),
      bfClaim('c04', 'cyber'),
      { id: 'base-c03', user_id: 'c03', name: 'bf_base_2311_sent', created_at: iso(now - 8 * D), metadata: { ok: true } },
      { id: 'pay-c06', user_id: 'c06', name: 'payment_success', created_at: iso(now - D), metadata: { billing: 'annual' } },
    ],
    film_review_notes_com_motor: [{ link: 'https://x/c10.mp4', nota: 9, quando: iso(now - 5 * D) }],
    videos: [
      { id: 'v10', user_id: 'c10', video_url: 'https://x/c10.mp4', final_video_url: null },
      { id: 'v11', user_id: 'c11', video_url: 'https://x/c10.mp4?v=2', final_video_url: 'https://x/c10.mp4.bak' },
    ],
    email_send_log: [...comBf.map(bfLedger), { id: 'h-c02', user_id: 'c02', sent_at: iso(now - 2 * D), kind: 'hotlead_stalled', ok: true, yielded: false }],
    trial_emails_log: [], checkout_abandoned: [], courtesy_grants: [],
  }
}

async function rodarRota(repl, { failTable = null, qs = 'wave=bf', world = mundo } = {}) {
  const now = FIXO
  const tables = world(now)
  const writes = [], corridas = [], enviados = []
  const fetchFalso = async (url, init) => {
    if (!String(url).startsWith('https://api.resend.com/')) throw new Error('rede proibida: ' + url)
    enviados.push(JSON.parse(init.body))
    return { ok: true, status: 200, json: async () => ({ id: 'fake' }), headers: { get: () => null } }
  }
  const carrega = createOfflineLoader({
    source: (rel, t) => repl[rel] ?? t,
    env: { NEXT_PUBLIC_SUPABASE_URL: 'http://fake', SUPABASE_SERVICE_ROLE_KEY: 'fake', CRON_SECRET: 'cron-test', RESEND_API_KEY: 'fake-nao-real' },
    globals: { setTimeout: (f) => f(), Date: FakeDate, fetch: fetchFalso },
    mocks: {
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
      '@supabase/supabase-js': { createClient: () => fakeAdmin(tables, { failTable, writes }) },
      '@/lib/emailSuppression': { emailFooterHtml: () => '', emailFooterText: () => '', unsubscribeHeaders: () => ({}) },
      '@/lib/email/quota': { dailyCap: () => 1600, recordResendResponse: async () => {} },
      '@/lib/lifecycle/campaignRun': { registrarCorrida: async (_a, c) => { corridas.push(c) }, corridaAbortada: (...a) => ({ abortada: a }) },
      '@/lib/growth/winbackFilm60s': { WINBACK_NEVER: [] },
    },
  })
  const R = carrega(F.rota)
  const req = { nextUrl: { searchParams: new URLSearchParams(qs) }, headers: { get: (h) => (h === 'authorization' ? 'Bearer cron-test' : null) } }
  const res = await R.GET(req)
  return { res, writes, corridas, enviados }
}

async function problemas(repl = {}) {
  const p = []
  const checa = (nome, cond) => { if (!cond) p.push(nome) }
  let A, S
  try {
    const carrega = createOfflineLoader({ source: (rel, t) => repl[rel] ?? t })
    A = carrega(F.regra)
  } catch (e) { return ['carregar a regra: ' + String(e?.message)] }
  const now = Date.parse('2026-11-30T14:00:00Z')

  // ── regra pura ──
  const r = (f) => A.bf2026AudienceSkipReason({ downloadedFilm: false, highNoteFilm: false, lastMarketingEmailMs: null, nowMs: now, ...f })
  checa('pura: sem download nem nota = fora_do_publico', r({}) === 'fora_do_publico')
  checa('pura: download entra', r({ downloadedFilm: true }) === null)
  checa('pura: nota 8 entra', r({ highNoteFilm: true }) === null)
  checa('pura: e-mail há 167 h = email_7d', r({ downloadedFilm: true, lastMarketingEmailMs: now - 167 * H }) === 'email_7d')
  checa('pura: e-mail há 168 h exatas libera', r({ downloadedFilm: true, lastMarketingEmailMs: now - 168 * H }) === null)
  checa('pura: e-mail "no futuro" suprime (falha fechada)', r({ downloadedFilm: true, lastMarketingEmailMs: now + H }) === 'email_7d')
  checa('pura: relógio inválido não libera', r({ downloadedFilm: true, nowMs: NaN }) !== null)
  checa('pura: fora do público vence os 7 dias', r({ lastMarketingEmailMs: now - H }) === 'fora_do_publico')
  checa('pura: janela de 60 dias e nota 8 e 168 h', A.BF2026_AUDIENCE_DAYS === 60 && A.BF2026_AUDIENCE_MIN_NOTE === 8 && A.BF2026_RECENT_EMAIL_HOURS === 168)

  const dls = (ev) => [...A.bf2026FilmDownloaders(ev, now)].sort().join(',')
  checa('pura (a): 59 dias entra, 60 dias e 1 min não, 600 dias não', dls([
    { user_id: 'x', name: 'video_downloaded', created_at: new Date(now - 59 * D).toISOString(), metadata: {} },
    { user_id: 'y', name: 'video_downloaded', created_at: new Date(now - 60 * D - 60_000).toISOString(), metadata: {} },
    { user_id: 'z', name: 'video_downloaded', created_at: new Date(now - 600 * D).toISOString(), metadata: {} },
  ]) === 'x')
  checa('pura (a): robô, clipe e outro evento não contam', dls([
    { user_id: 'b', name: 'video_downloaded', created_at: new Date(now - D).toISOString(), metadata: { is_bot: true } },
    { user_id: 'c', name: 'video_downloaded', created_at: new Date(now - D).toISOString(), metadata: { product: 'clip' } },
    { user_id: 'd', name: 'video_downloaded', created_at: new Date(now - D).toISOString(), metadata: { surface: 'clips' } },
    { user_id: 'e', name: 'video_download_clicked', created_at: new Date(now - D).toISOString(), metadata: {} },
  ]) === '')
  const notas = (ns, vs) => [...A.bf2026HighNoteOwners(ns, vs, now)].sort().join(',')
  const vids = [{ user_id: 'a', video_url: 'L1' }, { user_id: 'b', final_video_url: 'L2' }, { user_id: 'c', video_url: 'L3' }, { user_id: 'd', video_url: 'L4' }, { user_id: 'e', video_url: 'L0' }]
  checa('pura (b): nota 8 (video_url) e 9 (final_video_url) entram; 7.9, 0 e 61 dias não', notas([
    { link: 'L1', nota: 8, quando: new Date(now - D).toISOString() },
    { link: 'L2', nota: '9', quando: new Date(now - D).toISOString() },
    { link: 'L3', nota: 7.9, quando: new Date(now - D).toISOString() },
    { link: 'L4', nota: 8, quando: new Date(now - 61 * D).toISOString() },
    { link: 'L0', nota: 0, quando: new Date(now - D).toISOString() },
  ], vids) === 'a,b')

  const supSrc = repl[F.sup] ?? SRC[F.sup]
  const bloco = supSrc.match(/const PROFILE_TIMESTAMP_COLUMNS = \[([\s\S]*?)\] as const/)
  const colsCasa = bloco ? [...bloco[1].matchAll(/^\s*'([a-z_]+)'/gm)].map((m) => m[1]) : []
  checa('7d: as colunas da casa são lidas do código e incluem video_ready_sent_at e cap_hit_sent_at', colsCasa.includes('video_ready_sent_at') && colsCasa.includes('cap_hit_sent_at'))
  const cols = A.bf2026RecentEmailProfileColumns(colsCasa)
  checa('7d: colunas = as da casa menos video_ready_sent_at', cols.length === colsCasa.length - 1 && !cols.includes('video_ready_sent_at'))
  const t = (ago) => new Date(now - ago).toISOString()
  const ult = A.bf2026LastMarketingEmail({
    ledger: [
      { user_id: 'L-ok', sent_at: t(D), kind: 'hotlead_stalled', ok: true },
      { user_id: 'L-tx', sent_at: t(D), kind: 'guest_account_ready', ok: true },
      { user_id: 'L-fail', sent_at: t(D), kind: 'hotlead_stalled', ok: false },
      { user_id: 'L-yield', sent_at: t(D), kind: 'hotlead_stalled', ok: true, yielded: true },
      { user_id: 'L-velho', sent_at: t(8 * D), kind: 'hotlead_stalled', ok: true },
    ],
    trial: [{ user_id: 'T', sent_at: t(D) }],
    events: [
      { user_id: 'E-ready', name: 'video_ready_email_sent', created_at: t(D) },
      { user_id: 'E-stranded', name: 'stranded_ready_sent', created_at: t(D) },
      { user_id: 'E-bf', name: 'bf2026_emailed', created_at: t(3 * D) },
      { user_id: 'E-base', name: 'bf_base_2311_sent', created_at: t(D) },
      { user_id: 'E-volta', name: 'volta_1211_emailed', created_at: t(D) },
      { user_id: 'E-outro', name: 'video_downloaded', created_at: t(D) },
    ],
    abandoned: [{ user_id: 'C', recovery_sent_at: t(D) }],
    profiles: [{ id: 'P-ready', video_ready_sent_at: t(D) }, { id: 'P-cap', cap_hit_sent_at: t(D) }, { id: 'P-pulo', cap_hit_sent_at: '1970-01-01T00:00:00.000Z' }],
    profileColumns: colsCasa,
  }, now)
  const contam = [...ult.keys()].sort().join(',')
  checa(`7d: contam ledger, trial, carimbos, a onda bf, a carta da base, checkout e colunas; NÃO contam vídeo pronto, entrega, recusa, cessão, pulo, velho (deu ${contam})`,
    contam === 'C,E-base,E-bf,E-volta,L-ok,P-cap,T')

  // ── a rota, executada em ensaio sobre o banco falso ──
  let out
  try { out = await rodarRota(repl) } catch (e) { return [...p, 'rota lançou: ' + String(e?.message)] }
  const b = out.res.body ?? {}
  checa(`rota: ensaio responde 200 (deu ${out.res.status} ${b.error ?? ''})`, out.res.status === 200 && b.mode === 'DRY_RUN')
  const ex = b.excluded ?? {}
  const amostra = (b.sample ?? []).slice().sort().join(',')
  checa(`rota: entram exatamente u01,u03,u05,u13,u14,u18 (deu ${amostra})`, amostra === ['eighteen', 'fourteen', 'five', 'one', 'thirteen', 'three'].map((x) => `${x}@ex.invalid`).sort().join(','))
  checa(`rota: fora_do_publico = 6 (u02,u07,u08,u11,u12,u16) (deu ${ex.fora_do_publico})`, ex.fora_do_publico === 6)
  checa(`rota: email_7d = 5 (u04,u06,u10,u15,u17) (deu ${ex.email_7d})`, ex.email_7d === 5)
  checa(`rota: recent_bf_base_2311 = 1 (u09) (deu ${ex.recent_bf_base_2311})`, ex.recent_bf_base_2311 === 1)
  const au = b.audience ?? {}
  checa(`rota: audience por_download 5, por_nota_8 1, pelos_dois 0, presente 0 (deu ${JSON.stringify(au)})`, au.por_download === 5 && au.por_nota_8 === 1 && au.pelos_dois === 0 && au.por_presente_de_canal === 0)
  checa('rota: ensaio não grava em tabela nenhuma', out.writes.length === 0)

  for (const tabela of ['film_review_notes_com_motor', 'videos', 'email_send_log', 'trial_emails_log', 'checkout_abandoned']) {
    let e
    try { e = await rodarRota(repl, { failTable: tabela }) } catch (err) { p.push(`erro em ${tabela}: rota lançou para fora (${err?.message})`); continue }
    checa(`erro de leitura em ${tabela} = 500, nada gravado (deu ${e.res.status})`, e.res.status === 500 && e.writes.length === 0 && e.corridas.length === 0)
  }

  // ── KINEO-BF-CYBER-ULTIMO-DIA-2411: a exceção "último dia" (pura) ──
  checa('cyber: a exceção vale só para a cyber', A.bf2026IgnoresBfWaveTrail('cyber') === true && A.bf2026IgnoresBfWaveTrail('bf') === false && A.bf2026IgnoresBfWaveTrail(null) === false)
  checa('cyber: rastro da bf = ledger bf2026 e carimbo bf2026_emailed com wave bf; sem wave ou wave cyber NÃO é',
    A.bf2026IsBfWaveTrail({ source: 'ledger', kind: 'bf2026' }) && A.bf2026IsBfWaveTrail({ source: 'event', name: 'bf2026_emailed', metadata: { wave: 'bf' } }) &&
    !A.bf2026IsBfWaveTrail({ source: 'event', name: 'bf2026_emailed', metadata: {} }) && !A.bf2026IsBfWaveTrail({ source: 'event', name: 'bf2026_emailed', metadata: { wave: 'cyber' } }) &&
    !A.bf2026IsBfWaveTrail({ source: 'ledger', kind: 'hotlead_stalled' }) && !A.bf2026IsBfWaveTrail({ source: 'event', name: 'volta_1211_emailed', metadata: { wave: 'bf' } }))
  const linhasCy = { ledger: [{ user_id: 'x', sent_at: t(3 * D), kind: 'bf2026', ok: true }, { user_id: 'y', sent_at: t(3 * D), kind: 'bf2026', ok: true }, { user_id: 'y', sent_at: t(2 * D), kind: 'hotlead_stalled', ok: true }],
    trial: [], events: [{ user_id: 'x', name: 'bf2026_emailed', created_at: t(3 * D), metadata: { wave: 'bf' } }, { user_id: 'z', name: 'bf2026_emailed', created_at: t(3 * D), metadata: {} }], abandoned: [], profiles: [], profileColumns: [] }
  checa('cyber: com a exceção só ficam y (hotlead) e z (carimbo sem onda)', [...A.bf2026LastMarketingEmail(linhasCy, now, { ignoreBfWaveTrail: true }).keys()].sort().join(',') === 'y,z')
  checa('cyber: sem a exceção (onda bf) x, y e z ficam', [...A.bf2026LastMarketingEmail(linhasCy, now).keys()].sort().join(',') === 'x,y,z')
  checa('nota: URL que só começa igual ao link NÃO é o mesmo filme', notas([{ link: 'L9', nota: 9, quando: new Date(now - D).toISOString() }],
    [{ user_id: 'p1', video_url: 'L9?v=2', final_video_url: 'L9.bak' }, { user_id: 'p2', video_url: 'L9' }]) === 'p2')

  // ── a rota na cyber: ensaio e envio de verdade (banco e Resend falsos) têm de bater ──
  let cy, cySend, bfMesmoMundo
  try {
    cy = await rodarRota(repl, { qs: 'wave=cyber', world: mundoCyber })
    cySend = await rodarRota(repl, { qs: 'wave=cyber&confirm=SEND&limit=150', world: mundoCyber })
    bfMesmoMundo = await rodarRota(repl, { qs: 'wave=bf', world: mundoCyber })
  } catch (e) { return [...p, 'rota da cyber lançou: ' + String(e?.message)] }
  const cb = cy.res.body ?? {}, cex = cb.excluded ?? {}
  const cyLista = (cb.sample ?? []).slice().sort().join(',')
  checa(`cyber ensaio: entram exatamente c01 (pela exceção), c09 e c10 (deu ${cyLista} ${cy.res.status} ${cb.error ?? ''})`, cyLista === 'c01@cy.invalid,c09@cy.invalid,c10@cy.invalid')
  checa(`cyber ensaio: email_7d 2 (c02 outro e-mail, c08 carimbo sem onda) (deu ${cex.email_7d})`, cex.email_7d === 2)
  checa(`cyber ensaio: carta da base 1, já recebeu a cyber 1, opt-out 1, anual 1, pagante 1, fora do público 1 (deu ${JSON.stringify(cex)})`,
    cex.recent_bf_base_2311 === 1 && cex.already_got_wave === 1 && cex.opted_out === 1 && cex.annual_buyer === 1 && cex.paying_plan === 1 && cex.fora_do_publico === 1)
  checa(`cyber ensaio: audience.por_ja_ter_recebido_bf = 1 (deu ${cb.audience?.por_ja_ter_recebido_bf})`, cb.audience?.por_ja_ter_recebido_bf === 1)
  const enviadosCy = cySend.enviados.map((e) => e.to[0]).sort().join(',')
  checa(`cyber SEND == ensaio: os mesmos 3 recebem, uma vez cada (deu ${enviadosCy}; status ${cySend.res.status} ${cySend.res.body?.error ?? ''})`, enviadosCy === cyLista && cySend.res.body?.sent === 3 && cb.next_batch === 3)
  checa('cyber SEND: assunto e reserva da cyber', cySend.enviados.every((e) => /^Cyber Monday:/.test(e.subject)) &&
    cySend.writes.filter((w) => w.row?.name === 'bf2026_email_claimed').map((w) => `${w.row.user_id}:${w.row.metadata?.wave}`).sort().join(',') === 'c01:cyber,c09:cyber,c10:cyber')
  const bfLista = (bfMesmoMundo.res.body?.sample ?? []).slice().sort().join(',')
  checa(`onda bf não muda: no mesmo mundo, c01 continua travado pela própria carta bf (deu ${bfLista})`, bfLista === 'c09@cy.invalid,c10@cy.invalid' && bfMesmoMundo.res.body?.audience?.por_ja_ter_recebido_bf === 0)
  return p
}

const muta = (rel, de, para) => {
  const s = SRC[rel]
  if (!s.includes(de)) throw new Error(`mutante não aplicável em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const mutaTodos = (rel, de, para) => {
  const s = SRC[rel]
  if (s.split(de).length !== 3) throw new Error(`mutante esperava 2 ocorrências em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.split(de).join(para) }
}
const MUTANTES = [
  ['público ignorado (regra pura)', muta(F.regra, "  if (!(f.downloadedFilm === true || f.highNoteFilm === true)) return 'fora_do_publico'\n", '')],
  ['público ignorado (rota passa true)', muta(F.rota, 'downloadedFilm: baixouFilme.has(id), highNoteFilm: notaAlta.has(id), lastMarketingEmailMs: null', 'downloadedFilm: true, highNoteFilm: true, lastMarketingEmailMs: null')],
  ['60 dias vira 600', muta(F.regra, 'export const BF2026_AUDIENCE_DAYS = 60', 'export const BF2026_AUDIENCE_DAYS = 600')],
  ['nota ≥ 8 vira ≥ 0', muta(F.regra, 'export const BF2026_AUDIENCE_MIN_NOTE = 8', 'export const BF2026_AUDIENCE_MIN_NOTE = 0')],
  ['nota comparada contra 0 na regra pura', muta(F.regra, 'nota < BF2026_AUDIENCE_MIN_NOTE) continue', 'nota < 0) continue')],
  ['7 dias ignorado (rota passa null)', muta(F.rota, 'lastMarketingEmailMs: ultimoDaCaixa, nowMs', 'lastMarketingEmailMs: null, nowMs')],
  ['7 dias vira 1 dia', muta(F.regra, 'export const BF2026_RECENT_EMAIL_HOURS = BF_BASE_2311_SUPPRESSION_HOURS', 'export const BF2026_RECENT_EMAIL_HOURS = 24')],
  ['7 dias só olha a própria conta (alias escapa)', muta(F.rota, 'const ultimoDaCaixa = Math.max(0, ...(idsPorCaixa.get(c.email) ?? [c.id])', 'const ultimoDaCaixa = Math.max(0, ...[c.id]')],
  ['e-mail "no futuro" deixa de suprimir', muta(F.regra, 'Number.isFinite(nowMs) && whenMs > 0 && nowMs - whenMs < windowMs', 'Number.isFinite(nowMs) && whenMs > 0 && whenMs <= nowMs && nowMs - whenMs < windowMs')],
  ['erro de leitura engolido (email_send_log)', muta(F.rota, "{ route: ROUTE, table: 'email_send_log' }),", "{ route: ROUTE, table: 'email_send_log' }).catch(() => ({ data: [], error: null })),")],
  ['erro de leitura engolido (notas)', muta(F.rota, "{ route: ROUTE, table: 'film_review_notes_com_motor', key: 'link' }),", "{ route: ROUTE, table: 'film_review_notes_com_motor', key: 'link' }).catch(() => ({ data: [], error: null })),")],
  ['erro de leitura engolido (videos da nota)', mutaTodos(F.rota, "{ route: ROUTE, table: 'videos' }),", "{ route: ROUTE, table: 'videos' }).catch(() => ({ data: [], error: null })),")],
  ['transacional conta (evento "vídeo pronto")', muta(F.regra, '...LIFECYCLE_EMAIL_EVENT_NAMES.filter((n) => !BF2026_TRANSACTIONAL_EVENT_NAMES.includes(n)),', '...LIFECYCLE_EMAIL_EVENT_NAMES,')],
  ['transacional conta (coluna video_ready_sent_at)', muta(F.regra, "export const BF2026_TRANSACTIONAL_PROFILE_COLUMNS: readonly string[] = ['video_ready_sent_at']", 'export const BF2026_TRANSACTIONAL_PROFILE_COLUMNS: readonly string[] = []')],
  ['transacional conta (aviso de entrega no ledger)', muta(F.regra, "export const BF2026_TRANSACTIONAL_LEDGER_KINDS: readonly string[] = ['guest_account_ready', 'ads_escolha_ready']", 'export const BF2026_TRANSACTIONAL_LEDGER_KINDS: readonly string[] = []')],
  ['a própria onda bf não conta nos 7 dias (carimbo)', muta(F.regra, '  BF2026_EMAIL_SENT,\n]', ']')],
  ['robô conta como download', muta(F.regra, "    if (m.is_bot === true || m.is_bot === 'true') continue\n", '')],
  ['clipe conta como filme', muta(F.regra, "    if (m.product === 'clip' || m.surface === 'clips') continue\n", '')],
  ['recusa do Resend conta como envio', muta(F.regra, '    if (r.ok === false || r.yielded === true) continue\n', '')],
  ['trava da carta da base removida', muta(F.rota, 'bf2026BaseLetterSuppression(perfis ?? [], cartasBase ?? [], nowMs)', 'bf2026BaseLetterSuppression(perfis ?? [], [], nowMs)')],
  ['exceção vale também para a onda bf', muta(F.regra, "  return wave === 'cyber'\n", "  return wave === 'cyber' || wave === 'bf'\n")],
  ['exceção ignora todo o ledger (outro e-mail de marketing passa)', muta(F.regra, "    if (ignora && bf2026IsBfWaveTrail({ source: 'ledger', kind: r.kind })) continue\n", '    if (ignora) continue\n')],
  ['exceção ignora todo carimbo de evento', muta(F.regra, "    if (ignora && bf2026IsBfWaveTrail({ source: 'event', name: r.name, metadata: r.metadata })) continue\n", '    if (ignora) continue\n')],
  ['carimbo sem onda tratado como bf (falha aberta)', muta(F.regra, "  return row.name === BF2026_EMAIL_SENT && m.wave === 'bf'", "  return row.name === BF2026_EMAIL_SENT && m.wave !== 'cyber'")],
  ['rota não aplica a exceção', muta(F.rota, 'bf2026LastMarketingEmail(linhas7d, nowMs, { ignoreBfWaveTrail: excecaoBf })', 'bf2026LastMarketingEmail(linhas7d, nowMs)')],
  ['rota não lê a onda do carimbo', muta(F.rota, "select('id, user_id, name, created_at, metadata').in('user_id', ids).in('name', BF2026_RECENT_EMAIL_EVENT_NAMES", "select('id, user_id, name, created_at').in('user_id', ids).in('name', BF2026_RECENT_EMAIL_EVENT_NAMES")],
  ['carta da base entra na cyber', muta(F.rota, 'bf2026BaseLetterSuppression(perfis ?? [], cartasBase ?? [], nowMs)', "bf2026BaseLetterSuppression(perfis ?? [], wave === 'cyber' ? [] : (cartasBase ?? []), nowMs)")],
  ['cyber duas vezes para a mesma pessoa', muta(F.rota, 'alreadyGotWave: jaRecebeu.has(id)', 'alreadyGotWave: false')],
  ['opt-out depois da bf recebe a cyber', muta(F.bf, "  if (p.email_opted_out === true) return 'opted_out'\n", '')],
  ['comprador anual recebe a cyber', muta(F.rota, "annualBuyer: wave === 'cyber' && compradorAnual.has(id)", 'annualBuyer: false')],
  ['URL com prefixo comum vira o mesmo filme', muta(F.regra, "(typeof v.video_url === 'string' && links.has(v.video_url))", "(typeof v.video_url === 'string' && [...links].some((l) => String(v.video_url).startsWith(l)))")],
  ['ensaio deixa de mostrar o público', muta(F.rota, 'audience: { ...publico,', 'audience: { ...publico, por_download: -1,')],
]

let falhas = 0
const b0 = await problemas()
console.log(b0.length ? 'FALHA\n  ' + b0.join('\n  ') : 'PASS ondas da Black Friday só para quem baixou filme ou teve nota 8+ em 60 dias, sem e-mail de marketing em 7 dias; falha fechada')
if (b0.length) falhas++
for (const [nome, repl] of MUTANTES) {
  const r = await problemas(repl)
  if (r.length === 0) { console.log(`VIVO  mutante "${nome}"`); falhas++ }
  else console.log(`morto mutante "${nome}" ← ${r[0]}`)
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1) }
console.log(`\nOK — ${MUTANTES.length} mutantes mortos`)
