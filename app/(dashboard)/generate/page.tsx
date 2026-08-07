import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { maybeActivateReverseTrial } from '@/lib/reverseTrial'
import { trialFingerprintFromHeaders } from '@/lib/trialFingerprint'
import { writeServerEvent } from '@/lib/serverEvents'
import { getViralTopicById } from '@/lib/viralTopics'
import GenerateClient from './GenerateClient'

export const dynamic = 'force-dynamic'

type GeneratePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function generatePath(searchParams: GeneratePageProps['searchParams']): string {
  const params = new URLSearchParams()
  for (const [rawKey, rawValue] of Object.entries(searchParams ?? {})) {
    const key = rawKey.slice(0, 64)
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of values) {
      if (typeof value === 'string') params.append(key, value.slice(0, 2000))
    }
  }
  const query = params.toString()
  return query ? `/generate?${query}` : '/generate'
}

function firstParam(
  searchParams: GeneratePageProps['searchParams'],
  key: string,
): string | null {
  const value = searchParams?.[key]
  return typeof value === 'string'
    ? value
    : Array.isArray(value) && typeof value[0] === 'string'
      ? value[0]
      : null
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
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
  const path = generatePath(searchParams)
  const viralTopicId = firstParam(searchParams, 'viral_topic')
  const viralTopic = getViralTopicById(viralTopicId)

  // A stale or forged id must never silently turn into an unrelated video.
  if (viralTopicId && !viralTopic) redirect('/viral-now?topic=unavailable')

  if (!user) {
    if (activationEntry !== 'standard') {
      await writeServerEvent({
        name: 'generate_activation_auth_missing',
        path: '/generate',
        sessionId,
        metadata: { activation_entry: activationEntry },
      })
    }
    // Resolve missing/late auth on the server and preserve the complete local
    // destination. The auth page resumes this exact activation path.
    //
    // KINEO-SPRINT-12H-2026-07-29 — send NEW visitors to /signup, not /login.
    //
    // "Video Generation" is an item in the PUBLIC nav on the marketing home
    // (app/KineoLanding.tsx), so the most common visitor arriving here has
    // never had an account. Showing that person a LOGIN form — a form built for
    // people who already bought — asks them for a password they have never
    // chosen. The cheapest possible read of that screen is "this isn't for me".
    //
    // A returning user is still routed to /login, detected by the Supabase auth
    // cookie the client keeps after a first sign-in. When in doubt we choose
    // /signup, because a returning user on /signup sees a "Log in" link one tap
    // away, while a new user on /login sees a wall.
    const hasPriorSession = cookies()
      .getAll()
      .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
    const authPath = hasPriorSession ? '/login' : '/signup'
    redirect(`${authPath}?redirect=${encodeURIComponent(path)}`)
  }

  // PUSH #96 — this route is force-dynamic, so this Server Component re-runs
  // on every RSC navigation back to /generate. Un-deduped, the event counted
  // renders instead of arrivals (138 rows / 51 sessions) and inflated the top
  // of the activation funnel by ~2.7x, which is exactly the step we are trying
  // to measure. 30 minutes is longer than any single generation attempt, so a
  // returning user on a genuinely new visit still registers.
  // KINEO-TRIAL-ACTIVATION-SERVER-2026-08-07 — a ativação do trial NÃO pode
  // depender só de /api/track-signup-source. Aquela rota é chamada pelo cliente
  // (fire-and-forget) e tem uma trava de sessão: `sfa_src_sent` no
  // sessionStorage. Quem já teve uma chamada bem-sucedida naquela aba — por
  // exemplo alguém que estava logado, saiu e criou uma segunda conta — NUNCA
  // dispara a chamada de novo, e o trial silenciosamente não acontece. Foi
  // exatamente isso que o fundador viu no primeiro teste em produção: conta nova
  // criada 01:18Z, zero créditos, e um único POST na rota às 01:07Z.
  //
  // Aqui é o primeiro ponto SERVIDOR que toda conta autenticada atravessa, e a
  // função é idempotente por contrato (só perfil <24h, `trial_status` não-nulo
  // nunca reativa, CAS na escrita). Chamar dos dois lugares não concede dois
  // trials — só remove o ponto único de falha. Best-effort: nunca quebra a
  // página, nem é aguardada por nada que o usuário veja.
  try {
    await maybeActivateReverseTrial({
      userId: user.id,
      email: user.email ?? null,
      userCreatedAt: user.created_at ?? null,
      // Sem o hash aqui: o header de IP existe, mas a guarda de fingerprint
      // pertence à borda do signup. Ausente = concede (fail-open), que é o
      // comportamento já documentado — e quem chega por /api/track-signup-source
      // continua passando pela checagem completa.
      fingerprintHash: trialFingerprintFromHeaders(headers()),
    })
  } catch {
    /* best-effort — a página nunca quebra por causa do trial */
  }

  await writeServerEvent({
    name: 'generate_arrived_server',
    userId: user.id,
    path: '/generate',
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
