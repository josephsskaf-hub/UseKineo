import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { mintUserSession, callAsUser, type UserSession } from '@/lib/autopilot/session'

// ═══ KINEO-DEMO-RENDER-2026-08-21 — FILME CINEMATOGRÁFICO SEM NAVEGADOR ═══
//
// POR QUE ISTO EXISTE: para recrutar criador de afiliado a jogada é mandar um
// FILME PRONTO no nicho dele em vez de um pedido ("testa minha ferramenta").
// Isso é oito filmes hoje, e mais alguns toda semana. Fazer isso clicando no
// site é lento e não escala; e o Autopilot, que já gera sozinho, só usa o
// motor RÁPIDO — justamente o que não impressiona ninguém.
//
// O QUE NÃO FOI FEITO, DE PROPÓSITO: nada da lógica de render foi copiado.
// Esta rota age COMO O DONO DA CONTA — emite uma sessão real e curta via
// service_role e chama as MESMAS rotas HTTP que o browser dele chamaria
// (/api/generate-video-cinematic → /api/cinematic-clip-status → /api/compose).
// Herda de graça: débito de crédito, teto de plano, claim anti-duplo-submit,
// marca d'água e a linha em `videos`. É a mesma escolha de lib/autopilot/
// session.ts, e pelo mesmo motivo: forkar o pipeline é perder paridade de
// cobrança no primeiro bug que alguém corrigir de um lado só.
//
// DUAS ETAPAS, porque um clipe de IA demora minutos e a lambda tem teto:
//   step=start  → submete e devolve o estado (generationId, ids da fal, script)
//   step=finish → recebe esse estado, espera os clipes e monta o filme
// Quem orquestra guarda o estado entre as duas — assim nada fica pendurado
// esperando dentro de uma requisição que vai ser morta por timeout.
//
// ⚠ GASTA DINHEIRO DE VERDADE (fal + Creatomate) e DÉBITA CRÉDITO da conta
// alvo, igualzinho a um render feito à mão. Por isso: CRON_SECRET fail-closed
// e a conta alvo só pode ser resolvida por e-mail explícito no corpo — nunca
// varrendo a tabela de usuários.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface CinematicResposta {
  generationId?: string
  fal_request_ids?: (string | null)[]
  fal_model?: string
  fal_models?: string[]
  voiceover_script?: string
  scene_captions?: string[]
  duration?: number
  quality?: string
  verbatim?: boolean
  speed?: number
  error?: string
  pending?: boolean
  retry_after_ms?: number
  queued?: boolean
}

interface ClipStatusResposta {
  clips?: { id: string; status: string; url: string | null }[]
  allDone?: boolean
  done?: number
  total?: number
  failed?: number
  error?: string
}

interface ComposeResposta {
  render_id?: string
  error?: string
}

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function baseUrlDe(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
}

