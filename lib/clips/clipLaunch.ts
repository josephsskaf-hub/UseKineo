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

export const CLIPS_PUBLIC = true // LIGADO 29/09 (fundador: tabela aprovada + "ok para os testes"; clipe Seedance 5 s real entregue e persistido)

// Showcase / Clipes, 06/10: visitante recebe o catálogo de quem cria conta agora.
// false restaura o catálogo anterior; autorização, saldo e débito do POST não mudam.
export const CLIP_GUEST_AS_NEW_ACCOUNT = true

/** O clipe aparece e funciona para este e-mail? Público depois do "vai"; antes, só a casa. */
export function clipsVisible(email?: string | null): boolean {
  return CLIPS_PUBLIC || isInternalEmail(email)
}

// ═══ KINEO-S25-CLIPES-2026-10-06 — o CLIPE do Seedance 2.5 (fundador 06/10: "vai clipe 2.5"; preço = opção C, chamariz) ═══
// Interruptor PRÓPRIO, separado do filme (lib/engineLaunch.ts S25_PUBLIC): o clipe avulso tem preço e público próprios.
//   CLIP_S25_PUBLIC=false → só a casa (isInternalEmail) vê o 2.5 no /clips — exatamente como antes;
//   CLIP_S25_PUBLIC=true  → todo mundo VÊ o card do 2.5; só quem PAGA usa (clipS25Paying em lib/clips/clipServer.ts: a casa
//                           exata do validador de $0 ou isPayingPlan — a MESMA régua do filme do 2.5). Quem não paga vê o
//                           selo "NEW · paid plans" e o clique leva aos planos; o POST recusa com a mesma régua (402
//                           engine_paid) ANTES de qualquer débito.
// A pausa do motor (lib/engineLaunch.ts enginePaused('s25')) continua mandando: pausado, o 2.5 não aparece nem ligado.
// Preço: lib/clips/clipPricing.ts CLIP_S25_CREDITS (uma constante). Guardião: scripts/test-s25-clipes-2026-10-06.mjs.
// LIGADO 06/10 (fundador: opção C, igualar a Runway Pro, chamariz — 8 cr / 5 s e 16 cr / 10 s; sessão CEO: "deixe
// CLIP_S25_PUBLIC = true"). Desligar = false nesta linha: volta a ser só da casa, nada mais muda.
export const CLIP_S25_PUBLIC = true

/** O card do 2.5 aparece no /clips para este e-mail? (Usar é outra pergunta — pagante —, respondida no servidor.) */
export function clipS25Visible(email?: string | null): boolean {
  return CLIP_S25_PUBLIC || isInternalEmail(email)
}

/** Para onde vai o card de um motor só de planos pagos: os planos do /pricing, com a campanha <motor>_paid_plans_clips
 *  (mesmo desenho do filme do 2.5: s25_paid_plans_<superfície>). */
export function clipPaidUpgradeHref(engine: string): string {
  return `/pricing?intent_campaign=${encodeURIComponent(engine)}_paid_plans_clips#plans`
}

/** Eventos de navegador do card trancado — os MESMOS nomes do filme do 2.5, com surface:'clips' no metadata, para o funil
 *  do selo ser um só: `shown` = o card trancado esteve na tela (denominador, 1× por carga); `clicked` = o clique. */
export const CLIP_PAID_EVENTS = { shown: 's25_paid_badge_shown', clicked: 's25_paid_plans_clicked' } as const
