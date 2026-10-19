// KINEO-ADMIN-PESSOA-1910 — regras PURAS da TELA DA PESSOA do /admin (fundador 19/10: "clicar dentro do nome da pessoa e
// abrir uma tela somente da pessoa: do que a pessoa fez, do que comprou, se é afiliado, se abriu de um link de afiliado, se
// teve bônus, de onde ela é, quantos créditos ganhou, quantos usou, e os vídeos que já fez, as notas dos vídeos — tanto Ads
// quanto filmes").
//
// Este arquivo só importa a régua dos presentes (lib/admin/ledgerGrants.ts, também pura). Nada de banco, env ou rede: tudo
// que DECIDE (que evento vira concessão, em que produto caiu cada débito, o que conta como checkout de verdade, como a linha
// do tempo agrupa o dia) mora aqui, para o guardião scripts/test-admin-pessoa-1910.mjs rodar sem credencial. A leitura do
// banco (só leitura) fica em lib/admin/pessoaTela.ts.
import { LEDGER_GRANT_EVENTS, LEDGER_GRANT_LABEL, ledgerGrantDelta } from './ledgerGrants'

// ═══ Tetos de leitura — todos ABAIXO do teto silencioso de 1.000 do PostgREST; cada consulta usa user_id + created_at
// (índices events_user_created_idx, credit_debits_user_idx, ads_v2_orders_user_created_idx, clips_user_created_idx…). ═══
export const EVENTOS_DINHEIRO_MAX = 600
export const EVENTOS_LINHA_MAX = 500
export const EVENTOS_RECENTES_MAX = 400
export const DEBITOS_MAX = 500
export const VIDEOS_MAX = 120
export const ANUNCIOS_MAX = 60
export const CLIPES_MAX = 60
export const IMAGENS_MAX = 48
export const AUDIOS_MAX = 24
export const NOTAS_MAX = 300
export const JUIZ_ADS_MAX = 300
export const DIAS_NA_LINHA = 45
/** Nota de coerência: 95 = perfeito (régua do fundador, /admin/coerencia). */
export const NOTA_PERFEITA = 95

