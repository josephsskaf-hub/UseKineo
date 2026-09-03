'use client'

// KINEO-AUTOPILOT-UI-2026-07-26 — a superfície do produto.
//
// O backend do Autopilot existia inteiro e NÃO TINHA PORTA: sem uma linha em
// `autopilot_schedules` o cron horário não acha nada e faz no-op para sempre.
// Esta tela é a porta.
//
// QUATRO ESTADOS, nenhum beco sem saída:
//   1. sem plano       → caminho de upgrade (nunca um formulário que rejeita
//                        depois do submit)
//   2. sem canal       → "Connect your YouTube channel" → /api/youtube/auth
//   3. sem agenda      → o formulário. DOIS campos. Todo campo extra custa
//                        conversão, e o cron tem default seguro para o resto.
//   4. agenda ativa    → o que vai ao ar, QUANDO (no fuso do cliente), o que já
//                        foi publicado e um pause claro.
//
// HORÁRIO: a coluna é post_hour_utc, mas UTC não é um horário que um humano
// reconhece. Cada opção do seletor é uma hora UTC RENDERIZADA no fuso local do
// browser, então o cliente escolhe "6:00 PM" e o banco guarda a hora UTC certa
// — sem aritmética de offset e sem quebrar nos fusos de meia hora.
//
// Estilo copiado de app/(dashboard)/affiliate/page.tsx (mesmas constantes de
// cor, rounded-2xl, font-black). Nenhum design system novo, nenhuma lib nova.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
// KINEO-PAID-NOT-ENTITLED-2026-08-06 — o NOME do plano vem da fonte única
// (`basic` é "Creator", `pro` é "Studio"). PREÇO, de propósito, NÃO vem: o
// `priceLabel` de lib/pricing é fixo em USD e o cliente BR paga R$1.499
// (lib/checkoutPricing.AUTOPILOT_PRICES). Escrever "$299" aqui seria mentir
// para 2 das 3 moedas — quem mostra preço é /pricing, que resolve a moeda.
import { PLANS } from '@/lib/pricing'
import { AUTOPILOT_PILOT_PLAN } from '@/lib/autopilot/config'
import { trackEvent } from '@/lib/analytics'

const CYAN = '#2997ff'
const TEXT = '#F1F5F9'
const MUTED = '#86868b'
const CARD = '#161618'
const BORDER = '1px solid rgba(255,255,255,0.08)'

// KINEO-ORFAOS-CLIQUE-2026-08-14 — era `fetch('/api/events')` cru, sem
// `session_id`, herdado por cópia de app/(dashboard)/affiliate/page.tsx (o
// comentário antigo dizia isso com todas as letras). Custo medido: 54 eventos e
// 26 pessoas em /autopilot, 100% órfãos — e entre eles `autopilot_upgrade_clicked`,
// ou seja, uma superfície de UPGRADE invisível para todo funil por sessão da
// casa. `trackEvent` anexa session_id + UTMs de first-touch; nenhum nome muda.
function track(name: string, metadata?: Record<string, unknown>): void {
  try {
    void trackEvent(name, { source: 'autopilot_page', ...(metadata ?? {}) })
  } catch {
    /* ignore */
  }
}

// KINEO-YTCONNECT-2026-07-26 — o clique que faltava medir.
//
// `autopilot_connect_clicked` já existia, mas só cobre ESTA página. O mesmo
// botão existe em /generate, e nenhum nome comum ligava os dois: repo-wide,
// `youtube_connect` tinha ZERO ocorrências, então não dava para responder a
// pergunta mais barata do funil — "as pessoas clicam em Connect e falham, ou
// nunca clicam?". `youtube_connect_clicked` é esse nome comum, e casa com
// `youtube_connect_started` / `youtube_connected` / `youtube_connect_failed`
// que o servidor grava em /api/youtube/auth e /api/youtube/callback.
// O nome antigo continua sendo emitido: qualquer painel que já consulte por ele
// não pode parar de funcionar por causa desta mudança.
function trackConnectClick(kind: 'connect' | 'reconnect' | 'add' | 'switch_channel', outcomeShown?: string | null): void {
  if (kind === 'reconnect') track('autopilot_reconnect_clicked')
  else track('autopilot_connect_clicked', { add: kind === 'add' })
  track('youtube_connect_clicked', {
    surface: 'autopilot',
    kind,
    // Quando o clique é uma RETENTATIVA, isto diz de qual falha ele veio — é o
    // que transforma "12 falhas" em "12 falhas, 3 tentaram de novo".
    retry_after: outcomeShown ?? null,
  })
}

// ── Desfechos do OAuth do YouTube ───────────────────────────────────────────
// KINEO-YTCONNECT-2026-07-26 — o callback calculava um motivo para cada falha e
// mandava para /dashboard, que faz redirect('/generate') e DESCARTA a query.
// Nenhuma tela lia nada disso; o usuário via a página normal e concluía que
// tinha funcionado. Estes são os mesmos valores do type Outcome em
// app/api/youtube/callback/route.ts — mantenha os dois lados em sincronia.
//
// Regra da cópia: cada texto diz o que aconteceu E o próximo movimento. "Algo
// deu errado" manda o cliente para o suporte; "escolha a conta dona do canal"
// resolve sozinho.
interface OutcomeCopy {
  tone: 'ok' | 'warn' | 'error'
  title: string
  body: string
  /** Mostra o botão de tentar conectar de novo. */
  retry: boolean
}

const YT_OUTCOMES: Record<string, OutcomeCopy> = {
  connected: {
    tone: 'ok',
    title: 'Channel connected.',
    body: 'Autopilot can publish to it now. Pick a topic and a time below and you are done.',
    retry: false,
  },
  access_denied: {
    tone: 'warn',
    title: 'You cancelled the Google sign-in.',
    body: 'Nothing was connected and Kineo was given no access to your account. Start again whenever you are ready.',
    retry: true,
  },
  missing_code: {
    tone: 'error',
    title: 'Google sent you back without an authorization code.',
    body: 'That usually means the sign-in window was closed early or the link was opened twice. Start the connection again from this page.',
    retry: true,
  },
  invalid_state: {
    tone: 'error',
    title: 'We could not match that Google sign-in to your Kineo account.',
    body: 'This happens when the sign-in finishes in a different browser or after your Kineo session expired. Make sure you are signed in here, then connect again.',
    retry: true,
  },
  token_exchange_failed: {
    tone: 'error',
    title: 'Google accepted the sign-in but refused to hand us an access token.',
    body: 'Nothing was connected and you were not charged. Try once more — if it fails again, email support@usekineo.com and we will look at the exact Google error on our side.',
    retry: true,
  },
  no_channel: {
    tone: 'warn',
    title: 'Google returned no YouTube channel for that account.',
    body: 'Autopilot needs an account that actually owns a channel. Connect again and pick the Google account that owns the channel you want to post to — if you use a Brand Account, choose it in the account list rather than your personal one.',
    retry: true,
  },
  channel_save_failed: {
    tone: 'error',
    title: 'We signed in to Google but could not finish saving your channel.',
    body: 'The connection is not usable yet, so nothing will be posted. Try connecting again — if it keeps failing, email support@usekineo.com and mention "channel save failed".',
    retry: true,
  },
  config_error: {
    tone: 'error',
    title: 'YouTube connections are misconfigured on our side.',
    body: 'This is our problem, not your account. The error is already in our logs. Try again shortly, or email support@usekineo.com if you need this working today.',
    retry: true,
  },
  failed: {
    tone: 'error',
    title: 'We could not connect your YouTube channel.',
    body: 'Google returned an error we did not expect. Nothing was connected. Try again, and email support@usekineo.com if it happens twice.',
    retry: true,
  },
}

