// KINEO-SERIE-AUTO-ETAPA1-0111 — a SÉRIE AUTOMÁTICA SEMANAL, Etapa 1 (motor interno). Desenho: docs/SERIE-AUTOMATICA-DESENHO-2026-11-01.md.
// Regras PURAS (sem banco, sem rede): interruptor, quem pode, semana, agenda, custo, régua do motor, a IDEIA do próximo episódio e a
// ficha preservada. Quem lê e escreve o banco e chama a rota é lib/serieAuto/cron.ts (passe 4 do cron do Autopilot).
//
// POR QUE A SÉRIE MANDA UMA IDEIA E NÃO UM ROTEIRO: "uma régua por voz, nunca uma só". O escritor de /api/next-episode pede 150–165
// palavras (a régua hollywood, 2,3 pal/s); o Seedance fala na régua clássica (3,1 pal/s). A ideia vai para /api/generate-video-cinematic
// SEM marcadores e com script_mode 'ai'; ali o escritor do servidor (escreverIdeiaNoServidor, KINEO-META95-IDEIA-1910) escreve o roteiro
// marcado no tamanho do filme e na régua DAQUELE motor. Nenhuma régua nova nasce aqui, e a ideia nunca carrega contagem de palavras
// nem segundos (o escritor leria como pedido de tamanho).
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { speechFamilyForQuality, type SpeechFamily } from '@/lib/speechRate'
import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
import { assuntoDoFilme, formatoDoFilme, type FormatoDoFilme } from '@/lib/episodeContinuity'

export const SERIE_AUTO_MARCA = 'KINEO-SERIE-AUTO-ETAPA1-0111'

/**
 * INTERRUPTOR ÚNICO. false = o passe 4 volta antes de abrir o banco (nenhuma leitura, nenhum POST, nenhum crédito, nenhuma fal).
 * Ligar só depois do "vai" do fundador para o canário (desenho §7: 2 semanas na conta dele, ~US$ 7).
 */
export const SERIE_AUTO_ENABLED = false

/**
 * Quem pode ter série nesta etapa: SÓ os e-mails EXATOS das contas da casa (lib/internalAccounts INTERNAL_EXACT_EMAILS). Os padrões
 * LIKE de lá ("test%", "%mailinator%"…) ficam de fora de propósito: servem para limpar métrica, e casariam conta de cliente de verdade.
 */
export const SERIE_AUTO_INTERNAL_EMAILS: readonly string[] = Object.freeze(
  INTERNAL_EXACT_EMAILS.map((e) => e.trim().toLowerCase()).filter((e) => !serieAutoEmailDeTerceiro(e)),
)
/** A caixa que de fato recebe um endereço do Gmail: sem a "+tag" e sem pontos (googlemail = gmail). Outro domínio volta igual. */
function caixaReal(email: string): string {
  const e = String(email ?? '').trim().toLowerCase()
  const g = /^([^@]+)@(?:gmail|googlemail)\.com$/.exec(e)
  return g ? `${g[1].split('+')[0].replace(/\./g, '')}@gmail.com` : e
}
/**
 * Apelido "+tag" do Gmail entrega na caixa do endereço SEM a tag: joseph+teste01@gmail.com cai na caixa de joseph@gmail.com, que NÃO
 * é da casa. Série nessa conta mandaria o "Your video is ready" para um estranho. Fica de fora quando a caixa real não é, ela mesma,
 * a caixa de um e-mail exato da casa sem tag.
 */
export function serieAutoEmailDeTerceiro(email: string): boolean {
  const e = String(email ?? '').trim().toLowerCase()
  if (!/^[^@]+\+[^@]*@(?:gmail|googlemail)\.com$/.test(e)) return false
  const casasSemTag = INTERNAL_EXACT_EMAILS.map((x) => x.trim().toLowerCase()).filter((x) => !x.split('@')[0].includes('+')).map(caixaReal)
  return !casasSemTag.includes(caixaReal(e))
}

export const SERIE_AUTO_TABLE = 'serie_auto'
export const SERIE_AUTO_EPISODES_TABLE = 'serie_auto_episodios'
export const SERIE_AUTO_CRON_PATH = '/api/cron/autopilot-generate'

