import OpenAI from 'openai'

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

// KINEO-OPENAI-HANG-2026-08-05 — the OTHER way OpenAI takes the product down.
//
// The 31/07 detector above only fires when OpenAI ANSWERS, and answers
// "insufficient_quota". On 05/08 it answered nothing at all: requests hung
// until Vercel's gateway killed the lambda (504 on generate-video-fast,
// TypeError with null http_status on the client). Credits were fine, the
// alarm never rang, and 2 users — one a brand-new TAAFT signup on their very
// first video — burned 20 minutes on 4 dead attempts in silence.
//
// Now that lib/openai.ts caps the client timeout, that silence surfaces as a
// catchable timeout/connection error, which THIS predicate recognises so the
// same honest 503 + founder page fires for a hang as for an empty wallet.
export function looksOpenAiHanging(e: unknown): boolean {
  if (!e) return false

  // GATE FIRST, match second. Two traps found in adversarial review:
  //
  //  1. `err.name` is USELESS for this. openai/error.js never assigns `name` on
  //     its subclasses, so APIConnectionTimeoutError reports name === 'Error'.
  //     Matching on class names is dead code; only `instanceof` works.
  //  2. Callers wrap broad try blocks. /api/generate-script catches its WHOLE
  //     body, so a Supabase ECONNRESET or a client disconnect during
  //     req.json() would otherwise match the regex below and page the founder
  //     with "OpenAI is not responding" while OpenAI is perfectly healthy.
  //     Requiring an OpenAI SDK error class makes that impossible.
  //
  // APIConnectionError is the parent of APIConnectionTimeoutError and is what
  // the SDK throws for ECONNRESET / socket hang up / DNS / undici's bare
  // "fetch failed" — i.e. roughly half of "OpenAI is unreachable" used to slip
  // through into a mute 500 with no alert at all.
  if (e instanceof OpenAI.APIConnectionError) return true

  // Everything below is gated on the error having come from the OpenAI SDK.
  // Without this gate the string matching would also fire on a Supabase
  // ECONNRESET or a client disconnect during req.json(), because callers wrap
  // broad try blocks — and the founder would be paged with "OpenAI is not
  // responding" while OpenAI is perfectly healthy.
  if (!(e instanceof OpenAI.APIError)) return false

  const err = e as { status?: number; message?: string; code?: string; cause?: { code?: string } }
  // 504/522/524 = an upstream gateway gave up waiting on OpenAI.
  if (err.status === 504 || err.status === 522 || err.status === 524) return true

  // NOTE: deliberately NOT matching /aborted/. APIUserAbortError carries
  // "Request was aborted." and would turn any future req.signal wiring — a very
  // common Next.js pattern — into a false outage page on every user navigation.
  const blob = `${err.message ?? ''} ${err.code ?? ''} ${err.cause?.code ?? ''}`.toLowerCase()
  return /timed out|etimedout|econnreset|socket hang up|connection error|fetch failed/.test(blob)
}

// KINEO-OPENAI-HANG-2026-08-05 — throttle PER KIND, not globally. With one
// shared counter a 'hang' alert would swallow a 'quota' alert for 30 minutes,
// and that is the dangerous ordering: quota is the actionable one (a 2-minute
// top-up), and it would be suppressed by an alert whose whole message is
// "topping up fixes nothing."
const LAST_OPENAI_ALERT: Record<'quota' | 'hang', number> = { quota: 0, hang: 0 }

/**
 * Page the founder when OpenAI takes generation down.
 *
 * KINEO-OPENAI-HANG-2026-08-05 — `kind` exists because the two failure modes
 * need OPPOSITE actions, and an alert that prescribes the wrong one costs more
 * time than no alert. 'quota' = go top up the balance. 'hang' = the balance is
 * FINE and topping it up fixes nothing; OpenAI is slow or the network is, and
 * the only useful move is to watch it / degrade. Defaults to 'quota' so the
 * pre-existing call sites keep their exact previous behaviour.
 */
export async function alertOpenAiExhausted(
  context: string,
  kind: 'quota' | 'hang' = 'quota',
): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_resend_api_key_here') return
    const now = Date.now()
    if (now - LAST_OPENAI_ALERT[kind] < 30 * 60 * 1000) return
    LAST_OPENAI_ALERT[kind] = now
    const from = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'

    const subject =
      kind === 'hang'
        ? '🚨 Kineo: OpenAI NÃO ESTÁ RESPONDENDO — geração de vídeo travando (créditos OK)'
        : '🚨 Kineo: OpenAI SEM CRÉDITOS — toda a geração de vídeo está parada'

    const body =
      kind === 'hang'
        ? `As chamadas para a OpenAI estão ESTOURANDO O TEMPO (não é falta de crédito — recarregar NÃO resolve).\n\n` +
          `Sintoma para o usuário: o vídeo fica "gerando" e morre. Foi exatamente isso que aconteceu em 05/08, quando um cadastro novo vindo do TAAFT tentou 4 vezes em 20 minutos e falhou nas 4.\n\n` +
          `Contexto: ${context}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `Onde olhar: https://status.openai.com/ e os logs da Vercel do deploy em produção.\n\n` +
          `O app já mostra mensagem honesta de capacidade (503) em vez de erro mudo, e o cron de win-back recupera quem falhou. ` +
          `Este alerta repete no máximo a cada 30 min por instância enquanto durar.`
        : `A conta da OpenAI está sem créditos — script, cenas, b-roll e a demo da landing estão falhando AGORA para todos os usuários (e para cada visitante do TAAFT que testa o produto).\n\n` +
          `Contexto: ${context}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `Recarregar (leva 2 min): https://platform.openai.com/settings/organization/billing/\n\n` +
          `Enquanto isso o app mostra uma mensagem honesta de capacidade (503) em vez de erro mudo. ` +
          `Este alerta repete no máximo a cada 30 min por instância enquanto o problema durar.`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: ['josephsskaf@gmail.com'], subject, text: body }),
    })
    console.error(
      kind === 'hang'
        ? '[openai-alert] OPENAI HANGING/TIMEOUT — founder alerted'
        : '[openai-alert] OPENAI QUOTA EXHAUSTED — founder alerted',
    )
  } catch (e) {
    console.error('[openai-alert] alert email failed:', e instanceof Error ? e.message : String(e))
  }
}
