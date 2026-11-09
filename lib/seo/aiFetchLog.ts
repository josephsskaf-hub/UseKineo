// KINEO-ROBO-IA-1011 — registra quando um robô de IA LÊ uma página nossa (missão [Citações Claude], dia 2;
// decisão D1 do CEO em 09/11, com 4 travas).
//
// POR QUE EXISTE: a visita que vem de uma citação do Claude chega SEM referrer e SEM utm (o claude.ai força
// `noopener noreferrer`), e os logs da Vercel não guardam user-agent. Sem isto, não há como saber se o Claude lê a
// Kineo. `Claude-User` = alguém perguntou ao Claude e ele abriu a nossa página naquele momento; é a métrica do Claude.
//
// AS 4 TRAVAS (CEO OPUS, 09/11):
//   (a) bloco isolado no middleware, sem tocar no trecho TRAVA 8.2 das línguas (o guardião prova byte a byte);
//   (b) nunca atrasa a página: o middleware entrega a promessa ao `waitUntil`, sem `await`; erro engolido; só roda
//       quando o user-agent casa com a lista abaixo;
//   (c) teto de volume: id determinístico (robô + página + período) com `on_conflict=id` + ignore-duplicates →
//       no máximo 1 linha por robô, página e HORA (leitura de usuário) ou DIA (busca/treino); robôs de treino só em
//       1 de cada 10 páginas (sorteio fixo pela página); nunca grava IP nem query string;
//   (d) `session_id` e `user_id` NULOS e nome próprio `ai_fetch`: admin_live_counters e admin_numeros_empresa só contam
//       evento com session_id, então isto nunca entra em visitantes, page_view ou funil.
//
// O user-agent pode ser falsificado. Para a família Anthropic grava-se só o booleano `ip_anthropic` (IP na faixa de
// saída 160.79.104.0/21, espelho de lib/mcp/kineoMcp.ts — o guardião confere); o IP em si não sai daqui.

export const AI_FETCH_EVENT = 'ai_fetch'

export type AiFetchKind = 'user' | 'search' | 'training'
export type AiFetcher = { bot: string; family: 'anthropic' | 'openai' | 'perplexity'; kind: AiFetchKind }

// Ordem importa só para leitura; nenhum token contém outro.
export const AI_FETCHERS: readonly AiFetcher[] = [
  { bot: 'Claude-User', family: 'anthropic', kind: 'user' },
  { bot: 'Claude-SearchBot', family: 'anthropic', kind: 'search' },
  { bot: 'ClaudeBot', family: 'anthropic', kind: 'training' },
  { bot: 'ChatGPT-User', family: 'openai', kind: 'user' },
  { bot: 'OAI-SearchBot', family: 'openai', kind: 'search' },
  { bot: 'GPTBot', family: 'openai', kind: 'training' },
  { bot: 'Perplexity-User', family: 'perplexity', kind: 'user' },
  { bot: 'PerplexityBot', family: 'perplexity', kind: 'search' },
]

/** 1 em cada TRAINING_SAMPLE_MOD páginas é registrada para robô de treino (sorteio fixo pela página). */
export const TRAINING_SAMPLE_MOD = 10

const PUBLIC_HOSTS = new Set(['www.usekineo.com', 'usekineo.com'])

export function classifyAiFetcher(userAgent: string | null | undefined): AiFetcher | null {
  const ua = (userAgent ?? '').toLowerCase()
  if (!ua) return null
  for (const f of AI_FETCHERS) {
    const token = f.bot.toLowerCase()
    const i = ua.indexOf(token)
    if (i < 0) continue
    const before = i === 0 ? '' : ua[i - 1]
    const after = ua[i + token.length] ?? ''
    // token inteiro: "Claude-User" não casa com "xclaude-userx"
    if ((before === '' || !/[a-z0-9-]/.test(before)) && (after === '' || !/[a-z0-9-]/.test(after))) return f
  }
  return null
}

/** Período do id: hora para leitura de usuário (conta perguntas), dia para busca/treino (conta cobertura). */
export function aiFetchBucket(kind: AiFetchKind, now: Date): string {
  const iso = now.toISOString()
  return kind === 'user' ? iso.slice(0, 13) : iso.slice(0, 10)
}

export function cleanAiFetchPath(pathname: string): string {
  const p = (pathname || '/').split('?')[0].split('#')[0]
  return p.length > 300 ? p.slice(0, 300) : p
}

