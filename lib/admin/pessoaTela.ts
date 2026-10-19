// KINEO-ADMIN-PESSOA-1910 — leitura da TELA DA PESSOA (/admin/people/[id]). SÓ LEITURA: nenhum insert/update/upsert/delete/rpc,
// nenhum juiz que grava nota (a nota de coerência é LIDA do evento fast_coherence; quem julga é o /admin/coerencia).
//
// Quem chama já passou pelo portão isAdminEmail no servidor e entrega o cliente service role (que nunca vai ao navegador).
// Desempenho: 1 leitura do perfil e, depois, todas as consultas EM PARALELO, cada uma com user_id (índices
// events_user_created_idx, credit_debits_user_idx, ads_v2_orders_user_created_idx, clips_user_created_idx, images/audios
// _user_created_idx, videos_user_id_idx) e um teto abaixo de 1.000 (lib/admin/pessoaTelaRegras.ts). O único .in() é o de
// nomes de evento (lista fixa do código) — nunca uma lista de ids.
//
// De onde vem cada dado:
//   quem ............ profiles (+ lib/acquisitionSource para a origem; lib/internalAccounts para "conta interna")
//   mensal/anual .... payment_success / subscription_invoice_paid / plan_switched_to_annual pela régua única
//                     (app/api/admin/_shared/mrr.ts paidMonthlyUsdByUser) — profiles.plan não distingue
//   afiliado ........ affiliates (user_id ou e-mail) + affiliate_clicks (count) + affiliate_referrals + affiliate_commissions
//   veio de afiliado  affiliate_referrals.referred_user_id + profiles.affiliate_id + evento affiliate_signup_attribution_result
//   créditos ........ eventos que provam concessão (trial, plano, renovação, anual, pacote, admin_credits_granted com motivo e
//                     quem deu, presentes de lib/admin/ledgerGrants) × credit_debits (estornado = refunded_at)
//   compras ......... payment_success, renovações, recusas, subscription_ended, checkouts por sessão, checkout_abandoned,
//                     done_for_you_orders (pacote 3 filmes)
//   o que fez ....... events da pessoa (marcos + os mais recentes) agrupados por dia
//   vídeos .......... videos (filmes), ads_v2_orders (+ vídeo entregue), clips, images, audios; nota = fast_coherence da
//                     versão vigente (a do /admin/coerencia); anúncio = juiz do produto (ads_v2_product_locked)
import type { SupabaseClient } from '@supabase/supabase-js'
import { AI_ASSISTANT_LIKELY_SOURCE, acquisitionSource } from '@/lib/acquisitionSource'
import { FAST_COHERENCE_EVENT, FAST_COHERENCE_VERSION } from '@/lib/fastCoherence'
import { isInternalEmail } from '@/lib/internalAccounts'
import { ENGINE_LABEL } from '@/lib/admin/fastCoherence'
import { MRR_PAID_EVENT_NAMES, isPayingPlan, paidMonthlyUsdByUser, planLabel, type PaidBilling } from '@/app/api/admin/_shared/mrr'
import {
  ANUNCIOS_MAX,
  AUDIOS_MAX,
  CLIPES_MAX,
  DEBITOS_MAX,
  EVENTOS_DINHEIRO,
  EVENTOS_DINHEIRO_MAX,
  EVENTOS_LINHA,
  EVENTOS_LINHA_MAX,
  EVENTOS_RECENTES_MAX,
  IMAGENS_MAX,
  JUIZ_ADS_MAX,
  NOTAS_MAX,
  VIDEOS_MAX,
  concessoesDosEventos,
  debitosLidos,
  dispositivoEIdioma,
  juizPorPedido,
  montarCompras,
  montarLinhaDoTempo,
  resumoCreditos,
  statusDoClipe,
  statusDoPedidoAds,
  statusDoVideo,
  filmesEstornados,
  type AbandonoLido,
  type Concessao,
  type Debito,
  type DebitoLido,
  type DiaLinha,
  type EventoPessoa,
  type JuizAnuncio,
  type PedidoTresFilmes,
  type ResumoCompras,
  type ResumoCreditos,
  type StatusItem,
} from '@/lib/admin/pessoaTelaRegras'