async function sessaoPara(email: string): Promise<{ session: UserSession; userId: string } | { erro: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) return { erro: 'supabase env incompleto' }
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email.trim())
    .maybeSingle()
  if (error) return { erro: `busca do perfil falhou: ${error.message}` }
  if (!data?.id) return { erro: `nenhuma conta com o e-mail ${email}` }
  const session = await mintUserSession(data.id as string)
  if (!session) return { erro: 'nao consegui emitir sessao para essa conta' }
  return { session, userId: data.id as string }
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'corpo invalido' }, { status: 400 })
  }

  const email = String(corpo.email ?? '').trim()
  if (!email) return NextResponse.json({ error: 'email da conta alvo e obrigatorio' }, { status: 400 })
  const step = String(corpo.step ?? 'start')

  const sess = await sessaoPara(email)
  if ('erro' in sess) return NextResponse.json({ error: sess.erro }, { status: 400 })
  const baseUrl = baseUrlDe(req)

  // ── ETAPA 1: submete o filme ao motor ────────────────────────────────────
  if (step === 'start') {
    const prompt = String(corpo.prompt ?? '').trim()
    if (!prompt) return NextResponse.json({ error: 'prompt e obrigatorio' }, { status: 400 })
    const engine = String(corpo.engine ?? 'cinematic')
    const duration = Number(corpo.duration) || 60
    // O id precisa casar com validCinematicGenerationId: [A-Za-z0-9_-]{8,100}.
    const generationId = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    const r = await callAsUser<CinematicResposta>({
      baseUrl,
      path: '/api/generate-video-cinematic',
      session: sess.session,
      method: 'POST',
      body: { generationId, prompt, duration, language: 'en', engine },
      timeoutMs: 280_000,
    })

    if (!r.ok || !r.body) {
      return NextResponse.json(
        {
          error: r.body?.error ?? r.errorText ?? `HTTP ${r.status}`,
          // 409/503 com `pending` = "aceito, reconciliando": quem chamou tenta
          // de novo com o MESMO generationId, que é o que o claim espera.
          pending: r.body?.pending ?? false,
          generationId,
          status: r.status,
        },
        { status: r.status === 0 ? 502 : r.status },
      )
    }

    const ids = (r.body.fal_request_ids ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'o motor nao devolveu nenhum clipe', generationId }, { status: 502 })
    }

    return NextResponse.json({
      step: 'started',
      generationId,
      email,
      falRequestIds: ids,
      falModel: r.body.fal_model ?? null,
      falModels: r.body.fal_models ?? null,
      voiceoverScript: r.body.voiceover_script ?? '',
      sceneCaptions: r.body.scene_captions ?? [],
      duration: r.body.duration ?? duration,
      quality: r.body.quality ?? engine,
      verbatim: r.body.verbatim ?? false,
      speed: typeof r.body.speed === 'number' ? r.body.speed : null,
      topic: prompt.slice(0, 200),
      dica: 'chame de novo com step=finish e este mesmo objeto',
    })
  }

  // ── ETAPA 2: espera os clipes e monta ────────────────────────────────────
  if (step === 'finish') {
    const generationId = String(corpo.generationId ?? '').trim()
    const falRequestIds = Array.isArray(corpo.falRequestIds) ? (corpo.falRequestIds as string[]) : []
    if (!generationId || falRequestIds.length === 0) {
      return NextResponse.json({ error: 'generationId e falRequestIds sao obrigatorios' }, { status: 400 })
    }

    const qs = new URLSearchParams({ ids: JSON.stringify(falRequestIds), generationId })
    if (corpo.falModel) qs.set('model', String(corpo.falModel))
    if (Array.isArray(corpo.falModels) && corpo.falModels.length > 0) {
      qs.set('models', JSON.stringify(corpo.falModels))
    }

    // Teto de 240s: sobra folga dentro do maxDuration de 300 para o compose
    // responder. Se os clipes não ficarem prontos a tempo, devolvemos
    // `pending` e quem orquestra chama step=finish de novo — os clipes já
    // prontos continuam prontos do lado da fal, nada se perde.
    const prazo = Date.now() + 240_000
    let ultimo: ClipStatusResposta | null = null
    while (Date.now() < prazo) {
      const s = await callAsUser<ClipStatusResposta>({
        baseUrl,
        path: `/api/cinematic-clip-status?${qs.toString()}`,
        session: sess.session,
        method: 'GET',
        timeoutMs: 30_000,
      })
      ultimo = s.body
      if (s.status === 502) {
        return NextResponse.json({ error: s.body?.error ?? 'o motor falhou nos clipes' }, { status: 502 })
      }
      if (s.body?.allDone) break
      await new Promise((r) => setTimeout(r, 6000))
    }

    if (!ultimo?.allDone) {
      return NextResponse.json({
        step: 'pending',
        prontos: ultimo?.done ?? 0,
        total: ultimo?.total ?? falRequestIds.length,
        falharam: ultimo?.failed ?? 0,
        dica: 'chame step=finish de novo; os clipes prontos nao se perdem',
      })
    }

    const clipUrls = (ultimo.clips ?? []).map((c) => c.url).filter((u): u is string => typeof u === 'string')
    if (clipUrls.length === 0) {
      return NextResponse.json({ error: 'clipes marcados como prontos mas sem url' }, { status: 502 })
    }

    const c = await callAsUser<ComposeResposta>({
      baseUrl,
      path: '/api/compose',
      session: sess.session,
      method: 'POST',
      body: {
        generationId,
        clip_urls: clipUrls,
        voiceover_script: String(corpo.voiceoverScript ?? ''),
        scene_captions: Array.isArray(corpo.sceneCaptions) ? corpo.sceneCaptions : [],
        duration: Number(corpo.duration) || 60,
        topic: String(corpo.topic ?? 'Kineo demo'),
        quality: String(corpo.quality ?? 'cinematic'),
        language: 'en',
        // `speed` só viaja quando a narração é verbatim — é assim que o
        // GenerateClient faz, e o compose usa isso para honrar o Contrato C1.
        ...(corpo.verbatim && typeof corpo.speed === 'number' ? { speed: corpo.speed } : {}),
      },
      timeoutMs: 290_000,
    })

    const renderId = (c.body?.render_id ?? '').trim()
    if (!c.ok || !renderId) {
      return NextResponse.json(
        { error: c.body?.error ?? c.errorText ?? `HTTP ${c.status}`, status: c.status },
        { status: c.status === 0 ? 502 : c.status },
      )
    }
    return NextResponse.json({ step: 'composing', renderId, generationId, clipes: clipUrls.length })
  }

  return NextResponse.json({ error: 'step deve ser start ou finish' }, { status: 400 })
}
