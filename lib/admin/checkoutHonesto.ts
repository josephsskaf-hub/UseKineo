// ═══ KINEO-CHECKOUT-HONESTO-2026-10-07 — o "Checkouts 24h" do admin vira três linhas ═══════════════════════════════════
//
// O QUE ACONTECEU (medido no banco em 07/10, só SELECT). O fundador viu "9 checkouts" no /admin e 1–2 na Stripe. Desde
// que a compra sem login foi ligada (o interruptor de lib/growth/guestCheckout.ts, 06/10 ~22:47 UTC), todo clique num
// plano abre uma sessão na Stripe e grava checkout_started (+ checkout_guest_started) — antes, o visitante sem conta
// parava no cadastro (checkout_auth_required). O card contava TODO checkout_started das últimas 24h (RPC
// admin_live_counters), e os 9 de 07/10 (UTC) eram:
//   · 1 teste da casa (convidado, do IP do fundador; o outro teste da casa foi em 06/10 22:46);
//   · 3 abertas na mesma rajada (13:27:35.539 → 13:27:36.501 UTC), uma por plano: robô ou ferramenta seguindo links;
//   · 3 de madrugada, sem login, sem sessão do navegador e sem IP — não dá para dizer se é gente;
//   · 2 da mesma pessoa logada (abriu o Studio duas vezes, 43 s entre uma e outra).
// 6 dos 8 eventos de convidado vieram sem session_id (o pedido não trazia o cookie) e nenhum evento do servidor tinha
// ip_hash nem classe de navegador: gente e robô ficavam iguais. app/api/stripe/checkout/route.ts passou a carimbar
// ip_hash/ua_class/prefetch em todo evento de checkout (só telemetria; a resposta da rota não muda).
//
// AS TRÊS LINHAS — uma regra só, usada pela tela (/api/admin/live → components/LiveNowPanel.tsx) e pelo guardião
// scripts/test-checkout-honesto-2026-10-07.mjs:
//   1. PAGAMENTO ABERTO POR PESSOA — sessões de pagamento distintas que não são robô nem da casa, juntadas por pessoa
//      (conta logada ou sessão do navegador; sem nenhuma das duas, o ip_hash; sem nada, cada sessão conta como uma).
//   2. ABERTO POR ROBÔ OU RAJADA — ua_class = 'bot', pré-carregamento (prefetch), ou 3+ sessões do mesmo ip_hash ou da
//      mesma sessão do navegador em até 5 s. Para o HISTÓRICO sem ip_hash: 3+ sessões de CONVIDADO no mesmo segundo —
//      janela deslizante de 1 s, nunca o segundo do relógio (a rajada de 07/10 atravessa a virada 35→36) — e a tela diz
//      que é ESTIMATIVA.
//   3. PAGOU — só payment_success (Stripe, Dodo ou trilho alternativo), sem conta da casa.
// CONTA DA CASA (sai das três): lib/internalAccounts.ts é a ÚNICA lista. É da casa a sessão aberta por conta interna;
// a sessão do navegador onde uma conta interna teve evento; e o ip_hash que uma conta interna usou nos últimos 7 dias
// (o convidado da casa não tem conta — mas tem o IP dela; foi assim que os dois testes de 06-07/10 se revelaram).
//
// PURO na regra: sem banco, sem rede. Quem lê o banco é carregarCheckoutHonesto(), com o leitor injetado (a rota passa
// o readAll de lib/supabase/readAll — paginado, nunca truncado em 1000 linhas).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { readAll } from '../supabase/readAll'
import { isInternalEmail } from '../internalAccounts'

export const CHECKOUT_HONESTO_VERSION = 'checkout-honesto-2026-10-07'

/** A sessão de pagamento aberta. O gêmeo do convidado (checkout_guest_started) NÃO entra: é a mesma sessão Stripe. */
export const EVENTO_ABERTO = 'checkout_started'
/** O único fato de dinheiro que a linha "pagou" conta. */
export const EVENTO_PAGO = 'payment_success'
export const EVENTOS_DO_CARTAO: readonly string[] = [EVENTO_ABERTO, EVENTO_PAGO]