export type NotaFilme = { score: number; verdict: string }
export type FilmePessoa = { id: string; em: string; motor: string; segundos: number | null; creditos: number | null; status: StatusItem; url: string | null; thumb: string | null; tema: string | null; nota: NotaFilme | null; opiniao: 'up' | 'down' | null }
export type AnuncioPessoa = { id: string; em: string; status: StatusItem; statusBruto: string; degrau: string | null; segundos: number | null; creditos: number | null; setor: string | null; url: string | null; thumb: string | null; erro: string | null; juiz: JuizAnuncio | null }
export type ClipePessoa = { id: string; em: string; motor: string; segundos: number | null; creditos: number | null; status: StatusItem; url: string | null; prompt: string | null; erro: string | null }
export type ImagemPessoa = { id: string; em: string; modelo: string | null; url: string | null }
export type AudioPessoa = { id: string; em: string; modelo: string | null; url: string | null; segundos: number | null }
export type AfiliadoInfo = { id: string; codigo: string | null; nome: string | null; status: string | null; tipo: string | null; comissao: number | null; cupom: string | null; desde: string | null; cliques: number | null; ultimoClique: string | null; cadastros: Array<{ email: string | null; status: string | null; em: string | null; converteu: string | null }>; cadastrosTotal: number | null; comissoes: { total: number; pagas: number; pendentes: number; moeda: string | null; n: number } }
export type VeioDeAfiliado = { afiliado: { id: string; codigo: string | null; nome: string | null; email: string | null } | null; registro: string; em: string | null }
export type Cortesia = { nivel: string | null; creditos: number | null; inicio: string | null; fim: string | null; status: string | null; motivo: string | null; quem: string | null }

export type TelaPessoa = {
  id: string
  email: string
  nome: string | null
  plano: string | null
  planoRotulo: string
  cobranca: PaidBilling | null
  pagante: boolean
  jaPagou: boolean
  interna: boolean
  cadastroEm: string
  pais: string | null
  paisUltimo: string | null
  origem: { fonte: string; iaProvavel: boolean; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referrer: string | null; superficie: string | null; gclid: boolean }
  dispositivo: string | null
  idioma: string | null
  trial: { status: string | null; ganhou: number | null; usou: number | null; fim: string | null }
  planoVence: string | null
  afiliado: AfiliadoInfo[]
  veioDeAfiliado: VeioDeAfiliado[]
  indicadoPor: { id: string; email: string | null } | null
  cortesias: Cortesia[]
  creditos: { resumo: ResumoCreditos; concessoes: Concessao[]; debitos: Debito[]; debitosTruncados: boolean }
  compras: ResumoCompras
  linha: DiaLinha[]
  filmes: FilmePessoa[]
  filmesTotal: number
  filmesEstornados: Debito[]
  anuncios: AnuncioPessoa[]
  anunciosTotal: number
  clipes: ClipePessoa[]
  clipesTotal: number
  imagens: ImagemPessoa[]
  imagensTotal: number
  audios: AudioPessoa[]
  audiosTotal: number
  geradoEm: string
  erros: string[]
}

type Perfil = {
  id: string; email: string | null; name: string | null; plan: string | null; has_paid: boolean | null; video_credits: number | null; created_at: string
  signup_country: string | null; last_country: string | null; signup_utm_source: string | null; signup_utm_medium: string | null; signup_utm_campaign: string | null
  signup_referrer: string | null; utm_source: string | null; signup_surface: string | null; gclid: string | null
  trial_status: string | null; trial_credits_granted: number | null; trial_credits_used: number | null; trial_ends_at: string | null; plan_expires_at: string | null
  referred_by: string | null; affiliate_id: string | null
}
const PERFIL_COLS = 'id, email, name, plan, has_paid, video_credits, created_at, signup_country, last_country, signup_utm_source, signup_utm_medium, signup_utm_campaign, signup_referrer, utm_source, signup_surface, gclid, trial_status, trial_credits_granted, trial_credits_used, trial_ends_at, plan_expires_at, referred_by, affiliate_id'
const EVENTO_COLS = 'id, name, created_at, session_id, path, metadata'
const AFILIADO_COLS = 'id, user_id, email, name, code, commission_rate, coupon_code, status, partner_type, created_at'

