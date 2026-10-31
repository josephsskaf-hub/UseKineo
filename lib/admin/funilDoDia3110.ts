// ═══ KINEO-EP2-PAINEL-3110 — o placar das mudanças de 31/10, numa função PURA ════════════════════════════════════════
//
// O cartão do /admin (components/admin/FunilDoDia3110.tsx) lê o banco; ESTA função só conta. Janela = últimos 7 dias
// contra os 7 anteriores. Contas internas já chegam filtradas (o chamador usa lib/internalAccounts) — aqui só se
// confere que a linha pertence a um id externo quando ela tem dono.
//
// Duas famílias de linha:
//   · FUNIS DE EVENTO (estreia, recusa, "qual plano", cancelamento): pessoas distintas por degrau (user_id, ou a sessão
//     quando o evento é anônimo — o "qual plano" mora no /pricing, que abre deslogado).
//   · PRIMEIRO FILME: coorte de CADASTROS da janela → quantos apertaram gerar → receberam o 1º filme → abriram o
//     checkout → pagaram, tudo dentro da mesma janela.
// Zero import: o guardião scripts/test-ep2-painel-3110.mjs carrega o arquivo real.

export const FUNIL_DO_DIA_MARCA = 'KINEO-EP2-PAINEL-3110'
export const DIA_MS = 24 * 60 * 60 * 1000
export const JANELA_DIAS = 7

export type LinhaDeEvento = { id?: string | number | null; name: string; user_id: string | null; session_id?: string | null; created_at: string; metadata?: Record<string, unknown> | null }
export type Cadastro = { id: string; created_at: string }
export type Filme = { user_id: string | null; created_at: string; quality_mode?: string | null }

/** Os funis de evento, na ordem do cartão. Cada degrau é UM nome de evento. */
export const FUNIS_DE_EVENTO = [
  { chave: 'estreia', titulo: 'Estreia (sala de espera)', degraus: ['premiere_shown', 'premiere_ready_seen', 'premiere_download_clicked', 'premiere_next_clicked'] },
  { chave: 'recusa', titulo: 'Recusa vira botão', degraus: ['refusal_fix_shown', 'refusal_fix_clicked'] },
  { chave: 'plano', titulo: 'Qual plano é o meu', degraus: ['plan_finder_opened', 'plan_finder_recommended'] },
  { chave: 'cancelamento', titulo: 'Antes de cancelar', degraus: ['cancel_flow_opened', 'cancel_saved_downgrade', 'cancel_continued'] },
] as const

/** "Apertou gerar": o clique do Studio (mrr_generate_clicked) ou o despacho do /generate (generate_started). */
export const EVENTOS_GERAR = ['generate_started', 'mrr_generate_clicked'] as const
export const EVENTOS_PRIMEIRO_FILME = [...EVENTOS_GERAR, 'checkout_started', 'payment_success'] as const

/** Todos os nomes que o cartão pede ao banco (um select só). */
export const NOMES_DO_PAINEL: string[] = [
  ...FUNIS_DE_EVENTO.flatMap((f) => [...f.degraus]),
  ...EVENTOS_PRIMEIRO_FILME,
]

export type Janela = { desde: number; ate: number }
export function janelas(agora: number): { atual: Janela; anterior: Janela } {
  const w = JANELA_DIAS * DIA_MS
  return { atual: { desde: agora - w, ate: agora }, anterior: { desde: agora - 2 * w, ate: agora - w } }
}

const t = (iso: string) => Date.parse(iso)
const dentro = (iso: string, j: Janela) => { const x = t(iso); return Number.isFinite(x) && x >= j.desde && x < j.ate }
const ator = (e: LinhaDeEvento) => e.user_id ?? (e.session_id ? `s:${e.session_id}` : e.id != null ? `e:${e.id}` : null)

export type Degrau = { nome: string; atual: number; anterior: number }
export type FunilContado = { chave: string; titulo: string; degraus: Degrau[] }

/**
 * Pessoas distintas por degrau. Linha com dono só conta se o dono for externo (`externos`); linha anônima conta pela
 * sessão (não há como ser interna sem login — o cartão diz isso no rodapé).
 */
export function contarFunisDeEvento(linhas: LinhaDeEvento[], externos: Set<string>, agora: number): FunilContado[] {
  const { atual, anterior } = janelas(agora)
  return FUNIS_DE_EVENTO.map((f) => ({
    chave: f.chave,
    titulo: f.titulo,
    degraus: f.degraus.map((nome) => {
      const a = new Set<string>(), b = new Set<string>()
      for (const e of linhas) {
        if (e.name !== nome) continue
        if (e.user_id && !externos.has(e.user_id)) continue
        const quem = ator(e)
        if (!quem) continue
        if (dentro(e.created_at, atual)) a.add(quem)
        else if (dentro(e.created_at, anterior)) b.add(quem)
      }
      return { nome, atual: a.size, anterior: b.size }
    }),
  }))
}

export type PrimeiroFilme = { cadastros: number; gerou: number; primeiroFilme: number; checkout: number; pagou: number }

/** Coorte de cadastros da janela (externos), e o que cada um fez DENTRO da mesma janela. */
export function contarPrimeiroFilme(cadastros: Cadastro[], linhas: LinhaDeEvento[], filmes: Filme[], j: Janela): PrimeiroFilme {
  const coorte = new Set(cadastros.filter((c) => dentro(c.created_at, j)).map((c) => c.id))
  const gerou = new Set<string>(), checkout = new Set<string>(), pagou = new Set<string>(), filme = new Set<string>()
  for (const e of linhas) {
    if (!e.user_id || !coorte.has(e.user_id) || !dentro(e.created_at, j)) continue
    if ((EVENTOS_GERAR as readonly string[]).includes(e.name)) gerou.add(e.user_id)
    else if (e.name === 'checkout_started') checkout.add(e.user_id)
    else if (e.name === 'payment_success') pagou.add(e.user_id)
  }
  for (const v of filmes) {
    if (!v.user_id || !coorte.has(v.user_id) || v.quality_mode === 'ads_v2' || !dentro(v.created_at, j)) continue
    filme.add(v.user_id)
  }
  return { cadastros: coorte.size, gerou: gerou.size, primeiroFilme: filme.size, checkout: checkout.size, pagou: pagou.size }
}

/** "12 (+3)" / "12 (−2)" / "12 (=)" — a seta do cartão. */
export function variacao(atual: number, anterior: number): string {
  const d = atual - anterior
  return d === 0 ? '=' : d > 0 ? `+${d}` : `−${Math.abs(d)}`
}

/** % do degrau sobre o primeiro degrau do funil (vazio quando a base é zero). */
export function taxa(n: number, base: number): string {
  return base > 0 ? `${Math.round((n / base) * 100)}%` : '—'
}
