// KINEO-ADMIN-JORNADA-1510 — regras PURAS da aba "Clientes" do /admin (fundador 15/10, "para ontem": ver os últimos
// cadastros, 10 por página, e para cada pessoa QUEM é, O QUE fez, ATÉ ONDE chegou no funil e POR ONDE navegou).
//
// Este arquivo não importa nada: nem banco, nem env, nem rede. Tudo que decide (quem é interno, a régua do funil, a
// trilha de páginas, o status do anúncio, os filtros da URL) mora aqui para o guardião
// scripts/test-admin-jornada-1510.mjs carregar sem credencial. A leitura do banco fica em lib/admin/clientesJornada.ts.

/** 10 pessoas por página — o pedido literal. */
export const CLIENTES_POR_PAGINA = 10
/** Janela de eventos por pessoa: do dia anterior ao cadastro até N dias depois (events não tem índice por user_id; a janela usa o índice de created_at). */
export const JANELA_DIAS = 45
/** Teto de eventos lidos por pessoa, ABAIXO do teto silencioso de 1.000 do PostgREST; bater nele vira aviso na tela, nunca corte calado. */
export const EVENTOS_POR_PESSOA = 800
/** Eventos anônimos ligados por pessoa (mesma sessão do navegador antes do cadastro). */
export const EVENTOS_ANONIMOS_POR_PESSOA = 300
/** Quantas sessões de navegador da pessoa são usadas para achar a navegação anônima de antes do cadastro (.in pequeno, nunca gigante). */
export const SESSOES_LIGADAS_MAX = 5
/** Passos da trilha mostrados de cara; o resto fica no "ver mais". */
export const PASSOS_VISIVEIS = 40
/** Teto absoluto de passos da trilha no "ver mais". */
export const PASSOS_MAX = 200
/** Filmes / anúncios listados por pessoa (o total vem por count exato e aparece na tela). */
export const FILMES_POR_PESSOA = 12
export const ANUNCIOS_POR_PESSOA = 12
/** Uma geração aberta há menos que isto, sem filme depois, conta como "fazendo agora". */
export const FAZENDO_MINUTOS = 45

// ═══ Contas internas — a MESMA régua do painel: e-mail ~* '(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)'
// + INTERNAL_EXACT_EMAILS (lib/internalAccounts.ts, que o chamador injeta — fonte única da lista exata). ═══
export const INTERNOS_RE = /(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)/i
/** Os mesmos 4 trechos, no formato ILIKE do PostgREST (a exclusão roda NO BANCO, antes da paginação). */
export const INTERNOS_ILIKE = ['%josephsskaf%', '%josephskaf%', '%josepghsskaf%', '%@usekineo.com%'] as const

export function ehContaInterna(email: string | null | undefined, exatos: readonly string[]): boolean {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return false
  if (exatos.some((x) => x.trim().toLowerCase() === e)) return true
  return INTERNOS_RE.test(e)
}

/** Valor do filtro `not.in` do PostgREST com aspas (e-mail tem @, + e ponto). */
export function listaParaNotIn(exatos: readonly string[]): string {
  return `(${exatos.map((e) => `"${e.trim().toLowerCase().replace(/"/g, '')}"`).join(',')})`
}

// ═══ Filtros da URL ═══
export type FiltroClientes = 'todos' | 'fez' | 'pagou' | 'nada'
export const FILTROS: ReadonlyArray<[FiltroClientes, string]> = [
  ['todos', 'Todos'],
  ['fez', 'Só quem fez vídeo/anúncio'],
  ['pagou', 'Só quem pagou'],
  ['nada', 'Só quem não fez nada'],
]
export type ParametrosClientes = { pagina: number; filtro: FiltroClientes; internas: boolean }

export function lerParametros(sp: Record<string, string | string[] | undefined> | null | undefined): ParametrosClientes {
  const um = (k: string) => {
    const v = sp?.[k]
    return Array.isArray(v) ? v[0] : v
  }
  const p = Number.parseInt(String(um('p') ?? '1'), 10)
  const f = String(um('f') ?? 'todos') as FiltroClientes
  return {
    pagina: Number.isFinite(p) && p >= 1 ? Math.min(p, 10_000) : 1,
    filtro: FILTROS.some(([k]) => k === f) ? f : 'todos',
    internas: um('internas') === '1',
  }
}

export function hrefClientes(base: ParametrosClientes, mudar: Partial<ParametrosClientes> = {}): string {
  const p = { ...base, ...mudar }
  const q = new URLSearchParams()
  if (p.pagina > 1) q.set('p', String(p.pagina))
  if (p.filtro !== 'todos') q.set('f', p.filtro)
  if (p.internas) q.set('internas', '1')
  const s = q.toString()
  return `/admin/clientes${s ? `?${s}` : ''}`
}

/** Intervalo `.range(de, ate)` da página (inclusivo, como o PostgREST). */
export function intervaloDaPagina(pagina: number): [number, number] {
  const de = (Math.max(1, pagina) - 1) * CLIENTES_POR_PAGINA
  return [de, de + CLIENTES_POR_PAGINA - 1]
}