type Resp<T> = { data: T | null; error: { message: string } | null; count?: number | null }

/** Carrega a tela inteira de UMA pessoa. `chave` vem de lerChavePessoa (id uuid ou e-mail). null = pessoa não existe. */
export async function carregarTelaPessoa(admin: SupabaseClient, chave: { id: string } | { email: string }, agora: Date = new Date()): Promise<TelaPessoa | null> {
  const erros: string[] = []
  const ok = <T,>(rotulo: string, r: Resp<T>): T | null => {
    if (r.error) erros.push(`${rotulo}: ${r.error.message}`)
    return r.data
  }
  const base = admin.from('profiles').select(PERFIL_COLS)
  const perfilR = (await ('id' in chave ? base.eq('id', chave.id) : base.eq('email', chave.email)).limit(1).maybeSingle()) as Resp<Perfil>
  if (perfilR.error) throw new Error(`profiles: ${perfilR.error.message}`)
  const p = perfilR.data
  if (!p) return null
  const uid = p.id
  const email = (p.email ?? '').trim().toLowerCase()

  const evs = (nomes: readonly string[], max: number) =>
    admin.from('events').select(EVENTO_COLS).eq('user_id', uid).in('name', [...nomes]).order('created_at', { ascending: false }).limit(max)

  const [
    dinheiroR, linhaR, recentesR, debitosR, filmesR, anunciosR, clipesR, imagensR, audiosR, notasR, juizR,
    afPorUserR, afPorEmailR, referidoR, cortesiaR, abandonoR, tresFilmesR, mrrR,
  ] = await Promise.all([
    evs(EVENTOS_DINHEIRO, EVENTOS_DINHEIRO_MAX),
    evs([...EVENTOS_LINHA, 'film_feedback'], EVENTOS_LINHA_MAX),
    admin.from('events').select(EVENTO_COLS).eq('user_id', uid).order('created_at', { ascending: false }).limit(EVENTOS_RECENTES_MAX),
    admin.from('credit_debits').select('render_id, kind, amount, created_at, refunded_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(DEBITOS_MAX),
    admin.from('videos').select('id, created_at, quality_mode, duration, credits_used, status, video_url, thumbnail_url, topic', { count: 'exact' }).eq('user_id', uid)
      .or('quality_mode.is.null,quality_mode.not.in.(ads_v2,clip)').order('created_at', { ascending: false }).limit(VIDEOS_MAX),
    admin.from('ads_v2_orders').select('id, created_at, status, tier, seconds, sector, card_url, video_id, error, credits_charged, billing_ref', { count: 'exact' }).eq('user_id', uid).order('created_at', { ascending: false }).limit(ANUNCIOS_MAX),
    admin.from('clips').select('id, created_at, engine, model, mode, seconds, credits, credits_refunded, status, video_url, prompt, failure_reason', { count: 'exact' }).eq('user_id', uid).order('created_at', { ascending: false }).limit(CLIPES_MAX),
    admin.from('images').select('id, created_at, model, url, upscaled_url', { count: 'exact' }).eq('user_id', uid).order('created_at', { ascending: false }).limit(IMAGENS_MAX),
    admin.from('audios').select('id, created_at, model, url, duration_ms', { count: 'exact' }).eq('user_id', uid).order('created_at', { ascending: false }).limit(AUDIOS_MAX),
    admin.from('events').select('created_at, metadata').eq('user_id', uid).eq('name', FAST_COHERENCE_EVENT).order('created_at', { ascending: false }).limit(NOTAS_MAX),
    admin.from('events').select('name, created_at, metadata').eq('user_id', uid).eq('name', 'ads_v2_product_locked').order('created_at', { ascending: false }).limit(JUIZ_ADS_MAX),
    admin.from('affiliates').select(AFILIADO_COLS).eq('user_id', uid).limit(5),
    email ? admin.from('affiliates').select(AFILIADO_COLS).eq('email', email).limit(5) : Promise.resolve({ data: [], error: null }),
    admin.from('affiliate_referrals').select('affiliate_id, status, first_touch_at, converted_at').eq('referred_user_id', uid).limit(5),
    admin.from('courtesy_grants').select('level, credits_granted, starts_at, ends_at, status, reason, granted_by, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    admin.from('checkout_abandoned').select('expired_at, tier, amount_total, currency, stripe_session_id').eq('user_id', uid).order('expired_at', { ascending: false }).limit(50),
    admin.from('done_for_you_orders').select('created_at, status, amount_total, currency, topic, paid_at, delivered_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    evs(MRR_PAID_EVENT_NAMES, 200),
  ])

  const dinheiroEv = (ok('events(dinheiro)', dinheiroR as Resp<EventoPessoa[]>) ?? [])
  const linhaEv = (ok('events(linha)', linhaR as Resp<EventoPessoa[]>) ?? [])
  const recentesEv = (ok('events(recentes)', recentesR as Resp<EventoPessoa[]>) ?? [])

  // ── afiliado: a pessoa É afiliada? (user_id ou o mesmo e-mail) ──
  const afRows = new Map<string, Record<string, unknown>>()
  for (const r of [...(ok('affiliates', afPorUserR as Resp<Record<string, unknown>[]>) ?? []), ...(ok('affiliates(email)', afPorEmailR as Resp<Record<string, unknown>[]>) ?? [])]) afRows.set(String(r.id), r)
  const afiliado: AfiliadoInfo[] = await Promise.all([...afRows.values()].map(async (a) => {
    const aid = String(a.id)
    const [cliquesR, ultimoR, refsR, comR] = await Promise.all([
      admin.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', aid),
      admin.from('affiliate_clicks').select('created_at').eq('affiliate_id', aid).order('created_at', { ascending: false }).limit(1),
      admin.from('affiliate_referrals').select('email, status, first_touch_at, converted_at', { count: 'exact' }).eq('affiliate_id', aid).order('first_touch_at', { ascending: false }).limit(50),
      admin.from('affiliate_commissions').select('commission_amount, currency, status').eq('affiliate_id', aid).limit(200),
    ])
    if (cliquesR.error) erros.push(`affiliate_clicks: ${cliquesR.error.message}`)
    const refs = (ok('affiliate_referrals', refsR as Resp<Array<{ email: string | null; status: string | null; first_touch_at: string | null; converted_at: string | null }>>) ?? [])
    const com = (ok('affiliate_commissions', comR as Resp<Array<{ commission_amount: number | null; currency: string | null; status: string | null }>>) ?? [])
    const soma = (f: (c: { status: string | null }) => boolean) => com.filter(f).reduce((s, c) => s + (typeof c.commission_amount === 'number' ? c.commission_amount : 0), 0)
    return {
      id: aid,
      codigo: (a.code as string | null) ?? null,
      nome: (a.name as string | null) ?? null,
      status: (a.status as string | null) ?? null,
      tipo: (a.partner_type as string | null) ?? null,
      comissao: typeof a.commission_rate === 'number' ? (a.commission_rate as number) : a.commission_rate != null ? Number(a.commission_rate) : null,
      cupom: (a.coupon_code as string | null) ?? null,
      desde: (a.created_at as string | null) ?? null,
      cliques: typeof cliquesR.count === 'number' ? cliquesR.count : null,
      ultimoClique: ((ultimoR.data ?? [])[0] as { created_at?: string } | undefined)?.created_at ?? null,
      cadastros: refs.map((r) => ({ email: r.email, status: r.status, em: r.first_touch_at, converteu: r.converted_at })),
      cadastrosTotal: typeof refsR.count === 'number' ? refsR.count : refs.length,
      comissoes: { total: soma(() => true), pagas: soma((c) => c.status === 'paid'), pendentes: soma((c) => c.status !== 'paid'), moeda: com[0]?.currency ?? null, n: com.length },
    }
  }))

  // ── veio de link de afiliado? (o registro da atribuição, de qualquer uma das três fontes) ──
  const referidos = (ok('affiliate_referrals(veio)', referidoR as Resp<Array<{ affiliate_id: string; status: string | null; first_touch_at: string | null; converted_at: string | null }>>) ?? [])
  const atribuicoes = dinheiroEv.filter((e) => e.name === 'affiliate_signup_attribution_result')
  const idsAf = Array.from(new Set([...referidos.map((r) => r.affiliate_id), p.affiliate_id, ...atribuicoes.map((e) => (e.metadata as { affiliate_id?: string } | null)?.affiliate_id ?? null)].filter((x): x is string => typeof x === 'string' && x.length > 0))).slice(0, 5)
  const afDeOrigem = new Map<string, { id: string; codigo: string | null; nome: string | null; email: string | null }>()
  if (idsAf.length > 0) {
    const r = (await admin.from('affiliates').select('id, code, name, email').in('id', idsAf).limit(5)) as Resp<Array<{ id: string; code: string | null; name: string | null; email: string | null }>>
    for (const a of ok('affiliates(origem)', r) ?? []) afDeOrigem.set(a.id, { id: a.id, codigo: a.code, nome: a.name, email: a.email })
  }
  const veioDeAfiliado: VeioDeAfiliado[] = [
    ...referidos.map((r) => ({ afiliado: afDeOrigem.get(r.affiliate_id) ?? { id: r.affiliate_id, codigo: null, nome: null, email: null }, registro: `affiliate_referrals (${r.status ?? '—'}${r.converted_at ? ', converteu' : ''})`, em: r.first_touch_at })),
    ...(p.affiliate_id && !referidos.some((r) => r.affiliate_id === p.affiliate_id) ? [{ afiliado: afDeOrigem.get(p.affiliate_id) ?? { id: p.affiliate_id, codigo: null, nome: null, email: null }, registro: 'profiles.affiliate_id', em: null }] : []),
    // o evento de atribuição entra quando conta algo que as tabelas não contam (outro afiliado, ou não atribuiu e por quê)
    ...atribuicoes.filter((e) => { const m = (e.metadata ?? {}) as { affiliate_id?: string; outcome?: string }; return m.outcome !== 'attributed' || !referidos.some((r) => r.affiliate_id === m.affiliate_id) }).map((e) => {
      const m = (e.metadata ?? {}) as { affiliate_id?: string; outcome?: string; referrer_host?: string }
      return { afiliado: m.affiliate_id ? afDeOrigem.get(m.affiliate_id) ?? { id: m.affiliate_id, codigo: null, nome: null, email: null } : null, registro: `evento de atribuição: ${m.outcome ?? '—'}${m.referrer_host ? ` · ${m.referrer_host}` : ''}`, em: e.created_at }
    }),
  ]
  let indicadoPor: TelaPessoa['indicadoPor'] = null
  if (p.referred_by) {
    const r = (await admin.from('profiles').select('id, email').eq('id', p.referred_by).limit(1).maybeSingle()) as Resp<{ id: string; email: string | null }>
    const d = ok('profiles(indicou)', r)
    indicadoPor = { id: p.referred_by, email: d?.email ?? null }
  }

  // ── créditos ──
  const debRows = (ok('credit_debits', debitosR as Resp<DebitoLido[]>) ?? [])
  const debitos = debitosLidos(debRows)
  const { concessoes, resumo } = resumoCreditos(concessoesDosEventos(dinheiroEv), debitos, { saldo: p.video_credits, trialGranted: p.trial_credits_granted, cadastroEm: p.created_at })

  // ── compras ──
  const compras = montarCompras(dinheiroEv, (ok('checkout_abandoned', abandonoR as Resp<AbandonoLido[]>) ?? []), (ok('done_for_you_orders', tresFilmesR as Resp<PedidoTresFilmes[]>) ?? []))
  const pagos = paidMonthlyUsdByUser(((ok('events(mrr)', mrrR as Resp<EventoPessoa[]>) ?? [])).map((e) => ({ user_id: uid, name: e.name, created_at: e.created_at, metadata: e.metadata ?? null })))
  const cobranca = pagos.get(uid)?.billing ?? null

  // ── nota de coerência por vídeo (versão vigente; a mais recente vence) ──
  const notaPorVideo = new Map<string, NotaFilme>()
  for (const n of (ok('fast_coherence', notasR as Resp<Array<{ metadata: Record<string, unknown> | null }>>) ?? [])) {
    const m = n.metadata ?? {}
    const vid = typeof m.video_id === 'string' ? m.video_id : null
    if (!vid || m.version !== FAST_COHERENCE_VERSION || notaPorVideo.has(vid)) continue
    const score = typeof m.score === 'number' ? m.score : Number(m.score)
    if (Number.isFinite(score)) notaPorVideo.set(vid, { score: Math.round(score), verdict: typeof m.verdict === 'string' ? m.verdict : '' })
  }
  // opinião da própria pessoa (film_feedback grava session_id = video_id)
  const opiniao = new Map<string, 'up' | 'down'>()
  for (const e of linhaEv) {
    if (e.name !== 'film_feedback' || !e.session_id || opiniao.has(e.session_id)) continue
    const v = (e.metadata as { verdict?: string } | null)?.verdict
    if (v === 'up' || v === 'down') opiniao.set(e.session_id, v)
  }

  const estornadoPorRender = new Map(debitos.map((d) => [d.renderId, d.estornado]))
  type FilmeRow = { id: string; created_at: string; quality_mode: string | null; duration: number | null; credits_used: number | null; status: string | null; video_url: string | null; thumbnail_url: string | null; topic: string | null }
  const filmeRows = (ok('videos', filmesR as Resp<FilmeRow[]>) ?? [])
  const filmes: FilmePessoa[] = filmeRows.map((v) => ({
    id: v.id,
    em: v.created_at,
    motor: v.quality_mode ? ENGINE_LABEL[v.quality_mode] ?? v.quality_mode : '—',
    segundos: v.duration,
    creditos: v.credits_used,
    status: statusDoVideo(v.status, false),
    url: v.video_url,
    thumb: v.thumbnail_url,
    tema: typeof v.topic === 'string' ? v.topic.replace(/\s+/g, ' ').trim().slice(0, 140) : null,
    nota: notaPorVideo.get(v.id) ?? null,
    opiniao: opiniao.get(v.id) ?? null,
  }))

  // ── anúncios (Studio Ads v2) com o vídeo entregue e o juiz do produto ──
  type AnuncioRow = { id: string; created_at: string; status: string | null; tier: string | null; seconds: number | null; sector: string | null; card_url: string | null; video_id: string | null; error: string | null; credits_charged: number | null; billing_ref: string | null }
  const anuncioRows = (ok('ads_v2_orders', anunciosR as Resp<AnuncioRow[]>) ?? [])
  const idsVideoAnuncio = anuncioRows.map((a) => a.video_id).filter((x): x is string => !!x) // ≤ ANUNCIOS_MAX
  const videoDoAnuncio = new Map<string, { url: string | null; thumb: string | null }>()
  if (idsVideoAnuncio.length > 0) {
    const r = (await admin.from('videos').select('id, video_url, thumbnail_url').eq('user_id', uid).in('id', idsVideoAnuncio).limit(ANUNCIOS_MAX)) as Resp<Array<{ id: string; video_url: string | null; thumbnail_url: string | null }>>
    for (const v of ok('videos(anúncios)', r) ?? []) videoDoAnuncio.set(v.id, { url: v.video_url, thumb: v.thumbnail_url })
  }
  const juiz = juizPorPedido((ok('events(juiz ads)', juizR as Resp<EventoPessoa[]>) ?? []))
  const anuncios: AnuncioPessoa[] = anuncioRows.map((a) => ({
    id: a.id,
    em: a.created_at,
    status: statusDoPedidoAds(a.status, !!(a.billing_ref && estornadoPorRender.get(a.billing_ref))),
    statusBruto: a.status ?? '—',
    degrau: a.tier,
    segundos: a.seconds,
    creditos: a.credits_charged,
    setor: a.sector,
    url: a.video_id ? videoDoAnuncio.get(a.video_id)?.url ?? null : null,
    thumb: a.card_url ?? (a.video_id ? videoDoAnuncio.get(a.video_id)?.thumb ?? null : null),
    erro: a.error ? a.error.replace(/\s+/g, ' ').slice(0, 160) : null,
    juiz: juiz.get(a.id) ?? null,
  }))

  type ClipeRow = { id: string; created_at: string; engine: string | null; model: string | null; mode: string | null; seconds: number | null; credits: number | null; credits_refunded: number | null; status: string | null; video_url: string | null; prompt: string | null; failure_reason: string | null }
  const clipes: ClipePessoa[] = (ok('clips', clipesR as Resp<ClipeRow[]>) ?? []).map((c) => ({
    id: c.id, em: c.created_at, motor: [c.engine, c.mode].filter(Boolean).join(' · ') || (c.model ?? '—'), segundos: c.seconds, creditos: c.credits,
    status: statusDoClipe(c.status, c.credits_refunded), url: c.video_url, prompt: c.prompt ? c.prompt.replace(/\s+/g, ' ').slice(0, 120) : null, erro: c.failure_reason ? c.failure_reason.slice(0, 140) : null,
  }))
  const imagens: ImagemPessoa[] = (ok('images', imagensR as Resp<Array<{ id: string; created_at: string; model: string | null; url: string | null; upscaled_url: string | null }>>) ?? []).map((i) => ({ id: i.id, em: i.created_at, modelo: i.model, url: i.upscaled_url ?? i.url }))
  const audios: AudioPessoa[] = (ok('audios', audiosR as Resp<Array<{ id: string; created_at: string; model: string | null; url: string | null; duration_ms: number | null }>>) ?? []).map((a) => ({ id: a.id, em: a.created_at, modelo: a.model, url: a.url, segundos: typeof a.duration_ms === 'number' ? Math.round(a.duration_ms / 100) / 10 : null }))

  const cortesias: Cortesia[] = (ok('courtesy_grants', cortesiaR as Resp<Array<{ level: string | null; credits_granted: number | null; starts_at: string | null; ends_at: string | null; status: string | null; reason: string | null; granted_by: string | null }>>) ?? [])
    .map((c) => ({ nivel: c.level, creditos: c.credits_granted, inicio: c.starts_at, fim: c.ends_at, status: c.status, motivo: c.reason, quem: c.granted_by }))

  const { dispositivo, idioma } = dispositivoEIdioma([...recentesEv, ...linhaEv])
  const total = (r: { count?: number | null }, fallback: number) => (typeof r.count === 'number' ? r.count : fallback)

  return {
    id: uid,
    email,
    nome: p.name,
    plano: p.plan,
    planoRotulo: planLabel(p.plan),
    cobranca,
    pagante: isPayingPlan(p.plan),
    jaPagou: p.has_paid === true,
    interna: isInternalEmail(email),
    cadastroEm: p.created_at,
    pais: p.signup_country,
    paisUltimo: p.last_country,
    origem: {
      fonte: acquisitionSource({ utmSource: p.signup_utm_source, legacyUtmSource: p.utm_source, referrer: p.signup_referrer }),
      iaProvavel: p.signup_utm_source === AI_ASSISTANT_LIKELY_SOURCE,
      utmSource: p.signup_utm_source ?? p.utm_source,
      utmMedium: p.signup_utm_medium,
      utmCampaign: p.signup_utm_campaign,
      referrer: p.signup_referrer,
      superficie: p.signup_surface,
      gclid: !!p.gclid,
    },
    dispositivo,
    idioma,
    trial: { status: p.trial_status, ganhou: p.trial_credits_granted, usou: p.trial_credits_used, fim: p.trial_ends_at },
    planoVence: p.plan_expires_at,
    afiliado,
    veioDeAfiliado,
    indicadoPor,
    cortesias,
    creditos: { resumo, concessoes, debitos, debitosTruncados: debRows.length >= DEBITOS_MAX },
    compras,
    linha: montarLinhaDoTempo(linhaEv, [...dinheiroEv, ...recentesEv]),
    filmes,
    filmesTotal: total(filmesR, filmes.length),
    filmesEstornados: filmesEstornados(debitos),
    anuncios,
    anunciosTotal: total(anunciosR, anuncios.length),
    clipes,
    clipesTotal: total(clipesR, clipes.length),
    imagens,
    imagensTotal: total(imagensR, imagens.length),
    audios,
    audiosTotal: total(audiosR, audios.length),
    geradoEm: agora.toISOString(),
    erros,
  }
}
