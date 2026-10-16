// KINEO-ADMIN-JORNADA-1510 — leitura da aba "Clientes" do /admin. SÓ LEITURA: nenhum insert/update/upsert/delete/rpc,
// nem o tripwire que grava admin_read_truncated (o teto aqui é declarado e aparece na tela).
//
// Desempenho (lições leitura-sem-janela / .in gigante): lê SÓ as 10 pessoas da página e, para cada uma, consultas com
// user_id + janela de tempo + limite abaixo de 1.000. events não tem índice por user_id — a janela por created_at
// (cadastro − 1 dia … cadastro + JANELA_DIAS) é o que faz a consulta usar o índice. O único .in() é o das ≤ 5 sessões de
// navegador da pessoa (para ligar a navegação anônima de antes do cadastro) e o dos ≤ 12 vídeos dos anúncios dela.
//
// De onde vem cada dado:
//   quem ............ profiles (email, signup_country/last_country, created_at, plan, has_paid, trial_status, video_credits,
//                     signup_utm_*, utm_source, signup_referrer, signup_surface, gclid)
//   filmes .......... videos (quality_mode ≠ ads_v2/clip; status, duration, video_url, thumbnail_url)
//   nota ............ events.fast_coherence (a MESMA nota do /admin/coerencia, versão vigente FAST_COHERENCE_VERSION,
//                     casada por metadata.video_id) — aqui só se LÊ; quem julga é o /admin/coerencia
//   anúncios ........ ads_v2_orders (+ o vídeo entregue em videos pelo video_id)
//   contadores ...... videos (quality_mode=clip), images, audios — count exato, sem trazer linhas
//   régua/trilha .... events da pessoa na janela + events anônimos com o mesmo session_id (o id de sessão do navegador
//                     vive no sessionStorage e atravessa o login na mesma aba — é assim que o funil liga anônimo→conta)
import type { SupabaseClient } from '@supabase/supabase-js'
import { AI_ASSISTANT_LIKELY_SOURCE, acquisitionSource, landingSessionSourceClass } from '@/lib/acquisitionSource'
import { FAST_COHERENCE_EVENT, FAST_COHERENCE_VERSION } from '@/lib/fastCoherence'
import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'
import { ENGINE_LABEL } from '@/lib/admin/fastCoherence'
import {
  ANUNCIOS_POR_PESSOA,
  CLIENTES_POR_PAGINA,
  EVENTOS_ANONIMOS_POR_PESSOA,
  EVENTOS_POR_PESSOA,
  FILMES_POR_PESSOA,
  INTERNOS_ILIKE,
  JANELA_DIAS,
  PASSOS_MAX,
  REGUA,
  calcularRegua,
  ehContaInterna,
  ehNavegacao,
  fazendoAgora,
  frasesDeFalha,
  intervaloDaPagina,
  limparCaminho,
  listaParaNotIn,
  montarTrilha,
  sessoesParaLigar,
  statusDoAnuncio,
  statusDoFilme,
  type EventoLido,
  type ParametrosClientes,
  type PassoRegua,
  type PassoTrilha,
  type StatusEntrega,
} from '@/lib/admin/clientesJornadaRegras'

export type NotaCoerencia = { score: number; verdict: string }
export type FilmeCliente = { id: string; em: string; motor: string; segundos: number | null; creditos: number | null; status: StatusEntrega; url: string | null; thumb: string | null; tema: string | null; nota: NotaCoerencia | null }
export type AnuncioCliente = { id: string; em: string; status: StatusEntrega; statusBruto: string; setor: string | null; degrau: string | null; segundos: number | null; url: string | null; thumb: string | null; erro: string | null }
export type ClienteJornada = {
  id: string
  email: string
  interna: boolean
  criadoEm: string
  pais: string | null
  paisUltimo: string | null
  plano: string | null
  pagou: boolean
  trial: string | null
  creditos: number | null
  origem: { fonte: string; iaProvavel: boolean; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; referrer: string | null; superficie: string | null; gclid: boolean; classePouso: string | null }
  entrada: { path: string; em: string; antesDoCadastro: boolean } | null
  filmes: FilmeCliente[]
  filmesTotal: number
  anuncios: AnuncioCliente[]
  anunciosTotal: number
  contadores: { clipes: number; imagens: number; audios: number }
  fazendo: { desde: string } | null
  falhas: Array<{ em: string; erro: string }>
  regua: PassoRegua[]
  trilha: PassoTrilha[]
  anonimosLigados: number
  eventosTruncados: boolean
  erros: string[]
}
export type PaginaClientes = { params: ParametrosClientes; total: number | null; clientes: ClienteJornada[]; geradoEm: string; erro: string | null }

