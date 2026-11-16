// KINEO-PLACAR-FILME-GRATIS-1611 — Div. 6, Semana 1 do plano de 30 dias (CEO 16/11): "PLACAR DIÁRIO do filme grátis no /admin:
// por dia e nos últimos 7 dias, quantos 1ºs filmes grátis, quantos com nota 8 ou mais, a porcentagem contra a meta de 70%, a média,
// os 3 defeitos mais frequentes e a quebra por motor. Fonte de agora: a nota do revisor, com o rótulo dizendo isso e quantos filmes
// do dia ainda estão sem nota." Ao lado, a NOTA AUTOMÁTICA rotulada "em prova": só substitui a do revisor com ≥ 85% de acerto nos
// ruins e ≤ 10% de alarme falso (regra do dono, 13/11). Este arquivo é só a conta (puro, sem rede); a leitura fica na rota
// app/api/admin/placar-filme-gratis/route.ts.

/** Meta do mês: 7 de cada 10 primeiros filmes grátis com nota 8 ou mais. */
export const META_PCT = 70
export const NOTA_BOA = 8
/** Régua da prova da nota automática (dono 13/11): ruim = revisor < 7; bom = revisor ≥ 7,5; o juiz "acusa" com < 7. */
export const RUIM_ABAIXO = 7
export const BOM_DESDE = 7.5
export const REGRA_ACERTO_PCT = 85
export const REGRA_ALARME_PCT = 10
export const DIAS = 7
const BRASILIA_MS = -3 * 3600_000 // sem horário de verão desde 2019

/** Um filme concluído (quality_mode cinematic_ai) de conta no plano grátis, já com as duas notas. */
export interface FilmeDoPlacar {
  id: string
  criadoEm: string
  motor: string | null
  /** 1º vídeo concluído da pessoa (nenhum concluído antes). */
  primeiro: boolean
  /** Nota do revisor (film_review_notes, fonte ≠ 'auto'); null = ainda sem nota. */
  notaRevisor: number | null
  defeitos: string[]
  /** Nota automática (evento nota_auto v3, sombra); null = o juiz não julgou. */
  notaAuto: number | null
}

export interface QuebraMotor { motor: string; filmes: number; comNota: number; oitoOuMais: number }
export interface ProvaAuto {
  julgados: number
  oitoOuMais: number
  media: number | null
  /** Filmes com as duas notas. */
  comparados: number
  ruins: number
  ruinsPegos: number
  bons: number
  alarmes: number
}
export interface LinhaPlacar {
  chave: string
  rotulo: string
  filmes: number
  comNota: number
  semNota: number
  oitoOuMais: number
  /** % de ≥ 8 entre os que têm nota do revisor; null sem nota nenhuma. */
  pct: number | null
  media: number | null
  defeitos: Array<{ codigo: string; n: number }>
  motores: QuebraMotor[]
  auto: ProvaAuto
}
export interface PlacarFilmeGratis {
  geradoEm: string
  meta: number
  semana: LinhaPlacar
  dias: LinhaPlacar[]
}

const arred1 = (n: number) => Math.round(n * 10) / 10
const media = (ns: number[]) => (ns.length ? arred1(ns.reduce((s, n) => s + n, 0) / ns.length) : null)

/** 'AAAA-MM-DD' do dia de Brasília em que o instante cai. */
export function diaBrasilia(iso: string | number): string {
  return new Date(new Date(iso).getTime() + BRASILIA_MS).toISOString().slice(0, 10)
}

/** Os N dias de Brasília que terminam hoje, do mais novo para o mais velho. */
export function ultimosDias(agora: number, n = DIAS): string[] {
  const hoje = Date.parse(`${diaBrasilia(agora)}T00:00:00Z`)
  return Array.from({ length: n }, (_, i) => new Date(hoje - i * 86400_000).toISOString().slice(0, 10))
}

/** Instante a partir do qual a rota precisa ler: o começo do dia mais velho do placar ou 7 × 24 h atrás, o que vier antes. */
export function inicioDaLeitura(agora: number): string {
  const maisVelho = ultimosDias(agora).at(-1)!
  const inicioDia = Date.parse(`${maisVelho}T00:00:00Z`) - BRASILIA_MS
  return new Date(Math.min(inicioDia, agora - DIAS * 86400_000)).toISOString()
}