const ANTHROPIC_EGRESS_BASE = '160.79.104.0'
const ANTHROPIC_EGRESS_PREFIX = 21

function ipv4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim())
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some((n) => n > 255)) return null
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

export function ipInAnthropicEgress(ip: string | null | undefined): boolean {
  if (!ip) return false
  const n = ipv4ToInt(ip.replace(/^::ffff:/i, ''))
  const base = ipv4ToInt(ANTHROPIC_EGRESS_BASE) as number
  if (n === null) return false
  const mask = (0xffffffff << (32 - ANTHROPIC_EGRESS_PREFIX)) >>> 0
  return ((n & mask) >>> 0) === ((base & mask) >>> 0)
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** UUID determinístico (formato v5) a partir de robô + página + período. */
export async function aiFetchEventId(bot: string, path: string, bucket: string): Promise<string> {
  const h = await sha256Hex(`${AI_FETCH_EVENT}|${bot}|${path}|${bucket}`)
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export async function inTrainingSample(path: string): Promise<boolean> {
  const h = await sha256Hex(`amostra|${path}`)
  return parseInt(h.slice(0, 8), 16) % TRAINING_SAMPLE_MOD === 0
}

export type AiFetchRow = {
  id: string
  name: typeof AI_FETCH_EVENT
  path: string
  session_id: null
  user_id: null
  metadata: { bot: string; family: string; kind: AiFetchKind; bucket: string; method: string; ip_anthropic?: boolean }
}

/** Monta a linha (ou null quando não deve gravar). Puro: sem rede, sem ambiente. */
export async function buildAiFetchRow(input: {
  method: string
  hostname: string
  pathname: string
  userAgent: string | null
  forwardedFor: string | null
  now: Date
}): Promise<AiFetchRow | null> {
  const method = input.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return null
  if (!PUBLIC_HOSTS.has(input.hostname.toLowerCase())) return null
  const fetcher = classifyAiFetcher(input.userAgent)
  if (!fetcher) return null
  const path = cleanAiFetchPath(input.pathname)
  if (path.startsWith('/_next/')) return null
  if (fetcher.kind === 'training' && !(await inTrainingSample(path))) return null
  const bucket = aiFetchBucket(fetcher.kind, input.now)
  const metadata: AiFetchRow['metadata'] = { bot: fetcher.bot, family: fetcher.family, kind: fetcher.kind, bucket, method }
  if (fetcher.family === 'anthropic') {
    const firstIp = (input.forwardedFor ?? '').split(',')[0].trim()
    metadata.ip_anthropic = ipInAnthropicEgress(firstIp)
  }
  return {
    id: await aiFetchEventId(fetcher.bot, path, bucket),
    name: AI_FETCH_EVENT,
    path,
    session_id: null,
    user_id: null,
    metadata,
  }
}

type MinimalRequest = {
  method: string
  nextUrl: { pathname: string }
  headers: { get(name: string): string | null }
}

/**
 * Chamada do middleware. Síncrona e barata para quem não é robô de IA (só lê o user-agent); para robô, entrega o
 * trabalho ao `waitUntil` e volta na hora. Nunca lança.
 */
export function registrarLeituraDeRoboIa(request: MinimalRequest, waitUntil: (p: Promise<unknown>) => void): void {
  try {
    // Interruptor (D1-d da CEO FABLE): AI_FETCH_LOG=off na Vercel desliga sem mudar código (vale no próximo deploy).
    if ((process.env.AI_FETCH_LOG ?? '').trim().toLowerCase() === 'off') return
    const userAgent = request.headers.get('user-agent')
    if (!classifyAiFetcher(userAgent)) return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    const hostname = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '')
      .split(',')[0]
      .trim()
      .split(':')[0]
    const work = buildAiFetchRow({
      method: request.method,
      hostname,
      pathname: request.nextUrl.pathname,
      userAgent,
      forwardedFor: request.headers.get('x-forwarded-for'),
      now: new Date(),
    })
      .then((row) => {
        if (!row) return
        return fetch(`${url}/rest/v1/events?on_conflict=id`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
          },
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(4000),
        }).then(() => undefined)
      })
      .catch(() => undefined)
    waitUntil(work)
  } catch {
    /* registro de robô nunca pode quebrar a página */
  }
}
