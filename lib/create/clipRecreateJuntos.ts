// KINEO-CLIP-RECREATE-JUNTOS-1511 [dono 15/11: "juntar a aba de Clips com a aba de Recreate… quando você clica em Recreate, o Clips some do menu de cima"]
// Quem vê a tela que junta Clip e Recreate (interruptor CLIP_RECREATE_JUNTOS_RELEASE em lib/create/release.ts) e, para essa conta, a barra de abas
// sem a aba "Recreate" (ela virou a aba Clip: Film · Clip · Cartoon · Ads em toda tela de criar). Visitante nunca. Módulo puro.
import type { InternalRelease } from '@/lib/recreate/release'
import { recreateVisible, releaseVisible } from '@/lib/recreate/access'
import { clipNaMolduraVisivel } from './clipNaMoldura'
import { CLIP_RECREATE_JUNTOS_RELEASE } from './release'

// KINEO-CLIP-FLUXO-2111 [dono 22/11 23:2x, pela foto: "gostei muito das páginas novas, pode já dar merge"] — 'internal' = só a conta da casa vê a
// tela nova enquanto a CEO confere logada; abrir a todos = 'public'; VOLTA = 'off' (todo mundo recebe a tela de antes).
export const CLIP_WORKSPACE_RELEASE: InternalRelease = 'public' // dono 23/11 00:4x: "abre a todos já"

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