/** O MVP é Seedance 1.5 (desenho §1); a migration só aceita este valor. */
export const SERIE_AUTO_ENGINE = 'seedance' as const
export const SERIE_AUTO_DURATIONS: readonly number[] = [35, 60, 90]
/** Padrão do desenho: Seedance 1.5 · 60 s · segunda 10:00 UTC (07:00 BRT). */
export const SERIE_AUTO_DEFAULTS = { duration: 60, weekday: 1, hourUtc: 10, language: 'en' } as const
/** Render falhou/estornou: até 3 tentativas na mesma semana (o mesmo teto dos desenhos, KIDS_MAX_ATTEMPTS_PER_SEQ). */
export const SERIE_AUTO_MAX_ATTEMPTS_PER_WEEK = 3
/** 2 semanas seguidas sem crédito = a série pausa e para de insistir (desenho §4). */
export const SERIE_AUTO_SKIPS_TO_PAUSE = 2
/** 6 h sem filme depois do despacho = falha (render fantasma, desenho §4). */
export const SERIE_AUTO_RUN_TIMEOUT_MS = 6 * 60 * 60 * 1000
/**
 * Render passou do prazo COM o débito vivo: o cliente já pagou. O episódio vira 'stuck' — trava a semana (nenhuma tentativa nova, que
 * cobraria de novo), continua sendo conferido (filme tardio = entregue; estorno = falha que pode retentar) e, passado este prazo sem
 * filme nem estorno, fecha como falha SEM retentativa (render_lost_debit_live) e o evento serie_auto_stuck avisa a casa.
 */
export const SERIE_AUTO_STUCK_CLOSE_MS = 7 * 24 * 60 * 60 * 1000
/** Falha terminal com o débito vivo: nunca libera nova tentativa na semana (o cliente já pagou aquele episódio). */
export const SERIE_AUTO_ERRO_DEBITO_VIVO = 'render_lost_debit_live'
/**
 * A semana já está ocupada por este episódio? Tudo que não é falha ocupa; a falha com débito vivo também (cobraria duas vezes).
 * O passe B só abre uma tentativa nova quando TODAS as linhas da semana são falhas sem cobrança.
 */
export function serieEpisodioOcupaSemana(row: { status: string; error?: string | null }): boolean {
  return row.status !== 'failed' || row.error === SERIE_AUTO_ERRO_DEBITO_VIVO
}
/** Episódio 'pending' sem débito na rota depois disto = o POST morreu antes de nascer. */
export const SERIE_AUTO_PENDING_STALE_MS = 30 * 60 * 1000
/** Retentativa depois de falha que não gastou nada. */
export const SERIE_AUTO_RETRY_MS = 60 * 60 * 1000
/** Teto de despachos por passada (o cron roda de hora em hora e divide o prazo com os outros 3 passes). */
export const SERIE_AUTO_MAX_STARTS_PER_PASS = 3
/** O teto da ideia que a rota cola como "[Idea: …]" (IDEIA_NO_PEDIDO_MAX_CHARS em lib/meta95/ideiaNoEscritor.ts). */
export const SERIE_AUTO_IDEA_MAX_CHARS = 600

export const SERIE_AUTO_EVENTS = {
  dispatched: 'serie_auto_episode_dispatched',
  delivered: 'serie_auto_delivered',
  failed: 'serie_auto_failed',
  skippedNoCredits: 'serie_skipped_no_credits',
  weekExhausted: 'serie_auto_week_exhausted',
  paused: 'serie_auto_paused',
  passPaused: 'serie_auto_pass_paused',
  stuck: 'serie_auto_stuck',
  fichaFixed: 'serie_auto_ficha_fixed',
} as const

// ── quem pode ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function serieAutoAccountAllowed(email: string | null | undefined): boolean {
  const e = String(email ?? '').trim().toLowerCase()
  return e.length > 0 && SERIE_AUTO_INTERNAL_EMAILS.includes(e)
}
/** O passe roda para esta conta? Interruptor E conta da casa — as duas coisas, sempre. */
export function serieAutoAtivaPara(args: { enabled: boolean; email: string | null | undefined }): boolean {
  return args.enabled === true && serieAutoAccountAllowed(args.email)
}

