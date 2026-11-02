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
//   G. o cron do Autopilot chama o passe 4 depois do passe 3, sem entrada nova no vercel.json; a migration tem a trava (série, semana);
//   H. COBRANÇA DUPLA (revisão de 01/11): prazo estourado COM débito vivo = 'stuck', nunca nova tentativa; débito ilegível não decide
//      nada; filme montado pelo caminho de recuperação (stranded_recovery_composed) conta como entregue; sem débito pode retentar;
//      402 da rota = semana pulada (não 3 falhas); falha de semana passada não reabre a agenda; apelido Gmail de terceiro fica de fora.
//   P. 503 ESTACIONADO (revisão 2 de 01/11): a rota estorna, grava render_parked e responde 503 queued/parked; o episódio fica 'parked'
//      (ocupa a semana, nunca tentativa 2), o passe A segue o id 'parked-…' do resume-parked-renders e a série anda com o filme retomado;
//      fechamento sem retomada / 503 queued sem render_parked / 30 h sem fechamento = falha sem cobrança que retenta;
//   Q. ficha vazia/malformada é derivada de novo; série pulada (perfil, conta fora da casa, semana ilegível) empurra a agenda e as
//      travadas não monopolizam a leitura das devidas.
//   R. revisão 3 de 01/11 — o resume-parked-renders: a retomada que a rota RE-ESTACIONA (linha filha 'parked-…') nunca é retomada (uma
//      queda de 2 h com o cron a cada 5 min dava ~25 débitos e 25 filmes); episódio da série nunca é 'superseded' nem conta como pedido
//      novo; aluguel que já cobrou (sem desfecho ou sem fechamento) é adotado em vez de abrir a tentativa N+1. Simulado com as decisões
//      REAIS de lib/filaQuedaFal + os ids reais de lib/filaQuedaFalIds, e as chamadas conferidas no texto da rota do cron.
//   S. o passe B nunca abre a tentativa 2 sem LER o débito (503 "refund is still being confirmed", 500 depois do débito); a ficha
//      derivada só vale (e só gera evento) se a gravação pegou — senão vale a gravada pela outra escrita.
// Rodar: npx tsx scripts/test-serie-auto-etapa1-0111.mts
import fs from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { seriePass, SERIE_COMPOSED_EVENTS, type SerieDeps, type SerieEvent } from '../lib/serieAuto/cron'
import { cinematicClaimId } from '../lib/cinematic/claim'
import {
  SERIE_AUTO_ENABLED, SERIE_AUTO_INTERNAL_EMAILS, SERIE_AUTO_EVENTS, SERIE_AUTO_MARCA, serieAutoAccountAllowed, serieEpisodeCost, serieGenerationId,
  serieIdeiaDoEpisodio, serieNextRunMs, serieReguaDoMotor, serieWeekKey, SERIE_AUTO_IDEA_MAX_CHARS,
  serieAutoEmailDeTerceiro, serieEpisodioOcupaSemana, SERIE_AUTO_ERRO_DEBITO_VIVO, SERIE_AUTO_RUN_TIMEOUT_MS, SERIE_AUTO_STUCK_CLOSE_MS,
  serieRespostaEstacionada,
} from '../lib/serieAuto/serieAuto'
import {
  PARKED_TTL_MS, PARKED_MAX_RESUMES_PER_RUN, PARKED_LEASE_TTL_MS, SERIE_AUTO_GENERATION_PREFIX, classificarRespostaDaRetomada, decidirRetomada,
  aluguelPodeTerCobrado, decidirAluguelSemFechamento, ehDespachoDaSerie, ehRetomadaDeEstacionado, estacionadoRetomavel, estacionadoSuperavel,
  leituraDaCobranca, situacaoDaTentativa, type SituacaoDaTentativa, // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 (revisão 5: a cobrança é débito E claim; 'settled' = filme a caminho)
} from '../lib/filaQuedaFal'
import { idDaRetomada, idDoAluguel, idDoFechamento } from '../lib/filaQuedaFalIds'
import { ehIdeiaSolta, temaParaOEscritor } from '../lib/meta95/ideiaNoEscritor'
import { SPEECH_RATE_BASE } from '../lib/speechRate'
// @ts-ignore — módulo .mjs de apoio dos guardiões (sem tipos)
import { semSerieAuto0111 } from './test-support/desfaz-serie-auto-etapa1-0111.mjs'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const execGit = (a: string[]) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')

