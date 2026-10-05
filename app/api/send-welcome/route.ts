import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TRIAL_CREDITS_SHOWN, TRIAL_FIRST_FILM_PHRASE } from '@/lib/freeTierOffer'
import { FREE_FILM_COUNTRY_CLAUSE } from '@/lib/freeFilmPolicy'

// KINEO-VERDADE-TRIAL-2026-10-05 — e-mail de boas-vindas refeito (fundador 05/10):
//   · paleta clara da marca (a mesma do site e do og card): fundo #F7F7F5, cartão branco com borda #E3E6EC, texto
//     #0E1116 / #5A5F67, CTA azul #0A5CFF. O tema preto antigo saiu;
//   · logo = <img> do ícone real em URL pública absoluta. O emoji dentro de uma <div> com layout flexível quebrava:
//     cliente de e-mail não suporta flex. Só tabela + estilo inline aqui, nada de flex/grid/CSS externo;
//   · copy VERDADEIRA: a conta grátis não usa Kling/Veo sem plano (gate isPaidUser em generate-video-cinematic), e não
//     existe banco de imagens de arquivo nesse filme. A promessa é o que o grant COMPRA — números derivados de
//     lib/freeTierOffer.ts (grant ÷ custo do filme de 15 s) e cláusula de país de lib/freeFilmPolicy.ts; nada digitado.
//   Quem recebe, quando, e a lógica da rota: intocados. scripts/test-verdade-trial-2026-10-05.mjs trava a volta.

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = 'https://www.usekineo.com'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'
const ICON_URL = `${APP_URL}/kineo-icon-512.png`

// A promessa única do e-mail, HTML e texto puro leem a mesma frase.
const OFFER_LINE = `${TRIAL_CREDITS_SHOWN} free credits${FREE_FILM_COUNTRY_CLAUSE} — ${TRIAL_FIRST_FILM_PHRASE} (script, narration, music and captions).`
const BULLETS = [
  'AI writes the script and the narration',
  'Captions and music included',
  'No camera or editing needed',
  'You watch the film before deciding to pay',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name, activationPath } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (typeof email !== 'string' || email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!RESEND_API_KEY || RESEND_API_KEY === 'your_resend_api_key_here') {
      console.warn('[send-welcome] RESEND_API_KEY not configured — skipping welcome email')
      return NextResponse.json({ skipped: true })
    }

    const greeting = name ? `Hey ${name},` : 'Hey Creator,'
    const safeActivationPath =
      typeof activationPath === 'string' &&
      activationPath.startsWith('/') &&
      !activationPath.startsWith('//')
        ? activationPath
        : '/studio/create?welcome=1'
    const dashboardUrl = `${APP_URL}${safeActivationPath}`

    const bulletRows = BULLETS.map(
      (b) => `<tr>
                        <td width="28" valign="top" style="padding:7px 0;color:#0A5CFF;font-size:16px;font-weight:700;line-height:22px;">&#10003;</td>
                        <td valign="top" style="padding:7px 0;color:#0E1116;font-size:15px;line-height:22px;">${b}</td>
                      </tr>`,
    ).join('\n                      ')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Create your first Kineo film</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F7F5" style="background-color:#F7F7F5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding:0 10px 0 0;">
                    <img src="${ICON_URL}" width="40" height="40" alt="Kineo" style="display:block;width:40px;height:40px;border:0;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-size:22px;font-weight:800;color:#0E1116;letter-spacing:-0.4px;">Kineo</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E3E6EC;border-radius:16px;padding:36px 32px;">
              <p style="color:#0E1116;font-size:18px;font-weight:700;margin:0 0 6px;">${greeting}</p>
              <p style="color:#5A5F67;font-size:15px;margin:0 0 24px;line-height:1.6;">Your account is ready. Type an idea and Kineo turns it into a short AI film.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td bgcolor="#F7F7F5" style="background-color:#F7F7F5;border:1px solid #E3E6EC;border-radius:12px;padding:20px 22px;">
                    <p style="color:#0A5CFF;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;">Your free start</p>
                    <p style="color:#0E1116;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.4px;line-height:1.25;">See your idea become a film</p>
                    <p style="color:#5A5F67;font-size:14px;margin:0;line-height:1.6;">${OFFER_LINE}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                      ${bulletRows}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0A5CFF" style="background-color:#0A5CFF;border-radius:10px;">
                          <a href="${dashboardUrl}" style="display:inline-block;padding:16px 40px;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;">Create my first film &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="text-align:center;color:#5A5F67;font-size:12px;margin:0 0 24px;line-height:1.6;">Trial films carry a small Kineo watermark &middot; any paid plan removes it</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #E3E6EC;padding:20px 0 0;">
                    <p style="color:#5A5F67;font-size:13px;margin:0;line-height:1.6;text-align:center;">Questions? Just reply to this email — we read every one.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 0 0;">
              <p style="color:#5A5F67;font-size:12px;margin:0;line-height:1.6;">
                — The Kineo Team<br />
                <a href="${APP_URL}" style="color:#0A5CFF;text-decoration:none;">usekineo.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const text = `${greeting}

Your Kineo account is ready. Type an idea and Kineo turns it into a short AI film.

Your free start: ${OFFER_LINE}

${BULLETS.map((b) => `- ${b}`).join('\n')}

Trial films carry a small Kineo watermark; any paid plan removes it.

Create your first film:
${dashboardUrl}

— The Kineo Team
usekineo.com`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: '🎬 Welcome to Kineo — make your first AI film',
        html,
        text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('[send-welcome] Resend error:', response.status, body)
      return NextResponse.json({ sent: false, error: 'Email provider rejected the request.' })
    }

    const data = await response.json()
    return NextResponse.json({ sent: true, id: data.id })
  } catch (err) {
    console.error('[send-welcome] Unexpected error:', err)
    return NextResponse.json({ sent: false, error: 'Welcome email could not be sent.' })
  }
}