// ── semana e agenda ──────────────────────────────────────────────────────────────────────────────────────────────────────
const DIA_MS = 86_400_000
/** Segunda 00:00 UTC da semana ISO que contém `ms`. */
function inicioDaSemanaIso(ms: number): number {
  const d = new Date(ms)
  const dia = (d.getUTCDay() + 6) % 7 // segunda = 0 … domingo = 6
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dia * DIA_MS
}
/** A chave da semana ISO-8601 ('2026-W45'): a trava de idempotência é (série, semana). */
export function serieWeekKey(ms: number): string {
  const segunda = inicioDaSemanaIso(ms)
  const quinta = new Date(segunda + 3 * DIA_MS) // o ano ISO é o ano da quinta-feira
  const ano = quinta.getUTCFullYear()
  const primeiraQuinta = inicioDaSemanaIso(Date.UTC(ano, 0, 4)) + 3 * DIA_MS
  const semana = 1 + Math.round((quinta.getTime() - primeiraQuinta) / (7 * DIA_MS))
  return `${ano}-W${String(semana).padStart(2, '0')}`
}
function normalizar(n: unknown, min: number, max: number, padrao: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : padrao
  return v < min || v > max ? padrao : v
}
/** O horário da série dentro da semana ISO de `ms` (weekday 0 = domingo … 6 = sábado, como Date.getUTCDay). */
export function serieSlotMs(args: { weekday: number; hourUtc: number; ms: number }): number {
  const wd = normalizar(args.weekday, 0, 6, SERIE_AUTO_DEFAULTS.weekday)
  const h = normalizar(args.hourUtc, 0, 23, SERIE_AUTO_DEFAULTS.hourUtc)
  return inicioDaSemanaIso(args.ms) + ((wd + 6) % 7) * DIA_MS + h * 3_600_000
}
/** O próximo horário da série DEPOIS de agora (o desta semana, se ainda não passou; senão o da semana que vem). */
export function serieNextRunMs(args: { weekday: number; hourUtc: number; nowMs: number }): number {
  const desta = serieSlotMs({ weekday: args.weekday, hourUtc: args.hourUtc, ms: args.nowMs })
  return desta > args.nowMs ? desta : desta + 7 * DIA_MS
}
/** generation_id determinístico por (série, semana, tentativa): o débito da rota é idempotente por ele. */
export function serieGenerationId(serieId: string, weekKey: string, attempt: number): string {
  const id = String(serieId ?? '').replace(/[^A-Za-z0-9_-]/g, '')
  const wk = String(weekKey ?? '').replace(/[^A-Za-z0-9]/g, '')
  return `serie-${id}-${wk}-${Math.max(1, Math.floor(attempt) || 1)}`.slice(0, 100)
}

// ── custo e régua (as fontes de sempre; nenhum número digitado à mão) ───────────────────────────────────────────────────
export function serieDuration(d: unknown): number {
  return typeof d === 'number' && SERIE_AUTO_DURATIONS.includes(d) ? d : SERIE_AUTO_DEFAULTS.duration
}
/** O custo do episódio no plano pago, do mesmo jeito que os desenhos (Seedance = cinematic_ai, escala por segundo). */
export function serieEpisodeCost(duration: number): number {
  return creditCostForDuration('cinematic_ai', true, serieDuration(duration))
}
/** A família de voz do motor (a régua que o escritor do servidor vai usar). Seedance = 'classic'; nunca 'hollywood'. */
export function serieReguaDoMotor(engine: string): SpeechFamily {
  return speechFamilyForQuality(engine)
}

// ── ficha do personagem (preservada) ─────────────────────────────────────────────────────────────────────────────────────
export interface SerieFicha { nome: string; canonica: string; tipo?: string | null; protagonista?: boolean }

export function serieFichaValida(raw: unknown): SerieFicha[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({ nome: String(f.nome ?? '').trim(), canonica: String(f.canonica ?? '').trim(), tipo: typeof f.tipo === 'string' ? f.tipo : null, protagonista: f.protagonista === true }))
    .filter((f) => f.nome.length > 0 && f.canonica.length > 0)
}
/** A ficha gravada vence SEMPRE; a derivada só entra quando a série ainda não tem nenhuma. */
export function serieFichaPreservada(gravada: unknown, derivada: unknown): { ficha: SerieFicha[]; nova: boolean } {
  const g = serieFichaValida(gravada)
  if (g.length > 0) return { ficha: g, nova: false }
  const d = serieFichaValida(derivada)
  return { ficha: d, nova: d.length > 0 }
}
function protagonista(ficha: ReadonlyArray<SerieFicha>): SerieFicha | null {
  return ficha.find((f) => f.protagonista) ?? ficha[0] ?? null
}

