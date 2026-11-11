// KINEO-CLIP-NA-MOLDURA-1011 [fundador 10/11: clicou num clipe da home e caiu na tela ANTIGA de Clips — "quero a tela nova"]
// A aba Clip da tela nova (/create/clip) É o gerador de Clips de hoje (app/(dashboard)/clips/ClipsClient.tsx, mesmo estado, mesmo pedido,
// mesmo preço, mesmo upload e polling) dentro da moldura. Interruptor PRÓPRIO, num arquivo próprio (lib/create/release.ts tem dono):
// 'off' = ninguém · 'internal' = só a allowlist exata da casa · 'public' = toda conta logada que já vê /clips.
// Fora dele (ou visitante): /clips de sempre, com a query intacta. Módulo puro e seguro no cliente (a lista de e-mails não mora aqui).
import type { InternalRelease } from '@/lib/recreate/release'
import { releaseVisible } from '@/lib/recreate/access'
import { clipsVisible } from '@/lib/clips/clipLaunch'
import { CREATE_SHELL_RELEASE } from './release'

/** Nasce 'internal' (CEO 10/11): só a casa até a conferência logada. VOLTA: 'off'. */
export const CREATE_CLIP_INPLACE: InternalRelease = 'internal'

/** A conta (logada) abre /create/clip? Precisa ver o /clips de hoje, a casca da tela nova e este interruptor. Visitante: nunca. */
export function clipNaMolduraVisivel(email: string | null | undefined, release: InternalRelease = CREATE_CLIP_INPLACE): boolean {
  return !!email && release !== 'off' && CREATE_SHELL_RELEASE !== 'off' && releaseVisible(email, release) && clipsVisible(email)
}

export const CLIP_TAB_HREF = '/create/clip'
export const LEGACY_CLIPS_PATH = '/clips'