// ═══ A régua do funil — nomes de evento conferidos no código (app/lib/components) e no banco em 15/10 ═══
export type ChavePasso = 'visitou' | 'cadastrou' | 'studio' | 'gerar' | 'pronto' | 'baixou' | 'planos' | 'checkout' | 'pagou'
export type DefPasso = { chave: ChavePasso; rotulo: string; eventos: readonly string[] }
export const REGUA: readonly DefPasso[] = [
  { chave: 'visitou', rotulo: 'visitou', eventos: ['landing_session_started', 'homepage_view'] },
  // o cadastro é a linha em profiles (created_at) — evento de login (auth_callback_completed) se repete a cada entrada
  { chave: 'cadastrou', rotulo: 'cadastrou', eventos: [] },
  { chave: 'studio', rotulo: 'abriu o Studio', eventos: ['mrr_studio_viewed', 'generate_page_view', 'ads_page_viewed'] },
  { chave: 'gerar', rotulo: 'ideia / gerar', eventos: ['mrr_idea_entered', 'mrr_generate_clicked', 'analyze_idea_clicked', 'generate_started', 'video_generation_started', 'ads_v2_order_created', 'clip_generate_clicked'] },
  { chave: 'pronto', rotulo: 'filme/anúncio pronto', eventos: ['generate_completed', 'video_generation_completed', 'ads_v2_delivered', 'clip_completed'] },
  { chave: 'baixou', rotulo: 'baixou', eventos: ['video_downloaded', 'video_download_clicked'] },
  { chave: 'planos', rotulo: 'viu planos/upgrade', eventos: ['pricing_view', 'upgrade_modal_opened', 'conversion_offer_viewed', 'ads_paywall_viewed'] },
  { chave: 'checkout', rotulo: 'abriu checkout', eventos: ['checkout_started', 'checkout_attempted'] },
  { chave: 'pagou', rotulo: 'pagou', eventos: ['payment_success'] },
]
export const NOMES_DA_REGUA: readonly string[] = Array.from(new Set(REGUA.flatMap((p) => p.eventos)))

export type EventoLido = { name: string; created_at: string; path?: string | null; session_id?: string | null; anonimo?: boolean; erro?: string | null }
export type PassoRegua = { chave: ChavePasso; rotulo: string; ok: boolean; em: string | null; fonte: string | null }

/**
 * A régua de uma pessoa. Cada passo = o PRIMEIRO evento daquele grupo (logado ou anônimo ligado), com a hora.
 * Fatos de tabela completam o que o evento não cobre: o cadastro é a linha em profiles (sempre existe), "pronto" aceita
 * um filme/anúncio entregue na tabela, e "pagou" aceita profiles.has_paid (compra antiga, fora da janela de eventos).
 * "visitou" aceita qualquer página navegada. Nada é inferido de passo posterior: quem pagou sem evento de checkout fica ✗ no checkout.
 */
export function calcularRegua(
  eventos: readonly EventoLido[],
  fatos: { cadastroEm: string; primeiraEntregaEm: string | null; pagou: boolean; primeiraPaginaEm: string | null },
): PassoRegua[] {
  const primeiro = new Map<string, EventoLido>()
  for (const ev of eventos) {
    const atual = primeiro.get(ev.name)
    if (!atual || ev.created_at < atual.created_at) primeiro.set(ev.name, ev)
  }
  return REGUA.map((def) => {
    let melhor: EventoLido | null = null
    for (const nome of def.eventos) {
      const ev = primeiro.get(nome)
      if (ev && (!melhor || ev.created_at < melhor.created_at)) melhor = ev
    }
    if (melhor) return { chave: def.chave, rotulo: def.rotulo, ok: true, em: melhor.created_at, fonte: melhor.anonimo ? `${melhor.name} (antes do cadastro)` : melhor.name }
    if (def.chave === 'cadastrou') return { chave: def.chave, rotulo: def.rotulo, ok: true, em: fatos.cadastroEm, fonte: 'profiles.created_at' }
    if (def.chave === 'visitou' && fatos.primeiraPaginaEm) return { chave: def.chave, rotulo: def.rotulo, ok: true, em: fatos.primeiraPaginaEm, fonte: 'primeira página navegada' }
    if (def.chave === 'pronto' && fatos.primeiraEntregaEm) return { chave: def.chave, rotulo: def.rotulo, ok: true, em: fatos.primeiraEntregaEm, fonte: 'videos / ads_v2_orders' }
    if (def.chave === 'pagou' && fatos.pagou) return { chave: def.chave, rotulo: def.rotulo, ok: true, em: null, fonte: 'profiles.has_paid' }
    return { chave: def.chave, rotulo: def.rotulo, ok: false, em: null, fonte: null }
  })
}