/** Endereço da tela da pessoa: pelo id (uuid) quando houver; e-mail também abre (a rota procura por e-mail). */
export function hrefPessoa(idOuEmail: string | null | undefined): string {
  const v = (idOuEmail ?? '').trim()
  return `/admin/people/${encodeURIComponent(v)}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** O segmento da URL vira {id} ou {email}; qualquer outra coisa é inválida (nada de busca livre no banco). */
export function lerChavePessoa(segmento: string | null | undefined): { id: string } | { email: string } | null {
  let v = String(segmento ?? '').trim()
  try { v = decodeURIComponent(v) } catch { /* já decodificado */ }
  v = v.trim()
  if (UUID_RE.test(v)) return { id: v.toLowerCase() }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254) return { email: v.toLowerCase() }
  return null
}

export function bandeira(cc: string | null | undefined): string {
  if (!cc || !/^[a-z]{2}$/i.test(cc)) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

export function corDaNota(n: number): 'perfeita' | 'boa' | 'media' | 'ruim' {
  if (n >= NOTA_PERFEITA) return 'perfeita'
  if (n >= 75) return 'boa'
  if (n >= 50) return 'media'
  return 'ruim'
}

// ═══ Eventos lidos ═══
export type EventoPessoa = { id?: string | null; name: string; created_at: string; session_id?: string | null; path?: string | null; metadata?: Record<string, unknown> | null }

/** Dinheiro e crédito: tudo que soma/tira saldo, compra, checkout, cancelamento e a atribuição de afiliado. */
export const EVENTOS_DINHEIRO: readonly string[] = Array.from(new Set([
  'trial_credits_granted', 'trial_downgraded', 'trial_converted', 'admin_br_trial_recredited',
  'payment_success', 'subscription_invoice_paid', 'subscription_update_invoice_paid', 'plan_switched_to_annual', 'bulk_purchase_completed',
  'admin_credits_granted', ...LEDGER_GRANT_EVENTS,
  'credits_refunded', 'winback25_sent', 'winback_film_60s_claimed',
  'checkout_started', 'checkout_attempted', 'checkout_cancelled', 'checkout_payment_failed', 'checkout_session_expired',
  'subscription_ended', 'subscription_access_held_during_dunning',
  'affiliate_signup_attribution_result',
]))

/** Linha do tempo: os marcos do que a pessoa FEZ (sem page_view, heartbeat ou poll). */
export const EVENTOS_LINHA: readonly string[] = [
  'email_signup_completed', 'organic_signup_completed', 'auth_callback_completed',
  'mrr_studio_viewed', 'mrr_idea_entered', 'generate_started', 'video_generation_started', 'generate_completed', 'video_generation_completed',
  'generation_stage_error', 'video_downloaded', 'video_rated', 'film_feedback',
  'ads_page_viewed', 'ads_v2_order_created', 'ads_v2_started', 'ads_v2_delivered', 'ads_v2_failed',
  'clip_generate_clicked', 'clip_completed', 'next_episode_requested',
  'pricing_view', 'upgrade_modal_opened',
]

/** Ruído que não entra nem na contagem de "outras ações" do dia. */
export function ehRuido(name: string): boolean {
  return /(page_view|heartbeat|_poll|poll_|_seen$|_shown$|_exposed$|impression|_resolved$|_served$|_measured$|_claim$|_probe$|_viewed$)/.test(name)
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const md = (e: EventoPessoa): Record<string, unknown> => (e.metadata && typeof e.metadata === 'object' ? e.metadata : {})

const NOME_PLANO: Record<string, string> = { starter: 'Starter', basic: 'Creator', creator: 'Creator', pro: 'Studio', studio: 'Studio', autopilot: 'Autopilot', autopilot_lite: 'Autopilot Lite', business: 'Business' }
export function nomeDoPlano(tier: unknown): string {
  const t = (str(tier) ?? '').toLowerCase()
  return NOME_PLANO[t] ?? (t || 'plano')
}

export function dinheiro(minor: unknown, moeda: unknown): string | null {
  const n = num(minor)
  if (!(n > 0)) return null
  const cur = (str(moeda) ?? 'usd').toLowerCase()
  const v = (n / 100).toFixed(2).replace('.', ',')
  return cur === 'usd' ? `US$ ${v}` : cur === 'brl' ? `R$ ${v}` : `${cur.toUpperCase()} ${v}`
}

// ═══ CRÉDITOS — ganhou × usou ═══
export type TipoConcessao = 'trial' | 'plano' | 'renovacao' | 'anual' | 'pacote' | 'bonus' | 'presente' | 'cortesia' | 'expirou' | 'revogado'
export type Concessao = { em: string; tipo: TipoConcessao; creditos: number; rotulo: string; motivo: string | null; quem: string | null; semRegistro?: boolean }
export type ProdutoDebito = 'filme' | 'anuncio' | 'clipe' | 'animacao' | 'imagem' | 'audio' | 'hd' | 'avatar' | 'outro'
export type DebitoLido = { render_id: string; kind?: string | null; amount: number | null; created_at: string; refunded_at: string | null }
export type Debito = { em: string; renderId: string; produto: ProdutoDebito; creditos: number; estornado: boolean; estornadoEm: string | null }

export const ROTULO_PRODUTO: Record<ProdutoDebito, string> = {
  filme: 'Filmes (Make my videos)', anuncio: 'Anúncios (Studio Ads)', clipe: 'Clipes / efeitos', animacao: 'Animação', imagem: 'Imagens', audio: 'Áudio / voz', hd: 'HD / 4K', avatar: 'Avatar', outro: 'Outro',
}

/** Produto pelo prefixo do render_id (cinematic-/compose-/fast- = filme, adsv2 = anúncio, clips/clip = clipe…). */
export function produtoDoDebito(renderId: string | null | undefined): ProdutoDebito {
  const p = (renderId ?? '').toLowerCase()
  if (p.startsWith('adsv2') || p.startsWith('ads-') || p.startsWith('ads_')) return 'anuncio'
  if (p.startsWith('clip')) return 'clipe'
  if (p.startsWith('animate') || p.startsWith('gesture')) return 'animacao'
  if (p.startsWith('img') || p.startsWith('image')) return 'imagem'
  if (p.startsWith('audio') || p.startsWith('voice') || p.startsWith('tts')) return 'audio'
  if (p.startsWith('enhance') || p.startsWith('upscale')) return 'hd'
  if (p.startsWith('avatar') || p.startsWith('presenter')) return 'avatar'
  if (p.startsWith('cinematic') || p.startsWith('compose') || p.startsWith('fast') || p.startsWith('video') || p.startsWith('scene') || /^[0-9a-f]{8}-/.test(p)) return 'filme'
  return 'outro'
}

const ROTULO_PRESENTE: Record<string, string> = {
  region_free_clip_granted: 'Clipe grátis de região', region_free_film_granted: 'Filme grátis de região', free_weekly_film_granted: 'Filme grátis da semana',
  admin_courtesy_granted: 'Cortesia', admin_courtesy_expired: 'Cortesia venceu', post_reward_claimed: 'Prêmio por post', business_upgrade_credits_granted: 'Subida p/ Business',
  admin_credit_granted: 'Concessão antiga', admin_credits_revoked: 'Revogado pelo admin',
}

/** Uma concessão (ou retirada) por evento — só entra o valor que o PRÓPRIO evento prova (nunca a tabela de preço de hoje). */
export function concessoesDosEventos(eventos: readonly EventoPessoa[]): Concessao[] {
  const out: Concessao[] = []
  const ordenados = [...eventos].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const semanal: number[] = []
  for (const e of ordenados) {
    const m = md(e)
    switch (e.name) {
      case 'trial_credits_granted': {
        const c = num(m.credits)
        if (c > 0) out.push({ em: e.created_at, tipo: 'trial', creditos: c, rotulo: `Trial${str(m.variant) ? ` (${str(m.variant)})` : ''}`, motivo: null, quem: 'sistema' })
        break
      }
      case 'trial_downgraded': {
        const c = num(m.credits_revoked)
        if (c > 0) out.push({ em: e.created_at, tipo: 'expirou', creditos: -c, rotulo: 'Trial acabou (sobra recolhida)', motivo: str(m.reason), quem: 'sistema' })
        break
      }
      case 'payment_success': {
        const plano = str(m.pack) ? `Pacote ${str(m.pack)}` : nomeDoPlano(m.tier)
        if (m.card_trial === true) { out.push({ em: e.created_at, tipo: 'plano', creditos: 0, rotulo: `${plano}: teste de $1 (o mês entra pela fatura)`, motivo: dinheiro(m.amount_total, m.currency), quem: 'Stripe' }); break }
        const reg = typeof m.credits_granted === 'number' && Number.isFinite(m.credits_granted) ? (m.credits_granted as number) : null
        if (reg === null) { out.push({ em: e.created_at, tipo: 'plano', creditos: 0, rotulo: `${plano} assinou — compra antiga sem registro de crédito`, motivo: dinheiro(m.amount_total, m.currency), quem: 'Stripe', semRegistro: true }); break }
        if (reg > 0) out.push({ em: e.created_at, tipo: str(m.pack) ? 'pacote' : 'plano', creditos: reg, rotulo: `${plano}${str(m.pack) ? '' : ' assinou'}${m.billing === 'annual' ? ' (anual)' : ''}`, motivo: dinheiro(m.amount_total, m.currency), quem: 'Stripe' })
        break
      }
      case 'subscription_invoice_paid': {
        const c = num(m.credits_granted)
        if (c > 0) out.push({ em: e.created_at, tipo: 'renovacao', creditos: c, rotulo: `${nomeDoPlano(m.tier)} renovou${m.trial_conversion === true ? ' (fim do teste)' : ''}`, motivo: dinheiro(m.amount_paid, m.currency), quem: 'Stripe' })
        break
      }
      case 'plan_switched_to_annual': {
        const delta = m.credits_granted === true ? Math.max(0, num(m.credits_after) - num(m.credits_before)) : 0
        out.push({ em: e.created_at, tipo: 'anual', creditos: delta, rotulo: `${nomeDoPlano(m.tier)}: troca para o anual`, motivo: dinheiro(m.amount_charged_minor ?? m.annual_minor, m.currency), quem: str(m.switched_by) })
        break
      }
      case 'bulk_purchase_completed': {
        const c = num(m.credits_granted)
        if (c > 0) out.push({ em: e.created_at, tipo: 'pacote', creditos: c, rotulo: 'Pacote de créditos', motivo: dinheiro(m.amount_total, m.currency), quem: 'Stripe' })
        break
      }
      case 'admin_credits_granted': {
        const c = num(m.amount)
        if (c !== 0) out.push({ em: e.created_at, tipo: 'bonus', creditos: c, rotulo: str(m.campaign) ? `Bônus (${str(m.campaign)})` : 'Bônus do admin', motivo: str(m.reason), quem: str(m.granted_by) })
        break
      }
      default: {
        if (!(LEDGER_GRANT_EVENTS as readonly string[]).includes(e.name)) break
        if (e.name === 'free_weekly_film_grant_voided') {
          const ult = semanal.pop()
          if (typeof ult === 'number' && ult > 0) out.push({ em: e.created_at, tipo: 'presente', creditos: -ult, rotulo: 'Filme grátis da semana anulado', motivo: null, quem: 'sistema' })
          break
        }
        const d = ledgerGrantDelta(e.name, m)
        if (e.name === 'free_weekly_film_granted') semanal.push(d)
        if (d === 0) break
        const tipo: TipoConcessao = e.name === 'admin_courtesy_granted' ? 'cortesia' : d < 0 ? 'revogado' : 'presente'
        out.push({ em: e.created_at, tipo, creditos: d, rotulo: ROTULO_PRESENTE[e.name] ?? LEDGER_GRANT_LABEL[e.name] ?? e.name, motivo: str(m.reason), quem: str(m.granted_by) ?? (str(m.source) === 'admin' ? 'admin' : 'sistema') })
      }
    }
  }
  return out
}

export function debitosLidos(rows: readonly DebitoLido[]): Debito[] {
  return rows.map((d) => ({
    em: d.created_at,
    renderId: d.render_id,
    produto: produtoDoDebito(d.render_id),
    creditos: typeof d.amount === 'number' ? d.amount : 0,
    estornado: !!d.refunded_at,
    estornadoEm: d.refunded_at,
  }))
}

export type ResumoCreditos = {
  ganhou: number
  usou: number
  estornado: number
  saldo: number | null
  /** saldo real − (ganhou − usou): ≠ 0 = a conta não fecha com o que os eventos provam (compra antiga sem registro, trial sem evento…). */
  diferenca: number | null
  usouPorProduto: Array<{ produto: ProdutoDebito; creditos: number; vezes: number }>
  ganhouPorTipo: Array<{ tipo: TipoConcessao; creditos: number }>
  comprasSemRegistro: number
}

/**
 * ganhou = soma das concessões (positivas e retiradas) · usou = débitos NÃO estornados · estornado = débitos devolvidos.
 * O trial sem evento (contas antigas) entra pela coluna profiles.trial_credits_granted — e só quando nenhum evento de trial existe.
 */
export function resumoCreditos(concessoes: Concessao[], debitos: readonly Debito[], perfil: { saldo: number | null; trialGranted: number | null; cadastroEm: string }): { concessoes: Concessao[]; resumo: ResumoCreditos } {
  const lista = [...concessoes]
  if (!lista.some((c) => c.tipo === 'trial') && (perfil.trialGranted ?? 0) > 0) {
    lista.push({ em: perfil.cadastroEm, tipo: 'trial', creditos: perfil.trialGranted as number, rotulo: 'Trial (sem evento; profiles.trial_credits_granted)', motivo: null, quem: 'sistema' })
  }
  lista.sort((a, b) => (a.em < b.em ? 1 : -1))
  const ganhou = lista.reduce((s, c) => s + c.creditos, 0)
  const usados = debitos.filter((d) => !d.estornado)
  const usou = usados.reduce((s, d) => s + d.creditos, 0)
  const estornado = debitos.filter((d) => d.estornado).reduce((s, d) => s + d.creditos, 0)
  const porProduto = new Map<ProdutoDebito, { creditos: number; vezes: number }>()
  for (const d of usados) {
    const cur = porProduto.get(d.produto) ?? { creditos: 0, vezes: 0 }
    cur.creditos += d.creditos
    cur.vezes += 1
    porProduto.set(d.produto, cur)
  }
  const porTipo = new Map<TipoConcessao, number>()
  for (const c of lista) porTipo.set(c.tipo, (porTipo.get(c.tipo) ?? 0) + c.creditos)
  return {
    concessoes: lista,
    resumo: {
      ganhou,
      usou,
      estornado,
      saldo: perfil.saldo,
      diferenca: perfil.saldo === null ? null : perfil.saldo - (ganhou - usou),
      usouPorProduto: [...porProduto.entries()].map(([produto, v]) => ({ produto, ...v })).sort((a, b) => b.creditos - a.creditos),
      ganhouPorTipo: [...porTipo.entries()].map(([tipo, creditos]) => ({ tipo, creditos })).filter((x) => x.creditos !== 0),
      comprasSemRegistro: lista.filter((c) => c.semRegistro).length,
    },
  }
}

// ═══ COMPRAS ═══
export type TipoCompra = 'assinatura' | 'renovacao' | 'anual' | 'pacote' | 'tres_filmes' | 'teste_1' | 'falha_cartao' | 'cancelou' | 'checkout_aberto' | 'checkout_desistiu'
export type Compra = { em: string; tipo: TipoCompra; rotulo: string; valor: string | null; detalhe: string | null }
export type PedidoTresFilmes = { created_at: string; status: string | null; amount_total: number | null; currency: string | null; topic: string | null; paid_at: string | null; delivered_at: string | null }
export type AbandonoLido = { expired_at: string | null; tier: string | null; amount_total: number | null; currency: string | null; stripe_session_id: string | null }

const MOTIVO_RECUSA: Record<string, string> = {
  insufficient_funds: 'saldo insuficiente', card_declined: 'cartão recusado', generic_decline: 'cartão recusado', expired_card: 'cartão vencido',
  do_not_honor: 'banco recusou', lost_card: 'cartão perdido', stolen_card: 'cartão roubado', card_restricted: 'cartão restrito', currency_not_supported: 'moeda não aceita',
}

export type ResumoCompras = {
  itens: Compra[]
  pagamentos: number
  falhasCartao: number
  cancelamentos: number
  /** checkouts abertos de verdade: sessões DISTINTAS (stripe_session_id ou session_id do navegador) que não viraram pagamento. Evento sem user_id nunca chega aqui (convidado sem sessão = robô). */
  checkoutsSemPagar: number
  ultimoCheckout: string | null
}

export function montarCompras(eventos: readonly EventoPessoa[], abandonos: readonly AbandonoLido[], tresFilmes: readonly PedidoTresFilmes[]): ResumoCompras {
  const itens: Compra[] = []
  // Uma tentativa de compra = UMA sessão do navegador (checkout_attempted e checkout_started da mesma aba são a mesma
  // tentativa). Sem sessão do navegador, a sessão da Stripe. A tentativa que tem um payment_success não é "sem pagar".
  const pagas = new Set<string>()
  for (const e of eventos) if (e.name === 'payment_success') { const s = str(md(e).stripe_session_id); if (s) pagas.add(s); if (e.session_id) pagas.add(`sessao:${e.session_id}`) }
  const stripeDaSessao = new Map<string, Set<string>>()
  const chaveDoCheckout = (e: EventoPessoa): string | null => (e.session_id ? `sessao:${e.session_id}` : str(md(e).stripe_session_id))
  for (const e of eventos) {
    if (e.name !== 'checkout_started' && e.name !== 'checkout_attempted') continue
    const k = chaveDoCheckout(e)
    const s = str(md(e).stripe_session_id)
    if (!k || !s) continue
    const set = stripeDaSessao.get(k) ?? new Set<string>()
    set.add(s)
    stripeDaSessao.set(k, set)
  }
  const stripeVistas = new Set<string>([...stripeDaSessao.values()].flatMap((s) => [...s]))
  const foiPaga = (k: string) => pagas.has(k) || [...(stripeDaSessao.get(k) ?? [])].some((s) => pagas.has(s))
  const checkoutsVistos = new Map<string, string>() // chave → data
  let pagamentos = 0
  let falhasCartao = 0
  let cancelamentos = 0
  for (const e of eventos) {
    const m = md(e)
    switch (e.name) {
      case 'payment_success': {
        pagamentos += 1
        const dfy = str(m.dfy_tier) || str(m.kind) === 'dfy' || str(m.kind) === 'done_for_you'
        const tipo: TipoCompra = m.card_trial === true ? 'teste_1' : dfy ? 'tres_filmes' : str(m.pack) || str(m.checkout_mode) === 'payment' ? 'pacote' : m.billing === 'annual' ? 'anual' : 'assinatura'
        const rot = tipo === 'teste_1' ? `Teste de $1 · ${nomeDoPlano(m.tier)}` : tipo === 'tres_filmes' ? 'Pacote 3 filmes (feito pela equipe)' : tipo === 'pacote' ? `Pacote ${str(m.pack) ?? 'avulso'}` : `Assinou ${nomeDoPlano(m.tier)} ${m.billing === 'annual' ? 'anual' : 'mensal'}`
        itens.push({ em: e.created_at, tipo, rotulo: rot, valor: dinheiro(m.amount_total, m.currency), detalhe: m.intro === true ? '1º mês com desconto' : null })
        break
      }
      case 'subscription_invoice_paid':
        if (num(m.amount_paid) > 0) itens.push({ em: e.created_at, tipo: 'renovacao', rotulo: `Renovou ${nomeDoPlano(m.tier)}${m.trial_conversion === true ? ' (fim do teste de $1)' : ''}`, valor: dinheiro(m.amount_paid, m.currency), detalhe: str(m.billing_reason) })
        break
      case 'plan_switched_to_annual':
        itens.push({ em: e.created_at, tipo: 'anual', rotulo: `Trocou ${nomeDoPlano(m.tier)} para o ANUAL`, valor: dinheiro(m.amount_charged_minor ?? m.annual_minor, m.currency), detalhe: str(m.invoice_status) ? `fatura ${str(m.invoice_status)}` : null })
        break
      case 'checkout_payment_failed': {
        falhasCartao += 1
        const why = str(m.reason_category)
        itens.push({ em: e.created_at, tipo: 'falha_cartao', rotulo: m.is_renewal === true ? `Renovação recusada · ${nomeDoPlano(m.tier)}` : `Pagamento recusado · ${nomeDoPlano(m.tier)}`, valor: dinheiro(m.amount_minor, m.currency), detalhe: why ? MOTIVO_RECUSA[why] ?? why : null })
        break
      }
      case 'subscription_ended':
        cancelamentos += 1
        itens.push({ em: e.created_at, tipo: 'cancelou', rotulo: `Assinatura terminou · ${nomeDoPlano(m.tier)}`, valor: null, detalhe: str(m.reason) })
        break
      case 'checkout_cancelled':
        itens.push({ em: e.created_at, tipo: 'checkout_desistiu', rotulo: `Voltou do checkout sem pagar · ${nomeDoPlano(m.tier)}`, valor: null, detalhe: null })
        break
      case 'checkout_started':
      case 'checkout_attempted': {
        const chave = chaveDoCheckout(e)
        if (!chave || foiPaga(chave)) break // sem sessão nenhuma = não dá para provar que foi gente
        if (!checkoutsVistos.has(chave)) {
          checkoutsVistos.set(chave, e.created_at)
          itens.push({ em: e.created_at, tipo: 'checkout_aberto', rotulo: `Abriu checkout · ${nomeDoPlano(m.tier)} ${m.billing === 'annual' ? 'anual' : 'mensal'}`, valor: null, detalhe: null })
        }
        break
      }
    }
  }
  for (const a of abandonos) {
    const chave = a.stripe_session_id
    if (!chave || pagas.has(chave) || stripeVistas.has(chave) || checkoutsVistos.has(chave)) continue
    checkoutsVistos.set(chave, a.expired_at ?? '')
    itens.push({ em: a.expired_at ?? '', tipo: 'checkout_aberto', rotulo: `Checkout expirou sem pagar · ${nomeDoPlano(a.tier)}`, valor: dinheiro(a.amount_total, a.currency), detalhe: 'checkout_abandoned' })
  }
  for (const p of tresFilmes) {
    itens.push({ em: p.paid_at ?? p.created_at, tipo: 'tres_filmes', rotulo: `Pedido 3 filmes · ${p.status ?? '—'}`, valor: dinheiro(p.amount_total, p.currency), detalhe: p.topic ? p.topic.slice(0, 80) : null })
  }
  itens.sort((a, b) => (a.em < b.em ? 1 : -1))
  const datas = [...checkoutsVistos.values()].filter(Boolean).sort()
  return { itens, pagamentos, falhasCartao, cancelamentos, checkoutsSemPagar: checkoutsVistos.size, ultimoCheckout: datas[datas.length - 1] ?? null }
}

// ═══ LINHA DO TEMPO ═══
export type TomItem = 'marco' | 'erro' | 'dinheiro' | 'normal'
export type ItemLinha = { em: string; rotulo: string; tom: TomItem; detalhe: string | null }
export type DiaLinha = { dia: string; itens: ItemLinha[]; outras: number }

/** Rótulo em português + tom de um evento; null = não entra na linha. */
export function rotuloDoEvento(e: EventoPessoa): { rotulo: string; tom: TomItem; detalhe: string | null } | null {
  const m = md(e)
  switch (e.name) {
    case 'email_signup_completed': case 'organic_signup_completed': return { rotulo: 'Cadastrou', tom: 'marco', detalhe: str(m.utm_source) ?? str(m.intent_campaign) }
    case 'auth_callback_completed': return { rotulo: 'Entrou (login)', tom: 'normal', detalhe: null }
    case 'trial_credits_granted': return { rotulo: `Ganhou o trial (+${num(m.credits)} cr)`, tom: 'dinheiro', detalhe: null }
    case 'trial_downgraded': return { rotulo: 'Trial acabou', tom: 'normal', detalhe: num(m.credits_revoked) ? `${num(m.credits_revoked)} cr recolhidos` : null }
    case 'trial_converted': return { rotulo: 'Trial virou assinatura', tom: 'dinheiro', detalhe: null }
    case 'mrr_studio_viewed': return { rotulo: 'Abriu o Studio', tom: 'normal', detalhe: null }
    case 'mrr_idea_entered': return { rotulo: 'Escreveu uma ideia', tom: 'normal', detalhe: null }
    case 'generate_started': case 'video_generation_started': return { rotulo: 'Começou um filme', tom: 'normal', detalhe: str(m.quality) ?? str(m.mode) }
    case 'generate_completed': case 'video_generation_completed': return { rotulo: 'Filme pronto', tom: 'marco', detalhe: str(m.quality) ?? str(m.mode) }
    case 'generation_stage_error': return { rotulo: 'Erro na geração', tom: 'erro', detalhe: (str(m.error) ?? '(sem texto de erro)').replace(/\s+/g, ' ').slice(0, 180) }
    case 'video_downloaded': return { rotulo: 'Baixou um vídeo', tom: 'marco', detalhe: str(m.device) }
    case 'video_rated': return { rotulo: `Deu nota ${num(m.rating)} ao vídeo`, tom: 'marco', detalhe: str(m.video_title) }
    case 'film_feedback': return { rotulo: `Opinou sobre o filme: ${str(m.verdict) === 'up' ? '👍' : str(m.verdict) === 'down' ? '👎' : str(m.verdict) ?? '—'}`, tom: 'marco', detalhe: str(m.reason) }
    case 'ads_page_viewed': return { rotulo: 'Abriu o Studio Ads', tom: 'normal', detalhe: null }
    case 'ads_v2_order_created': return { rotulo: 'Criou um pedido de anúncio', tom: 'normal', detalhe: str(m.tier) }
    case 'ads_v2_started': return { rotulo: 'Anúncio em produção', tom: 'normal', detalhe: null }
    case 'ads_v2_delivered': return { rotulo: 'Anúncio entregue', tom: 'marco', detalhe: null }
    case 'ads_v2_failed': return { rotulo: 'Anúncio falhou', tom: 'erro', detalhe: str(m.error) ?? str(m.reason) }
    case 'clip_generate_clicked': return { rotulo: 'Pediu um clipe/efeito', tom: 'normal', detalhe: str(m.effect) ?? str(m.engine) }
    case 'clip_completed': return { rotulo: 'Clipe pronto', tom: 'marco', detalhe: null }
    case 'next_episode_requested': return { rotulo: 'Pediu o próximo episódio', tom: 'normal', detalhe: null }
    case 'pricing_view': return { rotulo: 'Viu os preços', tom: 'normal', detalhe: null }
    case 'upgrade_modal_opened': return { rotulo: 'Abriu a janela de upgrade', tom: 'normal', detalhe: null }
    case 'checkout_started': case 'checkout_attempted': return { rotulo: `Abriu o checkout · ${nomeDoPlano(m.tier)}`, tom: 'dinheiro', detalhe: m.billing === 'annual' ? 'anual' : null }
    case 'checkout_cancelled': return { rotulo: 'Voltou do checkout sem pagar', tom: 'normal', detalhe: null }
    case 'checkout_payment_failed': return { rotulo: m.is_renewal === true ? 'Renovação recusada' : 'Cartão recusado', tom: 'erro', detalhe: str(m.reason_category) ? MOTIVO_RECUSA[str(m.reason_category) as string] ?? str(m.reason_category) : null }
    case 'payment_success': return { rotulo: `PAGOU · ${str(m.pack) ? `pacote ${str(m.pack)}` : nomeDoPlano(m.tier)}`, tom: 'dinheiro', detalhe: dinheiro(m.amount_total, m.currency) }
    case 'subscription_invoice_paid': return { rotulo: `Renovou · ${nomeDoPlano(m.tier)}`, tom: 'dinheiro', detalhe: dinheiro(m.amount_paid, m.currency) }
    case 'plan_switched_to_annual': return { rotulo: 'Virou ANUAL', tom: 'dinheiro', detalhe: dinheiro(m.amount_charged_minor ?? m.annual_minor, m.currency) }
    case 'subscription_ended': return { rotulo: 'Assinatura terminou', tom: 'erro', detalhe: str(m.reason) }
    case 'admin_credits_granted': return { rotulo: `+${num(m.amount)} cr do admin`, tom: 'dinheiro', detalhe: str(m.reason) }
    case 'admin_courtesy_granted': return { rotulo: `Cortesia ${str(m.level) ?? ''} (+${num(m.credits)} cr)`, tom: 'dinheiro', detalhe: str(m.reason) }
    case 'credits_refunded': return { rotulo: `Estorno +${num(m.amount)} cr`, tom: 'dinheiro', detalhe: str(m.reason) }
    case 'winback25_sent': return { rotulo: 'Recebeu o e-mail de volta (+25 cr)', tom: 'dinheiro', detalhe: null }
    case 'winback_film_60s_claimed': return { rotulo: 'Entrou na carta do filme de 60 s', tom: 'normal', detalhe: null }
    case 'affiliate_signup_attribution_result': return { rotulo: `Atribuição de afiliado: ${str(m.outcome) ?? '—'}`, tom: 'marco', detalhe: str(m.referrer_host) }
    default: {
      if ((LEDGER_GRANT_EVENTS as readonly string[]).includes(e.name)) {
        const d = ledgerGrantDelta(e.name, m)
        return d ? { rotulo: `${ROTULO_PRESENTE[e.name] ?? e.name} (${d > 0 ? '+' : ''}${d} cr)`, tom: 'dinheiro', detalhe: str(m.reason) } : null
      }
      return null
    }
  }
}

const DIA_BRT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
export function diaBrt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : DIA_BRT.format(d)
}

/**
 * Agrupa por dia (Brasília), mais novo primeiro. Eventos iguais seguidos no mesmo dia viram 1 linha "×N". Os eventos que não
 * são marco nem ruído contam em "outras ações" do dia. Duplicatas (o mesmo id lido por duas consultas) contam uma vez.
 */
export function montarLinhaDoTempo(chave: readonly EventoPessoa[], recentes: readonly EventoPessoa[], maxDias = DIAS_NA_LINHA): DiaLinha[] {
  const vistos = new Set<string>()
  const unicos: EventoPessoa[] = []
  for (const e of [...chave, ...recentes]) {
    const k = e.id ? `id:${e.id}` : `${e.name}|${e.created_at}`
    if (vistos.has(k)) continue
    vistos.add(k)
    unicos.push(e)
  }
  unicos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const dias = new Map<string, DiaLinha>()
  for (const e of unicos) {
    const dia = diaBrt(e.created_at)
    const cur = dias.get(dia) ?? { dia, itens: [], outras: 0 }
    dias.set(dia, cur)
    const r = rotuloDoEvento(e)
    if (!r) { if (!ehRuido(e.name)) cur.outras += 1; continue }
    const ult = cur.itens[cur.itens.length - 1] as (ItemLinha & { vezes?: number; nome?: string; ultimoEm?: string }) | undefined
    // o mesmo fato gravado por dois nomes (generate_started + video_generation_started, …) em até 2 min = UMA vez
    if (ult && ult.rotulo === r.rotulo && ult.nome !== e.name && Math.abs(Date.parse(ult.ultimoEm ?? ult.em) - Date.parse(e.created_at)) <= 120_000) continue
    if (ult && ult.rotulo === r.rotulo && ult.tom !== 'erro' && ult.tom !== 'dinheiro') { ult.vezes = (ult.vezes ?? 1) + 1; ult.ultimoEm = e.created_at; continue }
    cur.itens.push({ em: e.created_at, ...r, nome: e.name, ultimoEm: e.created_at } as ItemLinha)
  }
  return [...dias.values()].slice(0, maxDias).map((d) => ({ ...d, itens: d.itens.map((i) => { const v = (i as ItemLinha & { vezes?: number }).vezes; return { em: i.em, rotulo: v && v > 1 ? `${i.rotulo} ×${v}` : i.rotulo, tom: i.tom, detalhe: i.detalhe } }) }))
}

// ═══ Dispositivo / idioma — o que os eventos da pessoa disserem (nunca adivinhado) ═══
export function dispositivoEIdioma(eventos: readonly EventoPessoa[]): { dispositivo: string | null; idioma: string | null } {
  let mobile = 0
  let desktop = 0
  const idiomas = new Map<string, number>()
  for (const e of eventos) {
    const m = md(e)
    const dev = str(m.device)?.toLowerCase()
    const vw = num(m.viewport_w)
    if (dev === 'mobile' || (vw > 0 && vw < 768)) mobile += 1
    else if (dev === 'desktop' || vw >= 768) desktop += 1
    const l = str(m.language)?.toLowerCase()
    if (l && l.length <= 8) idiomas.set(l, (idiomas.get(l) ?? 0) + 1)
  }
  const dispositivo = mobile === 0 && desktop === 0 ? null : mobile >= desktop ? (desktop > 0 ? 'celular (às vezes computador)' : 'celular') : mobile > 0 ? 'computador (às vezes celular)' : 'computador'
  const idioma = [...idiomas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { dispositivo, idioma }
}

// ═══ Status de cada entrega ═══
export type StatusItem = 'entregue' | 'falhou' | 'estornado' | 'fazendo' | 'rascunho' | 'cobrado_sem_entrega'
export const ROTULO_STATUS: Record<StatusItem, string> = { entregue: 'entregue', falhou: 'falhou', estornado: 'falhou · estornado', fazendo: 'fazendo', rascunho: 'parou no rascunho', cobrado_sem_entrega: 'cobrado sem entrega' }

export function statusDoVideo(status: string | null | undefined, estornado: boolean): StatusItem {
  const s = (status ?? '').toLowerCase()
  if (estornado) return 'estornado'
  if (s === 'completed' || s === 'ready' || s === 'done') return 'entregue'
  if (s === 'failed' || s === 'cancelled' || s === 'canceled') return 'falhou'
  return 'fazendo'
}
export function statusDoPedidoAds(status: string | null | undefined, estornado: boolean): StatusItem {
  const s = (status ?? '').toLowerCase()
  if (s === 'delivered') return 'entregue'
  if (s === 'failed') return estornado ? 'estornado' : 'falhou'
  if (s === 'generating' || s === 'assembling' || s === 'started' || s === 'rendering') return 'fazendo'
  return 'rascunho'
}
export function statusDoClipe(status: string | null | undefined, refundedCredits: number | null | undefined): StatusItem {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed' || s === 'succeeded' || s === 'done' || s === 'delivered') return 'entregue'
  if ((refundedCredits ?? 0) > 0) return 'estornado'
  if (s === 'failed' || s === 'error') return 'falhou'
  return 'fazendo'
}

/**
 * Filmes cobrados e DEVOLVIDOS: a tentativa que falhou e foi estornada. (videos.render_id é o id da montagem, não o do débito
 * — medido em 19/10 —, então "cobrado sem vídeo" não se casa por id; o estorno é o fato que o razão prova.)
 */
export function filmesEstornados(debitos: readonly Debito[]): Debito[] {
  return debitos.filter((d) => d.produto === 'filme' && d.estornado)
}

// ═══ Juiz dos anúncios — o veredito por plano que o avanço grava (ads_v2_product_locked); por pedido: aprovados/julgados ═══
export type JuizAnuncio = { julgados: number; aprovados: number; recusados: number }
export function juizPorPedido(eventos: readonly EventoPessoa[]): Map<string, JuizAnuncio> {
  const ultimoPorPlano = new Map<string, { pedido: string; ok: boolean | null; em: string }>()
  for (const e of eventos) {
    if (e.name !== 'ads_v2_product_locked') continue
    const m = md(e)
    const pedido = str(m.order_id)
    if (!pedido) continue
    const plano = `${pedido}|${num(m.idx)}`
    const v = m.verdict && typeof m.verdict === 'object' ? (m.verdict as Record<string, unknown>) : null
    const ok = v && typeof v.ok === 'boolean' ? (v.ok as boolean) : str(m.why) ? !/fail|reject|recus/i.test(String(m.why)) : null
    const cur = ultimoPorPlano.get(plano)
    if (!cur || e.created_at > cur.em) ultimoPorPlano.set(plano, { pedido, ok, em: e.created_at })
  }
  const out = new Map<string, JuizAnuncio>()
  for (const { pedido, ok } of ultimoPorPlano.values()) {
    const cur = out.get(pedido) ?? { julgados: 0, aprovados: 0, recusados: 0 }
    if (ok === null) continue
    cur.julgados += 1
    if (ok) cur.aprovados += 1
    else cur.recusados += 1
    out.set(pedido, cur)
  }
  return out
}