type PerfilRow = {
  id: string; email: string | null; created_at: string; plan: string | null; has_paid: boolean | null; trial_status: string | null; video_credits: number | null
  signup_country: string | null; last_country: string | null; signup_utm_source: string | null; signup_utm_medium: string | null; signup_utm_campaign: string | null
  signup_referrer: string | null; utm_source: string | null; signup_surface: string | null; gclid: string | null
}
const PERFIL_COLS = 'id, email, created_at, plan, has_paid, trial_status, video_credits, signup_country, last_country, signup_utm_source, signup_utm_medium, signup_utm_campaign, signup_referrer, utm_source, signup_surface, gclid'
const EVENTO_COLS = 'name, created_at, path, session_id, erro:metadata->>error'
const EVENTO_ANON_COLS = 'name, created_at, path, session_id, m_source:metadata->>source, m_referrer_host:metadata->>referrer_host, m_utm_source:metadata->>utm_source, m_surface:metadata->>surface'
const FILME_COLS = 'id, created_at, quality_mode, duration, credits_used, status, video_url, thumbnail_url, topic'
const ANUNCIO_COLS = 'id, created_at, status, tier, seconds, sector, card_url, video_id, error'

const DIA = 86_400_000

/** A página: 10 perfis mais novos primeiro, com internas fora NO BANCO (antes do range) e os filtros simples. */
export async function carregarClientes(admin: SupabaseClient, params: ParametrosClientes, agora: Date = new Date()): Promise<PaginaClientes> {
  const geradoEm = agora.toISOString()
  // O embed `videos` usa a FK videos.user_id → profiles.id; `!inner` = tem ao menos 1 vídeo (filme, clipe ou anúncio entregue);
  // embed comum + `videos is null` = nenhum (anti-join do PostgREST). O embed traz no máximo 1 id por pessoa.
  const embed = params.filtro === 'fez' ? ', videos!inner(id)' : params.filtro === 'nada' ? ', videos(id)' : ''
  let q = admin.from('profiles').select(PERFIL_COLS + embed, { count: 'exact' })
  if (!params.internas) {
    for (const padrao of INTERNOS_ILIKE) q = q.not('email', 'ilike', padrao)
    q = q.not('email', 'in', listaParaNotIn(INTERNAL_EXACT_EMAILS))
  }
  if (params.filtro === 'pagou') q = q.eq('has_paid', true)
  if (params.filtro === 'nada') q = q.is('videos', null)
  if (embed) q = q.limit(1, { referencedTable: 'videos' })
  const [de, ate] = intervaloDaPagina(params.pagina)
  const { data, count, error } = await q.order('created_at', { ascending: false }).order('id', { ascending: true }).range(de, ate)
  if (error) return { params, total: null, clientes: [], geradoEm, erro: `profiles: ${error.message}` }
  const perfis = ((data ?? []) as unknown as PerfilRow[]).slice(0, CLIENTES_POR_PAGINA)
  const clientes = await Promise.all(perfis.map((p) => carregarPessoa(admin, p, agora)))
  return { params, total: typeof count === 'number' ? count : null, clientes, geradoEm, erro: null }
}

