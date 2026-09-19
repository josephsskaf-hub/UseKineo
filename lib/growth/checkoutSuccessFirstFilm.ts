// ═══ KINEO-SEM-AUTOSTART-POS-PAGAMENTO-2026-09-18 — depois de pagar, a pessoa escolhe; a casa não liga filme sozinha ═══
//
// CASO (Axel, 18/09 23:04 BRT): veio pelo ChatGPT na página do VEO, pagou Creator, e a página de sucesso ofereceu
// "Your first video, one click — trending right now" com temas da casa. Ele tocou no primeiro card 1,5 s depois de
// a página abrir, um filme de BILIONÁRIO no KINEO 1 começou (não era a ideia dele nem o motor que ele veio buscar)
// e ele saiu da aba 2 s depois. Regra já conhecida da casa: auto-start = 40% dos primeiros vídeos e 0 pagantes.
// Num pagante novo é pior: gasta o primeiro minuto dele com algo que não é dele.
// Fundador (19/09): "Vai nos 2" (item 1 = sem auto-start depois de pagar).
//
// REGRA: a página de sucesso mostra UM caminho — abrir o Studio com a caixa vazia e o seletor de motor à vista.
// Os cards de tema ficam atrás do interruptor abaixo (código preservado), para medir de novo um dia.

export const CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED = false
export const CHECKOUT_SUCCESS_FIRST_FILM_VERSION = 'checkout_success_no_autostart_v1'

export function checkoutSuccessFirstFilmCopy(): { eyebrow: string; body: string; cta: string; href: string } {
  return {
    eyebrow: 'Your first film',
    body: 'Open the Studio, pick the engine you want (Kineo 1, Seedance, Kling, Veo…) and type your idea or paste your script. Keep the tab open until you see "Your film is ready".',
    cta: 'Open the Studio →',
    href: '/studio?intent_campaign=checkout_success_studio_v1',
  }
}