/** Até onde chegou: o último passo marcado (a régua não exige ordem; isto só dá o rótulo do resumo). */
export function ultimoPasso(regua: readonly PassoRegua[]): PassoRegua | null {
  for (let i = regua.length - 1; i >= 0; i--) if (regua[i].ok) return regua[i]
  return null
}

// ═══ A trilha de páginas ═══
export type PassoTrilha = { path: string; em: string; ate: string; vezes: number; anonimo: boolean }

/** Evento de NAVEGAÇÃO = veio do navegador (session_id) e tem caminho de página; rota /api/* é servidor, não é página. */
export function ehNavegacao(ev: EventoLido): boolean {
  if (!ev.session_id || !ev.path) return false
  const p = ev.path.trim()
  return p.startsWith('/') && !p.startsWith('/api/') && !p.startsWith('/_next/')
}

/** Página sem query/hash (a query pode trazer e-mail/token de link de e-mail — não exibimos). */
export function limparCaminho(path: string): string {
  const semQuery = path.split(/[?#]/)[0] || '/'
  return semQuery.length > 90 ? `${semQuery.slice(0, 89)}…` : semQuery
}

/** Ordena por hora, fica só com navegação, junta páginas repetidas em sequência (a mesma página com 12 eventos = 1 passo, 12×). */
export function montarTrilha(eventos: readonly EventoLido[]): PassoTrilha[] {
  const nav = eventos.filter(ehNavegacao).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  const out: PassoTrilha[] = []
  for (const ev of nav) {
    const path = limparCaminho(String(ev.path))
    const ult = out[out.length - 1]
    if (ult && ult.path === path && ult.anonimo === !!ev.anonimo) {
      ult.vezes += 1
      ult.ate = ev.created_at
      continue
    }
    out.push({ path, em: ev.created_at, ate: ev.created_at, vezes: 1, anonimo: !!ev.anonimo })
  }
  return out
}

/** As sessões de navegador da pessoa mais próximas do cadastro (as que podem ter começado anônimas). */
export function sessoesParaLigar(eventos: readonly EventoLido[]): string[] {
  const vistas: string[] = []
  const ordenados = eventos.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  for (const ev of ordenados) {
    const s = ev.session_id
    if (!s || vistas.includes(s)) continue
    vistas.push(s)
    if (vistas.length >= SESSOES_LIGADAS_MAX) break
  }
  return vistas
}

// ═══ Status ═══
export type StatusEntrega = 'pronto' | 'falhou' | 'fazendo' | 'rascunho'
/** ads_v2_orders.status: draft/planned (parou antes de gerar) · generating/assembling (fazendo) · delivered · failed. */
export function statusDoAnuncio(status: string | null | undefined): StatusEntrega {
  const s = (status ?? '').toLowerCase()
  if (s === 'delivered') return 'pronto'
  if (s === 'failed') return 'falhou'
  if (s === 'generating' || s === 'assembling' || s === 'started' || s === 'rendering') return 'fazendo'
  return 'rascunho'
}
/** videos.status: a tabela só ganha linha quando o filme fica pronto (completed); failed/cancelled são linhas antigas de maio. */
export function statusDoFilme(status: string | null | undefined): StatusEntrega {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed' || s === 'ready' || s === 'done') return 'pronto'
  if (s === 'failed' || s === 'cancelled' || s === 'canceled') return 'falhou'
  return 'fazendo'
}

/** Geração aberta (generate_started / generation_attempt_opened / ads_v2_started) nos últimos FAZENDO_MINUTOS sem entrega depois. */
export function fazendoAgora(eventos: readonly EventoLido[], ultimaEntregaEm: string | null, agora: number): { desde: string } | null {
  const aberturas = eventos.filter((e) => e.name === 'generate_started' || e.name === 'generation_attempt_opened' || e.name === 'ads_v2_started')
  if (aberturas.length === 0) return null
  const ultima = aberturas.reduce((a, b) => (b.created_at > a.created_at ? b : a))
  const idadeMin = (agora - Date.parse(ultima.created_at)) / 60_000
  if (!(idadeMin >= 0 && idadeMin <= FAZENDO_MINUTOS)) return null
  if (ultimaEntregaEm && ultimaEntregaEm >= ultima.created_at) return null
  return { desde: ultima.created_at }
}

/** A frase exata que o servidor devolveu (generation_stage_error.metadata.error), curta para a tela. */
export function frasesDeFalha(eventos: readonly EventoLido[], max = 6): Array<{ em: string; erro: string }> {
  return eventos
    .filter((e) => e.name === 'generation_stage_error')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, max)
    .map((e) => ({ em: e.created_at, erro: (e.erro ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) || '(sem texto de erro)' }))
}

// ═══ Formato ═══
const FMT = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const FMT_ANO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
/** Hora de Brasília, "15/10 21:04" (com ano quando não é o ano corrente). */
export function quando(iso: string | null | undefined, agora: Date = new Date()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return (d.getUTCFullYear() === agora.getUTCFullYear() ? FMT : FMT_ANO).format(d).replace(',', '')
}
