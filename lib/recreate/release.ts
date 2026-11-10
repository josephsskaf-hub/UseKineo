// Founder 10/11 morning-merge block: internal canary first. Public path is ready but disabled.
// Client-safe release configuration: keep this module separate from the internal email allowlist.
export type InternalRelease = 'off' | 'internal' | 'public'
// KINEO-RECREATE-ABRE-1011 [fundador 10/11: "Eu quero já dar merge hoje, de tudo novo já, de todos os fluxos" · "que horas vamos
// dar merge pra todas as pessoas?"] — ABERTO AO PÚBLICO em 10/11/2026 (página + efeitos + troca dos formatos com swapApproved).
// Volta: trocar os dois para 'internal' fecha tudo de novo (só a allowlist exata da casa vê).
export const RECREATE_RELEASE: InternalRelease = 'public'
// KINEO-RECREATE-TRAVA-1011 — the page and its photo effects (RECREATE_RELEASE) open separately from the face SWAP. With
// RECREATE_RELEASE='public' and this 'internal', customers see the page with the effects and NO swap format; the house sees all.
// Even 'public' shows customers only formats with swapApproved: true (lib/recreate/formats.ts).
export const RECREATE_SWAP_RELEASE: InternalRelease = 'public'
export const SERIES_RELEASE: InternalRelease = 'internal'
export const RECREATE_MOTION_ENABLED = false
