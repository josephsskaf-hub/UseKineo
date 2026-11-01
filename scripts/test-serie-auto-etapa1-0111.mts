// KINEO-SERIE-AUTO-ETAPA1-0111 — guardião da Etapa 1 da série automática semanal (docs/SERIE-AUTOMATICA-DESENHO-2026-11-01.md).
// Roda o passe REAL (lib/serieAuto/cron.ts) contra um banco em memória e uma rota falsa — sem rede, sem crédito, sem fal.
// Prova:
//   A. o interruptor nasce DESLIGADO e, desligado, o passe não abre o banco nem chama a rota;
//   B. só os e-mails EXATOS da casa passam (padrão LIKE como "test%" não passa);
//   C. ligado + conta interna simulada: a ideia certa sai UMA vez por semana (segunda passada = nenhum POST novo), a semana seguinte
//      sai com o episódio seguinte, a ficha gravada é preservada (nunca sobrescrita) e vai no texto;
//   D. a régua: Seedance → família 'classic' (3,1 pal/s), a ideia é ideia solta para o escritor da rota (ehIdeiaSolta), sem segundos
//      nem contagem de palavras (temaParaOEscritor não ajusta nem condensa), e o corpo vai com engine 'seedance' e script_mode 'ai';
//   E. sem crédito: pula a semana, grava serie_skipped_no_credits UMA vez, nenhum POST; 2 seguidas = pausa;
//   F. sem ficha: deriva uma vez do episódio 1 e grava só onde é nula;
//   G. o cron do Autopilot chama o passe 4 depois do passe 3, sem entrada nova no vercel.json; a migration tem a trava (série, semana).
// Rodar: npx tsx scripts/test-serie-auto-etapa1-0111.mts
import fs from 'node:fs'
import { seriePass, type SerieDeps, type SerieEvent } from '../lib/serieAuto/cron'
import {
  SERIE_AUTO_ENABLED, SERIE_AUTO_INTERNAL_EMAILS, SERIE_AUTO_EVENTS, SERIE_AUTO_MARCA, serieAutoAccountAllowed, serieEpisodeCost, serieGenerationId,
  serieIdeiaDoEpisodio, serieNextRunMs, serieReguaDoMotor, serieWeekKey, SERIE_AUTO_IDEA_MAX_CHARS,
} from '../lib/serieAuto/serieAuto'
import { ehIdeiaSolta, temaParaOEscritor } from '../lib/meta95/ideiaNoEscritor'
import { SPEECH_RATE_BASE } from '../lib/speechRate'
// @ts-ignore — módulo .mjs de apoio dos guardiões (sem tipos)
import { semSerieAuto0111 } from './test-support/desfaz-serie-auto-etapa1-0111.mjs'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// ── banco em memória: o subconjunto do PostgREST que o passe usa ─────────────────────────────────────────────────────────
type Row = Record<string, unknown>
class FakeDb {
  tables: Record<string, Row[]> = {}
  calls = 0
  uniques: Record<string, string[][]> = { serie_auto_episodios: [['serie_id', 'week_key', 'attempt'], ['generation_id']] }
  private seq = 0
  from(table: string) { this.calls++; this.tables[table] ??= []; return new Q(this, table) }
  newId() { this.seq++; return `00000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}` }
}
class Q implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private filters: ((r: Row) => boolean)[] = []
  private op: 'select' | 'insert' | 'update' = 'select'
  private payload: Row = {}
  private single = false
  private lim: number | null = null
  private orderBy: { col: string; asc: boolean } | null = null
  constructor(private db: FakeDb, private table: string) {}
  select(_cols?: string, _o?: unknown) { if (this.op === 'select') this.op = 'select'; return this }
  insert(row: Row) { this.op = 'insert'; this.payload = row; return this }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this }
  is(c: string, v: unknown) { this.filters.push((r) => (r[c] ?? null) === v); return this }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this }
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending !== false }; return this }
  limit(n: number) { this.lim = n; return this }
  range(a: number, b: number) { this.lim = b - a + 1; return this }
  maybeSingle() { this.single = true; return this }
  then<A, B>(res?: ((v: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null, rej?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(res, rej)
  }
  private run(): { data: unknown; error: unknown } {
    const t = this.db.tables[this.table]
    if (this.op === 'insert') {
      const row: Row = { id: this.db.newId(), started_at: new Date(clock).toISOString(), ...this.payload }
      for (const keys of this.db.uniques[this.table] ?? []) {
        if (keys.some((k) => row[k] === undefined || row[k] === null)) continue
        if (t.some((r) => keys.every((k) => r[k] === row[k]))) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      }
      t.push(row)
      return { data: this.single ? { id: row.id } : [{ id: row.id }], error: null }
    }
    const hit = t.filter((r) => this.filters.every((f) => f(r)))
    if (this.op === 'update') { for (const r of hit) Object.assign(r, this.payload); return { data: null, error: null } }
    let out = [...hit]
    if (this.orderBy) { const { col, asc } = this.orderBy; out.sort((a, b) => (String(a[col] ?? '') < String(b[col] ?? '') ? -1 : 1) * (asc ? 1 : -1)) }
    if (this.lim !== null) out = out.slice(0, this.lim)
    return { data: this.single ? (out[0] ?? null) : out, error: null }
  }
}

// ── relógio, rota e eventos falsos ─────────────────────────────────────────────────────────────────────────────────────
let clock = Date.UTC(2026, 10, 2, 10, 30) // segunda 02/11/2026 10:30 UTC — 30 min depois do horário da série
const posts: { path: string; body: Record<string, unknown> }[] = []
const events: SerieEvent[] = []
const fichaDerivadaChamadas: string[] = []
const deps: Partial<SerieDeps> = {
  now: () => clock,
  writeEvent: async (e) => { events.push(e) },
  mintUserSession: async (userId) => ({ userId, accessToken: 'fake', refreshToken: 'fake', expiresAt: clock + 3_600_000 } as never),
  callAsUser: async <T,>(a: { path: string; body?: unknown }) => { posts.push({ path: a.path, body: a.body as Record<string, unknown> }); return { ok: true, status: 200, body: { credits_charged: 35 } as T, errorText: null } },
  derivarFicha: (script) => { fichaDerivadaChamadas.push(script); return [{ nome: 'Milo', canonica: 'Milo, a small orange fox with a blue scarf', tipo: 'animal', protagonista: true }] },
}
const FUNDADOR = 'josephsskaf@gmail.com'
const FICHA = [
  { nome: 'Dina', canonica: 'Dina, a young woman explorer with short red hair, green jacket and a brass compass', tipo: 'humano', protagonista: true },
  { nome: 'Bolt', canonica: 'Bolt, a small silver robot dog with one blue eye', tipo: 'criatura', protagonista: false },
]
const SOURCE = 'Dina, a young explorer named Dina, finds a brass compass that points to lost places. Her robot dog Bolt follows her into the old lighthouse, where the compass starts to glow.'
function semear(db: FakeDb, opts: { credits: number; email?: string; ficha?: unknown; id?: string }) {
  const id = opts.id ?? 'aaaaaaaa-0000-4000-8000-000000000001'
  db.tables.profiles = [{ id: 'user-1', email: opts.email ?? FUNDADOR, video_credits: opts.credits }]
  db.tables.serie_auto = [{ id, user_id: 'user-1', status: 'active', theme: 'The Lost Places Compass', engine: 'seedance', duration: 60, language: 'en', weekday: 1, hour_utc: 10, next_run_at: null, ficha: opts.ficha === undefined ? FICHA : opts.ficha, source_script: SOURCE, anchor: null, episodes_delivered: 0, last_episode_seq: 1, last_episode_idea: null, consecutive_skips: 0 }]
  db.tables.serie_auto_episodios = []
  db.tables.events = []
  db.tables.credit_debits = []
  db.tables.videos = []
  return id
}
const rodar = (db: FakeDb, enabled?: boolean) => seriePass({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled, deps })
const COST60 = serieEpisodeCost(60)

console.log('A — interruptor desligado')
ok(SERIE_AUTO_ENABLED === false, 'A1 o interruptor do código nasce DESLIGADO (SERIE_AUTO_ENABLED=false)')
{
  const db = new FakeDb(); semear(db, { credits: 500 }); const antes = db.calls
  const r = await rodar(db) // sem override: lê o interruptor do código
  ok(r.enabled === false && db.calls === antes && posts.length === 0 && events.length === 0, 'A2 desligado: nenhuma leitura do banco, nenhum POST, nenhum evento')
  const r2 = await rodar(db, false)
  ok(r2.enabled === false && db.calls === antes && posts.length === 0, 'A3 desligado explícito: idem')
}

console.log('B — só conta da casa')
ok(serieAutoAccountAllowed(FUNDADOR) && serieAutoAccountAllowed(' JosephSSkaf@gmail.com '), 'B1 o fundador passa (e-mail exato, sem diferença de caixa/espaço)')
ok(!serieAutoAccountAllowed('testuser@gmail.com') && !serieAutoAccountAllowed('cliente@gmail.com') && !serieAutoAccountAllowed(null), 'B2 padrão LIKE ("test%") e cliente comum NÃO passam')
ok(SERIE_AUTO_INTERNAL_EMAILS.every((e) => !e.includes('%')), 'B3 a lista é só de e-mails exatos (nenhum curinga)')
{
  const db = new FakeDb(); semear(db, { credits: 500, email: 'cliente@gmail.com' })
  const r = await rodar(db, true)
  ok(r.dispatch.due === 1 && r.dispatch.started === 0 && posts.length === 0 && db.tables.serie_auto_episodios.length === 0, 'B4 ligado + conta de cliente: nada despacha, nenhum episódio nasce')
}

console.log('C — ligado + conta interna: uma vez por semana, ficha preservada')
{
  const db = new FakeDb(); const serieId = semear(db, { credits: 500 })
  const w1 = serieWeekKey(clock)
  const r1 = await rodar(db, true)
  ok(r1.dispatch.started === 1 && posts.length === 1, `C1 1ª passada da semana ${w1}: exatamente 1 POST`)
  const p1 = posts[0]
  ok(p1.path === '/api/generate-video-cinematic', 'C2 o POST vai para a rota de sempre (/api/generate-video-cinematic)')
  ok(p1.body.generationId === serieGenerationId(serieId, w1, 1) && /^[A-Za-z0-9_-]{8,100}$/.test(String(p1.body.generationId)), 'C3 generation_id determinístico por (série, semana, tentativa) e válido para a rota')
  const ideia1 = String(p1.body.prompt)
  ok(ideia1.includes('Episode 2') && ideia1.includes('The Lost Places Compass'), 'C4 a ideia é do episódio 2 da série certa')
  ok(ideia1.includes(FICHA[0].canonica) && ideia1.includes(FICHA[1].canonica), 'C5 a ficha gravada vai no texto (protagonista e coadjuvante)')
  const ep1 = db.tables.serie_auto_episodios[0]
  ok(db.tables.serie_auto_episodios.length === 1 && ep1.status === 'dispatched' && ep1.week_key === w1 && ep1.seq === 2 && ep1.idea === ideia1, 'C6 o episódio nasceu ANTES do POST e ficou dispatched com a ideia gravada')
  ok(JSON.stringify(db.tables.serie_auto[0].ficha) === JSON.stringify(FICHA) && fichaDerivadaChamadas.length === 0, 'C7 a ficha gravada não foi sobrescrita nem re-derivada')
  ok(db.tables.serie_auto[0].next_run_at === new Date(Date.UTC(2026, 10, 9, 10, 0)).toISOString(), 'C8 a agenda anda para a próxima segunda 10:00 UTC')
  // 2ª passada na mesma semana (cron horário) — mesmo forçando next_run_at para trás
  clock += 60 * 60 * 1000
  db.tables.serie_auto[0].next_run_at = null
  const r2 = await rodar(db, true)
  ok(posts.length === 1 && r2.dispatch.started === 0 && db.tables.serie_auto_episodios.length === 1, 'C9 2ª passada na MESMA semana (next_run_at forçado): nenhum POST novo, nenhum episódio novo')
  // corrida: o mesmo insert de novo bate na unique (série, semana, tentativa)
  const dup = await (db.from('serie_auto_episodios').insert({ serie_id: serieId, user_id: 'user-1', week_key: w1, seq: 2, attempt: 1, status: 'pending', generation_id: 'outro-id-qualquer' }).select('id').maybeSingle() as unknown as Promise<{ error: { code?: string } | null }>)
  ok(dup.error?.code === '23505', 'C10 a trava (série, semana, tentativa) recusa um segundo episódio na mesma semana')
  // o episódio é entregue: a casa montou e gravou em videos
  db.tables.events.push({ name: 'stranded_composed', session_id: ep1.generation_id, metadata: { render_id: 'r-ep2' }, created_at: new Date(clock).toISOString() })
  db.tables.videos.push({ id: 'v-ep2', user_id: 'user-1', render_id: 'r-ep2', status: 'completed', final_video_url: 'https://x/v.mp4' })
  db.tables.credit_debits.push({ render_id: 'irrelevante', refunded_at: null })
  const r3 = await rodar(db, true)
  ok(r3.settled.delivered === 1 && db.tables.serie_auto_episodios[0].status === 'delivered' && db.tables.serie_auto[0].last_episode_seq === 2 && db.tables.serie_auto[0].episodes_delivered === 1, 'C11 liquidação: filme montado → entregue, a série anda para o episódio 2')
  // semana seguinte
  clock = Date.UTC(2026, 10, 9, 10, 5)
  const r4 = await rodar(db, true)
  const w2 = serieWeekKey(clock)
  ok(w2 !== w1 && r4.dispatch.started === 1 && posts.length === 2, `C12 semana seguinte (${w2}): exatamente 1 POST novo`)
  const ideia2 = String(posts[1].body.prompt)
  ok(ideia2.includes('Episode 3') && ideia2.includes(FICHA[0].canonica) && ideia2 !== ideia1, 'C13 o episódio 3 sai com a MESMA ficha e outro ângulo')
  ok(JSON.stringify(db.tables.serie_auto[0].ficha) === JSON.stringify(FICHA), 'C14 a ficha continua byte a byte a mesma depois de 2 episódios')
  clock += 30 * 60 * 1000; db.tables.serie_auto[0].next_run_at = null
  await rodar(db, true)
  ok(posts.length === 2, 'C15 e de novo: 2ª passada da semana seguinte não duplica')
  ok(events.filter((e) => e.name === SERIE_AUTO_EVENTS.dispatched).length === 2, 'C16 dois serie_auto_episode_dispatched no total (1 por semana)')
}

console.log('D — a régua certa do motor')
{
  const corpo = posts[0].body
  ok(corpo.engine === 'seedance' && corpo.script_mode === 'ai' && corpo.duration === 60 && corpo.language === 'en', 'D1 o corpo vai com engine seedance, script_mode ai, a duração e a língua da série')
  ok(serieReguaDoMotor('seedance') === 'classic' && SPEECH_RATE_BASE.classic === 3.1 && serieReguaDoMotor('hollywood') === 'hollywood', 'D2 Seedance fala na régua clássica (3,1 pal/s), não na hollywood')
  const ideia = String(corpo.prompt)
  ok(ehIdeiaSolta({ prompt: ideia, scriptMode: corpo.script_mode }), 'D3 a ideia é IDEIA SOLTA para a rota: o escritor do servidor escreve o roteiro na régua do motor')
  const tema = temaParaOEscritor({ ideia, seconds: 60, engine: 'seedance', language: 'en' })
  ok(!tema.duracaoAjustada && !tema.condensada && tema.segundosNoTexto === null, 'D4 a ideia não carrega segundos nem é condensada (o tamanho vem da duração da série)')
  ok(!/\b(?:150|165)\b|\bwords?\b|\bpalavras?\b|\bseconds?\b|\bsegundos?\b/i.test(ideia) && ideia.length <= SERIE_AUTO_IDEA_MAX_CHARS && !/[[\]]/.test(ideia), 'D5 nenhuma contagem de palavras (nem a régua 150–165), nenhum segundo, ≤ 600 caracteres, sem colchetes')
  ok(rd('lib/serieAuto/serieAuto.ts').includes("from '@/lib/speechRate'") && !/150\s*[-–]\s*165/.test(rd('lib/serieAuto/cron.ts')), 'D6 a régua vem de lib/speechRate (nenhum número de régua digitado no passe)')
  const longa = serieIdeiaDoEpisodio({ theme: 'x'.repeat(400), seq: 9, ficha: [{ nome: 'A', canonica: 'y '.repeat(300), protagonista: true }], sourceScript: 'z '.repeat(400) })
  ok(longa.length <= SERIE_AUTO_IDEA_MAX_CHARS, 'D7 tema/ficha enormes: a ideia continua no teto de 600')
}

console.log('E — sem crédito')
{
  posts.length = 0; events.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: COST60 - 1 })
  const r = await rodar(db, true)
  ok(r.dispatch.noCredits === 1 && posts.length === 0, `E1 saldo ${COST60 - 1} < custo ${COST60}: nenhum POST`)
  const skips = events.filter((e) => e.name === 'serie_skipped_no_credits')
  ok(skips.length === 1 && skips[0].metadata.cost === COST60 && skips[0].metadata.week_key === serieWeekKey(clock), 'E2 serie_skipped_no_credits gravado com custo e semana')
  ok(db.tables.serie_auto_episodios.length === 1 && db.tables.serie_auto_episodios[0].status === 'skipped', 'E3 a semana fica registrada como pulada (linha skipped)')
  clock += 60 * 60 * 1000; db.tables.serie_auto[0].next_run_at = null
  await rodar(db, true)
  ok(events.filter((e) => e.name === 'serie_skipped_no_credits').length === 1 && posts.length === 0, 'E4 2ª passada da mesma semana: o evento NÃO repete')
  clock = Date.UTC(2026, 10, 9, 10, 5)
  await rodar(db, true)
  ok(db.tables.serie_auto[0].status === 'paused' && db.tables.serie_auto[0].pause_reason === 'no_credits_twice' && events.some((e) => e.name === SERIE_AUTO_EVENTS.paused), 'E5 2ª semana seguida sem crédito: a série pausa')
}

