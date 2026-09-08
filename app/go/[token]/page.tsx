import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  DEFAULT_DURATION,
  DURATIONS,
  ENGINE_LABELS,
  HANDOFF_TTL_DAYS,
  STUDIO_PROMPT_MAX_CHARS,
  aspectSpec,
  describeOutcome,
  engineFamily,
  handoffHeadline,
  handoffOutcome,
  isHandoffEngine,
  isHandoffToken,
  type HandoffDuration,
} from '@/lib/gptHandoff'
import { findHandoff, isLikelyBot, markHandoffViewed, type GptHandoffRow } from '@/lib/gptHandoffStore'
import { BUTTON, Expired, MUTED, SOFT, Shell, Wordmark } from './HandoffNotice'
import PostFilmCreatorOffer from '@/components/PostFilmCreatorOffer'
import { CREATOR_OFFER_PROFILE_COLUMNS, isPostFilmCreatorEligible } from '@/lib/growth/postFilmCreatorOffer'

// ═══ KINEO-GPT-HANDOFF-2026-09-06 — a página que o link do GPT abre ═════════
//
// A pessoa pediu um roteiro ao ChatGPT, o GPT chamou nossa ação e recebeu
// `/go/<token>`. Aqui ela vê o roteiro INTEIRO, a duração, o motor sugerido e
// a estimativa da régua — e aperta UM botão. O botão passa pelo servidor
// (/api/gpt/handoff/go) para o clique ser contado e a porta (Studio / conta)
// ser decidida lá; nada aqui depende de JavaScript.
//
// Sem CSS novo: mesmo vocabulário inline de app/revive/[handle]/page.tsx e
// app/v/[id]/page.tsx (BLUE/MUTED/TEXT/SOFT, Shell, Wordmark) — desde 07/09
// em ./HandoffNotice.tsx, compartilhado com not-found.tsx.
//
// `force-dynamic` + `nodejs`: lê cookies() e headers() (sessão, robô, dedupe)
// e a linha do banco pelo service role. Uma URL com token não pode ser
// cacheada entre visitantes nem indexada.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Your script is ready · Kineo',
  description: 'A script written with ChatGPT, ready to become a video in Kineo Studio.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span style={{ color: MUTED, fontSize: '0.9rem' }}>{children}</span>
}

