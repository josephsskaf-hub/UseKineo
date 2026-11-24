'use client'

import { useRef, useState, type FormEvent } from 'react'
import { COMPANY_OFFER_CONTACT_ENDPOINT, COMPANY_OFFER_INTENT } from '@/lib/growth/companyOfferContact'

type Submission = 'idle' | 'saving' | 'saved' | 'error'

export default function CompanyOfferForm() {
  const submitting = useRef(false)
  const [status, setStatus] = useState<Submission>('idle')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = new FormData(event.currentTarget)
    submitting.current = true
    setStatus('saving')

    try {
      const response = await fetch(COMPANY_OFFER_CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ intent: COMPANY_OFFER_INTENT, email: form.get('email'), website: form.get('website') }),
      })
      const receipt = await response.json()
      if (!response.ok || receipt?.saved !== true) throw new Error('Contact request was not saved')
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      submitting.current = false
    }
  }

  if (status === 'saved') {
    return <p className="company-offer-feedback" role="status">Request received. Our team will review it and contact you about scope and availability. No payment has been taken.</p>
  }

  return (
    <form className="company-offer-form" method="post" action={COMPANY_OFFER_CONTACT_ENDPOINT} onSubmit={submit}>
      <label htmlFor="company-offer-email">Work email</label>
      <input id="company-offer-email" name="email" type="email" inputMode="email" autoComplete="email"
        maxLength={200} required aria-describedby="company-offer-use" data-clarity-mask="true" />
      <label className="company-offer-honeypot" aria-hidden="true">
        Leave this blank
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <p id="company-offer-use">We’ll use this email to follow up on your proposal request.</p>
      <button type="submit" className="company-offer-cta" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving request…' : 'Request a monthly proposal'}
      </button>
      {status === 'error' && <p className="company-offer-error" role="alert">We couldn't save your request. Please try again.</p>}
    </form>
  )
}
