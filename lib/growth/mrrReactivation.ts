import { isInternalEmail } from '@/lib/internalAccounts'

export const MRR_REACTIVATION_ENABLED = true
export const MRR_REACTIVATION_VERSION = 'mrr_ready_film_20261001_v1'
export const MRR_REACTIVATION_CLAIM = 'mrr_ready_film_claimed'
export const MRR_REACTIVATION_SENT = 'mrr_ready_film_sent'
export const MRR_REACTIVATION_BATCH = 10
const NEVER = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin', 'altaitools.com']

export function eligibleReactivationProfile(p: Record<string, unknown>) {
  const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !isInternalEmail(email)
    && !NEVER.some(x => email.includes(x)) && p.email_opted_out !== true
    && p.has_paid === false && p.plan === 'free'
}

export function readyFilmDraft(title: unknown) {
  const name = typeof title === 'string' ? title.replace(/[\r\n\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) : ''
  const subject = name ? `Your Kineo film: ${name}` : 'Your finished film is in Kineo'
  const href = `https://www.usekineo.com/library?utm_source=email&utm_medium=reactivation&utm_campaign=${MRR_REACTIVATION_VERSION}`
  return { subject, text: `Hi,\n\nThe film you made${name ? ` — ${name} —` : ''} is saved in your Kineo library. Sign in to the same account to watch it and decide what you want to make next.\n\nOpen your finished film in your library:\n${href}\n\nNo new film has been generated and opening the library spends no credits.\n\nJoseph\nFounder, Kineo\nhttps://www.usekineo.com` }
}

/** Explicitly paginated; a failed page aborts instead of turning an incomplete list into eligibility. */
export async function readEveryPage<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; ; offset += 250) {
    const result = await page(offset, offset + 249)
    if (result.error || !Array.isArray(result.data)) throw new Error('Incomplete campaign read')
    out.push(...result.data)
    if (result.data.length < 250) return out
  }
}