console.log('F — sem ficha: deriva uma vez')
{
  posts.length = 0; events.length = 0; fichaDerivadaChamadas.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500, ficha: null })
  await rodar(db, true)
  const gravada = db.tables.serie_auto[0].ficha as { nome: string }[]
  ok(fichaDerivadaChamadas.length === 1 && Array.isArray(gravada) && gravada[0].nome === 'Milo' && String(posts[0].body.prompt).includes('Milo, a small orange fox'), 'F1 derivou do episódio 1, gravou e usou na ideia')
  ok(events.some((e) => e.name === SERIE_AUTO_EVENTS.fichaFixed), 'F2 evento serie_auto_ficha_fixed')
  clock = Date.UTC(2026, 10, 9, 10, 5)
  db.tables.serie_auto[0].source_script = 'Outro texto qualquer sobre outra personagem chamada Zara.'
  await rodar(db, true)
  ok(fichaDerivadaChamadas.length === 1 && JSON.stringify(db.tables.serie_auto[0].ficha) === JSON.stringify(gravada) && String(posts[1].body.prompt).includes('Milo'), 'F3 semana seguinte: não re-deriva; a ficha gravada vence mesmo com o texto de origem mudado')
}

console.log('G — fiação, agenda e migration')
{
  const route = rd('app/api/cron/autopilot-generate/route.ts')
  const iKids = route.indexOf('kids = await kidsPass(')
  const iSerie = route.indexOf('serie = await seriePass(')
  ok(route.includes("import { seriePass, type SeriePassSummary } from '@/lib/serieAuto/cron'") && iSerie > iKids && iKids > 0, 'G1 o cron do Autopilot chama o passe 4 depois do passe 3 (desenhos)')
  ok(/serie,\s*\/\/ KINEO-SERIE-AUTO-ETAPA1-0111/.test(route), 'G2 o resumo do cron devolve o resumo da série')
  const vercel = rd('vercel.json')
  ok(!/serie/i.test(vercel), 'G3 nenhuma entrada nova no vercel.json (o passe mora no cron que já existe)')
  const mig = fs.readdirSync('supabase/migrations').filter((f) => f.includes('serie_auto'))
  const sql = mig.length === 1 ? rd(`supabase/migrations/${mig[0]}`) : ''
  ok(mig.length === 1 && /unique \(serie_id, week_key, attempt\)/.test(sql) && /engine in \('seedance'\)/.test(sql) && /duration in \(35, 60, 90\)/.test(sql) && /ficha jsonb/.test(sql) && /enable row level security/.test(sql) && sql.includes(SERIE_AUTO_MARCA), 'G4 migration: trava (série, semana, tentativa), Seedance, 35/60/90, ficha jsonb, RLS, marca')
  ok(serieNextRunMs({ weekday: 1, hourUtc: 10, nowMs: Date.UTC(2026, 10, 2, 9, 0) }) === Date.UTC(2026, 10, 2, 10, 0) && serieNextRunMs({ weekday: 1, hourUtc: 10, nowMs: Date.UTC(2026, 10, 2, 10, 0) }) === Date.UTC(2026, 10, 9, 10, 0), 'G5 agenda: antes do horário = hoje; no horário ou depois = segunda seguinte')
  ok(serieWeekKey(Date.UTC(2026, 10, 2)) === '2026-W45' && serieWeekKey(Date.UTC(2027, 0, 1)) === '2026-W53' && serieWeekKey(Date.UTC(2026, 10, 8, 23, 59)) === '2026-W45', 'G6 semana ISO-8601 (inclusive a virada do ano e o domingo)')
  ok(COST60 > 0 && serieEpisodeCost(35) < COST60 && serieEpisodeCost(90) > COST60, `G7 custo pela fonte de sempre (35/60/90 s = ${serieEpisodeCost(35)}/${COST60}/${serieEpisodeCost(90)} cr)`)
  ok(['lib/serieAuto/serieAuto.ts', 'lib/serieAuto/cron.ts'].every((p) => rd(p).includes(SERIE_AUTO_MARCA)), 'G8 todo arquivo novo carrega a marca')
  let desfeito = ''
  try { desfeito = semSerieAuto0111(fs.readFileSync('app/api/cron/autopilot-generate/route.ts', 'utf8'), 'app/api/cron/autopilot-generate/route.ts') } catch (e) { console.log('       (' + (e as Error).message + ')') }
  ok(desfeito.length > 0 && !desfeito.includes(SERIE_AUTO_MARCA) && route.split('\n').filter((l) => l.includes(SERIE_AUTO_MARCA)).length === 4, 'G9 desfaz exato: o cron menos as 4 linhas marcadas = origin/main 2359bf434 (sha256)')
  ok(rd('scripts/test-kids-venda-2010.mjs').includes('semCronOrigem2610(semSerieAuto0111(disco(p), p), p)'), 'G10 encadeado: o guardião dos desenhos tira esta camada antes da origem do cron')
  ok(!rd('lib/serieAuto/cron.ts').includes('fundCredits') && !/video_credits:\s*[^}]*\+/.test(rd('lib/serieAuto/cron.ts')), 'G11 o passe nunca financia nem soma crédito (só lê o saldo)')
}

// ── mutantes: o guardião acusa o defeito que devia acusar ─────────────────────────────────────────────────────────────
console.log('M — mutantes')
{
  posts.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  db.uniques.serie_auto_episodios = [] // mutante: sem a trava da semana
  await rodar(db, true)
  clock += 3_600_000; db.tables.serie_auto[0].next_run_at = null
  await rodar(db, true)
  ok(posts.length === 1, 'M1 sem a unique a defesa ainda é a leitura da semana (episódio vivo = no-op): continua 1 POST')
  db.tables.serie_auto_episodios.length = 0; db.tables.serie_auto[0].next_run_at = null
  await rodar(db, true)
  ok(posts.length === 2, 'M2 apagando o episódio da semana (mutante), o passe despacharia de novo — prova de que o C9 depende do registro da semana')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok · ${fail} falhas`)
if (fail > 0) process.exit(1)