export default async function GoPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const token = params.token
  // KINEO-GPT-VERDADE-2026-09-07 — token fora do padrão ou inexistente é 404
  // DE VERDADE (notFound() → ./not-found.tsx, mesmo visual de sempre). Até
  // 07/09 era HTTP 200 com a tela "expired": soft-404 que deixava toda sonda
  // sem controle de status. Sem tocar o banco quando o padrão já reprova.
  if (!isHandoffToken(token)) notFound()

  const found = await findHandoff(token)
  // `unavailable` e `expired` CONTINUAM 200, de propósito: `unavailable` é
  // falha transitória de banco — 404 ali diria "sumiu para sempre" a quem só
  // precisa recarregar; `expired` é link real de pessoa real, e merece a
  // página com o botão do Studio, não um erro.
  if (found.status === 'unavailable') return <Expired reason="unavailable" />
  if (found.status === 'missing') notFound()
  if (found.expired) return <Expired reason="expired" />
  const row: GptHandoffRow = found.row

  // ── Quem está olhando (só para a frase do botão; a porta é decidida na rota).
  let signedIn = false
  let creatorTrialEligible = false
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    signedIn = Boolean(user?.id)
    if (user) {
      const profile = await supabase.from('profiles').select(CREATOR_OFFER_PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
      creatorTrialEligible = !profile.error && isPostFilmCreatorEligible(profile.data)
    } else {
      // Public explanation is explicitly limited to a first purchase.
      creatorTrialEligible = true
    }
  } catch {
    signedIn = false
  }

  // ── Pageview no SERVIDOR. `dedupeMinutes`: esta rota é force-dynamic e
  // re-renderiza em toda navegação RSC — sem dedupe o evento contaria renders,
  // não chegadas (o denominador inflado 2,7x do PUSH #96). Robô é etiquetado,
  // não bloqueado, e não carimba viewed_at.
  const bot = isLikelyBot(headers().get('user-agent'))
  try {
    if (!bot) await markHandoffViewed(token)
    await writeServerEvent({
      name: 'gpt_landing_viewed',
      path: '/go/[token]',
      sessionId: cookies().get('kineo_event_session_id')?.value ?? null,
      dedupeMinutes: 30,
      metadata: {
        // ver o comentario em app/api/gpt/handoff/go/route.ts: sem o token o
        // degrau do pouso nao se liga ao handoff e o funil mede zero para sempre.
        token: row.token,
        signed_in: signedIn,
        bot,
        engine_hint: row.engine_hint,
        duration_sec: row.duration_sec,
        // 06/09: o formato entra no pouso para medir adoção do não-9:16 sem
        // juntar com gpt_handoff_created por data (junção fraca).
        aspect: row.aspect,
        fit: row.fit,
        words: row.words,
        language: row.language,
        already_viewed: Boolean(row.viewed_at),
      },
    })
  } catch {
    /* a página nunca quebra por causa do contador */
  }

  const goHref = `/api/gpt/handoff/go?token=${encodeURIComponent(token)}`

  // ── A VOLTA DO CADASTRO — o segundo clique que ninguém deveria dar ────────
  //
  // Quem chega aqui com `?signup=1` JÁ apertou "Make this video" uma vez: foi
  // esse clique que o mandou para /signup (e ele já carimbou clicked_at). O
  // /auth/callback devolve a pessoa para cá com essa marca. Sem o desvio
  // abaixo, a página se redesenha com o MESMO botão e cobra um SEGUNDO clique
  // no ponto de maior intenção da jornada — logo depois de criar a conta.
  //
  // Encaminhamos para a MESMA rota contadora do botão, nunca para uma cópia da
  // regra dela: é lá que a sessão é resolvida, o clique é contado e o destino
  // do Studio é montado por buildStudioDestination().
  //
  // NÃO HÁ LAÇO POSSÍVEL: só desvia com `signedIn === true`, e o ramo logado de
  // /api/gpt/handoff/go termina SEMPRE em /studio/create — nunca volta ao /go
  // nem ao /signup. Robô não é desviado (não tem sessão e não deve gastar a
  // rota). Nada é gerado: o Studio abre preenchido e espera o Generate.
  const backFromSignup = (Array.isArray(searchParams?.signup) ? searchParams?.signup[0] : searchParams?.signup) === '1'
  const autoForward = signedIn && backFromSignup && !bot
  if (autoForward) {
    try {
      await writeServerEvent({
        name: 'gpt_landing_auto_forwarded',
        path: '/go/[token]',
        sessionId: cookies().get('kineo_event_session_id')?.value ?? null,
        metadata: { token: row.token, channel: row.channel, engine_hint: row.engine_hint, duration_sec: row.duration_sec },
      })
    } catch {
      /* o contador nunca segura a pessoa na porta */
    }
    // Fora do try: redirect() sinaliza por exceção e não pode ser engolido.
    redirect(goHref)
  }

  const engine = isHandoffEngine(row.engine_hint) ? row.engine_hint : 'seedance'
  const engineLabel = ENGINE_LABELS[engine]
  const family = engineFamily(engine)
  // O ENQUADRAMENTO, com nome humano e destino (lib/aspect.ts). Até 06/09 a
  // página mostrava só "9:16" cru, e o link do botão descartava o formato —
  // quem pediu widescreen ao GPT via a promessa aqui e recebia um Short no
  // Studio. aspectSpec() normaliza valor inválido para o padrão, o MESMO que
  // buildStudioDestination() vai emitir: o que a pessoa lê é o que renderiza.
  const frame = aspectSpec(row.aspect)
  const headline = handoffHeadline(row)
  // KINEO-GPT-VERDADE-2026-09-07 — a frase vem do COBRADOR (lib/narrationFit
  // via handoffOutcome), recalculada na leitura a partir do roteiro da linha,
  // nunca do `fit` gravado: o `fit` é a régua por voz (orçamento de palavras),
  // e ela dizia "the story may end early" para roteiros que rendem 60s
  // redondos. A duração da linha passou por validateHandoffInput (só 35/60/90);
  // o estreitamento abaixo é para o tipo, com o padrão da lib como rede.
  const duration: HandoffDuration = (DURATIONS as readonly number[]).includes(row.duration_sec)
    ? (row.duration_sec as HandoffDuration)
    : DEFAULT_DURATION
  const fitLine = describeOutcome(handoffOutcome(row.script, duration, engine))
  const overStudioLimit = row.script.length > STUDIO_PROMPT_MAX_CHARS
  const pricingHref = `/api/gpt/handoff/pricing?token=${encodeURIComponent(token)}`

  return (
    <Shell>
      <header style={{ marginBottom: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark />
        {/* K1 — "See plans" contado no servidor (rota irmã). */}
        <a href={pricingHref} style={{ color: MUTED, fontSize: '0.92rem', textDecoration: 'none' }}>
          See plans →
        </a>
      </header>

      <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '0.01em' }}>
        Script from ChatGPT · ready for Kineo Studio
      </p>
      <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.3rem)', fontWeight: 800, lineHeight: 1.14, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
        {headline}
      </h1>

      <p style={{ margin: '0 0 8px', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        <Meta>{row.duration_sec}s video</Meta>
        <Meta>{engineLabel} engine{family === 'hollywood' ? ' · characters speak on screen' : ''}</Meta>
        {/* Sempre visível, inclusive em 9:16: quem pousa precisa saber o que vem. */}
        <Meta>{frame.aspect} · {frame.label} · {frame.where}</Meta>
        <Meta>{row.language}</Meta>
        <Meta>{row.words} words</Meta>
      </p>
      <p style={{ color: SOFT, fontSize: '1rem', lineHeight: 1.55, margin: '0 0 22px' }}>{fitLine}</p>

      {overStudioLimit && (
        <p style={{ color: '#ffb340', fontSize: '0.95rem', lineHeight: 1.55, margin: '0 0 18px' }}>
          This script is {row.script.length.toLocaleString('en-US')} characters; the Studio accepts up to{' '}
          {STUDIO_PROMPT_MAX_CHARS.toLocaleString('en-US')}. You will be asked to trim it before generating.
        </p>
      )}

      <div style={{ margin: '0 0 26px' }}>
        <a href={goHref} style={BUTTON}>
          Make this video
        </a>
        <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.5, margin: '10px 0 0' }}>
          {signedIn
            ? 'Opens your Studio with this script loaded, exactly as written.'
            : 'Create your account to open this script in Studio. The Creator trial requires a payment method.'}
        </p>
      </div>

      <section style={{ borderTop: '1px solid #1d1d1f', paddingTop: 18 }}>
        <p style={{ color: MUTED, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Full script
        </p>
        <div style={{ color: SOFT, fontSize: '1rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {row.script}
        </div>
      </section>

      <div style={{ marginTop: 28 }}>
        <PostFilmCreatorOffer surface="gpt_handoff" eligible={creatorTrialEligible && !bot} firstPurchaseOnly={!signedIn} handoffHref={goHref} />
      </div>

      <p style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.5, marginTop: 28 }}>
        Kineo directs, narrates and edits the film from this text. Nothing is generated until you press Generate in the Studio.
        This link stays open for {HANDOFF_TTL_DAYS} days.
      </p>
    </Shell>
  )
}
