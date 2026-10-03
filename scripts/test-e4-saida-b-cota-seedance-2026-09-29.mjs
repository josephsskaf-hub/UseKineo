// KINEO-E4-SAIDA-B-2026-09-29 — guardião da E4 [TRAVA 8.2 — aguarda "vai E4" do fundador].
// Decisões do fundador (29/09): (a) SAÍDA B — o filme grátis só para país rico; (b) cota grátis semanal vira 1 Seedance
// 1.5 de 15 s por semana, com marca d'água, só país rico; (c) Kineo 1 fora do jogo — conta nova não recebe Kineo 1
// grátis, e o servidor recusa ANTES de qualquer fornecedor.
//
// O guardião EXECUTA o código real (loader offline; alias @/ por caminho; rede/SDK proibidos). Prova:
//   (a) lib/freeFilmPolicy.ts em 'pais_rico': PK/IN/NG/BR sem filme grátis, US/ES/GB com, país nulo concede;
//   (b) lib/reverseTrial.ts executado com banco falso: PK nasce region_paid_only com 0 crédito; US e sem país ganham o
//       trial; conta que já existe (trial encerrado, saldo 3) não perde nada e não é reescrita;
//   (c) cota semanal nova (lib/freeWeeklyFilm.ts + lib/freeWeeklyFilmGrant.ts executados): só conta grátis de país da
//       lista, nunca region_paid_only; recarga só até 7 (não acumula), 1× por 7 dias, compare-and-set contra corrida;
//       admissão no cinematic (bloco REAL da rota executado) só Seedance 1.5 / 15 s / sem filme Seedance na semana;
//   (d) Kineo 1: lib/kineo1Gate.ts executado (trial, grátis, region_paid_only, "test…@" recusados; has_paid, planos
//       pagos, Autopilot, portas do Studio Ads e a casa passam); o bloco REAL do portão da generate-video-fast e do compose
//       executado com Supabase falso (403 kineo1_retired, 503 sem gasto na leitura falha); posição antes de todo
//       fornecedor por linha inteira; compose/status e compose/unlock intocados; FREE_OFFER.limit = 0;
//   (e) cron send-cap-hit EXECUTADO com a cota em 0: sai cedo, sem criar cliente de banco nem mandar e-mail;
//       send-weekly-quota recusa (409) com a cota em 0;
//   (f) texto público: /llms.txt e /api/facts EXECUTADOS dizem "in supported countries", derivado da política (sem
//       lista), sem anunciar a cota semanal; a tela da conta region_paid_only tem pt/en/es + botão dos planos.
// Cada bloco tem mutante em memória que PRECISA ficar vermelho.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import crypto from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { let v = false; try { v = typeof cond === 'function' ? cond() : cond } catch { v = false } if (v) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('âncora do mutante ausente/ambígua: ' + de.slice(0, 80)); return src.replace(de, para) }
const transpila = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText

