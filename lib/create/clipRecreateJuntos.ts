// KINEO-CLIP-RECREATE-JUNTOS-1511 [dono 15/11: "juntar a aba de Clips com a aba de Recreate… quando você clica em Recreate, o Clips some do menu de cima"]
// Quem vê a tela que junta Clip e Recreate (interruptor CLIP_RECREATE_JUNTOS_RELEASE em lib/create/release.ts) e, para essa conta, a barra de abas
// sem a aba "Recreate" (ela virou a aba Clip: Film · Clip · Cartoon · Ads em toda tela de criar). Visitante nunca. Módulo puro.
import type { InternalRelease } from '@/lib/recreate/release'
import { recreateVisible, releaseVisible } from '@/lib/recreate/access'
import { clipNaMolduraVisivel } from './clipNaMoldura'
import { CLIP_RECREATE_JUNTOS_RELEASE } from './release'

export const CLIP_WORKSPACE_RELEASE: InternalRelease = 'off'

/** A conta (logada) abre a tela única? Precisa já abrir as duas de hoje (/create/clip e /recreate) e estar no interruptor. */
export function clipRecreateJuntosVisivel(email: string | null | undefined, release: InternalRelease = CLIP_RECREATE_JUNTOS_RELEASE): boolean {
  return !!email && release !== 'off' && releaseVisible(email, release) && clipNaMolduraVisivel(email) && recreateVisible(email)
}

export function clipWorkspaceVisible(email: string | null | undefined, release: InternalRelease = CLIP_WORKSPACE_RELEASE): boolean {
  return clipRecreateJuntosVisivel(email) && releaseVisible(email, release)
}

/** A aba "Recreate" na barra: some só para quem tem a tela única (lá ela É a aba Clip). Fora do interruptor, a régua de sempre (recreateVisible). */
export function abaRecreateVisivel(email: string | null | undefined, release: InternalRelease = CLIP_RECREATE_JUNTOS_RELEASE): boolean {
  return recreateVisible(email) && !clipRecreateJuntosVisivel(email, release)
}