const OUTCOME_STYLE: Record<OutcomeCopy['tone'], { bg: string; border: string; color: string }> = {
  ok: { bg: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.35)', color: CYAN },
  warn: { bg: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.32)', color: '#fbbf24' },
  error: { bg: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.32)', color: '#ef4444' },
}

// ── Tipos do payload de /api/autopilot/schedules ────────────────────────────
interface ApiChannel {
  id: string
  title: string | null
  thumbnailUrl: string | null
  connectedAt: string | null
  needsReconnect: boolean
  // KINEO-YTCHANNEL-PICK-2026-07-27 — o id UC… do YouTube. A rota já mandava
  // (publicChannel em app/api/autopilot/schedules/route.ts); só o tipo do
  // cliente ignorava. É o que permite linkar para o canal REAL: dois canais da
  // mesma pessoa podem ter títulos parecidos, o id nunca colide.
  externalChannelId: string | null
}

interface ApiRun {
  id: string
  status: string
  reason: string | null
  topic: string | null
  youtubeVideoId: string | null
  youtubeUrl: string | null
  error: string | null
  scheduledForDate: string | null
  startedAt: string | null
  finishedAt: string | null
}

interface ApiSchedule {
  id: string
  channelId: string
  channelTitle: string | null
  channelThumbnailUrl: string | null
  channelNeedsReconnect: boolean
  enabled: boolean
  niche: string | null
  tone: string | null
  engine: string
  postHourUtc: number
  postsPerDay: number
  privacyStatus: string
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string | null
  runs: ApiRun[]
}

interface ApiPayload {
  entitled: boolean
  plan: string | null
  credits: number
  creditCostPerVideo: number
  channels: ApiChannel[]
  schedules: ApiSchedule[]
}

// ── Nichos ──────────────────────────────────────────────────────────────────
// Os VALORES batem exatamente com as chaves de VERTICAL_QUERIES em
// app/api/cron/refresh-niche-trends/route.ts. lib/autopilot/topics.ts faz
// `.eq('vertical', niche)` em niche_trends; um valor fora dessa lista ainda
// funciona (cai no caminho da OpenAI), mas perde os temas frescos e de graça
// que aquele cron já popula todo dia.
const NICHES: Array<{ value: string; label: string }> = [
  { value: 'billionaire', label: 'Billionaires & money habits' },
  { value: 'money', label: 'Personal finance' },
  { value: 'mystery', label: 'Mysteries & unexplained' },
  { value: 'history', label: 'History & archaeology' },
  { value: 'country', label: 'Countries & places' },
  { value: 'learning', label: 'Psychology & mental models' },
  { value: 'science', label: 'Science & discoveries' },
  { value: 'space', label: 'Space & astronomy' },
]

function nicheLabel(value: string | null): string {
  if (!value) return 'General curiosity'
  return NICHES.find((n) => n.value === value)?.label ?? value
}

// ── Horas ───────────────────────────────────────────────────────────────────
interface HourOption {
  utcHour: number
  label: string
  minutesOfLocalDay: number
}

/** As 24 horas UTC, cada uma rotulada com o horário LOCAL correspondente. */
function buildHourOptions(): HourOption[] {
  const now = new Date()
  const opts: HourOption[] = []
  for (let h = 0; h < 24; h++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0, 0))
    opts.push({
      utcHour: h,
      label: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      minutesOfLocalDay: d.getHours() * 60 + d.getMinutes(),
    })
  }
  return opts.sort((a, b) => a.minutesOfLocalDay - b.minutesOfLocalDay)
}

/** Hora UTC cujo horário local cai mais perto das 18:00 — bom default de Shorts. */
function defaultUtcHour(options: HourOption[]): number {
  const target = 18 * 60
  let best = options[0]
  for (const o of options) {
    if (Math.abs(o.minutesOfLocalDay - target) < Math.abs(best.minutesOfLocalDay - target)) best = o
  }
  return best?.utcHour ?? 14
}

function localHourLabel(utcHour: number): string {
  const now = new Date()
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0),
  )
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return 'any minute now'
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return `in ${Math.max(1, Math.round(ms / 60_000))} min`
  if (hours < 24) return `in ${hours}h`
  return `in ${Math.round(hours / 24)}d`
}

// ── Status das runs ─────────────────────────────────────────────────────────
const RUN_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Queued', bg: 'rgba(148,163,184,0.14)', color: MUTED },
  generating: { label: 'Making it', bg: 'rgba(41,151,255,0.14)', color: CYAN },
  uploading: { label: 'Posting', bg: 'rgba(41,151,255,0.14)', color: CYAN },
  succeeded: { label: 'Published', bg: 'rgba(41,151,255,0.16)', color: CYAN },
  failed: { label: 'Failed', bg: 'rgba(239,68,68,0.14)', color: '#ef4444' },
  skipped: { label: 'Skipped', bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' },
}

// Motivos que o cron grava em autopilot_runs.reason, em inglês de gente.
const SKIP_REASON: Record<string, string> = {
  not_entitled: 'Your plan does not include Autopilot right now.',
  insufficient_credits: 'Not enough credits to make this one.',
  channel_disconnected: 'YouTube disconnected — reconnect the channel.',
  session_unavailable: 'We could not act on your account. Contact support.',
  profile_lookup_failed: 'Temporary account lookup error.',
}

