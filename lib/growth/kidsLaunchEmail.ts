// KINEO-CARTOON-TRACAO-2210 — preparation only; the route is read-only by default.
import { createHash } from 'node:crypto'
import { isInternalEmail } from '@/lib/internalAccounts'
import { emailFooterHtml, emailFooterText } from '@/lib/emailSuppression'

export const KIDS_LAUNCH_SENT = 'kids_launch_email_sent'
export const KIDS_LAUNCH_CLAIM = 'kids_launch_email_claim'
export const KIDS_LAUNCH_MAX_BATCH = 60
export type KidsLaunchLanguage = 'pt' | 'en'
export type KidsLaunchProfile = {
  id: string
  email: string | null
  email_opted_out: boolean | null
  signup_country: string | null
  last_country: string | null
}
export type KidsLaunchRecipient = { id: string; email: string; language: KidsLaunchLanguage }

export function kidsLaunchLanguage(profile: KidsLaunchProfile): KidsLaunchLanguage {
  return (profile.signup_country?.trim() || profile.last_country?.trim() || '').toUpperCase() === 'BR' ? 'pt' : 'en'
}

/** Same address across profiles is one recipient; any excluded alias excludes them all. */
export function kidsLaunchRecipients(profiles: KidsLaunchProfile[], blockedIds: Set<string>): KidsLaunchRecipient[] {
  const banned = new Set(profiles.filter(p => p.email_opted_out || blockedIds.has(p.id))
    .map(p => (p.email ?? '').trim().toLowerCase()))
  const used = new Set<string>()
  const recipients: KidsLaunchRecipient[] = []
  for (const p of profiles) {
    const email = (p.email ?? '').trim().toLowerCase()
    if (!p.id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isInternalEmail(email) || banned.has(email) || used.has(email)) continue
    used.add(email)
    recipients.push({ id: p.id, email, language: kidsLaunchLanguage(p) })
  }
  return recipients
}

/** Existing events PK is the durable reservation, shared by profiles with the same address. */
export function kidsLaunchClaimId(email: string): string {
  const hex = createHash('sha256').update(`${KIDS_LAUNCH_SENT}:${email.trim().toLowerCase()}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** GEO-5 Cartoon copy adapted to the live offer; no revenue, audience or publishing promise. */
export function kidsLaunchEmail(userId: string, language: KidsLaunchLanguage) {
  const pt = language === 'pt'
  const url = `https://www.usekineo.com/${pt ? 'desenho-infantil-3d-com-ia' : 'ai-kids-cartoon-videos'}?utm_source=email&utm_medium=launch&utm_campaign=cartoon_tracao_2210`
  const subject = pt
    ? 'Crie seu canal de desenho com o mesmo personagem — 1º episódio grátis'
    : 'Create your cartoon channel with the same character — first episode free'
  const paragraphs = pt ? [
    'Olá,',
    'Crie seu canal de desenho com o mesmo personagem — comece pelo 1º episódio grátis, com marca d’água e sujeito à elegibilidade da conta e aos limites da amostra.',
    'Escolha Leo, Mia, Dino, Pip, Bibi ou Ollie, escreva uma ideia e revise a história antes de gerar. A Kineo acrescenta narração e legendas em português, inglês ou espanhol. Pequenos detalhes do personagem podem variar entre cenas.',
    'Depois da amostra, você pode escolher o piloto mensal ou o pack avulso na página do Cartoon. Você baixa os episódios e decide onde publicar; a Kineo não cria nem publica o canal por você.',
    'Confira as condições e faça seu primeiro desenho:',
  ] : [
    'Hi,',
    'Create your cartoon channel with the same character — start with your first free episode, watermarked and subject to account eligibility and sample limits.',
    'Choose Leo, Mia, Dino, Pip, Bibi or Ollie, write an idea and review the story before generating. Kineo adds narration and captions in English, Portuguese or Spanish. Small character details can vary between scenes.',
    'After the sample, choose the monthly pilot or one-time pack on the Cartoon page. Download the episodes and decide where to post; Kineo does not create or publish the channel for you.',
    'Review the terms and make your first cartoon:',
  ]
  const text = `${paragraphs.join('\n\n')}\n${url}\n\nJoseph\nKineo${emailFooterText(userId)}`
  const html = `<div lang="${language}" style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px">${paragraphs.map(p => `<p>${p}</p>`).join('')}<p><a href="${url.replace(/&/g, '&amp;')}">${pt ? 'Fazer meu primeiro desenho' : 'Make my first cartoon'} →</a></p><p>Joseph<br>Kineo</p></div>${emailFooterHtml(userId)}`
  return { subject, text, html }
}