// ── loader offline com sobrescritas em memória (mutantes) e externos injetáveis ─────────────────────────────────────────
function criaLoader({ sobrescritas = {}, externos = {}, env = {}, globais = {} } = {}) {
  const cache = new Map()
  const indisponivel = (n) => { throw new Error('guardião offline proíbe ' + n) }
  const ext = {
    'node:crypto': crypto, crypto,
    openai: { __esModule: true, default: class { constructor() { indisponivel('OpenAI') } } },
    '@supabase/supabase-js': { createClient: () => indisponivel('Supabase') },
    ...externos,
  }
  const agora = Date.parse('2026-09-29T12:00:00Z')
  class DataFixa extends Date { constructor(...a) { super(...(a.length ? a : [agora])) } static now() { return agora } }
  const contexto = {
    Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, Response, Date: DataFixa,
    process: { env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true', ...env } },
    console: { log() {}, warn() {}, error() {} },
    fetch: () => indisponivel('rede'), setTimeout: () => indisponivel('timer'), clearTimeout() {},
    ...globais,
  }
  function carrega(spec, pai = root) {
    if (Object.hasOwn(ext, spec)) return ext[spec]
    let f = spec.startsWith('@/') ? join(root, spec.slice(2)) : spec.startsWith('.') ? resolve(pai, spec) : resolve(root, spec)
    if (!f.startsWith(root + sep)) throw new Error('fora do repo: ' + spec)
    if (!existsSync(f)) f += '.ts'
    if (!existsSync(f) && existsSync(f.replace(/\.ts$/, '.tsx'))) f = f.replace(/\.ts$/, '.tsx')
    if (!existsSync(f)) throw new Error('import inesperado: ' + spec)
    if (cache.has(f)) return cache.get(f)
    const exports = {}
    cache.set(f, exports)
    const rel = f.slice(root.length + 1).split(sep).join('/')
    const src = Object.hasOwn(sobrescritas, rel) ? sobrescritas[rel] : readFileSync(f, 'utf8')
    vm.runInNewContext(transpila(src), { ...contexto, exports, require: (n) => carrega(n, dirname(f)) }, { timeout: 10000, filename: f })
    return exports
  }
  return carrega
}
const muta = (rel, de, para) => ({ [rel]: trocar(rd(rel), de, para) })

// ── banco falso genérico (profiles/events/videos), com filtros eq/is/neq/gte registrados ────────────────────────────────
function bancoFalso({ perfil = null, eventos = [], videosRecentes = 0, falhaEventos = false, falhaPerfil = false, corrida = false, debitosSemana = 0 } = {}) {
  const estado = { perfil: perfil ? { ...perfil } : null, eventos: [...eventos], updates: [], leituras: [] }
  const db = {
    estado,
    from(tabela) {
      const st = { tabela, op: 'select', patch: null, filtros: [], head: false }
      const casaPerfil = () => st.filtros.every(([k, c, v]) => (k === 'eq' || k === 'is') ? estado.perfil?.[c] === v : true)
      const exec = () => {
        estado.leituras.push({ tabela: st.tabela, op: st.op, filtros: st.filtros })
        if (st.tabela === 'profiles') {
          if (falhaPerfil) return { data: null, error: { message: 'falha simulada' } }
          if (st.op === 'update') {
            const casa = !corrida && estado.perfil && casaPerfil()
            estado.updates.push({ patch: st.patch, filtros: st.filtros, casou: !!casa })
            if (!casa) return { data: [], error: null }
            Object.assign(estado.perfil, st.patch)
            return { data: [{ id: estado.perfil.id }], error: null }
          }
          return { data: estado.perfil ? { ...estado.perfil } : null, error: null }
        }
        if (st.tabela === 'events') {
          if (falhaEventos) return { data: null, error: { message: 'falha simulada' } }
          // KINEO-E4-CONSERTO-2026-09-29 — `.in('name', [...])` (país da 1ª vez) e `.order(created_at asc)` também.
          const nomes = st.filtros.find(([k, c]) => k === 'in' && c === 'name')?.[2] ?? [st.filtros.find(([k, c]) => k === 'eq' && c === 'name')?.[2]]
          const desde = st.filtros.find(([k]) => k === 'gte')?.[2]
          const achados = estado.eventos.filter((e) => nomes.includes(e.name) && (!desde || e.created_at >= desde)).sort((x, y) => (x.created_at < y.created_at ? -1 : 1))
          return { data: achados.map((e, i) => ({ id: i, metadata: e.metadata ?? null })), error: null }
        }
        if (st.tabela === 'credit_debits') {
          if (debitosSemana === null) return { data: null, count: null, error: { message: 'falha simulada' } }
          return { data: null, count: debitosSemana, error: null }
        }
        if (st.tabela === 'videos') {
          if (videosRecentes === null) return { data: null, count: null, error: { message: 'falha simulada' } }
          return { data: null, count: videosRecentes, error: null }
        }
        return { data: [], error: null }
      }
      const q = {
        select(_c, opts) { if (opts?.head) st.head = true; return q },
        update(p) { st.op = 'update'; st.patch = p; return q },
        eq(c, v) { st.filtros.push(['eq', c, v]); return q }, is(c, v) { st.filtros.push(['is', c, v]); return q },
        neq(c, v) { st.filtros.push(['neq', c, v]); return q }, gte(c, v) { st.filtros.push(['gte', c, v]); return q },
        in(c, v) { st.filtros.push(['in', c, v]); return q },
        like() { return q }, order() { return q }, limit() { return q }, range() { return q },
        maybeSingle() { return Promise.resolve(exec()) }, single() { return Promise.resolve(exec()) },
        then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
      }
      return q
    },
  }
  return db
}

// ══ (a) política de país ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('== (a) lib/freeFilmPolicy.ts — saída B ligada ==')
const L0 = criaLoader()
const POL = L0('lib/freeFilmPolicy.ts')
const provaPais = (M) =>
  M.FREE_FILM_POLICY === 'pais_rico' &&
  // Reancorado 03/10 (KINEO-BRASIL-VOLTA): o fundador devolveu o BR à lista; a exclusão segue provada com PK/IN/NG/MX.
  ['PK', 'IN', 'NG', 'MX'].every((c) => M.filmeGratisPermitido(c) === false) &&
  ['US', 'ES', 'GB', 'BR'].every((c) => M.filmeGratisPermitido(c) === true) &&
  [null, undefined, '', 'XX'].every((c) => M.filmeGratisPermitido(c) === true)
checa("FREE_FILM_POLICY='pais_rico': PK/IN/NG/MX → sem filme grátis; US/ES/GB/BR → com; país nulo/'XX' → concede", provaPais(POL))
checa("mutante (política volta a 'todos') → vermelho", !provaPais(criaLoader({ sobrescritas: muta('lib/freeFilmPolicy.ts', "export const FREE_FILM_POLICY: FreeFilmPolicy = 'pais_rico'", "export const FREE_FILM_POLICY: FreeFilmPolicy = 'todos'") })('lib/freeFilmPolicy.ts')))

// ══ (b) concessão do trial executada ════════════════════════════════════════════════════════════════════════════════
console.log('== (b) lib/reverseTrial.ts executado: a regra só age na concessão ==')
const ENV_RT = { KINEO_REVERSE_TRIAL_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid', SUPABASE_SERVICE_ROLE_KEY: 'k' }
async function ativa({ country, perfil, criadoEm = new Date().toISOString(), sobrescritas = {} }) {
  const db = bancoFalso({ perfil: perfil ?? { id: 'u-1', trial_status: null, plan: 'free', has_paid: false, video_credits: 0 } })
  const eventos = []
  const RT = criaLoader({ sobrescritas, env: ENV_RT, externos: { '@supabase/supabase-js': { createClient: () => db }, '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } } } })('lib/reverseTrial.ts')
  const r = await RT.maybeActivateReverseTrial({ userId: 'u-1', email: 'pessoa@example.com', userCreatedAt: criadoEm, fingerprintHash: null, country })
  return { r, db, eventos, RT }
}
{
  for (const c of ['PK', 'IN', 'NG', 'MX']) { // Reancorado 03/10 (KINEO-BRASIL-VOLTA): BR saiu daqui e entrou abaixo, com trial
    const x = await ativa({ country: c })
    checa(`cadastro novo de ${c}: region_paid_only, 0 crédito, evento trial_region_excluded`, x.r.reason === 'region_paid_only' && x.db.estado.perfil.trial_status === 'region_paid_only' && x.db.estado.perfil.video_credits === 0 && x.eventos.some((e) => e.name === 'trial_region_excluded' && e.metadata?.country === c))
  }
  for (const c of ['US', 'ES', 'GB', 'BR', null]) {
    const x = await ativa({ country: c })
    checa(`cadastro novo de ${c ?? 'país nulo'}: trial concedido (${x.db.estado.perfil.video_credits} cr)`, x.r.activated === true && x.db.estado.perfil.trial_status === 'active' && x.db.estado.perfil.video_credits > 0)
  }
  const antiga = { id: 'u-1', trial_status: 'downgraded', plan: 'free', has_paid: false, video_credits: 3 }
  const velha = await ativa({ country: 'PK', perfil: antiga, criadoEm: new Date(Date.now() - 30 * 86400000).toISOString() })
  checa('conta ANTIGA do PK (trial encerrado, 3 cr): nada é escrito, saldo e status intactos', velha.r.activated === false && velha.db.estado.updates.length === 0 && velha.db.estado.perfil.video_credits === 3 && velha.db.estado.perfil.trial_status === 'downgraded')
  const recente = await ativa({ country: 'PK', perfil: { ...antiga, trial_status: 'active', video_credits: 10 } })
  checa('conta do PK que JÁ tem trial ativo (cadastrada antes da virada): trial intacto, sem marca region_paid_only', recente.r.reason === 'trial_already_used' && recente.db.estado.updates.length === 0 && recente.db.estado.perfil.trial_status === 'active' && recente.db.estado.perfil.video_credits === 10)
  const mut = await ativa({ country: 'PK', sobrescritas: muta('lib/reverseTrial.ts', 'if (!filmeGratisPermitido(args.country ?? null)) {', 'if (false) {') })
  checa('mutante (guarda de país desligada) → PK ganha trial → vermelho', mut.r.activated === true)
}

// ══ (c) cota semanal nova ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('== (c) cota semanal: 1 Seedance 1.5 de 15 s, só país rico, sem acumular ==')
const FW = L0('lib/freeWeeklyFilm.ts')
const ECOST = L0('lib/credits/engineCost.ts')
const DIA = 86400000
const velhaConta = new Date(Date.now() - 60 * DIA).toISOString()
const P = (o = {}) => ({ id: 'u-1', plan: 'free', has_paid: false, trial_status: 'downgraded', created_at: velhaConta, video_credits: 0, ...o })
checa(`custo do filme da semana = creditCostForDuration('cinematic_ai', true, 15) = ${FW.FREE_WEEKLY_FILM_CREDITS}; 15 s; Seedance 1.5`, FW.FREE_WEEKLY_FILM_CREDITS === ECOST.creditCostForDuration('cinematic_ai', true, 15) && FW.FREE_WEEKLY_FILM_SECONDS === 15 && FW.FREE_WEEKLY_FILM_QUALITY === 'cinematic_ai')
const matriz = (M) => [
  // KINEO-E4-CONSERTO-2026-09-29 — reancorado com motivo (revisão de dinheiro, achado 4): país desconhecido (nulo, 'XX',
  // 'T1' do Tor) deixou de conceder a cota semanal — era a porta de conta antiga de fora da lista pelo Tor/VPN.
  [P(), 'US', 'eligible'], [P(), 'ES', 'eligible'], [P(), 'GB', 'eligible'], [P(), null, 'country'], [P(), 'XX', 'country'], [P(), 'T1', 'country'], [P(), '', 'country'],
  [P(), 'PK', 'country'], [P(), 'IN', 'country'], [P(), 'NG', 'country'], [P(), 'MX', 'country'], [P(), 'BR', 'eligible'], // Reancorado 03/10 (KINEO-BRASIL-VOLTA)
  [P({ trial_status: 'region_paid_only' }), 'US', 'region_paid_only'], [P({ trial_status: 'region_paid_only' }), null, 'region_paid_only'],
  [P({ has_paid: true }), 'US', 'paid'], [P({ plan: 'starter' }), 'US', 'paid'], [P({ plan: 'autopilot' }), 'US', 'paid'],
  [P({ trial_status: 'active' }), 'US', 'trial_status'], [P({ trial_status: 'blocked' }), 'US', 'trial_status'], [P({ trial_status: 'card_required' }), 'US', 'trial_status'],
  [P({ trial_status: null, created_at: new Date().toISOString() }), 'US', 'too_new'], [P({ trial_status: null }), 'US', 'eligible'],
].every(([perfil, pais, esperado]) => M.freeWeeklyFilmEligibility(perfil, pais) === esperado)
checa('elegibilidade: só grátis de país CONHECIDO da lista (nulo/XX/T1 não); region_paid_only/pago/trial ativo/blocked/conta nova fora', matriz(FW))
checa('mutante (region_paid_only deixa de ser barrada) → vermelho', !matriz(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', "  if (status === REGION_PAID_ONLY_TRIAL_STATUS) return 'region_paid_only'\n", '') })('lib/freeWeeklyFilm.ts')))
checa('mutante (país ignorado) → vermelho', !matriz(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', "  if (paisDaListaConfirmado(country ?? null) === null) return 'country'\n", '') })('lib/freeWeeklyFilm.ts')))
checa('mutante (volta o fail-open do cadastro: país desconhecido concede) → vermelho', !matriz(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', "  if (paisDaListaConfirmado(country ?? null) === null) return 'country'\n", "  if (!require('./freeFilmPolicy').filmeGratisPermitido(country ?? null)) return 'country'\n") })('lib/freeWeeklyFilm.ts')))
// país fixado na 1ª vez (achado 4)
const fixa = (M) =>
  M.freeWeeklyCountryMatches({ firstRead: true, firstCountry: null, country: 'US' }) === true &&
  M.freeWeeklyCountryMatches({ firstRead: true, firstCountry: 'US', country: 'US' }) === true &&
  M.freeWeeklyCountryMatches({ firstRead: true, firstCountry: 'us', country: 'US' }) === true &&
  M.freeWeeklyCountryMatches({ firstRead: true, firstCountry: 'GB', country: 'US' }) === false &&
  M.freeWeeklyCountryMatches({ firstRead: false, firstCountry: null, country: 'US' }) === false &&
  M.freeWeeklyCountryMatches({ firstRead: true, firstCountry: null, country: 'T1' }) === false &&
  M.freeWeeklyCountryMatches({ firstRead: true, firstCountry: null, country: 'PK' }) === false
checa('país fixado: o da 1ª recarga/admissão manda; trocar de país (VPN) ou leitura falha = não; desconhecido/fora da lista = não', fixa(FW))
checa('mutante (troca de país aceita) → vermelho', !fixa(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', '  return primeiro === null || primeiro === atual\n', '  return true\n') })('lib/freeWeeklyFilm.ts')))
// trava de simultâneos (achado 5)
const exclusivo = (M) =>
  M.freeWeeklyFilmExclusive({ otherActiveHold: false, weekCinematicDebits: 0 }) === true &&
  M.freeWeeklyFilmExclusive({ otherActiveHold: true, weekCinematicDebits: 0 }) === false &&
  M.freeWeeklyFilmExclusive({ otherActiveHold: false, weekCinematicDebits: 1 }) === false &&
  M.freeWeeklyFilmExclusive({ otherActiveHold: false, weekCinematicDebits: null }) === false
checa('exclusividade: outro render em voo (hold) ou débito cinematic não estornado na semana ou leitura falha = recusa', exclusivo(FW))
checa('mutante (hold alheio ignorado) → vermelho', !exclusivo(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', '  return input.otherActiveHold === false && input.weekCinematicDebits === 0\n', '  return input.weekCinematicDebits === 0\n') })('lib/freeWeeklyFilm.ts')))
const semAcumular = (M) => M.freeWeeklyTopUp(0) === 7 && M.freeWeeklyTopUp(3) === 4 && M.freeWeeklyTopUp(7) === 0 && M.freeWeeklyTopUp(40) === 0 && M.freeWeeklyTopUp(null) === 7
checa('recarga completa até 7 e nunca além (0→7, 3→+4, 7→0, 40→0)', semAcumular(FW))
checa('mutante (recarga soma 7 sempre) → vermelho', !semAcumular(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', '  return Math.max(0, FREE_WEEKLY_FILM_CREDITS - b)', '  return FREE_WEEKLY_FILM_CREDITS') })('lib/freeWeeklyFilm.ts')))
const admite = (M) =>
  M.freeWeeklyFilmAdmissible({ quality: 'cinematic_ai', durationSeconds: 15, eligibility: 'eligible', recentSeedanceFilms: 0 }) === true &&
  M.freeWeeklyFilmAdmissible({ quality: 'cinematic_ai', durationSeconds: 35, eligibility: 'eligible', recentSeedanceFilms: 0 }) === false &&
  M.freeWeeklyFilmAdmissible({ quality: 'fast', durationSeconds: 15, eligibility: 'eligible', recentSeedanceFilms: 0 }) === false &&
  M.freeWeeklyFilmAdmissible({ quality: 'cinematic_kling', durationSeconds: 15, eligibility: 'eligible', recentSeedanceFilms: 0 }) === false &&
  M.freeWeeklyFilmAdmissible({ quality: 'cinematic_ai', durationSeconds: 15, eligibility: 'eligible', recentSeedanceFilms: 1 }) === false &&
  M.freeWeeklyFilmAdmissible({ quality: 'cinematic_ai', durationSeconds: 15, eligibility: 'eligible', recentSeedanceFilms: null }) === false &&
  M.freeWeeklyFilmAdmissible({ quality: 'cinematic_ai', durationSeconds: 15, eligibility: 'country', recentSeedanceFilms: 0 }) === false
checa('admissão: só Seedance 1.5 (cinematic_ai), só 15 s, só elegível, só sem filme Seedance na semana; contagem falha = não', admite(FW))
checa('mutante (qualquer duração) → vermelho', !admite(criaLoader({ sobrescritas: muta('lib/freeWeeklyFilm.ts', '    input.durationSeconds === FREE_WEEKLY_FILM_SECONDS &&\n', '') })('lib/freeWeeklyFilm.ts')))

// recarga executada (lib/freeWeeklyFilmGrant.ts)
async function recarga({ perfil, pais = 'US', eventos = [], sobrescritas = {}, corrida = false, falhaEventos = false, carimboFalha = false }) {
  const db = bancoFalso({ perfil, eventos, corrida, falhaEventos })
  const escritos = []
  const G = criaLoader({ sobrescritas })('lib/freeWeeklyFilmGrant.ts')
  // KINEO-E4-CONSERTO-2026-09-29 — o escritor devolve o que o writeServerEvent real devolve (true/false) e anota quantos
  // UPDATEs já tinham rodado quando o carimbo foi gravado (carimbo ANTES do crédito, achado 3).
  const r = await G.grantFreeWeeklyFilm(db, async (e) => {
    escritos.push({ ...e, updatesAntes: db.estado.updates.length })
    if (carimboFalha && e.name === 'free_weekly_film_granted') return false
    db.estado.eventos.push({ name: e.name, created_at: new Date().toISOString(), metadata: e.metadata })
    return true
  }, { userId: 'u-1', country: pais })
  return { r, db, escritos }
}
async function provaRecarga(sobrescritas = {}) {
  const p = []
  const a = await recarga({ perfil: P(), sobrescritas })
  if (!(a.r.granted === 7 && a.db.estado.perfil.video_credits === 7 && a.escritos.length === 1 && a.escritos[0].name === 'free_weekly_film_granted' && a.escritos[0].metadata?.country === 'US')) p.push('US grátis com 0 cr não recebeu 7 com evento: ' + JSON.stringify(a.r))
  if (!(a.escritos[0]?.updatesAntes === 0)) p.push('carimbo gravado DEPOIS do crédito (achado 3)')
  const cas = a.db.estado.updates[0]?.filtros?.some(([k, c, v]) => k === 'eq' && c === 'video_credits' && v === 0)
  if (!cas) p.push('UPDATE sem compare-and-set no saldo lido')
  const b = await recarga({ perfil: P({ video_credits: 7 }), sobrescritas })
  if (!(b.r.granted === 0 && b.db.estado.updates.length === 0 && b.escritos.length === 0)) p.push('saldo 7 recebeu mais (acumulou): ' + JSON.stringify(b.r))
  const c = await recarga({ perfil: P({ video_credits: 0 }), eventos: [{ name: 'free_weekly_film_granted', created_at: new Date(Date.now() - 3 * DIA).toISOString() }], sobrescritas })
  if (!(c.r.granted === 0 && c.r.reason === 'week_used' && c.db.estado.updates.length === 0)) p.push('2ª recarga na mesma semana: ' + JSON.stringify(c.r))
  const d = await recarga({ perfil: P({ video_credits: 0 }), eventos: [{ name: 'free_weekly_film_granted', created_at: new Date(Date.now() - 8 * DIA).toISOString() }], sobrescritas })
  if (!(d.r.granted === 7)) p.push('semana seguinte sem recarga: ' + JSON.stringify(d.r))
  const e = await recarga({ perfil: P(), pais: 'PK', sobrescritas })
  if (!(e.r.granted === 0 && e.db.estado.updates.length === 0)) p.push('PK recebeu recarga')
  const f = await recarga({ perfil: P({ trial_status: 'region_paid_only' }), pais: 'US', sobrescritas })
  if (!(f.r.granted === 0 && f.db.estado.updates.length === 0)) p.push('region_paid_only (com VPN nos EUA) recebeu recarga')
  const g = await recarga({ perfil: P(), corrida: true, sobrescritas })
  if (!(g.r.granted === 0 && g.r.reason === 'race' && g.escritos.map((x) => x.name).join(',') === 'free_weekly_film_granted,free_weekly_film_grant_voided')) p.push('corrida somou ou não anulou o carimbo: ' + JSON.stringify(g.r))
  const h = await recarga({ perfil: P(), falhaEventos: true, sobrescritas })
  if (!(h.r.granted === 0 && h.db.estado.updates.length === 0)) p.push('janela ilegível recarregou (falha aberta)')
  const i = await recarga({ perfil: P({ has_paid: true }), sobrescritas })
  if (!(i.r.granted === 0)) p.push('pagante recebeu cota grátis')
  // achado 3: carimbo não gravou → nenhum crédito (era: crédito dado e janela sem carimbo = recarga sem teto)
  const j = await recarga({ perfil: P(), carimboFalha: true, sobrescritas })
  if (!(j.r.granted === 0 && j.r.reason === 'stamp_failed' && j.db.estado.updates.length === 0)) p.push('carimbo falhou e o crédito saiu: ' + JSON.stringify(j.r))
  // achado 4: país da 1ª vez fixo; desconhecido/Tor não recarrega
  const k = await recarga({ perfil: P(), pais: 'US', eventos: [{ name: 'free_weekly_film_granted', created_at: new Date(Date.now() - 20 * DIA).toISOString(), metadata: { country: 'GB' } }], sobrescritas })
  if (!(k.r.granted === 0 && k.r.reason === 'country_changed' && k.db.estado.updates.length === 0)) p.push('trocou de país (GB→US) e recarregou: ' + JSON.stringify(k.r))
  const l = await recarga({ perfil: P(), pais: 'US', eventos: [{ name: 'free_weekly_film_admitted', created_at: new Date(Date.now() - 20 * DIA).toISOString(), metadata: { country: 'US' } }], sobrescritas })
  if (!(l.r.granted === 7)) p.push('mesmo país da 1ª vez não recarregou: ' + JSON.stringify(l.r))
  for (const pais of [null, 'T1', 'XX']) {
    const m = await recarga({ perfil: P(), pais, sobrescritas })
    if (!(m.r.granted === 0 && m.db.estado.updates.length === 0)) p.push(`país ${pais} (desconhecido/Tor) recarregou`)
  }
  return p
}
{
  const real = await provaRecarga()
  checa(`recarga executada: 0→7 com carimbo ANTES do crédito e compare-and-set; carimbo falho = nada; 7 não acumula; 1×/7 dias; país fixo; PK, Tor, region_paid_only, pagante e corrida fora${real.length ? ' — ' + real.join(' | ') : ''}`, real.length === 0)
  checa('mutante (sem a janela de 7 dias) → vermelho', (await provaRecarga(muta('lib/freeWeeklyFilmGrant.ts', "    if (Array.isArray(recent) && recent.length > 0) return { granted: 0, reason: 'week_used', balanceAfter: balance }\n", ''))).length > 0)
  checa('mutante (sem compare-and-set) → vermelho', (await provaRecarga(muta('lib/freeWeeklyFilmGrant.ts', "      .eq('video_credits', p.video_credits ?? 0)\n", ''))).length > 0)
  checa('mutante (carimbo que falhou é ignorado) → vermelho', (await provaRecarga(muta('lib/freeWeeklyFilmGrant.ts', "    if (stamped !== true) return { granted: 0, reason: 'stamp_failed', balanceAfter: balance }\n", ''))).length > 0)
  checa('mutante (país da 1ª vez ignorado) → vermelho', (await provaRecarga(muta('lib/freeWeeklyFilmGrant.ts', '    if (!freeWeeklyCountryMatches({ firstRead: !firstErr, firstCountry, country: args.country })) {', '    if (false) {'))).length > 0)
  const credits = rd('app/api/credits/route.ts')
  const iGrant = credits.indexOf('        await grantFreeWeeklyFilm(svc, writeServerEvent, { userId: user.id, country: paisDoRequest(req.headers) })')
  const iSaldo = credits.indexOf("      .select('video_credits, plan')\n")
  checa('/api/credits recarrega ANTES de ler o saldo, com o país do pedido', iGrant > 0 && iSaldo > iGrant)
}

// admissão REAL do cinematic (bloco extraído da rota e executado)
console.log('== (c2) admissão semanal no /api/generate-video-cinematic (bloco real executado) ==')
{
  const CIN = 'app/api/generate-video-cinematic/route.ts'
  const extraiAdmissao = (src) => {
    const a = src.indexOf('    let freeWeeklyAdmitted = false\n')
    const b = src.indexOf('    // PUSH #20 — every premium AI engine is paid-only.', a)
    if (a < 0 || b < 0) throw new Error('bloco da admissão sumiu')
    return src.slice(a, b)
  }
  // KINEO-E4-CONSERTO-2026-09-29 — o bloco lê o país da 1ª vez (events, service role): o cliente de serviço é injetado e
  // o env também (sem env → a leitura "falha" → não admite).
  async function roda(bloco, { perfil, pais = 'US', quality = 'cinematic_ai', duracao = 15, recentes = 0, pago = false, trial = false, eventosAntes = [], semEnv = false }) {
    const FWM = L0('lib/freeWeeklyFilm.ts')
    const fn = `(async ({ isPaidUser, trialActive, costQuality, duration, profile, req, supabase, user, writeServerEvent, cost, balance, paisDoRequest, createAdminClient, FREE_WEEKLY_FILM_ADMITTED_EVENT, FREE_WEEKLY_FILM_COUNTRY_EVENTS, FREE_WEEKLY_FILM_QUALITY, FREE_WEEKLY_FILM_SECONDS, FREE_WEEKLY_FILM_WINDOW_MS, freeWeeklyCountryMatches, freeWeeklyFilmAdmissible, freeWeeklyFilmEligibility }) => {\n${bloco}\nreturn freeWeeklyAdmitted })`
    const f = vm.runInNewContext(transpila(fn), { Date, process: { env: semEnv ? {} : { NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid', SUPABASE_SERVICE_ROLE_KEY: 'k' } } })
    const eventos = []
    const db = bancoFalso({ videosRecentes: recentes, eventos: eventosAntes })
    const adm = await f({ isPaidUser: pago, trialActive: trial, costQuality: quality, duration: duracao, profile: perfil, req: { headers: { get: (n) => (n === 'x-vercel-ip-country' ? pais : null) } }, supabase: db, user: { id: 'u-1' }, writeServerEvent: async (e) => { eventos.push(e) }, cost: 7, balance: 7, paisDoRequest: POL.paisDoRequest, createAdminClient: () => db, ...FWM })
    return { adm, eventos, db }
  }
  const prova = async (bloco) => {
    const p = []
    const a = await roda(bloco, { perfil: P() })
    if (!(a.adm === true && a.eventos.some((e) => e.name === 'free_weekly_film_admitted'))) p.push('US grátis 15 s não admitido')
    if ((await roda(bloco, { perfil: P(), pais: 'PK' })).adm) p.push('PK admitido')
    if ((await roda(bloco, { perfil: P({ trial_status: 'region_paid_only' }) })).adm) p.push('region_paid_only admitido')
    if ((await roda(bloco, { perfil: P(), duracao: 35 })).adm) p.push('35 s admitido')
    if ((await roda(bloco, { perfil: P(), quality: 'cinematic_kling' })).adm) p.push('Kling admitido')
    if ((await roda(bloco, { perfil: P(), recentes: 1 })).adm) p.push('2º filme na semana admitido')
    if ((await roda(bloco, { perfil: P(), recentes: null })).adm) p.push('contagem falha admitiu')
    // achado 4: país desconhecido (Tor), país trocado desde a 1ª vez, ou leitura do país impossível → não admite
    if ((await roda(bloco, { perfil: P(), pais: 'T1' })).adm) p.push('Tor (T1) admitido')
    if ((await roda(bloco, { perfil: P(), pais: null })).adm) p.push('sem país admitido')
    if ((await roda(bloco, { perfil: P(), pais: 'US', eventosAntes: [{ name: 'free_weekly_film_granted', created_at: '2026-09-01T00:00:00Z', metadata: { country: 'GB' } }] })).adm) p.push('país trocado (GB→US) admitido')
    if (!(await roda(bloco, { perfil: P(), pais: 'US', eventosAntes: [{ name: 'free_weekly_film_admitted', created_at: '2026-09-01T00:00:00Z', metadata: { country: 'US' } }] })).adm) p.push('mesmo país da 1ª vez recusado')
    if ((await roda(bloco, { perfil: P(), semEnv: true })).adm) p.push('sem service role (país da 1ª vez ilegível) admitiu')
    return p
  }
  const src = rd(CIN)
  const real = await prova(extraiAdmissao(src))
  checa(`bloco real: admite só conta grátis de país da lista, Seedance 15 s, 1ª da semana${real.length ? ' — ' + real.join(' | ') : ''}`, real.length === 0)
  checa('mutante (país da 1ª vez ignorado) → vermelho', (await prova(extraiAdmissao(trocar(src, '        if (!freeWeeklyCountryMatches({ firstRead: !primeiraVez.error,', '        if (false && !freeWeeklyCountryMatches({ firstRead: !primeiraVez.error,')))).length > 0)
  checa('mutante (sem a contagem da semana) → vermelho', (await prova(extraiAdmissao(trocar(src, '      freeWeeklyAdmitted = freeWeeklyFilmAdmissible({ quality: costQuality, durationSeconds: duration, eligibility: semanal, recentSeedanceFilms: recentes })', '      freeWeeklyAdmitted = freeWeeklyFilmAdmissible({ quality: costQuality, durationSeconds: duration, eligibility: semanal, recentSeedanceFilms: 0 })')))).length > 0)
  const linhas = src.split('\n')
  const i = (l) => linhas.indexOf(l)
  const iAdm = i('    let freeWeeklyAdmitted = false')
  const iGate = i('    if (!isPaidUser && !trialActive) {')
  const iPula = i('      if (!freeWeeklyAdmitted) {')
  const iStudio = linhas.findIndex((l) => l.startsWith('    if ((wantsKling || wantsVeo || hollywoodPath) && !isPaidUser && !(TRIAL_UNLOCKS_PREMIUM && trialActive)) {'))
  checa('o gate de plano honra a admissão; o gate dos motores Studio (Kling/Veo/Hollywood) vem antes e não a conhece', iAdm > 0 && iGate > iAdm && iPula === iGate + 3 && iStudio > 0 && iStudio < iAdm && !linhas[iStudio].includes('freeWeeklyAdmitted'))
  checa('a releitura fresca antes do débito também honra a admissão (o saldo continua cobrando)', src.includes('      PAID_PLANS.has(currentPlan) ||\n      freeWeeklyAdmitted || // KINEO-E4-SAIDA-B-2026-09-29') && src.includes('    if (!currentPaid || holds.totalHeld > currentBalance) {'))
  // KINEO-E4-CONSERTO-2026-09-29 (revisão de dinheiro, achado 5) — a trava de pedidos simultâneos (bloco REAL executado).
  const INI_EX = '    // ═══ KINEO-E4-CONSERTO-2026-09-29 [TRAVA 8.2 — "vai E4" do fundador] (revisão de dinheiro, achado 5) ═══\n'
  const FIM_EX = '    // KINEO-CAPACITY-2026-08-08 — DISJUNTOR GLOBAL'
  const extraiEx = (s2) => { const a = s2.indexOf(INI_EX), b = s2.indexOf(FIM_EX, a); if (a < 0 || b < 0) throw new Error('trava de simultâneos sumiu'); return s2.slice(a, b) }
  async function rodaEx(bloco, { admitido = true, held = 7, debitos = 0 }) {
    const FWM = L0('lib/freeWeeklyFilm.ts')
    const fn = `(async ({ freeWeeklyAdmitted, cinematicAdmin, user, holds, cost, releaseBirthClaim, writeServerEvent, NextResponse, FREE_WEEKLY_FILM_WINDOW_MS, FREE_WEEKLY_FILM_EXCLUSIVE_REFUSED_EVENT, FREE_WEEKLY_FILM_IN_USE_MESSAGE, freeWeeklyFilmExclusive }) => {\n${bloco}\nreturn 'PASSOU' })`
    const soltos = [], eventos = []
    const r = await vm.runInNewContext(transpila(fn), { Date })({ freeWeeklyAdmitted: admitido, cinematicAdmin: bancoFalso({ debitosSemana: debitos }), user: { id: 'u-1' }, holds: { ok: true, totalHeld: held, currentSeen: true }, cost: 7, releaseBirthClaim: async (m) => { soltos.push(m) }, writeServerEvent: async (e) => { eventos.push(e) }, NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) }, ...FWM })
    return { r, soltos, eventos }
  }
  const provaEx = async (bloco) => {
    const p = []
    if ((await rodaEx(bloco, {})).r !== 'PASSOU') p.push('admitido sozinho foi barrado')
    const dois = await rodaEx(bloco, { held: 14 })
    if (!(dois.r?.status === 402 && dois.r.body.charged === false && dois.soltos.length === 1 && dois.eventos.some((e) => e.name === 'free_weekly_film_exclusive_refused'))) p.push('2º pedido simultâneo (hold alheio) passou ou não soltou o claim')
    if ((await rodaEx(bloco, { debitos: 1 })).r === 'PASSOU') p.push('débito cinematic não estornado na semana e passou')
    if ((await rodaEx(bloco, { debitos: null })).r === 'PASSOU') p.push('leitura de débitos falhou e passou')
    if ((await rodaEx(bloco, { admitido: false, held: 14, debitos: 3 })).r !== 'PASSOU') p.push('trava atingiu quem não é da cota semanal')
    return p
  }
  {
    const realEx = await provaEx(extraiEx(src))
    checa(`trava de simultâneos (bloco real executado): 2º pedido com hold alheio, débito da semana ou leitura falha → 402 sem cobrar e claim solto${realEx.length ? ' — ' + realEx.join(' | ') : ''}`, realEx.length === 0)
    checa('mutante (hold alheio ignorado na rota) → vermelho', (await provaEx(extraiEx(trocar(src, '{ otherActiveHold: holds.totalHeld > cost,', '{ otherActiveHold: false,')))).length > 0)
    const linhasEx = src.split('\n')
    const iHolds = linhasEx.indexOf('    const holds = await inspectActiveComposeCreditHolds({')
    const iEx = linhasEx.indexOf(INI_EX.slice(0, -1))
    const iSaldo = linhasEx.indexOf('    if (!currentPaid || holds.totalHeld > currentBalance) {')
    const iDebito = linhasEx.indexOf('    const upfrontDebit = await ensureCinematicDebit(cost)')
    checa('a trava roda DEPOIS de gravar/auditar o próprio claim e ANTES do débito', iHolds > 0 && iSaldo > iHolds && iEx > iSaldo && iDebito > iEx)
  }
  checa('region_paid_only no cinematic ouve a verdade (REGION_PAID_ONLY_REFUSAL), não "upgrade" seco', src.includes('      if (profile?.trial_status === REGION_PAID_ONLY_TRIAL_STATUS) {') && POL.REGION_PAID_ONLY_REFUSAL.includes('not available in your country') && POL.REGION_PAID_ONLY_REFUSAL.includes('Plans work normally'))
}

// ══ (d) Kineo 1 fora do jogo ════════════════════════════════════════════════════════════════════════════════════════
console.log('== (d) portão do Kineo 1 ==')
const G1 = L0('lib/kineo1Gate.ts')
const ADS = L0('lib/ads/access.ts')
const AP = L0('lib/autopilot/config.ts')
const INT = L0('lib/internalAccounts.ts')
const provaPortao = (M) =>
  M.kineo1GateReason({ email: 'novo@gmail.com', plan: 'free', hasPaid: false }) === 'retired' &&
  M.kineo1GateReason({ email: 'test123@gmail.com', plan: 'free', hasPaid: false }) === 'retired' &&
  M.kineo1GateReason({ email: 'x@mailinator.com', plan: 'free', hasPaid: false }) === 'retired' &&
  M.kineo1GateReason({ email: null, plan: null, hasPaid: null }) === 'retired' &&
  M.kineo1GateReason({ email: 'pagante@gmail.com', plan: 'free', hasPaid: true }) === 'has_paid' &&
  ['starter', 'basic', 'creator', 'pro', 'studio', 'basic_trial'].every((p) => M.kineo1GateReason({ plan: p, hasPaid: false }) === 'paid_plan') &&
  [...AP.AUTOPILOT_PAID_PLANS].every((p) => M.kineo1GateReason({ plan: p, hasPaid: false }) !== 'retired') &&
  ADS.ADS_SUBSCRIBER_PLANS.every((p) => M.kineo1GateReason({ plan: p, hasPaid: false }) !== 'retired') &&
  INT.INTERNAL_EXACT_EMAILS.every((e) => M.kineo1GateReason({ email: e, plan: 'free', hasPaid: false }) === 'internal')
checa('trial/grátis/region_paid_only e "test…@"/mailinator recusados; has_paid (pacote, passe de Ads), planos pagos, Autopilot, assinantes do Studio Ads e a casa (lista exata) passam', provaPortao(G1))
checa('mutante (has_paid ignorado) → vermelho', !provaPortao(criaLoader({ sobrescritas: muta('lib/kineo1Gate.ts', "  if (i.hasPaid === true) return 'has_paid'\n", '') })('lib/kineo1Gate.ts')))
checa('mutante (casa pelos padrões LIKE de isInternalEmail) → vermelho', !provaPortao(criaLoader({ sobrescritas: muta('lib/kineo1Gate.ts', '  if (isHouseExact(i.email)) return \'internal\'', "  if (require('@/lib/internalAccounts').isInternalEmail(i.email)) return 'internal'") })('lib/kineo1Gate.ts')))
{
  const FAST = 'app/api/generate-video-fast/route.ts'
  const INICIO = '    // ═══ KINEO-E4-SAIDA-B-2026-09-29 [TRAVA 8.2 — "vai E4" do fundador] — PORTÃO DO KINEO 1, ANTES DE QUALQUER FORNECEDOR ═══'
  const FIM = '    // ═══ FIM KINEO-E4-SAIDA-B (portão do Kineo 1) ═══'
  const extrai = (src) => { const a = src.indexOf(INICIO + '\n'), b = src.indexOf(FIM, a); if (a < 0 || b < 0) throw new Error('portão sumiu'); return src.slice(a, b) }
  async function rodaPortao(bloco, { perfil, erro = null, servico = false, email = 'pessoa@gmail.com', emailAuth = 'pessoa@gmail.com' }) {
    const fn = `(async ({ supabase, user, isServiceJob, retryOwnReadOnSkew, recordFastFailure, NextResponse, writeServerEvent, kineo1GateReason, KINEO1_RETIRED_EVENT, KINEO1_RETIRED_MESSAGE, KINEO1_RETIRED_REASON }) => {\n${bloco}\nreturn 'PASSOU' })`
    const f = vm.runInNewContext(transpila(fn), {})
    const eventos = [], falhasRegistradas = []
    // KINEO-E4-CONSERTO-2026-09-29 — o cliente de serviço também responde auth.admin.getUserById (e-mail VERIFICADO).
    const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => (erro ? { data: null, error: erro } : { data: perfil, error: null }) }) }) }), auth: { admin: { getUserById: async () => ({ data: { user: { email: emailAuth } }, error: null }) } } }
    const r = await f({ supabase: db, user: { id: 'u-1', email }, isServiceJob: servico, retryOwnReadOnSkew: async () => null, recordFastFailure: (...a) => falhasRegistradas.push(a), NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) }, writeServerEvent: async (e) => { eventos.push(e) }, ...G1 })
    return { r, eventos }
  }
  const prova = async (bloco) => {
    const p = []
    const trial = await rodaPortao(bloco, { perfil: { plan: 'free', has_paid: false, trial_status: 'active' } })
    if (!(trial.r?.status === 403 && trial.r.body.reason === 'kineo1_retired' && trial.r.body.charged === false && trial.eventos.some((e) => e.name === 'kineo1_retired_refused'))) p.push('trial não recusado com kineo1_retired')
    const regiao = await rodaPortao(bloco, { perfil: { plan: 'free', has_paid: false, trial_status: 'region_paid_only' } })
    if (regiao.r?.status !== 403) p.push('region_paid_only passou')
    if ((await rodaPortao(bloco, { perfil: { plan: 'free', has_paid: true } })).r !== 'PASSOU') p.push('pagante (has_paid) barrado')
    if ((await rodaPortao(bloco, { perfil: { plan: 'autopilot', has_paid: false } })).r !== 'PASSOU') p.push('Autopilot barrado')
    if ((await rodaPortao(bloco, { perfil: { plan: 'starter', has_paid: false } })).r !== 'PASSOU') p.push('assinante barrado')
    if ((await rodaPortao(bloco, { perfil: { plan: 'free', has_paid: false }, email: 'josephsskaf@gmail.com' })).r !== 'PASSOU') p.push('casa barrada')
    if ((await rodaPortao(bloco, { perfil: { plan: 'free', has_paid: false }, email: 'josephsskaf@gmail.com', servico: true })).r === 'PASSOU') p.push('modo serviço aceitou e-mail editável como casa')
    if ((await rodaPortao(bloco, { perfil: { plan: 'free', has_paid: false }, email: 'editado@x.com', emailAuth: 'josephsskaf@gmail.com', servico: true })).r !== 'PASSOU') p.push('modo serviço barrou a casa pelo e-mail do auth')
    const falha = await rodaPortao(bloco, { perfil: null, erro: { message: 'x', code: 'X' } })
    if (!(falha.r?.status === 503 && falha.r.body.charged === false)) p.push('leitura falha não deu 503 sem gasto')
    return p
  }
  const src = rd(FAST)
  const real = await prova(extrai(src))
  checa(`generate-video-fast (bloco real executado): trial e region_paid_only → 403 kineo1_retired sem gasto; pagante, Autopilot, assinante e casa passam; leitura falha → 503${real.length ? ' — ' + real.join(' | ') : ''}`, real.length === 0)
  checa('a recusa do Kineo 1 grava o evento com await (void antes do return morre na Vercel)', src.includes('        await writeServerEvent({ name: KINEO1_RETIRED_EVENT,') && !src.includes('void writeServerEvent({ name: KINEO1_RETIRED_EVENT'))
  checa("mutante (portão sem o return) → vermelho", (await prova(extrai(trocar(src, "    if (portao === 'retired') {", '    if (false) {')))).length > 0)
  // posição: antes de todo fornecedor e do dry-run (linhas inteiras)
  const posicao = (s) => {
    const linhas = s.split('\n')
    const iPortao = linhas.indexOf(INICIO)
    const iUser = linhas.indexOf("      recordFastFailure('generating', 'unauthenticated', 401)")
    const primeira = (frag) => linhas.findIndex((l) => l.includes(frag) && !l.trim().startsWith('//') && !l.trim().startsWith('import'))
    const fornecedores = ['await req.json()', 'isDryRunAccount(user.email)', 'findRecentTwin(', 'generateScenes(', 'getPixabayClipsForScene(', 'submitAiHook(', 'submitSceneClip(', 'generateFastSceneStill(', 'searchVault(']
    return iUser > 0 && iPortao > iUser && fornecedores.every((f) => { const k = primeira(f); return k > iPortao })
  }
  checa('o portão mora depois da autenticação e ANTES do corpo, do dry-run, do dedupe, do planejador, do Pixabay e do fal', posicao(src))
  const blocoPortao = extrai(src)
  const semPortao = src.replace(blocoPortao, '')
  const movido = trocar(semPortao, '    const intake = stripIdeaPrefix((body.prompt ?? \'\').trim())\n', '    const intake = stripIdeaPrefix((body.prompt ?? \'\').trim())\n' + blocoPortao.replace(INICIO, INICIO) + '\n')
  checa('mutante (portão movido para depois do corpo e do dry-run) → vermelho', !posicao(movido))
}
{
  const COMP = 'app/api/compose/route.ts'
  const src = rd(COMP)
  // KINEO-E4-CONSERTO-2026-09-29 — reancorado com motivo (revisão de dinheiro, achados 1 e 2): o portão deixou de ficar
  // preso ao free-plan-fast (trial ativo ia ao ramo de crédito e saía Kineo 1) e, em modo serviço, a casa se decide pelo
  // e-mail do AUTH (o Studio Ads da conta da casa em plano grátis tomava 403).
  const A = "        let kineo1Porta = kineo1GateReason({ email: isServiceFinish ? null : user.email ?? null, plan: prof?.plan ?? null, hasPaid })\n"
  const extrai = (s) => { const a = s.indexOf(A); if (a < 0) throw new Error('portão do compose sumiu'); const b = s.indexOf('        if (isFreePlanFast) {\n', a); return s.slice(a, b) }
  async function rodaCompose(bloco, { livre = true, plano = 'free', pago = false, email = 'p@gmail.com', emailAuth = 'p@gmail.com', servico = false, trial = false }) {
    const fn = `(async ({ isFreePlanFast, kineo1GateReason, isServiceFinish, user, prof, hasPaid, ent, supabase, logComposeRefusal, authenticatedUserId, quality, duration, NextResponse, KINEO1_RETIRED_EVENT, KINEO1_RETIRED_MESSAGE, KINEO1_RETIRED_REASON }) => {\n${bloco}\nreturn 'PASSOU' })`
    const recusas = []
    const supabase = { auth: { admin: { getUserById: async () => ({ data: { user: { email: emailAuth } }, error: null }) } } }
    const r = await vm.runInNewContext(transpila(fn), {})({ isFreePlanFast: livre, isServiceFinish: servico, user: { id: 'u', email }, prof: { plan: plano }, hasPaid: pago, ent: { isTrial: trial }, supabase, logComposeRefusal: async (...a) => { recusas.push(a) }, authenticatedUserId: 'u', quality: 'fast', duration: 35, NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) }, ...G1 })
    return { r, recusas }
  }
  const prova = async (bloco) => {
    const p = []
    const g = await rodaCompose(bloco, {})
    if (!(g.r?.status === 403 && g.r.body.reason === 'kineo1_retired' && g.recusas.some((x) => x[0] === 'kineo1_retired'))) p.push('grátis no free-plan-fast não recusado')
    const t = await rodaCompose(bloco, { livre: false, trial: true })
    if (!(t.r?.status === 403 && t.r.body.reason === 'kineo1_retired')) p.push('trial ativo (ramo de crédito) gerou Kineo 1 pelo compose')
    if ((await rodaCompose(bloco, { livre: false, plano: 'starter' })).r !== 'PASSOU') p.push('assinante barrado')
    if ((await rodaCompose(bloco, { livre: false, pago: true })).r !== 'PASSOU') p.push('has_paid (pacote/passe) barrado')
    if ((await rodaCompose(bloco, { plano: 'autopilot' })).r !== 'PASSOU') p.push('Autopilot sem has_paid barrado')
    if ((await rodaCompose(bloco, { email: 'josephsskaf@gmail.com' })).r !== 'PASSOU') p.push('casa barrada')
    if ((await rodaCompose(bloco, { servico: true, email: 'editado@x.com', emailAuth: 'josephsskaf@gmail.com' })).r !== 'PASSOU') p.push('Studio Ads (modo serviço) da casa barrado')
    if ((await rodaCompose(bloco, { servico: true, email: 'josephsskaf@gmail.com', emailAuth: 'estranho@x.com' })).r === 'PASSOU') p.push('modo serviço aceitou o e-mail editável de profiles como casa')
    return p
  }
  const real = await prova(extrai(src))
  checa(`compose fast (bloco real executado): grátis e TRIAL → 403 kineo1_retired; pago/has_paid/Autopilot/casa (inclusive Studio Ads em modo serviço, pelo e-mail do auth) seguem${real.length ? ' — ' + real.join(' | ') : ''}`, real.length === 0)
  checa('mutante (portão do compose desligado) → vermelho', (await prova(trocar(extrai(src), "        if (kineo1Porta === 'retired') {", "        if (kineo1Porta === 'NUNCA') {"))).length > 0)
  checa('mutante (portão preso de novo ao free-plan-fast) → vermelho', (await prova(trocar(extrai(src), "        if (kineo1Porta === 'retired') {", "        if (isFreePlanFast && kineo1Porta === 'retired') {"))).length > 0)
  checa('mutante (modo serviço sem o e-mail do auth) → vermelho', (await prova(trocar(extrai(src), "        if (kineo1Porta === 'retired' && isServiceFinish) {", '        if (false) {'))).length > 0)
  const linhas = src.split('\n')
  const iDef = linhas.indexOf('        isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial')
  const iPortao = linhas.indexOf(A.slice(0, -1))
  const iRamo = linhas.indexOf('        if (isFreePlanFast) {')
  const iClamp = linhas.indexOf('            freeDurationClamped = { from: duration, to: maxFreeSeconds }')
  const iCota = linhas.indexOf('          const quotaResponse = await reserveFreeFastPreviewSlot()')
  const iCredito = linhas.indexOf("          const requiredCredits = creditCostForDuration('fast', true, duration)")
  checa('no compose o portão vem depois de isFreePlanFast e ANTES da divisão free/crédito, do clamp e da reserva de cota', iDef > 0 && iPortao > iDef && iRamo > iPortao && iClamp > iPortao && iCota > iPortao && iCredito > iPortao)
  // achado 2: casa/Autopilot em plano grátis não passam pela contagem da cota (limit 0), mas tomam o mesmo claim de custo 0
  const INI_C = "          if (kineo1Porta === 'internal' || kineo1Porta === 'autopilot') {\n"
  const extraiCota = (s2) => { const a = s2.indexOf(INI_C), b = s2.indexOf("        } else {\n          const requiredCredits = creditCostForDuration('fast', true, duration)", a); if (a < 0 || b < 0) throw new Error('reserva do compose sumiu'); return s2.slice(a, b) }
  async function rodaCota(bloco, porta) {
    const chamadas = []
    const fn = `(async ({ kineo1Porta, claimGenerationSubmission, reserveFreeFastPreviewSlot }) => {\n${bloco}\nreturn 'SEGUIU' })`
    const r = await vm.runInNewContext(transpila(fn), {})({ kineo1Porta: porta, claimGenerationSubmission: async (c) => { chamadas.push('claim:' + c); return { kind: 'acquired' } }, reserveFreeFastPreviewSlot: async () => { chamadas.push('cota'); return { status: 402 } } })
    return { r, chamadas }
  }
  const provaCota = async (bloco) => {
    const p = []
    for (const porta of ['internal', 'autopilot']) { const x = await rodaCota(bloco, porta); if (!(x.r === 'SEGUIU' && x.chamadas.join() === 'claim:0')) p.push(porta + ' passou pela cota 0: ' + x.chamadas.join()) }
    const y = await rodaCota(bloco, 'retired'); if (!(y.chamadas.join() === 'cota' && y.r?.status === 402)) p.push('conta comum pulou a cota')
    return p
  }
  const realCota = await provaCota(extraiCota(src))
  checa(`compose (bloco real executado): casa e Autopilot em plano grátis tomam o claim de custo 0 sem a contagem da cota; os demais seguem na cota${realCota.length ? ' — ' + realCota.join(' | ') : ''}`, realCota.length === 0)
  checa('mutante (casa volta para a cota 0) → vermelho', (await provaCota(trocar(extraiCota(src), "          if (kineo1Porta === 'internal' || kineo1Porta === 'autopilot') {", '          if (false) {'))).length > 0)
  let intocados = false
  try {
    const d = execFileSync('git', ['diff', '--name-only', 'origin/main', '--', 'app/api/compose/status', 'app/api/compose/unlock'], { cwd: root, encoding: 'utf8' })
    intocados = d.trim() === ''
  } catch { intocados = !/kineo1Gate/.test(rd('app/api/compose/unlock/route.ts')) }
  checa('compose/status e compose/unlock intocados', intocados && !rd('app/api/compose/unlock/route.ts').includes('kineo1Gate'))
  const OFFER = L0('lib/freeTierOffer.ts')
  checa(`cota antiga de Kineo 1 desligada: buildFreeTierOffer(true).limit = ${OFFER.buildFreeTierOffer(true).limit}`, OFFER.buildFreeTierOffer(true).limit === 0)
  const copia = OFFER.buildFreeTierOffer(true).copy
  checa('a recusa antiga não promete "volta em 7 dias" nem "free Kineo 1"', !/7 days|this week|every week/i.test(copia.limitHitError + copia.limitResetLine + copia.limitHitEmailIntro) && !/free\s+Kineo 1/i.test(copia.limitHitError + copia.limitHitEmailSubject + copia.limitHitEmailIntro))
}

// ══ (e) crons e cartas ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('== (e) send-cap-hit sai cedo; send-weekly-quota recusa ==')
{
  async function rodaCapHit(sobrescritas = {}) {
    let clientes = 0
    const L = criaLoader({
      sobrescritas,
      env: { CRON_SECRET: 's', KINEO_LIFECYCLE_EMAILS_ENABLED: 'true', RESEND_API_KEY: 're_x', NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid', SUPABASE_SERVICE_ROLE_KEY: 'k' },
      externos: {
        'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) }, NextRequest: class {} },
        '@supabase/supabase-js': { createClient: () => { clientes += 1; throw new Error('cliente de banco criado') } },
      },
    })
    let r = null, erro = null
    try { r = await L('app/api/cron/send-cap-hit/route.ts').GET({ headers: { get: (n) => (n === 'authorization' ? 'Bearer s' : null) }, nextUrl: { searchParams: new URLSearchParams() } }) } catch (e) { erro = e }
    return { r, erro, clientes }
  }
  const real = await rodaCapHit()
  checa(`send-cap-hit executado com a cota em 0: skipped quota_off, 0 enviados, nenhum cliente de banco (${real.clientes})`, !real.erro && real.r?.body?.skipped === 'quota_off' && real.r.body.sent === 0 && real.clientes === 0)
  const mut = await rodaCapHit(muta('app/api/cron/send-cap-hit/route.ts', '  if (FREE_CAP <= 0) {\n', '  if (false) {\n'))
  checa('mutante (sem a saída cedo) → vermelho (o cron segue para o banco e o filtro n >= 0)', mut.clientes > 0 || !!mut.erro || mut.r?.body?.skipped !== 'quota_off')
  const carta = rd('app/api/admin/send-weekly-quota/route.ts')
  checa('send-weekly-quota recusa (409) enquanto limit !== 1 — com a cota em 0 a carta não sai', carta.includes("if (!offer.reverseTrial || windowDays !== 7 || offer.limit !== 1) {") && L0('lib/freeTierOffer.ts').buildFreeTierOffer(true).limit !== 1)
}

// ══ (f) texto público e tela ════════════════════════════════════════════════════════════════════════════════════════
console.log('== (f) llms.txt e /api/facts executados; aviso da conta region_paid_only ==')
{
  async function publica(sobrescritas = {}) {
    const L = criaLoader({ sobrescritas })
    const llms = await L('app/llms.txt/route.ts').GET().text()
    const facts = await L('app/api/facts/route.ts').GET().json()
    return { llms, facts }
  }
  const honesto = ({ llms, facts }) => {
    const p = []
    if (!/free 15-second film \(Seedance 1\.5\) in supported countries/.test(llms)) p.push('llms.txt sem "in supported countries" no filme grátis')
    if (facts.trialAccess?.freeFilm?.availableIn !== 'supported countries') p.push('/api/facts sem freeFilm.availableIn')
    if (!/in supported countries/.test(facts.freeTier?.allowance ?? '')) p.push('/api/facts allowance sem a cláusula')
    const tudo = llms + JSON.stringify(facts)
    // ("Brazil" já aparece no llms.txt por MOEDA — BRL no checkout — e não é lista de filme grátis.)
    if (/\b(Pakistan|Nigeria|Bangladesh)\b/.test(tudo) || /'US', 'CA'|US, CA, GB/.test(tudo)) p.push('lista de país digitada no texto público')
    if (/\bfree\b[^.\n]{0,80}\b(every|per|each|a) week\b|\bweekly free\b/i.test(tudo)) p.push('cota semanal anunciada')
    return p
  }
  const real = await publica()
  const probs = honesto(real)
  checa(`/llms.txt (${real.llms.length} car.) e /api/facts: filme grátis "in supported countries", derivado, sem lista e sem anunciar a cota${probs.length ? ' — ' + probs.join(' | ') : ''}`, probs.length === 0)
  const mut = honesto(await publica(muta('lib/freeFilmPolicy.ts', "export const FREE_FILM_POLICY: FreeFilmPolicy = 'pais_rico'", "export const FREE_FILM_POLICY: FreeFilmPolicy = 'todos'")))
  checa(`mutante (política 'todos') → a cláusula some sozinha → vermelho (${mut.length} problemas)`, mut.length > 0)
  // KINEO-E4-CONSERTO-2026-09-29 (revisão de regressão, achado 1) — o GRANT (10 cr) só vale na lista: toda frase pública
  // "every new account gets/starts free with N credits" diz onde vale. Executado: oferta, entrada, llms e facts.
  const grantHonesto = (L) => {
    const p = []
    const cc = L('lib/freeFilmPolicy.ts').FREE_FILM_COUNTRY_CLAUSE
    const copia = L('lib/freeTierOffer.ts').buildFreeTierOffer(true).copy
    for (const k of ['headline', 'sentence', 'chip', 'chipLower', 'planCardBody', 'cmpKineoFree']) if (!copia[k].includes(cc)) p.push('oferta.' + k + ' sem a cláusula')
    const EP = L('lib/entryPolicy.ts')
    if (EP.FREE_ENTRY_COUNTRY_CLAUSE_MIRROR !== cc) p.push('espelho de lib/entryPolicy.ts difere da política')
    for (const k of ['chip', 'headline', 'sentence', 'noFreeTier']) if (!EP.FREE_ENTRY_COPY[k].includes(cc)) p.push('entrada.' + k + ' sem a cláusula')
    return { p, cc }
  }
  {
    const g = grantHonesto(L0)
    checa(`grant de 10 cr qualificado "${g.cc.trim()}" na oferta (headline/sentence/chip/plano/comparação) e na entrada (espelho = política)${g.p.length ? ' — ' + g.p.join(' | ') : ''}`, g.p.length === 0 && g.cc === ' in supported countries')
    const gm = grantHonesto(criaLoader({ sobrescritas: muta('lib/freeFilmPolicy.ts', "export const FREE_FILM_POLICY: FreeFilmPolicy = 'pais_rico'", "export const FREE_FILM_POLICY: FreeFilmPolicy = 'todos'") }))
    checa('mutante (política \'todos\' com o espelho da entrada esquecido) → vermelho', gm.p.length > 0)
    checa('/llms.txt e /api/facts: "every new account in supported countries gets" e "free credits on signup in supported countries"', real.llms.includes('every new account in supported countries gets') && (real.facts.freeTier?.allowance ?? '').includes('free credits on signup in supported countries'))
    // varredura: nenhuma frase de grant sem a cláusula em app/, lib/ e components/ (regra espalhada vive em vários arquivos)
    let soltas = []
    try {
      const out = execFileSync('git', ['grep', '-n', '-E', '[Ee]very (new )?account (starts free|gets|receives|starts with (the free|a Creator) trial)', '--', 'app', 'lib', 'components'], { cwd: root, encoding: 'utf8' })
      soltas = out.split('\n').filter(Boolean).filter((l) => !/COUNTRY_CLAUSE|\$\{CC\}|^[^:]+:\d+:\s*\/\/|canonicalCopySpanish/.test(l))
    } catch (e) { soltas = e.status === 1 ? [] : ['git grep falhou'] }
    checa(`varredura: toda frase "every new account gets/starts free…" em app/lib/components carrega a cláusula de país${soltas.length ? ' — ' + soltas.map((l) => l.slice(0, 90)).join(' | ') : ''}`, soltas.length === 0)
  }
  const N = POL.REGION_PAID_ONLY_NOTICE
  checa('aviso em pt/en/es com título, texto e botão; pt diz "não está disponível no seu país" e "planos funcionam normalmente"', ['en', 'pt', 'es'].every((l) => N[l] && N[l].title && N[l].body && N[l].cta) && /não está disponível no seu país/.test(N.pt.title) && /planos funcionam normalmente/i.test(N.pt.body) && /not available in your country/.test(N.en.title) && /no está disponible en tu país/.test(N.es.title) && POL.REGION_PAID_ONLY_PLANS_HREF === '/pricing')
  const vis = (M) => M.regionPaidOnlyNoticeVisible({ trial_status: 'region_paid_only', has_paid: false, plan: 'free' }) === true && M.regionPaidOnlyNoticeVisible({ trial_status: 'region_paid_only', has_paid: true, plan: 'free' }) === false && M.regionPaidOnlyNoticeVisible({ trial_status: 'region_paid_only', has_paid: false, plan: 'starter' }) === false && M.regionPaidOnlyNoticeVisible({ trial_status: 'downgraded', has_paid: false, plan: 'free' }) === false && M.regionPaidOnlyNoticeVisible(null) === false
  checa('o aviso aparece só para region_paid_only que não pagou', vis(POL))
  const layout = rd('app/(dashboard)/layout.tsx')
  const banner = rd('components/RegionPaidOnlyBanner.tsx')
  checa('layout do painel monta o aviso por regionPaidOnlyNoticeVisible; o componente usa a língua da interface e o link dos planos', layout.includes('{user && regionPaidOnlyNoticeVisible(profile as') && layout.includes('<RegionPaidOnlyBanner />') && banner.includes('pickInterfaceCopy(REGION_PAID_ONLY_NOTICE, language)') && banner.includes('href={REGION_PAID_ONLY_PLANS_HREF}'))
  const sink = rd('app/api/events/route.ts')
  checa('eventos novos só do servidor (kineo1_retired_refused, free_weekly_film_granted/admitted/grant_voided/exclusive_refused)', ['kineo1_retired_refused', 'free_weekly_film_granted', 'free_weekly_film_admitted'].every((n) => sink.includes(`  '${n}',\n`)) && ['free_weekly_film_grant_voided', 'free_weekly_film_exclusive_refused'].every((n) => sink.includes(`  '${n}', //`)))
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log('PASS — E4: saída B ligada, cota semanal = 1 Seedance 15 s só país rico, Kineo 1 grátis recusado antes do fornecedor.')
