// ═══ KINEO-SPRINT-V1V4-2026-08-31 (#14) — A FILA DO PRÓXIMO EPISÓDIO ═══════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (events, 48h, só pessoas externas, hook
// `useWaitAbandon` nascido na rodada #6):
//
//     render_wait_backgrounded ... 3 pessoas · mediana 77s de espera
//     render_wait_returned ....... 3 pessoas · mediana 150s
//     render_wait_abandoned ...... 0
//
// Leitura honesta do pouco que já existe: a pessoa NÃO desiste do render — ela
// TROCA DE ABA por volta de 1min15 e volta. A espera de 3-7 minutos não é um
// problema de ansiedade (ela não foge), é um VAZIO: nada acontece ali que a
// leve para o vídeo 2. E o vídeo 2 é o degrau onde a conversão sai de 0,9%
// para 11,8%.
//
// A trava que impede o óbvio: com um render em voo, o produto NÃO deixa começar
// outro (gate de render ativo). Então a espera não pode oferecer "crie agora" —
// seria botão que não funciona, e este repositório já carrega uma lista de
// "copy que mente" grande demais. O que ela PODE fazer é o que nenhum concorrente
// faz: guardar a próxima ideia enquanto esta renderiza, e encontrá-la pronta no
// instante em que o filme cai na tela (o pico de alegria).
//
// Este arquivo é só a fila. É PURO de propósito — as funções de verdade
// (`normalizarIdeia`, `serializarIdeia`, `lerIdeiaSerializada`) não tocam em
// `window`, recebem o texto cru e o relógio por parâmetro, e por isso podem ser
// testadas em node sem DOM. Os embrulhos de navegador no final são casca fina
// com try/catch: `localStorage` lança em aba anônima do Safari e em iframe com
// cookies bloqueados, e uma ideia perdida NUNCA pode derrubar a tela de espera
// de um render que a pessoa pagou.
//
// ⚠️ PAR COM lib/seriesContinuation.ts: a fila guarda a SEMENTE (o tema), nunca
// o prompt montado. O motor de continuação continua sendo um só — se a frase do
// episódio seguinte mudar lá, a fila antiga passa a render a frase nova. Guardar
// o prompt pronto aqui congelaria uma cópia velha do texto no navegador da
// pessoa por 24h.
//
// ⚠️ NÃO CONHECE preço, plano, crédito, cupom nem checkout. A escolha de qual
// motor o vídeo 2 vai usar acontece na tela de criação, com o cardápio da
// rodada #13 já sabendo o saldo. Aqui é só o tema.

/** Mesmo teto de lib/seriesContinuation.ts — a semente viaja entre os dois. */
export const MAX_IDEIA_LENGTH = 180

/** Chave única no localStorage. O `_v1` existe para que uma mudança de formato
 *  futura não tente ler um objeto velho e quebrar. */
export const FILA_KEY = 'kineo_proxima_ideia_v1'

/** 24h. Uma ideia guardada há três dias não é mais "a próxima" — é lixo com
 *  aparência de intenção, e oferecer isso no pico de alegria queima o momento. */
export const FILA_TTL_MS = 24 * 60 * 60 * 1000

export type IdeiaNaFila = {
  /** O tema, já normalizado. */
  seed: string
  /** Epoch ms de quando entrou na fila. */
  savedAt: number
  /** Em que estágio do render ela foi guardada — só telemetria. */
  stage?: string
}

/**
 * Normaliza a semente com exatamente a mesma régua de `normalizeSeriesSeed`:
 * espaços colapsados, aspas fora, corte em 180. Duplicar a régua (em vez de
 * importar) mantém este arquivo com ZERO imports e testável isolado; o teste
 * compara as duas saídas caractere a caractere para a divergência não passar.
 */
export function normalizarIdeia(valor: string | null | undefined): string {
  return (valor ?? '')
    .replace(/\s+/g, ' ')
    .replace(/["“”]+/g, '')
    .trim()
    .slice(0, MAX_IDEIA_LENGTH)
}

/**
 * Vira texto para o localStorage. Devolve `null` — e não string vazia — quando
 * não há tema utilizável, para o chamador nunca gravar uma fila fantasma que
 * depois apareceria como botão sem assunto.
 */
export function serializarIdeia(
  valor: string | null | undefined,
  agora: number,
  stage?: string | null,
): string | null {
  const seed = normalizarIdeia(valor)
  if (!seed) return null
  if (!Number.isFinite(agora)) return null
  const payload: IdeiaNaFila = { seed, savedAt: Math.floor(agora) }
  // Whitelist no estágio pelo mesmo motivo do useWaitAbandon: é telemetria, não
  // pode virar canal de texto livre saindo do navegador.
  const limpo = (stage ?? '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40)
  if (limpo) payload.stage = limpo
  return JSON.stringify(payload)
}

/**
 * Lê o que estiver gravado. Devolve `null` em TODO caso duvidoso — JSON quebrado,
 * formato antigo, tema vazio, carimbo ausente/no futuro, ou fila vencida. Uma
 * fila que erra para o lado de "não tem nada" custa um clique; uma que erra para
 * o lado de "tem" põe um botão mentiroso no pico de alegria.
 */
export function lerIdeiaSerializada(
  raw: string | null | undefined,
  agora: number,
): IdeiaNaFila | null {
  if (!raw) return null
  let bruto: unknown
  try {
    bruto = JSON.parse(raw)
  } catch {
    return null
  }
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null
  const obj = bruto as Record<string, unknown>
  const seed = normalizarIdeia(typeof obj.seed === 'string' ? obj.seed : '')
  if (!seed) return null
  const savedAt =
    typeof obj.savedAt === 'number' && Number.isFinite(obj.savedAt) ? obj.savedAt : null
  if (savedAt === null || savedAt <= 0) return null
  // Relógio do cliente adiantado (o incidente de JWT-skew de 28/08 ensinou que
  // isso acontece de verdade): um carimbo no futuro não invalida a ideia, só não
  // pode ser usado para expirar. Tolerância de 5 minutos.
  if (savedAt - agora > 5 * 60 * 1000) return null
  if (agora - savedAt > FILA_TTL_MS) return null
  const stage =
    typeof obj.stage === 'string' ? obj.stage.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) : ''
  return stage ? { seed, savedAt, stage } : { seed, savedAt }
}

/** Quantos minutos inteiros a ideia está esperando. Usado só na telemetria. */
export function minutosNaFila(ideia: IdeiaNaFila, agora: number): number {
  const ms = Math.max(0, agora - ideia.savedAt)
  return Math.floor(ms / 60000)
}

// ── Casca de navegador ────────────────────────────────────────────────────
// Tudo abaixo pode falhar em silêncio e o produto continua idêntico.

export function salvarIdeiaNaFila(
  valor: string | null | undefined,
  stage?: string | null,
): IdeiaNaFila | null {
  const agora = Date.now()
  const raw = serializarIdeia(valor, agora, stage)
  if (!raw) return null
  try {
    window.localStorage.setItem(FILA_KEY, raw)
  } catch {
    // Aba anônima / storage bloqueado: a ideia não sobrevive ao reload, mas o
    // cartão da tela continua funcionando na sessão atual.
  }
  return lerIdeiaSerializada(raw, agora)
}

export function lerIdeiaDaFila(): IdeiaNaFila | null {
  try {
    return lerIdeiaSerializada(window.localStorage.getItem(FILA_KEY), Date.now())
  } catch {
    return null
  }
}

export function limparFila(): void {
  try {
    window.localStorage.removeItem(FILA_KEY)
  } catch {
    /* ignore */
  }
}