// ── banco em memória: o subconjunto do PostgREST que o passe usa ─────────────────────────────────────────────────────────
type Row = Record<string, unknown>
class FakeDb {
  tables: Record<string, Row[]> = {}
  calls = 0
  /** Tabelas cuja LEITURA devolve erro (simula o banco instável: o débito vira 'unknown'). */
  failSelect = new Set<string>()
  uniques: Record<string, string[][]> = { serie_auto_episodios: [['serie_id', 'week_key', 'attempt'], ['generation_id']], events: [['id']] }
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
  /** update(...).select('id'): o PostgREST devolve as linhas que a escrita pegou (0 linhas = o filtro não casou). */
  private wantRows = false
  select(_cols?: string, _o?: unknown) { if (this.op !== 'select') this.wantRows = true; return this }
  insert(row: Row) { this.op = 'insert'; this.payload = row; return this }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this }
  // jsonb: o PostgREST compara o texto do filtro com o valor da coluna (eq.[] casa com a coluna jsonb []) — o passe usa isso na ficha
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v || (typeof v === 'string' && r[c] !== undefined && r[c] !== null && JSON.stringify(r[c]) === v)); return this }
  /** O subconjunto de or() que o passe usa: 'col.is.null,col.lte.<iso>' (e gte/eq). */
  or(expr: string) {
    const partes = expr.split(',').map((p) => { const [c, op, ...resto] = p.split('.'); return { c, op, v: resto.join('.') } })
    this.filters.push((r) => partes.some(({ c, op, v }) => op === 'is' && v === 'null' ? (r[c] ?? null) === null : r[c] === undefined || r[c] === null ? false : op === 'lte' ? String(r[c]) <= v : op === 'gte' ? String(r[c]) >= v : op === 'eq' ? String(r[c]) === v : false))
    return this
  }
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
    if (this.op === 'select' && this.db.failSelect.has(this.table)) return { data: null, error: { code: 'XX000', message: 'leitura falhou' } }
    const hit = t.filter((r) => this.filters.every((f) => f(r)))
    if (this.op === 'update') { for (const r of hit) Object.assign(r, this.payload); return { data: this.wantRows ? hit.map((r) => ({ id: r.id })) : null, error: null } }
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
const callOk: SerieDeps['callAsUser'] = async <T,>(a: { path: string; body?: unknown }) => { posts.push({ path: a.path, body: a.body as Record<string, unknown> }); return { ok: true, status: 200, body: { credits_charged: 35 } as T, errorText: null } }
const deps: Partial<SerieDeps> = {
  now: () => clock,
  writeEvent: async (e) => { events.push(e) },
  mintUserSession: async (userId) => ({ userId, accessToken: 'fake', refreshToken: 'fake', expiresAt: clock + 3_600_000 } as never),
  callAsUser: callOk,
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
// exemplo da revisão: joseph+teste01@gmail.com entrega na caixa de joseph@gmail.com (estranho)
ok(!serieAutoAccountAllowed('joseph+teste01@gmail.com') && !SERIE_AUTO_INTERNAL_EMAILS.includes('joseph+teste01@gmail.com') && serieAutoEmailDeTerceiro('joseph+teste01@gmail.com'), 'B5 apelido Gmail de terceiro (joseph+teste01@gmail.com → caixa joseph@gmail.com) NÃO passa')
ok(serieAutoAccountAllowed('teste01@shortsforgeai.com') && serieAutoAccountAllowed('victoriaskaf96@gmail.com') && !serieAutoEmailDeTerceiro('josephsskaf@gmail.com') && !serieAutoEmailDeTerceiro('teste01@shortsforgeai.com'), 'B6 as contas exatas da casa sem apelido continuam passando')
{
  const db = new FakeDb(); semear(db, { credits: 500, email: 'joseph+teste01@gmail.com' })
  const r = await rodar(db, true)
  ok(r.dispatch.started === 0 && posts.length === 0 && db.tables.serie_auto_episodios.length === 0, 'B7 ligado + série na conta joseph+teste01@gmail.com: nada despacha (o e-mail iria para um estranho)')
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
  // revisão 01/11: a linha nova no test-kids-venda-2010 quebrava o desfaz do afiliado50 (D3/D4 deixavam de rodar). O guardião dos
  // desenhos volta a ser o da base; a camada sai DENTRO do desfaz da origem do cron (a mais nova primeiro, como a galeria de 27/10).
  ok(rd('scripts/test-kids-venda-2010.mjs') === execGit(['show', '2359bf434288d0bf2b2727b994e3c374d23901ab:scripts/test-kids-venda-2010.mjs']) && !rd('scripts/test-kids-venda-2010.mjs').includes(SERIE_AUTO_MARCA), 'G10 o guardião dos desenhos (test-kids-venda-2010) ficou byte a byte como na base: nenhuma linha desta entrega')
  const origem = rd('scripts/test-support/desfaz-cron-origem-2610.mjs')
  ok(/^  text = semSerieAuto0111\(text, rel\) \/\/ KINEO-SERIE-AUTO-ETAPA1-0111/m.test(origem) && origem.indexOf('text = semSerieAuto0111(') < origem.indexOf('text = semGaleriaHome2710('), 'G10b encadeado: o desfaz da origem do cron tira esta camada antes de todas')
  // @ts-ignore — módulo .mjs de apoio dos guardiões (sem tipos)
  const { semCronOrigem2610 } = await import('./test-support/desfaz-cron-origem-2610.mjs')
  const viaOrigem = semCronOrigem2610(fs.readFileSync('app/api/cron/autopilot-generate/route.ts', 'utf8'), 'app/api/cron/autopilot-generate/route.ts')
  ok(!viaOrigem.includes(SERIE_AUTO_MARCA) && !viaOrigem.includes('KINEO-CRON-ORIGEM-2610'), 'G10c pela cadeia da origem do cron, o cron sai sem esta camada e sem a da origem')
  const kids = spawnSync(process.execPath, ['scripts/test-kids-venda-2010.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const kOut = String(kids.stdout ?? '') + String(kids.stderr ?? '')
  ok(!/semAfiliado50_2610: scripts\/test-kids-venda-2010\.mjs mudou fora/.test(kOut) && /ok\s+D3 todo arquivo novo carrega a marca/.test(kOut) && /ok\s+D4 trocas só em arquivos declarados/.test(kOut) && /ok\s+D1 desfaz exato[^\n]*app\/api\/cron\/autopilot-generate\/route\.ts/.test(kOut), 'G10d o guardião dos desenhos roda D1 (cron) + D3 + D4 verdes, sem o crash do afiliado50 que a revisão achou')
  ok(!rd('lib/serieAuto/cron.ts').includes('fundCredits') && !/video_credits:\s*[^}]*\+/.test(rd('lib/serieAuto/cron.ts')), 'G11 o passe nunca financia nem soma crédito (só lê o saldo)')
}

// ── H. cobrança dupla e as menores da revisão de 01/11 ────────────────────────────────────────────────────────────────
console.log('H — nunca cobrar o mesmo episódio duas vezes')
const debitoDe = (genId: unknown, refunded: string | null = null) => ({ user_id: 'user-1', render_id: `cinematic-${cinematicClaimId('user-1', String(genId))}`, refunded_at: refunded })
/** Monta o cenário: 1 episódio despachado na segunda 10:30; devolve o db e o episódio. */
async function despachado(passe: typeof seriePass = seriePass) {
  posts.length = 0; events.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  await passe({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled: true, deps })
  return { db, ep: db.tables.serie_auto_episodios[0] }
}
async function cenarioTimeoutDebitoVivo(passe: typeof seriePass = seriePass) {
  const { db, ep } = await despachado(passe)
  db.tables.credit_debits.push(debitoDe(ep.generation_id)) // a rota cobrou
  clock += SERIE_AUTO_RUN_TIMEOUT_MS + 60_000 // 6 h sem filme, ainda na mesma semana (segunda 16:31)
  const r = await passe({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled: true, deps })
  return { db, ep, r }
}
{
  // exemplo da revisão: render_timeout com o débito vivo marcava falha e o passe B despachava outra tentativa (outro débito)
  const { db, ep, r } = await cenarioTimeoutDebitoVivo()
  ok(posts.length === 1 && db.tables.serie_auto_episodios.length === 1, 'H1 6 h sem filme COM débito vivo: nenhuma tentativa nova na mesma passada (1 POST, 1 episódio)')
  ok(ep.status === 'stuck' && ep.error === 'render_timeout_debit_live' && r.settled.stuck === 1 && events.filter((e) => e.name === SERIE_AUTO_EVENTS.stuck).length === 1, 'H2 o episódio vira stuck (trava a semana) e serie_auto_stuck avisa uma vez')
  for (let i = 0; i < 3; i++) { clock += 3_600_000; db.tables.serie_auto[0].next_run_at = null; await rodar(db, true) }
  ok(posts.length === 1 && db.tables.serie_auto_episodios.length === 1 && events.filter((e) => e.name === SERIE_AUTO_EVENTS.stuck).length === 1, 'H3 mais 3 passadas na semana (agenda forçada): nenhum POST novo e o aviso não repete')
  // o render original termina TARDE pelo caminho de recuperação: entregue, sem segundo débito
  db.tables.events.push({ name: 'stranded_recovery_composed', session_id: ep.generation_id, metadata: { render_id: 'r-tardio' }, created_at: new Date(clock).toISOString() })
  db.tables.videos.push({ id: 'v-tardio', user_id: 'user-1', render_id: 'r-tardio', status: 'completed', video_url: 'https://x/t.mp4' })
  const r2 = await rodar(db, true)
  ok(r2.settled.delivered === 1 && ep.status === 'delivered' && db.tables.serie_auto[0].episodes_delivered === 1 && posts.length === 1, 'H4 filme tardio de um stuck = entregue; o cliente pagou UM episódio')
}
{
  // stuck sem filme nem estorno por 7 dias: fecha sem retentativa
  const { db, ep } = await cenarioTimeoutDebitoVivo()
  clock = Date.parse(String(ep.dispatched_at)) + SERIE_AUTO_STUCK_CLOSE_MS + 60_000
  db.tables.serie_auto[0].next_run_at = new Date(clock + 86_400_000).toISOString() // a série não está devida: isola o passe A
  await rodar(db, true)
  ok(ep.status === 'failed' && ep.error === SERIE_AUTO_ERRO_DEBITO_VIVO && db.tables.serie_auto[0].next_run_at !== new Date(clock).toISOString() && posts.length === 1, 'H5 7 dias stuck: fecha como render_lost_debit_live, sem reabrir a agenda e sem POST')
  ok(serieEpisodioOcupaSemana({ status: 'failed', error: SERIE_AUTO_ERRO_DEBITO_VIVO }) && serieEpisodioOcupaSemana({ status: 'stuck' }) && !serieEpisodioOcupaSemana({ status: 'failed', error: 'render_timeout' }), 'H6 falha com débito vivo e stuck OCUPAM a semana; falha sem cobrança libera')
  // a mesma linha terminal dentro da semana corrente nunca abre a tentativa 2
  const db2 = new FakeDb(); const sid = semear(db2, { credits: 500 }); clock = Date.UTC(2026, 10, 2, 10, 30); posts.length = 0
  db2.tables.serie_auto_episodios.push({ id: 'x1', serie_id: sid, user_id: 'user-1', week_key: serieWeekKey(clock), seq: 2, attempt: 1, status: 'failed', error: SERIE_AUTO_ERRO_DEBITO_VIVO, generation_id: 'serie-x-1', started_at: new Date(clock).toISOString() })
  await rodar(db2, true)
  ok(posts.length === 0 && db2.tables.serie_auto_episodios.length === 1, 'H7 semana com falha de débito vivo: o passe B não despacha outra tentativa')
}
{
  // exemplo da revisão: dispatch_lost com a leitura do débito em erro ('unknown') marcava falha e retentava
  posts.length = 0; events.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  deps.callAsUser = async <T,>(a: { path: string; body?: unknown }) => { posts.push({ path: a.path, body: a.body as Record<string, unknown> }); return { ok: false, status: 0, body: null as T, errorText: 'timeout' } }
  await rodar(db, true)
  deps.callAsUser = callOk
  const ep = db.tables.serie_auto_episodios[0]
  ok(ep.status === 'pending' && posts.length === 1, 'H8 POST sem resposta: o episódio fica pending (pode estar vivo na Vercel)')
  db.failSelect.add('credit_debits')
  clock += 2 * 3_600_000; db.tables.serie_auto[0].next_run_at = null
  await rodar(db, true)
  ok(ep.status === 'pending' && posts.length === 1 && db.tables.serie_auto_episodios.length === 1 && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'H9 pending velho com débito ILEGÍVEL: não falha, não retenta (o cliente pode ter pago)')
  // e um despachado que passa do prazo com débito ilegível também não decide nada
  db.failSelect.delete('credit_debits'); db.tables.credit_debits.push(debitoDe(ep.generation_id))
  await rodar(db, true)
  ok(ep.status === 'dispatched', 'H10 o débito volta a ser legível e vivo: pending → dispatched')
  db.failSelect.add('credit_debits')
  clock += SERIE_AUTO_RUN_TIMEOUT_MS + 60_000; db.tables.serie_auto[0].next_run_at = null
  await rodar(db, true)
  ok(ep.status === 'dispatched' && posts.length === 1 && db.tables.serie_auto_episodios.length === 1, 'H11 6 h sem filme com débito ILEGÍVEL: segue dispatched, nenhum POST novo')
  db.failSelect.delete('credit_debits')
}
{
  // exemplo da revisão: filme montado pelo caminho stranded_recovery_composed nunca era visto e caía no timeout
  const { db, ep } = await despachado()
  db.tables.credit_debits.push(debitoDe(ep.generation_id))
  clock += 40 * 60_000
  db.tables.events.push({ name: 'stranded_recovery_composed', session_id: ep.generation_id, metadata: { render_id: 'r-rec' }, created_at: new Date(clock).toISOString() })
  db.tables.videos.push({ id: 'v-rec', user_id: 'user-1', render_id: 'r-rec', status: 'completed', final_video_url: 'https://x/r.mp4' })
  const r = await rodar(db, true)
  ok(SERIE_COMPOSED_EVENTS.includes('stranded_composed') && SERIE_COMPOSED_EVENTS.includes('stranded_recovery_composed') && r.settled.delivered === 1 && ep.status === 'delivered' && ep.render_id === 'r-rec', 'H12 filme montado por stranded_recovery_composed = entregue')
}
{
  // sem débito (nada cobrado) e 6 h sem filme: pode retentar com outro generation_id
  const { db, ep } = await despachado()
  clock += SERIE_AUTO_RUN_TIMEOUT_MS + 60_000
  await rodar(db, true)
  const eps = db.tables.serie_auto_episodios
  ok(ep.status === 'failed' && ep.error === 'render_timeout' && posts.length === 2 && eps.length === 2 && eps[1].attempt === 2 && eps[1].generation_id !== ep.generation_id, 'H13 6 h sem filme SEM débito: falha e a tentativa 2 sai (nada foi cobrado)')
}
{
  // falha de um episódio de semana PASSADA não reabre a agenda (o horário da semana atual cuida dela)
  const { db, ep } = await despachado()
  db.tables.credit_debits.push(debitoDe(ep.generation_id, new Date(clock).toISOString())) // estornado
  clock = Date.UTC(2026, 10, 9, 8, 0) // segunda seguinte, antes do horário das 10:00
  const proxima = db.tables.serie_auto[0].next_run_at
  await rodar(db, true)
  ok(ep.status === 'failed' && db.tables.serie_auto[0].next_run_at === proxima && posts.length === 1, 'H14 estorno visto na semana seguinte: falha registrada, agenda intacta, nenhum POST antes do horário')
}
{
  // menor da revisão: a rota recusa com 402 (crédito/plano) — antes virava 3 falhas; agora é semana pulada
  posts.length = 0; events.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  deps.callAsUser = async <T,>(a: { path: string; body?: unknown }) => { posts.push({ path: a.path, body: a.body as Record<string, unknown> }); return { ok: false, status: 402, body: { error: 'This generation needs 35 credits.', reason: undefined, charged: false } as T, errorText: null } }
  const r = await rodar(db, true)
  for (let i = 0; i < 3; i++) { clock += 3_600_000; db.tables.serie_auto[0].next_run_at = null; await rodar(db, true) }
  deps.callAsUser = callOk
  const ep = db.tables.serie_auto_episodios[0]
  const skips = events.filter((e) => e.name === SERIE_AUTO_EVENTS.skippedNoCredits)
  ok(r.dispatch.noCredits === 1 && ep.status === 'skipped' && String(ep.error).startsWith('route_402') && posts.length === 1 && db.tables.serie_auto_episodios.length === 1, 'H15 402 da rota: semana pulada (1 POST só, nenhuma retentativa nas passadas seguintes)')
  ok(skips.length === 1 && skips[0].metadata.via === 'rota' && db.tables.serie_auto[0].consecutive_skips === 1 && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'H16 serie_skipped_no_credits UMA vez (via rota), conta como semana pulada, nenhuma falha')
}
{
  // mutantes de CÓDIGO: o guardião reprova o conserto desfeito de propósito (cópia mutada do passe, apagada no fim)
  const src = fs.readFileSync('lib/serieAuto/cron.ts', 'utf8').replace(/\r\n/g, '\n')
  const mutar = async (nome: string, de: string, para: string) => {
    if (!src.includes(de)) return null
    const arq = `lib/serieAuto/__mutante_${nome}.ts`
    fs.writeFileSync(arq, src.replace(de, para))
    try { return (await import(`../${arq}`)).seriePass as typeof seriePass } finally { fs.unlinkSync(arq) }
  }
  const mA = await mutar('debito_vivo', "        if (debit === 'live') {\n          // o cliente JÁ PAGOU", "        if (false) {\n          // o cliente JÁ PAGOU")
  if (mA) { const { db } = await cenarioTimeoutDebitoVivo(mA); ok(posts.length === 2 && db.tables.serie_auto_episodios.length === 2, 'M3 mutante (timeout ignora o débito vivo): a tentativa 2 sai e cobraria de novo — H1 reprova') } else ok(false, 'M3 mutante aplicado')
  const mB = await mutar('recuperacao', "[HOUSE_COMPOSED_EVENT, 'stranded_recovery_composed']", '[HOUSE_COMPOSED_EVENT]')
  if (mB) {
    const { db, ep } = await despachado(mB)
    db.tables.credit_debits.push(debitoDe(ep.generation_id)); clock += 40 * 60_000
    db.tables.events.push({ name: 'stranded_recovery_composed', session_id: ep.generation_id, metadata: { render_id: 'r-rec' }, created_at: new Date(clock).toISOString() })
    db.tables.videos.push({ id: 'v-rec', user_id: 'user-1', render_id: 'r-rec', status: 'completed', final_video_url: 'https://x/r.mp4' })
    await mB({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled: true, deps })
    ok(ep.status !== 'delivered', 'M4 mutante (só stranded_composed): o filme de recuperação não é visto — H12 reprova')
  } else ok(false, 'M4 mutante aplicado')
  const mC = await mutar('desconhecido', "        if (debit === 'unknown') { settled.pending++; continue }\n        if (debit === 'live')", "        if (debit === 'live')")
  if (mC) {
    posts.length = 0; events.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
    const db = new FakeDb(); semear(db, { credits: 500 })
    deps.callAsUser = async <T,>(a: { path: string; body?: unknown }) => { posts.push({ path: a.path, body: a.body as Record<string, unknown> }); return { ok: false, status: 0, body: null as T, errorText: 'timeout' } }
    await mC({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled: true, deps })
    deps.callAsUser = callOk
    db.failSelect.add('credit_debits'); clock += 2 * 3_600_000; db.tables.serie_auto[0].next_run_at = null
    await mC({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled: true, deps })
    ok(db.tables.serie_auto_episodios[0].status === 'failed', 'M5 mutante (débito ilegível decide): o pending falha às cegas — H9 reprova')
  } else ok(false, 'M5 mutante aplicado')
  ok(!fs.readdirSync('lib/serieAuto').some((f) => f.startsWith('__mutante_')), 'M6 nenhuma cópia mutada ficou no disco')
}

// ── P. o 503 ESTACIONADO e a retomada do resume-parked-renders (revisão 2 de 01/11) ────────────────────────────────────
// O caso: a fal recusa por capacidade/saldo, a rota estorna, grava `render_parked` (session_id = generation_id da série) e responde
// 503 { queued, parked, refunded }. O passe tratava como falha comum e abria a tentativa 2 uma hora depois, enquanto o cron
// resume-parked-renders retomava o pedido com um id 'parked-…': 2 débitos, 2 filmes, 2 e-mails. E a série não andava (o passe A
// só olhava o generation_id próprio).
console.log('P — 503 estacionado + retomada: um episódio, um débito, um filme')
const iso = (ms: number) => new Date(ms).toISOString()
const RESP_PARKED = { queued: true, parked: true, error: 'Our video engine is paused for a few minutes.', reason: 'capacity', retryable: false, charged: false, refunded: true }
/** A rota estaciona como a de verdade: débito estornado, `render_parked` gravado ANTES da resposta, 503. `grava:false` = 503 queued sem estacionar. */
const rotaEstaciona = (db: FakeDb, opts: { grava?: boolean; status?: number } = {}): SerieDeps['callAsUser'] => async <T,>(a: { path: string; body?: unknown }) => {
  posts.push({ path: a.path, body: a.body as Record<string, unknown> })
  const gen = String((a.body as Record<string, unknown>).generationId)
  db.tables.credit_debits.push(debitoDe(gen, iso(clock)))
  if (opts.grava !== false) db.tables.events.push({ name: 'render_parked', user_id: 'user-1', session_id: gen, created_at: iso(clock), metadata: { reason: 'capacity', refunded: true, request: { prompt: (a.body as Record<string, unknown>).prompt, duration: 60 } } })
  if (opts.status === 0) return { ok: false, status: 0, body: null as T, errorText: 'timeout' }
  return { ok: false, status: 503, body: (opts.grava === false ? { queued: true, error: "We're experiencing high demand right now." } : RESP_PARKED) as T, errorText: null }
}
const passeCom = (db: FakeDb, passe: typeof seriePass = seriePass) => passe({ db: db as never, baseUrl: 'https://example.test', deadline: clock + 250_000, sessions: new Map(), enabled: true, deps })
async function estacionado(opts: { grava?: boolean; status?: number } = {}, passe: typeof seriePass = seriePass) {
  posts.length = 0; events.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  deps.callAsUser = rotaEstaciona(db, opts)
  const r = await passeCom(db, passe)
  deps.callAsUser = callOk
  return { db, ep: db.tables.serie_auto_episodios[0], r }
}
/** O resume-parked-renders: aluga (render_parked_taken) e, se a rota aceitou, fecha 'resumed' com o id 'parked-…' (as chaves dele). */
function resumeCron(db: FakeDb, gen: unknown, resumeId: string, opts: { outcome?: string; fecha?: boolean } = {}) {
  const outcome = opts.outcome ?? 'resumed'
  db.tables.events.push({ name: 'render_parked_taken', user_id: 'user-1', session_id: gen, created_at: iso(clock), metadata: { version: 'fila_queda_fal_v1', attempt: 1, outcome: outcome === 'resumed' ? 'started' : outcome, status: outcome === 'resumed' ? 200 : 0, resume_generation_id: resumeId } })
  if (opts.fecha !== false) db.tables.events.push({ name: 'render_parked_closed', user_id: 'user-1', session_id: gen, created_at: iso(clock), metadata: { version: 'fila_queda_fal_v1', outcome, attempts: 1, ...(outcome === 'resumed' ? { resume_generation_id: resumeId } : {}) } })
}
const horas = async (db: FakeDb, n: number, passe: typeof seriePass = seriePass) => { for (let i = 0; i < n; i++) { clock += 3_600_000; db.tables.serie_auto[0].next_run_at = null; await passeCom(db, passe) } }
{
  const { db, ep, r } = await estacionado()
  ok(ep.status === 'parked' && r.dispatch.parked === 1 && r.dispatch.failed === 0 && ep.parked_at === iso(clock) && String(ep.error).startsWith('parked_'), 'P1 503 {queued, parked, refunded}: o episódio fica PARKED (em andamento), não falha')
  ok(db.tables.serie_auto[0].next_run_at === iso(Date.UTC(2026, 10, 9, 10, 0)) && events.filter((e) => e.name === SERIE_AUTO_EVENTS.parked).length === 1 && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'P2 a agenda anda para a semana que vem; serie_auto_parked uma vez; nenhum serie_auto_failed')
  await horas(db, 6)
  ok(posts.length === 1 && db.tables.serie_auto_episodios.length === 1 && ep.status === 'parked' && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'P3 seis passadas horárias (agenda forçada): nenhuma tentativa 2 — o estorno do estacionamento não vira falha')
  ok(serieEpisodioOcupaSemana({ status: 'parked' }) && serieRespostaEstacionada(503, RESP_PARKED) && serieRespostaEstacionada(503, { queued: true }) && serieRespostaEstacionada(503, null) && !serieRespostaEstacionada(503, { error: 'x' }) && !serieRespostaEstacionada(503, { parked: true, charged: true }), 'P4 parked OCUPA a semana; parked/queued/503 sem corpo = estacionado; 503 comum e cobrança viva não')
  // o resume-parked-renders retoma com o id 'parked-…' e a rota cobra por ele
  clock += 30 * 60_000
  resumeCron(db, ep.generation_id, 'parked-0a1b2c3d4e5f60718293a4b5')
  db.tables.credit_debits.push(debitoDe('parked-0a1b2c3d4e5f60718293a4b5'))
  const r2 = await passeCom(db)
  ok(r2.settled.resumed === 1 && ep.status === 'dispatched' && ep.resume_generation_id === 'parked-0a1b2c3d4e5f60718293a4b5' && ep.dispatched_at === iso(clock) && posts.length === 1, 'P5 fechamento resumed: o id parked-… vira o episódio da série (resume_generation_id gravado), nenhum POST da série')
  ok(events.filter((e) => e.name === SERIE_AUTO_EVENTS.resumed).length === 1 && events.find((e) => e.name === SERIE_AUTO_EVENTS.resumed)?.metadata.parked_generation_id === ep.generation_id, 'P6 serie_auto_resumed liga o pedido estacionado (generation_id da série) ao parked-…')
  await horas(db, 2)
  ok(ep.status === 'dispatched' && posts.length === 1, 'P7 retomado e ainda montando: segue dispatched, sem tentativa nova')
  // a casa monta o filme RETOMADO (session_id = parked-…) e grava em videos
  db.tables.events.push({ name: 'stranded_composed', user_id: 'user-1', session_id: 'parked-0a1b2c3d4e5f60718293a4b5', metadata: { render_id: 'r-park' }, created_at: iso(clock) })
  db.tables.videos.push({ id: 'v-park', user_id: 'user-1', render_id: 'r-park', status: 'completed', final_video_url: 'https://x/p.mp4' })
  const r3 = await passeCom(db)
  ok(r3.settled.delivered === 1 && ep.status === 'delivered' && ep.render_id === 'r-park' && ep.video_id === 'v-park', 'P8 o filme retomado é reconhecido como o episódio: entregue')
  ok(db.tables.serie_auto[0].last_episode_seq === 2 && db.tables.serie_auto[0].episodes_delivered === 1 && db.tables.serie_auto[0].last_episode_video_id === 'v-park' && events.find((e) => e.name === SERIE_AUTO_EVENTS.delivered)?.metadata.resume_generation_id === 'parked-0a1b2c3d4e5f60718293a4b5', 'P9 a série ANDA: last_episode_seq 2, 1 entregue, o vídeo é o retomado')
  const debitosVivos = db.tables.credit_debits.filter((d) => !d.refunded_at).length
  ok(posts.length === 1 && db.tables.serie_auto_episodios.length === 1 && debitosVivos === 1, 'P10 no fim: 1 POST da série, 1 episódio, 1 débito vivo (o da retomada) — o cliente pagou UM episódio')
  clock = Date.UTC(2026, 10, 9, 10, 5)
  await passeCom(db)
  ok(posts.length === 2 && String(posts[1].body.prompt).includes('Episode 3'), 'P11 semana seguinte: sai o episódio 3 (não repete o número nem o ângulo do 2)')
}
{
  // o filme retomado é estornado (falhou de verdade): nada cobrado → falha que pode retentar
  const { db, ep } = await estacionado()
  clock += 3_600_000
  resumeCron(db, ep.generation_id, 'parked-ffff0000ffff0000ffff0000')
  db.tables.credit_debits.push(debitoDe('parked-ffff0000ffff0000ffff0000'))
  await passeCom(db)
  db.tables.credit_debits.find((d) => d.render_id === debitoDe('parked-ffff0000ffff0000ffff0000').render_id)!.refunded_at = iso(clock)
  clock += 3_600_000
  await passeCom(db)
  const eps = db.tables.serie_auto_episodios
  ok(ep.status === 'failed' && ep.error === 'render_refunded' && eps.length === 2 && eps[1].attempt === 2 && posts.length === 2, 'P12 retomado e depois estornado: falha (nada cobrado) e a tentativa 2 sai — não fica preso')
}
{
  // o resume-parked-renders desiste (24 h sem a fal): fechamento 'expired' = nada cobrado → tentativa 2 na mesma semana
  const { db, ep } = await estacionado()
  clock += 25 * 3_600_000
  db.tables.events.push({ name: 'render_parked_closed', user_id: 'user-1', session_id: ep.generation_id, created_at: iso(clock), metadata: { outcome: 'expired', attempts: 0 } })
  await passeCom(db)
  const eps = db.tables.serie_auto_episodios
  ok(ep.status === 'failed' && ep.error === 'parked_expired' && eps.length === 2 && eps[1].attempt === 2 && posts.length === 2, 'P13 fechamento expired (ou superseded/failed): falha sem cobrança e a tentativa 2 sai')
}
{
  // o POST não respondeu (status 0) mas a rota ESTACIONOU do outro lado: o passe A acha o render_parked antes de falhar
  const { db, ep } = await estacionado({ status: 0 })
  ok(ep.status === 'pending' && posts.length === 1, 'P14 POST sem resposta: pending (a rota pode ter estacionado)')
  await horas(db, 2)
  ok(ep.status === 'parked' && ep.error === 'parked_seen_by_settle' && posts.length === 1 && db.tables.serie_auto_episodios.length === 1 && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'P15 pending velho com débito estornado + render_parked: vira parked, não dispatch_refunded (sem tentativa 2)')
}
{
  // 503 queued SEM render_parked (alta demanda, pedido não guardado): ninguém vai retomar → o passe A confere e libera a tentativa 2
  const { db, ep, r } = await estacionado({ grava: false })
  ok(ep.status === 'parked' && r.dispatch.parked === 1 && posts.length === 1, 'P16 503 queued: em andamento até o passe A conferir o render_parked')
  clock += 3_600_000; db.tables.serie_auto[0].next_run_at = null
  await passeCom(db)
  const eps = db.tables.serie_auto_episodios
  ok(ep.status === 'failed' && ep.error === 'dispatch_queued_not_parked' && eps.length === 2 && posts.length === 2, 'P17 sem render_parked: falha sem cobrança e a tentativa 2 sai (não fica parado para sempre)')
}
{
  // estacionado que o resume-parked-renders nunca fechou (> 30 h, fora da janela dele)
  const { db, ep } = await estacionado()
  clock += 31 * 3_600_000
  db.tables.serie_auto[0].next_run_at = iso(clock + 86_400_000) // isola o passe A
  await passeCom(db)
  ok(ep.status === 'failed' && ep.error === 'parked_never_resumed' && posts.length === 2 && db.tables.serie_auto_episodios[1]?.attempt === 2, 'P18 > 30 h sem fechamento nem aluguel: falha sem cobrança (o resume já não o enxerga) e a tentativa 2 sai')
  const b = await estacionado()
  resumeCron(b.db, b.ep.generation_id, 'parked-aaaa1111bbbb2222cccc3333', { outcome: 'retry_later', fecha: false })
  clock += 31 * 3_600_000
  b.db.tables.credit_debits.push(debitoDe('parked-aaaa1111bbbb2222cccc3333'))
  b.db.tables.serie_auto[0].next_run_at = iso(clock + 86_400_000)
  await passeCom(b.db)
  ok(b.ep.status === 'stuck' && b.ep.resume_generation_id === 'parked-aaaa1111bbbb2222cccc3333' && posts.length === 1 && b.db.tables.serie_auto_episodios.length === 1, 'P19 > 30 h sem fechamento, mas um aluguel cobrou (débito vivo no parked-…): adotado como o episódio — e, 31 h sem filme com débito vivo, stuck (nunca tentativa 2)')
  const c = await estacionado()
  resumeCron(c.db, c.ep.generation_id, 'parked-dddd4444eeee5555ffff6666', { fecha: false }) // aluguel 'started' sem o fechamento
  clock += 3_600_000
  await passeCom(c.db)
  ok(c.ep.status === 'dispatched' && c.ep.resume_generation_id === 'parked-dddd4444eeee5555ffff6666', 'P20 aluguel started sem fechamento gravado: a retomada é seguida igual')
}
{
  // leitura de events falhando: estacionado não decide nada; e um estorno não vira falha às cegas
  const { db, ep } = await estacionado()
  db.failSelect.add('events')
  await horas(db, 3)
  ok(ep.status === 'parked' && posts.length === 1, 'P21 events ilegível: o estacionado fica como está, nenhum POST')
  db.failSelect.delete('events')
  const b = await estacionado({ status: 0 })
  b.db.failSelect.add('events')
  await horas(b.db, 2)
  ok(b.ep.status === 'pending' && posts.length === 1 && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'P22 pending estornado com events ilegível: não falha (pode ser o estorno do estacionamento)')
}

// ── Q. as menores da revisão 2: ficha vazia/malformada, série pulada que não anda, fila das devidas ──────────────────────
console.log('Q — ficha inválida re-derivada; série pulada empurra a agenda; a fila das devidas não trava')
for (const [nome, ficha] of [['[]', []], ['itens sem nome/canônica', [{ nome: '', canonica: '' }, 'x', null]], ['objeto', { foo: 1 }], ['texto', 'Dina']] as [string, unknown][]) {
  posts.length = 0; events.length = 0; fichaDerivadaChamadas.length = 0
  clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500, ficha })
  await rodar(db, true)
  const gravada = db.tables.serie_auto[0].ficha as { nome: string }[]
  ok(fichaDerivadaChamadas.length === 1 && Array.isArray(gravada) && gravada[0]?.nome === 'Milo' && String(posts[0]?.body.prompt).includes('Milo, a small orange fox') && events.some((e) => e.name === SERIE_AUTO_EVENTS.fichaFixed && e.metadata.replaced === 'invalid'), `Q1 ficha ${nome}: derivada de novo, gravada e usada na ideia`)
}
{
  // a gravada válida continua intocável mesmo com o texto de origem novo (o conserto não abriu a sobrescrita)
  posts.length = 0; fichaDerivadaChamadas.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  await rodar(db, true)
  ok(fichaDerivadaChamadas.length === 0 && JSON.stringify(db.tables.serie_auto[0].ficha) === JSON.stringify(FICHA), 'Q2 ficha válida: nunca re-derivada nem sobrescrita')
}
{
  posts.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500, email: 'cliente@gmail.com' })
  await rodar(db, true)
  ok(db.tables.serie_auto[0].next_run_at === iso(Date.UTC(2026, 10, 9, 10, 0)), 'Q3 conta fora da casa: a agenda anda para a semana que vem')
  clock += 3_600_000
  const r2 = await rodar(db, true)
  ok(r2.dispatch.due === 0 && posts.length === 0, 'Q4 uma hora depois a série NÃO está devida (antes: devida a cada hora)')
}
{
  posts.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  db.failSelect.add('profiles')
  await rodar(db, true)
  ok(db.tables.serie_auto[0].next_run_at === iso(clock + 6 * 3_600_000) && posts.length === 0, 'Q5 perfil ilegível: a agenda anda 6 h (sem passar da semana que vem)')
  db.failSelect.delete('profiles'); clock += 3_600_000
  const r2 = await rodar(db, true)
  ok(r2.dispatch.due === 0, 'Q6 uma hora depois: não devida')
  clock += 6 * 3_600_000
  const r3 = await rodar(db, true)
  ok(r3.dispatch.started === 1 && posts.length === 1, 'Q7 passado o adiamento, a série volta e o episódio sai')
}
{
  posts.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  db.failSelect.add('serie_auto_episodios')
  await rodar(db, true)
  db.failSelect.delete('serie_auto_episodios')
  ok(db.tables.serie_auto[0].next_run_at === iso(clock + 6 * 3_600_000) && posts.length === 0 && db.tables.serie_auto_episodios.length === 0, 'Q8 semana ilegível: nenhum POST e a agenda anda 6 h')
}
/** 120 séries de clientes (fora da casa) devidas há mais tempo + a série da casa devida agora. */
function filaTravada(db: FakeDb) {
  semear(db, { credits: 500 })
  const casa = db.tables.serie_auto[0]
  casa.next_run_at = iso(Date.UTC(2026, 10, 2, 10, 0))
  for (let i = 0; i < 120; i++) {
    db.tables.profiles.push({ id: `u-${i}`, email: `cliente${i}@gmail.com`, video_credits: 500 })
    db.tables.serie_auto.push({ ...casa, id: `bbbbbbbb-0000-4000-8000-${String(i).padStart(12, '0')}`, user_id: `u-${i}`, next_run_at: iso(Date.UTC(2026, 10, 1, 0, i)) })
  }
  return casa
}
{
  posts.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); const casa = filaTravada(db)
  const r1 = await rodar(db, true)
  ok(r1.dispatch.due === 100 && posts.length === 0 && db.tables.serie_auto.filter((s) => s.next_run_at === iso(Date.UTC(2026, 10, 9, 10, 0))).length === 100, 'Q9 1ª passada: as 100 mais antigas (de clientes) são lidas e empurradas para a semana que vem')
  clock += 3_600_000
  await rodar(db, true)
  ok(posts.length === 1 && casa.next_run_at === iso(Date.UTC(2026, 10, 9, 10, 0)) && db.tables.serie_auto_episodios.length === 1, 'Q10 2ª passada: a série da casa sai — as travadas não monopolizam a leitura das devidas')
  db.tables.serie_auto.push({ ...casa, id: 'cccccccc-0000-4000-8000-000000000001', next_run_at: iso(clock + 3_600_000) })
  const r3 = await rodar(db, true)
  ok(r3.dispatch.due === 0 && !db.tables.serie_auto_episodios.some((e) => e.serie_id === 'cccccccc-0000-4000-8000-000000000001'), 'Q11 série do futuro não entra na leitura das devidas')
}
{
  const src = fs.readFileSync('lib/serieAuto/cron.ts', 'utf8').replace(/\r\n/g, '\n')
  const mutar = async (nome: string, de: string, para: string) => {
    if (!src.includes(de)) return null
    const arq = `lib/serieAuto/__mutante_${nome}.ts`
    fs.writeFileSync(arq, src.replace(de, para))
    try { return (await import(`../${arq}`)).seriePass as typeof seriePass } finally { fs.unlinkSync(arq) }
  }
  const m7 = await mutar('parked_falha', 'if (!charged && serieRespostaEstacionada(res.status, res.body)) {', 'if (false) {')
  if (m7) { const { db } = await estacionado({}, m7); await horas(db, 2, m7); ok(posts.length === 2 && db.tables.serie_auto_episodios.length === 2, 'M7 mutante (503 parked = falha comum): a tentativa 2 sai e cobraria de novo — P3 reprova') } else ok(false, 'M7 mutante aplicado')
  const m8 = await mutar('sem_retomada', 'let gen = ep.resume_generation_id || ep.generation_id', 'let gen = ep.generation_id')
  if (m8) {
    const { db, ep } = await estacionado({}, m8)
    clock += 3_600_000
    resumeCron(db, ep.generation_id, 'parked-9999888877776666aaaabbbb'); db.tables.credit_debits.push(debitoDe('parked-9999888877776666aaaabbbb'))
    await passeCom(db, m8)
    db.tables.events.push({ name: 'stranded_composed', user_id: 'user-1', session_id: 'parked-9999888877776666aaaabbbb', metadata: { render_id: 'r-m8' }, created_at: iso(clock) })
    db.tables.videos.push({ id: 'v-m8', user_id: 'user-1', render_id: 'r-m8', status: 'completed', final_video_url: 'https://x/m.mp4' })
    clock += 3_600_000
    await passeCom(db, m8)
    ok(ep.status !== 'delivered' && db.tables.serie_auto[0].last_episode_seq === 1, 'M8 mutante (passe A só olha o generation_id próprio): o filme retomado não é visto e a série não anda — P8/P9 reprovam')
  } else ok(false, 'M8 mutante aplicado')
  const m9 = await mutar('sem_conferir', '      const estacionouAgora = async (): Promise<boolean> => {\n', '      const estacionouAgora = async (): Promise<boolean> => { if (Math.random() < 2) return false\n')
  if (m9) { const { db } = await estacionado({ status: 0 }, m9); await horas(db, 2, m9); ok(posts.length === 2, 'M9 mutante (passe A não confere o render_parked): o pending estornado falha e retenta — P15 reprova') } else ok(false, 'M9 mutante aplicado')
  const m10 = await mutar('pulada_parada', "{ dispatch.skipped++; await patchSerie(serie.id, { next_run_at: proximaSemana }); continue }", '{ dispatch.skipped++; continue }')
  if (m10) {
    posts.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
    const db = new FakeDb(); filaTravada(db)
    for (let i = 0; i < 3; i++) { await passeCom(db, m10); clock += 3_600_000 }
    ok(posts.length === 0, 'M10 mutante (série pulada não empurra a agenda): a série da casa nunca sai — Q10 reprova')
  } else ok(false, 'M10 mutante aplicado')
  ok(!fs.readdirSync('lib/serieAuto').some((f) => f.startsWith('__mutante_')), 'M11 nenhuma cópia mutada ficou no disco')
}

