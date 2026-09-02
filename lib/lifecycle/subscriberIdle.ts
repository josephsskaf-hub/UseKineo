// KINEO-SUBSCRIBER-IDLE-2026-09-02 — sprint-assinaturas #10.
//
// O FURO (medido 02/09 01:10 BRT): dos 7 assinantes ativos externos, 4 estao
// DORMINDO com credito acumulando — noelrss21 (Creator, 63cr, ultimo video
// 24/08), den.higgins (Creator, 140cr, 1 video na vida, ultimo 08/08),
// akajitin (Starter, 172cr = 4 meses sem gastar, ultimo 03/08) e emilio
// (Starter, renovou 01/09, 40cr, ZERO videos). Sao ~$56 dos ~$109 de MRR.
// Nenhum recebeu um unico e-mail em 7 dias. Assinante que paga e nao usa
// cancela no dia em que repara na fatura — e cancela ressentido. Todo
// e-mail da casa mira quem NAO pagou; ninguem cuidava de quem JA paga.
//
// Este modulo monta o e-mail (puro, testavel); a rota
// app/api/admin/send-subscriber-idle decide QUEM recebe.
import { emailFooterHtml, emailFooterText } from '@/lib/emailSuppression'
import { creditCostFor } from '@/lib/credits/engineCost'

export const STAMP = 'subscriber_idle_sent'
export const IDLE_DAYS = 10
export const RESEND_DAYS = 30
export const HOT_HOURS = 24
export const MAX_BATCH = 20
export const PAID_PLANS = new Set(['starter', 'basic', 'pro'])
const APP = 'https://www.usekineo.com'
const PLAN_LABEL: Record<string, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

// Ideias genericas da casa (verticais que ja provaram no canal): so entram
// quando a pessoa nao tem video proprio para continuar.
export const HOUSE_IDEAS: Array<{ label: string; prompt: string }> = [
  { label: 'The lake that turns animals into stone', prompt: 'Lake Natron in Tanzania: why its water turns animals into stone statues, and the one creature that thrives there' },
  { label: 'The 1942 Battle of Los Angeles', prompt: 'The night in 1942 when Los Angeles fired 1,400 shells at something in the sky — and what the Army said the next morning' },
  { label: 'Why Warren Buffett still lives in a $31,500 house', prompt: 'Why Warren Buffett still lives in the house he bought in 1958 for $31,500 — and what that says about how he thinks about money' },
]

export type IdleTarget = {
  id: string
  email: string
  plan: string
  credits: number
  daysIdle: number | null // null = nunca fez video
  lastTitle: string | null
}

export function filmsFor(credits: number): { seedance: number; fast: number } {
  const seed = Math.max(1, creditCostFor('cinematic_ai', true))
  const fast = Math.max(1, creditCostFor('fast', true))
  return { seedance: Math.floor(credits / seed), fast: Math.floor(credits / fast) }
}

export function studioUrl(prompt: string, idea: string): string {
  const q = new URLSearchParams({
    engine: 'seedance', duration: '60', script_mode: 'ai', prompt,
    utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'subscriber_idle', utm_content: idea,
  })
  return `${APP}/studio?${q.toString()}`
}

// Titulo do ultimo video como a pessoa o veria: 1a linha, sem o marcador HOOK.
export function cleanTitle(raw: string | null | undefined): string | null {
  const first = String(raw ?? '').split('\n')[0].replace(/^HOOK:\s*/i, '').replace(/\s+/g, ' ').trim()
  return first || null
}

export function ideasFor(t: IdleTarget): Array<{ label: string; url: string }> {
  const out: Array<{ label: string; url: string }> = []
  const title = (t.lastTitle ?? '').replace(/\s+/g, ' ').trim()
  if (title) {
    const short = title.length > 70 ? `${title.slice(0, 67).trimEnd()}…` : title
    out.push({ label: `Part 2 of "${short}"`, url: studioUrl(`Part 2 of: ${title}. Continue the story with the details most people never heard.`, 'sequel') })
  }
  for (const h of HOUSE_IDEAS) {
    if (out.length >= 3) break
    out.push({ label: h.label, url: studioUrl(h.prompt, 'house') })
  }
  return out.slice(0, 3)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildEmail(t: IdleTarget): { subject: string; text: string; html: string } {
  const plan = PLAN_LABEL[t.plan] ?? 'Kineo'
  const films = filmsFor(t.credits)
  const filmsLine = films.seedance >= 1
    ? `That's ${films.seedance} full AI film${films.seedance === 1 ? '' : 's'} on Seedance, or ${films.fast} quick Kineo 1 shorts.`
    : `That's ${films.fast} quick Kineo 1 short${films.fast === 1 ? '' : 's'}.`
  const idleLine = t.daysIdle == null
    ? `you haven't made a video yet`
    : `your last video was ${t.daysIdle} days ago`
  const ideas = ideasFor(t)
  const subject = t.daysIdle == null
    ? `Your ${t.credits} Kineo credits haven't been used yet`
    : `${t.credits} credits are sitting in your ${plan} account`

  const text = `Hey,

Quick, honest note: you're on the Kineo ${plan} plan, ${idleLine}, and you have ${t.credits} credits sitting unused. ${filmsLine}

I'd much rather you get films out of this than pay for a balance that just sits there. So here are three you can start with one click — the film is directed, narrated and edited in about 3 minutes:

${ideas.map((i, n) => `${n + 1}. ${i.label}\n   ${i.url}`).join('\n')}

What changed since you were last here:
- Every film now gets an AI-composed soundtrack (Google Lyria 3), not stock music.
- Narration moved to MiniMax 2.8 HD — the top-ranked voice model right now.
- Kling 3 and Omni Flash render true film scenes, and Nano Banana Pro is in the image studio.

If something got in your way last time — a render that failed, a result you didn't like, anything — hit reply and tell me. It lands with me, not a bot.

Joseph
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:500px;">
  <p>Hey,</p>
  <p>Quick, honest note: you're on the Kineo <strong>${plan}</strong> plan, ${idleLine}, and you have <strong>${t.credits} credits</strong> sitting unused. ${filmsLine}</p>
  <p>I'd much rather you get films out of this than pay for a balance that just sits there. So here are three you can start with one click — the film is directed, narrated and edited in about 3 minutes:</p>
  <ol style="padding-left:20px;margin:0 0 18px">
    ${ideas.map((i) => `<li style="margin:0 0 8px"><a href="${i.url}" style="color:#2997ff;font-weight:bold;text-decoration:none">${escapeHtml(i.label)} →</a></li>`).join('\n    ')}
  </ol>
  <p style="margin:0 0 6px"><strong>What changed since you were last here:</strong></p>
  <ul style="padding-left:18px;margin:0 0 16px">
    <li>Every film now gets an <strong>AI-composed soundtrack</strong> (Google Lyria 3), not stock music.</li>
    <li>Narration moved to <strong>MiniMax 2.8 HD</strong> — the top-ranked voice model right now.</li>
    <li><strong>Kling 3</strong> and <strong>Omni Flash</strong> render true film scenes, and <strong>Nano Banana Pro</strong> is in the image studio.</li>
  </ul>
  <p>If something got in your way last time — a render that failed, a result you didn't like, anything — hit reply and tell me. It lands with me, not a bot.</p>
  <p style="margin:0 0 2px">Joseph</p>
  <p style="margin:0"><a href="${APP}" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(t.id)}`
  return { subject, text: `${text}${emailFooterText(t.id)}`, html }
}