// ── Quem já paga não pode ouvir "isso é para quem paga" ─────────────────────
// KINEO-PAID-NOT-ENTITLED-2026-08-06 — 13 pessoas chegaram ao estado
// `not_entitled` e DUAS delas eram, naquele momento, 2 dos 3 assinantes ativos
// da empresa (um Starter 12 min depois de pagar, e o assinante de Creator).
// A tela dizia a ambos "Autopilot is part of the paid plans" — uma frase FALSA
// para quem acabou de pagar, na única tela onde ele estava avaliando se valeu.
// Os dois sumiram e nenhum dos dois voltou.
//
// Duas correções, e a segunda importa mais que a primeira:
//   1. quem está num plano pago lê que Autopilot é um TIER separado (não "os
//      planos pagos"), com o preço na cara para não haver surpresa no /pricing;
//   2. a tela devolve o caminho para o produto que ele JÁ COMPROU. Antes, o
//      único link daqui era o de gastar mais dinheiro; um assinante que veio
//      olhar e disse "agora não" saía sem porta nenhuma de volta.
//
// `onPaidPlan` casa por PADRÃO NEGATIVO (tudo que não é free/vazio), nunca por
// lista fechada de planos — lista fechada é exatamente o que apodrece quando o
// próximo SKU nasce.
function isOnPaidPlan(plan: string | null | undefined): boolean {
  const raw = (plan ?? '').toString().trim().toLowerCase()
  return raw !== '' && raw !== 'free'
}

// O nome que o CLIENTE reconhece, não o valor guardado: 'basic' é Creator e
// 'pro' é Studio. Chamar de "Basic" quem comprou "Creator" seria a mesma
// classe de erro que esta mudança corrige. Sem nome conhecido → frase que não
// depende de nome (um `autopilot_pilot` expirado cai aqui, e ele PAGOU).
function planDisplayName(plan: string | null | undefined): string | null {
  const raw = (plan ?? '').toString().trim().toLowerCase().replace(/_trial$/, '')
  if (!raw || raw === 'free') return null
  const known = (PLANS as Record<string, { name?: string } | undefined>)[raw]
  return known?.name ?? null
}