/** Rajada: N ou mais sessões de pagamento… */
export const RAJADA_MIN_SESSOES = 3
/** …do mesmo ip_hash ou da mesma sessão do navegador em até 5 s. */
export const RAJADA_JANELA_MS = 5_000
/** Histórico sem ip_hash: convidados no mesmo segundo (janela deslizante de 1 s). */
export const RAJADA_CARIMBO_JANELA_MS = 1_000
/** O período do card (o mesmo "24h" dos vizinhos no painel ao vivo). */
export const JANELA_CARTAO_MS = 24 * 60 * 60 * 1000
/** Quanto para trás se procura a sessão do navegador e o IP de uma conta da casa. */
export const JANELA_LIGACAO_MS = 7 * 24 * 60 * 60 * 1000
/** Tamanho do lote de cada lista `in (…)` (cabe na URL do PostgREST mesmo com hashes de 64 caracteres). */
export const LOTE_IN = 50

export type EventoDoCartao = {
  id?: string | null
  name: string
  created_at: string
  user_id: string | null
  session_id: string | null
  metadata?: Record<string, unknown> | null
}
/** Evento (qualquer um) da mesma sessão do navegador: o sink /api/events carimba ip_hash em todos. */
export type LigacaoDeSessao = { session_id: string | null; user_id: string | null; ip_hash: string | null }
/** Evento de uma conta logada com aquele ip_hash. */
export type LigacaoDeIp = { ip_hash: string | null; user_id: string | null }
export type PerfilDoCartao = { id: string; email: string | null }
export type SinaisDaCasa = { contas: ReadonlySet<string>; sessoes: ReadonlySet<string>; ips: ReadonlySet<string> }

export type MotivoRobo = 'ua_robo' | 'prefetch' | 'rajada' | 'rajada_pelo_horario'

export type CheckoutHonesto = {
  versao: string
  /** Sessões de pagamento distintas no período (o número antigo, sem a duplicata do gêmeo do convidado). */
  sessoesAbertas: number
  /** Linha 1: pessoas distintas que abriram pagamento (sem robô, sem casa). */
  pessoas: number
  /** Sessões abertas por essas pessoas (uma pessoa pode abrir mais de uma). */
  sessoesDePessoas: number
  /** Sessões contadas como pessoa sem conta, sessão do navegador nem IP (dado de antes do carimbo). */
  pessoasSemIdentidade: number
  /** Linha 2: sessões abertas por robô ou rajada. */
  roboOuRajada: number
  /** Dessas, quantas só pela rajada do carimbo de tempo (sem ip_hash): estimativa. */
  roboOuRajadaEstimado: number
  /** Linha 3: pagamentos (payment_success) sem conta da casa. */
  pagou: number
  /** Sessões de pagamento da casa (fora das três linhas). */
  daCasa: number
  /** Pagamentos da casa (fora da linha "pagou"). */
  pagamentosDaCasa: number
  motivos: Record<MotivoRobo, number>
}

export type LinhaDoCartao = { chave: 'pessoas' | 'robo' | 'pagou'; valor: number; rotulo: string; detalhe: string | null }
export type CartaoCheckoutHonesto = { linhas: LinhaDoCartao[]; conta: string; avisos: string[]; regra: string }
export type CheckoutHonestoComCartao = CheckoutHonesto & { cartao: CartaoCheckoutHonesto }

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const meta = (e: { metadata?: Record<string, unknown> | null }): Record<string, unknown> =>
  e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata) ? e.metadata : {}

function unicos(valores: unknown[]): string[] {
  const out = new Set<string>()
  for (const v of valores) {
    const t = texto(v)
    if (t) out.add(t)
  }
  return [...out]
}

function lotes<T>(lista: T[], tamanho = LOTE_IN): T[][] {
  const out: T[][] = []
  for (let i = 0; i < lista.length; i += tamanho) out.push(lista.slice(i, i + tamanho))
  return out
}

/** As três marcas da casa, todas derivadas de lib/internalAccounts.ts (isInternalEmail) — nunca de uma lista daqui. */
export function sinaisDaCasa(input: { perfis: PerfilDoCartao[]; sessoes: LigacaoDeSessao[]; ips: LigacaoDeIp[] }): SinaisDaCasa {
  const contas = new Set<string>()
  for (const p of input.perfis) if (p.id && isInternalEmail(p.email)) contas.add(p.id)
  const sessoes = new Set<string>()
  const ips = new Set<string>()
  for (const s of input.sessoes) {
    if (!s.user_id || !contas.has(s.user_id)) continue
    const sid = texto(s.session_id)
    if (sid) sessoes.add(sid)
    const ip = texto(s.ip_hash)
    if (ip) ips.add(ip)
  }
  for (const r of input.ips) {
    if (!r.user_id || !contas.has(r.user_id)) continue
    const ip = texto(r.ip_hash)
    if (ip) ips.add(ip)
  }
  return { contas, sessoes, ips }
}