// ── a IDEIA do próximo episódio ─────────────────────────────────────────────────────────────────────────────────────────
/** Ângulos de história com personagem (o mesmo elenco, o mesmo mundo, o que acontece depois). */
export const SERIE_ANGULOS_HISTORIA: readonly string[] = [
  'a new problem arrives and the main character has to solve it',
  'an unexpected visitor changes everything',
  'a small mistake grows into a big adventure',
  'a secret from an earlier episode comes back',
  'the main character has to help a friend in trouble',
  'a trip to a place they have never seen before',
  'a rival shows up and ends up becoming an ally',
  'a lesson learned the hard way',
]
/** Ângulos de canal de fatos/curiosidade (o mesmo assunto, o próximo ângulo). */
export const SERIE_ANGULOS_FATOS: readonly string[] = [
  'the origin: how it all began',
  'the strangest true case connected to it',
  'the biggest myth about it and what is actually true',
  'the person behind it that few people know about',
  'what almost went wrong',
  'the hidden place connected to it',
  'the mystery about it that is still unsolved',
  'the surprising link to everyday life',
]
/** O ângulo do episódio `seq` (o episódio 1 é o filme de origem; o 2 pega o primeiro ângulo). Determinístico. */
export function serieAnguloDoEpisodio(seq: number, formato: FormatoDoFilme): string {
  const lista = formato === 'historia' ? SERIE_ANGULOS_HISTORIA : SERIE_ANGULOS_FATOS
  const i = Math.max(0, Math.floor(seq) - 2)
  return lista[i % lista.length]
}
const semColchetes = (s: string) => String(s ?? '').replace(/[[\]"“”«»]/g, ' ').replace(/\s+/g, ' ').trim()

export interface SerieIdeiaEntrada {
  theme: string
  seq: number
  ficha?: unknown
  /** Narração do episódio 1 (ou do filme de origem): de onde sai a âncora de assunto. */
  sourceScript?: string | null
  /** Âncora já gravada na série (vence a derivada). */
  anchor?: string | null
  /** A ideia do último episódio (para não repetir o ângulo de cara). */
  lastIdea?: string | null
}

/**
 * A ideia do episódio `seq`. Curta (≤ 600), sem colchetes, sem contagem de palavras e sem segundos: é o TEMA que o escritor do
 * servidor transforma em roteiro na régua do motor. Carrega o assunto (a âncora de lib/episodeContinuity) e a ficha preservada.
 */
export function serieIdeiaDoEpisodio(e: SerieIdeiaEntrada): string {
  const tema = semColchetes(e.theme).slice(0, 160)
  const ancora = semColchetes(e.anchor ?? '') || assuntoDoFilme(e.sourceScript, e.theme)
  const formato = formatoDoFilme(e.sourceScript, e.theme)
  const ficha = serieFichaValida(e.ficha)
  const prota = protagonista(ficha)
  const seq = Math.max(2, Math.floor(e.seq) || 2)
  const anguloBase = serieAnguloDoEpisodio(seq, prota ? 'historia' : formato)
  const angulo = e.lastIdea && e.lastIdea.includes(anguloBase) ? serieAnguloDoEpisodio(seq + 1, prota ? 'historia' : formato) : anguloBase
  const partes: string[] = [`Episode ${seq} of the weekly series ${tema}: ${angulo}.`]
  if (prota) partes.push(`Same main character as always: ${semColchetes(prota.canonica).slice(0, 180)}.`)
  const outros = ficha.filter((f) => f !== prota).slice(0, 2).map((f) => semColchetes(f.canonica).slice(0, 90))
  if (outros.length) partes.push(`Also back: ${outros.join('; ')}.`)
  if (ancora) partes.push(`Stay on the same subject: ${semColchetes(ancora).slice(0, 200)}`)
  let ideia = partes.join(' ').replace(/\s+/g, ' ').trim()
  if (ideia.length > SERIE_AUTO_IDEA_MAX_CHARS) {
    const corte = ideia.slice(0, SERIE_AUTO_IDEA_MAX_CHARS)
    const fim = corte.lastIndexOf('. ')
    ideia = (fim > 200 ? corte.slice(0, fim + 1) : corte.slice(0, corte.lastIndexOf(' '))).trim()
  }
  return ideia
}

/** O corpo do POST da série para a rota de sempre: ideia solta (script_mode 'ai'), motor e duração da série. */
export function serieCorpoDoDespacho(args: { generationId: string; idea: string; duration: number; language: string }): Record<string, unknown> {
  return {
    generationId: args.generationId,
    prompt: args.idea,
    duration: serieDuration(args.duration),
    language: /^[a-z]{2}$/.test(String(args.language ?? '')) ? args.language : SERIE_AUTO_DEFAULTS.language,
    script_mode: 'ai',
    engine: SERIE_AUTO_ENGINE,
    intent_campaign: 'serie_auto', // a rota ignora (como o kids_* dos desenhos); fica no corpo para rastro
  }
}
