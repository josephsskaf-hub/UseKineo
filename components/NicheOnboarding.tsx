'use client'

// PUSH #27 — activation handoff for a brand-new account.
//
// The previous full-screen catalog asked a just-converted visitor to compare
// eight topics, filters, hooks, scores and two input paths before the first
// render. Live TAAFT evidence showed an authenticated user reaching this view
// and leaving without a click. This version keeps the one-click Fast path but
// presents one concrete choice and one escape hatch. No timer, viral promise,
// view claim or fabricated urgency.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { FreeTierCopy } from '@/components/FreeTierOfferProvider'
import {
  ACTIVATION_HANDOFF_SURFACE_VERSION,
  DEFAULT_ONBOARDING_GOAL,
  ONBOARDING_GOALS,
  ONBOARDING_GOAL_VARIANT,
  type OnboardingGoal,
} from '@/lib/growth/onboardingGoals'

// PUSH #96 — `viral_onboarding_viewed` reported 389 events across only 40
// distinct sessions (~9.7 impressions per session) while
// `viral_onboarding_primary_clicked` reported 23 events across 18 sessions.
// The mount-only effect below cannot fire twice per mount, so the inflation
// comes from the dialog being re-mounted repeatedly inside one tab (the
// /generate route is force-dynamic and the client strips ?signup=1 with a
// router.replace, remounting the whole tree). A useRef latch would reset on
// every remount, so this is a once-per-tab case and needs a sessionStorage
// marker, matching app/HomeTopicForm.tsx's HOME_PROMPT_VIEW_MARKER pattern.
const ONBOARDING_VIEW_MARKER = 'kineo_push96_viral_onboarding_viewed'

type Props = {
  onPick: (goal: OnboardingGoal) => void
  onClose: () => void
}