/** Os IPs (hash) que o sink viu em cada sessão do navegador — a ponte do histórico, que não tinha ip_hash no evento. */
export function ipsPorSessao(sessoes: LigacaoDeSessao[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const s of sessoes) {
    const sid = texto(s.session_id)
    const ip = texto(s.ip_hash)
    if (!sid || !ip) continue
    const atual = out.get(sid) ?? new Set<string>()
    atual.add(ip)
    out.set(sid, atual)
  }
  return out
}

type Sessao = {
  chave: string
  t: number
  conta: string | null
  navegador: string | null
  ipProprio: string | null
  ipsLigados: string[]
  convidado: boolean
  uaClass: string | null
  prefetch: boolean
}

export function classificarCheckouts(input: {
  eventos: EventoDoCartao[]
  casa: SinaisDaCasa
  ipsDaSessao?: ReadonlyMap<string, ReadonlySet<string>>
}): CheckoutHonesto {
  const { casa } = input

  // 1. Sessões de pagamento distintas: uma por sessão Stripe (o id do evento já é determinístico por sessão; a chave
  //    repete a garantia aqui para o gêmeo e para linhas antigas).
  const porChave = new Map<string, Sessao>()
  for (const e of input.eventos) {
    if (e.name !== EVENTO_ABERTO) continue
    const t = Date.parse(e.created_at)
    if (!Number.isFinite(t)) continue
    const m = meta(e)
    const conta = texto(e.user_id)
    const navegador = texto(e.session_id)
    const chave = texto(m.stripe_session_id) ?? `ev:${texto(e.id) ?? `${e.created_at}|${conta ?? ''}|${navegador ?? ''}`}`
    const atual = porChave.get(chave)
    if (atual && atual.t <= t) continue
    porChave.set(chave, {
      chave,
      t,
      conta,
      navegador,
      ipProprio: texto(m.ip_hash),
      ipsLigados: navegador ? [...(input.ipsDaSessao?.get(navegador) ?? [])] : [],
      convidado: conta === null,
      uaClass: texto(m.ua_class),
      prefetch: m.prefetch === true,
    })
  }
  const sessoes = [...porChave.values()].sort((a, b) => a.t - b.t || (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0))

  // 2. Casa: sai de tudo antes de qualquer outra conta.
  const ehDaCasa = (s: Sessao): boolean =>
    (s.conta !== null && casa.contas.has(s.conta)) ||
    (s.navegador !== null && casa.sessoes.has(s.navegador)) ||
    (s.ipProprio !== null && casa.ips.has(s.ipProprio)) ||
    s.ipsLigados.some((ip) => casa.ips.has(ip))
  const daCasa = sessoes.filter(ehDaCasa)
  const fora = sessoes.filter((s) => !ehDaCasa(s))

  // 3. Robô ou rajada. O primeiro motivo vale (o navegador que se declara robô é mais forte que a rajada).
  const motivo = new Map<string, MotivoRobo>()
  for (const s of fora) {
    if (s.uaClass === 'bot') motivo.set(s.chave, 'ua_robo')
    else if (s.prefetch) motivo.set(s.chave, 'prefetch')
  }
  // Janela deslizante: todo trecho com RAJADA_MIN_SESSOES ou mais sessões cujo intervalo total cabe na janela é rajada.
  const marcarRajadas = (grupo: Sessao[], janelaMs: number, rotulo: MotivoRobo): void => {
    const g = [...grupo].sort((a, b) => a.t - b.t)
    let ini = 0
    for (let fim = 0; fim < g.length; fim++) {
      while (g[fim].t - g[ini].t > janelaMs) ini++
      if (fim - ini + 1 < RAJADA_MIN_SESSOES) continue
      for (let k = ini; k <= fim; k++) if (!motivo.has(g[k].chave)) motivo.set(g[k].chave, rotulo)
    }
  }
  const grupos = new Map<string, Sessao[]>()
  const agrupar = (k: string, s: Sessao): void => {
    const lista = grupos.get(k) ?? []
    lista.push(s)
    grupos.set(k, lista)
  }
  for (const s of fora) {
    if (s.ipProprio) agrupar(`ip:${s.ipProprio}`, s)
    if (s.navegador) agrupar(`s:${s.navegador}`, s)
  }
  for (const g of grupos.values()) marcarRajadas(g, RAJADA_JANELA_MS, 'rajada')
  // Histórico sem ip_hash: só o carimbo de tempo sobra — convidados no mesmo segundo. Estimativa, e a tela diz.
  marcarRajadas(fora.filter((s) => s.convidado && s.ipProprio === null), RAJADA_CARIMBO_JANELA_MS, 'rajada_pelo_horario')

  // 4. Pessoas: as sessões que sobraram, juntadas por conta e por sessão do navegador (a mesma pessoa que abriu como
  //    convidada e depois logada na mesma aba é UMA). Sem nenhuma das duas, o IP; sem nada, a própria sessão Stripe.
  const deGente = fora.filter((s) => !motivo.has(s.chave))
  const pai = new Map<string, string>()
  const raiz = (x: string): string => {
    let r = x
    while (pai.get(r) !== r) r = pai.get(r) as string
    let y = x
    while (pai.get(y) !== r) {
      const prox = pai.get(y) as string
      pai.set(y, r)
      y = prox
    }
    return r
  }
  const chavesDe = (s: Sessao): string[] => {
    const ks: string[] = []
    if (s.conta) ks.push(`u:${s.conta}`)
    if (s.navegador) ks.push(`s:${s.navegador}`)
    if (!ks.length) ks.push(s.ipProprio ? `ip:${s.ipProprio}` : `cs:${s.chave}`)
    return ks
  }
  for (const s of deGente) {
    const ks = chavesDe(s)
    for (const k of ks) if (!pai.has(k)) pai.set(k, k)
    for (const k of ks.slice(1)) {
      const a = raiz(ks[0])
      const b = raiz(k)
      if (a !== b) pai.set(b, a)
    }
  }
  const pessoas = new Set(deGente.map((s) => raiz(chavesDe(s)[0]))).size

  // 5. Pagou: só payment_success, uma vez por evento, sem a casa.
  const pagos = new Set<string>()
  const pagosDaCasa = new Set<string>()
  for (const e of input.eventos) {
    if (e.name !== EVENTO_PAGO) continue
    const conta = texto(e.user_id)
    const navegador = texto(e.session_id)
    const chave = texto(e.id) ?? texto(meta(e).stripe_session_id) ?? `${e.created_at}|${conta ?? ''}`
    const daCasaPago = (conta !== null && casa.contas.has(conta)) || (navegador !== null && casa.sessoes.has(navegador))
    ;(daCasaPago ? pagosDaCasa : pagos).add(chave)
  }

  const motivos: Record<MotivoRobo, number> = { ua_robo: 0, prefetch: 0, rajada: 0, rajada_pelo_horario: 0 }
  for (const m of motivo.values()) motivos[m] += 1

  return {
    versao: CHECKOUT_HONESTO_VERSION,
    sessoesAbertas: sessoes.length,
    pessoas,
    sessoesDePessoas: deGente.length,
    pessoasSemIdentidade: deGente.filter((s) => !s.conta && !s.navegador && !s.ipProprio).length,
    roboOuRajada: motivo.size,
    roboOuRajadaEstimado: motivos.rajada_pelo_horario,
    pagou: pagos.size,
    daCasa: daCasa.length,
    pagamentosDaCasa: pagosDaCasa.size,
    motivos,
  }
}

