// KINEO-RECOVERY-2026-09-06 — O FILME QUE FICA PRONTO E NUNCA É MONTADO.
//
// O defeito, medido em 06/09 (7 dias, contas externas): 89 pessoas despacharam
// um render, 21 não receberam filme nenhum, e 19 dessas NUNCA foram tocadas
// pela rede de auto-cura (`/api/cron/finish-stranded-renders`). A rede não está
// quebrada — ela salvou 26 pessoas na mesma semana. Ela é CEGA para este estado:
//
//   `GenerateClient.tsx` monta o payload completo do compose no instante em que
//   o Kineo 1 termina os clipes (script, legendas, duração, tópico, clip_urls) e
//   o grava no `localStorage`. SÓ no localStorage. Se a aba morre entre "clipes
//   prontos" e "compose enviado" — e ela morre: o `chatgpt_quickstart_selected`
//   navegou uma pessoa para /studio 9 SEGUNDOS depois do despacho — o filme
//   morre com a aba. As duas portas de entrada da rede (`compose_submission_claim`
//   da fase 3 e o claim cinematográfico da fase 1) são escritas DEPOIS do
//   compose, então aqui nenhuma das duas existe.
//
// Esta rota torna o payload DURÁVEL NO SERVIDOR no mesmo instante em que ele já
// é durável no navegador. Nada mais. Quem termina o filme é a fase 4 do cron,
// pelo MESMO `/api/compose` que o cliente chamaria, no modo serviço que a casa
// já usa desde 19/08 (KINEO-SERVICE-FINISH) — e esse modo substitui só o
// cookie: custo por tier, recusa por saldo e claim assinado rodam idênticos.
//
// ⚠️ PRINCÍPIO DE SEGURANÇA (o motivo de esta rota ser chata): a casa construiu
// a cadeia de claim assinado justamente para NÃO confiar no navegador. Aqui o
// payload vem do cliente, então ele é RECONSTRUÍDO campo a campo — nunca
// repassado — e o dono é sempre o usuário autenticado do cookie, nunca um id
// vindo do corpo. O pior que um portador de sessão consegue com esta rota é
// agendar, para si mesmo e com o próprio saldo, um compose que ele já podia
// disparar sozinho chamando /api/compose.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export const RECOVERABLE_EVENT = 'fast_compose_recoverable'

// Hosts de onde os clipes do Kineo 1 legitimamente vêm: Pixabay (motor de
// b-roll desde o #351), o nosso próprio bucket (clip vault, stock library e o
// hook de IA, que grava em storage antes de devolver) e a mídia da fal.
// Falha FECHADA de propósito: host desconhecido não vira filme adiado, vira
// recusa — melhor não resgatar do que compor mídia de origem desconhecida.
const ALLOWED_CLIP_HOSTS = [
  'pixabay.com',
  'cdn.pixabay.com',
  'supabase.co',
  'supabase.in',
  'fal.media',
]

const MAX_CLIPS = 24
const MAX_SCRIPT_CHARS = 8000
const MAX_CAPTIONS = 48
const MAX_CAPTION_CHARS = 400
const MAX_TOPIC_CHARS = 1000

function hostAllowed(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  const host = u.hostname.toLowerCase()
  return ALLOWED_CLIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length === 0) return null
  return s.slice(0, max)
}

/**
 * Reconstrói o payload de compose a partir do corpo do cliente, campo a campo.
 * Devolve `null` quando o payload não serve para um resgate honesto — e o
 * chamador responde 400 sem gravar nada. NUNCA repassa chave desconhecida:
 * o objeto devolvido é novo, com exatamente os campos abaixo.
 */
export function sanitizeFastComposePayload(
  generationId: string,
  raw: unknown,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = raw as Record<string, unknown>

  // Só o Kineo 1 (fast). O caminho cinematográfico JÁ tem resgate próprio pela
  // fase 1 do cron, com claim assinado — duplicar aqui seria criar uma porta
  // mais fraca para o mesmo filme.
  if (p.quality !== 'fast') return null

  const urls = Array.isArray(p.clip_urls) ? p.clip_urls : null
  if (!urls || urls.length === 0 || urls.length > MAX_CLIPS) return null
  const clipUrls: string[] = []
  for (const u of urls) {
    if (!hostAllowed(u)) return null
    clipUrls.push(u as string)
  }

  const duration = typeof p.duration === 'number' ? Math.round(p.duration) : NaN
  if (!Number.isFinite(duration) || duration < 5 || duration > 120) return null

  const voiceover = cleanString(p.voiceover_script, MAX_SCRIPT_CHARS)
  if (!voiceover) return null

  const captionsRaw = Array.isArray(p.scene_captions) ? p.scene_captions : []
  const captions = captionsRaw
    .slice(0, MAX_CAPTIONS)
    .map((c) => (typeof c === 'string' ? c.slice(0, MAX_CAPTION_CHARS) : ''))

  const out: Record<string, unknown> = {
    // O generationId do PATH validado, nunca o que veio no corpo.
    generationId,
    clip_urls: clipUrls,
    voiceover_script: voiceover,
    scene_captions: captions,
    duration,
    quality: 'fast',
  }
  const topic = cleanString(p.topic, MAX_TOPIC_CHARS)
  if (topic) out.topic = topic
  const language = cleanString(p.language, 16)
  if (language) out.language = language
  const vertical = cleanString(p.vertical, 64)
  if (vertical) out.vertical = vertical
  if (typeof p.speed === 'number' && Number.isFinite(p.speed)) out.speed = p.speed
  return out
}

const GENERATION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // O dono é SEMPRE o usuário do cookie. Nenhum id vindo do corpo é lido.
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Bad body.' }, { status: 400 })
  }

  const generationId = typeof body.generationId === 'string' ? body.generationId.trim() : ''
  if (!GENERATION_ID_RE.test(generationId)) {
    return NextResponse.json({ error: 'Bad generationId.' }, { status: 400 })
  }

  const payload = sanitizeFastComposePayload(generationId, body.composePayload)
  if (!payload) return NextResponse.json({ error: 'Unsupported payload.' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Unavailable.' }, { status: 503 })
  const admin = createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Idempotente: um checkpoint por geração. O cliente regrava o checkpoint em
  // cada re-render da tela, e reescrever aqui só multiplicaria linha para a
  // fase 4 varrer.
  const { data: existing } = await admin
    .from('events')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', RECOVERABLE_EVENT)
    .eq('session_id', generationId)
    .limit(1)
  if ((existing ?? []).length > 0) {
    return NextResponse.json({ ok: true, stored: false, reason: 'already_recoverable' })
  }

  const { error } = await admin.from('events').insert({
    user_id: user.id,
    name: RECOVERABLE_EVENT,
    session_id: generationId,
    metadata: { payload, clips: (payload.clip_urls as string[]).length },
  })
  if (error) {
    console.error('[render-recovery] insert failed:', error.message)
    return NextResponse.json({ error: 'Store failed.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, stored: true })
}