async function carregarPessoa(admin: SupabaseClient, p: PerfilRow, agora: Date): Promise<ClienteJornada> {
  const uid = p.id
  const erros: string[] = []
  const cadastro = Date.parse(p.created_at)
  const desde = new Date(cadastro - DIA).toISOString()
  const fimJanela = new Date(Math.min(agora.getTime(), cadastro + JANELA_DIAS * DIA)).toISOString()
  const ok = <T,>(rotulo: string, r: { data: T | null; error: { message: string } | null }): T | null => {
    if (r.error) erros.push(`${rotulo}: ${r.error.message}`)
    return r.data
  }
  const contar = async (rotulo: string, build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const r = await build()
    if (r.error) { erros.push(`${rotulo}: ${r.error.message}`); return 0 }
    return r.count ?? 0
  }

  const [filmesR, anunciosR, clipes, imagens, audios, notasR, eventosR] = await Promise.all([
    admin.from('videos').select(FILME_COLS, { count: 'exact' }).eq('user_id', uid)
      .or('quality_mode.is.null,quality_mode.not.in.(ads_v2,clip)') // NOT IN sozinho jogaria fora quality_mode nulo
      .order('created_at', { ascending: false }).limit(FILMES_POR_PESSOA),
    admin.from('ads_v2_orders').select(ANUNCIO_COLS, { count: 'exact' }).eq('user_id', uid).order('created_at', { ascending: false }).limit(ANUNCIOS_POR_PESSOA),
    contar('clipes', () => admin.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('quality_mode', 'clip')),
    contar('imagens', () => admin.from('images').select('id', { count: 'exact', head: true }).eq('user_id', uid)),
    contar('audios', () => admin.from('audios').select('id', { count: 'exact', head: true }).eq('user_id', uid)),
    admin.from('events').select('created_at, video_id:metadata->>video_id, score:metadata->score, verdict:metadata->>verdict, version:metadata->>version')
      .eq('name', FAST_COHERENCE_EVENT).eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
    admin.from('events').select(EVENTO_COLS).eq('user_id', uid).gte('created_at', desde).lte('created_at', fimJanela)
      .order('created_at', { ascending: true }).limit(EVENTOS_POR_PESSOA),
  ])

  // ── eventos logados; se bateu no teto, completa SÓ os passos da régua que faltaram, depois do último lido ──
  const eventos: EventoLido[] = ((ok('events', eventosR) ?? []) as unknown as EventoLido[]).map((e) => ({ ...e, anonimo: false }))
  const eventosTruncados = eventos.length >= EVENTOS_POR_PESSOA
  if (eventosTruncados) {
    const ultimoLido = eventos[eventos.length - 1]?.created_at ?? desde
    const vistos = new Set(eventos.map((e) => e.name))
    const faltam = REGUA.filter((d) => d.eventos.length > 0 && !d.eventos.some((n) => vistos.has(n)))
    const extras = await Promise.all(faltam.map((d) =>
      admin.from('events').select(EVENTO_COLS).eq('user_id', uid).in('name', [...d.eventos]).gt('created_at', ultimoLido).lte('created_at', fimJanela)
        .order('created_at', { ascending: true }).limit(1)))
    for (const r of extras) for (const e of ((ok('events(régua)', r) ?? []) as unknown as EventoLido[])) eventos.push({ ...e, anonimo: false })
  }

  // ── navegação anônima ligada: mesmas sessões de navegador, do dia anterior ao cadastro até 1 h depois ──
  const sessoes = sessoesParaLigar(eventos)
  type AnonRow = EventoLido & { m_source: string | null; m_referrer_host: string | null; m_utm_source: string | null; m_surface: string | null }
  let anonimos: AnonRow[] = []
  if (sessoes.length > 0) {
    const r = await admin.from('events').select(EVENTO_ANON_COLS).is('user_id', null).in('session_id', sessoes)
      .gte('created_at', new Date(cadastro - DIA).toISOString()).lte('created_at', new Date(cadastro + 3_600_000).toISOString())
      .order('created_at', { ascending: true }).limit(EVENTOS_ANONIMOS_POR_PESSOA)
    anonimos = ((ok('events(anônimos)', r) ?? []) as unknown as AnonRow[]).map((e) => ({ ...e, anonimo: true }))
  }
  const todos: EventoLido[] = [...anonimos, ...eventos]

  // ── nota de coerência por vídeo (versão vigente, a mais recente vence) ──
  const notaPorVideo = new Map<string, NotaCoerencia>()
  for (const n of ((ok('fast_coherence', notasR) ?? []) as unknown as Array<{ video_id: string | null; score: unknown; verdict: string | null; version: string | null }>)) {
    if (!n.video_id || n.version !== FAST_COHERENCE_VERSION || notaPorVideo.has(n.video_id)) continue
    const score = typeof n.score === 'number' ? n.score : Number(n.score)
    if (Number.isFinite(score)) notaPorVideo.set(n.video_id, { score: Math.round(score), verdict: n.verdict ?? '' })
  }

  type FilmeRow = { id: string; created_at: string; quality_mode: string | null; duration: number | null; credits_used: number | null; status: string | null; video_url: string | null; thumbnail_url: string | null; topic: string | null }
  const filmes: FilmeCliente[] = ((ok('videos', filmesR) ?? []) as unknown as FilmeRow[]).map((v) => ({
    id: v.id,
    em: v.created_at,
    motor: v.quality_mode ? ENGINE_LABEL[v.quality_mode] ?? v.quality_mode : '—',
    segundos: v.duration,
    creditos: v.credits_used,
    status: statusDoFilme(v.status),
    url: v.video_url,
    thumb: v.thumbnail_url,
    tema: typeof v.topic === 'string' ? v.topic.replace(/\s+/g, ' ').trim().slice(0, 110) : null,
    nota: notaPorVideo.get(v.id) ?? null,
  }))

  type AnuncioRow = { id: string; created_at: string; status: string | null; tier: string | null; seconds: number | null; sector: string | null; card_url: string | null; video_id: string | null; error: string | null }
  const anunciosRows = (ok('ads_v2_orders', anunciosR) ?? []) as unknown as AnuncioRow[]
  const idsVideoAnuncio = anunciosRows.map((a) => a.video_id).filter((x): x is string => !!x) // ≤ ANUNCIOS_POR_PESSOA
  const urlDoVideo = new Map<string, { url: string | null; thumb: string | null }>()
  if (idsVideoAnuncio.length > 0) {
    const r = await admin.from('videos').select('id, video_url, thumbnail_url').eq('user_id', uid).in('id', idsVideoAnuncio).limit(ANUNCIOS_POR_PESSOA)
    for (const v of ((ok('videos(anúncios)', r) ?? []) as unknown as Array<{ id: string; video_url: string | null; thumbnail_url: string | null }>)) urlDoVideo.set(v.id, { url: v.video_url, thumb: v.thumbnail_url })
  }
  const anuncios: AnuncioCliente[] = anunciosRows.map((a) => ({
    id: a.id,
    em: a.created_at,
    status: statusDoAnuncio(a.status),
    statusBruto: a.status ?? '—',
    setor: a.sector,
    degrau: a.tier,
    segundos: a.seconds,
    url: a.video_id ? urlDoVideo.get(a.video_id)?.url ?? null : null,
    thumb: a.card_url ?? (a.video_id ? urlDoVideo.get(a.video_id)?.thumb ?? null : null),
    erro: a.error ? a.error.replace(/\s+/g, ' ').slice(0, 140) : null,
  }))

  const entregas = [...filmes.filter((f) => f.status === 'pronto').map((f) => f.em), ...anuncios.filter((a) => a.status === 'pronto').map((a) => a.em)].sort()
  const trilhaToda = montarTrilha(todos)
  const primeiraNav = todos.filter(ehNavegacao).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0] ?? null
  const pousoAnon = anonimos.find((e) => e.name === 'landing_session_started') ?? null
  const classePouso = pousoAnon ? landingSessionSourceClass({ source: pousoAnon.m_source, referrer_host: pousoAnon.m_referrer_host, utm_source: pousoAnon.m_utm_source, surface: pousoAnon.m_surface }, pousoAnon.path) : null
  const email = (p.email ?? '').trim()

  return {
    id: uid,
    email,
    interna: ehContaInterna(email, INTERNAL_EXACT_EMAILS),
    criadoEm: p.created_at,
    pais: p.signup_country,
    paisUltimo: p.last_country,
    plano: p.plan,
    pagou: p.has_paid === true,
    trial: p.trial_status,
    creditos: p.video_credits,
    origem: {
      fonte: acquisitionSource({ utmSource: p.signup_utm_source, legacyUtmSource: p.utm_source, referrer: p.signup_referrer }),
      iaProvavel: p.signup_utm_source === AI_ASSISTANT_LIKELY_SOURCE || classePouso === AI_ASSISTANT_LIKELY_SOURCE,
      utmSource: p.signup_utm_source ?? p.utm_source,
      utmMedium: p.signup_utm_medium,
      utmCampaign: p.signup_utm_campaign,
      referrer: p.signup_referrer,
      superficie: p.signup_surface,
      gclid: !!p.gclid,
      classePouso,
    },
    entrada: primeiraNav ? { path: limparCaminho(String(primeiraNav.path)), em: primeiraNav.created_at, antesDoCadastro: !!primeiraNav.anonimo } : null,
    filmes,
    filmesTotal: typeof filmesR.count === 'number' ? filmesR.count : filmes.length,
    anuncios,
    anunciosTotal: typeof anunciosR.count === 'number' ? anunciosR.count : anuncios.length,
    contadores: { clipes, imagens, audios },
    fazendo: fazendoAgora(todos, entregas[entregas.length - 1] ?? null, agora.getTime()) ?? (anuncios.some((a) => a.status === 'fazendo') ? { desde: anuncios.find((a) => a.status === 'fazendo')!.em } : null),
    falhas: frasesDeFalha(todos),
    regua: calcularRegua(todos, { cadastroEm: p.created_at, primeiraEntregaEm: entregas[0] ?? null, pagou: p.has_paid === true, primeiraPaginaEm: primeiraNav?.created_at ?? null }),
    trilha: trilhaToda.slice(0, PASSOS_MAX),
    anonimosLigados: anonimos.length,
    eventosTruncados,
    erros,
  }
}
