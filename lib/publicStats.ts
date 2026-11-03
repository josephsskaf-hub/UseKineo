// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — A RÉGUA ÚNICA DOS CONTADORES PÚBLICOS (prova social).
//
// Auditoria ao vivo de 02/11: a home dizia "2,144 Shorts · 95 this week · 2,431 accounts" e, mais abaixo, "2,778 · 123 in 7
// days · 3,151 accounts"; o rodapé das páginas de motor dizia "0 Shorts created · 0 this week · 0 accounts joined"; o /pricing
// dizia "479 films … in the last 30 days". Três causas:
//   1. o selo (LiveStatsBadge) fazia contagem animada a partir de ZERO por requestAnimationFrame — aba em segundo plano,
//      leitor de página ou print congelava o número no meio (2,144 = 77% de 2,778) ou no zero;
//   2. /api/stats/public contava TODA linha de `videos` (falhas e contas da casa incluídas) e TODO perfil;
//   3. /api/films-made contava só filmes concluídos de clientes (a régua certa) — dois números para a mesma pergunta.
// Agora há UMA leitura (lib/publicStatsServer.ts, a régua do films-made: concluídos, contas internas fora, paginado) e UMA
// regra de exibição (este arquivo). Todo contador público passa por aqui; abaixo do piso, zero ou indefinido = NADA na tela.
//
// Módulo puro (sem servidor): o selo, a faixa e o /pricing importam daqui.

/** A única forma da resposta de /api/stats/public. Contas internas FORA em todos os números. */
export type PublicStats = {
  /** Filmes concluídos de clientes, desde sempre. */
  films: number
  /** Filmes concluídos de clientes nos últimos 7 dias. */
  films7d: number
  /** Filmes concluídos de clientes nos últimos 30 dias. */
  films30d: number
  /** Pessoas (clientes) com filme concluído nos últimos 30 dias. */
  creators30d: number
  /** Contas de clientes criadas, desde sempre. */
  accounts: number
}

export const PUBLIC_STATS_ENDPOINT = '/api/stats/public'
export const PUBLIC_STATS_WINDOW_DAYS = 30

// Pisos de honestidade (os mesmos de sempre do selo/faixa): número que não impressiona não aparece.
export const MIN_TOTAL_FILMS = 500
export const MIN_ACCOUNTS = 200
export const MIN_WEEKLY = 100

const KEYS = ['films', 'films7d', 'films30d', 'creators30d', 'accounts'] as const

function whole(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

/** Lê a resposta crua da rota; qualquer campo faltando, negativo ou não numérico = null (a tela fica muda). */
export function parsePublicStats(value: unknown): PublicStats | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (v.ok !== true) return null
  for (const k of KEYS) if (!whole(v[k])) return null
  return {
    films: Math.floor(v.films as number),
    films7d: Math.floor(v.films7d as number),
    films30d: Math.floor(v.films30d as number),
    creators30d: Math.floor(v.creators30d as number),
    accounts: Math.floor(v.accounts as number),
  }
}

export type PublicStatsItem = { key: 'films' | 'weekly' | 'accounts'; n: number; text: string }

export function fmtPublicCount(n: number): string {
  return Math.floor(n).toLocaleString('en-US')
}

/**
 * Os itens que podem aparecer, já filtrados pelos pisos. NUNCA devolve um item com 0. Lista vazia = esconder o bloco.
 * Mesma ordem e mesma lógica para o selo e para a faixa: o total só lidera acima de 500; abaixo disso, só a base de contas.
 */
export function publicStatsItems(stats: PublicStats | null | undefined): PublicStatsItem[] {
  if (!stats) return []
  const items: PublicStatsItem[] = []
  if (stats.films >= MIN_TOTAL_FILMS) {
    items.push({ key: 'films', n: stats.films, text: fmtPublicCount(stats.films) })
    if (stats.films7d >= MIN_WEEKLY) items.push({ key: 'weekly', n: stats.films7d, text: fmtPublicCount(stats.films7d) })
  }
  if (stats.accounts >= MIN_ACCOUNTS) items.push({ key: 'accounts', n: stats.accounts, text: fmtPublicCount(stats.accounts) })
  return items.filter((i) => i.n > 0)
}

const BADGE_UNIT: Record<PublicStatsItem['key'], string> = {
  films: 'Shorts created',
  weekly: 'this week',
  accounts: 'accounts joined',
}

/** A linha do selo ("N Shorts created · N this week · N accounts joined"); null = não renderizar nada. */
export function publicStatsBadgeLine(stats: PublicStats | null | undefined): string | null {
  const items = publicStatsItems(stats)
  if (items.length === 0) return null
  return items.map((i) => `${i.text} ${BADGE_UNIT[i.key]}`).join(' · ')
}

const BAND_LABEL: Record<PublicStatsItem['key'], string> = {
  films: 'Shorts generated',
  weekly: 'in the last 7 days',
  accounts: 'accounts created',
}

/** Os blocos da faixa da home; menos de 2 = a faixa inteira some. */
export function publicStatsBandItems(stats: PublicStats | null | undefined): Array<{ n: string; label: string }> {
  const items = publicStatsItems(stats).map((i) => ({ n: i.text, label: BAND_LABEL[i.key] }))
  return items.length >= 2 ? items : []
}