function RunStatusBadge({ status }: { status: string }) {
  const s = RUN_STATUS[status] ?? { label: status, bg: 'rgba(148,163,184,0.14)', color: MUTED }
  return (
    <span
      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

// KINEO-YTCHANNEL-PICK-2026-07-27 — visibilidade em português-de-usuário.
// `privacy_status` é 'public' | 'unlisted' | 'private'; mostrar o valor cru numa
// tela que decide se um vídeo aparece ou não para o mundo é pedir para o cliente
// adivinhar.
function privacyLabel(raw: string | null | undefined): string {
  const v = (raw ?? 'public').toLowerCase()
  if (v === 'unlisted') return 'unlisted'
  if (v === 'private') return 'private'
  return 'public'
}

// ── Estilos compartilhados dos campos ───────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: MUTED,
  marginBottom: 7,
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  padding: '11px 12px',
  background: 'rgba(13,13,28,.85)',
  border: '1px solid rgba(41,151,255,.3)',
  color: TEXT,
  outline: 'none',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
  appearance: 'none',
}

const primaryButton: React.CSSProperties = {
  borderRadius: 12,
  padding: '12px 26px',
  fontSize: '0.9rem',
  fontWeight: 900,
  color: '#fff',
  background: 'linear-gradient(135deg, #2997ff, #2997ff)',
  boxShadow: '0 4px 18px rgba(41,151,255,.35)',
  border: 'none',
  cursor: 'pointer',
}

const quietButton: React.CSSProperties = {
  borderRadius: 10,
  padding: '9px 16px',
  fontSize: '0.8rem',
  fontWeight: 800,
  color: TEXT,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
}

const WRAP = 'px-4 sm:px-6 py-7 pb-28 md:pb-20 max-w-3xl mx-auto'

export default function AutopilotClient() {
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // KINEO-YTCONNECT-2026-07-26 — desfecho do OAuth vindo de ?yt= (ver efeito abaixo).
  const [ytOutcome, setYtOutcome] = useState<string | null>(null)
  const [ytChannelTitle, setYtChannelTitle] = useState<string | null>(null)
  // KINEO-YTCHANNEL-PICK-2026-07-27 — quantos canais o callback registrou (?n=).
  const [ytChannelCount, setYtChannelCount] = useState(0)

  const searchParams = useSearchParams()
  const hourOptions = useMemo(buildHourOptions, [])

  // Formulário de criação.
  const [niche, setNiche] = useState<string>(NICHES[0].value)
  const [postHourUtc, setPostHourUtc] = useState<number | null>(null)
  // KINEO-YTCHANNEL-PICK-2026-07-27 — o canal de DESTINO é escolha explícita, não
  // `channels[0]`. Era exatamente esse índice zero, aqui e em lib/youtube.ts, que
  // publicava no canal errado sem dizer nada.
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  // Estreia UNLISTED. O pipeline nunca completou de ponta a ponta em produção
  // (0 canais conectados na história até 27/07/2026), e um primeiro Short
  // automático que sai errado sai errado EM PÚBLICO, no canal do cliente. O
  // usuário troca para Public no mesmo formulário, com um clique.
  const [createPrivacy, setCreatePrivacy] = useState<string>('unlisted')
  // Ajustes da agenda ativa.
  const [editPostsPerDay, setEditPostsPerDay] = useState(1)
  const [editPrivacy, setEditPrivacy] = useState('public')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/autopilot/schedules', { cache: 'no-store' })
      if (res.status === 401) {
        setAuthRequired(true)
        return
      }
      if (!res.ok) {
        setLoadError('We could not load your Autopilot settings. Refresh to try again.')
        return
      }
      const json = (await res.json()) as ApiPayload
      setData(json)
      setAuthRequired(false)
      setLoadError(null)
    } catch {
      setLoadError('We could not load your Autopilot settings. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Default de horário só depois que o browser existe (fuso do cliente).
  useEffect(() => {
    if (postHourUtc === null) setPostHourUtc(defaultUtcHour(hourOptions))
  }, [hourOptions, postHourUtc])

  const schedule = data?.schedules?.[0] ?? null

  // KINEO-YTCHANNEL-PICK-2026-07-27 — sem escolha do usuário ainda, o padrão é o
  // primeiro canal, mas ele fica VISÍVEL e trocável na tela. A diferença com o
  // comportamento antigo não é o default: é que agora o default é mostrado.
  // useMemo para a lista vazia ser a MESMA referência entre renders — sem isso
  // `?? []` cria um array novo a cada render e o efeito abaixo dispara sempre.
  const channels = useMemo(() => data?.channels ?? [], [data])
  useEffect(() => {
    if (channels.length === 0) {
      if (selectedChannelId !== null) setSelectedChannelId(null)
      return
    }
    // Mantém a escolha do usuário; só reposiciona se o canal escolhido sumiu
    // (revogado em outra aba, reconexão que trocou a lista).
    if (!selectedChannelId || !channels.some((c) => c.id === selectedChannelId)) {
      setSelectedChannelId(channels[0].id)
    }
  }, [channels, selectedChannelId])

  const selectedChannel =
    channels.find((c) => c.id === selectedChannelId) ?? channels[0] ?? null

  // Espelha a agenda salva nos campos de ajuste sempre que ela chega/muda.
  useEffect(() => {
    if (!schedule) return
    setEditPostsPerDay(schedule.postsPerDay)
    setEditPrivacy(schedule.privacyStatus)
  }, [schedule?.id, schedule?.postsPerDay, schedule?.privacyStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Um evento por estado alcançado — é assim que descobrimos ONDE o funil morre.
  const stateName = !data
    ? null
    : !data.entitled
      ? 'not_entitled'
      : data.channels.length === 0
        ? 'no_channel'
        : schedule
          ? 'schedule_active'
          : 'no_schedule'
  useEffect(() => {
    if (!stateName) return
    // KINEO-PAID-NOT-ENTITLED-2026-08-06 — `state` NÃO muda (a série histórica
    // de `not_entitled` continua comparável). Os dois campos novos são o que
    // faltava: descobrir que 2 dos 13 `not_entitled` eram assinantes ativos
    // exigiu um JOIN manual contra profiles, e por isso o defeito viveu 6 dias.
    track('autopilot_page_viewed', {
      state: stateName,
      plan: data?.plan ?? null,
      on_paid_plan: isOnPaidPlan(data?.plan),
    })
  }, [stateName]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Desfecho do OAuth do YouTube ──────────────────────────────────────────
  // KINEO-YTCONNECT-2026-07-26 — lê o `?yt=` que /api/youtube/callback agora
  // manda para cá (antes ia para /dashboard e evaporava). Lido UMA vez e
  // apagado da URL com replaceState — a rota é force-dynamic, então um
  // router.replace remontaria a árvore inteira no caminho do usuário (o mesmo
  // problema documentado no PUSH #96) e um F5 com o param ainda na barra
  // ressuscitaria um erro já resolvido.
  useEffect(() => {
    const raw = searchParams.get('yt')
    if (!raw) return
    const outcome = YT_OUTCOMES[raw] ? raw : 'failed'
    setYtOutcome(outcome)
    setYtChannelTitle(searchParams.get('ch'))
    const rawCount = Number(searchParams.get('n'))
    const channelCount = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0
    setYtChannelCount(channelCount)
    // `channel_count` no evento é o que responde, com dado e não com palpite,
    // quão comum é a conta com mais de um canal — e portanto quanto o seletor
    // realmente vale.
    track('youtube_connect_outcome_viewed', { outcome, raw, channel_count: channelCount })
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('yt')
      url.searchParams.delete('ch')
      url.searchParams.delete('n')
      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    } catch {
      /* URL/history indisponível — o banner já está em tela, que é o que importa */
    }
  }, [searchParams])

  // ── Ações ─────────────────────────────────────────────────────────────────
  async function createSchedule() {
    if (busy || postHourUtc === null) return
    // KINEO-YTCHANNEL-PICK-2026-07-27 — sem canal resolvido não se agenda nada.
    // Antes ia `data?.channels[0]?.id`, que podia ser undefined e deixava o
    // servidor escolher — o mesmo "escolhe sozinho e não avisa" de novo.
    if (!selectedChannel) {
      setFormError('Pick the channel Autopilot should publish to.')
      return
    }
    setBusy(true)
    setFormError(null)
    track('autopilot_create_submitted', {
      niche,
      post_hour_utc: postHourUtc,
      privacy: createPrivacy,
      channel_count: channels.length,
      // Descobre, com dado, se as pessoas de fato trocam o canal sugerido.
      channel_switched: selectedChannel.id !== channels[0]?.id,
    })
    try {
      const res = await fetch('/api/autopilot/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          niche,
          postHourUtc,
          postsPerDay: 1,
          privacyStatus: createPrivacy,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
        track('autopilot_create_failed', { http_status: res.status, code: json?.code ?? null })
        setFormError(json?.error ?? 'Something went wrong. Try again.')
        // 402/409 mudam o estado da página (plano, canal, agenda já existente):
        // recarrega para o usuário ver a tela certa em vez de um erro solto.
        if (res.status === 402 || res.status === 409) await load()
        return
      }
      track('autopilot_create_succeeded', { niche, post_hour_utc: postHourUtc })
      setJustCreated(true)
      await load()
    } catch {
      track('autopilot_create_failed', { reason: 'network_error' })
      setFormError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function patchSchedule(patch: Record<string, unknown>, label: string) {
    if (!schedule || busy) return
    setBusy(true)
    setFormError(null)
    try {
      const res = await fetch('/api/autopilot/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id, ...patch }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
        track('autopilot_patch_failed', { action: label, http_status: res.status, code: json?.code ?? null })
        setFormError(json?.error ?? 'Could not save that change.')
        return
      }
      track('autopilot_patch_succeeded', { action: label })
      await load()
    } catch {
      setFormError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteSchedule() {
    if (!schedule || busy) return
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Turn Autopilot off completely? Your channel stops posting and the schedule is deleted.',
      )
      if (!ok) return
    }
    setBusy(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/autopilot/schedules?id=${encodeURIComponent(schedule.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        setFormError(json?.error ?? 'Could not turn Autopilot off.')
        return
      }
      track('autopilot_delete_succeeded')
      setJustCreated(false)
      setSettingsOpen(false)
      await load()
    } catch {
      setFormError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // KINEO-YTCONNECT-2026-07-26 — o banner do desfecho do OAuth. Aparece em
  // TODOS os estados da página, porque o desfecho não é previsível a partir do
  // estado: um `no_channel` cai no estado "sem canal", um `connected` cai no
  // formulário, e um `config_error` pode cair em qualquer um deles.
  const outcomeCopy = ytOutcome ? YT_OUTCOMES[ytOutcome] ?? YT_OUTCOMES.failed : null
  const ytBanner = outcomeCopy ? (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: OUTCOME_STYLE[outcomeCopy.tone].bg,
        border: OUTCOME_STYLE[outcomeCopy.tone].border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-black text-sm" style={{ color: OUTCOME_STYLE[outcomeCopy.tone].color }}>
          {/* KINEO-YTCHANNEL-PICK-2026-07-27 — três títulos, não dois.
              Anunciar "X is connected" quando o token alcançou VÁRIOS canais
              esconde a escolha que ainda falta fazer, que é o bug original com
              outra roupa. Com N > 1 o banner pede a escolha em vez de afirmar
              um resultado. */}
          {ytOutcome !== 'connected'
            ? outcomeCopy.title
            : ytChannelCount > 1
              ? `${ytChannelCount} channels connected — pick the one to post to.`
              : ytChannelTitle
                ? `${ytChannelTitle} is connected.`
                : outcomeCopy.title}
        </div>
        <button
          type="button"
          onClick={() => setYtOutcome(null)}
          aria-label="Dismiss"
          className="text-xs font-black"
          style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 0, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      <p className="text-xs mt-2 mb-0" style={{ color: MUTED, lineHeight: 1.65 }}>
        {ytOutcome === 'connected' && ytChannelCount > 1
          ? 'Your Google account owns more than one YouTube channel, so Kineo connected all of them instead of guessing. Choose the destination below before turning Autopilot on.'
          : outcomeCopy.body}
      </p>
      {outcomeCopy.retry ? (
        // `add=1` de propósito: acrescenta select_account. Sem isso o Google
        // reusa em silêncio a conta já logada, e a retentativa de um
        // `no_channel` repetiria EXATAMENTE a mesma conta sem canal para sempre.
        <a
          href="/api/youtube/auth?add=1"
          onClick={() => trackConnectClick('connect', ytOutcome)}
          className="inline-block text-xs font-black mt-3"
          style={{ ...quietButton, textDecoration: 'none', display: 'inline-block' }}
        >
          Try connecting again →
        </a>
      ) : null}
    </div>
  ) : null

  if (loading) {
    return (
      <div className={WRAP}>
        <div className="rounded-2xl" style={{ background: CARD, border: BORDER, height: 220 }} />
      </div>
    )
  }

  if (authRequired) {
    return (
      <div className={WRAP}>
        <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)' }}>
          <div className="text-5xl mb-4">🛫</div>
          <h1 className="font-black tracking-tight mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: TEXT }}>
            Sign in to set up Autopilot
          </h1>
          <p className="text-sm mb-6 mx-auto" style={{ color: MUTED, maxWidth: 460, lineHeight: 1.6 }}>
            Autopilot posts to your YouTube channel, so it lives inside your Kineo account.
          </p>
          <Link
            href="/login?redirect=%2Fautopilot"
            className="inline-block rounded-xl px-7 py-3 text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg, #2997ff, #2997ff)', textDecoration: 'none' }}
          >
            Sign in and continue →
          </Link>
        </div>
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className={WRAP}>
        {ytBanner}
        <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: BORDER }}>
          <p className="text-sm" style={{ color: MUTED }}>{loadError ?? 'Something went wrong.'}</p>
        </div>
      </div>
    )
  }

  const header = (
    <header className="mb-6">
      <div className="font-black uppercase tracking-[.18em] mb-2" style={{ fontSize: '0.62rem', color: CYAN }}>
        Autopilot
      </div>
      <h1 className="font-black tracking-tight mb-2" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: TEXT }}>
        You stop showing up. The channel keeps posting.
      </h1>
      <p className="text-sm" style={{ color: MUTED, lineHeight: 1.6, maxWidth: 560 }}>
        Pick a topic and a time once. Every day Kineo writes the script, makes the Short and
        publishes it to your channel — whether or not you open this tab.
      </p>
    </header>
  )

  // ── ESTADO 1: sem direito ao Autopilot ────────────────────────────────────
  // KINEO-PAID-NOT-ENTITLED-2026-08-06 — DUAS coortes, e elas precisam ouvir
  // coisas diferentes. Ver a nota em isOnPaidPlan().
  if (!data.entitled) {
    const rawPlan = (data.plan ?? '').toString().trim().toLowerCase()
    // O piloto de $99 é compra ÚNICA com prazo: `plan` continua
    // 'autopilot_pilot' para sempre e só `plan_expires_at` o mata
    // (lib/autopilot/config.isAutopilotEntitled). Sem este branch ele leria
    // "Autopilot is a separate plan from the one you have" — falso: o plano
    // DELE era o Autopilot, e ele viu a máquina publicar por 7 dias. Este é o
    // único usuário que já provou o produto, e é onde o upsell de $299 vive.
    const pilotEnded = rawPlan === AUTOPILOT_PILOT_PLAN
    // "Está tudo como você deixou" é uma afirmação sobre o ESTADO, e o estado
    // vem no payload (a rota devolve channels/schedules antes de qualquer gate
    // de direito). Um comprador do piloto que nunca conectou o canal leria uma
    // frase falsa — a mesma classe de mentira-na-tela que esta mudança corrige.
    const pilotHadSetup =
      pilotEnded && data.schedules.length > 0 && data.channels.length > 0
    const onPaidPlan = isOnPaidPlan(data.plan)
    const currentPlanName = planDisplayName(data.plan)
    // "Faça você mesmo" só é um convite se houver crédito para gastar. Sem
    // saldo, /generate deixa o usuário escrever o prompt, queima OpenAI/Pexels
    // e só recusa no fim (compose devolve 402) — pedir sem poder entregar.
    const canGenerateNow = data.credits >= data.creditCostPerVideo
    return (
      <div className={WRAP}>
        {header}
        {ytBanner}
        <div
          className="rounded-2xl p-7"
          style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 40px rgba(41,151,255,.08)' }}
        >
          <div className="font-black mb-2" style={{ fontSize: '1.15rem', color: TEXT }}>
            {pilotEnded
              ? 'Your Autopilot pilot has ended.'
              : onPaidPlan
                ? currentPlanName
                  ? `You're on ${currentPlanName}. Autopilot is a separate plan.`
                  : 'Autopilot is a separate plan from the one you have.'
                : 'Autopilot is part of the paid plans.'}
          </div>
          <p className="text-sm mb-5" style={{ color: MUTED, lineHeight: 1.65 }}>
            {pilotEnded ? (
              pilotHadSetup ? (
                <>
                  Nothing is being published to your channel right now. Everything you set up is
                  still here — pick Autopilot back up and the daily Short starts again from the next
                  slot, with the same channel and the same schedule.
                </>
              ) : (
                <>
                  Nothing is publishing to your channel right now, and there is no schedule set up
                  yet. Autopilot takes two fields — what your channel is about and what time it
                  posts — and it publishes a Short every day from there.
                </>
              )
            ) : onPaidPlan ? (
              <>
                {currentPlanName ?? 'Your plan'} gives you credits to make videos yourself.
                Autopilot is the one that runs the channel for you: it writes, makes and publishes
                a Short to your YouTube every day, whether or not you open this tab. It is a
                different plan rather than an add-on, so starting it means switching — you can
                change or cancel your current plan in{' '}
                <Link href="/account" style={{ color: CYAN, fontWeight: 700 }}>Account</Link>.
              </>
            ) : (
              <>
                Publishing to your channel on its own — every day, with no one watching — is the one
                thing we only do for paying accounts. Upgrade and this page becomes a two-field form:
                what your channel is about, and what time it posts.
              </>
            )}
          </p>
          <ul className="text-sm mb-6" style={{ color: MUTED, lineHeight: 1.9, listStyle: 'none', padding: 0, margin: 0 }}>
            <li>· A finished, voiced, captioned Short published daily</li>
            <li>· Topics pulled from what is trending in your niche today</li>
            <li>· Pause any time, in one click</li>
          </ul>
          <div className="flex flex-wrap items-center gap-4">
          <Link
            href={
              pilotEnded
                ? '/pricing?src=autopilot_pilot_ended#autopilot'
                : onPaidPlan
                  ? '/pricing?src=autopilot_paid#autopilot'
                  : '/pricing?src=autopilot'
            }
            onClick={() =>
              track('autopilot_upgrade_clicked', {
                plan: data.plan,
                on_paid_plan: onPaidPlan,
                pilot_ended: pilotEnded,
              })
            }
            className="inline-block text-sm"
            style={{ ...primaryButton, textDecoration: 'none', display: 'inline-block' }}
          >
            {pilotEnded
              ? 'Keep Autopilot running →'
              : onPaidPlan
                ? 'See what Autopilot adds →'
                : 'See plans and unlock Autopilot →'}
          </Link>
          {/* A PORTA DE VOLTA. Um assinante que veio olhar o Autopilot e disse
              "agora não" saía desta tela sem nenhum caminho para o produto que
              ele JÁ pagou — o único link era o de gastar mais. Foi exatamente
              o que aconteceu com o Starter de 01/08: pagou, veio aqui 12 min
              depois, leu que aquilo era "para quem paga", e nunca gerou um
              único vídeo. */}
          {/* Só aparece quando LEVA a algum lugar novo. Sem saldo, este link
              apontaria para /pricing — o mesmo destino do botão ao lado — e
              dois links irmãos para a mesma página não são uma escolha, são
              ruído. Quem está sem crédito já tem o CTA principal. */}
          {onPaidPlan && canGenerateNow ? (
            <Link
              href="/studio"
              onClick={() =>
                track('autopilot_generate_clicked', { plan: data.plan, credits: data.credits })
              }
              className="text-sm"
              style={{ color: CYAN, fontWeight: 800, textDecoration: 'none' }}
            >
              Or make one yourself now →
            </Link>
          ) : null}
          </div>
        </div>
      </div>
    )
  }

  // ── ESTADO 2: sem canal ───────────────────────────────────────────────────
  if (data.channels.length === 0) {
    return (
      <div className={WRAP}>
        {header}
        {ytBanner}
        <div
          className="rounded-2xl p-7"
          style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)', boxShadow: '0 0 40px rgba(41,151,255,.08)' }}
        >
          <div className="font-black mb-2" style={{ fontSize: '1.15rem', color: TEXT }}>
            First, connect the channel that will do the posting.
          </div>
          <p className="text-sm mb-6" style={{ color: MUTED, lineHeight: 1.65 }}>
            One Google sign-in. Kineo only gets permission to upload videos to that channel —
            and you can disconnect it whenever you want.
          </p>
          <a
            href="/api/youtube/auth"
            onClick={() => trackConnectClick('connect', ytOutcome)}
            className="inline-block text-sm"
            style={{ ...primaryButton, textDecoration: 'none', display: 'inline-block' }}
          >
            Connect your YouTube channel →
          </a>
        </div>
      </div>
    )
  }

  const channel = selectedChannel ?? data.channels[0]

  // ── KINEO-YTCHANNEL-PICK-2026-07-27 — O DESTINO, SEM AMBIGUIDADE ──────────
  // O rótulo antigo era "Posting to" + título do canal, e o fundador leu isso
  // como o nome da CONTA Google, não como o canal de destino — enquanto o
  // sistema tinha silenciosamente escolhido o canal pessoal (0 inscritos) em vez
  // do canal de verdade (12.600). Três mudanças, todas para tirar a ambiguidade:
  //   1. a frase diz o que vai ACONTECER ("publish a public Short every day to"),
  //      não uma preposição solta;
  //   2. o título vira LINK para o canal real no YouTube — clicar resolve
  //      qualquer dúvida em um segundo, e o id UC… nunca colide entre dois
  //      canais de títulos parecidos;
  //   3. existe sempre uma saída "not this channel?", porque quem escolhe o
  //      canal é a tela de consentimento do Google e a única forma de trocar é
  //      voltar lá com prompt=select_account (/api/youtube/auth?add=1).
  const channelDestination = (
    <div className="rounded-2xl p-4 mb-4" style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)' }}>
      {channels.length > 1 ? (
        <>
          <label htmlFor="ap-channel" style={labelStyle}>
            Which channel should Autopilot publish to?
          </label>
          <select
            id="ap-channel"
            value={channel?.id ?? ''}
            onChange={(e) => {
              setSelectedChannelId(e.target.value)
              track('autopilot_channel_selected', { channel_count: channels.length })
            }}
            style={fieldStyle}
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title ?? 'Untitled channel'}
              </option>
            ))}
          </select>
          <p className="text-[11px] mt-2" style={{ color: MUTED, lineHeight: 1.6 }}>
            You have {channels.length} channels connected. Autopilot posts to the one selected here.
          </p>
        </>
      ) : null}

      <div className="flex items-center gap-3" style={{ marginTop: channels.length > 1 ? 14 : 0 }}>
        {channel?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnailUrl}
            alt=""
            width={44}
            height={44}
            style={{ borderRadius: 999, flexShrink: 0 }}
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#2997ff' }}>
            Autopilot will publish to this YouTube channel
          </div>
          {channel?.externalChannelId ? (
            <a
              href={`https://www.youtube.com/channel/${channel.externalChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('autopilot_channel_verify_clicked', {})}
              className="font-black text-sm"
              style={{ color: TEXT, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {channel.title ?? 'Your YouTube channel'} ↗
            </a>
          ) : (
            <div className="font-black text-sm" style={{ color: TEXT }}>
              {channel?.title ?? 'Your YouTube channel'}
            </div>
          )}
          <div className="text-[11px] mt-1" style={{ color: MUTED }}>
            Open it to make sure it is the right one.
          </div>
        </div>
      </div>

      <a
        href="/api/youtube/auth?add=1"
        onClick={() => trackConnectClick('switch_channel', ytOutcome)}
        className="inline-block text-[11px] font-black mt-3"
        style={{ color: MUTED, textDecoration: 'underline' }}
      >
        Not this channel? Connect a different one →
      </a>
    </div>
  )

  // ── ESTADO 3: canal conectado, sem agenda → o formulário (2 campos) ──────
  if (!schedule) {
    return (
      <div className={WRAP}>
        {header}
        {ytBanner}

        {channel.needsReconnect ? (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.32)' }}
          >
            <div className="font-black mb-1 text-sm" style={{ color: '#fbbf24' }}>
              Reconnect {channel.title ?? 'your channel'} before turning Autopilot on.
            </div>
            <p className="text-xs mb-3" style={{ color: MUTED, lineHeight: 1.6 }}>
              YouTube revoked our permission to post. Autopilot would skip every day until this is
              fixed.
            </p>
            <a
              href="/api/youtube/auth"
              onClick={() => trackConnectClick('reconnect', ytOutcome)}
              className="inline-block text-xs font-black"
              style={{ ...quietButton, textDecoration: 'none', display: 'inline-block' }}
            >
              Reconnect channel →
            </a>
          </div>
        ) : null}

        {/* KINEO-YTCHANNEL-PICK-2026-07-27 — o destino vem ANTES do formulário e
            fora do card: quem está prestes a ligar publicação diária no canal de
            outra pessoa precisa ver o canal primeiro, não depois de escolher o
            nicho. Substitui o antigo "Posting to" (ver channelDestination). */}
        {channelDestination}

        <div className="rounded-2xl p-6" style={{ background: CARD, border: '1px solid rgba(41,151,255,.28)' }}>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label htmlFor="ap-niche" style={labelStyle}>
                What is the channel about?
              </label>
              <select
                id="ap-niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                style={fieldStyle}
              >
                {NICHES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ap-hour" style={labelStyle}>
                What time should it post?
              </label>
              <select
                id="ap-hour"
                value={postHourUtc ?? ''}
                onChange={(e) => setPostHourUtc(Number(e.target.value))}
                style={fieldStyle}
              >
                {hourOptions.map((o) => (
                  <option key={o.utcHour} value={o.utcHour}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-2" style={{ color: MUTED }}>
                Your local time. One Short a day, every day.
              </p>
            </div>
          </div>

          {/* KINEO-YTCHANNEL-PICK-2026-07-27 — a visibilidade era `'public'`
              cravada no código deste formulário, sem NENHUM caminho na UI para
              outra coisa, apesar de a coluna privacy_status e o seletor da tela
              de ajustes já aceitarem os três valores. Um pipeline que nunca
              completou de ponta a ponta em produção não deveria estrear em
              público no canal de um cliente pagante, então o padrão aqui é
              Unlisted — e trocar para Public é um clique, no mesmo campo. */}
          <div className="mb-5">
            <label htmlFor="ap-privacy" style={labelStyle}>
              How should the first videos go up?
            </label>
            <select
              id="ap-privacy"
              value={createPrivacy}
              onChange={(e) => {
                setCreatePrivacy(e.target.value)
                track('autopilot_privacy_selected', { privacy: e.target.value, stage: 'create' })
              }}
              style={fieldStyle}
            >
              <option value="unlisted">Unlisted — only people with the link (recommended to start)</option>
              <option value="public">Public — visible on your channel and in search</option>
              <option value="private">Private — only you</option>
            </select>
            <p className="text-xs mt-2" style={{ color: MUTED, lineHeight: 1.6 }}>
              {createPrivacy === 'public'
                ? 'Every Short goes straight to your public channel from day one.'
                : 'Watch the first few, then switch to Public in settings — Autopilot keeps posting either way.'}
            </p>
          </div>

          {formError ? (
            <p className="text-xs mb-4" style={{ color: '#ef4444', lineHeight: 1.6 }}>
              {formError}
            </p>
          ) : null}

          <button type="button" onClick={createSchedule} disabled={busy} style={{ ...primaryButton, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Turning it on…' : 'Turn Autopilot on'}
          </button>

          <p className="text-xs mt-4" style={{ color: MUTED, lineHeight: 1.7 }}>
            {data.creditCostPerVideo === 0
              ? 'Included in your plan.'
              : `${data.creditCostPerVideo} credit per video · you have ${data.credits}.`}{' '}
            {/* A frase antiga era "Videos go up as public Shorts", cravada.
                Agora a visibilidade é escolha do usuário logo acima, então a
                copy tem de refletir a escolha REAL — senão a tela promete uma
                coisa e o cron faz outra. */}
            {createPrivacy === 'public'
              ? 'Videos go up as public Shorts.'
              : createPrivacy === 'private'
                ? 'Videos go up as private Shorts, visible only to you.'
                : 'Videos go up as unlisted Shorts — reachable by link, not shown on your channel.'}{' '}
            Change the topic, the time, the visibility or pause it whenever you want.
          </p>
        </div>
      </div>
    )
  }

  // ── ESTADO 4: agenda existe ───────────────────────────────────────────────
  // O canal DA AGENDA, que não é necessariamente o selecionado no seletor acima:
  // a agenda guarda o próprio channel_id e é ele que o cron lê.
  const scheduleChannel = channels.find((c) => c.id === schedule.channelId) ?? null
  const runs = schedule.runs ?? []
  const published = runs.filter((r) => r.status === 'succeeded').length
  const nextLabel = schedule.enabled ? fmtDateTime(schedule.nextRunAt) : 'Paused'
  const nextRelative = schedule.enabled ? fmtRelative(schedule.nextRunAt) : ''

  return (
    <div className={WRAP}>
      {header}
      {ytBanner}

      {justCreated ? (
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.35)' }}
        >
          <div className="font-black mb-1" style={{ fontSize: '1.05rem', color: TEXT }}>
            That&apos;s it. You&apos;re done.
          </div>
          <p className="text-sm" style={{ color: MUTED, lineHeight: 1.6, margin: 0 }}>
            Nothing else to configure and nothing to remember. Close this tab — the first Short
            goes up at {localHourLabel(schedule.postHourUtc)} and you can come back here any time to
            see what got published.
          </p>
        </div>
      ) : null}

      {schedule.channelNeedsReconnect ? (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.32)' }}
        >
          <div className="font-black mb-1 text-sm" style={{ color: '#fbbf24' }}>
            YouTube disconnected — nothing is being posted.
          </div>
          <p className="text-xs mb-3" style={{ color: MUTED, lineHeight: 1.6 }}>
            Autopilot will keep skipping every day until you reconnect the channel.
          </p>
          <a
            href="/api/youtube/auth"
            onClick={() => trackConnectClick('reconnect', ytOutcome)}
            className="inline-block text-xs font-black"
            style={{ ...quietButton, textDecoration: 'none', display: 'inline-block' }}
          >
            Reconnect channel →
          </a>
        </div>
      ) : null}

      {/* Cartão principal: o que vai ao ar e quando. */}
      <div
        className="rounded-2xl p-6 mb-4"
        style={{
          background: CARD,
          border: schedule.enabled ? '1px solid rgba(41,151,255,.28)' : BORDER,
          boxShadow: schedule.enabled ? '0 0 30px rgba(41,151,255,.08)' : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
            {schedule.channelThumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={schedule.channelThumbnailUrl}
                alt=""
                width={44}
                height={44}
                style={{ borderRadius: 999, flexShrink: 0 }}
              />
            ) : null}
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: schedule.enabled ? CYAN : MUTED,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span className="font-black text-sm" style={{ color: TEXT }}>
                  {schedule.enabled ? 'Autopilot is on' : 'Autopilot is paused'}
                </span>
              </div>
              {/* KINEO-YTCHANNEL-PICK-2026-07-27 — com o Autopilot LIGADO, saber
                  em qual canal ele publica é a informação mais importante da
                  tela, não um subtítulo. O título vira link para o canal real
                  (o id UC… desambigua dois canais de nome parecido) e a frase
                  diz "publishing to", não um ponto separando dois rótulos. */}
              <div className="text-xs mt-1" style={{ color: MUTED }}>
                Publishing to{' '}
                {scheduleChannel?.externalChannelId ? (
                  <a
                    href={`https://www.youtube.com/channel/${scheduleChannel.externalChannelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('autopilot_channel_verify_clicked', { state: 'schedule_active' })}
                    style={{ color: TEXT, fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    {schedule.channelTitle ?? 'your channel'} ↗
                  </a>
                ) : (
                  <span style={{ color: TEXT, fontWeight: 800 }}>
                    {schedule.channelTitle ?? 'your channel'}
                  </span>
                )}{' '}
                · {nicheLabel(schedule.niche)} · {privacyLabel(schedule.privacyStatus)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => patchSchedule({ enabled: !schedule.enabled }, schedule.enabled ? 'pause' : 'resume')}
            disabled={busy}
            style={{ ...quietButton, opacity: busy ? 0.6 : 1 }}
          >
            {schedule.enabled ? 'Pause posting' : 'Resume posting'}
          </button>
        </div>

        <div
          className="mt-5 pt-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: MUTED }}>
            Next Short
          </div>
          <div className="font-black" style={{ fontSize: '1.35rem', color: schedule.enabled ? CYAN : MUTED, lineHeight: 1.2 }}>
            {nextLabel}
            {nextRelative ? (
              <span className="font-bold" style={{ fontSize: '0.85rem', color: MUTED, marginLeft: 8 }}>
                {nextRelative}
              </span>
            ) : null}
          </div>
          <p className="text-xs mt-2" style={{ color: MUTED, lineHeight: 1.6 }}>
            {schedule.enabled
              ? `Posting at ${localHourLabel(schedule.postHourUtc)} your time${
                  schedule.postsPerDay > 1 ? ` · ${schedule.postsPerDay}× a day` : ''
                }. Times shown in your local timezone.`
              : 'Nothing will be posted while Autopilot is paused. Resume any time.'}
          </p>
        </div>
      </div>

      {/* Ajustes — dobrados por padrão. A tela normal é "está no ar", não um painel. */}
      <div className="rounded-2xl mb-5" style={{ background: CARD, border: BORDER }}>
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
            Settings
          </span>
          <span className="text-xs font-black" style={{ color: CYAN }}>
            {settingsOpen ? 'Hide' : 'Change topic, time or frequency'}
          </span>
        </button>

        {settingsOpen ? (
          <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18 }}>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="ap-niche-edit" style={labelStyle}>
                  Topic
                </label>
                <select
                  id="ap-niche-edit"
                  value={schedule.niche ?? NICHES[0].value}
                  onChange={(e) => patchSchedule({ niche: e.target.value }, 'niche')}
                  disabled={busy}
                  style={fieldStyle}
                >
                  {NICHES.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                  {schedule.niche && !NICHES.some((n) => n.value === schedule.niche) ? (
                    <option value={schedule.niche}>{schedule.niche}</option>
                  ) : null}
                </select>
              </div>
              <div>
                <label htmlFor="ap-hour-edit" style={labelStyle}>
                  Posting time (your time)
                </label>
                <select
                  id="ap-hour-edit"
                  value={schedule.postHourUtc}
                  onChange={(e) => patchSchedule({ postHourUtc: Number(e.target.value) }, 'post_hour')}
                  disabled={busy}
                  style={fieldStyle}
                >
                  {hourOptions.map((o) => (
                    <option key={o.utcHour} value={o.utcHour}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ap-per-day" style={labelStyle}>
                  Shorts per day
                </label>
                <select
                  id="ap-per-day"
                  value={editPostsPerDay}
                  onChange={(e) => patchSchedule({ postsPerDay: Number(e.target.value) }, 'posts_per_day')}
                  disabled={busy}
                  style={fieldStyle}
                >
                  <option value={1}>1 a day</option>
                  <option value={2}>2 a day</option>
                  <option value={3}>3 a day</option>
                </select>
              </div>
              <div>
                <label htmlFor="ap-privacy" style={labelStyle}>
                  Publish as
                </label>
                <select
                  id="ap-privacy"
                  value={editPrivacy}
                  onChange={(e) => patchSchedule({ privacyStatus: e.target.value }, 'privacy')}
                  disabled={busy}
                  style={fieldStyle}
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={deleteSchedule}
              disabled={busy}
              className="text-xs font-black"
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
            >
              Turn Autopilot off and delete this schedule
            </button>
          </div>
        ) : null}
      </div>

      {formError ? (
        <p className="text-xs mb-4" style={{ color: '#ef4444', lineHeight: 1.6 }}>
          {formError}
        </p>
      ) : null}

      {/* Histórico — a prova de que está acontecendo sem ele. */}
      <section>
        <h2
          className="font-black tracking-tight mb-3"
          style={{ fontSize: '0.85rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          Recent posts{published > 0 ? ` · ${published} published` : ''}
        </h2>
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: BORDER }}>
          {runs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: MUTED, lineHeight: 1.6 }}>
              Nothing yet. The first Short goes up at {localHourLabel(schedule.postHourUtc)} your
              time — you don&apos;t have to be here for it.
            </div>
          ) : (
            runs.map((run, i) => (
              <div
                key={run.id}
                className="px-5 py-4 flex items-start justify-between gap-3"
                style={{ borderTop: i === 0 ? 'none' : BORDER }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="text-sm font-bold" style={{ color: TEXT, lineHeight: 1.45 }}>
                    {run.topic ?? 'Picking a topic…'}
                  </div>
                  <div className="text-xs mt-1" style={{ color: MUTED }}>
                    {fmtDateTime(run.finishedAt ?? run.startedAt)}
                    {run.status === 'skipped' && run.reason
                      ? ` · ${SKIP_REASON[run.reason] ?? run.reason}`
                      : ''}
                    {run.status === 'failed'
                      ? ' · We could not finish this one. The next one is unaffected.'
                      : ''}
                  </div>
                  {run.youtubeUrl ? (
                    <a
                      href={run.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('autopilot_video_opened', { run_id: run.id })}
                      className="inline-block text-xs font-black mt-2"
                      style={{ color: CYAN, textDecoration: 'none' }}
                    >
                      Watch on YouTube →
                    </a>
                  ) : null}
                </div>
                <RunStatusBadge status={run.status} />
              </div>
            ))
          )}
        </div>
      </section>

      {data.channels.length === 1 ? (
        <p className="text-xs mt-5" style={{ color: MUTED, lineHeight: 1.7 }}>
          Running more than one channel?{' '}
          <a
            href="/api/youtube/auth?add=1"
            onClick={() => trackConnectClick('add', ytOutcome)}
            style={{ color: CYAN, textDecoration: 'none', fontWeight: 800 }}
          >
            Connect another channel →
          </a>
        </p>
      ) : null}
    </div>
  )
}