const plural = (n: number, um: string, varios: string): string => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

/** O texto da tela, em português simples, a partir dos números (a tela só desenha; não recalcula nada). */
export function cartaoCheckoutHonesto(r: CheckoutHonesto): CartaoCheckoutHonesto {
  const linhas: LinhaDoCartao[] = [
    {
      chave: 'pessoas',
      valor: r.pessoas,
      // KINEO-CARTAO-PAGAMENTO-CLARO-2026-10-09 — fundador: "três números, não sei quais são quais". Dois números grandes
      // (chegaram · pagaram) e uma linha cinza com o que ficou fora da conta.
      rotulo: 'chegaram ao pagamento',
      detalhe: r.sessoesDePessoas !== r.pessoas ? plural(r.sessoesDePessoas, 'abertura', 'aberturas') : null,
    },
    {
      chave: 'robo',
      valor: r.roboOuRajada,
      rotulo: 'robôs ou cliques repetidos',
      detalhe: r.roboOuRajadaEstimado === 0
        ? null
        : r.roboOuRajadaEstimado === r.roboOuRajada
          ? 'estimativa'
          : `${r.roboOuRajadaEstimado.toLocaleString('pt-BR')} por estimativa`,
    },
    { chave: 'pagou', valor: r.pagou, rotulo: 'pagaram', detalhe: null },
  ]
  const conta =
    `Fora da conta: ${plural(r.roboOuRajada, 'robô ou clique repetido', 'robôs ou cliques repetidos')} · ` +
    `${plural(r.daCasa, 'teste da casa', 'testes da casa')} (${plural(r.sessoesAbertas, 'abertura', 'aberturas')} no total)`
  const avisos: string[] = []
  if (r.roboOuRajadaEstimado > 0) {
    avisos.push('Estimativa: pagamento antigo não tem IP gravado; nele, 3 ou mais aberturas sem login no mesmo segundo contam como rajada.')
  }
  if (r.pessoasSemIdentidade > 0) {
    avisos.push(r.pessoasSemIdentidade === 1
      ? '1 pagamento antigo sem conta, sessão nem IP: contado como pessoa, mas pode ser robô.'
      : `${r.pessoasSemIdentidade.toLocaleString('pt-BR')} pagamentos antigos sem conta, sessão nem IP: contados como pessoa, mas podem ser robô.`)
  }
  if (r.pagamentosDaCasa > 0) avisos.push(`${plural(r.pagamentosDaCasa, 'pagamento da casa ficou', 'pagamentos da casa ficaram')} fora de "pagou".`)
  const regra =
    'Robô ou rajada: navegador que se declara robô, pré-carregamento, ou 3 ou mais pagamentos do mesmo IP ou da mesma ' +
    'sessão do navegador em até 5 s. Da casa: conta interna, ou a sessão ou o IP que ela usou. Pagou: só pagamento confirmado.'
  return { linhas, conta, avisos, regra }
}

