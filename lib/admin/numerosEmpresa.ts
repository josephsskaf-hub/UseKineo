// KINEO-ADMIN-NUMEROS-0311 — tipos e montagem pura do quadro "Números da empresa" do /admin (fonte: RPC admin_numeros_empresa).
export type PeriodoChave = 'hoje' | 'ontem' | 'd7' | 'd10' | 'media7' | 'media7antes' | 'media30'
export type Periodo = {
  chave: PeriodoChave
  visitas: number | null; chatgpt: number | null; claude?: number | null; cadastros: number | null; pais_que_paga: number | null
  pct_com_filme: number | null; pct_baixou_primeiro: number | null; downloads: number | null; pagantes: number | null
  nota: number | null; filmes_vistos: number | null
}
export type NotaDia = { dia: string; filmes: number; nota: number }
export type CadastroRecente = {
  id: string; email: string; entrou: string; pais: string | null; origem: string | null; creditos: number | null
  pagou: boolean | null; sem_gratis: boolean | null; filme: string | null; motor: string | null; baixou: boolean; nota: number | null
}
export type NumerosEmpresa = { periodos: Periodo[]; nota_dias: NotaDia[]; cadastros: CadastroRecente[] }

/** Colunas na ordem da tela. */
export const COLUNAS: Array<{ chave: PeriodoChave; rotulo: string }> = [
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'ontem', rotulo: 'Ontem' },
  { chave: 'd7', rotulo: '7 dias atrás' },
  { chave: 'd10', rotulo: '10 dias atrás' },
  { chave: 'media7', rotulo: 'Média 7 dias' },
  { chave: 'media7antes', rotulo: '7 anteriores' },
]

/** Metas até 30/11 de docs/META-VOLUME-2026-11-03.md; sem meta = "—". */
export const LINHAS: Array<{ campo: keyof Periodo; rotulo: string; forte?: boolean; sufixo?: string; meta?: string }> = [
  { campo: 'nota', rotulo: 'Nota dos filmes', forte: true },
  { campo: 'visitas', rotulo: 'Visitas' },
  { campo: 'chatgpt', rotulo: 'Visitas do ChatGPT', forte: true, meta: '75' },
  { campo: 'claude', rotulo: 'Visitas do Claude', forte: true }, // KINEO-ADMIN-CLAUDE-0911 — fundador 09/11: "tem visitas do GPT, eu quero visitas do Claude"; sessão com utm/source "claude…" ou referrer claude.ai (RPC admin_numeros_empresa, migration admin_numeros_empresa_visitas_claude_0911)
  { campo: 'cadastros', rotulo: 'Cadastros', forte: true },
  { campo: 'pais_que_paga', rotulo: 'Cadastros de país que paga', meta: '25' },
  { campo: 'pct_com_filme', rotulo: 'Cadastros que têm filme', forte: true, sufixo: '%' },
  { campo: 'pct_baixou_primeiro', rotulo: 'Baixaram o 1º filme', sufixo: '%' },
  { campo: 'downloads', rotulo: 'Downloads por dia', forte: true },
  { campo: 'pagantes', rotulo: 'Pagantes no período', forte: true, meta: '1 a cada 2 dias' },
]

/** KINEO-ADMIN-CADASTROS-24H-0411 — fundador 04/11: "nas últimas 24 horas, com uma opção de ver mais". A lista vem do mais novo para o mais antigo. */
export const VER_MAIS_PASSO = 20
export function cadastrosVisiveis<T extends { entrou: string }>(lista: ReadonlyArray<T>, agoraMs: number, extras: number): { visiveis: T[]; em24h: number; restam: number } {
  const em24h = lista.filter((c) => agoraMs - Date.parse(c.entrou) <= 24 * 3600_000).length
  const visiveis = lista.slice(0, em24h + Math.max(0, extras))
  return { visiveis, em24h, restam: lista.length - visiveis.length }
}

/** Número em pt-BR; sem dado vira "—", nunca zero. */
export function formataValor(v: unknown, sufixo = ''): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${String(n).replace('.', ',')}${sufixo}`
}

/** "03/11" a partir de "2026-11-03". */
export function diaCurto(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** Hora de Brasília de um instante ("03/11 22:15"). */
export function entrouEm(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3600_000).toISOString()
  return `${d.slice(8, 10)}/${d.slice(5, 7)} ${d.slice(11, 16)}`
}
