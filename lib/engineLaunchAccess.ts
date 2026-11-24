import { isInternalEmail } from '@/lib/internalAccounts'
import { H3_TURBO_PUBLIC, H3MAX_PUBLIC, S25_PUBLIC, AVATAR_PUBLIC, KINEO1_PUBLIC, SEEDANCE_15S_PUBLIC, DURACOES_CURTAS_PUBLIC, ESTRELA_PUBLIC, type Kineo1Legacy } from './engineLaunch'

// Server-only eligibility helpers. Bodies moved unchanged; public flags stay in engineLaunch.

export function h3TurboNoFilmePadrao(email?: string | null): boolean {
  return H3_TURBO_PUBLIC || isInternalEmail(email)
}

// KINEO-H3MAX-2026-10-13
/** O H3 Max aparece (e o servidor aceita) para este e-mail? Público com H3MAX_PUBLIC; senão, só a casa. [KINEO-H3MAX-2026-10-13] */
export function h3maxVisible(email?: string | null): boolean { // KINEO-H3MAX-2026-10-13
  return H3MAX_PUBLIC || isInternalEmail(email) // KINEO-H3MAX-2026-10-13
}

// KINEO-H3MAX-2026-10-13
// KINEO-H3MAX-2026-10-13
/** O 2.5 aparece para este e-mail? Publico depois do lancamento; antes, so a casa. */
export function s25Visible(email?: string | null): boolean {
  return S25_PUBLIC || isInternalEmail(email)
}

/** O Avatar aparece para este e-mail? Com AVATAR_PUBLIC=false, só a casa (mesma régua do s25Visible). */
export function avatarVisible(email?: string | null): boolean {
  return AVATAR_PUBLIC || isInternalEmail(email)
}

/** O Kineo 1 aparece para esta conta? Público só com KINEO1_PUBLIC; senão a casa, o pagante que já usa, ou quem comprou pacote. */
export function kineo1Visible(email?: string | null, legado?: Kineo1Legacy | null): boolean {
  if (KINEO1_PUBLIC || isInternalEmail(email)) return true
  const l = legado ?? {}
  return (l.hasPaid === true && l.usedFast === true) || l.boughtPack === true
}

// KINEO-KINEO1-FORA-2026-09-29 (conserto da revisão E1) — a COMPOSIÇÃO única que o servidor usa para entregar a flag
// (/api/me/credits e /studio/create). Antes cada rota montava a régua à mão e o guardião só procurava texto: trocar a
// leitura de has_paid por `true` passava verde. Agora as duas chamam esta função e o guardião a EXECUTA.
// Só lê o legado (3 consultas, service key) quando has_paid === true: pacote avulso e passe de anúncios gravam
// has_paid:true no mesmo UPDATE dos créditos (app/api/stripe/webhook/route.ts; lib/payments/grant.ts), então para
// quem nunca pagou (a maioria, trials) o resultado já é false e as leituras seriam custo puro.
// Falha de leitura propaga (quem chama decide); o e-mail da casa nunca chega a ler nada.
export async function resolveKineo1Flag(
  email: string | null | undefined,
  lerHasPaid: () => boolean | null | undefined | Promise<boolean | null | undefined>,
  lerLegado: () => Promise<Kineo1Legacy>,
): Promise<boolean> {
  if (kineo1Visible(email)) return true
  if ((await lerHasPaid()) !== true) return false
  const l = await lerLegado()
  return kineo1Visible(email, { hasPaid: true, usedFast: l.usedFast === true, boughtPack: l.boughtPack === true })
}

/** O botão de 15 s do Seedance aparece para este e-mail? Mesma régua do s25Visible. */
export function seedance15sVisible(email?: string | null): boolean {
  return SEEDANCE_15S_PUBLIC || isInternalEmail(email)
}

/** Os botões curtos novos (Kling 2.5/Veo 15 s; hollywood 15/30 s) aparecem para este e-mail? */
export function duracoesCurtasVisible(email?: string | null): boolean {
  return DURACOES_CURTAS_PUBLIC || isInternalEmail(email)
}

/** O bloco "Estrela do filme" aparece (e o servidor aceita) para este e-mail? */
export function estrelaVisible(email?: string | null): boolean {
  return ESTRELA_PUBLIC || isInternalEmail(email)
}
