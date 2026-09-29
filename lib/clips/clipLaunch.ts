// KINEO-CLIPES-2026-09-29 — UM interruptor para o clipe avulso, no mesmo desenho do S25_PUBLIC (lib/engineLaunch.ts).
//
// O preço do clipe é PROPOSTA (lib/clips/clipPricing.ts) e decisão de preço público é do fundador. Até o "vai" dele:
//   CLIPS_PUBLIC=false → só as contas da casa (isInternalEmail) veem e usam: item "Clips" na lateral e no mega-menu,
//                        a página /clips e as rotas /api/clips (conta de fora recebe 404, nada é cobrado);
//   CLIPS_PUBLIC=true  → lateral, barra do celular, mega-menu, menu público e as rotas abrem para todo mundo de uma vez.
// A barra do celular não sabe o e-mail (MobileNav só recebe isLoggedIn), então lá o item só aparece com o interruptor
// ligado; a casa usa /clips direto no celular durante o canário.
// ANTES de virar true: aplicar supabase/migrations/20260929190000_clips.sql (sem a tabela, a tela diz "não deu para
// carregar" e o pedido recusa sem cobrar — seguro, mas feio).
import { isInternalEmail } from '@/lib/internalAccounts'

export const CLIPS_PUBLIC = false

/** O clipe aparece e funciona para este e-mail? Público depois do "vai"; antes, só a casa. */
export function clipsVisible(email?: string | null): boolean {
  return CLIPS_PUBLIC || isInternalEmail(email)
}
