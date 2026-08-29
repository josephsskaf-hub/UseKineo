'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  buildHomeWelcomeGoalHref,
  DEFAULT_ONBOARDING_GOAL,
  ONBOARDING_GOALS,
  ONBOARDING_GOAL_VARIANT,
  type OnboardingGoal,
} from '@/lib/growth/onboardingGoals'
import styles from './HomeWelcomeGoalRouter.module.css'

const HOME_FIRST_WIN_VIEW_MARKER = 'kineo_home_first_win_focus_v2_viewed'
const SURFACE_VERSION = 'home_activation_focus_v2'

export default function HomeWelcomeGoalRouter() {
  const alternatives = ONBOARDING_GOALS.filter((goal) => goal.id !== DEFAULT_ONBOARDING_GOAL.id)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HOME_FIRST_WIN_VIEW_MARKER)) return
      sessionStorage.setItem(HOME_FIRST_WIN_VIEW_MARKER, '1')
    } catch {
      // Analytics must never block the activation card.
    }
    void trackEvent('viral_onboarding_viewed', {
      version: 'push27_single_choice',
      variant: ONBOARDING_GOAL_VARIANT,
      surface: 'home_first_win',
      surface_version: SURFACE_VERSION,
      selected_goal: DEFAULT_ONBOARDING_GOAL.id,
      is_first_video: true,
    })
  }, [])

  function trackGoalClick(goal: OnboardingGoal) {
    const metadata = {
      version: 'push27_single_choice',
      variant: ONBOARDING_GOAL_VARIANT,
      surface: 'home_first_win',
      surface_version: SURFACE_VERSION,
      selected_goal: goal.id,
      is_first_video: true,
    }
    if (goal.id !== DEFAULT_ONBOARDING_GOAL.id) {
      void trackEvent('viral_onboarding_goal_selected', metadata)
    }
    void trackEvent('viral_onboarding_primary_clicked', metadata)
  }

  return (
    <section id="first-win" className={styles.section} aria-labelledby="home-welcome-goal-heading" data-activation-version={SURFACE_VERSION}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>Your trial is ready</p>
        <h2 id="home-welcome-goal-heading" className={styles.heading}>
          Start with one Short worth judging.
        </h2>
        <p className={styles.intro}>
          We picked a proven mystery brief and Seedance 1.5. Open it in Studio, review the idea and cost, then decide whether to generate.
        </p>

        <div className={styles.routeGrid}>
          <Link
            href={buildHomeWelcomeGoalHref(DEFAULT_ONBOARDING_GOAL)}
            className={styles.primary}
            onClick={() => trackGoalClick(DEFAULT_ONBOARDING_GOAL)}
          >
            <span className={styles.recommended}>Recommended first win</span>
            <span className={styles.primaryLabel}>{DEFAULT_ONBOARDING_GOAL.topic}</span>
            <span className={styles.primaryDetail}>{DEFAULT_ONBOARDING_GOAL.hook}</span>
            <span className={styles.primaryAction}>Open my Seedance starter →</span>
          </Link>

          <div className={styles.alternatives} role="list" aria-label="Choose another first-video goal">
            <p className={styles.alternativeHeading}>Or make the first video useful for:</p>
            {alternatives.map((goal) => (
              <Link
                key={goal.id}
                href={buildHomeWelcomeGoalHref(goal)}
                className={styles.option}
                role="listitem"
                onClick={() => trackGoalClick(goal)}
              >
                <span>
                  <span className={styles.optionLabel}>{goal.label}</span>
                  <span className={styles.optionDetail}>{goal.description}</span>
                </span>
                <span className={styles.optionAction}>Open idea →</span>
              </Link>
            ))}
          </div>
        </div>

        <p className={styles.safety}>Nothing renders and no credits are spent from this choice. Studio shows the engine, duration and exact cost before you press Generate.</p>
      </div>
    </section>
  )
}
