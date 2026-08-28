import Link from 'next/link'
import {
  buildHomeWelcomeGoalHref,
  ONBOARDING_GOALS,
} from '@/lib/growth/onboardingGoals'
import styles from './HomeWelcomeGoalRouter.module.css'

export default function HomeWelcomeGoalRouter() {
  return (
    <section className={styles.section} aria-labelledby="home-welcome-goal-heading">
      <div className={styles.shell}>
        <p className={styles.eyebrow}>You&rsquo;re in — choose your first win</p>
        <h2 id="home-welcome-goal-heading" className={styles.heading}>
          What should your first Short do?
        </h2>
        <p className={styles.intro}>
          Pick the job, not the engine. Kineo opens an editable starter idea in Studio so you can review it before generating anything.
        </p>

        <div className={styles.options} role="list" aria-label="Choose what your first Short is for">
          {ONBOARDING_GOALS.map((goal) => {
            const href = buildHomeWelcomeGoalHref(goal)
            return (
              <Link
                key={goal.id}
                href={href}
                className={styles.option}
                role="listitem"
              >
                <span>
                  <span className={styles.optionLabel}>{goal.label}</span>
                  <span className={styles.optionDetail}>{goal.description}</span>
                </span>
                <span className={styles.optionAction}>Open my starter idea →</span>
              </Link>
            )
          })}
        </div>

        <p className={styles.safety}>No video render starts from this choice. You review the idea in Studio first.</p>
      </div>
    </section>
  )
}
