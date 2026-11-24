import { isInternalEmail } from '@/lib/internalAccounts'
import { CLIPS_PUBLIC, CLIP_S25_PUBLIC } from './clipLaunch'

/** O clipe aparece e funciona para este e-mail? Público depois do "vai"; antes, só a casa. */
export function clipsVisible(email?: string | null): boolean {
  return CLIPS_PUBLIC || isInternalEmail(email)
}

/** O card do 2.5 aparece no /clips para este e-mail? (Usar é outra pergunta — pagante —, respondida no servidor.) */
export function clipS25Visible(email?: string | null): boolean {
  return CLIP_S25_PUBLIC || isInternalEmail(email)
}