export default function NicheOnboarding({ onPick, onClose }: Props) {
  // PUSH #96 — `onClose` is re-created on every parent render, so keeping it in
  // the Escape effect's dependency array tore down and re-subscribed the
  // listener on every render. The ref keeps the handler stable ([] deps) while
  // always calling the latest callback.
  const onCloseRef = useRef(onClose)
  const onPickRef = useRef(onPick)
  onCloseRef.current = onClose
  onPickRef.current = onPick
  // PUSH #96 — `first_video_started_from_viral_onboarding` reported 255 events
  // across 19 sessions but only 16 `..._dispatched` events. Nothing stopped a
  // second click (or a double-click) from re-firing the pair, so the CTA is
  // latched for the life of the mount.
  const primaryFiredRef = useRef(false)
  const dismissedRef = useRef(false)
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoal>(DEFAULT_ONBOARDING_GOAL)
  const selectedGoalRef = useRef<OnboardingGoal>(DEFAULT_ONBOARDING_GOAL)
  selectedGoalRef.current = selectedGoal

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ONBOARDING_VIEW_MARKER)) return
      sessionStorage.setItem(ONBOARDING_VIEW_MARKER, '1')
    } catch {
      // Storage failures must never affect the dialog rendering.
    }
    void trackEvent('viral_onboarding_viewed', {
      version: 'push27_single_choice',
      variant: ONBOARDING_GOAL_VARIANT,
      surface_version: ACTIVATION_HANDOFF_SURFACE_VERSION,
      default_goal: DEFAULT_ONBOARDING_GOAL.id,
      is_first_video: true,
    })
  }, [])

  // PUSH #96 — JOB 2(b): every dismissal path funnels through one latched
  // helper so Escape, the backdrop and the skip link can never double-fire the
  // skip event or call onClose twice.
  const dismiss = useCallback((action: 'escape' | 'own_idea' | 'backdrop') => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    void trackEvent('viral_onboarding_skipped', {
      version: 'push27_single_choice',
      variant: ONBOARDING_GOAL_VARIANT,
      surface_version: ACTIVATION_HANDOFF_SURFACE_VERSION,
      selected_goal: selectedGoalRef.current.id,
      action,
    })
    onCloseRef.current()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      dismiss('escape')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dismiss])

  function chooseGoal(goal: OnboardingGoal) {
    if (primaryFiredRef.current || dismissedRef.current || goal.id === selectedGoal.id) return
    selectedGoalRef.current = goal
    setSelectedGoal(goal)
    void trackEvent('viral_onboarding_goal_selected', {
      version: 'push27_single_choice',
      variant: ONBOARDING_GOAL_VARIANT,
      surface_version: ACTIVATION_HANDOFF_SURFACE_VERSION,
      selected_goal: goal.id,
    })
  }

  function createFirstVideo(ctaPosition: 'primary_above_fold' | 'after_goal_change') {
    if (primaryFiredRef.current) return
    primaryFiredRef.current = true
    const metadata = {
      source: 'viral_onboarding',
      version: 'push27_single_choice',
      variant: ONBOARDING_GOAL_VARIANT,
      surface_version: ACTIVATION_HANDOFF_SURFACE_VERSION,
      cta_position: ctaPosition,
      engine_selection: 'entitlement_aware',
      is_first_video: true,
      selected_goal: selectedGoal.id,
      selected_category: selectedGoal.niche,
    }
    void trackEvent('viral_onboarding_primary_clicked', metadata)
    // Preserve the established event so the pre-PUSH #27 activation series
    // remains comparable in the admin funnel.
    void trackEvent('first_video_started_from_viral_onboarding', metadata)
    onPickRef.current(selectedGoal)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-video-title"
      // PUSH #96 — JOB 2(b): the overlay had no backdrop dismissal at all, so a
      // user who never noticed the underlined skip link was held on this screen.
      // 20 sessions since 2026-07-16 reached /generate and produced zero
      // interaction events of any kind.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss('backdrop')
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        // PUSH #96 — JOB 2(e): `alignItems: 'center'` clips the top of an
        // overflowing dialog in a scrollable flex container, which on a 375px
        // viewport can put the primary CTA out of reach. `flex-start` plus
        // `margin: auto` still centers when there is room and scrolls cleanly
        // when there is not.
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '20px 16px',
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          margin: 'auto',
          padding: 'clamp(22px, 5vw, 34px)',
          borderRadius: 22,
          border: '1px solid #2a2a2d',
          background: '#131316',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ marginBottom: 10, color: '#2997ff', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {/* KINEO-PRIMEIRA-IMPRESSAO-2026-08-21 — era "Your first Fast
              video". Com o trial passando a abrir no Seedance, prometer "Fast"
              virou mentira no PRIMEIRO botão que uma conta nova toca. Copy
              neutra: não promete motor, e continua verdadeira nos dois casos
              (Seedance com saldo, Fast sem). */}
          Your first video
        </div>
        <h1 id="first-video-title" style={{ margin: '0 0 10px', color: '#f5f5f7', fontSize: 'clamp(1.55rem, 6vw, 2.15rem)', lineHeight: 1.1, letterSpacing: '-0.035em' }}>
          Your first video is ready to build.
        </h1>
        <p style={{ margin: '0 0 20px', color: '#a1a1a8', fontSize: '0.94rem', lineHeight: 1.55 }}>
          We picked the topic and hook. One tap starts the build; you can change the goal or use your own idea below. <FreeTierCopy legacy="Free access includes up to 3 watermarked Fast videos every 24 hours, with no card." onKey="sentence" />
        </p>

        <div
          aria-label="Selected first-video brief"
          style={{ marginBottom: 14, padding: '13px 15px', borderRadius: 14, border: '1px solid rgba(41,151,255,.28)', background: 'rgba(41,151,255,.08)' }}
        >
          <div style={{ color: '#f5f5f7', fontSize: '0.98rem', fontWeight: 850, lineHeight: 1.35 }}>
            {selectedGoal.topic}
          </div>
          <div style={{ marginTop: 5, color: '#a1a1a8', fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.45 }}>
            “{selectedGoal.hook}”
          </div>
        </div>

        <button
          type="button"
          data-activation-primary="above-fold"
          onClick={() => createFirstVideo('primary_above_fold')}
          style={{
            width: '100%',
            minHeight: 54,
            padding: '15px 18px',
            border: 0,
            borderRadius: 13,
            background: '#2997ff',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 850,
            boxShadow: '0 10px 34px rgba(41,151,255,.45)',
          }}
        >
          <FreeTierCopy legacy={selectedGoal.cta} on={selectedGoal.cta} />
        </button>
        <p style={{ margin: '9px 0 16px', color: '#8f8f98', fontSize: '0.74rem', lineHeight: 1.45, textAlign: 'center' }}>
          This starts your first video. No card needed; Kineo uses the best engine already available to this account.
        </p>

        <style jsx>{`
          .goal-router-options {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          @media (max-width: 480px) {
            .goal-router-options {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        <details style={{ marginBottom: 14, border: '1px solid #2a2a2d', borderRadius: 14, background: '#17171b' }}>
          <summary style={{ minHeight: 46, padding: '13px 15px', color: '#c9c9d0', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 800 }}>
            Need a different first result?
          </summary>
          <div className="goal-router-options" role="group" aria-label="Choose what this video is for" style={{ gap: 8, padding: '0 12px 13px' }}>
            {ONBOARDING_GOALS.map((goal) => {
              const active = goal.id === selectedGoal.id
              return (
                <button
                  key={goal.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${goal.label}. ${goal.description}`}
                  onClick={() => chooseGoal(goal)}
                  style={{
                    minHeight: 58,
                    padding: '9px 8px',
                    borderRadius: 12,
                    border: active ? '1px solid #2997ff' : '1px solid #303036',
                    background: active ? 'rgba(41,151,255,0.14)' : '#19191d',
                    color: active ? '#fff' : '#b5b5bd',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    lineHeight: 1.25,
                    boxShadow: active ? '0 0 0 1px rgba(41,151,255,0.12)' : 'none',
                  }}
                >
                  {goal.shortLabel}
                </button>
              )
            })}
          </div>
        </details>

        {/* KINEO-ONBOARDING-VITRINE-2026-08-25 — 173 pessoas viram esta tela
            nos últimos 7 dias e a promessa era só texto. Mesmo padrão que
            funcionou no modal de oferta ("modal virou vitrine"): a pessoa VÊ
            um render real antes de decidir. O clipe é o curado nº 1 da
            SEEDANCE (a onda da ilha proibida, escolha do fundador) — o mesmo
            motor em que o trial abre, então a prova corresponde exatamente ao
            que o clique dela vai produzir. Selo honesto: preview leve (292KB)
            de public/previews, muted+loop, some em conexões sem o arquivo
            (onError esconde — a vitrine nunca quebra o funil). */}
        <div style={{ marginBottom: 18, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(41,151,255,0.35)', background: 'rgba(41,151,255,0.08)' }}>
          <div style={{ position: 'relative' }}>
            <video
              src="/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onError={(event) => {
                const wrap = event.currentTarget.parentElement
                if (wrap) wrap.style.display = 'none'
              }}
              style={{ display: 'block', width: '100%', maxHeight: 180, objectFit: 'cover' }}
            />
            <span
              style={{
                position: 'absolute',
                left: 10,
                bottom: 8,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.62)',
                color: '#e8e8ed',
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(4px)',
              }}
            >
              Example Kineo output · Seedance 1.5
            </span>
          </div>
          <div style={{ padding: '15px 18px' }}>
            <div style={{ marginBottom: 7, color: '#f5f5f7', fontSize: '1.05rem', fontWeight: 850, lineHeight: 1.3 }}>
              {selectedGoal.topic}
            </div>
            <div style={{ color: '#a1a1a8', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: 1.45 }}>
              “{selectedGoal.hook}”
            </div>
          </div>
        </div>

        <button
          type="button"
          data-activation-primary="after-goal-change"
          onClick={() => createFirstVideo('after_goal_change')}
          style={{
            width: '100%',
            minHeight: 52,
            padding: '14px 18px',
            border: 0,
            borderRadius: 13,
            background: '#2997ff',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.98rem',
            fontWeight: 800,
            boxShadow: '0 10px 34px rgba(41,151,255,.45)',
          }}
        >
          <FreeTierCopy legacy={selectedGoal.cta} on={selectedGoal.cta} />
        </button>
        {/* PUSH #96 — JOB 2(a)/(e): the only escape hatch was a ~17px tall
            underlined link in #86868b on #131316. It was both under the 44px
            touch target minimum and low-contrast, which is consistent with 389
            impressions producing only 3 `viral_onboarding_skipped` events. Same
            copy and same secondary role, now an actually tappable control. */}
        <button
          type="button"
          onClick={() => dismiss('own_idea')}
          style={{
            display: 'block',
            width: '100%',
            minHeight: 44,
            margin: '12px auto 0',
            padding: '12px 18px',
            border: 0,
            borderRadius: 999,
            background: 'transparent',
            color: '#a1a1a8',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 650,
            textDecoration: 'underline',
          }}
        >
          Use my own idea instead
        </button>
      </div>
    </div>
  )
}
