import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  internalSurfaceLabel,
  sanitizeAcquisitionReferrer,
  sanitizeAcquisitionUtmSource,
} from '@/lib/acquisitionSource'
// KINEO-REVERSE-TRIAL-P1-2026-08-06 — ativação do reverse trial. Esta rota é
// o único touchpoint server-side que TODOS os fluxos de signup já chamam
// (signup page, login page, mount do /generate), por isso a ativação mora
// aqui. Com KINEO_REVERSE_TRIAL_ENABLED OFF é um no-op absoluto.
import { maybeActivateReverseTrial } from '@/lib/reverseTrial'
// KINEO-TRIAL-ABUSE-PMP-2026-08-07 — o hash de device/IP é calculado AQUI, na
// borda, e só o hash desce para lib/reverseTrial.ts. O IP cru não é gravado em
// lugar nenhum e não entra no escopo do módulo que fala com o banco.
import { trialFingerprintFromHeaders } from '@/lib/trialFingerprint'

// #383 — best-effort signup attribution.
//
// Records, on the user's profiles row:
//   - gclid         (from the client's first-touch sessionStorage, via body)
//   - utm_source    (same)
//   - signup_country(from Vercel's x-vercel-ip-country request header)
//
// CRITICAL: this route must NEVER break the signup flow. It is called
// fire-and-forget (not awaited) from both signup paths. It always returns a
// 200-ish JSON, never throws, and only FILLS columns that are still null
// (first-touch wins — a reload/return visit can never overwrite the original
// attribution, and organic signups simply stay null).
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // No session yet (e.g. email-confirmation flow before sign-in) — nothing to
    // attribute. Not an error for the caller; signup proceeds untouched.
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'no-session' })
    }

    // KINEO-REVERSE-TRIAL-P1-2026-08-06 — ativação do reverse trial (flag OFF
    // = no-op). Guardas internas: só perfil NOVO (<24h), 1 trial por conta
    // para sempre (trial_status não-nulo nunca reativa), domínio descartável
    // bloqueado, conta paga pulada. Best-effort: nunca quebra o signup.
    try {
      await maybeActivateReverseTrial({
        userId: user.id,
        email: user.email ?? null,
        userCreatedAt: user.created_at ?? null,
        // KINEO-TRIAL-ABUSE-PMP-2026-08-07 — guarda 7: N trials por
        // fingerprint em 30 dias. Devolve null sem o salt de ambiente ou sem
        // IP utilizável, e null = concede (fail-open por ordem do fundador).
        fingerprintHash: trialFingerprintFromHeaders(req.headers),
      })
    } catch (e) {
      console.error('[track-signup-source] reverse-trial non-fatal:', e instanceof Error ? e.message : String(e))
    }

    // Parse gclid / utm_source from the body (best-effort; tolerate no/invalid body).
    let gclid: string | null = null
    let utm_source: string | null = null
    // KINEO-SOURCE-TRACK-2026-07-06 — Block 3.3 first-touch acquisition source.
    let signup_utm_source: string | null = null
    let signup_utm_medium: string | null = null
    let signup_utm_campaign: string | null = null
    let signup_referrer: string | null = null
    // KINEO-ATTRIBUTION-SURFACE-2026-08-12 — a tela NOSSA onde o clique começou.
    // Coluna separada de propósito: `signup_utm_source` responde "de onde a
    // pessoa veio" e `signup_surface` responde "em que tela nossa ela clicou".
    // Misturar as duas foi o que apagou a origem externa de 42 perfis.
    let signup_surface: string | null = null
    const clean = (v: unknown, max: number): string | null =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
    try {
      const body = await req.json()
      gclid = clean(body?.gclid, 255)
      utm_source = sanitizeAcquisitionUtmSource(clean(body?.utm_source, 255))
      signup_utm_source = sanitizeAcquisitionUtmSource(clean(body?.signup_utm_source, 255))
      signup_utm_medium = clean(body?.signup_utm_medium, 255)
      signup_utm_campaign = clean(body?.signup_utm_campaign, 255)
      signup_referrer = sanitizeAcquisitionReferrer(clean(body?.signup_referrer, 300), req.nextUrl.hostname)
      // Aceita tanto o campo novo quanto um `signup_utm_source` que ainda chegue
      // com rótulo interno: durante a transição existem abas abertas com o
      // bundle ANTIGO, que continuam mandando 'sticky_cta' em signup_utm_source.
      // `sanitizeAcquisitionUtmSource` já devolve null para esses (a coluna de
      // origem fica limpa); esta linha impede que a informação se perca junto.
      signup_surface =
        internalSurfaceLabel(clean(body?.signup_surface, 80)) ??
        internalSurfaceLabel(clean(body?.signup_utm_source, 80))
    } catch {
      /* no/invalid JSON body — keep nulls */
    }

    // Cookie fallback (KINEO-SOURCE-TRACK-2026-07-06): if the client posted no
    // source fields (e.g. a bare call), recover them from the first-party
    // `kineo_src` cookie the client set on first landing. Survives OAuth.
    if (!signup_utm_source && !signup_utm_medium && !signup_utm_campaign && !signup_referrer) {
      try {
        const raw = req.cookies.get('kineo_src')?.value
        if (raw) {
          const c = JSON.parse(decodeURIComponent(raw)) as {
            utm_source?: string
            utm_medium?: string
            utm_campaign?: string
            referrer?: string
          }
          signup_utm_source = sanitizeAcquisitionUtmSource(clean(c.utm_source, 255))
          signup_utm_medium = clean(c.utm_medium, 255)
          signup_utm_campaign = clean(c.utm_campaign, 255)
          signup_referrer = sanitizeAcquisitionReferrer(clean(c.referrer, 300), req.nextUrl.hostname)
        }
      } catch {
        /* malformed cookie — keep nulls */
      }
    }

    // KINEO-ATTRIBUTION-SURFACE-2026-08-12 — fallback do cookie de superfície.
    // Independente do `kineo_src` acima (chaves separadas, ver lib/analytics.ts):
    // uma pessoa que chegou do TAAFT tem `kineo_src` preenchido e NÃO entraria
    // no fallback daquele bloco, mas a superfície dela ainda precisa ser lida.
    if (!signup_surface) {
      signup_surface = internalSurfaceLabel(req.cookies.get('kineo_surface')?.value ?? null)
    }

    // Country comes from Vercel's edge geo header (already received in prod).
    const signup_country = req.headers.get('x-vercel-ip-country') || null

    // First-touch only: read current values and patch ONLY the columns that are
    // still null AND for which we now have a value. Never overwrite, never null-out.
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'gclid, utm_source, signup_country, signup_utm_source, signup_utm_medium, signup_utm_campaign, signup_referrer, signup_surface'
      )
      .eq('id', user.id)
      .single()

    const patch: Record<string, string> = {}
    if (!profile?.gclid && gclid) patch.gclid = gclid
    if (!profile?.utm_source && utm_source) patch.utm_source = utm_source
    if (!profile?.signup_country && signup_country) patch.signup_country = signup_country
    // KINEO-SOURCE-TRACK-2026-07-06 — Block 3.3: first-touch source columns,
    // only ever filled when still null (a reload/return visit never overwrites).
    if (!profile?.signup_utm_source && signup_utm_source) patch.signup_utm_source = signup_utm_source
    if (!profile?.signup_utm_medium && signup_utm_medium) patch.signup_utm_medium = signup_utm_medium
    if (!profile?.signup_utm_campaign && signup_utm_campaign) patch.signup_utm_campaign = signup_utm_campaign
    if (!profile?.signup_referrer && signup_referrer) patch.signup_referrer = signup_referrer
    // KINEO-ATTRIBUTION-SURFACE-2026-08-12 — mesma regra de first-touch das
    // demais: só preenche quando ainda está nula, nunca sobrescreve.
    if (!profile?.signup_surface && signup_surface) patch.signup_surface = signup_surface

    if (Object.keys(patch).length > 0) {
      await supabase.from('profiles').update(patch).eq('id', user.id)
    }

    return NextResponse.json({ ok: true, written: Object.keys(patch) })
  } catch (err) {
    // Swallow everything — attribution failures must never surface to the user
    // or break signup. Log for observability only.
    console.error('[track-signup-source] non-fatal:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ ok: false, reason: 'error' })
  }
}
