// KINEO-OPENAI-ALERT-2026-07-31 — shared OpenAI quota alarm.
// Incident 31/07: the OpenAI account ran out of credits at 11:07Z and EVERY
// GPT-backed route (generate-script, scene generation, b-roll plan, the
// PUBLIC landing demo) returned mute 500s for 3+ hours — during the biggest
// TAAFT signup wave in the company's history. 10 external users hit dead
// buttons; the only trace was events rows nobody reads in real time.
// Mirrors lib/falAlert.ts (same incident class with fal.ai on 10/07: balance
// hit $0, generic 502, no e-mail, no signal).
// Throttled to once per 30 min per lambda instance.

// One shared user-facing sentence so every surface tells the same truth.
// Honest, no fake apology-speak: capacity is down, the team already knows,
// the user loses nothing by coming back later.
export const ENGINE_CAPACITY_MESSAGE =
  'Kineo is at full capacity right now — the team was automatically alerted and is adding capacity. Your free videos and credits are untouched. Please try again in a little while.'

export function looksOpenAiQuotaDead(e: unknown): boolean {
  const err = e as { status?: number; message?: string; code?: string } | null
  if (!err) return false
  const blob = `${err.message ?? ''} ${err.code ?? ''}`.toLowerCase()
  if (/insufficient_quota|no credits remaining/.test(blob)) return true
  return err.status === 429 && /credit|quota|billing/.test(blob)
}

let LAST_OPENAI_ALERT = 0

export async function alertOpenAiExhausted(context: string): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_resend_api_key_here') return
    const now = Date.now()
    if (now - LAST_OPENAI_ALERT < 30 * 60 * 1000) return
    LAST_OPENAI_ALERT = now
    const from = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: ['josephsskaf@gmail.com'],
        subject: '🚨 Kineo: OpenAI SEM CRÉDITOS — toda a geração de vídeo está parada',
        text:
          `A conta da OpenAI está sem créditos — script, cenas, b-roll e a demo da landing estão falhando AGORA para todos os usuários (e para cada visitante do TAAFT que testa o produto).\n\n` +
          `Contexto: ${context}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `Recarregar (leva 2 min): https://platform.openai.com/settings/organization/billing/\n\n` +
          `Enquanto isso o app mostra uma mensagem honesta de capacidade (503) em vez de erro mudo. ` +
          `Este alerta repete no máximo a cada 30 min por instância enquanto o problema durar.`,
      }),
    })
    console.error('[openai-alert] OPENAI QUOTA EXHAUSTED — founder alerted')
  } catch (e) {
    console.error('[openai-alert] alert email failed:', e instanceof Error ? e.message : String(e))
  }
}