export function linhaDoPlacar(chave: string, rotulo: string, filmes: FilmeDoPlacar[]): LinhaPlacar {
  const notados = filmes.filter((f) => f.notaRevisor !== null)
  const oito = notados.filter((f) => (f.notaRevisor as number) >= NOTA_BOA).length
  const contaDef = new Map<string, number>()
  for (const f of notados) for (const d of new Set(f.defeitos)) contaDef.set(d, (contaDef.get(d) ?? 0) + 1)
  const defeitos = [...contaDef].map(([codigo, n]) => ({ codigo, n })).sort((a, b) => b.n - a.n || a.codigo.localeCompare(b.codigo)).slice(0, 3)
  const porMotor = new Map<string, QuebraMotor>()
  for (const f of filmes) {
    const m = f.motor || 'sem motor'
    const q = porMotor.get(m) ?? { motor: m, filmes: 0, comNota: 0, oitoOuMais: 0 }
    q.filmes++
    if (f.notaRevisor !== null) { q.comNota++; if (f.notaRevisor >= NOTA_BOA) q.oitoOuMais++ }
    porMotor.set(m, q)
  }
  const julgados = filmes.filter((f) => f.notaAuto !== null)
  const ambos = julgados.filter((f) => f.notaRevisor !== null)
  const ruins = ambos.filter((f) => (f.notaRevisor as number) < RUIM_ABAIXO)
  const bons = ambos.filter((f) => (f.notaRevisor as number) >= BOM_DESDE)
  const acusa = (f: FilmeDoPlacar) => (f.notaAuto as number) < RUIM_ABAIXO
  return {
    chave, rotulo,
    filmes: filmes.length,
    comNota: notados.length,
    semNota: filmes.length - notados.length,
    oitoOuMais: oito,
    pct: notados.length ? Math.round((100 * oito) / notados.length) : null,
    media: media(notados.map((f) => f.notaRevisor as number)),
    defeitos,
    motores: [...porMotor.values()].sort((a, b) => b.filmes - a.filmes || a.motor.localeCompare(b.motor)),
    auto: {
      julgados: julgados.length,
      oitoOuMais: julgados.filter((f) => (f.notaAuto as number) >= NOTA_BOA).length,
      media: media(julgados.map((f) => f.notaAuto as number)),
      comparados: ambos.length,
      ruins: ruins.length,
      ruinsPegos: ruins.filter(acusa).length,
      bons: bons.length,
      alarmes: bons.filter(acusa).length,
    },
  }
}

/** Monta o placar: só 1ºs filmes; "7 dias" = as últimas 168 h (a régua da partida da CEO); cada dia = dia de Brasília. */
export function montarPlacar(filmes: FilmeDoPlacar[], agora: number): PlacarFilmeGratis {
  const primeiros = filmes.filter((f) => f.primeiro)
  const desde = agora - DIAS * 86400_000
  const semana = linhaDoPlacar('7d', 'Últimos 7 dias', primeiros.filter((f) => { const t = Date.parse(f.criadoEm); return t >= desde && t <= agora }))
  const hoje = diaBrasilia(agora)
  const dias = ultimosDias(agora).map((dia) => linhaDoPlacar(dia, dia === hoje ? 'Hoje' : `${dia.slice(8, 10)}/${dia.slice(5, 7)}`, primeiros.filter((f) => diaBrasilia(f.criadoEm) === dia)))
  return { geradoEm: new Date(agora).toISOString(), meta: META_PCT, semana, dias }
}

/** "37 de 41" e a porcentagem, ou "—" sem base. */
export function fracao(a: number, b: number): string {
  return b ? `${a} de ${b} (${Math.round((100 * a) / b)}%)` : '—'
}

/** Rótulo de defeito legível no painel (o código do revisor fica no title). */
export const NOME_DEFEITO: Record<string, string> = {
  CENA_FORA_DO_PEDIDO: 'cena fora do pedido',
  PERSONAGEM_TROCOU: 'personagem trocou',
  PESSOA_FALTANDO: 'pessoa faltando',
  REPETICAO: 'repetição',
  ANATOMIA: 'anatomia',
  TEXTO_INVENTADO: 'texto inventado',
  LEGENDA: 'legenda',
  FINAL_FRACO: 'final fraco',
  NARRACAO_LE_INSTRUCAO: 'narração lê instrução',
  OLHOS_FECHADOS_OU_MORTOS: 'olhos fechados',
  EFEITO_NAO_ACONTECEU: 'efeito não aconteceu',
  OUTRO: 'outro',
}
export const nomeDefeito = (c: string) => NOME_DEFEITO[c] ?? c.toLowerCase().replace(/_/g, ' ')