/**
 * Lê o período do card e classifica. Quatro leituras pequenas, todas paginadas pelo leitor injetado:
 *   1. checkout_started + payment_success das últimas 24h;
 *   2. eventos das MESMAS sessões do navegador (7 dias): conta logada e ip_hash do sink;
 *   3. eventos de conta logada com os MESMOS ip_hash (7 dias);
 *   4. e-mail dessas contas, para isInternalEmail (lib/internalAccounts.ts).
 * Erro de leitura lança (o leitor não devolve dado parcial): quem chama mostra "não deu para ler" em vez de um número.
 */
export async function carregarCheckoutHonesto(
  db: SupabaseClient,
  ler: typeof readAll,
  agoraMs: number,
  route = '/api/admin/live',
): Promise<CheckoutHonestoComCartao> {
  const desde = new Date(agoraMs - JANELA_CARTAO_MS).toISOString()
  const ligacaoDesde = new Date(agoraMs - JANELA_LIGACAO_MS).toISOString()

  const lidos = await ler(
    () => db.from('events').select('id, name, created_at, user_id, session_id, metadata').in('name', [...EVENTOS_DO_CARTAO]).gte('created_at', desde),
    { route, table: 'events' },
  )
  const eventos = (lidos.data ?? []) as unknown as EventoDoCartao[]

  const sessoes: LigacaoDeSessao[] = []
  for (const lote of lotes(unicos(eventos.map((e) => e.session_id)))) {
    const r = await ler(
      () => db.from('events').select('id, session_id, user_id, ip_hash:metadata->>ip_hash').in('session_id', lote).gte('created_at', ligacaoDesde),
      { route, table: 'events' },
    )
    sessoes.push(...((r.data ?? []) as unknown as LigacaoDeSessao[]))
  }

  const ips: LigacaoDeIp[] = []
  for (const lote of lotes(unicos([...eventos.map((e) => meta(e).ip_hash), ...sessoes.map((s) => s.ip_hash)]))) {
    const r = await ler(
      () => db.from('events').select('id, user_id, ip_hash:metadata->>ip_hash').in('metadata->>ip_hash', lote).not('user_id', 'is', null).gte('created_at', ligacaoDesde),
      { route, table: 'events' },
    )
    ips.push(...((r.data ?? []) as unknown as LigacaoDeIp[]))
  }

  const perfis: PerfilDoCartao[] = []
  for (const lote of lotes(unicos([...eventos.map((e) => e.user_id), ...sessoes.map((s) => s.user_id), ...ips.map((r) => r.user_id)]))) {
    const r = await ler(() => db.from('profiles').select('id, email').in('id', lote), { route, table: 'profiles' })
    perfis.push(...((r.data ?? []) as unknown as PerfilDoCartao[]))
  }

  const resultado = classificarCheckouts({ eventos, casa: sinaisDaCasa({ perfis, sessoes, ips }), ipsDaSessao: ipsPorSessao(sessoes) })
  return { ...resultado, cartao: cartaoCheckoutHonesto(resultado) }
}
