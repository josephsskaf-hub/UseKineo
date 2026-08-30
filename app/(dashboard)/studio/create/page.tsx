// KINEO-STUDIO-UNIFICACAO-2026-08-24 — a casa de máquinas muda de endereço.
//
// ORDEM DO FUNDADOR (24/08): "cria um método pra tirar o /generate e ficar só
// com o /studio, sem problema em nenhum tipo de render, avatar nem nada".
//
// O MÉTODO, e por que ele é seguro:
// A auditoria mostrou que o Studio sempre foi o COCKPIT (escolhe motor/prompt/
// câmera) e o /generate a CASA DE MÁQUINAS (7 mil linhas: claims, compose,
// avatar, paywall, polling — o Studio já despachava para lá via router.push).
// Apagar a casa de máquinas quebraria todo render; reescrevê-la dentro do
// Studio seria meses de risco. Então ela só MUDA DE ENDEREÇO: este arquivo é
// o antigo app/(dashboard)/generate/page.tsx, com o mesmo GenerateClient,
// mesma ativação de trial, mesma telemetria — montado sob /studio/create.
// O /generate virou um porteiro fino que redireciona preservando a query
// (ver o comentário lá). Zero mudança de lógica = zero risco de render.
//
// Consequência de telemetria: eventos que gravavam path '/generate' agora
// gravam '/studio/create'. Nomes de evento (generate_arrived_server etc.) NÃO
// mudaram — funil e painéis seguem contando o mesmo funil.
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { maybeActivateReverseTrial } from '@/lib/reverseTrial'
import { trialFingerprintFromHeaders } from '@/lib/trialFingerprint'
import { writeServerEvent } from '@/lib/serverEvents'
import { getViralTopicById } from '@/lib/viralTopics'
import GenerateClient from '../../generate/GenerateClient'

// sprint-ui #11 (2026-08-30) — titulo de aba proprio. Sem isto, a aba
// mostrava o title SEO da landing ('Kineo — AI YouTube Shorts Generator
// (Official Site)') em toda tela do produto sem metadata — cliente com 3
// abas abertas nao achava a certa. Padrao das telas irmas (Library/Studio).
export const metadata = { title: 'Create a Video — Kineo' }

export const dynamic = 'force-dynamic'

type StudioCreatePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function createPath(searchParams: StudioCreatePageProps['searchParams']): string {
  const params = new URLSearchParams()
  for (const [rawKey, rawValue] of Object.entries(searchParams ?? {})) {
    const key = rawKey.slice(0, 64)
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of values) {
      if (typeof value === 'string') params.append(key, value.slice(0, 2000))
    }
  }
  const query = params.toString()
  return query ? `/studio/create?${query}` : '/studio/create'
}

function firstParam(
  searchParams: StudioCreatePageProps['searchParams'],
  key: string,
): string | null {
  const value = searchParams?.[key]
  return typeof value === 'string'
    ? value
    : Array.isArray(value) && typeof value[0] === 'string'
      ? value[0]
      : null
}

export default async function StudioCreatePage({ searchParams }: StudioCreatePageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const activationEntry = firstParam(searchParams, 'signup') === '1'
    ? 'oauth_signup'
    : firstParam(searchParams, 'welcome') === '1'
      ? 'email_signup'
      : 'standard'
  const sessionId = cookies().get('kineo_event_session_id')?.value ?? null
  const path = createPath(searchParams)
  const viralTopicId = firstParam(searchParams, 'viral_topic')
  const viralTopic = getViralTopicById(viralTopicId)

  // A stale or forged id must never silently turn into an unrelated video.
  if (viralTopicId && !viralTopic) redirect('/viral-now?topic=unavailable')

  if (!user) {
    if (activationEntry !== 'standard') {
      await writeServerEvent({
        name: 'generate_activation_auth_missing',
        path: '/studio/create',
        sessionId,
        metadata: { activation_entry: activationEntry },
      })
    }
    // Resolve missing/late auth on the server and preserve the complete local
    // destination. The auth page resumes this exact activation path.
    // (Racional /signup vs /login preservado do endereço antigo: visitante
    // novo vê signup; cookie de sessão anterior manda para login.)
    const hasPriorSession = cookies()
      .getAll()
      .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
    const authPath = hasPriorSession ? '/login' : '/signup'
    redirect(`${authPath}?redirect=${encodeURIComponent(path)}`)
  }

  // KINEO-TRIAL-ACTIVATION-SERVER-2026-08-07 — primeiro ponto SERVIDOR que
  // toda conta autenticada atravessa; ativação idempotente do trial (ver
  // racional completo no histórico deste arquivo em /generate).
  try {
    await maybeActivateReverseTrial({
      userId: user.id,
      email: user.email ?? null,
      userCreatedAt: user.created_at ?? null,
      fingerprintHash: trialFingerprintFromHeaders(headers()),
    })
  } catch {
    /* best-effort — a página nunca quebra por causa do trial */
  }

  await writeServerEvent({
    name: 'generate_arrived_server',
    userId: user.id,
    path: '/studio/create',
    sessionId,
    dedupeMinutes: 30,
    metadata: {
      activation_entry: activationEntry,
      has_prompt: Boolean(firstParam(searchParams, 'prompt')?.trim() || viralTopic?.prompt),
      autoanalyze: firstParam(searchParams, 'autoanalyze') === '1',
      viral_topic_id: viralTopic?.id ?? null,
    },
  })

  return (
    <Suspense fallback={null}>
      <GenerateClient initialViralPrompt={viralTopic?.prompt ?? ''} initialUserId={user.id} />
    </Suspense>
  )
}