// ── R. o resume-parked-renders: só o original, série não é superada, aluguel que cobrou é adotado (revisão 3 de 01/11) ──────────
console.log('R — resume-parked-renders: um estacionado, uma retomada cobrada')
ok(idDoFechamento('g-1') === '63147f2e-5cf3-4db6-3879-1153c349e191' && idDoAluguel('g-1', 2) === '4f8d17ea-e70d-8ea8-61a6-093cc6594e5a' && idDaRetomada('g-1', 3) === 'parked-9a5fdbb94cf723fa02feff15', 'R1 os ids mudaram de casa (lib/filaQuedaFalIds) com as MESMAS fórmulas da rota da base (fechamento, aluguel N, retomada N)')
{
  const g = serieGenerationId('aaaaaaaa-0000-4000-8000-000000000001', '2026-W45', 1)
  ok(g.startsWith(SERIE_AUTO_GENERATION_PREFIX) && ehDespachoDaSerie(g) && !ehDespachoDaSerie('3f2a1b4c-uuid-do-clique') && !estacionadoSuperavel(g) && estacionadoSuperavel('3f2a1b4c-uuid-do-clique'), 'R2 episódio da série (prefixo serie-) nunca é superado; o pedido de clique continua superável')
  ok(estacionadoRetomavel(g) && estacionadoRetomavel('3f2a1b4c-uuid-do-clique') && !estacionadoRetomavel(idDaRetomada(g, 1)) && ehRetomadaDeEstacionado(idDaRetomada(g, 1)) && !estacionadoRetomavel(null), 'R3 linha render_parked de RETOMADA (parked-…) não é retomável; o original é')
  const D = (c: { attempt: number; situacao: SituacaoDaTentativa }[]) => decidirAluguelSemFechamento(c) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  ok(JSON.stringify(D([{ attempt: 1, situacao: 'filme' }])) === '{"acao":"adotar","attempt":1}' && JSON.stringify(D([{ attempt: 1, situacao: 'sem_cobranca' }, { attempt: 2, situacao: 'filme' }])) === '{"acao":"adotar","attempt":2}' && D([{ attempt: 1, situacao: 'ilegivel' }]).acao === 'esperar' && D([{ attempt: 1, situacao: 'sem_cobranca' }, { attempt: 2, situacao: 'sem_cobranca' }]).acao === 'retomar' && JSON.stringify(D([{ attempt: 1, situacao: 'cobranca_viva' }])) === '{"acao":"esperar","motivo":"cobranca_viva"}', 'R4 aluguel sem fechamento: filme a caminho = adota; ilegível = espera; débito vivo sem settled = só espera (nunca re-POST); sem cobrança = retoma')
  const rota = rd('app/api/cron/resume-parked-renders/route.ts')
  const iProv = rota.indexOf("if (providerDown) { results.push({ generation: g8, decision: 'provider_down_wait' }); continue }")
  const iAdota = rota.indexOf('const d = decidirAluguelSemFechamento(lidos)') // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — a decisão agora recebe o relógio (ausente há < 10 min do aluguel não prova nada)
  const iLease = rota.indexOf('const leaseId = idDoAluguel(genId, attempt)')
  ok(rota.includes(".eq('name', PARKED_EVENT).not('session_id', 'like', 'parked-%').gte('created_at', desde)") && rota.includes('.filter((r) => r.user_id && r.session_id && estacionadoRetomavel(r.session_id))'), 'R5 a rota do cron não lê nem retoma a linha filha (filtro no banco E no código)')
  ok(rota.includes('const newerDispatch = estacionadoSuperavel(genId) && (lastDispatchByUser.get(userId) ?? 0) > parkedAtMs') && rota.includes('if (ehDespachoDaSerie((d.metadata as { generation_id?: unknown } | null)?.generation_id)) continue'), "R6 a rota do cron nunca supera o episódio da série, e o despacho da série não supera ninguém")
  ok(iAdota > 0 && iProv > iAdota && iLease > iProv && rota.includes("await fechar(admin, row, 'resumed', { attempts: lease.n, resume_generation_id: c.resumeId, recovered: true })") && rota.includes("from '@/lib/filaQuedaFalIds'") && !rota.includes('const idDe ='), 'R7 a adoção do aluguel que cobrou vem ANTES de qualquer aluguel novo; os ids vêm do módulo importável')
  ok(!rd('app/api/generate-video-cinematic/route.ts').includes('KINEO-SERIE-AUTO-ETAPA1-0111'), 'R8 a rota de filme (211 guardiões) não foi tocada: o conserto mora no cron que retoma')
}
// ─ o simulador do resume-parked-renders: o MESMO fluxo da rota do cron, com as decisões e os ids reais ─
type Fal = 'down' | 'up'
interface SimOpts { filtraFilhas?: boolean; protegeSerie?: boolean; adota?: boolean; morreNoPost?: boolean }
const evs = (db: FakeDb, name: string) => (db.tables.events ?? []).filter((e) => e.name === name)
/** A rota de filme em modo serviço: fal fora = estorna, RE-ESTACIONA (linha filha) e responde 503 parked; fal de volta = cobra e 200. */
function rotaDeFilme(db: FakeDb, gen: string, fal: Fal): { status: number; json: Record<string, unknown> } {
  db.tables.events.push({ name: 'generation_dispatch_received', user_id: 'user-1', created_at: iso(clock), metadata: { generation_id: gen } })
  const claimDoSim = (status: string) => db.tables.events.push({ id: cinematicClaimId('user-1', gen), name: 'cinematic_submission_claim', user_id: 'user-1', session_id: gen, created_at: iso(clock), metadata: { status, credit_cost: 25 } }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  if (fal === 'down') {
    claimDoSim('released') // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    db.tables.credit_debits.push(debitoDe(gen, iso(clock)))
    db.tables.events.push({ name: 'render_parked', user_id: 'user-1', session_id: gen, created_at: iso(clock), metadata: { reason: 'capacity', refunded: true, request: { prompt: 'x', duration: 60 } } })
    return { status: 503, json: RESP_PARKED }
  }
  claimDoSim('settled') // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  db.tables.credit_debits.push(debitoDe(gen))
  return { status: 200, json: { ok: true } }
}
async function passeDoResume(db: FakeDb, fal: Fal, o: SimOpts = {}) {
  const { filtraFilhas = true, protegeSerie = true, adota = true, morreNoPost = false } = o
  const now = clock
  const parked = evs(db, 'render_parked').filter((r) => Date.parse(String(r.created_at)) >= now - PARKED_TTL_MS - 2 * 3_600_000 && r.user_id && r.session_id && (!filtraFilhas || estacionadoRetomavel(r.session_id))).sort((a, b) => String(a.created_at) < String(b.created_at) ? -1 : 1).slice(0, 100)
  const closed = new Set(evs(db, 'render_parked_closed').map((r) => String(r.session_id)))
  const lastDispatch = evs(db, 'generation_dispatch_received').filter((d) => { const gid = (d.metadata as { generation_id?: unknown }).generation_id; return !String(gid ?? '').startsWith('parked-') && !(protegeSerie && ehDespachoDaSerie(gid)) }).reduce((m, d) => Math.max(m, Date.parse(String(d.created_at))), 0)
  let resumed = 0, providerDown = false
  for (const row of parked) {
    const genId = String(row.session_id)
    const parkedAtMs = Date.parse(String(row.created_at))
    const leases = evs(db, 'render_parked_taken').filter((l) => l.session_id === genId)
    const openAtMs = leases.filter((l) => (l.metadata as { outcome?: unknown }).outcome === undefined).reduce<number | null>((m, l) => Math.max(m ?? 0, Date.parse(String(l.created_at))), null)
    const newerDispatch = (!protegeSerie || estacionadoSuperavel(genId)) && lastDispatch > parkedAtMs
    const decision = decidirRetomada({ parkedAtMs, nowMs: now, closed: closed.has(genId), newerDispatch, openLeaseAtMs: openAtMs })
    if (decision === 'closed' || decision === 'leased') continue
    const fechar = (outcome: string, extra: Record<string, unknown> = {}) => db.from('events').insert({ id: idDoFechamento(genId), user_id: 'user-1', name: 'render_parked_closed', session_id: genId, created_at: iso(clock), metadata: { outcome, ...extra } })
    if (decision === 'expired' || decision === 'superseded') { await fechar(decision); continue }
    const candidatos = leases.map((l) => ({ ...(l.metadata as { outcome?: unknown; attempt?: unknown; resume_generation_id?: unknown }), atMs: Date.parse(String(l.created_at)) })).filter((m) => Number.isInteger(Number(m.attempt)) && aluguelPodeTerCobrado(m.outcome)) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — o mesmo filtro da rota (retry_later também é lido)
    if (adota && candidatos.length > 0) {
      const lidos = candidatos.map((m) => { const a = Number(m.attempt); const rid = typeof m.resume_generation_id === 'string' ? m.resume_generation_id : idDaRetomada(genId, a); const deb = db.tables.credit_debits.find((d) => d.render_id === debitoDe(rid).render_id); const cl = db.tables.events.find((e) => e.id === cinematicClaimId('user-1', rid) && e.name === 'cinematic_submission_claim'); const leitura = leituraDaCobranca({ debito: { erro: false, existe: !!deb, estornado: !!deb?.refunded_at }, claim: { erro: false, status: cl ? String((cl.metadata as { status?: unknown }).status) : null } }); return { attempt: a, iniciado: m.outcome === 'started', resumeId: rid, situacao: situacaoDaTentativa({ leitura, iniciado: m.outcome === 'started', atMs: m.atMs, nowMs: now }) } }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      const d = decidirAluguelSemFechamento(lidos)
      if (d.acao === 'esperar') continue // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 (revisão 6: cobrança viva = só espera; não existe mais reconexão)
      if (d.acao === 'adotar') { const c = lidos.find((x) => x.attempt === d.attempt)!; await fechar('resumed', { resume_generation_id: c.resumeId, recovered: true }); continue }
      for (const c of lidos) { const l = leases.find((x) => (x.metadata as { attempt?: unknown }).attempt === c.attempt); if (l) l.metadata = { ...(l.metadata as object), outcome: 'lost_no_charge' } }
    }
    if (providerDown || resumed >= PARKED_MAX_RESUMES_PER_RUN) continue
    const attempt = leases.length + 1
    const ins = await db.from('events').insert({ id: idDoAluguel(genId, attempt), user_id: 'user-1', name: 'render_parked_taken', session_id: genId, created_at: iso(clock), metadata: { attempt } })
    if ((ins as { error: unknown }).error) continue
    resumed++
    const resumeGenId = idDaRetomada(genId, attempt)
    const resp = rotaDeFilme(db, resumeGenId, fal)
    if (morreNoPost) continue // o cron morreu no meio do POST: o aluguel fica sem desfecho e sem resume_generation_id
    const outcome = classificarRespostaDaRetomada(resp.status, resp.json)
    const lease = evs(db, 'render_parked_taken').find((l) => l.id === idDoAluguel(genId, attempt))!
    lease.metadata = { attempt, outcome, status: resp.status, resume_generation_id: resumeGenId }
    if (outcome === 'started') await fechar('resumed', { attempts: attempt, resume_generation_id: resumeGenId })
    else if (outcome === 'provider_down') providerDown = true
  }
}
/** 2 h de queda com o resume a cada 5 min (e o passe da série a cada hora), depois a fal volta por 1 h. Devolve o episódio. */
async function quedaLonga(o: SimOpts = {}, passe: typeof seriePass = seriePass) {
  const { db, ep } = await estacionado({}, passe)
  for (let i = 1; i <= 24; i++) { clock += 5 * 60_000; await passeDoResume(db, 'down', o); if (i % 12 === 0) { db.tables.serie_auto[0].next_run_at = null; await passeCom(db, passe) } }
  for (let i = 1; i <= 12; i++) { clock += 5 * 60_000; await passeDoResume(db, 'up', o); if (i % 12 === 0) await passeCom(db, passe) }
  return { db, ep }
}
const vivos = (db: FakeDb) => db.tables.credit_debits.filter((d) => !d.refunded_at)
{
  const { db, ep } = await quedaLonga()
  const filhas = evs(db, 'render_parked').filter((r) => String(r.session_id).startsWith('parked-'))
  ok(filhas.length >= 20 && !evs(db, 'render_parked_taken').some((l) => String(l.session_id).startsWith('parked-')), `R9 2 h de queda: a rota re-estacionou ${filhas.length} vezes (linhas filhas) e NENHUMA filha foi alugada/retomada`)
  ok(vivos(db).length === 1 && evs(db, 'render_parked_closed').length === 1, `R10 a fal volta: 1 débito vivo e 1 fechamento 'resumed' (antes: ~${filhas.length + 1} débitos e filmes)`)
  const rid = (evs(db, 'render_parked_closed')[0].metadata as { resume_generation_id?: string }).resume_generation_id!
  ok(ep.status === 'dispatched' && ep.resume_generation_id === rid && posts.length === 1 && db.tables.serie_auto_episodios.length === 1, 'R11 a série segue a única retomada cobrada: 1 POST da série, 1 episódio, nenhuma tentativa 2 durante a queda')
  db.tables.events.push({ name: 'stranded_composed', user_id: 'user-1', session_id: rid, metadata: { render_id: 'r-queda' }, created_at: iso(clock) })
  db.tables.videos.push({ id: 'v-queda', user_id: 'user-1', render_id: 'r-queda', status: 'completed', final_video_url: 'https://x/q.mp4' })
  await passeCom(db)
  ok(ep.status === 'delivered' && db.tables.serie_auto[0].last_episode_seq === 2 && db.tables.serie_auto[0].episodes_delivered === 1, 'R12 503 parked → 2 h de queda → retomada → filme: entregue como o episódio 2, a série anda')
}
{
  // o defeito da revisão, reproduzido: sem o filtro da linha filha, cada re-estacionamento vira um filme cobrado
  const { db } = await quedaLonga({ filtraFilhas: false })
  ok(vivos(db).length > 2, `R13 mutante (o cron retoma a linha filha): ${vivos(db).length} débitos vivos para 1 episódio — R10 reprova`)
}
{
  // superseded em conta da casa: o fundador (ou outra série) despacha durante a queda
  const run = async (protegeSerie: boolean) => {
    const { db, ep } = await estacionado()
    clock += 10 * 60_000
    db.tables.events.push({ name: 'generation_dispatch_received', user_id: 'user-1', created_at: iso(clock), metadata: { generation_id: '3f2a1b4c-0000-4000-8000-00000000f00d' } })
    db.tables.events.push({ name: 'generation_dispatch_received', user_id: 'user-1', created_at: iso(clock), metadata: { generation_id: serieGenerationId('outra-serie', '2026-W45', 1) } })
    clock += 5 * 60_000; await passeDoResume(db, 'up', { protegeSerie })
    clock += 3_600_000; await passeCom(db)
    return { db, ep }
  }
  const a = await run(true)
  ok(!evs(a.db, 'render_parked_closed').some((c) => (c.metadata as { outcome?: string }).outcome === 'superseded') && a.ep.status === 'dispatched' && vivos(a.db).length === 1 && posts.length === 1, 'R14 despacho do fundador e de outra série na mesma conta: o episódio estacionado NÃO é superado — é retomado, 1 débito, a semana não queima')
  const b = await run(false)
  ok(b.ep.status === 'failed' && b.ep.error === 'parked_superseded', 'R15 mutante (sem a proteção da série): fechado como superseded e a semana queima uma tentativa — R14 reprova')
}
{
  // o cron morre no meio do POST (cobrou, mas o aluguel ficou sem desfecho e sem resume_generation_id)
  const { db, ep } = await estacionado()
  clock += 5 * 60_000; await passeDoResume(db, 'up', { morreNoPost: true })
  const lease = evs(db, 'render_parked_taken')[0]
  ok(vivos(db).length === 1 && (lease.metadata as { outcome?: unknown }).outcome === undefined && !(lease.metadata as { resume_generation_id?: unknown }).resume_generation_id, 'R16 cron morto no POST: 1 débito vivo, aluguel sem desfecho e sem id de retomada')
  for (let i = 0; i < 4; i++) { clock += 5 * 60_000; await passeDoResume(db, 'up') }
  const fech = evs(db, 'render_parked_closed')
  ok(clock - Date.parse(String(lease.created_at)) > PARKED_LEASE_TTL_MS && evs(db, 'render_parked_taken').length === 1 && vivos(db).length === 1 && fech.length === 1 && (fech[0].metadata as { resume_generation_id?: string }).resume_generation_id === idDaRetomada(String(ep.generation_id), 1), 'R17 passado o aluguel, o cron ADOTA a retomada que cobrou (fecha resumed com o id da tentativa 1) — nenhuma tentativa 2, 1 débito')
  await passeCom(db)
  ok(ep.status === 'dispatched' && ep.resume_generation_id === idDaRetomada(String(ep.generation_id), 1), 'R18 a série segue a retomada adotada')
  // e sem a adoção (o defeito): a tentativa 2 sai por cima e cobra de novo
  const b = await estacionado()
  clock += 5 * 60_000; await passeDoResume(b.db, 'up', { morreNoPost: true })
  for (let i = 0; i < 4; i++) { clock += 5 * 60_000; await passeDoResume(b.db, 'up', { adota: false }) }
  ok(vivos(b.db).length === 2, 'R19 mutante (sem adotar o aluguel que cobrou): 2 débitos vivos — R17 reprova')
}
{
  // o lado da série: aluguel sem resume_generation_id, sem fechamento, > 30 h — a adoção acha o débito pelo id da tentativa N
  const { db, ep } = await estacionado()
  db.tables.events.push({ name: 'render_parked_taken', user_id: 'user-1', session_id: ep.generation_id, created_at: iso(clock + 5 * 60_000), metadata: { attempt: 1 } })
  db.tables.credit_debits.push(debitoDe(idDaRetomada(String(ep.generation_id), 1)))
  clock += 31 * 3_600_000
  db.tables.serie_auto[0].next_run_at = iso(clock + 86_400_000)
  await passeCom(db)
  ok(ep.resume_generation_id === idDaRetomada(String(ep.generation_id), 1) && ep.status !== 'failed' && posts.length === 1 && db.tables.serie_auto_episodios.length === 1, 'R20 série: aluguel morto sem id de retomada + débito vivo do id da tentativa 1 → adotado depois de 30 h (antes: falhava e retentava)')
}

// ── S. passe B lê o débito antes da tentativa 2; ficha que não gravou não vale ────────────────────────────────────────────
console.log('S — passe B lê o débito; ficha só vale se a gravação pegou')
const REFUND_PENDENTE = 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.'
/** A rota cobra e responde `status` sem queued/parked/charged; `debito` diz o que ficou no banco depois. */
const rotaRecusa = (db: FakeDb, status: number, debito: 'live' | 'refunded' | 'none'): SerieDeps['callAsUser'] => async <T,>(a: { path: string; body?: unknown }) => {
  posts.push({ path: a.path, body: a.body as Record<string, unknown> })
  const gen = String((a.body as Record<string, unknown>).generationId)
  if (debito !== 'none') db.tables.credit_debits.push(debitoDe(gen, debito === 'refunded' ? iso(clock) : null))
  return { ok: false, status, body: { error: status === 503 ? REFUND_PENDENTE : 'Internal error' } as T, errorText: null }
}
async function recusado(status: number, debito: 'live' | 'refunded' | 'none', passe: typeof seriePass = seriePass, ilegivel = false) {
  posts.length = 0; events.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500 })
  deps.callAsUser = rotaRecusa(db, status, debito)
  if (ilegivel) db.failSelect.add('credit_debits')
  const r = await passeCom(db, passe)
  deps.callAsUser = callOk
  return { db, ep: db.tables.serie_auto_episodios[0], r }
}
{
  const { db, ep } = await recusado(503, 'live')
  ok(!serieRespostaEstacionada(503, { error: REFUND_PENDENTE }) && ep.status === 'dispatched' && ep.error === 'http_503_debit_live' && posts.length === 1, 'S1 503 "refund is still being confirmed" com o débito VIVO: o episódio fica despachado (o cliente pagou), não falha')
  await horas(db, 5)
  ok(posts.length === 1 && db.tables.serie_auto_episodios.length === 1 && !events.some((e) => e.name === SERIE_AUTO_EVENTS.failed), 'S2 cinco passadas horárias: nenhuma tentativa 2 (seria o 2º débito)')
  clock += 2 * 3_600_000; await passeCom(db)
  ok(ep.status === 'stuck' && posts.length === 1, 'S3 passado o prazo com o débito vivo: stuck (nunca retenta)')
  db.tables.credit_debits[0].refunded_at = iso(clock); clock += 3_600_000
  await passeCom(db)
  ok(ep.status === 'failed' && db.tables.serie_auto_episodios.length === 2 && posts.length === 2, 'S4 o estorno se confirma depois: aí sim falha sem cobrança e a tentativa 2 sai')
}
{
  const { db, ep } = await recusado(503, 'refunded')
  ok(ep.status === 'failed' && String(ep.error).startsWith('dispatch_503') && db.tables.serie_auto[0].next_run_at === iso(clock + 3_600_000), 'S5 503 com o débito já estornado: falha na hora e a agenda volta em 1 h (nada cobrado)')
  const b = await recusado(500, 'none')
  ok(b.ep.status === 'failed' && String(b.ep.error).startsWith('dispatch_500'), 'S6 500 sem débito: falha (nada foi cobrado)')
  const c = await recusado(500, 'live', seriePass, true)
  ok(c.ep.status === 'pending' && c.ep.error === 'http_500_debit_unknown' && posts.length === 1, 'S7 500 com o débito ILEGÍVEL: pending (o passe A relê), nenhuma falha às cegas')
  await horas(c.db, 3)
  ok(posts.length === 1 && c.db.tables.serie_auto_episodios.length === 1, 'S8 três passadas com o débito ilegível: nenhuma tentativa 2')
  c.db.failSelect.delete('credit_debits'); clock += 3_600_000; await passeCom(c.db)
  ok(c.ep.status === 'dispatched' && posts.length === 1, 'S9 o débito volta a ser legível e está vivo: dispatched, sem tentativa 2')
}
{
  // a ficha mudou entre a leitura e a gravação (outra escrita gravou uma válida): 0 linhas → sem evento, a ideia usa a GRAVADA
  posts.length = 0; events.length = 0; fichaDerivadaChamadas.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
  const db = new FakeDb(); semear(db, { credits: 500, ficha: null })
  const antes = deps.derivarFicha!
  // a outra escrita troca a LINHA do banco (objeto novo): o passe segue com o valor que leu (null)
  deps.derivarFicha = (script) => { db.tables.serie_auto[0] = { ...db.tables.serie_auto[0], ficha: FICHA }; return antes(script) }
  await rodar(db, true)
  deps.derivarFicha = antes
  ok(fichaDerivadaChamadas.length === 1 && JSON.stringify(db.tables.serie_auto[0].ficha) === JSON.stringify(FICHA) && !events.some((e) => e.name === SERIE_AUTO_EVENTS.fichaFixed), 'S10 corrida na ficha: a gravação não pegou (0 linhas) → nenhum serie_auto_ficha_fixed, a ficha da outra escrita fica')
  ok(String(posts[0]?.body.prompt).includes(FICHA[0].canonica) && !String(posts[0]?.body.prompt).includes('Milo'), 'S11 a ideia do episódio usa a ficha GRAVADA, não a derivada que perdeu a corrida')
}
{
  const src = fs.readFileSync('lib/serieAuto/cron.ts', 'utf8').replace(/\r\n/g, '\n')
  const mutar = async (nome: string, de: string, para: string) => {
    if (!src.includes(de)) return null
    const arq = `lib/serieAuto/__mutante_${nome}.ts`
    fs.writeFileSync(arq, src.replace(de, para))
    try { return (await import(`../${arq}`)).seriePass as typeof seriePass } finally { fs.unlinkSync(arq) }
  }
  const m12 = await mutar('sem_ler_debito', 'const debito = await lerDebitoDe(serie.user_id, generationId)', "const debito = 'none' as string")
  if (m12) { const { db } = await recusado(503, "live", m12); await horas(db, 2, m12); ok(posts.length === 2 && db.tables.serie_auto_episodios.length === 2 && db.tables.serie_auto_episodios[0].status === 'failed' && vivos(db).length >= 1, 'M12 mutante (passe B não lê o débito): a tentativa 2 sai com o débito 1 ainda vivo (2º débito) — S2 reprova') } else ok(false, 'M12 mutante aplicado')
  const m13 = await mutar('ficha_cega', 'if (pegou) await ev(', 'if (true) await ev(')
  if (m13) {
    posts.length = 0; events.length = 0; clock = Date.UTC(2026, 10, 2, 10, 30)
    const db = new FakeDb(); semear(db, { credits: 500, ficha: null })
    const antes = deps.derivarFicha!
    deps.derivarFicha = (script) => { db.tables.serie_auto[0] = { ...db.tables.serie_auto[0], ficha: FICHA }; return antes(script) }
    await passeCom(db, m13); deps.derivarFicha = antes
    ok(events.some((e) => e.name === SERIE_AUTO_EVENTS.fichaFixed) && JSON.stringify(db.tables.serie_auto[0].ficha) === JSON.stringify(FICHA), 'M13 mutante (evento sem conferir a gravação): serie_auto_ficha_fixed mente — S10 reprova')
  } else ok(false, 'M13 mutante aplicado')
  const m14 = await mutar('sem_id_da_tentativa', '?? (Number.isInteger(Number(m.attempt)) && Number(m.attempt) >= 1 ? idDaRetomada(g, Number(m.attempt)) : null)', '?? null')
  if (m14) {
    const { db, ep } = await estacionado({}, m14)
    db.tables.events.push({ name: 'render_parked_taken', user_id: 'user-1', session_id: ep.generation_id, created_at: iso(clock + 5 * 60_000), metadata: { attempt: 1 } })
    db.tables.credit_debits.push(debitoDe(idDaRetomada(String(ep.generation_id), 1)))
    clock += 31 * 3_600_000; db.tables.serie_auto[0].next_run_at = iso(clock + 86_400_000)
    await passeCom(db, m14)
    ok(ep.status === 'failed' && posts.length === 2, 'M14 mutante (aluguel sem id não vira id da tentativa): falha e a tentativa 2 cobra de novo — R20 reprova')
  } else ok(false, 'M14 mutante aplicado')
  ok(!fs.readdirSync('lib/serieAuto').some((f) => f.startsWith('__mutante_')), 'M15 nenhuma cópia mutada ficou no disco')
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
