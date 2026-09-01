'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  buildHomeWelcomeGoalHref,
  ONBOARDING_GOALS,
  ONBOARDING_GOAL_VARIANT,
  type OnboardingGoal,
  type OnboardingGoalId,
} from '@/lib/growth/onboardingGoals'
import styles from './HomeWelcomeGoalRouter.module.css'

const HOME_FIRST_WIN_VIEW_MARKER = 'kineo_home_outcome_selector_v3_viewed'
const SURFACE_VERSION = 'home_outcome_selector_v3'

export default function HomeWelcomeGoalRouter() {
  const [selectedGoalId, setSelectedGoalId] = useState<OnboardingGoalId | null>(null)
  const selectedGoal = ONBOARDING_GOALS.find((goal) => goal.id === selectedGoalId) ?? null

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
      is_first_video: true,
    })
  }, [])

  function selectGoal(goal: OnboardingGoal) {
    setSelectedGoalId(goal.id)
    if (goal.id === selectedGoalId) return
    void trackEvent('viral_onboarding_goal_selected', {
      version: 'outcome_selector_v3',
      variant: ONBOARDING_GOAL_VARIANT,
      surface: 'home_first_win',
      surface_version: SURFACE_VERSION,
      selected_goal: goal.id,
      is_first_video: true,
    })
  }

  function trackPrimaryClick(goal: OnboardingGoal) {
    const metadata = {
      version: 'outcome_selector_v3',
      variant: ONBOARDING_GOAL_VARIANT,
      surface: 'home_first_win',
      surface_version: SURFACE_VERSION,
      selected_goal: goal.id,
      is_first_video: true,
    }
    void trackEvent('viral_onboarding_primary_clicked', metadata)
  }

  return (
    <section id="first-win" className={styles.section} aria-labelledby="home-welcome-goal-heading" data-activation-version={SURFACE_VERSION}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>Your trial is ready · choose the outcome</p>
        <h2 id="home-welcome-goal-heading" className={styles.heading}>
          Who is this first Short for?
        </h2>
        <p className={styles.intro}>
          Pick the job first. Kineo will show one ready-to-edit Seedance brief for that outcome before you open Studio.
        </p>

        <div className={styles.goalGrid} role="list" aria-label="Choose who the first Short is for">
          {ONBOARDING_GOALS.map((goal) => {
            const active = goal.id === selectedGoalId
            return (
              <div key={goal.id} className={styles.goalItem} role="listitem">
                <button
                  type="button"
                  className={`${styles.goalButton} ${active ? styles.goalButtonActive : ''}`}
                  aria-pressed={active}
                  onClick={() => selectGoal(goal)}
                >
                  <span className={styles.goalLabel}>{goal.label}</span>
                  <span className={styles.goalDetail}>{goal.description}</span>
                  <span className={styles.goalChoose}>{active ? 'Selected ✓' : 'Choose this outcome →'}</span>
                </button>
              </div>
            )
          })}
        </div>

        {selectedGoal ? (
          <div className={styles.brief} aria-live="polite">
            <div className={styles.briefCopy}>
              <span className={styles.briefEyebrow}>Starter brief · {selectedGoal.shortLabel}</span>
              <h3 className={styles.briefTitle}>{selectedGoal.topic}</h3>
              <p className={styles.briefHook}>{selectedGoal.hook}</p>
            </div>
            <Link
              href={buildHomeWelcomeGoalHref(selectedGoal)}
              className={styles.primaryAction}
              onClick={() => trackPrimaryClick(selectedGoal)}
            >
              {selectedGoal.cta}
            </Link>
          </div>
        ) : (
          <div className={styles.emptyState} aria-live="polite">
            Choose one outcome to preview the exact starter brief before opening Studio.
          </div>
        )}

        <p className={styles.safety}>Nothing renders and no credits are spent here. Studio still shows the engine, duration and exact cost before you press Generate.</p>
      </div>
    </section>
  )
}
